import type { CSSProperties } from 'react'
import { color, radius, elevation } from './tokens'

// ─────────────────────────────────────────────────────────────────────────
// Surface presets — the "subtract" rule in code form.
// Most things are FLAT: a solid card on cream with a hairline border and no
// shadow. Reserve elevation for the one hero per screen and for true overlays
// (sheets/modals). Backdrop-blur is intentionally NOT used here — it's kept
// only for the floating mobile bottom nav and modal scrims.
// ─────────────────────────────────────────────────────────────────────────

// The default card. Flat, hairline border, sits calmly on the cream bg.
export const card: CSSProperties = {
  background: color.card,
  border: `1px solid ${color.border}`,
  borderRadius: radius.card,
}

// The one hero element per screen — a whisper of lift, no blur.
export const cardRaised: CSSProperties = {
  background: color.card,
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
  boxShadow: elevation.sm,
}

// Sunken surface for inputs / wells.
export const inputSurface: CSSProperties = {
  background: color.sand,
  border: `1px solid ${color.border}`,
  borderRadius: radius.sm,
}

// Section eyebrow label (uppercase, letter-spaced, faint).
export const sectionLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: color.faint,
}
