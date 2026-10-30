# System Architecture — Textbook Concept & Study Assistant

## 1. Overview
The **Textbook Concept & Study Assistant** is a production-grade educational Retrieval-Augmented Generation (RAG) platform. It allows students to query large PDF textbooks and receive natural, conceptual explanations grounded strictly in textbook passages with verified chapter and page citations.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (React)                        │
│  - Academic UI (Inter / Outfit / JetBrains Mono)            │
│  - Interactive Citation Cards & Right Source Panel          │
│  - Study Tools Suite (Flashcards, Quizzes, Revision Notes)  │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTP / JSON                  │
┌──────────────▼──────────────────────────────┴───────────────┐
│                    FastAPI Gateway                          │
│  - CORS & Upload Validation (PDF Size Limits)               │
│  - Conversations Database & Persistence Engine              │
│  - Study Tools Synthesizer                                  │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
┌──────────────▼──────────────────────────────┴───────────────┐
│                      Hybrid Retriever                       │
│  - Dense Semantic Search (Gemini / Local Hashing Cosine)    │
│  - Lexical Search (BM25Okapi)                               │
│  - Reciprocal Rank Fusion (RRF Algorithm)                   │
│  - Grounding & Evidence Sufficiency Gating                  │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
┌──────────────▼──────────────────────────────┴───────────────┐
│                 Textbook Ingestion Engine                   │
│  - PyMuPDF Page & Table of Contents (TOC) Extraction        │
│  - Chapter Boundary & Page Association                      │
│  - Clean Text & Paragraph Chunking (1000 Chars / 150 Overlap│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Ingestion & Citation Provenance

### Zero-Hallucination Protocol
Traditional RAG systems frequently hallucinate page numbers or guess chapter headings. This system guarantees verified provenance:

1. **Table of Contents (TOC) Extraction**:
   Using `pymupdf`, the engine reads bookmark trees directly (`doc.get_toc()`), resolving each chapter's exact starting page.
2. **Heading Detection Fallback**:
   For PDFs lacking embedded bookmark trees, page texts are evaluated against regex patterns (`^(?:Chapter|Unit|Section|Module)\s+(\d+|[IVXLCDM]+)`), tracking chapter transitions across page numbers.
3. **Chunk Metadata Schema**:
   Every chunk generated inherits immutable document metadata:
   ```json
   {
     "chunk_id": "90ba9b222d1ad266_p1_c0",
     "book_id": "90ba9b222d1ad266",
     "book_title": "Data Structures And Algorithms",
     "filename": "data_structures_and_algorithms.pdf",
     "author": "Dr. Robert Sedgewick & Dr. Alan Turing",
     "subject": "Computer Science",
     "chapter": "Chapter 1: Asymptotic Analysis and Big-O Notation",
     "chapter_number": 1,
     "page_number": 1,
     "content": "..."
   }
   ```
4. **Citation Output**:
   When answers are generated, citations cite the exact `book_title`, `chapter`, and `page_number` present in the retrieved chunk metadata.

---

## 3. Hybrid Search & RRF Ranking

### Dense Embedding
- **Primary**: Google Gemini embeddings (`gemini-embedding-001` or `text-embedding-004`) via `google.genai.Client`.
- **Deterministic Fallback**: High-dimensional hashed token vectors with cosine similarity (`local-hash:768`), allowing full offline operation and zero setup cost during testing.

### Lexical Index (BM25Okapi)
- Tokenizes queries and textbook passages with custom word boundary regex and academic stopword filtering.
- Ranks candidate passages using standard Okapi BM25 scores.

### Reciprocal Rank Fusion (RRF)
Results from both dense and lexical retrievers are fused using the RRF formula:
$$RRF(d) = \sum_{m \in \{dense, lexical\}} \frac{1}{60 + rank_m(d)}$$

---

## 4. Grounding & Abstention Strategy
When a student asks an out-of-domain question (e.g., cooking recipes or facts not contained in the selected textbooks), the system compares query keyword tokens against retrieved passage vocabulary. If the token overlap is insufficient:
- The system abstains gracefully:
  > *"The selected textbook collection does not contain sufficient information to answer this question. Please verify that the relevant textbook has been selected in your library, or try rephrasing your topic."*
- Fabricated or ungrounded responses are prevented.

---

## 5. Study Tools Architecture

The study tools engine adapts retrieved textbook passages into interactive formats:
- **Interactive Flashcards**: Generates front/back concept pairs mapped to specific chapters.
- **Multiple Choice Questions (MCQs)**: Creates 4 options (A-D) with answer keys and textbook citations.
- **Short-Answer Questions**: Provides model answers and key assessment points.
- **Revision Notes**: Compiles definitions, bullet points, and markdown summary tables.
