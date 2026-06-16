import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../lib/leaderboard'
import { getRank } from '../lib/points'
import { flagEmoji } from '../lib/countries'
import { ShieldIcon, ChevronLeftIcon, MedalIcon } from './Icons'
import Skeleton from './Skeleton'
import { useEdgeSwipeBack } from '../hooks/useGestures'
import { color, font, radius, onHero, elevation } from '../lib/tokens'
import { card } from '../lib/surfaces'
import type { PublicProfile } from '../types'

gsap.registerPlugin(useGSAP)

interface Props {
  meId: string
  isMobile?: boolean
  onBack?: () => void
  onViewProfile?: (userId: string) => void
}

const MEDAL = ['#C9A23F', '#9FAAB0', '#B9783F'] // gold, silver, bronze

function name(p: PublicProfile): string {
  return p.username ? `@${p.username}` : (p.firstName ?? 'Golfer')
}

export default function LeaderboardView({ meId, isMobile = false, onBack, onViewProfile }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const px = isMobile ? 20 : 40
  useEdgeSwipeBack(() => onBack?.(), !!onBack)

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ['leaderboard', meId],
    queryFn: () => fetchLeaderboard(meId),
  })

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
  const myIndex = rows.findIndex(r => r.userId === meId)
  const myPoints = myIndex >= 0 ? (rows[myIndex].rankedPoints ?? 0) : 0

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 0 : 0}px 0 ${isMobile ? 120 : 80}px` }}>

      {/* ════ Warm header ════ */}
      <section style={{ padding: `${isMobile ? 22 : 28}px ${px}px 0` }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 500, color: color.inkSoft, padding: 0, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
              <ChevronLeftIcon size={18} color={color.inkSoft} /> Back
            </button>
          )}
          <h1 style={{ fontFamily: font.display, fontSize: isMobile ? 32 : 38, fontWeight: 700, color: color.ink, letterSpacing: '-0.035em', margin: 0, lineHeight: 1 }}>
            Leaderboard
          </h1>
          <p style={{ fontSize: 14, color: color.muted, margin: '8px 0 0' }}>You and your friends, by ranked points.</p>

          {myIndex >= 0 && friendsOnly.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, padding: '16px 18px', background: color.green, borderRadius: radius.lg, boxShadow: elevation.sm }}>
              <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: color.onGreen, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                #{myIndex + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: onHero.soft }}>Your standing</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: color.onGreen, marginTop: 1 }}>of {rows.length} players</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: color.onGreen, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{myPoints.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: onHero.faint, marginTop: 3 }}>points</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ════ List ════ */}
      <div style={{ padding: `22px ${px}px 0`, maxWidth: 600 + px * 2, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px' }}>
                <Skeleton width={28} height={28} radius={14} />
                <Skeleton width={42} height={42} radius={21} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="45%" height={13} />
                  <Skeleton width="30%" height={10} style={{ marginTop: 7 }} />
                </div>
                <Skeleton width={36} height={20} />
              </div>
            ))}
          </div>
        ) : friendsOnly.length === 0 ? (
          <div style={{ ...card, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: color.greenTint, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <MedalIcon size={24} color={color.green} />
            </div>
            <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 600, color: color.ink, marginBottom: 8 }}>Add friends to compete</div>
            <div style={{ fontSize: 13.5, color: color.muted, lineHeight: 1.5 }}>Once you've added friends, you'll all be ranked here by points earned in matches.</div>
          </div>
        ) : (
          <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    background: me ? color.green : color.white,
                    border: `1px solid ${me ? color.green : color.border}`,
                    borderRadius: radius.card, padding: '12px 16px',
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: font.display, fontWeight: 600, fontSize: 13,
                    background: medal ?? (me ? 'rgba(255,255,255,0.12)' : color.sand),
                    color: medal ? '#1A1206' : (me ? color.onGreen : color.muted),
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {i + 1}
                  </div>

                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: 21, background: me ? 'rgba(255,255,255,0.12)' : color.greenTint, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.avatarUrl
                      ? <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: 17, color: me ? color.onGreen : color.green }}>{name(p)[0]?.replace('@', '').toUpperCase()}</span>}
                  </div>

                  {/* Name + tier */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: font.body, fontSize: 15, fontWeight: 600, color: me ? color.onGreen : color.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {me ? 'You' : name(p)}
                      </span>
                      {p.country && <span style={{ fontSize: 14 }}>{flagEmoji(p.country)}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <ShieldIcon size={11} color={rank.color} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: me ? 'rgba(242,245,241,0.75)' : color.muted }}>{rank.name}</span>
                      {(p.wins ?? 0) + (p.losses ?? 0) > 0 && (
                        <span style={{ fontSize: 12, color: me ? onHero.faint : color.faint, marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>{p.wins ?? 0}W · {p.losses ?? 0}L</span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: font.display, fontSize: 21, fontWeight: 600, lineHeight: 1, color: me ? color.onGreen : color.ink, fontVariantNumeric: 'tabular-nums' }}>
                      {(p.rankedPoints ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, marginTop: 3, color: me ? onHero.faint : color.faint }}>pts</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
