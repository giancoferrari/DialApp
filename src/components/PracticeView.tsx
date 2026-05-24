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

const FOCUS_AREAS: { id: FocusArea; label: string; color: string }[] = [
  { id: 'driver',     label: 'Driver',      color: '#1F3A2A' },
  { id: 'woods',      label: 'Woods',       color: '#2E5240' },
  { id: 'irons',      label: 'Irons',       color: '#5C7A4D' },
  { id: 'short_game', label: 'Short Game',  color: '#8B9E6E' },
  { id: 'putting',    label: 'Putting',     color: '#D9824D' },
  { id: 'bunker',     label: 'Bunker',      color: '#C8A84B' },
]

const focusColor = (id: FocusArea) => FOCUS_AREAS.find(f => f.id === id)?.color ?? '#1F3A2A'
const focusLabel = (id: FocusArea) => FOCUS_AREAS.find(f => f.id === id)?.label ?? id

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          onClick={() => onChange?.(n)}
          style={{
            fontSize: 24, cursor: onChange ? 'pointer' : 'default',
            color: n <= value ? '#D9824D' : '#E0D8C5',
            transition: 'color 0.12s',
            lineHeight: 1,
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
  const [modalOpen, setModalOpen]   = useState(false)
  const [filter, setFilter]         = useState<FocusArea | 'all'>('all')
  const [focusArea, setFocusArea]   = useState<FocusArea>('irons')
  const [notes, setNotes]           = useState('')
  const [rating, setRating]         = useState<number>(3)
  const [date, setDate]             = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.focusArea === filter)

  const openModal = () => {
    setFocusArea('irons'); setNotes(''); setRating(3)
    setDate(new Date().toISOString().split('T')[0])
    setError(null); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true); setError(null)
    try {
      const s = await insertPracticeSession(user.id, focusArea, notes.trim() || null, rating as 1|2|3|4|5, date)
      onSave(s)
      setModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Failed to save session. Please check your connection and try again.')
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { await deletePracticeSession(id); onDelete(id) } catch { /* silent */ }
  }

  const px = isMobile ? 16 : 40

  const card: React.CSSProperties = {
    background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20,
  }

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 48}px` }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 8 }}>
            Practice Log
          </div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 28 : 38, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.03em', margin: 0 }}>
            Range sessions.
          </h1>
        </div>
        <button
          onClick={openModal}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1F3A2A', color: '#FAF6EA', border: 'none',
            borderRadius: 999, padding: '10px 18px 10px 20px',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap',
          }}
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
              border: '1px solid', borderRadius: 999, padding: '7px 16px',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              background: filter === f.id ? '#1F3A2A' : 'transparent',
              color: filter === f.id ? '#FAF6EA' : '#1F1D17',
              borderColor: filter === f.id ? '#1F3A2A' : '#E0D8C5',
              transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div style={{ ...card, padding: '56px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', marginBottom: 8 }}>
            No sessions yet
          </div>
          <p style={{ fontSize: 14, color: '#6B6857' }}>Log your first range session to start tracking your practice.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ ...card, padding: isMobile ? '14px 16px' : '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: focusColor(s.focusArea),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 11, fontWeight: 700, color: '#FAF6EA', letterSpacing: '0.02em',
                textAlign: 'center',
              }}>
                {s.focusArea === 'short_game' ? 'SG' : focusLabel(s.focusArea).slice(0, 2).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: s.notes ? 4 : 0, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>
                    {focusLabel(s.focusArea)}
                  </span>
                  <span style={{ fontSize: 12, color: '#B5AC95' }}>·</span>
                  <span style={{ fontSize: 12, color: '#6B6857' }}>{formatDate(s.sessionDate)}</span>
                </div>
                {s.notes && (
                  <div style={{ fontSize: 13, color: '#6B6857', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</div>
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

      {/* Log session modal */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(31,29,23,0.55)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: isMobile ? '100%' : 480,
              background: '#FAF6EA',
              borderRadius: isMobile ? '24px 24px 0 0' : 28,
              border: '1px solid #E0D8C5',
              boxShadow: '0 40px 80px rgba(0,0,0,0.2)',
              animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
              maxHeight: isMobile ? '92vh' : 'auto',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px 16px', borderBottom: '1px solid #E0D8C5', flexShrink: 0,
            }}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.025em' }}>
                Log session
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <CloseIcon size={14} color="#1F1D17" />
              </button>
            </div>

            <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Focus area */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 10 }}>Focus area</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {FOCUS_AREAS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFocusArea(f.id)}
                      style={{
                        border: '1px solid', borderRadius: 12, padding: '10px 8px',
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13, fontWeight: 500,
                        background: focusArea === f.id ? f.color : 'transparent',
                        color: focusArea === f.id ? '#FAF6EA' : '#1F1D17',
                        borderColor: focusArea === f.id ? f.color : '#E0D8C5',
                        transition: 'all 0.15s',
                        minHeight: 44,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 8 }}>Date</label>
                <input
                  type="date" value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#1F1D17', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                />
              </div>

              {/* Rating */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 10 }}>Session rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 8 }}>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What did you work on?"
                  rows={3}
                  style={{ width: '100%', background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#1F1D17', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#C0392B', lineHeight: 1.45 }}>
                  <strong>Error:</strong> {error}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%', background: saving ? '#C9C0A8' : '#1F3A2A',
                  color: '#FAF6EA', border: 'none', borderRadius: 999,
                  padding: '14px', fontSize: 14, fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s',
                  minHeight: 48,
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
