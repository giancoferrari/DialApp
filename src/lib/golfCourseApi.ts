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
  try {
    const res = await fetch(`/api/golf-search?q=${encodeURIComponent(query.trim())}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.courses ?? []) as GolfCourse[]
  } catch {
    return []
  }
}
