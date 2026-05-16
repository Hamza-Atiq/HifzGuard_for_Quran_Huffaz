'use client';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hifzguard-memorized-parahs';
const CURRENT_KEY = 'hifzguard-sabaq-parah';

function loadSet(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)) : []);
  } catch {
    return new Set();
  }
}

function saveSet(s: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...s].sort((a, b) => a - b)));
  } catch {
    /* non-fatal */
  }
}

export function useMemorizedParahs() {
  const [memorized, setMemorized] = useState<Set<number>>(() => new Set());
  const [currentlyLearning, setCurrentlyLearning] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setMemorized(loadSet());
    try {
      const c = localStorage.getItem(CURRENT_KEY);
      setCurrentlyLearning(c ? Number(c) : null);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  const toggle = useCallback((parah: number) => {
    setMemorized((prev) => {
      const next = new Set(prev);
      if (next.has(parah)) next.delete(parah);
      else next.add(parah);
      saveSet(next);
      return next;
    });
  }, []);

  const setSabaq = useCallback((parah: number | null) => {
    setCurrentlyLearning(parah);
    try {
      if (parah === null) localStorage.removeItem(CURRENT_KEY);
      else localStorage.setItem(CURRENT_KEY, String(parah));
    } catch {
      /* ignore */
    }
  }, []);

  return {
    memorized,
    memorizedList: [...memorized].sort((a, b) => a - b),
    currentlyLearning,
    toggle,
    setSabaq,
    loaded,
  };
}
