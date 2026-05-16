'use client';
import { useCallback, useEffect, useState } from 'react';

interface Tip {
  id: string | number;
  body: string;
  author?: string;
  createdAt?: string;
  tags?: string[];
}

interface Props {
  sourceKey: string;
}

interface RawPost {
  id: string | number;
  body?: string;
  content?: string;
  tags?: string[];
  created_at?: string;
  author?: { name?: string; username?: string };
}

function normalisePost(p: RawPost): Tip {
  return {
    id: p.id,
    body: p.body || p.content || '',
    author: p.author?.name || p.author?.username,
    createdAt: p.created_at,
    tags: Array.isArray(p.tags) ? p.tags : undefined,
  };
}

export default function CommunityTipsPanel({ sourceKey }: Props) {
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState<Tip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeMissing, setScopeMissing] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Compose form state
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchTips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/community/posts?verseKey=${encodeURIComponent(sourceKey)}&tag=mutashabihat`,
        { cache: 'no-store' },
      );
      const j = await res.json();
      if (j.authenticated === false) {
        setNeedsAuth(true);
        setTips([]);
        return;
      }
      if (j.reason === 'scope_missing') {
        setScopeMissing(true);
        setTips([]);
        return;
      }
      if (!res.ok && !j.posts) {
        throw new Error(j.message || j.error || `HTTP ${res.status}`);
      }
      const list = (j.posts ?? []).map(normalisePost);
      setTips(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sourceKey]);

  useEffect(() => {
    if (open && tips === null) fetchTips();
  }, [open, tips, fetchTips]);

  async function submit() {
    if (draft.trim().length < 10) {
      setSubmitError('Write at least a sentence so others can use your tip.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: draft.trim(),
          verseKey: sourceKey,
          tags: ['mutashabihat', 'memorytrick', 'hifztip'],
        }),
      });
      const j = await res.json();
      if (res.status === 401) {
        if (confirm('Sign in to share your tip with the community?')) {
          window.location.href = '/api/auth/login';
        }
        return;
      }
      if (!res.ok || !j.ok) {
        throw new Error(j.message || j.error || `HTTP ${res.status}`);
      }
      // Optimistic prepend so the user sees it immediately
      setTips((prev) => [
        normalisePost({
          id: j.post?.id ?? `local-${Date.now()}`,
          body: draft.trim(),
          tags: ['mutashabihat', 'memorytrick', 'hifztip'],
          created_at: new Date().toISOString(),
          author: { name: 'You' },
        }),
        ...(prev ?? []),
      ]);
      setDraft('');
      setComposeOpen(false);
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--line)] hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition mt-3"
      >
        💬 Community tips
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 p-4 fade-up">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
          💬 Community tips
        </h4>
        <div className="flex items-center gap-1.5">
          {!composeOpen && !needsAuth && !scopeMissing && (
            <button
              onClick={() => setComposeOpen(true)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
            >
              ✏ Share your tip
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-[11px] px-2 py-1 text-sky-700 dark:text-sky-300 opacity-70 hover:opacity-100"
          >
            hide
          </button>
        </div>
      </div>

      {composeOpen && (
        <div className="mb-4 p-3 rounded-xl bg-white dark:bg-black/30 border border-sky-200 dark:border-sky-900/50">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Share how you tell ${sourceKey} apart from its similar verses…`}
            rows={3}
            className="w-full bg-transparent text-sm resize-y focus:outline-none placeholder:text-[color:var(--ink-muted)]"
            disabled={submitting}
          />
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-[10px] text-[color:var(--ink-muted)]">
              Will be tagged #mutashabihat #memorytrick #hifztip
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setComposeOpen(false);
                  setDraft('');
                  setSubmitError(null);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                disabled={submitting}
              >
                cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || draft.trim().length < 10}
                className="text-[11px] px-3 py-1.5 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 transition disabled:opacity-50"
              >
                {submitting ? 'Posting…' : 'Post tip'}
              </button>
            </div>
          </div>
          {submitError && (
            <p className="text-[11px] text-red-700 dark:text-red-300 mt-2">{submitError}</p>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-4 text-sm text-sky-700 dark:text-sky-300">
          Loading tips…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 dark:text-red-300 py-2">{error}</p>
      )}

      {needsAuth && (
        <p className="text-sm text-[color:var(--ink-muted)] py-2">
          Sign in to read and share community tips for this verse.
        </p>
      )}

      {scopeMissing && (
        <p className="text-sm text-amber-700 dark:text-amber-300 py-2">
          QuranReflect (post) scope not yet active on your account — once it is, this card
          will fill in automatically.
        </p>
      )}

      {tips && tips.length === 0 && !needsAuth && !scopeMissing && !loading && (
        <p className="text-sm text-[color:var(--ink-muted)] py-2 italic">
          No tips for {sourceKey} yet — be the first to share one above.
        </p>
      )}

      {tips && tips.length > 0 && (
        <ul className="space-y-2.5 max-h-96 overflow-y-auto">
          {tips.map((t) => (
            <li
              key={t.id}
              className="rounded-xl bg-white dark:bg-black/20 border border-sky-100 dark:border-sky-900/30 px-3 py-2.5"
            >
              <p className="text-sm leading-6 text-[color:var(--ink)] whitespace-pre-wrap">
                {t.body}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-[color:var(--ink-muted)]">
                <span>
                  {t.author && <span className="font-semibold">{t.author}</span>}
                  {t.createdAt && (
                    <span>
                      {t.author ? ' · ' : ''}
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </span>
                {t.tags && t.tags.length > 0 && (
                  <span className="text-sky-700 dark:text-sky-300">
                    {t.tags.map((tag) => `#${tag}`).join(' ')}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
