import { useState } from 'react'
import { COUNTRIES, flagEmoji, countryName } from '../lib/countries'
import Portal from './Portal'
import { CloseIcon } from './Icons'
import { color, font, elevation, radius } from '../lib/tokens'

interface Props {
  value: string | null
  onChange: (code: string) => void
  isMobile?: boolean
  triggerStyle?: React.CSSProperties
  zIndex?: number
}

export default function CountryPicker({ value, onChange, isMobile = false, triggerStyle, zIndex = 230 }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ]       = useState('')

  const filtered = q.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : COUNTRIES

  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: color.white, border: `1px solid ${color.borderStrong}`, borderRadius: 10,
    padding: '13px 14px', fontSize: 16, color: value ? color.ink : color.faint,
    fontFamily: font.body, cursor: 'pointer', textAlign: 'left',
    ...triggerStyle,
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setQ('') }} style={field}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {value && <span style={{ fontSize: 18, lineHeight: 1 }}>{flagEmoji(value)}</span>}
          {value ? countryName(value) : 'Select your country'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke={color.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <Portal>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex, background: 'var(--scrim)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, animation: 'fadeIn 0.2s ease' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: isMobile ? '80vh' : '70vh', background: color.white, borderRadius: isMobile ? '28px 28px 0 0' : radius.sheet, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 12px', borderBottom: `1px solid ${color.border}` }}>
                <div style={{ fontFamily: font.body, fontSize: 16, fontWeight: 650, color: color.ink }}>Where are you from?</div>
                <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: color.sand, border: 'none', borderRadius: 15, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <CloseIcon size={13} color={color.inkSoft} />
                </button>
              </div>
              <div style={{ padding: '12px 16px 8px' }}>
                <input
                  autoFocus value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Search countries…"
                  style={{ width: '100%', boxSizing: 'border-box', background: color.sand, border: `1px solid ${color.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 16, color: color.ink, outline: 'none', fontFamily: font.body }}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 14px' }}>
                {filtered.map(c => (
                  <button key={c.code} onClick={() => { onChange(c.code); setOpen(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: c.code === value ? color.greenTint : 'transparent', border: 'none', borderRadius: radius.sm, padding: '11px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: font.body, fontSize: 14, color: color.ink }}
                    onMouseEnter={e => { if (c.code !== value) e.currentTarget.style.background = color.sand }}
                    onMouseLeave={e => { if (c.code !== value) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{flagEmoji(c.code)}</span>
                    {c.name}
                  </button>
                ))}
                {filtered.length === 0 && <div style={{ textAlign: 'center', color: color.muted, fontSize: 13, padding: 20 }}>No countries match "{q}"</div>}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
