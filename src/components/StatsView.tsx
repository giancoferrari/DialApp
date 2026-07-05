import { useRef } from 'react'
import type { Round, Shot, View } from '../types'
import { aggregateStats, scoreTrend, estimateHandicap, bagGaps } from '../lib/stats'
import { ChevronLeftIcon } from './Icons'
import { useEdgeSwipeBack } from '../hooks/useGestures'
import { useStaggerMount } from '../hooks/useStaggerMount'
import { color, font, radius, elevation } from '../lib/tokens'
import { card } from '../lib/surfaces'

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
  if (n <= 0) return color.birdie
  if (n <= 6) return color.gold
  return color.orange
}
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function StatsView({ rounds, shots, isMobile = false, onNavigate }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const px  = isMobile ? 20 : 40
  useEdgeSwipeBack(() => onNavigate('tools'))

  useStaggerMount(ref)

  const agg   = aggregateStats(rounds)
  const trend = scoreTrend(rounds, 8)
  const hcp   = estimateHandicap(rounds)
  const { gaps, clubsWithData } = bagGaps(shots)

  const sectionLabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 12 }

  const metrics = [
    { label: 'Greens in reg', value: agg.girPct,     suffix: '%',  rounds: agg.girRounds,     max: 100 },
    { label: 'Fairways',      value: agg.fairwayPct,  suffix: '%',  rounds: agg.fairwayRounds, max: 100 },
    { label: 'Putts / 18',    value: agg.puttsPer18,  suffix: '',   rounds: agg.puttRounds,    max: 40, invert: true },
    { label: 'Scrambling',    value: agg.scramblePct, suffix: '%',  rounds: agg.scrambleRounds, max: 100 },
  ] as const

  // Trend chart scaling (by score; bars taller = higher score, colored by to-par)
  const scores = trend.map(t => t.score)
  const minS = scores.length ? Math.min(...scores) : 0
  const range = Math.max(1, (scores.length ? Math.max(...scores) : 1) - minS)

  return (
    <div ref={ref} style={{ maxWidth: 680, margin: '0 auto', padding: `0 0 ${isMobile ? 120 : 80}px` }}>

      {/* ════ Warm header — estimated handicap ════ */}
      <section style={{ padding: `${isMobile ? 22 : 28}px ${px}px 0` }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <button onClick={() => onNavigate('tools')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 500, color: color.inkSoft, padding: 0, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            <ChevronLeftIcon size={18} color={color.inkSoft} /> Tools
          </button>

          <div style={{ background: color.card, border: `1px solid ${color.border}`, borderRadius: radius.lg, boxShadow: elevation.sm, padding: isMobile ? '22px 22px' : '26px 26px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: color.faint, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 8 }}>Estimated handicap</div>
            {hcp.value !== null ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                  <div style={{ fontFamily: font.display, fontSize: isMobile ? 54 : 62, fontWeight: 700, color: color.ink, letterSpacing: '-0.04em', lineHeight: 0.92, fontVariantNumeric: 'tabular-nums' }}>
                    {hcp.value > 0 ? hcp.value.toFixed(1) : (hcp.value === 0 ? 'E' : hcp.value.toFixed(1))}
                  </div>
                  {agg.bestToPar !== null && (
                    <div style={{ paddingBottom: 6, display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', background: color.greenTint, borderRadius: radius.sm, padding: '8px 12px' }}>
                      <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, color: color.positive, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{toParText(agg.bestToPar)}</div>
                      <div style={{ fontSize: 11, color: color.muted, marginTop: 3, fontWeight: 600 }}>best round</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: color.muted, marginTop: 14 }}>From your best {Math.min(8, hcp.basedOn)} of {hcp.basedOn} recent 18-hole rounds.</div>
              </>
            ) : (
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: color.ink, letterSpacing: '-0.02em', marginBottom: 6 }}>
                  Play {hcp.roundsNeeded} more 18-hole round{hcp.roundsNeeded !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 13.5, color: color.muted, lineHeight: 1.5 }}>Log complete 18-hole rounds and Dial will estimate your handicap automatically.</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div style={{ padding: `22px ${px}px 0`, maxWidth: 600 + px * 2, margin: '0 auto' }}>

        {/* ── Score trend ── */}
        {trend.length >= 2 && (
          <div style={{ ...card, padding: '20px 20px', marginBottom: 16 }}>
            <div style={sectionLabel}>Recent rounds</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: isMobile ? 6 : 10, height: 130 }}>
              {trend.map((t, i) => {
                const h = 28 + ((t.score - minS) / range) * 78
                const c = toParColor(t.toPar)
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}>
                    <div style={{ fontFamily: font.display, fontSize: 13, fontWeight: 600, color: c, fontVariantNumeric: 'tabular-nums' }}>{toParText(t.toPar)}</div>
                    <div style={{ width: '70%', maxWidth: 26, height: h, borderRadius: 6, background: c }} />
                    <div style={{ fontSize: 10, color: color.faint, whiteSpace: 'nowrap' }}>{shortDate(t.date)}</div>
                  </div>
                )
              })}
            </div>
            {agg.avgToPar !== null && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${color.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: color.muted }}>
                <span>Avg vs par <strong style={{ color: color.ink, fontFamily: font.display }}>{toParText(agg.avgToPar)}</strong> over {agg.scoredRounds} round{agg.scoredRounds !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Key averages ── */}
        <div style={sectionLabel}>Averages</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {metrics.map(m => {
            const has = m.value !== null
            const fillPct = has ? Math.min(100, ('invert' in m && m.invert ? (1 - (m.value! / m.max)) : m.value! / m.max) * 100) : 0
            return (
              <div key={m.label} style={{ ...card, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontFamily: font.display, fontSize: 28, fontWeight: 600, color: has ? color.ink : color.faint, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {has ? m.value : '—'}
                  </span>
                  {has && m.suffix && <span style={{ fontSize: 15, fontWeight: 600, color: color.muted, fontFamily: font.display }}>{m.suffix}</span>}
                </div>
                <div style={{ fontSize: 13, color: color.inkSoft, fontWeight: 500, marginTop: 6 }}>{m.label}</div>
                <div style={{ height: 4, background: color.creamDeep, borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                  <div style={{ height: '100%', width: `${fillPct}%`, background: color.green, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: color.faint, marginTop: 6 }}>{has ? `from ${m.rounds} round${m.rounds !== 1 ? 's' : ''}` : 'log putts, fairways & GIR'}</div>
              </div>
            )
          })}
        </div>

        {/* ── Bag gaps ── */}
        <div style={sectionLabel}>Gaps in the bag</div>
        <div style={{ ...card, padding: clubsWithData >= 2 ? '8px 18px' : '24px 18px' }}>
          {clubsWithData < 2 ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: color.ink, fontWeight: 600, marginBottom: 6, fontFamily: font.body }}>Log a few shots first</div>
              <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.5, marginBottom: 14 }}>Once Dial knows a couple of your club distances, it'll flag yardage gaps to fill.</div>
              <button onClick={() => onNavigate('bag')} style={{ background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}>Go to My Bag</button>
            </div>
          ) : (
            gaps.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${color.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: font.display, fontSize: 13, fontWeight: 600, color: color.green }}>{g.from.abbr}</span>
                  <span style={{ flex: 1, height: 1, background: g.notable ? 'rgba(194,94,51,0.4)' : color.border, position: 'relative' }} />
                  <span style={{ fontFamily: font.display, fontSize: 13, fontWeight: 600, color: color.green }}>{g.to.abbr}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: g.notable ? color.orange : color.ink, fontVariantNumeric: 'tabular-nums' }}>{g.gap}</span>
                  <span style={{ fontSize: 11, color: color.faint, marginLeft: 3 }}>yd</span>
                  {g.notable && <div style={{ fontSize: 10, color: color.orange, fontWeight: 600 }}>big gap</div>}
                </div>
              </div>
            ))
          )}
        </div>

        {agg.totalRounds === 0 && (
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: color.muted }}>
            Log your first round to start tracking trends.
          </div>
        )}
      </div>
    </div>
  )
}
