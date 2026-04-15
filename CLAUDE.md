# CLAUDE.md — HifzGuard: Mutashabihat Hifz Companion

## Project Overview

**HifzGuard** is a web app. It solves the #1 pain point for Huffaz (people who memorize the Quran): confusing similar verses (mutashabihat) during memorization and revision.

**Core problem:** When a hafiz memorizes the Quran, many verses share identical or near-identical openings, phrases, or structures across different surahs. For example, Surah Al-Baqarah 2:14 starts with words that appear identically in 3+ other locations. Traditionally, a hafiz needs a second person (sami) to catch mistakes, and printed mutashabihat books to study similarities. This app digitizes and supercharges both.

**Hackathon requirement:** Must use at least ONE Quran Foundation Content API AND at least ONE User API. See `API_REFERENCE.md` for details.

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Quran API SDK:** `@quranjs/api` (npm package)
- **Auth:** Quran Foundation OAuth2 (Authorization Code + PKCE for User APIs, Client Credentials for Content APIs)
- **Mutashabihat Data:** Pre-bundled JSON from Waqar144/Quran_Mutashabihat_Data (GitHub)
- **Deployment:** Vercel (for live demo link in submission)

### Environment Variables

```env
QURAN_CLIENT_ID=<from Quran Foundation Request Access>
QURAN_CLIENT_SECRET=<from Quran Foundation Request Access>
NEXT_PUBLIC_QURAN_CLIENT_ID=<same client_id, for frontend OAuth redirect>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root layout with RTL support, Quran fonts
│   ├── page.tsx                # Landing / dashboard
│   ├── explorer/
│   │   └── page.tsx            # Mutashabihat Explorer (browse by parah/surah)
│   ├── revision/
│   │   └── page.tsx            # Parah Revision Mode
│   ├── self-test/
│   │   └── page.tsx            # Self-Test / Quiz Mode
│   ├── api/
│   │   ├── auth/
│   │   │   ├── token/route.ts  # Backend token exchange (confidential client)
│   │   │   └── callback/route.ts
│   │   └── quran/
│   │       └── [...proxy]/route.ts  # Proxy for Content API calls with server-side auth
│   └── auth/
│       └── callback/page.tsx   # OAuth redirect handler
├── components/
│   ├── AyahDisplay.tsx         # Single verse renderer (Arabic + translation)
│   ├── MutashabihatCard.tsx    # Side-by-side similar verse comparison
│   ├── DiffHighlighter.tsx     # Highlights word-level differences between similar ayat
│   ├── ParahSelector.tsx       # Parah/Juz picker (1-30)
│   ├── SurahSelector.tsx       # Surah picker (1-114)
│   ├── StreakDisplay.tsx       # Shows current revision streak
│   ├── QuizCard.tsx            # Self-test question card
│   └── Navbar.tsx              # Navigation with auth state
├── lib/
│   ├── quran-client.ts         # QuranClient singleton (server-side, Content APIs)
│   ├── user-api.ts             # User API helpers (bookmarks, streaks, goals, collections)
│   ├── mutashabihat.ts         # Mutashabihat engine: load JSON, query, group, rank
│   ├── diff.ts                 # Word-level Arabic text diff algorithm
│   ├── auth.ts                 # OAuth2 PKCE helpers
│   └── constants.ts            # Parah-to-verse mappings, surah metadata
├── data/
│   └── mutashabihat_data.json  # Pre-bundled from Waqar144 dataset
└── types/
    └── index.ts                # TypeScript interfaces
```

---

## Feature Specifications

### Feature 1: Mutashabihat Explorer (Priority: HIGHEST — build first)

**What it does:** User selects a Parah (1-30) or Surah. The app shows every verse in that range that has mutashabihat (similar verses elsewhere in the Quran). Tapping a verse opens a side-by-side comparison highlighting the exact words that differ.

