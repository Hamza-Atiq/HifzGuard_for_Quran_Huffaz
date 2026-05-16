'use client';

interface Props {
  small: number;
  medium: number;
  large: number;
}

const COLORS = {
  small: '#10b981', // emerald-500
  medium: '#f59e0b', // amber-500
  large: '#ef4444', // red-500
};

export default function DifficultyPie({ small, medium, large }: Props) {
  const total = small + medium + large;
  if (total === 0) {
    return (
      <div className="text-sm text-[color:var(--ink-muted)] text-center py-6">
        No weak mutashabihat yet — bookmark some pairs or run a self-test to see this chart.
      </div>
    );
  }

  // Build pie via stroke-dasharray on circles
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = (
    [
      ['small', small, COLORS.small],
      ['medium', medium, COLORS.medium],
      ['large', large, COLORS.large],
    ] as const
  )
    .filter(([, v]) => v > 0)
    .map(([label, value, color]) => {
      const frac = value / total;
      const len = frac * circumference;
      const segOffset = offset;
      offset += len;
      return { label, value, color, len, offset: segOffset, frac };
    });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 160 160" className="w-32 h-32 -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth="20"
        />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth="20"
            strokeDasharray={`${s.len} ${circumference - s.len}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
          />
        ))}
        <text
          x="80"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          transform="rotate(90 80 80)"
          className="text-2xl font-bold fill-[color:var(--ink)]"
        >
          {total}
        </text>
      </svg>

      <ul className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="capitalize font-semibold">{s.label}</span>
            <span className="text-[color:var(--ink-muted)] text-xs">
              {s.value} · {Math.round(s.frac * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
