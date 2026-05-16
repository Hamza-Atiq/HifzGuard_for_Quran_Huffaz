import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { collections } from '@/lib/qf-user-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getAccessToken())) {
    return NextResponse.json({ authenticated: false, collections: [] });
  }
  const result = await collections.list();
  if (!result.ok) {
    return NextResponse.json({ authenticated: true, collections: [], reason: result.reason });
  }
  return NextResponse.json({
    authenticated: true,
    collections: result.data.collections ?? result.data.data ?? [],
  });
}

export async function POST(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  const { name, description } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  const result = await collections.create(name, description);
  if (!result.ok) {
    if (result.reason === 'scope_missing') {
      return NextResponse.json({ skipped: true, reason: 'scope_missing' });
    }
    return NextResponse.json(
      { error: result.reason, message: result.message },
      { status: result.status || 500 },
    );
  }
  return NextResponse.json({ ok: true, collection: result.data });
}
