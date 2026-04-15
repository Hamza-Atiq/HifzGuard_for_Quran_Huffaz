'use client';
import { useEffect, useState } from 'react';
import type { MutashabihEntry, Verse, Difficulty } from '@/types';
import AyahDisplay from './AyahDisplay';
import DiffHighlighter from './DiffHighlighter';

interface Props {
  entry: MutashabihEntry & { difficulty?: Difficulty };
  defaultExpanded?: boolean;
}

const diffLabel: Record<Difficulty, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export default function MutashabihatCard({ entry, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!expanded || verses) return;
    setLoading(true);
    setError(null);
    const allKeys = [entry.src.key, ...entry.similar.map((s) => s.key)];
    fetch(`/api/quran/verses?keys=${allKeys.join(',')}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setVerses(j.verses);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [expanded, entry, verses]);

  const difficulty = entry.difficulty ?? (entry.similar.length >= 4 ? 'large' : entry.similar.length >= 2 ? 'medium' : 'small');

  async function bookmark() {
    setBookmarking(true);
    try {
      const res = await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseKey: entry.src.key }),
      });
      if (res.ok) setBookmarked(true);
      else if (res.status === 401) {
        if (confirm('Sign in with your Quran.com account to save bookmarks?')) {
          window.location.href = '/api/auth/login';
        }
      }
    } finally {
      setBookmarking(false);
    }
  }

  return (
    <div className="card p-5 fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[color:var(--teal)]">
            {entry.src.key}
          </span>
          <span className={`badge badge-${difficulty}`}>
            {entry.similar.length} similar · {diffLabel[difficulty]}
          </span>
          {entry.needsContext && (
            <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
              + context
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={bookmark}
            disabled={bookmarking || bookmarked}
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--line)] hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition disabled:opacity-50"
          >
            {bookmarked ? '★ saved' : '☆ bookmark'}
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--teal)] text-white hover:bg-[color:var(--teal)]/90 transition"
          >
            {expanded ? 'Hide' : 'Compare'}
          </button>
        </div>
      </div>

      <p className="text-xs text-[color:var(--ink-muted)] mb-3">
        Similar to: {entry.similar.map((s) => s.key).join('  ·  ')}
      </p>

      {expanded && (
        <div className="mt-4">
          {loading && (
            <div className="text-center py-12 text-[color:var(--ink-muted)] text-sm">
              Loading verses…
            </div>
          )}
          {error && (
            <div className="text-center py-6 text-red-600 text-sm">
              Couldn't load verses: {error}
            </div>
          )}
          {verses && verses.length >= 2 && (
            <div className="space-y-4">
              {verses.slice(1).map((m, i) => (
                <DiffHighlighter key={m.key} source={verses[0]} match={m} size="md" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
