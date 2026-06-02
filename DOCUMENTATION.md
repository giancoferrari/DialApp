# Dial — Master Documentation

> **For AI agents / new sessions:** Read this file **in full** at the start of any session before making changes. It is the single source of truth for what Dial is, how it's built, and how every feature works. **Keep it updated:** whenever you change code, update the relevant section here in the same commit. **Auto-push:** after completing a set of changes, commit and push to GitHub `main` automatically (Vercel auto-deploys) — do not ask the user to push.

---

## 1. What Dial is

Dial is a **golf app that is now also a golf social network**. Core golf utility (track shots, club distances, scorecards/rounds, handicap, ranked matches with virtual wagers) **plus** Instagram/Hevy-style social (profile photo posts with likes/comments, a friends feed, direct messages, player profiles with country flags).

Primary user base is **mobile** (must always feel great on a phone). Owner is based in **Panama** (app default timezone `America/Panama`).

There are **two codebases**:
- **`dial-app/`** — the **web app** (React + Vite + TypeScript). This is the live, actively developed, deployed product. **Everything in this doc refers to the web app unless stated otherwise.**
- **`../DialApp-Native/`** (`C:\Users\gferr\Desktop\DialApp-Native`) — an Expo/React Native port that is only ~5% complete (only the Home tab is built; lib files exist but are mostly disconnected). Not deployed. Low priority.

---

## 2. Tech stack & deployment

- **React 19**, **Vite 8**, **TypeScript ~6** (`tsconfig.app.json` has `noUnusedLocals` and `noUnusedParameters` = **true**, so unused vars/params/functions/imports **fail the build** — always clean them up).
- **Tailwind 3** is configured but the codebase overwhelmingly uses **inline `style={{}}`** objects, not utility classes. Match that style.
- **GSAP** (`@gsap/react` `useGSAP`) for animations (page transitions, staggers, modal entrances).
- **Supabase** (`@supabase/supabase-js`) for auth, Postgres DB (with RLS), realtime, and storage.
- **Hosting:** Vercel, **auto-deploys on push to `main`**. Repo: `https://github.com/giancoferrari/DialApp.git`.
- **Edge function:** `api/golf-search.ts` (Vercel Edge) proxies golfcourseapi.com so the API key stays server-side.

### Environment variables
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — client (in `.env`, used by `lib/supabase.ts`).
- `GOLF_COURSE_API_KEY` — server-side, used by `api/golf-search.ts` (in `.env` locally + Vercel env).

### Build / verify commands (run from `dial-app/`)
- Typecheck: `npx tsc -b`
- Lint: `npx eslint .` — **note:** the only lint messages that remain are `react-hooks/set-state-in-effect` (loading-flag patterns) and one `react-refresh/only-export-components` (AuthContext). These are **accepted non-bugs** — do not churn code to "fix" them.
- Build: `npx vite build`
- Dev server: `npx vite`
- **Always run tsc + build before committing.**

---

## 3. Database & SQL migrations

Supabase Postgres, all tables have **Row Level Security**. The live DB has been modified over time so profiles are readable by other authenticated users (needed for the social features).

**Migrations live as `.sql` files in `dial-app/` and must be run by the user in Supabase → SQL Editor.** They are NOT auto-applied. When you add a table/column, add it to the appropriate file (or a new one) and tell the user to run it.

- **`SUPABASE_SCHEMA.sql`** — core: `courses`, `course_holes`, `rounds`, `round_holes`, `practice_sessions`, `user_profiles`. (Also references `shots`.) Note: this file is older than the live DB — `user_profiles` has gained columns since (username, first_name, avatar_url, ranked_points, wins, losses, ties, country).
- **`SOCIAL_SCHEMA.sql`** — social layer: `conversations`, `messages`, `posts`, `post_likes`, `post_comments` (+ RLS), adds `messages`/`conversations` to the `supabase_realtime` publication, and creates the public **`post-images`** storage bucket + policies.
- **`MORE_SCHEMA.sql`** — adds `user_profiles.country` (text, ISO alpha-2) and renames mis-saved course rows. ⚠️ `lib/friends.ts` `PROFILE_SELECT` lists `country`, so **if this isn't run, profile-loading queries (friends, matches, messages, feed) error.**
- **`SOCIAL_V2.sql`** — adds `post_comment_likes` (likes on individual comments).
- **`SOCIAL_V3.sql`** — adds `post_tags` (players tagged in a post), `reposts`, and `notifications` (+ realtime). Powers post tagging, reposts, and tag/repost notifications.
- **`SOCIAL_V4.sql`** — adds `post_reports` (reporting posts with a reason).

