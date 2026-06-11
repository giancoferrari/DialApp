import { useState, useEffect } from 'react'
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
import CourseContour from './CourseContour'
import { useEdgeSwipeBack } from '../hooks/useGestures'
import { color, font, elevation, radius, HERO_BG, onHero } from '../lib/tokens'

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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(23,26,23,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, animation: 'fadeIn 0.2s ease' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: isMobile ? '80vh' : '70vh', background: color.white, borderRadius: isMobile ? '24px 24px 0 0' : radius.sheet, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
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

  const px = isMobile ? 20 : 40

  const heroStat = (value: string | number, label: string, onPress?: () => void) => {
    const content = (
      <>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: color.onGreen, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 12, color: onHero.faint, fontWeight: 500, marginTop: 6 }}>{label}</div>
      </>
    )
    return onPress
      ? <button key={label} onClick={onPress} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: 0 }}>{content}</button>
      : <div key={label} style={{ textAlign: 'center' }}>{content}</div>
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: isMobile ? 120 : 80 }}>

      {/* ════ Dark hero ════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: HERO_BG, padding: `${isMobile ? 'calc(env(safe-area-inset-top) + 10px)' : '18px'} ${px}px 30px`, borderRadius: isMobile ? 0 : 24, margin: isMobile ? 0 : `12px ${px}px 0` }}>
        <CourseContour />
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>

          {/* Top row: back (other) / edit (own) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isOwn ? 'flex-end' : 'space-between', marginBottom: 18, minHeight: 36 }}>
            {!isOwn && (
              <button
                onClick={() => (onBack ? onBack() : onNavigate('friends'))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 500, color: onHero.soft, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ChevronLeftIcon size={18} color={onHero.soft} /> Back
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onNavigate('settings')}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: onHero.fill, border: `1px solid ${onHero.border}`, borderRadius: radius.sm, padding: '8px 14px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.onGreen }}
              >
                <GearIcon size={14} color={onHero.soft} /> Edit profile
              </button>
            )}
          </div>

          {/* Avatar + identity */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div onClick={() => { if (isOwn) onNavigate('settings') }} style={{ cursor: isOwn ? 'pointer' : 'default', position: 'relative', marginBottom: 14 }}>
              <DialRing progress={nextTier ? progress : 1} size={104} stroke={3} color={rank.color} trackColor="rgba(242,245,241,0.16)">
                <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(255,255,255,0.10)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: 32, color: color.onGreen }}>{initial}</span>}
                </div>
              </DialRing>
              {isOwn && (
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 28, height: 28, borderRadius: 14, background: color.white, border: `2px solid ${color.greenDark}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CameraIcon size={12} color={color.green} />
                </div>
              )}
            </div>

            <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 600, color: color.onGreen, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {displayName}
            </div>
            {handle && <div style={{ fontSize: 14, color: onHero.faint, marginTop: 3 }}>{handle}</div>}
            {country && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: onHero.soft, fontFamily: font.body }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>{flagEmoji(country)}</span>
                {countryName(country)}
              </div>
            )}

            {/* Rank badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: onHero.fill, border: `1px solid ${onHero.border}`, borderRadius: 999, padding: '5px 13px', marginTop: 12 }}>
              <ShieldIcon size={13} color={rank.color} />
              <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.onGreen }}>{rank.name}</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: isMobile ? 36 : 52, marginTop: 22 }}>
              {heroStat(handicap != null ? handicap.toFixed(1) : '—', 'Handicap')}
              {heroStat(points.toLocaleString(), 'Points')}
              {heroStat(friendsCount, 'Friends', () => (isOwn ? onNavigate('friends') : setShowFriends(true)))}
            </div>

            {/* Win/loss */}
            {(wins + losses + ties) > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
                {[
                  { value: wins,   label: 'W', color: '#9FD4B4' },
                  { value: losses, label: 'L', color: '#E8C9A8' },
                  { value: ties,   label: 'T', color: onHero.soft },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: onHero.fill, borderRadius: 8, padding: '4px 11px' }}>
                    <span style={{ fontFamily: font.display, fontSize: 14, fontWeight: 600, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Progress to next rank */}
            <div style={{ width: '100%', maxWidth: 320, marginTop: 20 }}>
              <div style={{ height: 4, background: 'rgba(242,245,241,0.14)', borderRadius: 999, overflow: 'hidden', marginBottom: 7 }}>
                <div style={{ height: '100%', borderRadius: 999, background: rank.color, width: `${Math.round(progress * 100)}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: onHero.faint, fontVariantNumeric: 'tabular-nums' }}>
                <span>{rank.name}</span>
                {nextTier ? <span>{nextTier.minPoints - points} pts to <span style={{ color: rank.color, fontWeight: 600 }}>{nextTier.name}</span></span> : <span style={{ color: rank.color, fontWeight: 600 }}>Max rank</span>}
              </div>
            </div>

            {/* Message button on other profiles */}
            {!isOwn && (
              <button
                onClick={() => onMessage(viewUserId)}
                style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 8, background: color.white, color: color.green, border: 'none', borderRadius: radius.md, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}
              >
                <ChatIcon size={16} color={color.green} /> Message
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ════ Posts sheet ════ */}
      <div style={{ position: 'relative', marginTop: isMobile ? -20 : 24, background: isMobile ? color.cream : 'transparent', borderRadius: isMobile ? '24px 24px 0 0' : 0, padding: `${isMobile ? 24 : 0}px ${px}px 0` }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
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
