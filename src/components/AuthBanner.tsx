'use client';
import { useEffect, useState } from 'react';

export function AuthBanner() {
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (auth === 'success' || auth === 'error') {
      setStatus(auth);
      setMsg(params.get('msg') ?? '');
    }
  }, []);

  if (!status) return null;

  const isErr = status === 'error';
  return (
    <div
      role="status"
      className={`mx-auto max-w-3xl mt-4 mb-2 px-5 py-3 rounded-xl border text-sm flex items-start gap-3 ${
        isErr
          ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200'
      }`}
    >
      <span className="font-semibold whitespace-nowrap">
        {isErr ? 'Sign-in failed:' : 'Signed in.'}
      </span>
      {isErr && msg && <span className="break-words">{msg}</span>}
      <button
        onClick={() => setStatus(null)}
        className="ml-auto underline opacity-70 hover:opacity-100"
        aria-label="dismiss"
      >
        dismiss
      </button>
    </div>
  );
}
