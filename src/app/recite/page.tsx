'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ParahSelector from '@/components/ParahSelector';
import { PARAH_RANGES, surahAyahToAbsolute, absoluteToSurahAyah, makeKey, SURAH_NAMES } from '@/lib/constants';
import { useRecitation, playMistakeBeep } from '@/lib/use-recitation';
import { findDivergence, detectDrift } from '@/lib/recitation-matcher';
import type { Verse, MutashabihEntry } from '@/types';

interface DriftAlert {
  driftKey: string;
  driftScore: number;
  expectedScore: number;
}

export default function RecitePage() {
  const [parah, setParah] = useState(1);
  const [index, setIndex] = useState(0);
  const [verse, setVerse] = useState<Verse | null>(null);
  const [muta, setMuta] = useState<MutashabihEntry | null>(null);
  const [similarTexts, setSimilarTexts] = useState<{ key: string; text: string }[]>([]);
  const [matchedWords, setMatchedWords] = useState(0);
  const [divergenceIdx, setDivergenceIdx] = useState<number | null>(null);
  const [drift, setDrift] = useState<DriftAlert | null>(null);
  const [completedVerses, setCompletedVerses] = useState(0);
  const lastBeepedAt = useRef(0);

  const verseKeys = useMemo(() => buildParahKeys(parah), [parah]);
  useEffect(() => {
    setIndex(0);
    setCompletedVerses(0);
  }, [parah]);
  const currentKey = verseKeys[index];

  // Fetch verse + mutashabihat (for drift detection)
  useEffect(() => {
    if (!currentKey) return;
    let cancelled = false;
    setMatchedWords(0);
    setDivergenceIdx(null);
    setDrift(null);

    Promise.all([
      fetch(`/api/quran/verses?keys=${currentKey}`).then((r) => r.json()),
      fetch(`/api/mutashabihat?key=${currentKey}`).then((r) => r.json()),
    ]).then(async ([vRes, mRes]) => {
      if (cancelled) return;
      const v: Verse | null = vRes.verses?.[0] ?? null;
      setVerse(v);
      const m: MutashabihEntry | null = mRes.entry ?? null;
      setMuta(m);

      if (m && m.similar.length > 0) {
        const keys = m.similar.map((s) => s.key).join(',');
        const sRes = await fetch(`/api/quran/verses?keys=${keys}`).then((r) => r.json());
        if (cancelled) return;
        setSimilarTexts(
          (sRes.verses ?? []).map((sv: Verse) => ({ key: sv.key, text: sv.textUthmani })),
        );
      } else {
        setSimilarTexts([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentKey]);

  // Hook into the mic + transcribe loop
  const recitation = useRecitation({
    chunkMs: 4000,
    onChunk: (_chunk, full) => {
      if (!verse) return;
      const result = findDivergence(full, verse.textUthmani);
      setMatchedWords(result.matchedCount);
      setDivergenceIdx(result.divergenceIndex);

      if (result.completed) {
        // user reached the end of the verse correctly — advance
        setCompletedVerses((c) => c + 1);
        // Move on after a brief delay so they SEE the green flash
        setTimeout(() => {
          setIndex((i) => Math.min(verseKeys.length - 1, i + 1));
        }, 700);
        return;
      }

      if (result.divergenceIndex !== null) {
        // Beep, but rate-limit so we don't spam
        const now = Date.now();
        if (now - lastBeepedAt.current > 1500) {
          playMistakeBeep();
          lastBeepedAt.current = now;
        }

        // If the user has a mutashabih here, check if they drifted into one
        if (similarTexts.length > 0) {
          const driftRes = detectDrift(
            full,
            currentKey,
            verse.textUthmani,
            similarTexts,
          );
          if (driftRes) {
            setDrift({
              driftKey: driftRes.driftKey,
              driftScore: driftRes.driftScore,
              expectedScore: driftRes.expectedScore,
            });
          }
        }
      } else {
        setDrift(null);
      }
    },
  });

  // Auto-stop mic when navigating away from a verse mid-recitation
  useEffect(() => () => recitation.stop(), [recitation.stop]);

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Recitation Mode</h1>
        <p className="mt-2 text-[color:var(--ink-muted)]">
          Recite aloud — we'll listen, follow along, and beep if you drift. Powered by
          Tarteel's open Whisper model.
        </p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          ⚡ Best in Chrome on desktop or Android. Requires microphone permission.
        </p>
      </header>

      <div className="card p-5">
        <p className="text-sm font-semibold mb-3 text-[color:var(--ink-muted)]">Pick a parah</p>
        <ParahSelector value={parah} onChange={setParah} />
      </div>

      {/* Progress + mic controls */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="text-xs text-[color:var(--ink-muted)] mb-1">
              Verse {index + 1} of {verseKeys.length} · {completedVerses} completed this session
            </div>
            <div className="text-lg font-bold text-[color:var(--teal)]">
              {currentKey} {verse?.surahName && <span className="text-sm text-[color:var(--ink-muted)] font-medium">· {verse.surahName}</span>}
            </div>
          </div>
          <MicButton state={recitation.status} onStart={recitation.start} onStop={recitation.stop} />
        </div>

        {recitation.error && (
          <p className="text-xs text-red-600 dark:text-red-300 mb-3">
            ⚠ {recitation.error}
          </p>
        )}

        {/* Drift alert — the mutashabihat killer feature */}
        {drift && (
          <div className="mb-4 rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-950/30 p-4">
            <p className="text-sm font-bold text-red-700 dark:text-red-200">
              ⚠ You're drifting into {drift.driftKey}
            </p>
            <p className="text-xs text-red-700/80 dark:text-red-200/80 mt-1">
              The verse you started ({currentKey}) and {drift.driftKey} share opening words. Your
              recitation matches {drift.driftKey} {Math.round(drift.driftScore * 100)}% vs only{' '}
              {Math.round(drift.expectedScore * 100)}% for the expected verse. Go back to{' '}
              {currentKey} and listen for where they diverge.
            </p>
          </div>
        )}

        {/* Verse display with live word-by-word highlight */}
        {verse ? (
          <VerseLiveDisplay
            verse={verse}
            matchedCount={matchedWords}
            divergenceIdx={divergenceIdx}
            listening={recitation.status === 'listening' || recitation.status === 'transcribing'}
          />
        ) : (
          <div className="text-center py-12 text-[color:var(--ink-muted)]">Loading verse…</div>
        )}

        {/* Live transcript (small, for debugging / transparency) */}
        {recitation.transcript && (
          <div className="mt-5 pt-4 border-t border-[color:var(--line)]">
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--ink-muted)] mb-1.5">
              What we heard
            </p>
            <p className="arabic-sm text-[color:var(--ink-muted)]" dir="rtl">
              {recitation.transcript}
            </p>
          </div>
        )}
      </div>

      {/* Nav controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="px-5 py-2.5 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--line)] text-sm font-semibold disabled:opacity-40 hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
        >
          ← Previous verse
        </button>
        <button
          onClick={() => setIndex((i) => Math.min(verseKeys.length - 1, i + 1))}
          disabled={index === verseKeys.length - 1}
          className="px-5 py-2.5 rounded-full bg-[color:var(--teal)] text-white text-sm font-semibold disabled:opacity-40 hover:opacity-95 transition"
        >
          Next verse →
        </button>
      </div>

      {muta && (
        <div className="card p-4 border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
            ⚠ Mutashabih verse
          </p>
          <p className="text-xs text-[color:var(--ink-muted)] leading-5">
            This verse has {muta.similar.length} similar {muta.similar.length === 1 ? 'counterpart' : 'counterparts'} elsewhere
            ({muta.similar.map((s) => s.key).join(', ')}). If you drift into one of them while reciting, we'll catch it above.
          </p>
        </div>
      )}
    </div>
  );
}

function MicButton({
  state,
  onStart,
  onStop,
}: {
  state: ReturnType<typeof useRecitation>['status'];
  onStart: () => void;
  onStop: () => void;
}) {
  const listening = state === 'listening' || state === 'transcribing';
  return (
    <button
      onClick={listening ? onStop : onStart}
      disabled={state === 'requesting-mic'}
      className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold transition shadow ${
        listening
          ? 'bg-red-500 text-white animate-pulse hover:bg-red-600'
          : 'bg-[color:var(--teal)] text-white hover:opacity-95'
      } disabled:opacity-50`}
    >
      <span className="text-lg">{listening ? '⏹' : '🎤'}</span>
      <span className="text-sm">
        {state === 'requesting-mic'
          ? 'Requesting mic…'
          : state === 'listening'
            ? 'Listening — recite'
            : state === 'transcribing'
              ? 'Transcribing…'
              : 'Start reciting'}
      </span>
    </button>
  );
}

function VerseLiveDisplay({
  verse,
  matchedCount,
  divergenceIdx,
  listening,
}: {
  verse: Verse;
  matchedCount: number;
  divergenceIdx: number | null;
  listening: boolean;
}) {
  return (
    <div
      className="text-3xl sm:text-4xl leading-[2.3] text-right p-4 rounded-xl bg-[color:var(--bg-card)]/40 border border-[color:var(--line)]"
      dir="rtl"
    >
      {verse.words.map((w, i) => {
        const isMatched = i < matchedCount;
        const isDivergence = divergenceIdx !== null && i === divergenceIdx;
        const isCurrent = i === matchedCount && listening && divergenceIdx === null;
        return (
          <span
            key={i}
            className={`inline-block mx-1 px-1 rounded transition-all duration-200 ${
              isDivergence
                ? 'bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-100 ring-2 ring-red-500'
                : isMatched
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : isCurrent
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 animate-pulse'
                    : 'text-[color:var(--ink)]'
            }`}
          >
            {w.text}
          </span>
        );
      })}
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
