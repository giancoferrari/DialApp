import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { saveCourse, deleteCourse } from '../lib/courses'
import { createRound, upsertRoundHoles, deleteRound } from '../lib/rounds'
import type { Course, Round, RoundHole } from '../types'
import { CloseIcon, PlusIcon } from './Icons'

interface Props {
  courses: Course[]
  rounds: Round[]
  onCourseAdded: (c: Course) => void
  onCourseDeleted: (id: string) => void
  onRoundAdded: (r: Round) => void
  onRoundDeleted: (id: string) => void
  isMobile?: boolean
  homeCourse?: string | null
}

type Phase =
  | { type: 'history' }
  | { type: 'course_setup' }
  | { type: 'hole_setup'; name: string; tee: string; holeCount: 9 | 18; courseId: string | null }
  | { type: 'active'; round: Round; holes: RoundHole[]; current: number }
  | { type: 'summary'; round: Round; holes: RoundHole[] }

const TEE_COLORS = [
  { id: 'black', label: 'Black', color: '#1F1D17' },
  { id: 'blue',  label: 'Blue',  color: '#2563EB' },
  { id: 'white', label: 'White', color: '#E5E5E5', text: '#1F1D17' },
  { id: 'red',   label: 'Red',   color: '#DC2626' },
  { id: 'gold',  label: 'Gold',  color: '#C8A84B' },
  { id: 'green', label: 'Green', color: '#5C7A4D' },
]

function scoreName(score: number, par: number) {
  const diff = score - par
  if (diff <= -2) return { label: 'Eagle', color: '#C8A84B' }
  if (diff === -1) return { label: 'Birdie', color: '#5C7A4D' }
  if (diff === 0)  return { label: 'Par',    color: '#1F3A2A' }
  if (diff === 1)  return { label: 'Bogey',  color: '#D9824D' }
  return               { label: '+' + diff,  color: '#C0392B' }
}

function ScoreButton({ value, onChange, min = 1, max = 15 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 36, height: 36, borderRadius: 18, background: '#F0EBDD', border: '1px solid #E0D8C5', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#1F1D17' }}
      >−</button>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: '#1F1D17', minWidth: 32, textAlign: 'center', letterSpacing: '-0.03em' }}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 36, height: 36, borderRadius: 18, background: '#F0EBDD', border: '1px solid #E0D8C5', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#1F1D17' }}
      >+</button>
    </div>
  )
}

