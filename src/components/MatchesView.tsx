import { useState, useEffect, useCallback } from 'react'
import type { Match, Wallet, PublicProfile, GameMode } from '../types'
import { fetchMatches, createMatch, acceptMatchInvite, declineMatchInvite, activateMatch, upsertScore, completeMatch, cancelMatch, fetchMatchRealtime } from '../lib/matches'
import { fetchOrCreateWallet, topUpWallet, withdrawFromWallet } from '../lib/wallet'
import { fetchFriendships, fetchProfilesForIds } from '../lib/friends'
import { supabase } from '../lib/supabase'
import { CloseIcon, TrophyIcon, PlusIcon } from './Icons'
import CourseSearch from './CourseSearch'
import type { GolfCourse } from '../lib/golfCourseApi'

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

// ── Score decoration matching the round scorecard style ───────────────
function MatchScoreDecoration({ score, par, isMe, onClick }: {
  score: number | null
  par: number
  isMe: boolean
  onClick?: () => void
}) {
  const base: React.CSSProperties = {
    width: 28, height: 28,
    cursor: isMe ? 'pointer' : 'default',
    margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const num = (sz: number, col: string): React.CSSProperties => ({
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: sz, fontWeight: 700, color: col, lineHeight: 1,
  })

  if (score === null) {
    return (
      <div onClick={isMe ? onClick : undefined}
        style={{ ...base, borderRadius: 6, border: isMe ? '1.5px dashed #1F3A2A' : '1.5px dashed #D1C9B8' }}>
        <span style={{ color: '#8B8272', fontSize: 14 }}>·</span>
      </div>
    )
  }

  const d = score - par

  if (d <= -2) {
    return (
      <div onClick={isMe ? onClick : undefined}
        style={{ ...base, borderRadius: '50%', border: '1.5px solid #C8A84B' }}>
        <div style={{ width: 19, height: 19, borderRadius: '50%', border: '1.5px solid #C8A84B', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={num(9, '#92400E')}>{score}</span>
        </div>
      </div>
    )
  }

  if (d === -1) {
    return (
      <div onClick={isMe ? onClick : undefined}
        style={{ ...base, borderRadius: '50%', border: '2px solid #5C7A4D', background: '#F0FDF4' }}>
        <span style={num(12, '#166534')}>{score}</span>
      </div>
    )
  }

  if (d === 0) {
    return (
      <div onClick={isMe ? onClick : undefined}
        style={{ ...base, borderRadius: 5, background: '#F0EBDD' }}>
        <span style={num(12, '#1F1D17')}>{score}</span>
      </div>
    )
  }

  if (d === 1) {
    return (
      <div onClick={isMe ? onClick : undefined}
        style={{ ...base, border: '2px solid #D9824D', background: '#FFF7ED' }}>
        <span style={num(12, '#9A3412')}>{score}</span>
      </div>
    )
  }

  const c = d >= 3 ? '#991B1B' : '#C0392B'
  return (
    <div onClick={isMe ? onClick : undefined}
      style={{ ...base, border: `1.5px solid ${c}` }}>
      <div style={{ width: 18, height: 18, border: `1.5px solid ${c}`, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={num(9, c)}>{score}</span>
      </div>
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
  const [holes,          setHoles]          = useState<9 | 18>(18)
  const [gameMode,       setGameMode]       = useState<GameMode>('stroke')
  const [wager,          setWager]          = useState(0)
  const [customWager,    setCustomWager]    = useState('')
  const [selectedIds,    setSelectedIds]    = useState<string[]>([])
  const [friendSearch,   setFriendSearch]   = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [courseName,     setCourseName]     = useState('')
  const [selectedCourse, setSelectedCourse] = useState<GolfCourse | null>(null)

  const WAGER_OPTS = [0, 10, 25, 50, 100]

  const filteredFriends = friends.filter(({ profile }) =>
    !friendSearch.trim() || profile?.username?.toLowerCase().includes(friendSearch.toLowerCase())
  )

  const toggleFriend = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const effectiveWager = customWager !== '' ? Math.min(10000, Math.max(0, parseInt(customWager) || 0)) : wager

  const handleCreate = async () => {
    if (!courseName.trim()) { setError('Please select a course.'); return }
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,29,23,0.50)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div style={{ background: 'rgba(237,232,212,0.90)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: '1px solid rgba(255,255,255,0.52)', borderRadius: isMobile ? '28px 28px 0 0' : 28, width: '100%', maxWidth: 520, maxHeight: isMobile ? '92vh' : '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: isMobile ? '0 -16px 48px rgba(31,29,23,0.18), inset 0 1px 0 rgba(255,255,255,0.7)' : '0 32px 80px rgba(31,29,23,0.22), inset 0 1px 0 rgba(255,255,255,0.7)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #E0D8C5', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>New Match</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <CloseIcon size={18} color="#4A4235" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {error && (
            <div style={{ background: 'rgba(217,130,77,0.12)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D' }}>
              {error}
            </div>
          )}

          {/* Course search */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4235', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Course</label>
            <CourseSearch
              value={courseName}
              onChange={name => { setCourseName(name); setSelectedCourse(null) }}
              onSelect={course => { setSelectedCourse(course); setCourseName(course.course_name) }}
              placeholder="Search any golf course…"
            />
            {selectedCourse && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#5C7A4D', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✓</span>
                <span>{[selectedCourse.location.city, selectedCourse.location.state || selectedCourse.location.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Holes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4235', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Holes</label>
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
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4235', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Format</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['stroke', 'match_play', 'skins', 'wolf'] as GameMode[]).map(mode => {
                const available = mode === 'stroke'
                const active = gameMode === mode
                return (
                  <button
                    key={mode}
                    onClick={() => available && setGameMode(mode)}
                    disabled={!available}
                    style={{
                      padding: '10px 8px', borderRadius: 10, border: '1px solid', cursor: available ? 'pointer' : 'default',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, transition: 'all 0.15s', textAlign: 'center',
                      background: active ? '#1F3A2A' : 'transparent',
                      color: active ? '#FAF6EA' : available ? '#1F1D17' : '#6B5F4E',
                      borderColor: active ? '#1F3A2A' : '#E0D8C5',
                      opacity: available ? 1 : 0.7,
                    }}
                  >
                    {MODE_LABELS[mode]}
                    {!available && <div style={{ fontSize: 10, marginTop: 2, color: '#6B5F4E' }}>Coming soon</div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Wager */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4235', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Wager per player (USD)</label>
            {wallet && (
              <div style={{ fontSize: 12, color: '#6B5F4E', marginBottom: 8 }}>
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
              <span style={{ fontSize: 14, color: '#4A4235', fontWeight: 500 }}>$</span>
              <input type="number" min="0" max="10000" value={customWager} onChange={e => { setCustomWager(e.target.value); setWager(0) }} placeholder="Custom amount (max $10,000)" style={{ ...inputStyle, padding: '10px 12px' }} onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }} onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }} />
            </div>
          </div>

          {/* Friends */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4235', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Invite friends {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
            </label>
            {friends.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6B5F4E', padding: '12px 0' }}>Add friends first to invite them to a match.</div>
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
                            <div style={{ fontSize: 11, color: '#4A4235' }}>HCP {profile.handicapIndex.toFixed(1)}</div>
                          )}
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${selected ? '#1F3A2A' : '#8B8272'}`, background: selected ? '#1F3A2A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <div style={{ width: 8, height: 8, borderRadius: 4, background: '#FAF6EA' }} />}
                        </div>
                      </button>
                    )
                  })}
                  {filteredFriends.length === 0 && friendSearch && (
                    <div style={{ fontSize: 13, color: '#6B5F4E', padding: '8px 0' }}>No friends match "{friendSearch}"</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E0D8C5', flexShrink: 0 }}>
          <button onClick={handleCreate} disabled={loading} style={{ width: '100%', background: loading ? '#8B8272' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 14, padding: '14px', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {loading ? 'Creating…' : 'Create & Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Scorecard Grid — table layout matching round scorecard style ───────
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
  const subtotalLabel = holes[0] === 1 ? 'OUT' : 'IN'
  const parTotal = pars.reduce((a, b) => a + b, 0)

  const C = 33
  const L = 52
  const T = 44

  const cellBase: React.CSSProperties = { width: C, minWidth: C, textAlign: 'center', padding: 0, border: 'none', verticalAlign: 'middle' }
  const labelCell: React.CSSProperties = { width: L, minWidth: L, textAlign: 'left', paddingLeft: 14, border: 'none', verticalAlign: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B5F4E' }
  const totalCell: React.CSSProperties = { width: T, minWidth: T, textAlign: 'center', border: 'none', verticalAlign: 'middle' }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: L + holes.length * C + T }}>
        <tbody>
          <tr style={{ background: '#1F3A2A' }}>
            <td style={{ ...labelCell, color: 'rgba(250,246,234,0.4)', padding: '8px 0 8px 14px' }}>HOLE</td>
            {holes.map(h => (
              <td key={h} style={{ ...cellBase, fontSize: 12, fontWeight: 700, color: '#FAF6EA', fontFamily: "'Bricolage Grotesque', sans-serif", padding: '8px 0' }}>{h}</td>
            ))}
            <td style={{ ...totalCell, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(250,246,234,0.4)', padding: '8px 0' }}>{subtotalLabel}</td>
          </tr>

          <tr style={{ background: '#EEE9DA' }}>
            <td style={{ ...labelCell, padding: '7px 0 7px 14px' }}>PAR</td>
            {holes.map((h, i) => (
              <td key={h} style={{ ...cellBase, fontSize: 13, fontWeight: 600, color: '#4A4235', padding: '7px 0' }}>{pars[i]}</td>
            ))}
            <td style={{ ...totalCell, fontSize: 14, fontWeight: 700, color: '#1F1D17', fontFamily: "'Bricolage Grotesque', sans-serif", padding: '7px 0' }}>{parTotal}</td>
          </tr>

          {players.map((player, pi) => {
            const isMe = player.userId === userId
            const subtotal = holes.reduce((sum, h) => sum + (player.scores[h] ?? 0), 0)
            const hasAnyScore = holes.some(h => player.scores[h] != null)
            const shortName = isMe ? 'YOU' : player.name.replace('@', '').slice(0, 3).toUpperCase()
            return (
              <tr key={player.userId} style={{ background: pi % 2 === 0 ? '#FAF6EA' : '#F5F0E5' }}>
                <td style={{ ...labelCell, padding: '4px 0 4px 14px', color: isMe ? '#1F3A2A' : '#6B5F4E' }}>{shortName}</td>
                {holes.map((h, i) => (
                  <td key={h} style={{ ...cellBase, padding: '4px 2px' }}>
                    <MatchScoreDecoration
                      score={player.scores[h] ?? null}
                      par={pars[i]}
                      isMe={isMe && status === 'active'}
                      onClick={() => isMe && onCellTap(h)}
                    />
                  </td>
                ))}
                <td style={{ ...totalCell, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17', padding: '4px 0' }}>
                  {hasAnyScore ? subtotal : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
    const refresh = async () => {
      try {
        const updated = await fetchMatchRealtime(liveMatch.id)
        setLiveMatch(updated)
        onMatchUpdated(updated)
      } catch { /* ignore transient errors */ }
    }
    const channel = supabase
      .channel(`match-live-${liveMatch.id}`)
      .on('postgres_changes', { event: '*',    schema: 'public', table: 'match_scores', filter: `match_id=eq.${liveMatch.id}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches',      filter: `id=eq.${liveMatch.id}` },      refresh)
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
    try { await completeMatch(liveMatch) } catch { /* might already be completed by opponent */ }
    try {
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
                <div style={{ fontSize: 13, color: isWinner ? '#B5C29A' : '#4A4235' }}>
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
            <div style={{ textAlign: 'center', fontSize: 13, color: '#6B5F4E', marginBottom: 20 }}>
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
              <div style={{ fontSize: 12, color: '#4A4235', marginTop: 2 }}>
                Par {pars[activeHole - 1]}
              </div>
            </div>
            <button onClick={() => setActiveHole(null)} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={14} color="#4A4235" />
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
            style={{ width: '100%', background: saving ? '#8B8272' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
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

  // Realtime: refresh on new invites AND when any match status changes (e.g. pending→active)
  useEffect(() => {
    const ch = supabase
      .channel(`match-invites-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_players', filter: `user_id=eq.${userId}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => load())
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
    try { await cancelMatch(match); await load() }
    catch { setError('Failed to cancel.') }
  }

  const handleStart = async (match: Match) => {
    try { await activateMatch(match.id); await load() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to start match.') }
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
    // Creator can start once every non-creator has accepted (none left as 'invited')
    const canStart  = match.status === 'pending'
      && match.createdBy === userId
      && match.players.length > 1
      && match.players.every(p => p.status !== 'invited')

    const isDark = isActive || (isDone && iWon)

    const pressFn = (el: HTMLButtonElement, down: boolean) => { el.style.transform = down ? 'scale(0.96)' : 'scale(1)' }

    return (
      <div style={{
        background: isDark ? 'rgba(31,58,42,0.88)' : 'rgba(250,246,234,0.68)',
        backdropFilter: 'blur(36px) saturate(180%)',
        WebkitBackdropFilter: 'blur(36px) saturate(180%)',
        border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.60)',
        borderRadius: 22,
        boxShadow: isDark
          ? '0 12px 40px rgba(31,58,42,0.26), inset 0 1px 0 rgba(255,255,255,0.16)'
          : '0 6px 28px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.75)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: 'transparent', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(31,58,42,0.07)' }}>
          <TrophyIcon size={18} color={isDark ? '#D9824D' : '#4A4235'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: isDark ? '#FAF6EA' : '#1F1D17', letterSpacing: '-0.02em' }}>{match.courseName}</div>
            <div style={{ fontSize: 12, color: isDark ? '#B5C29A' : '#4A4235', marginTop: 2 }}>
              {MODE_LABELS[match.gameMode]} · {match.holes} holes{match.wagerPerPlayer > 0 && ` · $${match.wagerPerPlayer} each`}
            </div>
          </div>
          {isDone && iWon && <div style={{ fontSize: 11, fontWeight: 700, color: '#D9824D', background: 'rgba(217,130,77,0.22)', border: '1px solid rgba(217,130,77,0.32)', borderRadius: 999, padding: '4px 11px', letterSpacing: '0.02em' }}>Won</div>}
          {isDone && !iWon && match.winnerId && <div style={{ fontSize: 11, fontWeight: 600, color: '#4A4235', background: 'rgba(201,192,168,0.35)', border: '1px solid rgba(201,192,168,0.45)', borderRadius: 999, padding: '4px 11px' }}>Lost</div>}
          {isDone && !match.winnerId && <div style={{ fontSize: 11, fontWeight: 600, color: '#4A4235', background: 'rgba(201,192,168,0.35)', border: '1px solid rgba(201,192,168,0.45)', borderRadius: 999, padding: '4px 11px' }}>Tie</div>}
        </div>

        {/* Players inset */}
        <div style={{ margin: '10px 12px', background: isDark ? 'rgba(250,246,234,0.07)' : 'rgba(255,255,255,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.55)', borderRadius: 14, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
          {others.map(p => (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar profile={p.profile} size={28} />
              <span style={{ fontSize: 13, color: isDark ? '#E8F0E0' : '#1F1D17', fontWeight: 500 }}>{p.profile?.username ? `@${p.profile.username}` : 'Opponent'}</span>
            </div>
          ))}
          {isActive && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.03em' }}>{myTotal || '—'}</div>
              <div style={{ fontSize: 10, color: '#B5C29A' }}>{holesPlayed}/{match.holes} holes</div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ padding: '0 12px 12px', display: 'flex', gap: 8 }}>
          {isInvite && (
            <>
              <button
                onClick={() => handleDecline(match.id)}
                style={{ flex: 1, background: 'rgba(240,235,221,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 13, padding: '11px', fontSize: 13, color: '#4A4235', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Decline</button>
              <button
                onClick={() => handleAccept(match.id, match.wagerPerPlayer)}
                style={{ flex: 2, background: 'rgba(31,58,42,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 13, padding: '11px', fontSize: 13, fontWeight: 600, color: '#FAF6EA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Accept{match.wagerPerPlayer > 0 ? ` · $${match.wagerPerPlayer}` : ''}</button>
            </>
          )}
          {isActive && (
            <>
              <button
                onClick={() => setScoring(match)}
                style={{ flex: 2, background: 'rgba(250,246,234,0.90)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 13, padding: '11px', fontSize: 13, fontWeight: 600, color: '#1F3A2A', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 10px rgba(31,29,23,0.07)', transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Enter Scores →</button>
              <button
                onClick={() => handleCancel(match)}
                style={{ flex: 1, background: 'rgba(250,246,234,0.20)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 13, padding: '11px', fontSize: 12, color: '#B5C29A', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Cancel</button>
            </>
          )}
          {isDone && (
            <button
              onClick={() => setScoring(match)}
              style={{ flex: 1, background: isDark ? 'rgba(250,246,234,0.90)' : 'rgba(240,235,221,0.85)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: isDark ? '1px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.50)', borderRadius: 13, padding: '11px', fontSize: 13, fontWeight: 600, color: '#1F1D17', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 10px rgba(31,29,23,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'transform 0.12s ease' }}
              onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
              onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
            >View Scorecard <span style={{ fontSize: 12, opacity: 0.45 }}>›</span></button>
          )}
          {canStart && (
            <>
              <button
                onClick={() => handleStart(match)}
                style={{ flex: 2, background: 'rgba(92,122,77,0.92)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 13, padding: '11px', fontSize: 13, fontWeight: 600, color: '#FAF6EA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Start Match →</button>
              <button
                onClick={() => handleCancel(match)}
                style={{ flex: 1, background: 'rgba(240,235,221,0.72)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: 13, padding: '11px', fontSize: 12, color: '#4A4235', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Cancel</button>
            </>
          )}
          {match.status === 'pending' && me?.status === 'accepted' && !canStart && (
            <button
              onClick={() => handleCancel(match)}
              style={{ flex: 1, background: 'rgba(240,235,221,0.72)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: 13, padding: '11px', fontSize: 13, color: '#4A4235', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'transform 0.12s ease' }}
              onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
              onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
            >Cancel</button>
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
          <div style={{ background: 'rgba(250,246,234,0.70)', backdropFilter: 'blur(36px) saturate(180%)', WebkitBackdropFilter: 'blur(36px) saturate(180%)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 22, padding: '16px 20px', boxShadow: '0 6px 28px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.80)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: walletAction ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 4 }}>Wallet Balance</div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  ${wallet.balance.toLocaleString()}<span style={{ fontSize: 13, color: '#4A4235', fontWeight: 400, marginLeft: 4 }}>USD</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setWalletAction(walletAction === 'add' ? null : 'add')} style={{ background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>+ Add</button>
                <button onClick={() => setWalletAction(walletAction === 'withdraw' ? null : 'withdraw')} style={{ background: 'transparent', color: '#4A4235', border: '1px solid #E0D8C5', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Withdraw</button>
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
        style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'rgba(31,58,42,0.88)', backdropFilter: 'blur(36px) saturate(160%)', WebkitBackdropFilter: 'blur(36px) saturate(160%)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 22, padding: '18px 20px', marginBottom: 28, cursor: 'pointer', transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)', boxShadow: '0 12px 40px rgba(31,58,42,0.26), inset 0 1px 0 rgba(255,255,255,0.16)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(31,58,42,0.97)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 18px 52px rgba(31,58,42,0.32), inset 0 1px 0 rgba(255,255,255,0.16)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(31,58,42,0.88)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(31,58,42,0.26), inset 0 1px 0 rgba(255,255,255,0.16)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 22, background: '#D9824D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(217,130,77,0.45)' }}>
          <PlusIcon size={20} color="#FAF6EA" />
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em' }}>Start a new match</div>
          <div style={{ fontSize: 12, color: '#B5C29A', marginTop: 3 }}>Santa Maria Golf & Country Club · with wagers</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 17, color: 'rgba(250,246,234,0.65)', lineHeight: 1, fontWeight: 300 }}>›</span>
        </div>
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', fontSize: 14, color: '#6B5F4E' }}>Loading…</div>
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
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 12 }}>Waiting for players</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myPending.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 12 }}>Completed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {completed.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {matches.length === 0 && (
            <div style={{ background: 'rgba(250,246,234,0.70)', backdropFilter: 'blur(36px) saturate(180%)', WebkitBackdropFilter: 'blur(36px) saturate(180%)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 22, padding: '48px 24px', textAlign: 'center', boxShadow: '0 6px 28px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.80)' }}>
              <TrophyIcon size={32} color="#8B8272" />
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, color: '#8B8272', marginTop: 12, marginBottom: 8 }}>No matches yet</div>
              <div style={{ fontSize: 13, color: '#6B5F4E' }}>Start a match and challenge your friends.</div>
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

