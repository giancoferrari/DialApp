import { useState } from 'react'
import { COUNTRIES, flagEmoji, countryName } from '../lib/countries'
import Portal from './Portal'
import { CloseIcon } from './Icons'

interface Props {
  value: string | null
  onChange: (code: string) => void
  isMobile?: boolean
  triggerStyle?: React.CSSProperties
}

export default function CountryPicker({ value, onChange, isMobile = false, triggerStyle }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ]       = useState('')

  const filtered = q.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : COUNTRIES

  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 14,
    padding: '13px 16px', fontSize: 15, color: value ? '#1F1D17' : '#8B8272',
    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', textAlign: 'left',
    ...triggerStyle,
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setQ('') }} style={field}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {value && <span style={{ fontSize: 18, lineHeight: 1 }}>{flagEmoji(value)}</span>}
          {value ? countryName(value) : 'Select your country'}
        </span>
        <span style={{ color: '#8B8272', fontSize: 12 }}>▾</span>
      </button>

      {open && (
        <Portal>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 230, background: 'rgba(31,29,23,0.5)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: isMobile ? '80vh' : '70vh', background: '#F5F0E6', borderRadius: isMobile ? '24px 24px 0 0' : 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(31,29,23,0.24)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid #E0D8C5' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#1F1D17' }}>Where are you from?</div>
                <button onClick={() => setOpen(false)} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <CloseIcon size={13} color="#4A4235" />
                </button>
              </div>
              <div style={{ padding: '12px 16px 8px' }}>
                <input
                  autoFocus value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Search countries…"
                  style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #E0D8C5', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 14px' }}>
                {filtered.map(c => (
                  <button key={c.code} onClick={() => { onChange(c.code); setOpen(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: c.code === value ? 'rgba(31,58,42,0.06)' : 'transparent', border: 'none', borderRadius: 10, padding: '11px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: '#1F1D17' }}
                    onMouseEnter={e => { if (c.code !== value) e.currentTarget.style.background = '#EDE6D6' }}
                    onMouseLeave={e => { if (c.code !== value) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{flagEmoji(c.code)}</span>
                    {c.name}
                  </button>
                ))}
                {filtered.length === 0 && <div style={{ textAlign: 'center', color: '#6B5F4E', fontSize: 13, padding: 20 }}>No countries match "{q}"</div>}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
