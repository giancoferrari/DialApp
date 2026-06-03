import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { Round, Shot, View } from '../types'
import { aggregateStats, scoreTrend, estimateHandicap, bagGaps } from '../lib/stats'
import { useEdgeSwipeBack } from '../hooks/useGestures'

gsap.registerPlugin(useGSAP)

interface Props {
  rounds: Round[]
  shots: Shot[]
  isMobile?: boolean
  onNavigate: (v: View) => void
}

function toParText(n: number): string {
  return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`
}
function toParColor(n: number): string {
  if (n <= 0) return '#5C7A4D'
  if (n <= 6) return '#C8A84B'
  return '#D9824D'
}
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function StatsView({ rounds, shots, isMobile = false, onNavigate }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const px  = isMobile ? 20 : 40
  useEdgeSwipeBack(() => onNavigate('tools'))

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (ref.current) {
        gsap.fromTo(Array.from(ref.current.children),
          { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' })
      }
    })
    return () => mm.revert()
  }, { scope: ref })

  const agg   = aggregateStats(rounds)
  const trend = scoreTrend(rounds, 8)
  const hcp   = estimateHandicap(rounds)
  const { gaps, clubsWithData } = bagGaps(shots)

  const card: React.CSSProperties = {
    background: '#FFFDF8',
    border: '1px solid #E0D8C5', borderRadius: 18,
  }
  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 12 }

  const metrics = [
    { label: 'Greens in reg', value: agg.girPct,     suffix: '%',  rounds: agg.girRounds,     max: 100 },
    { label: 'Fairways',      value: agg.fairwayPct,  suffix: '%',  rounds: agg.fairwayRounds, max: 100 },
    { label: 'Putts / 18',    value: agg.puttsPer18,  suffix: '',   rounds: agg.puttRounds,    max: 40, invert: true },
    { label: 'Scrambling',    value: agg.scramblePct, suffix: '%',  rounds: agg.scrambleRounds, max: 100 },
  ] as const

  // Trend chart scaling (by score; bars taller = higher score, colored by to-par)
  const scores = trend.map(t => t.score)
  const minS = scores.length ? Math.min(...scores) : 0
  const maxS = scores.length ? Math.max(...scores) : 1
  const range = Math.max(1, maxS - minS)

  return (
    <div ref={ref} style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 24 : 44}px ${px}px ${isMobile ? 120 : 80}px` }}>

      <button onClick={() => onNavigate('tools')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4A4235', padding: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span> Tools
      </button>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#8B8272', textTransform: 'uppercase', marginBottom: 8 }}>Your game</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: '0 0 28px', lineHeight: 1 }}>
        Stats
      </h1>

      {/* ── Estimated handicap hero ── */}
      <div style={{ background: 'linear-gradient(160deg, rgba(35,68,46,1) 0%, rgba(26,50,33,1) 100%)', borderRadius: 24, padding: '24px 24px 26px', marginBottom: 18, boxShadow: '0 14px 44px rgba(31,58,42,0.26), inset 0 1px 0 rgba(255,255,255,0.10)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(250,246,234,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Estimated handicap</div>
        {hcp.value !== null ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 60, fontWeight: 800, color: '#FAF6EA', letterSpacing: '-0.04em', lineHeight: 0.95 }}>
                {hcp.value > 0 ? hcp.value.toFixed(1) : (hcp.value === 0 ? 'E' : hcp.value.toFixed(1))}
              </div>
              {agg.bestToPar !== null && (
                <div style={{ paddingBottom: 8 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#8BC47A', letterSpacing: '-0.02em' }}>{toParText(agg.bestToPar)}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(250,246,234,0.45)', marginTop: 1 }}>best round</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(250,246,234,0.5)', marginTop: 12 }}>From your best {Math.min(8, hcp.basedOn)} of {hcp.basedOn} recent 18-hole rounds.</div>
          </>
        ) : (
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em', marginBottom: 6 }}>
              Play {hcp.roundsNeeded} more 18-hole round{hcp.roundsNeeded !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(250,246,234,0.55)', lineHeight: 1.5 }}>Log complete 18-hole rounds and Dial will estimate your handicap automatically.</div>
          </div>
        )}
      </div>

      {/* ── Score trend ── */}
      {trend.length >= 2 && (
        <div style={{ ...card, padding: '20px 22px', marginBottom: 18 }}>
          <div style={sectionLabel}>Recent rounds</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: isMobile ? 6 : 10, height: 130 }}>
            {trend.map((t, i) => {
              const h = 28 + ((t.score - minS) / range) * 78
              const c = toParColor(t.toPar)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: c }}>{toParText(t.toPar)}</div>
                  <div style={{ width: '70%', maxWidth: 26, height: h, borderRadius: 7, background: c, opacity: 0.9 }} />
                  <div style={{ fontSize: 9.5, color: '#8B8272', whiteSpace: 'nowrap' }}>{shortDate(t.date)}</div>
                </div>
              )
            })}
          </div>
          {agg.avgToPar !== null && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(224,216,197,0.6)', display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#4A4235' }}>
              <span>Avg vs par <strong style={{ color: '#1F1D17' }}>{toParText(agg.avgToPar)}</strong> over {agg.scoredRounds} round{agg.scoredRounds !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Key averages ── */}
      <div style={sectionLabel}>Averages</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        {metrics.map(m => {
          const has = m.value !== null
          const fillPct = has ? Math.min(100, ('invert' in m && m.invert ? (1 - (m.value! / m.max)) : m.value! / m.max) * 100) : 0
          return (
            <div key={m.label} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, color: has ? '#1F1D17' : '#C9C0A8', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {has ? m.value : '—'}
                </span>
                {has && m.suffix && <span style={{ fontSize: 15, fontWeight: 700, color: '#6B5F4E' }}>{m.suffix}</span>}
              </div>
              <div style={{ fontSize: 12, color: '#4A4235', fontWeight: 600, marginTop: 6 }}>{m.label}</div>
              <div style={{ height: 4, background: 'rgba(31,58,42,0.10)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${fillPct}%`, background: '#5C7A4D', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10.5, color: '#8B8272', marginTop: 6 }}>{has ? `from ${m.rounds} round${m.rounds !== 1 ? 's' : ''}` : 'log putts, fairways & GIR'}</div>
            </div>
          )
        })}
      </div>

      {/* ── Bag gaps ── */}
      <div style={sectionLabel}>Gaps in the bag</div>
      <div style={{ ...card, padding: clubsWithData >= 2 ? '8px 18px' : '24px 18px' }}>
        {clubsWithData < 2 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#1F1D17', fontWeight: 600, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>Log a few shots first</div>
            <div style={{ fontSize: 13, color: '#6B5F4E', lineHeight: 1.5, marginBottom: 14 }}>Once Dial knows a couple of your club distances, it'll flag yardage gaps to fill.</div>
            <button onClick={() => onNavigate('bag')} style={{ background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '10px 22px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Go to My Bag</button>
          </div>
        ) : (
          gaps.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(224,216,197,0.55)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: '#1F3A2A' }}>{g.from.abbr}</span>
                <span style={{ flex: 1, height: 1, background: g.notable ? 'rgba(217,130,77,0.4)' : 'rgba(224,216,197,0.9)', position: 'relative' }} />
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: '#1F3A2A' }}>{g.to.abbr}</span>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: g.notable ? '#D9824D' : '#1F1D17', letterSpacing: '-0.02em' }}>{g.gap}</span>
                <span style={{ fontSize: 11, color: '#8B8272', marginLeft: 3 }}>yd</span>
                {g.notable && <div style={{ fontSize: 10, color: '#D9824D', fontWeight: 600 }}>big gap</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {agg.totalRounds === 0 && (
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#6B5F4E' }}>
          Log your first round to start tracking trends.
        </div>
      )}
    </div>
  )
}
