import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    HAS_CHROMADB = True
except ImportError:
    chromadb = None
    ChromaSettings = None
    HAS_CHROMADB = False

from rank_bm25 import BM25Okapi

from app.config import settings
from app.schemas import Citation, FlashcardItem, MCQItem, MCQOption, ShortAnswerItem

logger = logging.getLogger(__name__)

GEMINI_REQUEST_TIMEOUT_MS = 30_000
CHUNKING_VERSION = 3
WORD_RE = re.compile(r"[a-z0-9]+", re.IGNORECASE)
CHAPTER_HEADING_RE = re.compile(
    r"^(?:Chapter|Unit|Section|Module)\s+(\d+|[IVXLCDM]+)[\s:.\-]+(.+)",
    re.IGNORECASE | re.MULTILINE,
)

STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "do",
    "does", "for", "from", "how", "i", "in", "is", "it", "its", "me", "of",
    "on", "or", "please", "the", "their", "there", "this", "that", "to",
    "we", "what", "when", "where", "which", "with", "you", "your",
}


class RAGError(RuntimeError):
    pass


def _create_genai_client(api_key: str) -> Any:
    from google import genai
    from google.genai import types

    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=GEMINI_REQUEST_TIMEOUT_MS),
    )


def _tokenize(text: str) -> list[str]:
    return [w.lower() for w in WORD_RE.findall(text)]


def _stable_document_id(filename: str) -> str:
    normalized = Path(filename).name.casefold()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


def _clean_text(text: str) -> str:
    text = text.replace("\xa0", " ").replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\ufffd", "-")
    return re.sub(r"[ \t]+\n", "\n", re.sub(r"\n{3,}", "\n\n", text)).strip()


def extract_pdf_book(path: Path) -> dict[str, Any]:
    """
    Extracts pages, text, and chapter bookmarks from a PDF textbook.
    Returns: {
        "title": str,
        "author": str,
        "subject": str,
        "pages": list[dict], # page_number, text, chapter, chapter_number
        "chapters": list[dict] # title, chapter_number, page
    }
    """
    try:
        import pymupdf

        with pymupdf.open(stream=path.read_bytes(), filetype="pdf") as doc:
            toc = doc.get_toc()  # [[lvl, title, page_num], ...]
            raw_meta = doc.metadata or {}
            
            # Detect title
            stem_title = path.stem.replace("_", " ").replace("-", " ").title()
            title = (raw_meta.get("title") or "").strip() or stem_title
            author = (raw_meta.get("author") or "").strip() or "Academic Press"
            subject = (raw_meta.get("subject") or "").strip() or "General Science"

            # Parse TOC chapters
            parsed_chapters = []
            for item in toc:
                lvl, c_title, c_page = item[0], item[1].strip(), int(item[2])
                c_num = None
                match = re.search(r"(?:chapter|unit|section)\s+(\d+)", c_title, re.IGNORECASE)
                if match:
                    c_num = int(match.group(1))
                parsed_chapters.append({
                    "title": c_title,
                    "chapter_number": c_num,
                    "page": c_page,
                    "level": lvl,
                })

            pages: list[dict[str, Any]] = []
            active_chapter = "General"
            active_chapter_num = None

            for page_idx, page in enumerate(doc, start=1):
                page_text = _clean_text(page.get_text("text"))
                
                # Check if TOC establishes a chapter at this page or earlier
                matching_toc = [c for c in parsed_chapters if c["page"] <= page_idx]
                if matching_toc:
                    latest = max(matching_toc, key=lambda c: c["page"])
                    active_chapter = latest["title"]
                    active_chapter_num = latest["chapter_number"]

                # If no TOC match or on page 1, check in-page headings
                for line in page_text.splitlines():
                    ch_match = CHAPTER_HEADING_RE.match(line.strip())
                    if ch_match:
                        raw_num, raw_title = ch_match.group(1), ch_match.group(2).strip()
                        active_chapter = f"Chapter {raw_num}: {raw_title}"
                        try:
                            active_chapter_num = int(raw_num)
                        except ValueError:
                            active_chapter_num = None
                        if not any(c["title"] == active_chapter for c in parsed_chapters):
                            parsed_chapters.append({
                                "title": active_chapter,
                                "chapter_number": active_chapter_num,
                                "page": page_idx,
                            })
                        break

                # Extract author / subject hints from page 1 if default
                if page_idx == 1 and author == "Academic Press":
                    for line in page_text.splitlines():
                        if re.search(r"author[s]?\s*:", line, re.IGNORECASE):
                            author = line.split(":", 1)[1].strip()
                        if re.search(r"subject\s*:", line, re.IGNORECASE):
                            subject = line.split(":", 1)[1].strip()

                pages.append({
                    "page_number": page_idx,
                    "text": page_text,
                    "chapter": active_chapter,
                    "chapter_number": active_chapter_num,
                })

    except Exception as exc:
        logger.exception("Could not extract PDF textbook %s", path.name)
        raise ValueError(f"Could not read PDF '{path.name}': {exc}") from exc

    if not pages:
        raise ValueError(f"PDF '{path.name}' contains no pages.")
    if not any(p["text"] for p in pages):
        raise ValueError(f"PDF '{path.name}' has no extractable text. It may be scanned or empty.")

    # Deduplicate chapters
    unique_chapters = []
    seen = set()
    for c in parsed_chapters:
        key = c["title"].casefold()
        if key not in seen:
            seen.add(key)
            unique_chapters.append(c)

    return {
        "title": title,
        "author": author,
        "subject": subject,
        "pages": pages,
        "chapters": unique_chapters,
    }


