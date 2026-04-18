import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=604800';

export interface PageWord {
  id: number;
  position: number;
  lineNumber: number;
  pageNumber: number;
  charType: string;
  codeV1: string;
  textUthmani: string;
  verseKey: string;
  translation?: string;
}

export interface PageVerse {
  verseKey: string;
  verseNumber: number;
}

// GET /api/quran/page?page=3
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pageParam = url.searchParams.get('page');
  if (!pageParam) {
    return NextResponse.json({ error: 'missing page param' }, { status: 400 });
  }
  const page = parseInt(pageParam, 10);
  if (isNaN(page) || page < 1 || page > 604) {
    return NextResponse.json({ error: 'page must be 1-604' }, { status: 400 });
  }

  try {
    const apiUrl = `https://api.quran.com/api/v4/verses/by_page/${page}?words=true&per_page=all&word_fields=code_v1,text_uthmani,line_number&translations=20`;
    const res = await fetch(apiUrl, { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (!res.ok) {
      throw new Error(`Quran API returned ${res.status}`);
    }
    const json = await res.json();

    const words: PageWord[] = [];
    const verses: PageVerse[] = [];

    for (const v of json.verses) {
      verses.push({
        verseKey: v.verse_key,
        verseNumber: v.verse_number,
      });
      for (const w of v.words) {
        words.push({
          id: w.id,
          position: w.position,
          lineNumber: w.line_number,
          pageNumber: w.page_number,
          charType: w.char_type_name,
          codeV1: w.code_v1 || w.text || '',
          textUthmani: w.text_uthmani || w.text || '',
          verseKey: v.verse_key,
          translation: w.translation?.text,
        });
      }
    }

    return NextResponse.json(
      { page, words, verses, totalPages: 604 },
      { headers: { 'Cache-Control': CACHE_CONTROL } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
