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
import { useEdgeSwipeBack } from '../hooks/useGestures'
import { color, font, elevation, radius } from '../lib/tokens'

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

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 20 : 36}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* Top row: back (other) / settings (own) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, minHeight: 36 }}>
        {isOwn ? (
          <>
            <div style={{ fontFamily: font.body, fontSize: 17, fontWeight: 650, letterSpacing: '-0.01em', color: color.ink }}>Profile</div>
            <button
              onClick={() => onNavigate('settings')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: color.white, border: `1px solid ${color.borderStrong}`, borderRadius: radius.sm, padding: '8px 14px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink, transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
              onMouseLeave={e => { e.currentTarget.style.background = color.white }}
            >
              <GearIcon size={14} color={color.inkSoft} /> Edit profile
            </button>
          </>
        ) : (
          <button
            onClick={() => (onBack ? onBack() : onNavigate('friends'))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 500, color: color.inkSoft, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ChevronLeftIcon size={18} color={color.inkSoft} /> Back
          </button>
        )}
      </div>

      {/* Profile header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div
          onClick={() => { if (isOwn) onNavigate('settings') }}
          style={{ width: 92, height: 92, borderRadius: 46, background: color.greenTint, overflow: 'hidden', border: `1px solid ${color.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, cursor: isOwn ? 'pointer' : 'default', position: 'relative' }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: 36, color: color.green }}>{initial}</span>}
          {isOwn && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, background: color.green, border: `2px solid ${color.cream}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CameraIcon size={12} color={color.onGreen} />
            </div>
          )}
        </div>

        <div style={{ fontFamily: font.body, fontSize: 22, fontWeight: 650, color: color.ink, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {displayName}
        </div>
        {handle && <div style={{ fontSize: 14, color: color.muted, marginTop: 3 }}>{handle}</div>}
        {country && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: color.inkSoft, fontFamily: font.body }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{flagEmoji(country)}</span>
            {countryName(country)}
          </div>
        )}

        {/* Rank badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: color.sand, borderRadius: 999, padding: '5px 12px', marginTop: 12 }}>
          <ShieldIcon size={13} color={rank.color} />
          <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.inkSoft }}>{rank.name}</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: isMobile ? 32 : 48, marginTop: 20 }}>
          {([
            { value: handicap != null ? handicap.toFixed(1) : '—', label: 'Handicap' },
            { value: points.toLocaleString(), label: 'Points' },
            { value: friendsCount, label: 'Friends', onPress: () => (isOwn ? onNavigate('friends') : setShowFriends(true)) },
          ] as { value: string | number; label: string; onPress?: () => void }[]).map(s => {
            const content = (
              <>
                <div style={{ fontFamily: font.body, fontSize: 22, fontWeight: 650, color: color.ink, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: color.muted, fontWeight: 500, marginTop: 5 }}>{s.label}</div>
              </>
            )
            return s.onPress
              ? <button key={s.label} onClick={s.onPress} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: 0 }}>{content}</button>
              : <div key={s.label} style={{ textAlign: 'center' }}>{content}</div>
          })}
        </div>

        {/* Win/loss */}
        {(wins + losses + ties) > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {[
              { value: wins,   label: 'W', color: color.positive,   bg: color.greenTint },
              { value: losses, label: 'L', color: color.orangeDeep, bg: '#F7EDE6' },
              { value: ties,   label: 'T', color: color.inkSoft,    bg: color.sand },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: s.bg, borderRadius: 8, padding: '4px 10px' }}>
                <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress to next rank */}
        <div style={{ width: '100%', maxWidth: 320, marginTop: 20 }}>
          <div style={{ height: 4, background: color.creamDeep, borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', borderRadius: 2, background: color.green, width: `${Math.round(progress * 100)}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: color.muted, fontVariantNumeric: 'tabular-nums' }}>
            <span>{rank.name}</span>
            {nextTier ? <span>{nextTier.minPoints - points} pts to <span style={{ color: color.ink, fontWeight: 600 }}>{nextTier.name}</span></span> : <span style={{ color: color.green, fontWeight: 600 }}>Max rank</span>}
          </div>
        </div>

        {/* Message button on other profiles */}
        {!isOwn && (
          <button
            onClick={() => onMessage(viewUserId)}
            style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font.body, transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = color.greenDeep }}
            onMouseLeave={e => { e.currentTarget.style.background = color.green }}
          >
            <ChatIcon size={16} color={color.onGreen} /> Message
          </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: color.border, marginBottom: 20 }} />

      {/* Posts */}
      <ProfilePosts
        targetUserId={viewUserId}
        meId={meId}
        isMobile={isMobile}
        canPost={isOwn}
        authorProfile={isOwn
          ? { userId: meId, username: username ?? null, avatarUrl: avatarUrl ?? null, country: country ?? null, firstName: firstName ?? null, handicapIndex: handicap ?? null, homeCourse: null, rankedPoints: points, wins, losses, ties }
          : other}
      />

      {showFriends && (
        <FriendsListModal userId={viewUserId} isMobile={isMobile} onClose={() => setShowFriends(false)} onViewProfile={uid => onViewProfile?.(uid)} />
      )}
    </div>
  )
}
