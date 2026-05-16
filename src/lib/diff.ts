import type { Word, DiffWord } from '@/types';

/**
 * Strip Arabic diacritics (tashkeel) and tatweel for stable word comparison.
 * The user still SEES the verses with tashkeel — we only normalize for matching.
 */
const TASHKEEL_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
export function normalize(word: string): string {
  return word
    .replace(TASHKEEL_RE, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627') // alif variants → bare alif
    .replace(/\u0629/g, '\u0647')               // ta marbuta → ha
    .replace(/\u0649/g, '\u064A')               // alif maqsura → ya
    .trim();
}

/**
 * Word-level diff between two verses using longest-common-subsequence alignment.
 * Returns parallel arrays the same length as input — words at the same visual
 * position are aligned so the UI can render side-by-side cleanly.
 */
export function diffVerses(
  a: Word[],
  b: Word[]
): { left: DiffWord[]; right: DiffWord[] } {
  const n = a.length;
  const m = b.length;

  // LCS DP
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (normalize(a[i - 1].text) === normalize(b[j - 1].text)) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build aligned arrays
  const left: DiffWord[] = [];
  const right: DiffWord[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (normalize(a[i - 1].text) === normalize(b[j - 1].text)) {
      left.unshift({ text: a[i - 1].text, status: 'same', position: i });
      right.unshift({ text: b[j - 1].text, status: 'same', position: j });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      left.unshift({ text: a[i - 1].text, status: 'diff', position: i });
      i--;
    } else {
      right.unshift({ text: b[j - 1].text, status: 'diff', position: j });
      j--;
    }
  }
  while (i > 0) {
    left.unshift({ text: a[i - 1].text, status: 'extra', position: i });
    i--;
  }
  while (j > 0) {
    right.unshift({ text: b[j - 1].text, status: 'extra', position: j });
    j--;
  }
  return { left, right };
}

/** Count of identical opening words — used for difficulty heuristic. */
export function sharedOpeningWords(a: Word[], b: Word[]): number {
  let n = 0;
  while (n < a.length && n < b.length && normalize(a[n].text) === normalize(b[n].text)) {
    n++;
  }
  return n;
}
