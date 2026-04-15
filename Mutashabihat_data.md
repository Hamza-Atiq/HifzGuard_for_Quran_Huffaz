# MUTASHABIHAT_DATA.md — Data Specification

## Source

**Repository:** https://github.com/Waqar144/Quran_Mutashabihat_Data
**File:** `mutashabihat_data.json`
**License:** Open source

Clone this repo and copy `mutashabihat_data.json` into `src/data/`.

## Data Format

The JSON file is an array of objects. Each object represents one mutashabihat entry:

```json
{
  "src": {
    "surah": 2,
    "ayah": 14
  },
  "muts": [286, 1543, 3921],
  "ctx": false
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `src` | object | Source verse. Contains `surah` (1-114) and `ayah` (verse number within surah). `ayah` can be a single number or array of numbers (for multi-verse mutashabihat). |
| `muts` | number[] | Array of **absolute ayah numbers** that are similar to the source. Absolute numbering: Fatiha 1:1 = 1, Fatiha 1:7 = 7, Baqarah 2:1 = 8, etc. |
| `ctx` | boolean | If `true`, the mutashabihat requires showing context from the next ayah to see the similarity. For example, two verses might be identical but their continuations differ — the ctx flag tells us to show the next verse too. |

### Absolute Ayah Number Conversion

You MUST build a converter between absolute ayah numbers and surah:ayah format.

**Surah verse counts (all 114 surahs):**

```typescript
const SURAH_VERSE_COUNTS = [
  7,    // 1. Al-Fatihah
  286,  // 2. Al-Baqarah
  200,  // 3. Ali 'Imran
  176,  // 4. An-Nisa
  120,  // 5. Al-Ma'idah
  165,  // 6. Al-An'am
  206,  // 7. Al-A'raf
  75,   // 8. Al-Anfal
  129,  // 9. At-Tawbah
  109,  // 10. Yunus
  123,  // 11. Hud
  111,  // 12. Yusuf
  43,   // 13. Ar-Ra'd
  52,   // 14. Ibrahim
  99,   // 15. Al-Hijr
  128,  // 16. An-Nahl
  111,  // 17. Al-Isra
  110,  // 18. Al-Kahf
  98,   // 19. Maryam
  135,  // 20. Taha
  112,  // 21. Al-Anbya
  78,   // 22. Al-Hajj
  118,  // 23. Al-Mu'minun
  64,   // 24. An-Nur
  77,   // 25. Al-Furqan
  227,  // 26. Ash-Shu'ara
  93,   // 27. An-Naml
  88,   // 28. Al-Qasas
  69,   // 29. Al-'Ankabut
  60,   // 30. Ar-Rum
  34,   // 31. Luqman
  30,   // 32. As-Sajdah
  73,   // 33. Al-Ahzab
  54,   // 34. Saba
  45,   // 35. Fatir
  83,   // 36. Ya-Sin
  182,  // 37. As-Saffat
  88,   // 38. Sad
  75,   // 39. Az-Zumar
  85,   // 40. Ghafir
  54,   // 41. Fussilat
  53,   // 42. Ash-Shuraa
  89,   // 43. Az-Zukhruf
  59,   // 44. Ad-Dukhan
  37,   // 45. Al-Jathiyah
  35,   // 46. Al-Ahqaf
  38,   // 47. Muhammad
  29,   // 48. Al-Fath
  18,   // 49. Al-Hujurat
  45,   // 50. Qaf
  60,   // 51. Adh-Dhariyat
  49,   // 52. At-Tur
  62,   // 53. An-Najm
  55,   // 54. Al-Qamar
  78,   // 55. Ar-Rahman
  96,   // 56. Al-Waqi'ah
  29,   // 57. Al-Hadid
  22,   // 58. Al-Mujadila
  24,   // 59. Al-Hashr
  13,   // 60. Al-Mumtahanah
  14,   // 61. As-Saf
  11,   // 62. Al-Jumu'ah
  11,   // 63. Al-Munafiqun
  18,   // 64. At-Taghabun
  12,   // 65. At-Talaq
  12,   // 66. At-Tahrim
  30,   // 67. Al-Mulk
  52,   // 68. Al-Qalam
  52,   // 69. Al-Haqqah
  44,   // 70. Al-Ma'arij
  28,   // 71. Nuh
  28,   // 72. Al-Jinn
  20,   // 73. Al-Muzzammil
  56,   // 74. Al-Muddaththir
  40,   // 75. Al-Qiyamah
  31,   // 76. Al-Insan
  50,   // 77. Al-Mursalat
  40,   // 78. An-Naba
  46,   // 79. An-Nazi'at
  42,   // 80. 'Abasa
  29,   // 81. At-Takwir
  19,   // 82. Al-Infitar
  36,   // 83. Al-Mutaffifin
  25,   // 84. Al-Inshiqaq
  22,   // 85. Al-Buruj
  17,   // 86. At-Tariq
  19,   // 87. Al-A'la
  26,   // 88. Al-Ghashiyah
  30,   // 89. Al-Fajr
  20,   // 90. Al-Balad
  15,   // 91. Ash-Shams
  21,   // 92. Al-Layl
  11,   // 93. Ad-Duhaa
  8,    // 94. Ash-Sharh
  8,    // 95. At-Tin
  19,   // 96. Al-'Alaq
  5,    // 97. Al-Qadr
  8,    // 98. Al-Bayyinah
  8,    // 99. Az-Zalzalah
  11,   // 100. Al-'Adiyat
  11,   // 101. Al-Qari'ah
  8,    // 102. At-Takathur
  3,    // 103. Al-'Asr
  9,    // 104. Al-Humazah
  5,    // 105. Al-Fil
  4,    // 106. Quraysh
  7,    // 107. Al-Ma'un
  3,    // 108. Al-Kawthar
  6,    // 109. Al-Kafirun
  3,    // 110. An-Nasr
  5,    // 111. Al-Masad
  4,    // 112. Al-Ikhlas
  5,    // 113. Al-Falaq
  6,    // 114. An-Nas
];
```

**Converter functions to implement:**

```typescript
// Build a cumulative sum array for O(1) lookups
function buildCumulativeSums(verseCounts: number[]): number[] {
  const sums = [0];
  for (let i = 0; i < verseCounts.length; i++) {
    sums.push(sums[i] + verseCounts[i]);
  }
  return sums;
}

