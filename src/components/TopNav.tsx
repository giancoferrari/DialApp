import { useEffect, useRef, useState } from 'react'
import type { View } from '../types'
import DialWordmark from './DialWordmark'
import { PlusIcon, PersonIcon, HomeIcon, UsersIcon, TrophyIcon, BellIcon, ToolsIcon, TargetIcon, ScorecardIcon, ChatIcon, CameraIcon } from './Icons'
import { color, font, elevation, radius } from '../lib/tokens'
import { tapHaptic } from '../lib/native'

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
  // 'dark' blends the bar into the Home hero (deep green, light icons).
  tone?: 'light' | 'dark'
}

// Count badge used on the bell / messages icons.
function Badge({ n, dark }: { n: number; dark?: boolean }) {
  return (
    <div style={{
      position: 'absolute', top: -2, right: -3,
      minWidth: 16, height: 16, borderRadius: 8,
      background: dark ? color.onGreen : color.green,
      border: `1.5px solid ${dark ? color.greenDark : color.cream}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 600, color: dark ? color.greenDark : color.onGreen,
      fontFamily: font.body, padding: '0 4px',
    }}>
      {n > 9 ? '9+' : n}
    </div>
  )
}

export default function TopNav({ view, onView, onLogShot, onLogRound, onPost, onNotif, onMessages, onProfile, userEmail, avatarUrl, onSignOut, isMobile, notifCount = 0, msgUnread = 0, tone = 'light' }: Props) {
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

  const dark = tone === 'dark'
  const hoverWash = dark ? 'rgba(255,255,255,0.08)' : color.sand
  const iconColor = dark ? 'rgba(255,250,241,0.85)' : color.ink
  const iconActive = dark ? color.onGreen : color.orange

  // Borderless 40px icon button — quiet until hovered.
  const iconBtn: React.CSSProperties = {
    position: 'relative',
    width: 40, height: 40, borderRadius: 20,
    background: 'transparent', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
    transition: 'background 0.15s',
  }

  const menuItem: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none',
    borderRadius: radius.sm, padding: '10px 12px',
    textAlign: 'left', cursor: 'pointer',
    fontFamily: font.body, fontSize: 14, fontWeight: 500, color: color.ink,
    transition: 'background 0.12s',
    display: 'flex', alignItems: 'center', gap: 10,
  }

  return (
    <>
      {/* ── Top bar ──
          On mobile it's an absolute overlay (transparent) so the Home hero
          illustration can fill the screen behind it — the logo / bell / avatar
          float over the pale sky. On desktop it stays a sticky frosted bar. */}
      <div style={{
        position: isMobile ? 'absolute' : 'sticky',
        top: 0, left: isMobile ? 0 : undefined, right: isMobile ? 0 : undefined, zIndex: 30,
        background: dark ? color.greenDark : (isMobile ? 'transparent' : 'rgba(255,250,239,0.82)'),
        backdropFilter: !dark && !isMobile ? 'blur(18px) saturate(1.15)' : undefined,
        WebkitBackdropFilter: !dark && !isMobile ? 'blur(18px) saturate(1.15)' : undefined,
        paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : '14px',
        paddingBottom: isMobile ? '8px' : '14px',
        borderBottom: dark || isMobile ? 'none' : `1px solid ${color.border}`,
        transition: 'background 0.3s ease',
      }}>
        <div style={{
          maxWidth: 1320, margin: '0 auto',
          padding: isMobile ? '0 20px' : '0 40px',
          display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 24,
        }}>
          {/* Wordmark */}
          <button
            onClick={() => onView('dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex' }}
          >
            <DialWordmark size={isMobile ? 26 : 27} onDark={dark} />
          </button>

          {/* Segmented nav — hidden on mobile (replaced by bottom bar) */}
          {!isMobile && (
            <nav style={{
              display: 'flex', gap: 2,
              background: color.sand,
              borderRadius: radius.md, padding: 3, marginLeft: 8,
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
                      background: active ? color.white : 'transparent',
                      color: active ? color.ink : color.inkSoft,
                      padding: '8px 16px', borderRadius: radius.sm,
                      fontFamily: font.body,
                      fontSize: 14, fontWeight: active ? 600 : 500,
                      boxShadow: active ? elevation.sm : 'none',
                      transition: 'all 0.15s cubic-bezier(0.22, 1, 0.36, 1)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = color.ink }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = color.inkSoft }}
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
              aria-label="Messages"
              style={iconBtn}
              onMouseEnter={e => { e.currentTarget.style.background = hoverWash }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <ChatIcon size={19} color={view === 'messages' ? iconActive : iconColor} />
              {msgUnread > 0 && <Badge n={msgUnread} dark={dark} />}
            </button>
          )}

          {/* Bell notification button */}
          <button
            onClick={onNotif}
            aria-label="Notifications"
            style={iconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = hoverWash }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <BellIcon size={22} color={view === 'notifications' ? iconActive : iconColor} />
            {notifCount > 0 && <Badge n={notifCount} dark={dark} />}
          </button>

          {/* Quick-create button + menu — desktop only; on mobile the reference
              header is just bell + avatar (Log a shot lives in the avatar menu) */}
          {!isMobile && (
          <div ref={createRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setCreateOpen(v => !v)}
              aria-expanded={createOpen}
              aria-haspopup="menu"
              aria-label="Log something"
              style={iconBtn}
              onMouseEnter={e => { e.currentTarget.style.background = hoverWash }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ display: 'inline-flex', transform: createOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                <PlusIcon size={24} color={createOpen ? iconActive : iconColor} />
              </span>
            </button>

            {createOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: color.white, border: `1px solid ${color.border}`,
                  borderRadius: radius.card, padding: 6,
                  boxShadow: elevation.md,
                  minWidth: 230, zIndex: 50,
                  animation: 'slideDown 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {[
                  { Icon: CameraIcon,    title: 'Share a post',  sub: 'Photo to your feed',  action: onPost },
                  { Icon: TargetIcon,    title: 'Log a shot',    sub: 'Quick club distance', action: onLogShot },
                  { Icon: ScorecardIcon, title: 'Start a round', sub: 'Full scorecard',      action: onLogRound },
                  { Icon: TrophyIcon,    title: 'New match',     sub: 'Challenge a friend',  action: () => onView('matches') },
                ].map((item, i) => (
                  <button
                    key={item.title}
                    role="menuitem"
                    onClick={() => { setCreateOpen(false); item.action() }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      borderRadius: radius.sm, padding: '9px 10px',
                      marginTop: i === 0 ? 0 : 2,
                      textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{
                      width: 34, height: 34, borderRadius: radius.sm, flexShrink: 0,
                      background: color.greenTint,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <item.Icon size={17} color={color.green} />
                    </span>
                    <div>
                      <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: color.muted, marginTop: 1 }}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Avatar + dropdown */}
          <div ref={avatarRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setMenuOpen(v => !v)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                background: dark ? 'rgba(255,255,255,0.12)' : color.greenTint,
                color: dark ? color.onGreen : color.green,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: font.body,
                fontWeight: 600, fontSize: 14,
                cursor: 'pointer', flexShrink: 0,
                border: dark ? '1px solid rgba(255,255,255,0.16)' : `1px solid ${color.border}`,
                transition: 'box-shadow 0.15s',
                userSelect: 'none',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = dark ? '0 0 0 3px rgba(255,255,255,0.10)' : `0 0 0 3px ${color.greenTint}` }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial
              }
            </div>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: color.white, border: `1px solid ${color.border}`,
                borderRadius: radius.card, padding: 6,
                boxShadow: elevation.md,
                minWidth: 200, zIndex: 50,
                animation: 'slideDown 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
              }}>
                {/* Email */}
                <div style={{ padding: '8px 12px 10px', borderBottom: `1px solid ${color.border}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: color.muted }}>Signed in as</div>
                  <div style={{ fontSize: 13, color: color.ink, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170, marginTop: 1 }}>
                    {userEmail}
                  </div>
                </div>

                <button
                  onClick={() => { setMenuOpen(false); onProfile() }}
                  style={menuItem}
                  onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <PersonIcon size={16} color={color.inkSoft} />
                  Profile
                </button>

                <button
                  onClick={() => { setMenuOpen(false); onView('friends') }}
                  style={menuItem}
                  onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <UsersIcon size={16} color={color.inkSoft} />
                  Friends
                </button>

                {/* Mobile-only create actions (the + menu lives here on phones) */}
                {isMobile && (
                  <>
                    <div style={{ height: 1, background: color.border, margin: '4px 8px' }} />
                    <button
                      onClick={() => { setMenuOpen(false); onPost() }}
                      style={menuItem}
                      onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <CameraIcon size={16} color={color.inkSoft} />
                      Share a post
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onLogShot() }}
                      style={menuItem}
                      onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <TargetIcon size={16} color={color.inkSoft} />
                      Log a shot
                    </button>
                  </>
                )}

                <div style={{ height: 1, background: color.border, margin: '4px 8px' }} />

                <button
                  onClick={() => { setMenuOpen(false); onSignOut() }}
                  style={{ ...menuItem, color: color.danger }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FBEDEB' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom tab bar (mobile only) — floating frosted pill ── */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom) + 10px)',
          left: 14, right: 14,
          zIndex: 40,
          background: 'rgba(255,250,239,0.86)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          border: '1px solid rgba(42,36,24,0.10)',
          borderRadius: 28,
          boxShadow: '0 14px 32px rgba(40,34,20,0.18), 0 2px 8px rgba(40,34,20,0.06)',
          padding: '10px 8px 9px',
          display: 'grid', gridTemplateColumns: `repeat(${BOTTOM_NAV.length}, 1fr)`,
          alignItems: 'start',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        } as React.CSSProperties}>
          {BOTTOM_NAV.map(item => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => { if (!active) tapHaptic(); onView(item.id) }}
                style={{
                  position: 'relative', background: 'none', border: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 4, padding: '2px 2px 2px',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.12s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <div style={{ position: 'relative' }}>
                  <item.Icon size={24} color={active ? color.ink : '#4B4F49'} />
                  {item.id === 'messages' && msgUnread > 0 && (
                    <div style={{
                      position: 'absolute', top: -4, right: -9,
                      minWidth: 15, height: 15, borderRadius: 8,
                      background: color.orange, border: '1.5px solid rgba(255,250,239,0.95)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: '#FFFAF1',
                      fontFamily: font.body, padding: '0 3px',
                    }}>
                      {msgUnread > 9 ? '9+' : msgUnread}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, letterSpacing: '-0.02em',
                  fontFamily: font.body,
                  color: active ? color.ink : '#4B4F49',
                  transition: 'color 0.2s ease',
                }}>
                  {item.label}
                </span>
                {/* Orange active dot */}
                <span style={{
                  width: 5, height: 5, borderRadius: 999,
                  background: active ? color.orange : 'transparent',
                  transition: 'background 0.2s ease',
                }} />
              </button>
            )
          })}
        </nav>
      )}
    </>
  )
}
