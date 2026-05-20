'use client';
import { useEffect, useState, useCallback } from 'react';

function computeStreakFromDays(days: Array<{ date?: string }>): { current: number; longest: number } {
  // Pull out unique YYYY-MM-DD entries, sort ascending.
  const set = new Set<string>();
  for (const d of days) {
    if (d.date) set.add(d.date.slice(0, 10));
  }
  const sorted = [...set].sort();
  if (sorted.length === 0) return { current: 0, longest: 0 };

  // Longest streak = longest run of consecutive days anywhere in the list.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const gap = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (gap === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else if (gap > 1) {
      run = 1;
    }
  }

  // Current streak = consecutive days ending today OR yesterday (grace for
  // timezone slips). Walk back from the last entry.
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const last = sorted[sorted.length - 1];
  let current = 0;
  if (last === today || last === yesterday) {
    current = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const a = new Date(sorted[i]);
      const b = new Date(sorted[i + 1]);
      const gap = Math.round((b.getTime() - a.getTime()) / 86_400_000);
      if (gap === 1) current += 1;
      else break;
    }
  }
  return { current, longest };
}

export interface AuthState {
  authenticated: boolean | null; // null = loading
  current: number;
  longest: number;
  loading: boolean;
}

export function useAuth(): AuthState & {
  refresh: () => void;
  signIn: () => void;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    authenticated: null,
    current: 0,
    longest: 0,
    loading: true,
  });

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    // Two-track: try the streaks endpoint (in case QF returns a real streak),
    // AND compute one ourselves from activity-days. Whichever is higher wins.
    // This makes the chip robust against QF response-shape mismatches and
    // ensures the user sees their streak immediately after logging activity.
    Promise.all([
      fetch('/api/user/streaks', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/user/activity', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ]).then(([streaksRes, activityRes]) => {
      if (!streaksRes || streaksRes.authenticated === false) {
        setState({ authenticated: false, current: 0, longest: 0, loading: false });
        return;
      }
      const apiCurrent = streaksRes.streak?.current ?? 0;
      const apiLongest = streaksRes.streak?.longest ?? 0;
      const days: Array<{ date?: string }> = activityRes?.days ?? [];
      const computed = computeStreakFromDays(days);
      setState({
        authenticated: true,
        current: Math.max(apiCurrent, computed.current),
        longest: Math.max(apiLongest, computed.longest, computed.current),
        loading: false,
      });
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(() => {
    window.location.href = '/api/auth/login';
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    refresh();
  }, [refresh]);

  return { ...state, refresh, signIn, signOut };
}
