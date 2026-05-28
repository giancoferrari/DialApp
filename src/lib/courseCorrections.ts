import { supabase } from './supabase'
import type { GolfCourse, GolfTee } from './golfCourseApi'

interface DbCorrection {
  id: string
  api_course_id: number
  course_name: string
  location_city: string | null
  location_state: string | null
  location_country: string | null
  tees: GolfTee[]
  updated_at: string
}

export async function fetchCorrection(apiCourseId: number): Promise<DbCorrection | null> {
  const { data } = await supabase
    .from('course_corrections')
    .select('*')
    .eq('api_course_id', apiCourseId)
    .maybeSingle()
  return data as DbCorrection | null
}

export async function saveCorrection(
  course: GolfCourse,
  correctedTees: GolfTee[]
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase
    .from('course_corrections')
    .upsert({
      api_course_id: course.id,
      course_name:   course.course_name,
      location_city:    course.location.city    ?? null,
      location_state:   course.location.state   ?? null,
      location_country: course.location.country ?? null,
      tees:       correctedTees,
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'api_course_id' })
}

