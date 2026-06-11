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
import CourseContour from './CourseContour'
import { card } from '../lib/surfaces'
import { color, font, elevation, radius, HERO_BG, onHero } from '../lib/tokens'

gsap.registerPlugin(useGSAP)

// ── Ranks & points info (opened from the rank hero) ────────────────────────────
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(15,23,17,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, animation: 'fadeIn 0.2s ease' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: isMobile ? '90vh' : '86vh', background: color.white, borderRadius: isMobile ? '24px 24px 0 0' : radius.sheet, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px', borderBottom: `1px solid ${color.border}`, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 600, color: color.ink }}>Ranks &amp; points</div>
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
                  <div style={{ fontFamily: font.display, fontSize: 23, fontWeight: 600, color: p.color, lineHeight: 1 }}>{p.value}</div>
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

function greetingFor(date: Date): string {
  const h = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: TZ }).format(date))
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
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
          { opacity: 0, y: 18 },
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

  const firstName = profile?.firstName || (profile?.username ? `@${profile.username}` : 'Golfer')

  // ── Hero shell: full-bleed immersive on mobile, rounded block on desktop ──
  const heroShell: React.CSSProperties = isMobile
    ? { position: 'relative', overflow: 'hidden', background: HERO_BG, padding: `4px ${px}px 52px` }
    : { position: 'relative', overflow: 'hidden', background: HERO_BG, borderRadius: 24, padding: '30px 30px 34px' }

  // ── The porcelain content sheet, docked over the hero on mobile ──
  const sheetShell: React.CSSProperties = isMobile
    ? { position: 'relative', marginTop: -26, background: color.cream, borderRadius: '26px 26px 0 0', padding: `26px ${px}px 0` }
    : { padding: '20px 0 0' }

  const inner: React.CSSProperties = { maxWidth: 640, margin: '0 auto' }

  const statValue: React.CSSProperties = { fontFamily: font.display, fontSize: 27, fontWeight: 600, color: color.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }
  const statLabel: React.CSSProperties = { fontSize: 12, color: color.muted, fontWeight: 500, marginTop: 8 }

  return (
    <main
      ref={containerRef}
      style={{
        paddingBottom: isMobile ? 112 : 64,
        ...(isMobile ? {} : { maxWidth: 720, margin: '0 auto', padding: '32px 40px 64px' }),
      }}
    >

      {/* ════ HERO — the private-club moment ════ */}
      <section style={heroShell}>
        <CourseContour />
        <div style={{ ...inner, position: 'relative' }}>

          {/* Date + greeting */}
          <div style={{ paddingTop: isMobile ? 14 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: onHero.faint, fontFamily: font.body }}>
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ })}
            </div>
            <h1 style={{ fontFamily: font.display, fontSize: isMobile ? 27 : 31, fontWeight: 600, letterSpacing: '-0.02em', color: color.onGreen, lineHeight: 1.12, margin: '6px 0 0' }}>
              {greetingFor(date)}, {firstName}
            </h1>
          </div>

          {/* Rank block — tap for ranks & points */}
          <button
            onClick={() => setShowRanks(true)}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, marginTop: 28, cursor: 'pointer', transition: 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.99)' }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <DialRing progress={nextTier ? progress : 1} size={84} stroke={3} color={rank.color} trackColor="rgba(242,245,241,0.16)">
                <div style={{
                  width: 58, height: 58, borderRadius: 29,
                  background: 'rgba(255,255,255,0.10)',
                  overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {profile?.avatarUrl
                    ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: 22, color: color.onGreen }}>
                        {(profile?.firstName?.[0] ?? profile?.username?.[0] ?? '?').toUpperCase()}
                      </span>
                  }
                </div>
              </DialRing>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(242,245,241,0.6)', fontFamily: font.body }}>Ranked points</div>
                <div ref={pointsRef} style={{ fontFamily: font.display, fontSize: 46, fontWeight: 600, color: color.onGreen, lineHeight: 1.05, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {points.toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '7px 13px', flexShrink: 0 }}>
                <ShieldIcon size={13} color={rank.color} />
                <span style={{ fontSize: 13, fontWeight: 600, color: color.onGreen, fontFamily: font.body }}>{rank.name}</span>
              </div>
            </div>

            {/* Progress to next tier */}
            <div style={{ marginTop: 24 }}>
              <div style={{ height: 5, background: 'rgba(242,245,241,0.14)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999, background: rank.color,
                  width: `${pct}%`,
                  animation: 'rankBarFill 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                  ['--bar-width' as never]: `${pct}%`,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}>
                <span style={{ fontSize: 12, color: 'rgba(242,245,241,0.5)', fontFamily: font.body }}>{rank.name}</span>
                {nextTier ? (
                  <span style={{ fontSize: 12, color: 'rgba(242,245,241,0.7)', fontFamily: font.body, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {nextTier.minPoints - points} pts to <span style={{ color: rank.color, fontWeight: 600 }}>{nextTier.name}</span>
                    <ChevronRightIcon size={12} color="rgba(242,245,241,0.45)" />
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: rank.color, fontWeight: 600, fontFamily: font.body }}>Max rank</span>
                )}
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* ════ CONTENT SHEET ════ */}
      <section style={sheetShell}>
        <div style={inner}>

          {/* Quick stats — one card, three columns, hairline dividers */}
          <div style={{ ...card, display: 'flex', alignItems: 'stretch', padding: '18px 0 16px', marginBottom: 12 }}>
            {/* Last round */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 6px' }}>
              {lastScore !== null ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 5 }}>
                    <span style={statValue}>{lastScore}</span>
                    {lastDiff !== null && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: toParLabel(lastDiff).color, fontFamily: font.body, fontVariantNumeric: 'tabular-nums' }}>
                        {toParLabel(lastDiff).text}
                      </span>
                    )}
                  </div>
                  <div style={statLabel}>Last round</div>
                </>
              ) : (
                <>
                  <div style={{ ...statValue, color: color.faint }}>—</div>
                  <div style={statLabel}>Last round</div>
                </>
              )}
            </div>
            <div style={{ width: 1, background: color.border }} />
            {/* Handicap */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 6px' }}>
              <div style={statValue}>
                {profile?.handicapIndex != null ? profile.handicapIndex.toFixed(1) : '—'}
              </div>
              <div style={statLabel}>Handicap</div>
            </div>
            <div style={{ width: 1, background: color.border }} />
            {/* Record */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                <span style={statValue}>{profile?.wins ?? 0}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: color.positive, fontFamily: font.body }}>W</span>
                <span style={statValue}>{profile?.losses ?? 0}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: color.orangeDeep, fontFamily: font.body }}>L</span>
              </div>
              <div style={statLabel}>Record</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => onNavigate('rounds')}
              style={{
                flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.card,
                padding: '16px 12px', cursor: 'pointer', fontFamily: font.body,
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
            <button
              onClick={() => onNavigate('friends')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                ...card,
                padding: '16px 12px', cursor: 'pointer', fontFamily: font.body,
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

          {/* Friends leaderboard */}
          <button
            onClick={() => onNavigate('leaderboard')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              ...card,
              padding: '14px 16px',
              cursor: 'pointer',
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

          {/* Clubhouse */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, margin: '30px 0 14px' }}>
            <span style={{ fontFamily: font.display, fontSize: 21, fontWeight: 600, letterSpacing: '-0.01em', color: color.ink }}>The clubhouse</span>
            <div style={{ flex: 1, height: 1, background: color.border, alignSelf: 'center' }} />
          </div>
          <Feed userId={userId} isMobile={isMobile} onViewProfile={onViewProfile} />

        </div>
      </section>

      {showRanks && <RanksModal points={points} isMobile={isMobile} onClose={() => setShowRanks(false)} onNavigate={onNavigate} />}
      {rankUp && <RankUpMoment tier={rankUp} onClose={() => setRankUp(null)} />}

    </main>
  )
}
