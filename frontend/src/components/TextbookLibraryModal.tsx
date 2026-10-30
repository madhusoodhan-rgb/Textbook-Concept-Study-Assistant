import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { BookInfo } from '../types';

interface TextbookLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookInfo[];
  selectedBookIds: string[];
  onToggleBookSelection: (bookId: string) => void;
  onSelectAllBooks: () => void;
  onClearBookSelection: () => void;
  onUploadBook: (file: File) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
  selectedChapter: string | null;
  onSelectChapter: (chapter: string | null) => void;
}

export const TextbookLibraryModal: React.FC<TextbookLibraryModalProps> = ({
  isOpen,
  onClose,
  books,
  selectedBookIds,
  onToggleBookSelection,
  onSelectAllBooks,
  onClearBookSelection,
  onUploadBook,
  onDeleteBook,
  selectedChapter,
  onSelectChapter,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Subjects extracted from books
  const subjects = ['All', ...Array.from(new Set(books.map((b) => b.subject || 'General')))];

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(search.toLowerCase()));
    const matchesSubject = selectedSubject === 'All' || b.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processUpload(e.target.files[0]);
    }
  };

  const processUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF textbooks are currently supported.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      await onUploadBook(file);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload and index textbook PDF.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100">
                Textbook Library & Subject Selection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select textbooks to ground the AI assistant's explanations and citations.
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

        {/* Upload Zone & Filter Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          {/* Drag & Drop Upload */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/50 dark:bg-slate-950/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3">
              <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {isUploading ? 'Extracting & Indexing Chapters...' : 'Upload PDF Textbook'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  Drag and drop a PDF textbook here, or browse files (Max 50MB)
                </span>
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Search & Subject Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Selection quick actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
              <button
                type="button"
                onClick={onSelectAllBooks}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClearBookSelection}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Subject Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {subjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
                  selectedSubject === sub
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Book Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No textbooks found</p>
              <p className="text-xs mt-1">Upload a PDF textbook above to populate your library.</p>
            </div>
          ) : (
            filteredBooks.map((book) => {
              const isSelected = selectedBookIds.includes(book.id) || selectedBookIds.length === 0;
              const isExpanded = expandedBookId === book.id;

              return (
                <div
                  key={book.id}
                  className={`border rounded-xl transition-all ${
                    isSelected
                      ? 'border-blue-400/80 dark:border-blue-600/80 bg-blue-50/20 dark:bg-blue-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedBookIds.includes(book.id)}
                        onChange={() => onToggleBookSelection(book.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {book.title}
                          </h3>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {book.subject || 'General'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {book.author && `By ${book.author} • `}
                          {book.pages} pages • {book.chunks} text chunks indexed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {book.chapters && book.chapters.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          <span>{book.chapters.length} Chapters</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteBook(book.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Textbook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Chapter Accordion */}
                  {isExpanded && book.chapters && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-heading">
                        Detected Chapters (Click to focus chat):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {book.chapters.map((ch, idx) => {
                          const isChapterActive = selectedChapter === ch.title;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => onSelectChapter(isChapterActive ? null : ch.title)}
                              className={`text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between border transition-colors ${
                                isChapterActive
                                  ? 'bg-blue-600 text-white border-blue-600 font-medium'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-blue-400'
                              }`}
                            >
                              <span className="truncate pr-2">{ch.title}</span>
                              <span className="text-[10px] opacity-75 shrink-0">p.{ch.page}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30 text-xs">
          <span className="text-slate-500">
            {selectedBookIds.length === 0
              ? `All ${books.length} textbooks active in RAG context`
              : `${selectedBookIds.length} of ${books.length} textbooks selected`}
            {selectedChapter && ` • Focused on: "${selectedChapter}"`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