**User flow:**
1. User lands on Explorer page
2. Selects Parah 1 (or Surah Al-Baqarah)
3. Sees a scrollable list of verses, each tagged with a badge: "3 similar" or "5 similar"
4. Taps a verse → expands to show all similar verses side-by-side
5. Word-level differences are highlighted (e.g., different word in amber, identical words in default color)
6. Each similar verse shows its surah name and verse number for reference
7. User can bookmark a difficult mutashabih pair (User API: Bookmarks)

**Data flow:**
- Load `mutashabihat_data.json` → filter entries by parah/surah range
- For each entry, fetch verse text via Content API (`client.verses.findByKey("2:14", { words: true })`)
- Fetch all matching verse texts
- Run word-level diff to find differences
- Display side-by-side with highlights

**Content API usage:**
- `verses.findByKey(key, { words: true, translations: [20] })` — get verse with word-by-word data
- `chapters.findAll()` — for surah names in the UI

**User API usage:**
- `POST /bookmarks` — save difficult mutashabih pairs
- `GET /bookmarks` — retrieve saved pairs
- `POST /collections` — create a "My Weak Mutashabihat" collection

### Feature 2: Parah Revision Mode (Priority: HIGH)

**What it does:** User selects a parah they're revising. They navigate verse-by-verse. When they reach a verse that has mutashabihat, the app shows a proactive alert: "⚠️ This verse starts identically to Al-Imran 3:119 and An-Nisa 4:61 — pay attention here."

**Difficulty categorization:**
- **Small mutashabih:** Only 1-2 words differ (e.g., same opening, different ending word)
- **Medium mutashabih:** Middle section differs but opening and closing are identical
- **Large mutashabih:** Entire opening phrase (3+ words) is shared across 3+ locations

**User flow:**
1. Select parah number
2. Navigate verse by verse (prev/next buttons, or swipe)
3. Normal verses show cleanly with Arabic text + translation
4. Mutashabih verses show with an alert banner + quick-compare panel
5. User can tap "Show all similar" to see full side-by-side (reuses Explorer component)
6. Progress is tracked via Activity Days API
7. Streak maintained via Streaks API

**User API usage:**
- `POST /activity-days` — log daily revision activity
- `GET /streaks` — display current streak
- `POST /goals` — set revision target (e.g., 1 parah per day)
- `GET /goals/today` — check today's goal progress

### Feature 3: Self-Test Mode (Priority: MEDIUM — cut if behind schedule)

**What it does:** Shows the first few words of a verse that has mutashabihat. The user must identify which surah/location this specific version belongs to, or type/select how the verse continues. When they get it wrong, the app shows the verse they confused it with.

**User flow:**
1. Select parah or surah to test on
2. App shows first 3-4 words of a mutashabih verse
3. Multiple choice: "Where does this verse appear?" with options being the different locations
4. Correct → green, move on. Wrong → shows side-by-side comparison of what they confused
5. Wrong answers auto-bookmarked for later review
6. Session results posted as activity

**User API usage:**
- `POST /bookmarks` — auto-save wrong answers
- `POST /activity-days` — log test sessions
- `GET /streaks` — maintain streak

---

## Mutashabihat Data Structure

See `MUTASHABIHAT_DATA.md` for full specification of the data format.

**Key points:**
- Source: https://github.com/Waqar144/Quran_Mutashabihat_Data
- Format: JSON array of objects
- Each object has: `src` (source ayah — absolute number or surah:ayah), `muts` (array of matching absolute ayah numbers), `ctx` (boolean — whether context from next ayah is needed)
- Total: ~5400 entries covering the entire Quran
- Bundle this file at `src/data/mutashabihat_data.json`

You will need a mapping utility to convert between absolute ayah numbers and surah:ayah format. The Quran has 6236 ayat total. Build a lookup table using the surah metadata (number of verses per surah).

---

## Arabic Text Rendering — CRITICAL

This is the most important UX aspect. Arabic text MUST render correctly:

1. **Direction:** All Arabic text containers must have `dir="rtl"` and `text-align: right`
2. **Font:** Use a proper Quran font. Options:
   - KFGQPC Uthmanic Script HAFS (recommended, used by Quran.com)
   - Load via Google Fonts or self-host from Quran Foundation CDN
   - The Content API returns text in `text_uthmani` field — this is the Uthmanic script with full tashkeel (diacritics)
