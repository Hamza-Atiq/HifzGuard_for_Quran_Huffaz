'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type WebSpeechStatus = 'idle' | 'listening' | 'error' | 'unsupported';

export interface UseWebSpeechOptions {
  lang?: string;
  /** Fires on every interim + final result with the full accumulated text so far. */
  onUpdate?: (fullTranscript: string) => void;
}

export interface UseWebSpeechState {
  status: WebSpeechStatus;
  error: string | null;
  transcript: string;
  supported: boolean;
  start: () => void;
  stop: () => void;
  clearTranscript: () => void;
}

export function useWebSpeech(opts: UseWebSpeechOptions = {}): UseWebSpeechState {
  const lang = opts.lang ?? 'ar-SA';

  const [status, setStatus] = useState<WebSpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  const recRef = useRef<SpeechRecognition | null>(null);
  const finalRef = useRef('');
  const stoppingRef = useRef(false);
  const onUpdateRef = useRef(opts.onUpdate);
  onUpdateRef.current = opts.onUpdate;

  // Detect support once (browser only)
  const Ctor =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined;
  const supported = !!Ctor;

  const clearTranscript = useCallback(() => {
    finalRef.current = '';
    setTranscript('');
  }, []);

  const startRecognition = useCallback(() => {
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalRef.current += r[0].transcript + ' ';
        } else {
          interim += r[0].transcript;
        }
      }
      const full = (finalRef.current + interim).trim();
      setTranscript(full);
      onUpdateRef.current?.(full);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      // no-speech / aborted are non-fatal — recognition will auto-restart
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(e.error);
      setStatus('error');
    };

    rec.onend = () => {
      // Auto-restart unless the user deliberately stopped
      if (!stoppingRef.current && recRef.current === rec) {
        try {
          rec.start();
        } catch {
          // already started — ignore
        }
      }
    };

    try {
      rec.start();
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [Ctor, lang]);

  const start = useCallback(() => {
    if (!Ctor) {
      setStatus('unsupported');
      setError('SpeechRecognition not supported. Use Chrome or Edge.');
      return;
    }
    // Reset
    stoppingRef.current = false;
    finalRef.current = '';
    setTranscript('');
    setError(null);
    setStatus('listening');
    startRecognition();
  }, [Ctor, startRecognition]);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    recRef.current = null;
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      try {
        recRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  return { status, error, transcript, supported, start, stop, clearTranscript };
}
