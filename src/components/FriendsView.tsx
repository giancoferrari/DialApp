import { useState, useEffect, useCallback } from 'react'
import type { Friendship, PublicProfile } from '../types'
import {
  searchUsers, fetchFriendships, fetchProfilesForIds,
  sendFriendRequest, updateFriendship, removeFriend,
} from '../lib/friends'
import { CloseIcon, PersonIcon } from './Icons'

function FriendProfileModal({ profile, onClose }: { profile: PublicProfile; onClose: () => void }) {
  const initial = profile.username?.[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,29,23,0.50)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'rgba(237,232,212,0.90)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 28, padding: '36px 28px', width: '100%', maxWidth: 340, textAlign: 'center', boxShadow: '0 24px 64px rgba(31,58,42,0.18), inset 0 1px 0 rgba(255,255,255,0.7)' }}>
        <div style={{ width: 88, height: 88, borderRadius: 44, background: '#1F3A2A', margin: '0 auto 18px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #E0D8C5' }}>
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 36, color: '#D9824D' }}>{initial}</span>
          }
        </div>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.025em', marginBottom: 6 }}>
          {profile.username ? `@${profile.username}` : 'No username'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
          {profile.handicapIndex != null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em' }}>{profile.handicapIndex.toFixed(1)}</div>
              <div style={{ fontSize: 10, color: '#6B6857', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Handicap</div>
            </div>
          )}
        </div>
        {profile.homeCourse && (
          <div style={{ fontSize: 13, color: '#6B6857', background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 10, padding: '8px 14px', marginBottom: 20 }}>
            Home: <strong style={{ color: '#1F1D17' }}>{profile.homeCourse}</strong>
          </div>
        )}
        <button
          onClick={onClose}
          style={{ width: '100%', background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 14, padding: '12px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

interface Props {
  userId: string
  isMobile?: boolean
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

export default function FriendsView({ userId, isMobile = false }: Props) {
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
  const card: React.CSSProperties = { background: 'rgba(250,246,234,0.62)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(255,255,255,0.52)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(31,29,23,0.08), inset 0 1px 0 rgba(255,255,255,0.65)' }

  const btnSmall = (bg: string, color: string): React.CSSProperties => ({
    background: bg, color, border: 'none', borderRadius: 999,
    padding: '7px 14px', fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    transition: 'opacity 0.15s', whiteSpace: 'nowrap',
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
          <PersonIcon size={16} color="#B5AC95" />
        </div>

        {(searchResults.length > 0 || searching) && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'rgba(250,246,234,0.85)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 16, overflow: 'hidden', zIndex: 20, boxShadow: '0 12px 32px rgba(31,58,42,0.14), inset 0 1px 0 rgba(255,255,255,0.7)' }}>
            {searching && (
              <div style={{ padding: '14px 16px', fontSize: 13, color: '#B5AC95' }}>Searching…</div>
            )}
            {searchResults.map(p => {
              const existing = friendshipWith(p.userId)
              return (
                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F0EBDD' }}>
                  <Avatar profile={p} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                      @{p.username}
                    </div>
                    {p.handicapIndex != null && (
                      <div style={{ fontSize: 12, color: '#6B6857' }}>HCP {p.handicapIndex.toFixed(1)}</div>
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
                    <span style={{ fontSize: 12, color: '#B5AC95', fontWeight: 500 }}>
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
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 12 }}>
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
                      {profile?.username ? `@${profile.username}` : 'Someone'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6857' }}>wants to connect</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleDecline(f.id)} disabled={!!actionLoading} style={btnSmall('#F0EBDD', '#6B6857')}>
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
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 12 }}>
            Pending ({outgoingRequests.length})
          </div>
          <div style={card}>
            {outgoingRequests.map((f, i) => {
              const profile = getProfile(f.addresseeId)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid #F0EBDD' }}>
                  <Avatar profile={profile} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                      {profile?.username ? `@${profile.username}` : '—'}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#B5AC95', fontWeight: 500, background: '#F0EBDD', borderRadius: 999, padding: '4px 10px' }}>Pending</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 12 }}>
          Your friends ({myFriendships.length})
        </div>

        {loading ? (
          <div style={{ ...card, padding: '32px', textAlign: 'center', fontSize: 14, color: '#B5AC95' }}>Loading…</div>
        ) : myFriendships.length === 0 ? (
          <div style={{ ...card, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, color: '#C9C0A8', marginBottom: 8 }}>No friends yet</div>
            <div style={{ fontSize: 13, color: '#B5AC95' }}>Search by username to add your playing partners.</div>
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
                        {profile?.username ? `@${profile.username}` : friendId.slice(0, 8)}
                      </div>
                      {profile?.handicapIndex != null && (
                        <div style={{ fontSize: 12, color: '#6B6857' }}>HCP {profile.handicapIndex.toFixed(1)}</div>
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
                    <CloseIcon size={14} color="#6B6857" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {viewProfile && <FriendProfileModal profile={viewProfile} onClose={() => setViewProfile(null)} />}
    </div>
  )
}
