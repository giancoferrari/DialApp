import { supabase } from './supabase'
import type { Shot } from '../types'

type DbShot = {
  id: number
  user_id: string
  club_id: string
  yardage: number
  ts: number
  note: string
}

function toShot(row: DbShot): Shot {
  return { id: row.id, clubId: row.club_id, yardage: row.yardage, ts: row.ts, note: row.note }
}

export async function fetchShots(): Promise<Shot[]> {
  const { data, error } = await supabase
    .from('shots')
    .select('*')
    .order('ts', { ascending: false })
  if (error) throw error
  return (data as DbShot[]).map(toShot)
}

export async function insertShot(
  userId: string,
  shot: Omit<Shot, 'id'>
): Promise<Shot> {
  const { data, error } = await supabase
    .from('shots')
    .insert([{ user_id: userId, club_id: shot.clubId, yardage: shot.yardage, ts: shot.ts, note: shot.note }])
    .select()
    .single()
  if (error) throw error
  return toShot(data as DbShot)
}
