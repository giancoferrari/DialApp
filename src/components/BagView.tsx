import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Shot, Club, ClubCat } from '../types'
import { CLUBS_DATA, CAT_LABELS, BAR_MAX, getClubAvg, getClubLast, getClubShots } from '../data'
import FlagPin from './FlagPin'
import OrganicGraphic from './OrganicGraphic'
import ClubBadge from './ClubBadge'

gsap.registerPlugin(ScrollTrigger, useGSAP)

interface CardProps {
  club: Club
  shots: Shot[]
  onLog: () => void
}

function ClubGridCard({ club, shots, onLog }: CardProps) {
  const avg   = getClubAvg(shots, club.id)
  const last  = getClubLast(shots, club.id)
  const count = getClubShots(shots, club.id).length
  const pct   = avg ? Math.min((avg / BAR_MAX) * 100, 100) : 0
  const [hover, setHover] = useState(false)

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onLog}
      style={{
        background: '#FAF6EA', border: '1px solid #E0D8C5',
        borderRadius: 24, padding: 24, cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover ? '0 16px 36px rgba(31,58,42,0.10)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <ClubBadge abbr={club.abbr} size={52} variant={hover ? 'sage' : 'default'} />
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
          color: '#6B6857', textTransform: 'uppercase',
          background: '#F0EBDD', padding: '4px 10px', borderRadius: 999,
        }}>
          {CAT_LABELS[club.cat]}
        </span>
      </div>

      <h3 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 24, fontWeight: 700, color: '#1F1D17',
        letterSpacing: '-0.025em', marginBottom: 16, lineHeight: 1, marginTop: 0,
      }}>
        {club.name}
      </h3>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <span style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 64, fontWeight: 700, lineHeight: 0.9,
          color: avg ? '#1F3A2A' : '#C9C0A8', letterSpacing: '-0.04em',
        }}>
          {avg ?? '—'}
        </span>
        <span style={{ fontSize: 13, color: '#6B6857', paddingBottom: 8, fontWeight: 500 }}>
          yds avg
        </span>
      </div>

      {/* Range bar */}
      <div style={{ height: 4, background: '#F0EBDD', borderRadius: 2, position: 'relative', marginBottom: 14 }}>
        {avg && (
          <>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
              background: 'linear-gradient(90deg, rgba(31,58,42,0.3), #1F3A2A)',
              borderRadius: 2,
            }} />
            <div style={{
              position: 'absolute', left: `${pct}%`, top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 10, height: 10, borderRadius: 5,
              background: '#D9824D', boxShadow: '0 0 0 3px #FAF6EA',
            }} />
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6857' }}>
        <span>{count > 0 ? `${count} shots` : 'No data yet'}</span>
        <span>
          {last ? <><span>Last: </span><strong style={{ color: '#1F1D17' }}>{last}y</strong></> : '—'}
        </span>
      </div>
    </article>
  )
}

interface Props {
  shots: Shot[]
  onLogFor: (club: Club) => void
}

const ALL_CATS: Array<ClubCat | 'all'> = ['all', 'woods', 'hybrids', 'irons', 'wedges']

export default function BagView({ shots, onLogFor }: Props) {
  const [filter, setFilter] = useState<ClubCat | 'all'>('all')
  const containerRef = useRef<HTMLElement>(null)
  const headerLeftRef = useRef<HTMLDivElement>(null)
  const headerRightRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const filtered = CLUBS_DATA.filter(c => filter === 'all' || c.cat === filter)

  useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Header left stagger
      if (headerLeftRef.current) {
        gsap.fromTo(
          headerLeftRef.current.children,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power3.out', delay: 0.05 }
        )
      }
      // Header right
      if (headerRightRef.current) {
        gsap.fromTo(
          headerRightRef.current,
          { opacity: 0, scale: 0.92, x: 20 },
          { opacity: 1, scale: 1, x: 0, duration: 0.7, ease: 'power3.out', delay: 0.2 }
        )
      }
    })

    return () => mm.revert()
  }, { scope: containerRef })

  // Re-animate grid when filter changes
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.club-card')
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.055, ease: 'power3.out' }
        )
      }
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [filter] })

  return (
    <main ref={containerRef} style={{ maxWidth: 1320, margin: '0 auto', padding: '48px 40px 96px' }}>

      {/* Header */}
      <section style={{
        display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 64,
        alignItems: 'center', marginBottom: 48,
      }}>
        <div ref={headerLeftRef}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
            color: '#D9824D', textTransform: 'uppercase', marginBottom: 12,
          }}>
            <FlagPin size={12} /> Your bag
          </div>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 76, fontWeight: 700, lineHeight: 0.95,
            letterSpacing: '-0.045em', color: '#1F1D17',
            marginBottom: 20, marginTop: 0,
          }}>
            <span style={{ color: '#1F3A2A' }}>Every</span>
            <span style={{ color: '#D9824D' }}> club,</span>
            <br />
            <span style={{ fontStyle: 'italic', color: '#5C7A4D', fontWeight: 400 }}>every</span>
            <span style={{ color: '#1F3A2A' }}> yard.</span>
          </h1>
          <p style={{
            fontSize: 16, lineHeight: 1.5, color: '#6B6857',
            maxWidth: 480, fontWeight: 400, margin: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Fifteen clubs, one source of truth. Tap any card to log a fresh shot
            or review your distribution.
          </p>
        </div>
        <div ref={headerRightRef} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <OrganicGraphic size={280} />
        </div>
      </section>

      {/* Filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {ALL_CATS.map(cat => {
          const active = filter === cat
          const label = cat === 'all' ? 'All clubs' : CAT_LABELS[cat]
          const count = cat === 'all' ? CLUBS_DATA.length : CLUBS_DATA.filter(c => c.cat === cat).length
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                border: '1px solid', borderColor: active ? '#1F3A2A' : '#E0D8C5',
                background: active ? '#1F3A2A' : '#FAF6EA',
                color: active ? '#FAF6EA' : '#1F1D17',
                borderRadius: 999, padding: '9px 16px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {label}
              <span style={{ fontSize: 11, color: active ? '#B5C29A' : '#6B6857', fontWeight: 500 }}>
                {count}
              </span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: '#6B6857', fontFamily: "'DM Sans', sans-serif" }}>
          Showing <strong style={{ color: '#1F1D17' }}>{filtered.length}</strong> clubs
        </div>
      </div>

      {/* Club grid */}
      <div
        ref={gridRef}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
      >
        {filtered.map(club => (
          <div key={club.id} className="club-card">
            <ClubGridCard club={club} shots={shots} onLog={() => onLogFor(club)} />
          </div>
        ))}
      </div>
    </main>
  )
}
