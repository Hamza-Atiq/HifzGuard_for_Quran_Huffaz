import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';
import { streaks } from '@/lib/qf-user-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getAccessToken())) {
    return NextResponse.json({ authenticated: false, streak: null });
  }
  const result = await streaks.list();
  if (!result.ok) {
    return NextResponse.json({
      authenticated: true,
      streak: null,
      reason: result.reason,
    });
  }
  // Normalise across the various shapes QF docs hint at
  const raw = result.data;
  const arr = raw.data ?? [];
  const active = arr.find((s) => s.status === 'active' || !s.endDate);
  const current = active?.days ?? raw.current_streak ?? raw.streak?.days ?? 0;
  const longest =
    raw.longest_streak ??
    arr.reduce((max, s) => Math.max(max, s.days ?? 0), 0);

  return NextResponse.json({
    authenticated: true,
    streak: { current, longest, raw },
  });
}
