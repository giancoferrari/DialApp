import type { Round, Shot, Club } from '../types'
import { CLUBS_DATA, getClubAvg } from '../data'

// ── Per-round totals ────────────────────────────────────────────────────────
export interface RoundTotals {
  score: number
  par: number
  toPar: number
  putts: number
  gir: number;       girPossible: number
  fairways: number;  fairwaysPossible: number
  scrambles: number; scramblePossible: number
  holesPlayed: number
  holes: number
  complete: boolean
  hasStats: boolean
}

export function roundTotals(round: Round): RoundTotals {
  const hs = round.roundHoles
  const played = hs.filter(h => h.score !== null)
  const score  = played.reduce((s, h) => s + (h.score ?? 0), 0)
  const par    = played.reduce((s, h) => s + h.par, 0)
  const putts  = hs.reduce((s, h) => s + (h.putts ?? 0), 0)

  const par45            = hs.filter(h => h.par >= 4)
  const fairways         = par45.filter(h => h.fairwayHit === true).length
  const fairwaysPossible = par45.filter(h => h.fairwayHit !== null).length
  const gir              = hs.filter(h => h.gir === true).length
  const girPossible      = hs.filter(h => h.gir !== null).length

  // Scrambling: missed the green in regulation but still made par or better.
  const missedGir       = hs.filter(h => h.gir === false && h.score !== null)
  const scrambles       = missedGir.filter(h => (h.score ?? 99) - h.par <= 0).length
  const scramblePossible = missedGir.length

  return {
    score, par, toPar: score - par, putts,
    gir, girPossible, fairways, fairwaysPossible, scrambles, scramblePossible,
    holesPlayed: played.length, holes: round.holes,
    complete: played.length === round.holes,
    hasStats: hs.some(h => h.putts !== null || h.fairwayHit !== null || h.gir !== null),
  }
}

// ── Aggregate stats across rounds ───────────────────────────────────────────
export interface AggregateStats {
  girPct: number | null;       girRounds: number
  fairwayPct: number | null;   fairwayRounds: number
  puttsPer18: number | null;   puttRounds: number
  scramblePct: number | null;  scrambleRounds: number
  avgToPar: number | null;     scoredRounds: number
  bestToPar: number | null
  totalRounds: number
}

export function aggregateStats(rounds: Round[]): AggregateStats {
  const totals = rounds.map(roundTotals)

  let girMade = 0, girPoss = 0, girRounds = 0
  let firMade = 0, firPoss = 0, firRounds = 0
  let puttSum = 0, puttHoles = 0, puttRounds = 0
  let scrMade = 0, scrPoss = 0, scrambleRounds = 0
  let toParSum = 0, scoredRounds = 0
  let bestToPar: number | null = null

  for (const t of totals) {
    if (t.girPossible > 0)      { girMade += t.gir; girPoss += t.girPossible; girRounds++ }
    if (t.fairwaysPossible > 0) { firMade += t.fairways; firPoss += t.fairwaysPossible; firRounds++ }
    if (t.putts > 0)            { puttSum += t.putts; puttHoles += t.holesPlayed; puttRounds++ }
    if (t.scramblePossible > 0) { scrMade += t.scrambles; scrPoss += t.scramblePossible; scrambleRounds++ }
    if (t.complete) {
      toParSum += t.toPar; scoredRounds++
      if (bestToPar === null || t.toPar < bestToPar) bestToPar = t.toPar
    }
  }

  return {
    girPct:      girPoss ? Math.round((girMade / girPoss) * 100) : null,        girRounds,
    fairwayPct:  firPoss ? Math.round((firMade / firPoss) * 100) : null,        fairwayRounds: firRounds,
    puttsPer18:  puttHoles ? Math.round((puttSum / puttHoles) * 18 * 10) / 10 : null, puttRounds,
    scramblePct: scrPoss ? Math.round((scrMade / scrPoss) * 100) : null,        scrambleRounds,
    avgToPar:    scoredRounds ? Math.round((toParSum / scoredRounds) * 10) / 10 : null, scoredRounds,
    bestToPar,
    totalRounds: rounds.length,
  }
}

// ── Score trend (oldest → newest) for a small chart ─────────────────────────
export interface TrendPoint { date: string; toPar: number; score: number; holes: number }

export function scoreTrend(rounds: Round[], n = 8): TrendPoint[] {
  const complete = rounds
    .map(r => ({ r, t: roundTotals(r) }))
    .filter(x => x.t.complete)
    .sort((a, b) => new Date(a.r.playedAt).getTime() - new Date(b.r.playedAt).getTime())
  return complete.slice(-n).map(({ r, t }) => ({ date: r.playedAt, toPar: t.toPar, score: t.score, holes: t.holes }))
}

// ── Estimated handicap (best 8 of last 20 18-hole rounds, ×0.96) ─────────────
export interface HandicapEstimate { value: number | null; basedOn: number; roundsNeeded: number }

export function estimateHandicap(rounds: Round[]): HandicapEstimate {
  // Differential ≈ strokes over par, from complete 18-hole rounds (last 20).
  const diffs = rounds
    .map(r => ({ r, t: roundTotals(r) }))
    .filter(x => x.t.complete && x.t.holes === 18)
    .sort((a, b) => new Date(b.r.playedAt).getTime() - new Date(a.r.playedAt).getTime())
    .slice(0, 20)
    .map(x => x.t.toPar)

  if (diffs.length < 3) {
    return { value: null, basedOn: diffs.length, roundsNeeded: 3 - diffs.length }
  }
  const take = Math.max(1, Math.min(8, Math.round(diffs.length * 0.4)))
  const best = [...diffs].sort((a, b) => a - b).slice(0, take)
  const avg  = best.reduce((s, d) => s + d, 0) / best.length
  return { value: Math.round(avg * 0.96 * 10) / 10, basedOn: diffs.length, roundsNeeded: 0 }
}

// ── Bag gap analysis ────────────────────────────────────────────────────────
export interface BagGap { from: Club; to: Club; gap: number; notable: boolean }

export function bagGaps(shots: Shot[]): { gaps: BagGap[]; clubsWithData: number } {
  const clubs = CLUBS_DATA
    .map(c => ({ club: c, avg: getClubAvg(shots, c.id) }))
    .filter((c): c is { club: Club; avg: number } => c.avg !== null)
    .sort((a, b) => b.avg - a.avg)

  const gaps: BagGap[] = []
  for (let i = 0; i < clubs.length - 1; i++) {
    const gap = clubs[i].avg - clubs[i + 1].avg
    // A "full club" gap (≥18 yds) between scoring clubs is worth flagging;
    // big driver→wood gaps are expected, so don't flag those.
    const notable = gap >= 18 && clubs[i].club.cat !== 'woods'
    gaps.push({ from: clubs[i].club, to: clubs[i + 1].club, gap, notable })
  }
  return { gaps, clubsWithData: clubs.length }
}
