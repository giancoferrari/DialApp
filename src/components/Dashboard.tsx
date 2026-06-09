import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useState, useEffect } from 'react'
import type { UserProfile, Round, View } from '../types'
import { getRank, RANK_TIERS, POINTS_WIN, POINTS_LOSS, POINTS_TIE, type RankTier } from '../lib/points'
import { ShieldIcon, UsersIcon, ScorecardIcon, MedalIcon, CloseIcon, ChevronRightIcon, CheckIcon } from './Icons'
import Feed from './Feed'
import Portal from './Portal'
import RankUpMoment from './RankUpMoment'
import DialRing from './DialRing'
import { card } from '../lib/surfaces'
import { color, font, elevation, radius } from '../lib/tokens'

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
    { label: 'Win',  value: `+${POINTS_WIN}`,  color: color.positive,   bg: color.greenTint },
    { label: 'Tie',  value: `+${POINTS_TIE}`,  color: color.inkSoft,    bg: color.sand },
    { label: 'Loss', value: `−${POINTS_LOSS}`, color: color.orangeDeep, bg: '#F7EDE6' },
  ]

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(23,26,23,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, animation: 'fadeIn 0.2s ease' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: isMobile ? '90vh' : '86vh', background: color.white, borderRadius: isMobile ? '24px 24px 0 0' : radius.sheet, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px', borderBottom: `1px solid ${color.border}`, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: font.body, fontSize: 17, fontWeight: 650, color: color.ink, letterSpacing: '-0.01em' }}>Ranks &amp; points</div>
              <div style={{ fontSize: 13, color: color.muted, marginTop: 2 }}>How ranked play works</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: color.sand, border: 'none', borderRadius: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={14} color={color.inkSoft} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 24px' }}>
            {/* Points per match */}
            <div style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 10 }}>Points per match</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {perMatch.map(p => (
                <div key={p.label} style={{ flex: 1, textAlign: 'center', background: p.bg, borderRadius: radius.md, padding: '14px 8px' }}>
                  <div style={{ fontFamily: font.body, fontSize: 22, fontWeight: 650, color: p.color, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{p.value}</div>
                  <div style={{ fontSize: 12, color: p.color, fontWeight: 500, marginTop: 6 }}>{p.label}</div>
                </div>
              ))}
            </div>

            {/* Tiers */}
            <div style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 10 }}>Tiers</div>
            <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RANK_TIERS.map(t => {
                const isCurrent = t.name === current.name
                const reached   = points >= t.minPoints
                return (
                  <div key={t.name} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: isCurrent ? color.green : color.sand,
                    borderRadius: radius.md, padding: '12px 14px',
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, background: isCurrent ? 'rgba(255,255,255,0.12)' : color.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ShieldIcon size={15} color={t.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: font.body, fontSize: 15, fontWeight: 600, color: isCurrent ? color.onGreen : color.ink }}>{t.name}</span>
                        {isCurrent && <span style={{ fontSize: 11, fontWeight: 600, color: color.green, background: color.white, borderRadius: 999, padding: '2px 8px' }}>Current</span>}
                      </div>
                      <div style={{ fontSize: 12, color: isCurrent ? 'rgba(242,245,241,0.65)' : color.muted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                        {t.minPoints.toLocaleString()}+ points
                      </div>
                    </div>
                    {reached
                      ? <CheckIcon size={15} color={isCurrent ? color.onGreen : color.positive} />
                      : <span style={{ fontSize: 12, color: color.muted, fontWeight: 500, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{(t.minPoints - points).toLocaleString()} to go</span>}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => { onClose(); onNavigate('leaderboard') }}
              style={{ width: '100%', marginTop: 20, background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}
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
  if (diff === null || diff === undefined) return { text: '', color: color.inkSoft }
  if (diff === 0) return { text: 'E', color: color.inkSoft }
  if (diff < 0)  return { text: `${diff}`, color: color.birdie }
  return { text: `+${diff}`, color: color.orangeDeep }
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
  const [rankUp, setRankUp]       = useState<RankTier | null>(null)
  const pointsRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (containerRef.current) {
        gsap.fromTo(
          Array.from(containerRef.current.children),
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out', delay: 0.05 }
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

  // Count up the points on mount — small "alive" touch.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (pointsRef.current) {
        pointsRef.current.textContent = '0'
        const o = { v: 0 }
        gsap.to(o, { v: points, duration: 1.1, ease: 'power2.out', delay: 0.2, onUpdate: () => { if (pointsRef.current) pointsRef.current.textContent = Math.round(o.v).toLocaleString() } })
      }
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (pointsRef.current) pointsRef.current.textContent = points.toLocaleString()
    })
    return () => mm.revert()
  }, { dependencies: [points, pct] })

  // ── Rank-up moment: celebrate when the tier increases since last visit ──
  useEffect(() => {
    if (!profile) return
    const idx = RANK_TIERS.findIndex(t => t.name === rank.name)
    let stored: number | null = null
    try { const v = localStorage.getItem('dial_lastTierIdx'); stored = v === null ? null : parseInt(v) } catch { /* */ }
    if (stored !== null && idx > stored) setRankUp(rank)
    if (stored === null || idx !== stored) { try { localStorage.setItem('dial_lastTierIdx', String(idx)) } catch { /* */ } }
  }, [profile, rank])

  // ── Last round ──
  const lastRound = rounds[0] ?? null
  const lastScore = lastRound?.roundHoles.length
    ? lastRound.roundHoles.reduce((s, h) => s + (h.score ?? 0), 0)
    : null
  const lastPar   = lastRound?.roundHoles.length
    ? lastRound.roundHoles.reduce((s, h) => s + h.par, 0)
    : null
  const lastDiff  = lastScore !== null && lastPar !== null ? lastScore - lastPar : null

  const statCard: React.CSSProperties = { ...card, padding: '16px 10px 14px', textAlign: 'center' }
  const statValue: React.CSSProperties = { fontFamily: font.body, fontSize: 22, fontWeight: 650, color: color.ink, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }
  const statLabel: React.CSSProperties = { fontSize: 12, color: color.muted, fontWeight: 500, marginTop: 7 }

  return (
    <main
      ref={containerRef}
      style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 20 : 36}px ${px}px ${isMobile ? 112 : 64}px` }}
    >

      {/* ── Date ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 500, color: color.muted, fontFamily: font.body }}>
        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ })}
      </div>

      {/* ── Rank card (tap → ranks & points) — the screen's one color moment ── */}
      <button
        onClick={() => setShowRanks(true)}
        style={{
          display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
          background: color.green,
          borderRadius: radius.lg, padding: '20px 20px 18px',
          marginBottom: 12,
          border: 'none',
          transition: 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = color.greenDeep }}
        onMouseLeave={e => { e.currentTarget.style.background = color.green; e.currentTarget.style.transform = 'scale(1)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <DialRing progress={nextTier ? progress : 1} size={64} stroke={3} color={rank.color} trackColor="rgba(242,245,241,0.18)">
            <div style={{
              width: 44, height: 44, borderRadius: 22,
              background: 'rgba(255,255,255,0.10)',
              overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: 18, color: color.onGreen }}>
                    {(profile?.firstName?.[0] ?? profile?.username?.[0] ?? '?').toUpperCase()}
                  </span>
              }
            </div>
          </DialRing>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font.body, fontSize: 16, fontWeight: 600, color: color.onGreen, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {profile?.firstName || (profile?.username ? `@${profile.username}` : 'Golfer')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <ShieldIcon size={12} color={rank.color} />
              <span style={{ fontSize: 13, fontWeight: 600, color: rank.color, fontFamily: font.body }}>
                {rank.name}
              </span>
              <ChevronRightIcon size={13} color="rgba(242,245,241,0.45)" />
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div ref={pointsRef} style={{ fontFamily: font.body, fontSize: 28, fontWeight: 650, color: color.onGreen, letterSpacing: '-0.025em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {points.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(242,245,241,0.55)', fontWeight: 500, marginTop: 3 }}>points</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(242,245,241,0.5)', fontFamily: font.body }}>
            {rank.name}
          </span>
          {nextTier ? (
            <span style={{ fontSize: 12, color: 'rgba(242,245,241,0.65)', fontFamily: font.body, fontVariantNumeric: 'tabular-nums' }}>
              {nextTier.minPoints - points} pts to <span style={{ color: rank.color, fontWeight: 600 }}>{nextTier.name}</span>
            </span>
          ) : (
            <span style={{ fontSize: 12, color: rank.color, fontWeight: 600, fontFamily: font.body }}>Max rank</span>
          )}
        </div>
      </button>

      {/* ── Quick Stats ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>

        {/* Last round */}
        <div style={statCard}>
          {lastScore !== null ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                <span style={statValue}>{lastScore}</span>
                {lastDiff !== null && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: toParLabel(lastDiff).color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {toParLabel(lastDiff).text}
                  </span>
                )}
              </div>
              <div style={statLabel}>Last round</div>
              <div style={{ fontSize: 12, color: color.faint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>
                {lastRound!.courseName.split(' ').slice(0, 3).join(' ')}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...statValue, color: color.faint }}>—</div>
              <div style={statLabel}>Last round</div>
              <div style={{ fontSize: 12, color: color.faint, marginTop: 2 }}>None yet</div>
            </>
          )}
        </div>

        {/* Handicap */}
        <div style={statCard}>
          <div style={statValue}>
            {profile?.handicapIndex != null ? profile.handicapIndex.toFixed(1) : '—'}
          </div>
          <div style={statLabel}>Handicap</div>
          <div style={{ fontSize: 12, color: color.faint, marginTop: 2 }}>index</div>
        </div>

        {/* Record */}
        <div style={{ ...card, padding: '16px 10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center' }}>
            <span style={{ ...statValue, fontSize: 18 }}>{profile?.wins ?? 0}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: color.positive, lineHeight: 1 }}>W</span>
            <span style={{ fontSize: 9, color: color.faint }}>·</span>
            <span style={{ ...statValue, fontSize: 18 }}>{profile?.losses ?? 0}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: color.orangeDeep, lineHeight: 1 }}>L</span>
          </div>
          {(profile?.ties ?? 0) > 0 && (
            <div style={{ fontSize: 12, color: color.muted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{profile!.ties}T</div>
          )}
          <div style={statLabel}>Record</div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {/* Log a round — primary */}
        <button
          onClick={() => onNavigate('rounds')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: color.green,
            color: color.onGreen, border: 'none', borderRadius: radius.card,
            padding: '15px 12px', cursor: 'pointer', fontFamily: font.body,
            fontSize: 14, fontWeight: 600,
            transition: 'background 0.15s, transform 0.16s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = color.greenDeep }}
          onMouseLeave={e => { e.currentTarget.style.background = color.green }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <ScorecardIcon size={17} color={color.onGreen} />
          Log a round
        </button>

        {/* Friends — secondary */}
        <button
          onClick={() => onNavigate('friends')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            ...card,
            padding: '15px 12px', cursor: 'pointer', fontFamily: font.body,
            fontSize: 14, fontWeight: 600, color: color.ink, transition: 'background 0.15s, transform 0.16s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
          onMouseLeave={e => { e.currentTarget.style.background = color.white }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <UsersIcon size={17} color={color.inkSoft} />
          Friends
        </button>
      </div>

      {/* Friends leaderboard — quiet list row */}
      <button
        onClick={() => onNavigate('leaderboard')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          ...card,
          padding: '14px 16px',
          cursor: 'pointer', marginBottom: 28,
          transition: 'background 0.15s, transform 0.16s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
        onMouseLeave={e => { e.currentTarget.style.background = color.white }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <span style={{ width: 40, height: 40, borderRadius: radius.sm, background: color.greenTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MedalIcon size={20} color={color.green} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: font.body, fontSize: 15, fontWeight: 600, color: color.ink }}>Friends leaderboard</div>
          <div style={{ fontSize: 13, color: color.muted, marginTop: 1 }}>See how you rank against your friends</div>
        </div>
        <ChevronRightIcon size={18} color={color.faint} />
      </button>

      {/* ── Clubhouse feed ─────────────────────────────────── */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontFamily: font.body, fontSize: 17, fontWeight: 650, letterSpacing: '-0.01em', color: color.ink, marginBottom: 12 }}>
          Clubhouse
        </div>
        <Feed userId={userId} isMobile={isMobile} onViewProfile={onViewProfile} />
      </div>

      {showRanks && <RanksModal points={points} isMobile={isMobile} onClose={() => setShowRanks(false)} onNavigate={onNavigate} />}
      {rankUp && <RankUpMoment tier={rankUp} onClose={() => setRankUp(null)} />}

    </main>
  )
}
