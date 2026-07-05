import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Match, Wallet, PublicProfile, GameMode } from '../types'
import { fetchMatches, createMatch, acceptMatchInvite, declineMatchInvite, activateMatch, upsertScore, completeMatch, cancelMatch, fetchMatchRealtime } from '../lib/matches'
import { fetchOrCreateWallet, topUpWallet, withdrawFromWallet } from '../lib/wallet'
import { fetchFriendships, fetchProfilesForIds } from '../lib/friends'
import { supabase } from '../lib/supabase'
import { CloseIcon, TrophyIcon, PlusIcon } from './Icons'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import CourseSearch from './CourseSearch'
import Portal from './Portal'
import Skeleton from './Skeleton'
import { useToast } from './Toast'
import { courseDisplayName, type GolfCourse } from '../lib/golfCourseApi'
import { font } from '../lib/tokens'

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
    fontFamily: font.display,
    fontSize: sz, fontWeight: 700, color: col, lineHeight: 1,
  })

  if (score === null) {
    return (
      <div onClick={isMe ? onClick : undefined}
        style={{ ...base, borderRadius: 6, border: isMe ? '1.5px dashed #1E4D38' : '1.5px dashed #CDD2CC' }}>
        <span style={{ color: '#9AA09A', fontSize: 14 }}>·</span>
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
        style={{ ...base, borderRadius: '50%', border: '2px solid #2F6E4C', background: '#F0FDF4' }}>
        <span style={num(12, '#166534')}>{score}</span>
      </div>
    )
  }

  if (d === 0) {
    return (
      <div onClick={isMe ? onClick : undefined}
        style={{ ...base, borderRadius: 5, background: '#EFF1ED' }}>
        <span style={num(12, '#171A17')}>{score}</span>
      </div>
    )
  }

  if (d === 1) {
    return (
      <div onClick={isMe ? onClick : undefined}
        style={{ ...base, border: '2px solid #C25E33', background: '#FFF7ED' }}>
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
    width: '100%', boxSizing: 'border-box', background: '#F2F5F1',
    border: '1px solid #E4E6E1', borderRadius: 12, padding: '12px 14px',
    fontSize: 14, color: '#171A17', outline: 'none',
    fontFamily: font.body, transition: 'border-color 0.15s',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,29,23,0.50)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #E4E6E1', borderRadius: isMobile ? '28px 28px 0 0' : 28, width: '100%', maxWidth: 520, maxHeight: isMobile ? '92vh' : '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: isMobile ? '0 -16px 48px rgba(31,29,23,0.18), inset 0 1px 0 rgba(255,255,255,0.7)' : '0 32px 80px rgba(31,29,23,0.22), inset 0 1px 0 rgba(255,255,255,0.7)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #E4E6E1', flexShrink: 0 }}>
          <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, color: '#171A17', letterSpacing: '-0.02em' }}>New Match</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <CloseIcon size={18} color="#494F49" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {error && (
            <div style={{ background: 'rgba(217,130,77,0.12)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#C25E33' }}>
              {error}
            </div>
          )}

          {/* Course search */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#494F49', display: 'block', marginBottom: 8 }}>Course</label>
            <CourseSearch
              value={courseName}
              onChange={name => { setCourseName(name); setSelectedCourse(null) }}
              onSelect={course => { setSelectedCourse(course); setCourseName(courseDisplayName(course)) }}
              placeholder="Search any golf course…"
            />
            {selectedCourse && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#2F6E4C', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✓</span>
                <span>{[selectedCourse.location.city, selectedCourse.location.state || selectedCourse.location.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Holes */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#494F49', display: 'block', marginBottom: 8 }}>Holes</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([9, 18] as const).map(h => (
                <button key={h} onClick={() => setHoles(h)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontFamily: font.display, fontSize: 15, fontWeight: 700, transition: 'all 0.15s', background: holes === h ? '#1E4D38' : 'transparent', color: holes === h ? '#F2F5F1' : '#171A17', borderColor: holes === h ? '#1E4D38' : '#E4E6E1' }}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Game mode */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#494F49', display: 'block', marginBottom: 8 }}>Format</label>
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
                      fontFamily: font.body, fontSize: 13, fontWeight: 500, transition: 'all 0.15s', textAlign: 'center',
                      background: active ? '#1E4D38' : 'transparent',
                      color: active ? '#F2F5F1' : available ? '#171A17' : '#6B716B',
                      borderColor: active ? '#1E4D38' : '#E4E6E1',
                      opacity: available ? 1 : 0.7,
                    }}
                  >
                    {MODE_LABELS[mode]}
                    {!available && <div style={{ fontSize: 10, marginTop: 2, color: '#6B716B' }}>Coming soon</div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Wager */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#494F49', display: 'block', marginBottom: 4 }}>Wager per player (USD)</label>
            {wallet && (
              <div style={{ fontSize: 12, color: '#6B716B', marginBottom: 8 }}>
                Your balance: <strong style={{ color: '#171A17' }}>${wallet.balance.toLocaleString()}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {WAGER_OPTS.map(w => (
                <button key={w} onClick={() => { setWager(w); setCustomWager('') }} style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid', cursor: 'pointer', fontFamily: font.display, fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: wager === w && customWager === '' ? '#C25E33' : 'transparent', color: wager === w && customWager === '' ? '#F2F5F1' : '#171A17', borderColor: wager === w && customWager === '' ? '#C25E33' : '#E4E6E1' }}>
                  {w === 0 ? 'No wager' : `$${w}`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#494F49', fontWeight: 500 }}>$</span>
              <input type="number" min="0" max="10000" value={customWager} onChange={e => { setCustomWager(e.target.value); setWager(0) }} placeholder="Custom amount (max $10,000)" style={{ ...inputStyle, padding: '10px 12px' }} onFocus={e => { e.currentTarget.style.borderColor = '#1E4D38' }} onBlur={e => { e.currentTarget.style.borderColor = '#E4E6E1' }} />
            </div>
          </div>

          {/* Friends */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#494F49', display: 'block', marginBottom: 8 }}>
              Invite friends {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
            </label>
            {friends.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6B716B', padding: '12px 0' }}>Add friends first to invite them to a match.</div>
            ) : (
              <>
                <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Search friends…" style={{ ...inputStyle, marginBottom: 10 }} onFocus={e => { e.currentTarget.style.borderColor = '#1E4D38' }} onBlur={e => { e.currentTarget.style.borderColor = '#E4E6E1' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredFriends.map(({ friendId, profile }) => {
                    const selected = selectedIds.includes(friendId)
                    return (
                      <button key={friendId} onClick={() => toggleFriend(friendId)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: selected ? 'rgba(31,58,42,0.06)' : '#F2F5F1', border: `1px solid ${selected ? '#1E4D38' : '#E4E6E1'}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                        <Avatar profile={profile} size={36} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: '#171A17', letterSpacing: '-0.01em' }}>
                            {profile?.username ? `@${profile.username}` : friendId.slice(0, 8)}
                          </div>
                          {profile?.handicapIndex != null && (
                            <div style={{ fontSize: 11, color: '#494F49' }}>HCP {profile.handicapIndex.toFixed(1)}</div>
                          )}
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${selected ? '#1E4D38' : '#9AA09A'}`, background: selected ? '#1E4D38' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <div style={{ width: 8, height: 8, borderRadius: 4, background: '#F2F5F1' }} />}
                        </div>
                      </button>
                    )
                  })}
                  {filteredFriends.length === 0 && friendSearch && (
                    <div style={{ fontSize: 13, color: '#6B716B', padding: '8px 0' }}>No friends match "{friendSearch}"</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E4E6E1', flexShrink: 0 }}>
          <button onClick={handleCreate} disabled={loading} style={{ width: '100%', background: loading ? '#9AA09A' : '#1E4D38', color: '#F2F5F1', border: 'none', borderRadius: 14, padding: '14px', fontFamily: font.body, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
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
  const labelCell: React.CSSProperties = { width: L, minWidth: L, textAlign: 'left', paddingLeft: 14, border: 'none', verticalAlign: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B716B' }
  const totalCell: React.CSSProperties = { width: T, minWidth: T, textAlign: 'center', border: 'none', verticalAlign: 'middle' }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: L + holes.length * C + T }}>
        <tbody>
          <tr style={{ background: '#1E4D38' }}>
            <td style={{ ...labelCell, color: 'rgba(242,245,241,0.4)', padding: '8px 0 8px 14px' }}>HOLE</td>
            {holes.map(h => (
              <td key={h} style={{ ...cellBase, fontSize: 12, fontWeight: 700, color: '#F2F5F1', fontFamily: font.display, padding: '8px 0' }}>{h}</td>
            ))}
            <td style={{ ...totalCell, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(242,245,241,0.4)', padding: '8px 0' }}>{subtotalLabel}</td>
          </tr>

          <tr style={{ background: '#EFF1ED' }}>
            <td style={{ ...labelCell, padding: '7px 0 7px 14px' }}>PAR</td>
            {holes.map((h, i) => (
              <td key={h} style={{ ...cellBase, fontSize: 13, fontWeight: 600, color: '#494F49', padding: '7px 0' }}>{pars[i]}</td>
            ))}
            <td style={{ ...totalCell, fontSize: 14, fontWeight: 700, color: '#171A17', fontFamily: font.display, padding: '7px 0' }}>{parTotal}</td>
          </tr>

          {players.map((player, pi) => {
            const isMe = player.userId === userId
            const subtotal = holes.reduce((sum, h) => sum + (player.scores[h] ?? 0), 0)
            const hasAnyScore = holes.some(h => player.scores[h] != null)
            const shortName = isMe ? 'YOU' : player.name.replace('@', '').slice(0, 3).toUpperCase()
            return (
              <tr key={player.userId} style={{ background: pi % 2 === 0 ? '#F2F5F1' : '#F7F8F5' }}>
                <td style={{ ...labelCell, padding: '4px 0 4px 14px', color: isMe ? '#1E4D38' : '#6B716B' }}>{shortName}</td>
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
                <td style={{ ...totalCell, fontFamily: font.display, fontSize: 16, fontWeight: 700, color: '#171A17', padding: '4px 0' }}>
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
    <div style={{ position: 'fixed', inset: 0, background: '#EFF1ED', zIndex: 200, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#1E4D38', color: '#F2F5F1', padding: `${isMobile ? 'calc(env(safe-area-inset-top) + 14px)' : '18px'} 20px 14px`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 680, margin: '0 auto' }}>
          <button onClick={onClose} style={{ background: 'rgba(242,245,241,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#F2F5F1', cursor: 'pointer', fontSize: 13, fontFamily: font.body }}>
            ← Back
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>{liveMatch.courseName}</div>
            <div style={{ fontSize: 11, color: '#A7C0AC', marginTop: 1 }}>
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
            <div style={{ background: isWinner ? '#1E4D38' : '#F2F5F1', border: `1px solid ${isWinner ? '#1E4D38' : '#E4E6E1'}`, borderRadius: 16, padding: '14px 20px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, color: isWinner ? '#F2F5F1' : '#171A17', letterSpacing: '-0.02em', marginBottom: 4 }}>
                {liveMatch.winnerId ? (isWinner ? 'You won!' : `${accepted.find(p => p.userId === liveMatch.winnerId)?.profile?.username ? `@${accepted.find(p => p.userId === liveMatch.winnerId)?.profile?.username}` : 'Opponent'} won`) : "It's a tie!"}
              </div>
              {liveMatch.wagerPerPlayer > 0 && liveMatch.winnerId && (
                <div style={{ fontSize: 13, color: isWinner ? '#A7C0AC' : '#494F49' }}>
                  {isWinner ? `+$${liveMatch.wagerPerPlayer * accepted.length} credited to wallet` : `-$${liveMatch.wagerPerPlayer} wagered`}
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#C25E33', marginBottom: 14 }}>{error}</div>
          )}

          {/* Score card — rounds style */}
          <div style={{ background: '#1E4D38', borderRadius: 20, padding: '18px 20px', marginBottom: 16 }}>
            {/* Tee + date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: liveMatch.courseName === SANTA_MARIA.name ? SANTA_MARIA.teeColor : '#A7C0AC', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#A7C0AC', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                {tee} · {matchDate}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: font.display, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#F2F5F1', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  {liveMatch.courseName}
                </div>
                <div style={{ fontSize: 12, color: '#A7C0AC', marginTop: 6 }}>
                  Par {totalPar} · {liveMatch.holes} holes
                </div>
              </div>
              {myTotal > 0 && (
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: font.display, fontSize: 48, fontWeight: 700, color: '#F2F5F1', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {myTotal}
                  </div>
                  {myVsPar !== null && (
                    <div style={{ fontSize: 16, fontWeight: 700, color: myVsPar <= 0 ? '#2F6E4C' : '#C25E33', textAlign: 'right' }}>
                      {myVsPar > 0 ? `+${myVsPar}` : myVsPar === 0 ? 'E' : myVsPar}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Front 9 */}
          <div style={{ background: '#F2F5F1', border: '1px solid #E4E6E1', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
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
            <div style={{ background: '#F2F5F1', border: '1px solid #E4E6E1', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
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
            <div style={{ textAlign: 'center', fontSize: 13, color: '#6B716B', marginBottom: 20 }}>
              Tap any score cell to type your result
            </div>
          )}

          {/* Complete match button */}
          {liveMatch.status === 'active' && allComplete && (
            <button
              onClick={handleComplete}
              disabled={completing}
              style={{ width: '100%', background: '#C25E33', border: 'none', borderRadius: 14, padding: '16px', color: '#F2F5F1', fontSize: 15, fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer', fontFamily: font.body, transition: 'background 0.15s' }}
            >
              {completing ? 'Finalising…' : 'Submit scorecard →'}
            </button>
          )}
        </div>
      </div>

      {/* Score entry drawer — slides up when a cell is tapped */}
      {activeHole !== null && liveMatch.status === 'active' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#EFF1ED', borderTop: '1px solid #E4E6E1', borderRadius: '20px 20px 0 0', padding: '20px 24px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)', zIndex: 10, boxShadow: '0 -8px 24px rgba(31,58,42,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: '#171A17', letterSpacing: '-0.02em' }}>
                Hole {activeHole}
              </div>
              <div style={{ fontSize: 12, color: '#494F49', marginTop: 2 }}>
                Par {pars[activeHole - 1]}
              </div>
            </div>
            <button onClick={() => setActiveHole(null)} style={{ background: '#F2F5F1', border: '1px solid #E4E6E1', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={14} color="#494F49" />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center', marginBottom: 18 }}>
            <button
              onClick={() => setScoreVal(v => Math.max(1, v - 1))}
              style={{ width: 48, height: 48, borderRadius: 24, background: '#F2F5F1', border: '1px solid #E4E6E1', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300, color: '#171A17' }}
            >
              −
            </button>
            <div style={{ fontFamily: font.display, fontSize: 64, fontWeight: 700, color: '#171A17', letterSpacing: '-0.04em', lineHeight: 1, minWidth: 72, textAlign: 'center' }}>
              {scoreVal}
            </div>
            <button
              onClick={() => setScoreVal(v => Math.min(15, v + 1))}
              style={{ width: 48, height: 48, borderRadius: 24, background: '#F2F5F1', border: '1px solid #E4E6E1', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300, color: '#171A17' }}
            >
              +
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', background: saving ? '#9AA09A' : '#1E4D38', color: '#F2F5F1', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: font.body }}
          >
            {saving ? 'Saving…' : 'Save Score'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main MatchesView ──────────────────────────────────────────────────
type MatchesData = { matches: Match[]; wallet: Wallet | null; friends: { friendId: string; profile?: PublicProfile }[] }

export default function MatchesView({ userId, isMobile = false }: Props) {
  const qc = useQueryClient()
  const toast = useToast()
  const [showNew,       setShowNew]       = useState(false)
  const [scoring,       setScoring]       = useState<Match | null>(null)
  const [walletInput,   setWalletInput]   = useState('')
  const [walletAction,  setWalletAction]  = useState<'add' | 'withdraw' | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const matchesKey = ['matchesData', userId]

  const { data, isLoading: loading } = useQuery({
    queryKey: matchesKey,
    queryFn: async (): Promise<MatchesData> => {
      const [w, m] = await Promise.all([fetchOrCreateWallet(userId), fetchMatches(userId)])
      const fs = await fetchFriendships(userId)
      const friendIds = fs.filter(f => f.status === 'accepted').map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
      const profiles = await fetchProfilesForIds(friendIds)
      return { matches: m, wallet: w, friends: friendIds.map(id => ({ friendId: id, profile: profiles.find(p => p.userId === id) })) }
    },
  })
  const matches = data?.matches ?? []
  const wallet  = data?.wallet ?? null
  const friends = data?.friends ?? []
  const refresh = () => qc.invalidateQueries({ queryKey: matchesKey })
  const patch   = (fn: (d: MatchesData) => MatchesData) =>
    qc.setQueryData<MatchesData>(matchesKey, old => (old ? fn(old) : old))

  // Realtime: refresh on new invites AND when any match status changes (pending→active, etc.)
  useEffect(() => {
    const inval = () => qc.invalidateQueries({ queryKey: ['matchesData', userId] })
    const ch = supabase
      .channel(`match-invites-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_players', filter: `user_id=eq.${userId}` }, inval)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, inval)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, qc])

  const handleWalletSubmit = async () => {
    const amount = Math.min(10000, Math.max(0, parseInt(walletInput) || 0))
    if (!amount) return
    setWalletLoading(true)
    try {
      const w = walletAction === 'add'
        ? await topUpWallet(userId, amount)
        : await withdrawFromWallet(userId, amount)
      patch(d => ({ ...d, wallet: w })); setWalletInput(''); setWalletAction(null)
      toast(walletAction === 'add' ? `Added $${amount}` : `Withdrew $${amount}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed.')
    } finally { setWalletLoading(false) }
  }

  const handleAccept = async (matchId: string, wager: number) => {
    try { await acceptMatchInvite(matchId, userId, wager); refresh() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to accept.') }
  }

  const handleDecline = async (matchId: string) => {
    try { await declineMatchInvite(matchId, userId); patch(d => ({ ...d, matches: d.matches.filter(m => m.id !== matchId) })) }
    catch { setError('Failed to decline.') }
  }

  const handleCancel = async (match: Match) => {
    try { await cancelMatch(match); refresh() }
    catch { setError('Failed to cancel.') }
  }

  const handleStart = async (match: Match) => {
    try { await activateMatch(match.id); refresh() }
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
        background: isDark ? '#1E4D38' : '#FFFFFF',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #E4E6E1',
        borderRadius: 22,
        boxShadow: isDark
          ? '0 12px 40px rgba(31,58,42,0.26), inset 0 1px 0 rgba(255,255,255,0.16)'
          : 'none',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: 'transparent', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(31,58,42,0.07)' }}>
          <TrophyIcon size={18} color={isDark ? '#C25E33' : '#494F49'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: isDark ? '#F2F5F1' : '#171A17', letterSpacing: '-0.02em' }}>{match.courseName}</div>
            <div style={{ fontSize: 12, color: isDark ? '#A7C0AC' : '#494F49', marginTop: 2 }}>
              {MODE_LABELS[match.gameMode]} · {match.holes} holes{match.wagerPerPlayer > 0 && ` · $${match.wagerPerPlayer} each`}
            </div>
          </div>
          {isDone && iWon && <div style={{ fontSize: 11, fontWeight: 700, color: '#C25E33', background: 'rgba(217,130,77,0.22)', border: '1px solid rgba(217,130,77,0.32)', borderRadius: 999, padding: '4px 11px', letterSpacing: '0.02em' }}>Won</div>}
          {isDone && !iWon && match.winnerId && <div style={{ fontSize: 11, fontWeight: 600, color: '#494F49', background: 'rgba(201,192,168,0.35)', border: '1px solid rgba(201,192,168,0.45)', borderRadius: 999, padding: '4px 11px' }}>Lost</div>}
          {isDone && !match.winnerId && <div style={{ fontSize: 11, fontWeight: 600, color: '#494F49', background: 'rgba(201,192,168,0.35)', border: '1px solid rgba(201,192,168,0.45)', borderRadius: 999, padding: '4px 11px' }}>Tie</div>}
        </div>

        {/* Players inset */}
        <div style={{ margin: '10px 12px', background: isDark ? 'rgba(255,255,255,0.06)' : '#EFF1ED', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E6E1', borderRadius: 14, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
          {others.map(p => (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar profile={p.profile} size={28} />
              <span style={{ fontSize: 13, color: isDark ? '#E8F0E0' : '#171A17', fontWeight: 500 }}>{p.profile?.username ? `@${p.profile.username}` : 'Opponent'}</span>
            </div>
          ))}
          {isActive && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, color: '#F2F5F1', letterSpacing: '-0.03em' }}>{myTotal || '—'}</div>
              <div style={{ fontSize: 10, color: '#A7C0AC' }}>{holesPlayed}/{match.holes} holes</div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ padding: '0 12px 12px', display: 'flex', gap: 8 }}>
          {isInvite && (
            <>
              <button
                onClick={() => handleDecline(match.id)}
                style={{ flex: 1, background: '#EFF1ED', border: '1px solid #E4E6E1', borderRadius: 13, padding: '11px', fontSize: 13, color: '#494F49', cursor: 'pointer', fontFamily: font.body, transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Decline</button>
              <button
                onClick={() => handleAccept(match.id, match.wagerPerPlayer)}
                style={{ flex: 2, background: '#1E4D38', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 13, padding: '11px', fontSize: 13, fontWeight: 600, color: '#F2F5F1', cursor: 'pointer', fontFamily: font.body, transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Accept{match.wagerPerPlayer > 0 ? ` · $${match.wagerPerPlayer}` : ''}</button>
            </>
          )}
          {isActive && (
            <>
              <button
                onClick={() => setScoring(match)}
                style={{ flex: 2, background: '#FFFFFF', border: '1px solid #E4E6E1', borderRadius: 13, padding: '11px', fontSize: 13, fontWeight: 600, color: '#1E4D38', cursor: 'pointer', fontFamily: font.body, boxShadow: '0 2px 10px rgba(31,29,23,0.07)', transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Enter Scores →</button>
              <button
                onClick={() => handleCancel(match)}
                style={{ flex: 1, background: 'rgba(242,245,241,0.20)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 13, padding: '11px', fontSize: 12, color: '#A7C0AC', cursor: 'pointer', fontFamily: font.body, transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Cancel</button>
            </>
          )}
          {isDone && (
            <button
              onClick={() => setScoring(match)}
              style={{ flex: 1, background: isDark ? '#FFFFFF' : '#EFF1ED', border: '1px solid #E4E6E1', borderRadius: 13, padding: '11px', fontSize: 13, fontWeight: 600, color: '#171A17', cursor: 'pointer', fontFamily: font.body, boxShadow: '0 2px 10px rgba(31,29,23,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'transform 0.12s ease' }}
              onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
              onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
            >View Scorecard <span style={{ fontSize: 12, opacity: 0.45 }}>›</span></button>
          )}
          {canStart && (
            <>
              <button
                onClick={() => handleStart(match)}
                style={{ flex: 2, background: 'rgba(92,122,77,0.92)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 13, padding: '11px', fontSize: 13, fontWeight: 600, color: '#F2F5F1', cursor: 'pointer', fontFamily: font.body, transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Start Match →</button>
              <button
                onClick={() => handleCancel(match)}
                style={{ flex: 1, background: 'rgba(240,235,221,0.72)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: 13, padding: '11px', fontSize: 12, color: '#494F49', cursor: 'pointer', fontFamily: font.body, transition: 'transform 0.12s ease' }}
                onMouseDown={e => pressFn(e.currentTarget, true)} onMouseUp={e => pressFn(e.currentTarget, false)} onMouseLeave={e => pressFn(e.currentTarget, false)}
                onTouchStart={e => pressFn(e.currentTarget, true)} onTouchEnd={e => pressFn(e.currentTarget, false)}
              >Cancel</button>
            </>
          )}
          {match.status === 'pending' && me?.status === 'accepted' && !canStart && (
            <button
              onClick={() => handleCancel(match)}
              style={{ flex: 1, background: 'rgba(240,235,221,0.72)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: 13, padding: '11px', fontSize: 13, color: '#494F49', cursor: 'pointer', fontFamily: font.body, transition: 'transform 0.12s ease' }}
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
        <h1 style={{ fontFamily: font.display, fontSize: isMobile ? 30 : 36, fontWeight: 600, color: '#171A17', letterSpacing: '-0.02em', margin: '0 0 4px', lineHeight: 1 }}>
          Matches
        </h1>
        <p style={{ fontSize: 14, color: '#6B716B', margin: '0 0 18px' }}>Wagered rounds against your friends.</p>

        {wallet && (
          <div style={{ background: '#1E4D38', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: walletAction ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(242,245,241,0.6)', marginBottom: 4 }}>Wallet balance</div>
                <div style={{ fontFamily: font.display, fontSize: 30, fontWeight: 600, color: '#F2F5F1', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  ${wallet.balance.toLocaleString()}<span style={{ fontSize: 13, color: 'rgba(242,245,241,0.55)', fontWeight: 400, marginLeft: 4 }}>USD</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setWalletAction(walletAction === 'add' ? null : 'add')} style={{ background: '#FFFFFF', color: '#1E4D38', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}>Add</button>
                <button onClick={() => setWalletAction(walletAction === 'withdraw' ? null : 'withdraw')} style={{ background: 'rgba(255,255,255,0.10)', color: '#F2F5F1', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}>Withdraw</button>
              </div>
            </div>
            {walletAction && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 16, color: '#F2F5F1', fontWeight: 500 }}>$</span>
                <input type="number" min="1" max="10000" value={walletInput} onChange={e => setWalletInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleWalletSubmit() }} placeholder={walletAction === 'add' ? 'Amount to add (max $10,000)' : 'Amount to withdraw'} autoFocus style={{ flex: 1, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, padding: '10px 12px', fontSize: 16, color: '#F2F5F1', outline: 'none', fontFamily: font.body }} />
                <button onClick={handleWalletSubmit} disabled={walletLoading} style={{ background: '#FFFFFF', color: '#1E4D38', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: walletLoading ? 'not-allowed' : 'pointer', fontFamily: font.body, whiteSpace: 'nowrap' }}>
                  {walletLoading ? '…' : walletAction === 'add' ? 'Add funds' : 'Withdraw'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#C25E33', marginBottom: 20 }}>{error}</div>
      )}

      <button
        onClick={() => setShowNew(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: '#FFFFFF', border: '1px solid #E4E6E1', borderRadius: 16, padding: '16px 18px', marginBottom: 28, cursor: 'pointer', transition: 'background 0.15s, transform 0.16s ease' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EFF1ED' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#E8EFEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PlusIcon size={20} color="#1E4D38" />
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: '#171A17', letterSpacing: '-0.01em' }}>Start a new match</div>
          <div style={{ fontSize: 13, color: '#6B716B', marginTop: 2 }}>Pick a course, invite friends, set a wager</div>
        </div>
      </button>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ background: 'rgba(242,245,241,0.70)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 22, padding: '18px 20px' }}>
              <Skeleton width="40%" height={11} />
              <Skeleton width="70%" height={18} style={{ marginTop: 12 }} />
              <Skeleton width="50%" height={12} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {myInvites.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#494F49', marginBottom: 12 }}>Invites ({myInvites.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myInvites.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {active.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#494F49', marginBottom: 12 }}>Active ({active.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {active.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {myPending.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#494F49', marginBottom: 12 }}>Waiting for players</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myPending.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#494F49', marginBottom: 12 }}>Completed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {completed.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}
          {matches.length === 0 && (
            <EmptyState
              icon={<TrophyIcon size={24} color="#9AA09A" />}
              title="No matches yet"
              subtitle="Start a match and challenge your friends."
            />
          )}
        </>
      )}

      {showNew && (
        <Portal>
          <NewMatchModal userId={userId} wallet={wallet} friends={friends} onClose={() => setShowNew(false)} onCreate={m => { patch(d => ({ ...d, matches: [m, ...d.matches] })); refresh(); toast('Match created') }} isMobile={isMobile} />
        </Portal>
      )}

      {scoring && (
        <Portal>
          <ScoringModal
            match={scoring}
            userId={userId}
            onClose={() => setScoring(null)}
            onMatchUpdated={updated => {
              patch(d => ({ ...d, matches: d.matches.map(m => m.id === updated.id ? updated : m) }))
              setScoring(updated)
              if (updated.status === 'completed') refresh()  // refetch wallet balance + points after payout
            }}
            isMobile={isMobile}
          />
        </Portal>
      )}
    </div>
  )
}

