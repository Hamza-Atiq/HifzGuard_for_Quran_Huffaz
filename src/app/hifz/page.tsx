'use client';
import { useEffect, useMemo, useState } from 'react';
import ParahHeatmap from '@/components/ParahHeatmap';
import DailyPlanCards from '@/components/DailyPlanCards';
import { useMemorizedParahs } from '@/lib/use-memorized-parahs';
import {
  buildDailyPlan,
  computeHeatmap,
  type RawActivityDay,
} from '@/lib/hifz-plan';
import { getStats } from '@/lib/mutashabihat';

type Mode = 'plan' | 'mark-memorized' | 'pick-sabaq';

export default function HifzPage() {
  const { memorized, memorizedList, currentlyLearning, toggle, setSabaq, loaded } =
    useMemorizedParahs();
  const [activity, setActivity] = useState<RawActivityDay[]>([]);
  const [mode, setMode] = useState<Mode>('plan');

  // Fetch activity history once on load
  useEffect(() => {
    fetch('/api/user/activity', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setActivity(Array.isArray(j.days) ? j.days : []))
      .catch(() => setActivity([]));
  }, []);

  const heatmap = useMemo(
    () => computeHeatmap(memorizedList, activity),
    [memorizedList, activity],
  );

  const plan = useMemo(
    () => buildDailyPlan(memorizedList, currentlyLearning, activity),
    [memorizedList, currentlyLearning, activity],
  );

  const stats = useMemo(() => {
    const totalMuts = getStats().perParah.reduce((a, b) => a + b, 0);
    const memorizedMuts = memorizedList.reduce(
      (sum, p) => sum + (getStats().perParah[p - 1] ?? 0),
      0,
    );
    return { totalMuts, memorizedMuts };
  }, [memorizedList]);

  const handleGridClick = (parah: number) => {
    if (mode === 'mark-memorized') toggle(parah);
    else if (mode === 'pick-sabaq') {
      setSabaq(parah === currentlyLearning ? null : parah);
      setMode('plan');
    }
  };

  if (!loaded) {
    return <div className="max-w-6xl mx-auto px-5 py-10 text-[color:var(--ink-muted)]">Loading…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 sm:py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Hifz Tracker</h1>
        <p className="mt-2 text-[color:var(--ink-muted)]">
          Traditional three-tier revision — Sabaq, Sabqi, Manzil — planned automatically based on
          what you've memorized and how recently you've revised it.
        </p>
      </header>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <Chip label="Memorized" value={`${memorizedList.length}/30 parahs`} accent="teal" />
        <Chip
          label="Currently learning"
          value={currentlyLearning ? `Parah ${currentlyLearning}` : '—'}
          accent="amber"
        />
        <Chip
          label="Mutashabihat covered"
          value={`${stats.memorizedMuts}/${stats.totalMuts}`}
          accent="violet"
        />
      </div>

      {/* Today's plan */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold tracking-tight">Today's plan</h2>
          <span className="text-xs text-[color:var(--ink-muted)]">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <DailyPlanCards
          plan={plan}
          onSetSabaq={() => setMode('pick-sabaq')}
        />
      </section>

      {/* Heatmap + controls */}
      <section>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h2 className="text-xl font-bold tracking-tight">30-Parah heatmap</h2>
          <div className="flex items-center gap-2">
            <ModeButton
              active={mode === 'plan'}
              onClick={() => setMode('plan')}
              label="View"
            />
            <ModeButton
              active={mode === 'mark-memorized'}
              onClick={() => setMode('mark-memorized')}
              label="Mark memorized"
            />
            <ModeButton
              active={mode === 'pick-sabaq'}
              onClick={() => setMode('pick-sabaq')}
              label="Pick sabaq"
            />
          </div>
        </div>

        {mode !== 'plan' && (
          <div className="mb-3 px-4 py-2 rounded-xl bg-[color:var(--teal)]/10 border border-[color:var(--teal)]/30 text-sm">
            {mode === 'mark-memorized'
              ? 'Tap a parah to toggle whether you have memorized it.'
              : 'Tap the parah you are currently working on memorizing (sabaq).'}
          </div>
        )}

        <ParahHeatmap
          data={heatmap}
          onClick={handleGridClick}
          selectedParah={currentlyLearning}
        />
      </section>

      <div className="text-xs text-[color:var(--ink-muted)] leading-relaxed pt-2 border-t border-[color:var(--line)]">
        <p>
          <strong>How priority works:</strong> Manzil rotation favours parahs with the most
          mutashabihat that you haven't revised recently — the ones most likely to be confused if
          left untouched. Sabqi shows your two most-recent memorized parahs that have aged at all.
        </p>
        <p className="mt-2">
          Activity data syncs with your Quran.com account when signed in. Marking parahs memorized
          and picking your sabaq are stored locally until cloud sync is enabled.
        </p>
      </div>
    </div>
  );
}

function Chip({ label, value, accent }: { label: string; value: string; accent: 'teal' | 'amber' | 'violet' }) {
  const colors: Record<'teal' | 'amber' | 'violet', string> = {
    teal: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    amber: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    violet: 'bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
  };
  return (
    <div className={`px-4 py-2 rounded-2xl ${colors[accent]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">{label}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition ${
        active
          ? 'bg-[color:var(--teal)] text-white'
          : 'border border-[color:var(--line)] hover:border-[color:var(--teal)] hover:text-[color:var(--teal)]'
      }`}
    >
      {label}
    </button>
  );
}
