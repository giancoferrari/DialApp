import { font } from '../lib/tokens'

// The original Dial wordmark — multicolor letters set in Bricolage Grotesque.
// On light surfaces: green/orange/sage. On the dark green hero: cream letters
// keep their readability while the orange accent still pops.
const LIGHT = [
  { ch: 'D', color: '#1E4D38' },
  { ch: 'i', color: '#C25E33' },
  { ch: 'a', color: '#7A937F' },
  { ch: 'l', color: '#1E4D38' },
  { ch: '.', color: '#C25E33' },
]
const DARK = [
  { ch: 'D', color: '#F2F5F1' },
  { ch: 'i', color: '#E0935E' },
  { ch: 'a', color: '#A7C0AC' },
  { ch: 'l', color: '#F2F5F1' },
  { ch: '.', color: '#E0935E' },
]

export default function DialWordmark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  const letters = onDark ? DARK : LIGHT
  return (
    <span
      style={{
        fontFamily: font.wordmark,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        display: 'inline-flex',
      }}
    >
      {letters.map((l, i) => (
        <span key={i} style={{ color: l.color }}>{l.ch}</span>
      ))}
    </span>
  )
}
