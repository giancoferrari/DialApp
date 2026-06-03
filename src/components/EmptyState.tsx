import type { ReactNode } from 'react'
import { color, space, font, radius } from '../lib/tokens'

// Consistent empty state: icon medallion + headline + subline + optional CTA.
export default function EmptyState({ icon, title, subtitle, action }: {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: `${space[9]}px ${space[5]}px`, gap: space[2],
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56, borderRadius: radius.pill,
          background: color.sand, border: `1px solid ${color.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: space[1], color: color.faint,
        }}>
          {icon}
        </div>
      )}
      <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 700, color: color.ink, letterSpacing: '-0.02em' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontFamily: font.body, fontSize: 14, color: color.muted, maxWidth: 280, lineHeight: 1.5 }}>
          {subtitle}
        </div>
      )}
      {action && <div style={{ marginTop: space[3] }}>{action}</div>}
    </div>
  )
}
