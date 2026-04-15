# API_REFERENCE.md — Quran Foundation API Quick Reference

## SDK Installation

```bash
npm install @quranjs/api
```

## Client Setup

### Content APIs (server-side only)

```typescript
import { QuranClient, Language } from '@quranjs/api';

const client = new QuranClient({
  clientId: process.env.QURAN_CLIENT_ID!,
  clientSecret: process.env.QURAN_CLIENT_SECRET!,
  defaults: {
    language: Language.ENGLISH,
  },
});
```

The SDK handles client_credentials token exchange and caching automatically.
Every Content API request needs headers: `x-auth-token` and `x-client-id` (SDK handles this).

---

## Content APIs We Use

### Chapters

```typescript
// List all 114 chapters
const chapters = await client.chapters.findAll();
// Returns: { chapters: [{ id, name_arabic, name_simple, verses_count, ... }] }

// Get specific chapter info
const chapter = await client.chapters.findById(2); // Al-Baqarah
```

### Verses

```typescript
// Get verse by key (surah:ayah)
const verse = await client.verses.findByKey("2:14", {
  words: true,           // word-by-word data (CRITICAL for diff highlighting)
  translations: [20],    // Sahih International English translation
  fields: ['text_uthmani', 'text_imlaei'],
});

// Get verses by chapter
const verses = await client.verses.findByChapter(2, {
  words: true,
  translations: [20],
  page: 1,
  perPage: 50,
});

// Get verses by juz
const verses = await client.verses.findByJuz(1, {
  words: true,
  translations: [20],
});
```

**Verse response shape:**
```json
{
  "verse_key": "2:14",
  "text_uthmani": "وَإِذَا لَقُوا۟ ٱلَّذِينَ ءَامَنُوا۟ قَالُوٓا۟ ءَامَنَّا...",
  "text_imlaei": "وإذا لقوا الذين آمنوا قالوا آمنا...",
  "words": [
    {
      "id": 12345,
      "position": 1,
      "text_uthmani": "وَإِذَا",
      "translation": { "text": "And when", "language_name": "english" },
      "transliteration": { "text": "wa-idhā" }
    },
    // ... more words
  ],
  "translations": [
    {
      "resource_id": 20,
      "text": "And when they meet those who believe, they say, 'We believe'..."
    }
  ]
}
```

### Juzs

```typescript
// List all 30 juzs with verse ranges
const juzs = await client.juzs.findAll();
// Returns: { juzs: [{ id, juz_number, verse_mapping: { "2": "142-252" }, ... }] }
```

### Audio

```typescript
// Get audio for a verse (nice-to-have for revision mode)
const audio = await client.audio.findByReciter(7); // Mishary Rashid Alafasy
```

### Search

```typescript
import { SearchMode } from '@quranjs/api';

// Search Quran text
const results = await client.search.search("الذين آمنوا", {
  mode: SearchMode.Quick,
  language: Language.ARABIC,
});
```

### Tafsir

```typescript
// Get tafsir for a verse (useful context for understanding why verses are similar)
const tafsir = await client.tafsirs.findByChapterAndVerse(2, 14, {
  tafsirId: 169, // Ibn Kathir
});
```

---

## User APIs (require OAuth2 user token)

These are REST APIs, NOT part of the JS SDK. Call them directly via fetch.

**Base URL:** `https://api.quran.com/api/qdc/user/v1`
**Headers:**
```typescript
const headers = {
  'x-auth-token': accessToken,  // user's OAuth2 access token
  'x-client-id': process.env.QURAN_CLIENT_ID!,
  'Content-Type': 'application/json',
};
```

### Bookmarks

```typescript
// Add bookmark
POST /bookmarks
Body: {
  "mushaf_id": 1,           // Uthmani Hafs
  "verse_key": "2:14",      // or use ayah_key
  "type": "ayah"
}

// Get all bookmarks
GET /bookmarks?mushaf_id=1

// Delete bookmark
DELETE /bookmarks/{id}
```

### Collections

