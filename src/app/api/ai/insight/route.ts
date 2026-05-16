import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { fetchVerses } from '@/lib/quran-client';
import { getMutashabihatForVerse, classifyDifficulty } from '@/lib/mutashabihat';
import { normalize } from '@/lib/diff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReqBody {
  /** Verse keys the user has flagged as weak (from bookmarks + wrong self-test answers). */
  weakKeys: string[];
}

interface InsightSchema {
  pattern: string;
  focusArea: string;
  practicalTip: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    pattern: {
      type: Type.STRING,
      description:
        'One concrete pattern the user keeps tripping on (e.g. shared opening words, similar topic). Be specific — quote the shared Arabic phrase if there is one.',
    },
    focusArea: {
      type: Type.STRING,
      description:
        'What specific word, position, or feature the user should focus on to tell these verses apart. Practical and actionable.',
    },
    practicalTip: {
      type: Type.STRING,
      description:
        'One sentence with the next step — a concrete drill or technique to break the confusion.',
    },
  },
  required: ['pattern', 'focusArea', 'practicalTip'],
  propertyOrdering: ['pattern', 'focusArea', 'practicalTip'],
};

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

  const weakKeys = (body.weakKeys ?? []).slice(0, 8); // cap for prompt cost
  if (weakKeys.length === 0) {
    return NextResponse.json(
      { error: 'no_weak_keys', message: 'Bookmark some pairs first or run a self-test.' },
      { status: 400 },
    );
  }

  // For each weak verse, pull its mutashabihat entry + Arabic text of source + similars
  const enriched: Array<{
    key: string;
    arabic: string;
    similarKeys: string[];
    sharedOpening: string;
    difficulty: 'small' | 'medium' | 'large';
  }> = [];

  const allKeysToFetch = new Set<string>();
  const lookups: Array<{
    key: string;
    similarKeys: string[];
    difficulty: 'small' | 'medium' | 'large';
  }> = [];

  for (const key of weakKeys) {
    const [s, a] = key.split(':').map(Number);
    if (!s || !a) continue;
    const entry = getMutashabihatForVerse(s, a);
    if (!entry) continue;
    const similarKeys = entry.similar.map((sim) => sim.key);
    allKeysToFetch.add(key);
    similarKeys.forEach((k) => allKeysToFetch.add(k));
    lookups.push({
      key,
      similarKeys,
      difficulty: classifyDifficulty(similarKeys.length),
    });
  }

  if (lookups.length === 0) {
    return NextResponse.json(
      { error: 'no_mutashabihat', message: 'None of the weak verses are mutashabihat.' },
      { status: 400 },
    );
  }

  const verses = await fetchVerses([...allKeysToFetch]).catch(() => []);
  const byKey = new Map(verses.map((v) => [v.key, v]));

  for (const l of lookups) {
    const src = byKey.get(l.key);
    if (!src?.textUthmani) continue;
    const srcWords = src.textUthmani.split(/\s+/);

    // Compute the longest shared opening among the similars
    let sharedOpening = '';
    for (const simKey of l.similarKeys) {
      const sim = byKey.get(simKey);
      if (!sim?.textUthmani) continue;
      const simWords = sim.textUthmani.split(/\s+/);
      let n = 0;
      while (
        n < srcWords.length &&
        n < simWords.length &&
        normalize(srcWords[n]) === normalize(simWords[n])
      ) {
        n++;
      }
      const opening = srcWords.slice(0, n).join(' ');
      if (opening.length > sharedOpening.length) sharedOpening = opening;
    }

    enriched.push({
      key: l.key,
      arabic: src.textUthmani,
      similarKeys: l.similarKeys,
      sharedOpening,
      difficulty: l.difficulty,
    });
  }

  // Build the prompt
  const promptLines: string[] = [
    'You are a Quran memorisation coach analysing a Hafiz\'s weak mutashabihat list.',
    'They have flagged the following verses as confusing — your job is to find ONE specific pattern across them and give one targeted piece of advice.',
    '',
  ];
  for (const e of enriched) {
    promptLines.push(`- ${e.key} (${e.difficulty}) — "${e.arabic}"`);
    if (e.similarKeys.length > 0) {
      promptLines.push(`    confused with: ${e.similarKeys.join(', ')}`);
    }
    if (e.sharedOpening) {
      promptLines.push(`    shared opening: "${e.sharedOpening}"`);
    }
  }
  promptLines.push(
    '',
    'Look across these and identify:',
    '1. pattern: what they have in common (shared phrase? topic? structure?)',
    '2. focusArea: the specific word/position to focus on to disambiguate',
    '3. practicalTip: one concrete drill they can do today',
    '',
    'Be specific, quote Arabic where helpful, and keep each field to 1-2 sentences. No transliteration.',
  );

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: promptLines.join('\n'),
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      },
    });
    const text = res.text;
    if (!text) throw new Error('Empty Gemini response');
    const parsed = JSON.parse(text) as InsightSchema;
    return NextResponse.json({
      ok: true,
      insight: parsed,
      analysed: enriched.map((e) => ({ key: e.key, sharedOpening: e.sharedOpening })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 502 },
    );
  }
}
