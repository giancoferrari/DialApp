import type { PublicProfile } from '../types'
import { color, font } from '../lib/tokens'
import { initialOf } from '../lib/format'

// The one avatar used everywhere — green disc, photo or orange initial,
// optional cream ring for overlapping/stacked contexts.
export default function Avatar({ profile, size = 38, onClick, ring = false }: {
  profile?: PublicProfile | null
  size?: number
  onClick?: () => void
  ring?: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: color.green, overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        ...(ring ? { boxShadow: `0 0 0 2px ${color.cream}` } : {}),
      }}
    >
      {profile?.avatarUrl
        ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: Math.round(size * 0.4), color: color.orange }}>{initialOf(profile)}</span>}
    </div>
  )
}
