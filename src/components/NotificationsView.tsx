import { useRef, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchFriendships, fetchProfilesForIds, updateFriendship } from '../lib/friends'
import { fetchMatches, acceptMatchInvite, declineMatchInvite } from '../lib/matches'
import { fetchNotifications, markNotificationsRead, createNotification } from '../lib/notifications'
import type { PublicProfile, Friendship, Match, AppNotification } from '../types'
import { CheckIcon, CloseIcon, TrophyIcon, UsersIcon, BellIcon, HeartIcon, ChatIcon, RepostIcon } from './Icons'
import Avatar from './Avatar'
import Skeleton from './Skeleton'
import PageHeader from './PageHeader'
import { useStaggerMount } from '../hooks/useStaggerMount'
import { color, font, radius, page } from '../lib/tokens'
import { card } from '../lib/surfaces'

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
  stroke: 'Stroke play', match_play: 'Match play', skins: 'Skins', wolf: 'Wolf',
}

// Icon + tint per activity-notification type.
function notifIcon(type: AppNotification['type']) {
  switch (type) {
    case 'like':          return { Icon: HeartIcon,  tint: color.danger }
    case 'comment':       return { Icon: ChatIcon,   tint: color.green }
    case 'repost':        return { Icon: RepostIcon, tint: color.positive }
    case 'friend_accept': return { Icon: UsersIcon,  tint: color.positive }
    default:               return { Icon: UsersIcon,  tint: color.green } // post_tag
  }
}

export default function NotificationsView({ userId, isMobile = false, onCountChange }: Props) {
  const qc = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  useStaggerMount(containerRef)
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
      await createNotification(f.requesterId, userId, 'friend_accept', null)
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

  const px = isMobile ? page.pxMobile : page.pxDesktop
  const total = friendReqs.length + matchInvites.length + notifs.length

  return (
    <div ref={containerRef} style={{ maxWidth: page.maxW, margin: '0 auto', padding: `${isMobile ? page.topMobile : page.topDesktop}px ${px}px ${isMobile ? page.bottomMobile : page.bottomDesktop}px` }}>

      <div style={{ marginBottom: 24 }}>
        <PageHeader title="Notifications" subtitle="Requests, invites and clubhouse activity." isMobile={isMobile} />
      </div>

      {error && (
        <div style={{ background: color.dangerBg, border: `1px solid ${color.dangerBorder}`, borderRadius: 12, padding: '10px 14px', fontSize: 13, color: color.dangerDeep, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ ...card, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Skeleton width={44} height={44} radius={22} />
              <div style={{ flex: 1 }}>
                <Skeleton width="35%" height={11} />
                <Skeleton width="55%" height={14} style={{ marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: color.sand, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BellIcon size={24} color={color.faint} />
          </div>
          <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 600, color: color.ink, marginBottom: 8, letterSpacing: '-0.01em' }}>You're all caught up</div>
          <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.5 }}>Friend requests, match invites, tags and reposts appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {friendReqs.map(f => (
            <div key={f.id} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar profile={f.profile} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <UsersIcon size={13} color={color.green} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: color.green }}>Friend request</span>
                </div>
                <div style={{ fontSize: 14, color: color.ink, fontFamily: font.body }}>
                  <strong style={{ fontWeight: 600 }}>{f.profile?.username ? `@${f.profile.username}` : 'Someone'}</strong> wants to connect
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleFriendDecline(f)}
                  disabled={busy === f.id}
                  aria-label="Decline"
                  style={{ width: 38, height: 38, borderRadius: 19, background: color.sand, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.12s ease', flexShrink: 0 }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <CloseIcon size={14} color={color.inkSoft} />
                </button>
                <button
                  onClick={() => handleFriendAccept(f)}
                  disabled={busy === f.id}
                  aria-label="Accept"
                  style={{ width: 38, height: 38, borderRadius: 19, background: color.green, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.12s ease', flexShrink: 0 }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <CheckIcon size={14} color={color.onGreen} />
                </button>
              </div>
            </div>
          ))}

          {matchInvites.map(m => {
            const inviter = m.players.find(p => p.userId === m.createdBy)
            return (
              <div key={m.id} style={{ background: color.green, borderRadius: radius.lg, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                  <TrophyIcon size={14} color="#E0935E" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(242,245,241,0.75)' }}>Match invite</span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: color.onGreen, letterSpacing: '-0.01em', marginBottom: 4 }}>
                    {m.courseName}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(242,245,241,0.7)', marginBottom: 3 }}>
                    {MODE_LABELS[m.gameMode] ?? m.gameMode} · {m.holes} holes
                    {m.wagerPerPlayer > 0 ? ` · $${m.wagerPerPlayer} wager` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(242,245,241,0.5)' }}>
                    Invited by {inviter?.profile?.username ? `@${inviter.profile.username}` : 'a friend'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      onClick={() => handleMatchDecline(m)}
                      disabled={busy === m.id}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: radius.sm, padding: '10px', fontSize: 13, fontWeight: 600, color: 'rgba(242,245,241,0.85)', cursor: 'pointer', fontFamily: font.body }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleMatchAccept(m)}
                      disabled={busy === m.id}
                      style={{ flex: 2, background: color.white, border: 'none', borderRadius: radius.sm, padding: '10px', fontSize: 13, fontWeight: 600, color: color.green, cursor: 'pointer', fontFamily: font.body }}
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
            const text = n.type === 'post_tag'      ? 'tagged you in a post'
              : n.type === 'repost'                 ? 'reposted your post'
              : n.type === 'like'                   ? 'liked your post'
              : n.type === 'friend_accept'          ? 'accepted your friend request'
              : 'commented on your post'
            const { Icon, tint } = notifIcon(n.type)
            return (
              <div key={n.id} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar profile={n.actor ?? null} size={42} />
                  <span style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, background: color.white, border: `1px solid ${color.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={11} color={tint} filled={n.type === 'like'} />
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: color.ink, lineHeight: 1.4, fontFamily: font.body }}>
                    <strong style={{ fontWeight: 600 }}>{nm}</strong> {text}
                  </div>
                  <div style={{ fontSize: 12, color: color.faint, marginTop: 2 }}>{notifAgo(n.createdAt)}</div>
                </div>
                {n.postImageUrl && (
                  <img src={n.postImageUrl} alt="" loading="lazy" style={{ width: 44, height: 44, borderRadius: radius.sm, objectFit: 'cover', flexShrink: 0 }} />
                )}
              </div>
            )
          })}

        </div>
      )}
    </div>
  )
}
