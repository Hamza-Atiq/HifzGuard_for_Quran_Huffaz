import 'server-only';
import { getAccessToken } from './auth';

const HOST =
  process.env.QURAN_USER_API_BASE_URL || 'https://apis-prelive.quran.foundation';
const BASE = HOST + '/auth/v1';
const REFLECT_BASE = HOST + '/quran-reflect/v1';

function clientId(): string {
  return (
    process.env.QURAN_USER_CLIENT_ID || process.env.QURAN_CLIENT_ID || ''
  );
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'unauthenticated' | 'scope_missing' | 'not_found' | 'server_error'; status: number; message?: string };

async function buildHeaders(): Promise<HeadersInit | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return {
    'x-auth-token': token,
    'x-client-id': clientId(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function callUrl<T>(
  url: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const headers = await buildHeaders();
  if (!headers) {
    return { ok: false, reason: 'unauthenticated', status: 401 };
  }
  let res: Response;
  try {
    res = await fetch(url, {
      cache: 'no-store',
      ...init,
      headers: { ...headers, ...(init.headers || {}) },
    });
  } catch (err) {
    return { ok: false, reason: 'server_error', status: 0, message: (err as Error).message };
  }
  if (res.status === 401) {
    return { ok: false, reason: 'unauthenticated', status: 401 };
  }
  if (res.status === 403) {
    return { ok: false, reason: 'scope_missing', status: 403 };
  }
  if (res.status === 404) {
    return { ok: false, reason: 'not_found', status: 404 };
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    return { ok: false, reason: 'server_error', status: res.status, message: msg.slice(0, 300) };
  }
  const data = (await res.json().catch(() => null)) as T;
  return { ok: true, data };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  return callUrl<T>(`${BASE}${path}`, init);
}

async function callReflect<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  return callUrl<T>(`${REFLECT_BASE}${path}`, init);
}

// -------------------- Types --------------------

export interface QfBookmark {
  id: string | number;
  key?: string;
  verse_key?: string;
  mushaf_id?: number;
  created_at?: string;
}
export interface QfBookmarksResponse {
  bookmarks?: QfBookmark[];
  data?: QfBookmark[];
}

export interface QfCollection {
  id: string | number;
  name: string;
  description?: string;
  is_default?: boolean;
}
export interface QfCollectionsResponse {
  collections?: QfCollection[];
  data?: QfCollection[];
}

export interface QfNote {
  id: string | number;
  body: string;
  ranges?: string[];
  verse_key?: string;
  created_at?: string;
  updated_at?: string;
}
export interface QfNotesResponse {
  notes?: QfNote[];
  data?: QfNote[];
}

export interface QfStreak {
  id?: string | number;
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  days?: number;
  current?: number;
  longest?: number;
}
export interface QfStreaksResponse {
  data?: QfStreak[];
  streak?: QfStreak;
  current_streak?: number;
  longest_streak?: number;
}

export interface QfGoal {
  id: string | number;
  type: string;
  target: number;
  current?: number;
  start_date?: string;
  end_date?: string;
}
export interface QfGoalsResponse {
  goals?: QfGoal[];
  data?: QfGoal[];
}

export interface QfActivityDay {
  date: string;
  activity_type?: string;
  ranges?: string[];
  duration_seconds?: number;
}
export interface QfActivityDaysResponse {
  activity_days?: QfActivityDay[];
  data?: QfActivityDay[];
}

export interface QfReadingSession {
  id?: string | number;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  ranges?: string[];
}

// -------------------- Bookmarks --------------------

export const bookmarks = {
  list: () => call<QfBookmarksResponse>('/bookmarks?mushaf_id=1'),
  create: (verseKey: string) =>
    call<QfBookmark>('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ mushaf_id: 1, key: verseKey, type: 'ayah' }),
    }),
  remove: (id: string | number) =>
    call<{ success: boolean }>(`/bookmarks/${id}`, { method: 'DELETE' }),
};

// -------------------- Collections --------------------

