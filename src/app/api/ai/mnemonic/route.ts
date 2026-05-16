import { NextResponse } from 'next/server';
import { generateMnemonic, type MnemonicInput } from '@/lib/ai-mnemonic';
import { fetchVerses } from '@/lib/quran-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReqBody {
  sourceKey: string;
  similarKeys: string[];
  needsContext?: boolean;
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured on the server' },
      { status: 503 },
    );
  }

  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { sourceKey, similarKeys, needsContext } = body;
  if (!sourceKey || !Array.isArray(similarKeys) || similarKeys.length === 0) {
    return NextResponse.json(
      { error: 'sourceKey and non-empty similarKeys[] are required' },
      { status: 400 },
    );
  }

  // Cap similars so prompt cost stays bounded
  const trimmedSimilars = similarKeys.slice(0, 4);
  const allKeys = [sourceKey, ...trimmedSimilars];

  let verses;
  try {
    verses = await fetchVerses(allKeys);
  } catch (err) {
    return NextResponse.json(
      { error: 'verse_fetch_failed', message: (err as Error).message },
      { status: 502 },
    );
  }

  const byKey = new Map(verses.map((v) => [v.key, v]));
  const src = byKey.get(sourceKey);
  if (!src?.textUthmani) {
    return NextResponse.json(
      { error: `could not load source verse ${sourceKey}` },
      { status: 502 },
    );
  }

  type Similar = MnemonicInput['similars'][number];
  const similars: Similar[] = [];
  for (const k of trimmedSimilars) {
    const v = byKey.get(k);
    if (v?.textUthmani) {
      similars.push({ key: k, arabic: v.textUthmani, translation: v.translation });
    }
  }

  const input: MnemonicInput = {
    source: { key: sourceKey, arabic: src.textUthmani, translation: src.translation },
    similars,
    needsContext,
  };

  if (input.similars.length === 0) {
    return NextResponse.json(
      { error: 'no similar verses could be loaded' },
      { status: 502 },
    );
  }

  try {
    const mnemonic = await generateMnemonic(input);
    return NextResponse.json({ ok: true, mnemonic });
  } catch (err) {
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 502 },
    );
  }
}
