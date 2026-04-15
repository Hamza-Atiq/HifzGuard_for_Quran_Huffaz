'use client';
import { useEffect, useMemo, useState } from 'react';
import ParahSelector from '@/components/ParahSelector';
import SurahSelector from '@/components/SurahSelector';
import MutashabihatCard from '@/components/MutashabihatCard';
import type { MutashabihEntry, Difficulty } from '@/types';

type Mode = 'parah' | 'surah';
type Filter = 'all' | Difficulty;

export default function ExplorerPage() {
  const [mode, setMode] = useState<Mode>('parah');
  const [parah, setParah] = useState(1);
  const [surah, setSurah] = useState(2);
  const [filter, setFilter] = useState<Filter>('all');
  const [entries, setEntries] = useState<(MutashabihEntry & { difficulty: Difficulty })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const param = mode === 'parah' ? `parah=${parah}` : `surah=${surah}`;
    fetch(`/api/mutashabihat?${param}`)
      .then((r) => r.json())
      .then((j) => setEntries(j.entries || []))
      .finally(() => setLoading(false));
  }, [mode, parah, surah]);

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.difficulty === filter)),
    [entries, filter]
  );

  const counts = useMemo(() => {
    const c = { small: 0, medium: 0, large: 0 };
    for (const e of entries) c[e.difficulty]++;
    return c;
  }, [entries]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mutashabihat Explorer</h1>
        <p className="mt-2 text-[color:var(--ink-muted)]">
          Browse every verse with similar siblings elsewhere in the Quran. Tap a card to compare them.
        </p>
      </header>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setMode('parah')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              mode === 'parah'
                ? 'bg-[color:var(--teal)] text-white'
                : 'border border-[color:var(--line)] hover:border-[color:var(--teal)]'
            }`}
          >
            By Parah
          </button>
          <button
            onClick={() => setMode('surah')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              mode === 'surah'
                ? 'bg-[color:var(--teal)] text-white'
                : 'border border-[color:var(--line)] hover:border-[color:var(--teal)]'
            }`}
          >
            By Surah
          </button>
        </div>

        {mode === 'parah' ? (
          <ParahSelector value={parah} onChange={setParah} />
        ) : (
          <SurahSelector value={surah} onChange={setSurah} />
        )}
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-sm text-[color:var(--ink-muted)] mr-2">Filter:</span>
        <FilterChip current={filter} value="all"    label={`All (${entries.length})`}     onClick={setFilter} />
        <FilterChip current={filter} value="small"  label={`Small (${counts.small})`}     onClick={setFilter} />
        <FilterChip current={filter} value="medium" label={`Medium (${counts.medium})`}   onClick={setFilter} />
        <FilterChip current={filter} value="large"  label={`Large (${counts.large})`}     onClick={setFilter} />
      </div>

      {loading && (
        <div className="text-center py-16 text-[color:var(--ink-muted)]">Loading mutashabihat…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card p-10 text-center text-[color:var(--ink-muted)]">
          No mutashabihat found for this selection.
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((entry, i) => (
          <MutashabihatCard key={`${entry.src.key}-${i}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  current,
  value,
  label,
  onClick,
}: {
  current: Filter;
  value: Filter;
  label: string;
  onClick: (v: Filter) => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
        active
          ? 'bg-[color:var(--teal)] text-white'
          : 'bg-[color:var(--bg-card)] border border-[color:var(--line)] text-[color:var(--ink-muted)] hover:text-[color:var(--teal)] hover:border-[color:var(--teal)]'
      }`}
    >
      {label}
    </button>
  );
}