// Absolute ayah number → { surah, ayah }
function absoluteToSurahAyah(absolute: number): { surah: number; ayah: number } {
  // Use binary search on cumulative sums for efficiency
  // absolute 1 = 1:1, absolute 7 = 1:7, absolute 8 = 2:1
}

// { surah, ayah } → absolute ayah number
function surahAyahToAbsolute(surah: number, ayah: number): number {
  return cumulativeSums[surah - 1] + ayah;
}
```

### Parah (Juz) to Verse Mapping

The Quran is divided into 30 equal parts (parahs/juz). You need this mapping to filter mutashabihat by parah.

Use the Content API to get this: `client.juzs.findAll()` returns the verse range for each juz.

Alternatively, hard-code the standard mapping (first verse of each juz):

```
Juz 1:  1:1   - 2:141
Juz 2:  2:142 - 2:252
Juz 3:  2:253 - 3:92
Juz 4:  3:93  - 4:23
Juz 5:  4:24  - 4:147
Juz 6:  4:148 - 5:81
Juz 7:  5:82  - 6:110
Juz 8:  6:111 - 7:87
Juz 9:  7:88  - 8:40
Juz 10: 8:41  - 9:92
Juz 11: 9:93  - 11:5
Juz 12: 11:6  - 12:52
Juz 13: 12:53 - 14:52
Juz 14: 15:1  - 16:128
Juz 15: 17:1  - 18:74
Juz 16: 18:75 - 20:135
Juz 17: 21:1  - 22:78
Juz 18: 23:1  - 25:20
Juz 19: 25:21 - 27:55
Juz 20: 27:56 - 29:45
Juz 21: 29:46 - 33:30
Juz 22: 33:31 - 36:27
Juz 23: 36:28 - 39:31
Juz 24: 39:32 - 41:46
Juz 25: 41:47 - 45:37
Juz 26: 46:1  - 51:30
Juz 27: 51:31 - 57:29
Juz 28: 58:1  - 66:12
Juz 29: 67:1  - 77:50
Juz 30: 78:1  - 114:6
```

## Mutashabihat Engine Design

### Core functions to implement in `lib/mutashabihat.ts`:

```typescript
interface MutashabihEntry {
  src: { surah: number; ayah: number | number[] };
  muts: number[];  // absolute ayah numbers
  ctx: boolean;
}

interface MutashabihResult {
  sourceVerse: { surah: number; ayah: number; key: string };  // e.g., "2:14"
  similarVerses: { surah: number; ayah: number; key: string }[];
  needsContext: boolean;
  difficulty: 'small' | 'medium' | 'large';  // computed after fetching text
}

// Load and parse the JSON data
function loadMutashabihatData(): MutashabihEntry[]

// Get all mutashabihat entries for a given parah (juz number 1-30)
function getMutashabihatByParah(parah: number): MutashabihResult[]

// Get all mutashabihat entries for a given surah
function getMutashabihatBySurah(surah: number): MutashabihResult[]

// Get mutashabihat for a specific verse (check if it has any)
function getMutashabihatForVerse(surah: number, ayah: number): MutashabihResult | null

// Compute difficulty after fetching verse texts
function computeDifficulty(sourceWords: string[], matchWords: string[]): 'small' | 'medium' | 'large'
```

### Difficulty Classification Logic

After fetching the actual Arabic text (word arrays) for a mutashabih pair:

1. **Small:** Only the last 1-2 words differ (same opening, different ending)
2. **Medium:** Words differ in the middle but opening (first 2+ words) and closing are identical
3. **Large:** 3+ consecutive shared opening words AND the pair appears in 3+ locations total

This classification helps huffaz prioritize which mutashabihat need the most attention.