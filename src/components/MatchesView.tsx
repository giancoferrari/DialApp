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
  stroke: 'Stroke Play',
  match_play: 'Match Play',
  skins: 'Skins',
  wolf: 'Wolf',
}

const PRESET_COURSES = [
  'Santa Maria Golf Club',
  'Summit Golf Club',
  'Pebble Beach Golf Links',
  'Augusta National',
]

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
  const [courseName,    setCourseName]    = useState('')
  const [showPresets,   setShowPresets]   = useState(false)
  const [holes,         setHoles]         = useState<9 | 18>(18)
  const [gameMode,      setGameMode]      = useState<GameMode>('stroke')
  const [wager,         setWager]         = useState(0)
  const [customWager,   setCustomWager]   = useState('')
  const [selectedIds,   setSelectedIds]   = useState<string[]>([])
  const [friendSearch,  setFriendSearch]  = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const WAGER_OPTS = [0, 10, 25, 50, 100]

  const filteredFriends = friends.filter(({ profile }) =>
    !friendSearch.trim() || profile?.username?.toLowerCase().includes(friendSearch.toLowerCase())
  )

  const toggleFriend = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const effectiveWager = customWager !== '' ? Math.min(10000, Math.max(0, parseInt(customWager) || 0)) : wager

  const handleCreate = async () => {
    if (!courseName.trim()) { setError('Enter a course name.'); return }
    if (selectedIds.length === 0) { setError('Invite at least one friend.'); return }
    if (effectiveWager > 0 && wallet && wallet.balance < effectiveWager) {
      setError(`Not enough funds. Your balance: $${wallet.balance.toLocaleString()}`)
      return
    }
    setLoading(true); setError(null)
    try {
      const match = await createMatch(userId, { courseName: courseName.trim(), holes, gameMode, wagerPerPlayer: effectiveWager }, selectedIds)
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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #E0D8C5', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>
            New Match
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <CloseIcon size={18} color="#6B6857" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {error && (
            <div style={{ background: 'rgba(217,130,77,0.12)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D' }}>
              {error}
            </div>
          )}

          {/* Course name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Course</label>
            <div style={{ position: 'relative' }}>
              <input
                value={courseName}
                onChange={e => { setCourseName(e.target.value); setShowPresets(true) }}
                onFocus={() => setShowPresets(true)}
                onBlur={() => setTimeout(() => setShowPresets(false), 150)}
                placeholder="e.g. Santa Maria Golf Club"
                style={inputStyle}
              />
              {showPresets && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 12, overflow: 'hidden', zIndex: 10, boxShadow: '0 8px 24px rgba(31,58,42,0.10)' }}>
                  {PRESET_COURSES.filter(c => !courseName || c.toLowerCase().includes(courseName.toLowerCase())).map(c => (
                    <button
                      key={c}
                      onMouseDown={() => { setCourseName(c); setShowPresets(false) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '11px 14px', fontSize: 14, color: '#1F1D17', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", borderBottom: '1px solid #F0EBDD' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Holes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Holes</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([9, 18] as const).map(h => (
                <button
                  key={h}
                  onClick={() => setHoles(h)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, transition: 'all 0.15s', background: holes === h ? '#1F3A2A' : 'transparent', color: holes === h ? '#FAF6EA' : '#1F1D17', borderColor: holes === h ? '#1F3A2A' : '#E0D8C5' }}
                >
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
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  style={{ padding: '10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, transition: 'all 0.15s', background: gameMode === mode ? '#1F3A2A' : 'transparent', color: gameMode === mode ? '#FAF6EA' : '#1F1D17', borderColor: gameMode === mode ? '#1F3A2A' : '#E0D8C5', textAlign: 'center' }}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Wager */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Wager per player (USD)
            </label>
            {wallet && (
              <div style={{ fontSize: 12, color: '#B5AC95', marginBottom: 8 }}>
                Your balance: <strong style={{ color: '#1F1D17' }}>${wallet.balance.toLocaleString()}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {WAGER_OPTS.map(w => (
                <button
                  key={w}
                  onClick={() => { setWager(w); setCustomWager('') }}
                  style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: wager === w && customWager === '' ? '#D9824D' : 'transparent', color: wager === w && customWager === '' ? '#FAF6EA' : '#1F1D17', borderColor: wager === w && customWager === '' ? '#D9824D' : '#E0D8C5' }}
                >
                  {w === 0 ? 'No wager' : `$${w}`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#6B6857', fontWeight: 500 }}>$</span>
              <input
                type="number"
                min="0"
                max="10000"
                value={customWager}
                onChange={e => { setCustomWager(e.target.value); setWager(0) }}
                placeholder="Custom amount (max $10,000)"
                style={{ ...inputStyle, padding: '10px 12px' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
              />
            </div>
          </div>

          {/* Friends to invite */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Invite friends {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
            </label>
            {friends.length === 0 ? (
              <div style={{ fontSize: 13, color: '#B5AC95', padding: '12px 0' }}>Add friends first to invite them to a match.</div>
            ) : (
              <>
                <input
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                  placeholder="Search friends…"
                  style={{ ...inputStyle, marginBottom: 10 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredFriends.map(({ friendId, profile }) => {
                    const selected = selectedIds.includes(friendId)
                    return (
                      <button
                        key={friendId}
                        onClick={() => toggleFriend(friendId)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, background: selected ? 'rgba(31,58,42,0.06)' : '#FAF6EA', border: `1px solid ${selected ? '#1F3A2A' : '#E0D8C5'}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                      >
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

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E0D8C5', flexShrink: 0 }}>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{ width: '100%', background: loading ? '#C9C0A8' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 14, padding: '14px', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
          >
            {loading ? 'Creating…' : 'Create & Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Live Scoring Modal ────────────────────────────────────────────────
function ScoringModal({
  match, userId, onClose, onMatchUpdated, isMobile,
}: {
  match: Match
  userId: string
  onClose: () => void
  onMatchUpdated: (m: Match) => void
  isMobile: boolean
}) {
  const [liveMatch, setLiveMatch]   = useState<Match>(match)
  const [holeInput, setHoleInput]   = useState<number | null>(null)
  const [scoreVal,  setScoreVal]    = useState(4)
  const [saving,    setSaving]      = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error,     setError]       = useState<string | null>(null)

  const accepted = liveMatch.players.filter(p => p.status === 'accepted')
  const me = accepted.find(p => p.userId === userId)
  const others = accepted.filter(p => p.userId !== userId)

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

  const holes = Array.from({ length: liveMatch.holes }, (_, i) => i + 1)
  const myScore = (h: number) => me?.scores.find(s => s.holeNumber === h)?.score ?? null
  const otherScore = (p: typeof accepted[0], h: number) => p.scores.find(s => s.holeNumber === h)?.score ?? null
  const myTotal = me?.scores.reduce((sum, s) => sum + (s.score ?? 0), 0) ?? 0
  const nextHole = holes.find(h => myScore(h) === null) ?? null
  const allComplete = accepted.every(p => holes.every(h => p.scores.find(s => s.holeNumber === h)?.score != null))

  const handleSaveScore = async () => {
    if (holeInput === null) return
    setSaving(true); setError(null)
    try {
      await upsertScore(liveMatch.id, userId, holeInput, scoreVal)
      const updated = await fetchMatchRealtime(liveMatch.id)
      setLiveMatch(updated)
      onMatchUpdated(updated)
      setHoleInput(null)
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

  const standings = accepted.map(p => ({
    p,
    total: p.scores.reduce((sum, s) => sum + (s.score ?? 0), 0),
    filled: holes.filter(h => p.scores.find(s => s.holeNumber === h)?.score != null).length,
  })).sort((a, b) => a.total - b.total)

  const leaderId = standings[0]?.p.userId
  const isWinner = liveMatch.status === 'completed' && liveMatch.winnerId === userId

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F0EBDD', zIndex: 200, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      <div style={{ background: '#1F3A2A', color: '#FAF6EA', padding: `${isMobile ? 'calc(env(safe-area-inset-top) + 16px)' : '20px'} 20px 16px`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <button onClick={onClose} style={{ background: 'rgba(250,246,234,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#FAF6EA', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            ← Back
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{liveMatch.courseName}</div>
            <div style={{ fontSize: 12, color: '#B5C29A', marginTop: 2 }}>
              {MODE_LABELS[liveMatch.gameMode]} · {liveMatch.holes} holes
              {liveMatch.wagerPerPlayer > 0 ? ` · $${liveMatch.wagerPerPlayer} each` : ''}
            </div>
          </div>
          <div style={{ width: 60 }} />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '24px 20px', flex: 1 }}>

        {liveMatch.status === 'completed' && (
          <div style={{ background: isWinner ? '#1F3A2A' : '#FAF6EA', border: `1px solid ${isWinner ? '#1F3A2A' : '#E0D8C5'}`, borderRadius: 16, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: isWinner ? '#FAF6EA' : '#1F1D17', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {liveMatch.winnerId ? (isWinner ? 'You won!' : `${standings[0].p.profile?.username ? `@${standings[0].p.profile.username}` : 'Opponent'} won`) : "It's a tie!"}
            </div>
            {liveMatch.wagerPerPlayer > 0 && liveMatch.winnerId && (
              <div style={{ fontSize: 13, color: isWinner ? '#B5C29A' : '#6B6857' }}>
                {isWinner ? `+$${liveMatch.wagerPerPlayer * accepted.length} credited to your wallet` : `-$${liveMatch.wagerPerPlayer} wagered`}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Standings */}
        <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, padding: '16px', marginBottom: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
          {standings.map(({ p, total, filled }) => (
            <div key={p.userId} style={{ textAlign: 'center', flex: 1 }}>
              <Avatar profile={p.profile} size={36} />
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: p.userId === leaderId && total > 0 ? '#1F3A2A' : '#1F1D17', letterSpacing: '-0.03em', marginTop: 6 }}>
                {total || '—'}
              </div>
              <div style={{ fontSize: 10, color: '#6B6857', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {p.profile?.username ? `@${p.profile.username}` : (p.userId === userId ? 'You' : 'Opp.')}
              </div>
              <div style={{ fontSize: 10, color: '#B5AC95', marginTop: 2 }}>{filled}/{liveMatch.holes} holes</div>
            </div>
          ))}
        </div>

        {/* Score entry */}
        {liveMatch.status === 'active' && nextHole !== null && (
          <div style={{ background: '#1F3A2A', borderRadius: 18, padding: '20px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#B5C29A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {holeInput !== null ? `Hole ${holeInput}` : `Next: Hole ${nextHole}`}
            </div>
            <div style={{ fontSize: 13, color: '#B5C29A', marginBottom: 16 }}>Tap a hole to enter your score</div>
            {holeInput !== null && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
                  <button onClick={() => setScoreVal(v => Math.max(1, v - 1))} style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(250,246,234,0.15)', border: 'none', color: '#FAF6EA', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>−</button>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 56, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.04em', lineHeight: 1, minWidth: 60, textAlign: 'center' }}>{scoreVal}</div>
                  <button onClick={() => setScoreVal(v => Math.min(15, v + 1))} style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(250,246,234,0.15)', border: 'none', color: '#FAF6EA', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>+</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setHoleInput(null)} style={{ flex: 1, background: 'rgba(250,246,234,0.12)', border: 'none', borderRadius: 10, padding: '12px', color: '#FAF6EA', cursor: 'pointer', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                  <button onClick={handleSaveScore} disabled={saving} style={{ flex: 2, background: '#D9824D', border: 'none', borderRadius: 10, padding: '12px', color: '#FAF6EA', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                    {saving ? 'Saving…' : 'Save Score'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {liveMatch.status === 'active' && allComplete && (
          <button
            onClick={handleComplete}
            disabled={completing}
            style={{ width: '100%', background: '#D9824D', border: 'none', borderRadius: 14, padding: '14px', color: '#FAF6EA', fontSize: 15, fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: 20 }}
          >
            {completing ? 'Finalising…' : 'Complete Match'}
          </button>
        )}

        {/* Hole-by-hole scorecard */}
        <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `48px 1fr ${others.map(() => '52px').join(' ')} 52px`, background: '#1F3A2A', padding: '10px 16px', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#B5C29A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hole</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#B5C29A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>You</div>
            {others.map(p => (
              <div key={p.userId} style={{ fontSize: 10, fontWeight: 700, color: '#B5C29A', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
                {p.profile?.username?.slice(0, 5) ?? 'Opp'}
              </div>
            ))}
            <div style={{ fontSize: 10, fontWeight: 700, color: '#B5C29A', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>+/-</div>
          </div>

          {holes.map((h, i) => {
            const mine = myScore(h)
            const isNext = nextHole === h && liveMatch.status === 'active'
            return (
              <div
                key={h}
                onClick={() => {
                  if (liveMatch.status !== 'active') return
                  setHoleInput(h)
                  setScoreVal(mine ?? 4)
                }}
                style={{ display: 'grid', gridTemplateColumns: `48px 1fr ${others.map(() => '52px').join(' ')} 52px`, padding: '11px 16px', gap: 8, alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid #ECE5D2', background: isNext ? 'rgba(31,58,42,0.04)' : holeInput === h ? 'rgba(217,130,77,0.06)' : 'transparent', cursor: liveMatch.status === 'active' ? 'pointer' : 'default', transition: 'background 0.12s' }}
                onMouseEnter={e => { if (liveMatch.status === 'active') e.currentTarget.style.background = 'rgba(31,58,42,0.04)' }}
                onMouseLeave={e => { if (holeInput !== h) e.currentTarget.style.background = isNext ? 'rgba(31,58,42,0.04)' : 'transparent' }}
              >
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#6B6857' }}>{h}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: mine !== null ? '#1F3A2A' : '#C9C0A8', letterSpacing: '-0.02em' }}>
                  {mine ?? (isNext ? '→' : '—')}
                </div>
                {others.map(p => {
                  const s = otherScore(p, h)
                  return (
                    <div key={p.userId} style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: s !== null ? '#1F1D17' : '#C9C0A8', textAlign: 'center', letterSpacing: '-0.02em' }}>
                      {s ?? '—'}
                    </div>
                  )
                })}
                <div style={{ fontSize: 12, color: '#B5AC95', textAlign: 'center' }}>
                  {mine !== null ? (mine <= 3 ? 'Eagle' : mine === 4 ? '' : mine === 5 ? '+1' : `+${mine - 4}`) : ''}
                </div>
              </div>
            )
          })}

          <div style={{ display: 'grid', gridTemplateColumns: `48px 1fr ${others.map(() => '52px').join(' ')} 52px`, padding: '12px 16px', gap: 8, background: '#F0EBDD', borderTop: '2px solid #E0D8C5' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6857', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em' }}>{myTotal || '—'}</div>
            {others.map(p => {
              const t = p.scores.reduce((sum, s) => sum + (s.score ?? 0), 0)
              return (
                <div key={p.userId} style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#1F1D17', textAlign: 'center', letterSpacing: '-0.03em' }}>{t || '—'}</div>
              )
            })}
            <div />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main MatchesView ──────────────────────────────────────────────────
export default function MatchesView({ userId, isMobile = false }: Props) {
  const [matches,      setMatches]      = useState<Match[]>([])
  const [wallet,       setWallet]       = useState<Wallet | null>(null)
  const [friends,      setFriends]      = useState<{ friendId: string; profile?: PublicProfile }[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showNew,      setShowNew]      = useState(false)
  const [scoring,      setScoring]      = useState<Match | null>(null)
  const [walletInput,  setWalletInput]  = useState('')
  const [walletAction, setWalletAction] = useState<'add' | 'withdraw' | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [w, m] = await Promise.all([
        fetchOrCreateWallet(userId),
        fetchMatches(userId),
      ])
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

  const handleWalletSubmit = async () => {
    const amount = Math.min(10000, Math.max(0, parseInt(walletInput) || 0))
    if (!amount) return
    setWalletLoading(true)
    try {
      const w = walletAction === 'add'
        ? await topUpWallet(userId, amount)
        : await withdrawFromWallet(userId, amount)
      setWallet(w)
      setWalletInput('')
      setWalletAction(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed.')
    } finally { setWalletLoading(false) }
  }

  const handleAccept = async (matchId: string, wager: number) => {
    try {
      await acceptMatchInvite(matchId, userId, wager)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to accept.')
    }
  }

  const handleDecline = async (matchId: string) => {
    try {
      await declineMatchInvite(matchId, userId)
      setMatches(prev => prev.filter(m => m.id !== matchId))
    } catch { setError('Failed to decline.') }
  }

  const handleCancel = async (match: Match) => {
    try {
      await cancelMatch(match, userId)
      await load()
    } catch { setError('Failed to cancel.') }
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
    const others = match.players.filter(p => p.userId !== userId && p.status === 'accepted')
    const me = match.players.find(p => p.userId === userId)
    const isInvite = me?.status === 'invited'
    const isActive = match.status === 'active'
    const isDone = match.status === 'completed'
    const iWon = isDone && match.winnerId === userId
    const myTotal = me?.scores.reduce((sum, s) => sum + (s.score ?? 0), 0) ?? 0
    const holesPlayed = me?.scores.length ?? 0

    return (
      <div style={{ background: '#FAF6EA', border: `1px solid ${isActive ? '#1F3A2A' : '#E0D8C5'}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ background: isActive ? '#1F3A2A' : isDone ? (iWon ? '#1F3A2A' : '#F0EBDD') : '#FAF6EA', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(31,58,42,0.08)' }}>
          <TrophyIcon size={18} color={isActive ? '#D9824D' : '#6B6857'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: isActive ? '#FAF6EA' : '#1F1D17', letterSpacing: '-0.02em' }}>
              {match.courseName}
            </div>
            <div style={{ fontSize: 12, color: isActive ? '#B5C29A' : '#6B6857', marginTop: 2 }}>
              {MODE_LABELS[match.gameMode]} · {match.holes} holes
              {match.wagerPerPlayer > 0 && ` · $${match.wagerPerPlayer} each`}
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
              <span style={{ fontSize: 13, color: '#1F1D17', fontWeight: 500 }}>
                {p.profile?.username ? `@${p.profile.username}` : 'Opponent'}
              </span>
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
              <button onClick={() => handleDecline(match.id)} style={{ flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px', fontSize: 13, color: '#6B6857', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Decline
              </button>
              <button onClick={() => handleAccept(match.id, match.wagerPerPlayer)} style={{ flex: 2, background: '#1F3A2A', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: '#FAF6EA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Accept{match.wagerPerPlayer > 0 ? ` · $${match.wagerPerPlayer}` : ''}
              </button>
            </>
          )}
          {isActive && (
            <>
              <button onClick={() => setScoring(match)} style={{ flex: 2, background: '#1F3A2A', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: '#FAF6EA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Enter Scores →
              </button>
              <button onClick={() => handleCancel(match)} style={{ flex: 1, background: 'transparent', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px', fontSize: 12, color: '#6B6857', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
            </>
          )}
          {isDone && (
            <button onClick={() => setScoring(match)} style={{ flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px', fontSize: 13, color: '#1F1D17', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              View Scorecard
            </button>
          )}
          {match.status === 'pending' && me?.status === 'accepted' && (
            <button onClick={() => handleCancel(match)} style={{ flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px', fontSize: 13, color: '#6B6857', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* Header + Wallet */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>Play</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: '0 0 20px', lineHeight: 1 }}>
          Matches
        </h1>

        {/* Wallet card */}
        {wallet && (
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: walletAction ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 4 }}>Wallet Balance</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  ${wallet.balance.toLocaleString()}
                  <span style={{ fontSize: 13, color: '#6B6857', fontWeight: 400, marginLeft: 4 }}>USD</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setWalletAction(walletAction === 'add' ? null : 'add')}
                  style={{ background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  + Add
                </button>
                <button
                  onClick={() => setWalletAction(walletAction === 'withdraw' ? null : 'withdraw')}
                  style={{ background: 'transparent', color: '#6B6857', border: '1px solid #E0D8C5', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Withdraw
                </button>
              </div>
            </div>

            {walletAction && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 16, color: '#1F1D17', fontWeight: 500 }}>$</span>
                <input
                  type="number" min="1" max="10000"
                  value={walletInput}
                  onChange={e => setWalletInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleWalletSubmit() }}
                  placeholder={walletAction === 'add' ? 'Amount to add (max $10,000)' : 'Amount to withdraw'}
                  autoFocus
                  style={{ flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                />
                <button
                  onClick={handleWalletSubmit}
                  disabled={walletLoading}
                  style={{ background: walletAction === 'add' ? '#1F3A2A' : '#D9824D', color: '#FAF6EA', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: walletLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
                >
                  {walletLoading ? '…' : walletAction === 'add' ? 'Add Funds' : 'Withdraw'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* New match button */}
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
          <div style={{ fontSize: 12, color: '#B5C29A', marginTop: 2 }}>Stroke, Match Play, Skins · with wagers</div>
        </div>
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', fontSize: 14, color: '#B5AC95' }}>Loading…</div>
      ) : (
        <>
          {myInvites.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 12 }}>
                Invites ({myInvites.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myInvites.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {active.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#1F3A2A', textTransform: 'uppercase', marginBottom: 12 }}>
                Active ({active.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {active.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {myPending.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 12 }}>
                Waiting for players
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myPending.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 12 }}>
                Completed
              </div>
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
        <NewMatchModal
          userId={userId}
          wallet={wallet}
          friends={friends}
          onClose={() => setShowNew(false)}
          onCreate={m => setMatches(prev => [m, ...prev])}
          isMobile={isMobile}
        />
      )}

      {scoring && (
        <ScoringModal
          match={scoring}
          userId={userId}
          onClose={() => setScoring(null)}
          onMatchUpdated={updated => {
            setMatches(prev => prev.map(m => m.id === updated.id ? updated : m))
            setScoring(updated)
            if (updated.status === 'completed') {
              fetchOrCreateWallet(userId).then(setWallet)
            }
          }}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
