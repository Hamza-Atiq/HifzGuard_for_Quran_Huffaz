import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'HifzGuard — Mutashabihat Hifz Companion',
  description:
    'A modern companion for huffaz: spot, study and master the similar verses (mutashabihat) of the Quran.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[color:var(--line)] py-6 text-center text-sm text-[color:var(--ink-muted)]">
            HifzGuard · Built for the Quran Foundation Hackathon · Verses by{' '}
            <a className="underline hover:text-[color:var(--teal)]" href="https://quran.com" target="_blank" rel="noreferrer">
              quran.com
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
