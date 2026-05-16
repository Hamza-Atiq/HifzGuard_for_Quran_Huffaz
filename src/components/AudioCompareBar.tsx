'use client';
import { RECITERS } from '@/lib/audio';
import { useAudioCompare, useReciterPreference } from '@/lib/use-audio-compare';

interface Props {
  /** All verses involved in this mutashabih pair, in compare order (source first). */
  verseKeys: string[];
}

const RATE_OPTIONS = [0.5, 0.75, 1, 1.25];

export default function AudioCompareBar({ verseKeys }: Props) {
  const [reciterId, setReciterId] = useReciterPreference();
  const audio = useAudioCompare(reciterId);
  const isPlaying = audio.state === 'playing';

  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-card)]/60 p-3 mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="text-[10px] uppercase tracking-wider font-bold text-[color:var(--ink-muted)] mr-1">
        🔊 Audio
      </span>

      {/* Qari selector */}
      <select
        value={reciterId}
        onChange={(e) => {
          audio.stop();
          setReciterId(e.target.value);
        }}
        className="text-xs bg-[color:var(--bg)] border border-[color:var(--line)] rounded-full px-3 py-1.5 focus:outline-none focus:border-[color:var(--teal)] cursor-pointer max-w-[180px]"
        aria-label="Choose Qari"
      >
        {RECITERS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      {/* Speed control */}
      <div className="flex items-center gap-0.5 bg-[color:var(--bg)] border border-[color:var(--line)] rounded-full p-0.5">
        {RATE_OPTIONS.map((r) => (
          <button
            key={r}
            onClick={() => audio.setRate(r)}
            className={`text-[11px] px-2 py-1 rounded-full transition ${
              audio.rate === r
                ? 'bg-[color:var(--teal)] text-white'
                : 'text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]'
            }`}
            title={`${r}× playback`}
          >
            {r}×
          </button>
        ))}
      </div>

      {/* Per-verse play buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {verseKeys.map((key, i) => {
          const active = isPlaying && audio.currentKey === key;
          return (
            <button
              key={key}
              onClick={() => (active ? audio.stop() : audio.playOne(key))}
              className={`text-[11px] px-2.5 py-1.5 rounded-full font-semibold transition ${
                active
                  ? 'bg-emerald-500 text-white animate-pulse'
                  : 'border border-[color:var(--line)] hover:border-[color:var(--teal)] hover:text-[color:var(--teal)]'
              }`}
              title={`Play ${key}`}
            >
              {active ? '⏹' : '▶'} {i === 0 ? 'A' : `B${verseKeys.length > 2 ? i : ''}`} · {key}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {isPlaying ? (
          <button
            onClick={audio.stop}
            className="text-xs px-3 py-1.5 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 transition"
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            onClick={() => audio.playSequence(verseKeys, 600)}
            className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--teal)] text-white font-semibold hover:opacity-95 transition"
          >
            ▶ Play A → {verseKeys.length === 2 ? 'B' : 'all'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Small inline indicator showing whether a particular verse is currently playing.
 * Use inside DiffHighlighter rows so the active side pulses.
 */
export function CurrentlyPlayingDot({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 animate-pulse">
      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
      Playing
    </span>
  );
}
