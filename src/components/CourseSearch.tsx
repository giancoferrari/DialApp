import { useState, useEffect, useRef } from 'react'
import { searchCourses, courseDisplayName, type GolfCourse } from '../lib/golfCourseApi'

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
    background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 14,
    padding: '12px 16px', fontSize: 14, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    color: '#1F1D17', width: '100%', outline: 'none', boxSizing: 'border-box',
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
        onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
        onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
        autoComplete="off"
      />

      {loading && (
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6B5F4E', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
          Searching…
        </div>
      )}

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
          background: 'rgba(250,246,234,0.96)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.7)', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(31,29,23,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
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
                  borderTop: i > 0 ? '1px solid rgba(224,216,197,0.4)' : 'none',
                  padding: '12px 16px', cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(31,58,42,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 14, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.01em' }}>
                  {courseDisplayName(course)}
                </div>
                <div style={{ fontSize: 11.5, color: '#6B5F4E', marginTop: 2, display: 'flex', gap: 8 }}>
                  <span>{loc}</span>
                  {teeCount > 0 && <span style={{ color: '#D9824D' }}>{teeCount} tee{teeCount !== 1 ? 's' : ''}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

