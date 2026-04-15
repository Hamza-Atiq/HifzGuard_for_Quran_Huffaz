'use client';
import { SURAH_NAMES } from '@/lib/constants';

interface Props {
  value: number;
  onChange: (surah: number) => void;
}

export default function SurahSelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="w-full px-4 py-2.5 rounded-xl bg-[color:var(--bg-card)] border border-[color:var(--line)] text-sm font-medium focus:outline-none focus:border-[color:var(--teal)]"
    >
      {SURAH_NAMES.map((s, i) => (
        <option key={i} value={i + 1}>
          {i + 1}. {s.en}
        </option>
      ))}
    </select>
  );
}
