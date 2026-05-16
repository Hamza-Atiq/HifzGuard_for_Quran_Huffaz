import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { activityDays } from '@/lib/qf-user-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ authenticated: false, days: [] });
  }
  const url = new URL(req.url);
  const result = await activityDays.list(
    url.searchParams.get('from') || undefined,
    url.searchParams.get('to') || undefined,
  );
  if (!result.ok) {
    return NextResponse.json({
      authenticated: true,
      days: [],
      reason: result.reason,
    });
  }
  return NextResponse.json({
    authenticated: true,
    days: result.data.activity_days ?? result.data.data ?? [],
  });
}

export async function POST(req: Request) {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  const { date, ranges, activityType } = await req.json();
  if (!date || !Array.isArray(ranges)) {
    return NextResponse.json({ error: 'date + ranges[] required' }, { status: 400 });
  }
  const result = await activityDays.log(date, ranges, activityType);
  if (!result.ok) {
    if (result.reason === 'scope_missing') {
      return NextResponse.json({ skipped: true, reason: 'scope_missing' });
    }
    return NextResponse.json(
      { error: result.reason, message: result.message },
      { status: result.status || 500 },
    );
  }
  return NextResponse.json({ ok: true, day: result.data });
}
