export interface VerseRef {
  surah: number;
  ayah: number;
  key: string; // "2:14"
}

export interface Word {
  position: number;
  text: string;        // text_uthmani
  translation?: string;
  transliteration?: string;
}

export interface Verse {
  key: string;
  surah: number;
  ayah: number;
  textUthmani: string;
  words: Word[];
  translation?: string;
  surahName?: string;
  surahNameArabic?: string;
}

export interface MutashabihEntry {
  src: VerseRef;
  similar: VerseRef[];
  needsContext: boolean;
  parah: number;
}

export type Difficulty = 'small' | 'medium' | 'large';

export interface MutashabihResolved extends MutashabihEntry {
  difficulty: Difficulty;
  sharedWordCount: number;
}

export interface DiffWord {
  text: string;
  status: 'same' | 'diff' | 'extra';
  position: number;
}

export interface ChapterMeta {
  id: number;
  nameSimple: string;
  nameArabic: string;
  versesCount: number;
  revelationPlace?: string;
}
