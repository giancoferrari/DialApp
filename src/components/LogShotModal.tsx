import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { Shot, Club } from '../types'
import { CLUBS_DATA, CAT_LABELS, getClubAvg } from '../data'
import FlagPin from './FlagPin'
import { ArrowRight, CheckIcon, CloseIcon } from './Icons'

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

  // ── Mobile layout ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        ref={overlayRef}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(31,29,23,0.6)',
          backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <div
          ref={sheetRef}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            background: 'rgba(237,232,212,0.88)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            borderRadius: '28px 28px 0 0',
            border: '1px solid rgba(255,255,255,0.52)',
            borderBottom: 'none',
            boxShadow: '0 -16px 48px rgba(31,29,23,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
            maxHeight: '92vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#8B8272' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#8B8272', textTransform: 'uppercase' }}>
              <FlagPin size={12} /> Log a shot
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, background: '#FAF6EA', border: '1px solid #E0D8C5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <CloseIcon size={14} color="#1F1D17" />
            </button>
          </div>

          {success ? (
            <div style={{ padding: '32px 24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div ref={checkRef} style={{ width: 72, height: 72, borderRadius: 36, background: '#D9824D', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <CheckIcon size={32} color="#FAF6EA" />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 6 }}>Logged</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 56, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {yardage} <span style={{ fontSize: 24, color: '#D9824D' }}>yds</span>
              </div>
              <p style={{ fontSize: 14, color: '#4A4235', marginTop: 10 }}>{club?.name} · Nice strike.</p>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {/* Yardage display */}
              <div style={{ padding: '0 20px 16px' }}>
                <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '20px 16px', textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 72, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em', color: yardage ? '#1F3A2A' : '#8B8272' }}>
                    {yardage || '0'}<span style={{ fontSize: 24, color: '#D9824D' }}>.</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#4A4235', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>yards</div>
                </div>

                {/* Numpad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} onClick={() => stepNum(n)} style={{ height: 52, borderRadius: 14, background: '#FAF6EA', border: '1px solid #E0D8C5', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 600, color: '#1F1D17', letterSpacing: '-0.02em', cursor: 'pointer' }}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setYardage(y => y.slice(0, -1))} style={{ height: 52, borderRadius: 14, background: '#F0EBDD', border: '1px solid #E0D8C5', fontSize: 13, fontWeight: 500, color: '#4A4235', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Del</button>
                  <button onClick={() => stepNum(0)} style={{ height: 52, borderRadius: 14, background: '#FAF6EA', border: '1px solid #E0D8C5', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 600, color: '#1F1D17', cursor: 'pointer' }}>0</button>
                  <button onClick={() => setYardage('')} style={{ height: 52, borderRadius: 14, background: '#F0EBDD', border: '1px solid #E0D8C5', fontSize: 13, fontWeight: 500, color: '#4A4235', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
                </div>

                {/* Note */}
                <input
                  type="text" value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Add a note (optional)…"
                  style={{ width: '100%', background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#1F1D17', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                />
              </div>

              {/* Club picker */}
              <div style={{ padding: '0 20px', borderTop: '1px solid #E0D8C5', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 10 }}>Pick a club</div>

                {/* Category filter */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                  {['all', 'woods', 'hybrids', 'irons', 'wedges'].map(cat => (
                    <button key={cat} onClick={() => setCatFilter(cat)} style={{ border: '1px solid', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0, background: catFilter === cat ? '#1F3A2A' : 'transparent', color: catFilter === cat ? '#FAF6EA' : '#1F1D17', borderColor: catFilter === cat ? '#1F3A2A' : '#E0D8C5', transition: 'all 0.12s' }}>
                      {cat === 'all' ? 'All' : CAT_LABELS[cat as keyof typeof CAT_LABELS]}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 24 }}>
                  {filteredClubs.map(c => {
                    const sel = club?.id === c.id
                    const avg = getClubAvg(shots, c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => setClub(c)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: sel ? '#1F3A2A' : '#FAF6EA',
                          color: sel ? '#FAF6EA' : '#1F1D17',
                          border: '1px solid', borderColor: sel ? '#1F3A2A' : '#E0D8C5',
                          borderRadius: 999, padding: '7px 12px 7px 7px',
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                          transition: 'all 0.12s',
                        }}
                      >
                        <span style={{ width: 24, height: 24, borderRadius: 8, background: sel ? '#D9824D' : '#F0EBDD', color: sel ? '#FAF6EA' : '#1F3A2A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: c.abbr.length > 2 ? 9 : 11 }}>
                          {c.abbr}
                        </span>
                        {c.name}
                        {avg !== null && <span style={{ fontSize: 10, opacity: 0.6 }}>{avg}y</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Save button — fixed at bottom */}
          {!success && (
            <div style={{ padding: '12px 20px 24px', borderTop: '1px solid #E0D8C5', background: '#F0EBDD', flexShrink: 0 }}>
              <button
                onClick={handleSave}
                disabled={!isValid}
                style={{
                  width: '100%', background: isValid ? '#1F3A2A' : '#8B8272',
                  color: '#FAF6EA', border: 'none', borderRadius: 999,
                  padding: '15px', fontSize: 15, fontWeight: 500,
                  cursor: isValid ? 'pointer' : 'not-allowed',
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Save shot <ArrowRight size={16} color="#FAF6EA" />
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
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(31,29,23,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40,
      }}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 880,
          background: 'rgba(237,232,212,0.88)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          borderRadius: 28,
          border: '1px solid rgba(255,255,255,0.52)', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(31,29,23,0.22), inset 0 1px 0 rgba(255,255,255,0.7)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 80px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '32px 40px 24px', borderBottom: '1px solid #E0D8C5', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>
              <FlagPin size={12} /> Log a shot
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', lineHeight: 1, margin: 0 }}>
              How far did <span style={{ fontStyle: 'italic', color: '#5C7A4D', fontWeight: 400 }}>that</span> go?
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ width: 40, height: 40, borderRadius: 20, background: '#FAF6EA', border: '1px solid #E0D8C5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FAF6EA' }}
          >
            <CloseIcon size={18} color="#1F1D17" />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '64px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: 1 }}>
            <div ref={checkRef} style={{ width: 80, height: 80, borderRadius: 40, background: '#D9824D', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <CheckIcon size={36} color="#FAF6EA" />
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 8 }}>Logged</div>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 64, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>
              {yardage} <span style={{ fontSize: 28, color: '#D9824D' }}>yds</span>
            </h3>
            <p style={{ fontSize: 15, color: '#4A4235', marginTop: 12 }}>{club?.name} · Nice strike.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', flex: 1, overflow: 'hidden' }}>
            {/* Club picker */}
            <div style={{ padding: '28px 32px', borderRight: '1px solid #E0D8C5', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 16 }}>Pick a club</div>
              {(['woods', 'hybrids', 'irons', 'wedges'] as const).map(cat => (
                <div key={cat} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, color: '#8B8470', marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em' }}>{CAT_LABELS[cat]}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CLUBS_DATA.filter(c => c.cat === cat).map(c => {
                      const sel = club?.id === c.id
                      const avg = getClubAvg(shots, c.id)
                      return (
                        <button
                          key={c.id}
                          onClick={() => setClub(c)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, background: sel ? '#1F3A2A' : '#FAF6EA', color: sel ? '#FAF6EA' : '#1F1D17', border: '1px solid', borderColor: sel ? '#1F3A2A' : '#E0D8C5', borderRadius: 999, padding: '6px 12px 6px 6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, transition: 'all 0.15s' }}
                          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
                          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          <span style={{ width: 26, height: 26, borderRadius: 9, background: sel ? '#D9824D' : '#F0EBDD', color: sel ? '#FAF6EA' : '#1F3A2A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: c.abbr.length > 2 ? 10 : 12, letterSpacing: '-0.02em' }}>
                            {c.abbr}
                          </span>
                          {c.name}
                          {avg !== null && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>{avg}y</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Yardage input */}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#4A4235', textTransform: 'uppercase', marginBottom: 16 }}>Yardage</div>
              <div style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '28px 24px', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 88, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em', color: yardage ? '#1F3A2A' : '#8B8272', transition: 'color 0.15s' }}>
                  {yardage || '0'}<span style={{ fontSize: 28, color: '#D9824D' }}>.</span>
                </div>
                <div style={{ fontSize: 12, color: '#4A4235', marginTop: 6, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>yards</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => stepNum(n)} style={{ height: 44, borderRadius: 14, background: '#FAF6EA', border: '1px solid #E0D8C5', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 600, color: '#1F1D17', letterSpacing: '-0.02em', cursor: 'pointer', transition: 'background 0.1s, transform 0.1s' }} onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }} onMouseLeave={e => { e.currentTarget.style.background = '#FAF6EA' }} onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }} onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setYardage(y => y.slice(0, -1))} style={{ height: 44, borderRadius: 14, background: '#F0EBDD', border: '1px solid #E0D8C5', fontSize: 13, fontWeight: 500, color: '#4A4235', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Delete</button>
                <button onClick={() => stepNum(0)} style={{ height: 44, borderRadius: 14, background: '#FAF6EA', border: '1px solid #E0D8C5', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 600, color: '#1F1D17', cursor: 'pointer' }}>0</button>
                <button onClick={() => setYardage('')} style={{ height: 44, borderRadius: 14, background: '#F0EBDD', border: '1px solid #E0D8C5', fontSize: 13, fontWeight: 500, color: '#4A4235', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
              </div>

              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)…" style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 14, padding: '11px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#1F1D17', outline: 'none', marginBottom: 16, width: '100%', transition: 'border-color 0.15s' }} onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }} onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }} />

              <button
                onClick={handleSave}
                disabled={!isValid}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: isValid ? '#1F3A2A' : '#8B8272', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '14px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: isValid ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (isValid) e.currentTarget.style.background = '#16271D' }}
                onMouseLeave={e => { if (isValid) e.currentTarget.style.background = '#1F3A2A' }}
              >
                Save shot <ArrowRight size={16} color="#FAF6EA" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

