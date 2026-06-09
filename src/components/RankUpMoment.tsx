import { useEffect } from 'react'
import Portal from './Portal'
import { ShieldIcon } from './Icons'
import type { RankTier } from '../lib/points'
import { color, font, elevation, radius } from '../lib/tokens'

// A subtle, tasteful "you ranked up" moment — soft glow, no confetti.
export default function RankUpMoment({ tier, onClose }: { tier: RankTier; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4200)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(23,26,23,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.25s ease' }}>
        <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 320, background: color.white, borderRadius: radius.sheet, padding: '36px 28px 28px', textAlign: 'center', boxShadow: elevation.lg, overflow: 'hidden', animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${tier.color}2E 0%, transparent 65%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: color.muted, fontFamily: font.body, marginBottom: 18 }}>Rank up</div>
            <div style={{ width: 80, height: 80, borderRadius: 40, margin: '0 auto 18px', background: tier.color + '1A', border: `2px solid ${tier.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldIcon size={36} color={tier.color} />
            </div>
            <div style={{ fontFamily: font.body, fontSize: 14, color: color.muted, marginBottom: 2 }}>You reached</div>
            <div style={{ fontFamily: font.body, fontSize: 28, fontWeight: 700, color: color.ink, letterSpacing: '-0.02em', marginBottom: 22 }}>{tier.name}</div>
            <button onClick={onClose} style={{ background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '12px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}>Keep playing</button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
