import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchFriendships, fetchProfilesForIds, updateFriendship } from '../lib/friends'
import { fetchMatches, acceptMatchInvite, declineMatchInvite } from '../lib/matches'
import { fetchNotifications, markNotificationsRead } from '../lib/notifications'
import type { PublicProfile, Friendship, Match, AppNotification } from '../types'
import { CheckIcon, CloseIcon, TrophyIcon, UsersIcon } from './Icons'
import Avatar from './Avatar'
import Skeleton from './Skeleton'

type NotifData = {
  friendReqs: (Friendship & { profile?: PublicProfile })[]
  matchInvites: Match[]
  notifs: AppNotification[]
}

function notifAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  userId: string
  isMobile?: boolean
  onCountChange: (n: number) => void
}


const MODE_LABELS: Record<string, string> = {
  stroke: 'Stroke Play', match_play: 'Match Play', skins: 'Skins', wolf: 'Wolf',
}

export default function NotificationsView({ userId, isMobile = false, onCountChange }: Props) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const notifKey = ['notifications', userId]

  const { data, isLoading: loading } = useQuery({
    queryKey: notifKey,
    queryFn: async (): Promise<NotifData> => {
      const [friendships, matches] = await Promise.all([fetchFriendships(userId), fetchMatches(userId)])

      const pendingForMe = friendships.filter(f => f.addresseeId === userId && f.status === 'pending')
      const requesterIds = pendingForMe.map(f => f.requesterId)
      const profiles = requesterIds.length ? await fetchProfilesForIds(requesterIds) : []
      const friendReqs = pendingForMe.map(f => ({ ...f, profile: profiles.find(p => p.userId === f.requesterId) }))

      const matchInvites = matches.filter(m => {
        const me = m.players.find(p => p.userId === userId)
        return me?.status === 'invited' && m.status === 'pending'
      })

      let notifs: AppNotification[] = []
      try { notifs = await fetchNotifications(userId); markNotificationsRead(userId).catch(() => {}) }
      catch { /* notifications table not set up */ }

      return { friendReqs, matchInvites, notifs }
    },
  })

  const friendReqs   = data?.friendReqs ?? []
  const matchInvites = data?.matchInvites ?? []
  const notifs       = data?.notifs ?? []

  // Keep the bell badge in sync (notifications are marked read on load).
  useEffect(() => { onCountChange(friendReqs.length + matchInvites.length) }, [friendReqs.length, matchInvites.length, onCountChange])

  const patch = (fn: (d: NotifData) => NotifData) =>
    qc.setQueryData<NotifData>(notifKey, old => (old ? fn(old) : old))

  // Realtime: new friend requests / match invites / notifications
  useEffect(() => {
    const inval = () => qc.invalidateQueries({ queryKey: notifKey })
    const ch = supabase
      .channel(`notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_players', filter: `user_id=eq.${userId}` }, inval)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` }, inval)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, inval)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, qc]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFriendAccept = async (f: Friendship) => {
    setBusy(f.id); setError(null)
    try {
      await updateFriendship(f.id, 'accepted')
      patch(d => ({ ...d, friendReqs: d.friendReqs.filter(x => x.id !== f.id) }))
    } catch { setError('Failed to accept.') }
    finally { setBusy(null) }
  }

  const handleFriendDecline = async (f: Friendship) => {
    setBusy(f.id); setError(null)
    try {
      await updateFriendship(f.id, 'declined')
      patch(d => ({ ...d, friendReqs: d.friendReqs.filter(x => x.id !== f.id) }))
    } catch { setError('Failed to decline.') }
    finally { setBusy(null) }
  }

  const handleMatchAccept = async (match: Match) => {
    setBusy(match.id); setError(null)
    try {
      await acceptMatchInvite(match.id, userId, match.wagerPerPlayer)
      patch(d => ({ ...d, matchInvites: d.matchInvites.filter(m => m.id !== match.id) }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to accept.')
    } finally { setBusy(null) }
  }

  const handleMatchDecline = async (match: Match) => {
    setBusy(match.id); setError(null)
    try {
      await declineMatchInvite(match.id, userId)
      patch(d => ({ ...d, matchInvites: d.matchInvites.filter(m => m.id !== match.id) }))
    } catch { setError('Failed to decline.') }
    finally { setBusy(null) }
  }

  const px = isMobile ? 20 : 40
  const total = friendReqs.length + matchInvites.length + notifs.length

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>Activity</div>
      <h1 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: '0 0 28px', lineHeight: 1 }}>
        Notifications
      </h1>

      {error && (
        <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: 'rgba(250,246,234,0.70)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Skeleton width={44} height={44} radius={22} />
              <div style={{ flex: 1 }}>
                <Skeleton width="35%" height={11} />
                <Skeleton width="55%" height={14} style={{ marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div style={{ background: 'rgba(250,246,234,0.70)', backdropFilter: 'blur(36px) saturate(180%)', WebkitBackdropFilter: 'blur(36px) saturate(180%)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 22, padding: '48px 24px', textAlign: 'center', boxShadow: '0 6px 28px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.80)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: '#F0EBDD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#8B8272" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 20, fontWeight: 700, color: '#8B8272', marginBottom: 8, letterSpacing: '-0.02em' }}>You're all caught up</div>
          <div style={{ fontSize: 13, color: '#6B5F4E', lineHeight: 1.5 }}>Friend requests, match invites, tags and reposts appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {friendReqs.map(f => (
            <div key={f.id} style={{ background: 'rgba(250,246,234,0.70)', backdropFilter: 'blur(36px) saturate(180%)', WebkitBackdropFilter: 'blur(36px) saturate(180%)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 6px 24px rgba(31,29,23,0.08), inset 0 1px 0 rgba(255,255,255,0.80)' }}>
              <Avatar profile={f.profile} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <UsersIcon size={13} color="#5C7A4D" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#5C7A4D', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Friend Request</span>
                </div>
                <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>
                  {f.profile?.username ? `@${f.profile.username}` : 'Someone'}
                </div>
                <div style={{ fontSize: 12, color: '#6B5F4E', marginTop: 2 }}>wants to be friends</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleFriendDecline(f)}
                  disabled={busy === f.id}
                  style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(240,235,221,0.80)', border: '1px solid rgba(224,216,197,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.12s ease', flexShrink: 0 }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.88)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.88)' }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <CloseIcon size={14} color="#4A4235" />
                </button>
                <button
                  onClick={() => handleFriendAccept(f)}
                  disabled={busy === f.id}
                  style={{ width: 38, height: 38, borderRadius: 19, background: '#1F3A2A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.12s ease', flexShrink: 0, boxShadow: '0 3px 10px rgba(31,58,42,0.28)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.88)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.88)' }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <CheckIcon size={14} color="#FAF6EA" />
                </button>
              </div>
            </div>
          ))}

          {matchInvites.map(m => {
            const inviter = m.players.find(p => p.userId === m.createdBy)
            return (
              <div key={m.id} style={{ background: 'rgba(31,58,42,0.90)', backdropFilter: 'blur(36px) saturate(160%)', WebkitBackdropFilter: 'blur(36px) saturate(160%)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 12px 40px rgba(31,58,42,0.26), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                <div style={{ background: 'transparent', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <TrophyIcon size={14} color="#D9824D" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#B5C29A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Match Invite</span>
                </div>
                <div style={{ padding: '14px 18px', background: 'rgba(250,246,234,0.06)' }}>
                  <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 18, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {m.courseName}
                  </div>
                  <div style={{ fontSize: 13, color: '#B5C29A', marginBottom: 4 }}>
                    {MODE_LABELS[m.gameMode] ?? m.gameMode} · {m.holes} holes
                    {m.wagerPerPlayer > 0 ? ` · $${m.wagerPerPlayer} wager` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(181,194,154,0.8)' }}>
                    Invited by {inviter?.profile?.username ? `@${inviter.profile.username}` : 'a friend'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      onClick={() => handleMatchDecline(m)}
                      disabled={busy === m.id}
                      style={{ flex: 1, background: 'rgba(250,246,234,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px', fontSize: 13, color: '#B5C29A', cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleMatchAccept(m)}
                      disabled={busy === m.id}
                      style={{ flex: 2, background: 'rgba(250,246,234,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 12, padding: '10px', fontSize: 13, fontWeight: 600, color: '#1F3A2A', cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", boxShadow: '0 2px 8px rgba(31,29,23,0.08)' }}
                    >
                      {busy === m.id ? '…' : `Accept${m.wagerPerPlayer > 0 ? ` · $${m.wagerPerPlayer}` : ''}`}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {notifs.map(n => {
            const nm = n.actor?.username ? `@${n.actor.username}` : (n.actor?.firstName ?? 'A player')
            const text = n.type === 'post_tag' ? 'tagged you in a post'
              : n.type === 'repost'  ? 'reposted your post'
              : n.type === 'like'    ? 'liked your post'
              : 'commented on your post'
            return (
              <div key={n.id} style={{ background: 'rgba(250,246,234,0.70)', backdropFilter: 'blur(36px) saturate(180%)', WebkitBackdropFilter: 'blur(36px) saturate(180%)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 20, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13, boxShadow: '0 6px 24px rgba(31,29,23,0.08), inset 0 1px 0 rgba(255,255,255,0.80)' }}>
                <Avatar profile={n.actor ?? null} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: '#1F1D17', lineHeight: 1.4, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                    <strong style={{ fontWeight: 700 }}>{nm}</strong> {text}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8B8272', marginTop: 2 }}>{notifAgo(n.createdAt)}</div>
                </div>
                {n.postImageUrl && (
                  <img src={n.postImageUrl} alt="" loading="lazy" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                )}
              </div>
            )
          })}

        </div>
      )}
    </div>
  )
}