### Tables (key columns)
- **`user_profiles`** — `user_id`, `username`, `first_name`, `avatar_url`, `country`, `handicap_index`, `home_course`, `goal_score`, `goal_handicap`, `goal_notes`, `equipment` (jsonb), `ranked_points`, `wins`, `losses`, `ties`.
- **`courses`** / **`course_holes`** — saved courses + per-hole par/yardage.
- **`rounds`** / **`round_holes`** — logged rounds + per-hole score/putts/fairway/gir.
- **`practice_sessions`** — focus area, rating, notes.
- **`shots`** — club distance logs (clubId, yardage, ts, note).
- **`friendships`** — `requester_id`, `addressee_id`, `status` (pending/accepted/declined).
- **`matches`** / **`match_players`** / **`match_scores`** — ranked matches.
- **`wallets`** / **`wallet_transactions`** — virtual USD balance.
- **`course_corrections`** — community fixes for API course data.
- **`conversations`** (`user_a` < `user_b`, `last_message`, `last_message_at`) / **`messages`** (`conversation_id`, `sender_id`, `body`, `read_at`).
- **`posts`** (`user_id`, `image_url`, `caption`) / **`post_likes`** / **`post_comments`** / **`post_comment_likes`** / **`post_tags`** (tagged players) / **`reposts`** (user_id = reposter).
- **`notifications`** — `user_id` (recipient), `type` ('post_tag' | 'repost' | 'like' | 'comment'), `actor_id`, `post_id`, `read_at`. (`type` is free text, so new kinds need no migration.) Created by `lib/notifications.createNotification` from `posts.ts` (like/comment/repost/tag).
- **Storage buckets:** `avatars`, `post-images` (both public read; write scoped to `{userId}/...`).

---

## 4. Architecture & navigation (`src/App.tsx`)

`App` → `AuthProvider` gate → `AppShell`. If not signed in → `AuthScreen`.

- **`view` state** (`View` union in `types.ts`): `dashboard | bag | dialin | rounds | practice | profile | friends | matches | notifications | tools | settings | messages`.
- **Always opens on `dashboard`** on load/reload (no view persistence — intentional).
- **`handleSetView(view, opts?)`** does the GSAP exit/enter transition and sets state. `opts`: `profileUserId` (whose profile), `force`, `keepMessageTarget`, `isBack`.
- **Back navigation:** `navStack` ref holds `{view, profileUserId, messageUserId}` entries; `goBack()` pops and restores (falls back to `dashboard`). Passed to `ProfileView`/`SettingsView` as `onBack`. The chat thread has its own back-to-inbox.
- **`profileUserId`** (null = own profile) and **`messageUserId`** (null = inbox) drive `ProfileView` and `MessagesView`.
- **Global modals rendered in the shell (not inside the transformed page):** `LogShotModal`, `LegalModal`, `SetNewPasswordModal`, and the global post `Composer` (opened via `composing` state from the "Share a post" menu item).
- **Live badges:** `notifCount` (friend requests + match invites) and `msgUnread` (unread DMs), kept live via Supabase realtime subscriptions on `friendships`, `match_players`, `messages`.

