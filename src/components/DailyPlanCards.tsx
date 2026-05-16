'use client';
import Link from 'next/link';
import type { DailyPlan } from '@/lib/hifz-plan';

interface Props {
  plan: DailyPlan;
  onSetSabaq: () => void;
}

export default function DailyPlanCards({ plan, onSetSabaq }: Props) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <PlanCard
        title="Sabaq"
        subtitle="New lesson"
        accent="from-teal-500 to-emerald-500"
        parah={plan.sabaq?.parah ?? null}
        reason={plan.sabaq?.reason ?? null}
        emptyAction={
          <button
            onClick={onSetSabaq}
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--line)] hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
          >
            Pick a sabaq parah
          </button>
        }
      />
      <PlanCard
        title="Sabqi"
        subtitle="Recent revision"
        accent="from-amber-500 to-orange-500"
        items={plan.sabqi.map((s) => ({
          parah: s.parah,
          subline: s.reason,
        }))}
      />
      <PlanCard
        title="Manzil"
        subtitle="Long-term rotation"
        accent="from-violet-500 to-fuchsia-500"
        parah={plan.manzil?.parah ?? null}
        reason={plan.manzil?.reason ?? null}
      />
    </div>
  );
}

interface PlanCardProps {
  title: string;
  subtitle: string;
  accent: string;
  parah?: number | null;
  reason?: string | null;
  items?: { parah: number; subline: string }[];
  emptyAction?: React.ReactNode;
}

function PlanCard({ title, subtitle, accent, parah, reason, items, emptyAction }: PlanCardProps) {
  const hasContent = (items && items.length > 0) || (parah != null);
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <span className="text-[10px] uppercase tracking-wider text-[color:var(--ink-muted)] font-semibold">
          {subtitle}
        </span>
      </div>

      {!hasContent && (
        <div className="text-sm text-[color:var(--ink-muted)] py-4">
          {emptyAction ?? <span>Nothing to revise yet — mark parahs as memorized below.</span>}
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.parah}>
              <PlanRow parah={it.parah} reason={it.subline} />
            </li>
          ))}
        </ul>
      )}

      {parah != null && !items && (
        <PlanRow parah={parah} reason={reason ?? ''} />
      )}
    </div>
  );
}

function PlanRow({ parah, reason }: { parah: number; reason: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-2xl font-bold text-[color:var(--teal)]">
          Parah {parah}
        </span>
        <Link
          href={`/revision?parah=${parah}`}
          className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--teal)] text-white hover:opacity-95 transition whitespace-nowrap"
        >
          Start →
        </Link>
      </div>
      {reason && (
        <p className="text-xs text-[color:var(--ink-muted)] leading-5">{reason}</p>
      )}
    </div>
  );
}
