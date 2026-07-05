import type { CSSProperties } from 'react'
import { color, radius } from './tokens'

// ─────────────────────────────────────────────────────────────────────────
// Surfaces — exactly THREE, per the v4 design system. Nothing else.
//   card   — the default. Flat, hairline border, no shadow.
//   raised — the ONE hero card per screen (rank / estimated-handicap /
//            wallet / identity card). A whisper of lift, no blur.
//   well   — sunken surface for inputs, numpads, segmented-control tracks.
// Backdrop-blur is intentionally NOT used here — it's kept only for the
// floating mobile bottom nav and modal scrims.
// ─────────────────────────────────────────────────────────────────────────

export const card: CSSProperties = {
  background: '#FFFFFF',
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
}

// ONE per screen max — the hero/stat moment (rank card, estimated-handicap
// card, wallet card, identity card).
export const raised: CSSProperties = {
  background: '#FFFEFB',
  border: '1px solid rgba(120,108,78,0.08)',
  borderRadius: radius.lg,
  boxShadow: '0 10px 26px rgba(58,48,28,0.07)',
}

export const well: CSSProperties = {
  background: color.sand,
  border: `1px solid ${color.border}`,
  borderRadius: radius.sm,
}

// Section label — sentence case, quiet weight. No uppercase, no tracking.
// (Uppercase eyebrow labels are `type.label`, reserved for stat/hero cards.)
export const sectionLabel: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: color.inkSoft,
}