### TopNav (`src/components/TopNav.tsx`)
- **Top bar (always):** wordmark, spacer, [desktop-only chat icon w/ unread badge], bell (notifications) w/ badge, **"Log +" create menu** (Share a post / Log a shot / Start a round / New match), avatar dropdown (Profile, Sign out).
- **Mobile bottom nav (floating glass pill):** Home · Messages (unread badge) · Matches · Tools · Profile.
- **Desktop pill nav:** Home · Friends · Matches · Tools · Profile.
- Menus close on outside-click and **Escape**.

### Critical mobile rule — **Portals**
All modals/sheets/overlays must render through **`src/components/Portal.tsx`** (`createPortal` to `document.body`). The page container gets a GSAP `transform` during transitions, and a transformed ancestor traps `position: fixed` children — which previously made popups clip/misposition on mobile. **Any new modal must be wrapped in `<Portal>`.**

### Mobile height chain
`index.css` sets `html, body, #root { height: 100% }` so the mobile app-shell's `height: 100%` resolves and the inner area scrolls correctly under the fixed bottom nav. `index.html` viewport meta uses `maximum-scale=1.0` + `interactive-widget=resizes-content` to **prevent iOS input-focus auto-zoom**.

---

## 5. Design system

- **Fonts:** `Bricolage Grotesque` (display/headings/numbers), `DM Sans` (body/UI).
- **Colors:** dark green `#1F3A2A` (primary), deep green gradients for cards, cream `#FAF6EA` / `#EDE8D4` (surfaces/bg), orange `#D9824D` (accent/CTA dots), text `#1F1D17` (primary), `#4A4235`/`#6B5F4E` (secondary/muted). Score colors: birdie green `#5C7A4D`, bogey orange `#D9824D`, eagle gold `#C8A84B`, double+ red `#C0392B`.
- **Background:** solid cream `#EDE8D4` with two faint green corner vignettes (in `App.tsx`). (A photo background was tried and removed; keep it cream unless asked.)
- **Surfaces:** frosted glass (`backdrop-filter: blur()`), rounded corners (14–28px), soft shadows.
- **Mobile detection:** `useIsMobile()` hook (`src/hooks/useIsMobile.ts`), passed as `isMobile` prop widely.

---

## 6. Features (file-by-file)

### Auth — `contexts/AuthContext.tsx`, `components/AuthScreen.tsx`
Email/password. Sign-in accepts email **or** `@username` (resolved via `get_email_by_username` RPC). Email confirmation on signup; password reset + recovery (`SetNewPasswordModal` in App). **Signup collects:** first name, last name, username, **country** (CountryPicker), password (strength meter), legal/age agreement. `signUp(...)` then `upsertProfile({ username, country })`.

### Home / Dashboard — `components/Dashboard.tsx`
Date pill, **rank card** (avatar, tier, points, progress to next tier), **quick stats** (last round score vs par, handicap, W/L/T record), **Clubhouse Feed** (`Feed.tsx`), recent rounds (tappable → rounds), quick actions (Friends pill, Start a Match CTA). (The "Good morning" greeting was removed per request.) The **rank card is tappable → `RanksModal`** showing all tiers (with your current one highlighted) and the **points per match** (Win +25 / Tie +5 / Loss −10). Motion: points **count up** and the rank **bar fills** on mount (GSAP), card has press/hover feedback, modal tiers stagger in — all gated behind `prefers-reduced-motion`.

### Clubhouse Feed — `components/Feed.tsx`
Full-width post cards from **you + accepted friends** (`fetchFeedPosts`). Inline like (heart, optimistic), comment count, tap image/comment → shared `PostDetail`. Tap author → their profile (`onViewProfile`). Images `loading="lazy"`.

### Rounds / Scorecard — `components/ScorecardView.tsx`
Phases: history → round_start (pick saved course / featured **Santa Maria** / search via `CourseSearch` / add new) → course_setup → hole_setup → mode_select (**Score only** vs **Score + Stats**) → scorecard (golf-notation cells, tap to type) → summary (stats, scoring breakdown, struggle holes). Uses `lib/rounds.ts`, `lib/courses.ts`, `lib/courseCorrections.ts`.

