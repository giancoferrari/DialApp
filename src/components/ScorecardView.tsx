import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { saveCourse, deleteCourse } from '../lib/courses'
import { createRound, upsertRoundHoles, deleteRound } from '../lib/rounds'
import type { Course, Round, RoundHole } from '../types'
import { CloseIcon, PlusIcon } from './Icons'
import CourseSearch from './CourseSearch'
import type { GolfCourse, GolfTee } from '../lib/golfCourseApi'
import { fetchCorrection, saveCorrection } from '../lib/courseCorrections'

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
  | { type: 'scorecard'; round: Round; holes: RoundHole[]; mode: ScoringMode; editingHole: number | null; activeHole: number | null }
  | { type: 'summary'; round: Round; holes: RoundHole[] }

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function scoreName(score: number, par: number) {
  const d = score - par
  if (d <= -2) return { label: 'Eagle',  color: '#C8A84B' }
  if (d === -1) return { label: 'Birdie', color: '#5C7A4D' }
  if (d === 0)  return { label: 'Par',    color: '#6B6857' }
  if (d === 1)  return { label: 'Bogey',  color: '#D9824D' }
  if (d === 2)  return { label: 'Double', color: '#C0392B' }
  if (d === 3)  return { label: 'Triple', color: '#991B1B' }
  return             { label: `+${d}`,  color: '#7F1D1D' }
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

// ── Golf score notation ────────────────────────────────────
function ScoreDecoration({ score, par, onClick, isSelected, interactive }: {
  score: number | null
  par: number
  onClick: () => void
  isSelected: boolean
  interactive: boolean
}) {
  const base: React.CSSProperties = {
    width: 28, height: 28,
    cursor: interactive ? 'pointer' : 'default',
    margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: isSelected ? '0 0 0 3px rgba(31,58,42,0.18)' : 'none',
    transition: 'box-shadow 0.12s',
  }
  const num = (sz: number, col: string): React.CSSProperties => ({
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: sz, fontWeight: 700, color: col, lineHeight: 1,
  })

  if (score === null) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, borderRadius: 6, border: '1.5px dashed #D1C9B8' }}>
        <span style={{ color: '#C9C0A8', fontSize: 14 }}>·</span>
      </div>
    )
  }

  const d = score - par

  if (d <= -2) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, borderRadius: '50%', border: '1.5px solid #C8A84B' }}>
        <div style={{ width: 19, height: 19, borderRadius: '50%', border: '1.5px solid #C8A84B', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={num(9, '#92400E')}>{score}</span>
        </div>
      </div>
    )
  }

  if (d === -1) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, borderRadius: '50%', border: '2px solid #5C7A4D', background: '#F0FDF4' }}>
        <span style={num(12, '#166534')}>{score}</span>
      </div>
    )
  }

  if (d === 0) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, borderRadius: 5, background: '#F0EBDD' }}>
        <span style={num(12, '#1F1D17')}>{score}</span>
      </div>
    )
  }

  if (d === 1) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, border: '2px solid #D9824D', background: '#FFF7ED' }}>
        <span style={num(12, '#9A3412')}>{score}</span>
      </div>
    )
  }

  const c = d >= 3 ? '#991B1B' : '#C0392B'
  return (
    <div onClick={interactive ? onClick : undefined}
      style={{ ...base, border: `1.5px solid ${c}` }}>
      <div style={{ width: 18, height: 18, border: `1.5px solid ${c}`, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={num(9, c)}>{score}</span>
      </div>
    </div>
  )
}

// ── Scorecard half-grid ────────────────────────────────────
function ScorecardHalf({ holes, label, mode, editingHole, activeHole, onCellClick, onScoreCommit, interactive = true }: {
  holes: RoundHole[]
  label: 'OUT' | 'IN'
  mode: ScoringMode
  editingHole: number | null
  activeHole: number | null
  onCellClick: (n: number) => void
  onScoreCommit: (holeNumber: number, score: number | null) => void
  interactive?: boolean
}) {
  const parSum   = holes.reduce((s, h) => s + h.par, 0)
  const anyScore = holes.some(h => h.score !== null)
  const scoreSum = holes.filter(h => h.score !== null).reduce((s, h) => s + (h.score ?? 0), 0)
  const puttsSum = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
  const fwHoles  = holes.filter(h => h.par >= 4)
  const fwHit    = fwHoles.filter(h => h.fairwayHit === true).length
  const girHit   = holes.filter(h => h.gir === true).length

  const C = 33
  const L = 52
  const T = 44

  const cellBase: React.CSSProperties = { width: C, minWidth: C, textAlign: 'center', padding: 0, border: 'none', verticalAlign: 'middle' }
  const labelCell: React.CSSProperties = { width: L, minWidth: L, textAlign: 'left', paddingLeft: 14, border: 'none', verticalAlign: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B5AC95' }
  const totalCell: React.CSSProperties = { width: T, minWidth: T, textAlign: 'center', border: 'none', verticalAlign: 'middle' }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: L + holes.length * C + T }}>
        <tbody>
          <tr style={{ background: '#1F3A2A' }}>
            <td style={{ ...labelCell, color: 'rgba(250,246,234,0.4)', padding: '8px 0 8px 14px' }}>HOLE</td>
            {holes.map(h => (
              <td key={h.holeNumber} style={{ ...cellBase, fontSize: 12, fontWeight: 700, color: '#FAF6EA', fontFamily: "'Bricolage Grotesque', sans-serif", padding: '8px 0' }}>{h.holeNumber}</td>
            ))}
            <td style={{ ...totalCell, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(250,246,234,0.4)', padding: '8px 0' }}>{label}</td>
          </tr>

          <tr style={{ background: '#EEE9DA' }}>
            <td style={{ ...labelCell, padding: '7px 0 7px 14px' }}>PAR</td>
            {holes.map(h => (
              <td key={h.holeNumber} style={{ ...cellBase, fontSize: 13, fontWeight: 600, color: '#6B6857', padding: '7px 0' }}>{h.par}</td>
            ))}
            <td style={{ ...totalCell, fontSize: 14, fontWeight: 700, color: '#1F1D17', fontFamily: "'Bricolage Grotesque', sans-serif", padding: '7px 0' }}>{parSum}</td>
          </tr>

          <tr style={{ background: '#FAF6EA' }}>
            <td style={{ ...labelCell, padding: '5px 0 5px 14px' }}>SCORE</td>
            {holes.map(h => {
              const isEditing = interactive && editingHole === h.holeNumber
              const isSelected = activeHole === h.holeNumber && !isEditing
              return (
                <td key={h.holeNumber} style={{ ...cellBase, padding: '4px 2px' }}>
                  {isEditing ? (
                    <div style={{ width: 28, height: 28, border: '2px solid #1F3A2A', borderRadius: 5, background: '#FAF6EA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        defaultValue={h.score !== null ? String(h.score) : ''}
                        style={{ width: 22, height: 22, textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 12, fontWeight: 700, color: '#1F1D17', padding: 0 }}
                        onBlur={e => {
                          const v = parseInt(e.target.value.trim())
                          onScoreCommit(h.holeNumber, !isNaN(v) && v >= 1 ? Math.min(20, v) : null)
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      />
                    </div>
                  ) : (
                    <ScoreDecoration
                      score={h.score} par={h.par}
                      isSelected={isSelected} interactive={interactive}
                      onClick={() => onCellClick(h.holeNumber)}
                    />
                  )}
                </td>
              )
            })}
            <td style={{ ...totalCell, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17', padding: '4px 0' }}>
              {anyScore ? scoreSum : '—'}
            </td>
          </tr>

          {mode === 'score-stats' && (
            <>
              <tr style={{ background: '#EEE9DA' }}>
                <td style={{ ...labelCell, padding: '6px 0 6px 14px' }}>PUTTS</td>
                {holes.map(h => (
                  <td key={h.holeNumber} style={{ ...cellBase, fontSize: 12, fontWeight: 600, color: '#6B6857', padding: '6px 0' }}>{h.putts ?? '·'}</td>
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

// ── Stats panel (score-stats mode) ────────────────────────
function StatsPanel({ hole, holes, onUpdate, onSelectHole, onClose }: {
  hole: RoundHole
  holes: RoundHole[]
  onUpdate: (holeNumber: number, patch: Partial<RoundHole>) => void
  onSelectHole: (holeNumber: number) => void
  onClose: () => void
}) {
  const idx      = holes.findIndex(h => h.holeNumber === hole.holeNumber)
  const prevHole = holes[idx - 1]
  const nextHole = holes[idx + 1]

  const toggleBtn = (active: boolean | null, val: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px', borderRadius: 12, fontSize: 13,
    fontWeight: 500, border: '1px solid', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
    background: active === val ? '#1F3A2A' : 'transparent',
    color: active === val ? '#FAF6EA' : '#1F1D17',
    borderColor: active === val ? '#1F3A2A' : '#E0D8C5',
  })
  const navBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 16, background: '#F0EBDD',
    border: '1px solid #E0D8C5', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1F1D17',
  }

  const sn = hole.score !== null ? scoreName(hole.score, hole.par) : null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
      background: '#FAF6EA', borderTop: '1px solid #E0D8C5',
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      padding: '12px 20px 36px',
      boxShadow: '0 -8px 32px rgba(31,29,23,0.18)',
    }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0D8C5', margin: '0 auto 14px' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17' }}>
            Hole {hole.holeNumber}
          </span>
          {sn && <span style={{ fontSize: 13, color: sn.color, fontWeight: 600 }}>{sn.label}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => prevHole && onSelectHole(prevHole.holeNumber)} disabled={!prevHole}
            style={{ ...navBtn, opacity: prevHole ? 1 : 0.3, cursor: prevHole ? 'pointer' : 'default' }}>‹</button>
          <button onClick={() => nextHole && onSelectHole(nextHole.holeNumber)} disabled={!nextHole}
            style={{ ...navBtn, opacity: nextHole ? 1 : 0.3, cursor: nextHole ? 'pointer' : 'default' }}>›</button>
          <button onClick={onClose} style={{ ...navBtn }}>
            <CloseIcon size={11} color="#1F1D17" />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6857', marginBottom: 8 }}>Putts</div>
          <input
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={hole.putts !== null ? String(hole.putts) : ''}
            onChange={e => {
              const v = parseInt(e.target.value)
              onUpdate(hole.holeNumber, { putts: e.target.value === '' || isNaN(v) ? null : Math.min(10, Math.max(0, v)) })
            }}
            placeholder="—"
            style={{ width: '100%', background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 12, padding: '10px 14px', fontSize: 16, fontWeight: 700, color: '#1F1D17', outline: 'none', boxSizing: 'border-box', fontFamily: "'Bricolage Grotesque', sans-serif" }}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
          />
        </div>

        {hole.par >= 4 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6857', marginBottom: 8 }}>Fairway hit</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onUpdate(hole.holeNumber, { fairwayHit: hole.fairwayHit === true ? null : true })} style={toggleBtn(hole.fairwayHit, true)}>✓ Hit</button>
              <button onClick={() => onUpdate(hole.holeNumber, { fairwayHit: hole.fairwayHit === false ? null : false })} style={toggleBtn(hole.fairwayHit, false)}>✗ Missed</button>
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6857', marginBottom: 8 }}>Green in regulation</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onUpdate(hole.holeNumber, { gir: hole.gir === true ? null : true })} style={toggleBtn(hole.gir, true)}>Yes ✓</button>
            <button onClick={() => onUpdate(hole.holeNumber, { gir: hole.gir === false ? null : false })} style={toggleBtn(hole.gir, false)}>No ✗</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
interface Props {
  courses: Course[]
  rounds: Round[]
  onCourseAdded: (c: Course) => void
  onCourseDeleted: (id: string) => void
  onRoundAdded: (r: Round) => void
  onRoundDeleted: (id: string) => void
  isMobile?: boolean
  homeCourse?: string | null
  autoStart?: boolean
}

export default function ScorecardView({
  courses, rounds,
  onCourseAdded, onCourseDeleted,
  onRoundAdded, onRoundDeleted,
  isMobile = false, homeCourse = null, autoStart = false,
}: Props) {
  const { user } = useAuth()
  const [phase, setPhase]         = useState<Phase>(() => autoStart ? { type: 'round_start' } : { type: 'history' })
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const [roundDate, setRoundDate] = useState(today)

  const [courseName,      setCourseName]      = useState('')
  const [selectedCourse,  setSelectedCourse]  = useState<GolfCourse | null>(null)
  const [selectedApiTee,  setSelectedApiTee]  = useState<GolfTee | null>(null)
  const [tee,             setTee]             = useState('white')
  const [holeCount,       setHoleCount]       = useState<9 | 18>(18)
  const [apiOriginalHoles, setApiOriginalHoles] = useState<{ par: 3|4|5; yardage: string }[]>([])
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [correctionSaved,  setCorrectionSaved]  = useState(false)
  const [holeSetup, setHoleSetup]   = useState<{ par: 3 | 4 | 5; yardage: string }[]>([])

  const px = isMobile ? 16 : 40
  const initHoleSetup = (count: number) =>
    Array.from({ length: count }, () => ({ par: 4 as 3 | 4 | 5, yardage: '' }))

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
      const round = await createRound(user!.id, course.id, course.name, course.tee, course.holes, roundDate)
      onRoundAdded(round)
      const initHoles: RoundHole[] = course.courseHoles.map(ch => ({
        id: '', roundId: round.id, holeNumber: ch.holeNumber, par: ch.par,
        yardage: ch.yardage, score: null, putts: null, fairwayHit: null, gir: null,
      }))
      setPhase({ type: 'scorecard', round, holes: initHoles, mode, editingHole: null, activeHole: null })
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
  const backBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: '#6B6857', fontSize: 13.5,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0,
    display: 'block', marginBottom: 20,
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
            onClick={() => { setSaveError(null); setRoundDate(today); setPhase({ type: 'round_start' }) }}
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.courseName}</div>
                      <div style={{ fontSize: 12.5, color: '#6B6857', marginTop: 2 }}>{formatDate(r.playedAt)} · {r.holes} holes</div>
                    </div>
                    {t.played > 0 && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', lineHeight: 1 }}>{t.totalScore}</div>
                        <div style={{ fontSize: 12, color: t.diff === 0 ? '#5C7A4D' : t.diff > 0 ? '#D9824D' : '#5C7A4D', marginTop: 2 }}>
                          {t.diff === 0 ? 'E' : t.diff > 0 ? `+${t.diff}` : t.diff}
                        </div>
                      </div>
                    )}
                    <button onClick={() => setPhase({ type: 'summary', round: r, holes: r.roundHoles })}
                      style={{ background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#1F1D17', flexShrink: 0 }}>
                      View
                    </button>
                    <button
                      onClick={async () => { try { await deleteRound(r.id); onRoundDeleted(r.id) } catch {/* */} }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.3, transition: 'opacity 0.15s', flexShrink: 0 }}
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
  // ROUND START
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

        {!smSaved && (
          <div style={{ marginBottom: 24 }}>
            <span style={{ ...sectionLabel, color: '#D9824D' }}>Featured</span>
            <button
              onClick={handleSelectSantaMaria} disabled={saving}
              style={{ width: '100%', background: '#1F3A2A', border: 'none', borderRadius: 20, padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,246,234,0.45)' }}>Blue Tees · 18 Holes · Par 72</span>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.025em' }}>
                {saving ? 'Loading…' : 'Santa Maria Golf & Country Club'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(250,246,234,0.4)', marginTop: 5 }}>Panama · Pre-loaded</div>
            </button>
          </div>
        )}

        {courses.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <span style={sectionLabel}>Your courses</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {courses.map(c => {
                const teeInfo = TEE_COLORS.find(t => t.id === c.tee) ?? TEE_COLORS[2]
                return (
                  <button key={c.id} onClick={() => setPhase({ type: 'mode_select', course: c })}
                    style={{ width: '100%', ...card, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s, box-shadow 0.15s' }}
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
  // COURSE SETUP
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
          {/* Course search */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 8 }}>Course name</label>
            <CourseSearch
              value={courseName}
              onChange={name => { setCourseName(name); setSelectedCourse(null); setSelectedApiTee(null); setCorrectionSaved(false) }}
              onSelect={course => {
                setSelectedApiTee(null)
                setCorrectionSaved(false)
                const allTees = [...(course.tees.male ?? []), ...(course.tees.female ?? [])]
                const h18 = allTees.filter(t => t.number_of_holes === 18)
                const preferred = h18.length > 0 ? h18 : allTees
                if (preferred.length > 0) setHoleCount(preferred[0].number_of_holes as 9 | 18)
                // Apply any saved correction for this course
                fetchCorrection(course.id).then(correction => {
                  if (correction?.tees?.length) {
                    setSelectedCourse({ ...course, tees: { male: correction.tees, female: [] } })
                  } else {
                    setSelectedCourse(course)
                  }
                })
              }}
            />
            {selectedCourse && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#5C7A4D', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✓</span>
                <span>{[selectedCourse.location.city, selectedCourse.location.state || selectedCourse.location.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Holes — auto-detected from API or manual */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 10 }}>Holes</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {([9, 18] as (9|18)[]).map(n => (
                <button key={n} onClick={() => { setHoleCount(n); setSelectedApiTee(null) }}
                  style={{ flex: 1, border: '1px solid', borderRadius: 14, padding: '12px', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, background: holeCount === n ? '#1F3A2A' : 'transparent', color: holeCount === n ? '#FAF6EA' : '#1F1D17', borderColor: holeCount === n ? '#1F3A2A' : '#E0D8C5', transition: 'all 0.15s', letterSpacing: '-0.02em' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Tee — API tees when course selected, otherwise manual */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 10 }}>Tee</label>
            {selectedCourse ? (() => {
              const seen = new Set<string>()
              const allTees = [...(selectedCourse.tees.male ?? []), ...(selectedCourse.tees.female ?? [])]
                .filter(t => t.number_of_holes === holeCount)
                .filter(t => { if (seen.has(t.tee_name)) return false; seen.add(t.tee_name); return true })
              return allTees.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {allTees.map(t => {
                    const isActive = selectedApiTee?.tee_name === t.tee_name
                    const teeColor = TEE_COLORS.find(tc => tc.label.toLowerCase() === t.tee_name.toLowerCase())
                    return (
                      <button key={t.tee_name} onClick={() => { setSelectedApiTee(t); setTee(t.tee_name.toLowerCase()) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid', borderRadius: 999, padding: '8px 16px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, background: isActive ? '#1F3A2A' : 'transparent', color: isActive ? '#FAF6EA' : '#1F1D17', borderColor: isActive ? '#1F3A2A' : '#E0D8C5', transition: 'all 0.15s' }}>
                        {teeColor && <span style={{ width: 10, height: 10, borderRadius: 5, background: teeColor.color, border: teeColor.id === 'white' ? '1px solid #ccc' : 'none', flexShrink: 0 }} />}
                        {t.tee_name}
                        <span style={{ fontSize: 11, opacity: 0.6 }}>{t.par_total}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#B5AC95' }}>No tees found for {holeCount} holes.</div>
              )
            })() : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TEE_COLORS.map(t => (
                  <button key={t.id} onClick={() => setTee(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid', borderRadius: 999, padding: '8px 16px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, background: tee === t.id ? '#1F3A2A' : 'transparent', color: tee === t.id ? '#FAF6EA' : '#1F1D17', borderColor: tee === t.id ? '#1F3A2A' : '#E0D8C5', transition: 'all 0.15s' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: t.color, border: t.id === 'white' ? '1px solid #ccc' : 'none', flexShrink: 0 }} />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setSaveError(null)
              if (selectedApiTee) {
                const apiHoles = selectedApiTee.holes.slice(0, holeCount)
                const setup = apiHoles.map(h => ({ par: h.par as 3|4|5, yardage: String(h.yardage) }))
                setHoleSetup(setup)
                setApiOriginalHoles(setup)
              } else {
                setHoleSetup(initHoleSetup(holeCount))
                setApiOriginalHoles([])
              }
              setCorrectionSaved(false)
              setPhase({ type: 'hole_setup', name: courseName.trim(), tee, holeCount })
            }}
            disabled={!courseName.trim() || (selectedCourse !== null && selectedApiTee === null)}
            style={{ ...primaryBtn(!courseName.trim() || (selectedCourse !== null && selectedApiTee === null)), marginTop: 8 }}
            onMouseEnter={e => { if (courseName.trim()) e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { if (courseName.trim()) e.currentTarget.style.background = '#1F3A2A' }}
          >
            {selectedApiTee ? 'Continue →' : 'Set up holes →'}
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

        {/* Save corrections banner — shown when user changed API-provided data */}
        {(() => {
          const hasChanges = apiOriginalHoles.length > 0 && holeSetup.some((h, i) => {
            const orig = apiOriginalHoles[i]
            return orig && (h.par !== orig.par || h.yardage !== orig.yardage)
          })
          if (!hasChanges && !correctionSaved) return null
          return (
            <div style={{ background: correctionSaved ? 'rgba(92,122,77,0.10)' : 'rgba(217,130,77,0.10)', border: `1px solid ${correctionSaved ? 'rgba(92,122,77,0.30)' : 'rgba(217,130,77,0.30)'}`, borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: correctionSaved ? '#5C7A4D' : '#D9824D', fontFamily: "'DM Sans', sans-serif" }}>
                  {correctionSaved ? '✓ Corrections saved for everyone' : 'You changed some hole data'}
                </div>
                {!correctionSaved && (
                  <div style={{ fontSize: 11.5, color: '#6B6857', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                    Save to fix this course for all Dial users
                  </div>
                )}
              </div>
              {!correctionSaved && (
                <button
                  disabled={savingCorrection}
                  onClick={async () => {
                    if (!selectedCourse || !selectedApiTee) return
                    setSavingCorrection(true)
                    const correctedTee: GolfTee = {
                      ...selectedApiTee,
                      holes: holeSetup.map((h, i) => ({
                        par:      h.par,
                        yardage:  parseInt(h.yardage) || selectedApiTee.holes[i]?.yardage || 0,
                        handicap: selectedApiTee.holes[i]?.handicap ?? i + 1,
                      })),
                    }
                    const allTees = [...(selectedCourse.tees.male ?? []), ...(selectedCourse.tees.female ?? [])]
                    const correctedTees = allTees.map(t =>
                      t.tee_name === selectedApiTee.tee_name ? correctedTee : t
                    )
                    await saveCorrection(selectedCourse, correctedTees)
                    setSavingCorrection(false)
                    setCorrectionSaved(true)
                  }}
                  style={{ flexShrink: 0, background: '#D9824D', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: savingCorrection ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: savingCorrection ? 0.6 : 1 }}
                >
                  {savingCorrection ? 'Saving…' : 'Save corrections'}
                </button>
              )}
            </div>
          )
        })()}

        {saveError && <div style={errorBox}>{saveError}</div>}
        <button onClick={handleSaveNewCourse} disabled={saving}
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
          <button style={{ ...backBtn, marginBottom: 0 }} onClick={() => setPhase({ type: 'round_start' })}>← Back</button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 999, padding: '6px 14px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid #ccc' : 'none' }} />
            <span style={{ fontSize: 12.5, color: '#6B6857', fontFamily: "'DM Sans', sans-serif" }}>
              {course.name} · {teeInfo.label} tees
            </span>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          How are you scoring?
        </h1>
        <p style={{ fontSize: 14, color: '#6B6857', marginBottom: 28 }}>Choose how detailed you'd like to track this round.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          <button
            onClick={() => handleStartRound(course, 'score-only')} disabled={saving}
            style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.borderColor = '#1F3A2A'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(31,58,42,0.08)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0D8C5'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em', marginBottom: 5 }}>Score only</div>
            <div style={{ fontSize: 13.5, color: '#6B6857', lineHeight: 1.5 }}>Just enter your score per hole. Fast and simple.</div>
          </button>

          <button
            onClick={() => handleStartRound(course, 'score-stats')} disabled={saving}
            style={{ background: '#1F3A2A', border: '1px solid #1F3A2A', borderRadius: 20, padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'background 0.15s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
          >
            <div style={{ position: 'absolute', top: 16, right: 16, background: '#D9824D', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#FAF6EA', textTransform: 'uppercase' }}>
              Recommended
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.02em', marginBottom: 5 }}>Score + Stats</div>
            <div style={{ fontSize: 13.5, color: 'rgba(250,246,234,0.6)', lineHeight: 1.5 }}>Track putts, fairways hit, and greens in regulation alongside your score.</div>
          </button>
        </div>

        {/* Date picker */}
        <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 16, padding: '16px 20px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 10 }}>
            Date played
          </label>
          <input
            type="date"
            value={roundDate}
            max={today}
            onChange={e => setRoundDate(e.target.value)}
            style={{ ...inputStyle, background: '#F0EBDD' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
          />
          {roundDate !== today && (
            <p style={{ fontSize: 12, color: '#D9824D', marginTop: 8, marginBottom: 0 }}>
              Logging a past round — {formatDate(roundDate)}
            </p>
          )}
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
    const { round, holes, mode, editingHole, activeHole } = phase

    const updateHole = (holeNumber: number, patch: Partial<RoundHole>) =>
      setPhase(p => p.type === 'scorecard' ? {
        ...p, holes: p.holes.map(h => h.holeNumber === holeNumber ? { ...h, ...patch } : h),
      } : p)

    const handleCellClick = (hn: number) =>
      setPhase(p => p.type === 'scorecard' ? { ...p, editingHole: hn, activeHole: hn } : p)

    const handleScoreCommit = (hn: number, score: number | null) =>
      setPhase(p => p.type === 'scorecard' ? {
        ...p,
        holes: p.holes.map(h => h.holeNumber === hn ? { ...h, score } : h),
        editingHole: null,
        activeHole: p.mode === 'score-stats' ? hn : null,
      } : p)

    const activeHoleData = (activeHole !== null && editingHole === null)
      ? holes.find(h => h.holeNumber === activeHole) ?? null
      : null

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
        <div style={{ maxWidth: 720, margin: '0 auto', padding: `${isMobile ? 16 : 48}px ${isMobile ? 10 : 40}px ${activeHoleData ? 260 : isMobile ? 120 : 80}px` }}>
          <button style={{ ...backBtn, marginBottom: 20 }} onClick={() => setPhase({ type: 'history' })}>
            ← All rounds
          </button>

          <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 24, overflow: 'hidden', marginBottom: 16 }}>
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

            <div style={{ height: 1, background: '#E0D8C5' }} />

            <div style={{ padding: '14px 0 10px' }}>
              <div style={{ paddingLeft: 10, paddingRight: 10, marginBottom: 4 }}>
                <ScorecardHalf
                  holes={front9} label="OUT" mode={mode}
                  editingHole={editingHole} activeHole={activeHole}
                  onCellClick={handleCellClick}
                  onScoreCommit={handleScoreCommit}
                />
              </div>
              {round.holes === 18 && (
                <>
                  <div style={{ height: 1, background: '#E0D8C5', margin: '8px 0' }} />
                  <div style={{ paddingLeft: 10, paddingRight: 10 }}>
                    <ScorecardHalf
                      holes={back9} label="IN" mode={mode}
                      editingHole={editingHole} activeHole={activeHole}
                      onCellClick={handleCellClick}
                      onScoreCommit={handleScoreCommit}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#B5AC95', marginBottom: 20, fontFamily: "'DM Sans', sans-serif" }}>
            Tap any score cell to type your result
          </p>

          {saveError && <div style={errorBox}>{saveError}</div>}

          <button
            onClick={() => handleFinishRound(round, holes)} disabled={saving}
            style={{ ...primaryBtn(saving), marginTop: saveError ? 8 : 0 }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#1F3A2A' }}
          >
            {saving ? 'Saving…' : 'Submit scorecard →'}
          </button>
        </div>

        {activeHoleData && mode === 'score-stats' && (
          <StatsPanel
            hole={activeHoleData}
            holes={holes}
            onUpdate={updateHole}
            onSelectHole={hn => setPhase(p => p.type === 'scorecard' ? { ...p, activeHole: hn, editingHole: null } : p)}
            onClose={() => setPhase(p => p.type === 'scorecard' ? { ...p, activeHole: null } : p)}
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

        {statsMode === 'score-stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
            {[
              { label: 'Putts', value: t.totalPutts || '—' },
              { label: 'Fairways', value: t.fairwaysPossible ? `${t.fairways}/${t.fairwaysPossible}` : '—' },
              { label: 'GIR', value: t.girPossible ? `${t.girHoles}/${t.girPossible}` : '—' },
            ].map(s => (
              <div key={s.label} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6B6857', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '20px 22px', marginBottom: 20 }}>
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

        <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ borderBottom: '1px solid #E0D8C5', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase' }}>Scorecard</div>
          </div>
          <div style={{ padding: '12px 8px 12px' }}>
            <ScorecardHalf holes={front9} label="OUT" mode={statsMode as ScoringMode}
              editingHole={null} activeHole={null}
              onCellClick={() => {}} onScoreCommit={() => {}} interactive={false} />
            {round.holes === 18 && (
              <>
                <div style={{ height: 1, background: '#E0D8C5', margin: '8px 0' }} />
                <ScorecardHalf holes={back9} label="IN" mode={statsMode as ScoringMode}
                  editingHole={null} activeHole={null}
                  onCellClick={() => {}} onScoreCommit={() => {}} interactive={false} />
              </>
            )}
          </div>
        </div>

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
