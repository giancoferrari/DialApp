import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { insertPracticeSession, deletePracticeSession } from '../lib/practice'
import type { PracticeSession, FocusArea } from '../types'
import { CloseIcon, PlusIcon } from './Icons'
import { color, font, radius, elevation } from '../lib/tokens'
import { card as cardSurface } from '../lib/surfaces'

interface Props {
  sessions: PracticeSession[]
  onSave: (s: PracticeSession) => void
  onDelete: (id: string) => void
  isMobile?: boolean
}

const FOCUS_AREAS: { id: FocusArea; label: string }[] = [
  { id: 'driver',     label: 'Driver'     },
  { id: 'woods',      label: 'Woods'      },
  { id: 'irons',      label: 'Irons'      },
  { id: 'short_game', label: 'Short game' },
  { id: 'putting',    label: 'Putting'    },
  { id: 'bunker',     label: 'Bunker'     },
]

const focusLabel = (id: FocusArea) => FOCUS_AREAS.find(f => f.id === id)?.label ?? id

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{
            fontSize: onChange ? 28 : 16, cursor: onChange ? 'pointer' : 'default',
            color: n <= (hover || value) ? color.gold : color.borderStrong,
            transition: 'color 0.1s', lineHeight: 1, display: 'inline-block',
          }}
        >★</span>
      ))}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PracticeView({ sessions, onSave, onDelete, isMobile = false }: Props) {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter]       = useState<FocusArea | 'all'>('all')
  const [focusArea, setFocusArea] = useState<FocusArea>('irons')
  const [notes, setNotes]         = useState('')
  const [rating, setRating]       = useState<number>(3)
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const today    = new Date().toISOString().split('T')[0]
  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.focusArea === filter)

  const openModal = () => {
    setFocusArea('irons'); setNotes(''); setRating(3)
    setDate(today); setError(null); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true); setError(null)
    try {
      const s = await insertPracticeSession(user.id, focusArea, notes.trim() || null, rating as 1|2|3|4|5, date)
      onSave(s); setModalOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save. Check your connection.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { await deletePracticeSession(id); onDelete(id) } catch { /* silent */ }
  }

  const px = isMobile ? 20 : 40

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 10 }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: color.white, border: `1px solid ${color.borderStrong}`,
    borderRadius: radius.sm, padding: '13px 14px', fontSize: 16, color: color.ink,
    outline: 'none', boxSizing: 'border-box', fontFamily: font.body, transition: 'border-color 0.15s',
  }

  const chip = (active: boolean): React.CSSProperties => ({
    border: `1px solid ${active ? color.green : color.border}`, borderRadius: 999, padding: '7px 15px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font.body, whiteSpace: 'nowrap', flexShrink: 0,
    transition: 'all 0.15s', background: active ? color.green : color.white, color: active ? color.onGreen : color.inkSoft,
  })

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: `${isMobile ? 28 : 44}px ${px}px ${isMobile ? 110 : 64}px` }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: font.display, fontSize: isMobile ? 30 : 36, fontWeight: 600, color: color.ink, letterSpacing: '-0.02em', margin: '0 0 4px', lineHeight: 1 }}>
            Practice
          </h1>
          <p style={{ fontSize: 14, color: color.muted, margin: 0 }}>Track your range and short-game work.</p>
        </div>
        <button
          onClick={openModal}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '10px 16px', fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = color.greenDeep }}
          onMouseLeave={e => { e.currentTarget.style.background = color.green }}
        >
          <PlusIcon size={14} color={color.onGreen} /> Log
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {[{ id: 'all', label: 'All' }, ...FOCUS_AREAS.map(f => ({ id: f.id, label: f.label }))].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as FocusArea | 'all')} style={chip(filter === f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div style={{ ...cardSurface, padding: '48px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 600, color: color.ink, marginBottom: 8 }}>
            No sessions yet
          </div>
          <p style={{ fontSize: 14, color: color.muted, margin: 0 }}>Log your first range session to start tracking your practice.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ ...cardSurface, padding: isMobile ? '14px 16px' : '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: radius.sm, flexShrink: 0, background: color.greenTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.display, fontSize: 12, fontWeight: 600, color: color.green }}>
                {s.focusArea === 'short_game' ? 'SG' : focusLabel(s.focusArea).slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: s.notes ? 4 : 0, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: font.body, fontSize: 15, fontWeight: 600, color: color.ink }}>
                    {focusLabel(s.focusArea)}
                  </span>
                  <span style={{ fontSize: 12, color: color.faint }}>·</span>
                  <span style={{ fontSize: 12, color: color.muted }}>{formatDate(s.sessionDate)}</span>
                </div>
                {s.notes && (
                  <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <StarRating value={s.rating} />
                <button
                  onClick={() => handleDelete(s.id)}
                  aria-label="Delete session"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.4, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.4' }}
                >
                  <CloseIcon size={14} color={color.inkSoft} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log Session Modal ────────────────────────────────── */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(23,26,23,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 40, animation: 'fadeIn 0.2s ease' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: isMobile ? '100%' : 480, background: color.white, borderRadius: isMobile ? '24px 24px 0 0' : radius.sheet, boxShadow: elevation.lg, maxHeight: isMobile ? '94vh' : 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: color.borderStrong }} />
              </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '14px 20px 14px' : '24px 28px 16px', flexShrink: 0 }}>
              <h2 style={{ fontFamily: font.display, fontSize: isMobile ? 20 : 22, fontWeight: 600, color: color.ink, letterSpacing: '-0.02em', margin: 0 }}>
                Log a session
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                style={{ width: 32, height: 32, borderRadius: 16, background: color.sand, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <CloseIcon size={14} color={color.inkSoft} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '4px 20px 0' : '4px 28px 0', display: 'flex', flexDirection: 'column', gap: 20 } as React.CSSProperties}>

              {/* Focus area */}
              <div>
                <label style={labelStyle}>Focus area</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {FOCUS_AREAS.map(f => {
                    const active = focusArea === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFocusArea(f.id)}
                        style={{ border: `1px solid ${active ? color.green : color.border}`, borderRadius: radius.sm, padding: '11px 8px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 600, transition: 'all 0.15s', minHeight: 46, background: active ? color.green : color.white, color: active ? color.onGreen : color.ink }}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date */}
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date" value={date} max={today}
                  onChange={e => setDate(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                  onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                />
              </div>

              {/* Rating */}
              <div>
                <label style={labelStyle}>Session rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: color.muted }}>(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What did you work on?"
                  rows={3}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.55, paddingTop: 13, paddingBottom: 13 }}
                  onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                  onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                />
              </div>

              {error && (
                <div style={{ background: '#FBEDEB', border: '1px solid #EFCBC5', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: color.dangerDeep, lineHeight: 1.45 }}>
                  {error}
                </div>
              )}

              <div style={{ height: 4 }} />
            </div>

            {/* Save button — pinned at bottom */}
            <div style={{ padding: isMobile ? '14px 20px calc(env(safe-area-inset-bottom) + 16px)' : '16px 28px 24px', borderTop: `1px solid ${color.border}`, background: color.white, flexShrink: 0 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ width: '100%', background: saving ? color.borderStrong : color.green, color: saving ? color.inkSoft : color.onGreen, border: 'none', borderRadius: radius.md, padding: '15px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: font.body, transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = color.greenDeep }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = color.green }}
              >
                {saving ? 'Saving…' : 'Save session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
