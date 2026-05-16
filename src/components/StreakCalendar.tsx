'use client';
import type { RawActivityDay } from '@/lib/hifz-plan';

interface Props {
  days: RawActivityDay[];
  /** Number of past days to display (default 91 = ~13 weeks). */
  windowDays?: number;
}

/**
 * GitHub-style contribution grid showing daily revision activity.
 * Each square = one day, colored by how many verses were touched.
 */
export default function StreakCalendar({ days, windowDays = 91 }: Props) {
  const today = startOfDay(new Date());
  const start = new Date(today.getTime() - (windowDays - 1) * 86_400_000);

  // Build a map of YYYY-MM-DD → count
  const counts = new Map<string, number>();
  for (const d of days) {
    if (!d.date) continue;
    const k = d.date.slice(0, 10);
    counts.set(k, (counts.get(k) ?? 0) + (d.ranges?.length ?? 1));
  }

  // Pad to start on a Sunday for clean grid columns
  const startDow = start.getDay();
  const totalCells = startDow + windowDays;
  const cells: { date: Date | null; iso: string; count: number }[] = [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ date: null, iso: '', count: 0 });
  }
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const iso = isoDate(d);
    cells.push({ date: d, iso, count: counts.get(iso) ?? 0 });
  }

  const cols = Math.ceil(totalCells / 7);
  // Reorganise into column-major (each column = a week)
  const grid: typeof cells[number][][] = [];
  for (let c = 0; c < cols; c++) {
    grid.push(cells.slice(c * 7, c * 7 + 7));
  }

  const activeDays = cells.filter((c) => c.count > 0).length;
  const totalVerses = cells.reduce((s, c) => s + c.count, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold tracking-tight">Activity (last {windowDays} days)</h3>
        <span className="text-xs text-[color:var(--ink-muted)]">
          {activeDays} active day{activeDays === 1 ? '' : 's'} · {totalVerses} verses
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {grid.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell, ri) =>
              cell.date ? (
                <div
                  key={ri}
                  title={`${cell.iso} · ${cell.count} verse${cell.count === 1 ? '' : 's'}`}
                  className={`w-3 h-3 rounded-sm ${levelClass(cell.count)}`}
                />
              ) : (
                <div key={ri} className="w-3 h-3" />
              ),
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-[color:var(--ink-muted)]">
        <span>Less</span>
        <span className={`w-3 h-3 rounded-sm ${levelClass(0)}`} />
        <span className={`w-3 h-3 rounded-sm ${levelClass(1)}`} />
        <span className={`w-3 h-3 rounded-sm ${levelClass(8)}`} />
        <span className={`w-3 h-3 rounded-sm ${levelClass(20)}`} />
        <span className={`w-3 h-3 rounded-sm ${levelClass(50)}`} />
        <span>More</span>
      </div>
    </div>
  );
}

function levelClass(count: number): string {
  if (count === 0) return 'bg-slate-200 dark:bg-slate-800';
  if (count <= 3) return 'bg-emerald-200 dark:bg-emerald-900';
  if (count <= 10) return 'bg-emerald-400 dark:bg-emerald-700';
  if (count <= 25) return 'bg-emerald-500 dark:bg-emerald-500';
  return 'bg-emerald-600 dark:bg-emerald-400';
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
