import type { RoundRecapMeta } from '../types'
import { color, font } from '../lib/tokens'

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const GREEN = color.green
const ON = color.onGreen

// Faint concentric-green + flag motif used as a background flourish
function GreenMotif({ size = 210 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <ellipse cx="100" cy="124" rx="94" ry="58" stroke={ON} strokeWidth="2" />
      <ellipse cx="100" cy="124" rx="64" ry="39" stroke={ON} strokeWidth="2" />
      <ellipse cx="100" cy="124" rx="34" ry="21" stroke={ON} strokeWidth="2" />
      <line x1="100" y1="124" x2="100" y2="28" stroke={ON} strokeWidth="2" strokeLinecap="round" />
      <path d="M100 28 L132 38 L100 49 Z" fill={ON} />
    </svg>
  )
}

export default function RecapCard({ meta, variant }: { meta: RoundRecapMeta; variant: 'feed' | 'detail' | 'tile' }) {
  const even      = meta.toPar === 0
  const under     = meta.toPar < 0
  const diffColor = even ? 'rgba(242,245,241,0.85)' : under ? '#9FD4B4' : '#E8C9A8'
  const diffText  = even ? 'E' : meta.toPar > 0 ? `+${meta.toPar}` : `${meta.toPar}`
  const parWord   = even ? 'Even par' : `${Math.abs(meta.toPar)} ${under ? 'under' : 'over'} par`

  // ── Square tile for the profile grid ──
  if (variant === 'tile') {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%', background: GREEN, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div style={{ position: 'absolute', right: -34, bottom: -42, opacity: 0.08, pointerEvents: 'none' }}><GreenMotif size={130} /></div>
        <span style={{ position: 'relative', fontSize: 10, fontWeight: 500, color: 'rgba(242,245,241,0.6)', fontFamily: font.body }}>Round</span>
        <span style={{ position: 'relative', fontFamily: font.display, fontSize: 38, fontWeight: 600, color: ON, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{meta.score}</span>
        <span style={{ position: 'relative', fontFamily: font.display, fontSize: 14, fontWeight: 600, color: diffColor, fontVariantNumeric: 'tabular-nums' }}>{diffText}</span>
      </div>
    )
  }

  // ── Full panel for feed / detail ──
  const big = variant === 'detail'
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: GREEN, color: ON, padding: big ? '28px 26px 30px' : '24px 22px 24px', textAlign: 'left' }}>
      {/* putting-green flourish */}
      <div style={{ position: 'absolute', right: -30, bottom: -52, opacity: 0.08, pointerEvents: 'none' }}><GreenMotif size={big ? 250 : 210} /></div>

      <div style={{ position: 'relative' }}>
        {/* Header */}
        <div style={{ marginBottom: big ? 18 : 14, fontFamily: font.body, fontSize: 13, fontWeight: 500, color: 'rgba(242,245,241,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.courseName} · {shortDate(meta.playedAt)}
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ fontFamily: font.display, fontSize: big ? 76 : 64, fontWeight: 600, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>
            {meta.score}
          </div>
          <div style={{ paddingBottom: big ? 8 : 6 }}>
            <div style={{ fontFamily: font.display, fontSize: big ? 30 : 26, fontWeight: 600, color: diffColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {diffText}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: diffColor, opacity: 0.9, marginTop: 5, fontFamily: font.body, fontStyle: 'italic' }}>{parWord}</div>
          </div>
        </div>

        {/* Meta line */}
        <div style={{ fontSize: 12, color: 'rgba(242,245,241,0.55)', marginTop: 12, fontFamily: font.body }}>
          Par {meta.par} · {meta.holes} holes
        </div>

        {/* Stats */}
        {meta.hasStats && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {[
              { label: 'GIR',      value: meta.girPossible ? `${meta.girHoles}/${meta.girPossible}` : '—' },
              { label: 'Fairways', value: meta.fairwaysPossible ? `${meta.fairways}/${meta.fairwaysPossible}` : '—' },
              { label: 'Putts',    value: meta.putts || '—' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 6px' }}>
                <div style={{ fontFamily: font.body, fontSize: 16, fontWeight: 650, color: ON, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(242,245,241,0.6)', marginTop: 3, fontFamily: font.body }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
