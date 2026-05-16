'use client';
import { useEffect, useMemo, useState } from 'react';
import ParahSelector from '@/components/ParahSelector';
import AyahDisplay from '@/components/AyahDisplay';
import DiffHighlighter from '@/components/DiffHighlighter';
import { PARAH_RANGES, surahAyahToAbsolute, absoluteToSurahAyah, makeKey } from '@/lib/constants';
import { useActivityTracker } from '@/lib/use-activity-tracker';
import type { Verse, MutashabihEntry, Difficulty } from '@/types';

export default function RevisionPage() {
  const [parah, setParah] = useState(1);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState<string[]>([]);

  // Read ?parah=N from the URL on mount (e.g. when navigated from the Hifz
  // plan cards). Done in an effect to avoid the SSR Suspense requirement
  // around next/navigation's useSearchParams.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = Number(params.get('parah'));
    if (Number.isInteger(p) && p >= 1 && p <= 30) setParah(p);
  }, []);

  // Build the list of verse keys in the current parah
  const verseKeys = useMemo(() => buildParahKeys(parah), [parah]);

  // Reset to first verse when parah changes
  useEffect(() => setIndex(0), [parah]);

  const currentKey = verseKeys[index];

  // Track every verse the user actually lands on, then log to Activity Days
  // once they've gone through enough of them.
  useEffect(() => {
    if (!currentKey) return;
    setTouched((prev) => (prev.includes(currentKey) ? prev : [...prev, currentKey]));
  }, [currentKey]);

  useActivityTracker({ verseKeys: touched, activityType: 'revision' });

  const [verse, setVerse] = useState<Verse | null>(null);
  const [muta, setMuta] = useState<(MutashabihEntry & { difficulty: Difficulty }) | null>(null);
  const [similarVerses, setSimilarVerses] = useState<Verse[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentKey) return;
    let cancelled = false;
    setLoading(true);
    setShowCompare(false);
    setSimilarVerses([]);

    Promise.all([
      fetch(`/api/quran/verses?keys=${currentKey}`).then((r) => r.json()),
      fetch(`/api/mutashabihat?key=${currentKey}`).then((r) => r.json()),
    ]).then(([vRes, mRes]) => {
      if (cancelled) return;
      setVerse(vRes.verses?.[0] ?? null);
      setMuta(mRes.entry);
      setLoading(false);

      // pre-fetch similar verses if mutashabih exists
      if (mRes.entry) {
        const keys = mRes.entry.similar.map((s: any) => s.key).join(',');
        fetch(`/api/quran/verses?keys=${keys}`)
          .then((r) => r.json())
          .then((j) => !cancelled && setSimilarVerses(j.verses || []));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentKey]);

  function next() { setIndex((i) => Math.min(verseKeys.length - 1, i + 1)); }
  function prev() { setIndex((i) => Math.max(0, i - 1)); }

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') prev(); // RTL: right = previous
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next();
      else if (e.key === ' ') { e.preventDefault(); setShowCompare((s) => !s); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [verseKeys.length]);

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Parah Revision</h1>
        <p className="mt-2 text-[color:var(--ink-muted)]">
          Walk verse-by-verse. We'll warn you the moment you reach a mutashabih verse.
        </p>
      </header>

      <div className="card p-5 mb-6">
        <p className="text-sm font-semibold mb-3 text-[color:var(--ink-muted)]">Pick a parah</p>
        <ParahSelector value={parah} onChange={setParah} />
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-[color:var(--ink-muted)] mb-2">
          <span>Parah {parah}</span>
          <span>{index + 1} / {verseKeys.length}</span>
        </div>
        <div className="h-2 rounded-full bg-[color:var(--line)] overflow-hidden">
          <div
            className="h-full bg-[color:var(--teal)] transition-all"
            style={{ width: `${((index + 1) / verseKeys.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Mutashabih warning banner */}
      {muta && (
        <div className="card p-4 mb-4 border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 fade-up">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                ⚠ Mutashabih alert — {muta.similar.length} similar {muta.similar.length === 1 ? 'verse' : 'verses'}
              </p>
              <p className="text-xs text-[color:var(--ink-muted)] mt-1">
                This verse closely resembles: {muta.similar.map((s) => s.key).join(', ')}
                {muta.needsContext && ' · check next ayah for context'}
              </p>
            </div>
            <button
              onClick={() => setShowCompare((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition"
            >
              {showCompare ? 'Hide comparison' : 'Show comparison'}
            </button>
          </div>
        </div>
      )}

      {/* Main verse card */}
      <div className="card p-6 sm:p-8 min-h-[200px]">
        {loading || !verse ? (
          <div className="text-center py-16 text-[color:var(--ink-muted)]">Loading verse…</div>
        ) : (
          <AyahDisplay verse={verse} size="lg" />
        )}
      </div>

      {/* Side-by-side comparison */}
      {showCompare && verse && similarVerses.length > 0 && (
        <div className="mt-6 space-y-4 fade-up">
          <h2 className="text-sm font-semibold text-[color:var(--ink-muted)] uppercase tracking-wider">
            Side-by-side comparison
          </h2>
          {similarVerses.map((sv) => (
            <DiffHighlighter key={sv.key} source={verse} match={sv} size="md" />
          ))}
        </div>
      )}

      {/* Nav controls */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-5 py-2.5 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--line)] text-sm font-semibold disabled:opacity-40 hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
        >
          ← Previous
        </button>
        <span className="text-xs text-[color:var(--ink-muted)] hidden sm:inline">
          ← / → arrows · space to compare
        </span>
        <button
          onClick={next}
          disabled={index === verseKeys.length - 1}
          className="px-5 py-2.5 rounded-full bg-[color:var(--teal)] text-white text-sm font-semibold disabled:opacity-40 hover:opacity-95 transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function buildParahKeys(parah: number): string[] {
  const r = PARAH_RANGES[parah - 1];
  const start = surahAyahToAbsolute(r.start[0], r.start[1]);
  const end = surahAyahToAbsolute(r.end[0], r.end[1]);
  const out: string[] = [];
  for (let abs = start; abs <= end; abs++) {
    const { surah, ayah } = absoluteToSurahAyah(abs);
    out.push(makeKey(surah, ayah));
  }
  return out;
}
