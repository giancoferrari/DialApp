import { useRef, useState, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Shot, Club } from '../types'
import {
  CLUBS_DATA, CAT_LABELS, getClubAvg, getClubLast, getClubShots,
  getClubRange, timeAgo,
} from '../data'
import FlagPin from './FlagPin'
import OrganicGraphic from './OrganicGraphic'
import FairwayStrip from './FairwayStrip'
import ClubBadge from './ClubBadge'
import { ArrowRight, ArrowUpRight } from './Icons'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** Auto-updates when the calendar date changes (i.e. at midnight) */
function useLiveDate() {
  const [date, setDate] = useState(new Date())
  useEffect(() => {
    const scheduleNext = () => {
      const now      = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const ms = tomorrow.getTime() - now.getTime()
      return setTimeout(() => { setDate(new Date()); const id = setInterval(() => setDate(new Date()), 86_400_000); return id }, ms)
    }
    const t = scheduleNext()
    return () => clearTimeout(t)
  }, [])
  return date
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: number; sub: string; accent: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [displayed, setDisplayed] = useState(0)

  useGSAP(() => {
    const obj = { val: 0 }
    gsap.to(obj, {
      val: value, duration: 1.2, ease: 'power3.out',
      onUpdate: () => setDisplayed(Math.round(obj.val)),
    })
  }, { scope: cardRef, dependencies: [value] })

  return (
    <div ref={cardRef} style={{
      background: '#FAF6EA', border: '1px solid #E0D8C5',
      borderRadius: 20, padding: '20px 22px',
      flex: 1, display: 'flex', alignItems: 'center', gap: 18,
    }}>
      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: accent }} />
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
          color: '#6B6857', textTransform: 'uppercase', marginBottom: 8,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 44, fontWeight: 700, lineHeight: 1,
          color: '#1F1D17', letterSpacing: '-0.04em',
        }}>
          {displayed}
        </div>
        <div style={{ fontSize: 12, color: '#6B6857', marginTop: 6 }}>{sub}</div>
      </div>
    </div>
  )
}

interface Props {
  shots: Shot[]
  loading: boolean
  onOpenBag: () => void
  onLog: () => void
  onLogFor: (club: Club) => void
}

