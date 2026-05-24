import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { saveCourse, deleteCourse } from '../lib/courses'
import { createRound, upsertRoundHoles, deleteRound } from '../lib/rounds'
import type { Course, Round, RoundHole } from '../types'
import { CloseIcon, PlusIcon } from './Icons'

// ── Pre-loaded course ──────────────────────────────────
const SANTA_MARIA_NAME = 'Santa Maria Golf & Country Club'
const SANTA_MARIA_HOLES: { par: 3 | 4 | 5 }[] = [
  { par: 5 }, { par: 4 }, { par: 4 }, { par: 4 }, { par: 3 },
  { par: 4 }, { par: 5 }, { par: 3 }, { par: 4 },
  { par: 4 }, { par: 5 }, { par: 3 }, { par: 4 }, { par: 3 },
  { par: 4 }, { par: 5 }, { par: 4 }, { par: 4 },
]

const TEE_COLORS = [
  { id: 'black', label: 'Black', color: '#1F1D17' },
  { id: 'blue',  label: 'Blue',  color: '#2563EB' },
  { id: 'white', label: 'White', color: '#FFFFFF'  },
  { id: 'red',   label: 'Red',   color: '#DC2626'  },
  { id: 'gold',  label: 'Gold',  color: '#C8A84B'  },
  { id: 'green', label: 'Green', color: '#5C7A4D'  },
]

type ScoringMode = 'score-only' | 'score-stats'

type Phase =
  | { type: 'history' }
  | { type: 'round_start' }
  | { type: 'course_setup' }
  | { type: 'hole_setup'; name: string; tee: string; holeCount: 9 | 18 }
  | { type: 'mode_select'; course: Course }
  | { type: 'scorecard'; round: Round; holes: RoundHole[]; mode: ScoringMode; activeHole: number | null }
  | { type: 'summary'; round: Round; holes: RoundHole[] }

// ── Helpers ────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function scoreStyle(score: number | null, par: number) {
  if (score === null) return { bg: 'transparent', border: '1.5px dashed #D1C9B8', text: '#C9C0A8' }
  const d = score - par
  if (d <= -2) return { bg: '#FFFBEB', border: '2px solid #C8A84B', text: '#92400E' }
  if (d === -1) return { bg: '#F0FDF4', border: '2px solid #5C7A4D', text: '#166534' }
  if (d === 0)  return { bg: '#F0EBDD', border: '1.5px solid #C9C0A8', text: '#1F1D17' }
  if (d === 1)  return { bg: '#FFF7ED', border: '1.5px solid #D9824D', text: '#9A3412' }
  return             { bg: '#FEF2F2', border: '1.5px solid #C0392B', text: '#7F1D1D' }
}

function scoreName(score: number, par: number) {
  const d = score - par
  if (d <= -2) return { label: 'Eagle',  color: '#C8A84B' }
  if (d === -1) return { label: 'Birdie', color: '#5C7A4D' }
  if (d === 0)  return { label: 'Par',    color: '#1F1D17' }
  if (d === 1)  return { label: 'Bogey',  color: '#D9824D' }
  if (d === 2)  return { label: 'Double', color: '#C0392B' }
  return             { label: `+${d}`,  color: '#C0392B' }
}

function calcTotals(holes: RoundHole[]) {
  const played = holes.filter(h => h.score !== null)
  const totalScore = played.reduce((s, h) => s + (h.score ?? 0), 0)
  const totalPar   = played.reduce((s, h) => s + h.par, 0)
  const totalPutts = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
  const par45      = holes.filter(h => h.par >= 4)
  const fairways   = par45.filter(h => h.fairwayHit === true).length
  const girHoles   = holes.filter(h => h.gir === true).length
  return {
    totalScore, totalPar, diff: totalScore - totalPar,
    totalPutts, fairways, fairwaysPossible: par45.length,
    girHoles, girPossible: holes.length, played: played.length,
  }
}

