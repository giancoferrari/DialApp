import { useRef, useState } from 'react'
import type { Shot, WindDirection, WindStrength } from '../types'
import { CLUBS_DATA, getClubAvg } from '../data'
import { TargetIcon } from './Icons'
import EmptyState from './EmptyState'
import PageHeader from './PageHeader'
import { useStaggerMount } from '../hooks/useStaggerMount'
import { color, font, radius, page } from '../lib/tokens'
import { card as cardSurface } from '../lib/surfaces'

interface Props { shots: Shot[]; isMobile?: boolean }

const WIND_DIRS: { id: WindDirection; label: string; hint: string }[] = [
  { id: 'none',     label: 'No wind',      hint: 'Calm' },
  { id: 'headwind', label: 'Into wind',    hint: 'Ball goes shorter' },
  { id: 'tailwind', label: 'Downwind',     hint: 'Ball goes farther' },
  { id: 'left',     label: 'Left → Right', hint: 'Wind pushes right' },
  { id: 'right',    label: 'Right ← Left', hint: 'Wind pushes left' },
]

const WIND_STRENGTHS: { id: WindStrength; label: string; mph: string }[] = [
  { id: 'light',    label: 'Light',    mph: '~10 mph' },
  { id: 'moderate', label: 'Moderate', mph: '~20 mph' },
  { id: 'strong',   label: 'Strong',   mph: '~30 mph' },
]

function windAdjustment(dir: WindDirection, str: WindStrength): number {
  if (dir === 'none') return 0
  const table: Record<WindDirection, Record<WindStrength, number>> = {
    none:     { light: 0,  moderate: 0,  strong: 0  },
    headwind: { light: 7,  moderate: 13, strong: 20 },
    tailwind: { light: -5, moderate: -10, strong: -15 },
    left:     { light: 4,  moderate: 8,  strong: 12 },
    right:    { light: 4,  moderate: 8,  strong: 12 },
  }
  return table[dir][str]
}

interface Suggestion { clubId: string; name: string; abbr: string; avg: number; diff: number }

function getSuggestions(shots: Shot[], adjustedYards: number): Suggestion[] {
  return CLUBS_DATA
    .map(c => { const avg = getClubAvg(shots, c.id); return avg !== null ? { clubId: c.id, name: c.name, abbr: c.abbr, avg, diff: Math.abs(avg - adjustedYards) } : null })
    .filter((x): x is Suggestion => x !== null)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3)
}

