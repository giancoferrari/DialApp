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

// ── Typefaces — editorial serif for display, neutral grotesk for UI ─────
// Fraunces carries the big moments (scores, points, headings) — the
// "engraved scorecard" voice. Geist carries everything functional.
const SANS  = "'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif"
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif"

export const font = {
  display: SERIF, // scores, points, headings — never buttons/labels/UI
  body: SANS,
  mono: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
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
  sm: 10,   // chips, inputs, small controls
  md: 12,   // buttons
  card: 16, // cards
  lg: 20,   // large cards / hero blocks
  sheet: 24,// modals / bottom sheets
  pill: 999,
} as const

// ── Color — cool light neutrals + one brand green ──────────────────────────
export const color = {
  // Brand green — the only brand color. Primary actions, identity, selection.
  green: '#1E4D38',
  greenDeep: '#153B2A',   // hover / pressed
  greenDark: '#112B1D',   // immersive hero surfaces (Home header)
  greenMid: '#35704F',
  sage: '#7A937F',
  sageLight: '#C2CFC3',
  greenTint: '#E8EFEA',   // selected backgrounds, badges

  // Surfaces (cool porcelain ladder: bg → well → sheet → card)
  cream: '#F4F5F2',       // app background (legacy key name)
  creamDeep: '#ECEEE8',
  sand: '#EFF1ED',        // sunken wells / segmented-control tracks
  sheet: '#FCFCFB',       // modal & sheet bodies
  card: '#FFFFFF',        // cards
  white: '#FFFFFF',

  // Text (ink → soft → muted → faint)
  ink: '#171A17',
  inkSoft: '#494F49',
  muted: '#6B716B',
  faint: '#9AA09A',
  onGreen: '#F2F5F1',     // text on the brand green

  // Lines
  border: '#E4E6E1',
  borderStrong: '#CDD2CC',

  // Functional / golf semantics — data colors, never decoration
  orange: '#C25E33',      // over par / warnings
  orangeDeep: '#9E4A26',
  gold: '#A8852F',        // eagle
  birdie: '#3F8761',      // under par
  positive: '#2F6E4C',
  danger: '#BD3A2D',
  dangerDeep: '#8C2A21',
} as const

// ── Elevation — three levels, nothing more ─────────────────────────────────
export const elevation = {
  flat: 'none',                                            // pair with a 1px border
  sm: '0 1px 2px rgba(23,26,23,0.04), 0 2px 8px rgba(23,26,23,0.04)',
  md: '0 6px 20px rgba(23,26,23,0.10)',                    // menus, popovers
  lg: '0 20px 50px rgba(23,26,23,0.18)',                   // sheets / modals
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
// Display sizes are Fraunces (editorial serif); UI sizes are Geist.
// e.g. <h2 style={{ ...type.title, color: color.ink }}>
export const type = {
  display: { fontFamily: SERIF, fontSize: 36, lineHeight: 1.08, letterSpacing: '-0.01em', fontWeight: 600 },
  hero:    { fontFamily: SERIF, fontSize: 28, lineHeight: 1.12, letterSpacing: '-0.01em', fontWeight: 600 },
  section: { fontFamily: SERIF, fontSize: 21, lineHeight: 1.2,  letterSpacing: '-0.005em', fontWeight: 600 },
  title:   { fontFamily: SANS, fontSize: 17, lineHeight: 1.3,  letterSpacing: '-0.01em',  fontWeight: 600 },
  bodyStrong: { fontFamily: SANS, fontSize: 15, lineHeight: 1.5, fontWeight: 600 },
  body:    { fontFamily: SANS, fontSize: 15, lineHeight: 1.5, fontWeight: 400 },
  small:   { fontFamily: SANS, fontSize: 13, lineHeight: 1.45, fontWeight: 400 },
  caption: { fontFamily: SANS, fontSize: 12, lineHeight: 1.4, fontWeight: 500 },
  // Section label: sentence case, quiet. (The old uppercase eyebrow is retired.)
  label:   { fontFamily: SANS, fontSize: 13, lineHeight: 1.3, fontWeight: 600, color: color.inkSoft },
} as const

export const FONT_STACK = SANS