function Toggle({ value, onChange, trueLabel, falseLabel, naLabel }: { value: boolean | null; onChange: (v: boolean | null) => void; trueLabel: string; falseLabel: string; naLabel?: string }) {
  const opts: { v: boolean | null; label: string }[] = naLabel
    ? [{ v: null, label: naLabel }, { v: true, label: trueLabel }, { v: false, label: falseLabel }]
    : [{ v: true, label: trueLabel }, { v: false, label: falseLabel }]
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.map(o => (
        <button
          key={String(o.v)}
          onClick={() => onChange(o.v)}
          style={{
            border: '1px solid', borderRadius: 999, padding: '6px 14px',
            fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            background: value === o.v ? '#1F3A2A' : 'transparent',
            color: value === o.v ? '#FAF6EA' : '#1F1D17',
            borderColor: value === o.v ? '#1F3A2A' : '#E0D8C5',
            transition: 'all 0.15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function calcTotals(holes: RoundHole[]) {
  const played  = holes.filter(h => h.score !== null)
  const totalScore = played.reduce((s, h) => s + (h.score ?? 0), 0)
  const totalPar   = played.reduce((s, h) => s + h.par, 0)
  const totalPutts = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
  const par45      = holes.filter(h => h.par >= 4)
  const fairways   = par45.filter(h => h.fairwayHit === true).length
  const girHoles   = holes.filter(h => h.gir === true).length
  return { totalScore, totalPar, diff: totalScore - totalPar, totalPutts, fairways, fairwaysPossible: par45.length, girHoles, girPossible: holes.length, played: played.length }
}

export default function ScorecardView({ courses, rounds, onCourseAdded, onCourseDeleted, onRoundAdded, onRoundDeleted, isMobile = false, homeCourse = null }: Props) {
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>({ type: 'history' })

  // Course setup state
  const [courseName, setCourseName] = useState('')
  const [tee, setTee]               = useState('white')
  const [holeCount, setHoleCount]   = useState<9 | 18>(18)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)

  // Hole setup state (par + yardage per hole)
  const [holeSetup, setHoleSetup] = useState<{ par: 3|4|5; yardage: string }[]>([])

  // Active round state
  const updateHole = (holes: RoundHole[], idx: number, patch: Partial<RoundHole>): RoundHole[] =>
    holes.map((h, i) => i === idx ? { ...h, ...patch } : h)

  const initHoleSetup = (count: number) =>
    Array.from({ length: count }, () => ({ par: 4 as 3|4|5, yardage: '' }))

  // ── Phase transitions ──────────────────────────────────

  const goSetupHoles = () => {
    setHoleSetup(initHoleSetup(holeCount))
    setPhase({ type: 'hole_setup', name: courseName.trim(), tee, holeCount, courseId: null })
  }

  const startRoundFromCourse = (course: Course) => {
    const todayStr = new Date().toISOString().split('T')[0]
    const tempRound: Round = {
      id: 'temp-' + Date.now(), userId: user?.id ?? '', courseId: course.id,
      courseName: course.name, tee: course.tee, holes: course.holes,
      playedAt: todayStr, roundHoles: [], createdAt: '',
    }
    const initHoles: RoundHole[] = course.courseHoles.map(ch => ({
      id: '', roundId: '', holeNumber: ch.holeNumber, par: ch.par,
      yardage: ch.yardage, score: ch.par, putts: 2, fairwayHit: ch.par >= 4 ? null : null, gir: null,
    }))
    setPhase({ type: 'active', round: tempRound, holes: initHoles, current: 0 })
  }

  const startQuickRound = async () => {
    if (!user || phase.type !== 'hole_setup') return
    setSaving(true); setSaveError(null)
    try {
      const hs = holeSetup.map(h => ({ par: h.par, yardage: h.yardage ? parseInt(h.yardage) : null }))
      const course = await saveCourse(user.id, phase.name, phase.tee, phase.holeCount, hs)
      onCourseAdded(course)

      const todayStr = new Date().toISOString().split('T')[0]
      const round = await createRound(user.id, course.id, course.name, course.tee, course.holes, todayStr)
      onRoundAdded(round)

      const initHoles: RoundHole[] = course.courseHoles.map(ch => ({
        id: '', roundId: round.id, holeNumber: ch.holeNumber, par: ch.par,
        yardage: ch.yardage, score: ch.par, putts: 2, fairwayHit: null, gir: null,
      }))
      setPhase({ type: 'active', round, holes: initHoles, current: 0 })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSaveError(msg || 'Failed to save course. Please check your connection and try again.')
    }
    finally { setSaving(false) }
  }

  const finishRound = async (round: Round, holes: RoundHole[]) => {
    setSaving(true); setSaveError(null)
    try {
      const saved = await upsertRoundHoles(round.id, holes.map(h => ({
        holeNumber: h.holeNumber, par: h.par, yardage: h.yardage,
        score: h.score, putts: h.putts, fairwayHit: h.fairwayHit, gir: h.gir,
      })))
      const finalRound = { ...round, roundHoles: saved }
      onRoundAdded(finalRound)
      setPhase({ type: 'summary', round: finalRound, holes: saved })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSaveError(msg || 'Failed to save round. Please try again.')
    }
    finally { setSaving(false) }
  }

  // ── Struggle analysis ──────────────────────────────────
  const getStruggleHoles = (courseId: string | null | undefined) => {
    if (!courseId) return []
    const courseRounds = rounds.filter(r => r.courseId === courseId && r.roundHoles.length > 0)
    if (courseRounds.length < 2) return []
    const holeMap: Record<number, { overPar: number; count: number }> = {}
    courseRounds.forEach(r => {
      r.roundHoles.forEach(h => {
        if (h.score !== null) {
          if (!holeMap[h.holeNumber]) holeMap[h.holeNumber] = { overPar: 0, count: 0 }
          holeMap[h.holeNumber].overPar += h.score - h.par
          holeMap[h.holeNumber].count++
        }
      })
    })
    return Object.entries(holeMap)
      .map(([hole, d]) => ({ hole: parseInt(hole), avg: d.overPar / d.count }))
      .filter(x => x.avg > 0.5)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#5C7A4D',
    textTransform: 'uppercase', marginBottom: 8, display: 'block',
  }
  const card: React.CSSProperties = {
    background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#F0EBDD', border: '1px solid #E0D8C5',
    borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#1F1D17',
    outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
  }

  const px = isMobile ? 16 : 40

  // ── HISTORY ────────────────────────────────────────────
  if (phase.type === 'history') {
    return (
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={sectionLabel}>Scorecard</span>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 28 : 38, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: 0 }}>
              Rounds.
            </h1>
          </div>
          <button
            onClick={() => { setCourseName(homeCourse ?? ''); setTee('white'); setHoleCount(18); setPhase({ type: 'course_setup' }) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '10px 18px 10px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            Start round
            <span style={{ width: 22, height: 22, borderRadius: 11, background: '#D9824D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusIcon size={14} color="#FAF6EA" />
            </span>
          </button>
        </div>

        {/* Saved courses */}
        {courses.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <span style={sectionLabel}>Saved courses</span>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {courses.map(c => {
                const teeInfo = TEE_COLORS.find(t => t.id === c.tee) ?? TEE_COLORS[2]
                return (
                  <div key={c.id} style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid #E0D8C5' : 'none', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#6B6857' }}>{c.holes} holes · {teeInfo.label} tees</div>
                    </div>
                    <button
                      onClick={() => startRoundFromCourse(c)}
                      style={{ background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Play
                    </button>
                    <button
                      onClick={async () => { try { await deleteCourse(c.id); onCourseDeleted(c.id) } catch {/* */} }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.3, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.3' }}
                    >
                      <CloseIcon size={12} color="#1F1D17" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Round history */}
        {rounds.length === 0 ? (
          <div style={{ ...card, padding: '56px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', marginBottom: 8 }}>No rounds yet</div>
            <p style={{ fontSize: 14, color: '#6B6857' }}>Start a round to track your scores hole by hole.</p>
          </div>
        ) : (
          <div>
            <span style={sectionLabel}>Round history</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rounds.map(r => {
                const t = calcTotals(r.roundHoles)
                const teeInfo = TEE_COLORS.find(x => x.id === r.tee) ?? TEE_COLORS[2]
                return (
                  <div key={r.id} style={{ ...card, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid #E0D8C5' : 'none', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>{r.courseName}</div>
                      <div style={{ fontSize: 12.5, color: '#6B6857', marginTop: 2 }}>{formatDate(r.playedAt)} · {r.holes} holes</div>
                    </div>
                    {t.played > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em' }}>
                          {t.totalScore}
                        </div>
                        <div style={{ fontSize: 12, color: t.diff === 0 ? '#5C7A4D' : t.diff > 0 ? '#D9824D' : '#5C7A4D' }}>
                          {t.diff === 0 ? 'E' : t.diff > 0 ? `+${t.diff}` : t.diff}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setPhase({ type: 'summary', round: r, holes: r.roundHoles })}
                      style={{ background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#1F1D17' }}
                    >
                      View
                    </button>
                    <button
                      onClick={async () => { try { await deleteRound(r.id); onRoundDeleted(r.id) } catch {/* */} }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.3, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.3' }}
                    >
                      <CloseIcon size={12} color="#1F1D17" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── COURSE SETUP ───────────────────────────────────────
  if (phase.type === 'course_setup') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>
        <button onClick={() => setPhase({ type: 'history' })} style={{ background: 'none', border: 'none', color: '#6B6857', fontSize: 13.5, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: 28, padding: 0 }}>
          ← Back
        </button>
        <span style={sectionLabel}>New round</span>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: '0 0 32px' }}>
          Course setup
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Course name */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 8 }}>Course name</label>
            <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
            />
            {homeCourse && courseName !== homeCourse && (
              <button
                onClick={() => setCourseName(homeCourse)}
                style={{
                  marginTop: 8, background: 'transparent', border: '1px solid #E0D8C5',
                  borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 500,
                  color: '#5C7A4D', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#5C7A4D'; e.currentTarget.style.background = '#F0EBDD' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0D8C5'; e.currentTarget.style.background = 'transparent' }}
              >
                Use home course: {homeCourse}
              </button>
            )}
          </div>

          {/* Number of holes */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 10 }}>Holes</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {([9, 18] as (9|18)[]).map(n => (
                <button key={n} onClick={() => setHoleCount(n)} style={{ flex: 1, border: '1px solid', borderRadius: 14, padding: '12px', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, background: holeCount === n ? '#1F3A2A' : 'transparent', color: holeCount === n ? '#FAF6EA' : '#1F1D17', borderColor: holeCount === n ? '#1F3A2A' : '#E0D8C5', transition: 'all 0.15s', letterSpacing: '-0.02em' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Tee */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 10 }}>Tee</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TEE_COLORS.map(t => (
                <button key={t.id} onClick={() => setTee(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid', borderRadius: 999, padding: '8px 16px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, background: tee === t.id ? '#1F3A2A' : 'transparent', color: tee === t.id ? '#FAF6EA' : '#1F1D17', borderColor: tee === t.id ? '#1F3A2A' : '#E0D8C5', transition: 'all 0.15s' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: t.color, border: t.id === 'white' ? '1px solid #ccc' : 'none', flexShrink: 0 }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={goSetupHoles}
            disabled={!courseName.trim()}
            style={{ background: courseName.trim() ? '#1F3A2A' : '#C9C0A8', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '14px', fontSize: 14, fontWeight: 500, cursor: courseName.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s', marginTop: 8 }}
            onMouseEnter={e => { if (courseName.trim()) e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { if (courseName.trim()) e.currentTarget.style.background = '#1F3A2A' }}
          >
            Set up holes →
          </button>
        </div>
      </div>
    )
  }

  // ── HOLE SETUP ─────────────────────────────────────────
  if (phase.type === 'hole_setup') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>
        <button onClick={() => setPhase({ type: 'course_setup' })} style={{ background: 'none', border: 'none', color: '#6B6857', fontSize: 13.5, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: 28, padding: 0 }}>
          ← Back
        </button>
        <span style={sectionLabel}>{phase.name}</span>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Hole setup
        </h1>
        <p style={{ fontSize: 14, color: '#6B6857', marginBottom: 28 }}>Set the par and yardage for each hole. Yardage is optional.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          {holeSetup.map((h, i) => (
            <div key={i} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#B5AC95', textTransform: 'uppercase', marginBottom: 10 }}>Hole {i + 1}</div>
              {/* Par */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#6B6857', marginBottom: 5 }}>Par</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {([3, 4, 5] as (3|4|5)[]).map(p => (
                    <button key={p} onClick={() => setHoleSetup(hs => hs.map((x, j) => j === i ? { ...x, par: p } : x))}
                      style={{ flex: 1, border: '1px solid', borderRadius: 8, padding: '5px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif", background: h.par === p ? '#1F3A2A' : 'transparent', color: h.par === p ? '#FAF6EA' : '#1F1D17', borderColor: h.par === p ? '#1F3A2A' : '#E0D8C5', transition: 'all 0.12s' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {/* Yardage */}
              <input
                type="number" placeholder="Yds" value={h.yardage}
                onChange={e => setHoleSetup(hs => hs.map((x, j) => j === i ? { ...x, yardage: e.target.value } : x))}
                style={{ width: '100%', background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#1F1D17', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif' " }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
              />
            </div>
          ))}
        </div>

        {saveError && (
          <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#C0392B', marginBottom: 8, lineHeight: 1.45 }}>
            <strong>Error:</strong> {saveError}
          </div>
        )}
        <button
          onClick={startQuickRound}
          disabled={saving}
          style={{ background: saving ? '#C9C0A8' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '14px 32px', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#1F3A2A' }}
        >
          {saving ? 'Saving…' : 'Start round →'}
        </button>
      </div>
    )
  }

  // ── ACTIVE ROUND ───────────────────────────────────────
  if (phase.type === 'active') {
    const { round, holes, current } = phase
    const hole = holes[current]
    const score = hole.score ?? hole.par
    const putts = hole.putts ?? 2

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: `${isMobile ? 20 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 13, color: '#6B6857', fontFamily: "'DM Sans', sans-serif" }}>{round.courseName}</span>
          <span style={{ fontSize: 13, color: '#6B6857', fontFamily: "'DM Sans', sans-serif" }}>Hole {current + 1} of {round.holes}</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#E0D8C5', borderRadius: 2, marginBottom: 36, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((current + 1) / round.holes) * 100}%`, background: '#1F3A2A', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>

        {/* Hole header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 800, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {hole.holeNumber}
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#6B6857' }}>Par {hole.par}{hole.yardage ? ` · ${hole.yardage} yds` : ''}</div>
            {hole.score !== null && (
              <div style={{ ...scoreName(hole.score, hole.par), fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                {scoreName(hole.score, hole.par).label}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Score */}
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 14 }}>Score</div>
            <ScoreButton value={score} onChange={v => setPhase({ ...phase, holes: updateHole(holes, current, { score: v }) })} />
          </div>

          {/* Putts */}
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 14 }}>Putts</div>
            <ScoreButton value={putts} onChange={v => setPhase({ ...phase, holes: updateHole(holes, current, { putts: v }) })} min={0} max={10} />
          </div>

          {/* Fairway (par 4 & 5 only) */}
          {hole.par >= 4 && (
            <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 14 }}>Fairway hit</div>
              <Toggle value={hole.fairwayHit ?? null} onChange={v => setPhase({ ...phase, holes: updateHole(holes, current, { fairwayHit: v }) })} trueLabel="Hit" falseLabel="Missed" />
            </div>
          )}

          {/* GIR */}
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 14 }}>Green in regulation</div>
            <Toggle value={hole.gir ?? null} onChange={v => setPhase({ ...phase, holes: updateHole(holes, current, { gir: v }) })} trueLabel="Yes" falseLabel="No" />
          </div>
        </div>

        {saveError && (
          <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#C0392B', marginTop: 16, lineHeight: 1.45 }}>
            <strong>Error:</strong> {saveError}
          </div>
        )}
        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {current > 0 && (
            <button
              onClick={() => setPhase({ ...phase, current: current - 1 })}
              style={{ flex: 1, background: '#F0EBDD', color: '#1F1D17', border: '1px solid #E0D8C5', borderRadius: 999, padding: '13px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              ← Prev
            </button>
          )}
          {current < round.holes - 1 ? (
            <button
              onClick={() => setPhase({ ...phase, current: current + 1 })}
              style={{ flex: 1, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '13px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#16271D' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => finishRound(round, holes)}
              disabled={saving}
              style={{ flex: 1, background: saving ? '#C9C0A8' : '#D9824D', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '13px', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
            >
              {saving ? 'Saving…' : 'Finish round ✓'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── ROUND SUMMARY ──────────────────────────────────────
  if (phase.type === 'summary') {
    const { round, holes } = phase
    const t = calcTotals(holes)
    const struggle = getStruggleHoles(round.courseId)
    const summaryPx = isMobile ? 16 : 40

    const scoreCounts = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0 }
    holes.forEach(h => {
      if (h.score === null) return
      const d = h.score - h.par
      if (d <= -2) scoreCounts.eagle++
      else if (d === -1) scoreCounts.birdie++
      else if (d === 0) scoreCounts.par++
      else if (d === 1) scoreCounts.bogey++
      else scoreCounts.double++
    })

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: `${isMobile ? 20 : 48}px ${summaryPx}px ${isMobile ? 96 : 48}px` }}>
        <button onClick={() => setPhase({ type: 'history' })} style={{ background: 'none', border: 'none', color: '#6B6857', fontSize: 13.5, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: 28, padding: 0 }}>
          ← All rounds
        </button>

        {/* Hero score */}
        <div style={{ background: '#1F3A2A', borderRadius: 24, padding: '36px 40px', marginBottom: 24, color: '#FAF6EA' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(250,246,234,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>
            {round.courseName} · {formatDate(round.playedAt)}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 12 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 72, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {t.totalScore}
            </div>
            <div style={{ paddingBottom: 10 }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: t.diff === 0 ? '#FAF6EA' : t.diff > 0 ? '#D9824D' : '#8BC47A', letterSpacing: '-0.02em' }}>
                {t.diff === 0 ? 'Even' : t.diff > 0 ? `+${t.diff}` : t.diff}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(250,246,234,0.55)', marginTop: 2 }}>vs par {t.totalPar}</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 3 : 3}, 1fr)`, gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 24 }}>
          {[
            { label: 'Putts', value: t.totalPutts || '—' },
            { label: 'Fairways', value: t.fairwaysPossible ? `${t.fairways}/${t.fairwaysPossible}` : '—' },
            { label: 'GIR', value: t.girPossible ? `${t.girHoles}/${t.girPossible}` : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6B6857', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Score breakdown */}
        <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 14 }}>Scoring</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Eagles', count: scoreCounts.eagle, color: '#C8A84B' },
              { label: 'Birdies', count: scoreCounts.birdie, color: '#5C7A4D' },
              { label: 'Pars', count: scoreCounts.par, color: '#1F3A2A' },
              { label: 'Bogeys', count: scoreCounts.bogey, color: '#D9824D' },
              { label: 'Double+', count: scoreCounts.double, color: '#C0392B' },
            ].filter(x => x.count > 0).map(x => (
              <div key={x.label} style={{ background: x.color + '18', border: `1px solid ${x.color}40`, borderRadius: 999, padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: x.color }}>{x.count}</span>
                <span style={{ fontSize: 12.5, color: '#6B6857' }}>{x.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hole by hole */}
        <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '20px 24px', marginBottom: 24, overflowX: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 14 }}>Hole by hole</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr style={{ fontSize: 11, color: '#B5AC95', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {['Hole', 'Par', 'Yds', 'Score', '+/−', 'Putts', 'FW', 'GIR'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holes.map(h => {
                const diff = (h.score ?? 0) - h.par
                const sn = h.score !== null ? scoreName(h.score, h.par) : null
                return (
                  <tr key={h.holeNumber} style={{ borderTop: '1px solid #F0EBDD' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#1F1D17' }}>{h.holeNumber}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: 13, color: '#6B6857' }}>{h.par}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: 13, color: '#6B6857' }}>{h.yardage ?? '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: sn?.color ?? '#1F1D17' }}>{h.score ?? '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: 13, color: sn?.color ?? '#1F1D17', fontWeight: 600 }}>{h.score !== null ? (diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff) : '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: 13, color: '#6B6857' }}>{h.putts ?? '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: 13 }}>{h.par < 4 ? <span style={{ color: '#B5AC95' }}>N/A</span> : h.fairwayHit === true ? '✓' : h.fairwayHit === false ? '✗' : '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: 13 }}>{h.gir === true ? '✓' : h.gir === false ? '✗' : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Struggle holes */}
        {struggle.length > 0 && (
          <div style={{ background: 'rgba(217,130,77,0.08)', border: '1px solid rgba(217,130,77,0.25)', borderRadius: 20, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 12 }}>Holes to work on</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {struggle.map(s => (
                <div key={s.hole} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D9824D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#FAF6EA', flexShrink: 0 }}>{s.hole}</div>
                  <div style={{ fontSize: 13.5, color: '#1F1D17' }}>
                    Averaging <strong>+{s.avg.toFixed(1)}</strong> over par across all rounds
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