3. **Font size:** Arabic Quran text should be large and readable: minimum 24px, ideally 28-32px
4. **Line height:** Arabic with tashkeel needs generous line-height: at least 2.0 or 2.2
5. **Word-by-word rendering:** The API returns a `words` array. Each word object has `text_uthmani`, `translation`, and `position`. Use this for the diff highlighting feature.
6. **Tashkeel visibility:** Always show full tashkeel (diacritical marks). Never strip them — they are essential for correct Quran reading.

**CSS template for Arabic text:**
```css
.arabic-text {
  direction: rtl;
  text-align: right;
  font-family: 'KFGQPC Uthmanic Script HAFS', 'Amiri', serif;
  font-size: 28px;
  line-height: 2.2;
  letter-spacing: 0;
}
```

**Diff highlighting approach:**
- Compare two verses word-by-word using their `words` arrays
- Words at the same position that match → default color
- Words that differ → highlighted background (amber/yellow)
- Extra words (one verse is longer) → highlighted in a different color (coral/red)

---

## OAuth2 Authentication Setup

### Content APIs (server-side, no user login needed)

Use `client_credentials` grant with `content` scope:

```typescript
// lib/quran-client.ts
import { QuranClient } from '@quranjs/api';

const client = new QuranClient({
  clientId: process.env.QURAN_CLIENT_ID!,
  clientSecret: process.env.QURAN_CLIENT_SECRET!,
});

export default client;
```

This handles token management automatically. Use this in Next.js API routes and Server Components.

### User APIs (requires user login)

Use Authorization Code flow with PKCE:

1. **Login button** redirects user to: `https://oauth.quran.com/oauth2/auth?client_id=...&response_type=code&redirect_uri=...&scope=openid+profile+bookmark.crud+collection.crud+goal.crud+streak.read+activityday.crud&code_challenge=...&code_challenge_method=S256`
2. **Callback** receives authorization code at `/auth/callback`
3. **Backend** exchanges code for tokens at `POST https://oauth.quran.com/oauth2/token` with client_secret (confidential client)
4. **Access token** stored in httpOnly cookie or session, used for User API calls
5. **Refresh** handled server-side when token expires

Required OAuth2 scopes:
- `openid` — for OIDC
- `profile` — user info
- `bookmark.crud` — create/read/update/delete bookmarks
- `collection.crud` — manage collections
- `goal.crud` — reading goals
- `streak.read` — read streaks
- `activityday.crud` — log activity

User API base URL: `https://api.quran.com/api/qdc/user/v1/` (check docs for exact URL)
Headers: `x-auth-token: <access_token>`, `x-client-id: <client_id>`

---

## Styling Guidelines

- Use Tailwind CSS with a clean, modern design
- Color scheme: Deep teal/green primary (Islamic aesthetic), warm amber for highlights, clean white/gray backgrounds
- Dark mode support (many users read Quran at night)
- Mobile-first responsive design (most huffaz will use phones)
- The app should feel reverent and clean — no flashy animations, no clutter
- Use card-based layouts for verse comparisons
- Badge system for mutashabih count (e.g., small green badge "2 similar", amber "5 similar", red "8+ similar")

---

## Key Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Deploy (if using Vercel CLI)
vercel --prod
```

---

## Important Links

- Quran Foundation API Docs: https://api-docs.quran.foundation
- JS SDK: https://www.npmjs.com/package/@quranjs/api
- OAuth2 Tutorial: https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2
- User APIs Quickstart: https://api-docs.quran.foundation/docs/tutorials/oidc/user-apis-quickstart
- Request Access (get client_id): https://api-docs.quran.foundation/request-access
- Mutashabihat Dataset: https://github.com/Waqar144/Quran_Mutashabihat_Data
- Font Rendering Tutorial: https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering
- Hackathon Page: https://launch.provisioncapital.com/quran-hackathon
- Hackathon Terms: https://launch.provisioncapital.com/quran-hackathon/terms
- API Support: Hackathon@quran.com