### Matches — `components/MatchesView.tsx`, `lib/matches.ts`, `lib/wallet.ts`, `lib/points.ts`
Virtual **wallet** (top up / withdraw, USD). Create match: course, 9/18, format (**stroke** active; match_play/skins/wolf "coming soon"), wager per player, invite friends. Invites accept/decline (also in Notifications). Active → `ScoringModal` (per-hole entry, realtime, golf-notation grid same as rounds). Complete → winner determined (stroke = lowest total; match_play = holes won), **pot credited to winner / refunds on tie**, ranked points awarded. **Points:** WIN +25, LOSS −10, TIE +5. **Ranks:** Newcomer(0) → Bronze(100) → Silver(300) → Gold(600) → Platinum(1000) → Diamond(1500) → Legend(2000).

### Tools — `components/ToolsView.tsx`
Hub → **Bag** (`BagView.tsx`, club distances from shots), **Dial In** (`DialInView.tsx`, shot/wind calculator), **Rounds** (Scorecard), **Practice** (`PracticeView.tsx`, training log).

### Log a shot — `components/LogShotModal.tsx`
Quick club-distance capture (numpad + club picker + note). Opened from the "Log a shot" create-menu item; saves a `shots` row.

### Friends — `components/FriendsView.tsx`, `lib/friends.ts`
Search users by username, send/accept/decline/remove requests, friends list. **Tapping a friend opens their full profile page** (`onViewProfile` → ProfileView). (The old popup modal was removed.)

### Messages / DMs — `components/MessagesView.tsx`, `lib/messages.ts`
Conversation list (avatar, last-message preview, time, unread badge) + **chat thread** (`Thread`): realtime delivery, optimistic send, read receipts, **per-message timestamps + day separators**, grouped bubbles. **Mobile keyboard:** the thread pins to `window.visualViewport` (tracks height + offsetTop) so the header stays fixed and only the chat shifts — Instagram-style; input is 16px to avoid iOS zoom. **Header is tappable → opens the other player's profile.** New-message picker searches friends + any user. Conversations keyed by sorted user pair (`lib/messages.ts pair()`). Failed sends show an inline **error banner** above the composer (no more silent failures). Friends is also reachable from the avatar dropdown menu.

### Profile — `components/ProfileView.tsx`, `components/ProfilePosts.tsx`
**Full page** (own + other users). Header: avatar, name, `@username`, **country + flag**, rank badge, stats (handicap / points / friends), W/L/T, rank progress. **Own:** "Edit profile" gear → Settings; tap avatar → Settings. **Other:** back arrow (`onBack`/goBack) + **Message** button. The **friends stat is tappable** → own profile goes to the Friends view; another user's opens a `FriendsListModal` of their friends. Below: **`ProfilePosts`** — 3-col posts grid; composer (image + caption, own only); `PostDetail` modal (big image, like, comments, delete own). **Comments support likes (heart) and Reply** (Reply prefills `@username` into the comment box and focuses it). The post detail has a **3-dot (`MoreIcon`) menu**: **Delete post** on your own posts, **Report post** on others' → a `ReportSheet` with reasons (`reportPost` → `post_reports`). `PostDetail` and `Composer` are **exported** for reuse (Feed + global post button).

### Settings — `components/SettingsView.tsx`
Back arrow. Sections: Account (first name, username), **Location (CountryPicker)**, Security (email, change password), Golf Profile (handicap, home course, preferred tee), Game Defaults, Goals, Privacy toggles, About (legal links via `LegalModal`), Sign out. Saves via `upsertProfile`. Avatar upload here + on ProfileView.

### Notifications — `components/NotificationsView.tsx`, `lib/notifications.ts`
Friend requests + match invites with accept/decline, **plus an activity feed** from the `notifications` table — "@X tagged you in a post / reposted your post / **liked your post** / **commented on your post**", with post thumbnail. A notification is created on every post like (`toggleLike`), comment (`addComment`), repost, and tag (recipient ≠ actor). Realtime. Opening the page marks notifications read. The bell badge (`notifCount` in App) = pending friend requests + match invites + unread notifications.

