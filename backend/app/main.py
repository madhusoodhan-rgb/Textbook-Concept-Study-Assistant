import json
import logging
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.rag import (
    RAGError,
    answer_generator,
    document_manager,
    embedding_service,
    hybrid_retriever,
    vector_store,
)
from app.schemas import (
    BookInfo,
    BookListResponse,
    ChatRequest,
    ChatResponse,
    ConversationDetail,
    ConversationRenameRequest,
    ConversationSummary,
    ConversationTurn,
    HealthResponse,
    StudyToolsRequest,
    StudyToolsResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

CONVERSATIONS_FILE = settings.metadata_dir / "conversations.json"


def _load_conversations() -> dict[str, dict[str, Any]]:
    if CONVERSATIONS_FILE.exists():
        try:
            data = json.loads(CONVERSATIONS_FILE.read_text(encoding="utf-8"))
            return {item["id"]: item for item in data.get("conversations", [])}
        except Exception as exc:
            logger.warning("Could not read conversations file: %s", exc)
    return {}


def _save_conversations(conversations: dict[str, dict[str, Any]]) -> None:
    try:
        CONVERSATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CONVERSATIONS_FILE.with_suffix(".tmp")
        tmp.write_text(
            json.dumps({"conversations": list(conversations.values())}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        tmp.replace(CONVERSATIONS_FILE)
    except OSError as exc:
        logger.warning("Could not persist conversations: %s", exc)


conversations_db: dict[str, dict[str, Any]] = _load_conversations()


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        report = document_manager.sync_books_directory()
        logger.info("Textbook library initialized. Ingested/synced: %s books", report["processed"])
    except Exception as exc:
        logger.exception("Error syncing textbooks at startup: %s", exc)
    yield


app = FastAPI(
    title=settings.app_name,
    description="AI-powered Textbook Concept & Study Assistant with grounded citations",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_synced() -> None:
    if not document_manager.books or vector_store.count() == 0:
        try:
            document_manager.sync_books_directory()
        except Exception:
            logger.exception("Could not sync books directory.")


@app.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    ensure_synced()
    books = list(document_manager.books.values())
    total_pages = sum(int(b.get("pages", 0)) for b in books)
    return HealthResponse(
        status="healthy",
        app_name=settings.app_name,
        gemini_configured=bool(settings.google_api_key and settings.google_api_key.strip()),
        embedding_mode=embedding_service.mode,
        books=len(books),
        pages=total_pages,
        chunks=vector_store.count(),
    )


@app.get("/api/books", response_model=BookListResponse)
@app.get("/api/documents", response_model=BookListResponse, include_in_schema=False)
def list_books() -> BookListResponse:
    ensure_synced()
    books = [BookInfo(**doc) for doc in document_manager.books.values()]
    total_pages = sum(b.pages for b in books)
    return BookListResponse(
        books=books,
        total_books=len(books),
        total_pages=total_pages,
        total_chunks=vector_store.count(),
    )


@app.get("/api/books/{book_id}", response_model=BookInfo)
def get_book(book_id: str) -> BookInfo:
    ensure_synced()
    if book_id not in document_manager.books:
        raise HTTPException(status_code=404, detail="Textbook not found.")
    return BookInfo(**document_manager.books[book_id])


@app.delete("/api/books/{book_id}")
def delete_book(book_id: str):
    if book_id not in document_manager.books:
        raise HTTPException(status_code=404, detail="Textbook not found.")
    doc = document_manager.books[book_id]
    # Delete uploaded file if in uploads directory
    upload_file = settings.uploads_dir / doc["filename"]
    if upload_file.exists():
        try:
            upload_file.unlink()
        except OSError:
            pass
    document_manager.delete_book(book_id)
    return {"status": "deleted", "book_id": book_id}


@app.post("/api/books/upload")
@app.post("/api/documents/upload", include_in_schema=False)
async def upload_book(file: UploadFile = File(...)):
    original_name = Path(file.filename or "").name
    if not original_name:
        raise HTTPException(status_code=400, detail="Missing filename.")
    suffix = Path(original_name).suffix.casefold()
    if suffix != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF textbooks are supported.")

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    destination = settings.uploads_dir / f"{uuid.uuid4().hex[:12]}_{original_name}"
    total = 0
    try:
        with destination.open("wb") as target:
            while block := await file.read(1024 * 1024):
                total += len(block)
                if total > settings.max_upload_size_mb * 1024 * 1024:
                    raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_size_mb} MB limit.")
                target.write(block)
        
        book_info = document_manager.ingest_file(destination, source_filename=original_name, force=True)
        return {
            "status": "success",
            "book": BookInfo(**book_info),
        }
    except ValueError as exc:
        if destination.exists():
            destination.unlink()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Upload processing failed: %s", exc)
        if destination.exists():
            destination.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process textbook PDF: {exc}")


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    ensure_synced()
    query = payload.message.strip()
    if not query:
        raise HTTPException(status_code=422, detail="Please enter a question.")

    conv_id = payload.conversation_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conv = conversations_db.setdefault(
        conv_id,
        {
            "id": conv_id,
            "title": query[:50] + ("..." if len(query) > 50 else ""),
            "created_at": now,
            "updated_at": now,
            "messages": [],
        },
    )

    history = [
        {"role": m["role"], "content": m["content"]}
        for m in conv["messages"]
        if m.get("role") in {"user", "assistant"}
    ]

    try:
        # Contextual retrieval: expand brief follow-up queries with prior user prompt
        retrieval_query = query
        prior_user_msgs = [m["content"] for m in conv["messages"] if m["role"] == "user"]
        if prior_user_msgs and len(query.split()) <= 5 and re.search(r"\b(it|this|that|those|they|them|how|why)\b", query, re.I):
            retrieval_query = f"{prior_user_msgs[-1]} {query}"

        chunks, trace = hybrid_retriever.retrieve(
            retrieval_query,
            book_ids=payload.book_ids,
            chapter=payload.chapter,
        )

        answer, citations, mode = answer_generator.generate(
            query,
            chunks,
            trace["is_evidence_sufficient"],
            history,
            difficulty=payload.difficulty or "standard",
        )
        trace["mode"] = mode

    except RAGError as exc:
        logger.exception("RAG processing error")
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during chat processing: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve or generate answer from textbooks.")

    # Record message history
    user_turn = {
        "role": "user",
        "content": query,
        "citations": [],
        "created_at": now,
    }
    assistant_turn = {
        "role": "assistant",
        "content": answer,
        "citations": [c.model_dump() for c in citations],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    conv["messages"].extend([user_turn, assistant_turn])
    conv["updated_at"] = assistant_turn["created_at"]
    _save_conversations(conversations_db)

    return ChatResponse(
        conversation_id=conv_id,
        answer=answer,
        citations=citations,
        is_evidence_sufficient=trace["is_evidence_sufficient"],
        retrieval_trace=trace,
    )


@app.get("/api/conversations", response_model=list[ConversationSummary])
def list_conversations() -> list[ConversationSummary]:
    summaries = [
        ConversationSummary(
            id=c["id"],
            title=c["title"],
            updated_at=c.get("updated_at", c["created_at"]),
            message_count=len(c["messages"]),
        )
        for c in conversations_db.values()
    ]
    summaries.sort(key=lambda s: s.updated_at, reverse=True)
    return summaries


@app.post("/api/conversations", response_model=ConversationDetail)
def create_conversation() -> ConversationDetail:
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": conv_id,
        "title": "New Conversation",
        "created_at": now,
        "updated_at": now,
        "messages": [],
    }
    conversations_db[conv_id] = record
    _save_conversations(conversations_db)
    return ConversationDetail(**record)


@app.get("/api/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: str) -> ConversationDetail:
    if conversation_id not in conversations_db:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return ConversationDetail(**conversations_db[conversation_id])


@app.patch("/api/conversations/{conversation_id}")
def rename_conversation(conversation_id: str, payload: ConversationRenameRequest):
    if conversation_id not in conversations_db:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    conversations_db[conversation_id]["title"] = payload.title.strip()
    conversations_db[conversation_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
    _save_conversations(conversations_db)
    return {"status": "renamed", "title": conversations_db[conversation_id]["title"]}


@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    if conversation_id not in conversations_db:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    del conversations_db[conversation_id]
    _save_conversations(conversations_db)
    return {"status": "deleted", "conversation_id": conversation_id}


@app.post("/api/study-tools", response_model=StudyToolsResponse)
def generate_study_tool(payload: StudyToolsRequest) -> StudyToolsResponse:
    ensure_synced()
    topic = (payload.topic or "").strip()
    if not topic and not payload.chapter:
        raise HTTPException(status_code=422, detail="Please provide a concept topic or select a chapter.")

    query = topic or f"Key concepts in {payload.chapter}"
    chunks, _ = hybrid_retriever.retrieve(
        query,
        limit=6,
        book_ids=payload.book_ids,
        chapter=payload.chapter,
    )

    if not chunks:
        raise HTTPException(
            status_code=404,
            detail="No relevant textbook context found for the selected topic and filters.",
        )

    content, structured, citations = answer_generator.generate_study_tool(
        payload.tool_type,
        topic,
        chunks,
    )

    return StudyToolsResponse(
        tool_type=payload.tool_type,
        topic=topic or payload.chapter or "Chapter Concepts",
        content=content,
        structured_data=structured,
        citations=citations,
    )
