'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import StreakCalendar from '@/components/StreakCalendar';
import DifficultyPie from '@/components/DifficultyPie';
import ParahHeatmap from '@/components/ParahHeatmap';
import { useAuth } from '@/lib/use-auth';
import { useMemorizedParahs } from '@/lib/use-memorized-parahs';
import {
  computeHeatmap,
  type RawActivityDay,
} from '@/lib/hifz-plan';
import { classifyDifficulty, getMutashabihatForVerse } from '@/lib/mutashabihat';

interface BookmarkRow {
  key: string;
  surahName?: string;
  difficulty: 'small' | 'medium' | 'large' | 'unknown';
  similarCount: number;
}

interface InsightData {
  pattern: string;
  focusArea: string;
  practicalTip: string;
}

export default function DashboardPage() {
  const auth = useAuth();
  const { memorizedList } = useMemorizedParahs();

  const [activity, setActivity] = useState<RawActivityDay[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [scopeNote, setScopeNote] = useState<string | null>(null);
  const [needsRelogin, setNeedsRelogin] = useState(false);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  // Fetch activity + bookmarks once
  useEffect(() => {
    fetch('/api/user/activity', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setActivity(Array.isArray(j.days) ? j.days : []);
        if (j.reason === 'scope_missing') setNeedsRelogin(true);
      })
      .catch(() => setActivity([]));

    fetch('/api/user/bookmarks', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j.scopeMissing) {
          setNeedsRelogin(true);
          setScopeNote(null); // replaced by needsRelogin banner
        }
        const list = (j.bookmarks ?? []) as Array<{
          key?: string | number;
          verse_key?: string;
          verseNumber?: number;
        }>;
        const rows: BookmarkRow[] = [];
        for (const b of list) {
          // QF returns either verse_key:"2:14" or key:<surahInt> + verseNumber:<ayahInt>
          let verseKey: string | null = null;
          if (typeof b.verse_key === 'string' && b.verse_key.includes(':')) {
            verseKey = b.verse_key;
          } else if (typeof b.key === 'string' && b.key.includes(':')) {
            verseKey = b.key;
          } else if (typeof b.key === 'number' && typeof b.verseNumber === 'number') {
            verseKey = `${b.key}:${b.verseNumber}`;
          }
          if (!verseKey) continue;
          const [s, a] = verseKey.split(':').map(Number);
          if (!s || !a) continue;
          const entry = getMutashabihatForVerse(s, a);
          rows.push({
            key: verseKey,
            difficulty: entry ? classifyDifficulty(entry.similar.length) : 'unknown',
            similarCount: entry?.similar.length ?? 0,
          });
        }
        setBookmarks(rows);
      })
      .catch(() => setBookmarks([]));
  }, []);

  const heatmap = useMemo(
    () => computeHeatmap(memorizedList, activity),
    [memorizedList, activity],
  );

  const difficultyCounts = useMemo(() => {
    let small = 0;
    let medium = 0;
    let large = 0;
    for (const b of bookmarks) {
      if (b.difficulty === 'small') small++;
      else if (b.difficulty === 'medium') medium++;
      else if (b.difficulty === 'large') large++;
    }
    return { small, medium, large };
  }, [bookmarks]);

  async function generateInsight() {
    if (bookmarks.length === 0) {
      setInsightError('Bookmark a few mutashabihat pairs first.');
      return;
    }
    setInsightLoading(true);
    setInsightError(null);
    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weakKeys: bookmarks.map((b) => b.key) }),
      });
      const j = await res.json();
      if (!res.ok || !j.insight) {
        throw new Error(j.message || j.error || `HTTP ${res.status}`);
      }
      setInsight(j.insight);
    } catch (e) {
      setInsightError((e as Error).message);
    } finally {
      setInsightLoading(false);
    }
  }

  if (auth.authenticated === false) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Dashboard</h1>
        <p className="text-[color:var(--ink-muted)] mb-6">
          Sign in to see your activity, weak mutashabihat, and AI-generated insights.
        </p>
        <button
          onClick={auth.signIn}
          className="px-6 py-3 rounded-full bg-[color:var(--teal)] text-white font-semibold hover:opacity-95 transition"
        >
          Sign in →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 sm:py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-[color:var(--ink-muted)]">
          Your hifz at a glance — activity, weak pairs, and what to focus on next.
        </p>
      </header>

      {needsRelogin && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-400 dark:border-amber-700 text-sm text-amber-900 dark:text-amber-100 flex items-center justify-between gap-4 flex-wrap">
          <span>
            <strong>Your session is missing API scopes</strong> — bookmarks, activity, and streak
            data won&apos;t save until you sign out and sign back in.
          </span>
          <a
            href="/api/auth/logout"
            className="shrink-0 px-3 py-1.5 rounded-full bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition"
          >
            Sign out
          </a>
        </div>
      )}

      {scopeNote && !needsRelogin && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200">
          {scopeNote}
        </div>
      )}

      {/* Top stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Current streak" value={`🔥 ${auth.current}`} sub="days" />
        <Stat label="Longest streak" value={String(auth.longest)} sub="days" />
        <Stat label="Bookmarked pairs" value={String(bookmarks.length)} sub="weak verses" />
        <Stat label="Memorized" value={`${memorizedList.length}/30`} sub="parahs" />
      </div>

      {/* Streak calendar */}
      <section className="card p-5">
        <StreakCalendar days={activity} />
      </section>

      {/* Parah heatmap */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-bold tracking-tight">30-Parah heatmap</h3>
          <Link
            href="/hifz"
            className="text-xs text-[color:var(--teal)] hover:underline"
          >
            Open Hifz tracker →
          </Link>
        </div>
        <ParahHeatmap data={heatmap} />
      </section>

      {/* Difficulty pie + weak list */}
      <section className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-bold tracking-tight mb-3">Difficulty breakdown</h3>
          <DifficultyPie
            small={difficultyCounts.small}
            medium={difficultyCounts.medium}
            large={difficultyCounts.large}
          />
        </div>
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-bold tracking-tight">Your weak mutashabihat</h3>
            <span className="text-xs text-[color:var(--ink-muted)]">
              {bookmarks.length} bookmarked
            </span>
          </div>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-[color:var(--ink-muted)] py-6 text-center">
              Bookmark a mutashabihat pair from Explorer or get a wrong answer in Self-Test to see it here.
            </p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {bookmarks
                .sort((a, b) => b.similarCount - a.similarCount)
                .slice(0, 12)
                .map((b) => (
                  <li
                    key={b.key}
                    className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-[color:var(--line)]/30"
                  >
                    <div>
                      <span className="font-semibold text-sm text-[color:var(--teal)]">{b.key}</span>
                      {b.similarCount > 0 && (
                        <span className={`ml-2 badge badge-${b.difficulty === 'unknown' ? 'small' : b.difficulty}`}>
                          {b.similarCount} similar
                        </span>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      {/* AI Insight */}
      <section className="card p-5 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold tracking-tight">✨ AI insight</h3>
          <button
            onClick={generateInsight}
            disabled={insightLoading || bookmarks.length === 0}
            className="text-xs px-3 py-1.5 rounded-full bg-violet-600 text-white font-semibold hover:bg-violet-700 transition disabled:opacity-50"
          >
            {insightLoading
              ? 'Analysing…'
              : insight
                ? '↻ Regenerate'
                : 'Analyse my weak pairs'}
          </button>
        </div>

        {insightError && (
          <p className="text-xs text-red-700 dark:text-red-300 py-2">{insightError}</p>
        )}

        {!insight && !insightLoading && !insightError && (
          <p className="text-sm text-[color:var(--ink-muted)] py-2">
            Click <em>Analyse my weak pairs</em> and Gemini will look at the verses you keep
            confusing and find one specific pattern to focus on.
          </p>
        )}

        {insight && !insightLoading && (
          <div className="space-y-3">
            <InsightSection title="Pattern" body={insight.pattern} />
            <InsightSection title="Focus on" body={insight.focusArea} accent />
            <InsightSection title="Try this" body={insight.practicalTip} />
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--ink-muted)] font-semibold">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-[color:var(--ink-muted)] mt-0.5">{sub}</div>
    </div>
  );
}

function InsightSection({ title, body, accent }: { title: string; body: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
        accent ? 'text-fuchsia-700 dark:text-fuchsia-300' : 'text-violet-600/80 dark:text-violet-400/80'
      }`}>
        {title}
      </p>
      <p className={`text-sm leading-6 text-[color:var(--ink)] ${accent ? 'font-medium' : ''}`}>
        {body}
      </p>
    </div>
  );
}
