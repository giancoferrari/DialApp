// ─────────────────────────────────────────────────────────────────────────
// Dial design system v4 "Warm Clubhouse — Editorial" — the single source of
// truth for layout, spacing, type, color, surfaces, radius and motion.
// Import what you need:
//
//   import { color, space, radius, font, type, page, elevation, motion } from '../lib/tokens'
//   import { card, raised, well, sectionLabel } from '../lib/surfaces'
//
// Rules of the house:
//  • One typeface (Helvetica Neue LT Pro, via Adobe Fonts) — hierarchy via
//    size + weight, never font-switching. Bricolage Grotesque is reserved
//    for the "Dial." wordmark only.
//  • Warm cream field, pine ink, sage support, orange signal. Green
//    (`color.green`) is the ONLY CTA/selected color.
//  • Layout comes from `page` (max widths, padding, top/bottom clearance) —
//    no ad-hoc maxWidth/padding numbers per screen.
//  • Spacing comes from `space` (a strict 4/8pt scale) — no magic numbers.
//  • Type sizes come from `type` — no decimal font sizes (14.5, 10.5…). Big
//    numerals (points, scores, balances, handicaps) spread `type.stat` + a
//    local fontSize. `type.label` (uppercase eyebrow) is reserved for
//    stat/hero cards only — everywhere else, section labels are sentence
//    case via `surfaces.sectionLabel`.
//  • Exactly THREE surfaces (see `lib/surfaces.ts`): `card` (flat default),
//    `raised` (the ONE hero card per screen — rank/handicap/wallet/identity),
//    `well` (sunken — inputs, numpads, segmented tracks). Elevation/blur
//    otherwise reserved for things that float: menus, sheets, toasts, the
//    mobile bottom nav, modal scrims.
//  • Radius law — no values outside this scale:
//      12 (radius.sm)   inputs, chips, thumbnails, wells
//      18 (radius.md)   buttons, stat tiles
//      22 (radius.lg)   cards (default + raised)
//      28 (radius.sheet) sheets / modals
//      999 (radius.pill) true pills only
//  • Accent discipline:
//      – Pine (`color.green`): the ONLY CTA/selected color.
//      – Orange (`color.orange`): ONLY live/attention — badges, unread
//        counts, the active nav dot, over-par deltas, "big gap" flags.
//        Never decorative, never a button background.
//      – Sage (`color.sage`): ONLY progress fills and quiet secondary chips.
//      – Golf semantics (birdie/eagle/danger): data only, never chrome.
//  • One motion vocabulary: `useStaggerMount` (see `hooks/useStaggerMount.ts`)
//    for every screen's mount animation — y:22→0, 0.58s, stagger 0.07,
//    power3.out, gated on prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────────────

// ── Typeface — Helvetica Neue LT Pro, served via Adobe Fonts (Typekit) ──
// The kit ("mci8gnc", loaded in index.html) serves the real licensed
// Helvetica Neue LT Pro family under the font-family name
// 'helvetica-neue-lt-pro'. System 'Helvetica Neue' is the offline/Capacitor
// fallback (iOS ships it natively), then Helvetica/Arial/system-ui.
// Hierarchy comes from weight + tight tracking, exactly like the prototype
// (greeting 700/-0.045em, labels 700 uppercase).
// Bricolage Grotesque is loaded only for the "Dial." wordmark — never touch
// font.wordmark when working on body/display type.
const SANS = "'helvetica-neue-lt-pro', 'Helvetica Neue', Helvetica, Arial, system-ui, -apple-system, sans-serif"

export const font = {
  display: SANS, // big numbers, greetings, headings — heavy weight, tight tracking
  body: SANS,
  wordmark: "'Bricolage Grotesque', 'Helvetica Neue', sans-serif", // logo only
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
} as const

// Apply to any element showing figures that should align in columns.
export const numeric = { fontVariantNumeric: 'tabular-nums' } as const

// ── Spacing — strict 4 / 8 scale ──────────────────────────────────────────
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
} as const

