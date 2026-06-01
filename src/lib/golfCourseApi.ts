export interface GolfHole {
  par:      number
  yardage:  number
  handicap: number
}

export interface GolfTee {
  tee_name:        string
  par_total:       number
  number_of_holes: number
  course_rating:   number
  slope_rating:    number
  total_yards:     number
  holes:           GolfHole[]
}

export interface GolfCourse {
  id:          number
  club_name:   string
  course_name: string
  location: {
    city:    string
    state:   string
    country: string
  }
  tees: {
    male:   GolfTee[]
    female: GolfTee[]
  }
}

// The API's `course_name` is sometimes a generic label (e.g. "Panama Golf
// Course") while `club_name` holds the real venue name. Prefer club_name, with
// explicit overrides for known local clubs so they read exactly right.
const COURSE_NAME_OVERRIDES: Record<number, string> = {
  14916: 'Club de Golf de Panama',          // API course_name: "Panama Golf Course"
  25374: 'Santa Maria Golf & Country Club', // API course_name: "Santa Maria Golf Course"
}

export function courseDisplayName(course: { id: number; club_name?: string; course_name?: string }): string {
  return COURSE_NAME_OVERRIDES[course.id] ?? course.club_name ?? course.course_name ?? ''
}

export async function searchCourses(query: string): Promise<GolfCourse[]> {
  if (query.trim().length < 3) return []
  try {
    const res = await fetch(`/api/golf-search?q=${encodeURIComponent(query.trim())}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.courses ?? []) as GolfCourse[]
  } catch {
    return []
  }
}

