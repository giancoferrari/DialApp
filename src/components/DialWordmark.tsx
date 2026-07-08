import { color, font } from '../lib/tokens'

// The Dial wordmark, set in Bricolage Grotesque. Monochrome + adaptive:
// by default it follows the app's theme (color.ink — near-black in light
// mode, near-white in dark mode) so it always reads against a themed
// surface. Pass `tint` to pin it to a fixed color instead — needed when the
// wordmark sits on something that ISN'T theme-aware, like the always-light
// Home hero photo (fixed dark) or an always-pine onboarding screen (fixed
// white), regardless of which app theme is active.
export default function DialWordmark({ size = 28, tint }: { size?: number; tint?: string }) {
  return (
    <span
      style={{
        fontFamily: font.wordmark,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        display: 'inline-flex',
        color: tint ?? color.ink,
      }}
    >
      Dial.
    </span>
  )
}
