import React from 'react';
import { Bookmark, ExternalLink, Trash2, X } from 'lucide-react';
import type { Citation } from '../types';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Citation[];
  onRemoveBookmark: (citation: Citation) => void;
  onSelectCitation: (citation: Citation) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onSelectCitation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Bookmark className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-slate-900 dark:text-slate-100">
                Saved Textbook Citations ({bookmarks.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bookmarked evidence passages for revision and study.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No citations saved yet</p>
              <p className="text-xs mt-1">Click the bookmark icon on any citation card in chat to save it here.</p>
            </div>
          ) : (
            bookmarks.map((c, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-xs text-blue-700 dark:text-blue-300">
                      {c.book_title}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {c.chapter}
                    </span>
                    {c.page !== null && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        p.{c.page}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCitation(c);
                        onClose();
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600"
                      title="Inspect Source"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(c)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                  "{c.excerpt}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
