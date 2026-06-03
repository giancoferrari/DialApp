// Shared formatters — one home for time, names, and golf number formatting.
import type { PublicProfile } from '../types'

// "just now" · "5m" · "3h" · "2d" · "Mar 4"
export function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// @username, else first name, else fallback.
export function displayName(p?: PublicProfile | null, fallback = 'Golfer'): string {
  if (!p) return fallback
  return p.username ? `@${p.username}` : (p.firstName ?? fallback)
}

// First letter for avatar fallbacks.
export function initialOf(
  p?: { username?: string | null; firstName?: string | null } | null,
  fallback = '?',
): string {
  return ((p?.firstName?.[0] ?? p?.username?.[0] ?? fallback) || fallback).toUpperCase()
}

// Score relative to par: 0 → "E", −2 → "−2" (real minus), +3 → "+3".
export function scoreToPar(strokes: number, par: number): string {
  const d = strokes - par
  if (d === 0) return 'E'
  return d > 0 ? `+${d}` : `−${Math.abs(d)}`
}

// Handicap index, always one decimal: 12.4 (— when unknown).
export function formatHandicap(h?: number | null): string {
  return h == null ? '—' : h.toFixed(1)
}

// Yardage with unit.
export function formatYards(y?: number | null): string {
  return y == null ? '—' : `${Math.round(y)} yd`
}
