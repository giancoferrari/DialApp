import { useRef, useState, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { Shot, Club } from '../types'
import { CLUBS_DATA } from '../data'
import OrganicGraphic from './OrganicGraphic'
import { ArrowRight, BagIcon, TargetIcon, ScorecardIcon, DumbbellIcon, UsersIcon, TrophyIcon } from './Icons'
import type { View } from '../types'

gsap.registerPlugin(useGSAP)

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

interface Props {
  shots: Shot[]
  loading: boolean
  onOpenBag: () => void
  onLog: () => void
  onLogFor: (club: Club) => void
  onNavigate: (v: View) => void
  isMobile?: boolean
  userName?: string
}

export default function Dashboard({ shots, onNavigate, isMobile = false, userName = '' }: Props) {
  const containerRef = useRef<HTMLElement>(null)
  const heroLeftRef  = useRef<HTMLDivElement>(null)
  const heroRightRef = useRef<HTMLDivElement>(null)

  const date = useLiveDate()
  const today = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const totalShots  = shots.length
  const weekShots   = shots.filter(s => Date.now() - s.ts < 7 * 86_400_000).length
  const trackedClubs = CLUBS_DATA.filter(c => shots.some(s => s.clubId === c.id)).length

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
    })
    return () => mm.revert()
  }, { scope: containerRef })

  const px = isMobile ? 16 : 40

  return (
    <main ref={containerRef} style={{ maxWidth: 1320, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 96}px` }}>

      {/* ── HERO ── */}
      <section style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 0 : 64,
        alignItems: 'center', marginBottom: isMobile ? 32 : 80,
      }}>
        <div ref={heroLeftRef}>
          {/* Date chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(250,246,234,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.55)',
            borderRadius: 999, padding: '6px 14px',
            fontSize: 12, fontWeight: 500, color: '#6B6857', marginBottom: 28,
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#D9824D', flexShrink: 0 }} />
            {today}
          </div>

          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: isMobile ? 52 : 88, fontWeight: 700,
            lineHeight: 0.95, letterSpacing: '-0.04em',
            color: '#1F1D17', marginBottom: isMobile ? 16 : 24, marginTop: 0,
          }}>
            <span style={{ color: '#5C7A4D', fontStyle: 'italic', fontWeight: 400 }}>play </span>
            <span style={{ color: '#D9824D' }}>better</span>
            <br />
            <span style={{ color: '#1F3A2A' }}>together.</span>
          </h1>

          <p style={{
            fontSize: 16, lineHeight: 1.55, color: '#6B6857',
            maxWidth: 440, fontWeight: 400, margin: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Track your distances, compete in live matches with friends, and build your golf reputation on the course.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('friends')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#1F3A2A', color: '#FAF6EA',
                border: 'none', borderRadius: 999, padding: '13px 22px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'transform 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#16271D' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#1F3A2A' }}
            >
              <UsersIcon size={16} color="#FAF6EA" /> Find Friends
            </button>
            <button
              onClick={() => onNavigate('matches')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'transparent', color: '#1F1D17',
                border: '1px solid #C9C0A8', borderRadius: 999, padding: '13px 22px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FAF6EA' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <TrophyIcon size={16} color="#1F1D17" /> Start a Match <ArrowRight size={16} color="#1F1D17" />
            </button>
          </div>

          {/* Quick stats strip */}
          <div style={{ display: 'flex', gap: 20, marginTop: 32 }}>
            {[
              { value: totalShots,   label: 'shots logged' },
              { value: weekShots,    label: 'this week'    },
              { value: trackedClubs, label: 'clubs dialed' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6B6857', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div ref={heroRightRef} style={{ display: isMobile ? 'none' : 'flex', justifyContent: 'center', position: 'relative' }}>
          <OrganicGraphic size={420} />
          <div style={{
            position: 'absolute', bottom: 24, left: -10,
            background: 'rgba(250,246,234,0.70)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.55)',
            borderRadius: 18, padding: '14px 18px',
            boxShadow: '0 16px 40px rgba(31,58,42,0.14), 0 4px 10px rgba(31,58,42,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 20, background: '#1F3A2A', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, color: '#D9824D',
            }}>
              {userName ? userName[0].toUpperCase() : 'G'}
            </div>
            <div>
              <div style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 18, fontWeight: 700, color: '#1F1D17',
                letterSpacing: '-0.02em', lineHeight: 1.1,
              }}>
                Hey, {userName || 'Golfer'}!
              </div>
              <div style={{ fontSize: 12, color: '#6B6857', marginTop: 3, fontWeight: 500 }}>
                {totalShots > 0 ? `${totalShots} shots on the books` : 'Ready to get dialed in?'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOOLS GRID ── */}
      <section style={{ marginBottom: isMobile ? 32 : 64 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 14 }}>
          Your tools
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {([
            { label: 'My Bag',   sub: 'Distances',  Icon: BagIcon,       view: 'bag'      },
            { label: 'Dial In',  sub: 'Calculator', Icon: TargetIcon,    view: 'dialin'   },
            { label: 'Rounds',   sub: 'Scorecards', Icon: ScorecardIcon, view: 'rounds'   },
            { label: 'Practice', sub: 'Training',   Icon: DumbbellIcon,  view: 'practice' },
          ] as const).map(item => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              style={{
                background: 'rgba(250,246,234,0.62)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.52)',
                borderRadius: 18,
                padding: isMobile ? '14px 10px' : '18px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                cursor: 'pointer', transition: 'all 0.18s ease', textAlign: 'center',
                boxShadow: '0 4px 16px rgba(31,29,23,0.07), inset 0 1px 0 rgba(255,255,255,0.7)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(250,246,234,0.85)'
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(31,58,42,0.14), inset 0 1px 0 rgba(255,255,255,0.8)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(250,246,234,0.62)'
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(31,29,23,0.07), inset 0 1px 0 rgba(255,255,255,0.7)'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(31,29,23,0.05)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(31,58,42,0.14), inset 0 1px 0 rgba(255,255,255,0.8)' }}
            >
              <item.Icon size={isMobile ? 20 : 22} color="#1F3A2A" />
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 13 : 14, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                  {item.label}
                </div>
                {!isMobile && (
                  <div style={{ fontSize: 11, color: '#6B6857', marginTop: 2 }}>{item.sub}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

    </main>
  )
}
