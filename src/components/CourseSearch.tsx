import { useState, useEffect, useRef } from 'react'
import { searchCourses, courseDisplayName, type GolfCourse } from '../lib/golfCourseApi'
import { font, color, radius, elevation } from '../lib/tokens'

interface Props {
  value:        string
  onChange:     (name: string) => void
  onSelect:     (course: GolfCourse) => void
  placeholder?: string
  inputStyle?:  React.CSSProperties
}

export default function CourseSearch({ value, onChange, onSelect, placeholder = 'Search courses…', inputStyle }: Props) {
  const [results, setResults] = useState<GolfCourse[]>([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const skipRef   = useRef(false) // prevents re-search after a course is picked

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return }
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.trim().length < 3) { setResults([]); setOpen(false); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const res = await searchCourses(value)
      setResults(res)
      setOpen(res.length > 0)
      setLoading(false)
    }, 350)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pick(course: GolfCourse) {
    if (timerRef.current) clearTimeout(timerRef.current)
    skipRef.current = true
    setOpen(false)
    setResults([])
    setLoading(false)
    onChange(courseDisplayName(course))
    onSelect(course)
  }

  const base: React.CSSProperties = {
    background: color.white, border: `1px solid ${color.borderStrong}`, borderRadius: radius.sm,
    padding: '12px 14px', fontSize: 16, fontFamily: font.body,
    color: color.ink, width: '100%', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    ...inputStyle,
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={base}
        onFocus={e => { e.currentTarget.style.borderColor = color.green }}
        onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
        autoComplete="off"
      />

      {loading && (
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: color.muted, fontFamily: font.body }}>
          Searching…
        </div>
      )}

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
          background: color.white,
          border: `1px solid ${color.border}`, borderRadius: radius.md,
          boxShadow: elevation.md,
          overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
          animation: 'slideDown 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          {results.map((course, i) => {
            const loc = [course.location.city, course.location.state || course.location.country].filter(Boolean).join(', ')
            const teeCount = (course.tees.male?.length ?? 0) + (course.tees.female?.length ?? 0)
            return (
              <button
                key={course.id}
                onMouseDown={() => pick(course)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  borderTop: i > 0 ? `1px solid ${color.border}` : 'none',
                  padding: '12px 14px', cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink }}>
                  {courseDisplayName(course)}
                </div>
                <div style={{ fontSize: 12, color: color.muted, marginTop: 2, display: 'flex', gap: 8 }}>
                  <span>{loc}</span>
                  {teeCount > 0 && <span style={{ color: color.positive }}>{teeCount} tee{teeCount !== 1 ? 's' : ''}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

