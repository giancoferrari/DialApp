type Variant = 'default' | 'dark' | 'coral' | 'sage'

const VARIANTS: Record<Variant, React.CSSProperties> = {
  default: { background: '#FAF6EA', color: '#1F3A2A', border: '1px solid #E0D8C5' },
  dark:    { background: '#1F3A2A', color: '#FAF6EA' },
  coral:   { background: '#D9824D', color: '#FAF6EA' },
  sage:    { background: '#5C7A4D', color: '#FAF6EA' },
}

interface Props {
  abbr: string
  size?: number
  variant?: Variant
}

export default function ClubBadge({ abbr, size = 44, variant = 'default' }: Props) {
  const s = VARIANTS[variant]
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: abbr.length > 2 ? size * 0.30 : size * 0.36,
        letterSpacing: '-0.03em',
        transition: 'all 0.18s ease',
        ...s,
      }}
    >
      {abbr}
    </div>
  )
}
