import rawData from '@/data/mutashabihat_data.json';
import { absoluteToSurahAyah, makeKey, PARAH_RANGES } from './constants';
import type { MutashabihEntry, VerseRef } from '@/types';

/**
 * Source data is keyed by parah number (1..30):
 *   { "1": [ { src: { ayah: <abs> }, muts: [{ ayah: <abs> }, ...], ctx?: number }, ... ], ... }
 *
 * `ayah` values are ABSOLUTE ayah numbers, not relative to a surah.
 * `ctx` (when present) means the entry needs neighbouring ayah(s) for the comparison
 * to be meaningful — e.g. two verses are identical but their continuations differ.
 *
 * The bundled JSON was generated with 0-based absolute numbering (Fatiha 1:1 = 0),
 * so every raw value is one less than the spec's 1-based scheme. We add 1 on load
 * to align with Waqar144's `N.txt` line format and the Content API.
 */
type RawEntry = {
  src: { ayah: number };
  muts: Array<{ ayah: number }>;
  ctx?: number;
};
type RawData = Record<string, RawEntry[]>;

const data = rawData as RawData;

function toRef(rawAbsolute: number): VerseRef {
  const { surah, ayah } = absoluteToSurahAyah(rawAbsolute + 1);
  return { surah, ayah, key: makeKey(surah, ayah) };
}

function rawToEntry(raw: RawEntry, parah: number): MutashabihEntry {
  return {
    src: toRef(raw.src.ayah),
    similar: raw.muts.map((m) => toRef(m.ayah)),
    needsContext: raw.ctx !== undefined && raw.ctx > 0,
    parah,
  };
}

let _all: MutashabihEntry[] | null = null;
function loadAll(): MutashabihEntry[] {
  if (_all) return _all;
  const out: MutashabihEntry[] = [];
  for (const parahKey of Object.keys(data)) {
    const parah = parseInt(parahKey, 10);
    for (const raw of data[parahKey]) {
      out.push(rawToEntry(raw, parah));
    }
  }
  _all = out;
  return out;
}

export function getMutashabihatByParah(parah: number): MutashabihEntry[] {
  const arr = data[String(parah)] || [];
  return arr.map((raw) => rawToEntry(raw, parah));
}

export function getMutashabihatBySurah(surah: number): MutashabihEntry[] {
  return loadAll().filter((e) => e.src.surah === surah);
}

export function getMutashabihatForVerse(surah: number, ayah: number): MutashabihEntry | null {
  return loadAll().find((e) => e.src.surah === surah && e.src.ayah === ayah) || null;
}

/** Map of surah:ayah → entry (for quick lookups during revision). */
let _byKey: Map<string, MutashabihEntry> | null = null;
export function getMutashabihatMap(): Map<string, MutashabihEntry> {
  if (_byKey) return _byKey;
  const m = new Map<string, MutashabihEntry>();
  for (const e of loadAll()) {
    m.set(e.src.key, e);
  }
  _byKey = m;
  return m;
}

export function getStats() {
  const all = loadAll();
  return {
    totalEntries: all.length,
    totalSimilarPairs: all.reduce((sum, e) => sum + e.similar.length, 0),
    perParah: PARAH_RANGES.map((_, i) => (data[String(i + 1)] || []).length),
  };
}

export function classifyDifficulty(similarCount: number): 'small' | 'medium' | 'large' {
  if (similarCount >= 4) return 'large';
  if (similarCount >= 2) return 'medium';
  return 'small';
}
