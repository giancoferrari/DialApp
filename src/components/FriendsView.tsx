import { useState, useEffect, useCallback } from 'react'
import type { Friendship, PublicProfile } from '../types'
import {
  searchUsers, fetchFriendships, fetchProfilesForIds,
  sendFriendRequest, updateFriendship, removeFriend,
} from '../lib/friends'
import { CloseIcon, PersonIcon, ShieldIcon } from './Icons'
import { getRank } from '../lib/points'

function profileLabel(profile?: PublicProfile | null): { primary: string; secondary: string | null } {
  if (!profile) return { primary: 'Someone', secondary: null }
  const name   = profile.firstName ?? null
  const handle = profile.username  ? `@${profile.username}` : null
  if (name && handle && name !== handle) return { primary: name, secondary: handle }
  if (handle) return { primary: handle, secondary: null }
  return { primary: 'No username', secondary: null }
}

function FriendProfileModal({ profile, onClose }: { profile: PublicProfile; onClose: () => void }) {
  const initial = (profile.firstName?.[0] ?? profile.username?.[0] ?? '?').toUpperCase()
  const rank = getRank(profile.rankedPoints ?? 0)
  const totalMatches = (profile.wins ?? 0) + (profile.losses ?? 0) + (profile.ties ?? 0)
  const label = profileLabel(profile)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(20,18,12,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FAF6EA',
          borderRadius: 28, width: '100%', maxWidth: 360,
          boxShadow: '0 32px 80px rgba(20,18,12,0.32), 0 2px 0 rgba(255,255,255,0.9) inset',
          overflow: 'hidden',
        }}
      >
        {/* Header band */}
        <div style={{
          background: '#1F3A2A',
          padding: '32px 28px 48px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 32, height: 32, borderRadius: 16,
              background: 'rgba(250,246,234,0.12)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={16} color="rgba(250,246,234,0.7)" />
          </button>

          {/* Avatar */}
          <div style={{
            width: 96, height: 96, borderRadius: 48,
            background: '#2A4D39',
            border: '3px solid rgba(250,246,234,0.18)',
            margin: '0 auto 14px',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 40, color: '#D9824D' }}>{initial}</span>
            }
          </div>

          {/* Name */}
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {label.primary}
          </div>
          {label.secondary && (
            <div style={{ fontSize: 13, color: 'rgba(250,246,234,0.5)', marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>
              {label.secondary}
            </div>
          )}
        </div>

        {/* Pull-up card */}
        <div style={{
          background: '#FAF6EA',
          borderRadius: '24px 24px 0 0',
          marginTop: -24,
          padding: '24px 24px 28px',
        }}>
          {/* Rank badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: rank.color + '15', border: `1px solid ${rank.color}35`, borderRadius: 999, padding: '5px 14px 5px 10px' }}>
              <ShieldIcon size={12} color={rank.color} />
              <span style={{ fontSize: 12, fontWeight: 700, color: rank.color, letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>{rank.name}</span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', borderRadius: 16, overflow: 'hidden', border: '1px solid #E0D8C5', marginBottom: 16 }}>
            {[
              { val: profile.rankedPoints ?? 0, label: 'Points' },
              ...(profile.handicapIndex != null ? [{ val: profile.handicapIndex.toFixed(1), label: 'Handicap' }] : []),
            ].map((s, i, arr) => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderLeft: i > 0 ? '1px solid #E0D8C5' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(224,216,197,0.25)' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#B5AC95', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* W/L/T */}
          {totalMatches > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { value: profile.wins ?? 0,   label: 'Wins',   color: '#5C7A4D', bg: 'rgba(92,122,77,0.10)'   },
                { value: profile.losses ?? 0, label: 'Losses', color: '#C0603A', bg: 'rgba(192,96,58,0.10)'   },
                { value: profile.ties ?? 0,   label: 'Ties',   color: '#6B6857', bg: 'rgba(107,104,87,0.08)'  },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center', background: s.bg, borderRadius: 12, padding: '10px 4px' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: s.color, opacity: 0.75, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Home course */}
          {profile.homeCourse && (
            <div style={{ fontSize: 13, color: '#6B6857', background: '#F0EBDD', borderRadius: 10, padding: '9px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PersonIcon size={13} color="#B5AC95" />
              <span>{profile.homeCourse}</span>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              width: '100%', background: '#1F3A2A', color: '#FAF6EA',
              border: 'none', borderRadius: 16, padding: '13px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
          >
            Close
          </button>
        </div>
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
              const lbl = profileLabel(p)
              return (
                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F0EBDD' }}>
                  <Avatar profile={p} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                      {lbl.primary}
                    </div>
                    {lbl.secondary && (
                      <div style={{ fontSize: 12, color: '#6B6857' }}>{lbl.secondary}</div>
                    )}
                    {!lbl.secondary && p.handicapIndex != null && (
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
                      {profileLabel(profile).primary}
                    </div>
                    {profileLabel(profile).secondary && (
                      <div style={{ fontSize: 12, color: '#B5AC95' }}>{profileLabel(profile).secondary}</div>
                    )}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                      {profileLabel(profile).primary}
                    </div>
                    {profileLabel(profile).secondary && (
                      <div style={{ fontSize: 12, color: '#B5AC95' }}>{profileLabel(profile).secondary}</div>
                    )}
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
                        {profileLabel(profile).primary}
                      </div>
                      {profileLabel(profile).secondary && (
                        <div style={{ fontSize: 12, color: '#B5AC95' }}>{profileLabel(profile).secondary}</div>
                      )}
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
