// ─────────────────────────────────────────────────────────────────────────
// Dial design system v2 — the single source of truth for spacing, type,
// color, elevation, radius and motion. Import what you need:
//
//   import { color, space, radius, font, type, elevation, motion } from '../lib/tokens'
//
// Rules of the house:
//  • One typeface (Geist) — hierarchy via size + weight, never font-switching.
//  • Cool light-neutral surfaces. Green is the single brand color and is
//    reserved for primary actions, identity moments and selected states.
//  • Spacing comes from `space` (a strict 4/8pt scale) — no magic numbers.
//  • Type sizes come from `type` — no decimal font sizes (14.5, 10.5…).
//  • Cards are FLAT (white + hairline border, no shadow, no blur). Elevation
//    only for things that float: menus, sheets, toasts. Backdrop-blur only
//    on the mobile bottom nav and modal scrims.
//  • No uppercase letter-spaced eyebrow labels. Section labels are sentence
//    case, 13px / 600.
// ─────────────────────────────────────────────────────────────────────────

// ── Typeface — bold iOS-style system sans (per the dial-home prototype) ──
// One stack for everything: SF Pro on Apple devices, Helvetica/Segoe
// elsewhere. Hierarchy comes from heavy weights + tight tracking, exactly
// like the prototype (greeting 700/-0.045em, labels 700 uppercase).
// Bricolage Grotesque is loaded only for the multicolor wordmark.
const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', Helvetica, Arial, sans-serif"

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

// ── Radius — the prototype's scale (12 / 18 / 22 / 28 / pill) ──────────────
export const radius = {
  sm: 12,   // thumbnails, chips, inputs, small controls
  md: 18,   // stat cards, buttons
  card: 18, // cards
  lg: 22,   // rank / feed cards
  sheet: 28,// modals / bottom sheets
  pill: 999,
} as const

// ── Color — warm premium golf palette (from the dial-home prototype) ───────
export const color = {
  // Brand pine — primary CTAs, active icons, identity.
  green: '#12371F',
  greenDeep: '#0C2A17',   // hover / pressed
  greenDark: '#0A2413',   // immersive dark hero surfaces
  greenMid: '#356D3D',    // stat icon chips
  sage: '#7D9667',        // progress, secondary accents
  sageLight: '#DDE8D3',
  greenTint: '#E3ECD8',   // selected backgrounds, badges, soft chips

  // Surfaces (warm cream ladder: bg → well → sheet → card)
  cream: '#F8F3E7',       // app background
  creamDeep: '#EFE7D4',
  sand: '#F1EBDB',        // sunken wells / segmented-control tracks
  sheet: '#FFFAF0',       // modal & sheet bodies, frosted panels
  card: '#FFFFFF',        // cards
  white: '#FFFFFF',

  // Text (ink → soft → muted → faint)
  ink: '#0B0D0A',
  inkSoft: '#3D423C',
  muted: '#5C625A',
  faint: '#8A9085',
  onGreen: '#FFFAF1',     // text on the brand pine

  // Lines
  border: '#E6DFCC',
  borderStrong: '#D3CBB5',

  // Accent + illustration tones
  orange: '#C86718',      // reactions, deltas, active nav indicator
  orangeDeep: '#9E4F0E',
  sky: '#9FCFD7',         // ocean / sky illustration tone
  gold: '#B08828',        // eagle

  // Functional / golf semantics — data colors, never decoration
  birdie: '#3E7A4E',      // under par
  positive: '#356D3D',
  danger: '#BD3A2D',
  dangerDeep: '#8C2A21',
} as const

// ── Glass — the prototype's restrained frosted panel ───────────────────────
export const glass = {
  bg: 'linear-gradient(145deg, rgba(255,255,255,0.7), rgba(247,241,226,0.62)), rgba(255,250,239,0.76)',
  border: '1px solid rgba(255,255,255,0.76)',
  blur: 'blur(18px) saturate(1.18)',
  shadow: '0 8px 14px rgba(42,36,24,0.13)',
} as const

// ── Elevation — soft warm shadows (prototype: low-opacity pine/brown) ──────
export const elevation = {
  flat: 'none',                                            // pair with a 1px border
  sm: '0 8px 14px rgba(41,35,21,0.09)',                    // cards that float a little
  md: '0 10px 22px rgba(42,36,24,0.13)',                   // menus, popovers
  lg: '0 24px 52px rgba(42,36,24,0.22)',                   // sheets / modals
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
  display: { fontFamily: SANS, fontSize: 40, lineHeight: 0.98, letterSpacing: '-0.045em', fontWeight: 700 },
  hero:    { fontFamily: SANS, fontSize: 28, lineHeight: 1.06, letterSpacing: '-0.035em', fontWeight: 700 },
  section: { fontFamily: SANS, fontSize: 21, lineHeight: 1.15, letterSpacing: '-0.03em',  fontWeight: 700 },
  title:   { fontFamily: SANS, fontSize: 17, lineHeight: 1.3,  letterSpacing: '-0.025em', fontWeight: 700 },
  bodyStrong: { fontFamily: SANS, fontSize: 15, lineHeight: 1.5, letterSpacing: '-0.01em', fontWeight: 600 },
  body:    { fontFamily: SANS, fontSize: 15, lineHeight: 1.5, fontWeight: 400 },
  small:   { fontFamily: SANS, fontSize: 13, lineHeight: 1.45, fontWeight: 400 },
  caption: { fontFamily: SANS, fontSize: 12, lineHeight: 1.4, fontWeight: 500 },
  // Card label — small, heavy, uppercase (the prototype's label voice).
  label:   { fontFamily: SANS, fontSize: 12, lineHeight: 1.3, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' as const, color: '#30332F' },
} as const

// ── Hero — the immersive deep-pine surface (Profile, Leaderboard, Stats…) ──
export const HERO_BG = 'radial-gradient(130% 100% at 12% -10%, #1B4A2B 0%, #123620 48%, #0C2715 100%)'
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
