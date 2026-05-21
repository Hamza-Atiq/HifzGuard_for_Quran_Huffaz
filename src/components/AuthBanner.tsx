'use client';
import { useEffect, useState } from 'react';

export function AuthBanner() {
  const [status, setStatus] = useState<'success' | 'error' | 'signed_out' | null>(null);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signed_out') === '1') {
      setStatus('signed_out');
      return;
    }
    const auth = params.get('auth');
    if (auth === 'success' || auth === 'error') {
      setStatus(auth);
      setMsg(params.get('msg') ?? '');
    }
  }, []);

  if (!status) return null;

  const isErr = status === 'error';
  const isSignedOut = status === 'signed_out';

  const bgClass = isErr
    ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200'
    : isSignedOut
      ? 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-200'
      : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200';

  return (
    <div role="status" className={`mx-auto max-w-3xl mt-4 mb-2 px-5 py-3 rounded-xl border text-sm flex items-start gap-3 ${bgClass}`}>
      <span className="font-semibold whitespace-nowrap">
        {isErr ? 'Sign-in failed:' : isSignedOut ? 'Signed out.' : 'Signed in.'}
      </span>
      {isErr && msg && <span className="break-words">{msg}</span>}
      {isSignedOut && (
        <a href="/api/auth/login" className="underline opacity-80 hover:opacity-100">
          Sign in again →
        </a>
      )}
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
