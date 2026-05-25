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

export type View = 'dashboard' | 'bag' | 'dialin' | 'rounds' | 'practice' | 'profile'

// ── Course ──────────────────────────────────────────────
export interface CourseHole {
  id: string
  courseId: string
  holeNumber: number
  par: 3 | 4 | 5
  yardage: number | null
}

export interface Course {
  id: string
  userId: string
  name: string
  tee: string
  holes: 9 | 18
  courseHoles: CourseHole[]
  createdAt: string
}

// ── Round ────────────────────────────────────────────────
export interface RoundHole {
  id: string
  roundId: string
  holeNumber: number
  par: 3 | 4 | 5
  yardage: number | null
  score: number | null
  putts: number | null
  fairwayHit: boolean | null
  gir: boolean | null
}

export interface Round {
  id: string
  userId: string
  courseId: string | null
  courseName: string
  tee: string | null
  holes: 9 | 18
  playedAt: string
  roundHoles: RoundHole[]
  createdAt: string
}

// ── Practice ─────────────────────────────────────────────
export type FocusArea = 'driver' | 'woods' | 'irons' | 'short_game' | 'putting' | 'bunker'

export interface PracticeSession {
  id: string
  userId: string
  focusArea: FocusArea
  notes: string | null
  rating: 1 | 2 | 3 | 4 | 5
  sessionDate: string
  createdAt: string
}

// ── Wind (Dial In) ────────────────────────────────────────
export type WindDirection = 'none' | 'headwind' | 'tailwind' | 'left' | 'right'
export type WindStrength  = 'light' | 'moderate' | 'strong'

// ── User Profile ──────────────────────────────────────────
export interface EquipmentItem {
  clubId: string
  brand: string
  model: string
}

export interface UserProfile {
  id: string
  userId: string
  username: string | null
  avatarUrl: string | null
  handicapIndex: number | null
  homeCourse: string | null
  goalScore: number | null
  goalHandicap: number | null
  goalNotes: string | null
  equipment: EquipmentItem[]
  createdAt: string
  updatedAt: string
}