// ── Layout — one set of widths/padding for every list/content screen ───────
// Dashboard keeps its own full-bleed hero handling but still adopts the
// px/bottom values here. Hero/feed screens use `contentW` for the inner
// column; everything else just uses `maxW` as its single outer wrapper.
export const page = {
  maxW: 680,          // outer wrapper on every list/content screen
  contentW: 600,      // inner column for hero/feed screens
  pxMobile: 20,
  pxDesktop: 40,
  topMobile: 24,
  topDesktop: 44,
  bottomMobile: 120,  // clears the floating pill nav
  bottomDesktop: 80,
} as const

// ── Radius — the prototype's scale (12 / 18 / 22 / 28 / pill) ──────────────
export const radius = {
  sm: 12,   // thumbnails, chips, inputs, small controls, wells
  md: 18,   // buttons, stat tiles
  // NOTE: legacy key, kept for existing call sites — under the v4 radius
  // law cards are `lg` (22), not this. Don't use `card` in new code; it's
  // migrated away screen-by-screen in later redesign prompts.
  card: 18,
  lg: 22,   // cards (default + raised), rank / feed cards
  sheet: 28,// modals / bottom sheets
  pill: 999,
} as const

// ── Color — warm premium golf palette (from the dial-home prototype) ───────
// Accent discipline (enforce in every new component):
//   • green  — the ONLY CTA/selected color. Never decorative.
//   • orange — ONLY live/attention: badges, unread counts, the active nav
//     dot, over-par deltas, "big gap" flags. Never a button background.
//   • sage   — ONLY progress fills and quiet secondary chips.
//   • birdie/gold/danger (golf semantics) — data only, never chrome.
// Every value below is a CSS custom-property reference into src/index.css's
// :root block (light values) / [data-theme="dark"] block (dark overrides,
// added in the dark-mode pass) — the export shape and every call site stay
// identical whichever theme is active. See index.css for the literal hex.
export const color = {
  // Brand pine — primary CTAs, active icons, identity.
  green: 'var(--c-green)',
  greenDeep: 'var(--c-green-deep)',   // hover / pressed
  greenDark: 'var(--c-green-dark)',   // immersive dark hero surfaces
  greenMid: 'var(--c-green-mid)',     // stat icon chips
  sage: 'var(--c-sage)',              // progress, secondary accents — ONLY those two roles
  sageLight: 'var(--c-sage-light)',
  greenTint: 'var(--c-green-tint)',   // selected backgrounds, badges, soft chips

  // Surfaces (warm cream ladder: bg → well → sheet → card)
  cream: 'var(--c-cream)',       // app background
  creamDeep: 'var(--c-cream-deep)',
  sand: 'var(--c-sand)',         // sunken wells / segmented-control tracks
  sheet: 'var(--c-sheet)',       // modal & sheet bodies, frosted panels
  card: 'var(--c-card)',         // cards
  white: 'var(--c-white)',

  // Text (ink → soft → muted → faint)
  ink: 'var(--c-ink)',
  inkSoft: 'var(--c-ink-soft)',
  muted: 'var(--c-muted)',
  faint: 'var(--c-faint)',
  onGreen: 'var(--c-on-green)',  // text on the brand pine

  // Lines
  border: 'var(--c-border)',
  borderStrong: 'var(--c-border-strong)',

  // Accent + illustration tones
  orange: 'var(--c-orange)',      // attention ONLY: badges, unread, active nav dot, over-par deltas, gap flags — never decorative, never a button bg
  orangeDeep: 'var(--c-orange-deep)',
  sky: 'var(--c-sky)',            // ocean / sky illustration tone
  gold: 'var(--c-gold)',          // eagle

  // Functional / golf semantics — data colors, never decoration
  birdie: 'var(--c-birdie)',      // under par
  positive: 'var(--c-positive)',
  danger: 'var(--c-danger)',
  dangerDeep: 'var(--c-danger-deep)',
  // Shared "error block" recipe (inline banners across the app) — always
  // paired: dangerBg background + dangerBorder 1px border + dangerDeep text.
  dangerBg: 'var(--c-danger-bg)',
  dangerBorder: 'var(--c-danger-border)',
  // Golf-notation cell tints — ScorecardView's ScoreDecoration and
  // MatchesView's MatchScoreDecoration both use these four identically.
  eagleTint: 'var(--c-eagle-tint)',
  birdieTint: 'var(--c-birdie-tint)',
  bogeyTint: 'var(--c-bogey-tint)',
  doubleTint: 'var(--c-double-tint)',
} as const

