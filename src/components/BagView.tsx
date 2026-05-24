import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { Shot, Club, ClubCat } from '../types'
import { CLUBS_DATA, CAT_LABELS, BAR_MAX, getClubLast } from '../data'
import FlagPin from './FlagPin'
import OrganicGraphic from './OrganicGraphic'
import ClubBadge from './ClubBadge'

gsap.registerPlugin(useGSAP)

const CUSTOM_CLUBS_KEY = 'dial_custom_clubs'

function loadCustomClubs(): Club[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CLUBS_KEY)
    return raw ? (JSON.parse(raw) as Club[]) : []
  } catch { return [] }
}

function saveCustomClubs(clubs: Club[]): void {
  try { localStorage.setItem(CUSTOM_CLUBS_KEY, JSON.stringify(clubs)) } catch {}
}

// ── Add Club Modal ────────────────────────────────────────────────────────────
interface AddClubModalProps {
  onAdd: (club: Club) => void
  onClose: () => void
  isMobile?: boolean
}

function AddClubModal({ onAdd, onClose, isMobile = false }: AddClubModalProps) {
  const [name, setName]   = useState('')
  const [abbr, setAbbr]   = useState('')
  const [cat, setCat]     = useState<ClubCat>('irons')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedAbbr = abbr.trim().toUpperCase().slice(0, 4)
    if (!trimmedName) { setError('Club name is required.'); return }
    if (!trimmedAbbr) { setError('Abbreviation is required.'); return }
    const id = `custom_${trimmedName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
    onAdd({ id, name: trimmedName, abbr: trimmedAbbr, cat })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#FAF6EA', border: '1px solid #E0D8C5',
    borderRadius: 14, padding: '13px 16px', fontSize: 15, color: '#1F1D17',
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(31,29,23,0.55)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#F0EBDD', borderRadius: 28, padding: isMobile ? '28px 24px' : '36px 40px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(31,58,42,0.2)' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.025em', marginBottom: 6 }}>
          Add a club
        </div>
        <p style={{ fontSize: 14, color: '#6B6857', marginBottom: 24, lineHeight: 1.5, marginTop: 0 }}>
          Add any club not in the standard list.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text" placeholder="Club name (e.g. 2 Iron)" value={name} autoFocus
            onChange={e => setName(e.target.value)}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
          />
          <input
            type="text" placeholder="Abbreviation (e.g. 2I)" value={abbr} maxLength={4}
            onChange={e => setAbbr(e.target.value.toUpperCase().slice(0, 4))}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
          />
          <select
            value={cat}
            onChange={e => setCat(e.target.value as ClubCat)}
            style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B6857' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', paddingRight: 40, cursor: 'pointer' } as React.CSSProperties}
          >
            {(Object.entries(CAT_LABELS) as [ClubCat, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {error && (
            <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, background: 'transparent', border: '1px solid #E0D8C5', borderRadius: 999, padding: '13px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#6B6857' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ flex: 2, background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '13px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Add club
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Club Distance Card ────────────────────────────────────────────────────────
interface CardProps {
  club: Club
  distance: number | null
  isCustom?: boolean
  onSave: (yardage: number) => Promise<void>
  onDelete?: () => void
  isMobile?: boolean
}

function ClubDistanceCard({ club, distance, isCustom = false, onSave, onDelete, isMobile = false }: CardProps) {
  const [editing, setEditing]   = useState(false)
  const [inputVal, setInputVal] = useState(distance != null ? String(distance) : '')
  const [saving, setSaving]     = useState(false)
  const [hover, setHover]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pct = distance ? Math.min((distance / BAR_MAX) * 100, 100) : 0

  const startEdit = () => {
    setInputVal(distance != null ? String(distance) : '')
    setEditing(true)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }

  const commit = async () => {
    const val = parseInt(inputVal, 10)
    if (!isNaN(val) && val > 0 && val <= 500) {
      setSaving(true)
      try { await onSave(val) } catch {}
      setSaving(false)
    }
    setEditing(false)
  }

  const cancel = () => {
    setEditing(false)
    setInputVal(distance != null ? String(distance) : '')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') cancel()
  }

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={!editing ? startEdit : undefined}
      style={{
        background: '#FAF6EA', border: editing ? '1px solid #1F3A2A' : '1px solid #E0D8C5',
        borderRadius: isMobile ? 16 : 24, padding: isMobile ? 14 : 24,
        cursor: editing ? 'default' : 'pointer', position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: hover && !editing ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: editing
          ? '0 0 0 3px rgba(31,58,42,0.15)'
          : hover ? '0 16px 36px rgba(31,58,42,0.10)' : 'none',
      }}
    >
      {/* Top row: badge + category pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 10 : 18 }}>
        <ClubBadge abbr={club.abbr} size={isMobile ? 44 : 52} variant={hover || editing ? 'sage' : 'default'} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
            color: '#6B6857', textTransform: 'uppercase',
            background: '#F0EBDD', padding: '4px 10px', borderRadius: 999,
          }}>
            {CAT_LABELS[club.cat]}
          </span>
          {isCustom && onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              title="Remove club"
              style={{
                width: 22, height: 22, borderRadius: '50%', border: 'none',
                background: '#F0EBDD', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#B5AC95', fontSize: 15, lineHeight: 1, transition: 'all 0.15s',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Club name */}
      <h3 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: isMobile ? 14 : 20, fontWeight: 700, color: '#1F1D17',
        letterSpacing: '-0.025em', marginBottom: isMobile ? 8 : 14,
        lineHeight: 1, marginTop: 0,
      }}>
        {club.name}
      </h3>

      {/* Distance display / inline edit */}
      <div
        style={{ marginBottom: 14, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'flex-end', gap: 6 }}
        onClick={e => { if (editing) e.stopPropagation() }}
      >
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputVal}
              onChange={e => setInputVal(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              style={{
                width: isMobile ? 80 : 100, background: 'transparent', border: 'none',
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: isMobile ? 36 : 52, fontWeight: 700, lineHeight: 0.9,
                color: '#1F3A2A', letterSpacing: '-0.04em', outline: 'none', padding: 0,
              }}
            />
            <span style={{ fontSize: 13, color: '#6B6857', paddingBottom: isMobile ? 5 : 8, fontWeight: 500 }}>yds</span>
          </>
        ) : distance != null ? (
          <>
            <span style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: isMobile ? 36 : 52, fontWeight: 700, lineHeight: 0.9,
              color: saving ? '#B5AC95' : '#1F3A2A', letterSpacing: '-0.04em',
              transition: 'color 0.15s',
            }}>
              {saving ? '…' : distance}
            </span>
            <span style={{ fontSize: 13, color: '#6B6857', paddingBottom: isMobile ? 5 : 8, fontWeight: 500 }}>yds</span>
          </>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            <div style={{ fontSize: isMobile ? 12 : 14, color: '#B5AC95', fontWeight: 400, fontFamily: "'DM Sans', sans-serif" }}>
              Tap to set distance
            </div>
          </div>
        )}
      </div>

      {/* Distance bar */}
      <div style={{ height: 4, background: '#F0EBDD', borderRadius: 2, position: 'relative' }}>
        {distance != null && (
          <>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
              background: 'linear-gradient(90deg, rgba(31,58,42,0.3), #1F3A2A)',
              borderRadius: 2,
            }} />
            <div style={{
              position: 'absolute', left: `${pct}%`, top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 10, height: 10, borderRadius: 5,
              background: '#D9824D', boxShadow: '0 0 0 3px #FAF6EA',
            }} />
          </>
        )}
      </div>
    </article>
  )
}

// ── Main BagView ──────────────────────────────────────────────────────────────
interface Props {
  shots: Shot[]
  onSetDistance: (clubId: string, yardage: number) => Promise<void>
  isMobile?: boolean
}

const ALL_CATS: Array<ClubCat | 'all'> = ['all', 'woods', 'hybrids', 'irons', 'wedges']

export default function BagView({ shots, onSetDistance, isMobile = false }: Props) {
  const [filter, setFilter]         = useState<ClubCat | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [customClubs, setCustomClubs]   = useState<Club[]>(() => loadCustomClubs())
  const containerRef   = useRef<HTMLElement>(null)
  const headerLeftRef  = useRef<HTMLDivElement>(null)
  const headerRightRef = useRef<HTMLDivElement>(null)
  const gridRef        = useRef<HTMLDivElement>(null)

  const allClubs  = [...CLUBS_DATA, ...customClubs]
  const customIds = new Set(customClubs.map(c => c.id))
  const filtered  = allClubs.filter(c => filter === 'all' || c.cat === filter)

  const handleAddClub = (club: Club) => {
    const updated = [...customClubs, club]
    setCustomClubs(updated)
    saveCustomClubs(updated)
    setShowAddModal(false)
  }

  const handleDeleteClub = (id: string) => {
    const updated = customClubs.filter(c => c.id !== id)
    setCustomClubs(updated)
    saveCustomClubs(updated)
  }

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (headerLeftRef.current) {
        gsap.fromTo(
          headerLeftRef.current.children,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power3.out', delay: 0.05 }
        )
      }
      if (headerRightRef.current) {
        gsap.fromTo(
          headerRightRef.current,
          { opacity: 0, scale: 0.92, x: 20 },
          { opacity: 1, scale: 1, x: 0, duration: 0.7, ease: 'power3.out', delay: 0.2 }
        )
      }
    })
    return () => mm.revert()
  }, { scope: containerRef })

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.club-card')
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.055, ease: 'power3.out' }
        )
      }
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [filter] })

  const px = isMobile ? 16 : 40
  const catCount = (cat: ClubCat | 'all') =>
    cat === 'all' ? allClubs.length : allClubs.filter(c => c.cat === cat).length

  return (
    <main ref={containerRef} style={{ maxWidth: 1320, margin: '0 auto', padding: `${isMobile ? 24 : 48}px ${px}px ${isMobile ? 96 : 96}px` }}>
      {showAddModal && (
        <AddClubModal
          onAdd={handleAddClub}
          onClose={() => setShowAddModal(false)}
          isMobile={isMobile}
        />
      )}

      {/* Header */}
      <section style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? 0 : 64,
        alignItems: 'center', marginBottom: isMobile ? 20 : 48,
      }}>
        <div ref={headerLeftRef}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
            color: '#D9824D', textTransform: 'uppercase', marginBottom: 12,
          }}>
            <FlagPin size={12} /> Your bag
          </div>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: isMobile ? 44 : 76, fontWeight: 700, lineHeight: 0.95,
            letterSpacing: '-0.04em', color: '#1F1D17',
            marginBottom: isMobile ? 12 : 20, marginTop: 0,
          }}>
            <span style={{ color: '#1F3A2A' }}>Every</span>
            <span style={{ color: '#D9824D' }}> club,</span>
            <br />
            <span style={{ fontStyle: 'italic', color: '#5C7A4D', fontWeight: 400 }}>every</span>
            <span style={{ color: '#1F3A2A' }}> yard.</span>
          </h1>
          <p style={{
            fontSize: 16, lineHeight: 1.5, color: '#6B6857',
            maxWidth: 480, fontWeight: 400, margin: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            One distance per club. Tap any card to update yours.
          </p>
        </div>
        <div ref={headerRightRef} style={{ display: isMobile ? 'none' : 'flex', justifyContent: 'flex-end' }}>
          <OrganicGraphic size={280} />
        </div>
      </section>

      {/* Filter pills + Add club button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, overflowX: isMobile ? 'auto' : 'visible', flexWrap: isMobile ? 'nowrap' : 'wrap', paddingBottom: isMobile ? 4 : 0, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {ALL_CATS.map(cat => {
          const active = filter === cat
          const label  = cat === 'all' ? 'All clubs' : CAT_LABELS[cat]
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: '1px solid', borderColor: active ? '#1F3A2A' : '#E0D8C5',
                background: active ? '#1F3A2A' : '#FAF6EA',
                color: active ? '#FAF6EA' : '#1F1D17',
                borderRadius: 999, padding: isMobile ? '7px 12px' : '9px 16px',
                fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 12.5 : 13.5, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' as const, flexShrink: 0,
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {label}
              <span style={{ fontSize: 11, color: active ? '#B5C29A' : '#6B6857', fontWeight: 500 }}>
                {catCount(cat)}
              </span>
            </button>
          )
        })}
        <div style={{ flex: 1, minWidth: isMobile ? 8 : 0 }} />
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: '1px solid #D9824D', background: 'transparent', color: '#D9824D',
            borderRadius: 999, padding: isMobile ? '7px 12px' : '9px 16px',
            fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 12.5 : 13.5, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' as const, flexShrink: 0,
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          + Add club
        </button>
      </div>

      {/* Club grid */}
      <div
        ref={gridRef}
        style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 16 }}
      >
        {filtered.map(club => (
          <div key={club.id} className="club-card">
            <ClubDistanceCard
              club={club}
              distance={getClubLast(shots, club.id)}
              isCustom={customIds.has(club.id)}
              onSave={yardage => onSetDistance(club.id, yardage)}
              onDelete={customIds.has(club.id) ? () => handleDeleteClub(club.id) : undefined}
              isMobile={isMobile}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
