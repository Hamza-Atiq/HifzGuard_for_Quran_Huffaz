'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ParahSelector from '@/components/ParahSelector';
import {
  PARAH_RANGES,
  surahAyahToAbsolute,
  absoluteToSurahAyah,
  makeKey,
} from '@/lib/constants';
import { useWebSpeech } from '@/lib/use-web-speech';
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
  const completedRef = useRef(false);

  const verseKeys = useMemo(() => buildParahKeys(parah), [parah]);
  useEffect(() => {
    setIndex(0);
    setCompletedVerses(0);
  }, [parah]);
  const currentKey = verseKeys[index];

  // Fetch verse + mutashabihat
  useEffect(() => {
    if (!currentKey) return;
    let cancelled = false;
    setMatchedWords(0);
    setDivergenceIdx(null);
    setDrift(null);
    completedRef.current = false;

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

  // Shared handler — called by both Web Speech (realtime) and Whisper (fallback)
  function handleTranscript(full: string) {
    if (!verse || completedRef.current) return;
    const result = findDivergence(full, verse.textUthmani, { tolerateMisses: 1 });
    setMatchedWords(result.matchedCount);
    setDivergenceIdx(result.divergenceIndex);

    // Completion guard: the وٰ normalization fixes most Uthmanic spelling gaps,
    // but also require an absolute minimum of 3 words matched so short verses
    // (2–4 words) can't advance after a single lucky word.
    const eLen = verse.textUthmani.trim().split(/\s+/).filter(Boolean).length;
    const minWords = eLen <= 3 ? eLen : Math.max(3, Math.ceil(eLen * 0.75));
    const isCompleted = result.completed && result.matchedCount >= minWords;

    if (isCompleted) {
      completedRef.current = true;
      setCompletedVerses((c) => c + 1);
      // Restart the recognition session immediately so the old session's
      // accumulated buffer doesn't bleed into the next verse's transcript.
      webSpeech.restart();
      setTimeout(() => {
        completedRef.current = false;
        setIndex((i) => Math.min(verseKeys.length - 1, i + 1));
      }, 700);
      return;
    }

    if (result.divergenceIndex !== null) {
      // Only beep when divergence falls within what has actually been recited.
      // A divergence at matchedCount+3 or beyond is a frontier artefact from
      // the lookahead algorithm, not a real error.
      const withinRecited = result.divergenceIndex <= result.matchedCount + 3;
      if (withinRecited) {
        const now = Date.now();
        if (now - lastBeepedAt.current > 2000) {
          playMistakeBeep();
          lastBeepedAt.current = now;
        }
      }
      if (similarTexts.length > 0) {
        const driftRes = detectDrift(full, currentKey, verse.textUthmani, similarTexts);
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
  }

  // PRIMARY: Web Speech API — real-time, ~200ms latency
  const webSpeech = useWebSpeech({
    lang: 'ar-SA',
    onUpdate: handleTranscript,
  });

  // FALLBACK: Groq/HF Whisper — for browsers without Web Speech support
  const whisper = useRecitation({
    chunkMs: 4000,
    expectedVerse: verse?.textUthmani,
    onChunk: (_chunk, full) => handleTranscript(full),
  });

  const usingWebSpeech = webSpeech.supported;
  const isListening = usingWebSpeech
    ? webSpeech.status === 'listening'
    : whisper.status === 'listening' || whisper.status === 'transcribing';

  function startReciting() {
    setMatchedWords(0);
    setDivergenceIdx(null);
    setDrift(null);
    completedRef.current = false;
    if (usingWebSpeech) {
      webSpeech.start();
    } else {
      whisper.start();
    }
  }

  function stopReciting() {
    if (usingWebSpeech) webSpeech.stop();
    else whisper.stop();
  }

  // Stop when navigating away
  useEffect(() => {
    return () => {
      webSpeech.stop();
      whisper.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When verse changes, restart recognition so the old session's buffer is
  // fully discarded — clearTranscript() alone doesn't stop the session and
  // final results from the old verse can still arrive and corrupt the new one.
  useEffect(() => {
    webSpeech.restart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  const displayedTranscript = usingWebSpeech ? webSpeech.transcript : whisper.transcript;
  const displayedError = usingWebSpeech ? webSpeech.error : whisper.error;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Recitation Mode</h1>
        <p className="mt-2 text-[color:var(--ink-muted)]">
          Recite aloud — we&apos;ll follow along word-by-word and beep if you drift into a similar verse.
        </p>
        {usingWebSpeech ? (
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            ✓ Real-time mode — browser speech recognition active (Arabic)
          </p>
        ) : (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            ⚡ Chunked mode — Chrome recommended for real-time word tracking.
          </p>
        )}
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
              {currentKey}{' '}
              {verse?.surahName && (
                <span className="text-sm text-[color:var(--ink-muted)] font-medium">
                  · {verse.surahName}
                </span>
              )}
            </div>
          </div>
          <MicButton
            isListening={isListening}
            onStart={startReciting}
            onStop={stopReciting}
          />
        </div>

        {displayedError && (
          <p className="text-xs text-red-600 dark:text-red-300 mb-3">⚠ {displayedError}</p>
        )}

        {/* Drift alert */}
        {drift && (
          <div className="mb-4 rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-950/30 p-4">
            <p className="text-sm font-bold text-red-700 dark:text-red-200">
              ⚠ You&apos;re drifting into {drift.driftKey}
            </p>
            <p className="text-xs text-red-700/80 dark:text-red-200/80 mt-1">
              Your recitation matches {drift.driftKey}{' '}
              {Math.round(drift.driftScore * 100)}% vs only{' '}
              {Math.round(drift.expectedScore * 100)}% for {currentKey}. Go back and listen
              carefully for where they diverge.
            </p>
          </div>
        )}

        {/* Verse display with live word-by-word highlight */}
        {verse ? (
          <VerseLiveDisplay
            verse={verse}
            matchedCount={matchedWords}
            divergenceIdx={divergenceIdx}
            listening={isListening}
          />
        ) : (
          <div className="text-center py-12 text-[color:var(--ink-muted)]">Loading verse…</div>
        )}

        {/* Live transcript */}
        {displayedTranscript && (
          <div className="mt-5 pt-4 border-t border-[color:var(--line)]">
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--ink-muted)] mb-1.5">
              What we heard
            </p>
            <p className="arabic-sm text-[color:var(--ink-muted)]" dir="rtl">
              {displayedTranscript}
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
            This verse has {muta.similar.length} similar{' '}
            {muta.similar.length === 1 ? 'counterpart' : 'counterparts'} elsewhere (
            {muta.similar.map((s) => s.key).join(', ')}). If you recite one when you mean the
            other, we&apos;ll catch it above.
          </p>
        </div>
      )}
    </div>
  );
}

function MicButton({
  isListening,
  onStart,
  onStop,
}: {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <button
      onClick={isListening ? onStop : onStart}
      className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold transition shadow ${
        isListening
          ? 'bg-red-500 text-white animate-pulse hover:bg-red-600'
          : 'bg-[color:var(--teal)] text-white hover:opacity-95'
      }`}
    >
      <span className="text-lg">{isListening ? '⏹' : '🎤'}</span>
      <span className="text-sm">{isListening ? 'Stop' : 'Start reciting'}</span>
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
