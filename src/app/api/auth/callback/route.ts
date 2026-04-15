import { NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/?auth=error`);
  }
  try {
    await exchangeCode(code, state);
    return NextResponse.redirect(`${appUrl}/?auth=success`);
  } catch (err) {
    return NextResponse.redirect(`${appUrl}/?auth=error&msg=${encodeURIComponent((err as Error).message)}`);
  }
}
