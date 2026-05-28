const API_KEY = import.meta.env.VITE_GOLF_COURSE_API_KEY as string
const BASE    = 'https://api.golfcourseapi.com/v1'

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

export async function searchCourses(query: string): Promise<GolfCourse[]> {
  if (query.trim().length < 3) return []
  const res = await fetch(
    `${BASE}/search?search_query=${encodeURIComponent(query.trim())}`,
    { headers: { Authorization: `Key ${API_KEY}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.courses ?? []) as GolfCourse[]
}
