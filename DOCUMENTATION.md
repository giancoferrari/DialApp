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

- **Onboarding gate (`components/Onboarding.tsx`):** once the profile has loaded (`profileLoaded`), if the signed-in user has **no `username`** (a new account), `AppShell` returns the full-screen `Onboarding` flow instead of the app — name + username are **required**, country / handicap / home-course / photo are skippable. On finish it `setProfile(savedProfile)` and the gate falls through to the app. Existing users (who already have a username) never see it. Branded green welcome/finish bookends a cream one-question-per-screen flow with a top progress bar.

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

## 5. Design system — **v3 "Warm Clubhouse" (June 2026, from the owner's prototype)**

> The current visual identity comes from the owner's own prototype at **`public/dial-home.html` + `public/dial-home.css`** (kept in the repo as the design reference — do not delete). Direction: warm premium golf/social identity — cream surfaces, pine/sage/orange palette, bold iOS-style system typography, restrained glass, an illustrated coastal-course Home hero. The **Home screen** is fully on v3; other screens inherit the v3 tokens (warm cream bg, pine CTAs, system font) over their v2 layouts and get refined when touched.

- **Design tokens — `src/lib/tokens.ts` is the single source of truth.** Exports `font`, `space`, `radius` (prototype scale: 12 sm → 18 md/card → 22 lg → 28 sheet → pill), `color`, `elevation` (soft warm shadows), **`glass`** (the prototype's frosted panel: translucent cream + warm-white border + blur 18), `z`, `motion`/`ease`, `type` presets, plus `HERO_BG`/`onHero` (retoned to pine) for the v2 dark-hero screens.
- **Palette:** cream `#F8F3E7` bg (`sheet #FFFAF0`, `creamDeep #EFE7D4`), **pine `#12371F`** (primary CTAs/active), `greenMid #356D3D`, **sage `#7D9667`** (progress/secondary), **orange `#C86718`** (reactions, deltas, active-nav indicator), `sky #9FCFD7` (illustration), ink `#0B0D0A`, muted `#5C625A`, warm borders `#E6DFCC`.
- **Typography:** bold iOS-style **system sans** (`-apple-system / Helvetica Neue / Segoe UI`) for everything — heavy weights (600–800) + tight tracking; greeting 38–42/700/-0.045em; **card labels are 12px/700 uppercase** (the prototype's label voice — this is back by design). **Bricolage Grotesque** is loaded only for the unchanged multicolor `DialWordmark` logo.
- **Home screen (v3 reference implementation, `Dashboard.tsx`):** greeting (green date + huge bold greeting) → **`CourseHeroArt.tsx`** full-bleed coastal-course illustration (ported from the prototype SVG) → frosted **glass rank card** overlapping the art (flag chip, RANKED POINTS number, RANK + pts-to-next, sage progress bar; tap → RanksModal) → 3 glass **stat cards** with colored icon chips (pine flag / sage H / orange trophy) → **CTA pair** (pine-gradient "Log a round" + sage-tint "Friends") → THE CLUBHOUSE feed (warm rounded cards, orange likes).
- **Mobile bottom nav (TopNav):** docked **frosted cream bar** (blur 18, top hairline, safe-area padding) — icon + 12/600 label, active = ink + **orange underline indicator**. Top bar on mobile is transparent (logo, bell, Log, avatar) and melts into the cream.
- **Logo:** unchanged multicolor `DialWordmark` (Bricolage; D/l green, i/period orange, a sage).
- **Colors:** cool porcelain bg `#F4F5F2`, white cards `#FFFFFF` + hairline `#E4E6E1`, sunken wells `#EFF1ED`. **One brand color: green `#1E4D38`** (hover `#153B2A`, tint `#E8EFEA`) — reserved for primary actions, identity moments (rank card, RecapCard) and selected states. Text ramp: ink `#171A17` / `#494F49` / `#6B716B` / `#9AA09A`. Golf semantics (data only): birdie `#3F8761`, over-par `#9E4A26`, eagle `#A8852F`, danger `#BD3A2D`. The old orange accent is retired as decoration.
- **Background:** flat `#F4F5F2`, nothing else (vignettes and paper-grain texture removed in v2).
- **Surfaces (`src/lib/surfaces.ts`):** `card` (white + hairline border, **no blur, no shadow, no gradients**), `cardRaised` (whisper of `elevation.sm`), `inputSurface` (sunken well), `sectionLabel` (sentence case). **Glass exists in exactly two places:** the floating mobile bottom nav (`rgba(255,255,255,0.84)` + blur 24) and modal scrims (`rgba(23,26,23,0.45)` + blur 8). **Banned v1 patterns:** gradient card fills, inset white glows, stacked shadows, uppercase tracked micro-labels, text glyphs as icons (use `Icons.tsx` — `RepostIcon`, `ChevronLeftIcon` added in v2).
- **Shared primitives:** `components/Avatar.tsx` (the one avatar — photo or initial), `components/EmptyState.tsx` (icon + headline + subline + CTA), `lib/format.ts` (`timeAgo`, `displayName`, `initialOf`, `scoreToPar`, `formatHandicap`, `formatYards`). Use these instead of re-implementing per screen.
- **Buttons & inputs (`components/Button.tsx`, `components/Field.tsx`):** the canonical, tokens-based components for new UI. `Button` has a real tier hierarchy — `primary` (one key action per screen), `secondary`, `tertiary` — plus built-in pressed (scale 0.97) and disabled states. `Field` is a 44px labelled input on the sunken sand surface (16px font → no iOS zoom) that picks up the global focus ring. Existing inline buttons/inputs are already visually consistent; migrate them to these as files are touched rather than in one mass refactor.
- **The "Dial" motif (`components/DialRing.tsx`):** a precision dial/gauge — faint tick marks around the full circle + a bright animated progress arc, with arbitrary center content. The brand signature. Used on the Dashboard rank card (the avatar sits inside the ring, which fills to show progress toward the next rank tier). Reusable for any radial progress.
- **Paper grain:** a fixed ~4%-opacity SVG `feTurbulence` noise layer over the cream (in `App.tsx`, `zIndex 1`, `mix-blend-mode: multiply`) — tactile, premium.
- **Motion (Phase 4):** one spring easing standard — `cubic-bezier(0.22, 1, 0.36, 1)` (`motion.spring`; GSAP `power3.out`). **Directional page transitions** (`App.tsx` `navDir` ref: forward enters from the right, back from the left). Modal/sheet entrances are standardized: backdrop `fadeIn`, mobile sheets `slideUp`, desktop modals `scaleIn` (the feed post→detail "expand"). All gated by `prefers-reduced-motion`.
- **Mobile detection:** `useIsMobile()` hook (`src/hooks/useIsMobile.ts`), passed as `isMobile` prop widely.

---

## 6. Features (file-by-file)

### Auth — `contexts/AuthContext.tsx`, `components/AuthScreen.tsx`
Email/password. Sign-in accepts email **or** `@username` (resolved via `get_email_by_username` RPC). Email confirmation on signup; password reset + recovery (`SetNewPasswordModal` in App). **Signup collects:** first name, last name, username, **country** (CountryPicker), password (strength meter), legal/age agreement. `signUp(...)` then `upsertProfile({ username, country })`.

### Home / Dashboard — `components/Dashboard.tsx`
Order: **date pill → rank card → quick stats → actions → Clubhouse feed.** Quick stats = last round (score vs par), handicap, W/L/T record. **Actions:** a row of two equal buttons — **Log a round** (primary, green → opens the Rounds page) and **Friends** — plus a bigger **Friends leaderboard** card below them. (Recent Rounds and the Start-a-Match CTA were removed from Home per request — matches live in the top "Log +" menu + Matches tab; rounds list is one tap from "Log a round".) **Clubhouse Feed** (`Feed.tsx`) sits below the actions. The **rank card is tappable → `RanksModal`** (all tiers, current highlighted, points per match: Win +25 / Tie +5 / Loss −10, and a "See friends leaderboard" link). Motion: points **count up** + rank **bar fills** on mount (GSAP), press/hover feedback, modal tiers stagger — all gated behind `prefers-reduced-motion`.

### Clubhouse Feed — `components/Feed.tsx`
Full-width post cards from **you + accepted friends** (`fetchFeedPosts`). Inline like (heart, optimistic), comment count, tap media/comment → shared `PostDetail`. Tap author → their profile (`onViewProfile`). Images `loading="lazy"`. Posts are either **photos** or **round recaps** (`post.kind`): recaps render via `RecapCard` instead of an `<img>`.

### Round recap posts — `components/RecapCard.tsx`, `lib/posts.createRoundPost`
Posts can be a **round recap** (no photo): `posts.kind` ('photo' | 'round') + `posts.meta` jsonb (`RoundRecapMeta`: course, score, par, toPar, holes, GIR, fairways, putts). After finishing a round, **ScorecardView's summary has a "Share this round to your feed" button** (`createRoundPost`). `RecapCard` renders a green scorecard-style card in three variants: `feed`, `detail`, `tile` (profile grid). This is the Strava-style flywheel — the feed fills with activity even without photos. Requires `SOCIAL_V5.sql` (makes `image_url` nullable, adds `kind` + `meta`).

### Rounds / Scorecard — `components/ScorecardView.tsx`
Phases: history → round_start (pick saved course / featured **Santa Maria** / search via `CourseSearch` / add new) → course_setup → hole_setup → mode_select (**Score only** vs **Score + Stats**) → scorecard (golf-notation cells, tap to type) → summary (stats, scoring breakdown, struggle holes). Uses `lib/rounds.ts`, `lib/courses.ts`, `lib/courseCorrections.ts`.

### Matches — `components/MatchesView.tsx`, `lib/matches.ts`, `lib/wallet.ts`, `lib/points.ts`
Virtual **wallet** (top up / withdraw, USD). Create match: course, 9/18, format (**stroke** active; match_play/skins/wolf "coming soon"), wager per player, invite friends. Invites accept/decline (also in Notifications). Active → `ScoringModal` (per-hole entry, realtime, golf-notation grid same as rounds). Complete → winner determined (stroke = lowest total; match_play = holes won), **pot credited to winner / refunds on tie**, ranked points awarded. **Points:** WIN +25, LOSS −10, TIE +5. **Ranks:** Newcomer(0) → Bronze(100) → Silver(300) → Gold(600) → Platinum(1000) → Diamond(1500) → Legend(2000).

### Tools — `components/ToolsView.tsx`
Hub → **Stats** (`StatsView.tsx`), **Bag** (`BagView.tsx`, club distances from shots), **Dial In** (`DialInView.tsx`, shot/wind calculator), **Rounds** (Scorecard), **Practice** (`PracticeView.tsx`, training log).

### Stats / Trends — `components/StatsView.tsx`, `lib/stats.ts`
Read-only, computed from logged rounds + shots (no schema). Shows an **estimated handicap** (best 8 of last 20 complete 18-hole rounds' to-par × 0.96), a **recent-rounds bar chart** colored by to-par, **averages** (GIR%, fairways%, putts/18, scrambling%), and **bag gap analysis** (consecutive club-distance gaps, flags "full club" gaps ≥18yd). Pure functions live in `lib/stats.ts` (`roundTotals`, `aggregateStats`, `scoreTrend`, `estimateHandicap`, `bagGaps`).

### Log a shot — `components/LogShotModal.tsx`
Quick club-distance capture (numpad + club picker + note). Opened from the "Log a shot" create-menu item; saves a `shots` row.

### Leaderboard — `components/LeaderboardView.tsx`, `lib/leaderboard.ts`
Ranks **you + your accepted friends by all-time ranked points** (read from `user_profiles`, which is readable for others). Medals for top 3, your row highlighted in dark green, rank tier + W/L + country flag, tap a row → their profile. Reached from a card at the top of **Friends**, and from a "See friends leaderboard" button in the Home rank card's `RanksModal`. (Weekly/monthly would need a points-event ledger — not built; this is all-time.)

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
- **Caching = TanStack React Query.** App is wrapped in `QueryClientProvider` (`lib/queryClient.ts`: 30s staleTime, background refetch on focus). Data views use `useQuery` so returning to a tab is **instant from cache** then refreshes in the background; mutations update the cache optimistically via `setQueryData` or invalidate. Query keys in use: `['feed', userId]`, `['conversations', userId]`, `['leaderboard', meId]`, `['userPosts', target, me]`, `['friends', userId]`, `['notifications', userId]`, `['matchesData', userId]`. First loads render a shimmer **`Skeleton`** (`components/Skeleton.tsx`) — never a "Loading…" string. Scroll position is preserved per tab in `App` (saved on leave, restored before paint via `useLayoutEffect`).
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

### Feel / interaction polish (Phases 1–7)
A multi-phase effort to make the app feel like a production-grade native app. Done so far:
- **Phase 1 — Instant & alive:** React Query (cached, stale-while-revalidate) across Feed/Messages/Leaderboard/Profile/Friends/Notifications/Matches; shimmer `Skeleton` loaders everywhere; per-tab scroll-position preservation (`scrollPos`/`pendingScroll` refs in `App.tsx`, restored in a `useLayoutEffect`); optimistic mutations via `queryClient.setQueryData`.
- **Phase 2 — Feedback & delight (subtle only):** global toast system (`components/Toast.tsx` → `ToastProvider`/`useToast`, rendered through Portal); double-tap-to-like on feed media with a heart-burst overlay + like-button pop (`heartBurst`/`likePop` keyframes in `index.css`); `RankUpMoment.tsx` celebration (Dashboard compares current rank-tier index vs `localStorage['dial_lastTierIdx']`); under-par round highlight in `ScorecardView`. No confetti / no new delight libraries (deliberate).
- **Phase 3 — Native interactions:** `src/hooks/useGestures.ts` exports **`useEdgeSwipeBack(onBack, enabled?)`** (left-edge ≤26px swipe right → back; wired into other-user `ProfileView`, `SettingsView`, `LeaderboardView`, `StatsView`, and the chat `Thread`) and **`useSwipeDownDismiss(onClose)`** (returns `{ dragStyle, dragHandlers }`; applied to the `Composer`, `PostDetail`, and `NewMessageSheet` bottom sheets on mobile, each with a small drag `Grabber` handle). **Haptics:** `tapHaptic()` from `lib/native.ts` (no-op on web, fires in the Capacitor shell) is called on like, send-message, share-post, and bottom-nav tab switches.
- **Phase 4 — Motion with intent:** one spring easing standard (`motion.spring` = `cubic-bezier(0.22, 1, 0.36, 1)`). **Directional page transitions** in `App.tsx` via a `navDir` ref — forward views slide in from the right + exit left, back navigation reverses it (`goBack`/`handleSetView` set the direction; the `useGSAP` enter and `applyView` exit read it). Standardized modal/sheet entrances: backdrop `fadeIn`, mobile sheets `slideUp`, desktop modals `scaleIn` — including the feed **post→detail "expand."** All motion gated by `prefers-reduced-motion`.
- **Phase 5 — Consistency / design tokens (font = system Helvetica):** created **`src/lib/tokens.ts`** (the design system — see §5). **Switched the entire app to the system Helvetica stack** (removed Google Fonts from `index.html`, set `body` font in `index.css`, replaced all 327 `Bricolage`/`DM Sans` literals app-wide). Added shared primitives — **`components/Avatar.tsx`**, **`components/EmptyState.tsx`**, **`lib/format.ts`** — and adopted them across Feed, ProfilePosts, MessagesView, FriendsView, NotificationsView, MatchesView (removed 6 duplicated local `Avatar`s + 3 `timeAgo`/`relTime`/`name` copies). Locked the feed photo to a **4:5** aspect ratio; added a `.tnum` tabular-numbers helper. **In progress:** converting the remaining legacy inline spacing/color literals to `space`/`color` token references (done in touched files; the palette is already uniform, so this is a maintainability pass, not a visual one).

- **Phase 6 — Onboarding (`components/Onboarding.tsx`):** first-run flow gated for new users (no username), wired in `App.tsx` (`profileLoaded` + username check → render `Onboarding` instead of the shell). Steps: branded green **welcome** → **name + username** (required, with live username-availability check against `user_profiles`) → **country** (reuses `CountryPicker`) → **handicap or skill chips** → **home course** (reuses `CourseSearch`) → **photo** (reuses `uploadAvatar`) → branded green **finish**. Top progress bar, spring `onboardIn` step transitions, one `upsertProfile` commit at the end. Optional steps are skippable.
- **Phase 7 — Social feel:** **inline comment preview** on feed posts ("View all N comments" → opens the `PostDetail` comment sheet, which is already a swipe-dismiss bottom sheet on mobile). **Profile polish:** tabular numbers on all profile stats (handicap/points/friends/W-L-T) and a subtle rank-colored halo behind the avatar.

Streaks deferred (needs data plumbing). The "feel" roadmap (Phases 1–7) is complete.

### Redesign v3 (2026-06-11 — "Warm Clubhouse", from the owner's prototype)
The owner supplied a full HTML/CSS design prototype (`public/dial-home.html` + `.css`, with a written handoff spec inside the HTML) and reference imagery, and asked for the **Home screen** to be rebuilt to that direction — improved, not copied pixel-for-pixel. Implemented: warm cream palette + system-sans bold typography in `tokens.ts` (all keys preserved so every screen re-tones automatically), new **`CourseHeroArt.tsx`** (the prototype's coastal-course SVG), `Dashboard.tsx` rebuilt to the prototype hierarchy with the frosted-glass rank card overlapping the illustration, docked frosted bottom nav with orange active indicator in `TopNav.tsx` (existing 5 tabs kept), warm app bg in `App.tsx` (Home dark-tone TopNav removed — Home is light now), Feed/PostDetail reactions switched to orange. The "Friends leaderboard" row was removed from Home per the prototype hierarchy (still reachable via Friends and the RanksModal). Logo untouched. Google Fonts now loads only Bricolage (Geist/Space Grotesk dropped; their hardcoded references in v2 screens fall back to system sans by design).

### Redesign v2 (2026-06, superseded by v3 tokens — "Private Club")
A ground-up visual redesign to a professional, art-directed, non-"AI-looking" language, applied to **every screen**. Cool light-neutral content (`#F4F5F2` bg, white flat cards, hairline borders) + **immersive deep-green heroes** on identity/trophy screens (`HERO_BG` + `CourseContour` topographic linework + `onHero` tokens, full-bleed on mobile with a docking porcelain sheet). **Space Grotesk** display + **Geist** UI (the original multicolor **Bricolage wordmark** restored). Green `#1E4D38` is the single brand color; glass only on the mobile bottom nav + modal scrims; sentence-case labels; whole-pixel type scale; SVG icons (added `RepostIcon`, `ChevronLeftIcon`) instead of text glyphs. **Every screen migrated:** tokens/surfaces/fonts, App shell, TopNav (incl. dark tone), AuthScreen, Dashboard (Private Club hero), Feed, RecapCard, RankUpMoment, ProfileView (dark hero + docked posts sheet), ProfilePosts, Messages, Matches, ScorecardView, Tools, Stats (dark handicap hero), Bag, DialIn, Practice, Settings, Notifications, Friends, Leaderboard (dark hero), Onboarding, LogShotModal, LegalModal, CountryPicker, CourseSearch, Toast, Avatar, Button, Field, Skeleton, ClubBadge, EmptyState. New shared component: `CourseContour.tsx`. (Orphaned by the redesign, now unused: `OrganicGraphic`, `FairwayStrip`, `FlagPin`.) Two earlier reverted experiments: an all-Geist flat pass (too plain) and Fraunces serif display (too dated). Full spec: repo-root `DESIGN.md`.

_Last updated: 2026-06-11 — **Redesign v3 "Warm Clubhouse"** (Home rebuilt from the owner's prototype; warm tokens app-wide). Earlier: Redesign v2 "Private Club" (all screens), Phases 6–7 onboarding + social feel, Phases 1–5 React Query/skeletons/toasts/gestures/tokens/transitions. 
