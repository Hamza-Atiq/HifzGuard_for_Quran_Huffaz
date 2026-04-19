'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/mushaf', label: 'Mushaf' },
  { href: '/explorer', label: 'Explorer' },
  { href: '/revision', label: 'Revision' },
  { href: '/self-test', label: 'Self-Test' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('hifzguard-theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('hifzguard-theme', next ? 'dark' : 'light');
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-[color:var(--bg)]/85 border-b border-[color:var(--line)]">
      <nav className="max-w-6xl mx-auto px-2 sm:px-5 py-3 flex items-center justify-between gap-1 sm:gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg shrink-0">
          <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[color:var(--teal)] text-white shadow-md text-sm sm:text-base">
            ﷽
          </span>
          <span className="hidden sm:inline">HifzGuard</span>
        </Link>

        <ul className="flex items-center gap-0.5 sm:gap-2 min-w-0">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname?.startsWith(l.href));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`px-2 sm:px-3 py-1.5 text-[12px] sm:text-sm rounded-full transition whitespace-nowrap ${
                    active
                      ? 'bg-[color:var(--teal)] text-white shadow-sm'
                      : 'text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--line)]/50'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          onClick={toggleDark}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[color:var(--line)] flex items-center justify-center hover:bg-[color:var(--line)]/50 transition shrink-0"
          aria-label="Toggle dark mode"
        >
          {dark ? '☾' : '☀'}
        </button>
      </nav>
    </header>
  );
}
