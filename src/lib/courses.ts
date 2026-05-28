import { supabase } from './supabase'
import type { Course, CourseHole } from '../types'

type DbCourse = { id: string; user_id: string; name: string; tee: string; holes: number; created_at: string }
type DbHole   = { id: string; course_id: string; hole_number: number; par: number; yardage: number | null }

function toHole(r: DbHole): CourseHole {
  return { id: r.id, courseId: r.course_id, holeNumber: r.hole_number, par: r.par as 3|4|5, yardage: r.yardage }
}

function toCourse(r: DbCourse, holes: CourseHole[]): Course {
  return { id: r.id, userId: r.user_id, name: r.name, tee: r.tee, holes: r.holes as 9|18, courseHoles: holes, createdAt: r.created_at }
}

export async function fetchCourses(userId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*, course_holes(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as (DbCourse & { course_holes: DbHole[] })[]).map(r =>
    toCourse(r, r.course_holes.map(toHole).sort((a, b) => a.holeNumber - b.holeNumber))
  )
}

export async function saveCourse(
  userId: string,
  name: string,
  tee: string,
  holes: 9 | 18,
  holeSetup: { par: 3|4|5; yardage: number | null }[]
): Promise<Course> {
  const { data: courseRow, error: cErr } = await supabase
    .from('courses')
    .insert([{ user_id: userId, name, tee, holes }])
    .select()
    .single()
  if (cErr) throw cErr

  const holeRows = holeSetup.map((h, i) => ({
    course_id: courseRow.id,
    hole_number: i + 1,
    par: h.par,
    yardage: h.yardage,
  }))
  const { data: holeData, error: hErr } = await supabase
    .from('course_holes')
    .insert(holeRows)
    .select()
  if (hErr) throw hErr

  return toCourse(courseRow as DbCourse, (holeData as DbHole[]).map(toHole).sort((a, b) => a.holeNumber - b.holeNumber))
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

