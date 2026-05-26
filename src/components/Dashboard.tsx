import { useRef, useState, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { UserProfile, Round, View } from '../types'
import { getRank, RANK_TIERS } from '../lib/points'
import { fetchFriendFeed, type FeedItem, type FeedActor } from '../lib/feed'
import { ShieldIcon, UsersIcon, TrophyIcon } from './Icons'

gsap.registerPlugin(useGSAP)

// ── helpers ───────────────────────────────────────────────────────────────────

function useLiveDate() {
  const [date, setDate] = useState(new Date())
  useEffect(() => {
    const scheduleNext = () => {
      const now      = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return setTimeout(() => { setDate(new Date()); setInterval(() => setDate(new Date()), 86_400_000) }, tomorrow.getTime() - now.getTime())
    }
    const t = scheduleNext()
    return () => clearTimeout(t)
  }, [])
  return date
}

function greeting(name: string): string {
  const h    = new Date().getHours()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return name ? `Good ${part}, ${name}.` : `Good ${part}.`
}

function relTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function actorName(a: FeedActor): string {
  return a.firstName || (a.username ? `@${a.username}` : 'Someone')
}

function toParLabel(diff: number | null | undefined): { text: string; color: string } {
  if (diff === null || diff === undefined) return { text: '', color: '#6B6857' }
  if (diff === 0) return { text: 'E', color: '#6B6857' }
  if (diff < 0)  return { text: `${diff}`, color: '#5C7A4D' }
  return { text: `+${diff}`, color: '#C0603A' }
}

function modeLabel(m?: string): string {
  const map: Record<string, string> = {
    stroke: 'Stroke play', match_play: 'Match play', skins: 'Skins', wolf: 'Wolf',
  }
  return m ? (map[m] ?? m) : 'Match'
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function FeedAvatar({ actor, size = 38 }: { actor: FeedActor; size?: number }) {
  const initial = (actor.firstName?.[0] ?? actor.username?.[0] ?? '?').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: '#1F3A2A', overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {actor.avatarUrl
        ? <img src={actor.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: size * 0.4, color: '#D9824D' }}>{initial}</span>
      }
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  profile: UserProfile | null
  userId: string
  rounds: Round[]
  onNavigate: (v: View) => void
  isMobile?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard({ profile, userId, rounds, onNavigate, isMobile = false }: Props) {
  const containerRef = useRef<HTMLElement>(null)
  const [feed,        setFeed]        = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(true)

  const date = useLiveDate()
  const px   = isMobile ? 20 : 40

  useEffect(() => {
    if (!userId) return
    setFeedLoading(true)
    fetchFriendFeed(userId)
      .then(setFeed)
      .catch(console.error)
      .finally(() => setFeedLoading(false))
  }, [userId])

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (containerRef.current) {
        gsap.fromTo(
          Array.from(containerRef.current.children),
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.09, ease: 'power3.out', delay: 0.05 }
        )
      }
    })
    return () => mm.revert()
  }, { scope: containerRef })

  // ── Rank math ──
  const points   = profile?.rankedPoints ?? 0
  const rank     = getRank(points)
  const rankIdx  = RANK_TIERS.findIndex(t => t.name === rank.name)
  const nextTier = rankIdx < RANK_TIERS.length - 1 ? RANK_TIERS[rankIdx + 1] : null
  const progress = nextTier
    ? Math.min(1, (points - rank.minPoints) / (nextTier.minPoints - rank.minPoints))
    : 1

  // ── Last round ──
  const lastRound  = rounds[0] ?? null
  const lastScore  = lastRound?.roundHoles.length
    ? lastRound.roundHoles.reduce((s, h) => s + (h.score ?? 0), 0)
    : null
  const lastPar    = lastRound?.roundHoles.length
    ? lastRound.roundHoles.reduce((s, h) => s + h.par, 0)
    : null
  const lastDiff   = lastScore !== null && lastPar !== null ? lastScore - lastPar : null
  const lastDiffUI = toParLabel(lastDiff)

  const displayName = profile?.firstName ?? profile?.username ?? ''

  // ── Card style shared ──
  const glassCard: React.CSSProperties = {
    background: 'rgba(250,246,234,0.65)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: 20,
    boxShadow: '0 2px 12px rgba(31,29,23,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
  }

  return (
    <main
      ref={containerRef}
      style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 22 : 40}px ${px}px ${isMobile ? 112 : 64}px` }}
    >

      {/* ── Greeting ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: isMobile ? 27 : 32, fontWeight: 700,
          color: '#1F1D17', margin: 0,
          letterSpacing: '-0.03em', lineHeight: 1.1,
        }}>
          {greeting(displayName)}
        </h1>
        <span style={{ fontSize: 12, color: '#B5AC95', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* ── Rank Card ──────────────────────────────────────── */}
      <div style={{
        background: '#1F3A2A',
        borderRadius: 24, padding: '20px 22px 22px',
        marginBottom: 14,
        boxShadow: '0 10px 36px rgba(31,58,42,0.24), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}>
        {/* Avatar + name + points */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 23,
            background: '#2A4D39', border: '2px solid rgba(250,246,234,0.14)',
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 19, color: '#D9824D' }}>
                  {(profile?.firstName?.[0] ?? profile?.username?.[0] ?? '?').toUpperCase()}
                </span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {profile?.firstName || (profile?.username ? `@${profile.username}` : 'Golfer')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <ShieldIcon size={11} color={rank.color} />
              <span style={{ fontSize: 11, fontWeight: 700, color: rank.color, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}>
                {rank.name.toUpperCase()}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.045em', lineHeight: 1 }}>
              {points.toLocaleString()}
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(250,246,234,0.38)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 2 }}>points</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ height: 5, background: 'rgba(250,246,234,0.10)', borderRadius: 3, overflow: 'hidden', marginBottom: 7 }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: nextTier ? rank.color : '#D9824D',
              width: `${Math.round(progress * 100)}%`,
              transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(250,246,234,0.32)', fontFamily: "'DM Sans', sans-serif" }}>
              {rank.name}
            </span>
            {nextTier ? (
              <span style={{ fontSize: 11, color: 'rgba(250,246,234,0.45)', fontFamily: "'DM Sans', sans-serif" }}>
                {nextTier.minPoints - points} pts to{' '}
                <span style={{ color: nextTier.color, fontWeight: 600 }}>{nextTier.name}</span>
              </span>
            ) : (
              <span style={{ fontSize: 11, color: '#D9824D', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                Max rank
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Stats ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 30 }}>

        {/* Last round */}
        <div style={{ ...glassCard, padding: '15px 10px 13px', textAlign: 'center' }}>
          {lastScore !== null ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {lastScore}
                </span>
                {lastDiff !== null && (
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: lastDiffUI.color, lineHeight: 1 }}>
                    {lastDiffUI.text}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 9.5, color: '#B5AC95', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 6 }}>Last round</div>
              <div style={{ fontSize: 10.5, color: '#6B6857', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>
                {lastRound!.courseName.split(' ').slice(0, 3).join(' ')}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, color: '#C9C0A8', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700 }}>—</div>
              <div style={{ fontSize: 9.5, color: '#B5AC95', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 6 }}>Last round</div>
              <div style={{ fontSize: 10.5, color: '#C9C0A8', marginTop: 2 }}>None yet</div>
            </>
          )}
        </div>

        {/* Handicap */}
        <div style={{ ...glassCard, padding: '15px 10px 13px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {profile?.handicapIndex != null ? profile.handicapIndex.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: 9.5, color: '#B5AC95', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 6 }}>Handicap</div>
          <div style={{ fontSize: 10.5, color: '#6B6857', marginTop: 2 }}>index</div>
        </div>

        {/* W / L record */}
        <div style={{ ...glassCard, padding: '15px 10px 13px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em', lineHeight: 1.25 }}>
            {profile?.wins ?? 0}
            <span style={{ color: '#5C7A4D' }}>W</span>
            {' '}
            {profile?.losses ?? 0}
            <span style={{ color: '#C0603A' }}>L</span>
          </div>
          {(profile?.ties ?? 0) > 0 && (
            <div style={{ fontSize: 11, color: '#6B6857', lineHeight: 1 }}>
              {profile!.ties}T
            </div>
          )}
          <div style={{ fontSize: 9.5, color: '#B5AC95', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: (profile?.ties ?? 0) > 0 ? 4 : 6 }}>Record</div>
        </div>
      </div>

      {/* ── Friend Activity ────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 12 }}>
          Friend Activity
        </div>

        {feedLoading ? (
          <div style={{ ...glassCard, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#B5AC95' }}>Loading…</div>
          </div>

        ) : feed.length === 0 ? (
          <div style={{ ...glassCard, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26, background: '#F0EBDD',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <UsersIcon size={22} color="#C9C0A8" />
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#C9C0A8', marginBottom: 6 }}>
              Nothing here yet
            </div>
            <div style={{ fontSize: 13, color: '#B5AC95', marginBottom: 20, lineHeight: 1.5 }}>
              Add friends to see their rounds and matches.
            </div>
            <button
              onClick={() => onNavigate('friends')}
              style={{
                background: '#1F3A2A', color: '#FAF6EA', border: 'none',
                borderRadius: 999, padding: '10px 20px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <UsersIcon size={14} color="#FAF6EA" /> Find Friends
            </button>
          </div>

        ) : (
          <div style={{ ...glassCard, overflow: 'hidden' }}>
            {feed.map((item, i) => {
              const isRound = item.type === 'round'
              const par     = toParLabel(item.scoreToPar)
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '13px 16px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(224,216,197,0.45)',
                  }}
                >
                  {/* Left: type indicator dot + avatar */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 2 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: 4, flexShrink: 0,
                      background: isRound
                        ? '#5C7A4D'
                        : item.isWin ? '#D9824D' : '#C9C0A8',
                    }} />
                    <FeedAvatar actor={item.actor} size={36} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                    {isRound ? (
                      <>
                        <div style={{ fontSize: 13.5, color: '#1F1D17', lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ fontWeight: 700 }}>{actorName(item.actor)}</span>
                          {item.totalScore !== null ? (
                            <>
                              {' shot a '}
                              <span style={{ fontWeight: 700, color: '#1F3A2A' }}>{item.totalScore}</span>
                              {item.scoreToPar !== null && (
                                <span style={{ fontWeight: 600, color: par.color, marginLeft: 3 }}>({par.text})</span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#6B6857' }}> logged a round</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#B5AC95', marginTop: 3 }}>
                          {item.holes}h · {item.courseName}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 13.5, color: '#1F1D17', lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ fontWeight: 700 }}>{actorName(item.actor)}</span>
                          {' '}
                          <span style={{ fontWeight: item.isWin ? 600 : 400, color: item.isWin ? '#5C7A4D' : '#6B6857' }}>
                            {item.isWin ? 'won' : 'played'} a match
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#B5AC95', marginTop: 3 }}>
                          {modeLabel(item.gameMode)}{item.courseName ? ` · ${item.courseName}` : ''}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{ fontSize: 11, color: '#C9C0A8', whiteSpace: 'nowrap', paddingTop: 2, flexShrink: 0 }}>
                    {relTime(item.timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick Actions ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => onNavigate('friends')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            ...glassCard, border: '1px solid rgba(224,216,197,0.6)',
            padding: '13px 10px', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500, color: '#1F1D17',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FAF6EA' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,246,234,0.65)' }}
        >
          <UsersIcon size={16} color="#1F3A2A" /> Friends
        </button>
        <button
          onClick={() => onNavigate('matches')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#1F3A2A', color: '#FAF6EA',
            border: 'none', borderRadius: 16,
            padding: '13px 10px', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
            transition: 'background 0.15s',
            boxShadow: '0 4px 16px rgba(31,58,42,0.18)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#16271D' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
        >
          <TrophyIcon size={16} color="#D9824D" /> Start a Match
        </button>
      </div>

    </main>
  )
}
