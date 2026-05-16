import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';

export interface MnemonicInput {
  source: { key: string; arabic: string; translation?: string };
  similars: Array<{ key: string; arabic: string; translation?: string }>;
  needsContext?: boolean;
}

export interface Mnemonic {
  explanation: string;
  memoryTrick: string;
  divergenceWord: string;
  difficultyReason: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    explanation: {
      type: Type.STRING,
      description:
        'A plain-language explanation in 2-3 sentences of why these verses are similar and what each one is actually about. Audience: a Hafiz memorising the Quran.',
    },
    memoryTrick: {
      type: Type.STRING,
      description:
        'A concrete, vivid memory trick / mnemonic that helps the user tell the verses apart. Anchor it to a tangible image, the surah name, or a distinctive Arabic word. 2-4 sentences.',
    },
    divergenceWord: {
      type: Type.STRING,
      description:
        'The specific Arabic word (or short phrase) at which the verses first diverge. Show only the Arabic, no transliteration.',
    },
    difficultyReason: {
      type: Type.STRING,
      description:
        'One sentence explaining why this pair is particularly easy to confuse — e.g. shared opening words, near-identical structure, similar topic.',
    },
  },
  required: ['explanation', 'memoryTrick', 'divergenceWord', 'difficultyReason'],
  propertyOrdering: ['explanation', 'memoryTrick', 'divergenceWord', 'difficultyReason'],
};

function buildPrompt(input: MnemonicInput): string {
  const lines: string[] = [
    'You are a Quran memorisation teacher helping a Hafiz distinguish similar verses (mutashabihat).',
    '',
    'Source verse:',
    `  ${input.source.key} — ${input.source.arabic}`,
  ];
  if (input.source.translation) {
    lines.push(`  Translation: ${input.source.translation}`);
  }
  lines.push('', 'Similar verses the Hafiz confuses it with:');
  for (const s of input.similars) {
    lines.push(`  ${s.key} — ${s.arabic}`);
    if (s.translation) lines.push(`    Translation: ${s.translation}`);
  }
  if (input.needsContext) {
    lines.push(
      '',
      'Note: This mutashabih continues into the next ayah — context from the following verse matters for memorisation.',
    );
  }
  lines.push(
    '',
    'Return JSON with four fields:',
    '- explanation: why these are similar and what each is actually about',
    '- memoryTrick: a vivid, concrete mnemonic to tell them apart',
    '- divergenceWord: the Arabic word where the verses first diverge',
    '- difficultyReason: one sentence on why this pair is hard',
    '',
    'Keep it practical, warm, and respectful. No transliteration. No filler.',
  );
  return lines.join('\n');
}

export async function generateMnemonic(input: MnemonicInput): Promise<Mnemonic> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: buildPrompt(input),
    config: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.8,
    },
  });

  const text = res.text;
  if (!text) throw new Error('Empty response from Gemini');

  let parsed: Mnemonic;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${text.slice(0, 200)}`);
  }
  if (
    !parsed.explanation ||
    !parsed.memoryTrick ||
    !parsed.divergenceWord ||
    !parsed.difficultyReason
  ) {
    throw new Error('Gemini response missing required fields');
  }
  return parsed;
}
