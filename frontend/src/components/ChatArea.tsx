import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  ChevronDown,
  GraduationCap,
  Layers,
  Lightbulb,
  ListOrdered,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Send,
  X,
} from 'lucide-react';
import type { BookInfo, ChatMessage, Citation } from '../types';
import { ChatMessageItem } from './ChatMessageItem';

interface ChatAreaProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  onSelectCitation: (citation: Citation) => void;
  books: BookInfo[];
  selectedBookIds: string[];
  selectedChapter: string | null;
  onClearChapter: () => void;
  onOpenLibrary: () => void;
  onOpenStudyTools: () => void;
  difficulty: string;
  onChangeDifficulty: (diff: string) => void;
  isSourcePanelOpen: boolean;
  onToggleSourcePanel: () => void;
  onOpenMobileMenu: () => void;
  bookmarkedCitations: Citation[];
  onToggleBookmark: (citation: Citation) => void;
  isBackendOnline?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  loading,
  onSendMessage,
  onRegenerate,
  onSelectCitation,
  books,
  selectedBookIds,
  selectedChapter,
  onClearChapter,
  onOpenLibrary,
  onOpenStudyTools,
  difficulty,
  onChangeDifficulty,
  isSourcePanelOpen,
  onToggleSourcePanel,
  onOpenMobileMenu,
  bookmarkedCitations,
  onToggleBookmark,
  isBackendOnline = true,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim() || loading) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const sampleQuestions = [
    {
      title: 'Big-O Analysis',
      question: 'What is Big-O notation and how does binary search compare to linear search?',
      tag: 'Algorithms',
    },
    {
      title: 'AVL Tree Rotations',
      question: 'Explain the Binary Search Tree invariant and how AVL rotations restore balance.',
      tag: 'Data Structures',
    },
    {
      title: 'Gradient Descent',
      question: 'Explain Gradient Descent optimization, learning rates, and how backpropagation works.',
      tag: 'Machine Learning',
    },
    {
      title: 'Regularization & Overfitting',
      question: 'What is the difference between L1 (Lasso) and L2 (Ridge) regularization?',
      tag: 'Deep Learning',
    },
  ];

  // Active book name labels
  const activeBooks =
    selectedBookIds.length > 0
      ? books.filter((b) => selectedBookIds.includes(b.id))
      : books;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Top App Header */}
      <header className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Active Textbook Pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {selectedBookIds.length === 0
                  ? `All Textbooks (${books.length})`
                  : activeBooks.map((b) => b.title).join(', ')}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {selectedChapter && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                <span className="truncate max-w-[140px]">{selectedChapter}</span>
                <button onClick={onClearChapter} className="hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {!isBackendOnline && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Offline Review Mode
              </span>
            )}
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Difficulty Dropdown */}
          <div className="flex items-center text-xs">
            <span className="text-slate-400 mr-1.5 hidden sm:inline text-[11px] uppercase font-semibold">Mode:</span>
            <select
              value={difficulty}
              onChange={(e) => onChangeDifficulty(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
            >
              <option value="simple">Explain Simply</option>
              <option value="standard">Standard Academic</option>
              <option value="academic">In-Depth Rigorous</option>
            </select>
          </div>

          {/* Toggle Inspector Panel */}
          <button
            type="button"
            onClick={onToggleSourcePanel}
            title={isSourcePanelOpen ? 'Close Source Panel' : 'Open Source Panel'}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
              isSourcePanelOpen
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isSourcePanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className="hidden lg:inline text-[11px] font-medium">Sources</span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25 mb-4">
              <GraduationCap className="w-8 h-8" />
            </div>

            <h2 className="font-heading font-bold text-2xl md:text-3xl text-slate-900 dark:text-white tracking-tight">
              Textbook Concept & Study Assistant
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
              Ask natural-language questions grounded strictly in your textbooks. Every response cites exact chapters and page numbers.
            </p>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={onOpenStudyTools}
                className="px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Generate Flashcards
              </button>
              <button
                type="button"
                onClick={onOpenStudyTools}
                className="px-3.5 py-1.5 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Practice MCQs
              </button>
              <button
                type="button"
                onClick={() => onChangeDifficulty('simple')}
                className="px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Explain Simply Mode
              </button>
            </div>

            {/* Sample Question Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 text-left">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSendMessage(q.question)}
                  className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs text-left group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-blue-600 dark:text-blue-400">
                      {q.tag}
                    </span>
                    <span className="text-slate-400 group-hover:text-blue-600 transition-colors">
                      <ArrowUp className="w-3.5 h-3.5 rotate-45" />
                    </span>
                  </div>
                  <h4 className="font-heading font-semibold text-xs text-slate-800 dark:text-slate-100">
                    {q.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {q.question}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((m) => (
              <ChatMessageItem
                key={m.id}
                message={m}
                onSelectCitation={onSelectCitation}
                onRegenerate={m.role === 'assistant' ? onRegenerate : undefined}
                bookmarkedCitations={bookmarkedCitations}
                onToggleBookmark={onToggleBookmark}
              />
            ))}

            {loading && (
              <div className="py-6 px-4 md:px-6 bg-white/60 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/40">
                <div className="max-w-4xl mx-auto flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 animate-pulse">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-heading">
                        Searching Textbooks & Synthesizing Answer...
                      </span>
                    </div>
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 md:p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          {/* Active indicators bar */}
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <span className="text-[11px] font-medium flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-blue-500" />
              Grounding in:
            </span>
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              {selectedBookIds.length === 0 ? 'All Library Textbooks' : `${activeBooks.length} Selected Book(s)`}
            </span>
            {selectedChapter && (
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                • {selectedChapter}
              </span>
            )}
          </div>

          {/* Textarea container */}
          <div className="relative flex items-end border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-sm transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your textbooks (e.g. 'How does Dijkstra work?', 'Explain Big-O')..."
              className="flex-1 max-h-44 p-3.5 pr-12 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden resize-none leading-relaxed"
            />
            <button
              type="button"
              disabled={!inputText.trim() || loading}
              onClick={handleSubmit}
              className="absolute right-2.5 bottom-2.5 p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white shadow-xs transition-colors flex items-center justify-center"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
            Responses are strictly grounded in textbook passages with chapter and page citations.
          </p>
        </div>
      </div>
    </div>
  );
};
