'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import MushafPage from '@/components/MushafPage';
import MushafComparePanel from '@/components/MushafComparePanel';

const PARAH_START_PAGES: number[] = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

interface Comparison {
  sourceKey: string;
  similarKey: string;
}

export default function MushafView() {
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [parah, setParah] = useState(1);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const comparePanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    for (let i = PARAH_START_PAGES.length - 1; i >= 0; i--) {
      if (page >= PARAH_START_PAGES[i]) {
        setParah(i + 1);
        break;
      }
    }
    setPageInput(String(page));
  }, [page]);

  function goToPage(p: number) {
    setPage(Math.max(1, Math.min(604, p)));
  }

  function handlePageInputSubmit() {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n)) goToPage(n);
  }

  function handleParahChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = parseInt(e.target.value, 10);
    setParah(p);
    goToPage(PARAH_START_PAGES[p - 1]);
  }

  const handleSelectSimilar = useCallback((sourceKey: string, similarKey: string) => {
    setComparison({ sourceKey, similarKey });
    // Auto-scroll: on desktop scroll left panel to top; on mobile scroll page to comparison
    requestAnimationFrame(() => {
      if (window.innerWidth >= 1024) {
        leftPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        comparePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, []);

  // Match left panel max-height to right panel height
  useEffect(() => {
    const right = rightPanelRef.current;
    const left = leftPanelRef.current;
    if (!right || !left) return;
    const observer = new ResizeObserver(([entry]) => {
      left.style.maxHeight = `${entry.contentRect.height}px`;
    });
    observer.observe(right);
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPage(page - 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToPage(page + 1);
      } else if (e.key === 'Escape') {
        setComparison(null);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [page]);

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-5 fade-up">
        <h1 className="text-2xl font-bold text-[color:var(--ink)]">Mushaf View</h1>
        <p className="text-sm text-[color:var(--ink-muted)] mt-1">
          Tap colored words to compare with similar verses side-by-side.
        </p>
      </div>

      {/* Split layout */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* LEFT PANEL — controls + comparison */}
        <div
          ref={leftPanelRef}
          className="lg:w-[420px] shrink-0 space-y-4 lg:sticky lg:top-20 lg:self-start lg:overflow-y-auto lg:max-h-[calc(100vh-6rem)]"
        >
          {/* Controls card */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[color:var(--ink)]">Navigation</h2>

            {/* Parah selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-[color:var(--ink-muted)] w-12">Parah</label>
              <select
                value={parah}
                onChange={handleParahChange}
                title="Select Parah"
                className="flex-1 px-3 py-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--bg)] text-sm focus:outline-none focus:border-[color:var(--teal)]"
              >
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Parah {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Page input */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-[color:var(--ink-muted)] w-12">Page</label>
              <input
                type="number"
                min={1}
                max={604}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
                onBlur={handlePageInputSubmit}
                title="Page number"
                placeholder="Page"
                className="w-20 px-3 py-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--bg)] text-sm text-center focus:outline-none focus:border-[color:var(--teal)]"
              />
              <span className="text-xs text-[color:var(--ink-muted)]">/ 604</span>
              <div className="flex gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--bg)] text-sm hover:border-[color:var(--teal)] transition disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= 604}
                  className="px-3 py-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--bg)] text-sm hover:border-[color:var(--teal)] transition disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Color legend */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-[color:var(--line)] text-xs text-[color:var(--ink-muted)]">
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 bg-emerald-700" />
                1 similar
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 bg-amber-700" />
                2-3 similar
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 bg-rose-700" />
                4+ similar
              </span>
            </div>

            <p className="text-xs text-[color:var(--ink-muted)]">
              Arrow keys to navigate pages · Esc to close comparison
            </p>
          </div>

          {/* Comparison panel */}
          <div ref={comparePanelRef}>
          {comparison ? (
            <MushafComparePanel
              sourceKey={comparison.sourceKey}
              similarKey={comparison.similarKey}
              onClose={() => setComparison(null)}
            />
          ) : (
            <div className="card p-6 text-center">
              <div className="text-3xl mb-3 opacity-30">☝</div>
              <p className="text-sm text-[color:var(--ink-muted)]">
                Tap a colored word in the mushaf to see its similar verses compared here with word-level highlighting.
              </p>
            </div>
          )}
          </div>
        </div>

        {/* RIGHT PANEL — mushaf page */}
        <div ref={rightPanelRef} className="flex-1 min-w-0 overflow-hidden">
          <MushafPage pageNumber={page} onSelectSimilar={handleSelectSimilar} />

          {/* Bottom navigation */}
          <div className="flex items-center justify-between mt-5">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-5 py-2.5 rounded-full border border-[color:var(--line)] bg-[color:var(--bg-card)] text-sm font-medium hover:border-[color:var(--teal)] hover:text-[color:var(--teal)] transition disabled:opacity-30"
            >
              Previous Page
            </button>
            <span className="text-sm text-[color:var(--ink-muted)]">Page {page}</span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= 604}
              className="px-5 py-2.5 rounded-full bg-[color:var(--teal)] text-white text-sm font-medium hover:opacity-95 transition disabled:opacity-30"
            >
              Next Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
