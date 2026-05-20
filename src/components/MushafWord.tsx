'use client';
import { useState, useRef, useEffect } from 'react';
import type { MutashabihEntry, Difficulty } from '@/types';
import { SURAH_NAMES } from '@/lib/constants';

interface Props {
  code: string;
  fontFamily: string;
  verseKey: string;
  mutEntry: MutashabihEntry | null;
  difficulty: Difficulty | null;
  onSelectSimilar: (sourceKey: string, similarKey: string) => void;
  onSelectAyah?: (verseKey: string) => void;
}

export default function MushafWord({
  code,
  fontFamily,
  verseKey,
  mutEntry,
  difficulty,
  onSelectSimilar,
  onSelectAyah,
}: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!showPopup) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopup]);

  const colorClass = difficulty ? `mushaf-mut-${difficulty}` : '';

  return (
    <span
      ref={ref}
      className={`mushaf-word ${colorClass}`}
      style={{ fontFamily }}
      onClick={() => {
        if (mutEntry) {
          setShowPopup((v) => !v);
        } else if (onSelectAyah) {
          // Non-mutashabih word: open the ayah panel directly
          onSelectAyah(verseKey);
        }
      }}
    >
      {code}
      {showPopup && mutEntry && (
        <div className="mushaf-popup" onClick={(e) => e.stopPropagation()}>
          <div
            className="text-xs font-semibold text-[color:var(--ink-muted)] mb-2"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {verseKey} — {mutEntry.similar.length} similar
          </div>
          <div className="space-y-1">
            {mutEntry.similar.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setShowPopup(false);
                  onSelectSimilar(verseKey, s.key);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[color:var(--teal-soft)] transition flex items-center justify-between"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span className="font-medium text-[color:var(--teal)]">{s.key}</span>
                <span className="text-xs text-[color:var(--ink-muted)]">
                  {SURAH_NAMES[s.surah - 1]?.en || `Surah ${s.surah}`}
                </span>
              </button>
            ))}
          </div>
          {/* Ayah actions divider */}
          {onSelectAyah && (
            <div className="mt-2 pt-2 border-t border-[color:var(--line)]">
              <button
                onClick={() => {
                  setShowPopup(false);
                  onSelectAyah(verseKey);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[color:var(--line)] transition text-[color:var(--ink-muted)]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                📝 Notes & Bookmark →
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
