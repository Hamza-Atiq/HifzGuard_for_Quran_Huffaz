import Link from 'next/link';
import { getStats } from '@/lib/mutashabihat';

export default function HomePage() {
  const stats = getStats();
  return (
    <div className="max-w-6xl mx-auto px-5 py-10 sm:py-16">
      <section className="text-center max-w-3xl mx-auto fade-up">
        <span className="badge badge-small mb-5">For Huffaz · By Huffaz</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[color:var(--ink)] leading-tight">
          Master the verses <br className="hidden sm:block" />
          you keep <span className="text-[color:var(--teal)]">confusing</span>.
        </h1>
        <p className="mt-5 text-lg text-[color:var(--ink-muted)] leading-8">
          HifzGuard is a digital companion built around the <em>mutashabihat</em> — the similar
          verses scattered through the Quran that trip up every Hafiz. Browse them by parah,
          compare them side-by-side with word-level highlights, and revise without needing a sami.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/mushaf"
            className="px-6 py-3 rounded-full bg-[color:var(--teal)] text-white font-semibold hover:opacity-95 shadow-lg shadow-teal-500/20 transition"
          >
            Open Mushaf →
          </Link>
          <Link
            href="/explorer"
            className="px-6 py-3 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--line)] font-semibold hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
          >
            Explorer
          </Link>
          <Link
            href="/revision"
            className="px-6 py-3 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--line)] font-semibold hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition"
          >
            Start Revision
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 max-w-xl mx-auto">
          <Stat n={stats.totalEntries.toLocaleString()} label="entries" />
          <Stat n={stats.totalSimilarPairs.toLocaleString()} label="similar pairs" />
          <Stat n="30" label="parahs covered" />
        </div>
      </section>

      <section className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Feature
          title="Mushaf View"
          desc="Read the Quran page-by-page exactly like your printed mushaf. Mutashabihat verses are color-coded — tap any colored word to see its similar verses."
          href="/mushaf"
        />
        <Feature
          title="Mutashabihat Explorer"
          desc="Browse every similar-verse pair in any parah or surah. Tap to compare side-by-side with word-level diff highlighting."
          href="/explorer"
        />
        <Feature
          title="Parah Revision Mode"
          desc="Walk verse-by-verse through a parah. Get a heads-up the moment you reach a verse with similar siblings — never get caught off guard."
          href="/revision"
        />
        <Feature
          title="Self-Test"
          desc="Quiz yourself on which mutashabih is which. Wrong answers auto-bookmark for review next time."
          href="/self-test"
        />
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

function Feature({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="card p-6 hover:border-[color:var(--teal)] transition group">
      <h3 className="font-semibold text-lg mb-2 group-hover:text-[color:var(--teal)] transition">
        {title}
      </h3>
      <p className="text-sm text-[color:var(--ink-muted)] leading-6">{desc}</p>
      <div className="mt-4 text-sm text-[color:var(--teal)] font-semibold">Open →</div>
    </Link>
  );
}
