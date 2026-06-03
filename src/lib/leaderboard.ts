import { fetchFriendships, fetchProfilesForIds } from './friends'
import type { PublicProfile } from '../types'

// You + your accepted friends, ranked by all-time ranked points.
export async function fetchLeaderboard(meId: string): Promise<PublicProfile[]> {
  const fs = await fetchFriendships(meId)
  const friendIds = fs
    .filter(f => f.status === 'accepted')
    .map(f => (f.requesterId === meId ? f.addresseeId : f.requesterId))
  const profiles = await fetchProfilesForIds([meId, ...friendIds])
  return profiles.sort((a, b) => (b.rankedPoints ?? 0) - (a.rankedPoints ?? 0))
}
