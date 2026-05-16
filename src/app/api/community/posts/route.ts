import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { posts } from '@/lib/qf-user-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/community/posts?verseKey=2:14
 *
 * Returns community reflections from QuranReflect filtered by the given verse
 * reference. Anyone can read (even signed-out users will see the public feed),
 * but if the user is signed-out the QF endpoint may 401 — we return an empty
 * list in that case so the UI shows the "sign in to contribute" state cleanly.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const verseKey = url.searchParams.get('verseKey');
  const tag = url.searchParams.get('tag');
  if (!verseKey) {
    return NextResponse.json({ posts: [], error: 'verseKey required' }, { status: 400 });
  }

  // Allow anonymous browse — but use the user's auth if present
  if (!(await getAccessToken())) {
    return NextResponse.json({
      authenticated: false,
      posts: [],
      message: 'Sign in to view community tips for this verse.',
    });
  }

  const result = await posts.feed({
    references: [verseKey],
    tags: tag ? [tag] : undefined,
  });
  if (!result.ok) {
    return NextResponse.json(
      {
        authenticated: true,
        posts: [],
        reason: result.reason,
        message: result.message,
      },
      { status: result.status === 403 ? 200 : result.status || 500 },
    );
  }
  return NextResponse.json({
    authenticated: true,
    posts: result.data.posts ?? result.data.data ?? [],
  });
}

/**
 * POST /api/community/posts
 * Body: { body: string, verseKey: string, tags?: string[] }
 */
export async function POST(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  const { body, verseKey, tags } = await req.json();
  if (!body || !verseKey) {
    return NextResponse.json(
      { error: 'body + verseKey required' },
      { status: 400 },
    );
  }
  const defaultTags = ['mutashabihat', 'memorytrick', 'hifztip'];
  const finalTags = Array.isArray(tags) && tags.length ? tags : defaultTags;

  const result = await posts.create(body, [verseKey], finalTags);
  if (!result.ok) {
    if (result.reason === 'scope_missing') {
      return NextResponse.json(
        { error: 'post scope not yet enabled on your account' },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: result.reason, message: result.message },
      { status: result.status || 500 },
    );
  }
  return NextResponse.json({ ok: true, post: result.data });
}
