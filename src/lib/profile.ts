import { supabase } from './supabase'
import type { UserProfile, EquipmentItem } from '../types'

type DbProfile = {
  id: string
  user_id: string
  username: string | null
  avatar_url: string | null
  handicap_index: number | null
  home_course: string | null
  goal_score: number | null
  goal_handicap: number | null
  goal_notes: string | null
  equipment: EquipmentItem[]
  created_at: string
  updated_at: string
}

function toProfile(r: DbProfile): UserProfile {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username ?? null,
    avatarUrl: r.avatar_url ?? null,
    handicapIndex: r.handicap_index,
    homeCourse: r.home_course,
    goalScore: r.goal_score,
    goalHandicap: r.goal_handicap,
    goalNotes: r.goal_notes,
    equipment: r.equipment ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return toProfile(data as DbProfile)
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<UserProfile> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }
  if ('username'      in updates) payload.username       = updates.username      ?? null
  if ('avatarUrl'     in updates) payload.avatar_url     = updates.avatarUrl     ?? null
  if ('handicapIndex' in updates) payload.handicap_index = updates.handicapIndex ?? null
  if ('homeCourse'    in updates) payload.home_course    = updates.homeCourse    ?? null
  if ('goalScore'     in updates) payload.goal_score     = updates.goalScore     ?? null
  if ('goalHandicap'  in updates) payload.goal_handicap  = updates.goalHandicap  ?? null
  if ('goalNotes'     in updates) payload.goal_notes     = updates.goalNotes     ?? null
  if ('equipment'     in updates) payload.equipment      = updates.equipment     ?? []

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return toProfile(data as DbProfile)
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
