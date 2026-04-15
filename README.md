# HifzGuard — Mutashabihat Hifz Companion

A modern web companion for huffaz (memorizers of the Quran) that solves the #1 pain point in memorization: **mutashabihat** — the verses that look or sound nearly identical but live in different surahs.

Built for the **Quran Foundation Hackathon**.

## Features

| Feature | What it does |
|---|---|
| **Mutashabihat Explorer** | Browse every similar-verse pair in any parah or surah. Tap to compare side-by-side with word-level diff highlighting. |
| **Parah Revision** | Walk verse-by-verse through a parah. The app warns you the moment you reach a verse with similar siblings. |
| **Self-Test** | Quiz yourself: we show the opening words of a mutashabih verse, you pick which location it's from. Wrong answers auto-bookmark. |

## Tech

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **@quranjs/api** for Quran Foundation Content APIs (Client Credentials)
- **OAuth2 + PKCE** for Quran Foundation User APIs (bookmarks, streaks, activity days)
- **Mutashabihat dataset** from [Waqar144/Quran_Mutashabihat_Data](https://github.com/Waqar144/Quran_Mutashabihat_Data)
- **Public api.quran.com fallback** so the app renders real verses out-of-the-box even before Quran Foundation credentials are issued.

## Setup

```bash
cp .env.local.example .env.local
# fill in QURAN_CLIENT_ID + QURAN_CLIENT_SECRET from
# https://api-docs.quran.foundation/request-access

npm install
npm run dev
```

Open http://localhost:3000.

## Architecture

```
src/
├── app/
│   ├── layout.tsx, page.tsx                  Landing page + global layout
│   ├── explorer/, revision/, self-test/      Three feature pages
│   └── api/
│       ├── quran/verses/                     Server-side Content API proxy
│       ├── mutashabihat/                     Mutashabihat query API
│       ├── auth/login, auth/callback         OAuth2 PKCE flow
│       └── user/bookmarks                    User API proxy
├── components/
│   ├── Navbar, AyahDisplay
│   ├── DiffHighlighter                       LCS-based word alignment + highlight
│   ├── MutashabihatCard                      Lazy-loaded comparison card
│   └── ParahSelector, SurahSelector
├── lib/
│   ├── constants.ts                          Surah meta, parah ranges, abs↔surah:ayah
│   ├── mutashabihat.ts                       Engine over the bundled JSON
│   ├── diff.ts                               Word-level LCS diff (tashkeel-normalized)
│   ├── quran-client.ts                       SDK + public API fallback
│   ├── auth.ts                               OAuth2 PKCE helpers
│   └── user-api.ts                           Bookmark / streak / activity helpers
└── data/
    └── mutashabihat_data.json                ~5400 mutashabihat entries
```

## Arabic Rendering Notes

Arabic readability is treated as the highest UX priority:

- **Font**: Amiri Quran (Google Fonts), purpose-built for the mushaf with full tashkeel.
- **Size**: 34px on the main verse, 28px in comparison cards, 22px small.
- **Line height**: 2.4 / 2.3 / 2.1 — tashkeel never collides with the line above.
- **Diff highlighting**: LCS alignment normalized for tashkeel, then highlighted in amber (different word) or coral (extra word). Identical words stay in the default color so the eye is drawn straight to the differences.

## Quran Foundation API Usage

| Required | API | Used for |
|---|---|---|
| ✅ Content API | `verses.findByKey` (via @quranjs/api) | Fetch Uthmani text + word-by-word data for diff highlighting |
| ✅ User API | `POST /bookmarks`, `POST /activity-days`, `GET /streaks` | Save difficult mutashabihat, log revision sessions, track streak |

## License

MIT — for the Quran Foundation Hackathon.
