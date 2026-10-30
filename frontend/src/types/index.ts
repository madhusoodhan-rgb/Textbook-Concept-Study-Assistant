export interface Citation {
  book_title: string;
  chapter: string;
  page: number | null;
  excerpt: string;
  chunk_id?: string;
}

export interface ChapterInfo {
  title: string;
  chapter_number: number | null;
  page: number | null;
}

export interface BookInfo {
  id: string;
  filename: string;
  title: string;
  author?: string;
  subject?: string;
  pages: number;
  chapters: ChapterInfo[];
  chunks: number;
  status: string;
  created_at?: string;
}

export interface BookListResponse {
  books: BookInfo[];
  total_books: number;
  total_pages: number;
  total_chunks: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  createdAt?: string;
  isEvidenceSufficient?: boolean;
  retrievalTrace?: Record<string, any>;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Array<{
    role: string;
    content: string;
    citations?: Citation[];
    created_at?: string;
  }>;
}

export interface FlashcardItem {
  front: string;
  back: string;
  chapter?: string;
  page?: number;
}

export interface MCQOption {
  key: string;
  text: string;
}

export interface MCQItem {
  question: string;
  options: MCQOption[];
  correct_key: string;
  explanation: string;
  citation?: string;
}

export interface ShortAnswerItem {
  question: string;
  sample_answer: string;
  key_points: string[];
  citation?: string;
}

export interface StudyToolsResponse {
  tool_type: string;
  topic: string;
  content: string;
  structured_data?: any;
  citations: Citation[];
}

export interface HealthResponse {
  status: string;
  app_name: string;
  gemini_configured: boolean;
  embedding_mode: string;
  books: number;
  pages: number;
  chunks: number;
}
