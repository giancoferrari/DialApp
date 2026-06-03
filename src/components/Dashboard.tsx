import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useState, useEffect } from 'react'
import type { UserProfile, Round, View } from '../types'
import { getRank, RANK_TIERS, POINTS_WIN, POINTS_LOSS, POINTS_TIE } from '../lib/points'
import { ShieldIcon, UsersIcon, ScorecardIcon, MedalIcon, CloseIcon, ChevronRightIcon, CheckIcon } from './Icons'
import Feed from './Feed'
import Portal from './Portal'

gsap.registerPlugin(useGSAP)

// ── Ranks & points info (opened from the rank card) ────────────────────────────
function RanksModal({ points, isMobile, onClose, onNavigate }: { points: number; isMobile: boolean; onClose: () => void; onNavigate: (v: View) => void }) {
  const current = getRank(points)
  const listRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (listRef.current) {
        gsap.fromTo(Array.from(listRef.current.children),
          { opacity: 0, x: -14 },
          { opacity: 1, x: 0, duration: 0.42, stagger: 0.055, ease: 'power3.out' })
      }
    })
    return () => mm.revert()
  }, { scope: listRef })

  const perMatch = [
    { label: 'Win',  value: `+${POINTS_WIN}`,  color: '#5C7A4D', bg: 'rgba(92,122,77,0.12)' },
    { label: 'Tie',  value: `+${POINTS_TIE}`,  color: '#4A4235', bg: 'rgba(107,104,87,0.10)' },
    { label: 'Loss', value: `−${POINTS_LOSS}`, color: '#C0603A', bg: 'rgba(192,96,58,0.12)' },
  ]

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(31,29,23,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: isMobile ? '90vh' : '86vh', background: '#F5F0E6', borderRadius: isMobile ? '24px 24px 0 0' : 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(31,29,23,0.26)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid #E0D8C5', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase' }}>Ranked play</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>Ranks &amp; points</div>
            </div>
            <button onClick={onClose} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={14} color="#4A4235" />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 24px' }}>
            {/* Points per match */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 10 }}>Points per match</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {perMatch.map(p => (
                <div key={p.label} style={{ flex: 1, textAlign: 'center', background: p.bg, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16, padding: '14px 8px' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: p.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{p.value}</div>
                  <div style={{ fontSize: 10.5, color: p.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6, opacity: 0.85 }}>{p.label}</div>
                </div>
              ))}
            </div>

            {/* Tiers */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 10 }}>Tiers</div>
            <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RANK_TIERS.map(t => {
                const isCurrent = t.name === current.name
                const reached   = points >= t.minPoints
                return (
                  <div key={t.name} style={{
                    display: 'flex', alignItems: 'center', gap: 13,
                    background: isCurrent ? '#1F3A2A' : '#FAF6EA',
                    border: `1px solid ${isCurrent ? '#1F3A2A' : '#E0D8C5'}`,
                    borderRadius: 16, padding: '13px 16px',
                    boxShadow: isCurrent ? '0 6px 20px rgba(31,58,42,0.22)' : 'none',
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 17, background: t.color + (isCurrent ? '33' : '22'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ShieldIcon size={16} color={t.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em', color: isCurrent ? '#FAF6EA' : '#1F1D17' }}>{t.name}</span>
                        {isCurrent && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1F3A2A', background: '#D9824D', borderRadius: 999, padding: '2px 7px' }}>You're here</span>}
                      </div>
                      <div style={{ fontSize: 12, color: isCurrent ? 'rgba(250,246,234,0.6)' : '#6B5F4E', marginTop: 2 }}>
                        {t.minPoints.toLocaleString()}+ points
                      </div>
                    </div>
                    {reached
                      ? <CheckIcon size={16} color={isCurrent ? '#D9824D' : '#5C7A4D'} />
                      : <span style={{ fontSize: 11.5, color: '#8B8272', fontWeight: 600, flexShrink: 0 }}>{(t.minPoints - points).toLocaleString()} to go</span>}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => { onClose(); onNavigate('leaderboard') }}
              style={{ width: '100%', marginTop: 18, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}
            >
              See friends leaderboard
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

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


function toParLabel(diff: number | null | undefined): { text: string; color: string } {
  if (diff === null || diff === undefined) return { text: '', color: '#4A4235' }
  if (diff === 0) return { text: 'E', color: '#4A4235' }
  if (diff < 0)  return { text: `${diff}`, color: '#5C7A4D' }
  return { text: `+${diff}`, color: '#C0603A' }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  profile: UserProfile | null
  userId: string
  rounds: Round[]
  onNavigate: (v: View) => void
  onViewProfile?: (userId: string) => void
  isMobile?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard({ profile, userId, rounds, onNavigate, onViewProfile, isMobile = false }: Props) {
  const containerRef = useRef<HTMLElement>(null)
  const date = useLiveDate()
  const px   = isMobile ? 20 : 40
  const [showRanks, setShowRanks] = useState(false)
  const pointsRef = useRef<HTMLDivElement>(null)
  const barRef    = useRef<HTMLDivElement>(null)

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
  const pct = Math.round(progress * 100)

  // Count up the points and fill the rank bar on mount — small "alive" touch.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (pointsRef.current) {
        pointsRef.current.textContent = '0'
        const o = { v: 0 }
        gsap.to(o, { v: points, duration: 1.1, ease: 'power2.out', delay: 0.2, onUpdate: () => { if (pointsRef.current) pointsRef.current.textContent = Math.round(o.v).toLocaleString() } })
      }
      if (barRef.current) gsap.fromTo(barRef.current, { width: '0%' }, { width: `${pct}%`, duration: 1.2, ease: 'power3.out', delay: 0.3 })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (pointsRef.current) pointsRef.current.textContent = points.toLocaleString()
      if (barRef.current) barRef.current.style.width = `${pct}%`
    })
    return () => mm.revert()
  }, { dependencies: [points, pct] })

  // ── Last round ──
  const lastRound = rounds[0] ?? null
  const lastScore = lastRound?.roundHoles.length
    ? lastRound.roundHoles.reduce((s, h) => s + (h.score ?? 0), 0)
    : null
  const lastPar   = lastRound?.roundHoles.length
    ? lastRound.roundHoles.reduce((s, h) => s + h.par, 0)
    : null
  const lastDiff  = lastScore !== null && lastPar !== null ? lastScore - lastPar : null

  // ── Shared style ──
  const glassCard: React.CSSProperties = {
    background: 'rgba(250,246,234,0.80)',
    backdropFilter: 'blur(40px) saturate(190%)',
    WebkitBackdropFilter: 'blur(40px) saturate(190%)',
    border: '1px solid rgba(255,255,255,0.72)',
    borderRadius: 20,
    boxShadow: '0 4px 24px rgba(31,29,23,0.10), inset 0 1px 0 rgba(255,255,255,0.90)',
  }

  return (
    <main
      ref={containerRef}
      style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 22 : 40}px ${px}px ${isMobile ? 112 : 64}px` }}
    >

      {/* ── Date pill ──────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(250,246,234,0.65)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.55)',
          borderRadius: 999, padding: '6px 14px',
          fontSize: 12, fontWeight: 500, color: '#4A4235',
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: '#D9824D', flexShrink: 0 }} />
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ })}
        </div>
      </div>

      {/* ── Rank Card (tap → ranks & points) ───────────────── */}
      <button
        onClick={() => setShowRanks(true)}
        style={{
          display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
          background: 'linear-gradient(160deg, rgba(35,68,46,1) 0%, rgba(26,50,33,1) 100%)',
          borderRadius: 24, padding: '20px 22px 22px',
          marginBottom: 14,
          boxShadow: '0 14px 44px rgba(31,58,42,0.28), inset 0 1px 0 rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 18px 52px rgba(31,58,42,0.34), inset 0 1px 0 rgba(255,255,255,0.10)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 14px 44px rgba(31,58,42,0.28), inset 0 1px 0 rgba(255,255,255,0.10)'; e.currentTarget.style.transform = 'scale(1)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.985)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.985)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
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
              <ChevronRightIcon size={12} color="rgba(250,246,234,0.4)" />
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div ref={pointsRef} style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.045em', lineHeight: 1 }}>
              {points.toLocaleString()}
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(250,246,234,0.38)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 2 }}>points</div>
          </div>
        </div>

        <div>
          <div style={{ height: 5, background: 'rgba(250,246,234,0.10)', borderRadius: 3, overflow: 'hidden', marginBottom: 7 }}>
            <div ref={barRef} style={{
              height: '100%', borderRadius: 3,
              background: nextTier ? rank.color : '#D9824D',
              width: `${pct}%`,
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
      </button>

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
              <div style={{ fontSize: 9.5, color: '#6B5F4E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 6 }}>Last round</div>
              <div style={{ fontSize: 10.5, color: '#4A4235', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>
                {lastRound!.courseName.split(' ').slice(0, 3).join(' ')}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, color: '#8B8272', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700 }}>—</div>
              <div style={{ fontSize: 9.5, color: '#6B5F4E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 6 }}>Last round</div>
              <div style={{ fontSize: 10.5, color: '#8B8272', marginTop: 2 }}>None yet</div>
            </>
          )}
        </div>

        {/* Handicap */}
        <div style={{ ...glassCard, padding: '15px 10px 13px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {profile?.handicapIndex != null ? profile.handicapIndex.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: 9.5, color: '#6B5F4E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 6 }}>Handicap</div>
          <div style={{ fontSize: 10.5, color: '#4A4235', marginTop: 2 }}>index</div>
        </div>

        {/* Record — flex-centered to fix alignment */}
        <div style={{ ...glassCard, padding: '15px 10px 13px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {profile?.wins ?? 0}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5C7A4D', lineHeight: 1 }}>W</span>
            <span style={{ fontSize: 8, color: '#8B8272' }}>·</span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {profile?.losses ?? 0}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#C0603A', lineHeight: 1 }}>L</span>
          </div>
          {(profile?.ties ?? 0) > 0 && (
            <div style={{ fontSize: 11, color: '#4A4235', marginTop: 2 }}>{profile!.ties}T</div>
          )}
          <div style={{ fontSize: 9.5, color: '#6B5F4E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 6 }}>Record</div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {/* Log a round — primary */}
        <button
          onClick={() => onNavigate('rounds')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            background: 'linear-gradient(145deg, rgba(35,68,46,1) 0%, rgba(26,50,33,1) 100%)',
            color: '#FAF6EA', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18,
            padding: '16px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em',
            boxShadow: '0 8px 24px rgba(31,58,42,0.26), inset 0 1px 0 rgba(255,255,255,0.10)',
            transition: 'transform 0.16s ease',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 15, background: '#D9824D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(217,130,77,0.40)' }}>
            <ScorecardIcon size={16} color="#FAF6EA" />
          </span>
          Log a round
        </button>

        {/* Friends — glass */}
        <button
          onClick={() => onNavigate('friends')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            ...glassCard, border: '1px solid rgba(255,255,255,0.72)',
            padding: '16px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            fontSize: 14.5, fontWeight: 600, color: '#1F3A2A', transition: 'transform 0.16s ease',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <UsersIcon size={18} color="#1F3A2A" />
          Friends
        </button>
      </div>

      {/* Friends leaderboard — bigger highlight */}
      <button
        onClick={() => onNavigate('leaderboard')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
          background: 'linear-gradient(150deg, rgba(35,68,46,1) 0%, rgba(22,44,28,1) 100%)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '18px 20px',
          cursor: 'pointer', marginBottom: 26,
          boxShadow: '0 12px 34px rgba(31,58,42,0.26), inset 0 1px 0 rgba(255,255,255,0.10)',
          transition: 'transform 0.16s ease',
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.985)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.985)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <span style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(217,130,77,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MedalIcon size={24} color="#D9824D" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em' }}>Friends leaderboard</div>
          <div style={{ fontSize: 13, color: 'rgba(250,246,234,0.6)', marginTop: 2 }}>See how you rank against your friends</div>
        </div>
        <ChevronRightIcon size={20} color="rgba(250,246,234,0.5)" />
      </button>

      {/* ── Clubhouse feed ─────────────────────────────────── */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 12 }}>
          From the clubhouse
        </div>
        <Feed userId={userId} isMobile={isMobile} onViewProfile={onViewProfile} />
      </div>

      {showRanks && <RanksModal points={points} isMobile={isMobile} onClose={() => setShowRanks(false)} onNavigate={onNavigate} />}

    </main>
  )
}

