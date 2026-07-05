import { useRef, useState } from 'react'
import type { Shot, Club, ClubCat } from '../types'
import { CLUBS_DATA, CAT_LABELS, BAR_MAX, getClubLast } from '../data'
import ClubBadge from './ClubBadge'
import { PlusIcon, CloseIcon } from './Icons'
import PageHeader from './PageHeader'
import { useStaggerMount } from '../hooks/useStaggerMount'
import { color, font, radius, elevation, page } from '../lib/tokens'
import { card as cardSurface } from '../lib/surfaces'

const CUSTOM_CLUBS_KEY = 'dial_custom_clubs'

function loadCustomClubs(): Club[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CLUBS_KEY)
    return raw ? (JSON.parse(raw) as Club[]) : []
  } catch { return [] }
}

function saveCustomClubs(clubs: Club[]): void {
  try { localStorage.setItem(CUSTOM_CLUBS_KEY, JSON.stringify(clubs)) } catch { /* storage unavailable (private mode) */ }
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
    width: '100%', background: color.white, border: `1px solid ${color.borderStrong}`,
    borderRadius: radius.sm, padding: '13px 14px', fontSize: 16, color: color.ink,
    fontFamily: font.body, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(23,26,23,0.45)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20, animation: 'fadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: color.white, borderRadius: isMobile ? '24px 24px 0 0' : radius.sheet, padding: '28px 28px 24px', width: '100%', maxWidth: 420, boxShadow: elevation.lg, animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: color.ink, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Add a club
        </div>
        <p style={{ fontSize: 14, color: color.muted, marginBottom: 22, lineHeight: 1.5, marginTop: 0 }}>
          Add any club not in the standard list.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text" placeholder="Club name (e.g. 2 Iron)" value={name} autoFocus
            onChange={e => setName(e.target.value)}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = color.green }}
            onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
          />
          <input
            type="text" placeholder="Abbreviation (e.g. 2I)" value={abbr} maxLength={4}
            onChange={e => setAbbr(e.target.value.toUpperCase().slice(0, 4))}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = color.green }}
            onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
          />
          <select
            value={cat}
            onChange={e => setCat(e.target.value as ClubCat)}
            style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239AA09A' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', paddingRight: 40, cursor: 'pointer' } as React.CSSProperties}
          >
            {(Object.entries(CAT_LABELS) as [ClubCat, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {error && (
            <div style={{ background: '#FBEDEB', border: '1px solid #EFCBC5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: color.dangerDeep }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, background: color.sand, border: 'none', borderRadius: radius.md, padding: '13px', fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: color.inkSoft }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ flex: 2, background: color.green, color: color.onGreen, border: 'none', borderRadius: radius.md, padding: '13px', fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
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
      try { await onSave(val) } catch { /* keep editing state; surfaced upstream */ }
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
      onClick={!editing ? startEdit : undefined}
      style={{
        ...cardSurface,
        border: `1px solid ${editing ? color.green : color.border}`,
        boxShadow: editing ? `0 0 0 3px rgba(30,77,56,0.13)` : 'none',
        padding: isMobile ? 14 : 18,
        cursor: editing ? 'default' : 'pointer', position: 'relative',
        transition: 'border-color 0.18s, box-shadow 0.18s',
      }}
    >
      {/* Top row: badge + category */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 12 : 16 }}>
        <ClubBadge abbr={club.abbr} size={isMobile ? 42 : 48} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: color.muted, background: color.sand, padding: '4px 10px', borderRadius: 999 }}>
            {CAT_LABELS[club.cat]}
          </span>
          {isCustom && onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              aria-label="Remove club"
              style={{ width: 22, height: 22, borderRadius: 11, border: 'none', background: color.sand, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CloseIcon size={11} color={color.muted} />
            </button>
          )}
        </div>
      </div>

      {/* Club name */}
      <h3 style={{ fontFamily: font.body, fontSize: isMobile ? 14 : 15, fontWeight: 600, color: color.ink, letterSpacing: '-0.01em', marginBottom: isMobile ? 6 : 10, lineHeight: 1.1, marginTop: 0 }}>
        {club.name}
      </h3>

      {/* Distance display / inline edit */}
      <div
        style={{ marginBottom: 12, minHeight: isMobile ? 40 : 50, display: 'flex', alignItems: 'flex-end', gap: 5 }}
        onClick={e => { if (editing) e.stopPropagation() }}
      >
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text" inputMode="numeric" pattern="[0-9]*"
              value={inputVal}
              onChange={e => setInputVal(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              style={{ width: isMobile ? 70 : 90, background: 'transparent', border: 'none', fontFamily: font.display, fontSize: isMobile ? 36 : 46, fontWeight: 600, lineHeight: 0.9, color: color.green, letterSpacing: '-0.02em', outline: 'none', padding: 0 }}
            />
            <span style={{ fontSize: 13, color: color.muted, paddingBottom: isMobile ? 5 : 7, fontWeight: 500 }}>yds</span>
          </>
        ) : distance != null ? (
          <>
            <span style={{ fontFamily: font.display, fontSize: isMobile ? 36 : 46, fontWeight: 600, lineHeight: 0.9, color: saving ? color.muted : color.ink, letterSpacing: '-0.02em', transition: 'color 0.15s', fontVariantNumeric: 'tabular-nums' }}>
              {saving ? '…' : distance}
            </span>
            <span style={{ fontSize: 13, color: color.muted, paddingBottom: isMobile ? 5 : 7, fontWeight: 500 }}>yds</span>
          </>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            <div style={{ fontSize: isMobile ? 13 : 14, color: color.faint, fontWeight: 400, fontFamily: font.body }}>
              Tap to set distance
            </div>
          </div>
        )}
      </div>

      {/* Distance bar */}
      <div style={{ height: 4, background: color.sand, borderRadius: 2, position: 'relative' }}>
        {distance != null && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color.green, borderRadius: 2 }} />
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
  const containerRef = useRef<HTMLElement>(null)
  const gridRef      = useRef<HTMLDivElement>(null)

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

  useStaggerMount(gridRef, { dependencies: [filter] })

  const px = isMobile ? page.pxMobile : page.pxDesktop
  const catCount = (cat: ClubCat | 'all') =>
    cat === 'all' ? allClubs.length : allClubs.filter(c => c.cat === cat).length

  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    border: `1px solid ${active ? color.green : color.border}`,
    background: active ? color.green : color.white,
    color: active ? color.onGreen : color.inkSoft,
    borderRadius: 999, padding: isMobile ? '7px 13px' : '8px 15px',
    fontFamily: font.body, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
  })

  return (
    <main ref={containerRef} style={{ maxWidth: page.maxW, margin: '0 auto', padding: `${isMobile ? page.topMobile : page.topDesktop}px ${px}px ${isMobile ? page.bottomMobile : page.bottomDesktop}px` }}>
      {showAddModal && (
        <AddClubModal onAdd={handleAddClub} onClose={() => setShowAddModal(false)} isMobile={isMobile} />
      )}

      <div style={{ marginBottom: 22 }}>
        <PageHeader title="My bag" subtitle="One distance per club. Tap any card to update yours." isMobile={isMobile} />
      </div>

      {/* Filter chips + Add club */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {ALL_CATS.map(cat => {
          const active = filter === cat
          const label  = cat === 'all' ? 'All' : CAT_LABELS[cat]
          return (
            <button key={cat} onClick={() => setFilter(cat)} style={chip(active)}>
              {label}
              <span style={{ fontSize: 12, color: active ? 'rgba(242,245,241,0.65)' : color.faint, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{catCount(cat)}</span>
            </button>
          )
        })}
        <div style={{ flex: 1, minWidth: 8 }} />
        <button
          onClick={() => setShowAddModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${color.borderStrong}`, background: color.white, color: color.ink, borderRadius: 999, padding: isMobile ? '7px 13px' : '8px 15px', fontFamily: font.body, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <PlusIcon size={13} color={color.inkSoft} /> Add
        </button>
      </div>

      {/* Club grid */}
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10 }}>
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