export default function DialInView({ shots, isMobile }: Props) {
  const [target, setTarget]     = useState('')
  const [dir, setDir]           = useState<WindDirection>('none')
  const [str, setStr]           = useState<WindStrength>('light')
  const [result, setResult]     = useState<Suggestion[] | null>(null)
  const [adjusted, setAdjusted] = useState<number | null>(null)

  const hasEnoughData = CLUBS_DATA.some(c => getClubAvg(shots, c.id) !== null)
  const px = isMobile ? page.pxMobile : page.pxDesktop
  const containerRef = useRef<HTMLDivElement>(null)
  useStaggerMount(containerRef)

  const handleFind = () => {
    const t = parseInt(target)
    if (!t || t <= 0) return
    const adj = t + windAdjustment(dir, dir === 'none' ? 'light' : str)
    setAdjusted(adj)
    setResult(getSuggestions(shots, adj))
  }

  const card = { ...cardSurface, padding: '20px 20px' }
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 10, display: 'block' }

  const pill = (active: boolean): React.CSSProperties => ({
    border: `1px solid ${active ? color.green : color.border}`, borderRadius: 999, padding: '7px 14px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font.body,
    background: active ? color.green : color.white,
    color: active ? color.onGreen : color.inkSoft,
    transition: 'all 0.15s',
  })

  return (
    <div ref={containerRef} style={{ maxWidth: page.maxW, margin: '0 auto', padding: `${isMobile ? page.topMobile : page.topDesktop}px ${px}px ${isMobile ? page.bottomMobile : page.bottomDesktop}px` }}>

      <div style={{ marginBottom: 24 }}>
        <PageHeader title="Dial in" subtitle="Enter your target and the wind. We'll find your club from your real averages." isMobile={isMobile} />
      </div>

      {!hasEnoughData ? (
        <EmptyState
          icon={<TargetIcon size={24} color={color.faint} />}
          title="No shot data yet"
          subtitle="Log shots in My Bag first so we can recommend clubs based on your real averages."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, maxWidth: isMobile ? '100%' : 720 }}>

          {/* Target distance */}
          <div style={card}>
            <span style={labelStyle}>Target distance</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number" min={1} max={400} value={target}
                onChange={e => { setTarget(e.target.value); setResult(null) }}
                placeholder="150"
                inputMode="numeric"
                style={{ flex: 1, background: color.white, border: `1px solid ${color.borderStrong}`, borderRadius: radius.sm, padding: '11px 14px', fontSize: 24, fontWeight: 600, color: color.ink, outline: 'none', fontFamily: font.display, letterSpacing: '-0.02em', boxSizing: 'border-box', minWidth: 0 }}
                onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
              />
              <span style={{ fontSize: 15, color: color.muted, fontWeight: 500 }}>yds</span>
            </div>
          </div>

          {/* Wind direction */}
          <div style={card}>
            <span style={labelStyle}>Wind direction</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WIND_DIRS.map(d => (
                <button key={d.id} onClick={() => { setDir(d.id); setResult(null) }} title={d.hint} style={pill(dir === d.id)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wind strength — only if wind selected */}
          {dir !== 'none' && (
            <div style={{ ...card, gridColumn: isMobile ? '1' : 'auto' }}>
              <span style={labelStyle}>Wind strength</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {WIND_STRENGTHS.map(s => {
                  const active = str === s.id
                  return (
                    <button key={s.id} onClick={() => { setStr(s.id); setResult(null) }}
                      style={{ flex: 1, border: `1px solid ${active ? color.green : color.border}`, borderRadius: radius.sm, padding: '10px 8px', cursor: 'pointer', fontFamily: font.body, background: active ? color.green : color.white, color: active ? color.onGreen : color.inkSoft, transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.mph}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Find button */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: isMobile ? '1' : (dir !== 'none' ? 'auto' : '2') }}>
            <button
              onClick={handleFind}
              disabled={!target}
              style={{ width: '100%', background: target ? color.green : color.borderStrong, color: target ? color.onGreen : color.inkSoft, border: 'none', borderRadius: radius.md, padding: '15px 24px', fontSize: 15, fontWeight: 600, cursor: target ? 'pointer' : 'not-allowed', fontFamily: font.body, transition: 'background 0.15s' }}
              onMouseEnter={e => { if (target) e.currentTarget.style.background = color.greenDeep }}
              onMouseLeave={e => { if (target) e.currentTarget.style.background = color.green }}
            >
              Find my club
            </button>
          </div>

          {/* Results */}
          {result && adjusted !== null && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ ...card, padding: '22px 22px' }}>
                {dir !== 'none' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: color.sand, borderRadius: 999, padding: '6px 14px', fontSize: 13, color: color.inkSoft, marginBottom: 18 }}>
                    <span>Plays like</span>
                    <strong style={{ color: color.ink, fontFamily: font.display }}>{adjusted} yds</strong>
                    <span style={{ color: color.muted }}>({windAdjustment(dir, str) > 0 ? '+' : ''}{windAdjustment(dir, str)})</span>
                  </div>
                )}

                {result.length === 0 ? (
                  <p style={{ color: color.muted, fontSize: 14 }}>No club data available. Log more shots in My Bag.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.map((s, i) => {
                      const best = i === 0
                      return (
                        <div key={s.clubId} style={{ display: 'flex', alignItems: 'center', gap: 14, background: best ? color.green : color.sand, borderRadius: radius.lg, padding: '16px 18px' }}>
                          <div style={{ width: 44, height: 44, borderRadius: radius.sm, background: best ? 'rgba(255,255,255,0.12)' : color.greenTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.display, fontSize: 14, fontWeight: 600, color: best ? color.onGreen : color.green, flexShrink: 0 }}>
                            {s.abbr}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {best && <div style={{ fontSize: 12, fontWeight: 600, color: '#9FD4B4', marginBottom: 2 }}>Best match</div>}
                            <div style={{ fontFamily: font.body, fontSize: best ? 16 : 15, fontWeight: 600, color: best ? color.onGreen : color.ink }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: 13, color: best ? 'rgba(242,245,241,0.7)' : color.muted, marginTop: 1 }}>
                              Your average: {s.avg} yds
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: best ? color.onGreen : color.ink }}>
                              {s.diff === 0 ? 'Perfect' : `${s.diff} off`}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
