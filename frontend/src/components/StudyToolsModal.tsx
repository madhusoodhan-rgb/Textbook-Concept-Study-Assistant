import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  HelpCircle,
  Layers,
  Lightbulb,
  ListOrdered,
  RotateCw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { BookInfo, FlashcardItem, MCQItem, ShortAnswerItem, StudyToolsResponse } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { apiClient } from '../api/client';

interface StudyToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookInfo[];
  selectedBookIds: string[];
  selectedChapter: string | null;
}

export const StudyToolsModal: React.FC<StudyToolsModalProps> = ({
  isOpen,
  onClose,
  books,
  selectedBookIds,
  selectedChapter,
}) => {
  const [activeTool, setActiveTool] = useState<string>('flashcards');
  const [topic, setTopic] = useState<string>('');
  const [chosenBookId, setChosenBookId] = useState<string>(selectedBookIds[0] || (books[0]?.id || ''));
  const [chosenChapter, setChosenChapter] = useState<string>(selectedChapter || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudyToolsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Flashcards state
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // MCQ quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showExplanations, setShowExplanations] = useState<Record<number, boolean>>({});

  // Copy notes state
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const tools = [
    { id: 'flashcards', label: 'Flashcards', icon: Layers, desc: 'Interactive flip cards for rapid recall' },
    { id: 'mcqs', label: 'Practice MCQs', icon: ListOrdered, desc: 'Multiple-choice exam practice with citations' },
    { id: 'revision_notes', label: 'Revision Notes', icon: BookOpen, desc: 'Structured bullet notes & summary tables' },
    { id: 'short_answers', label: 'Short Answers', icon: HelpCircle, desc: 'Concept questions with model answers' },
    { id: 'summary', label: 'Chapter Summary', icon: Sparkles, desc: 'Core theorems & key takeaways' },
    { id: 'explain_simply', label: 'Explain Simply', icon: Lightbulb, desc: 'Intuitive analogies for tough concepts' },
  ];

  const currentBook = books.find((b) => b.id === chosenBookId) || books[0];
  const chapters = currentBook?.chapters || [];

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setSelectedAnswers({});
    setShowExplanations({});

    try {
      const response = await apiClient.generateStudyTool(
        activeTool,
        topic,
        chosenBookId ? [chosenBookId] : undefined,
        chosenChapter || undefined
      );
      setResult(response);
      if (activeTool === 'flashcards' || activeTool === 'mcqs') {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate textbook study tool.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNotes = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadNotes = () => {
    if (!result?.content) return;
    const blob = new Blob([result.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTool}_${topic || 'study_notes'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const flashcards: FlashcardItem[] = result?.structured_data || [];
  const mcqs: MCQItem[] = result?.structured_data || [];
  const shortAnswers: ShortAnswerItem[] = result?.structured_data || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100">
                Textbook Study Tools & Revision Suite
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate flashcards, quizzes, and structured notes directly from textbook passages.
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

        {/* Configuration Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          {/* Tool Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {tools.map((t) => {
              const Icon = t.icon;
              const isActive = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTool(t.id);
                    setResult(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span className="font-heading font-semibold text-xs">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Book / Chapter Pickers & Topic Query */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">Textbook Source</label>
              <select
                value={chosenBookId}
                onChange={(e) => {
                  setChosenBookId(e.target.value);
                  setChosenChapter('');
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">Chapter Filter (Optional)</label>
              <select
                value={chosenChapter}
                onChange={(e) => setChosenChapter(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="">All Chapters</option>
                {chapters.map((c, i) => (
                  <option key={i} value={c.title}>
                    {c.title} (p.{c.page})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">Concept Topic</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Asymptotic Analysis, Tree Rotations"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="flex-1 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs whitespace-nowrap shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {loading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? 'Generating...' : 'Generate'}</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900/50">
              {error}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result && !loading && (
            <div className="text-center py-16 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ready to Study</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Choose a study tool above and click Generate. The assistant will retrieve textbook passages and format revision notes, flashcards, or practice questions.
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-20 text-slate-500 space-y-3">
              <RotateCw className="w-8 h-8 mx-auto animate-spin text-blue-600" />
              <p className="text-sm font-medium">Retrieving passages and compiling study material...</p>
            </div>
          )}

          {result && (
            <div>
              {/* Flashcards View */}
              {activeTool === 'flashcards' && flashcards.length > 0 && (
                <div className="max-w-xl mx-auto space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider">
                      Card {currentCardIdx + 1} of {flashcards.length}
                    </span>
                    <span className="text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 px-2 py-0.5 rounded-full">
                      Click card to flip
                    </span>
                  </div>

                  {/* 3D Flip Card */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="h-64 cursor-pointer perspective-1000 select-none"
                  >
                    <div
                      className={`relative w-full h-full rounded-2xl p-6 border transition-transform duration-500 transform-style-3d shadow-md flex flex-col justify-between ${
                        isFlipped
                          ? 'rotate-y-180 bg-blue-50 dark:bg-slate-800 border-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-heading font-semibold text-blue-600 dark:text-blue-400">
                          {isFlipped ? 'ANSWER / DEFINITION' : 'QUESTION / CONCEPT'}
                        </span>
                        {flashcards[currentCardIdx]?.page && (
                          <span className="font-mono text-[11px]">p. {flashcards[currentCardIdx].page}</span>
                        )}
                      </div>

                      <div className="my-auto text-center">
                        <p className="text-base md:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                          {isFlipped ? flashcards[currentCardIdx]?.back : flashcards[currentCardIdx]?.front}
                        </p>
                      </div>

                      <div className="text-center text-[11px] text-slate-400">
                        {isFlipped ? 'Click to view question' : 'Click to reveal answer'}
                      </div>
                    </div>
                  </div>

                  {/* Navigation controls */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={currentCardIdx === 0}
                      onClick={() => {
                        setIsFlipped(false);
                        setCurrentCardIdx(Math.max(0, currentCardIdx - 1));
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={currentCardIdx === flashcards.length - 1}
                      onClick={() => {
                        setIsFlipped(false);
                        setCurrentCardIdx(Math.min(flashcards.length - 1, currentCardIdx + 1));
                        if (currentCardIdx === flashcards.length - 2) {
                          confetti({ particleCount: 30, spread: 50 });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
                    >
                      Next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* MCQs Quiz View */}
              {activeTool === 'mcqs' && mcqs.length > 0 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {mcqs.map((mcq, qIdx) => {
                    const answeredKey = selectedAnswers[qIdx];
                    const isCorrect = answeredKey === mcq.correct_key;
                    const showExp = showExplanations[qIdx];

                    return (
                      <div
                        key={qIdx}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-heading font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                            <span className="text-blue-600 mr-1.5">{qIdx + 1}.</span>
                            {mcq.question}
                          </h4>
                          {answeredKey && (
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                                isCorrect
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          )}
                        </div>

                        {/* Options */}
                        <div className="space-y-2">
                          {mcq.options.map((opt) => {
                            const isChosen = answeredKey === opt.key;
                            const isAnswerKey = opt.key === mcq.correct_key;

                            let optStyle =
                              'border-slate-200 dark:border-slate-800 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-950/30';
                            if (answeredKey) {
                              if (isAnswerKey) {
                                optStyle = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-medium';
                              } else if (isChosen && !isCorrect) {
                                optStyle = 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100';
                              }
                            }

                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                  setSelectedAnswers({ ...selectedAnswers, [qIdx]: opt.key });
                                  setShowExplanations({ ...showExplanations, [qIdx]: true });
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center gap-2.5 transition-colors ${optStyle}`}
                              >
                                <span className="w-5 h-5 rounded-md font-mono text-[11px] font-bold flex items-center justify-center bg-white dark:bg-slate-800 shadow-2xs">
                                  {opt.key}
                                </span>
                                <span>{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation & Citation */}
                        {showExp && (
                          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 text-xs space-y-1">
                            <span className="font-semibold text-blue-700 dark:text-blue-300 font-heading block">
                              Textbook Explanation:
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{mcq.explanation}</p>
                            {mcq.citation && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-1">
                                Source: {mcq.citation}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Short Answers View */}
              {activeTool === 'short_answers' && shortAnswers.length > 0 && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {shortAnswers.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5"
                    >
                      <h4 className="font-heading font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {idx + 1}. {item.question}
                      </h4>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 text-xs">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">
                          Model Answer:
                        </span>
                        <p className="leading-relaxed text-slate-700 dark:text-slate-300">{item.sample_answer}</p>
                        {item.citation && (
                          <span className="text-[10px] text-slate-400 block mt-2 font-mono">
                            Citation: {item.citation}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Markdown Notes / Summaries / Explain Simply View */}
              {(activeTool === 'revision_notes' || activeTool === 'summary' || activeTool === 'explain_simply') && (
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 font-medium font-heading">
                      Generated from {result.citations.length} textbook citations
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyNotes}
                        className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadNotes}
                        className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .md</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <MarkdownRenderer content={result.content} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