export default function Dashboard({ shots, loading, onOpenBag, onLog, onLogFor }: Props) {
  const containerRef = useRef<HTMLElement>(null)
  const heroLeftRef  = useRef<HTMLDivElement>(null)
  const heroRightRef = useRef<HTMLDivElement>(null)
  const featuredRef  = useRef<HTMLElement>(null)
  const statsColRef  = useRef<HTMLDivElement>(null)
  const stripRef     = useRef<HTMLElement>(null)
  const recentRef    = useRef<HTMLElement>(null)

  const date = useLiveDate()
  const today = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const driverAvg   = getClubAvg(shots, 'driver') ?? 0
  const driverLast  = getClubLast(shots, 'driver') ?? 0
  const driverCount = getClubShots(shots, 'driver').length
  const driverRange = getClubRange(shots, 'driver')
  const totalShots  = shots.length
  const trackedClubs = CLUBS_DATA.filter(c => getClubShots(shots, c.id).length > 0).length
  const weekShots   = shots.filter(s => Date.now() - s.ts < 7 * 86_400_000).length
  const recent      = [...shots].sort((a, b) => b.ts - a.ts).slice(0, 6)

  // Dynamic personal best
  const personalBest = shots.reduce<{ yardage: number; clubId: string } | null>((best, s) => {
    if (!best || s.yardage > best.yardage) return { yardage: s.yardage, clubId: s.clubId }
    return best
  }, null)
  const personalBestClub = personalBest ? CLUBS_DATA.find(c => c.id === personalBest.clubId) : null

  const delta = driverLast - driverAvg

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (heroLeftRef.current) {
        gsap.fromTo(heroLeftRef.current.children, { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', delay: 0.1 })
      }
      if (heroRightRef.current) {
        gsap.fromTo(heroRightRef.current, { opacity: 0, scale: 0.9, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.25 })
      }
      if (featuredRef.current) {
        gsap.fromTo(featuredRef.current, { opacity: 0, y: 32 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: featuredRef.current, start: 'top 85%' } })
      }
      if (statsColRef.current) {
        gsap.fromTo(statsColRef.current.children, { opacity: 0, x: 24 },
          { opacity: 1, x: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out',
            scrollTrigger: { trigger: statsColRef.current, start: 'top 85%' } })
      }
      if (stripRef.current) {
        gsap.fromTo(stripRef.current, { opacity: 0, scaleX: 0.96 },
          { opacity: 1, scaleX: 1, duration: 0.7, ease: 'power2.out',
            scrollTrigger: { trigger: stripRef.current, start: 'top 88%' } })
      }
      const rows = recentRef.current?.querySelectorAll('.shot-row')
      if (rows?.length) {
        gsap.fromTo(rows, { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: 'power3.out',
            scrollTrigger: { trigger: recentRef.current, start: 'top 88%' } })
      }
    })
    return () => mm.revert()
  }, { scope: containerRef })

  return (
    <main ref={containerRef} style={{ maxWidth: 1320, margin: '0 auto', padding: '48px 40px 96px' }}>

      {/* ── HERO ── */}
      <section style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 64,
        alignItems: 'center', marginBottom: 80,
      }}>
        <div ref={heroLeftRef}>
          {/* Date chip — auto-updates at midnight */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#FAF6EA', border: '1px solid #E0D8C5',
            borderRadius: 999, padding: '6px 14px',
            fontSize: 12, fontWeight: 500, color: '#6B6857', marginBottom: 28,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#D9824D', flexShrink: 0 }} />
            {today}
          </div>

          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 92, fontWeight: 700,
            lineHeight: 0.95, letterSpacing: '-0.045em',
            color: '#1F1D17', marginBottom: 24, marginTop: 0,
          }}>
            <span style={{ color: '#5C7A4D', fontStyle: 'italic', fontWeight: 400 }}>let's </span>
            <span style={{ color: '#D9824D' }}>dial</span>
            <span style={{ color: '#1F3A2A' }}> it in.</span>
          </h1>

          <p style={{
            fontSize: 17, lineHeight: 1.55, color: '#6B6857',
            maxWidth: 460, fontWeight: 400, margin: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Track every shot, build a yardage book you can trust, and walk onto
            the course knowing exactly what each club does.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
            <button
              onClick={onLog}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#1F3A2A', color: '#FAF6EA',
                border: 'none', borderRadius: 999, padding: '14px 22px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'transform 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#16271D' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#1F3A2A' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            >
              Log a shot <ArrowRight size={16} color="#FAF6EA" />
            </button>
            <button
              onClick={onOpenBag}
              style={{
                background: 'transparent', color: '#1F1D17',
                border: '1px solid #C9C0A8', borderRadius: 999, padding: '14px 22px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FAF6EA' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              View your bag
            </button>
          </div>
        </div>

        <div ref={heroRightRef} style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <OrganicGraphic size={420} />
          {personalBest && (
            <div style={{
              position: 'absolute', bottom: 24, left: -10,
              background: '#FAF6EA', border: '1px solid #E0D8C5',
              borderRadius: 18, padding: '14px 18px',
              boxShadow: '0 12px 30px rgba(31,58,42,0.10)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18, background: '#1F3A2A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ArrowUpRight size={14} color="#D9824D" />
              </div>
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                  color: '#6B6857', textTransform: 'uppercase', marginBottom: 2,
                }}>
                  Personal best
                </div>
                <div style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 22, fontWeight: 700, color: '#1F1D17',
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {personalBest.yardage} yds · {personalBestClub?.name ?? 'Club'}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURED + STATS ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 24, marginBottom: 80 }}>
        <article ref={featuredRef} style={{
          background: '#1F3A2A', color: '#FAF6EA',
          borderRadius: 28, padding: '40px 44px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 240, height: 240, background: '#2E5240',
            borderRadius: '58% 42% 62% 38%', opacity: 0.5,
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <ClubBadge abbr="D" size={56} variant="coral" />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#B5C29A', textTransform: 'uppercase', marginBottom: 4 }}>
                    Featured club
                  </div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', color: '#FAF6EA', lineHeight: 1 }}>
                    Driver
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#B5C29A', letterSpacing: '0.04em' }}>
                Woods · {driverCount} shots
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#B5C29A', textTransform: 'uppercase', marginBottom: 6 }}>
                  Average
                </div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 132, fontWeight: 700, lineHeight: 0.9, letterSpacing: '-0.04em', color: '#FAF6EA' }}>
                  {driverAvg || '—'}
                  {driverAvg > 0 && <span style={{ fontSize: 32, color: '#D9824D', fontWeight: 600 }}>.</span>}
                </div>
                <div style={{ fontSize: 13, color: '#B5C29A', marginTop: 4, fontWeight: 500, letterSpacing: '0.04em' }}>
                  yards
                </div>
              </div>
              {driverLast > 0 && (
                <div style={{ paddingBottom: 14, paddingLeft: 24, borderLeft: '1px solid rgba(250,246,234,0.15)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#B5C29A', textTransform: 'uppercase', marginBottom: 6 }}>
                    Last shot
                  </div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 48, fontWeight: 600, lineHeight: 1, color: '#FAF6EA', letterSpacing: '-0.03em' }}>
                    {driverLast}
                  </div>
                  <div style={{ fontSize: 12, color: '#B5C29A', marginTop: 6, fontWeight: 500 }}>
                    {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} yds vs. avg
                  </div>
                </div>
              )}
            </div>

            {driverRange && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#B5C29A', fontWeight: 500, letterSpacing: '0.04em', marginBottom: 8 }}>
                  <span>Range</span>
                  <span>{driverRange.min} – {driverRange.max} yds</span>
                </div>
                <div style={{ height: 6, background: 'rgba(250,246,234,0.10)', borderRadius: 3, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(217,130,77,0.5), #D9824D)', borderRadius: 3 }} />
                  <div style={{
                    position: 'absolute',
                    left: `${((driverAvg - driverRange.min) / (driverRange.max - driverRange.min)) * 100}%`,
                    top: '50%', transform: 'translate(-50%,-50%)',
                    width: 14, height: 14, borderRadius: 7,
                    background: '#FAF6EA', border: '2px solid #1F3A2A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>
            )}

            {!driverAvg && !loading && (
              <div style={{ fontSize: 13, color: '#B5C29A', fontStyle: 'italic' }}>
                No driver shots logged yet. Hit that button above!
              </div>
            )}

            <button
              onClick={() => onLogFor(CLUBS_DATA[0])}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', color: '#D9824D',
                border: '1px solid rgba(217,130,77,0.5)', borderRadius: 999,
                padding: '9px 16px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer', marginTop: driverAvg ? 4 : 12, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,130,77,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Log a driver shot <ArrowUpRight size={13} color="#D9824D" />
            </button>
          </div>
        </article>

        <div ref={statsColRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatCard label="Total shots logged" value={totalShots}   sub="All time"              accent="#1F3A2A" />
          <StatCard label="Clubs dialed in"    value={trackedClubs} sub={`of ${CLUBS_DATA.length} clubs`} accent="#5C7A4D" />
          <StatCard label="Shots this week"    value={weekShots}    sub="Past 7 days"           accent="#D9824D" />
        </div>
      </section>

      {/* ── FAIRWAY STRIP ── */}
      <section ref={stripRef} style={{ marginBottom: 64 }}>
        <FairwayStrip height={140} />
      </section>

      {/* ── RECENT SHOTS ── */}
      <section ref={recentRef}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>
              <FlagPin size={12} /> Recent activity
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 44, fontWeight: 700, letterSpacing: '-0.035em', color: '#1F1D17', lineHeight: 1, margin: 0 }}>
              Your last <span style={{ fontStyle: 'italic', color: '#5C7A4D', fontWeight: 400 }}>shots</span>.
            </h2>
          </div>
          <button
            onClick={onOpenBag}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#1F1D17', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.6' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            See full bag <ArrowRight size={15} />
          </button>
        </div>

        {loading ? (
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 24, padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#B5AC95', fontFamily: "'DM Sans', sans-serif" }}>Loading your shots…</div>
          </div>
        ) : recent.length === 0 ? (
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 24, padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, color: '#C9C0A8', marginBottom: 8 }}>No shots yet</div>
            <div style={{ fontSize: 14, color: '#B5AC95' }}>Log your first shot to see it here.</div>
          </div>
        ) : (
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 24, overflow: 'hidden' }}>
            {recent.map((shot, i) => {
              const club = CLUBS_DATA.find(c => c.id === shot.clubId)
              return (
                <div
                  key={shot.id}
                  className="shot-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr 1.5fr 120px 100px 28px',
                    alignItems: 'center', gap: 24, padding: '18px 28px',
                    borderTop: i === 0 ? 'none' : '1px solid #ECE5D2',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F4EFE0' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <ClubBadge abbr={club?.abbr ?? '?'} size={48} />
                  <div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, color: '#1F1D17', letterSpacing: '-0.02em' }}>
                      {club?.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6857', marginTop: 2 }}>
                      {club ? CAT_LABELS[club.cat] : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#6B6857' }}>
                    {shot.note || <span style={{ color: '#B5AC95' }}>—</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.025em' }}>
                      {shot.yardage}
                    </span>
                    <span style={{ fontSize: 13, color: '#6B6857', marginLeft: 4, fontWeight: 500 }}>yds</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B6857', textAlign: 'right', letterSpacing: '-0.005em' }}>
                    {timeAgo(shot.ts)}
                  </div>
                  <ArrowUpRight size={16} color="#6B6857" />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
