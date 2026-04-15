import 'server-only';
import { getAccessToken } from './auth';

const BASE = 'https://api.quran.com/api/qdc/user/v1';

async function headers() {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  return {
    'x-auth-token': token,
    'x-client-id': process.env.QURAN_USER_CLIENT_ID || process.env.QURAN_CLIENT_ID || '',
    'Content-Type': 'application/json',
  };
}

export async function listBookmarks(): Promise<any> {
  const res = await fetch(`${BASE}/bookmarks?mushaf_id=1`, { headers: await headers(), cache: 'no-store' });
  if (!res.ok) throw new Error(`bookmarks fetch ${res.status}`);
  return res.json();
}

export async function addBookmark(verseKey: string): Promise<any> {
  const res = await fetch(`${BASE}/bookmarks`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ mushaf_id: 1, key: verseKey, type: 'ayah' }),
  });
  if (!res.ok) throw new Error(`bookmark add ${res.status}`);
  return res.json();
}

export async function getStreaks(): Promise<any> {
  const res = await fetch(`${BASE}/streaks`, { headers: await headers(), cache: 'no-store' });
  if (!res.ok) throw new Error(`streaks ${res.status}`);
  return res.json();
}

export async function logActivity(date: string, ranges: string[]): Promise<any> {
  const res = await fetch(`${BASE}/activity-days`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ date, activity_type: 'revision', ranges }),
  });
  if (!res.ok) throw new Error(`activity ${res.status}`);
  return res.json();
}
