'use client';
import { useEffect, useState, useCallback } from 'react';

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
    fetch('/api/user/streaks', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!j.authenticated) {
          setState({ authenticated: false, current: 0, longest: 0, loading: false });
          return;
        }
        setState({
          authenticated: true,
          current: j.streak?.current ?? 0,
          longest: j.streak?.longest ?? 0,
          loading: false,
        });
      })
      .catch(() =>
        setState({ authenticated: false, current: 0, longest: 0, loading: false }),
      );
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
