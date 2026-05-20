import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { notes } from '@/lib/qf-user-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ authenticated: false, notes: [] });
  }
  const url = new URL(req.url);
  const result = await notes.list(url.searchParams.get('verseKey') || undefined);
  if (!result.ok) {
    return NextResponse.json({ authenticated: true, notes: [], reason: result.reason });
  }
  return NextResponse.json({
    authenticated: true,
    notes: result.data.notes ?? result.data.data ?? [],
  });
}

export async function POST(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  const { body, verseKey } = await req.json();
  if (!body || !verseKey) {
    return NextResponse.json({ error: 'body + verseKey required' }, { status: 400 });
  }
  const result = await notes.create(body, verseKey);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, message: result.message ?? `HTTP ${result.status}` },
      { status: result.status || 500 },
    );
  }
  return NextResponse.json({ ok: true, note: result.data });
}

export async function DELETE(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  const result = await notes.remove(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, message: result.message },
      { status: result.status || 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
