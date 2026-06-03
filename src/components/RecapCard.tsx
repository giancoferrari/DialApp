import type { RoundRecapMeta } from '../types'

function toParText(n: number): string {
  return n === 0 ? 'Even' : n > 0 ? `+${n}` : `${n}`
}
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const GREEN_GRAD = 'linear-gradient(155deg, rgba(35,68,46,1) 0%, rgba(22,44,28,1) 100%)'

export default function RecapCard({ meta, variant }: { meta: RoundRecapMeta; variant: 'feed' | 'detail' | 'tile' }) {
  const diffColor = meta.toPar <= 0 ? '#8BC47A' : '#F0A56B'

  // ── Square tile for the profile grid ──
  if (variant === 'tile') {
    return (
      <div style={{ width: '100%', height: '100%', background: GREEN_GRAD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,246,234,0.45)', marginBottom: 2 }}>Round</span>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 800, color: '#FAF6EA', letterSpacing: '-0.04em', lineHeight: 1 }}>{meta.score}</span>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: diffColor }}>{toParText(meta.toPar)}</span>
      </div>
    )
  }

  // ── Full panel for feed / detail ──
  const big = variant === 'detail'
  return (
    <div style={{ background: GREEN_GRAD, padding: big ? '30px 26px' : '22px 20px', color: '#FAF6EA' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>⛳</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,246,234,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.courseName} · {shortDate(meta.playedAt)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: big ? 72 : 56, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.92 }}>
          {meta.score}
        </div>
        <div style={{ paddingBottom: big ? 10 : 6 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: big ? 26 : 22, fontWeight: 700, color: diffColor, letterSpacing: '-0.02em' }}>
            {toParText(meta.toPar)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(250,246,234,0.45)', marginTop: 1 }}>vs par {meta.par} · {meta.holes} holes</div>
        </div>
      </div>

      {meta.hasStats && (
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          {[
            { label: 'GIR',     value: meta.girPossible ? `${meta.girHoles}/${meta.girPossible}` : '—' },
            { label: 'Fairways', value: meta.fairwaysPossible ? `${meta.fairways}/${meta.fairwaysPossible}` : '—' },
            { label: 'Putts',   value: meta.putts || '—' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'rgba(250,246,234,0.08)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '10px 6px' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(250,246,234,0.45)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