// ── Glass — the prototype's restrained frosted panel ───────────────────────
export const glass = {
  bg: 'var(--glass-bg)',
  border: 'var(--glass-border)',
  blur: 'blur(18px) saturate(1.18)',
  shadow: 'var(--glass-shadow)',
} as const

// ── Elevation — soft warm shadows (prototype: low-opacity pine/brown) ──────
export const elevation = {
  flat: 'none',              // pair with a 1px border
  sm: 'var(--shadow-sm)',    // cards that float a little
  md: 'var(--shadow-md)',    // menus, popovers
  lg: 'var(--shadow-lg)',    // sheets / modals
} as const

// ── Z-index ladder ─────────────────────────────────────────────────────────
export const z = {
  nav: 100,
  sheet: 210,
  modal: 220,
  toast: 400,
} as const

// ── Motion — one spring easing standard ────────────────────────────────────
export const motion = {
  // The Dial spring: gentle overshoot-free settle. Use for nearly everything.
  spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
  // Sharper decelerate for entrances.
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Symmetric for color/opacity micro-transitions.
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  dur: { fast: 160, base: 240, slow: 360 },
} as const

// GSAP-friendly numeric durations (seconds) + easing names mapped to the above.
export const ease = {
  spring: 'power3.out',
  out: 'expo.out',
} as const

// ── Type presets — spread onto a style object ──────────────────────────────
// Bold iOS-style system type: heavy weights, tight tracking (prototype scale).
// e.g. <h2 style={{ ...type.title, color: color.ink }}>
export const type = {
  display: { fontFamily: SANS, fontSize: 44, lineHeight: 0.98, letterSpacing: '-0.045em', fontWeight: 700 },
  hero:    { fontFamily: SANS, fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.035em', fontWeight: 700 },
  section: { fontFamily: SANS, fontSize: 21, lineHeight: 1.15, letterSpacing: '-0.03em',  fontWeight: 700 },
  title:   { fontFamily: SANS, fontSize: 17, lineHeight: 1.3,  letterSpacing: '-0.02em',  fontWeight: 700 },
  // NOTE: spec calls for weight 500 here (Medium) — deferred to weight 600
  // because the Typekit kit currently only serves 400/700; revisit once
  // Medium is added (see DOCUMENTATION.md §2/§10).
  bodyStrong: { fontFamily: SANS, fontSize: 15, lineHeight: 1.5, letterSpacing: '-0.01em', fontWeight: 600 },
  body:    { fontFamily: SANS, fontSize: 15, lineHeight: 1.5, fontWeight: 400 },
  small:   { fontFamily: SANS, fontSize: 13, lineHeight: 1.45, fontWeight: 400 },
  caption: { fontFamily: SANS, fontSize: 12, lineHeight: 1.4, fontWeight: 500 },
  // Card label — small, heavy, uppercase (the prototype's label voice).
  // Reserved for stat/hero cards only; elsewhere use surfaces.sectionLabel.
  label:   { fontFamily: SANS, fontSize: 12, lineHeight: 1.3, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' as const, color: 'var(--c-label-text)' },
  // Big numerals — points, scores, balances, handicaps, distances. Callers
  // spread this + a local fontSize (no fixed size here, sizes vary a lot).
  stat: { fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' as const },
} as const

// ── On-hero text/fill tokens for the pine surfaces that remain (the
// Messages thread header, and a few pine hero cards). `HERO_BG` (the old
// deep-pine radial) was removed 2026-07-06 — nothing consumed it after the
// v4 conversion. `onHero` is still used by Leaderboard/Messages/Settings.
export const onHero = {
  text: '#FFFAF1',
  soft: 'rgba(255,250,241,0.72)',
  faint: 'rgba(255,250,241,0.52)',
  line: 'rgba(255,250,241,0.14)',
  fill: 'rgba(255,255,255,0.08)',
  fillStrong: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.14)',
} as const

export const FONT_STACK = SANS
