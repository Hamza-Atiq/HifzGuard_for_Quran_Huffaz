import { NextResponse } from 'next/server';
import {
  getMutashabihatByParah,
  getMutashabihatBySurah,
  getMutashabihatForVerse,
  classifyDifficulty,
} from '@/lib/mutashabihat';

export const runtime = 'nodejs';

// Mutashabihat data is fully static — cache hard at the edge.
const CACHE_CONTROL =
  'public, s-maxage=604800, stale-while-revalidate=2592000';

// GET /api/mutashabihat?parah=1
// GET /api/mutashabihat?surah=2
// GET /api/mutashabihat?key=2:14
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parah = url.searchParams.get('parah');
  const surah = url.searchParams.get('surah');
  const key = url.searchParams.get('key');

  const headers = { 'Cache-Control': CACHE_CONTROL };

  if (key) {
    const [s, a] = key.split(':').map(Number);
    const entry = getMutashabihatForVerse(s, a);
    if (!entry) return NextResponse.json({ entry: null }, { headers });
    return NextResponse.json(
      {
        entry: {
          ...entry,
          difficulty: classifyDifficulty(entry.similar.length),
        },
      },
      { headers }
    );
  }

  let entries;
  if (parah) {
    entries = getMutashabihatByParah(parseInt(parah, 10));
  } else if (surah) {
    entries = getMutashabihatBySurah(parseInt(surah, 10));
  } else {
    return NextResponse.json({ error: 'must provide parah, surah, or key' }, { status: 400 });
  }

  const enriched = entries.map((e) => ({
    ...e,
    difficulty: classifyDifficulty(e.similar.length),
  }));

  return NextResponse.json(
    { entries: enriched, count: enriched.length },
    { headers }
  );
}