```typescript
// Create collection (e.g., "My Weak Mutashabihat")
POST /collections
Body: {
  "name": "My Weak Mutashabihat",
  "description": "Verses I frequently confuse"
}

// Add bookmark to collection
POST /collections/{id}/bookmarks
Body: { "bookmark_id": "..." }

// Get collection
GET /collections/{id}

// List all collections
GET /collections
```

### Streaks

```typescript
// Get current streak
GET /streaks
// Returns: { streaks: { current_streak: 5, longest_streak: 30, ... } }
```

### Activity Days

```typescript
// Log activity for today
POST /activity-days
Body: {
  "date": "2026-04-10",
  "activity_type": "revision",
  "ranges": ["2:1-2:50"]     // verses revised
}

// Get activity for a date range
GET /activity-days?from=2026-04-01&to=2026-04-10
```

### Goals

```typescript
// Get today's goal plan
GET /goals/today
// Returns: { goal: { type: "pages", amount: 5, progress: 3, ... } }

// Create/update goal
POST /goals
Body: {
  "type": "pages",           // or "verses", "time"
  "amount": 5,
  "period": "daily"
}
```

### Notes

```typescript
// Add a note to a verse (for personal reminders about mutashabihat)
POST /notes
Body: {
  "verse_key": "2:14",
  "body": "Confuse this with 3:119 - remember Baqarah version has 'khalaw' not 'khalau'"
}

// Get notes
GET /notes?verse_key=2:14
```

### Posts (Reflections)

```typescript
// Post a reflection (hackathon requires using Post APIs)
POST /posts
Body: {
  "verse_key": "2:14",
  "body": "This verse teaches about hypocrisy...",
  "type": "reflection"
}

// Get feed of reflections
GET /posts/feed
```

---

## OAuth2 Flow Summary

### Step 1: Redirect to login

```
https://oauth.quran.com/oauth2/auth
  ?client_id={CLIENT_ID}
  &response_type=code
  &redirect_uri={REDIRECT_URI}
  &scope=openid profile bookmark.crud collection.crud goal.crud streak.read activityday.crud note.crud post.crud
  &code_challenge={PKCE_CHALLENGE}
  &code_challenge_method=S256
  &state={RANDOM_STATE}
```

### Step 2: Exchange code for tokens (server-side)

```typescript
POST https://oauth.quran.com/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={AUTH_CODE}
&redirect_uri={REDIRECT_URI}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&code_verifier={PKCE_VERIFIER}
```

### Step 3: Use access token

```typescript
const response = await fetch('https://api.quran.com/api/qdc/user/v1/bookmarks', {
  headers: {
    'x-auth-token': accessToken,
    'x-client-id': clientId,
  },
});
```

### Step 4: Refresh when expired

```typescript
POST https://oauth.quran.com/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={REFRESH_TOKEN}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

---

## Translation IDs (commonly used)

| ID | Name | Language |
|----|------|----------|
| 20 | Sahih International | English |
| 131 | Dr. Mustafa Khattab (The Clear Quran) | English |
| 234 | Fateh Muhammad Jalandhari | Urdu |
| 97  | Maulana Muhammad Junagarhi | Urdu |

---

## Rate Limits & Best Practices

- Cache verse data aggressively (verses don't change)
- Batch verse fetches where possible (use `findByChapter` or `findByJuz` instead of individual `findByKey` calls)
- Use `words: true` only when you need word-level data (diff highlighting)
- Content API tokens auto-refresh via SDK
- User API tokens: implement refresh logic in your auth middleware

---

## Full API Documentation

- Content APIs: https://api-docs.quran.foundation/docs/content_apis_versioned/content-apis
- User APIs: https://api-docs.quran.foundation/docs/user_related_apis_versioned/user-related-apis
- Search APIs: https://api-docs.quran.foundation/docs/search_apis_versioned/quran-foundation-search-api
- OAuth2 Tutorial: https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2
- JS SDK: https://api-docs.quran.foundation/docs/sdk/javascript
- Font Rendering: https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering