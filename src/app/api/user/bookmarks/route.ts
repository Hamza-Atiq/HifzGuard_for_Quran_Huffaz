import { NextResponse } from 'next/server';
import { addBookmark, listBookmarks } from '@/lib/user-api';
import { getAccessToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getAccessToken())) {
    return NextResponse.json({ authenticated: false, bookmarks: [] });
  }
  try {
    const data = await listBookmarks();
    return NextResponse.json({ authenticated: true, ...data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  try {
    const { verseKey } = await req.json();
    if (!verseKey) {
      return NextResponse.json({ error: 'verseKey required' }, { status: 400 });
    }
    const data = await addBookmark(verseKey);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
