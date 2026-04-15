import { NextResponse } from 'next/server';
import { buildLoginUrl } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = await buildLoginUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
