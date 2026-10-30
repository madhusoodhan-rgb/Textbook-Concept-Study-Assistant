import React, { useState } from 'react';
import {
  Check,
  Copy,
  GraduationCap,
  RotateCw,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react';
import type { ChatMessage, Citation } from '../types';
import { CitationCard } from './CitationCard';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectCitation: (citation: Citation) => void;
  onRegenerate?: () => void;
  bookmarkedCitations?: Citation[];
  onToggleBookmark?: (citation: Citation) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectCitation,
  onRegenerate,
  bookmarkedCitations = [],
  onToggleBookmark,
}) => {
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCitationBookmarked = (c: Citation) => {
    return bookmarkedCitations.some(
      (b) => b.book_title === c.book_title && b.chapter === c.chapter && b.page === c.page
    );
  };

  return (
    <div
      className={`py-5 px-4 md:px-6 transition-colors ${
        isAssistant
          ? 'bg-white/60 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/40'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-start gap-3.5 md:gap-4">
        {/* Avatar */}
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-medium shadow-xs ${
            isAssistant
              ? 'bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-blue-500/20'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {isAssistant ? <GraduationCap className="w-5 h-5" /> : <User className="w-4 h-4" />}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading font-semibold text-xs tracking-wide uppercase text-slate-500 dark:text-slate-400">
              {isAssistant ? 'Textbook Assistant' : 'You'}
            </span>
            {message.createdAt && (
              <span className="text-[11px] text-slate-400">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Text Message */}
          <div className="text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed">
            {isAssistant ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>

          {/* Citations section */}
          {isAssistant && message.citations && message.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-heading">
                  Textbook Citations ({message.citations.length})
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50">
                  Verified Grounding
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {message.citations.map((c, i) => (
                  <CitationCard
                    key={`${c.book_title}-${c.page}-${i}`}
                    citation={c}
                    index={i}
                    onSelect={onSelectCitation}
                    isBookmarked={isCitationBookmarked(c)}
                    onToggleBookmark={onToggleBookmark}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Assistant Action Toolbar */}
          {isAssistant && (
            <div className="flex items-center gap-1 mt-3.5 pt-2 text-slate-400 text-xs">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="Copy Answer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Regenerate Answer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}

              <div className="h-3 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

              <button
                type="button"
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                  feedback === 'up' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Accurate and helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                  feedback === 'down' ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Inaccurate or needs refinement"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
