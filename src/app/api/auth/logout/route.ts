import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_COOKIE = 'qf_access_token';
const REFRESH_COOKIE = 'qf_refresh_token';

// Must match EVERY attribute used when the cookie was originally set
// (httpOnly, sameSite, secure, path) — browsers treat any mismatch as a
// different cookie and the original stays alive.
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

function deleteCookies(res: NextResponse): NextResponse {
  res.cookies.set(TOKEN_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 });
  return res;
}

// POST: called by programmatic sign-out; returns JSON so callers can check ok.
export async function POST() {
  return deleteCookies(NextResponse.json({ ok: true }));
}

// GET: used by "Sign out" nav link and dashboard "re-login" button.
// Redirects to home (NOT login) so the user lands signed-out and can choose
// when to sign back in. Auto-redirecting to login looks like sign-out failed
// when the OAuth provider still has a live session and logs them in instantly.
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return deleteCookies(NextResponse.redirect(`${appUrl}/?signed_out=1`));
}
