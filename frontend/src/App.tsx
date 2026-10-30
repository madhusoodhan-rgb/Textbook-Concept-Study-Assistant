import React, { useEffect, useState } from 'react';
import { apiClient } from './api/client';
import type { BookInfo, ChatMessage, Citation, ConversationSummary } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { RightSourcePanel } from './components/RightSourcePanel';
import { TextbookLibraryModal } from './components/TextbookLibraryModal';
import { StudyToolsModal } from './components/StudyToolsModal';
import { BookmarksModal } from './components/BookmarksModal';

export const App: React.FC = () => {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  // App data state
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<string>('standard');

  // Side panels & Modals
  const [isSourcePanelOpen, setIsSourcePanelOpen] = useState<boolean>(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isStudyToolsOpen, setIsStudyToolsOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Bookmarks persistence
  const [bookmarkedCitations, setBookmarkedCitations] = useState<Citation[]>(() => {
    try {
      const saved = localStorage.getItem('bookmarked_citations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Apply dark mode to <html> element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Initial data loading
  useEffect(() => {
    refreshBooks();
    refreshConversations();
  }, []);

  const refreshBooks = async () => {
    try {
      const data = await apiClient.getBooks();
      setBooks(data.books);
    } catch (err) {
      console.error('Failed to load textbooks', err);
    }
  };

  const refreshConversations = async () => {
    try {
      const data = await apiClient.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setLoading(true);
    try {
      const detail = await apiClient.getConversation(id);
      const convertedMessages: ChatMessage[] = detail.messages.map((m, idx) => ({
        id: `${id}-${idx}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        citations: m.citations,
        createdAt: m.created_at,
      }));
      setMessages(convertedMessages);
    } catch (err) {
      console.error('Failed to load conversation detail', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setActiveCitation(null);
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await apiClient.renameConversation(id, newTitle);
      await refreshConversations();
    } catch (err) {
      console.error('Failed to rename conversation', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await apiClient.deleteConversation(id);
      if (activeConversationId === id) {
        handleNewConversation();
      }
      await refreshConversations();
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await apiClient.sendMessage(
        text,
        activeConversationId || undefined,
        selectedBookIds.length > 0 ? selectedBookIds : undefined,
        selectedChapter || undefined,
        difficulty
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        createdAt: new Date().toISOString(),
        isEvidenceSufficient: res.is_evidence_sufficient,
        retrievalTrace: res.retrieval_trace,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (res.conversation_id && !activeConversationId) {
        setActiveConversationId(res.conversation_id);
      }
      refreshConversations();

      // Open source panel if citations exist
      if (res.citations && res.citations.length > 0) {
        setActiveCitation(res.citations[0]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail || 'Could not connect to the textbook assistant backend.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      // Remove last assistant message
      setMessages((prev) => prev.slice(0, -1));
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleSelectCitation = (citation: Citation) => {
    setActiveCitation(citation);
    setIsSourcePanelOpen(true);
  };

  const handleToggleBookmark = (citation: Citation) => {
    setBookmarkedCitations((prev) => {
      const exists = prev.some(
        (b) => b.book_title === citation.book_title && b.chapter === citation.chapter && b.page === citation.page
      );
      let updated;
      if (exists) {
        updated = prev.filter(
          (b) => !(b.book_title === citation.book_title && b.chapter === citation.chapter && b.page === citation.page)
        );
      } else {
        updated = [...prev, citation];
      }
      localStorage.setItem('bookmarked_citations', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUploadBook = async (file: File) => {
    await apiClient.uploadBook(file);
    await refreshBooks();
  };

  const handleDeleteBook = async (bookId: string) => {
    await apiClient.deleteBook(bookId);
    setSelectedBookIds((prev) => prev.filter((id) => id !== bookId));
    await refreshBooks();
  };

  // Active citations for right panel from last assistant message
  const currentCitations =
    [...messages].reverse().find((m) => m.role === 'assistant' && m.citations)?.citations || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenStudyTools={() => setIsStudyToolsOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        bookCount={books.length}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Chat Area */}
      <ChatArea
        messages={messages}
        loading={loading}
        onSendMessage={handleSendMessage}
        onRegenerate={handleRegenerate}
        onSelectCitation={handleSelectCitation}
        books={books}
        selectedBookIds={selectedBookIds}
        selectedChapter={selectedChapter}
        onClearChapter={() => setSelectedChapter(null)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenStudyTools={() => setIsStudyToolsOpen(true)}
        difficulty={difficulty}
        onChangeDifficulty={setDifficulty}
        isSourcePanelOpen={isSourcePanelOpen}
        onToggleSourcePanel={() => setIsSourcePanelOpen(!isSourcePanelOpen)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        bookmarkedCitations={bookmarkedCitations}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* Right Source Panel */}
      <RightSourcePanel
        isOpen={isSourcePanelOpen}
        onClose={() => setIsSourcePanelOpen(false)}
        activeCitation={activeCitation}
        citations={currentCitations}
        onSelectCitation={setActiveCitation}
      />

      {/* Textbook Library Modal */}
      <TextbookLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        books={books}
        selectedBookIds={selectedBookIds}
        onToggleBookSelection={(id) => {
          setSelectedBookIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
          );
        }}
        onSelectAllBooks={() => setSelectedBookIds([])}
        onClearBookSelection={() => setSelectedBookIds([])}
        onUploadBook={handleUploadBook}
        onDeleteBook={handleDeleteBook}
        selectedChapter={selectedChapter}
        onSelectChapter={setSelectedChapter}
      />

      {/* Study & Revision Tools Modal */}
      <StudyToolsModal
        isOpen={isStudyToolsOpen}
        onClose={() => setIsStudyToolsOpen(false)}
        books={books}
        selectedBookIds={selectedBookIds}
        selectedChapter={selectedChapter}
      />

      {/* Bookmarks Modal */}
      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarkedCitations}
        onRemoveBookmark={handleToggleBookmark}
        onSelectCitation={handleSelectCitation}
      />
    </div>
  );
};

export default App;