### Tagging & reposts — `lib/posts.ts`, `lib/notifications.ts`
**Composer** has a "Tag players" friend-multiselect → `createPost(..., taggedIds)` inserts `post_tags` + a `post_tag` notification to each. **Feed** cards (and the feed query `fetchFeedPosts`) include **reposts**: a card shows "↻ @X reposted" and posts have a **Repost** button (`toggleRepost`) that adds a `reposts` row + a `repost` notification to the original author. Reposts surface in friends' Home feeds attributed to the original poster.

### Country picker — `components/CountryPicker.tsx`, `lib/countries.ts`
Searchable modal sheet (Portal) listing ~195 countries with flag emojis (`flagEmoji(code)` builds the emoji from the ISO alpha-2 code). Used in signup + settings. Flags shown on profiles.

---

## 7. Data layer conventions (`src/lib/`)
- **DB is snake_case, TS is camelCase.** Each lib has `toX(row)` converter functions mapping rows → typed objects.
- Files: `supabase.ts`, `profile.ts`, `friends.ts`, `rounds.ts`, `courses.ts`, `courseCorrections.ts`, `shots.ts`, `practice.ts`, `matches.ts`, `wallet.ts`, `points.ts`, `feed.ts` (the **round/match activity feed** — distinct from the posts `Feed.tsx`), `messages.ts`, `posts.ts`, `notifications.ts` (tag/repost notifications), `golfCourseApi.ts`, `countries.ts`, `imageCompress.ts`.
- **Image uploads are auto-compressed** client-side via `imageCompress.compressImage()` (canvas downscale + JPEG re-encode) in `uploadAvatar` (≤512px) and `uploadPostImage` (≤1440px) to save storage.
- **Course naming:** golfcourseapi.com sometimes returns a generic `course_name`; `golfCourseApi.courseDisplayName()` prefers `club_name` plus explicit overrides — **14916 → "Club de Golf de Panama"**, **25374 → "Santa Maria Golf & Country Club"**. Used in `CourseSearch` and `MatchesView`.

---

## 8. Known pending / gotchas
- **Run `MORE_SCHEMA.sql`** (country column) — otherwise profile queries error.
- Match formats other than **stroke** are UI-stubbed ("coming soon").
- The native app (`DialApp-Native`) is far behind the web app.
- `react-hooks/set-state-in-effect` lint messages are intentional/accepted.
- Every modal must use `<Portal>`.
- **iOS app (Capacitor):** **set up** — `@capacitor/*` v8 installed, `capacitor.config.ts` (appId `xyz.dialgolf.app`, appName Dial, webDir `dist`), and `src/lib/native.ts` (`initNative()` for status bar/keyboard/splash/haptics, all guarded by `Capacitor.isNativePlatform()` so the web is unaffected). The native `ios/` project + Xcode build/submit must be done **on a Mac** (`npx cap add ios` → `npx cap open ios`). Full steps in `IOS_APP_MORPH.md`.

---

## 9. Working agreements (IMPORTANT for agents)
1. **Auto-push:** after completing a coherent set of changes that builds clean, `git add -A`, commit with a clear message (end with the Claude co-author trailer), and `git push origin main`. **Do not ask the user to push.**
2. **Keep this file updated:** any change to features, files, schema, or conventions → update the relevant section here in the same commit.
3. **Verify before pushing:** `npx tsc -b` (exit 0) + `npx vite build` (success). Fix unused-code (noUnusedLocals/Parameters are on).
4. **Mobile-first:** test/reason about phone layout; wrap modals in Portal; keep inputs ≥16px to avoid iOS zoom.
5. Commit message co-author trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

_Last updated: 2026-06-02 — comment likes/replies, tappable friends count, DM error banner, post tagging + reposts, full notifications (tags/reposts/likes/comments), 3-dot post menu with Delete + Report, and expanded Terms/Privacy. Pending SQL: SOCIAL_V2.sql, SOCIAL_V3.sql, SOCIAL_V4.sql._
