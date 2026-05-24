import { supabase } from './supabase'
import type { Round, RoundHole } from '../types'

type DbRound = { id: string; user_id: string; course_id: string | null; course_name: string; tee: string | null; holes: number; played_at: string; created_at: string }
type DbHole  = { id: string; round_id: string; hole_number: number; par: number; yardage: number | null; score: number | null; putts: number | null; fairway_hit: boolean | null; gir: boolean | null }

function toHole(r: DbHole): RoundHole {
  return { id: r.id, roundId: r.round_id, holeNumber: r.hole_number, par: r.par as 3|4|5, yardage: r.yardage, score: r.score, putts: r.putts, fairwayHit: r.fairway_hit, gir: r.gir }
}

function toRound(r: DbRound, holes: RoundHole[]): Round {
  return { id: r.id, userId: r.user_id, courseId: r.course_id, courseName: r.course_name, tee: r.tee, holes: r.holes as 9|18, playedAt: r.played_at, roundHoles: holes, createdAt: r.created_at }
}

export async function fetchRounds(userId: string): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*, round_holes(*)')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
  if (error) throw error
  return (data as (DbRound & { round_holes: DbHole[] })[]).map(r =>
    toRound(r, r.round_holes.map(toHole).sort((a, b) => a.holeNumber - b.holeNumber))
  )
}

export async function createRound(
  userId: string,
  courseId: string | null,
  courseName: string,
  tee: string | null,
  holes: 9 | 18,
  playedAt: string
): Promise<Round> {
  const { data, error } = await supabase
    .from('rounds')
    .insert([{ user_id: userId, course_id: courseId, course_name: courseName, tee, holes, played_at: playedAt }])
    .select()
    .single()
  if (error) throw error
  return toRound(data as DbRound, [])
}

export async function upsertRoundHoles(roundId: string, holes: Omit<RoundHole, 'id' | 'roundId'>[]): Promise<RoundHole[]> {
  const rows = holes.map(h => ({
    round_id: roundId,
    hole_number: h.holeNumber,
    par: h.par,
    yardage: h.yardage,
    score: h.score,
    putts: h.putts,
    fairway_hit: h.fairwayHit,
    gir: h.gir,
  }))
  const { data, error } = await supabase
    .from('round_holes')
    .upsert(rows, { onConflict: 'round_id,hole_number' })
    .select()
  if (error) throw error
  return (data as DbHole[]).map(toHole)
}

export async function deleteRound(id: string): Promise<void> {
  const { error } = await supabase.from('rounds').delete().eq('id', id)
  if (error) throw error
}
