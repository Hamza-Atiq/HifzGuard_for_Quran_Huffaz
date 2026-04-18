'use client';
import { useEffect, useState, useCallback } from 'react';
import MushafWord from './MushafWord';
import { getMutashabihatMap, classifyDifficulty } from '@/lib/mutashabihat';
import { SURAH_NAMES } from '@/lib/constants';
import type { MutashabihEntry, Difficulty } from '@/types';

interface PageWord {
  id: number;
  position: number;
  lineNumber: number;
  pageNumber: number;
  charType: string;
  codeV1: string;
  textUthmani: string;
  verseKey: string;
}

interface PageVerse {
  verseKey: string;
  verseNumber: number;
}

interface Props {
  pageNumber: number;
  onSelectSimilar: (sourceKey: string, similarKey: string) => void;
}

const QCF_CDN = 'https://static.qurancdn.com/fonts/quran/hafs/v1/woff2';

function loadQcfFont(page: number) {
  const id = `qcf-v1-p${page}`;
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @font-face {
      font-family: 'QCFv1p${page}';
      src: url('${QCF_CDN}/p${page}.woff2') format('woff2');
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}

export default function MushafPage({ pageNumber, onSelectSimilar }: Props) {
  const [words, setWords] = useState<PageWord[]>([]);
  const [verses, setVerses] = useState<PageVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mutMap = getMutashabihatMap();

  useEffect(() => {
    setLoading(true);
    setError(null);

    loadQcfFont(pageNumber);
    if (pageNumber > 1) loadQcfFont(pageNumber - 1);
    if (pageNumber < 604) loadQcfFont(pageNumber + 1);

    fetch(`/api/quran/page?page=${pageNumber}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWords(data.words);
        setVerses(data.verses);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pageNumber]);

  // Group words by line
  const lineMap = new Map<number, PageWord[]>();
  for (const w of words) {
    const arr = lineMap.get(w.lineNumber) || [];
    arr.push(w);
    lineMap.set(w.lineNumber, arr);
  }
  const lineNumbers = [...lineMap.keys()].sort((a, b) => a - b);

  // Detect surah headers
  const surahStarts = new Map<number, string>();
  const seenSurahs = new Set<string>();
  for (const w of words) {
    if (w.charType === 'word' && w.position === 1) {
      const [surahStr, ayahStr] = w.verseKey.split(':');
      const surah = parseInt(surahStr, 10);
      const ayah = parseInt(ayahStr, 10);
      if (ayah === 1 && !seenSurahs.has(surahStr)) {
        seenSurahs.add(surahStr);
        if (!(pageNumber === 1 && surah === 1)) {
          const firstWord = words.find(
            (ww) => ww.verseKey === w.verseKey && ww.position === 1
          );
          if (firstWord) {
            surahStarts.set(
              firstWord.lineNumber,
              `${SURAH_NAMES[surah - 1]?.ar || ''} - ${SURAH_NAMES[surah - 1]?.en || `Surah ${surah}`}`
            );
          }
        }
      }
    }
  }

  const verseMut = useCallback(
    (verseKey: string): { entry: MutashabihEntry | null; difficulty: Difficulty | null } => {
      const entry = mutMap.get(verseKey) || null;
      if (!entry) return { entry: null, difficulty: null };
      return { entry, difficulty: classifyDifficulty(entry.similar.length) };
    },
    [mutMap]
  );

  const fontFamily = `'QCFv1p${pageNumber}', sans-serif`;

  if (loading) {
    return (
      <div className="mushaf-page-frame">
        <div className="text-center py-24 text-[color:var(--ink-muted)] text-sm">
          Loading page {pageNumber}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mushaf-page-frame">
        <div className="text-center py-24 text-red-500 text-sm">
          Failed to load page: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mushaf-page-frame">
      <div className="text-center mb-3 text-xs text-[color:var(--ink-muted)] font-medium">
        Page {pageNumber} of 604
      </div>

      <div className="space-y-0">
        {lineNumbers.map((lineNum) => {
          const lineWords = lineMap.get(lineNum) || [];
          const surahHeader = surahStarts.get(lineNum);

          return (
            <div key={lineNum}>
              {surahHeader && (
                <div className="mushaf-surah-header my-2">{surahHeader}</div>
              )}
              <div className="mushaf-line">
                {lineWords.map((w) => {
                  const { entry, difficulty } = verseMut(w.verseKey);
                  return (
                    <MushafWord
                      key={`${w.verseKey}-${w.position}`}
                      code={w.codeV1}
                      fontFamily={fontFamily}
                      verseKey={w.verseKey}
                      mutEntry={entry}
                      difficulty={difficulty}
                      onSelectSimilar={onSelectSimilar}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Verse badges at bottom */}
      <div className="mt-4 pt-3 border-t border-[color:var(--line)]">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {verses.map((v) => {
            const { difficulty } = verseMut(v.verseKey);
            return (
              <span
                key={v.verseKey}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  difficulty
                    ? `badge-${difficulty}`
                    : 'bg-[color:var(--line)] text-[color:var(--ink-muted)]'
                }`}
              >
                {v.verseKey}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
