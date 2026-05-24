import { supabase } from './supabase'
import type { Shot } from '../types'

type DbShot = {
  id: string
  user_id: string
  club_id: string
  yardage: number
  ts: string        // stored as ISO timestamptz in Postgres
  note: string | null
}

function toShot(row: DbShot): Shot {
  return {
    id: row.id as unknown as number,
    clubId: row.club_id,
    yardage: row.yardage,
    ts: new Date(row.ts).getTime(),
    note: row.note ?? '',
  }
}

export async function fetchShots(userId: string): Promise<Shot[]> {
  const { data, error } = await supabase
    .from('shots')
    .select('*')
    .eq('user_id', userId)
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
    .insert([{
      user_id: userId,
      club_id: shot.clubId,
      yardage: shot.yardage,
      ts: new Date(shot.ts).toISOString(),
      note: shot.note ?? '',
    }])
    .select()
    .single()
  if (error) throw error
  return toShot(data as DbShot)
}

export async function deleteShot(id: string | number): Promise<void> {
  const { error } = await supabase.from('shots').delete().eq('id', String(id))
  if (error) throw error
}

export async function setClubDistance(
  userId: string,
  clubId: string,
  yardage: number
): Promise<Shot> {
  const { error: delError } = await supabase
    .from('shots')
    .delete()
    .eq('user_id', userId)
    .eq('club_id', clubId)
  if (delError) throw delError
  return insertShot(userId, { clubId, yardage, ts: Date.now(), note: '' })
}
