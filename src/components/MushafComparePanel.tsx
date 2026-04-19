'use client';
import { useEffect, useState } from 'react';
import { diffVerses } from '@/lib/diff';
import { SURAH_NAMES } from '@/lib/constants';
import type { Verse, DiffWord } from '@/types';

interface Props {
  sourceKey: string;
  similarKey: string;
  onClose: () => void;
}

export default function MushafComparePanel({ sourceKey, similarKey, onClose }: Props) {
  const [source, setSource] = useState<Verse | null>(null);
  const [similar, setSimilar] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/quran/verses?keys=${sourceKey},${similarKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const verses: Verse[] = data.verses;
        setSource(verses.find((v) => v.key === sourceKey) || verses[0]);
        setSimilar(verses.find((v) => v.key === similarKey) || verses[1]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sourceKey, similarKey]);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="text-center py-8 text-[color:var(--ink-muted)] text-sm">
          Loading comparison...
        </div>
      </div>
    );
  }

  if (error || !source || !similar) {
    return (
      <div className="card p-5">
        <div className="text-center py-8 text-red-500 text-sm">
          {error || 'Failed to load verses'}
        </div>
      </div>
    );
  }

  const { left, right } = diffVerses(source.words, similar.words);

  return (
    <div className="card p-4 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[color:var(--ink)]">
          Word-level Comparison
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-2 py-1 rounded-lg hover:bg-[color:var(--line)] text-[color:var(--ink-muted)] transition"
        >
          Close
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-[color:var(--ink-muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'var(--amber-soft)' }} />
          Different
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'var(--coral-soft)' }} />
          Extra
        </span>
      </div>

      {/* Source verse (top) */}
      <VerseBlock
        verse={source}
        diffWords={left}
        label="Source"
        accentBorder="border-[color:var(--teal)]"
      />

      {/* Similar verse (bottom) */}
      <VerseBlock
        verse={similar}
        diffWords={right}
        label="Similar"
        accentBorder="border-amber-500"
      />
    </div>
  );
}

function VerseBlock({
  verse,
  diffWords,
  label,
  accentBorder,
}: {
  verse: Verse;
  diffWords: DiffWord[];
  label: string;
  accentBorder: string;
}) {
  const [s, a] = verse.key.split(':').map(Number);
  const surahName = SURAH_NAMES[s - 1]?.en || `Surah ${s}`;

  return (
    <div className={`rounded-xl border-l-4 ${accentBorder} bg-[color:var(--bg)] p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--teal)]">
          {label} — {surahName}
        </span>
        <span className="text-xs text-[color:var(--ink-muted)] font-medium">{verse.key}</span>
      </div>
      <p className="arabic-md" dir="rtl">
        {diffWords.map((w, i) => (
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
    </div>
  );
}
