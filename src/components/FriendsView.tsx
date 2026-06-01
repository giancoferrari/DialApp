import { useState, useEffect, useCallback } from 'react'
import type { Friendship, PublicProfile } from '../types'
import {
  searchUsers, fetchFriendships, fetchProfilesForIds,
  sendFriendRequest, updateFriendship, removeFriend,
} from '../lib/friends'
import { CloseIcon, PersonIcon, ShieldIcon } from './Icons'
import Portal from './Portal'
import { getRank, RANK_TIERS } from '../lib/points'

function profileLabel(profile?: PublicProfile | null): { primary: string; secondary: string | null } {
  if (!profile) return { primary: 'Someone', secondary: null }
  const name   = profile.firstName ?? null
  const handle = profile.username  ? `@${profile.username}` : null
  if (name && handle && name !== handle) return { primary: name, secondary: handle }
  if (handle) return { primary: handle, secondary: null }
  return { primary: 'No username', secondary: null }
}

function FriendProfileModal({ profile, onClose, onMessage, onViewProfile }: { profile: PublicProfile; onClose: () => void; onMessage?: (id: string) => void; onViewProfile?: (id: string) => void }) {
  const initial = (profile.firstName?.[0] ?? profile.username?.[0] ?? '?').toUpperCase()
  const points  = profile.rankedPoints ?? 0
  const rank    = getRank(points)
  const rankIdx = RANK_TIERS.findIndex(t => t.name === rank.name)
  const nextTier = rankIdx < RANK_TIERS.length - 1 ? RANK_TIERS[rankIdx + 1] : null
  const progress = nextTier
    ? Math.min(1, (points - rank.minPoints) / (nextTier.minPoints - rank.minPoints))
    : 1
  const totalMatches = (profile.wins ?? 0) + (profile.losses ?? 0) + (profile.ties ?? 0)
  const label = profileLabel(profile)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(20,18,12,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(237,232,212,0.92)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.55)',
          borderRadius: 32, width: '100%', maxWidth: 360,
          boxShadow: '0 40px 100px rgba(20,18,12,0.38), inset 0 1px 0 rgba(255,255,255,0.80)',
          overflow: 'hidden',
          animation: 'scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Dark green header */}
        <div style={{
          background: 'linear-gradient(170deg, rgba(35,68,46,1) 0%, rgba(22,44,28,1) 100%)',
          padding: '28px 24px 52px',
          textAlign: 'center',
          position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 30, height: 30, borderRadius: 15,
              background: 'rgba(250,246,234,0.10)',
              border: '1px solid rgba(250,246,234,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,246,234,0.20)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,246,234,0.10)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.88)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.88)' }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <CloseIcon size={14} color="rgba(250,246,234,0.65)" />
          </button>

          {/* Avatar */}
          <div style={{
            width: 88, height: 88, borderRadius: 44,
            background: '#2A4D39',
            border: '2.5px solid rgba(217,130,77,0.50)',
            boxShadow: '0 0 0 4px rgba(217,130,77,0.12), 0 8px 24px rgba(0,0,0,0.28)',
            margin: '0 auto 14px',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 36, color: '#D9824D' }}>{initial}</span>
            }
          </div>

          {/* Name */}
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 21, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {label.primary}
          </div>
          {label.secondary && (
            <div style={{ fontSize: 12.5, color: 'rgba(250,246,234,0.45)', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
              {label.secondary}
            </div>
          )}
        </div>

        {/* Glass pull-up card */}
        <div style={{
          background: 'rgba(250,246,234,0.60)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '26px 26px 0 0',
          marginTop: -26,
          padding: '22px 20px 24px',
          border: '1px solid rgba(255,255,255,0.55)',
          borderBottom: 'none',
        }}>

          {/* Rank + progress */}
          <div style={{ background: 'rgba(31,58,42,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: '14px 16px', marginBottom: 12, boxShadow: '0 4px 16px rgba(31,58,42,0.20), inset 0 1px 0 rgba(255,255,255,0.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(250,246,234,0.10)', border: `1px solid ${rank.color}55`, borderRadius: 999, padding: '4px 12px 4px 8px' }}>
                <ShieldIcon size={11} color={rank.color} />
                <span style={{ fontSize: 11, fontWeight: 700, color: rank.color, letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>{rank.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.04em' }}>{points.toLocaleString()}</span>
                <span style={{ fontSize: 10, color: '#B5C29A', fontWeight: 600, marginLeft: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>pts</span>
              </div>
            </div>
            <div style={{ height: 5, background: 'rgba(250,246,234,0.10)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 3, background: nextTier ? rank.color : '#D9824D', width: `${Math.round(progress * 100)}%`, transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10.5, color: 'rgba(250,246,234,0.38)', fontFamily: "'DM Sans', sans-serif" }}>{rank.name}</span>
              {nextTier ? (
                <span style={{ fontSize: 10.5, color: 'rgba(250,246,234,0.45)', fontFamily: "'DM Sans', sans-serif" }}>
                  {nextTier.minPoints - points} pts to <span style={{ color: nextTier.color, fontWeight: 600 }}>{nextTier.name}</span>
                </span>
              ) : (
                <span style={{ fontSize: 10.5, color: '#D9824D', fontWeight: 600 }}>Max rank</span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {[
              ...(profile.handicapIndex != null ? [{ val: profile.handicapIndex.toFixed(1), label: 'Handicap' }] : []),
              { val: `${profile.wins ?? 0}W ${profile.losses ?? 0}L`, label: 'Record' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'rgba(250,246,234,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.60)', borderRadius: 16, padding: '13px 8px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#6B5F4E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* W/L/T tiles */}
          {totalMatches > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[
                { value: profile.wins ?? 0,   label: 'Wins',   color: '#5C7A4D', bg: 'rgba(92,122,77,0.12)'  },
                { value: profile.losses ?? 0, label: 'Losses', color: '#C0603A', bg: 'rgba(192,96,58,0.12)'  },
                { value: profile.ties ?? 0,   label: 'Ties',   color: '#4A4235', bg: 'rgba(107,104,87,0.10)' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center', background: s.bg, border: '1px solid rgba(255,255,255,0.40)', borderRadius: 14, padding: '10px 4px' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: s.color, opacity: 0.7, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Home course */}
          {profile.homeCourse && (
            <div style={{ fontSize: 13, color: '#4A4235', background: 'rgba(250,246,234,0.72)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 12, padding: '9px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PersonIcon size={13} color="#6B5F4E" />
              <span>{profile.homeCourse}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {onViewProfile && (
              <button
                onClick={() => { onViewProfile(profile.userId); onClose() }}
                style={{ flex: 1, background: 'rgba(250,246,234,0.72)', color: '#1F3A2A', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 16, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}
              >
                View profile
              </button>
            )}
            {onMessage && (
              <button
                onClick={() => { onMessage(profile.userId); onClose() }}
                style={{ flex: 1, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 16, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em', boxShadow: '0 4px 14px rgba(31,58,42,0.24)' }}
              >
                Message
              </button>
            )}
            {!onMessage && !onViewProfile && (
              <button onClick={onClose} style={{ flex: 1, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 16, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Close</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  userId: string
  isMobile?: boolean
  onMessage?: (userId: string) => void
  onViewProfile?: (userId: string) => void
}

function Avatar({ profile, size = 44 }: { profile?: PublicProfile; size?: number }) {
  const initial = profile?.username?.[0]?.toUpperCase() ?? profile?.firstName?.[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: '#1F3A2A', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {profile?.avatarUrl
        ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: size * 0.38, color: '#D9824D' }}>{initial}</span>
      }
    </div>
  )
}

export default function FriendsView({ userId, isMobile = false, onMessage, onViewProfile }: Props) {
  const [friendships,    setFriendships]   = useState<Friendship[]>([])
  const [friendProfiles, setFriendProfiles] = useState<PublicProfile[]>([])
  const [loading,        setLoading]       = useState(true)
  const [searchQuery,    setSearchQuery]   = useState('')
  const [searchResults,  setSearchResults] = useState<PublicProfile[]>([])
  const [searching,      setSearching]     = useState(false)
  const [actionLoading,  setActionLoading] = useState<string | null>(null)
  const [error,          setError]         = useState<string | null>(null)
  const [viewProfile,    setViewProfile]   = useState<PublicProfile | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fs = await fetchFriendships(userId)
      setFriendships(fs)
      const allIds = fs.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
      const profiles = await fetchProfilesForIds(allIds)
      setFriendProfiles(profiles)
    } catch { setError('Failed to load friends.') }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchUsers(searchQuery, userId)
        setSearchResults(results)
      } catch { /* ignore */ }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [searchQuery, userId])

  const myFriendships      = friendships.filter(f => f.status === 'accepted')
  const incomingRequests   = friendships.filter(f => f.status === 'pending' && f.addresseeId === userId)
  const outgoingRequests   = friendships.filter(f => f.status === 'pending' && f.requesterId === userId)

  const getProfile = (uid: string) => friendProfiles.find(p => p.userId === uid)

  const friendshipWith = (targetId: string) =>
    friendships.find(f =>
      (f.requesterId === userId && f.addresseeId === targetId) ||
      (f.addresseeId === userId && f.requesterId === targetId)
    )

  const handleSendRequest = async (targetId: string) => {
    setActionLoading(targetId)
    try {
      const f = await sendFriendRequest(userId, targetId)
      setFriendships(prev => [...prev, f])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send request.')
    } finally { setActionLoading(null) }
  }

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      await updateFriendship(friendshipId, 'accepted')
      await load()
    } catch { setError('Failed to accept.') }
    finally { setActionLoading(null) }
  }

  const handleDecline = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      await updateFriendship(friendshipId, 'declined')
      setFriendships(prev => prev.filter(f => f.id !== friendshipId))
    } catch { setError('Failed to decline.') }
    finally { setActionLoading(null) }
  }

  const handleRemove = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      await removeFriend(friendshipId)
      setFriendships(prev => prev.filter(f => f.id !== friendshipId))
    } catch { setError('Failed to remove.') }
    finally { setActionLoading(null) }
  }

  const px = isMobile ? 20 : 40
  const card: React.CSSProperties = { background: 'rgba(250,246,234,0.70)', backdropFilter: 'blur(36px) saturate(180%)', WebkitBackdropFilter: 'blur(36px) saturate(180%)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 6px 28px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.80)' }

  const btnSmall = (bg: string, color: string): React.CSSProperties => ({
    background: bg, color, border: 'none', borderRadius: 999,
    padding: '7px 14px', fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.12s cubic-bezier(0.22, 1, 0.36, 1)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>
          Social
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: 0, lineHeight: 1 }}>
          Friends
        </h1>
      </div>

      {error && (
        <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by username…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(250,246,234,0.68)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.52)',
            borderRadius: 14, padding: '13px 16px 13px 44px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
            fontSize: 14, color: '#1F1D17', outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
        />
        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <PersonIcon size={16} color="#6B5F4E" />
        </div>

        {(searchResults.length > 0 || searching) && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'rgba(250,246,234,0.92)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', border: '1px solid rgba(255,255,255,0.68)', borderRadius: 18, overflow: 'hidden', zIndex: 20, boxShadow: '0 16px 40px rgba(31,58,42,0.16), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
            {searching && (
              <div style={{ padding: '14px 16px', fontSize: 13, color: '#6B5F4E' }}>Searching…</div>
            )}
            {searchResults.map(p => {
              const existing = friendshipWith(p.userId)
              const lbl = profileLabel(p)
              return (
                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F0EBDD' }}>
                  <Avatar profile={p} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                      {lbl.primary}
                    </div>
                    {lbl.secondary && (
                      <div style={{ fontSize: 12, color: '#4A4235' }}>{lbl.secondary}</div>
                    )}
                    {!lbl.secondary && p.handicapIndex != null && (
                      <div style={{ fontSize: 12, color: '#4A4235' }}>HCP {p.handicapIndex.toFixed(1)}</div>
                    )}
                  </div>
                  {!existing ? (
                    <button
                      onClick={() => handleSendRequest(p.userId)}
                      disabled={actionLoading === p.userId}
                      style={btnSmall('#1F3A2A', '#FAF6EA')}
                    >
                      {actionLoading === p.userId ? '…' : '+ Add'}
                    </button>
                  ) : existing.status === 'pending' ? (
                    <span style={{ fontSize: 12, color: '#6B5F4E', fontWeight: 500 }}>
                      {existing.requesterId === userId ? 'Sent' : 'Incoming'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#5C7A4D', fontWeight: 500 }}>Friends</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 12 }}>
            Requests ({incomingRequests.length})
          </div>
          <div style={card}>
            {incomingRequests.map((f, i) => {
              const profile = getProfile(f.requesterId)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid #F0EBDD' }}>
                  <Avatar profile={profile} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                      {profileLabel(profile).primary}
                    </div>
                    {profileLabel(profile).secondary && (
                      <div style={{ fontSize: 12, color: '#6B5F4E' }}>{profileLabel(profile).secondary}</div>
                    )}
                    <div style={{ fontSize: 12, color: '#4A4235' }}>wants to connect</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleDecline(f.id)} disabled={!!actionLoading} style={btnSmall('#F0EBDD', '#4A4235')}>
                      Decline
                    </button>
                    <button onClick={() => handleAccept(f.id)} disabled={!!actionLoading} style={btnSmall('#1F3A2A', '#FAF6EA')}>
                      {actionLoading === f.id ? '…' : 'Accept'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Outgoing pending */}
      {outgoingRequests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 12 }}>
            Pending ({outgoingRequests.length})
          </div>
          <div style={card}>
            {outgoingRequests.map((f, i) => {
              const profile = getProfile(f.addresseeId)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid #F0EBDD' }}>
                  <Avatar profile={profile} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                      {profileLabel(profile).primary}
                    </div>
                    {profileLabel(profile).secondary && (
                      <div style={{ fontSize: 12, color: '#6B5F4E' }}>{profileLabel(profile).secondary}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#6B5F4E', fontWeight: 500, background: '#F0EBDD', borderRadius: 999, padding: '4px 10px' }}>Pending</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 12 }}>
          Your friends ({myFriendships.length})
        </div>

        {loading ? (
          <div style={{ ...card, padding: '32px', textAlign: 'center', fontSize: 14, color: '#6B5F4E' }}>Loading…</div>
        ) : myFriendships.length === 0 ? (
          <div style={{ ...card, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, color: '#8B8272', marginBottom: 8 }}>No friends yet</div>
            <div style={{ fontSize: 13, color: '#6B5F4E' }}>Search by username to add your playing partners.</div>
          </div>
        ) : (
          <div style={card}>
            {myFriendships.map((f, i) => {
              const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId
              const profile = getProfile(friendId)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid #F0EBDD' }}>
                  <div onClick={() => profile && setViewProfile(profile)} style={{ cursor: profile ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <Avatar profile={profile} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                        {profileLabel(profile).primary}
                      </div>
                      {profileLabel(profile).secondary && (
                        <div style={{ fontSize: 12, color: '#6B5F4E' }}>{profileLabel(profile).secondary}</div>
                      )}
                      {profile?.handicapIndex != null && (
                        <div style={{ fontSize: 12, color: '#4A4235' }}>HCP {profile.handicapIndex.toFixed(1)}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(f.id)}
                    disabled={!!actionLoading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, opacity: 0.4, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.4' }}
                  >
                    <CloseIcon size={14} color="#4A4235" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {viewProfile && <Portal><FriendProfileModal profile={viewProfile} onClose={() => setViewProfile(null)} onMessage={onMessage} onViewProfile={onViewProfile} /></Portal>}
    </div>
  )
}

