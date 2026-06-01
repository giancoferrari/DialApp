import { supabase } from './supabase'

export interface FeedActor {
  userId: string
  username: string | null
  firstName: string | null
  avatarUrl: string | null
}

export interface FeedItem {
  id: string
  type: 'round' | 'match'
  actor: FeedActor
  timestamp: string
  courseName?: string
  totalScore?: number | null
  scoreToPar?: number | null
  holes?: number
  gameMode?: string
  isWin?: boolean
}

export async function fetchFriendFeed(userId: string): Promise<FeedItem[]> {
  const { data: fships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')

  if (!fships?.length) return []

  const friendIds = [
    ...new Set(
      fships
        .flatMap(f => [f.requester_id as string, f.addressee_id as string])
        .filter(id => id !== userId)
    ),
  ]
  if (!friendIds.length) return []

  const [profilesRes, roundsRes, mpRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('user_id, username, first_name, avatar_url')
      .in('user_id', friendIds),

    supabase
      .from('rounds')
      .select('id, user_id, course_name, holes, played_at, round_holes(score, par)')
      .in('user_id', friendIds)
      .order('played_at', { ascending: false })
      .limit(20),

    supabase
      .from('match_players')
      .select('match_id, user_id')
      .in('user_id', friendIds)
      .eq('status', 'accepted'),
  ])

  const profiles = new Map<string, FeedActor>()
  for (const p of profilesRes.data ?? []) {
    profiles.set(p.user_id as string, {
      userId:    p.user_id as string,
      username:  (p.username as string)  ?? null,
      firstName: (p.first_name as string) ?? null,
      avatarUrl: (p.avatar_url as string) ?? null,
    })
  }

  const fallback = (uid: string): FeedActor =>
    profiles.get(uid) ?? { userId: uid, username: null, firstName: null, avatarUrl: null }

  // Round feed items
  const roundItems: FeedItem[] = (roundsRes.data ?? []).map(r => {
    const holeData = (r.round_holes as { score: number | null; par: number }[]) ?? []
    const scores   = holeData.map(h => h.score).filter((s): s is number => s !== null)
    const totalPar = holeData.reduce((a, h) => a + h.par, 0)
    const complete  = scores.length === holeData.length && holeData.length > 0
    const totalScore = complete ? scores.reduce((a, b) => a + b, 0) : null
    return {
      id:         `round_${r.id}`,
      type:       'round',
      actor:      fallback(r.user_id as string),
      timestamp:  r.played_at as string,
      courseName: r.course_name as string,
      totalScore,
      scoreToPar: totalScore !== null ? totalScore - totalPar : null,
      holes:      r.holes as number,
    }
  })

  // Match feed items
  const matchIds = [...new Set((mpRes.data ?? []).map(mp => mp.match_id as string))]
  const matchItems: FeedItem[] = []

  if (matchIds.length) {
    const { data: matchesData } = await supabase
      .from('matches')
      .select('id, course_name, game_mode, status, winner_id, updated_at')
      .in('id', matchIds)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(15)

    const mpByMatch = new Map<string, string[]>()
    for (const mp of mpRes.data ?? []) {
      const list = mpByMatch.get(mp.match_id as string) ?? []
      list.push(mp.user_id as string)
      mpByMatch.set(mp.match_id as string, list)
    }

    const seen = new Set<string>()
    for (const m of matchesData ?? []) {
      for (const friendId of mpByMatch.get(m.id as string) ?? []) {
        const itemId = `match_${m.id}_${friendId}`
        if (seen.has(itemId)) continue
        seen.add(itemId)
        matchItems.push({
          id:         itemId,
          type:       'match',
          actor:      fallback(friendId),
          timestamp:  m.updated_at as string,
          courseName: m.course_name as string,
          gameMode:   m.game_mode as string,
          isWin:      (m.winner_id as string) === friendId,
        })
      }
    }
  }

  return [...roundItems, ...matchItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 25)
}

