import { getStats } from './mutashabihat';
import { PARAH_RANGES, surahAyahToAbsolute, absoluteToSurahAyah } from './constants';

export type HeatmapStatus = 'fresh' | 'aging' | 'overdue' | 'never' | 'not-memorized';

export interface ParahStatus {
  parah: number;
  status: HeatmapStatus;
  daysSinceRevision: number | null;
  mutashabihatCount: number;
  isMemorized: boolean;
}

export interface DailyPlan {
  sabaq: { parah: number; reason: string } | null;
  sabqi: { parah: number; daysAgo: number | null; reason: string }[];
  manzil: { parah: number; daysAgo: number | null; reason: string } | null;
}

/** Activity-day records as they come back from /api/user/activity. */
export interface RawActivityDay {
  date?: string; // YYYY-MM-DD
  ranges?: string[]; // ["2:5", "2:6", ...]
}

const FRESH_DAYS = 3;
const AGING_DAYS = 14;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * For each verse key in an activity day's `ranges`, work out which parah it
 * belongs to and record the activity date for that parah. Returns a map of
 * parah → most-recent ISO date.
 */
export function lastRevisedByParah(days: RawActivityDay[]): Map<number, string> {
  const result = new Map<number, string>();
  for (const d of days) {
    if (!d.date || !Array.isArray(d.ranges)) continue;
    const seenParahs = new Set<number>();
    for (const key of d.ranges) {
      const [s, a] = key.split(':').map(Number);
      if (!s || !a) continue;
      const abs = surahAyahToAbsolute(s, a);
      const parah = parahForAbsolute(abs);
      if (parah) seenParahs.add(parah);
    }
    for (const p of seenParahs) {
      const prev = result.get(p);
      if (!prev || d.date > prev) result.set(p, d.date);
    }
  }
  return result;
}

function parahForAbsolute(abs: number): number | null {
  for (let i = 0; i < PARAH_RANGES.length; i++) {
    const r = PARAH_RANGES[i];
    const start = surahAyahToAbsolute(r.start[0], r.start[1]);
    const end = surahAyahToAbsolute(r.end[0], r.end[1]);
    if (abs >= start && abs <= end) return i + 1;
  }
  return null;
}

export function computeHeatmap(
  memorizedParahs: number[],
  activityDays: RawActivityDay[],
  today: Date = new Date(),
): ParahStatus[] {
  const memorized = new Set(memorizedParahs);
  const lastByParah = lastRevisedByParah(activityDays);
  const stats = getStats();

  return Array.from({ length: 30 }, (_, i) => {
    const parah = i + 1;
    const isMemorized = memorized.has(parah);
    const lastDate = lastByParah.get(parah);
    const days = lastDate ? daysBetween(today, new Date(lastDate)) : null;

    let status: HeatmapStatus;
    if (!isMemorized) status = 'not-memorized';
    else if (days === null) status = 'never';
    else if (days <= FRESH_DAYS) status = 'fresh';
    else if (days <= AGING_DAYS) status = 'aging';
    else status = 'overdue';

    return {
      parah,
      status,
      daysSinceRevision: days,
      mutashabihatCount: stats.perParah[i] ?? 0,
      isMemorized,
    };
  });
}

/**
 * Build today's Sabaq / Sabqi / Manzil plan.
 *
 * - **Sabaq** (new): the parah the user marked as currently-learning.
 * - **Sabqi** (recent): up to 2 most-recently-completed parahs that haven't been
 *   revised in the last 24h.
 * - **Manzil** (rotating): one parah from the memorized set, prioritised by
 *   mutashabihat density × days-since-revision (so the parahs with the most
 *   confusables AND the longest gap come up first).
 */
export function buildDailyPlan(
  memorizedParahs: number[],
  currentlyLearning: number | null,
  activityDays: RawActivityDay[],
  today: Date = new Date(),
): DailyPlan {
  const heatmap = computeHeatmap(memorizedParahs, activityDays, today);
  const byParah = new Map(heatmap.map((h) => [h.parah, h]));

  // Sabaq — whatever the user is currently learning
  const sabaq = currentlyLearning
    ? {
        parah: currentlyLearning,
        reason: 'Your current lesson (sabaq) — work through this parah today.',
      }
    : null;

  // Sabqi — most recently revised memorized parahs that need touching again
  const sabqi = heatmap
    .filter((h) => h.isMemorized && h.status !== 'fresh' && h.parah !== currentlyLearning)
    .sort((a, b) => {
      const ad = a.daysSinceRevision ?? Infinity;
      const bd = b.daysSinceRevision ?? Infinity;
      return ad - bd; // most-recently-revised first
    })
    .slice(0, 2)
    .map((h) => ({
      parah: h.parah,
      daysAgo: h.daysSinceRevision,
      reason:
        h.daysSinceRevision === null
          ? 'Never logged — start your sabqi rotation here.'
          : `Last revised ${h.daysSinceRevision} day${h.daysSinceRevision === 1 ? '' : 's'} ago.`,
    }));

  // Manzil — pick the overdue/aging parah with the most mutashabihat
  // (weighted: density × max(days, 1))
  const manzilCandidates = heatmap
    .filter(
      (h) =>
        h.isMemorized &&
        h.parah !== currentlyLearning &&
        !sabqi.some((s) => s.parah === h.parah),
    )
    .map((h) => ({
      h,
      priority:
        (h.mutashabihatCount + 1) * Math.max(h.daysSinceRevision ?? 30, 1),
    }))
    .sort((a, b) => b.priority - a.priority);

  const manzil = manzilCandidates[0]
    ? {
        parah: manzilCandidates[0].h.parah,
        daysAgo: manzilCandidates[0].h.daysSinceRevision,
        reason:
          manzilCandidates[0].h.mutashabihatCount > 30
            ? `${manzilCandidates[0].h.mutashabihatCount} mutashabihat in this parah — high priority for rotation.`
            : manzilCandidates[0].h.daysSinceRevision === null
              ? 'Long-term rotation slot — no recent revision logged.'
              : `${manzilCandidates[0].h.daysSinceRevision} day${manzilCandidates[0].h.daysSinceRevision === 1 ? '' : 's'} since last revision.`,
      }
    : null;

  return { sabaq, sabqi, manzil };
}

export function statusColor(status: HeatmapStatus): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case 'fresh':
      return {
        bg: 'bg-emerald-500',
        text: 'text-white',
        border: 'border-emerald-600',
        label: 'Revised recently',
      };
    case 'aging':
      return {
        bg: 'bg-amber-400',
        text: 'text-amber-950',
        border: 'border-amber-500',
        label: 'Due for revision',
      };
    case 'overdue':
      return {
        bg: 'bg-red-500',
        text: 'text-white',
        border: 'border-red-600',
        label: 'Overdue',
      };
    case 'never':
      return {
        bg: 'bg-slate-300 dark:bg-slate-700',
        text: 'text-slate-800 dark:text-slate-200',
        border: 'border-slate-400 dark:border-slate-600',
        label: 'Memorized · not yet logged',
      };
    case 'not-memorized':
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-900',
        text: 'text-slate-400 dark:text-slate-600',
        border: 'border-slate-200 dark:border-slate-800',
        label: 'Not memorized yet',
      };
  }
}

/** Bonus: starting verse key for any parah, used for "Open in Revision" links. */
export function startKeyForParah(parah: number): string {
  const r = PARAH_RANGES[parah - 1];
  const { surah, ayah } = absoluteToSurahAyah(surahAyahToAbsolute(r.start[0], r.start[1]));
  return `${surah}:${ayah}`;
}
