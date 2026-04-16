import 'server-only';
import { QuranClient, Language } from '@quranjs/api';
import type { Verse, Word } from '@/types';
import { SURAH_NAMES } from './constants';

let _client: QuranClient | null = null;

function getClient(): QuranClient | null {
  if (_client) return _client;
  const clientId = process.env.QURAN_CLIENT_ID;
  const clientSecret = process.env.QURAN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // The SDK defaults point at PRODUCTION. When we're running against the
  // pre-live (test) environment we MUST override both base URLs or the token
  // request will come back as Unauthorized.
  const authBaseUrl = process.env.QURAN_AUTH_BASE_URL;
  const contentBaseUrl = process.env.QURAN_CONTENT_BASE_URL;

  _client = new QuranClient({
    clientId,
    clientSecret,
    ...(authBaseUrl ? { authBaseUrl } : {}),
    ...(contentBaseUrl ? { contentBaseUrl } : {}),
    defaults: { language: Language.ENGLISH },
  } as any);
  return _client;
}

export function isConfigured(): boolean {
  return !!(process.env.QURAN_CLIENT_ID && process.env.QURAN_CLIENT_SECRET);
}

/* ------------------------------------------------------------------ *
 * Verse fetcher with in-memory cache
 *
 * Tries the official @quranjs/api SDK first (when credentials are set),
 * then falls back to the public quran.com API so the app is usable for
 * demos before Quran Foundation credentials have been issued.
 * ------------------------------------------------------------------ */

const verseCache = new Map<string, Verse>();
const inFlight = new Map<string, Promise<Verse>>();

export async function fetchVerse(key: string): Promise<Verse> {
  const cached = verseCache.get(key);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<Verse> => {
    const client = getClient();
    let verse: Verse | null = null;

    if (client) {
      try {
        const v: any = await client.verses.findByKey(key as any, {
          words: true,
          translations: [20],
          fields: { textUthmani: true },
          wordFields: { textUthmani: true },
        } as any);
        verse = normalizeVerse(v, key);
      } catch (err) {
        console.warn(`[quran-client] SDK fetch failed for ${key}, falling back: ${(err as Error).message}`);
      }
    }

    if (!verse) {
      verse = await fetchVerseFromPublicApi(key);
    }

    verseCache.set(key, verse);
    return verse;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export async function fetchVerses(keys: string[]): Promise<Verse[]> {
  const results = await Promise.all(keys.map((k) => fetchVerse(k)));
  return results;
}

function normalizeVerse(v: any, key: string): Verse {
  const [surah, ayah] = key.split(':').map(Number);
  const words: Word[] = (v.words || [])
    .filter((w: any) => {
      const t = w.charTypeName ?? w.char_type_name ?? w.charType;
      return t !== 'end';
    })
    .map((w: any, idx: number) => ({
      position: w.position ?? idx + 1,
      text: w.textUthmani || w.text_uthmani || w.text || '',
      translation: w.translation?.text,
      transliteration: w.transliteration?.text,
    }))
    .filter((w: Word) => w.text);
  const translationText =
    v.translations?.[0]?.text && typeof v.translations[0].text === 'string'
      ? v.translations[0].text.replace(/<[^>]+>/g, '')
      : undefined;
  return {
    key,
    surah,
    ayah,
    textUthmani: v.textUthmani || v.text_uthmani || words.map((w) => w.text).join(' '),
    words,
    translation: translationText,
    surahName: SURAH_NAMES[surah - 1]?.en,
    surahNameArabic: SURAH_NAMES[surah - 1]?.ar,
  };
}

/* ------------------------------------------------------------------ *
 * Public api.quran.com fallback (no auth required for read).
 * Lets the app render real verses out-of-the-box for hackathon judges
 * who haven't been provisioned with API credentials yet.
 * ------------------------------------------------------------------ */
async function fetchVerseFromPublicApi(key: string): Promise<Verse> {
  const url = `https://api.quran.com/api/v4/verses/by_key/${encodeURIComponent(
    key
  )}?words=true&fields=text_uthmani&translations=20&word_fields=text_uthmani,translation`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch verse ${key}: ${res.status}`);
  }
  const json = await res.json();
  const v = json.verse;
  const [surah, ayah] = key.split(':').map(Number);
  const words: Word[] = (v.words || [])
    .filter((w: any) => w.char_type_name !== 'end')
    .map((w: any, idx: number) => ({
      position: w.position ?? idx + 1,
      text: w.text_uthmani || w.text || '',
      translation: w.translation?.text,
    }))
    .filter((w: Word) => w.text);
  return {
    key,
    surah,
    ayah,
    textUthmani: v.text_uthmani || words.map((w) => w.text).join(' '),
    words,
    translation: v.translations?.[0]?.text?.replace(/<[^>]+>/g, ''),
    surahName: SURAH_NAMES[surah - 1]?.en,
    surahNameArabic: SURAH_NAMES[surah - 1]?.ar,
  };
}
