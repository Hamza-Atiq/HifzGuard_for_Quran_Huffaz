import { normalize } from './diff';

/**
 * Word-level matcher for live Quran recitation.
 *
 * Tarteel's own approach (per NVIDIA case study) is text-based fuzzy
 * matching of ASR transcripts, NOT acoustic alignment. We do the same:
 * normalize both sides (strip tashkeel etc), align via LCS, and surface
 * the first divergent position.
 */

export interface DivergenceResult {
  /** Index in the EXPECTED words array where the user first diverged. */
  divergenceIndex: number | null;
  /** How many words from the expected verse the user has correctly recited. */
  matchedCount: number;
  /** Whether the transcript appears to fully cover the expected verse. */
  completed: boolean;
}

/**
 * Walk through the expected verse word-by-word, looking for each word in
 * the transcript in-order. Returns the first expected-word index where the
 * transcript fails to find a match within a small lookahead window.
 *
 * The lookahead tolerates ASR mishearings — a single missed/garbled word
 * doesn't end the match.
 */
export function findDivergence(
  transcript: string,
  expected: string,
  opts: { lookahead?: number; tolerateMisses?: number } = {},
): DivergenceResult {
  const lookahead = opts.lookahead ?? 4;
  const tolerateMisses = opts.tolerateMisses ?? 1;

  const t = tokenize(transcript);
  const e = tokenize(expected);

  let ti = 0;
  let matched = 0;
  let consecutiveMisses = 0;

  for (let ei = 0; ei < e.length; ei++) {
    // Search forward in transcript for this expected word
    let hitAt = -1;
    for (let k = 0; k < lookahead && ti + k < t.length; k++) {
      if (t[ti + k] === e[ei]) {
        hitAt = ti + k;
        break;
      }
    }
    if (hitAt >= 0) {
      ti = hitAt + 1;
      matched++;
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
      if (consecutiveMisses > tolerateMisses) {
        return { divergenceIndex: ei, matchedCount: matched, completed: false };
      }
    }
  }

  return {
    divergenceIndex: null,
    matchedCount: matched,
    completed: matched >= e.length - tolerateMisses,
  };
}

/**
 * Score how well a transcript matches a candidate verse text.
 * Returns a fraction in [0, 1] — higher = better fit.
 */
export function scoreMatch(transcript: string, candidate: string): number {
  const t = tokenize(transcript);
  const c = tokenize(candidate);
  if (c.length === 0) return 0;

  // Sliding LCS-like coverage: how many candidate words appear in transcript
  // in order, with a small lookahead window.
  let ti = 0;
  let matched = 0;
  for (const word of c) {
    for (let k = 0; k < 4 && ti + k < t.length; k++) {
      if (t[ti + k] === word) {
        ti = ti + k + 1;
        matched++;
        break;
      }
    }
  }
  return matched / c.length;
}

/**
 * Given a partial transcript and the verse the user is supposed to be reciting,
 * plus a list of candidate mutashabihat verses they could have drifted into,
 * decide if the transcript actually matches one of the alternates BETTER than
 * the expected verse — i.e. the user mixed up similar verses (the canonical
 * mutashabih mistake).
 *
 * Returns the key of the drift target, or null.
 */
export function detectDrift(
  transcript: string,
  expectedKey: string,
  expected: string,
  candidates: Array<{ key: string; text: string }>,
  opts: { minLead?: number; minScore?: number } = {},
): { driftKey: string; expectedScore: number; driftScore: number } | null {
  const minLead = opts.minLead ?? 0.15; // candidate must beat expected by this margin
  const minScore = opts.minScore ?? 0.5; // and clear this absolute floor

  const expectedScore = scoreMatch(transcript, expected);
  let best: { key: string; score: number } | null = null;
  for (const c of candidates) {
    if (c.key === expectedKey) continue;
    const s = scoreMatch(transcript, c.text);
    if (!best || s > best.score) best = { key: c.key, score: s };
  }

  if (
    best &&
    best.score >= minScore &&
    best.score - expectedScore >= minLead
  ) {
    return { driftKey: best.key, expectedScore, driftScore: best.score };
  }
  return null;
}

/** Split a string into normalised Arabic word tokens for matching. */
export function tokenize(s: string): string[] {
  return s
    .split(/\s+/)
    .map((w) => normalize(w))
    .filter((w) => w.length > 0);
}
