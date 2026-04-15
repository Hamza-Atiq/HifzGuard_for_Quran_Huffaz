'use client';

interface Props {
  value: number;
  onChange: (parah: number) => void;
}

export default function ParahSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 30 }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-11 h-11 rounded-xl text-sm font-semibold transition ${
            value === p
              ? 'bg-[color:var(--teal)] text-white shadow-md scale-105'
              : 'bg-[color:var(--bg-card)] border border-[color:var(--line)] text-[color:var(--ink)] hover:border-[color:var(--teal)] hover:text-[color:var(--teal)]'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
