import { useEffect } from 'react'
import Portal from './Portal'
import { ShieldIcon } from './Icons'
import type { RankTier } from '../lib/points'

// A subtle, tasteful "you ranked up" moment — soft glow, no confetti.
export default function RankUpMoment({ tier, onClose }: { tier: RankTier; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4200)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(20,18,12,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.25s ease' }}>
        <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 320, background: 'linear-gradient(165deg, rgba(35,68,46,1) 0%, rgba(20,40,26,1) 100%)', borderRadius: 28, padding: '40px 28px 30px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 40px 100px rgba(20,18,12,0.5)', overflow: 'hidden', animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, ${tier.color}55 0%, transparent 65%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(250,246,234,0.6)', textTransform: 'uppercase', marginBottom: 18 }}>Rank up</div>
            <div style={{ width: 84, height: 84, borderRadius: 42, margin: '0 auto 18px', background: tier.color + '22', border: `2px solid ${tier.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 44px ${tier.color}55` }}>
              <ShieldIcon size={40} color={tier.color} />
            </div>
            <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, color: 'rgba(250,246,234,0.6)', marginBottom: 4 }}>You reached</div>
            <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 32, fontWeight: 800, color: tier.color, letterSpacing: '-0.03em', marginBottom: 22 }}>{tier.name}</div>
            <button onClick={onClose} style={{ background: tier.color, color: '#15261B', border: 'none', borderRadius: 999, padding: '11px 30px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>Let's go</button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
