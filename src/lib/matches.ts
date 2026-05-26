import { supabase } from './supabase'
import type { Match, MatchPlayer, MatchScore, GameMode, PublicProfile } from '../types'
import { fetchProfilesForIds } from './friends'
import { deductWager, creditWinner, refundWager } from './wallet'
import { awardPoints } from './points'

function toScore(r: Record<string, unknown>): MatchScore {
  return {
    id: r.id as string,
    matchId: r.match_id as string,
    userId: r.user_id as string,
    holeNumber: r.hole_number as number,
    score: r.score as number | null,
    updatedAt: r.updated_at as string,
  }
}

function toPlayer(r: Record<string, unknown>, profiles: PublicProfile[], scores: MatchScore[]): MatchPlayer {
  return {
    id: r.id as string,
    matchId: r.match_id as string,
    userId: r.user_id as string,
    status: r.status as MatchPlayer['status'],
    profile: profiles.find(p => p.userId === r.user_id),
    scores: scores.filter(s => s.userId === r.user_id),
  }
}

async function hydrateMatch(raw: Record<string, unknown>): Promise<Match> {
  const { data: players } = await supabase
    .from('match_players')
    .select('*')
    .eq('match_id', raw.id)

  const { data: scores } = await supabase
    .from('match_scores')
    .select('*')
    .eq('match_id', raw.id)

  const playerList = players ?? []
  const scoreList  = (scores ?? []).map(toScore)
  const profiles   = await fetchProfilesForIds(playerList.map((p: Record<string, unknown>) => p.user_id as string))

  return {
    id: raw.id as string,
    createdBy: raw.created_by as string,
    courseName: raw.course_name as string,
    holes: raw.holes as 9 | 18,
    gameMode: raw.game_mode as GameMode,
    wagerPerPlayer: raw.wager_per_player as number,
    status: raw.status as Match['status'],
    winnerId: raw.winner_id as string | null,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
    players: playerList.map((p: Record<string, unknown>) => toPlayer(p, profiles, scoreList)),
  }
}

export async function fetchMatches(userId: string): Promise<Match[]> {
  const { data: playerRows } = await supabase
    .from('match_players')
    .select('match_id')
    .eq('user_id', userId)

  const matchIds = (playerRows ?? []).map((r: Record<string, unknown>) => r.match_id as string)
  if (!matchIds.length) return []

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .in('id', matchIds)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)

  return Promise.all((data ?? []).map(hydrateMatch))
}

export async function createMatch(
  createdBy: string,
  opts: { courseName: string; holes: 9 | 18; gameMode: GameMode; wagerPerPlayer: number },
  inviteeIds: string[],
): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      created_by: createdBy,
      course_name: opts.courseName,
      holes: opts.holes,
      game_mode: opts.gameMode,
      wager_per_player: opts.wagerPerPlayer,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw new Error(`matches insert: ${error.message} (code: ${error.code})`)

  const players = [
    { match_id: data.id, user_id: createdBy, status: 'accepted' },
    ...inviteeIds.map(id => ({ match_id: data.id, user_id: id, status: 'invited' })),
  ]
  const { error: playersErr } = await supabase.from('match_players').insert(players)
  if (playersErr) throw new Error(`match_players insert: ${playersErr.message} (code: ${playersErr.code})`)

  // Deduct wager from creator if wager > 0
  if (opts.wagerPerPlayer > 0) {
    await deductWager(createdBy, data.id, opts.wagerPerPlayer)
  }

  return hydrateMatch(data)
}

export async function acceptMatchInvite(matchId: string, userId: string, wager: number): Promise<void> {
  await supabase
    .from('match_players')
    .update({ status: 'accepted' })
    .eq('match_id', matchId)
    .eq('user_id', userId)

  if (wager > 0) await deductWager(userId, matchId, wager)

  // If all players accepted, set match to active
  const { data: players } = await supabase
    .from('match_players')
    .select('status')
    .eq('match_id', matchId)

  const allAccepted = (players ?? []).every((p: Record<string, unknown>) => p.status === 'accepted')
  if (allAccepted) {
    await supabase.from('matches').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', matchId)
  }
}

export async function activateMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', matchId)
  if (error) throw new Error(error.message)
}

export async function declineMatchInvite(matchId: string, userId: string): Promise<void> {
  await supabase
    .from('match_players')
    .update({ status: 'declined' })
    .eq('match_id', matchId)
    .eq('user_id', userId)
}

export async function upsertScore(matchId: string, userId: string, holeNumber: number, score: number): Promise<void> {
  const { error } = await supabase
    .from('match_scores')
    .upsert(
      { match_id: matchId, user_id: userId, hole_number: holeNumber, score, updated_at: new Date().toISOString() },
      { onConflict: 'match_id,user_id,hole_number' },
    )
  if (error) throw new Error(error.message)

  await supabase.from('matches').update({ updated_at: new Date().toISOString() }).eq('id', matchId)
}

export async function completeMatch(match: Match): Promise<string | null> {
  const accepted = match.players.filter(p => p.status === 'accepted')

  let winnerId: string | null = null

  if (match.gameMode === 'stroke' || match.gameMode === 'skins') {
    const totals = accepted.map(p => ({
      userId: p.userId,
      total: p.scores.reduce((sum, s) => sum + (s.score ?? 0), 0),
    }))
    const min = Math.min(...totals.map(t => t.total))
    const winners = totals.filter(t => t.total === min)
    if (winners.length === 1) winnerId = winners[0].userId
  } else if (match.gameMode === 'match_play') {
    if (accepted.length === 2) {
      const holes = Array.from({ length: match.holes }, (_, i) => i + 1)
      let p0wins = 0, p1wins = 0
      holes.forEach(h => {
        const s0 = accepted[0].scores.find(s => s.holeNumber === h)?.score ?? null
        const s1 = accepted[1].scores.find(s => s.holeNumber === h)?.score ?? null
        if (s0 !== null && s1 !== null) {
          if (s0 < s1) p0wins++
          else if (s1 < s0) p1wins++
        }
      })
      if (p0wins > p1wins) winnerId = accepted[0].userId
      else if (p1wins > p0wins) winnerId = accepted[1].userId
    }
  }

  await supabase
    .from('matches')
    .update({ status: 'completed', winner_id: winnerId, updated_at: new Date().toISOString() })
    .eq('id', match.id)

  if (match.wagerPerPlayer > 0 && winnerId) {
    const pot = match.wagerPerPlayer * accepted.length
    await creditWinner(winnerId, match.id, pot)
  } else if (match.wagerPerPlayer > 0 && !winnerId) {
    for (const p of accepted) {
      await refundWager(p.userId, match.id, match.wagerPerPlayer)
    }
  }

  await awardPoints(winnerId, accepted.map(p => p.userId))

  return winnerId
}

export async function cancelMatch(match: Match, _userId: string): Promise<void> {
  await supabase
    .from('matches')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', match.id)

  if (match.wagerPerPlayer > 0) {
    const accepted = match.players.filter(p => p.status === 'accepted')
    for (const p of accepted) {
      await refundWager(p.userId, match.id, match.wagerPerPlayer)
    }
  }
}

export async function fetchMatchRealtime(matchId: string): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()
  if (error) throw new Error(error.message)
  return hydrateMatch(data)
}
