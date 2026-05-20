'use client';
import { useCallback, useEffect, useState } from 'react';
import AiTipPanel from './AiTipPanel';
import CommunityTipsPanel from './CommunityTipsPanel';
import { SURAH_NAMES } from '@/lib/constants';
import type { MutashabihEntry } from '@/types';

type Tab = 'notes' | 'bookmark' | 'ai' | 'community';

interface RawNote {
  id: string | number;
  body?: string;
  content?: string;
  created_at?: string;
}
interface Note {
  id: string | number;
  body: string;
  createdAt?: string;
}

interface Props {
  verseKey: string;
  mutEntry: MutashabihEntry | null;
  onClose: () => void;
}

export default function MushafAyahPanel({ verseKey, mutEntry, onClose }: Props) {
  const [surah, ayah] = verseKey.split(':').map(Number);
  const surahName = SURAH_NAMES[surah - 1]?.en ?? `Surah ${surah}`;
  const isMutashabih = !!mutEntry;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'notes', label: '📝 Notes' },
    { id: 'bookmark', label: '🔖 Bookmark' },
    ...(isMutashabih ? [{ id: 'ai' as Tab, label: '✨ AI Tip' }] : []),
    ...(isMutashabih ? [{ id: 'community' as Tab, label: '💬 Community' }] : []),
  ];

  const [activeTab, setActiveTab] = useState<Tab>('notes');

  // Reset to a valid tab when verse changes
  useEffect(() => {
    setActiveTab('notes');
  }, [verseKey]);

  return (
    <div className="card p-4 space-y-3 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[color:var(--teal)]">{verseKey}</span>
          <span className="text-xs text-[color:var(--ink-muted)] ml-2">{surahName} · Ayah {ayah}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-2 py-1 rounded-lg hover:bg-[color:var(--line)] text-[color:var(--ink-muted)] transition"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
              activeTab === t.id
                ? 'bg-[color:var(--teal)] text-white'
                : 'bg-[color:var(--line)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[120px]">
        {activeTab === 'notes' && <NotesTab verseKey={verseKey} />}
        {activeTab === 'bookmark' && <BookmarkTab verseKey={verseKey} />}
        {activeTab === 'ai' && mutEntry && (
          <AiTipPanel
            sourceKey={verseKey}
            similarKeys={mutEntry.similar.map((s) => s.key)}
            needsContext={mutEntry.needsContext}
          />
        )}
        {activeTab === 'community' && <CommunityTipsPanel sourceKey={verseKey} />}
      </div>
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ verseKey }: { verseKey: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/notes?verseKey=${encodeURIComponent(verseKey)}`);
      const j = await res.json();
      if (j.authenticated === false) {
        setNeedsAuth(true);
        setNotes([]);
        return;
      }
      setNotes(
        (j.notes ?? []).map((n: RawNote) => ({
          id: n.id,
          body: n.body ?? n.content ?? '',
          createdAt: n.created_at,
        })),
      );
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [verseKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNote() {
    if (draft.trim().length < 2) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/user/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim(), verseKey }),
      });
      const j = await res.json();
      if (res.status === 401) {
        if (confirm('Sign in to save notes to your Quran.com account?')) {
          window.location.href = '/api/auth/login';
        }
        return;
      }
      if (!res.ok || !j.ok) {
        throw new Error(j.message || j.error || `HTTP ${res.status}`);
      }
      setDraft('');
      await load();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string | number) {
    setDeletingId(id);
    try {
      await fetch(`/api/user/notes?id=${id}`, { method: 'DELETE' });
      setNotes((prev) => (prev ?? []).filter((n) => n.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  if (needsAuth) {
    return (
      <div className="py-4 text-sm text-[color:var(--ink-muted)]">
        <a href="/api/auth/login" className="text-[color:var(--teal)] underline">Sign in</a> to add notes for this ayah.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* New note input */}
      <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add a note for ${verseKey}…`}
          rows={2}
          className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-[color:var(--ink-muted)]"
          disabled={saving}
        />
        <div className="flex items-center justify-between mt-2">
          {saveError && <span className="text-xs text-red-600">{saveError}</span>}
          <button
            type="button"
            onClick={saveNote}
            disabled={saving || draft.trim().length < 2}
            className="ml-auto text-xs px-3 py-1.5 rounded-full bg-[color:var(--teal)] text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>

      {/* Note list */}
      {loading && <p className="text-xs text-[color:var(--ink-muted)]">Loading notes…</p>}
      {!loading && notes && notes.length === 0 && (
        <p className="text-xs text-[color:var(--ink-muted)] italic">No notes yet for {verseKey}.</p>
      )}
      {notes && notes.length > 0 && (
        <ul className="space-y-2 max-h-52 overflow-y-auto">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-xl bg-[color:var(--bg)] border border-[color:var(--line)] px-3 py-2 text-sm leading-6 whitespace-pre-wrap relative group"
            >
              {n.body}
              {n.createdAt && (
                <span className="block text-[10px] text-[color:var(--ink-muted)] mt-1">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => deleteNote(n.id)}
                disabled={deletingId === n.id}
                className="absolute top-2 right-2 text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                {deletingId === n.id ? '…' : '✕'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Bookmark Tab ─────────────────────────────────────────────────────────────

function BookmarkTab({ verseKey }: { verseKey: string }) {
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/user/bookmarks')
      .then((r) => r.json())
      .then((j) => {
        if (j.authenticated === false) {
          setNeedsAuth(true);
          setBookmarked(false);
          return;
        }
        const list: Array<{ id: string; verse_key?: string; key?: string }> = j.bookmarks ?? [];
        const match = list.find(
          (b) => (b.verse_key ?? b.key) === verseKey,
        );
        setBookmarked(!!match);
        setBookmarkId(match?.id ?? null);
      })
      .catch(() => setBookmarked(false))
      .finally(() => setLoading(false));
  }, [verseKey]);

  async function toggle() {
    if (bookmarked === null) return;
    setToggling(true);
    setError(null);
    try {
      if (bookmarked && bookmarkId) {
        const res = await fetch(`/api/user/bookmarks?id=${bookmarkId}`, { method: 'DELETE' });
        if (res.status === 401) {
          window.location.href = '/api/auth/login';
          return;
        }
        if (res.ok) {
          setBookmarked(false);
          setBookmarkId(null);
        }
      } else {
        const res = await fetch('/api/user/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verseKey }),
        });
        if (res.status === 401) {
          if (confirm('Sign in to bookmark this ayah?')) {
            window.location.href = '/api/auth/login';
          }
          return;
        }
        const j = await res.json();
        if (res.ok && j.ok) {
          setBookmarked(true);
          setBookmarkId(j.bookmark?.id ?? null);
        } else {
          throw new Error(j.message || j.error || `HTTP ${res.status}`);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setToggling(false);
    }
  }

  if (needsAuth) {
    return (
      <div className="py-4 text-sm text-[color:var(--ink-muted)]">
        <a href="/api/auth/login" className="text-[color:var(--teal)] underline">Sign in</a> to bookmark ayahs.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 gap-4">
      {loading ? (
        <p className="text-sm text-[color:var(--ink-muted)]">Checking…</p>
      ) : (
        <>
          <div className="text-5xl">{bookmarked ? '🔖' : '📄'}</div>
          <p className="text-sm text-[color:var(--ink-muted)] text-center">
            {bookmarked ? 'This ayah is bookmarked.' : 'Bookmark this ayah for quick access.'}
          </p>
          <button
            type="button"
            onClick={toggle}
            disabled={toggling}
            className={`px-6 py-2.5 rounded-full font-semibold text-sm transition ${
              bookmarked
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
                : 'bg-[color:var(--teal)] text-white hover:opacity-90'
            } disabled:opacity-50`}
          >
            {toggling ? '…' : bookmarked ? 'Remove bookmark' : '🔖 Bookmark ayah'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
