import { NextResponse } from 'next/server';
import { getAccessToken, clearSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = await getAccessToken();
  return NextResponse.json({ authenticated: Boolean(token) });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
