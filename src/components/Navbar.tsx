'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/use-auth';

const links = [
  { href: '/', label: 'Home' },
  { href: '/mushaf', label: 'Mushaf' },
  { href: '/explorer', label: 'Explorer' },
  { href: '/revision', label: 'Revision' },
  { href: '/recite', label: 'Recite' },
  { href: '/hifz', label: 'Hifz' },
  { href: '/self-test', label: 'Self-Test' },
  { href: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const auth = useAuth();

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
      <nav className="max-w-6xl mx-auto px-2 sm:px-5 py-3 flex items-center justify-between gap-1 sm:gap-3">
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

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Streak chip — only shown when authenticated and current > 0 */}
          {auth.authenticated && auth.current > 0 && (
            <div
              title={`Current streak: ${auth.current} day${auth.current === 1 ? '' : 's'} · Longest: ${auth.longest}`}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-semibold"
            >
              <span>🔥</span>
              <span>{auth.current}</span>
            </div>
          )}

          {/* Auth button */}
          {auth.authenticated === null ? (
            <span className="w-8 h-8 sm:w-9 sm:h-9" />
          ) : auth.authenticated ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="px-2.5 sm:px-3 py-1.5 rounded-full bg-[color:var(--teal)] text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition"
                aria-label="Account menu"
              >
                ✓ Signed in
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-card)] shadow-lg overflow-hidden text-sm">
                  <a
                    href="/api/auth/logout"
                    className="block w-full text-left px-4 py-2 hover:bg-[color:var(--line)]/40"
                  >
                    Sign out
                  </a>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={auth.signIn}
              className="px-2.5 sm:px-3 py-1.5 rounded-full border border-[color:var(--line)] text-xs sm:text-sm font-semibold hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition whitespace-nowrap"
            >
              Sign in
            </button>
          )}

          <button
            onClick={toggleDark}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[color:var(--line)] flex items-center justify-center hover:bg-[color:var(--line)]/50 transition shrink-0"
            aria-label="Toggle dark mode"
          >
            {dark ? '☾' : '☀'}
          </button>
        </div>
      </nav>
    </header>
  );
}
