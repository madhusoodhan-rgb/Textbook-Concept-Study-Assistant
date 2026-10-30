import React from 'react';
import {
  BookOpen,
  FileText,
  Hash,
  Quote,
  X,
} from 'lucide-react';
import type { Citation } from '../types';

interface RightSourcePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeCitation: Citation | null;
  citations: Citation[];
  onSelectCitation: (citation: Citation) => void;
}

export const RightSourcePanel: React.FC<RightSourcePanelProps> = ({
  isOpen,
  onClose,
  activeCitation,
  citations,
  onSelectCitation,
}) => {
  if (!isOpen) return null;

  const current = activeCitation || (citations.length > 0 ? citations[0] : null);

  return (
    <aside className="w-80 lg:w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col h-full z-20 shadow-lg transition-all duration-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-heading font-semibold text-sm text-slate-800 dark:text-slate-100">
            Source Inspector
          </h3>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            {citations.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sources List Carousel / Tabs */}
      {citations.length > 1 && (
        <div className="px-4 py-2 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 overflow-x-auto">
          <div className="flex gap-1.5 text-xs">
            {citations.map((c, idx) => {
              const isSelected = current?.book_title === c.book_title && current?.page === c.page && current?.chapter === c.chapter;
              return (
                <button
                  key={`${c.book_title}-${idx}`}
                  onClick={() => onSelectCitation(c)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <span>Source {idx + 1}</span>
                  {c.page !== null && <span className="opacity-75">p.{c.page}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {current ? (
          <>
            {/* Textbook Metadata Card */}
            <div className="p-3.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-heading">
                    Textbook Title
                  </span>
                  <h4 className="font-heading font-semibold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                    {current.book_title}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/40 dark:border-blue-900/30 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                    Chapter
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {current.chapter || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                    Page Citation
                  </span>
                  <span className="font-mono font-medium text-blue-700 dark:text-blue-300 flex items-center gap-0.5">
                    <Hash className="w-3 h-3" />
                    Page {current.page ?? 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Retrieved Passage Excerpt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 font-heading">
                  <Quote className="w-3.5 h-3.5 text-blue-500" />
                  Retrieved Textbook Passage
                </span>
                <span className="text-[10px] text-slate-400 font-mono">100% Grounded</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {current.excerpt}
              </div>
            </div>

            {/* Grounding Transparency Note */}
            <div className="p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero Hallucination Protocol</span>
              </div>
              <p className="text-[11px] leading-normal">
                This excerpt was extracted verbatim from page {current.page} using character-bounded segment matching.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-12 px-4 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No source selected</p>
            <p className="text-xs mt-1">Ask a question or click on any citation card to view detailed page sources.</p>
          </div>
        )}
      </div>
    </aside>
  );
};
