import type { CSSProperties } from 'react'
import { color, radius, font, space } from '../lib/tokens'

// ─────────────────────────────────────────────────────────────────────────
// Field — the canonical labelled text input. Use for new forms.
// 44px touch target, sunken sand surface, 16px font (no iOS zoom), and the
// global :focus-visible ring (see index.css) applies automatically.
// ─────────────────────────────────────────────────────────────────────────
export default function Field({
  label, value, onChange, placeholder, type = 'text', inputMode, maxLength, prefix, error, style,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel'
  maxLength?: number
  prefix?: string
  error?: string | null
  style?: CSSProperties
}) {
  return (
    <div style={style}>
      {label && (
        <label style={{ display: 'block', fontFamily: font.body, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: color.faint, marginBottom: space[2] }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: color.faint, pointerEvents: 'none' }}>{prefix}</span>
        )}
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: 44,
            background: color.sand, color: color.ink,
            border: `1.5px solid ${error ? color.danger : color.border}`,
            borderRadius: radius.sm, padding: prefix ? '13px 16px 13px 30px' : '13px 16px',
            fontSize: 16, fontFamily: font.body, outline: 'none',
          }}
        />
      </div>
      {error && <div style={{ marginTop: space[2], fontFamily: font.body, fontSize: 12.5, color: color.danger }}>{error}</div>}
    </div>
  )
}
