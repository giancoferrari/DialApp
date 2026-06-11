import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useState, useEffect } from 'react'
import type { UserProfile, Round, View } from '../types'
import { getRank, RANK_TIERS, POINTS_WIN, POINTS_LOSS, POINTS_TIE, type RankTier } from '../lib/points'
import { ShieldIcon, UsersIcon, ScorecardIcon, CloseIcon, ChevronRightIcon, CheckIcon, TrophyIcon } from './Icons'
import Feed from './Feed'
import Portal from './Portal'
import RankUpMoment from './RankUpMoment'
import CourseHeroArt from './CourseHeroArt'
import { color, font, elevation, radius, glass, type } from '../lib/tokens'

gsap.registerPlugin(useGSAP)

// ── Small flag glyph for the rank / last-round chips ────────────────────────
function FlagGlyph({ size = 20, color: c = '#12371F', strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 19V5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 5c4 .5 6.8 1.6 9 4-2.6 2.3-5.5 3.3-9 2.9V5Z" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 20c2.5-.8 5.5-.8 8 0" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The prototype's frosted panel.
const glassPanel: React.CSSProperties = {
  background: glass.bg,
  border: glass.border,
  boxShadow: glass.shadow,
  backdropFilter: glass.blur,
  WebkitBackdropFilter: glass.blur,
}

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
    { label: 'Loss', value: `−${POINTS_LOSS}`, color: color.orangeDeep, bg: '#F6EAD8' },
  ]

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(20,18,10,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, animation: 'fadeIn 0.2s ease' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: isMobile ? '90vh' : '86vh', background: color.sheet, borderRadius: isMobile ? '28px 28px 0 0' : radius.sheet, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px', borderBottom: `1px solid ${color.border}`, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: color.ink }}>Ranks &amp; points</div>
              <div style={{ fontSize: 13, color: color.muted, marginTop: 2 }}>How ranked play works</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: color.sand, border: 'none', borderRadius: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={14} color={color.inkSoft} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 24px' }}>
            {/* Points per match */}
            <div style={{ ...type.label, marginBottom: 10 }}>Points per match</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {perMatch.map(p => (
                <div key={p.label} style={{ flex: 1, textAlign: 'center', background: p.bg, borderRadius: radius.md, padding: '14px 8px' }}>
                  <div style={{ fontFamily: font.display, fontSize: 23, fontWeight: 700, letterSpacing: '-0.04em', color: p.color, lineHeight: 1 }}>{p.value}</div>
                  <div style={{ fontSize: 12, color: p.color, fontWeight: 600, marginTop: 6 }}>{p.label}</div>
                </div>
              ))}
            </div>

            {/* Tiers */}
            <div style={{ ...type.label, marginBottom: 10 }}>Tiers</div>
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
                        <span style={{ fontFamily: font.body, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: isCurrent ? color.onGreen : color.ink }}>{t.name}</span>
                        {isCurrent && <span style={{ fontSize: 11, fontWeight: 700, color: color.green, background: color.white, borderRadius: 999, padding: '2px 8px' }}>Current</span>}
                      </div>
                      <div style={{ fontSize: 12, color: isCurrent ? 'rgba(255,250,241,0.65)' : color.muted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
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
              style={{ width: '100%', marginTop: 20, background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '14px', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', cursor: 'pointer', fontFamily: font.body }}
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

function greetingFor(date: Date): string {
  const h = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: TZ }).format(date))
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
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
  const px   = isMobile ? 24 : 40
  const [showRanks, setShowRanks] = useState(false)
  const [rankUp, setRankUp]       = useState<RankTier | null>(null)
  const pointsRef = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (containerRef.current) {
        gsap.fromTo(
          Array.from(containerRef.current.children),
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: 'power3.out', delay: 0.05 }
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
  const pct = Math.max(4, Math.round(progress * 100))

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
  const deltaText  = lastDiff === null ? null : lastDiff === 0 ? '(E)' : lastDiff > 0 ? `(+${lastDiff})` : `(${lastDiff})`
  const deltaColor = lastDiff !== null && lastDiff < 0 ? color.birdie : color.orange

  const firstName = profile?.firstName || (profile?.username ? `@${profile.username}` : 'Golfer')
  const wins   = profile?.wins ?? 0
  const losses = profile?.losses ?? 0
  const ties   = profile?.ties ?? 0

  // ── Prototype building blocks ──
  const cardLabel: React.CSSProperties = { ...type.label, whiteSpace: 'nowrap' }

  const statChip = (bg: string): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 15, background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#FFFAF1', fontSize: 17, fontWeight: 700, marginBottom: 9,
  })

  const pressFn = (down: boolean) => (e: React.SyntheticEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.transform = down ? 'scale(0.98)' : 'scale(1)'
  }

  return (
    <main
      ref={containerRef}
      style={{ maxWidth: isMobile ? '100%' : 560, margin: '0 auto', paddingBottom: isMobile ? 116 : 72 }}
    >

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div style={{ padding: `${isMobile ? 16 : 28}px ${px}px 0`, position: 'relative', zIndex: 2 }}>
        <time style={{ display: 'block', color: '#3E653E', fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', fontFamily: font.body }}>
          {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ })}
        </time>
        <h1 style={{ margin: '12px 0 0', maxWidth: 320, color: color.ink, fontFamily: font.display, fontSize: isMobile ? 38 : 42, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 0.98 }}>
          {greetingFor(date)}, {firstName}.
        </h1>
      </div>

      {/* ── Coastal hero illustration ───────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: isMobile ? -6 : 4, ...(isMobile ? {} : { margin: `4px ${px}px 0`, borderRadius: radius.sheet, overflow: 'hidden' }) }}>
        <CourseHeroArt height={isMobile ? 258 : 286} />
      </div>

      {/* ── Overview stack — overlaps the illustration ──────── */}
      <div style={{ position: 'relative', zIndex: 3, marginTop: -92, padding: `0 ${px}px`, display: 'flex', flexDirection: 'column', gap: 11 }}>

        {/* Rank card */}
        <button
          onClick={() => setShowRanks(true)}
          style={{ ...glassPanel, display: 'block', width: '100%', textAlign: 'left', borderRadius: radius.lg, padding: '17px 17px 15px', cursor: 'pointer', transition: 'transform 0.16s cubic-bezier(0.22,1,0.36,1)' }}
          onMouseDown={pressFn(true)} onMouseUp={pressFn(false)} onMouseLeave={pressFn(false)}
          onTouchStart={pressFn(true)} onTouchEnd={pressFn(false)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '54px minmax(0,1fr) auto', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 54, height: 54, borderRadius: 27, background: 'rgba(219,235,207,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlagGlyph size={30} color={color.green} strokeWidth={2.2} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={cardLabel}>Ranked points</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 6 }}>
                <span ref={pointsRef} style={{ fontFamily: font.display, fontSize: 40, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.9, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
                  {points.toLocaleString()}
                </span>
                <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.03em', color: color.ink }}>pts</span>
              </span>
            </span>
            <span style={{ paddingRight: 2, textAlign: 'left' }}>
              <span style={cardLabel}>Rank</span>
              <span style={{ display: 'block', marginTop: 6, fontSize: 20, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, color: color.ink }}>{rank.name}</span>
              <span style={{ display: 'block', marginTop: 6, fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em', color: '#4D504A', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {nextTier ? `${nextTier.minPoints - points} pts to ${nextTier.name}` : 'Top tier'}
              </span>
            </span>
          </div>
          <div style={{ height: 9, marginTop: 15, overflow: 'hidden', borderRadius: 999, background: 'rgba(105,101,84,0.12)' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              background: 'linear-gradient(90deg, #7D9B68, #64834F)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
              width: `${pct}%`,
              animation: 'rankBarFill 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
              ['--bar-width' as never]: `${pct}%`,
            }} />
          </div>
        </button>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          {/* Last round */}
          <div style={{ ...glassPanel, borderRadius: radius.md, padding: '12px 12px 13px' }}>
            <span style={statChip(color.greenMid)}><FlagGlyph size={17} color="#FFFAF1" /></span>
            <div style={cardLabel}>Last round</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 7 }}>
              <span style={{ fontFamily: font.display, fontSize: 26, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1, color: lastScore !== null ? color.ink : color.faint, fontVariantNumeric: 'tabular-nums' }}>
                {lastScore ?? '—'}
              </span>
              {deltaText && <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.02em', color: deltaColor, fontVariantNumeric: 'tabular-nums' }}>{deltaText}</span>}
            </div>
          </div>
          {/* Handicap */}
          <div style={{ ...glassPanel, borderRadius: radius.md, padding: '12px 12px 13px' }}>
            <span style={statChip(color.sage)}>H</span>
            <div style={cardLabel}>Handicap</div>
            <div style={{ marginTop: 7, fontFamily: font.display, fontSize: 26, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1, color: profile?.handicapIndex != null ? color.ink : color.faint, fontVariantNumeric: 'tabular-nums' }}>
              {profile?.handicapIndex != null ? profile.handicapIndex.toFixed(1) : '—'}
            </div>
          </div>
          {/* Record */}
          <div style={{ ...glassPanel, borderRadius: radius.md, padding: '12px 12px 13px' }}>
            <span style={statChip(color.orange)}><TrophyIcon size={16} color="#FFFAF1" /></span>
            <div style={cardLabel}>Record</div>
            <div style={{ marginTop: 7, fontFamily: font.display, fontSize: 26, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
              {wins}–{losses}–{ties}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={() => onNavigate('rounds')}
            style={{
              display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 9,
              minHeight: 55, padding: '0 12px 0 16px', borderRadius: radius.md, border: 'none',
              color: '#FFFAF1', fontFamily: font.body, fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em',
              background: 'radial-gradient(circle at 62% 45%, rgba(85,123,74,0.38), transparent 42%), linear-gradient(135deg, #174824 0%, #10361E 100%)',
              boxShadow: '0 9px 15px rgba(18,55,31,0.2)',
              cursor: 'pointer', transition: 'transform 0.16s cubic-bezier(0.22,1,0.36,1)',
            }}
            onMouseDown={pressFn(true)} onMouseUp={pressFn(false)} onMouseLeave={pressFn(false)}
            onTouchStart={pressFn(true)} onTouchEnd={pressFn(false)}
          >
            <ScorecardIcon size={21} color="#FFFAF1" />
            <span style={{ whiteSpace: 'nowrap', textAlign: 'left' }}>Log a round</span>
            <ChevronRightIcon size={18} color="rgba(255,250,241,0.85)" />
          </button>
          <button
            onClick={() => onNavigate('friends')}
            style={{
              display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 9,
              minHeight: 55, padding: '0 12px 0 16px', borderRadius: radius.md, border: 'none',
              color: '#132F1D', fontFamily: font.body, fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, rgba(224,235,214,0.95), rgba(237,241,220,0.85))',
              boxShadow: elevation.sm,
              cursor: 'pointer', transition: 'transform 0.16s cubic-bezier(0.22,1,0.36,1)',
            }}
            onMouseDown={pressFn(true)} onMouseUp={pressFn(false)} onMouseLeave={pressFn(false)}
            onTouchStart={pressFn(true)} onTouchEnd={pressFn(false)}
          >
            <UsersIcon size={21} color="#132F1D" />
            <span style={{ whiteSpace: 'nowrap', textAlign: 'left' }}>Friends</span>
            <ChevronRightIcon size={18} color="rgba(19,47,29,0.7)" />
          </button>
        </div>

        {/* Clubhouse feed */}
        <div style={{ marginTop: 13 }}>
          <div style={{ ...type.label, marginBottom: 10 }}>The clubhouse</div>
          <Feed userId={userId} isMobile={isMobile} onViewProfile={onViewProfile} />
        </div>
      </div>

      {showRanks && <RanksModal points={points} isMobile={isMobile} onClose={() => setShowRanks(false)} onNavigate={onNavigate} />}
      {rankUp && <RankUpMoment tier={rankUp} onClose={() => setRankUp(null)} />}

    </main>
  )
}
