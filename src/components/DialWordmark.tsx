import { font } from '../lib/tokens'

// The Dial wordmark, set in Bricolage Grotesque. Monochrome + adaptive:
// solid near-black on light surfaces, solid white on dark surfaces — so it
// always reads with full contrast against whatever sits behind it.
export default function DialWordmark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span
      style={{
        fontFamily: font.wordmark,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        display: 'inline-flex',
        color: onDark ? '#FFFFFF' : '#0B0D0A',
      }}
    >
      Dial.
    </span>
  )
}
