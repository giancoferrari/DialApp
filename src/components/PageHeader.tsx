import type { ReactNode } from 'react'
import { ChevronLeftIcon } from './Icons'
import { color, font } from '../lib/tokens'

// ─────────────────────────────────────────────────────────────────────────
// The one screen-header pattern for every list/content screen: optional
// back row, title (+ optional right-aligned action), optional subtitle.
// Not yet adopted anywhere — screens switch to this one at a time in later
// redesign passes so each stays independently verifiable.
// ─────────────────────────────────────────────────────────────────────────
interface Props {
  title: string
  subtitle?: string
  onBack?: () => void
  action?: ReactNode
  isMobile?: boolean
}

export default function PageHeader({ title, subtitle, onBack, action, isMobile = false }: Props) {
  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14,
            fontFamily: font.body, fontSize: 14, fontWeight: 500, color: color.inkSoft,
          }}
        >
          <ChevronLeftIcon size={18} color={color.inkSoft} /> Back
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{
          margin: 0, fontFamily: font.display,
          fontSize: isMobile ? 32 : 38, fontWeight: 700,
          letterSpacing: '-0.04em', lineHeight: 1, color: color.ink,
        }}>
          {title}
        </h1>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      {subtitle && (
        <p style={{ margin: '8px 0 0', fontFamily: font.body, fontSize: 15, fontWeight: 400, color: color.muted }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
