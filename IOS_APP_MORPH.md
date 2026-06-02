# Dial → iOS App (the "morph" plan)

How to ship Dial as a real iOS App Store app that **exactly replicates** the current
look and behavior. Saved for later — pick this up when ready (a Mac + Xcode is required).

---

## TL;DR
Dial is a **web app** (React + Vite + TypeScript + Supabase). To make it iOS you choose
between *shipping the same web code in a native shell* (exact parity) or *rebuilding it
natively* (a near-total rewrite). For **exact** replication, the answer is **Capacitor**.

| Goal | Best path |
|------|-----------|
| **Exact look & behavior, in the App Store** | **Capacitor** ⭐ |
| Try it on a phone today, free, no Mac | PWA "Add to Home Screen" |
| Maximum native feel, parity not critical | React Native rewrite |

The **Supabase backend stays 100% identical** in every option — auth, Postgres, realtime,
storage all work from a native app over HTTPS/WebSockets exactly as they do today.

---

## ✅ STATUS: Capacitor is set up (done from the web side)

Everything that can be done off a Mac is complete — the repo is iOS-ready:
- Installed `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` (v8) and plugins:
  `status-bar`, `keyboard`, `splash-screen`, `app`, `haptics`.
- **`capacitor.config.ts`** — appId `xyz.dialgolf.app`, appName **Dial**, `webDir: dist`,
  splash + keyboard config.
- **`src/lib/native.ts`** — `initNative()` sets status-bar style, disables keyboard
  webview-scroll (we handle the chat ourselves), hides the splash, and exposes a
  `tapHaptic()` helper. Everything is guarded by `Capacitor.isNativePlatform()`, so it is a
  **no-op on the web** — Vercel and the PWA are completely unaffected.
- Wired `initNative()` into `src/main.tsx`. `npm run build` verified working.

## ▶️ REMAINING: run these on a Mac (Xcode + Apple Developer account, $99/yr)

```bash
# on a Mac, after pulling the repo:
cd dial-app
npm install
npm run build
npx cap add ios       # generates the native ios/ project (needs CocoaPods: sudo gem install cocoapods)
npx cap sync ios
npx cap open ios      # opens Xcode
```
In Xcode: select your **Signing Team**, set display name/version/build, then **Run** on a
device or **Product → Archive → Distribute** to App Store Connect.

**After any web change**, re-sync the native shell:
```bash
npm run build && npx cap sync ios
```

### App icon & splash (on the Mac)
Put a 1024×1024 PNG at `resources/icon.png` (optional `resources/splash.png`), then:
```bash
npm i -D @capacitor/assets
npx @capacitor/assets generate --ios
```

### Commit the native project
After `npx cap add ios`, commit the generated `ios/` folder (Capacitor adds its own
`.gitignore` for build artifacts/Pods).

---

## Option A — Capacitor ⭐ (recommended for "replicate EXACTLY")

[capacitorjs.com](https://capacitorjs.com) wraps the **existing `dial-app` build, unchanged**,
in a real native iOS app (a full-screen `WKWebView` that bundles the web code locally). Many
real App Store apps are built this way.

**Why it's exact:** it *is* the current code — same components, inline styles, glass blur,
GSAP animations, Supabase calls. Nothing to re-create, nothing to drift out of sync. One
codebase powers web + iOS (+ Android later, for free).

### Prerequisites
- A **Mac** with **Xcode** (only way to build/submit iOS).
- An **Apple Developer account** ($99/year).

### Steps (high level)
```bash
# in dial-app/
npm i @capacitor/core @capacitor/cli @capacitor/ios
npx cap init   # app name "Dial", bundle id e.g. com.dialgolf.app
npm run build              # produces dist/
npx cap add ios
npx cap copy
npx cap open ios           # opens Xcode
# In Xcode: set icon, splash, signing team, then Run on a device / submit to App Store
```
After any web change: `npm run build && npx cap copy`.

### Native pieces to wire (small, official plugins)
- **Camera / photo picker** → `@capacitor/camera` — native image picker for posts/avatars.
- **Keyboard** → `@capacitor/keyboard` — even cleaner than the current `visualViewport` handling in the chat.
- **Status bar / splash / safe areas** → `@capacitor/status-bar`, `@capacitor/splash-screen`. We already use `env(safe-area-inset-*)`, so layout is ready.
- **Haptics** → `@capacitor/haptics` — native tap feedback.
- **Preferences** → `@capacitor/preferences` — robust token storage (localStorage also works in WKWebView).

### Effort & parity
Days, not months. Visual/behavioral parity is essentially perfect (it's the same app).

### App Store note
Apple rejects apps that are "just a website" with no native value (Guideline 4.2). Dial is a
full-featured app and will use native camera/push/haptics, so it qualifies fine.

---

## The one real piece of new work: push notifications
The **in-app** notification system we built (DB-backed: likes, comments, tags, reposts, friend
requests, match invites) works as-is inside the app. But **lock-screen/banner push when the app
is closed** needs Apple Push Notification service (APNs):

1. `@capacitor/push-notifications` registers the device and gets a push token.
2. Store that token (e.g., a `device_tokens` table in Supabase).
3. A **Supabase Edge Function** (triggered when a `notifications` row is inserted) sends the
   push — either directly to APNs, or via a provider:
   - **OneSignal** — easiest, free tier, great Capacitor support. (Recommended.)
   - Firebase Cloud Messaging, or raw APNs if you prefer no third party.

This is the only part not "free with the wrapper."

---

## Option B — React Native / Expo rewrite (the `DialApp-Native` folder)
True native UI (real native views, not a WebView). **Does NOT replicate exactly without huge
effort:** RN has no CSS, so the glassmorphism blur, GSAP timelines, shadows, and fonts must be
re-implemented with different tools (`expo-blur`, Reanimated…) and still won't match perfectly.
Effectively a full rewrite of every screen + maintaining two codebases. Only worth it if you
need maximum native performance and are willing to trade away exact parity. (The existing native
app is ~5% complete.)

## Option C — PWA (free, instant, "kind of")
Dial is **already a PWA** (manifest, icons, `apple-mobile-web-app-capable`). On iPhone: open in
Safari → Share → **Add to Home Screen** → full-screen, app-like, exact copy, today. No Mac, no
App Store. Downsides: not discoverable in the App Store; iOS push for installed PWAs is limited.

---

## Recommendation
For "replicate EXACTLY, as an iOS app" → **Capacitor.** Reuses everything already built, keeps
Supabase untouched, and gets the same UI/UX into the App Store. Add OneSignal for true push.

**When ready, an agent can:** add Capacitor to `dial-app/`, configure the iOS platform, install
the camera/keyboard/haptics/status-bar plugins, and scaffold push notifications — leaving it
ready to open in Xcode on a Mac.
