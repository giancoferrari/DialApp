import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Friendship, PublicProfile, View } from '../types'
import {
  searchUsers, fetchFriendships, fetchProfilesForIds,
  sendFriendRequest, updateFriendship, removeFriend,
} from '../lib/friends'
import { CloseIcon, PersonIcon, MedalIcon, ChevronRightIcon } from './Icons'
import Skeleton from './Skeleton'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import { useToast } from './Toast'

function profileLabel(profile?: PublicProfile | null): { primary: string; secondary: string | null } {
  if (!profile) return { primary: 'Someone', secondary: null }
  const name   = profile.firstName ?? null
  const handle = profile.username  ? `@${profile.username}` : null
  if (name && handle && name !== handle) return { primary: name, secondary: handle }
  if (handle) return { primary: handle, secondary: null }
  return { primary: 'No username', secondary: null }
}

interface Props {
  userId: string
  isMobile?: boolean
  onViewProfile?: (userId: string) => void
  onNavigate?: (v: View) => void
}


export default function FriendsView({ userId, isMobile = false, onViewProfile, onNavigate }: Props) {
  const qc = useQueryClient()
  const toast = useToast()
  const [searchQuery,    setSearchQuery]   = useState('')
  const [searchResults,  setSearchResults] = useState<PublicProfile[]>([])
  const [searching,      setSearching]     = useState(false)
  const [actionLoading,  setActionLoading] = useState<string | null>(null)
  const [error,          setError]         = useState<string | null>(null)

  const friendsKey = ['friends', userId]
  const { data, isLoading: loading } = useQuery({
    queryKey: friendsKey,
    queryFn: async () => {
      const fs = await fetchFriendships(userId)
      const ids = fs.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
      const profiles = await fetchProfilesForIds(ids)
      return { friendships: fs, profiles }
    },
  })
  const friendships    = data?.friendships ?? []
  const friendProfiles = data?.profiles ?? []
  const setFriendshipsCache = (fn: (prev: Friendship[]) => Friendship[]) =>
    qc.setQueryData<{ friendships: Friendship[]; profiles: PublicProfile[] }>(friendsKey, old =>
      old ? { ...old, friendships: fn(old.friendships) } : old)
  const refresh = () => qc.invalidateQueries({ queryKey: friendsKey })

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
      setFriendshipsCache(prev => [...prev, f])
      toast('Friend request sent')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send request.')
    } finally { setActionLoading(null) }
  }

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      await updateFriendship(friendshipId, 'accepted')
      refresh()
      toast('Friend added')
    } catch { setError('Failed to accept.') }
    finally { setActionLoading(null) }
  }

  const handleDecline = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      await updateFriendship(friendshipId, 'declined')
      setFriendshipsCache(prev => prev.filter(f => f.id !== friendshipId))
    } catch { setError('Failed to decline.') }
    finally { setActionLoading(null) }
  }

  const handleRemove = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      await removeFriend(friendshipId)
      setFriendshipsCache(prev => prev.filter(f => f.id !== friendshipId))
    } catch { setError('Failed to remove.') }
    finally { setActionLoading(null) }
  }

  const px = isMobile ? 20 : 40
  const card: React.CSSProperties = { background: '#FFFDF8', border: '1px solid #E0D8C5', borderRadius: 18, overflow: 'hidden' }

  const btnSmall = (bg: string, color: string): React.CSSProperties => ({
    background: bg, color, border: 'none', borderRadius: 999,
    padding: '7px 14px', fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    transition: 'all 0.12s cubic-bezier(0.22, 1, 0.36, 1)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#8B8272', textTransform: 'uppercase', marginBottom: 8 }}>
          Social
        </div>
        <h1 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: 0, lineHeight: 1 }}>
          Friends
        </h1>
      </div>

      {/* Leaderboard entry */}
      {onNavigate && (
        <button
          onClick={() => onNavigate('leaderboard')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, background: 'linear-gradient(150deg, rgba(35,68,46,1) 0%, rgba(26,50,33,1) 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '15px 18px', cursor: 'pointer', textAlign: 'left', marginBottom: 24, boxShadow: '0 10px 30px rgba(31,58,42,0.22)', transition: 'transform 0.16s ease' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(217,130,77,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MedalIcon size={20} color="#D9824D" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 16, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em' }}>Leaderboard</div>
            <div style={{ fontSize: 12.5, color: 'rgba(250,246,234,0.55)', marginTop: 2 }}>See how you rank against your friends</div>
          </div>
          <ChevronRightIcon size={18} color="rgba(250,246,234,0.5)" />
        </button>
      )}

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
            background: '#F0EBDD',
            border: '1px solid rgba(255,255,255,0.52)',
            borderRadius: 14, padding: '13px 16px 13px 44px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
            fontSize: 14, color: '#1F1D17', outline: 'none',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
        />
        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <PersonIcon size={16} color="#6B5F4E" />
        </div>

        {(searchResults.length > 0 || searching) && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#FFFDF8', border: '1px solid #E0D8C5', borderRadius: 18, overflow: 'hidden', zIndex: 20, boxShadow: '0 16px 40px rgba(31,58,42,0.16), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
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
                    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
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
                    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
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
                    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
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
          <div style={card}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid #F0EBDD' }}>
                <Skeleton width={44} height={44} radius={22} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="40%" height={13} />
                  <Skeleton width="55%" height={11} style={{ marginTop: 7 }} />
                </div>
              </div>
            ))}
          </div>
        ) : myFriendships.length === 0 ? (
          <EmptyState
            icon={<PersonIcon size={24} color="#8B8272" />}
            title="No friends yet"
            subtitle="Search by username to add your playing partners."
          />
        ) : (
          <div style={card}>
            {myFriendships.map((f, i) => {
              const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId
              const profile = getProfile(friendId)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid #F0EBDD' }}>
                  <div onClick={() => profile && onViewProfile?.(friendId)} style={{ cursor: profile ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <Avatar profile={profile} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
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

    </div>
  )
}

