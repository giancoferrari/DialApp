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
- **Fonts:** **Helvetica Neue LT Pro**, served via **Adobe Fonts (Typekit)** kit `mci8gnc` (`<link>` in `index.html`, family name `helvetica-neue-lt-pro`, referenced first in `lib/tokens.ts`'s `SANS` stack with system `'Helvetica Neue'` as the offline/Capacitor fallback). This is the one typeface for the whole app. **`DialWordmark`'s "Dial." logo is the only exception** — it stays in **Bricolage Grotesque** (Google Fonts) via `font.wordmark`; never repoint it. ⚠️ As of 2026, the Typekit kit only serves weights **400 and 700** — the app's 500/600/650/800 `fontWeight` values are unchanged and rely on browser weight-matching/synthesis until Medium (500) and Heavy (800) are added to the kit, at which point a follow-up normalization pass is needed.

### Environment variables
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — client (in `.env`, used by `lib/supabase.ts`).
- `GOLF_COURSE_API_KEY` — server-side, used by `api/golf-search.ts` (in `.env` locally + Vercel env).

### Build / verify commands (run from `dial-app/`)
- Typecheck: `npx tsc -b`
- Lint: `npx eslint .` — **note:** the only lint messages that remain are `react-hooks/set-state-in-effect` (loading-flag patterns) and two `react-refresh/only-export-components` (`AuthContext`, `Toast` — both export a hook alongside a component). These are **accepted non-bugs** — do not churn code to "fix" them.
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
- **`DELETE_ACCOUNT.sql`** — creates the `delete_my_account()` SECURITY DEFINER function powering Settings → Danger zone → Delete account. Wipes all of the caller's rows (guarded by `to_regclass` + per-statement exception handling, so it survives whatever migrations have run) then deletes their `auth.users` row. ⚠️ Must be run for account deletion to work.

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

- **Onboarding gate (`components/Onboarding.tsx`):** once the profile has loaded (`profileLoaded`), if the signed-in user has **no `username`** (a new account), `AppShell` returns the full-screen `Onboarding` flow. **No duplicate questions:** name, username and country are already collected at sign-up, so Onboarding **prefills them from `existingProfile` → falls back to `user.user_metadata`** (set by `signUp`) and **skips the `name`/`country` steps entirely** when they're already known. It then only asks what sign-up didn't: handicap, home course, photo (all skippable). The step list is computed dynamically (`haveName`/`haveCountry`). On finish it `upsertProfile(...)` (persisting name/username/country too, so the gate clears) and `setProfile(savedProfile)`. Branded green welcome/finish bookends a cream one-question-per-screen flow with a top progress bar.

- **`view` state** (`View` union in `types.ts`): `dashboard | bag | dialin | rounds | practice | profile | friends | matches | notifications | tools | settings | messages`.
- **Always opens on `dashboard`** on load/reload (no view persistence — intentional).
- **`handleSetView(view, opts?)`** does the GSAP exit/enter transition and sets state. `opts`: `profileUserId` (whose profile), `force`, `keepMessageTarget`, `isBack`.
- **Back navigation:** `navStack` ref holds `{view, profileUserId, messageUserId}` entries; `goBack()` pops and restores (falls back to `dashboard`). Passed to `ProfileView`/`SettingsView` as `onBack`. The chat thread has its own back-to-inbox.
- **`profileUserId`** (null = own profile) and **`messageUserId`** (null = inbox) drive `ProfileView` and `MessagesView`.
- **Global modals rendered in the shell (not inside the transformed page):** `LogShotModal`, `LegalModal`, `SetNewPasswordModal`, and the global post `Composer` (opened via `composing` state from the "Share a post" menu item).
- **Live badges:** `notifCount` (friend requests + match invites) and `msgUnread` (unread DMs), kept live via Supabase realtime subscriptions on `friendships`, `match_players`, `messages`.
- **Mobile scroll-aware header:** `App` tracks the mobile scroll container (`scrollTop > 30` → `navScrolled` state + `navScrolledRef`), passes it to `TopNav` as `scrolled`, and syncs it on view change in the `useLayoutEffect` scroll-restore. `TopNav` uses this to fade in the frosted bar (see §5).

### TopNav (`src/components/TopNav.tsx`)
- **Top bar — mobile:** `position: absolute` transparent overlay floating over the page. Transparent when content is at the top; **frosts in** (cream 82% opacity + blur 18 + hairline + shadow) smoothly once content scrolls under it (`mobileFrost`/`showFrost`). Logo, bell, avatar only (no pill nav — that's the bottom tab).
- **Top bar — desktop:** `position: sticky`, always frosted cream, with a horizontal pill nav (Home · Friends · Matches · Tools · Profile) + desktop-only chat icon + create menu.
- **Mobile bottom nav:** **floating frosted pill** — inset 14px from screen edges, `borderRadius 28`, blur 20, soft drop shadow, floats `safe-area-bottom + 10px`. Five tabs: Home · Messages (unread badge) · Matches · Tools · Profile. Active state = **ink label + orange dot** below the icon (dot springs in with overshoot on tab switch; icon lifts 1px). Pill rises in on first mount (`.nav-pill-in`). Press scales the tab to 0.92.
- Menus close on outside-click and **Escape**.

### Critical mobile rule — **Portals**
All modals/sheets/overlays must render through **`src/components/Portal.tsx`** (`createPortal` to `document.body`). The page container gets a GSAP `transform` during transitions, and a transformed ancestor traps `position: fixed` children — which previously made popups clip/misposition on mobile. **Any new modal must be wrapped in `<Portal>`.**

### Mobile height chain
`index.css` sets `html, body, #root { height: 100% }` so the mobile app-shell's `height: 100%` resolves and the inner area scrolls correctly under the fixed bottom nav. `index.html` viewport meta uses `maximum-scale=1.0` + `interactive-widget=resizes-content` to **prevent iOS input-focus auto-zoom**.

### Mobile content padding
Because the mobile top bar is an absolute overlay, `contentStyle` in `App.tsx` sets `paddingTop: 0` for the `dashboard` view (the hero fills behind the header) and `paddingTop: calc(env(safe-area-inset-top) + 60px)` for all other views so their content clears the floating header.

---

## 5. Design system — **v4 "Warm Clubhouse — Editorial" (current)**

> The visual identity originates from the owner's own prototype at **`public/dial-home.html` + `public/dial-home.css`** (kept in the repo as the design reference — do not delete). Direction unchanged from v3: warm premium golf/social identity — cream surfaces, pine/sage/orange palette, bold Helvetica Neue typography, restrained glass, an illustrated coastal-course Home hero. **v4 "Editorial" is a convergence pass**, not a new look: one card system instead of four, one type scale, one screen-header pattern, one motion vocabulary, strict accent discipline, and a real webfont. Full source of truth in code: `src/lib/tokens.ts` + `src/lib/surfaces.ts`.
>
> **Adoption status:** tokens/primitives below are in place app-wide. **Home** (`Dashboard.tsx`) and **Feed** (`Feed.tsx`) use the new card system. **`PageHeader`** is now adopted by **Friends, Notifications, Messages (inbox), Tools, Dial In, Practice, Settings, Stats, Leaderboard**. **`useStaggerMount`** is now adopted by all of the above plus **Bag** and **Profile** — every screen in this list has exactly one mount animation. **Stats, Leaderboard** additionally use `surfaces.raised` for their one hero card (estimated-handicap card, standing card); **Profile**'s identity card uses `raised` chrome on desktop (mobile stays intentionally full-bleed/chromeless). Layout widths/padding on all of the above now come from `page` (§ above), replacing ad-hoc numbers. Every other screen — including the still-v2 **Rounds/Scorecard** and **Matches** — gets converted screen-by-screen in the redesign prompts tracked in `REDESIGN_PROMPTS.md` (one level above this repo). Don't assume a screen is fully v4 just because it reads warm-cream; check this doc's §6 entry for that screen.

### Layout tokens — `src/lib/tokens.ts` → `page`
One set of widths/padding for every list/content screen — no more ad-hoc `maxWidth`/padding numbers per file:
- `maxW: 680` — outer wrapper on every list/content screen.
- `contentW: 600` — inner column for hero/feed screens.
- `pxMobile: 20` / `pxDesktop: 40` — horizontal padding.
- `topMobile: 24` / `topDesktop: 44`, `bottomMobile: 120` (clears the floating pill nav) / `bottomDesktop: 80`.
- Dashboard keeps its own full-bleed hero handling but still adopts the px/bottom values.

### Design tokens — `src/lib/tokens.ts`
Single source of truth. Exports:
- **`font`** — `body`/`display` (Helvetica Neue LT Pro, see Typography below), `wordmark` (Bricolage Grotesque, logo only).
- **`page`** — layout widths/padding, see above.
- **`space`** — strict 4/8pt scale. **`radius`** — 12 sm → 18 md → 22 lg → 28 sheet → 999 pill (see Radius law below; the legacy `radius.card` key = 18 still exists for old call sites but is NOT the v4 card radius — don't use it in new code).
- **`color`** — see palette below; header comment documents accent discipline inline.
- **`type`** — presets incl. `stat` (new, see Typography below).
- **`elevation`** — soft warm shadows (sm / md / lg).
- **`glass`** — frosted panel: translucent cream + warm-white border + blur 18.
- **`z`**, **`motion`/`ease`** presets.
- **`HERO_BG`/`onHero`** — retoned pine, still consumed by a handful of non-Home screens (Messages thread header, and others pending conversion) — kept until nothing imports them.

### Surfaces — `src/lib/surfaces.ts`
Exactly **three** surfaces app-wide. Nothing else:
- **`card`** — the default. `#FFFFFF` bg, `1px solid color.border`, `radius.lg` (22). Flat, no shadow.
- **`raised`** — **ONE per screen max**, the hero/stat moment (rank card, estimated-handicap card, wallet card, identity card). `#FFFEFB` bg, `1px solid rgba(120,108,78,0.08)`, `radius.lg` (22), soft shadow `0 10px 26px rgba(58,48,28,0.07)`.
- **`well`** — sunken surface for inputs, numpads, segmented-control tracks. `color.sand` bg, `1px solid color.border`, `radius.sm` (12).
- **`sectionLabel`** — sentence-case section headers, 13px/600, `color.inkSoft`. (Uppercase eyebrow labels are `type.label`, reserved for stat/hero cards only.)

### Radius law
No values outside this scale: **12** (`radius.sm` — inputs, chips, thumbnails, wells) · **18** (`radius.md` — buttons, stat tiles) · **22** (`radius.lg` — cards, default + raised) · **28** (`radius.sheet` — sheets/modals) · **999** (`radius.pill` — true pills only).

### Accent discipline
- **Pine** (`color.green`) — the ONLY CTA/selected color. Never decorative.
- **Orange** (`color.orange`) — ONLY live/attention: badges, unread counts, the active nav dot, over-par deltas, "big gap" flags. Never a button background.
- **Sage** (`color.sage`) — ONLY progress fills and quiet secondary chips.
- **Golf semantics** (birdie/eagle/danger) — data only, never chrome.

### Motion — `src/hooks/useStaggerMount.ts`
The one shared mount animation. `useStaggerMount(ref, { dependencies?, delay? })` animates a container's direct children (`y:22 → 0`, opacity `0 → 1`, `0.58s`, `stagger 0.07`, `power3.out`), gated on `prefers-reduced-motion` via `gsap.matchMedia` (reduced → snaps straight to the visible end state). `dependencies` re-triggers the animation (e.g. a filtered list, a query that just resolved); `delay` is used sparingly (Home passes `0.04` to match its original feel). Replaces hand-rolled per-screen GSAP blocks — adopted so far by Home, Leaderboard, Stats, Bag.

### Screen header — `src/components/PageHeader.tsx`
The one header pattern for list/content screens: optional back row (chevron + "Back") → title (`font.display`, 32 mobile/38 desktop, 700, `-0.04em`) with an optional right-aligned action → optional subtitle (15/400 muted). **Built but not yet adopted anywhere** — screens switch to it one at a time in later redesign passes so each stays independently verifiable.

### Palette
- **Cream** `#F8F3E7` (app bg), `sheet #FFFAF0` (elevated), `creamDeep #EFE7D4`.
- **Pine** `#12371F` — primary CTAs, active states.
- **GreenMid** `#356D3D` — stat chip bg.
- **Sage** `#7D9667` — progress bar, secondary actions, handicap chip.
- **Orange** `#C86718` — see Accent discipline above.
- **Sky** `#9FCFD7` — illustration tones.
- **Ink** `#0B0D0A`, **muted** `#5C625A`, **faint** (disabled), warm borders `#E6DFCC`.
- Golf semantics (data only): birdie `#3F8761`, over-par / orange `#C86718`, eagle `#A8852F`, danger `#BD3A2D`.

### Typography
**Helvetica Neue LT Pro** — a real licensed webfont via **Adobe Fonts (Typekit)**, kit `mci8gnc`, `<link>`'d in `index.html`, family name `helvetica-neue-lt-pro` — for everything. Heavy weights + tight tracking, same bold voice as before (system `Helvetica Neue`/Segoe UI/Arial remain as fallbacks, used offline and in the Capacitor shell). **Bricolage Grotesque** loads only for the `DialWordmark` logo — do not touch `font.wordmark`. **Card labels are 12px/700 uppercase**, now reserved for stat/hero cards only (see Accent discipline / Surfaces above) — everywhere else, section labels are sentence case via `surfaces.sectionLabel`. `type.stat` (new) is the preset for big numerals (points, scores, balances, handicaps, distances) — 700 weight, `-0.04em` tracking, tabular-nums, no fixed size (callers spread it + a local `fontSize`). ⚠️ The Typekit kit currently serves only weights 400/700 — `type.bodyStrong` is spec'd at weight 500 (Medium) but deliberately left at 600 until Medium is added to the kit; other 500/600/650/800 usages across the app are likewise deferred (see §2, §10).

### Logo — `components/DialWordmark.tsx`
**Monochrome + adaptive:** solid near-black `#0B0D0A` on light surfaces, solid white on dark surfaces (`onDark` prop). Single-color "Dial." in Bricolage Grotesque. ⚠️ Do NOT revert to multicolour — this was changed per owner request for contrast on any background.

### Favicon / browser icon — `public/favicon.svg`
Dark pine-green rounded-square (`rx 110` in a 512×512 viewBox), bold white "D" letterform with the golf putting green + flag visible through the inner cutout of the D. Referenced in `index.html` as `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`. Apple touch icon is `public/icon-pwa.png` (unchanged).

### Home screen — `components/Dashboard.tsx` + `components/CourseHero.tsx`

**Layout order (mobile):**
1. **Illustration** — `CourseHero` fills from the very top of the screen, running behind the floating transparent header.
2. **Greeting** — absolutely positioned over the pale sky (`top: safe-area + 62px`); green date (15/600) + bold heading (33px mobile / 38px desktop, 700, −0.05em tracking).
3. **Rank card** (overlaps illustration bottom) — flag chip (48px circle), RANKED POINTS (38px), RANK name (20px) + pts-to-next; sage progress bar; tappable → `RanksModal`.
4. **3 stat cards** (grid) — Last round (pine chip + flag), Handicap (sage H chip), Record (orange trophy chip). Record renders W–L–T as three spaced numbers with quiet lighter dashes (not a cramped string).
5. **CTA pair** — "Log a round" (pine gradient, 52px) + "Friends" (sage tint, 52px).
6. **Clubhouse Feed** (`Feed.tsx`).

**Hero (`CourseHero.tsx`):**
- Loads `public/course-hero.jpg` (the coastal illustration photo); falls back to `CourseHeroArt.tsx` (the SVG version) on error.
- Props: `aspect` (default `"390 / 318"`) and `fadeStart` (default `55`) — the mobile hero uses `aspect="390 / 500"` and `fadeStart={72}` so it's taller and the fade starts later, leaving more blended illustration below the greeting.
- **Bottom fade:** a CSS `mask-image` gradient (`#000 0%→fadeStart%, transparent 100%`) dissolves the foreground green into the cream background — no hard rectangle edge.
- **Wrapper has `overflow: hidden`** so the `.hero-settle` scale animation never shifts layout.

**Motion (Emil pass, 2026-06-13) — Home only:**
- `.hero-settle` CSS class: illustration scales `1.06 → 1` over 1.1s on mount (cinematic "arrive" feel). Gated by `prefers-reduced-motion` (global CSS block neutralizes it).
- Cards **stagger up** on mount via the shared `useStaggerMount` hook (§5) — `y:22 → 0`, `duration 0.58`, `stagger 0.07`, `power3.out`, gated via `gsap.matchMedia`. Home passes `delay: 0.04` to preserve its original feel.
- Points **count up** (GSAP to tween) + rank **bar fills** (`rankBarFill` keyframe).
- Press feedback: scale `0.98` on rank card + CTA buttons.

**RanksModal:** smaller than it used to be — 17px header, 20px points-per-match numbers, 14px tier rows, 12px padding, 14px button. Tier rows stagger in (GSAP). "See friends leaderboard" CTA navigates to `leaderboard` view.

### Bottom tab bar — `components/TopNav.tsx` (mobile only)
Floating frosted pill: `position: fixed`, inset 14px, `borderRadius 28`, `background rgba(255,250,239,0.86)`, `backdropFilter blur(20px) saturate(1.2)`, 1px warm border, drop shadow. Floats `safe-area-bottom + 10px` above screen bottom.

**Active state:** ink icon + ink label + small orange dot (`width/height 5`, `borderRadius 999`) below the label.

**Motion:** pill rises in on first mount (`.nav-pill-in`). On tab switch: dot scales `0.2→1` with overshoot (`cubic-bezier(0.34, 1.56, 0.64, 1)`); icon lifts 1px (`translateY(-1px)`, 260ms same curve). Press scales the entire tab button to `0.92`.

### Mobile header scroll-frost
The mobile top bar is transparent at the top (`background: transparent`, no blur) so the hero illustration shows through. Once the scroll container's `scrollTop` exceeds 30px, `App.tsx` sets `navScrolled = true` → passes `scrolled` prop to `TopNav` → the bar transitions to `background rgba(255,250,239,0.82)` + `backdropFilter blur(18px)` + hairline border + soft shadow over 0.25s. This keeps the logo / bell / avatar legible over scrolled card content on every screen.

### Other design notes
- **Paper grain:** a fixed ~4%-opacity SVG `feTurbulence` noise layer over the cream (in `App.tsx`, `zIndex 1`, `mix-blend-mode: multiply`) — tactile, premium.
- **Directional page transitions:** forward enters from the right, back from the left (`navDir` ref in `App.tsx`; GSAP `power3.out`). All gated by `prefers-reduced-motion`.
- **Glass** exists only on: the floating mobile bottom nav + frosted mobile header (when scrolled) + modal scrims.
- **Shared primitives:** `Avatar.tsx`, `EmptyState.tsx`, `lib/format.ts` (`timeAgo`, `displayName`, `initialOf`, `scoreToPar`, `formatHandicap`, `formatYards`). Use these, never re-implement.
- **`Button.tsx` / `Field.tsx`:** canonical token-based components. `Button` has `primary / secondary / tertiary` tiers + press scale. `Field` is 44px / 16px font (no iOS zoom), background is the `well` recipe (sand, not white). Neither is widely adopted yet (`Field` currently has zero call sites; `Button` has one) — both exist ahead of adoption for later redesign passes to use.
- **`DialRing.tsx`:** precision dial/gauge with tick marks + animated progress arc. Used for rank progress.

---

## 6. Features (file-by-file)

### Auth — `contexts/AuthContext.tsx`, `components/AuthScreen.tsx`
Email/password. Sign-in accepts email **or** `@username` (resolved via `get_email_by_username` RPC). Email confirmation on signup; password reset + recovery (`SetNewPasswordModal` in App). **Signup collects:** first name, last name, username, **country** (CountryPicker), password (strength meter), legal/age agreement. `signUp(...)` then `upsertProfile({ username, country })`.

### Home / Dashboard — `components/Dashboard.tsx`
See §5 for full layout + motion detail. **Rank card is tappable → `RanksModal`** (all tiers, current highlighted, points per match Win +25 / Tie +5 / Loss −10, "See friends leaderboard" link). **Clubhouse Feed** (`Feed.tsx`) sits below the CTAs.

### Clubhouse Feed — `components/Feed.tsx`
Full-width post cards from **you + accepted friends** (`fetchFeedPosts`). Inline like (heart, optimistic), comment count, tap media/comment → shared `PostDetail`. Tap author → their profile (`onViewProfile`). Images `loading="lazy"`. Posts are either **photos** or **round recaps** (`post.kind`): recaps render via `RecapCard` instead of an `<img>`.

### Round recap posts — `components/RecapCard.tsx`, `lib/posts.createRoundPost`
Posts can be a **round recap** (no photo): `posts.kind` ('photo' | 'round') + `posts.meta` jsonb (`RoundRecapMeta`: course, score, par, toPar, holes, GIR, fairways, putts). After finishing a round, **ScorecardView's summary has a "Share this round to your feed" button** (`createRoundPost`). `RecapCard` renders a green scorecard-style card in three variants: `feed`, `detail`, `tile` (profile grid). Requires `SOCIAL_V5.sql` (makes `image_url` nullable, adds `kind` + `meta`).

### Rounds / Scorecard — `components/ScorecardView.tsx`
Phases: history → round_start (pick saved course / featured **Santa Maria** / search via `CourseSearch` / add new) → course_setup → hole_setup → mode_select (**Score only** vs **Score + Stats**) → scorecard (golf-notation cells, tap to type) → summary (stats, scoring breakdown, struggle holes). Uses `lib/rounds.ts`, `lib/courses.ts`, `lib/courseCorrections.ts`.

**Fully on v4** (converted 2026-07-06). History uses `PageHeader` ("Rounds" + Start-round action pill, orange `+` chip). Page tokens throughout (history was `maxWidth 1320` — now `page.maxW` 680). Surfaces come from `card`/`well`; pine (`color.green`) is the one committed-color moment per phase (Santa Maria featured card, Score+Stats card, scorecard header band, summary hero, Done button). **Golf-notation cells re-toned to warm tints** (`ScoreDecoration`): eagle gold on `#F7F0DC`, birdie on `#EAF3EC`, par ink on `color.sand`, bogey orange on `#F9EEDF`, double+ danger on `#F9E9E6` — ring + inner text always match. `TEE_COLORS` stay literal real-world tee-marker hexes (reference data, not chrome). Big numerals use `type.stat`. `useStaggerMount` on the history list + summary content, gated on `phase.type` so it re-fires when each section appears (phases switch via setState, not remount). **`StatsPanel` (the putts/fairway/GIR bottom sheet) now renders through `<Portal>`** — it's `position: fixed` but was previously mounted inside the GSAP-transformed page container, whose lingering `matrix()` transform creates a containing block that could mis-anchor the fixed sheet on mobile.

### Matches — `components/MatchesView.tsx`, `lib/matches.ts`, `lib/wallet.ts`, `lib/points.ts`
Virtual **wallet** (top up / withdraw, USD). Create match: course, 9/18, wager per player, invite friends. **Stroke play is the only format** — the format picker was removed from `NewMatchModal` (2026-07-06); `handleCreate` hardcodes `gameMode: 'stroke'` and a quiet "Stroke play · lowest total wins" line sits under the course field. `lib/matches.ts completeMatch` **retains** its match_play/skins branches for the future; only the UI dropped them (`MODE_LABELS` still maps all four so any legacy non-stroke match renders its label). Invites accept/decline (also in Notifications). Active → `ScoringModal` (per-hole entry, realtime, golf-notation grid same as rounds). Complete → winner determined (stroke = lowest total; match_play = holes won), **pot credited to winner / refunds on tie**, ranked points awarded. **Points:** WIN +25, LOSS −10, TIE +5. **Ranks:** Newcomer(0) → Bronze(100) → Silver(300) → Gold(600) → Platinum(1000) → Diamond(1500) → Legend(2000).

**Fully on v4** (converted 2026-07-06). `PageHeader`, page tokens, `useStaggerMount` on the match-list sections. Wallet card = the screen's one `raised`-shadowed pine hero (balance → `type.stat`). **MatchCard:** pine hero (with soft shadow) when active or won, flat `card` otherwise — the old `isDark` inset-shadow treatment is gone; buttons are consistent pine-primary / sand-secondary at `radius.md`. Status chips: Won = gold tint, Lost/Tie = sand. `NewMatchModal` + `ScoringModal` re-toned to warm-cream (standard scrim + `radius.sheet`, `well` inputs, wager chips select **pine** not orange); `MatchScoreDecoration` uses the exact same warm tints as the Rounds `ScoreDecoration`. Orange survives only as the trophy accent + attention chips (accent discipline).

### Tools — `components/ToolsView.tsx`
Hub → **Stats** (`StatsView.tsx`), **Bag** (`BagView.tsx`, club distances from shots), **Dial In** (`DialInView.tsx`, shot/wind calculator), **Rounds** (Scorecard), **Practice** (`PracticeView.tsx`, training log).

### Stats / Trends — `components/StatsView.tsx`, `lib/stats.ts`
Read-only, computed from logged rounds + shots (no schema). Shows an **estimated handicap** (best 8 of last 20 complete 18-hole rounds' to-par × 0.96), a **recent-rounds bar chart** colored by to-par, **averages** (GIR%, fairways%, putts/18, scrambling%), and **bag gap analysis** (consecutive club-distance gaps, flags "full club" gaps ≥18yd). Pure functions live in `lib/stats.ts`.

### Log a shot — `components/LogShotModal.tsx`
Quick club-distance capture (numpad + club picker + note). Opened from the "Log a shot" create-menu item; saves a `shots` row.

### Leaderboard — `components/LeaderboardView.tsx`, `lib/leaderboard.ts`
Ranks **you + your accepted friends by all-time ranked points** (read from `user_profiles`). Medals for top 3, your row highlighted in dark green, rank tier + W/L + country flag, tap a row → their profile. Reached from the Friends tab and from the RanksModal "See friends leaderboard" button.

### Friends — `components/FriendsView.tsx`, `lib/friends.ts`
Search users by username, send/accept/decline/remove requests, friends list. **Tapping a friend opens their full profile page** (`onViewProfile` → ProfileView).

### Messages / DMs — `components/MessagesView.tsx`, `lib/messages.ts`
Conversation list (avatar, last-message preview, time, unread badge) + **chat thread** (`Thread`): realtime delivery, optimistic send, read receipts, **per-message timestamps + day separators**, grouped bubbles. **Mobile keyboard:** thread pins to `window.visualViewport`. Input 16px to avoid iOS zoom. **Header tappable → opens other player's profile.** New-message picker searches friends + any user. Failed sends show an inline error banner. Conversations keyed by sorted user pair (`lib/messages.ts pair()`).

### Profile — `components/ProfileView.tsx`, `components/ProfilePosts.tsx`
**Full page** (own + other users). **v3 "Warm Clubhouse" identity card** (redesigned 2026-06-16, replacing the old dark-pine hero): a cream/white card whose cover banner is the same coastal `CourseHero` illustration as Home (short aspect, fades into the card). On desktop the card takes `surfaces.raised` chrome (radius, border, shadow); **mobile stays intentionally full-bleed/chromeless** (no border/radius/shadow) — don't "fix" that into a bordered card. The avatar overlaps the banner inside a pine/tier-colored `DialRing`; below it sit name, `@username`, **country flag chip + rank chip**, the stats row (handicap / points / friends, ink numbers on cream), **W/L/T as three tinted tiles** (sage / orange / sand), and a sage→tier gradient rank-progress bar. **Own:** "Edit profile" pill + camera badge → Settings; tap avatar → Settings. **Other:** frosted Back pill + full-width pine **Message** button. Friends stat tappable. Below: **`ProfilePosts`** — 3-col grid; composer (own only); `PostDetail` (big image, like, comments, delete own). Comments support likes + Reply. 3-dot menu: Delete (own) / Report (others' → `ReportSheet` → `post_reports`).

### Settings — `components/SettingsView.tsx`
Header via `PageHeader` (onBack). Sections: Account, Location (CountryPicker), Security, Golf Profile, Game Defaults, Goals, Privacy, About (LegalModal), Sign out, **Danger zone**. The dark profile-header card keeps its pine background but takes radius/shadow from `surfaces.raised` (it's the screen's hero moment). Saves via `upsertProfile`. Avatar upload here + on ProfileView. **Danger zone → Delete account:** opens a Portal confirmation sheet requiring the user to type `DELETE`, then calls `deleteAccount()` (`lib/profile.ts` → `supabase.rpc('delete_my_account')`, see `DELETE_ACCOUNT.sql`) and signs out. This permanently erases all their data **and** their `auth.users` row.

### Notifications — `components/NotificationsView.tsx`, `lib/notifications.ts`
Friend requests + match invites with accept/decline + activity feed from `notifications` table (tagged, reposted, liked, commented). Realtime. Opening marks read. Bell badge = pending friend requests + match invites + unread notifications.

### Tagging & reposts — `lib/posts.ts`, `lib/notifications.ts`
Composer has "Tag players" friend-multiselect → `createPost(..., taggedIds)` inserts `post_tags` + notifications. Feed includes reposts: "↻ @X reposted" header, Repost button (`toggleRepost`) → `reposts` row + notification to original author.

### Country picker — `components/CountryPicker.tsx`, `lib/countries.ts`
Searchable modal sheet (Portal) listing ~195 countries with flag emojis. Used in signup + settings.

---

## 7. Data layer conventions (`src/lib/`)
- **Caching = TanStack React Query.** `lib/queryClient.ts`: 30s staleTime, background refetch on focus. Query keys: `['feed', userId]`, `['conversations', userId]`, `['leaderboard', meId]`, `['userPosts', target, me]`, `['friends', userId]`, `['notifications', userId]`, `['matchesData', userId]`. First loads render shimmer `Skeleton` — never a "Loading…" string. Scroll position preserved per tab (`scrollPos`/`pendingScroll` refs, restored via `useLayoutEffect`).
- **DB is snake_case, TS is camelCase.** Each lib has `toX(row)` converter functions.
- **Files:** `supabase.ts`, `profile.ts` (incl. `deleteAccount()`), `friends.ts`, `rounds.ts`, `courses.ts`, `courseCorrections.ts`, `shots.ts`, `practice.ts`, `matches.ts`, `wallet.ts`, `points.ts`, `feed.ts`, `messages.ts`, `posts.ts`, `notifications.ts`, `golfCourseApi.ts`, `countries.ts`, `imageCompress.ts`.
- **Image uploads auto-compressed** client-side (`imageCompress.compressImage()`): avatars ≤512px, post images ≤1440px.
- **Course naming:** `golfCourseApi.courseDisplayName()` prefers `club_name` + explicit overrides — **14916 → "Club de Golf de Panama"**, **25374 → "Santa Maria Golf & Country Club"**.

---

## 8. Known pending / gotchas
- **Run `MORE_SCHEMA.sql`** (country column) — otherwise profile queries error.
- **Run `DELETE_ACCOUNT.sql`** — otherwise Settings → Delete account errors (`delete_my_account` RPC missing).
- **v4 conversion status:** every screen is now on v4, including **Rounds/Scorecard** and **Matches** (see §5). Remaining v2 hold-outs are small: `LegalModal`, `CourseSearch`, and `SetNewPasswordModal` (inside `App.tsx`) — handled in the stragglers prompt. The deep-pine `HERO_BG`/`onHero` tokens remain for the Messages thread header (intentional pine accent); `CourseContour.tsx` is now unused (slated for deletion in the stragglers prompt).
- **Match formats:** stroke play only in the UI; other formats removed from `NewMatchModal` 2026-07-06 (logic retained in `lib/matches.ts`).
- The native app (`DialApp-Native`) is far behind the web app.
- `react-hooks/set-state-in-effect` lint messages are intentional/accepted.
- Every modal must use `<Portal>`.
- **Motion pass scope:** Emil-style motion has been applied to **Home screen + bottom nav only** (2026-06-13). Rest of app is pending a future pass using the same vocabulary (hero settles, spring dots, staggers).
- **iOS app (Capacitor):** set up — `@capacitor/*` v8 installed, `capacitor.config.ts` (appId `xyz.dialgolf.app`, appName Dial, webDir `dist`), `src/lib/native.ts` (`initNative()` for status bar/keyboard/splash/haptics, guarded by `Capacitor.isNativePlatform()`). Native `ios/` project + Xcode build must be done **on a Mac**. Full steps in `IOS_APP_MORPH.md`.

---

## 9. Working agreements (IMPORTANT for agents)
1. **Auto-push:** after completing a coherent set of changes that builds clean, `git add -A`, commit with a clear message (end with the Claude co-author trailer), and `git push origin main`. **Do not ask the user to push.**
2. **Keep this file updated:** any change to features, files, schema, or conventions → update the relevant section here in the same commit.
3. **Verify before pushing:** `npx tsc -b` (exit 0) + `npx vite build` (success). Fix unused-code (noUnusedLocals/Parameters are on).
4. **Mobile-first:** test/reason about phone layout; wrap modals in Portal; keep inputs ≥16px to avoid iOS zoom.
5. Commit message co-author trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## 10. Changelog (most recent first)

| Date | Change |
|------|--------|
| 2026-07-06 | **Matches → v4 + formats dropped** — `MatchesView.tsx` (~1000 lines) fully converted off v2: `PageHeader`, page tokens, `useStaggerMount`; wallet card is the one `raised` pine hero (balance `type.stat`); MatchCard pine-when-active/won else flat `card` (killed the `isDark` inset-shadow); consistent pine/sand buttons at `radius.md`; Won=gold / Lost·Tie=sand chips; `NewMatchModal`+`ScoringModal` warm-cream (standard scrim, `well` inputs, pine-selected wager chips); `MatchScoreDecoration` matches the Rounds warm tints. **The three "Coming soon" formats (match_play/skins/wolf) were removed from the New Match sheet** — stroke play only, `gameMode:'stroke'` hardcoded; `lib/matches.ts` logic untouched. Fifth prompt of the redesign pass |
| 2026-07-06 | **Rounds/Scorecard → v4** — `ScorecardView.tsx` (all 7 phases) fully converted off the v2 "Private Club" palette to warm-cream v4: page tokens (history `maxWidth 1320`→680), `PageHeader` on history, `card`/`well` surfaces, pine as the one committed-color per phase, golf-notation cells re-toned to warm tints (gold/birdie/par/bogey/danger), `type.stat` numerals, `useStaggerMount` (history + summary, gated on `phase.type`). **Bug fix:** `StatsPanel` bottom sheet now renders through `<Portal>` (was `position:fixed` inside the GSAP-transformed page container → could mis-anchor on mobile). Fourth prompt of the redesign pass |
| 2026-07-06 | **v4 normalization pass — 12 screens** — Friends, Notifications, Messages (inbox), Tools, Bag, Dial In, Practice, Settings, Stats, Leaderboard, Profile and Dashboard all adopt the `page` layout tokens (widths/padding — no more per-screen magic numbers). `PageHeader` adopted by the first 10 of those (back row + title + optional action/subtitle, replacing each screen's hand-rolled header). `useStaggerMount` adopted by all 12 (each screen now has exactly one mount animation; Leaderboard's stagger axis changed from a horizontal slide to the shared vertical one). Stats + Leaderboard's hero cards and Profile's desktop identity card switch to `surfaces.raised`. Several legacy `radius.card` (18) references renamed to `radius.md`/`radius.lg` per the v4 radius law. Third prompt of the redesign pass (`REDESIGN_PROMPTS.md`) — ScorecardView and MatchesView (still v2) are next |
| 2026-07-06 | **Design system v4 "Warm Clubhouse — Editorial"** — `lib/tokens.ts` gains `page` (layout widths/padding) and `type.stat` (tabular-nums numeral preset); `lib/surfaces.ts` rewritten to exactly three surfaces (`card`/`raised`/`well`, replacing `cardRaised`/`inputSurface`, both unused); new `src/hooks/useStaggerMount.ts` (shared mount-stagger, adopted by Home/Leaderboard/Stats/Bag) and `src/components/PageHeader.tsx` (built, not yet adopted). Dashboard + Feed drop their local `panel`/`feedCard` card recipes for the shared `card`/`raised`. `Field.tsx` background switched to the `well` (sand) recipe. Accent-discipline + radius-law rules documented inline in tokens.ts. Second prompt of the redesign pass (`REDESIGN_PROMPTS.md`) — screen-by-screen adoption (headers, widths, remaining card conversions) continues in later prompts |
| 2026-07-06 | **Helvetica Neue LT Pro loaded via Adobe Fonts** (kit `mci8gnc`) — replaces the unloaded 'Space Grotesk'/'Geist' font-family strings that had been silently falling back to system fonts in `ScorecardView`, `MatchesView`, `CourseSearch`, `LegalModal`, `Toast` (now import `font` from `lib/tokens`). `lib/tokens.ts` `SANS` stack now leads with `helvetica-neue-lt-pro`. Bricolage wordmark untouched. Font-weight normalization (500/600/650/800 → kit's actual weights) deferred until Medium/Heavy are added to the Typekit kit (currently only 400/700 are live) — first prompt of a larger redesign pass tracked in `REDESIGN_PROMPTS.md` (one level above `dial-app/`, outside this repo) |
| 2026-06-16 | **Delete account** — Settings → Danger zone, type-`DELETE` confirm sheet → `delete_my_account()` RPC wipes all user data + `auth.users` row (`DELETE_ACCOUNT.sql`, `lib/profile.deleteAccount`) |
| 2026-06-16 | **No duplicate onboarding** — Onboarding prefills name/username/country from sign-up (profile → `user_metadata`) and skips those steps; only asks handicap/course/photo. `signUp` now also persists `first_name` |
| 2026-06-16 | **Profile screen redesigned** to v3 warm cream — coastal `CourseHero` cover banner, pine `DialRing` avatar, cream stat row, tinted W/L/T tiles, sage→tier progress (was dark-pine hero) |
| 2026-06-16 | **Leaderboard + Stats** dark-pine heroes converted to warm cream headers to match Home |
| 2026-06-16 | **PWA icon / OG share image** updated; OG cache-busted (`?v=2`); manifest icon sizes corrected to 1254×1254, `any`/`maskable` split |
| 2026-06-13 | **Favicon** replaced with new D+golf-green icon (dark pine rounded square, white D, flag through cutout) — `public/favicon.svg` |
| 2026-06-13 | **Scroll-aware frosted header** — mobile top bar frosts in (blur + hairline + shadow) once content scrolls > 30px under it; transparent at top to preserve the hero look |
| 2026-06-13 | **Motion pass (Emil) — Home + bottom nav:** hero settle (scale 1.06→1), tightened stagger (y22, 0.07), spring active-dot + icon lift, nav pill entrance |
| 2026-06-13 | **Floating pill bottom nav** — inset, rounded-28, shadow; orange dot active indicator (was docked bar + underline) |
| 2026-06-13 | **Monochrome adaptive logo** — `DialWordmark` is now solid black on light / white on dark (was multicolour green/orange/sage) |
| 2026-06-13 | **Record stat card** — W–L–T rendered as three spaced numbers with quiet dashes (was cramped `1–0–0` string) |
| 2026-06-13 | **Greeting offset** tuned to clear the logo; mobile hero grew to `390/500` to keep horizon below greeting |
| 2026-06-13 | **Mobile hero full-bleed to top** — TopNav is `position: absolute` overlay; hero fills from y=0 behind floating header; non-Home views get `paddingTop` to clear it |
| 2026-06-13 | **Hero bottom fade** — `mask-image` gradient dissolves foreground green into cream; `CourseHero` gains `aspect`/`fadeStart` props |
| 2026-06-13 | **Type scale tightened** — greeting 33/38px, rank number 38px, stat numbers 24px, RanksModal padding reduced |
| 2026-06-11 | **Redesign v3 "Warm Clubhouse"** — Home rebuilt from owner's prototype; warm tokens app-wide; `CourseHeroArt.tsx`; frosted glass rank card; pine/sage/orange palette |

### Older history
- **Redesign v2 "Private Club" (2026-06):** cool light-neutral content + deep-green heroes — superseded by v3 tokens but the `HERO_BG`/`onHero` tokens + `CourseContour.tsx` remain for non-Home screens.
- **Phases 1–7:** React Query caching, shimmer skeletons, toast system, gestures (edge-swipe back, swipe-down dismiss), haptics, directional page transitions, design tokens, onboarding flow, social feel (comment previews, profile polish).
