import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { bookmarks } from '@/lib/qf-user-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getAccessToken())) {
    return NextResponse.json({ authenticated: false, bookmarks: [] });
  }
  const result = await bookmarks.list();
  if (!result.ok) {
    if (result.reason === 'scope_missing') {
      return NextResponse.json({ authenticated: true, bookmarks: [], scopeMissing: true });
    }
    return NextResponse.json(
      { authenticated: true, error: result.reason, message: result.message },
      { status: result.status || 500 },
    );
  }
  const list = result.data.bookmarks ?? result.data.data ?? [];
  return NextResponse.json({ authenticated: true, bookmarks: list });
}

export async function POST(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  const { verseKey } = await req.json();
  if (!verseKey) {
    return NextResponse.json({ error: 'verseKey required' }, { status: 400 });
  }
  const result = await bookmarks.create(verseKey);
  if (!result.ok) {
    if (result.reason === 'scope_missing') {
      return NextResponse.json({ error: 'bookmark scope not granted — re-login required' }, { status: 403 });
    }
    return NextResponse.json(
      { error: result.reason, message: result.message },
      { status: result.status || 500 },
    );
  }
  return NextResponse.json({ ok: true, bookmark: result.data });
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
  const result = await bookmarks.remove(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, message: result.message },
      { status: result.status || 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
