import type { PublicProfile } from '../types'
import { color, font } from '../lib/tokens'
import { initialOf } from '../lib/format'

// The one avatar used everywhere — photo, or a quiet tinted disc with the
// user's initial in brand green. Optional ring for overlapping/stacked use.
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
        background: color.greenTint, overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        ...(ring ? { boxShadow: `0 0 0 2px ${color.white}` } : {}),
      }}
    >
      {profile?.avatarUrl
        ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: Math.round(size * 0.42), color: color.green }}>{initialOf(profile)}</span>}
    </div>
  )
}