export const collections = {
  list: () => call<QfCollectionsResponse>('/collections'),
  create: (name: string, description?: string) =>
    call<QfCollection>('/collections', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  remove: (id: string | number) =>
    call<{ success: boolean }>(`/collections/${id}`, { method: 'DELETE' }),
  addItem: (collectionId: string | number, verseKey: string) =>
    call<{ success: boolean }>(`/collections/${collectionId}/items`, {
      method: 'POST',
      body: JSON.stringify({ key: verseKey, type: 'ayah', mushaf_id: 1 }),
    }),
};

// -------------------- Notes --------------------

export const notes = {
  list: (verseKey?: string) =>
    call<QfNotesResponse>(verseKey ? `/notes?ranges=${encodeURIComponent(verseKey)}` : '/notes'),
  create: (body: string, verseKey: string) =>
    call<QfNote>('/notes', {
      method: 'POST',
      body: JSON.stringify({ body, ranges: [verseKey] }),
    }),
  update: (id: string | number, body: string) =>
    call<QfNote>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ body }),
    }),
  remove: (id: string | number) =>
    call<{ success: boolean }>(`/notes/${id}`, { method: 'DELETE' }),
};

// -------------------- Streaks --------------------

export const streaks = {
  list: () => call<QfStreaksResponse>('/streaks'),
};

// -------------------- Goals --------------------

export const goals = {
  list: () => call<QfGoalsResponse>('/goals'),
  today: () => call<QfGoal>('/goals/today'),
  create: (type: string, target: number) =>
    call<QfGoal>('/goals', {
      method: 'POST',
      body: JSON.stringify({ type, target }),
    }),
};

// -------------------- Activity Days --------------------

export const activityDays = {
  list: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    return call<QfActivityDaysResponse>(`/activity-days${qs ? '?' + qs : ''}`);
  },
  log: (date: string, ranges: string[], activityType = 'revision') =>
    call<QfActivityDay>('/activity-days', {
      method: 'POST',
      body: JSON.stringify({
        date,
        activity_type: activityType,
        ranges,
      }),
    }),
};

// -------------------- Reading Sessions --------------------

// -------------------- QuranReflect Posts (community) --------------------

export interface QfPost {
  id: string | number;
  body?: string;
  content?: string;
  references?: string[];
  ranges?: string[];
  tags?: string[];
  author?: { name?: string; username?: string };
  created_at?: string;
  is_public?: boolean;
}

export interface QfPostsFeedResponse {
  posts?: QfPost[];
  data?: QfPost[];
}

export interface QfComment {
  id: string | number;
  body?: string;
  author?: { name?: string };
  created_at?: string;
}

export const posts = {
  feed: (filter: { references?: string[]; tags?: string[]; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (filter.references?.length) q.set('references', filter.references.join(','));
    if (filter.tags?.length) q.set('tags', filter.tags.join(','));
    if (filter.page) q.set('page', String(filter.page));
    const qs = q.toString();
    return callReflect<QfPostsFeedResponse>(`/posts/feed${qs ? '?' + qs : ''}`);
  },
  byId: (id: string | number) => callReflect<QfPost>(`/posts/${id}`),
  create: (body: string, references: string[], tags: string[] = []) =>
    callReflect<QfPost>('/posts', {
      method: 'POST',
      body: JSON.stringify({
        body,
        references,
        tags,
        is_public: true,
      }),
    }),
  remove: (id: string | number) =>
    callReflect<{ success: boolean }>(`/posts/${id}`, { method: 'DELETE' }),
};

export const comments = {
  list: (postId: string | number) =>
    callReflect<{ comments?: QfComment[]; data?: QfComment[] }>(
      `/posts/${postId}/comments`,
    ),
  create: (postId: string | number, body: string) =>
    callReflect<QfComment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};

export const readingSessions = {
  start: (ranges: string[]) =>
    call<QfReadingSession>('/reading-sessions', {
      method: 'POST',
      body: JSON.stringify({ start_time: new Date().toISOString(), ranges }),
    }),
  end: (id: string | number, ranges: string[], durationSeconds: number) =>
    call<QfReadingSession>(`/reading-sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        end_time: new Date().toISOString(),
        duration_seconds: durationSeconds,
        ranges,
      }),
    }),
};
