import type { CSSProperties, ReactNode } from 'react'
import { color, radius, font } from '../lib/tokens'

// ─────────────────────────────────────────────────────────────────────────
// Button — the canonical button with a real hierarchy. Use this for new UI.
//   primary   → the ONE key action on a screen (filled green)
//   secondary → supporting actions (tinted/outlined)
//   tertiary  → low-emphasis / text actions
// Built-in pressed (scale 0.97) and disabled states; tokens-based sizing.
// ─────────────────────────────────────────────────────────────────────────
type Tier = 'primary' | 'secondary' | 'tertiary'
type Size = 'sm' | 'md' | 'lg'

const PAD: Record<Size, string> = { sm: '8px 14px', md: '12px 20px', lg: '15px 24px' }
const FS:  Record<Size, number> = { sm: 13, md: 14, lg: 16 }

export default function Button({
  children, onClick, tier = 'primary', size = 'md',
  fullWidth = false, disabled = false, type = 'button', icon, style,
}: {
  children: ReactNode
  onClick?: () => void
  tier?: Tier
  size?: Size
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  icon?: ReactNode
  style?: CSSProperties
}) {
  const tierStyle: Record<Tier, CSSProperties> = {
    primary:   { background: disabled ? color.borderStrong : color.green, color: color.onGreen, border: 'none' },
    secondary: { background: color.white, color: color.ink, border: `1px solid ${color.borderStrong}` },
    tertiary:  { background: 'transparent', color: color.inkSoft, border: 'none' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: fullWidth ? '100%' : undefined,
        padding: PAD[size], borderRadius: radius.md,
        fontFamily: font.body, fontSize: FS[size], fontWeight: 600, letterSpacing: '-0.005em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'transform 0.14s cubic-bezier(0.22,1,0.36,1), background 0.15s, opacity 0.15s',
        ...tierStyle[tier],
        ...style,
      }}
      onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {icon}{children}
    </button>
  )
}
