import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.main import app
from app.rag import document_manager


@pytest.fixture(scope="module")
def client():
    # Sync sample books
    document_manager.sync_books_directory()
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "Textbook Concept & Study Assistant"
    assert data["books"] >= 2
    assert data["pages"] >= 6
    assert data["chunks"] >= 10


def test_list_books(client):
    response = client.get("/api/books")
    assert response.status_code == 200
    data = response.json()
    assert data["total_books"] >= 2
    titles = [b["title"] for b in data["books"]]
    assert any("Data Structures" in t for t in titles)
    assert any("Artificial Intelligence" in t for t in titles)

    first_book = data["books"][0]
    assert len(first_book["chapters"]) >= 3
    assert first_book["chapters"][0]["title"] is not None
    assert first_book["chapters"][0]["page"] >= 1


def test_get_book_detail(client):
    books = client.get("/api/books").json()["books"]
    book_id = books[0]["id"]
    response = client.get(f"/api/books/{book_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == book_id
    assert len(data["chapters"]) >= 3


def test_chat_retrieval_and_citations(client):
    # Test question about Big-O
    payload = {
        "message": "What is Big-O notation and how does it compare linear and binary search?",
        "difficulty": "standard"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 50
    assert "citations" in data
    assert len(data["citations"]) > 0

    first_citation = data["citations"][0]
    assert "Data Structures" in first_citation["book_title"]
    assert "Chapter 1" in first_citation["chapter"]
    assert first_citation["page"] == 1
    assert "excerpt" in first_citation
    assert len(first_citation["excerpt"]) > 10


def test_chat_with_book_filter(client):
    books = client.get("/api/books").json()["books"]
    ai_book = next(b for b in books if "Artificial Intelligence" in b["title"])

    # Ask about gradient descent filtering strictly to AI book
    payload = {
        "message": "Explain gradient descent optimization and the learning rate.",
        "book_ids": [ai_book["id"]],
        "difficulty": "simple"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["citations"]) > 0
    for citation in data["citations"]:
        assert citation["book_title"] == ai_book["title"]


def test_chat_out_of_domain_abstains(client):
    payload = {
        "message": "What is the secret recipe for baking artisanal sourdough bread?",
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_evidence_sufficient"] is False or "does not contain" in data["answer"].lower()


def test_conversations_flow(client):
    # 1. Create conversation
    create_res = client.post("/api/conversations")
    assert create_res.status_code == 200
    conv = create_res.json()
    conv_id = conv["id"]

    # 2. Chat using conversation_id
    chat_res = client.post("/api/chat", json={
        "message": "What are AVL trees?",
        "conversation_id": conv_id
    })
    assert chat_res.status_code == 200

    # 3. Get conversation
    get_res = client.get(f"/api/conversations/{conv_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert len(detail["messages"]) == 2  # user + assistant

    # 4. Rename conversation
    rename_res = client.patch(f"/api/conversations/{conv_id}", json={"title": "AVL Trees Discussion"})
    assert rename_res.status_code == 200
    assert rename_res.json()["title"] == "AVL Trees Discussion"

    # 5. List conversations
    list_res = client.get("/api/conversations")
    assert list_res.status_code == 200
    assert any(c["id"] == conv_id for c in list_res.json())

    # 6. Delete conversation
    del_res = client.delete(f"/api/conversations/{conv_id}")
    assert del_res.status_code == 200
    assert client.get(f"/api/conversations/{conv_id}").status_code == 404


def test_study_tools_flashcards_and_mcqs(client):
    # Test Flashcards
    fc_res = client.post("/api/study-tools", json={
        "tool_type": "flashcards",
        "topic": "Graph Algorithms and Dijkstra"
    })
    assert fc_res.status_code == 200
    fc_data = fc_res.json()
    assert fc_data["tool_type"] == "flashcards"
    assert len(fc_data["citations"]) > 0
    assert fc_data["structured_data"] is not None

    # Test MCQs
    mcq_res = client.post("/api/study-tools", json={
        "tool_type": "mcqs",
        "topic": "Overfitting and Regularization"
    })
    assert mcq_res.status_code == 200
    mcq_data = mcq_res.json()
    assert mcq_data["tool_type"] == "mcqs"
    assert len(mcq_data["citations"]) > 0
    assert mcq_data["structured_data"] is not None
    assert len(mcq_data["structured_data"]) > 0
    first_mcq = mcq_data["structured_data"][0]
    assert "options" in first_mcq
    assert "correct_key" in first_mcq
