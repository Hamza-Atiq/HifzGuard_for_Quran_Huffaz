import { NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const oauthErrorDescription = url.searchParams.get('error_description');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (oauthError) {
    const msg = `${oauthError}: ${oauthErrorDescription ?? ''}`.trim();
    return NextResponse.redirect(`${appUrl}/?auth=error&msg=${encodeURIComponent(msg)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/?auth=error&msg=${encodeURIComponent('no code or state returned from OAuth provider')}`);
  }
  try {
    await exchangeCode(code, state);
    return NextResponse.redirect(`${appUrl}/?auth=success`);
  } catch (err) {
    return NextResponse.redirect(`${appUrl}/?auth=error&msg=${encodeURIComponent((err as Error).message)}`);
  }
}
