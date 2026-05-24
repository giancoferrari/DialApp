import { useEffect, useRef, useState } from 'react'
import type { View } from '../types'
import DialWordmark from './DialWordmark'
import { PlusIcon } from './Icons'

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'bag',       label: 'My bag' },
]

interface Props {
  view: View
  onView: (v: View) => void
  onLog: () => void
  userEmail: string
  onSignOut: () => void
}

export default function TopNav({ view, onView, onLog, userEmail, onSignOut }: Props) {
  const [logHover, setLogHover]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const avatarRef                 = useRef<HTMLDivElement>(null)

  const initial = userEmail ? userEmail[0].toUpperCase() : 'A'

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(240,235,221,0.85)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      padding: '20px 0',
      borderBottom: '1px solid rgba(31,58,42,0.06)',
    }}>
      <div style={{
        maxWidth: 1320, margin: '0 auto', padding: '0 40px',
        display: 'flex', alignItems: 'center', gap: 28,
      }}>
        {/* Wordmark */}
        <button
          onClick={() => onView('dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <DialWordmark size={28} />
        </button>

        {/* Pill nav — Dashboard + My bag only */}
        <nav style={{
          display: 'flex', gap: 4,
          background: '#FAF6EA', border: '1px solid #E0D8C5',
          borderRadius: 999, padding: 4, marginLeft: 12,
        }}>
          {NAV_ITEMS.map(item => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => onView(item.id)}
                style={{
                  border: 'none', cursor: 'pointer',
                  background: active ? '#1F3A2A' : 'transparent',
                  color: active ? '#FAF6EA' : '#1F1D17',
                  padding: '9px 18px', borderRadius: 999,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13.5, fontWeight: 500,
                  letterSpacing: '-0.005em',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Log shot CTA */}
        <button
          onClick={onLog}
          onMouseEnter={() => setLogHover(true)}
          onMouseLeave={() => setLogHover(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: logHover ? '#16271D' : '#1F3A2A',
            color: '#FAF6EA', border: 'none', borderRadius: 999,
            padding: '10px 18px 10px 20px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13.5, fontWeight: 500,
            cursor: 'pointer', letterSpacing: '-0.005em',
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          Log a shot
          <span style={{
            width: 22, height: 22, borderRadius: 11,
            background: '#D9824D',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PlusIcon size={14} color="#FAF6EA" />
          </span>
        </button>

        {/* Avatar + dropdown */}
        <div ref={avatarRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setMenuOpen(v => !v)}
            style={{
              width: 38, height: 38, borderRadius: 19,
              background: '#1F3A2A', color: '#D9824D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700, fontSize: 15,
              cursor: 'pointer', flexShrink: 0,
              letterSpacing: '-0.02em',
              transition: 'transform 0.15s, background 0.15s',
              userSelect: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {initial}
          </div>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: '#FAF6EA', border: '1px solid #E0D8C5',
              borderRadius: 16, padding: '6px',
              boxShadow: '0 8px 24px rgba(31,58,42,0.12)',
              minWidth: 180, zIndex: 50,
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{
                padding: '10px 14px 8px',
                borderBottom: '1px solid #ECE5D2',
                marginBottom: 4,
              }}>
                <div style={{ fontSize: 11, color: '#B5AC95', fontWeight: 500 }}>Signed in as</div>
                <div style={{
                  fontSize: 13, color: '#1F1D17', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 160,
                }}>
                  {userEmail}
                </div>
              </div>
              <button
                onClick={() => { setMenuOpen(false); onSignOut() }}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  borderRadius: 10, padding: '10px 14px',
                  textAlign: 'left', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13.5, fontWeight: 500, color: '#D9824D',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
