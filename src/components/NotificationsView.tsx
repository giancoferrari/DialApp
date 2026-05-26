import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchFriendships, fetchProfilesForIds, updateFriendship } from '../lib/friends'
import { fetchMatches, acceptMatchInvite, declineMatchInvite } from '../lib/matches'
import type { PublicProfile, Friendship, Match } from '../types'
import { CheckIcon, CloseIcon, TrophyIcon, UsersIcon } from './Icons'

interface Props {
  userId: string
  isMobile?: boolean
  onCountChange: (n: number) => void
}

function Avatar({ profile, size = 40 }: { profile?: PublicProfile | null; size?: number }) {
  const initial = profile?.username?.[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: '#1F3A2A', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {profile?.avatarUrl
        ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: size * 0.38, color: '#D9824D' }}>{initial}</span>
      }
    </div>
  )
}

const MODE_LABELS: Record<string, string> = {
  stroke: 'Stroke Play', match_play: 'Match Play', skins: 'Skins', wolf: 'Wolf',
}

export default function NotificationsView({ userId, isMobile = false, onCountChange }: Props) {
  const [friendReqs, setFriendReqs] = useState<(Friendship & { profile?: PublicProfile })[]>([])
  const [matchInvites, setMatchInvites] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [friendships, matches] = await Promise.all([
        fetchFriendships(userId),
        fetchMatches(userId),
      ])

      const pendingForMe = friendships.filter(f => f.addresseeId === userId && f.status === 'pending')
      const requesterIds = pendingForMe.map(f => f.requesterId)
      const profiles = requesterIds.length ? await fetchProfilesForIds(requesterIds) : []
      setFriendReqs(pendingForMe.map(f => ({
        ...f,
        profile: profiles.find(p => p.userId === f.requesterId),
      })))

      const invites = matches.filter(m => {
        const me = m.players.find(p => p.userId === userId)
        return me?.status === 'invited' && m.status === 'pending'
      })
      setMatchInvites(invites)

      onCountChange(pendingForMe.length + invites.length)
    } catch { setError('Failed to load notifications.') }
    finally { setLoading(false) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // Realtime: listen for new match invites
  useEffect(() => {
    const ch = supabase
      .channel(`notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_players', filter: `user_id=eq.${userId}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, load])

  const handleFriendAccept = async (f: Friendship) => {
    setBusy(f.id); setError(null)
    try {
      await updateFriendship(f.id, 'accepted')
      setFriendReqs(prev => prev.filter(x => x.id !== f.id))
      onCountChange(friendReqs.length - 1 + matchInvites.length)
    } catch { setError('Failed to accept.') }
    finally { setBusy(null) }
  }

  const handleFriendDecline = async (f: Friendship) => {
    setBusy(f.id); setError(null)
    try {
      await updateFriendship(f.id, 'declined')
      setFriendReqs(prev => prev.filter(x => x.id !== f.id))
      onCountChange(friendReqs.length - 1 + matchInvites.length)
    } catch { setError('Failed to decline.') }
    finally { setBusy(null) }
  }

  const handleMatchAccept = async (match: Match) => {
    setBusy(match.id); setError(null)
    try {
      await acceptMatchInvite(match.id, userId, match.wagerPerPlayer)
      setMatchInvites(prev => prev.filter(m => m.id !== match.id))
      onCountChange(friendReqs.length + matchInvites.length - 1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to accept.')
    } finally { setBusy(null) }
  }

  const handleMatchDecline = async (match: Match) => {
    setBusy(match.id); setError(null)
    try {
      await declineMatchInvite(match.id, userId)
      setMatchInvites(prev => prev.filter(m => m.id !== match.id))
      onCountChange(friendReqs.length + matchInvites.length - 1)
    } catch { setError('Failed to decline.') }
    finally { setBusy(null) }
  }

  const px = isMobile ? 20 : 40
  const total = friendReqs.length + matchInvites.length

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>Activity</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: '0 0 28px', lineHeight: 1 }}>
        Notifications
      </h1>

      {error && (
        <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', fontSize: 14, color: '#B5AC95' }}>Loading…</div>
      ) : total === 0 ? (
        <div style={{ background: 'rgba(250,246,234,0.62)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(255,255,255,0.52)', borderRadius: 20, padding: '48px 24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(31,29,23,0.08), inset 0 1px 0 rgba(255,255,255,0.65)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: '#F0EBDD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#C9C0A8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, color: '#C9C0A8', marginBottom: 8 }}>You're all caught up</div>
          <div style={{ fontSize: 13, color: '#B5AC95' }}>Friend requests and match invites will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {friendReqs.map(f => (
            <div key={f.id} style={{ background: 'rgba(250,246,234,0.62)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(255,255,255,0.52)', borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 20px rgba(31,29,23,0.07), inset 0 1px 0 rgba(255,255,255,0.65)' }}>
              <Avatar profile={f.profile} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <UsersIcon size={13} color="#5C7A4D" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#5C7A4D', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Friend Request</span>
                </div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>
                  {f.profile?.username ? `@${f.profile.username}` : 'Someone'}
                </div>
                <div style={{ fontSize: 12, color: '#B5AC95', marginTop: 2 }}>wants to be friends</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleFriendDecline(f)}
                  disabled={busy === f.id}
                  style={{ width: 36, height: 36, borderRadius: 18, background: '#F0EBDD', border: '1px solid #E0D8C5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <CloseIcon size={14} color="#6B6857" />
                </button>
                <button
                  onClick={() => handleFriendAccept(f)}
                  disabled={busy === f.id}
                  style={{ width: 36, height: 36, borderRadius: 18, background: '#1F3A2A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <CheckIcon size={14} color="#FAF6EA" />
                </button>
              </div>
            </div>
          ))}

          {matchInvites.map(m => {
            const inviter = m.players.find(p => p.userId === m.createdBy)
            return (
              <div key={m.id} style={{ background: 'rgba(31,58,42,0.84)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 32px rgba(31,58,42,0.22), inset 0 1px 0 rgba(255,255,255,0.14)' }}>
                <div style={{ background: 'transparent', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <TrophyIcon size={14} color="#D9824D" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#B5C29A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Match Invite</span>
                </div>
                <div style={{ padding: '14px 18px', background: 'rgba(250,246,234,0.06)' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em', marginBottom: 4 }}>
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
                      style={{ flex: 1, background: 'rgba(250,246,234,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px', fontSize: 13, color: '#B5C29A', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleMatchAccept(m)}
                      disabled={busy === m.id}
                      style={{ flex: 2, background: 'rgba(250,246,234,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 12, padding: '10px', fontSize: 13, fontWeight: 600, color: '#1F3A2A', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 8px rgba(31,29,23,0.08)' }}
                    >
                      {busy === m.id ? '…' : `Accept${m.wagerPerPlayer > 0 ? ` · $${m.wagerPerPlayer}` : ''}`}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

        </div>
      )}
    </div>
  )
}
