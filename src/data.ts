import type { Club, Shot, ClubCat } from './types'

export const CLUBS_DATA: Club[] = [
  { id: 'driver', name: 'Driver',         abbr: 'D',   cat: 'woods'   },
  { id: '3w',     name: '3 Wood',         abbr: '3W',  cat: 'woods'   },
  { id: 'h',      name: 'Hybrid',         abbr: 'H',   cat: 'hybrids' },
  { id: '4i',     name: '4 Iron',         abbr: '4I',  cat: 'irons'   },
  { id: '5i',     name: '5 Iron',         abbr: '5I',  cat: 'irons'   },
  { id: '6i',     name: '6 Iron',         abbr: '6I',  cat: 'irons'   },
  { id: '7i',     name: '7 Iron',         abbr: '7I',  cat: 'irons'   },
  { id: '8i',     name: '8 Iron',         abbr: '8I',  cat: 'irons'   },
  { id: '9i',     name: '9 Iron',         abbr: '9I',  cat: 'irons'   },
  { id: 'pw',     name: 'Pitching Wedge', abbr: 'PW',  cat: 'wedges'  },
  { id: 'gw',     name: 'Gap Wedge',      abbr: 'GW',  cat: 'wedges'  },
  { id: 'sw',     name: 'Sand Wedge',     abbr: 'SW',  cat: 'wedges'  },
  { id: 'lw',     name: 'Lob Wedge',      abbr: 'LW',  cat: 'wedges'  },
]

export const CAT_LABELS: Record<ClubCat, string> = {
  woods: 'Woods',
  hybrids: 'Hybrids',
  irons: 'Irons',
  wedges: 'Wedges',
}

export const BAR_MAX = 320

export function makeInitialShots(): Shot[] {
  const now = Date.now()
  const h = 3_600_000
  const d = 86_400_000
  return [
    { id: 1,  clubId: 'driver', yardage: 258, ts: now - h * 1,   note: '' },
    { id: 2,  clubId: '3w',     yardage: 228, ts: now - h * 2,   note: '' },
    { id: 3,  clubId: 'driver', yardage: 245, ts: now - h * 3,   note: 'Into wind' },
    { id: 4,  clubId: '7i',     yardage: 162, ts: now - h * 5,   note: '' },
    { id: 5,  clubId: 'pw',     yardage: 125, ts: now - h * 6,   note: '' },
    { id: 6,  clubId: 'driver', yardage: 263, ts: now - d * 1,   note: '' },
    { id: 7,  clubId: '3w',     yardage: 222, ts: now - d * 1,   note: '' },
    { id: 8,  clubId: '7i',     yardage: 158, ts: now - d * 1,   note: '' },
    { id: 9,  clubId: 'driver', yardage: 251, ts: now - d * 2,   note: '' },
    { id: 10, clubId: 'pw',     yardage: 128, ts: now - d * 2,   note: '' },
    { id: 11, clubId: '6i',     yardage: 174, ts: now - d * 2,   note: '' },
    { id: 12, clubId: '8i',     yardage: 148, ts: now - d * 3,   note: '' },
    { id: 13, clubId: 'gw',     yardage: 108, ts: now - d * 3,   note: '' },
    { id: 14, clubId: 'sw',     yardage: 92,  ts: now - d * 4,   note: '' },
    { id: 15, clubId: '5i',     yardage: 180, ts: now - d * 4,   note: '' },
    { id: 16, clubId: '9i',     yardage: 138, ts: now - d * 5,   note: '' },
    { id: 17, clubId: 'h',      yardage: 205, ts: now - d * 5,   note: '' },
    { id: 18, clubId: '7i',     yardage: 165, ts: now - d * 6,   note: '' },
    { id: 19, clubId: '4i',     yardage: 188, ts: now - d * 7,   note: '' },
    { id: 20, clubId: 'lw',     yardage: 78,  ts: now - d * 8,   note: '' },
    { id: 21, clubId: 'driver', yardage: 248, ts: now - d * 9,   note: '' },
    { id: 22, clubId: '9i',     yardage: 141, ts: now - d * 10,  note: '' },
    { id: 23, clubId: 'sw',     yardage: 88,  ts: now - d * 11,  note: '' },
  ]
}

export const getClubShots = (shots: Shot[], cid: string) =>
  shots.filter(s => s.clubId === cid)

export const getClubAvg = (shots: Shot[], cid: string): number | null => {
  const s = getClubShots(shots, cid)
  if (!s.length) return null
  return Math.round(s.reduce((a, x) => a + x.yardage, 0) / s.length)
}

export const getClubLast = (shots: Shot[], cid: string): number | null => {
  const s = [...getClubShots(shots, cid)].sort((a, b) => b.ts - a.ts)
  return s[0]?.yardage ?? null
}

export const getClubRange = (shots: Shot[], cid: string): { min: number; max: number } | null => {
  const s = getClubShots(shots, cid)
  if (!s.length) return null
  return { min: Math.min(...s.map(x => x.yardage)), max: Math.max(...s.map(x => x.yardage)) }
}

export const timeAgo = (ts: number): string => {
  const diff = Date.now() - ts
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`
  const days = Math.floor(diff / 86_400_000)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

