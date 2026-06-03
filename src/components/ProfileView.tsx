import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchProfilesForIds, fetchFriendships } from '../lib/friends'
import type { UserProfile, PublicProfile, View } from '../types'
import { getRank, RANK_TIERS } from '../lib/points'
import { flagEmoji, countryName } from '../lib/countries'
import { ShieldIcon, ChatIcon, GearIcon, CameraIcon, CloseIcon } from './Icons'
import ProfilePosts from './ProfilePosts'
import Portal from './Portal'
import { useEdgeSwipeBack } from '../hooks/useGestures'

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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(31,29,23,0.5)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: isMobile ? '80vh' : '70vh', background: '#F5F0E6', borderRadius: isMobile ? '24px 24px 0 0' : 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(31,29,23,0.24)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid #E0D8C5' }}>
            <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 17, fontWeight: 700, color: '#1F1D17' }}>Friends</div>
            <button onClick={onClose} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={13} color="#4A4235" />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#6B5F4E', fontSize: 13, padding: 24 }}>Loading…</div>
            ) : list.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6B5F4E', fontSize: 13, padding: 24 }}>No friends to show.</div>
            ) : list.map(p => (
              <button key={p.userId} onClick={() => { onClose(); onViewProfile(p.userId) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', borderRadius: 12, padding: '10px 8px', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#EDE6D6' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 42, height: 42, borderRadius: 21, background: '#1F3A2A', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.avatarUrl ? <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 17, color: '#D9824D' }}>{name(p)[0]?.replace('@', '').toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17' }}>{name(p)}</div>
                  {p.handicapIndex != null && <div style={{ fontSize: 12, color: '#6B5F4E' }}>HCP {p.handicapIndex.toFixed(1)}</div>}
                </div>
                {p.country && <span style={{ fontSize: 18 }}>{flagEmoji(p.country)}</span>}
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
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 24 : 44}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* Top row: back (other) / settings (own) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        {isOwn ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase' }}>Your profile</div>
            <button
              onClick={() => onNavigate('settings')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(250,246,234,0.7)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 999, padding: '8px 14px 8px 12px', cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 500, color: '#1F3A2A', boxShadow: '0 2px 10px rgba(31,29,23,0.06)' }}
            >
              <GearIcon size={15} color="#1F3A2A" /> Edit profile
            </button>
          </>
        ) : (
          <button
            onClick={() => (onBack ? onBack() : onNavigate('friends'))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, color: '#4A4235', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span> Back
          </button>
        )}
      </div>

      {/* Profile header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
        <div
          onClick={() => { if (isOwn) onNavigate('settings') }}
          style={{ width: 92, height: 92, borderRadius: 46, background: '#1F3A2A', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.7)', boxShadow: `0 10px 28px rgba(31,58,42,0.22), 0 0 0 5px ${rank.color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, cursor: isOwn ? 'pointer' : 'default', position: 'relative' }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 38, color: '#D9824D' }}>{initial}</span>}
          {isOwn && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, background: '#D9824D', border: '2px solid #EDE8D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CameraIcon size={12} color="#FAF6EA" />
            </div>
          )}
        </div>

        <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 24, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          {displayName}
        </div>
        {handle && <div style={{ fontSize: 13, color: '#6B5F4E', marginTop: 3 }}>{handle}</div>}
        {country && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 13, color: '#4A4235', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>{flagEmoji(country)}</span>
            {countryName(country)}
          </div>
        )}

        {/* Rank badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: rank.color + '20', border: `1px solid ${rank.color}44`, borderRadius: 999, padding: '5px 14px 5px 10px', marginTop: 12 }}>
          <ShieldIcon size={13} color={rank.color} />
          <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 12, fontWeight: 700, color: rank.color, letterSpacing: '0.04em' }}>{rank.name}</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: isMobile ? 28 : 44, marginTop: 18 }}>
          {([
            { value: handicap != null ? handicap.toFixed(1) : '—', label: 'handicap' },
            { value: points.toLocaleString(), label: 'points' },
            { value: friendsCount, label: 'friends', onPress: () => (isOwn ? onNavigate('friends') : setShowFriends(true)) },
          ] as { value: string | number; label: string; onPress?: () => void }[]).map(s => {
            const content = (
              <>
                <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 26, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: s.onPress ? '#1F3A2A' : '#4A4235', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 5 }}>{s.label}</div>
              </>
            )
            return s.onPress
              ? <button key={s.label} onClick={s.onPress} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: 0 }}>{content}</button>
              : <div key={s.label} style={{ textAlign: 'center' }}>{content}</div>
          })}
        </div>

        {/* Win/loss */}
        {(wins + losses + ties) > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {[
              { value: wins,   label: 'W', color: '#5C7A4D', bg: 'rgba(92,122,77,0.12)' },
              { value: losses, label: 'L', color: '#C0603A', bg: 'rgba(192,96,58,0.12)' },
              { value: ties,   label: 'T', color: '#4A4235', bg: 'rgba(107,104,87,0.10)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: s.bg, borderRadius: 8, padding: '4px 10px' }}>
                <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: '0.06em' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress to next rank */}
        <div style={{ width: '100%', maxWidth: 320, marginTop: 18 }}>
          <div style={{ height: 5, background: 'rgba(31,58,42,0.10)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', borderRadius: 3, background: nextTier ? rank.color : '#D9824D', width: `${Math.round(progress * 100)}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B5F4E' }}>
            <span>{rank.name}</span>
            {nextTier ? <span>{nextTier.minPoints - points} pts to <span style={{ color: nextTier.color, fontWeight: 600 }}>{nextTier.name}</span></span> : <span style={{ color: '#D9824D', fontWeight: 600 }}>Max rank</span>}
          </div>
        </div>

        {/* Message button on other profiles */}
        {!isOwn && (
          <button
            onClick={() => onMessage(viewUserId)}
            style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", boxShadow: '0 4px 14px rgba(31,58,42,0.22)' }}
          >
            <ChatIcon size={16} color="#FAF6EA" /> Message
          </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(224,216,197,0.7)', marginBottom: 22 }} />

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
