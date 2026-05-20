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
    'Return JSON with exactly four fields:',
    '- explanation: why these are similar and what each is actually about (2-3 sentences)',
    '- memoryTrick: a vivid, concrete mnemonic to tell them apart (2-4 sentences)',
    '- divergenceWord: the Arabic word where the verses first diverge (Arabic only, no transliteration)',
    '- difficultyReason: one sentence on why this pair is hard',
    '',
    'Keep it practical, warm, and respectful. No transliteration. No filler.',
  );
  return lines.join('\n');
}

function validateMnemonic(parsed: unknown): Mnemonic {
  const m = parsed as Mnemonic;
  if (!m.explanation || !m.memoryTrick || !m.divergenceWord || !m.difficultyReason) {
    throw new Error('AI response missing required fields');
  }
  return m;
}

async function generateMnemonicGemini(input: MnemonicInput): Promise<Mnemonic> {
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
  return validateMnemonic(JSON.parse(text));
}

async function generateMnemonicGroq(input: MnemonicInput): Promise<Mnemonic> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_LLM_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a Quran memorisation expert. Always reply with valid JSON only.' },
        { role: 'user', content: buildPrompt(input) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Groq API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');
  return validateMnemonic(JSON.parse(text));
}

export async function generateMnemonic(input: MnemonicInput): Promise<Mnemonic> {
  // Try Gemini first; if it fails (rate limit, quota, etc.) fall back to Groq Llama.
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateMnemonicGemini(input);
    } catch (err) {
      console.warn('[ai-mnemonic] Gemini failed, falling back to Groq:', (err as Error).message);
    }
  }
  return generateMnemonicGroq(input);
}
