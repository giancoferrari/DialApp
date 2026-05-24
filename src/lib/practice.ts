import { supabase } from './supabase'
import type { PracticeSession, FocusArea } from '../types'

type DbSession = { id: string; user_id: string; focus_area: string; notes: string | null; rating: number; session_date: string; created_at: string }

function toSession(r: DbSession): PracticeSession {
  return { id: r.id, userId: r.user_id, focusArea: r.focus_area as FocusArea, notes: r.notes, rating: r.rating as 1|2|3|4|5, sessionDate: r.session_date, createdAt: r.created_at }
}

export async function fetchPracticeSessions(userId: string): Promise<PracticeSession[]> {
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
  if (error) throw error
  return (data as DbSession[]).map(toSession)
}

export async function insertPracticeSession(
  userId: string,
  focusArea: FocusArea,
  notes: string | null,
  rating: 1|2|3|4|5,
  sessionDate: string
): Promise<PracticeSession> {
  const { data, error } = await supabase
    .from('practice_sessions')
    .insert([{ user_id: userId, focus_area: focusArea, notes, rating, session_date: sessionDate }])
    .select()
    .single()
  if (error) throw error
  return toSession(data as DbSession)
}

export async function deletePracticeSession(id: string): Promise<void> {
  const { error } = await supabase.from('practice_sessions').delete().eq('id', id)
  if (error) throw error
}