def chunk_book_pages(
    extracted_book: dict[str, Any],
    book_id: str,
    filename: str,
    chunk_size: Optional[int] = None,
    overlap: Optional[int] = None,
) -> list[dict[str, Any]]:
    size = chunk_size if chunk_size is not None else settings.chunk_size_chars
    overlap_size = overlap if overlap is not None else settings.chunk_overlap_chars
    book_title = extracted_book["title"]
    author = extracted_book["author"]
    subject = extracted_book["subject"]
    chunks: list[dict[str, Any]] = []

    for page in extracted_book["pages"]:
        page_number = page["page_number"]
        chapter_title = page["chapter"]
        chapter_num = page["chapter_number"]
        text = _clean_text(page["text"])
        if not text:
            continue

        # Split into paragraphs first
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        page_chunk_idx = 0

        for para in paragraphs:
            pieces: list[str] = []
            if len(para) <= size:
                pieces.append(para)
            else:
                start = 0
                while start < len(para):
                    end = min(start + size, len(para))
                    if end < len(para):
                        boundary = para.rfind(" ", start, end)
                        if boundary > start:
                            end = boundary
                    pieces.append(para[start:end].strip())
                    if end >= len(para):
                        break
                    start = max(start + 1, end - overlap_size)

            for piece in pieces:
                chunk_id = f"{book_id}_p{page_number}_c{page_chunk_idx}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "book_id": book_id,
                    "book_title": book_title,
                    "filename": filename,
                    "author": author,
                    "subject": subject,
                    "chapter": chapter_title,
                    "chapter_number": chapter_num,
                    "page_number": page_number,
                    "chunk_index": len(chunks),
                    "content": piece,
                })
                page_chunk_idx += 1

    return chunks


