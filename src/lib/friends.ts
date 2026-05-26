import { supabase } from './supabase'
import type { Friendship, PublicProfile } from '../types'

function toPublicProfile(r: Record<string, unknown>): PublicProfile {
  return {
    userId: r.user_id as string,
    username: (r.username as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    handicapIndex: (r.handicap_index as number) ?? null,
    homeCourse: (r.home_course as string) ?? null,
    firstName: (r.first_name as string) ?? null,
    rankedPoints: (r.ranked_points as number) ?? 0,
    wins: (r.wins as number) ?? 0,
    losses: (r.losses as number) ?? 0,
    ties: (r.ties as number) ?? 0,
  }
}

const PROFILE_SELECT = 'user_id, username, first_name, avatar_url, handicap_index, home_course, ranked_points, wins, losses, ties'

export async function searchUsers(query: string, currentUserId: string): Promise<PublicProfile[]> {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('user_profiles')
    .select(PROFILE_SELECT)
    .ilike('username', `%${query.trim()}%`)
    .neq('user_id', currentUserId)
    .limit(10)
  if (error) throw error
  return (data ?? []).map(toPublicProfile)
}

export async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id,
    requesterId: r.requester_id,
    addresseeId: r.addressee_id,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export async function fetchProfilesForIds(userIds: string[]): Promise<PublicProfile[]> {
  if (!userIds.length) return []
  const { data, error } = await supabase
    .from('user_profiles')
    .select(PROFILE_SELECT)
    .in('user_id', userIds)
  if (error) throw error
  return (data ?? []).map(toPublicProfile)
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return {
    id: data.id,
    requesterId: data.requester_id,
    addresseeId: data.addressee_id,
    status: data.status,
    createdAt: data.created_at,
  }
}

export async function updateFriendship(id: string, status: 'accepted' | 'declined'): Promise<void> {
  const { error } = await supabase.from('friendships').update({ status }).eq('id', id)
  if (error) throw error
}

export async function removeFriend(id: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', id)
  if (error) throw error
}
