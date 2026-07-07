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

