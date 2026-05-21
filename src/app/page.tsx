import Link from 'next/link';
import { getStats } from '@/lib/mutashabihat';
import { AuthBanner } from '@/components/AuthBanner';

export default function HomePage() {
  const stats = getStats();
  return (
    <div className="max-w-6xl mx-auto px-5 py-10 sm:py-16">
      <AuthBanner />

      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto fade-up">
        <span className="badge badge-small mb-5">For Huffaz · By Huffaz</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[color:var(--ink)] leading-tight">
          Master the verses <br className="hidden sm:block" />
          you keep <span className="text-[color:var(--teal)]">confusing</span>.
        </h1>
        <p className="mt-5 text-lg text-[color:var(--ink-muted)] leading-8">
          HifzGuard is your AI-powered companion for Quran memorisation — explore
          the <em>mutashabihat</em>, recite aloud with real-time feedback, test
          yourself, and track every session until your hifz is airtight.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/recite"
            className="px-6 py-3 rounded-full bg-[color:var(--teal)] text-white font-semibold hover:opacity-95 shadow-lg shadow-teal-500/20 transition"
          >
            🎤 Start Reciting →
          </Link>
          <Link
            href="/explorer"
            className="px-6 py-3 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--line)] font-semibold hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
          >
            Explorer
          </Link>
          <Link
            href="/self-test"
            className="px-6 py-3 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--line)] font-semibold hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
          >
            Self-Test
          </Link>
          <Link
            href="/hifz"
            className="px-6 py-3 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--line)] font-semibold hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
          >
            Hifz Tracker
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 max-w-xl mx-auto">
          <Stat n={stats.totalEntries.toLocaleString()} label="entries" />
          <Stat n={stats.totalSimilarPairs.toLocaleString()} label="similar pairs" />
          <Stat n="30" label="parahs covered" />
        </div>
      </section>

      {/* Feature grid */}
      <section className="mt-20">
        <h2 className="text-center text-xl font-bold tracking-tight text-[color:var(--ink-muted)] mb-8 uppercase text-xs tracking-widest">
          Everything you need to perfect your hifz
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature
            icon="🎤"
            title="Recitation Mode"
            desc="Recite any parah aloud and get word-by-word live feedback. The app follows you in real time, highlights mistakes, and beeps if you drift into a similar verse."
            href="/recite"
            highlight
          />
          <Feature
            icon="📖"
            title="Hifz Tracker"
            desc="Mark parahs as memorised, in-progress, or not started. See your 30-parah progress at a glance and set daily revision goals."
            href="/hifz"
            highlight
          />
          <Feature
            icon="🕌"
            title="Mushaf View"
            desc="Read the Quran page-by-page exactly like your printed mushaf. Mutashabihat verses are colour-coded — tap any word to see its similar counterparts."
            href="/mushaf"
          />
          <Feature
            icon="🔍"
            title="Mutashabihat Explorer"
            desc="Browse every similar-verse pair in any parah. Compare them side-by-side with word-level diff highlighting so you know exactly where they diverge."
            href="/explorer"
          />
          <Feature
            icon="📚"
            title="Parah Revision"
            desc="Walk verse-by-verse through a parah. Get a heads-up the moment you reach a verse with similar siblings — never get caught off guard mid-salah."
            href="/revision"
          />
          <Feature
            icon="🧠"
            title="Self-Test"
            desc="Quiz yourself on which mutashabih is which. Wrong answers are auto-bookmarked and appear in your Dashboard as weak verses to revisit."
            href="/self-test"
          />
        </div>
      </section>

      {/* How recitation works */}
      <section className="mt-20 card p-8 sm:p-10 bg-gradient-to-br from-teal-50/60 to-transparent dark:from-teal-950/20">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--teal)]">
            How it works
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            AI-powered recitation checking
          </h2>
          <p className="mt-4 text-[color:var(--ink-muted)] leading-7">
            Open any parah, tap the mic, and recite. Your voice is transcribed in
            real time using Arabic speech recognition. Each word lights up green as
            you match it. If you skip a word, the wrong word glows red. If you start
            reciting a similar verse by mistake, a drift alert fires — the same
            protection a <em>sami</em> provides, available 24/7.
          </p>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <HowStep n="1" label="Pick a parah" desc="Choose any of the 30 parahs to recite from." />
            <HowStep n="2" label="Recite aloud" desc="Tap the mic and recite at your natural pace." />
            <HowStep n="3" label="Get feedback" desc="Words highlight live; mistakes beep; drift alerts catch similar-verse confusion." />
          </div>
          <div className="mt-6">
            <Link
              href="/recite"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[color:var(--teal)] text-white font-semibold hover:opacity-95 transition shadow-lg shadow-teal-500/20"
            >
              🎤 Try it now →
            </Link>
          </div>
        </div>
      </section>

      {/* Hifz tracker CTA */}
      <section className="mt-10 card p-8 sm:p-10">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--teal)]">
            Track your journey
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            Know exactly where you stand in your hifz
          </h2>
          <p className="mt-4 text-[color:var(--ink-muted)] leading-7">
            Mark each parah as memorised, currently revising, or not yet started.
            Your dashboard shows a 30-parah heatmap, your daily streak, and the
            weak mutashabihat pairs you&apos;ve bookmarked — so every revision
            session has a clear focus.
          </p>
          <div className="mt-6 flex gap-3 flex-wrap">
            <Link
              href="/hifz"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[color:var(--teal)] text-white font-semibold hover:opacity-95 transition"
            >
              📖 Open Hifz Tracker →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--line)] font-semibold hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
            >
              Dashboard →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-[color:var(--teal)]">{n}</div>
      <div className="text-xs uppercase tracking-wider text-[color:var(--ink-muted)] mt-1">
        {label}
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
  href,
  highlight,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card p-6 hover:border-[color:var(--teal)] transition group ${
        highlight ? 'border-[color:var(--teal)]/40 bg-teal-50/30 dark:bg-teal-950/10' : ''
      }`}
    >
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2 group-hover:text-[color:var(--teal)] transition">
        {title}
      </h3>
      <p className="text-sm text-[color:var(--ink-muted)] leading-6">{desc}</p>
      <div className="mt-4 text-sm text-[color:var(--teal)] font-semibold">Open →</div>
    </Link>
  );
}

function HowStep({ n, label, desc }: { n: string; label: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-[color:var(--teal)] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-[color:var(--ink-muted)] mt-0.5 leading-5">{desc}</div>
      </div>
    </div>
  );
}
