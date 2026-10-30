# Textbook Concept & Study Assistant 📚🎓

An AI-powered academic study platform and textbook RAG (Retrieval-Augmented Generation) assistant that answers students' questions strictly grounded in their textbook collection with verified chapter and page citations.

![Textbook Assistant Banner](https://img.shields.io/badge/Textbook-Concept%20%26%20Study%20Assistant-blue?style=for-the-badge&logo=bookstack)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Python Tests](https://img.shields.io/badge/pytest-8%20passed-brightgreen.svg?style=flat&logo=pytest)](https://pytest.org)

---

## 🌟 Key Features

### 📖 1. Grounded Textbook Ingestion & Citation Provenance
- **Accurate Chapter & Page Numbers**: Parses PDF Table of Contents (TOC) bookmarks and chapter headings with PyMuPDF, linking every chunk to its true book title, chapter title, and page number.
- **Zero Hallucination Protocol**: Citations are derived exclusively from retrieved metadata. The assistant never fabricates citations or invents unlisted chapters.
- **Out-of-Domain Abstention**: When queried on topics not covered in the selected textbooks, the assistant transparently clarifies that information is not available in the collection.

### 🤖 2. Contextual AI Chatbot
- **Natural-Language Inquiries**: Ask complex concepts across single or multiple selected textbooks.
- **Multi-Level Difficulty Modes**:
  - **Explain Simply**: Intuitive analogies and beginner-friendly breakdowns.
  - **Standard Academic**: Balanced pedagogical explanations with textbook examples.
  - **In-Depth Rigorous**: Comprehensive analyses of theorems, invariants, and formulations.
- **Interactive Citation Cards**: View source excerpts directly beneath each answer with one-click opening in the **Right Source Inspector**.
- **Conversation Management**: Create, rename, persist, and delete conversation threads.

### ⚡ 3. Automated Study & Revision Tools
- **Interactive Flashcards**: 3D flip-cards with front/back questions and answers mapped to textbook chapters, with flip controls and celebration confetti.
- **Practice MCQs**: Multiple-choice quizzes with options A–D, instant answer feedback, textbook explanations, and citation badges.
- **Short-Answer Questions**: Concept exam questions paired with model answers and evaluation points.
- **Revision Notes**: Downloadable Markdown revision sheets with bullet points, definitions, and summary tables.
- **Chapter Summaries**: Concise synthesis of key chapter takeaways.

### 📚 4. Textbook Library Management
- **PDF Uploads**: Drag-and-drop PDF textbook uploader with file validation and progress feedback.
- **Subject Filtering**: Organize and filter textbooks by subject (Computer Science, Artificial Intelligence, Physics, Mathematics, etc.).
- **Chapter Focus Filter**: Select a specific chapter to constrain chat and study tool generation.

---

## 🏗️ Repository Architecture

```
Textbook-Concept-Study-Assistant/
├── backend/
│   ├── app/
│   │   ├── config.py           # Application settings & environment variables
│   │   ├── main.py             # FastAPI REST endpoints & CORS
│   │   ├── rag.py              # PyMuPDF extraction, embeddings, vector store, RRF retriever
│   │   └── schemas.py          # Pydantic request/response schemas
│   ├── data/
│   │   ├── books/              # PDF textbooks collection
│   │   └── metadata/           # Registry & index persistence (books.json, conversations.json)
│   ├── scripts/
│   │   └── generate_sample_books.py # Sample textbook PDF generator
│   ├── tests/
│   │   └── test_api.py         # Pytest API and RAG integration test suite
│   └── requirements.txt        # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts       # Axios API client
│   │   ├── components/
│   │   │   ├── BookmarksModal.tsx       # Saved citations manager
│   │   │   ├── ChatArea.tsx             # Main chat area & prompt suggestions
│   │   │   ├── ChatMessageItem.tsx      # Messages, code blocks, & feedback controls
│   │   │   ├── CitationCard.tsx         # Citation cards with page & chapter badges
│   │   │   ├── MarkdownRenderer.tsx     # Custom academic Markdown parser
│   │   │   ├── RightSourcePanel.tsx     # Source inspector side drawer
│   │   │   ├── Sidebar.tsx              # Navigation, conversations, & theme toggle
│   │   │   ├── StudyToolsModal.tsx      # Flashcards, MCQs, & notes generator
│   │   │   └── TextbookLibraryModal.tsx # Textbook library & upload modal
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript interfaces
│   │   ├── App.tsx             # Main stateful root view
│   │   ├── index.css           # Tailwind v4 academic styling
│   │   └── main.tsx            # Vite entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── ARCHITECTURE.md         # In-depth RAG & citation architecture documentation
│   └── DEPLOYMENT.md           # Step-by-step Vercel & backend deployment guide
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**

### 1. Clone Repository
```bash
git clone https://github.com/madhusoodhan-rgb/Textbook-Concept-Study-Assistant.git
cd Textbook-Concept-Study-Assistant
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Optional)* Add your `GOOGLE_API_KEY` to `.env`. The backend automatically uses deterministic local hashed embeddings and local grounded synthesis if no key is configured!

### 3. Start Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```
The FastAPI backend will start at `http://127.0.0.1:8000`.
Interactive OpenAPI docs are available at `http://127.0.0.1:8000/docs`.

### 4. Start Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://127.0.0.1:5173/` in your browser.

---

## 🧪 Testing & Verification

Run the automated backend test suite:
```bash
pytest backend/tests/test_api.py -v
```

### Verified Test Results:
```text
backend/tests/test_api.py::test_health_endpoint PASSED                   [ 12%]
backend/tests/test_api.py::test_list_books PASSED                        [ 25%]
backend/tests/test_api.py::test_get_book_detail PASSED                   [ 37%]
backend/tests/test_api.py::test_chat_retrieval_and_citations PASSED      [ 50%]
backend/tests/test_api.py::test_chat_with_book_filter PASSED             [ 62%]
backend/tests/test_api.py::test_chat_out_of_domain_abstains PASSED       [ 75%]
backend/tests/test_api.py::test_conversations_flow PASSED                [ 87%]
backend/tests/test_api.py::test_study_tools_flashcards_and_mcqs PASSED   [100%]

============================== 8 passed in 3.80s ==============================
```

Build the frontend bundle:
```bash
cd frontend
npm run build
```

---

## 📡 Backend API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check, indexed book and chunk statistics |
| `/api/books` | `GET` | List all indexed textbooks and their chapters |
| `/api/books/upload` | `POST` | Upload and index a new PDF textbook |
| `/api/books/{book_id}` | `GET` | Retrieve detailed metadata for a specific book |
| `/api/books/{book_id}` | `DELETE` | Remove a textbook and its chunks from the vector store |
| `/api/chat` | `POST` | Grounded chat response with chapter and page citations |
| `/api/conversations` | `GET` | List recent conversation summaries |
| `/api/conversations` | `POST` | Create a new conversation session |
| `/api/conversations/{id}` | `GET` | Fetch conversation history and turns |
| `/api/conversations/{id}` | `PATCH` | Rename a conversation session |
| `/api/conversations/{id}` | `DELETE` | Delete a conversation session |
| `/api/study-tools` | `POST` | Generate flashcards, MCQs, or revision notes |

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).
