'use client';
import type { Verse } from '@/types';

interface Props {
  verse: Verse;
  size?: 'sm' | 'md' | 'lg';
  showTranslation?: boolean;
  showHeader?: boolean;
}

const sizeClass = {
  sm: 'arabic-sm',
  md: 'arabic-md',
  lg: 'arabic',
};

export default function AyahDisplay({
  verse,
  size = 'lg',
  showTranslation = true,
  showHeader = true,
}: Props) {
  return (
    <div className="fade-up">
      {showHeader && (
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="font-semibold text-[color:var(--teal)]">
            {verse.surahName}{' '}
            <span className="font-normal text-[color:var(--ink-muted)]">· {verse.key}</span>
          </span>
          {verse.surahNameArabic && (
            <span className="arabic-sm" style={{ fontSize: 20, lineHeight: 1.6 }}>
              {verse.surahNameArabic}
            </span>
          )}
        </div>
      )}

      <p className={sizeClass[size]}>
        {verse.textUthmani}
        <span className="ayah-mark mx-2 align-middle">{toArabicNumeral(verse.ayah)}</span>
      </p>

      {showTranslation && verse.translation && (
        <p className="mt-4 text-[15px] leading-7 text-[color:var(--ink-muted)] border-l-2 border-[color:var(--teal)]/40 pl-3">
          {verse.translation}
        </p>
      )}
    </div>
  );
}

function toArabicNumeral(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}
