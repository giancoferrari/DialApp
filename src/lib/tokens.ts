// ─────────────────────────────────────────────────────────────────────────
// Dial design system — the single source of truth for spacing, type, color,
// elevation, radius and motion. Import what you need:
//
//   import { color, space, radius, font, type, elevation, motion } from '../lib/tokens'
//
// Rules of the house:
//  • Spacing comes from `space` (a strict 4/8pt scale) — no magic numbers.
//  • Two typefaces: Bricolage Grotesque (display) + DM Sans (body), via `font`.
//  • Numbers that sit in columns (scores, handicaps, yardages) use `numeric`.
//  • Most cards are FLAT (hairline border, no shadow). Reserve elevation for
//    things that genuinely float (sheets, menus, toasts).
// ─────────────────────────────────────────────────────────────────────────

// ── Typeface ────────────────────────────────────────────────────────────
// The original pairing: Bricolage Grotesque for display/headings/large
// numbers, DM Sans for body & UI. Loaded from Google Fonts in index.html.
const DISPLAY = "'Bricolage Grotesque', sans-serif"
const BODY = "'DM Sans', sans-serif"

export const font = {
  display: DISPLAY, // headings / large numbers — pair with tight tracking + weight 700
  body: BODY,       // body & UI
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

// ── Radius — concentric (nested corners are smaller than their container) ──
export const radius = {
  sm: 8,    // chips, inputs
  md: 12,   // buttons, small cards
  card: 16, // cards
  lg: 20,   // large cards
  sheet: 24,// modals / bottom sheets
  pill: 999,
} as const

// ── Color — semantic names over the canonical Dial palette ─────────────────
export const color = {
  // Brand greens
  green: '#1F3A2A',      // primary dark green (CTAs, headers)
  greenDeep: '#16271D',
  greenMid: '#5C7A4D',
  sage: '#8B9E6E',
  sageLight: '#B5C29A',

  // Surfaces (a warm cream ladder: app → sand → sheet → card → white)
  cream: '#FAF6EA',      // app background
  creamDeep: '#EDE8D4',
  sand: '#F0EBDD',       // sunken / inputs
  sheet: '#F5F0E6',      // modal & sheet bodies
  card: '#FFFDF8',       // raised card on cream
  white: '#FFFFFF',

  // Text (ink → soft → muted → faint)
  ink: '#1F1D17',
  inkSoft: '#4A4235',
  muted: '#6B5F4E',
  faint: '#8B8272',
  onGreen: '#FAF6EA',    // text on the dark green

  // Lines
  border: '#E0D8C5',
  borderStrong: '#C9C0A8',

  // Accent (use sparingly — one key action per screen)
  orange: '#D9824D',
  orangeDeep: '#C0603A',
  gold: '#C8A84B',

  // Functional / golf semantics
  birdie: '#8BC47A',     // under par / positive
  positive: '#5C7A4D',
  danger: '#C0392B',
  dangerDeep: '#991B1B',
} as const

// ── Elevation — three levels, nothing more ─────────────────────────────────
export const elevation = {
  flat: 'none',                                   // pair with a 1px border
  sm: '0 1px 2px rgba(31,29,23,0.05), 0 4px 12px rgba(31,29,23,0.05)',
  md: '0 8px 24px rgba(31,58,42,0.12)',
  lg: '0 24px 64px rgba(31,29,23,0.24)',          // sheets / modals
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
// e.g. <h2 style={{ ...type.title, color: color.ink }}>
export const type = {
  display: { fontFamily: font.display, fontSize: 40, lineHeight: 1.04, letterSpacing: '-0.03em', fontWeight: 700 },
  hero:    { fontFamily: font.display, fontSize: 32, lineHeight: 1.08, letterSpacing: '-0.025em', fontWeight: 700 },
  section: { fontFamily: font.display, fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.02em', fontWeight: 700 },
  title:   { fontFamily: font.display, fontSize: 20, lineHeight: 1.2,  letterSpacing: '-0.02em', fontWeight: 700 },
  bodyStrong: { fontFamily: font.body, fontSize: 15, lineHeight: 1.5, fontWeight: 600 },
  body:    { fontFamily: font.body, fontSize: 15, lineHeight: 1.5, fontWeight: 400 },
  small:   { fontFamily: font.body, fontSize: 13, lineHeight: 1.45, fontWeight: 400 },
  caption: { fontFamily: font.body, fontSize: 12, lineHeight: 1.4, fontWeight: 500 },
  // Section eyebrow: uppercase, letter-spaced, faint.
  label:   { fontFamily: font.body, fontSize: 11, lineHeight: 1.3, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: color.faint },
} as const

export const FONT_STACK = BODY
