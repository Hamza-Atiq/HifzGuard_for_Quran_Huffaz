'use client';
import { useEffect, useState } from 'react';
import ParahSelector from '@/components/ParahSelector';
import DiffHighlighter from '@/components/DiffHighlighter';
import { SURAH_NAMES } from '@/lib/constants';
import type { MutashabihEntry, Verse, Difficulty } from '@/types';

interface Question {
  entry: MutashabihEntry & { difficulty: Difficulty };
  // Show the source verse with first 4 words; user picks where it's from
  options: string[]; // verse keys, one of them is correct
  correctKey: string;
}

export default function SelfTestPage() {
  const [parah, setParah] = useState(1);
  const [pool, setPool] = useState<(MutashabihEntry & { difficulty: Difficulty })[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionVerses, setQuestionVerses] = useState<Verse[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    fetch(`/api/mutashabihat?parah=${parah}`)
      .then((r) => r.json())
      .then((j) => setPool((j.entries || []).filter((e: any) => e.similar.length >= 1)));
  }, [parah]);

  function nextQuestion() {
    if (pool.length === 0) return;
    setStarted(true);
    setPicked(null);
    setQuestionVerses([]);
    setLoading(true);

    const entry = pool[Math.floor(Math.random() * pool.length)];
    const candidates = [entry.src.key, ...entry.similar.map((s) => s.key)];
    // Shuffle candidates as MCQ options
    const options = [...candidates].sort(() => Math.random() - 0.5);
    const q: Question = { entry, options, correctKey: entry.src.key };
    setQuestion(q);

    fetch(`/api/quran/verses?keys=${candidates.join(',')}`)
      .then((r) => r.json())
      .then((j) => setQuestionVerses(j.verses || []))
      .finally(() => setLoading(false));
  }

  function pick(key: string) {
    if (picked || !question) return;
    setPicked(key);
    setScore((s) => ({
      correct: s.correct + (key === question.correctKey ? 1 : 0),
      total: s.total + 1,
    }));
    if (key !== question.correctKey) {
      // auto-bookmark wrong answers (silently fail if not signed in)
      fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseKey: question.correctKey }),
      }).catch(() => {});
    }
  }

  const sourceVerse = question ? questionVerses.find((v) => v.key === question.correctKey) : null;
  const previewWords = sourceVerse?.words.slice(0, 4) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Self-Test</h1>
        <p className="mt-2 text-[color:var(--ink-muted)]">
          We show the opening words of a verse — you pick which location it's from.
        </p>
      </header>

      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <p className="text-sm font-semibold text-[color:var(--ink-muted)]">Choose a parah to test:</p>
          <div className="text-sm">
            Score: <span className="font-bold text-[color:var(--teal)]">{score.correct}</span>
            <span className="text-[color:var(--ink-muted)]"> / {score.total}</span>
          </div>
        </div>
        <ParahSelector value={parah} onChange={(p) => { setParah(p); setStarted(false); setQuestion(null); }} />
      </div>

      {!started && (
        <div className="card p-10 text-center">
          <p className="text-[color:var(--ink-muted)] mb-4">
            {pool.length} questions available in Parah {parah}
          </p>
          <button
            onClick={nextQuestion}
            disabled={pool.length === 0}
            className="px-6 py-3 rounded-full bg-[color:var(--teal)] text-white font-semibold disabled:opacity-40 hover:opacity-95 transition"
          >
            Start Quiz →
          </button>
        </div>
      )}

      {started && question && (
        <div className="space-y-5">
          <div className="card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--teal)] mb-3">
              Where does this verse appear?
            </p>
            {loading || previewWords.length === 0 ? (
              <p className="text-center py-8 text-[color:var(--ink-muted)]">Loading…</p>
            ) : (
              <p className="arabic" dir="rtl">
                {previewWords.map((w, i) => (
                  <span key={i} className="word word-same">{w.text}</span>
                ))}
                <span className="text-[color:var(--ink-muted)] mr-2">…</span>
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {question.options.map((key) => {
              const [s, a] = key.split(':').map(Number);
              const isCorrect = picked && key === question.correctKey;
              const isWrong = picked === key && key !== question.correctKey;
              return (
                <button
                  key={key}
                  onClick={() => pick(key)}
                  disabled={!!picked}
                  className={`card p-4 text-left transition ${
                    isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                    isWrong   ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                    !picked   ? 'hover:border-[color:var(--teal)] cursor-pointer' :
                                'opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{SURAH_NAMES[s - 1]?.en}</div>
                      <div className="text-xs text-[color:var(--ink-muted)]">{key}</div>
                    </div>
                    {isCorrect && <span className="text-green-600 font-bold">✓</span>}
                    {isWrong && <span className="text-red-600 font-bold">✗</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {picked && questionVerses.length >= 2 && (
            <div className="space-y-4 fade-up">
              <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-muted)]">
                Compare to confirm
              </p>
              {questionVerses
                .filter((v) => v.key !== question.correctKey)
                .map((v) => {
                  const src = questionVerses.find((x) => x.key === question.correctKey)!;
                  return <DiffHighlighter key={v.key} source={src} match={v} size="sm" />;
                })}
              <div className="text-center pt-4">
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 rounded-full bg-[color:var(--teal)] text-white font-semibold hover:opacity-95 transition"
                >
                  Next Question →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
