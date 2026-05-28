import { supabase } from './supabase'

export const POINTS_WIN  = 25
export const POINTS_LOSS = 15
export const POINTS_TIE  = 5

export interface RankTier {
  name: string
  minPoints: number
  color: string
}

export const RANK_TIERS: RankTier[] = [
  { name: 'Newcomer', minPoints: 0,    color: '#C9C0A8' },
  { name: 'Bronze',   minPoints: 100,  color: '#C8844A' },
  { name: 'Silver',   minPoints: 300,  color: '#8CA0A8' },
  { name: 'Gold',     minPoints: 600,  color: '#C8A84B' },
  { name: 'Platinum', minPoints: 1000, color: '#5C7A6C' },
  { name: 'Diamond',  minPoints: 1500, color: '#4A7CC8' },
  { name: 'Legend',   minPoints: 2000, color: '#D9824D' },
]

export function getRank(points: number): RankTier {
  let tier = RANK_TIERS[0]
  for (const t of RANK_TIERS) {
    if (points >= t.minPoints) tier = t
    else break
  }
  return tier
}

export async function awardPoints(winnerId: string | null, acceptedPlayerIds: string[]): Promise<void> {
  if (!acceptedPlayerIds.length) return

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, ranked_points, wins, losses, ties')
    .in('user_id', acceptedPlayerIds)
  if (error) return

  const rows = data ?? []

  if (winnerId) {
    for (const row of rows) {
      const uid    = row.user_id as string
      const pts    = row.ranked_points as number
      const wins   = row.wins as number
      const losses = row.losses as number

      if (uid === winnerId) {
        await supabase.from('user_profiles')
          .update({ ranked_points: pts + POINTS_WIN, wins: wins + 1 })
          .eq('user_id', uid)
      } else {
        await supabase.from('user_profiles')
          .update({ ranked_points: Math.max(0, pts - POINTS_LOSS), losses: losses + 1 })
          .eq('user_id', uid)
      }
    }
  } else {
    for (const row of rows) {
      const uid  = row.user_id as string
      const pts  = row.ranked_points as number
      const ties = row.ties as number
      await supabase.from('user_profiles')
        .update({ ranked_points: pts + POINTS_TIE, ties: ties + 1 })
        .eq('user_id', uid)
    }
  }
}

