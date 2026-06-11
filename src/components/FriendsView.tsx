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
import { color, font, radius } from '../lib/tokens'
import { card as cardSurface } from '../lib/surfaces'

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
  const card: React.CSSProperties = { ...cardSurface, overflow: 'hidden' }
  const rowDivider = `1px solid ${color.border}`
  const sectionLabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 10 }

  const btnSmall = (bg: string, fg: string): React.CSSProperties => ({
    background: bg, color: fg, border: 'none', borderRadius: radius.sm,
    padding: '8px 14px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: font.body,
    transition: 'all 0.12s cubic-bezier(0.22, 1, 0.36, 1)', whiteSpace: 'nowrap',
  })

  const nameRow = (primary: string, secondary: string | null, meta?: string | null) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: font.body, fontSize: 15, fontWeight: 600, color: color.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</div>
      {secondary && <div style={{ fontSize: 12, color: color.muted, marginTop: 1 }}>{secondary}</div>}
      {!secondary && meta && <div style={{ fontSize: 12, color: color.muted, marginTop: 1 }}>{meta}</div>}
    </div>
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 44}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* Header */}
      <h1 style={{ fontFamily: font.display, fontSize: isMobile ? 30 : 36, fontWeight: 600, color: color.ink, letterSpacing: '-0.02em', margin: '0 0 4px', lineHeight: 1 }}>
        Friends
      </h1>
      <p style={{ fontSize: 14, color: color.muted, margin: '0 0 22px' }}>Your playing partners and rivals.</p>

      {/* Leaderboard entry — dark accent row */}
      {onNavigate && (
        <button
          onClick={() => onNavigate('leaderboard')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, background: color.green, border: 'none', borderRadius: radius.card, padding: '15px 18px', cursor: 'pointer', textAlign: 'left', marginBottom: 22, transition: 'background 0.15s, transform 0.16s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = color.greenDeep }}
          onMouseLeave={e => { e.currentTarget.style.background = color.green }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <div style={{ width: 40, height: 40, borderRadius: radius.sm, background: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MedalIcon size={20} color="#E0935E" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: color.onGreen, letterSpacing: '-0.01em' }}>Leaderboard</div>
            <div style={{ fontSize: 13, color: 'rgba(242,245,241,0.6)', marginTop: 1 }}>See how you rank against your friends</div>
          </div>
          <ChevronRightIcon size={18} color="rgba(242,245,241,0.5)" />
        </button>
      )}

      {error && (
        <div style={{ background: '#FBEDEB', border: '1px solid #EFCBC5', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: color.dangerDeep, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 26 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by username…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: color.white,
            border: `1px solid ${color.borderStrong}`,
            borderRadius: radius.sm, padding: '12px 16px 12px 42px',
            fontSize: 16, color: color.ink, outline: 'none',
            fontFamily: font.body,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = color.green }}
          onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
        />
        <div style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <PersonIcon size={16} color={color.faint} />
        </div>

        {(searchResults.length > 0 || searching) && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: color.white, border: `1px solid ${color.border}`, borderRadius: radius.card, overflow: 'hidden', zIndex: 20, boxShadow: '0 16px 40px rgba(23,26,23,0.14)' }}>
            {searching && (
              <div style={{ padding: '14px 16px', fontSize: 13, color: color.muted }}>Searching…</div>
            )}
            {searchResults.map(p => {
              const existing = friendshipWith(p.userId)
              const lbl = profileLabel(p)
              return (
                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: rowDivider }}>
                  <Avatar profile={p} size={40} />
                  {nameRow(lbl.primary, lbl.secondary, p.handicapIndex != null ? `HCP ${p.handicapIndex.toFixed(1)}` : null)}
                  {!existing ? (
                    <button
                      onClick={() => handleSendRequest(p.userId)}
                      disabled={actionLoading === p.userId}
                      style={btnSmall(color.green, color.onGreen)}
                    >
                      {actionLoading === p.userId ? '…' : 'Add'}
                    </button>
                  ) : existing.status === 'pending' ? (
                    <span style={{ fontSize: 12, color: color.muted, fontWeight: 500 }}>
                      {existing.requesterId === userId ? 'Sent' : 'Incoming'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: color.positive, fontWeight: 600 }}>Friends</span>
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
          <div style={sectionLabel}>Requests ({incomingRequests.length})</div>
          <div style={card}>
            {incomingRequests.map((f, i) => {
              const profile = getProfile(f.requesterId)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: i === 0 ? 'none' : rowDivider }}>
                  <Avatar profile={profile} size={44} />
                  {nameRow(profileLabel(profile).primary, profileLabel(profile).secondary, 'wants to connect')}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleDecline(f.id)} disabled={!!actionLoading} style={btnSmall(color.sand, color.inkSoft)}>
                      Decline
                    </button>
                    <button onClick={() => handleAccept(f.id)} disabled={!!actionLoading} style={btnSmall(color.green, color.onGreen)}>
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
          <div style={sectionLabel}>Pending ({outgoingRequests.length})</div>
          <div style={card}>
            {outgoingRequests.map((f, i) => {
              const profile = getProfile(f.addresseeId)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: i === 0 ? 'none' : rowDivider }}>
                  <Avatar profile={profile} size={44} />
                  {nameRow(profileLabel(profile).primary, profileLabel(profile).secondary)}
                  <span style={{ fontSize: 12, color: color.muted, fontWeight: 500, background: color.sand, borderRadius: 999, padding: '4px 10px' }}>Pending</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <div style={sectionLabel}>Your friends ({myFriendships.length})</div>

        {loading ? (
          <div style={card}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: i === 0 ? 'none' : rowDivider }}>
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
            icon={<PersonIcon size={24} color={color.faint} />}
            title="No friends yet"
            subtitle="Search by username to add your playing partners."
          />
        ) : (
          <div style={card}>
            {myFriendships.map((f, i) => {
              const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId
              const profile = getProfile(friendId)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: i === 0 ? 'none' : rowDivider }}>
                  <div onClick={() => profile && onViewProfile?.(friendId)} style={{ cursor: profile ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <Avatar profile={profile} size={44} />
                    {nameRow(profileLabel(profile).primary, profileLabel(profile).secondary, profile?.handicapIndex != null ? `HCP ${profile.handicapIndex.toFixed(1)}` : null)}
                  </div>
                  <button
                    onClick={() => handleRemove(f.id)}
                    disabled={!!actionLoading}
                    aria-label="Remove friend"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, opacity: 0.45, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.45' }}
                  >
                    <CloseIcon size={14} color={color.inkSoft} />
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

