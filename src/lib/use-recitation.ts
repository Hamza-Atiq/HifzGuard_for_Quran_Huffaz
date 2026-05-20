'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type RecitationStatus =
  | 'idle'
  | 'requesting-mic'
  | 'listening'
  | 'transcribing'
  | 'stopped'
  | 'error';

export interface RecitationChunk {
  text: string;
  receivedAt: number;
  durationMs?: number;
}

export interface UseRecitationState {
  status: RecitationStatus;
  transcript: string; // concatenated transcripts of all chunks
  lastChunk: RecitationChunk | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export interface UseRecitationOptions {
  /** How long each audio chunk should be before we ship it to the server. */
  chunkMs?: number;
  /** The verse text currently being recited — passed to Whisper as initial_prompt
   *  to prevent hallucination of non-Arabic words. */
  expectedVerse?: string;
  /** Optional callback invoked each time a new chunk transcript arrives. */
  onChunk?: (chunk: RecitationChunk, fullTranscript: string) => void;
}

export function useRecitation(opts: UseRecitationOptions = {}): UseRecitationState {
  const chunkMs = opts.chunkMs ?? 4000;

  const [status, setStatus] = useState<RecitationStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastChunk, setLastChunk] = useState<RecitationChunk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stoppingRef = useRef(false);
  const transcriptRef = useRef('');
  const onChunkRef = useRef(opts.onChunk);
  onChunkRef.current = opts.onChunk;
  const expectedVerseRef = useRef(opts.expectedVerse);
  expectedVerseRef.current = opts.expectedVerse;

  const sendChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return; // skip silence-only chunks
    try {
      setStatus((s) => (s === 'listening' ? 'transcribing' : s));
      const headers: Record<string, string> = { 'Content-Type': blob.type || 'audio/webm' };
      if (expectedVerseRef.current) {
        headers['x-verse-text'] = expectedVerseRef.current;
      }
      const res = await fetch('/api/recitation/transcribe', {
        method: 'POST',
        headers,
        body: blob,
      });
      const j = await res.json();
      if (!res.ok || typeof j.text !== 'string') {
        throw new Error(j.message || j.error || `HTTP ${res.status}`);
      }
      const chunk: RecitationChunk = {
        text: j.text,
        receivedAt: Date.now(),
        durationMs: j.durationMs,
      };
      const next = (transcriptRef.current + ' ' + j.text).trim();
      transcriptRef.current = next;
      setTranscript(next);
      setLastChunk(chunk);
      setStatus((s) => (stoppingRef.current ? 'stopped' : 'listening'));
      onChunkRef.current?.(chunk, next);
    } catch (e) {
      // Non-fatal — keep listening. Just surface the most recent error.
      setError((e as Error).message);
      setStatus((s) => (stoppingRef.current ? 'stopped' : 'listening'));
    }
  }, []);

  const cycleChunk = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return;
    // Calling stop flushes a dataavailable + onstop event, then we restart.
    rec.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus('requesting-mic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      transcriptRef.current = '';
      setTranscript('');
      setLastChunk(null);
      stoppingRef.current = false;

      const startRecorder = () => {
        const stream = streamRef.current;
        if (!stream) return;
        const rec = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
        });
        recorderRef.current = rec;
        chunksRef.current = [];

        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType });
          chunksRef.current = [];
          // Fire-and-forget transcription
          sendChunk(blob);
          if (!stoppingRef.current) {
            startRecorder(); // start the next chunk immediately
          } else {
            // user requested stop — clean up the mic
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            recorderRef.current = null;
          }
        };

        rec.start();
        setStatus('listening');
        // Schedule the next chunk cut
        setTimeout(cycleChunk, chunkMs);
      };

      startRecorder();
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }, [chunkMs, cycleChunk, sendChunk]);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') {
      rec.stop();
    } else {
      // already stopped — clean up directly
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStatus('stopped');
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    transcriptRef.current = '';
    setTranscript('');
    setLastChunk(null);
    setError(null);
    setStatus('idle');
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      const rec = recorderRef.current;
      if (rec && rec.state === 'recording') rec.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { status, transcript, lastChunk, error, start, stop, reset };
}

/**
 * Plays a short error beep using the Web Audio API. No audio file needed,
 * works in any modern browser. Use this when divergence is detected.
 */
export function playMistakeBeep(volume = 0.25): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close().catch(() => undefined);
  } catch {
    /* non-fatal */
  }
}
