import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_COOKIE = 'qf_access_token';
const REFRESH_COOKIE = 'qf_refresh_token';

// Delete cookies via NextResponse — cookies().delete() in Route Handlers does
// not reliably emit Set-Cookie headers; setting on the response object does.
function deleteCookies(res: NextResponse): NextResponse {
  res.cookies.set(TOKEN_COOKIE, '', { maxAge: 0, path: '/', httpOnly: true, sameSite: 'lax' });
  res.cookies.set(REFRESH_COOKIE, '', { maxAge: 0, path: '/', httpOnly: true, sameSite: 'lax' });
  return res;
}

export async function POST() {
  return deleteCookies(NextResponse.json({ ok: true }));
}

// GET: clears session then redirects to login (used by dashboard re-login button).
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return deleteCookies(NextResponse.redirect(`${appUrl}/api/auth/login`));
}
