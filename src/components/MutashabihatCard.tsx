'use client';
import { useEffect, useMemo, useState } from 'react';
import type { MutashabihEntry, Verse, Difficulty } from '@/types';
import AyahDisplay from './AyahDisplay';
import DiffHighlighter from './DiffHighlighter';
import { nextVerseKey } from '@/lib/constants';

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
    const primary = [entry.src.key, ...entry.similar.map((s) => s.key)];
    // When the mutashabih only makes sense with continuation, pull the next
    // ayah for source + each match too so the card can render context below.
    const contextKeys = entry.needsContext
      ? primary.map((k) => nextVerseKey(k)).filter((k): k is string => !!k)
      : [];
    const allKeys = Array.from(new Set([...primary, ...contextKeys]));
    fetch(`/api/quran/verses?keys=${allKeys.join(',')}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setVerses(j.verses);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [expanded, entry, verses]);

  const verseByKey = useMemo(() => {
    const m = new Map<string, Verse>();
    for (const v of verses || []) m.set(v.key, v);
    return m;
  }, [verses]);

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
            <span
              className="badge"
              style={{ background: '#e0e7ff', color: '#3730a3' }}
              title="This mutashabih continues into the next ayah — open Compare to see the continuation alongside."
            >
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

      {expanded && entry.needsContext && (
        <p className="text-xs text-[color:var(--ink-muted)] -mt-1 mb-3 italic">
          Context: this mutashabih extends into the next ayah — continuation shown beneath each pair.
        </p>
      )}
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
          {verses && verseByKey.get(entry.src.key) && (
            <div className="space-y-4">
              {entry.similar.map((sim) => {
                const srcVerse = verseByKey.get(entry.src.key)!;
                const matchVerse = verseByKey.get(sim.key);
                if (!matchVerse) return null;
                const srcCtx = entry.needsContext
                  ? verseByKey.get(nextVerseKey(entry.src.key) || '')
                  : undefined;
                const matchCtx = entry.needsContext
                  ? verseByKey.get(nextVerseKey(sim.key) || '')
                  : undefined;
                return (
                  <div key={sim.key} className="space-y-3">
                    <DiffHighlighter source={srcVerse} match={matchVerse} size="md" />
                    {srcCtx && matchCtx ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[color:var(--ink-muted)] px-1">
                          <span>↳ continuation</span>
                          <span className="h-px flex-1 bg-[color:var(--line)]" />
                          <span>{srcCtx.key} · {matchCtx.key}</span>
                        </div>
                        <DiffHighlighter source={srcCtx} match={matchCtx} size="sm" />
                      </div>
                    ) : (srcCtx || matchCtx) ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        <ContinuationBlock verse={srcCtx} />
                        <ContinuationBlock verse={matchCtx} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContinuationBlock({ verse }: { verse: Verse | undefined }) {
  if (!verse) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--line)] p-4 text-center text-xs text-[color:var(--ink-muted)]">
        No continuation (end of surah or Quran).
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-card)]/60 p-4">
      <div className="flex items-center justify-between mb-2 text-[11px] uppercase tracking-wider text-[color:var(--ink-muted)]">
        <span>↳ continues at {verse.key}</span>
      </div>
      <p className="arabic-sm" dir="rtl">
        {verse.textUthmani}
      </p>
      {verse.translation && (
        <p className="mt-3 text-[13px] leading-6 text-[color:var(--ink-muted)] border-l-2 border-[color:var(--teal)]/30 pl-3">
          {verse.translation}
        </p>
      )}
    </div>
  );
}
