import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useState, useEffect } from 'react'
import type { UserProfile, Round, View } from '../types'
import { getRank, RANK_TIERS } from '../lib/points'
import { ShieldIcon, UsersIcon, TrophyIcon, ArrowRight } from './Icons'

gsap.registerPlugin(useGSAP)

// ── helpers ───────────────────────────────────────────────────────────────────

const TZ = 'America/Panama'

function useLiveDate() {
  const [date, setDate] = useState(new Date())
  useEffect(() => {
    const scheduleNext = () => {
      const now      = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return setTimeout(
        () => { setDate(new Date()); setInterval(() => setDate(new Date()), 86_400_000) },
        tomorrow.getTime() - now.getTime()
      )
    }
    const t = scheduleNext()
    return () => clearTimeout(t)
  }, [])
  return date
}

function panamaHour(): number {
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date()), 10)
}

function greeting(name: string): string {
  const h    = panamaHour()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return name ? `Good ${part}, ${name}.` : `Good ${part}.`
}

function relTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })
}

function toParLabel(diff: number | null | undefined): { text: string; color: string } {
  if (diff === null || diff === undefined) return { text: '', color: '#6B6857' }
  if (diff === 0) return { text: 'E', color: '#6B6857' }
  if (diff < 0)  return { text: `${diff}`, color: '#5C7A4D' }
  return { text: `+${diff}`, color: '#C0603A' }
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

export default function Dashboard({ profile, rounds, onNavigate, isMobile = false }: Props) {
  const containerRef = useRef<HTMLElement>(null)
  const date = useLiveDate()
  const px   = isMobile ? 20 : 40

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
  const lastRound = rounds[0] ?? null
  const lastScore = lastRound?.roundHoles.length
    ? lastRound.roundHoles.reduce((s, h) => s + (h.score ?? 0), 0)
    : null
  const lastPar   = lastRound?.roundHoles.length
    ? lastRound.roundHoles.reduce((s, h) => s + h.par, 0)
    : null
  const lastDiff  = lastScore !== null && lastPar !== null ? lastScore - lastPar : null

  const displayName = profile?.firstName ?? profile?.username ?? ''

  // ── Recent rounds (last 4) ──
  const recentRounds = rounds.slice(0, 4)

  // ── Shared style ──
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

      {/* ── Date pill ──────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(250,246,234,0.65)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.55)',
          borderRadius: 999, padding: '6px 14px',
          fontSize: 12, fontWeight: 500, color: '#6B6857',
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: '#D9824D', flexShrink: 0 }} />
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ })}
        </div>
      </div>

      {/* ── Greeting ───────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: isMobile ? 27 : 32, fontWeight: 700,
          color: '#1F1D17', margin: 0,
          letterSpacing: '-0.03em', lineHeight: 1.1,
        }}>
          {greeting(displayName)}
        </h1>
      </div>

      {/* ── Rank Card ──────────────────────────────────────── */}
      <div style={{
        background: '#1F3A2A',
        borderRadius: 24, padding: '20px 22px 22px',
        marginBottom: 14,
        boxShadow: '0 10px 36px rgba(31,58,42,0.24), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}>
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
              <span style={{ fontSize: 11, color: '#D9824D', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Max rank</span>
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
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: toParLabel(lastDiff).color, lineHeight: 1 }}>
                    {toParLabel(lastDiff).text}
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

        {/* Record — flex-centered to fix alignment */}
        <div style={{ ...glassCard, padding: '15px 10px 13px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {profile?.wins ?? 0}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5C7A4D', lineHeight: 1 }}>W</span>
            <span style={{ fontSize: 8, color: '#C9C0A8' }}>·</span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {profile?.losses ?? 0}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#C0603A', lineHeight: 1 }}>L</span>
          </div>
          {(profile?.ties ?? 0) > 0 && (
            <div style={{ fontSize: 11, color: '#6B6857', marginTop: 2 }}>{profile!.ties}T</div>
          )}
          <div style={{ fontSize: 9.5, color: '#B5AC95', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 6 }}>Record</div>
        </div>
      </div>

      {/* ── Recent Rounds ──────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#6B6857', textTransform: 'uppercase' }}>
            Recent Rounds
          </div>
          {recentRounds.length > 0 && (
            <button
              onClick={() => onNavigate('rounds')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 12, color: '#B5AC95', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              }}
            >
              View all <ArrowRight size={13} color="#B5AC95" />
            </button>
          )}
        </div>

        {recentRounds.length === 0 ? (
          <div style={{ ...glassCard, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26, background: '#F0EBDD',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <TrophyIcon size={22} color="#C9C0A8" />
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#C9C0A8', marginBottom: 6 }}>
              No rounds yet
            </div>
            <div style={{ fontSize: 13, color: '#B5AC95', marginBottom: 20, lineHeight: 1.5 }}>
              Log your first round and track your progress.
            </div>
            <button
              onClick={() => onNavigate('rounds')}
              style={{
                background: '#1F3A2A', color: '#FAF6EA', border: 'none',
                borderRadius: 999, padding: '10px 20px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Log a round
            </button>
          </div>
        ) : (
          <div style={{ ...glassCard, overflow: 'hidden' }}>
            {recentRounds.map((round, i) => {
              const holes  = round.roundHoles
              const score  = holes.length ? holes.reduce((s, h) => s + (h.score ?? 0), 0) : null
              const par    = holes.length ? holes.reduce((s, h) => s + h.par, 0) : null
              const diff   = score !== null && par !== null ? score - par : null
              const parUI  = toParLabel(diff)
              const played = new Date(round.playedAt)
              const month  = played.toLocaleDateString('en-US', { month: 'short', timeZone: TZ })
              const day    = played.toLocaleDateString('en-US', { day: 'numeric', timeZone: TZ })

              return (
                <div
                  key={round.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '13px 16px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(224,216,197,0.45)',
                  }}
                >
                  {/* Date block */}
                  <div style={{
                    width: 38, flexShrink: 0, textAlign: 'center',
                    background: '#F0EBDD', borderRadius: 10, padding: '6px 4px',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#D9824D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{month}</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#1F1D17', lineHeight: 1.1 }}>{day}</div>
                  </div>

                  {/* Course info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {round.courseName}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#B5AC95', marginTop: 2 }}>
                      {round.holes} holes · {relTime(round.playedAt)}
                    </div>
                  </div>

                  {/* Score */}
                  {score !== null ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {score}
                      </div>
                      {diff !== null && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: parUI.color, marginTop: 1 }}>
                          {parUI.text}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#C9C0A8', fontStyle: 'italic' }}>—</div>
                  )}
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
