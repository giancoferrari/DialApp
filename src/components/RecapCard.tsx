import type { RoundRecapMeta } from '../types'

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const GREEN_GRAD = 'linear-gradient(155deg, #2C5239 0%, #1C3724 52%, #15261B 100%)'

// Small orange flagstick for the header
function FlagPin({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="6" y1="3.5" x2="6" y2="21" stroke="#D9824D" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M6 4 L17.5 7.2 L6 11 Z" fill="#D9824D" />
    </svg>
  )
}

// Faint concentric-green + flag motif used as a background flourish
function GreenMotif({ size = 210 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <ellipse cx="100" cy="124" rx="94" ry="58" stroke="#FAF6EA" strokeWidth="2" />
      <ellipse cx="100" cy="124" rx="64" ry="39" stroke="#FAF6EA" strokeWidth="2" />
      <ellipse cx="100" cy="124" rx="34" ry="21" stroke="#FAF6EA" strokeWidth="2" />
      <line x1="100" y1="124" x2="100" y2="28" stroke="#FAF6EA" strokeWidth="2" strokeLinecap="round" />
      <path d="M100 28 L132 38 L100 49 Z" fill="#FAF6EA" />
    </svg>
  )
}

export default function RecapCard({ meta, variant }: { meta: RoundRecapMeta; variant: 'feed' | 'detail' | 'tile' }) {
  const even      = meta.toPar === 0
  const under     = meta.toPar < 0
  const diffColor = even ? '#E8DFC8' : under ? '#8BC47A' : '#F0A56B'
  const diffText  = even ? 'E' : meta.toPar > 0 ? `+${meta.toPar}` : `${meta.toPar}`
  const parWord   = even ? 'Even par' : `${Math.abs(meta.toPar)} ${under ? 'under' : 'over'} par`

  // ── Square tile for the profile grid ──
  if (variant === 'tile') {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%', background: GREEN_GRAD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <div style={{ position: 'absolute', right: -34, bottom: -42, opacity: 0.08, pointerEvents: 'none' }}><GreenMotif size={130} /></div>
        <span style={{ position: 'relative', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,246,234,0.5)', marginBottom: 2 }}>Round</span>
        <span style={{ position: 'relative', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 38, fontWeight: 800, color: '#FAF6EA', letterSpacing: '-0.05em', lineHeight: 1 }}>{meta.score}</span>
        <span style={{ position: 'relative', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 700, color: diffColor }}>{diffText}</span>
      </div>
    )
  }

  // ── Full panel for feed / detail ──
  const big = variant === 'detail'
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: GREEN_GRAD, color: '#FAF6EA', padding: big ? '30px 28px 32px' : '24px 22px 26px' }}>
      {/* soft glow for depth */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 95% 75% at 14% -10%, rgba(139,196,122,0.18) 0%, transparent 56%)', pointerEvents: 'none' }} />
      {/* putting-green flourish */}
      <div style={{ position: 'absolute', right: -30, bottom: -52, opacity: 0.09, pointerEvents: 'none' }}><GreenMotif size={big ? 250 : 210} /></div>

      <div style={{ position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: big ? 20 : 16 }}>
          <FlagPin size={big ? 17 : 15} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(250,246,234,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.courseName} · {shortDate(meta.playedAt)}
          </span>
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: big ? 84 : 68, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.86, textShadow: '0 2px 24px rgba(0,0,0,0.25)' }}>
            {meta.score}
          </div>
          <div style={{ paddingBottom: big ? 8 : 6 }}>
            <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: big ? 32 : 27, fontWeight: 700, color: diffColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {diffText}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: diffColor, opacity: 0.85, marginTop: 4 }}>{parWord}</div>
          </div>
        </div>

        {/* Meta line */}
        <div style={{ fontSize: 12, color: 'rgba(250,246,234,0.42)', marginTop: 12, letterSpacing: '0.02em' }}>
          Par {meta.par} · {meta.holes} holes
        </div>

        {/* Stats */}
        {meta.hasStats && (
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            {[
              { label: 'GIR',      value: meta.girPossible ? `${meta.girHoles}/${meta.girPossible}` : '—' },
              { label: 'Fairways', value: meta.fairwaysPossible ? `${meta.fairways}/${meta.fairwaysPossible}` : '—' },
              { label: 'Putts',    value: meta.putts || '—' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'rgba(250,246,234,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: '11px 6px', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
                <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 17, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(250,246,234,0.45)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
