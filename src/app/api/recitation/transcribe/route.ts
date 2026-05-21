import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = process.env.HF_RECITATION_MODEL || 'openai/whisper-large-v3-turbo';
const HF_API_URL =
  process.env.HF_INFERENCE_URL ||
  `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

/**
 * Transcribe a short Arabic recitation chunk.
 *
 * Priority: Groq (language + prompt params → no hallucination) → HF (language param only).
 * Client sends the expected verse in the x-verse-text header so we can pass it as
 * initial_prompt / prompt — this primes Whisper to stay in Arabic Quran mode.
 */
export async function POST(req: Request) {
  if (!GROQ_API_KEY && !HF_TOKEN) {
    return NextResponse.json(
      { error: 'No ASR backend configured. Set GROQ_API_KEY or HF_TOKEN in .env.' },
      { status: 503 },
    );
  }

  const contentType = req.headers.get('content-type') || 'audio/webm';
  // Expected verse text — used as initial_prompt to suppress hallucination.
  // Mobile clients (Flutter/Dart) cannot send Arabic in HTTP headers (RFC 7230
  // ASCII-only restriction), so they base64-encode it in x-verse-text-b64.
  // Web clients send it as plain UTF-8 in x-verse-text (browsers handle this).
  const verseTextB64 = req.headers.get('x-verse-text-b64');
  const verseText = verseTextB64
    ? Buffer.from(verseTextB64, 'base64').toString('utf8')
    : (req.headers.get('x-verse-text') || '');

  let bytes: ArrayBuffer;
  try {
    bytes = await req.arrayBuffer();
  } catch (err) {
    return NextResponse.json(
      { error: 'failed to read audio body', message: (err as Error).message },
      { status: 400 },
    );
  }
  if (bytes.byteLength < 1000) {
    return NextResponse.json(
      { error: 'audio chunk too small', size: bytes.byteLength },
      { status: 400 },
    );
  }

  const started = Date.now();

  if (GROQ_API_KEY) {
    return transcribeGroq(bytes, contentType, verseText, started);
  }
  return transcribeHF(bytes, contentType, verseText, started);
}

async function transcribeGroq(
  bytes: ArrayBuffer,
  contentType: string,
  verseText: string,
  started: number,
) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: contentType }), 'audio.webm');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'ar');
  form.append('response_format', 'json');
  // Prompt primes the model to expect Quranic Arabic — drastically reduces
  // hallucinated English words like "Thank you" that vanilla Whisper produces.
  if (verseText) form.append('prompt', verseText);

  let res: Response;
  try {
    res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'groq_unreachable', message: (err as Error).message },
      { status: 502 },
    );
  }

  const durationMs = Date.now() - started;
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return NextResponse.json(
      { error: 'groq_error', status: res.status, message: errText.slice(0, 400), durationMs },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => null)) as { text?: string } | null;
  if (!data || typeof data.text !== 'string') {
    return NextResponse.json(
      { error: 'groq_bad_response', body: data, durationMs },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    text: data.text,
    durationMs,
    model: 'groq/whisper-large-v3-turbo',
  });
}

async function transcribeHF(
  bytes: ArrayBuffer,
  contentType: string,
  verseText: string,
  started: number,
) {
  // HF Inference API supports parameters via JSON body with base64-encoded audio.
  // Sending raw binary loses the ability to specify language/prompt.
  const base64 = Buffer.from(bytes).toString('base64');
  const payload: Record<string, unknown> = {
    inputs: base64,
    parameters: {
      language: 'ar',
      task: 'transcribe',
      ...(verseText ? { initial_prompt: verseText } : {}),
    },
  };

  let hfRes: Response;
  try {
    hfRes = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'hf_unreachable', message: (err as Error).message },
      { status: 502 },
    );
  }

  const durationMs = Date.now() - started;
  if (!hfRes.ok) {
    const errText = await hfRes.text().catch(() => '');
    return NextResponse.json(
      { error: 'hf_error', status: hfRes.status, message: errText.slice(0, 400), durationMs },
      { status: 502 },
    );
  }

  const data = (await hfRes.json().catch(() => null)) as { text?: string } | null;
  if (!data || typeof data.text !== 'string') {
    return NextResponse.json(
      { error: 'hf_bad_response', body: data, durationMs },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, text: data.text, durationMs, model: HF_MODEL });
}
