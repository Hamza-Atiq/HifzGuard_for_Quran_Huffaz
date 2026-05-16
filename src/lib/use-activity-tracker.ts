'use client';
import { useEffect, useRef } from 'react';

interface Options {
  /** Verse keys touched so far in the session. */
  verseKeys: string[];
  /** Minimum verses before we log (avoid logging trivial visits). */
  minVerses?: number;
  /** Logical activity type (revision / reading / self_test). */
  activityType?: 'revision' | 'reading' | 'self_test';
  /** Debounce window in ms — only one POST per window even if keys change. */
  debounceMs?: number;
}

/**
 * Fire `POST /api/user/activity` once we've crossed `minVerses` and then
 * roughly every `debounceMs` after that with the cumulative range.
 *
 * Gracefully no-ops if the user isn't signed in or the activityday.crud
 * scope hasn't been granted yet by QF — the route returns 401/skipped.
 */
export function useActivityTracker({
  verseKeys,
  minVerses = 5,
  activityType = 'revision',
  debounceMs = 30_000,
}: Options) {
  const lastLogged = useRef<number>(0);

  useEffect(() => {
    if (verseKeys.length < minVerses) return;
    const now = Date.now();
    if (now - lastLogged.current < debounceMs) return;
    lastLogged.current = now;

    const date = new Date().toISOString().slice(0, 10);
    fetch('/api/user/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, ranges: verseKeys, activityType }),
    }).catch(() => {
      /* silent — activity logging is best-effort */
    });
  }, [verseKeys, minVerses, activityType, debounceMs]);
}
