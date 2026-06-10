import { color, font } from '../lib/tokens'

// The wordmark: "Dial" set in ink with a single brand-green full stop.
// One color move, not five — quiet and confident.
export default function DialWordmark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span
      style={{
        fontFamily: font.display,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        display: 'inline-flex',
        color: onDark ? color.onGreen : color.ink,
      }}
    >
      Dial<span style={{ color: onDark ? '#7FB89A' : color.green }}>.</span>
    </span>
  )
}