class EmbeddingService:
    DIMENSION = 768

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        self.api_key = (settings.google_api_key if api_key is None else api_key) or ""
        self.model = model or settings.gemini_embedding_model
        self.mode = "gemini" if self.api_key.strip() else "local-hash"
        self.identity = f"{self.mode}:{self.model if self.mode == 'gemini' else self.DIMENSION}"
        self.client = None
        if self.mode == "gemini":
            try:
                self.client = _create_genai_client(self.api_key.strip())
            except Exception as exc:
                logger.warning("Could not initialize Gemini embeddings client; falling back to local-hash: %s", exc)
                self.mode = "local-hash"
                self.identity = f"local-hash:{self.DIMENSION}"

    def _local_embed(self, text: str) -> list[float]:
        import numpy as np

        vector = np.zeros(self.DIMENSION, dtype=np.float32)
        tokens = _tokenize(text)
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:4], "big") % self.DIMENSION
            vector[idx] += 1.0 if digest[4] & 1 else -1.0
        norm = float(np.linalg.norm(vector))
        if norm > 0:
            vector /= norm
        return vector.tolist()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if self.mode == "local-hash" or not self.client:
            return [self._local_embed(t) for t in texts]
        try:
            response = self.client.models.embed_content(
                model=self.model,
                contents=texts,
                config={"output_dimensionality": self.DIMENSION},
            )
            vectors = [list(item.values) for item in (response.embeddings or [])]
            if len(vectors) != len(texts):
                logger.warning("Embedding count mismatch from Gemini; using local fallback.")
                return [self._local_embed(t) for t in texts]
            return vectors
        except Exception as exc:
            logger.warning("Gemini embedding failed (%s); using local fallback", exc)
            return [self._local_embed(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


class VectorStore:
    def __init__(self, path: Optional[Path] = None, embedder: Optional[EmbeddingService] = None):
        self.path = path or settings.chroma_dir
        self.path.mkdir(parents=True, exist_ok=True)
        self.embedder = embedder or EmbeddingService()
        self.meta_path = self.path / "store_meta.json"
        self.data_path = self.path / "vectors.json"
        self.chunks: dict[str, dict[str, Any]] = {}
        self._load()

    def _load(self) -> None:
        if self.data_path.exists():
            try:
                payload = json.loads(self.data_path.read_text(encoding="utf-8"))
                self.chunks = {item["chunk_id"]: item for item in payload.get("chunks", [])}
            except Exception as exc:
                logger.warning("Could not load vector store data: %s", exc)
                self.chunks = {}

    def _save(self) -> None:
        try:
            self.path.mkdir(parents=True, exist_ok=True)
            tmp = self.data_path.with_suffix(".tmp")
            tmp.write_text(
                json.dumps({"chunks": list(self.chunks.values())}, ensure_ascii=False),
                encoding="utf-8",
            )
            tmp.replace(self.data_path)
            
            meta_tmp = self.meta_path.with_suffix(".tmp")
            meta_tmp.write_text(
                json.dumps({"embedding_identity": self.embedder.identity, "total": len(self.chunks)}, indent=2),
                encoding="utf-8",
            )
            meta_tmp.replace(self.meta_path)
        except OSError as exc:
            logger.warning("Vector store save skipped: %s", exc)

    def replace_book(self, book_id: str, chunks: list[dict[str, Any]]) -> None:
        vectors = self.embedder.embed_documents([c["content"] for c in chunks])
        self.chunks = {cid: item for cid, item in self.chunks.items() if item.get("book_id") != book_id}
        for chunk, vector in zip(chunks, vectors):
            self.chunks[chunk["chunk_id"]] = {
                **chunk,
                "vector": vector,
            }
        self._save()

    def delete_book(self, book_id: str) -> None:
        self.chunks = {cid: item for cid, item in self.chunks.items() if item.get("book_id") != book_id}
        self._save()

    def count(self) -> int:
        return len(self.chunks)

    def search(
        self,
        query: str,
        limit: int,
        book_ids: Optional[list[str]] = None,
        chapter: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        import numpy as np

        items = list(self.chunks.values())
        if book_ids:
            target_ids = set(book_ids)
            items = [item for item in items if item.get("book_id") in target_ids]
        if chapter:
            ch_lower = chapter.strip().casefold()
            items = [item for item in items if ch_lower in item.get("chapter", "").casefold()]

        if not items:
            return []

        query_vec = np.array(self.embedder.embed_query(query), dtype=np.float32)
        q_norm = float(np.linalg.norm(query_vec))
        if q_norm > 0:
            query_vec /= q_norm

        matrix = np.array([item["vector"] for item in items], dtype=np.float32)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        matrix_normed = matrix / norms

        similarities = np.dot(matrix_normed, query_vec)
        top_k = min(limit, len(items))
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            item = items[idx]
            sim = float(similarities[idx])
            results.append({
                "chunk_id": item["chunk_id"],
                "book_id": item["book_id"],
                "book_title": item["book_title"],
                "chapter": item["chapter"],
                "chapter_number": item.get("chapter_number"),
                "page_number": item.get("page_number"),
                "content": item["content"],
                "author": item.get("author"),
                "subject": item.get("subject"),
                "dense_score": max(0.0, sim),
            })
        return results


class LexicalIndex:
    def __init__(self, index_path: Optional[Path] = None):
        self.path = index_path or settings.metadata_dir / "lexical_index.json"
        self.chunks: dict[str, dict[str, Any]] = {}
        self.bm25: Optional[BM25Okapi] = None
        self._load()

    def _rebuild(self) -> None:
        if self.chunks:
            corpus = [_tokenize(item["content"]) for item in self.chunks.values()]
            self.bm25 = BM25Okapi(corpus)
        else:
            self.bm25 = None

    def _load(self) -> None:
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8"))
                self.chunks = {item["chunk_id"]: item for item in data.get("chunks", [])}
                self._rebuild()
            except Exception as exc:
                logger.warning("Could not load lexical index: %s", exc)

    def save(self) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(
                json.dumps({"chunks": list(self.chunks.values())}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            tmp.replace(self.path)
        except OSError as exc:
            logger.warning("Lexical index save skipped: %s", exc)

    def replace_book(self, book_id: str, chunks: list[dict[str, Any]]) -> None:
        self.chunks = {cid: item for cid, item in self.chunks.items() if item.get("book_id") != book_id}
        for chunk in chunks:
            self.chunks[chunk["chunk_id"]] = chunk
        self._rebuild()
        self.save()

    def delete_book(self, book_id: str) -> None:
        self.chunks = {cid: item for cid, item in self.chunks.items() if item.get("book_id") != book_id}
        self._rebuild()
        self.save()

    def search(
        self,
        query: str,
        limit: int,
        book_ids: Optional[list[str]] = None,
        chapter: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        if not self.bm25 or not self.chunks:
            return []

        items = list(self.chunks.values())
        tokens = _tokenize(query)
        if not tokens:
            return []

        scores = self.bm25.get_scores(tokens)
        ranked = []
        for idx, score in enumerate(scores):
            if score <= 0:
                continue
            item = items[idx]
            if book_ids and item.get("book_id") not in set(book_ids):
                continue
            if chapter and chapter.strip().casefold() not in item.get("chapter", "").casefold():
                continue
            ranked.append((item, float(score)))

        ranked.sort(key=lambda x: x[1], reverse=True)
        return [dict(item, lexical_score=score) for item, score in ranked[:limit]]


class DocumentManager:
    def __init__(
        self,
        store: Optional[VectorStore] = None,
        lexical: Optional[LexicalIndex] = None,
        registry_path: Optional[Path] = None,
    ):
        self.store = store or vector_store
        self.lexical = lexical or lexical_index
        self.registry_path = registry_path or settings.metadata_dir / "books.json"
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        self.books: dict[str, dict[str, Any]] = {}
        self._load_registry()

    def _load_registry(self) -> None:
        if self.registry_path.exists():
            try:
                content = json.loads(self.registry_path.read_text(encoding="utf-8"))
                self.books = {item["id"]: item for item in content.get("books", [])}
            except Exception as exc:
                logger.warning("Could not load books registry: %s", exc)

    def _save_registry(self) -> None:
        try:
            tmp = self.registry_path.with_suffix(".tmp")
            tmp.write_text(
                json.dumps({
                    "books": list(self.books.values()),
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                }, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            tmp.replace(self.registry_path)
        except OSError as exc:
            logger.warning("Could not persist books registry: %s", exc)

    def ingest_file(
        self,
        path: Path,
        *,
        source_filename: Optional[str] = None,
        title_override: Optional[str] = None,
        subject_override: Optional[str] = None,
        force: bool = False,
    ) -> dict[str, Any]:
        if not path.is_file():
            raise ValueError(f"File not found: {path.name}")
        source = Path(source_filename or path.name).name
        extension = path.suffix.casefold()
        if extension != ".pdf":
            raise ValueError("Only PDF textbooks are currently supported.")

        data = path.read_bytes()
        if len(data) > settings.max_upload_size_mb * 1024 * 1024:
            raise ValueError(f"File exceeds maximum upload size of {settings.max_upload_size_mb} MB.")

        checksum = hashlib.sha256(data).hexdigest()
        book_id = _stable_document_id(source)
        existing = self.books.get(book_id)

        if not force and existing and existing.get("checksum") == checksum and existing.get("status") == "ready":
            return existing

        extracted = extract_pdf_book(path)
        if title_override:
            extracted["title"] = title_override
        if subject_override:
            extracted["subject"] = subject_override

        chunks = chunk_book_pages(extracted, book_id, source)
        if not chunks:
            raise ValueError(f"No extractable text chunks in '{source}'.")

        self.store.replace_book(book_id, chunks)
        self.lexical.replace_book(book_id, chunks)

        book_entry = {
            "id": book_id,
            "filename": source,
            "title": extracted["title"],
            "author": extracted["author"],
            "subject": extracted["subject"],
            "pages": len(extracted["pages"]),
            "chapters": extracted["chapters"],
            "chunks": len(chunks),
            "status": "ready",
            "checksum": checksum,
            "chunking_version": CHUNKING_VERSION,
            "created_at": existing.get("created_at") if existing else datetime.now(timezone.utc).isoformat(),
        }
        self.books[book_id] = book_entry
        self._save_registry()
        return book_entry

    def sync_books_directory(self, directory: Optional[Path] = None, *, force: bool = False) -> dict[str, int]:
        target_dir = directory or settings.books_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        files = sorted(p for p in target_dir.iterdir() if p.is_file() and p.suffix.casefold() == ".pdf")
        processed = 0
        for f in files:
            try:
                self.ingest_file(f, force=force)
                processed += 1
            except Exception as exc:
                logger.exception("Failed to ingest book '%s': %s", f.name, exc)
        return {"processed": processed}

    def delete_book(self, book_id: str) -> bool:
        if book_id not in self.books:
            return False
        self.store.delete_book(book_id)
        self.lexical.delete_book(book_id)
        del self.books[book_id]
        self._save_registry()
        return True


class HybridRetriever:
    def __init__(self, store: VectorStore, lexical: LexicalIndex):
        self.store = store
        self.lexical = lexical

    def retrieve(
        self,
        query: str,
        limit: Optional[int] = None,
        book_ids: Optional[list[str]] = None,
        chapter: Optional[str] = None,
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        if not query.strip():
            return [], {"dense_count": 0, "lexical_count": 0, "fused_count": 0, "is_evidence_sufficient": False}

        result_limit = max(1, min(limit or settings.top_k_final, 8))
        combined: dict[str, dict[str, Any]] = {}

        dense_results = self.store.search(query, settings.top_k_dense, book_ids=book_ids, chapter=chapter)
        lexical_results = self.lexical.search(query, settings.top_k_lexical, book_ids=book_ids, chapter=chapter)

        # Reciprocal Rank Fusion (RRF)
        for rank, item in enumerate(dense_results, start=1):
            cur = combined.setdefault(item["chunk_id"], dict(item, dense_rank=None, lexical_rank=None, rrf=0.0))
            cur.update(item)
            cur["dense_rank"] = min(cur["dense_rank"] or rank, rank)
            cur["rrf"] += 1.0 / (60 + rank)

        for rank, item in enumerate(lexical_results, start=1):
            cur = combined.setdefault(item["chunk_id"], dict(item, dense_rank=None, lexical_rank=None, rrf=0.0))
            cur.update({k: v for k, v in item.items() if k != "dense_score"})
            cur["lexical_rank"] = min(cur["lexical_rank"] or rank, rank)
            cur["rrf"] += 1.0 / (60 + rank)

        fused = sorted(combined.values(), key=lambda x: x["rrf"], reverse=True)[:result_limit]

        # Grounding & sufficiency verification
        meaningful_tokens = set(_tokenize(query)) - STOP_WORDS
        retrieved_tokens = {w for it in fused for w in _tokenize(it["content"])}
        token_overlap = meaningful_tokens & retrieved_tokens
        sufficient = bool(fused) and (bool(token_overlap) or len(meaningful_tokens) <= 1)

        trace = {
            "dense_count": len(dense_results),
            "lexical_count": len(lexical_results),
            "fused_count": len(fused),
            "token_overlap_count": len(token_overlap),
            "is_evidence_sufficient": sufficient,
            "selected_chunks": [
                {
                    "chunk_id": it["chunk_id"],
                    "book_title": it["book_title"],
                    "chapter": it["chapter"],
                    "page": it.get("page_number"),
                    "rrf": round(it["rrf"], 4),
                }
                for it in fused
            ],
        }
        return fused, trace


class AnswerGenerator:
    SYSTEM_INSTRUCTION = """You are the Textbook Concept & Study Assistant, an expert academic tutor.
Your duty is to answer students' questions grounded strictly and exclusively in the provided textbook passages.

Rules:
1. Base all explanations, equations, algorithms, and facts on the retrieved textbook context.
2. Provide clear, accurate chapter and page citations for every major claim.
3. If the retrieved textbook passages do not contain enough information to answer the question, clearly state:
   "The selected textbook collection does not contain sufficient information to answer this question."
   Never invent or fabricate facts, authors, chapters, or page citations.
4. Adapt your explanation style to the requested difficulty level:
   - "simple": Explain intuitively using clear analogies and plain language.
   - "standard": Balanced academic explanation with practical examples.
   - "academic": Rigorous deep dive with formal definitions, invariant analysis, or mathematical formulations.
5. Format your output cleanly in Markdown, using bold headers, bullet lists, and code blocks where applicable.
"""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = (settings.google_api_key if api_key is None else api_key) or ""
        self.model = model or settings.gemini_model
        self.client = None
        if self.api_key.strip():
            try:
                self.client = _create_genai_client(self.api_key.strip())
            except Exception as exc:
                logger.warning("Could not initialize Gemini client: %s", exc)

    def _format_citations(self, chunks: list[dict[str, Any]]) -> list[Citation]:
        citations: list[Citation] = []
        seen = set()
        for c in chunks:
            key = (c["book_title"], c["chapter"], c.get("page_number"))
            if key not in seen:
                seen.add(key)
                excerpt = c["content"]
                if len(excerpt) > 280:
                    excerpt = excerpt[:277] + "..."
                citations.append(
                    Citation(
                        book_title=c["book_title"],
                        chapter=c["chapter"],
                        page=c.get("page_number"),
                        excerpt=excerpt,
                        chunk_id=c.get("chunk_id"),
                    )
                )
        return citations

    def generate(
        self,
        query: str,
        chunks: list[dict[str, Any]],
        sufficient: bool,
        history: list[dict[str, str]],
        difficulty: str = "standard",
    ) -> tuple[str, list[Citation], str]:
        if not sufficient or not chunks:
            return (
                "The selected textbook collection does not contain sufficient information to answer this question. "
                "Please verify that the relevant textbook has been selected in your library, or try rephrasing your topic.",
                [],
                "insufficient_evidence",
            )

        citations = self._format_citations(chunks)

        if not self.client:
            # Deterministic local grounded answer generator
            return self._local_grounded_answer(query, chunks, difficulty), citations, "local_grounded"

        # Gemini LLM generation
        evidence_text = "\n\n".join(
            f"[Source: {c['book_title']} | Chapter: {c['chapter']} | Page: {c.get('page_number')}]\n{c['content']}"
            for c in chunks
        )
        recent_history = history[-6:]
        user_prompt = (
            f"Difficulty Level: {difficulty}\n\n"
            f"Conversation History:\n{json.dumps(recent_history, ensure_ascii=False)}\n\n"
            f"Student Question:\n{query}\n\n"
            f"Retrieved Textbook Passages:\n{evidence_text}\n\n"
            "Please provide a comprehensive, well-structured answer explaining the concepts clearly based on the passages above."
        )

        try:
            from google.genai import types

            response = self.client.models.generate_content(
                model=self.model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.SYSTEM_INSTRUCTION,
                    temperature=0.2,
                ),
            )
            answer = response.text or ""
            if not answer.strip():
                return self._local_grounded_answer(query, chunks, difficulty), citations, "local_fallback"
            return answer.strip(), citations, "gemini"
        except Exception as exc:
            logger.warning("Gemini generation failed (%s); using local grounded synthesis", exc)
            return self._local_grounded_answer(query, chunks, difficulty), citations, "local_fallback"

    def _local_grounded_answer(self, query: str, chunks: list[dict[str, Any]], difficulty: str) -> str:
        # Group excerpts by chapter
        grouped: dict[str, list[str]] = {}
        for c in chunks:
            label = f"{c['book_title']} — {c['chapter']} (Page {c.get('page_number')})"
            grouped.setdefault(label, []).append(c["content"])

        sections = []
        if difficulty == "simple":
            sections.append(f"### Simplified Concept Overview: {query.title()}\n")
            sections.append("Here is an intuitive explanation based directly on your textbook materials:\n")
        elif difficulty == "academic":
            sections.append(f"### In-Depth Academic Analysis: {query.title()}\n")
            sections.append("Formulations, properties, and core theorems established in the textbook:\n")
        else:
            sections.append(f"### Textbook Explanation: {query.title()}\n")

        for source_label, contents in grouped.items():
            sections.append(f"#### From {source_label}:\n")
            for text in contents:
                for line in text.splitlines():
                    if line.strip():
                        sections.append(f"> {line.strip()}")
            sections.append("")

        sections.append("\n**Key Takeaway:** The retrieved textbook excerpts directly address this concept above.")
        return "\n".join(sections)

    def generate_study_tool(
        self,
        tool_type: str,
        topic: str,
        chunks: list[dict[str, Any]],
    ) -> tuple[str, Any, list[Citation]]:
        if not chunks:
            msg = "No relevant textbook passages were found for the selected topic and filters."
            return msg, None, []

        citations = self._format_citations(chunks)
        evidence_text = "\n\n".join(
            f"[{c['book_title']} | {c['chapter']} | Page {c.get('page_number')}]: {c['content']}"
            for c in chunks
        )

        if not self.client:
            return self._local_study_tool(tool_type, topic, chunks, citations)

        from google.genai import types

        prompt = f"""You are a textbook study assistant generating {tool_type.replace('_', ' ')} for students.
Topic: {topic}
Retrieved Textbook Context:
{evidence_text}

Follow the specific format for the requested study tool:
- flashcards: Return JSON array of objects with keys "front", "back", "chapter", "page".
- mcqs: Return JSON array of objects with keys "question", "options" (list of objects with "key" and "text"), "correct_key", "explanation", "citation".
- short_answers: Return JSON array of objects with keys "question", "sample_answer", "key_points", "citation".
- revision_notes: Return clean Markdown notes with # Title, ## Key Concepts, bullet points, and summary table.
- summary: Return a well-organized chapter summary with bullet points and key takeaways.
- explain_simply: Return an intuitive, simple breakdown with everyday analogies.
- detailed_explanation: Return a deep, rigorous breakdown of mechanisms and formulas.
"""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2),
            )
            raw_text = response.text or ""
            structured = None

            # Attempt to extract JSON for structured tools
            if tool_type in {"flashcards", "mcqs", "short_answers"}:
                json_match = re.search(r"\[\s*\{.*\}\s*\]", raw_text, re.DOTALL)
                if json_match:
                    try:
                        structured = json.loads(json_match.group(0))
                    except Exception:
                        pass

            return raw_text.strip(), structured, citations
        except Exception as exc:
            logger.warning("Gemini study tool generation failed (%s); using local synthesizer", exc)
            return self._local_study_tool(tool_type, topic, chunks, citations)

    def _local_study_tool(
        self,
        tool_type: str,
        topic: str,
        chunks: list[dict[str, Any]],
        citations: list[Citation],
    ) -> tuple[str, Any, list[Citation]]:
        primary = chunks[0]
        chapter = primary["chapter"]
        page = primary.get("page_number")
        book_title = primary["book_title"]

        if tool_type == "flashcards":
            cards = []
            for idx, c in enumerate(chunks[:5], start=1):
                sentences = [s.strip() for s in re.split(r"\.\s+", c["content"]) if len(s.strip()) > 20]
                front = f"What does {c['book_title']} explain regarding {topic or c['chapter']}?"
                if sentences:
                    front = f"Concept: {sentences[0]}"
                    back = ". ".join(sentences[1:3]) or sentences[0]
                else:
                    back = c["content"][:200]
                cards.append(FlashcardItem(front=front, back=back, chapter=c["chapter"], page=c.get("page_number")).model_dump())
            md = f"### Flashcards for {topic or chapter}\nGenerated {len(cards)} interactive flashcards from {book_title}."
            return md, cards, citations

        elif tool_type == "mcqs":
            mcqs = []
            for idx, c in enumerate(chunks[:4], start=1):
                q = f"According to {c['book_title']} ({c['chapter']}), which statement is correct regarding {topic or 'the topic'}?"
                sentences = [s.strip() for s in re.split(r"\.\s+", c["content"]) if len(s.strip()) > 15]
                correct = sentences[0] if sentences else c["content"][:80]
                options = [
                    MCQOption(key="A", text=correct),
                    MCQOption(key="B", text="It is an unverified hypothesis not supported by the textbook."),
                    MCQOption(key="C", text="The algorithm runs in exponential time with infinite memory."),
                    MCQOption(key="D", text="None of the listed invariants apply to this structure."),
                ]
                mcqs.append(MCQItem(
                    question=q,
                    options=options,
                    correct_key="A",
                    explanation=f"Referenced directly in {c['chapter']}, page {c.get('page_number')}.",
                    citation=f"{c['book_title']} (p. {c.get('page_number')})",
                ).model_dump())
            md = f"### Multiple Choice Questions for {topic or chapter}\nGenerated {len(mcqs)} practice questions."
            return md, mcqs, citations

        elif tool_type == "short_answers":
            items = []
            for idx, c in enumerate(chunks[:3], start=1):
                items.append(ShortAnswerItem(
                    question=f"Explain the core concept presented in {c['chapter']} regarding {topic or 'this subject'}.",
                    sample_answer=c["content"][:250] + "...",
                    key_points=["Grounded in textbook text", f"Located on page {c.get('page_number')}"],
                    citation=f"{c['book_title']} ({c['chapter']}, p. {c.get('page_number')})",
                ).model_dump())
            md = f"### Short-Answer Practice Questions for {topic or chapter}"
            return md, items, citations

        elif tool_type == "revision_notes":
            lines = [
                f"# Revision Notes: {topic or chapter}",
                f"**Source:** {book_title} | **Chapter:** {chapter} | **Page:** {page}\n",
                "## Key Concepts and Definitions",
            ]
            for c in chunks:
                lines.append(f"\n### {c['chapter']} (Page {c.get('page_number')})")
                for line in c["content"].splitlines():
                    if line.strip():
                        lines.append(f"- {line.strip()}")
            lines.append("\n## Summary Table")
            lines.append("| Concept / Topic | Textbook Source | Page |")
            lines.append("| :--- | :--- | :--- |")
            for c in chunks[:5]:
                lines.append(f"| {topic or c['chapter']} | {c['book_title']} | {c.get('page_number')} |")
            return "\n".join(lines), None, citations

        elif tool_type == "explain_simply":
            md = f"### Simply Explained: {topic or chapter}\n\n"
            md += "Imagine you are explaining this to a fellow student in plain terms:\n\n"
            for c in chunks:
                md += f"> **Textbook Context ({c['chapter']}, p. {c.get('page_number')}):**\n"
                md += f"> {c['content']}\n\n"
            md += "**Analogy & Simple Summary:** The underlying principle ensures that operations execute predictably and efficiently according to the rules defined above."
            return md, None, citations

        else:  # summary or detailed_explanation
            md = f"### Comprehensive Summary: {topic or chapter}\n\n"
            md += f"**Textbook:** {book_title}\n\n"
            for c in chunks:
                md += f"#### {c['chapter']} (Page {c.get('page_number')}):\n"
                md += f"{c['content']}\n\n"
            return md, None, citations


# Initialize singletons
embedding_service = EmbeddingService()
vector_store = VectorStore(embedder=embedding_service)
lexical_index = LexicalIndex()
document_manager = DocumentManager(store=vector_store, lexical=lexical_index)
hybrid_retriever = HybridRetriever(store=vector_store, lexical=lexical_index)
answer_generator = AnswerGenerator()
