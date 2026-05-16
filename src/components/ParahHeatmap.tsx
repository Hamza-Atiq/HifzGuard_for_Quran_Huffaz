'use client';
import type { ParahStatus } from '@/lib/hifz-plan';
import { statusColor } from '@/lib/hifz-plan';

interface Props {
  data: ParahStatus[];
  onClick?: (parah: number) => void;
  selectedParah?: number | null;
}

export default function ParahHeatmap({ data, onClick, selectedParah }: Props) {
  return (
    <div>
      <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
        {data.map((p) => {
          const c = statusColor(p.status);
          const isSelected = selectedParah === p.parah;
          return (
            <button
              key={p.parah}
              type="button"
              onClick={() => onClick?.(p.parah)}
              title={
                `Parah ${p.parah} · ${c.label}` +
                (p.daysSinceRevision !== null ? ` · ${p.daysSinceRevision}d ago` : '') +
                ` · ${p.mutashabihatCount} mutashabihat`
              }
              className={`aspect-square rounded-lg ${c.bg} ${c.text} ${c.border} border-2 transition relative flex flex-col items-center justify-center font-semibold text-xs sm:text-sm ${
                onClick ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
              } ${isSelected ? 'ring-2 ring-offset-2 ring-[color:var(--teal)]' : ''}`}
            >
              <span>{p.parah}</span>
              {p.mutashabihatCount > 30 && (
                <span className="absolute top-0.5 right-0.5 text-[8px] opacity-80">!</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--ink-muted)]">
        <LegendDot bg="bg-emerald-500" label="Revised recently" />
        <LegendDot bg="bg-amber-400" label="Due" />
        <LegendDot bg="bg-red-500" label="Overdue" />
        <LegendDot bg="bg-slate-300 dark:bg-slate-700" label="Memorized · no log" />
        <LegendDot bg="bg-slate-100 dark:bg-slate-900 border border-slate-300" label="Not memorized" />
      </div>
    </div>
  );
}

function LegendDot({ bg, label }: { bg: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm ${bg}`} />
      <span>{label}</span>
    </span>
  );
}
