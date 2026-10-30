from typing import Any, Optional
from pydantic import BaseModel, Field


class Citation(BaseModel):
    book_title: str
    chapter: str
    page: Optional[int] = None
    excerpt: str
    chunk_id: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = Field(default=None, max_length=100)
    book_ids: Optional[list[str]] = Field(default=None)
    chapter: Optional[str] = Field(default=None)
    difficulty: Optional[str] = Field(default="standard")  # "simple", "standard", "academic"


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    citations: list[Citation]
    is_evidence_sufficient: bool = True
    retrieval_trace: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    app_name: str
    gemini_configured: bool
    embedding_mode: str
    books: int
    pages: int
    chunks: int


class ChapterInfo(BaseModel):
    title: str
    chapter_number: Optional[int] = None
    page: Optional[int] = None


class BookInfo(BaseModel):
    id: str
    filename: str
    title: str
    author: Optional[str] = "Academic Press"
    subject: Optional[str] = "General"
    pages: int
    chapters: list[ChapterInfo] = Field(default_factory=list)
    chunks: int
    status: str
    created_at: Optional[str] = None


class BookListResponse(BaseModel):
    books: list[BookInfo]
    total_books: int
    total_pages: int
    total_chunks: int


class FlashcardItem(BaseModel):
    front: str
    back: str
    chapter: Optional[str] = None
    page: Optional[int] = None


class MCQOption(BaseModel):
    key: str
    text: str


class MCQItem(BaseModel):
    question: str
    options: list[MCQOption]
    correct_key: str
    explanation: str
    citation: Optional[str] = None


class ShortAnswerItem(BaseModel):
    question: str
    sample_answer: str
    key_points: list[str] = Field(default_factory=list)
    citation: Optional[str] = None


class StudyToolsRequest(BaseModel):
    tool_type: str = Field(
        ...,
        description="One of: explain_simply, detailed_explanation, revision_notes, flashcards, mcqs, short_answers, summary",
    )
    topic: Optional[str] = Field(default=None, max_length=2000)
    book_ids: Optional[list[str]] = Field(default=None)
    chapter: Optional[str] = Field(default=None)


class StudyToolsResponse(BaseModel):
    tool_type: str
    topic: str
    content: str
    structured_data: Optional[Any] = None
    citations: list[Citation] = Field(default_factory=list)


class ConversationTurn(BaseModel):
    role: str
    content: str
    citations: list[Citation] = Field(default_factory=list)
    created_at: Optional[str] = None


class ConversationSummary(BaseModel):
    id: str
    title: str
    updated_at: str
    message_count: int


class ConversationDetail(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    messages: list[ConversationTurn]


class ConversationRenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