// ── Scorecard half-grid (front 9 or back 9) ───────────
function ScorecardHalf({
  holes, label, mode, activeHole, onTap,
}: {
  holes: RoundHole[]
  label: 'OUT' | 'IN'
  mode: ScoringMode
  activeHole: number | null
  onTap: (n: number) => void
}) {
  const parSum   = holes.reduce((s, h) => s + h.par, 0)
  const anyScore = holes.some(h => h.score !== null)
  const scoreSum = holes.filter(h => h.score !== null).reduce((s, h) => s + (h.score ?? 0), 0)
  const puttsSum = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
  const fwHoles  = holes.filter(h => h.par >= 4)
  const fwHit    = fwHoles.filter(h => h.fairwayHit === true).length
  const girHit   = holes.filter(h => h.gir === true).length

  const C = 33  // cell width
  const L = 52  // label col width
  const T = 44  // total col width

  const cellBase: React.CSSProperties = {
    width: C, minWidth: C, textAlign: 'center', padding: '0', border: 'none', verticalAlign: 'middle',
  }
  const labelCell: React.CSSProperties = {
    width: L, minWidth: L, textAlign: 'left', paddingLeft: 14, border: 'none', verticalAlign: 'middle',
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B5AC95',
  }
  const totalCell: React.CSSProperties = {
    width: T, minWidth: T, textAlign: 'center', border: 'none', verticalAlign: 'middle',
  }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: L + holes.length * C + T }}>
        <tbody>

          {/* HOLE row */}
          <tr style={{ background: '#1F3A2A' }}>
            <td style={{ ...labelCell, color: 'rgba(250,246,234,0.4)', padding: '8px 0 8px 14px' }}>HOLE</td>
            {holes.map(h => (
              <td key={h.holeNumber} style={{ ...cellBase, fontSize: 12, fontWeight: 700, color: '#FAF6EA', fontFamily: "'Bricolage Grotesque', sans-serif", padding: '8px 0' }}>
                {h.holeNumber}
              </td>
            ))}
            <td style={{ ...totalCell, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(250,246,234,0.4)', padding: '8px 0' }}>
              {label}
            </td>
          </tr>

          {/* PAR row */}
          <tr style={{ background: '#EEE9DA' }}>
            <td style={{ ...labelCell, padding: '7px 0 7px 14px' }}>PAR</td>
            {holes.map(h => (
              <td key={h.holeNumber} style={{ ...cellBase, fontSize: 13, fontWeight: 600, color: '#6B6857', padding: '7px 0' }}>
                {h.par}
              </td>
            ))}
            <td style={{ ...totalCell, fontSize: 14, fontWeight: 700, color: '#1F1D17', fontFamily: "'Bricolage Grotesque', sans-serif", padding: '7px 0' }}>
              {parSum}
            </td>
          </tr>

          {/* SCORE row */}
          <tr style={{ background: '#FAF6EA' }}>
            <td style={{ ...labelCell, padding: '6px 0 6px 14px' }}>SCORE</td>
            {holes.map(h => {
              const sc = scoreStyle(h.score, h.par)
              const isActive = activeHole === h.holeNumber
              return (
                <td key={h.holeNumber} style={{ ...cellBase, padding: '5px 2px' }}>
                  <div
                    onClick={() => onTap(h.holeNumber)}
                    style={{
                      width: 29, height: 29, borderRadius: 7,
                      background: sc.bg,
                      border: isActive ? '2px solid #1F3A2A' : sc.border,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', margin: '0 auto',
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: 14, fontWeight: 700, color: sc.text,
                      transition: 'all 0.12s',
                      boxShadow: isActive ? '0 0 0 3px rgba(31,58,42,0.12)' : 'none',
                    }}
                  >
                    {h.score ?? '·'}
                  </div>
                </td>
              )
            })}
            <td style={{ ...totalCell, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17', padding: '5px 0' }}>
              {anyScore ? scoreSum : '—'}
            </td>
          </tr>

          {/* Stats rows */}
          {mode === 'score-stats' && (
            <>
              <tr style={{ background: '#EEE9DA' }}>
                <td style={{ ...labelCell, padding: '6px 0 6px 14px' }}>PUTTS</td>
                {holes.map(h => (
                  <td key={h.holeNumber} style={{ ...cellBase, fontSize: 12, fontWeight: 600, color: '#6B6857', padding: '6px 0' }}>
                    {h.putts ?? '·'}
                  </td>
                ))}
                <td style={{ ...totalCell, fontSize: 13, fontWeight: 700, color: '#6B6857', padding: '6px 0' }}>
                  {holes.some(h => h.putts !== null) ? puttsSum : '—'}
                </td>
              </tr>

              <tr style={{ background: '#FAF6EA' }}>
                <td style={{ ...labelCell, padding: '6px 0 6px 14px' }}>F/W</td>
                {holes.map(h => (
                  <td key={h.holeNumber} style={{ ...cellBase, fontSize: 11, padding: '6px 0' }}>
                    {h.par < 4
                      ? <span style={{ color: '#D1C9B8', fontSize: 8 }}>N/A</span>
                      : h.fairwayHit === true  ? <span style={{ color: '#5C7A4D', fontWeight: 700 }}>✓</span>
                      : h.fairwayHit === false ? <span style={{ color: '#D9824D' }}>✗</span>
                      : <span style={{ color: '#D1C9B8' }}>·</span>
                    }
                  </td>
                ))}
                <td style={{ ...totalCell, fontSize: 11, fontWeight: 600, color: '#6B6857', padding: '6px 0' }}>
                  {fwHoles.length > 0 ? `${fwHit}/${fwHoles.length}` : '—'}
                </td>
              </tr>

              <tr style={{ background: '#EEE9DA' }}>
                <td style={{ ...labelCell, padding: '6px 0 6px 14px' }}>GIR</td>
                {holes.map(h => (
                  <td key={h.holeNumber} style={{ ...cellBase, fontSize: 11, padding: '6px 0' }}>
                    {h.gir === true  ? <span style={{ color: '#5C7A4D', fontWeight: 700 }}>✓</span>
                     : h.gir === false ? <span style={{ color: '#D9824D' }}>✗</span>
                     : <span style={{ color: '#D1C9B8' }}>·</span>
                    }
                  </td>
                ))}
                <td style={{ ...totalCell, fontSize: 11, fontWeight: 600, color: '#6B6857', padding: '6px 0' }}>
                  {holes.some(h => h.gir !== null) ? `${girHit}/${holes.length}` : '—'}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Hole editor bottom panel ───────────────────────────
function HoleEditor({
  hole, mode, holes, onUpdate, onNavigate, onClose,
}: {
  hole: RoundHole
  mode: ScoringMode
  holes: RoundHole[]
  onUpdate: (patch: Partial<RoundHole>) => void
  onNavigate: (dir: -1 | 1) => void
  onClose: () => void
}) {
  const score = hole.score ?? hole.par
  const putts = hole.putts ?? 2
  const idx   = holes.findIndex(h => h.holeNumber === hole.holeNumber)
  const sn    = hole.score !== null ? scoreName(hole.score, hole.par) : null

  const btnBase: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 22,
    background: '#F0EBDD', border: '1px solid #E0D8C5',
    fontSize: 22, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#1F1D17',
  }

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '11px', borderRadius: 14, fontSize: 13.5,
    fontWeight: 500, border: '1px solid', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
    background: active ? '#1F3A2A' : 'transparent',
    color: active ? '#FAF6EA' : '#1F1D17',
    borderColor: active ? '#1F3A2A' : '#E0D8C5',
  })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(31,29,23,0.28)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: '#FAF6EA',
        borderTop: '1px solid #E0D8C5',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        boxShadow: '0 -8px 40px rgba(31,29,23,0.18)',
        padding: '14px 24px 40px',
        maxHeight: '78vh', overflowY: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0D8C5', margin: '0 auto 18px' }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 800, color: '#1F1D17', letterSpacing: '-0.04em', lineHeight: 1 }}>
              Hole {hole.holeNumber}
            </div>
            <div style={{ fontSize: 13, color: '#6B6857', marginTop: 5, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Par {hole.par}{hole.yardage ? ` · ${hole.yardage} yds` : ''}</span>
              {sn && <span style={{ fontWeight: 700, color: sn.color }}>{sn.label}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onNavigate(-1)}
              disabled={idx === 0}
              style={{ ...btnBase, width: 34, height: 34, borderRadius: 17, fontSize: 16, opacity: idx === 0 ? 0.35 : 1, cursor: idx === 0 ? 'default' : 'pointer' }}
            >‹</button>
            <button
              onClick={() => onNavigate(1)}
              disabled={idx === holes.length - 1}
              style={{ ...btnBase, width: 34, height: 34, borderRadius: 17, fontSize: 16, opacity: idx === holes.length - 1 ? 0.35 : 1, cursor: idx === holes.length - 1 ? 'default' : 'pointer' }}
            >›</button>
            <button onClick={onClose} style={{ ...btnBase, width: 34, height: 34, borderRadius: 17, fontSize: 16 }}>
              <CloseIcon size={13} color="#1F1D17" />
            </button>
          </div>
        </div>

        {/* Score */}
        <div style={{ marginBottom: mode === 'score-stats' ? 22 : 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6857', marginBottom: 12 }}>Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <button style={btnBase} onClick={() => onUpdate({ score: Math.max(1, score - 1) })}>−</button>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 44, fontWeight: 800, color: '#1F1D17', minWidth: 56, textAlign: 'center', letterSpacing: '-0.04em' }}>
              {score}
            </span>
            <button style={btnBase} onClick={() => onUpdate({ score: Math.min(15, score + 1) })}>+</button>
          </div>
        </div>

        {/* Stats */}
        {mode === 'score-stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Putts */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6857', marginBottom: 12 }}>Putts</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <button style={btnBase} onClick={() => onUpdate({ putts: Math.max(0, putts - 1) })}>−</button>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 44, fontWeight: 800, color: '#1F1D17', minWidth: 56, textAlign: 'center', letterSpacing: '-0.04em' }}>
                  {putts}
                </span>
                <button style={btnBase} onClick={() => onUpdate({ putts: Math.min(10, putts + 1) })}>+</button>
              </div>
            </div>

            {/* Fairway */}
            {hole.par >= 4 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6857', marginBottom: 12 }}>Fairway hit</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => onUpdate({ fairwayHit: hole.fairwayHit === true ? null : true })} style={toggleBtn(hole.fairwayHit === true)}>Hit ✓</button>
                  <button onClick={() => onUpdate({ fairwayHit: hole.fairwayHit === false ? null : false })} style={toggleBtn(hole.fairwayHit === false)}>Missed ✗</button>
                </div>
              </div>
            )}

            {/* GIR */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6857', marginBottom: 12 }}>Green in regulation</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => onUpdate({ gir: hole.gir === true ? null : true })} style={toggleBtn(hole.gir === true)}>Yes ✓</button>
                <button onClick={() => onUpdate({ gir: hole.gir === false ? null : false })} style={toggleBtn(hole.gir === false)}>No ✗</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────
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

export default function ScorecardView({
  courses, rounds,
  onCourseAdded, onCourseDeleted,
  onRoundAdded, onRoundDeleted,
  isMobile = false, homeCourse = null,
}: Props) {
  const { user } = useAuth()
  const [phase, setPhase]       = useState<Phase>({ type: 'history' })
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // New course form state
  const [courseName, setCourseName] = useState('')
  const [tee, setTee]               = useState('white')
  const [holeCount, setHoleCount]   = useState<9 | 18>(18)
  const [holeSetup, setHoleSetup]   = useState<{ par: 3 | 4 | 5; yardage: string }[]>([])

  const px = isMobile ? 16 : 40

  const initHoleSetup = (count: number) =>
    Array.from({ length: count }, () => ({ par: 4 as 3 | 4 | 5, yardage: '' }))

  // ── Phase transitions ─────────────────────────────────

  const handleSelectSantaMaria = async () => {
    const existing = courses.find(c => c.name === SANTA_MARIA_NAME && c.tee === 'blue')
    if (existing) { setPhase({ type: 'mode_select', course: existing }); return }
    setSaving(true); setSaveError(null)
    try {
      const course = await saveCourse(
        user!.id, SANTA_MARIA_NAME, 'blue', 18,
        SANTA_MARIA_HOLES.map(h => ({ par: h.par, yardage: null }))
      )
      onCourseAdded(course)
      setPhase({ type: 'mode_select', course })
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to load course.')
    } finally { setSaving(false) }
  }

  const handleSaveNewCourse = async () => {
    if (phase.type !== 'hole_setup') return
    setSaving(true); setSaveError(null)
    try {
      const hs = holeSetup.map(h => ({ par: h.par, yardage: h.yardage ? parseInt(h.yardage) : null }))
      const course = await saveCourse(user!.id, phase.name, phase.tee, phase.holeCount, hs)
      onCourseAdded(course)
      setPhase({ type: 'mode_select', course })
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save course.')
    } finally { setSaving(false) }
  }

  const handleStartRound = async (course: Course, mode: ScoringMode) => {
    setSaving(true); setSaveError(null)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const round = await createRound(user!.id, course.id, course.name, course.tee, course.holes, todayStr)
      onRoundAdded(round)
      const initHoles: RoundHole[] = course.courseHoles.map(ch => ({
        id: '', roundId: round.id, holeNumber: ch.holeNumber, par: ch.par,
        yardage: ch.yardage, score: null, putts: null, fairwayHit: null, gir: null,
      }))
      setPhase({ type: 'scorecard', round, holes: initHoles, mode, activeHole: null })
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to start round.')
    } finally { setSaving(false) }
  }

  const handleFinishRound = async (round: Round, holes: RoundHole[]) => {
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
      setSaveError(err instanceof Error ? err.message : 'Failed to save round.')
    } finally { setSaving(false) }
  }

  // ── Struggle analysis ─────────────────────────────────
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

  // ── Shared styles ─────────────────────────────────────
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
  const backBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: '#6B6857', fontSize: 13.5,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: 28, padding: 0,
  }
  const primaryBtn = (disabled = false): React.CSSProperties => ({
    width: '100%', background: disabled ? '#C9C0A8' : '#1F3A2A', color: '#FAF6EA',
    border: 'none', borderRadius: 999, padding: '14px', fontSize: 14, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
    transition: 'background 0.15s',
  })
  const errorBox: React.CSSProperties = {
    background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)',
    borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#C0392B', marginTop: 16,
  }

  // ══════════════════════════════════════════════════════
  // HISTORY
  // ══════════════════════════════════════════════════════
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
            onClick={() => { setSaveError(null); setPhase({ type: 'round_start' }) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '10px 18px 10px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
          >
            Start round
            <span style={{ width: 22, height: 22, borderRadius: 11, background: '#D9824D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusIcon size={14} color="#FAF6EA" />
            </span>
          </button>
        </div>

        {rounds.length === 0 ? (
          <div style={{ ...card, padding: '56px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⛳</div>
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
                        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em' }}>{t.totalScore}</div>
                        <div style={{ fontSize: 12, color: t.diff === 0 ? '#5C7A4D' : t.diff > 0 ? '#D9824D' : '#5C7A4D' }}>
                          {t.diff === 0 ? 'E' : t.diff > 0 ? `+${t.diff}` : t.diff}
                        </div>
                      </div>
                    )}
                    <button onClick={() => setPhase({ type: 'summary', round: r, holes: r.roundHoles })} style={{ background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#1F1D17' }}>
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

  // ══════════════════════════════════════════════════════
  // ROUND START — pick a course
  // ══════════════════════════════════════════════════════
  if (phase.type === 'round_start') {
    const smSaved = courses.some(c => c.name === SANTA_MARIA_NAME)
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'history' })}>← Back</button>
        <span style={sectionLabel}>New round</span>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Choose a course.
        </h1>
        <p style={{ fontSize: 14, color: '#6B6857', marginBottom: 32 }}>Select from your saved courses or add a new one.</p>

        {/* Santa Maria featured card */}
        {!smSaved && (
          <div style={{ marginBottom: 24 }}>
            <span style={{ ...sectionLabel, color: '#D9824D' }}>Featured</span>
            <button
              onClick={handleSelectSantaMaria}
              disabled={saving}
              style={{
                width: '100%', background: '#1F3A2A', border: 'none', borderRadius: 20,
                padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer',
                textAlign: 'left', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,246,234,0.45)' }}>
                  Blue Tees · 18 Holes · Par 72
                </span>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.025em' }}>
                {saving ? 'Loading…' : 'Santa Maria Golf & Country Club'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(250,246,234,0.4)', marginTop: 5 }}>Panama · Pre-loaded</div>
            </button>
          </div>
        )}

        {/* Saved courses */}
        {courses.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <span style={sectionLabel}>Your courses</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {courses.map(c => {
                const teeInfo = TEE_COLORS.find(t => t.id === c.tee) ?? TEE_COLORS[2]
                return (
                  <button
                    key={c.id}
                    onClick={() => setPhase({ type: 'mode_select', course: c })}
                    style={{
                      width: '100%', ...card, padding: '16px 20px',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 14,
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#1F3A2A'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(31,58,42,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0D8C5'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid #E0D8C5' : 'none', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#6B6857', marginTop: 2 }}>{c.holes} holes · {teeInfo.label} tees</div>
                    </div>
                    <span style={{ color: '#B5AC95', fontSize: 20 }}>›</span>
                    <button
                      onClick={async e => { e.stopPropagation(); try { await deleteCourse(c.id); onCourseDeleted(c.id) } catch {/* */} }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.25, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.25' }}
                    >
                      <CloseIcon size={11} color="#1F1D17" />
                    </button>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Add new course */}
        <button
          onClick={() => { setCourseName(homeCourse ?? ''); setTee('white'); setHoleCount(18); setSaveError(null); setPhase({ type: 'course_setup' }) }}
          style={{ width: '100%', background: 'transparent', border: '1.5px dashed #C9C0A8', borderRadius: 20, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#C9C0A8' }}
        >
          <span style={{ width: 28, height: 28, borderRadius: 14, background: '#F0EBDD', border: '1px solid #E0D8C5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusIcon size={13} color="#6B6857" />
          </span>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#1F1D17' }}>Add a new course</div>
            <div style={{ fontSize: 12, color: '#B5AC95', marginTop: 2 }}>Enter course name, tee, and hole info</div>
          </div>
        </button>

        {saveError && <div style={errorBox}>{saveError}</div>}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // COURSE SETUP (for new courses)
  // ══════════════════════════════════════════════════════
  if (phase.type === 'course_setup') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'round_start' })}>← Back</button>
        <span style={sectionLabel}>New course</span>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: '0 0 32px' }}>
          Course details
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 8 }}>Course name</label>
            <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
            />
          </div>

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
            onClick={() => { setHoleSetup(initHoleSetup(holeCount)); setSaveError(null); setPhase({ type: 'hole_setup', name: courseName.trim(), tee, holeCount }) }}
            disabled={!courseName.trim()}
            style={{ ...primaryBtn(!courseName.trim()), marginTop: 8 }}
            onMouseEnter={e => { if (courseName.trim()) e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { if (courseName.trim()) e.currentTarget.style.background = '#1F3A2A' }}
          >
            Set up holes →
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // HOLE SETUP
  // ══════════════════════════════════════════════════════
  if (phase.type === 'hole_setup') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'course_setup' })}>← Back</button>
        <span style={sectionLabel}>{phase.name}</span>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Hole setup
        </h1>
        <p style={{ fontSize: 14, color: '#6B6857', marginBottom: 28 }}>Enter the par and yardage for each hole. Yardage is optional.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          {holeSetup.map((h, i) => (
            <div key={i} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#B5AC95', textTransform: 'uppercase', marginBottom: 10 }}>Hole {i + 1}</div>
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
              <input
                type="number" inputMode="numeric" placeholder="Yds" value={h.yardage}
                onChange={e => setHoleSetup(hs => hs.map((x, j) => j === i ? { ...x, yardage: e.target.value } : x))}
                style={{ width: '100%', background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#1F1D17', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
              />
            </div>
          ))}
        </div>

        {saveError && <div style={errorBox}>{saveError}</div>}
        <button
          onClick={handleSaveNewCourse}
          disabled={saving}
          style={{ ...primaryBtn(saving), marginTop: saveError ? 8 : 0 }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#1F3A2A' }}
        >
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // MODE SELECT
  // ══════════════════════════════════════════════════════
  if (phase.type === 'mode_select') {
    const { course } = phase
    const teeInfo = TEE_COLORS.find(t => t.id === course.tee) ?? TEE_COLORS[2]
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'round_start' })}>← Back</button>

        {/* Course chip */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 999, padding: '6px 14px', marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid #ccc' : 'none' }} />
          <span style={{ fontSize: 12.5, color: '#6B6857', fontFamily: "'DM Sans', sans-serif" }}>
            {course.name} · {teeInfo.label} tees
          </span>
        </div>

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          How are you scoring?
        </h1>
        <p style={{ fontSize: 14, color: '#6B6857', marginBottom: 32 }}>Choose how detailed you'd like to track this round.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Score only */}
          <button
            onClick={() => handleStartRound(course, 'score-only')}
            disabled={saving}
            style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.borderColor = '#1F3A2A'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(31,58,42,0.08)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0D8C5'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em', marginBottom: 5 }}>
              Score only
            </div>
            <div style={{ fontSize: 13.5, color: '#6B6857', lineHeight: 1.5 }}>
              Just enter your score per hole. Fast and simple.
            </div>
          </button>

          {/* Score + Stats */}
          <button
            onClick={() => handleStartRound(course, 'score-stats')}
            disabled={saving}
            style={{ background: '#1F3A2A', border: '1px solid #1F3A2A', borderRadius: 20, padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'background 0.15s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
          >
            <div style={{ position: 'absolute', top: 16, right: 16, background: '#D9824D', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#FAF6EA', textTransform: 'uppercase' }}>
              Recommended
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em', marginBottom: 5 }}>
              Score + Stats
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(250,246,234,0.6)', lineHeight: 1.5 }}>
              Track putts, fairways hit, and greens in regulation alongside your score.
            </div>
          </button>
        </div>

        {saving && <p style={{ textAlign: 'center', color: '#6B6857', fontSize: 13, marginTop: 20, fontFamily: "'DM Sans', sans-serif" }}>Setting up your round…</p>}
        {saveError && <div style={errorBox}>{saveError}</div>}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // SCORECARD
  // ══════════════════════════════════════════════════════
  if (phase.type === 'scorecard') {
    const { round, holes, mode, activeHole } = phase

    const updateHole = (holeNumber: number, patch: Partial<RoundHole>) =>
      setPhase(p => p.type === 'scorecard' ? {
        ...p, holes: p.holes.map(h => h.holeNumber === holeNumber ? { ...h, ...patch } : h),
      } : p)

    const setActiveHole = (hn: number | null) =>
      setPhase(p => p.type === 'scorecard' ? { ...p, activeHole: hn } : p)

    const activeHoleData = activeHole !== null ? holes.find(h => h.holeNumber === activeHole) ?? null : null
    const front9 = holes.slice(0, Math.min(9, holes.length))
    const back9  = round.holes === 18 ? holes.slice(9) : []
    const totalPar = holes.reduce((s, h) => s + h.par, 0)
    const playedHoles = holes.filter(h => h.score !== null)
    const totalScore = playedHoles.reduce((s, h) => s + (h.score ?? 0), 0)
    const playedPar  = playedHoles.reduce((s, h) => s + h.par, 0)
    const diff = playedHoles.length > 0 ? totalScore - playedPar : null
    const teeInfo = TEE_COLORS.find(t => t.id === round.tee) ?? TEE_COLORS[2]

    return (
      <>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: `${isMobile ? 16 : 48}px ${isMobile ? 10 : 40}px ${isMobile ? 120 : 80}px` }}>
          <button style={{ ...backBtn, marginBottom: 20 }} onClick={() => setPhase({ type: 'history' })}>
            ← All rounds
          </button>

          {/* Scorecard card */}
          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 24, overflow: 'hidden', marginBottom: 16 }}>

            {/* Header */}
            <div style={{ background: '#1F3A2A', padding: '22px 22px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid rgba(255,255,255,0.4)' : 'none', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,246,234,0.45)' }}>
                  {teeInfo.label} Tees · {formatDate(round.playedAt)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 16 : 20, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.025em', marginBottom: 4 }}>
                    {round.courseName}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(250,246,234,0.45)' }}>Par {totalPar} · {round.holes} holes</div>
                </div>
                {diff !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, color: '#FAF6EA', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {totalScore}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: diff === 0 ? 'rgba(250,246,234,0.7)' : diff > 0 ? '#D9824D' : '#8BC47A', marginTop: 2 }}>
                      {diff === 0 ? 'Even' : diff > 0 ? `+${diff}` : diff}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#E0D8C5' }} />

            {/* Grids */}
            <div style={{ padding: '14px 0 10px' }}>
              <div style={{ paddingLeft: 10, paddingRight: 10, marginBottom: 4 }}>
                <ScorecardHalf
                  holes={front9} label="OUT" mode={mode}
                  activeHole={activeHole}
                  onTap={hn => setActiveHole(activeHole === hn ? null : hn)}
                />
              </div>
              {round.holes === 18 && (
                <>
                  <div style={{ height: 1, background: '#E0D8C5', margin: '8px 0' }} />
                  <div style={{ paddingLeft: 10, paddingRight: 10 }}>
                    <ScorecardHalf
                      holes={back9} label="IN" mode={mode}
                      activeHole={activeHole}
                      onTap={hn => setActiveHole(activeHole === hn ? null : hn)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hint */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#B5AC95', marginBottom: 20, fontFamily: "'DM Sans', sans-serif" }}>
            Tap any score cell to enter your result
          </p>

          {saveError && <div style={errorBox}>{saveError}</div>}

          <button
            onClick={() => handleFinishRound(round, holes)}
            disabled={saving}
            style={{ ...primaryBtn(saving), marginTop: saveError ? 8 : 0 }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#1F3A2A' }}
          >
            {saving ? 'Saving…' : 'Submit scorecard →'}
          </button>
        </div>

        {/* Hole editor */}
        {activeHoleData && (
          <HoleEditor
            hole={activeHoleData}
            mode={mode}
            holes={holes}
            onUpdate={patch => updateHole(activeHole!, patch)}
            onNavigate={dir => {
              const idx = holes.findIndex(h => h.holeNumber === activeHole)
              const next = holes[idx + dir]
              if (next) setActiveHole(next.holeNumber)
            }}
            onClose={() => setActiveHole(null)}
          />
        )}
      </>
    )
  }

  // ══════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════
  if (phase.type === 'summary') {
    const { round, holes } = phase
    const t = calcTotals(holes)
    const struggle = getStruggleHoles(round.courseId)
    const teeInfo = TEE_COLORS.find(x => x.id === round.tee) ?? TEE_COLORS[2]
    const totalPar = holes.reduce((s, h) => s + h.par, 0)

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

    const front9 = holes.slice(0, Math.min(9, holes.length))
    const back9  = round.holes === 18 ? holes.slice(9) : []

    const statsMode = holes.some(h => h.putts !== null || h.fairwayHit !== null || h.gir !== null)
      ? 'score-stats' : 'score-only'

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: `${isMobile ? 20 : 48}px ${isMobile ? 12 : 40}px ${isMobile ? 96 : 48}px` }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'history' })}>← All rounds</button>

        {/* Hero */}
        <div style={{ background: '#1F3A2A', borderRadius: 24, padding: '36px 32px', marginBottom: 20, color: '#FAF6EA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid rgba(255,255,255,0.4)' : 'none' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,246,234,0.45)' }}>
              {round.courseName} · {formatDate(round.playedAt)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 12 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 72, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {t.totalScore}
            </div>
            <div style={{ paddingBottom: 10 }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: t.diff === 0 ? '#FAF6EA' : t.diff > 0 ? '#D9824D' : '#8BC47A', letterSpacing: '-0.02em' }}>
                {t.diff === 0 ? 'Even' : t.diff > 0 ? `+${t.diff}` : t.diff}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(250,246,234,0.45)', marginTop: 2 }}>vs par {totalPar}</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        {statsMode === 'score-stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
            {[
              { label: 'Putts', value: t.totalPutts || '—' },
              { label: 'Fairways', value: t.fairwaysPossible ? `${t.fairways}/${t.fairwaysPossible}` : '—' },
              { label: 'GIR', value: t.girPossible ? `${t.girHoles}/${t.girPossible}` : '—' },
            ].map(s => (
              <div key={s.label} style={{ ...card, padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6B6857', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Score breakdown */}
        <div style={{ ...card, padding: '20px 22px', marginBottom: 20 }}>
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

        {/* Scorecard grid in summary */}
        <div style={{ ...card, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ borderBottom: '1px solid #E0D8C5', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase' }}>Scorecard</div>
          </div>
          <div style={{ padding: '12px 8px 12px' }}>
            <ScorecardHalf holes={front9} label="OUT" mode={statsMode as ScoringMode} activeHole={null} onTap={() => {}} />
            {round.holes === 18 && (
              <>
                <div style={{ height: 1, background: '#E0D8C5', margin: '8px 0' }} />
                <ScorecardHalf holes={back9} label="IN" mode={statsMode as ScoringMode} activeHole={null} onTap={() => {}} />
              </>
            )}
          </div>
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
