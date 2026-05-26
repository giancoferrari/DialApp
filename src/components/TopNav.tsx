import { useEffect, useRef, useState } from 'react'
import type { View } from '../types'
import DialWordmark from './DialWordmark'
import { PlusIcon, PersonIcon, HomeIcon, UsersIcon, TrophyIcon, BellIcon, ToolsIcon } from './Icons'

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Home'    },
  { id: 'friends',   label: 'Friends' },
  { id: 'matches',   label: 'Matches' },
  { id: 'tools',     label: 'Tools'   },
  { id: 'profile',   label: 'Profile' },
]

const BOTTOM_NAV: { id: View; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'dashboard', label: 'Home',    Icon: HomeIcon   },
  { id: 'friends',   label: 'Friends', Icon: UsersIcon  },
  { id: 'matches',   label: 'Matches', Icon: TrophyIcon },
  { id: 'tools',     label: 'Tools',   Icon: ToolsIcon  },
  { id: 'profile',   label: 'Profile', Icon: PersonIcon },
]

interface Props {
  view: View
  onView: (v: View) => void
  onLogRound: () => void
  onNotif: () => void
  onProfile: () => void
  userEmail: string
  avatarUrl?: string | null
  onSignOut: () => void
  isMobile: boolean
  notifCount?: number
}

export default function TopNav({ view, onView, onLogRound, onNotif, onProfile, userEmail, avatarUrl, onSignOut, isMobile, notifCount = 0 }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const avatarRef               = useRef<HTMLDivElement>(null)
  const initial = userEmail ? userEmail[0].toUpperCase() : 'G'

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
    <>
      {/* ── Top bar ── */}
      <div style={{
        position: isMobile ? 'relative' : 'sticky', top: isMobile ? undefined : 0, zIndex: 30,
        background: 'rgba(237,232,212,0.78)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : '20px',
        paddingBottom: isMobile ? '12px' : '20px',
        borderBottom: '1px solid rgba(255,255,255,0.45)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.6), 0 4px 20px rgba(31,29,23,0.06)',
      }}>
        <div style={{
          maxWidth: 1320, margin: '0 auto',
          padding: isMobile ? '0 24px' : '0 40px',
          display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 28,
        }}>
          {/* Wordmark */}
          <button
            onClick={() => onView('dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            <DialWordmark size={isMobile ? 24 : 28} />
          </button>

          {/* Pill nav — hidden on mobile (replaced by bottom bar) */}
          {!isMobile && (
            <nav style={{
              display: 'flex', gap: 4,
              background: '#FAF6EA', border: '1px solid #E0D8C5',
              borderRadius: 999, padding: 4, marginLeft: 12,
              overflowX: 'auto', flexShrink: 1,
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
          )}

          <div style={{ flex: 1 }} />

          {/* Bell notification button */}
          <button
            onClick={onNotif}
            style={{
              position: 'relative',
              width: 38, height: 38, borderRadius: 19,
              background: 'rgba(250,246,234,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(31,29,23,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,246,234,0.90)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,246,234,0.65)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <BellIcon size={17} color={view === 'notifications' ? '#D9824D' : '#1F3A2A'} />
            {notifCount > 0 && (
              <div style={{
                position: 'absolute', top: -2, right: -2,
                minWidth: 16, height: 16, borderRadius: 8,
                background: '#D9824D', border: '1.5px solid rgba(237,232,212,0.92)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: '#FAF6EA',
                fontFamily: "'DM Sans', sans-serif", padding: '0 3px',
              }}>
                {notifCount > 9 ? '9+' : notifCount}
              </div>
            )}
          </button>

          {/* Log a round button */}
          <button
            onClick={onLogRound}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#1F3A2A', color: '#FAF6EA', border: 'none',
              borderRadius: 999,
              padding: isMobile ? '9px 10px 9px 16px' : '10px 18px 10px 20px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: isMobile ? 13 : 13.5, fontWeight: 500,
              cursor: 'pointer', letterSpacing: '-0.005em',
              transition: 'background 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {isMobile ? 'Log round' : 'Log a round'}
            <span style={{ width: 22, height: 22, borderRadius: 11, background: '#D9824D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PlusIcon size={14} color="#FAF6EA" />
            </span>
          </button>

          {/* Avatar + dropdown */}
          <div ref={avatarRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setMenuOpen(v => !v)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                background: '#1F3A2A', color: '#D9824D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700, fontSize: 14,
                cursor: 'pointer', flexShrink: 0,
                letterSpacing: '-0.02em',
                transition: 'transform 0.15s, background 0.15s',
                userSelect: 'none',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial
              }
            </div>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: '#FAF6EA', border: '1px solid #E0D8C5',
                borderRadius: 16, padding: '6px',
                boxShadow: '0 8px 24px rgba(31,58,42,0.12)',
                minWidth: 190, zIndex: 50,
                animation: 'fadeIn 0.15s ease',
              }}>
                {/* Email */}
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #ECE5D2', marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: '#B5AC95', fontWeight: 500 }}>Signed in as</div>
                  <div style={{ fontSize: 13, color: '#1F1D17', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {userEmail}
                  </div>
                </div>

                {/* Profile */}
                <button
                  onClick={() => { setMenuOpen(false); onProfile() }}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderRadius: 10, padding: '10px 14px',
                    textAlign: 'left', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5, fontWeight: 500, color: '#1F1D17',
                    transition: 'background 0.12s',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <PersonIcon size={16} color="#1F3A2A" />
                  Profile
                </button>

                <div style={{ height: 1, background: '#ECE5D2', margin: '4px 8px' }} />

                {/* Sign out */}
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

      {/* ── Bottom tab bar (mobile only) ── */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: 'rgba(237,232,212,0.82)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderTop: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.7), 0 -8px 32px rgba(31,29,23,0.07)',
          display: 'flex', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        } as React.CSSProperties}>
          {BOTTOM_NAV.map(item => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => onView(item.id)}
                style={{
                  flex: 1, background: 'none', border: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '6px 2px 8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '5px 10px', borderRadius: 14,
                  background: active ? 'rgba(31,58,42,0.10)' : 'transparent',
                  transition: 'background 0.22s ease',
                }}>
                  <item.Icon size={21} color={active ? '#1F3A2A' : '#6B6857'} />
                  <span style={{
                    fontSize: 10, fontWeight: active ? 600 : 500,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '-0.01em',
                    color: active ? '#1F3A2A' : '#6B6857',
                  }}>
                    {item.label}
                  </span>
                </div>
              </button>
            )
          })}
        </nav>
      )}
    </>
  )
}
