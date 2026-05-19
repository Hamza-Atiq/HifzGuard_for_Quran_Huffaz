'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { audioUrlFor } from './audio';

export type PlaybackState = 'idle' | 'playing' | 'paused';

export interface AudioCompareState {
  state: PlaybackState;
  currentKey: string | null;
  rate: number;
  setRate: (r: number) => void;
  playOne: (verseKey: string) => Promise<void>;
  playSequence: (keys: string[], gapMs?: number) => Promise<void>;
  stop: () => void;
}

const STORAGE_RECITER = 'hifzguard-reciter';
const STORAGE_RATE = 'hifzguard-audio-rate';

export function useReciterPreference(): [string, (id: string) => void] {
  const [reciterId, setReciterIdInner] = useState<string>('mishary');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECITER);
      if (saved) setReciterIdInner(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setReciterId = useCallback((id: string) => {
    setReciterIdInner(id);
    try {
      localStorage.setItem(STORAGE_RECITER, id);
    } catch {
      /* ignore */
    }
  }, []);

  return [reciterId, setReciterId];
}

/**
 * Play one or more verses in sequence with a chosen Qari and playback rate.
 * One <audio> element is reused for the whole session.
 */
export function useAudioCompare(reciterId: string): AudioCompareState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef(false);
  const [state, setState] = useState<PlaybackState>('idle');
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [rate, setRateInner] = useState<number>(1);

  // Hydrate rate from localStorage
  useEffect(() => {
    try {
      const r = parseFloat(localStorage.getItem(STORAGE_RATE) ?? '');
      if (!Number.isNaN(r) && r >= 0.25 && r <= 2) setRateInner(r);
    } catch {
      /* ignore */
    }
  }, []);

  // Lazy-create one audio element shared across the hook lifetime
  if (typeof window !== 'undefined' && audioRef.current === null) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
    audioRef.current.crossOrigin = 'anonymous';
  }

  const setRate = useCallback((r: number) => {
    setRateInner(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
    try {
      localStorage.setItem(STORAGE_RATE, String(r));
    } catch {
      /* ignore */
    }
  }, []);

  // Keep the audio element's rate in sync if reciter/rate changes during play
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const stop = useCallback(() => {
    cancelRef.current = true;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setState('idle');
    setCurrentKey(null);
  }, []);

  const playSingle = useCallback(
    async (key: string): Promise<void> => {
      const a = audioRef.current;
      if (!a) return;
      // Stop any prior playback before swapping src — without this, Chrome
      // can throw AbortError mid-sequence and kill the rest of the queue.
      try {
        a.pause();
      } catch {
        /* fine */
      }
      a.src = audioUrlFor(key, reciterId);
      a.load();
      a.currentTime = 0;
      a.playbackRate = rate;
      setCurrentKey(key);
      setState('playing');
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          settled = true;
          a.removeEventListener('ended', onEnd);
          a.removeEventListener('error', onErr);
          a.removeEventListener('pause', onPause);
        };
        const onEnd = () => {
          if (settled) return;
          cleanup();
          resolve();
        };
        const onErr = () => {
          if (settled) return;
          cleanup();
          reject(new Error('audio load/play failed'));
        };
        const onPause = () => {
          // Only treat as cancel when the user explicitly stopped (cancelRef).
          // The browser may also fire `pause` right before `ended` — ignore that.
          if (settled) return;
          if (cancelRef.current) {
            cleanup();
            resolve();
          }
        };
        a.addEventListener('ended', onEnd);
        a.addEventListener('error', onErr);
        a.addEventListener('pause', onPause);
        a.play().catch((err) => {
          if (settled) return;
          cleanup();
          reject(err);
        });
      });
    },
    [reciterId, rate],
  );

  const playOne = useCallback(
    async (verseKey: string) => {
      cancelRef.current = false;
      try {
        await playSingle(verseKey);
      } catch {
        /* swallow — UI will reset */
      } finally {
        setState('idle');
        setCurrentKey(null);
      }
    },
    [playSingle],
  );

  const playSequence = useCallback(
    async (keys: string[], gapMs = 600) => {
      cancelRef.current = false;
      for (const key of keys) {
        if (cancelRef.current) break;
        try {
          await playSingle(key);
        } catch (err) {
          // A transient AbortError / load failure on one verse shouldn't
          // kill the whole sequence — log and continue to the next.
          console.warn(`[audio] skip ${key}:`, err);
          continue;
        }
        if (cancelRef.current) break;
        if (gapMs > 0) {
          await new Promise((r) => setTimeout(r, gapMs));
        }
      }
      setState('idle');
      setCurrentKey(null);
    },
    [playSingle],
  );

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return { state, currentKey, rate, setRate, playOne, playSequence, stop };
}
