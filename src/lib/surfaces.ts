import type { CSSProperties } from 'react'
import { color, radius, elevation } from './tokens'

// ─────────────────────────────────────────────────────────────────────────
// Surface presets — the "subtract" rule in code form.
// Most things are FLAT: a white card on the porcelain bg with a hairline
// border and no shadow. Reserve elevation for true overlays (menus, sheets).
// Backdrop-blur is intentionally NOT used here — it's kept only for the
// floating mobile bottom nav and modal scrims.
// ─────────────────────────────────────────────────────────────────────────

// The default card. Flat, hairline border, sits calmly on the bg.
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

// Sunken surface for inputs / wells / segmented-control tracks.
export const inputSurface: CSSProperties = {
  background: color.sand,
  border: `1px solid ${color.border}`,
  borderRadius: radius.sm,
}

// Section label — sentence case, quiet weight. No uppercase, no tracking.
export const sectionLabel: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: color.inkSoft,
}
