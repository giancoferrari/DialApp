import { useState, useEffect, useCallback } from 'react'
import type { Match, Wallet, PublicProfile, GameMode } from '../types'
import { fetchMatches, createMatch, acceptMatchInvite, declineMatchInvite, upsertScore, completeMatch, cancelMatch, fetchMatchRealtime } from '../lib/matches'
import { fetchOrCreateWallet, topUpWallet, withdrawFromWallet } from '../lib/wallet'
import { fetchFriendships, fetchProfilesForIds } from '../lib/friends'
import { supabase } from '../lib/supabase'
import { CloseIcon, TrophyIcon, PlusIcon } from './Icons'

interface Props {
  userId: string
  isMobile?: boolean
}

// Santa Maria Golf & Country Club — Blue Tees
const SANTA_MARIA = {
  name: 'Santa Maria Golf & Country Club',
  tee: 'Blue Tees',
  teeColor: '#3B82F6',
  par: 72,
  pars: [5, 4, 4, 4, 3, 4, 5, 3, 4, 4, 5, 3, 4, 3, 4, 5, 4, 4] as number[],
}

function getCoursePars(courseName: string, holes: 9 | 18): number[] {
  if (courseName === SANTA_MARIA.name) return SANTA_MARIA.pars.slice(0, holes)
  return Array(holes).fill(4) as number[]
}

function getCourseTee(courseName: string): string {
  return courseName === SANTA_MARIA.name ? SANTA_MARIA.tee : 'Standard Tees'
}

function Avatar({ profile, size = 36 }: { profile?: PublicProfile; size?: number }) {
  const initial = profile?.username?.[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: '#1F3A2A', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {profile?.avatarUrl
        ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: size * 0.38, color: '#D9824D' }}>{initial}</span>
      }
    </div>
  )
}

const MODE_LABELS: Record<GameMode, string> = {
  stroke: 'Stroke Play', match_play: 'Match Play', skins: 'Skins', wolf: 'Wolf',
}

