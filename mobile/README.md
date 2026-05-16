# HifzGuard — Mobile (Flutter)

Mobile companion app for HifzGuard. Targets Android first, iOS supported.

The mobile app talks to the **deployed Next.js backend** at `https://hifz-guard.vercel.app` — every screen except Hifz Tracker is a thin client over our existing API routes, so feature parity comes from one shared backend.

## What's in this MVP

| Screen | Status | Notes |
|---|---|---|
| Home | ✅ | Feature tiles |
| Explorer | ✅ | Browse mutashabihat by parah, filter by difficulty |
| Compare | ✅ | Side-by-side word diff + Qari playback (Mishary, Husary, Sudais, …) |
| Recite | ✅ 🔥 | Mic capture → /api/recitation/transcribe → live word coloring + drift detection |
| Hifz Tracker | ✅ | Local-only Sabaq/Sabqi/Manzil + 30-parah heatmap |
| Bookmarks / Dashboard / Community | ⏳ | Need OAuth on mobile — see below |

The killer feature on mobile is **Recite** — huffaz recite aloud and the app catches when they drift into a similar verse.

## What's not in this MVP yet

**Auth-gated features** (Bookmarks, Dashboard, Community Tips) require OAuth2 with PKCE flowing all the way through to a mobile-safe redirect URI. Three options to add this later:

1. **Custom-scheme redirect** — register `hifzguard://oauth-callback` with QF (email Hackathon@quran.com), then use `flutter_web_auth_2` + the existing `/api/auth/login`-like flow but with our own token storage. Cleanest.
2. **In-app WebView pointed at the deployed web app** — login flows happen in the WebView, cookies set on `hifz-guard.vercel.app`, subsequent API calls go through the WebView. Hacky but works.
3. **OAuth device flow** — show a 6-digit code, user enters it on the web, web ties the device to the user. GitHub CLI pattern. Best UX, most work.

The Hifz Tracker screen is intentionally **local-only** so it's useful immediately without any of the above.

## Prerequisites

- Flutter SDK ≥ 3.22 (`flutter --version`)
- Android Studio with an emulator OR a physical Android device with USB debugging on
- For iOS: macOS + Xcode (not needed for Android-only build)

Quick check: `flutter doctor` should be all green for the platforms you want.

## First-time setup

From this directory:

```powershell
flutter pub get
```

### Android permissions

Add to `android/app/src/main/AndroidManifest.xml` (inside `<manifest>` but outside `<application>`):

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

Also bump `compileSdk` to 34+ and `minSdk` to 21 in `android/app/build.gradle` if Flutter didn't already.

### iOS permissions (Info.plist)

```xml
<key>NSMicrophoneUsageDescription</key>
<string>HifzGuard listens to your recitation to follow along and warn you about similar verses.</string>
```

## Run

```powershell
flutter run
```

Or with a custom backend URL (handy if you're pointing at a preview deployment):

```powershell
flutter run --dart-define=API_BASE_URL=https://your-preview.vercel.app
```

## Build a release APK

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://hifz-guard.vercel.app
```

The APK lands in `build/app/outputs/flutter-apk/app-release.apk`.

## Architecture

```
lib/
├── main.dart                    # Routes + theme
├── api/
│   └── client.dart              # Single HTTP client → Vercel APIs
├── models/                      # Verse, MutashabihEntry, etc.
├── util/
│   ├── diff.dart                # Arabic normalize + LCS diff (ported from src/lib/diff.ts)
│   ├── audio_urls.dart          # everyayah CDN URL builder (mirrors src/lib/audio.ts)
│   └── hifz_state.dart          # Local memorized + activity store
├── services/
│   └── recitation_service.dart  # Mic chunk loop + /api/recitation/transcribe
├── screens/
│   ├── home_screen.dart
│   ├── explorer_screen.dart
│   ├── compare_screen.dart
│   ├── recite_screen.dart
│   └── hifz_screen.dart
└── widgets/                     # (reserved for shared widgets)
```

The matcher (`util/diff.dart`) is a **direct port** of `src/lib/diff.ts` and `src/lib/recitation-matcher.ts` in the web project — same normalization rules, same LCS, same divergence + drift logic. So the Recite feature behaves identically on mobile and web.

## Known limitations

- Mic chunk recording uses AAC at 16 kHz mono — Whisper handles this fine but voice cadence affects accuracy. First chunk takes 10–20 s while HF spins up the model (cold start).
- No haptic / beep feedback yet on Recite — visual flash only. To add real beeps, install `audioplayers` + bundle a short tone in `assets/`. Easy follow-up.
- Auth features need OAuth path decided (above).
- iOS not tested end-to-end; should work but may need provisioning tweaks.

## License & data

Mutashabihat data sourced from the open dataset at [Waqar144/Quran_Mutashabihat_Data](https://github.com/Waqar144/Quran_Mutashabihat_Data) (bundled by the server). Verse text via Quran Foundation Content APIs. Audio via [everyayah.com](https://everyayah.com).
