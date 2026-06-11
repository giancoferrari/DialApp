import { color, font } from '../lib/tokens'

type Variant = 'default' | 'dark' | 'sage'

const VARIANTS: Record<Variant, React.CSSProperties> = {
  default: { background: color.greenTint, color: color.green },
  dark:    { background: color.green, color: color.onGreen },
  sage:    { background: color.green, color: color.onGreen },
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
        borderRadius: Math.round(size * 0.28),
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font.display,
        fontWeight: 600,
        fontSize: abbr.length > 2 ? size * 0.3 : size * 0.36,
        letterSpacing: '-0.02em',
        transition: 'all 0.18s ease',
        ...s,
      }}
    >
      {abbr}
    </div>
  )
}
