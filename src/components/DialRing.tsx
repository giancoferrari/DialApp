import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// DialRing — the "Dial" brand motif. A precision dial/gauge: faint tick
// marks around the full circle (the instrument) with a bright progress arc
// on top. Center holds anything (an avatar, an icon, a number). The arc
// animates from 0 on mount unless reduced-motion is requested.
// ─────────────────────────────────────────────────────────────────────────
export default function DialRing({
  progress, size = 66, stroke = 3.5, color, trackColor = 'var(--ring-track)',
  ticks = 48, children,
}: {
  progress: number // 0..1
  size?: number
  stroke?: number
  color: string
  trackColor?: string
  ticks?: number
  children?: React.ReactNode
}) {
  const [p, setP] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setP(progress); return }
    const id = requestAnimationFrame(() => setP(progress))
    return () => cancelAnimationFrame(id)
  }, [progress])

  const c = size / 2
  const tickOuter = c - 0.5
  const tickInner = c - stroke - 1.5
  const r = c - stroke - 5.5            // arc radius — sits just inside the ticks
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, p))
  const major = Math.max(1, Math.round(ticks / 12))

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        {Array.from({ length: ticks }).map((_, i) => {
          const a = (i / ticks) * Math.PI * 2
          const cos = Math.cos(a), sin = Math.sin(a)
          const isMajor = i % major === 0
          return (
            <line key={i}
              x1={c + tickInner * cos} y1={c + tickInner * sin}
              x2={c + tickOuter * cos} y2={c + tickOuter * sin}
              stroke={trackColor} strokeWidth={isMajor ? 1.4 : 0.7} strokeLinecap="round"
            />
          )
        })}
        <circle
          cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}
