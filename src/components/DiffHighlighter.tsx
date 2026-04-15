'use client';
import { diffVerses } from '@/lib/diff';
import type { Verse } from '@/types';

interface Props {
  source: Verse;
  match: Verse;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'arabic-sm',
  md: 'arabic-md',
  lg: 'arabic',
};

/**
 * Renders two verses with word-level diff highlighting.
 * Words present in both → default color
 * Words that differ at the same alignment slot → amber
 * Words that exist in only one → coral
 */
export default function DiffHighlighter({ source, match, size = 'md' }: Props) {
  const { left, right } = diffVerses(source.words, match.words);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <VerseColumn
        verse={source}
        words={left}
        sizeClass={sizeClass[size]}
        accent="from-teal-50 to-white"
      />
      <VerseColumn
        verse={match}
        words={right}
        sizeClass={sizeClass[size]}
        accent="from-amber-50 to-white"
      />
    </div>
  );
}

function VerseColumn({
  verse,
  words,
  sizeClass,
  accent,
}: {
  verse: Verse;
  words: ReturnType<typeof diffVerses>['left'];
  sizeClass: string;
  accent: string;
}) {
  return (
    <div className={`card p-5 bg-gradient-to-br ${accent} dark:bg-none`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--teal)]">
          {verse.surahName}
        </span>
        <span className="text-xs text-[color:var(--ink-muted)]">{verse.key}</span>
      </div>

      <p className={sizeClass} dir="rtl">
        {words.map((w, i) => (
          <span
            key={`${i}-${w.text}`}
            className={
              w.status === 'same'
                ? 'word word-same'
                : w.status === 'diff'
                ? 'word word-diff'
                : 'word word-extra'
            }
          >
            {w.text}
          </span>
        ))}
      </p>

      {verse.translation && (
        <p className="mt-4 text-[14px] leading-7 text-[color:var(--ink-muted)] border-l-2 border-[color:var(--teal)]/40 pl-3">
          {verse.translation}
        </p>
      )}
    </div>
  );
}
