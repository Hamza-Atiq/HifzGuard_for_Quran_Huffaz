import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

// GET variant used by the dashboard "Sign out & re-login" button:
// clears the session cookie then redirects straight to the OAuth login flow.
export async function GET() {
  await clearSession();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${appUrl}/api/auth/login`);
}
