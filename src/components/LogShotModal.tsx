import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { Shot, Club } from '../types'
import { CLUBS_DATA, CAT_LABELS, getClubAvg } from '../data'
import { ArrowRight, CheckIcon, CloseIcon } from './Icons'
import { color, font, radius, elevation } from '../lib/tokens'

gsap.registerPlugin(useGSAP)

interface Props {
  open: boolean
  preclub: Club | null
  shots: Shot[]
  onClose: () => void
  onSave: (shot: Shot) => void
  isMobile?: boolean
}

export default function LogShotModal({ open, preclub, shots, onClose, onSave, isMobile = false }: Props) {
  const [club, setClub]       = useState<Club | null>(null)
  const [yardage, setYardage] = useState('')
  const [note, setNote]       = useState('')
  const [success, setSuccess] = useState(false)
  const [catFilter, setCatFilter] = useState<string>('all')

  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useRef<HTMLDivElement>(null)
  const checkRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setClub(preclub || null)
      setYardage('')
      setNote('')
      setSuccess(false)
      setCatFilter('all')
    }
  }, [open, preclub])

  useGSAP(() => {
    if (!overlayRef.current || !sheetRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (open) {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
        gsap.fromTo(
          sheetRef.current,
          { opacity: 0, scale: isMobile ? 1 : 0.94, y: isMobile ? 40 : 8 },
          { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        )
      }
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (open && overlayRef.current) {
        gsap.set(overlayRef.current, { opacity: 1 })
        gsap.set(sheetRef.current, { opacity: 1, scale: 1, y: 0 })
      }
    })
    return () => mm.revert()
  }, { dependencies: [open] })

  useGSAP(() => {
    if (success && checkRef.current) {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(checkRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.56)' })
      })
      mm.add('(prefers-reduced-motion: reduce)', () => { gsap.set(checkRef.current, { scale: 1, opacity: 1 }) })
      return () => mm.revert()
    }
  }, { dependencies: [success] })

  if (!open) return null

  const isValid = club !== null && parseInt(yardage, 10) > 0

  const handleSave = () => {
    if (!isValid) return
    onSave({ id: Date.now(), clubId: club!.id, yardage: parseInt(yardage, 10), ts: Date.now(), note })
    setSuccess(true)
    setTimeout(onClose, 1500)
  }

  const stepNum = (n: number) => setYardage(y => y.length < 3 ? y + String(n) : y)

  const filteredClubs = catFilter === 'all' ? CLUBS_DATA : CLUBS_DATA.filter(c => c.cat === catFilter)

  const numKey: React.CSSProperties = { borderRadius: radius.sm, background: color.sand, border: 'none', fontFamily: font.display, fontWeight: 600, color: color.ink, letterSpacing: '-0.01em', cursor: 'pointer' }
  const utilKey: React.CSSProperties = { borderRadius: radius.sm, background: color.creamDeep, border: 'none', fontSize: 13, fontWeight: 600, color: color.inkSoft, cursor: 'pointer', fontFamily: font.body }

  const clubChip = (c: Club, sel: boolean, avg: number | null, big = false) => (
    <button
      key={c.id}
      onClick={() => setClub(c)}
      style={{ display: 'flex', alignItems: 'center', gap: big ? 8 : 6, background: sel ? color.green : color.white, color: sel ? color.onGreen : color.ink, border: `1px solid ${sel ? color.green : color.border}`, borderRadius: 999, padding: big ? '6px 12px 6px 6px' : '7px 12px 7px 7px', cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 500, transition: 'all 0.12s' }}
    >
      <span style={{ width: big ? 26 : 24, height: big ? 26 : 24, borderRadius: 8, background: sel ? 'rgba(255,255,255,0.15)' : color.greenTint, color: sel ? color.onGreen : color.green, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.display, fontWeight: 600, fontSize: c.abbr.length > 2 ? 10 : 12 }}>
        {c.abbr}
      </span>
      {c.name}
      {avg !== null && <span style={{ fontSize: 11, opacity: 0.6 }}>{avg}y</span>}
    </button>
  )

  const SuccessView = ({ big }: { big?: boolean }) => (
    <div style={{ padding: big ? '64px 40px' : '32px 24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: big ? 1 : undefined }}>
      <div ref={checkRef} style={{ width: big ? 76 : 68, height: big ? 76 : 68, borderRadius: big ? 38 : 34, background: color.green, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <CheckIcon size={big ? 34 : 30} color={color.onGreen} />
      </div>
      <div style={{ fontFamily: font.display, fontSize: big ? 60 : 52, fontWeight: 600, color: color.ink, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {yardage} <span style={{ fontSize: big ? 26 : 22, color: color.muted }}>yds</span>
      </div>
      <p style={{ fontSize: 14, color: color.muted, marginTop: 10 }}>{club?.name} · Nice strike.</p>
    </div>
  )

  // ── Mobile layout ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        ref={overlayRef}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(23,26,23,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <div
          ref={sheetRef}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', background: color.white, borderRadius: '24px 24px 0 0', boxShadow: elevation.lg, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: color.borderStrong }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px', flexShrink: 0 }}>
            <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: color.ink, letterSpacing: '-0.01em' }}>Log a shot</div>
            <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 16, background: color.sand, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseIcon size={14} color={color.inkSoft} />
            </button>
          </div>

          {success ? <SuccessView /> : (
            <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {/* Yardage display */}
              <div style={{ padding: '0 20px 16px' }}>
                <div style={{ background: color.sand, borderRadius: radius.card, padding: '20px 16px', textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: font.display, fontSize: 64, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: yardage ? color.ink : color.faint, fontVariantNumeric: 'tabular-nums' }}>
                    {yardage || '0'}
                  </div>
                  <div style={{ fontSize: 12, color: color.muted, fontWeight: 500, marginTop: 4 }}>yards</div>
                </div>

                {/* Numpad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} onClick={() => stepNum(n)} style={{ ...numKey, height: 52, fontSize: 22 }}>{n}</button>
                  ))}
                  <button onClick={() => setYardage(y => y.slice(0, -1))} style={{ ...utilKey, height: 52 }}>Del</button>
                  <button onClick={() => stepNum(0)} style={{ ...numKey, height: 52, fontSize: 22 }}>0</button>
                  <button onClick={() => setYardage('')} style={{ ...utilKey, height: 52 }}>Clear</button>
                </div>

                {/* Note */}
                <input
                  type="text" value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Add a note (optional)…"
                  style={{ width: '100%', background: color.white, border: `1px solid ${color.borderStrong}`, borderRadius: radius.sm, padding: '11px 14px', fontSize: 16, color: color.ink, outline: 'none', boxSizing: 'border-box', marginBottom: 14, fontFamily: font.body }}
                  onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                  onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                />
              </div>

              {/* Club picker */}
              <div style={{ padding: '0 20px', borderTop: `1px solid ${color.border}`, paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 10 }}>Pick a club</div>

                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                  {['all', 'woods', 'hybrids', 'irons', 'wedges'].map(cat => {
                    const active = catFilter === cat
                    return (
                      <button key={cat} onClick={() => setCatFilter(cat)} style={{ border: `1px solid ${active ? color.green : color.border}`, borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font.body, whiteSpace: 'nowrap', flexShrink: 0, background: active ? color.green : color.white, color: active ? color.onGreen : color.inkSoft, transition: 'all 0.12s' }}>
                        {cat === 'all' ? 'All' : CAT_LABELS[cat as keyof typeof CAT_LABELS]}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 24 }}>
                  {filteredClubs.map(c => clubChip(c, club?.id === c.id, getClubAvg(shots, c.id)))}
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          {!success && (
            <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom) + 16px)', borderTop: `1px solid ${color.border}`, background: color.white, flexShrink: 0 }}>
              <button
                onClick={handleSave}
                disabled={!isValid}
                style={{ width: '100%', background: isValid ? color.green : color.borderStrong, color: isValid ? color.onGreen : color.inkSoft, border: 'none', borderRadius: radius.md, padding: '15px', fontSize: 15, fontWeight: 600, cursor: isValid ? 'pointer' : 'not-allowed', fontFamily: font.body, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                Save shot <ArrowRight size={16} color={isValid ? color.onGreen : color.inkSoft} />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Desktop layout ──────────────────────────────────────────
  return (
    <div
      ref={overlayRef}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(23,26,23,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 860, background: color.white, borderRadius: radius.sheet, overflow: 'hidden', boxShadow: elevation.lg, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 80px)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px 20px', borderBottom: `1px solid ${color.border}`, flexShrink: 0 }}>
          <h2 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 600, color: color.ink, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
            Log a shot
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 18, background: color.sand, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <CloseIcon size={16} color={color.inkSoft} />
          </button>
        </div>

        {success ? <SuccessView big /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', flex: 1, overflow: 'hidden' }}>
            {/* Club picker */}
            <div style={{ padding: '24px 28px', borderRight: `1px solid ${color.border}`, overflowY: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 14 }}>Pick a club</div>
              {(['woods', 'hybrids', 'irons', 'wedges'] as const).map(cat => (
                <div key={cat} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: color.faint, marginBottom: 8, fontWeight: 500 }}>{CAT_LABELS[cat]}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CLUBS_DATA.filter(c => c.cat === cat).map(c => clubChip(c, club?.id === c.id, getClubAvg(shots, c.id), true))}
                  </div>
                </div>
              ))}
            </div>

            {/* Yardage input */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, marginBottom: 14 }}>Yardage</div>
              <div style={{ background: color.sand, borderRadius: radius.card, padding: '24px 24px', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontFamily: font.display, fontSize: 80, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: yardage ? color.ink : color.faint, transition: 'color 0.15s', fontVariantNumeric: 'tabular-nums' }}>
                  {yardage || '0'}
                </div>
                <div style={{ fontSize: 12, color: color.muted, marginTop: 6, fontWeight: 500 }}>yards</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => stepNum(n)} style={{ ...numKey, height: 44, fontSize: 20 }} onMouseEnter={e => { e.currentTarget.style.background = color.creamDeep }} onMouseLeave={e => { e.currentTarget.style.background = color.sand }}>{n}</button>
                ))}
                <button onClick={() => setYardage(y => y.slice(0, -1))} style={{ ...utilKey, height: 44 }}>Delete</button>
                <button onClick={() => stepNum(0)} style={{ ...numKey, height: 44, fontSize: 20 }}>0</button>
                <button onClick={() => setYardage('')} style={{ ...utilKey, height: 44 }}>Clear</button>
              </div>

              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)…" style={{ background: color.white, border: `1px solid ${color.borderStrong}`, borderRadius: radius.sm, padding: '11px 14px', fontFamily: font.body, fontSize: 15, color: color.ink, outline: 'none', marginBottom: 16, width: '100%', boxSizing: 'border-box', transition: 'border-color 0.15s' }} onFocus={e => { e.currentTarget.style.borderColor = color.green }} onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }} />

              <button
                onClick={handleSave}
                disabled={!isValid}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: isValid ? color.green : color.borderStrong, color: isValid ? color.onGreen : color.inkSoft, border: 'none', borderRadius: radius.md, padding: '14px 24px', fontFamily: font.body, fontSize: 15, fontWeight: 600, cursor: isValid ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (isValid) e.currentTarget.style.background = color.greenDeep }}
                onMouseLeave={e => { if (isValid) e.currentTarget.style.background = color.green }}
              >
                Save shot <ArrowRight size={16} color={isValid ? color.onGreen : color.inkSoft} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
