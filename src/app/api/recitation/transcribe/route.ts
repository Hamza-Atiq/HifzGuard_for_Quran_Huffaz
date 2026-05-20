import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// `tarteel-ai/whisper-base-ar-quran` (the Quran-specialised model) is NOT
// deployed by any HF Inference Provider — only available via local Transformers
// or self-hosting. We use `whisper-large-v3-turbo` instead: served on the
// hf-inference provider, handles Arabic recitation well (Whisper was trained
// on multilingual data including Arabic), and is fast enough for chunked
// recognition. Set HF_RECITATION_MODEL env to override if/when Tarteel ships
// a provider-served variant.
const HF_MODEL = process.env.HF_RECITATION_MODEL || 'openai/whisper-large-v3-turbo';
const HF_API_URL =
  process.env.HF_INFERENCE_URL ||
  `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

/**
 * Transcribe a short Arabic recitation chunk via Hugging Face Inference API.
 *
 * The model is fine-tuned on Quranic Arabic so it handles tashkeel + tajweed
 * style recitation far better than vanilla Whisper. We do text-based fuzzy
 * matching against the expected verse on the client (see recitation-matcher).
 *
 * Returns: { text, durationMs }
 */
export async function POST(req: Request) {
  const token = process.env.HF_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'HF_TOKEN not configured on server' },
      { status: 503 },
    );
  }

  const contentType = req.headers.get('content-type') || 'audio/webm';
  // Read raw audio bytes from the request body. The browser sends Blob data
  // directly with the appropriate audio MIME type (webm/opus on Chrome).
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
  let hfRes: Response;
  try {
    hfRes = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
        // Tell HF to wait if the model is cold-starting instead of 503'ing
        'x-wait-for-model': 'true',
      },
      body: bytes,
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
      {
        error: 'hf_error',
        status: hfRes.status,
        message: errText.slice(0, 400),
        durationMs,
      },
      { status: 502 },
    );
  }

  const data = (await hfRes.json().catch(() => null)) as
    | { text?: string }
    | null
    | { error?: string };
  if (!data || typeof (data as { text?: string }).text !== 'string') {
    return NextResponse.json(
      { error: 'hf_bad_response', body: data, durationMs },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    text: (data as { text: string }).text,
    durationMs,
    model: HF_MODEL,
  });
}
