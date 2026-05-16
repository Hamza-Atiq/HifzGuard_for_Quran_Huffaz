'use client';
import { useState } from 'react';

export interface Mnemonic {
  explanation: string;
  memoryTrick: string;
  divergenceWord: string;
  difficultyReason: string;
}

interface Props {
  sourceKey: string;
  similarKeys: string[];
  needsContext?: boolean;
}

const STORAGE_PREFIX = 'hifzguard-mnemonic:';

function storageKey(sourceKey: string) {
  return `${STORAGE_PREFIX}${sourceKey}`;
}

function loadCached(sourceKey: string): Mnemonic | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(sourceKey));
    return raw ? (JSON.parse(raw) as Mnemonic) : null;
  } catch {
    return null;
  }
}

function saveCached(sourceKey: string, m: Mnemonic) {
  try {
    localStorage.setItem(storageKey(sourceKey), JSON.stringify(m));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export default function AiTipPanel({ sourceKey, similarKeys, needsContext }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState<Mnemonic | null>(() => loadCached(sourceKey));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle');

  async function generate(force = false) {
    if (!force && mnemonic) {
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    setSaveState('idle');
    try {
      const res = await fetch('/api/ai/mnemonic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceKey, similarKeys, needsContext }),
      });
      const j = await res.json();
      if (!res.ok || !j.mnemonic) {
        throw new Error(j.message || j.error || `HTTP ${res.status}`);
      }
      setMnemonic(j.mnemonic);
      saveCached(sourceKey, j.mnemonic);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveAsNote() {
    if (!mnemonic) return;
    setSaveState('saving');

    const body = [
      `Why similar: ${mnemonic.explanation}`,
      ``,
      `Memory trick: ${mnemonic.memoryTrick}`,
      ``,
      `Diverges at: ${mnemonic.divergenceWord}`,
      ``,
      `Why hard: ${mnemonic.difficultyReason}`,
    ].join('\n');

    try {
      const res = await fetch('/api/user/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, verseKey: sourceKey }),
      });
      if (res.ok) {
        setSaveState('saved');
        return;
      }
      if (res.status === 401) {
        if (confirm('Sign in to save this note to your Quran.com account?')) {
          window.location.href = '/api/auth/login';
        }
        setSaveState('idle');
        return;
      }
      // 403 / scope_missing / anything else — already cached locally
      setSaveState('local');
    } catch {
      setSaveState('local');
    }
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => generate(false)}
          className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:opacity-95 transition shadow-sm"
        >
          ✨ Get AI Tip
        </button>
      ) : (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20 p-4 fade-up">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              ✨ AI memory tip
            </h4>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => generate(true)}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-full border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition disabled:opacity-50"
                title="Generate a new tip"
              >
                ↻ regenerate
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[11px] px-2 py-1 text-violet-700 dark:text-violet-300 opacity-70 hover:opacity-100"
              >
                hide
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-6 text-sm text-violet-700 dark:text-violet-300">
              Asking Gemini for a tip…
            </div>
          )}

          {error && (
            <div className="text-sm text-red-700 dark:text-red-300 py-2">
              Couldn't generate: {error}
            </div>
          )}

          {mnemonic && !loading && (
            <div className="space-y-3">
              <Section title="Why they're similar" body={mnemonic.explanation} />
              <Section title="Memory trick" body={mnemonic.memoryTrick} accent />
              <DivergenceRow word={mnemonic.divergenceWord} />
              <Section
                title="Why it's hard"
                body={mnemonic.difficultyReason}
                small
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                {saveState === 'saved' && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    ✓ saved to your notes
                  </span>
                )}
                {saveState === 'local' && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    saved locally (Notes scope pending)
                  </span>
                )}
                <button
                  onClick={saveAsNote}
                  disabled={saveState === 'saving' || saveState === 'saved'}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-violet-600 text-white font-semibold hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {saveState === 'saving' ? 'Saving…' : '💾 Save as Note'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  body,
  accent,
  small,
}: {
  title: string;
  body: string;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
        accent ? 'text-fuchsia-700 dark:text-fuchsia-300' : 'text-violet-600/80 dark:text-violet-400/80'
      }`}>
        {title}
      </p>
      <p className={`${small ? 'text-xs' : 'text-sm'} leading-6 text-[color:var(--ink)] ${
        accent ? 'font-medium' : ''
      }`}>
        {body}
      </p>
    </div>
  );
}

function DivergenceRow({ word }: { word: string }) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-black/20 rounded-xl px-3 py-2 border border-violet-200 dark:border-violet-900/50">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 whitespace-nowrap">
        ↳ diverges at
      </span>
      <span className="arabic-sm font-bold text-amber-700 dark:text-amber-300" dir="rtl">
        {word}
      </span>
    </div>
  );
}
