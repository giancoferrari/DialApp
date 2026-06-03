import { useState, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { fetchLeaderboard } from '../lib/leaderboard'
import { getRank } from '../lib/points'
import { flagEmoji } from '../lib/countries'
import { ShieldIcon } from './Icons'
import type { PublicProfile } from '../types'

gsap.registerPlugin(useGSAP)

interface Props {
  meId: string
  isMobile?: boolean
  onBack?: () => void
  onViewProfile?: (userId: string) => void
}

const MEDAL = ['#C8A84B', '#9AA8AE', '#C8844A'] // gold, silver, bronze

function name(p: PublicProfile): string {
  return p.username ? `@${p.username}` : (p.firstName ?? 'Golfer')
}

export default function LeaderboardView({ meId, isMobile = false, onBack, onViewProfile }: Props) {
  const [rows, setRows]       = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)
  const px = isMobile ? 20 : 40

  useEffect(() => {
    fetchLeaderboard(meId).then(setRows).catch(() => {}).finally(() => setLoading(false))
  }, [meId])

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (listRef.current) {
        gsap.fromTo(Array.from(listRef.current.children),
          { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: 'power3.out' })
      }
    })
    return () => mm.revert()
  }, { scope: listRef, dependencies: [rows.length] })

  const friendsOnly = rows.filter(r => r.userId !== meId)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 24 : 44}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {onBack && (
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4A4235', padding: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span> Back
        </button>
      )}

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>Ranked</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: '0 0 6px', lineHeight: 1 }}>
        Leaderboard
      </h1>
      <p style={{ fontSize: 13.5, color: '#6B5F4E', margin: '0 0 26px' }}>You and your friends, by ranked points.</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, fontSize: 14, color: '#6B5F4E' }}>Loading…</div>
      ) : friendsOnly.length === 0 ? (
        <div style={{ background: 'rgba(250,246,234,0.78)', border: '1px solid rgba(255,255,255,0.66)', borderRadius: 22, padding: '44px 24px', textAlign: 'center', boxShadow: '0 6px 28px rgba(31,29,23,0.09), inset 0 1px 0 rgba(255,255,255,0.82)' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 700, color: '#1F1D17', marginBottom: 8 }}>Add friends to compete</div>
          <div style={{ fontSize: 13.5, color: '#6B5F4E', lineHeight: 1.5 }}>Once you've added friends, you'll all be ranked here by points earned in matches.</div>
        </div>
      ) : (
        <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((p, i) => {
            const me      = p.userId === meId
            const rank    = getRank(p.rankedPoints ?? 0)
            const medal   = i < 3 ? MEDAL[i] : null
            const clickable = !!onViewProfile && !me
            return (
              <button
                key={p.userId}
                onClick={clickable ? () => onViewProfile!(p.userId) : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left',
                  background: me ? 'linear-gradient(150deg, rgba(35,68,46,1) 0%, rgba(26,50,33,1) 100%)' : 'rgba(250,246,234,0.82)',
                  backdropFilter: me ? 'none' : 'blur(28px) saturate(170%)', WebkitBackdropFilter: me ? 'none' : 'blur(28px) saturate(170%)',
                  border: `1px solid ${me ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)'}`,
                  borderRadius: 18, padding: '13px 16px',
                  cursor: clickable ? 'pointer' : 'default',
                  boxShadow: me ? '0 10px 30px rgba(31,58,42,0.24)' : '0 4px 18px rgba(31,29,23,0.07), inset 0 1px 0 rgba(255,255,255,0.8)',
                }}
              >
                {/* Rank */}
                <div style={{
                  width: 30, height: 30, borderRadius: 15, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 14,
                  background: medal ? medal : (me ? 'rgba(250,246,234,0.14)' : '#F0EBDD'),
                  color: medal ? '#1F1D17' : (me ? '#FAF6EA' : '#6B5F4E'),
                }}>
                  {i + 1}
                </div>

                {/* Avatar */}
                <div style={{ width: 42, height: 42, borderRadius: 21, background: me ? '#2A4D39' : '#1F3A2A', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17, color: '#D9824D' }}>{name(p)[0]?.replace('@', '').toUpperCase()}</span>}
                </div>

                {/* Name + tier */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: me ? '#FAF6EA' : '#1F1D17', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {me ? 'You' : name(p)}
                    </span>
                    {p.country && <span style={{ fontSize: 14 }}>{flagEmoji(p.country)}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <ShieldIcon size={10} color={rank.color} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: rank.color, letterSpacing: '0.04em' }}>{rank.name}</span>
                    {(p.wins ?? 0) + (p.losses ?? 0) > 0 && (
                      <span style={{ fontSize: 11, color: me ? 'rgba(250,246,234,0.45)' : '#8B8272', marginLeft: 4 }}>{p.wins ?? 0}W · {p.losses ?? 0}L</span>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: me ? '#FAF6EA' : '#1F1D17' }}>
                    {(p.rankedPoints ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3, color: me ? 'rgba(250,246,234,0.45)' : '#8B8272' }}>pts</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
