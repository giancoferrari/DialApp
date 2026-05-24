export type ClubCat = 'woods' | 'hybrids' | 'irons' | 'wedges'

export interface Club {
  id: string
  name: string
  abbr: string
  cat: ClubCat
}

export interface Shot {
  id: number
  clubId: string
  yardage: number
  ts: number
  note: string
}

export type View = 'dashboard' | 'bag'