// ── Score cell with golf notation ─────────────────────────────────────
function ScoreCell({
  score, par, isMe, isEmpty, onClick,
}: {
  score: number | null
  par: number
  isMe: boolean
  isEmpty: boolean
  onClick?: () => void
}) {
  const diff = score !== null ? score - par : null
  let bg = 'transparent'
  let border = '1.5px dashed #C9C0A8'
  let borderRadius = 8
  let color = '#1F1D17'
  let boxShadow = 'none'

  if (score !== null) {
    border = 'none'
    if (diff !== null && diff <= -2) {
      bg = '#1F3A2A'; color = '#FAF6EA'; borderRadius = 999; boxShadow = '0 0 0 1.5px #1F3A2A'
    } else if (diff === -1) {
      bg = 'transparent'; border = '2px solid #1F3A2A'; borderRadius = 999; color = '#1F3A2A'
    } else if (diff === 0) {
      bg = 'transparent'; color = '#1F1D17'
    } else if (diff === 1) {
      bg = 'transparent'; border = '2px solid #D9824D'; borderRadius = 4; color = '#D9824D'
    } else {
      bg = 'transparent'; border = '2px solid #C0392B'; borderRadius = 4; color = '#C0392B'
    }
  }

  return (
    <div
      onClick={isMe ? onClick : undefined}
      style={{
        width: '100%', aspectRatio: '1', minHeight: 32, maxHeight: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, border, borderRadius, color, boxShadow,
        fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700,
        cursor: isMe ? 'pointer' : 'default',
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
    >
      {score ?? ''}
    </div>
  )
}

// ── New Match Modal ───────────────────────────────────────────────────
function NewMatchModal({
  userId, wallet, friends, onClose, onCreate, isMobile,
}: {
  userId: string
  wallet: Wallet | null
  friends: { friendId: string; profile?: PublicProfile }[]
  onClose: () => void
  onCreate: (match: Match) => void
  isMobile: boolean
}) {
  const [holes,        setHoles]        = useState<9 | 18>(18)
  const [gameMode,     setGameMode]     = useState<GameMode>('stroke')
  const [wager,        setWager]        = useState(0)
  const [customWager,  setCustomWager]  = useState('')
  const [selectedIds,  setSelectedIds]  = useState<string[]>([])
  const [friendSearch, setFriendSearch] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const WAGER_OPTS = [0, 10, 25, 50, 100]
  const courseName = SANTA_MARIA.name

  const filteredFriends = friends.filter(({ profile }) =>
    !friendSearch.trim() || profile?.username?.toLowerCase().includes(friendSearch.toLowerCase())
  )

  const toggleFriend = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const effectiveWager = customWager !== '' ? Math.min(10000, Math.max(0, parseInt(customWager) || 0)) : wager

  const handleCreate = async () => {
    if (selectedIds.length === 0) { setError('Invite at least one friend.'); return }
    if (effectiveWager > 0 && wallet && wallet.balance < effectiveWager) {
      setError(`Not enough funds. Your balance: $${wallet.balance.toLocaleString()}`)
      return
    }
    setLoading(true); setError(null)
    try {
      const match = await createMatch(userId, { courseName, holes, gameMode, wagerPerPlayer: effectiveWager }, selectedIds)
      onCreate(match)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create match.')
    } finally { setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: '#FAF6EA',
    border: '1px solid #E0D8C5', borderRadius: 12, padding: '12px 14px',
    fontSize: 14, color: '#1F1D17', outline: 'none',
    fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,29,23,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div style={{ background: '#F0EBDD', borderRadius: isMobile ? '28px 28px 0 0' : 28, width: '100%', maxWidth: 520, maxHeight: isMobile ? '92vh' : '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #E0D8C5', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>New Match</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <CloseIcon size={18} color="#6B6857" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {error && (
            <div style={{ background: 'rgba(217,130,77,0.12)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D' }}>
              {error}
            </div>
          )}

          {/* Course — Santa Maria only */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Course</label>
            <div style={{ background: '#1F3A2A', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: SANTA_MARIA.teeColor, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em' }}>{SANTA_MARIA.name}</div>
                <div style={{ fontSize: 12, color: '#B5C29A', marginTop: 2 }}>{SANTA_MARIA.tee} · Par {SANTA_MARIA.par} · 18 holes</div>
              </div>
            </div>
          </div>

          {/* Holes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Holes</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([9, 18] as const).map(h => (
                <button key={h} onClick={() => setHoles(h)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, transition: 'all 0.15s', background: holes === h ? '#1F3A2A' : 'transparent', color: holes === h ? '#FAF6EA' : '#1F1D17', borderColor: holes === h ? '#1F3A2A' : '#E0D8C5' }}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Game mode */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Format</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['stroke', 'match_play', 'skins', 'wolf'] as GameMode[]).map(mode => (
                <button key={mode} onClick={() => setGameMode(mode)} style={{ padding: '10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, transition: 'all 0.15s', background: gameMode === mode ? '#1F3A2A' : 'transparent', color: gameMode === mode ? '#FAF6EA' : '#1F1D17', borderColor: gameMode === mode ? '#1F3A2A' : '#E0D8C5', textAlign: 'center' }}>
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Wager */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Wager per player (USD)</label>
            {wallet && (
              <div style={{ fontSize: 12, color: '#B5AC95', marginBottom: 8 }}>
                Your balance: <strong style={{ color: '#1F1D17' }}>${wallet.balance.toLocaleString()}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {WAGER_OPTS.map(w => (
                <button key={w} onClick={() => { setWager(w); setCustomWager('') }} style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: wager === w && customWager === '' ? '#D9824D' : 'transparent', color: wager === w && customWager === '' ? '#FAF6EA' : '#1F1D17', borderColor: wager === w && customWager === '' ? '#D9824D' : '#E0D8C5' }}>
                  {w === 0 ? 'No wager' : `$${w}`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#6B6857', fontWeight: 500 }}>$</span>
              <input type="number" min="0" max="10000" value={customWager} onChange={e => { setCustomWager(e.target.value); setWager(0) }} placeholder="Custom amount (max $10,000)" style={{ ...inputStyle, padding: '10px 12px' }} onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }} onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }} />
            </div>
          </div>

          {/* Friends */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Invite friends {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
            </label>
            {friends.length === 0 ? (
              <div style={{ fontSize: 13, color: '#B5AC95', padding: '12px 0' }}>Add friends first to invite them to a match.</div>
            ) : (
              <>
                <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Search friends…" style={{ ...inputStyle, marginBottom: 10 }} onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }} onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredFriends.map(({ friendId, profile }) => {
                    const selected = selectedIds.includes(friendId)
                    return (
                      <button key={friendId} onClick={() => toggleFriend(friendId)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: selected ? 'rgba(31,58,42,0.06)' : '#FAF6EA', border: `1px solid ${selected ? '#1F3A2A' : '#E0D8C5'}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                        <Avatar profile={profile} size={36} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                            {profile?.username ? `@${profile.username}` : friendId.slice(0, 8)}
                          </div>
                          {profile?.handicapIndex != null && (
                            <div style={{ fontSize: 11, color: '#6B6857' }}>HCP {profile.handicapIndex.toFixed(1)}</div>
                          )}
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${selected ? '#1F3A2A' : '#C9C0A8'}`, background: selected ? '#1F3A2A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <div style={{ width: 8, height: 8, borderRadius: 4, background: '#FAF6EA' }} />}
                        </div>
                      </button>
                    )
                  })}
                  {filteredFriends.length === 0 && friendSearch && (
                    <div style={{ fontSize: 13, color: '#B5AC95', padding: '8px 0' }}>No friends match "{friendSearch}"</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E0D8C5', flexShrink: 0 }}>
          <button onClick={handleCreate} disabled={loading} style={{ width: '100%', background: loading ? '#C9C0A8' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 14, padding: '14px', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {loading ? 'Creating…' : 'Create & Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Scorecard Grid (rounds-style) ─────────────────────────────────────
function ScorecardGrid({
  holes, pars, players, userId, onCellTap, status,
}: {
  holes: number[]
  pars: number[]
  players: { userId: string; name: string; scores: Record<number, number | null> }[]
  userId: string
  onCellTap: (hole: number) => void
  status: string
}) {
  const labelW = 52
  const holeW = `${Math.floor((100 - 10) / holes.length)}%`

  const headerCell = (content: React.ReactNode, key: string | number) => (
    <div key={key} style={{ textAlign: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.01em' }}>
      {content}
    </div>
  )

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as never }}>
      <div style={{ minWidth: labelW + holes.length * 36 + 8 }}>

        {/* HOLE row — green header */}
        <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${holes.length}, 1fr)`, background: '#1F3A2A', borderRadius: '10px 10px 0 0', padding: '8px 10px', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#B5C29A', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>HOLE</div>
          {holes.map(h => headerCell(h, h))}
        </div>

        {/* PAR row */}
        <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${holes.length}, 1fr)`, background: '#F5F0E5', padding: '6px 10px', gap: 4, borderBottom: '1px solid #E0D8C5' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6B6857', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>PAR</div>
          {holes.map((h, i) => (
            <div key={h} style={{ textAlign: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 600, color: '#6B6857' }}>
              {pars[i]}
            </div>
          ))}
        </div>

        {/* Player score rows */}
        {players.map((player, pi) => {
          const isMe = player.userId === userId
          return (
            <div key={player.userId} style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${holes.length}, 1fr)`, background: pi % 2 === 0 ? '#FAF6EA' : '#F5F0E5', padding: '6px 10px', gap: 4, borderBottom: pi < players.length - 1 ? '1px solid #ECE5D2' : 'none', borderRadius: pi === players.length - 1 ? '0 0 10px 10px' : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isMe ? '#1F3A2A' : '#6B6857', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isMe ? 'YOU' : player.name.slice(0, 4)}
                </span>
              </div>
              {holes.map((h, i) => (
                <ScoreCell
                  key={h}
                  score={player.scores[h] ?? null}
                  par={pars[i]}
                  isMe={isMe && status === 'active'}
                  isEmpty={player.scores[h] == null}
                  onClick={() => onCellTap(h)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Scoring Modal (rounds-style scorecard) ────────────────────────────
function ScoringModal({
  match, userId, onClose, onMatchUpdated, isMobile,
}: {
  match: Match
  userId: string
  onClose: () => void
  onMatchUpdated: (m: Match) => void
  isMobile: boolean
}) {
  const [liveMatch,   setLiveMatch]   = useState<Match>(match)
  const [activeHole,  setActiveHole]  = useState<number | null>(null)
  const [scoreVal,    setScoreVal]    = useState(4)
  const [saving,      setSaving]      = useState(false)
  const [completing,  setCompleting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const accepted  = liveMatch.players.filter(p => p.status === 'accepted')
  const me        = accepted.find(p => p.userId === userId)
  const pars      = getCoursePars(liveMatch.courseName, liveMatch.holes)
  const totalPar  = pars.reduce((a, b) => a + b, 0)
  const holes     = Array.from({ length: liveMatch.holes }, (_, i) => i + 1)
  const front9    = holes.slice(0, 9)
  const back9     = liveMatch.holes === 18 ? holes.slice(9) : []
  const myTotal   = me?.scores.reduce((s, sc) => s + (sc.score ?? 0), 0) ?? 0
  const myVsPar   = myTotal > 0 ? myTotal - totalPar : null
  const allComplete = accepted.every(p => holes.every(h => p.scores.find(s => s.holeNumber === h)?.score != null))
  const tee       = getCourseTee(liveMatch.courseName)
  const isWinner  = liveMatch.status === 'completed' && liveMatch.winnerId === userId
  const matchDate = new Date(liveMatch.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()

  useEffect(() => {
    const channel = supabase
      .channel(`match-scores-${liveMatch.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_scores', filter: `match_id=eq.${liveMatch.id}` },
        async () => {
          const updated = await fetchMatchRealtime(liveMatch.id)
          setLiveMatch(updated)
          onMatchUpdated(updated)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [liveMatch.id, onMatchUpdated])

  const playerRows = accepted.map(p => ({
    userId: p.userId,
    name: p.profile?.username ? `@${p.profile.username}` : (p.userId === userId ? 'You' : 'Opp'),
    scores: Object.fromEntries(p.scores.map(s => [s.holeNumber, s.score])) as Record<number, number | null>,
  }))
  // Put current user first
  playerRows.sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : 0))

  const handleCellTap = (hole: number) => {
    if (liveMatch.status !== 'active') return
    const existing = me?.scores.find(s => s.holeNumber === hole)?.score
    setScoreVal(existing ?? pars[hole - 1] ?? 4)
    setActiveHole(hole)
  }

  const handleSave = async () => {
    if (activeHole === null) return
    setSaving(true); setError(null)
    try {
      await upsertScore(liveMatch.id, userId, activeHole, scoreVal)
      const updated = await fetchMatchRealtime(liveMatch.id)
      setLiveMatch(updated)
      onMatchUpdated(updated)
      setActiveHole(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save score.')
    } finally { setSaving(false) }
  }

  const handleComplete = async () => {
    setCompleting(true); setError(null)
    try {
      await completeMatch(liveMatch)
      const updated = await fetchMatchRealtime(liveMatch.id)
      setLiveMatch(updated)
      onMatchUpdated(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to complete match.')
    } finally { setCompleting(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F0EBDD', zIndex: 200, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#1F3A2A', color: '#FAF6EA', padding: `${isMobile ? 'calc(env(safe-area-inset-top) + 14px)' : '18px'} 20px 14px`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 680, margin: '0 auto' }}>
          <button onClick={onClose} style={{ background: 'rgba(250,246,234,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#FAF6EA', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            ← Back
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>{liveMatch.courseName}</div>
            <div style={{ fontSize: 11, color: '#B5C29A', marginTop: 1 }}>
              {MODE_LABELS[liveMatch.gameMode]} · {liveMatch.holes} holes{liveMatch.wagerPerPlayer > 0 ? ` · $${liveMatch.wagerPerPlayer} each` : ''}
            </div>
          </div>
          <div style={{ width: 60 }} />
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px', paddingBottom: activeHole !== null ? 180 : 80 }}>

          {/* Match result banner */}
          {liveMatch.status === 'completed' && (
            <div style={{ background: isWinner ? '#1F3A2A' : '#FAF6EA', border: `1px solid ${isWinner ? '#1F3A2A' : '#E0D8C5'}`, borderRadius: 16, padding: '14px 20px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: isWinner ? '#FAF6EA' : '#1F1D17', letterSpacing: '-0.02em', marginBottom: 4 }}>
                {liveMatch.winnerId ? (isWinner ? 'You won!' : `${accepted.find(p => p.userId === liveMatch.winnerId)?.profile?.username ? `@${accepted.find(p => p.userId === liveMatch.winnerId)?.profile?.username}` : 'Opponent'} won`) : "It's a tie!"}
              </div>
              {liveMatch.wagerPerPlayer > 0 && liveMatch.winnerId && (
                <div style={{ fontSize: 13, color: isWinner ? '#B5C29A' : '#6B6857' }}>
                  {isWinner ? `+$${liveMatch.wagerPerPlayer * accepted.length} credited to wallet` : `-$${liveMatch.wagerPerPlayer} wagered`}
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 14 }}>{error}</div>
          )}

          {/* Score card — rounds style */}
          <div style={{ background: '#1F3A2A', borderRadius: 20, padding: '18px 20px', marginBottom: 16 }}>
            {/* Tee + date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: liveMatch.courseName === SANTA_MARIA.name ? SANTA_MARIA.teeColor : '#B5C29A', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#B5C29A', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                {tee} · {matchDate}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  {liveMatch.courseName}
                </div>
                <div style={{ fontSize: 12, color: '#B5C29A', marginTop: 6 }}>
                  Par {totalPar} · {liveMatch.holes} holes
                </div>
              </div>
              {myTotal > 0 && (
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 48, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {myTotal}
                  </div>
                  {myVsPar !== null && (
                    <div style={{ fontSize: 16, fontWeight: 700, color: myVsPar <= 0 ? '#5C7A4D' : '#D9824D', textAlign: 'right' }}>
                      {myVsPar > 0 ? `+${myVsPar}` : myVsPar === 0 ? 'E' : myVsPar}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Front 9 */}
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
            <ScorecardGrid
              holes={front9}
              pars={pars.slice(0, 9)}
              players={playerRows}
              userId={userId}
              onCellTap={handleCellTap}
              status={liveMatch.status}
            />
          </div>

          {/* Back 9 */}
          {back9.length > 0 && (
            <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
              <ScorecardGrid
                holes={back9}
                pars={pars.slice(9)}
                players={playerRows}
                userId={userId}
                onCellTap={handleCellTap}
                status={liveMatch.status}
              />
            </div>
          )}

          {/* Tap hint */}
          {liveMatch.status === 'active' && (
            <div style={{ textAlign: 'center', fontSize: 13, color: '#B5AC95', marginBottom: 20 }}>
              Tap any score cell to type your result
            </div>
          )}

          {/* Complete match button */}
          {liveMatch.status === 'active' && allComplete && (
            <button
              onClick={handleComplete}
              disabled={completing}
              style={{ width: '100%', background: '#D9824D', border: 'none', borderRadius: 14, padding: '16px', color: '#FAF6EA', fontSize: 15, fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
            >
              {completing ? 'Finalising…' : 'Submit scorecard →'}
            </button>
          )}
        </div>
      </div>

      {/* Score entry drawer — slides up when a cell is tapped */}
      {activeHole !== null && liveMatch.status === 'active' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F0EBDD', borderTop: '1px solid #E0D8C5', borderRadius: '20px 20px 0 0', padding: '20px 24px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)', zIndex: 10, boxShadow: '0 -8px 24px rgba(31,58,42,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>
                Hole {activeHole}
              </div>
              <div style={{ fontSize: 12, color: '#6B6857', marginTop: 2 }}>
                Par {pars[activeHole - 1]}
              </div>
            </div>
            <button onClick={() => setActiveHole(null)} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={14} color="#6B6857" />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center', marginBottom: 18 }}>
            <button
              onClick={() => setScoreVal(v => Math.max(1, v - 1))}
              style={{ width: 48, height: 48, borderRadius: 24, background: '#FAF6EA', border: '1px solid #E0D8C5', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300, color: '#1F1D17' }}
            >
              −
            </button>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.04em', lineHeight: 1, minWidth: 72, textAlign: 'center' }}>
              {scoreVal}
            </div>
            <button
              onClick={() => setScoreVal(v => Math.min(15, v + 1))}
              style={{ width: 48, height: 48, borderRadius: 24, background: '#FAF6EA', border: '1px solid #E0D8C5', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300, color: '#1F1D17' }}
            >
              +
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', background: saving ? '#C9C0A8' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            {saving ? 'Saving…' : 'Save Score'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main MatchesView ──────────────────────────────────────────────────
export default function MatchesView({ userId, isMobile = false }: Props) {
  const [matches,       setMatches]       = useState<Match[]>([])
  const [wallet,        setWallet]        = useState<Wallet | null>(null)
  const [friends,       setFriends]       = useState<{ friendId: string; profile?: PublicProfile }[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showNew,       setShowNew]       = useState(false)
  const [scoring,       setScoring]       = useState<Match | null>(null)
  const [walletInput,   setWalletInput]   = useState('')
  const [walletAction,  setWalletAction]  = useState<'add' | 'withdraw' | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [w, m] = await Promise.all([fetchOrCreateWallet(userId), fetchMatches(userId)])
      setWallet(w)
      setMatches(m)

      const fs = await fetchFriendships(userId)
      const accepted = fs.filter(f => f.status === 'accepted')
      const friendIds = accepted.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
      const profiles = await fetchProfilesForIds(friendIds)
      setFriends(friendIds.map(id => ({ friendId: id, profile: profiles.find(p => p.userId === id) })))
    } catch { setError('Failed to load matches.') }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { load() }, [load])

  // Realtime: refresh when this user receives a new match invite
  useEffect(() => {
    const ch = supabase
      .channel(`match-invites-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_players', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, load])

  const handleWalletSubmit = async () => {
    const amount = Math.min(10000, Math.max(0, parseInt(walletInput) || 0))
    if (!amount) return
    setWalletLoading(true)
    try {
      const w = walletAction === 'add'
        ? await topUpWallet(userId, amount)
        : await withdrawFromWallet(userId, amount)
      setWallet(w); setWalletInput(''); setWalletAction(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed.')
    } finally { setWalletLoading(false) }
  }

  const handleAccept = async (matchId: string, wager: number) => {
    try { await acceptMatchInvite(matchId, userId, wager); await load() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to accept.') }
  }

  const handleDecline = async (matchId: string) => {
    try { await declineMatchInvite(matchId, userId); setMatches(prev => prev.filter(m => m.id !== matchId)) }
    catch { setError('Failed to decline.') }
  }

  const handleCancel = async (match: Match) => {
    try { await cancelMatch(match, userId); await load() }
    catch { setError('Failed to cancel.') }
  }

  const pending   = matches.filter(m => m.status === 'pending')
  const active    = matches.filter(m => m.status === 'active')
  const completed = matches.filter(m => m.status === 'completed')
  const myInvites = pending.filter(m => m.players.find(p => p.userId === userId)?.status === 'invited')
  const myPending = pending.filter(m => {
    const me = m.players.find(p => p.userId === userId)
    return me?.status === 'accepted' || m.createdBy === userId
  })

  const px = isMobile ? 20 : 40

  const MatchCard = ({ match }: { match: Match }) => {
    const others    = match.players.filter(p => p.userId !== userId && p.status === 'accepted')
    const me        = match.players.find(p => p.userId === userId)
    const isInvite  = me?.status === 'invited'
    const isActive  = match.status === 'active'
    const isDone    = match.status === 'completed'
    const iWon      = isDone && match.winnerId === userId
    const myTotal   = me?.scores.reduce((sum, s) => sum + (s.score ?? 0), 0) ?? 0
    const holesPlayed = me?.scores.length ?? 0

    return (
      <div style={{ background: '#FAF6EA', border: `1px solid ${isActive ? '#1F3A2A' : '#E0D8C5'}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ background: isActive ? '#1F3A2A' : isDone ? (iWon ? '#1F3A2A' : '#F0EBDD') : '#FAF6EA', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(31,58,42,0.08)' }}>
          <TrophyIcon size={18} color={isActive ? '#D9824D' : '#6B6857'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: isActive ? '#FAF6EA' : '#1F1D17', letterSpacing: '-0.02em' }}>{match.courseName}</div>
            <div style={{ fontSize: 12, color: isActive ? '#B5C29A' : '#6B6857', marginTop: 2 }}>
              {MODE_LABELS[match.gameMode]} · {match.holes} holes{match.wagerPerPlayer > 0 && ` · $${match.wagerPerPlayer} each`}
            </div>
          </div>
          {isDone && iWon && <div style={{ fontSize: 12, fontWeight: 600, color: '#D9824D', background: 'rgba(217,130,77,0.15)', borderRadius: 999, padding: '4px 10px' }}>Won</div>}
          {isDone && !iWon && match.winnerId && <div style={{ fontSize: 12, color: '#6B6857', background: '#E0D8C5', borderRadius: 999, padding: '4px 10px' }}>Lost</div>}
          {isDone && !match.winnerId && <div style={{ fontSize: 12, color: '#6B6857', background: '#E0D8C5', borderRadius: 999, padding: '4px 10px' }}>Tie</div>}
        </div>

        <div style={{ padding: '12px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
          {others.map(p => (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar profile={p.profile} size={28} />
              <span style={{ fontSize: 13, color: '#1F1D17', fontWeight: 500 }}>{p.profile?.username ? `@${p.profile.username}` : 'Opponent'}</span>
            </div>
          ))}
          {isActive && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em' }}>{myTotal || '—'}</div>
              <div style={{ fontSize: 10, color: '#6B6857' }}>{holesPlayed}/{match.holes} holes</div>
            </div>
          )}
        </div>

        <div style={{ padding: '0 18px 14px', display: 'flex', gap: 8 }}>
          {isInvite && (
            <>
              <button onClick={() => handleDecline(match.id)} style={{ flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px', fontSize: 13, color: '#6B6857', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Decline</button>
              <button onClick={() => handleAccept(match.id, match.wagerPerPlayer)} style={{ flex: 2, background: '#1F3A2A', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: '#FAF6EA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Accept{match.wagerPerPlayer > 0 ? ` · $${match.wagerPerPlayer}` : ''}
              </button>
            </>
          )}
          {isActive && (
            <>
              <button onClick={() => setScoring(match)} style={{ flex: 2, background: '#1F3A2A', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: '#FAF6EA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Enter Scores →</button>
              <button onClick={() => handleCancel(match)} style={{ flex: 1, background: 'transparent', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px', fontSize: 12, color: '#6B6857', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
            </>
          )}
          {isDone && (
            <button onClick={() => setScoring(match)} style={{ flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px', fontSize: 13, color: '#1F1D17', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>View Scorecard</button>
          )}
          {match.status === 'pending' && me?.status === 'accepted' && (
            <button onClick={() => handleCancel(match)} style={{ flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px', fontSize: 13, color: '#6B6857', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>Play</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: '0 0 20px', lineHeight: 1 }}>
          Matches
        </h1>

        {wallet && (
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: walletAction ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 4 }}>Wallet Balance</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  ${wallet.balance.toLocaleString()}<span style={{ fontSize: 13, color: '#6B6857', fontWeight: 400, marginLeft: 4 }}>USD</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setWalletAction(walletAction === 'add' ? null : 'add')} style={{ background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>+ Add</button>
                <button onClick={() => setWalletAction(walletAction === 'withdraw' ? null : 'withdraw')} style={{ background: 'transparent', color: '#6B6857', border: '1px solid #E0D8C5', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Withdraw</button>
              </div>
            </div>
            {walletAction && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 16, color: '#1F1D17', fontWeight: 500 }}>$</span>
                <input type="number" min="1" max="10000" value={walletInput} onChange={e => setWalletInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleWalletSubmit() }} placeholder={walletAction === 'add' ? 'Amount to add (max $10,000)' : 'Amount to withdraw'} autoFocus style={{ flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                <button onClick={handleWalletSubmit} disabled={walletLoading} style={{ background: walletAction === 'add' ? '#1F3A2A' : '#D9824D', color: '#FAF6EA', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: walletLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                  {walletLoading ? '…' : walletAction === 'add' ? 'Add Funds' : 'Withdraw'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 20 }}>{error}</div>
      )}

      <button
        onClick={() => setShowNew(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: '#1F3A2A', border: 'none', borderRadius: 16, padding: '16px 20px', marginBottom: 28, cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#16271D' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 16, background: '#D9824D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PlusIcon size={16} color="#FAF6EA" />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em' }}>Start a new match</div>
          <div style={{ fontSize: 12, color: '#B5C29A', marginTop: 2 }}>Santa Maria Golf & Country Club · with wagers</div>
        </div>
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', fontSize: 14, color: '#B5AC95' }}>Loading…</div>
      ) : (
        <>
          {myInvites.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 12 }}>Invites ({myInvites.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myInvites.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {active.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#1F3A2A', textTransform: 'uppercase', marginBottom: 12 }}>Active ({active.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {active.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {myPending.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 12 }}>Waiting for players</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myPending.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 12 }}>Completed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {completed.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {matches.length === 0 && (
            <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '48px 24px', textAlign: 'center' }}>
              <TrophyIcon size={32} color="#C9C0A8" />
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, color: '#C9C0A8', marginTop: 12, marginBottom: 8 }}>No matches yet</div>
              <div style={{ fontSize: 13, color: '#B5AC95' }}>Start a match and challenge your friends.</div>
            </div>
          )}
        </>
      )}

      {showNew && (
        <NewMatchModal userId={userId} wallet={wallet} friends={friends} onClose={() => setShowNew(false)} onCreate={m => setMatches(prev => [m, ...prev])} isMobile={isMobile} />
      )}

      {scoring && (
        <ScoringModal
          match={scoring}
          userId={userId}
          onClose={() => setScoring(null)}
          onMatchUpdated={updated => {
            setMatches(prev => prev.map(m => m.id === updated.id ? updated : m))
            setScoring(updated)
            if (updated.status === 'completed') fetchOrCreateWallet(userId).then(setWallet)
          }}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
