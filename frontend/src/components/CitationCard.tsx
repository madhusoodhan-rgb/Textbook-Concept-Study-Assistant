import React from 'react';
import { BookOpen, Bookmark, BookmarkCheck, ExternalLink, Hash } from 'lucide-react';
import type { Citation } from '../types';

interface CitationCardProps {
  citation: Citation;
  index?: number;
  onSelect?: (citation: Citation) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (citation: Citation) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  index: _index,
  onSelect,
  isBookmarked,
  onToggleBookmark,
}) => {
  return (
    <div
      onClick={() => onSelect && onSelect(citation)}
      className="group relative p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-400 dark:hover:border-blue-600/70 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
            <BookOpen className="w-3 h-3" />
            {citation.book_title}
          </span>
          {citation.chapter && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
              {citation.chapter}
            </span>
          )}
          {citation.page !== null && citation.page !== undefined && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Hash className="w-2.5 h-2.5" />
              p. {citation.page}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onToggleBookmark && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(citation);
              }}
              title={isBookmarked ? "Remove Bookmark" : "Save Citation"}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors"
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <span className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed italic bg-slate-50/60 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
        "{citation.excerpt}"
      </p>
    </div>
  );
};
