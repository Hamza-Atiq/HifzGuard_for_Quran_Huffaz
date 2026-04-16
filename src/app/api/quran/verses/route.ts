import { NextResponse } from 'next/server';
import { fetchVerses } from '@/lib/quran-client';

export const runtime = 'nodejs';

// Quran text never changes — safe to cache aggressively at the edge.
const CACHE_CONTROL =
  'public, s-maxage=86400, stale-while-revalidate=604800';

// GET /api/quran/verses?keys=2:14,3:119,4:61
export async function GET(req: Request) {
  const url = new URL(req.url);
  const keysParam = url.searchParams.get('keys');
  if (!keysParam) {
    return NextResponse.json({ error: 'missing keys param' }, { status: 400 });
  }
  const keys = keysParam.split(',').map((k) => k.trim()).filter(Boolean);
  if (keys.length > 25) {
    return NextResponse.json({ error: 'too many keys (max 25)' }, { status: 400 });
  }
  try {
    const verses = await fetchVerses(keys);
    return NextResponse.json(
      { verses },
      { headers: { 'Cache-Control': CACHE_CONTROL } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
