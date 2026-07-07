import { useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { saveCourse, deleteCourse } from '../lib/courses'
import { createRound, upsertRoundHoles, deleteRound } from '../lib/rounds'
import { createRoundPost, uploadPostImage } from '../lib/posts'
import type { Course, Round, RoundHole, RoundRecapMeta } from '../types'
import { CloseIcon, PlusIcon, ScorecardIcon, ChevronLeftIcon, CameraIcon } from './Icons'
import EmptyState from './EmptyState'
import CourseSearch from './CourseSearch'
import PageHeader from './PageHeader'
import Portal from './Portal'
import type { GolfCourse, GolfTee } from '../lib/golfCourseApi'
import { fetchCorrection, saveCorrection } from '../lib/courseCorrections'
import { useStaggerMount } from '../hooks/useStaggerMount'
import { font, color, radius, page, type } from '../lib/tokens'
import { card as cardSurface, well, sectionLabel as sharedSectionLabel } from '../lib/surfaces'
import { loadPrefs } from '../lib/prefs'

const SANTA_MARIA_NAME = 'Santa Maria Golf & Country Club'
const SANTA_MARIA_HOLES: { par: 3 | 4 | 5 }[] = [
  { par: 5 }, { par: 4 }, { par: 4 }, { par: 4 }, { par: 3 },
  { par: 4 }, { par: 5 }, { par: 3 }, { par: 4 },
  { par: 4 }, { par: 5 }, { par: 3 }, { par: 4 }, { par: 3 },
  { par: 4 }, { par: 5 }, { par: 4 }, { par: 4 },
]

// Real-world tee-marker colors — reference data, not app chrome, so these
// stay literal even where a couple happen to coincide with a token value.
const TEE_COLORS = [
  { id: 'black', label: 'Black', color: '#171A17' },
  { id: 'blue',  label: 'Blue',  color: '#2563EB' },
  { id: 'white', label: 'White', color: '#FFFFFF'  },
  { id: 'red',   label: 'Red',   color: '#DC2626'  },
  { id: 'gold',  label: 'Gold',  color: '#A8852F'  },
  { id: 'green', label: 'Green', color: '#2F6E4C'  },
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
  if (d <= -2) return { label: 'Eagle',  color: color.gold }
  if (d === -1) return { label: 'Birdie', color: color.birdie }
  if (d === 0)  return { label: 'Par',    color: color.inkSoft }
  if (d === 1)  return { label: 'Bogey',  color: color.orange }
  if (d === 2)  return { label: 'Double', color: color.danger }
  if (d === 3)  return { label: 'Triple', color: color.danger }
  return             { label: `+${d}`,  color: color.dangerDeep }
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
// Ring + inner text always match (eagle/birdie/bogey/double+ each read as a
// single accent color on a matching pale tint); par is a quiet ink-on-sand
// fill with no ring.
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
    boxShadow: isSelected ? '0 0 0 3px rgba(18,55,31,0.18)' : 'none',
    transition: 'box-shadow 0.12s',
  }
  const num = (sz: number, col: string): React.CSSProperties => ({
    fontFamily: font.display,
    fontSize: sz, fontWeight: 700, color: col, lineHeight: 1,
  })

  if (score === null) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, borderRadius: 6, border: `1.5px dashed ${color.borderStrong}` }}>
        <span style={{ color: color.faint, fontSize: 14 }}>·</span>
      </div>
    )
  }

  const d = score - par

  if (d <= -2) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, borderRadius: '50%', border: `1.5px solid ${color.gold}` }}>
        <div style={{ width: 19, height: 19, borderRadius: '50%', border: `1.5px solid ${color.gold}`, background: '#F7F0DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={num(9, color.gold)}>{score}</span>
        </div>
      </div>
    )
  }

  if (d === -1) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, borderRadius: '50%', border: `2px solid ${color.birdie}`, background: '#EAF3EC' }}>
        <span style={num(12, color.birdie)}>{score}</span>
      </div>
    )
  }

  if (d === 0) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, borderRadius: 5, background: color.sand }}>
        <span style={num(12, color.ink)}>{score}</span>
      </div>
    )
  }

  if (d === 1) {
    return (
      <div onClick={interactive ? onClick : undefined}
        style={{ ...base, border: `2px solid ${color.orange}`, background: '#F9EEDF' }}>
        <span style={num(12, color.orange)}>{score}</span>
      </div>
    )
  }

  return (
    <div onClick={interactive ? onClick : undefined}
      style={{ ...base, border: `1.5px solid ${color.danger}` }}>
      <div style={{ width: 18, height: 18, border: `1.5px solid ${color.danger}`, background: '#F9E9E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={num(9, color.danger)}>{score}</span>
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
  const labelCell: React.CSSProperties = { width: L, minWidth: L, textAlign: 'left', paddingLeft: 14, border: 'none', verticalAlign: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: color.muted }
  const totalCell: React.CSSProperties = { width: T, minWidth: T, textAlign: 'center', border: 'none', verticalAlign: 'middle' }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: L + holes.length * C + T }}>
        <tbody>
          <tr style={{ background: color.green }}>
            <td style={{ ...labelCell, color: 'rgba(255,250,241,0.4)', padding: '8px 0 8px 14px' }}>HOLE</td>
            {holes.map(h => (
              <td key={h.holeNumber} style={{ ...cellBase, fontSize: 12, fontWeight: 700, color: color.onGreen, fontFamily: font.display, padding: '8px 0' }}>{h.holeNumber}</td>
            ))}
            <td style={{ ...totalCell, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,250,241,0.4)', padding: '8px 0' }}>{label}</td>
          </tr>

          <tr style={{ background: color.white }}>
            <td style={{ ...labelCell, padding: '5px 0 5px 14px' }}>YDS</td>
            {holes.map(h => (
              <td key={h.holeNumber} style={{ ...cellBase, fontSize: 11, color: color.muted, padding: '5px 0' }}>
                {h.yardage ?? '—'}
              </td>
            ))}
            <td style={{ ...totalCell, fontSize: 12, fontWeight: 600, color: color.muted, padding: '5px 0' }}>
              {holes.some(h => h.yardage) ? holes.reduce((s, h) => s + (h.yardage ?? 0), 0) : '—'}
            </td>
          </tr>

          <tr style={{ background: color.sand }}>
            <td style={{ ...labelCell, padding: '7px 0 7px 14px' }}>PAR</td>
            {holes.map(h => (
              <td key={h.holeNumber} style={{ ...cellBase, fontSize: 13, fontWeight: 600, color: color.inkSoft, padding: '7px 0' }}>{h.par}</td>
            ))}
            <td style={{ ...totalCell, fontSize: 14, fontWeight: 700, color: color.ink, fontFamily: font.display, padding: '7px 0' }}>{parSum}</td>
          </tr>

          <tr style={{ background: color.white }}>
            <td style={{ ...labelCell, padding: '5px 0 5px 14px' }}>SCORE</td>
            {holes.map(h => {
              const isEditing = interactive && editingHole === h.holeNumber
              const isSelected = activeHole === h.holeNumber && !isEditing
              return (
                <td key={h.holeNumber} style={{ ...cellBase, padding: '4px 2px' }}>
                  {isEditing ? (
                    <div style={{ width: 28, height: 28, border: `2px solid ${color.green}`, borderRadius: 5, background: color.sand, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        defaultValue={h.score !== null ? String(h.score) : ''}
                        style={{ width: 22, height: 22, textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', fontFamily: font.display, fontSize: 12, fontWeight: 700, color: color.ink, padding: 0 }}
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
            <td style={{ ...totalCell, fontFamily: font.display, fontSize: 16, fontWeight: 700, color: color.ink, padding: '4px 0' }}>
              {anyScore ? scoreSum : '—'}
            </td>
          </tr>

          {mode === 'score-stats' && (
            <>
              <tr style={{ background: color.sand }}>
                <td style={{ ...labelCell, padding: '6px 0 6px 14px' }}>PUTTS</td>
                {holes.map(h => (
                  <td key={h.holeNumber} style={{ ...cellBase, fontSize: 12, fontWeight: 600, color: color.inkSoft, padding: '6px 0' }}>{h.putts ?? '·'}</td>
                ))}
                <td style={{ ...totalCell, fontSize: 13, fontWeight: 700, color: color.inkSoft, padding: '6px 0' }}>
                  {holes.some(h => h.putts !== null) ? puttsSum : '—'}
                </td>
              </tr>
              <tr style={{ background: color.white }}>
                <td style={{ ...labelCell, padding: '6px 0 6px 14px' }}>F/W</td>
                {holes.map(h => (
                  <td key={h.holeNumber} style={{ ...cellBase, fontSize: 11, padding: '6px 0' }}>
                    {h.par < 4
                      ? <span style={{ color: color.borderStrong, fontSize: 8 }}>N/A</span>
                      : h.fairwayHit === true  ? <span style={{ color: color.birdie, fontWeight: 700 }}>✓</span>
                      : h.fairwayHit === false ? <span style={{ color: color.orange }}>✗</span>
                      : <span style={{ color: color.borderStrong }}>·</span>
                    }
                  </td>
                ))}
                <td style={{ ...totalCell, fontSize: 11, fontWeight: 600, color: color.inkSoft, padding: '6px 0' }}>
                  {fwHoles.length > 0 ? `${fwHit}/${fwHoles.length}` : '—'}
                </td>
              </tr>
              <tr style={{ background: color.sand }}>
                <td style={{ ...labelCell, padding: '6px 0 6px 14px' }}>GIR</td>
                {holes.map(h => (
                  <td key={h.holeNumber} style={{ ...cellBase, fontSize: 11, padding: '6px 0' }}>
                    {h.gir === true  ? <span style={{ color: color.birdie, fontWeight: 700 }}>✓</span>
                     : h.gir === false ? <span style={{ color: color.orange }}>✗</span>
                     : <span style={{ color: color.borderStrong }}>·</span>
                    }
                  </td>
                ))}
                <td style={{ ...totalCell, fontSize: 11, fontWeight: 600, color: color.inkSoft, padding: '6px 0' }}>
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
// Rendered through <Portal> — it's position:fixed but was previously mounted
// inside the GSAP-transformed page container, whose lingering transform
// creates a containing block that can mis-anchor a fixed child on mobile.
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
    flex: 1, padding: '10px', borderRadius: radius.sm, fontSize: 13,
    fontWeight: 500, border: '1px solid', cursor: 'pointer',
    fontFamily: font.body, transition: 'all 0.15s',
    background: active === val ? color.green : 'transparent',
    color: active === val ? color.onGreen : color.ink,
    borderColor: active === val ? color.green : color.border,
  })
  const navBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 16, background: color.sand,
    border: `1px solid ${color.border}`, fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: color.ink,
  }
  const microLabel: React.CSSProperties = { ...sharedSectionLabel, fontSize: 13, marginBottom: 8 }

  const sn = hole.score !== null ? scoreName(hole.score, hole.par) : null

  return (
    <Portal>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
        background: color.sheet, borderTop: `1px solid ${color.border}`,
        borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
        padding: '12px 20px 36px',
        boxShadow: '0 -8px 32px rgba(31,29,23,0.18)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: color.border, margin: '0 auto 14px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: color.ink }}>
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
              <CloseIcon size={11} color={color.ink} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={microLabel}>Putts</div>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              value={hole.putts !== null ? String(hole.putts) : ''}
              onChange={e => {
                const v = parseInt(e.target.value)
                onUpdate(hole.holeNumber, { putts: e.target.value === '' || isNaN(v) ? null : Math.min(10, Math.max(0, v)) })
              }}
              placeholder="—"
              style={{ width: '100%', background: color.sand, border: `1px solid ${color.border}`, borderRadius: radius.sm, padding: '10px 14px', fontSize: 16, fontWeight: 700, color: color.ink, outline: 'none', boxSizing: 'border-box', fontFamily: font.display }}
              onFocus={e => { e.currentTarget.style.borderColor = color.green }}
              onBlur={e => { e.currentTarget.style.borderColor = color.border }}
            />
          </div>

          {hole.par >= 4 && (
            <div>
              <div style={microLabel}>Fairway hit</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onUpdate(hole.holeNumber, { fairwayHit: hole.fairwayHit === true ? null : true })} style={toggleBtn(hole.fairwayHit, true)}>✓ Hit</button>
                <button onClick={() => onUpdate(hole.holeNumber, { fairwayHit: hole.fairwayHit === false ? null : false })} style={toggleBtn(hole.fairwayHit, false)}>✗ Missed</button>
              </div>
            </div>
          )}

          <div>
            <div style={microLabel}>Green in regulation</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onUpdate(hole.holeNumber, { gir: hole.gir === true ? null : true })} style={toggleBtn(hole.gir, true)}>Yes ✓</button>
              <button onClick={() => onUpdate(hole.holeNumber, { gir: hole.gir === false ? null : false })} style={toggleBtn(hole.gir, false)}>No ✗</button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
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
  const [sharedRoundId, setSharedRoundId] = useState<string | null>(null)
  const [sharing, setSharing]     = useState(false)
  const [shareFile,    setShareFile]    = useState<File | null>(null)
  const [sharePreview, setSharePreview] = useState<string | null>(null)
  const [shareCaption, setShareCaption] = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const openSummary = (round: Round, holes: RoundHole[]) => {
    setShareFile(null); setSharePreview(null); setShareCaption('')
    setPhase({ type: 'summary', round, holes })
  }

  const today = new Date().toISOString().split('T')[0]
  const [roundDate, setRoundDate] = useState(today)

  const [courseName,       setCourseName]       = useState('')
  const [selectedCourse,   setSelectedCourse]   = useState<GolfCourse | null>(null)
  const [selectedApiTee,   setSelectedApiTee]   = useState<GolfTee | null>(null)
  const [tee,              setTee]              = useState(() => loadPrefs().teePreference)
  const [holeCount,        setHoleCount]        = useState<9 | 18>(() => loadPrefs().defaultHoles)
  const [nineSection,      setNineSection]      = useState<'front' | 'back'>('front')
  const [apiOriginalHoles, setApiOriginalHoles] = useState<{ par: 3|4|5; yardage: string }[]>([])
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [correctionSaved,  setCorrectionSaved]  = useState(false)
  const [holeSetup, setHoleSetup]   = useState<{ par: 3 | 4 | 5; yardage: string }[]>([])

  // Hooks must run unconditionally regardless of which phase is showing.
  // Each ref only attaches on its own phase; gating on `phase.type` re-fires
  // the stagger when that section actually appears (phases switch via
  // setState within one mounted component, not a remount), and the hook
  // no-ops when its ref isn't attached (see the hook itself).
  const historyRef = useRef<HTMLDivElement>(null)
  useStaggerMount(historyRef, { dependencies: [phase.type] })
  const summaryRef = useRef<HTMLDivElement>(null)
  useStaggerMount(summaryRef, { dependencies: [phase.type] })

  const px = isMobile ? page.pxMobile : page.pxDesktop
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
      openSummary(finalRound, saved)
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

  const sectionLabel: React.CSSProperties = { ...sharedSectionLabel, marginBottom: 8, display: 'block' }
  const card: React.CSSProperties = cardSurface
  const inputStyle: React.CSSProperties = {
    width: '100%', background: color.sand, border: `1px solid ${color.borderStrong}`,
    borderRadius: radius.sm, padding: '12px 14px', fontSize: 16, color: color.ink,
    outline: 'none', boxSizing: 'border-box', fontFamily: font.body,
  }
  const backBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: color.inkSoft, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', fontFamily: font.body, padding: 0,
    display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20,
  }
  const primaryBtn = (disabled = false): React.CSSProperties => ({
    width: '100%', background: disabled ? color.borderStrong : color.green, color: disabled ? color.muted : color.onGreen,
    border: 'none', borderRadius: radius.md, padding: '15px', fontSize: 15, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: font.body,
    transition: 'background 0.15s',
  })
  const errorBox: React.CSSProperties = {
    background: '#FBEDEB', border: '1px solid #EFCBC5',
    borderRadius: radius.sm, padding: '12px 16px', fontSize: 13, color: color.dangerDeep, marginTop: 16,
  }

  // ══════════════════════════════════════════════════════
  // HISTORY
  // ══════════════════════════════════════════════════════
  if (phase.type === 'history') {
    const startRoundButton = (
      <button
        onClick={() => { setSaveError(null); setRoundDate(today); setPhase({ type: 'round_start' }) }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.pill, padding: '10px 18px 10px 20px', fontFamily: font.body, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
        onMouseEnter={e => { e.currentTarget.style.background = color.greenDeep }}
        onMouseLeave={e => { e.currentTarget.style.background = color.green }}
      >
        Start round
        <span style={{ width: 22, height: 22, borderRadius: 11, background: color.orange, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <PlusIcon size={14} color={color.onGreen} />
        </span>
      </button>
    )
    return (
      <div style={{ maxWidth: page.maxW, margin: '0 auto', padding: `${isMobile ? page.topMobile : page.topDesktop}px ${px}px ${isMobile ? page.bottomMobile : page.bottomDesktop}px` }}>
        <div style={{ marginBottom: 28 }}>
          <PageHeader title="Rounds" subtitle="Your scorecards and history." action={startRoundButton} isMobile={isMobile} />
        </div>

        {rounds.length === 0 ? (
          <EmptyState
            icon={<ScorecardIcon size={24} color={color.faint} />}
            title="No rounds yet"
            subtitle="Start a round to track your scores hole by hole."
          />
        ) : (
          <div>
            <span style={sectionLabel}>Round history</span>
            <div ref={historyRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rounds.map(r => {
                const t = calcTotals(r.roundHoles)
                const teeInfo = TEE_COLORS.find(x => x.id === r.tee) ?? TEE_COLORS[2]
                return (
                  <div key={r.id} style={{ ...card, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: teeInfo.color, border: teeInfo.id === 'white' ? `1px solid ${color.border}` : 'none', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: color.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.courseName}</div>
                      <div style={{ fontSize: 12.5, color: color.inkSoft, marginTop: 2 }}>{formatDate(r.playedAt)} · {r.holes} holes</div>
                    </div>
                    {t.played > 0 && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ ...type.stat, fontSize: 24 }}>{t.totalScore}</div>
                        <div style={{ fontSize: 12, color: t.diff === 0 ? color.birdie : t.diff > 0 ? color.orange : color.birdie, marginTop: 2 }}>
                          {t.diff === 0 ? 'E' : t.diff > 0 ? `+${t.diff}` : t.diff}
                        </div>
                      </div>
                    )}
                    <button onClick={() => openSummary(r, r.roundHoles)}
                      style={{ background: color.sand, border: `1px solid ${color.border}`, borderRadius: radius.sm, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: font.body, color: color.ink, flexShrink: 0 }}>
                      View
                    </button>
                    <button
                      onClick={async () => { try { await deleteRound(r.id); onRoundDeleted(r.id) } catch {/* */} }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.3, transition: 'opacity 0.15s', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.3' }}
                    >
                      <CloseIcon size={12} color={color.ink} />
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
      <div style={{ maxWidth: page.maxW, margin: '0 auto', padding: `${isMobile ? page.topMobile : page.topDesktop}px ${px}px ${isMobile ? page.bottomMobile : page.bottomDesktop}px` }}>
        <div style={{ maxWidth: page.contentW, margin: '0 auto' }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'history' })}><ChevronLeftIcon size={17} color={color.inkSoft} />Back</button>
        <span style={sectionLabel}>New round</span>
        <h1 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: color.ink, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Choose a course.
        </h1>
        <p style={{ fontSize: 14, color: color.inkSoft, marginBottom: 32 }}>Select from your saved courses or add a new one.</p>

        {!smSaved && (
          <div style={{ marginBottom: 24 }}>
            <span style={{ ...sectionLabel, color: color.orange }}>Featured</span>
            <button
              onClick={handleSelectSantaMaria} disabled={saving}
              style={{ width: '100%', background: color.green, border: 'none', borderRadius: radius.lg, padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'background 0.15s', boxShadow: '0 10px 26px rgba(58,48,28,0.07)' }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = color.greenDeep }}
              onMouseLeave={e => { e.currentTarget.style.background = color.green }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,250,241,0.45)' }}>Blue Tees · 18 Holes · Par 72</span>
              </div>
              <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, color: color.onGreen, letterSpacing: '-0.025em' }}>
                {saving ? 'Loading…' : 'Santa Maria Golf & Country Club'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,250,241,0.4)', marginTop: 5 }}>Panama · Pre-loaded</div>
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
                    onMouseEnter={e => { e.currentTarget.style.borderColor = color.green; e.currentTarget.style.boxShadow = '0 2px 12px rgba(18,55,31,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = color.border; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: teeInfo.color, border: teeInfo.id === 'white' ? `1px solid ${color.border}` : 'none', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.ink, letterSpacing: '-0.02em' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: color.inkSoft, marginTop: 2 }}>{c.holes} holes · {teeInfo.label} tees</div>
                    </div>
                    <span style={{ color: color.muted, fontSize: 20 }}>›</span>
                    <button
                      onClick={async e => { e.stopPropagation(); try { await deleteCourse(c.id); onCourseDeleted(c.id) } catch {/* */} }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.25, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.25' }}
                    >
                      <CloseIcon size={11} color={color.ink} />
                    </button>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => { const p = loadPrefs(); setCourseName(homeCourse ?? ''); setTee(p.teePreference); setHoleCount(p.defaultHoles); setSaveError(null); setPhase({ type: 'course_setup' }) }}
          style={{ width: '100%', background: 'transparent', border: `1.5px dashed ${color.borderStrong}`, borderRadius: radius.lg, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = color.green }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = color.borderStrong }}
        >
          <span style={{ width: 28, height: 28, borderRadius: 14, background: color.sand, border: `1px solid ${color.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusIcon size={13} color={color.inkSoft} />
          </span>
          <div>
            <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink }}>Add a new course</div>
            <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>Enter course name, tee, and hole info</div>
          </div>
        </button>

        {saveError && <div style={errorBox}>{saveError}</div>}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // COURSE SETUP
  // ══════════════════════════════════════════════════════
  if (phase.type === 'course_setup') {
    return (
      <div style={{ maxWidth: page.maxW, margin: '0 auto', padding: `${isMobile ? page.topMobile : page.topDesktop}px ${px}px ${isMobile ? page.bottomMobile : page.bottomDesktop}px` }}>
        <div style={{ maxWidth: page.contentW, margin: '0 auto' }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'round_start' })}><ChevronLeftIcon size={17} color={color.inkSoft} />Back</button>
        <span style={sectionLabel}>New course</span>
        <h1 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: color.ink, letterSpacing: '-0.03em', margin: '0 0 32px' }}>
          Course details
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Course search */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: color.inkSoft, textTransform: 'uppercase', marginBottom: 8 }}>Course name</label>
            <CourseSearch
              value={courseName}
              onChange={name => { setCourseName(name); setSelectedCourse(null); setSelectedApiTee(null); setCorrectionSaved(false) }}
              onSelect={course => {
                setSelectedApiTee(null)
                setCorrectionSaved(false)
                // Set course immediately so tees render right away
                setSelectedCourse(course)
                const allTees = [...(course.tees.male ?? []), ...(course.tees.female ?? [])]
                const h18 = allTees.filter(t => t.number_of_holes === 18)
                const preferred = h18.length > 0 ? h18 : allTees
                if (preferred.length > 0) setHoleCount(preferred[0].number_of_holes as 9 | 18)
                // Silently apply correction if one exists (tees + name)
                fetchCorrection(course.id).then(correction => {
                  if (correction) {
                    if (correction.course_name) setCourseName(correction.course_name)
                    if (correction.tees?.length) {
                      setSelectedCourse(prev => prev?.id === course.id
                        ? { ...course, course_name: correction.course_name ?? course.course_name, tees: { male: correction.tees, female: [] } }
                        : prev
                      )
                    }
                  }
                })
              }}
            />
            {selectedCourse && (
              <div style={{ marginTop: 8, fontSize: 12, color: color.birdie, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✓</span>
                <span>{[selectedCourse.location.city, selectedCourse.location.state || selectedCourse.location.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Holes — auto-detected from API or manual */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: color.inkSoft, textTransform: 'uppercase', marginBottom: 10 }}>Holes</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {([9, 18] as (9|18)[]).map(n => (
                <button key={n} onClick={() => { setHoleCount(n); setSelectedApiTee(null) }}
                  style={{ flex: 1, border: '1px solid', borderRadius: radius.sm, padding: '12px', cursor: 'pointer', fontFamily: font.display, fontSize: 18, fontWeight: 700, background: holeCount === n ? color.green : 'transparent', color: holeCount === n ? color.onGreen : color.ink, borderColor: holeCount === n ? color.green : color.border, transition: 'all 0.15s', letterSpacing: '-0.02em' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Tee — API tees when course selected, otherwise manual */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: color.inkSoft, textTransform: 'uppercase', marginBottom: 10 }}>Tee</label>
            {selectedCourse ? (() => {
              const seen = new Set<string>()
              // For 9-hole play, show 18-hole tees (user picks front/back) — fall back to 9-hole if they exist
              const has9 = [...(selectedCourse.tees.male ?? []), ...(selectedCourse.tees.female ?? [])].some(t => t.number_of_holes === 9)
              const allTees = [...(selectedCourse.tees.male ?? []), ...(selectedCourse.tees.female ?? [])]
                .filter(t => holeCount === 9 ? (has9 ? t.number_of_holes === 9 : t.number_of_holes === 18) : t.number_of_holes === 18)
                .filter(t => { if (seen.has(t.tee_name)) return false; seen.add(t.tee_name); return true })
              return allTees.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {allTees.map(t => {
                    const isActive = selectedApiTee?.tee_name === t.tee_name
                    const teeColor = TEE_COLORS.find(tc => tc.label.toLowerCase() === t.tee_name.toLowerCase())
                    return (
                      <button key={t.tee_name} onClick={() => { setSelectedApiTee(t); setTee(t.tee_name.toLowerCase()) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid', borderRadius: radius.pill, padding: '8px 16px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 500, background: isActive ? color.green : 'transparent', color: isActive ? color.onGreen : color.ink, borderColor: isActive ? color.green : color.border, transition: 'all 0.15s' }}>
                        {teeColor && <span style={{ width: 10, height: 10, borderRadius: 5, background: teeColor.color, border: teeColor.id === 'white' ? '1px solid #ccc' : 'none', flexShrink: 0 }} />}
                        {t.tee_name}
                        <span style={{ fontSize: 11, opacity: 0.6 }}>{t.par_total}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null
            })() : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TEE_COLORS.map(t => (
                  <button key={t.id} onClick={() => setTee(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid', borderRadius: radius.pill, padding: '8px 16px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 500, background: tee === t.id ? color.green : 'transparent', color: tee === t.id ? color.onGreen : color.ink, borderColor: tee === t.id ? color.green : color.border, transition: 'all 0.15s' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: t.color, border: t.id === 'white' ? '1px solid #ccc' : 'none', flexShrink: 0 }} />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Front / Back 9 selector — only when playing 9 holes from an 18-hole tee */}
          {holeCount === 9 && selectedApiTee && selectedApiTee.number_of_holes === 18 && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: color.inkSoft, textTransform: 'uppercase', marginBottom: 10 }}>Nine holes</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['front', 'back'] as const).map(s => (
                  <button key={s} onClick={() => setNineSection(s)}
                    style={{ flex: 1, border: '1px solid', borderRadius: radius.sm, padding: '12px', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 600, background: nineSection === s ? color.green : 'transparent', color: nineSection === s ? color.onGreen : color.ink, borderColor: nineSection === s ? color.green : color.border, transition: 'all 0.15s' }}>
                    {s === 'front' ? 'Front 9 (1–9)' : 'Back 9 (10–18)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setSaveError(null)
              if (selectedApiTee) {
                const is9from18 = holeCount === 9 && selectedApiTee.number_of_holes === 18
                const apiHoles = is9from18
                  ? selectedApiTee.holes.slice(nineSection === 'front' ? 0 : 9, nineSection === 'front' ? 9 : 18)
                  : selectedApiTee.holes.slice(0, holeCount)
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
            onMouseEnter={e => { if (courseName.trim()) e.currentTarget.style.background = color.greenDeep }}
            onMouseLeave={e => { if (courseName.trim()) e.currentTarget.style.background = color.green }}
          >
            {selectedApiTee ? 'Continue →' : 'Set up holes →'}
          </button>
        </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // HOLE SETUP
  // ══════════════════════════════════════════════════════
  if (phase.type === 'hole_setup') {
    return (
      <div style={{ maxWidth: page.maxW, margin: '0 auto', padding: `${isMobile ? page.topMobile : page.topDesktop}px ${px}px ${isMobile ? page.bottomMobile : page.bottomDesktop}px` }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'course_setup' })}><ChevronLeftIcon size={17} color={color.inkSoft} />Back</button>
        <span style={sectionLabel}>{phase.name}</span>
        <h1 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: color.ink, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Hole setup
        </h1>
        <p style={{ fontSize: 14, color: color.inkSoft, marginBottom: 28 }}>Enter the par and yardage for each hole. Yardage is optional.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          {holeSetup.map((h, i) => (
            <div key={i} style={{ ...well, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: color.muted, textTransform: 'uppercase', marginBottom: 10 }}>Hole {i + 1}</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: color.inkSoft, marginBottom: 5 }}>Par</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {([3, 4, 5] as (3|4|5)[]).map(p => (
                    <button key={p} onClick={() => setHoleSetup(hs => hs.map((x, j) => j === i ? { ...x, par: p } : x))}
                      style={{ flex: 1, border: '1px solid', borderRadius: 8, padding: '5px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font.display, background: h.par === p ? color.green : 'transparent', color: h.par === p ? color.onGreen : color.ink, borderColor: h.par === p ? color.green : color.border, transition: 'all 0.12s' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number" inputMode="numeric" placeholder="Yds" value={h.yardage}
                onChange={e => setHoleSetup(hs => hs.map((x, j) => j === i ? { ...x, yardage: e.target.value } : x))}
                style={{ width: '100%', background: color.white, border: `1px solid ${color.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 13, color: color.ink, outline: 'none', boxSizing: 'border-box', fontFamily: font.display }}
                onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                onBlur={e => { e.currentTarget.style.borderColor = color.border }}
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
            <div style={{ background: correctionSaved ? 'rgba(53,109,61,0.10)' : 'rgba(200,103,24,0.10)', border: `1px solid ${correctionSaved ? 'rgba(53,109,61,0.30)' : 'rgba(200,103,24,0.30)'}`, borderRadius: radius.sm, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: correctionSaved ? color.birdie : color.orange, fontFamily: font.body }}>
                  {correctionSaved ? '✓ Corrections saved for everyone' : 'You changed some hole data'}
                </div>
                {!correctionSaved && (
                  <div style={{ fontSize: 11.5, color: color.inkSoft, marginTop: 2, fontFamily: font.body }}>
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
                  style={{ flexShrink: 0, background: color.orange, color: color.onGreen, border: 'none', borderRadius: radius.pill, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: savingCorrection ? 'not-allowed' : 'pointer', fontFamily: font.body, opacity: savingCorrection ? 0.6 : 1 }}
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
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = color.greenDeep }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.background = color.green }}
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
      <div style={{ maxWidth: page.maxW, margin: '0 auto', padding: `${isMobile ? page.topMobile : page.topDesktop}px ${px}px ${isMobile ? page.bottomMobile : page.bottomDesktop}px` }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
          <button style={{ ...backBtn, marginBottom: 0 }} onClick={() => setPhase({ type: 'round_start' })}><ChevronLeftIcon size={17} color={color.inkSoft} />Back</button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...well, borderRadius: radius.pill, padding: '6px 14px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid #ccc' : 'none' }} />
            <span style={{ fontSize: 12.5, color: color.inkSoft, fontFamily: font.body }}>
              {course.name} · {teeInfo.label} tees
            </span>
          </div>
        </div>

        <h1 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: color.ink, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          How are you scoring?
        </h1>
        <p style={{ fontSize: 14, color: color.inkSoft, marginBottom: 28 }}>Choose how detailed you'd like to track this round.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          <button
            onClick={() => handleStartRound(course, 'score-only')} disabled={saving}
            style={{ ...card, padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.borderColor = color.green; e.currentTarget.style.boxShadow = '0 2px 12px rgba(18,55,31,0.08)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = color.border; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: color.ink, letterSpacing: '-0.02em', marginBottom: 5 }}>Score only</div>
            <div style={{ fontSize: 13.5, color: color.inkSoft, lineHeight: 1.5 }}>Just enter your score per hole. Fast and simple.</div>
          </button>

          <button
            onClick={() => handleStartRound(course, 'score-stats')} disabled={saving}
            style={{ background: color.green, border: `1px solid ${color.green}`, borderRadius: radius.lg, padding: '22px 24px', cursor: saving ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'background 0.15s', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 26px rgba(58,48,28,0.07)' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = color.greenDeep }}
            onMouseLeave={e => { e.currentTarget.style.background = color.green }}
          >
            <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, padding: '4px 11px', fontSize: 12, fontWeight: 600, color: color.onGreen }}>
              Recommended
            </div>
            <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: color.onGreen, letterSpacing: '-0.02em', marginBottom: 5 }}>Score + Stats</div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,250,241,0.6)', lineHeight: 1.5 }}>Track putts, fairways hit, and greens in regulation alongside your score.</div>
          </button>
        </div>

        {/* Date picker */}
        <div style={{ ...well, padding: '16px 20px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: color.inkSoft, textTransform: 'uppercase', marginBottom: 10 }}>
            Date played
          </label>
          <input
            type="date"
            value={roundDate}
            max={today}
            onChange={e => setRoundDate(e.target.value)}
            style={{ ...inputStyle, background: color.white }}
            onFocus={e => { e.currentTarget.style.borderColor = color.green }}
            onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
          />
          {roundDate !== today && (
            <p style={{ fontSize: 12, color: color.orange, marginTop: 8, marginBottom: 0 }}>
              Logging a past round — {formatDate(roundDate)}
            </p>
          )}
        </div>

        {saving && <p style={{ textAlign: 'center', color: color.inkSoft, fontSize: 13, marginTop: 20, fontFamily: font.body }}>Setting up your round…</p>}
        {saveError && <div style={errorBox}>{saveError}</div>}
        </div>
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
            <ChevronLeftIcon size={17} color={color.inkSoft} />All rounds
          </button>

          <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ background: color.green, padding: '22px 22px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid rgba(255,255,255,0.4)' : 'none', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,250,241,0.45)' }}>
                  {teeInfo.label} Tees · {formatDate(round.playedAt)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: font.display, fontSize: isMobile ? 16 : 20, fontWeight: 700, color: color.onGreen, letterSpacing: '-0.025em', marginBottom: 4 }}>
                    {round.courseName}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,250,241,0.45)' }}>Par {totalPar} · {round.holes} holes</div>
                </div>
                {diff !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...type.stat, fontSize: 32, color: color.onGreen }}>
                      {totalScore}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: diff === 0 ? 'rgba(255,250,241,0.7)' : diff > 0 ? color.orange : '#9FD4B4', marginTop: 2 }}>
                      {diff === 0 ? 'Even' : diff > 0 ? `+${diff}` : diff}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: color.border }} />

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
                  <div style={{ height: 1, background: color.border, margin: '8px 0' }} />
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

          <p style={{ textAlign: 'center', fontSize: 12, color: color.muted, marginBottom: 20, fontFamily: font.body }}>
            Tap any score cell to type your result
          </p>

          {saveError && <div style={errorBox}>{saveError}</div>}

          <button
            onClick={() => handleFinishRound(round, holes)} disabled={saving}
            style={{ ...primaryBtn(saving), marginTop: saveError ? 8 : 0 }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = color.greenDeep }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = color.green }}
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

    const recapMeta: RoundRecapMeta = {
      courseName: round.courseName,
      score: t.totalScore, par: t.totalPar, toPar: t.diff,
      holes: round.holes,
      girHoles: t.girHoles, girPossible: t.girPossible,
      fairways: t.fairways, fairwaysPossible: t.fairwaysPossible,
      putts: t.totalPutts, playedAt: round.playedAt,
      hasStats: statsMode === 'score-stats',
    }
    const isShared = sharedRoundId === round.id
    const shareRound = async () => {
      if (!user || sharing || isShared) return
      setSharing(true)
      try {
        const imageUrl = shareFile ? await uploadPostImage(user.id, shareFile) : null
        await createRoundPost(user.id, recapMeta, shareCaption, imageUrl)
        setSharedRoundId(round.id)
      }
      catch { /* ignore — feed degrades gracefully */ }
      finally { setSharing(false) }
    }
    const handleSharePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setShareFile(file)
      setSharePreview(URL.createObjectURL(file))
    }
    const clearSharePhoto = () => {
      if (sharePreview) URL.revokeObjectURL(sharePreview)
      setShareFile(null); setSharePreview(null)
    }

    return (
      <div ref={summaryRef} style={{ maxWidth: 720, margin: '0 auto', padding: `${isMobile ? 20 : 48}px ${isMobile ? 12 : 40}px ${isMobile ? 96 : 48}px` }}>
        <button style={backBtn} onClick={() => setPhase({ type: 'history' })}><ChevronLeftIcon size={17} color={color.inkSoft} />All rounds</button>

        <div style={{ background: color.green, borderRadius: radius.lg, padding: '36px 32px', marginBottom: 20, color: color.onGreen, boxShadow: t.diff < 0 ? '0 0 0 1px rgba(139,196,122,0.45), 0 12px 50px rgba(139,196,122,0.28)' : 'none', transition: 'box-shadow 0.4s ease' }}>
          {t.diff < 0 && (
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9FD4B4', marginBottom: 8 }}>
              Under par
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: teeInfo.color, border: teeInfo.id === 'white' ? '1px solid rgba(255,255,255,0.4)' : 'none' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,250,241,0.45)' }}>
              {round.courseName} · {formatDate(round.playedAt)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 12 }}>
            <div style={{ ...type.stat, fontSize: 72, color: color.onGreen }}>
              {t.totalScore}
            </div>
            <div style={{ paddingBottom: 10 }}>
              <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: t.diff === 0 ? color.onGreen : t.diff > 0 ? color.orange : '#9FD4B4', letterSpacing: '-0.02em' }}>
                {t.diff === 0 ? 'Even' : t.diff > 0 ? `+${t.diff}` : t.diff}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,250,241,0.45)', marginTop: 2 }}>vs par {totalPar}</div>
            </div>
          </div>
        </div>

        {isShared ? (
          <button
            disabled
            style={{
              width: '100%', marginBottom: 20, borderRadius: radius.md, padding: '14px',
              fontFamily: font.body, fontSize: 15, fontWeight: 600, cursor: 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: color.greenTint, color: color.positive, border: 'none',
            }}
          >
            ✓ Shared to your feed
          </button>
        ) : (
          <div style={{ ...cardSurface, padding: '16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {sharePreview ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={sharePreview} alt="" style={{ width: 64, height: 64, borderRadius: radius.sm, objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={clearSharePhoto}
                    aria-label="Remove photo"
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: color.ink, border: `1.5px solid ${color.sheet}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <CloseIcon size={9} color={color.sheet} />
                  </button>
                </div>
              ) : (
                <label style={{ width: 64, height: 64, borderRadius: radius.sm, border: `1.5px dashed ${color.borderStrong}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', flexShrink: 0, color: color.muted }}>
                  <CameraIcon size={16} color={color.muted} />
                  <span style={{ fontSize: 9, fontWeight: 600, fontFamily: font.body }}>Add photo</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSharePhoto} />
                </label>
              )}
              <input
                value={shareCaption}
                onChange={e => setShareCaption(e.target.value)}
                placeholder="Say something about the round…"
                style={{ flex: 1, ...well, padding: '11px 13px', fontSize: 16, color: color.ink, outline: 'none', fontFamily: font.body }}
              />
            </div>
            <button
              onClick={shareRound}
              disabled={sharing}
              style={{
                width: '100%', borderRadius: radius.md, padding: '14px',
                fontFamily: font.body, fontSize: 15, fontWeight: 600,
                cursor: sharing ? 'default' : 'pointer',
                background: color.green, color: color.onGreen, border: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {sharing ? 'Sharing…' : 'Share to feed'}
            </button>
          </div>
        )}

        {statsMode === 'score-stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
            {[
              { label: 'Putts', value: t.totalPutts || '—' },
              { label: 'Fairways', value: t.fairwaysPossible ? `${t.fairways}/${t.fairwaysPossible}` : '—' },
              { label: 'GIR', value: t.girPossible ? `${t.girHoles}/${t.girPossible}` : '—' },
            ].map(s => (
              <div key={s.label} style={{ ...card, padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: color.ink, letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: color.inkSoft, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...card, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: color.inkSoft, textTransform: 'uppercase', marginBottom: 14 }}>Scoring</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Eagles', count: scoreCounts.eagle, color: color.gold },
              { label: 'Birdies', count: scoreCounts.birdie, color: color.birdie },
              { label: 'Pars', count: scoreCounts.par, color: color.green },
              { label: 'Bogeys', count: scoreCounts.bogey, color: color.orange },
              { label: 'Double+', count: scoreCounts.double, color: color.danger },
            ].filter(x => x.count > 0).map(x => (
              <div key={x.label} style={{ background: x.color + '18', border: `1px solid ${x.color}40`, borderRadius: radius.pill, padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: x.color }}>{x.count}</span>
                <span style={{ fontSize: 12.5, color: color.inkSoft }}>{x.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ borderBottom: `1px solid ${color.border}`, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: color.inkSoft, textTransform: 'uppercase' }}>Scorecard</div>
          </div>
          <div style={{ padding: '12px 8px 12px' }}>
            <ScorecardHalf holes={front9} label="OUT" mode={statsMode as ScoringMode}
              editingHole={null} activeHole={null}
              onCellClick={() => {}} onScoreCommit={() => {}} interactive={false} />
            {round.holes === 18 && (
              <>
                <div style={{ height: 1, background: color.border, margin: '8px 0' }} />
                <ScorecardHalf holes={back9} label="IN" mode={statsMode as ScoringMode}
                  editingHole={null} activeHole={null}
                  onCellClick={() => {}} onScoreCommit={() => {}} interactive={false} />
              </>
            )}
          </div>
        </div>

        {struggle.length > 0 && (
          <div style={{ background: 'rgba(200,103,24,0.08)', border: '1px solid rgba(200,103,24,0.25)', borderRadius: radius.lg, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: color.orange, textTransform: 'uppercase', marginBottom: 12 }}>Holes to work on</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {struggle.map(s => (
                <div key={s.hole} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: color.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.onGreen, flexShrink: 0 }}>{s.hole}</div>
                  <div style={{ fontSize: 13.5, color: color.ink }}>
                    Averaging <strong>+{s.avg.toFixed(1)}</strong> over par across all rounds
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setPhase({ type: 'history' })}
          style={{
            width: '100%', background: color.green, color: color.onGreen,
            border: 'none', borderRadius: radius.md, padding: '15px',
            fontFamily: font.body, fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s, transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = color.greenDeep }}
          onMouseLeave={e => { e.currentTarget.style.background = color.green }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          Done
        </button>
      </div>
    )
  }

  return null
}
