import { useEffect, useRef, useState } from 'react'
import type { View } from '../types'
import DialWordmark from './DialWordmark'
import { PlusIcon, PersonIcon, HomeIcon, TrophyIcon, BellIcon, ToolsIcon, TargetIcon, ScorecardIcon, ChatIcon, CameraIcon } from './Icons'

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Home'    },
  { id: 'friends',   label: 'Friends' },
  { id: 'matches',   label: 'Matches' },
  { id: 'tools',     label: 'Tools'   },
  { id: 'profile',   label: 'Profile' },
]

const BOTTOM_NAV: { id: View; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'dashboard', label: 'Home',     Icon: HomeIcon   },
  { id: 'messages',  label: 'Messages', Icon: ChatIcon   },
  { id: 'matches',   label: 'Matches',  Icon: TrophyIcon },
  { id: 'tools',     label: 'Tools',    Icon: ToolsIcon  },
  { id: 'profile',   label: 'Profile',  Icon: PersonIcon },
]

interface Props {
  view: View
  onView: (v: View) => void
  onLogShot: () => void
  onLogRound: () => void
  onPost: () => void
  onNotif: () => void
  onMessages: () => void
  onProfile: () => void
  userEmail: string
  avatarUrl?: string | null
  onSignOut: () => void
  isMobile: boolean
  notifCount?: number
  msgUnread?: number
}

export default function TopNav({ view, onView, onLogShot, onLogRound, onPost, onNotif, onMessages, onProfile, userEmail, avatarUrl, onSignOut, isMobile, notifCount = 0, msgUnread = 0 }: Props) {
  const [menuOpen, setMenuOpen]     = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const avatarRef               = useRef<HTMLDivElement>(null)
  const createRef               = useRef<HTMLDivElement>(null)
  const initial = userEmail ? userEmail[0].toUpperCase() : 'G'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setCreateOpen(false) }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', onKey) }
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
                      transition: 'all 0.15s cubic-bezier(0.22, 1, 0.36, 1)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(31,58,42,0.07)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>
          )}

          <div style={{ flex: 1 }} />

          {/* Messages button — desktop only (mobile uses the bottom tab) */}
          {!isMobile && (
            <button
              onClick={onMessages}
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
              <ChatIcon size={17} color={view === 'messages' ? '#D9824D' : '#1F3A2A'} />
              {msgUnread > 0 && (
                <div style={{
                  position: 'absolute', top: -2, right: -2,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: '#D9824D', border: '1.5px solid rgba(237,232,212,0.92)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: '#FAF6EA',
                  fontFamily: "'DM Sans', sans-serif", padding: '0 3px',
                }}>
                  {msgUnread > 9 ? '9+' : msgUnread}
                </div>
              )}
            </button>
          )}

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

          {/* Quick-create button + menu */}
          <div ref={createRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setCreateOpen(v => !v)}
              aria-expanded={createOpen}
              aria-haspopup="menu"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: createOpen ? '#16271D' : '#1F3A2A', color: '#FAF6EA', border: 'none',
                borderRadius: 999,
                padding: isMobile ? '9px 10px 9px 16px' : '10px 18px 10px 20px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: isMobile ? 13 : 13.5, fontWeight: 500,
                cursor: 'pointer', letterSpacing: '-0.005em',
                transition: 'all 0.15s cubic-bezier(0.22, 1, 0.36, 1)',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(31,58,42,0.20)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#16271D'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(31,58,42,0.28)' }}
              onMouseLeave={e => { e.currentTarget.style.background = createOpen ? '#16271D' : '#1F3A2A'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(31,58,42,0.20)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Log
              <span style={{ width: 22, height: 22, borderRadius: 11, background: '#D9824D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: createOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <PlusIcon size={14} color="#FAF6EA" />
              </span>
            </button>

            {createOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: '#FAF6EA', border: '1px solid #E0D8C5',
                  borderRadius: 16, padding: '6px',
                  boxShadow: '0 12px 32px rgba(31,58,42,0.16)',
                  minWidth: 232, zIndex: 50,
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                {[
                  { Icon: CameraIcon,    title: 'Share a post',  sub: 'Photo to your feed',   accent: true,  action: onPost },
                  { Icon: TargetIcon,    title: 'Log a shot',    sub: 'Quick club distance',  accent: false, action: onLogShot },
                  { Icon: ScorecardIcon, title: 'Start a round', sub: 'Full scorecard',       accent: false, action: onLogRound },
                  { Icon: TrophyIcon,    title: 'New match',     sub: 'Challenge a friend',   accent: false, action: () => onView('matches') },
                ].map((item, i) => (
                  <button
                    key={item.title}
                    role="menuitem"
                    onClick={() => { setCreateOpen(false); item.action() }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      borderRadius: 12, padding: '10px 12px',
                      marginTop: i === 0 ? 0 : 2,
                      textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{
                      width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                      background: item.accent ? '#1F3A2A' : '#F0EBDD',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: item.accent ? '0 2px 8px rgba(31,58,42,0.22)' : 'none',
                    }}>
                      <item.Icon size={17} color={item.accent ? '#D9824D' : '#1F3A2A'} />
                    </span>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#1F1D17', letterSpacing: '-0.01em' }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: '#6B5F4E', marginTop: 1 }}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

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
                  <div style={{ fontSize: 11, color: '#6B5F4E', fontWeight: 500 }}>Signed in as</div>
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

      {/* ── Bottom tab bar (mobile only) — floating pill ── */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 'max(calc(env(safe-area-inset-bottom) + 10px), 18px)',
          left: '12px', right: '12px',
          zIndex: 40,
          background: 'rgba(251,248,238,0.94)',
          backdropFilter: 'blur(52px) saturate(200%)',
          WebkitBackdropFilter: 'blur(52px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.78)',
          borderRadius: '22px',
          boxShadow: '0 8px 32px rgba(31,29,23,0.16), inset 0 1px 0 rgba(255,255,255,0.95)',
          display: 'flex', alignItems: 'stretch',
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
                  justifyContent: 'center', padding: '10px 2px 8px',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.90)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.90)' }}
                onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '5px 14px 4px', borderRadius: 14,
                  background: 'transparent',
                }}>
                  <div style={{ position: 'relative' }}>
                    <item.Icon size={23} color={active ? '#1F3A2A' : '#4A4235'} />
                    {item.id === 'messages' && msgUnread > 0 && (
                      <div style={{
                        position: 'absolute', top: -5, right: -9,
                        minWidth: 15, height: 15, borderRadius: 8,
                        background: '#D9824D', border: '1.5px solid rgba(251,248,238,0.96)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8.5, fontWeight: 700, color: '#FAF6EA',
                        fontFamily: "'DM Sans', sans-serif", padding: '0 3px',
                      }}>
                        {msgUnread > 9 ? '9+' : msgUnread}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10.5, fontWeight: active ? 700 : 400,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: active ? '-0.02em' : '0.01em',
                    color: active ? '#1F1D17' : '#4A4235',
                    transition: 'color 0.2s ease, font-weight 0.2s ease',
                  }}>
                    {item.label}
                  </span>
                  {/* Orange dot indicator */}
                  <div style={{
                    width: 4, height: 4, borderRadius: 2,
                    background: '#D9824D',
                    opacity: active ? 1 : 0,
                    transform: active ? 'scale(1)' : 'scale(0)',
                    transition: 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                </div>
              </button>
            )
          })}
        </nav>
      )}
    </>
  )
}

