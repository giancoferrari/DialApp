import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { insertPracticeSession, deletePracticeSession } from '../lib/practice'
import type { PracticeSession, FocusArea } from '../types'
import { CloseIcon, PlusIcon } from './Icons'

interface Props {
  sessions: PracticeSession[]
  onSave: (s: PracticeSession) => void
  onDelete: (id: string) => void
  isMobile?: boolean
}

const FOCUS_AREAS: { id: FocusArea; label: string; emoji: string }[] = [
  { id: 'driver',     label: 'Driver',     emoji: '🏌️' },
  { id: 'woods',      label: 'Woods',      emoji: '🌲' },
  { id: 'irons',      label: 'Irons',      emoji: '⛳' },
  { id: 'short_game', label: 'Short Game', emoji: '🎯' },
  { id: 'putting',    label: 'Putting',    emoji: '🏳️' },
  { id: 'bunker',     label: 'Bunker',     emoji: '🏖️' },
]

const FOCUS_COLORS: Record<FocusArea, string> = {
  driver:     '#1F3A2A',
  woods:      '#2E5240',
  irons:      '#5C7A4D',
  short_game: '#8B9E6E',
  putting:    '#D9824D',
  bunker:     '#C8A84B',
}

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
            fontSize: 28, cursor: onChange ? 'pointer' : 'default',
            color: n <= (hover || value) ? '#D9824D' : '#E0D8C5',
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

  const px = isMobile ? 16 : 40

  const card: React.CSSProperties = {
    background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    color: '#4A4235', textTransform: 'uppercase', marginBottom: 10,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#FAF6EA', border: '1px solid #E0D8C5',
    borderRadius: 14, padding: '13px 16px', fontSize: 15, color: '#1F1D17',
    outline: 'none', boxSizing: 'border-box', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 8 }}>
            Practice Log
          </div>
          <h1 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: isMobile ? 28 : 38, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: 0 }}>
            Range sessions.
          </h1>
        </div>
        <button
          onClick={openModal}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '10px 18px 10px 20px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13.5, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#16271D' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1F3A2A' }}
        >
          Log session
          <span style={{ width: 22, height: 22, borderRadius: 11, background: '#D9824D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusIcon size={14} color="#FAF6EA" />
          </span>
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {[{ id: 'all', label: 'All sessions' }, ...FOCUS_AREAS.map(f => ({ id: f.id, label: f.label }))].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as FocusArea | 'all')}
            style={{
              border: '1px solid', borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
              background: filter === f.id ? '#1F3A2A' : 'transparent',
              color: filter === f.id ? '#FAF6EA' : '#1F1D17',
              borderColor: filter === f.id ? '#1F3A2A' : '#E0D8C5',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div style={{ ...card, padding: '56px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', marginBottom: 8 }}>
            No sessions yet
          </div>
          <p style={{ fontSize: 14, color: '#4A4235', margin: 0 }}>Log your first range session to start tracking your practice.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ ...card, padding: isMobile ? '14px 16px' : '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: FOCUS_COLORS[s.focusArea],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: 11, fontWeight: 700, color: '#FAF6EA', letterSpacing: '0.02em',
              }}>
                {s.focusArea === 'short_game' ? 'SG' : focusLabel(s.focusArea).slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: s.notes ? 4 : 0, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>
                    {focusLabel(s.focusArea)}
                  </span>
                  <span style={{ fontSize: 12, color: '#6B5F4E' }}>·</span>
                  <span style={{ fontSize: 12, color: '#4A4235' }}>{formatDate(s.sessionDate)}</span>
                </div>
                {s.notes && (
                  <div style={{ fontSize: 13, color: '#4A4235', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <StarRating value={s.rating} />
                <button
                  onClick={() => handleDelete(s.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.35, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.35' }}
                >
                  <CloseIcon size={14} color="#1F1D17" />
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
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(31,29,23,0.55)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? 0 : 40,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: isMobile ? '100%' : 500,
              background: '#F0EBDD',
              borderRadius: isMobile ? '28px 28px 0 0' : 28,
              border: '1px solid #E0D8C5',
              boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
              maxHeight: isMobile ? '94vh' : 'calc(100vh - 80px)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 2, flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: '#8B8272' }} />
              </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '14px 20px 16px' : '28px 32px 20px', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 5 }}>
                  Practice Log
                </div>
                <h2 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>
                  Log a session
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ width: 36, height: 36, borderRadius: 18, background: '#FAF6EA', border: '1px solid #E0D8C5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#E0D8C5' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FAF6EA' }}
              >
                <CloseIcon size={14} color="#1F1D17" />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '4px 20px 0' : '4px 32px 0', display: 'flex', flexDirection: 'column', gap: 20 } as React.CSSProperties}>

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
                        style={{
                          border: '1px solid', borderRadius: 14, padding: '11px 8px',
                          cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                          fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                          minHeight: 46,
                          background: active ? FOCUS_COLORS[f.id] : '#FAF6EA',
                          color: active ? '#FAF6EA' : '#1F1D17',
                          borderColor: active ? FOCUS_COLORS[f.id] : '#E0D8C5',
                          boxShadow: active ? `0 4px 12px ${FOCUS_COLORS[f.id]}30` : 'none',
                        }}
                        onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#8B8272'; e.currentTarget.style.background = '#F5F0E4' } }}
                        onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#E0D8C5'; e.currentTarget.style.background = '#FAF6EA' } }}
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
                  onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                />
              </div>

              {/* Rating */}
              <div>
                <label style={labelStyle}>Session rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0, color: '#6B5F4E' }}>(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What did you work on?"
                  rows={3}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.55, paddingTop: 13, paddingBottom: 13 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: '#D9824D', lineHeight: 1.45 }}>
                  {error}
                </div>
              )}

              {/* Spacer so content doesn't flush against the save button */}
              <div style={{ height: 4 }} />
            </div>

            {/* Save button — pinned at bottom */}
            <div style={{ padding: isMobile ? '14px 20px 32px' : '16px 32px 28px', borderTop: '1px solid #E0D8C5', background: '#F0EBDD', flexShrink: 0 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%', background: saving ? '#8B8272' : '#1F3A2A',
                  color: '#FAF6EA', border: 'none', borderRadius: 999,
                  padding: '15px', fontSize: 15, fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#16271D' }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#1F3A2A' }}
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

