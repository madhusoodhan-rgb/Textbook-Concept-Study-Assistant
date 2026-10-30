import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split content by code blocks ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let codeBlockCounter = 0;

  const renderInlineFormatted = (text: string) => {
    // Process headers, blockquotes, bold, italics, inline code, and lists
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Headers
      if (line.startsWith('### ')) {
        return (
          <h3 key={lineIdx} className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-2">
            {formatSpans(line.replace('### ', ''))}
          </h3>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h4 key={lineIdx} className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">
            {formatSpans(line.replace('#### ', ''))}
          </h4>
        );
      }
      if (line.startsWith('# ') || line.startsWith('## ')) {
        return (
          <h2 key={lineIdx} className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
            {formatSpans(line.replace(/^#{1,2}\s+/, ''))}
          </h2>
        );
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote key={lineIdx} className="border-l-4 border-blue-500 pl-3 py-1 my-1.5 text-slate-700 dark:text-slate-300 bg-blue-50/40 dark:bg-blue-950/20 rounded-r text-sm italic">
            {formatSpans(line.replace('> ', ''))}
          </blockquote>
        );
      }

      // Unordered lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 my-1 ml-2 text-slate-700 dark:text-slate-300">
            <span className="text-blue-500 font-bold leading-relaxed">•</span>
            <span>{formatSpans(line.trim().replace(/^[-*]\s+/, ''))}</span>
          </div>
        );
      }

      // Numbered lists
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 my-1 ml-2 text-slate-700 dark:text-slate-300">
            <span className="text-blue-600 dark:text-blue-400 font-mono text-xs font-semibold mt-0.5">{numMatch[1]}.</span>
            <span>{formatSpans(numMatch[2])}</span>
          </div>
        );
      }

      // Empty lines
      if (!line.trim()) {
        return <div key={lineIdx} className="h-2" />;
      }

      // Regular paragraph
      return (
        <p key={lineIdx} className="my-1.5 leading-relaxed text-slate-800 dark:text-slate-200">
          {formatSpans(line)}
        </p>
      );
    });
  };

  const formatSpans = (text: string): React.ReactNode => {
    // Replace **bold**, `code`, *italic*
    const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return segments.map((seg, i) => {
      if (seg.startsWith('`') && seg.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-mono text-xs font-medium">
            {seg.slice(1, -1)}
          </code>
        );
      }
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{seg.slice(2, -2)}</strong>;
      }
      if (seg.startsWith('*') && seg.endsWith('*')) {
        return <em key={i} className="italic text-slate-800 dark:text-slate-200">{seg.slice(1, -1)}</em>;
      }
      return seg;
    });
  };

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <div key={`text-${lastIndex}`}>
          {renderInlineFormatted(content.slice(lastIndex, match.index))}
        </div>
      );
    }
    const lang = match[1] || 'text';
    const code = match[2];
    const currentCodeIdx = codeBlockCounter++;
    parts.push(
      <div key={`code-${currentCodeIdx}`} className="my-3 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900 shadow-md">
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/90 text-xs font-mono text-slate-400 border-b border-slate-700/50">
          <span>{lang.toUpperCase()}</span>
          <button
            onClick={() => handleCopy(code, currentCodeIdx)}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {copiedIndex === currentCodeIdx ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3.5 text-xs md:text-sm text-slate-100 font-mono overflow-x-auto leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <div key={`text-${lastIndex}`}>
        {renderInlineFormatted(content.slice(lastIndex))}
      </div>
    );
  }

  return <div className="prose-academic">{parts}</div>;
};
