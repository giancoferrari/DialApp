const LETTERS = [
  { ch: 'D', color: '#1F3A2A' },
  { ch: 'i', color: '#D9824D' },
  { ch: 'a', color: '#8B9E6E' },
  { ch: 'l', color: '#1F3A2A' },
  { ch: '.', color: '#D9824D' },
]

export default function DialWordmark({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        display: 'inline-flex',
      }}
    >
      {LETTERS.map((l, i) => (
        <span key={i} style={{ color: l.color }}>{l.ch}</span>
      ))}
    </span>
  )
}

