import { NextResponse } from 'next/server';
import {
  getMutashabihatByParah,
  getMutashabihatBySurah,
  getMutashabihatForVerse,
  classifyDifficulty,
} from '@/lib/mutashabihat';

export const runtime = 'nodejs';

// GET /api/mutashabihat?parah=1
// GET /api/mutashabihat?surah=2
// GET /api/mutashabihat?key=2:14
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parah = url.searchParams.get('parah');
  const surah = url.searchParams.get('surah');
  const key = url.searchParams.get('key');

  if (key) {
    const [s, a] = key.split(':').map(Number);
    const entry = getMutashabihatForVerse(s, a);
    if (!entry) return NextResponse.json({ entry: null });
    return NextResponse.json({
      entry: {
        ...entry,
        difficulty: classifyDifficulty(entry.similar.length),
      },
    });
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

  return NextResponse.json({ entries: enriched, count: enriched.length });
}
