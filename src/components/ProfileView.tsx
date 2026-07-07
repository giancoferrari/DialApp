import { useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchProfilesForIds, fetchFriendships } from '../lib/friends'
import type { UserProfile, PublicProfile, View } from '../types'
import { getRank, RANK_TIERS } from '../lib/points'
import { flagEmoji, countryName } from '../lib/countries'
import { ShieldIcon, ChatIcon, GearIcon, CameraIcon, CloseIcon, ChevronLeftIcon } from './Icons'
import ProfilePosts from './ProfilePosts'
import Portal from './Portal'
import Avatar from './Avatar'
import DialRing from './DialRing'
import CourseHero from './CourseHero'
import { useEdgeSwipeBack } from '../hooks/useGestures'
import { useStaggerMount } from '../hooks/useStaggerMount'
import { color, font, elevation, radius, page } from '../lib/tokens'

// ── A user's friends, in a tappable sheet ──────────────────────────────
function FriendsListModal({ userId, isMobile, onClose, onViewProfile }: {
  userId: string; isMobile: boolean; onClose: () => void; onViewProfile: (id: string) => void
}) {
  const [list, setList]       = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const fs = await fetchFriendships(userId)
        const ids = fs.filter(f => f.status === 'accepted').map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
        setList(await fetchProfilesForIds(ids))
      } catch { /* ignore */ } finally { setLoading(false) }
    })()
  }, [userId])

  const name = (p: PublicProfile) => p.username ? `@${p.username}` : (p.firstName ?? 'Golfer')

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'var(--scrim)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, animation: 'fadeIn 0.2s ease' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: isMobile ? '80vh' : '70vh', background: color.white, borderRadius: isMobile ? '28px 28px 0 0' : radius.sheet, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 12px', borderBottom: `1px solid ${color.border}` }}>
            <div style={{ fontFamily: font.body, fontSize: 16, fontWeight: 650, color: color.ink }}>Friends</div>
            <button onClick={onClose} aria-label="Close" style={{ background: color.sand, border: 'none', borderRadius: 15, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={13} color={color.inkSoft} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: color.muted, fontSize: 13, padding: 24 }}>Loading…</div>
            ) : list.length === 0 ? (
              <div style={{ textAlign: 'center', color: color.muted, fontSize: 13, padding: 24 }}>No friends to show.</div>
            ) : list.map(p => (
              <button key={p.userId} onClick={() => { onClose(); onViewProfile(p.userId) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', borderRadius: radius.sm, padding: '10px 8px', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <Avatar profile={p} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink }}>{name(p)}</div>
                  {p.handicapIndex != null && <div style={{ fontSize: 12, color: color.muted, marginTop: 1 }}>HCP {p.handicapIndex.toFixed(1)}</div>}
                </div>
                {p.country && <span style={{ fontSize: 17 }}>{flagEmoji(p.country)}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  )
}

interface Props {
  profile: UserProfile | null      // signed-in user's full profile
  meId: string
  viewUserId: string                // whose profile we're viewing
  userEmail: string
  isMobile?: boolean
  onNavigate: (v: View) => void
  onBack?: () => void
  onMessage: (userId: string) => void
  onViewProfile?: (userId: string) => void
}

export default function ProfileView({ profile, meId, viewUserId, userEmail, isMobile = false, onNavigate, onBack, onMessage, onViewProfile }: Props) {
  const isOwn = viewUserId === meId
  useEdgeSwipeBack(() => (onBack ? onBack() : onNavigate('friends')), !isOwn)
  const containerRef = useRef<HTMLDivElement>(null)
  useStaggerMount(containerRef)
  const [other, setOther] = useState<PublicProfile | null>(null)
  const [friendsCount, setFriendsCount] = useState(0)
  const [showFriends, setShowFriends] = useState(false)

  useEffect(() => {
    supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .or(`requester_id.eq.${viewUserId},addressee_id.eq.${viewUserId}`)
      .eq('status', 'accepted')
      .then(({ count }) => setFriendsCount(count ?? 0))
  }, [viewUserId])

  useEffect(() => {
    if (isOwn) { setOther(null); return }
    fetchProfilesForIds([viewUserId]).then(ps => setOther(ps[0] ?? null)).catch(() => {})
  }, [isOwn, viewUserId])

  // Unified display fields whether viewing self or another player
  const avatarUrl   = isOwn ? profile?.avatarUrl   : other?.avatarUrl
  const username    = isOwn ? profile?.username    : other?.username
  const firstName   = isOwn ? profile?.firstName   : other?.firstName
  const handicap    = isOwn ? profile?.handicapIndex : other?.handicapIndex
  const country     = isOwn ? profile?.country : other?.country
  const points      = (isOwn ? profile?.rankedPoints : other?.rankedPoints) ?? 0
  const wins        = (isOwn ? profile?.wins   : other?.wins)   ?? 0
  const losses      = (isOwn ? profile?.losses : other?.losses) ?? 0
  const ties        = (isOwn ? profile?.ties   : other?.ties)   ?? 0

  const displayName = firstName || (username ? `@${username}` : 'Golfer')
  const handle      = username ? `@${username}` : (isOwn ? userEmail : '')
  const rank        = getRank(points)
  const rankIdx     = RANK_TIERS.findIndex(t => t.name === rank.name)
  const nextTier    = rankIdx < RANK_TIERS.length - 1 ? RANK_TIERS[rankIdx + 1] : null
  const progress    = nextTier ? Math.min(1, (points - rank.minPoints) / (nextTier.minPoints - rank.minPoints)) : 1
  const initial     = (firstName?.[0] ?? username?.[0] ?? (isOwn ? userEmail[0] : '?'))?.toUpperCase() ?? '?'

  const px = isMobile ? page.pxMobile : page.pxDesktop

  // Warm "Clubhouse" identity card — matches the Home screen's cream surfaces,
  // pine/sage/orange accents and the coastal illustration.
  const statItem = (value: string | number, label: string, onPress?: () => void) => {
    const content = (
      <>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: color.ink, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 11.5, color: color.faint, fontWeight: 600, marginTop: 6, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</div>
      </>
    )
    return onPress
      ? <button key={label} onClick={onPress} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: 0 }}>{content}</button>
      : <div key={label} style={{ textAlign: 'center' }}>{content}</div>
  }

  const wlt = [
    { value: wins,   label: 'Wins',   bg: color.greenTint, fg: color.positive },
    { value: losses, label: 'Losses', bg: '#F6E6D6',       fg: color.orangeDeep },
    { value: ties,   label: 'Ties',   bg: color.sand,      fg: color.muted },
  ]

  return (
    <div ref={containerRef} style={{ maxWidth: page.maxW, margin: '0 auto', paddingBottom: isMobile ? page.bottomMobile : page.bottomDesktop }}>

      {/* ════ Warm identity card — surfaces.raised chrome on desktop; mobile stays full-bleed (intentional) ════ */}
      <section style={{ padding: isMobile ? 0 : `12px ${px}px 0` }}>
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: isMobile ? color.card : '#FFFEFB',
          border: isMobile ? 'none' : '1px solid rgba(120,108,78,0.08)',
          borderRadius: isMobile ? 0 : radius.lg,
          boxShadow: isMobile ? 'none' : '0 10px 26px rgba(58,48,28,0.07)',
        }}>
          {/* Coastal cover banner (same illustration as Home), fading into the card */}
          <div style={{ position: 'relative' }}>
            <CourseHero aspect={isMobile ? '390 / 150' : '640 / 190'} fadeStart={58} />

            {/* Top controls float over the pale sky */}
            <div style={{ position: 'absolute', top: isMobile ? 'calc(env(safe-area-inset-top) + 6px)' : 14, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: isOwn ? 'flex-end' : 'space-between' }}>
              {!isOwn && (
                <button
                  onClick={() => (onBack ? onBack() : onNavigate('friends'))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,250,239,0.86)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `1px solid ${color.border}`, borderRadius: radius.pill, padding: '7px 14px 7px 10px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink }}
                >
                  <ChevronLeftIcon size={16} color={color.ink} /> Back
                </button>
              )}
              {isOwn && (
                <button
                  onClick={() => onNavigate('settings')}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,250,239,0.86)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `1px solid ${color.border}`, borderRadius: radius.pill, padding: '8px 14px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.green }}
                >
                  <GearIcon size={14} color={color.green} /> Edit profile
                </button>
              )}
            </div>
          </div>

          {/* Identity + stats body */}
          <div style={{ position: 'relative', padding: `0 ${isMobile ? 22 : 30}px ${isMobile ? 26 : 30}px`, marginTop: -52, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div onClick={() => { if (isOwn) onNavigate('settings') }} style={{ cursor: isOwn ? 'pointer' : 'default', position: 'relative', marginBottom: 14 }}>
              <DialRing progress={nextTier ? progress : 1} size={108} stroke={3.5} color={rank.color} trackColor={color.creamDeep}>
                <div style={{ width: 84, height: 84, borderRadius: 42, background: color.creamDeep, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${color.card}` }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 34, color: color.green }}>{initial}</span>}
                </div>
              </DialRing>
              {isOwn && (
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 28, height: 28, borderRadius: 14, background: color.green, border: `2px solid ${color.card}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CameraIcon size={12} color={color.onGreen} />
                </div>
              )}
            </div>

            <div style={{ fontFamily: font.display, fontSize: 25, fontWeight: 700, color: color.ink, letterSpacing: '-0.03em', lineHeight: 1.12, textAlign: 'center' }}>
              {displayName}
            </div>
            {handle && <div style={{ fontSize: 14, color: color.muted, marginTop: 3, fontWeight: 500 }}>{handle}</div>}

            {/* Country + rank chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {country && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: color.sand, border: `1px solid ${color.border}`, borderRadius: 999, padding: '5px 12px 5px 9px', fontSize: 13, fontWeight: 600, color: color.inkSoft, fontFamily: font.body }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{flagEmoji(country)}</span>
                  {countryName(country)}
                </div>
              )}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: color.greenTint, border: `1px solid ${color.sageLight}`, borderRadius: 999, padding: '5px 13px' }}>
                <ShieldIcon size={13} color={rank.color} />
                <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, color: color.greenDeep }}>{rank.name}</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: isMobile ? 40 : 56, marginTop: 22 }}>
              {statItem(handicap != null ? handicap.toFixed(1) : '—', 'Handicap')}
              {statItem(points.toLocaleString(), 'Points')}
              {statItem(friendsCount, 'Friends', () => (isOwn ? onNavigate('friends') : setShowFriends(true)))}
            </div>

            {/* Win/loss/tie */}
            {(wins + losses + ties) > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 20, width: '100%', maxWidth: 320 }}>
                {wlt.map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: 'center', background: s.bg, borderRadius: radius.sm, padding: '10px 6px' }}>
                    <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: s.fg, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: s.fg, marginTop: 4, opacity: 0.85 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Progress to next rank */}
            <div style={{ width: '100%', maxWidth: 320, marginTop: 22 }}>
              <div style={{ height: 6, background: color.creamDeep, borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${color.sage}, ${rank.color})`, width: `${Math.round(progress * 100)}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: color.muted, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontWeight: 600 }}>{rank.name}</span>
                {nextTier ? <span>{(nextTier.minPoints - points).toLocaleString()} pts to <span style={{ color: color.greenDeep, fontWeight: 700 }}>{nextTier.name}</span></span> : <span style={{ color: color.greenDeep, fontWeight: 700 }}>Max rank</span>}
              </div>
            </div>

            {/* Message button on other profiles */}
            {!isOwn && (
              <button
                onClick={() => onMessage(viewUserId)}
                style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 320, background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}
              >
                <ChatIcon size={16} color={color.onGreen} /> Message
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ════ Posts ════ */}
      <div style={{ position: 'relative', marginTop: isMobile ? 20 : 24, padding: `0 ${px}px` }}>
        <div style={{ maxWidth: page.contentW, margin: '0 auto' }}>
          <ProfilePosts
            targetUserId={viewUserId}
            meId={meId}
            isMobile={isMobile}
            canPost={isOwn}
            authorProfile={isOwn
              ? { userId: meId, username: username ?? null, avatarUrl: avatarUrl ?? null, country: country ?? null, firstName: firstName ?? null, handicapIndex: handicap ?? null, homeCourse: null, rankedPoints: points, wins, losses, ties }
              : other}
          />
        </div>
      </div>

      {showFriends && (
        <FriendsListModal userId={viewUserId} isMobile={isMobile} onClose={() => setShowFriends(false)} onViewProfile={uid => onViewProfile?.(uid)} />
      )}
    </div>
  )
}
