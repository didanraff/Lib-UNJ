import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { Book } from '../types/library';

interface BookCoverProps {
  book: Pick<Book, 'title' | 'author' | 'category' | 'shelfCode' | 'coverUrl' | 'coverTone'>;
  className?: string;
}

const TONE_MAP: Record<Book['coverTone'], { bg: string; accent: string; line: string }> = {
  slate: {
    bg: 'from-slate-800 via-slate-900 to-slate-950',
    accent: 'text-slate-200',
    line: 'border-slate-600/60',
  },
  cobalt: {
    bg: 'from-blue-900 via-slate-900 to-slate-950',
    accent: 'text-blue-200',
    line: 'border-blue-500/40',
  },
  emerald: {
    bg: 'from-emerald-900 via-slate-900 to-slate-950',
    accent: 'text-emerald-200',
    line: 'border-emerald-500/40',
  },
  amber: {
    bg: 'from-amber-900 via-stone-900 to-slate-950',
    accent: 'text-amber-200',
    line: 'border-amber-500/40',
  },
  indigo: {
    bg: 'from-indigo-900 via-slate-900 to-slate-950',
    accent: 'text-indigo-200',
    line: 'border-indigo-500/40',
  },
};

export function BookCover({ book, className = '' }: BookCoverProps) {
  const [imgError, setImgError] = useState(false);
  const tone = TONE_MAP[book.coverTone] || TONE_MAP.slate;

  if (book.coverUrl && !imgError) {
    return (
      <div
        className={`relative overflow-hidden bg-slate-100 border border-slate-200 ${className}`}
      >
        <img
          src={book.coverUrl}
          alt={`Sampul buku ${book.title}`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${tone.bg} text-white border border-slate-200 flex flex-col justify-between p-4 select-none ${className}`}
    >
      <div className={`border-b ${tone.line} pb-2 flex items-center justify-between gap-2`}>
        <span className="font-mono text-[10px] tracking-wider text-slate-300 truncate">
          {book.shelfCode}
        </span>
        <BookOpen className={`w-3.5 h-3.5 shrink-0 ${tone.accent}`} />
      </div>

      <div className="my-auto py-2">
        <p className={`text-[11px] font-medium mb-1.5 ${tone.accent} truncate`}>
          {book.category}
        </p>
        <h4 className="font-display text-sm font-semibold leading-snug text-white line-clamp-4">
          {book.title}
        </h4>
      </div>

      <div className={`border-t ${tone.line} pt-2`}>
        <p className="text-[11px] text-slate-300 truncate">{book.author}</p>
      </div>
    </div>
  );
}
