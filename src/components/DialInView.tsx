import { useState } from 'react'
import type { Shot, WindDirection, WindStrength } from '../types'
import { CLUBS_DATA, getClubAvg } from '../data'

interface Props { shots: Shot[]; isMobile?: boolean }

const WIND_DIRS: { id: WindDirection; label: string; hint: string }[] = [
  { id: 'none',     label: 'No wind',         hint: 'Calm' },
  { id: 'headwind', label: 'Into wind',        hint: 'Ball goes shorter' },
  { id: 'tailwind', label: 'Downwind',         hint: 'Ball goes farther' },
  { id: 'left',     label: 'Left → Right',     hint: 'Wind pushes right' },
  { id: 'right',    label: 'Right ← Left',     hint: 'Wind pushes left' },
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

const card: React.CSSProperties = {
  background: '#FAF6EA', border: '1px solid #E0D8C5',
  borderRadius: 20, padding: '24px 28px',
}

export default function DialInView({ shots, isMobile }: Props) {
  const [target, setTarget]     = useState('')
  const [dir, setDir]           = useState<WindDirection>('none')
  const [str, setStr]           = useState<WindStrength>('light')
  const [result, setResult]     = useState<Suggestion[] | null>(null)
  const [adjusted, setAdjusted] = useState<number | null>(null)

  const hasEnoughData = CLUBS_DATA.some(c => getClubAvg(shots, c.id) !== null)

  const handleFind = () => {
    const t = parseInt(target)
    if (!t || t <= 0) return
    const adj = t + windAdjustment(dir, dir === 'none' ? 'light' : str)
    setAdjusted(adj)
    setResult(getSuggestions(shots, adj))
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    color: '#4A4235', textTransform: 'uppercase', marginBottom: 10, display: 'block',
  }

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: isMobile ? '24px 16px' : '48px 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 24 : 36 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 8 }}>
          Club Recommender
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 28 : 38, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: 0 }}>
          Dial in.
        </h1>
        <p style={{ fontSize: 14, color: '#4A4235', marginTop: 8 }}>
          Enter your target distance and wind conditions — we'll find your club.
        </p>
      </div>

      {!hasEnoughData ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 28px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⛳</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', marginBottom: 8 }}>No shot data yet</div>
          <p style={{ fontSize: 14, color: '#4A4235' }}>Log shots in My Bag first so we can recommend clubs based on your real averages.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24, maxWidth: isMobile ? '100%' : 820 }}>

          {/* Target distance */}
          <div style={card}>
            <span style={labelStyle}>Target distance</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number" min={1} max={400} value={target}
                onChange={e => { setTarget(e.target.value); setResult(null) }}
                placeholder="e.g. 150"
                inputMode="numeric"
                style={{
                  flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5',
                  borderRadius: 12, padding: '13px 16px', fontSize: 22,
                  fontWeight: 700, color: '#1F1D17', outline: 'none',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  letterSpacing: '-0.02em',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
              />
              <span style={{ fontSize: 15, color: '#4A4235', fontWeight: 500 }}>yds</span>
            </div>
          </div>

          {/* Wind direction */}
          <div style={card}>
            <span style={labelStyle}>Wind direction</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WIND_DIRS.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setDir(d.id); setResult(null) }}
                  title={d.hint}
                  style={{
                    border: '1px solid', borderRadius: 999, padding: '7px 14px',
                    fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    background: dir === d.id ? '#1F3A2A' : 'transparent',
                    color: dir === d.id ? '#FAF6EA' : '#1F1D17',
                    borderColor: dir === d.id ? '#1F3A2A' : '#E0D8C5',
                    transition: 'all 0.15s',
                  }}
                >
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
                {WIND_STRENGTHS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setStr(s.id); setResult(null) }}
                    style={{
                      flex: 1, border: '1px solid', borderRadius: 14, padding: '10px 8px',
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      background: str === s.id ? '#1F3A2A' : 'transparent',
                      color: str === s.id ? '#FAF6EA' : '#1F1D17',
                      borderColor: str === s.id ? '#1F3A2A' : '#E0D8C5',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{s.mph}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Find button */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: isMobile ? '1' : (dir !== 'none' ? 'auto' : '2') }}>
            <button
              onClick={handleFind}
              disabled={!target}
              style={{
                width: '100%', background: target ? '#1F3A2A' : '#8B8272',
                color: '#FAF6EA', border: 'none', borderRadius: 999,
                padding: '15px 24px', fontSize: 15, fontWeight: 600,
                cursor: target ? 'pointer' : 'not-allowed',
                fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (target) e.currentTarget.style.background = '#16271D' }}
              onMouseLeave={e => { if (target) e.currentTarget.style.background = '#1F3A2A' }}
              onMouseDown={e => { if (target) e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Find my club →
            </button>
          </div>

          {/* Results */}
          {result && adjusted !== null && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ ...card, padding: '28px 32px' }}>
                {/* Adjusted yardage note */}
                {dir !== 'none' && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: '#F0EBDD', borderRadius: 999, padding: '6px 14px',
                    fontSize: 12.5, color: '#4A4235', marginBottom: 20,
                  }}>
                    <span>Playing distance after wind:</span>
                    <strong style={{ color: '#1F1D17' }}>{adjusted} yds</strong>
                    <span style={{ color: '#6B5F4E' }}>({windAdjustment(dir, str) > 0 ? '+' : ''}{windAdjustment(dir, str)} yds)</span>
                  </div>
                )}

                {result.length === 0 ? (
                  <p style={{ color: '#4A4235', fontSize: 14 }}>No club data available. Log more shots in My Bag.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {result.map((s, i) => (
                      <div key={s.clubId} style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        background: i === 0 ? '#1F3A2A' : '#F0EBDD',
                        borderRadius: 16, padding: '18px 24px',
                        border: i === 0 ? 'none' : '1px solid #E0D8C5',
                      }}>
                        {/* Club badge */}
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: i === 0 ? '#D9824D' : '#1F3A2A',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                          fontSize: 13, fontWeight: 700, color: '#FAF6EA',
                          flexShrink: 0,
                        }}>
                          {s.abbr}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: i === 0 ? 18 : 15, fontWeight: 700, color: i === 0 ? '#FAF6EA' : '#1F1D17', letterSpacing: '-0.02em' }}>
                            {i === 0 && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D9824D', display: 'block', marginBottom: 2 }}>Best match</span>}
                            {s.name}
                          </div>
                          <div style={{ fontSize: 13, color: i === 0 ? 'rgba(250,246,234,0.65)' : '#4A4235', marginTop: 2 }}>
                            Your average: {s.avg} yds
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: i === 0 ? '#FAF6EA' : '#1F1D17', letterSpacing: '-0.03em' }}>
                            {s.diff === 0 ? 'Perfect' : `${s.diff} yds off`}
                          </div>
                        </div>
                      </div>
                    ))}
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

