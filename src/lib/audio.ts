/**
 * Verse audio via the everyayah.com CDN — public, reliable, no auth required.
 * Each reciter is a fixed folder with one MP3 per ayah named `{surah:03}{ayah:03}.mp3`.
 */

export interface Reciter {
  id: string;
  name: string;
  arabicName?: string;
  folder: string;
  bitrate: string;
}

export const RECITERS: Reciter[] = [
  {
    id: 'mishary',
    name: 'Mishary Al-Afasy',
    arabicName: 'مشاري العفاسي',
    folder: 'Alafasy_128kbps',
    bitrate: '128',
  },
  {
    id: 'husary',
    name: 'Mahmoud Al-Husary',
    arabicName: 'محمود الحصري',
    folder: 'Husary_128kbps',
    bitrate: '128',
  },
  {
    id: 'husary-mujawwad',
    name: 'Al-Husary (Mujawwad)',
    arabicName: 'الحصري مجود',
    folder: 'Husary_Mujawwad_64kbps',
    bitrate: '64',
  },
  {
    id: 'abdulbasit',
    name: 'Abdul Basit (Murattal)',
    arabicName: 'عبد الباسط مرتل',
    folder: 'Abdul_Basit_Murattal_64kbps',
    bitrate: '64',
  },
  {
    id: 'abdulbasit-mujawwad',
    name: 'Abdul Basit (Mujawwad)',
    arabicName: 'عبد الباسط مجود',
    folder: 'Abdul_Basit_Mujawwad_128kbps',
    bitrate: '128',
  },
  {
    id: 'shuraim',
    name: 'Saud Al-Shuraim',
    arabicName: 'سعود الشريم',
    folder: 'Saood_ash-Shuraym_128kbps',
    bitrate: '128',
  },
  {
    id: 'sudais',
    name: 'Abdul Rahman Al-Sudais',
    arabicName: 'عبد الرحمن السديس',
    folder: 'Abdurrahmaan_As-Sudais_192kbps',
    bitrate: '192',
  },
  {
    id: 'maher',
    name: 'Maher Al-Muaiqly',
    arabicName: 'ماهر المعيقلي',
    folder: 'MaherAlMuaiqly128kbps',
    bitrate: '128',
  },
];

const DEFAULT_RECITER_ID = 'mishary';

export function getReciter(id: string | undefined | null): Reciter {
  return (
    RECITERS.find((r) => r.id === id) ??
    RECITERS.find((r) => r.id === DEFAULT_RECITER_ID)!
  );
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/**
 * Build the public MP3 URL for a single ayah from a reciter.
 * Accepts either "surah:ayah" or numeric pair.
 */
export function audioUrlFor(verseKey: string, reciterId: string): string {
  const [s, a] = verseKey.split(':').map(Number);
  const reciter = getReciter(reciterId);
  return `https://everyayah.com/data/${reciter.folder}/${pad3(s)}${pad3(a)}.mp3`;
}
