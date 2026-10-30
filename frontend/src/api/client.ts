import axios from 'axios';
import type {
  BookInfo,
  BookListResponse,
  ConversationDetail,
  ConversationSummary,
  HealthResponse,
  StudyToolsResponse,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor to guard against HTML responses (e.g. from Vercel SPA rewrites)
api.interceptors.response.use(
  (response) => {
    const rawContentType = response.headers['content-type'];
    const contentType = (typeof rawContentType === 'string' ? rawContentType : '').toLowerCase();
    const isHtmlString =
      typeof response.data === 'string' &&
      (contentType.includes('text/html') ||
        response.data.trim().startsWith('<!doctype') ||
        response.data.trim().startsWith('<html'));

    if (isHtmlString) {
      throw new Error(
        `API endpoint '${response.config.url}' returned HTML instead of JSON. The backend server may be offline or unreachable.`
      );
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Health
  getHealth: async (): Promise<HealthResponse> => {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Books
  getBooks: async (): Promise<BookListResponse> => {
    const response = await api.get('/api/books');
    if (response.data && Array.isArray(response.data.books)) {
      return response.data;
    }
    throw new Error('Invalid books response format from server.');
  },

  getBook: async (bookId: string): Promise<BookInfo> => {
    const response = await api.get(`/api/books/${bookId}`);
    return response.data;
  },

  uploadBook: async (file: File): Promise<{ status: string; book: BookInfo }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/books/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteBook: async (bookId: string): Promise<{ status: string; book_id: string }> => {
    const response = await api.delete(`/api/books/${bookId}`);
    return response.data;
  },

  // Chat
  sendMessage: async (
    message: string,
    conversationId?: string,
    bookIds?: string[],
    chapter?: string,
    difficulty?: string
  ) => {
    const response = await api.post('/api/chat', {
      message,
      conversation_id: conversationId,
      book_ids: bookIds && bookIds.length > 0 ? bookIds : undefined,
      chapter: chapter || undefined,
      difficulty: difficulty || 'standard',
    });
    return response.data;
  },

  // Conversations
  getConversations: async (): Promise<ConversationSummary[]> => {
    const response = await api.get('/api/conversations');
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  createConversation: async (): Promise<ConversationDetail> => {
    const response = await api.post('/api/conversations');
    return response.data;
  },

  getConversation: async (id: string): Promise<ConversationDetail> => {
    const response = await api.get(`/api/conversations/${id}`);
    return response.data;
  },

  renameConversation: async (id: string, title: string) => {
    const response = await api.patch(`/api/conversations/${id}`, { title });
    return response.data;
  },

  deleteConversation: async (id: string) => {
    const response = await api.delete(`/api/conversations/${id}`);
    return response.data;
  },

  // Study Tools
  generateStudyTool: async (
    toolType: string,
    topic?: string,
    bookIds?: string[],
    chapter?: string
  ): Promise<StudyToolsResponse> => {
    const response = await api.post('/api/study-tools', {
      tool_type: toolType,
      topic: topic || undefined,
      book_ids: bookIds && bookIds.length > 0 ? bookIds : undefined,
      chapter: chapter || undefined,
    });
    return response.data;
  },
};
