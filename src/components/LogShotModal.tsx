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
}

export default function LogShotModal({ open, preclub, shots, onClose, onSave }: Props) {
  const [club, setClub]       = useState<Club | null>(null)
  const [yardage, setYardage] = useState('')
  const [note, setNote]       = useState('')
  const [success, setSuccess] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useRef<HTMLDivElement>(null)
  const checkRef   = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setClub(preclub || null)
      setYardage('')
      setNote('')
      setSuccess(false)
    }
  }, [open, preclub])

  // Animate open/close
  useGSAP(() => {
    if (!overlayRef.current || !sheetRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (open) {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
        gsap.fromTo(
          sheetRef.current,
          { opacity: 0, scale: 0.94, y: 8 },
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

  // Animate success check
  useGSAP(() => {
    if (success && checkRef.current) {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          checkRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.56)' }
        )
      })
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(checkRef.current, { scale: 1, opacity: 1 })
      })
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
          background: '#F0EBDD', borderRadius: 28,
          border: '1px solid #E0D8C5', overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 80px)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '32px 40px 24px', borderBottom: '1px solid #E0D8C5', flexShrink: 0,
        }}>
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
              color: '#D9824D', textTransform: 'uppercase', marginBottom: 8,
            }}>
              <FlagPin size={12} /> Log a shot
            </div>
            <h2 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 36, fontWeight: 700, color: '#1F1D17',
              letterSpacing: '-0.035em', lineHeight: 1, margin: 0,
            }}>
              How far did <span style={{ fontStyle: 'italic', color: '#5C7A4D', fontWeight: 400 }}>that</span> go?
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 40, height: 40, borderRadius: 20,
              background: '#FAF6EA', border: '1px solid #E0D8C5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s, transform 0.12s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FAF6EA' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <CloseIcon size={18} color="#1F1D17" />
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div style={{
            padding: '64px 40px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', flex: 1,
          }}>
            <div
              ref={checkRef}
              style={{
                width: 80, height: 80, borderRadius: 40,
                background: '#D9824D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <CheckIcon size={36} color="#FAF6EA" />
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
              color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Logged
            </div>
            <h3 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 64, fontWeight: 700, color: '#1F3A2A',
              letterSpacing: '-0.04em', lineHeight: 1, margin: 0,
            }}>
              {yardage} <span style={{ fontSize: 28, color: '#D9824D' }}>yds</span>
            </h3>
            <p style={{ fontSize: 15, color: '#6B6857', marginTop: 12 }}>
              {club?.name} · Nice strike.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', flex: 1, overflow: 'hidden' }}>
            {/* Club picker */}
            <div style={{
              padding: '28px 32px', borderRight: '1px solid #E0D8C5', overflowY: 'auto',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                color: '#6B6857', textTransform: 'uppercase', marginBottom: 16,
              }}>
                Pick a club
              </div>
              {(['woods', 'hybrids', 'irons', 'wedges'] as const).map(cat => (
                <div key={cat} style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 11, color: '#8B8470', marginBottom: 8, fontWeight: 500,
                    letterSpacing: '0.04em',
                  }}>
                    {CAT_LABELS[cat]}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CLUBS_DATA.filter(c => c.cat === cat).map(c => {
                      const sel = club?.id === c.id
                      const avg = getClubAvg(shots, c.id)
                      return (
                        <button
                          key={c.id}
                          onClick={() => setClub(c)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: sel ? '#1F3A2A' : '#FAF6EA',
                            color: sel ? '#FAF6EA' : '#1F1D17',
                            border: '1px solid', borderColor: sel ? '#1F3A2A' : '#E0D8C5',
                            borderRadius: 999, padding: '6px 12px 6px 6px',
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                            transition: 'all 0.15s',
                          }}
                          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
                          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          <span style={{
                            width: 26, height: 26, borderRadius: 9,
                            background: sel ? '#D9824D' : '#F0EBDD',
                            color: sel ? '#FAF6EA' : '#1F3A2A',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                            fontWeight: 700, fontSize: c.abbr.length > 2 ? 10 : 12,
                            letterSpacing: '-0.02em',
                          }}>
                            {c.abbr}
                          </span>
                          {c.name}
                          {avg !== null && (
                            <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>
                              {avg}y
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Yardage input */}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                color: '#6B6857', textTransform: 'uppercase', marginBottom: 16,
              }}>
                Yardage
              </div>

              {/* Big display */}
              <div style={{
                background: '#FAF6EA', border: '1px solid #E0D8C5',
                borderRadius: 20, padding: '28px 24px',
                textAlign: 'center', marginBottom: 16,
              }}>
                <div style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 88, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em',
                  color: yardage ? '#1F3A2A' : '#C9C0A8',
                  transition: 'color 0.15s',
                }}>
                  {yardage || '0'}
                  <span style={{ fontSize: 28, color: '#D9824D' }}>.</span>
                </div>
                <div style={{
                  fontSize: 12, color: '#6B6857', marginTop: 6, fontWeight: 500,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  yards
                </div>
              </div>

              {/* Numpad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button
                    key={n}
                    onClick={() => stepNum(n)}
                    style={{
                      height: 44, borderRadius: 14,
                      background: '#FAF6EA', border: '1px solid #E0D8C5',
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: 20, fontWeight: 600, color: '#1F1D17',
                      letterSpacing: '-0.02em', cursor: 'pointer',
                      transition: 'background 0.1s, transform 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FAF6EA' }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {n}
                  </button>
                ))}
                {/* Delete */}
                <button
                  onClick={() => setYardage(y => y.slice(0, -1))}
                  style={{
                    height: 44, borderRadius: 14, background: '#F0EBDD',
                    border: '1px solid #E0D8C5', fontSize: 13, fontWeight: 500,
                    color: '#6B6857', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'background 0.1s, transform 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E8DFC8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F0EBDD' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  Delete
                </button>
                {/* 0 */}
                <button
                  onClick={() => stepNum(0)}
                  style={{
                    height: 44, borderRadius: 14, background: '#FAF6EA',
                    border: '1px solid #E0D8C5',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 20, fontWeight: 600, color: '#1F1D17',
                    letterSpacing: '-0.02em', cursor: 'pointer',
                    transition: 'background 0.1s, transform 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F0EBDD' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FAF6EA' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  0
                </button>
                {/* Clear */}
                <button
                  onClick={() => setYardage('')}
                  style={{
                    height: 44, borderRadius: 14, background: '#F0EBDD',
                    border: '1px solid #E0D8C5', fontSize: 13, fontWeight: 500,
                    color: '#6B6857', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'background 0.1s, transform 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E8DFC8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F0EBDD' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  Clear
                </button>
              </div>

              {/* Note input */}
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note (optional)…"
                style={{
                  background: '#FAF6EA', border: '1px solid #E0D8C5',
                  borderRadius: 14, padding: '11px 16px',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#1F1D17',
                  outline: 'none', marginBottom: 16, width: '100%',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
              />

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!isValid}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, background: isValid ? '#1F3A2A' : '#C9C0A8',
                  color: '#FAF6EA', border: 'none', borderRadius: 999,
                  padding: '14px 24px',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                  cursor: isValid ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (isValid) e.currentTarget.style.background = '#16271D' }}
                onMouseLeave={e => { if (isValid) e.currentTarget.style.background = '#1F3A2A' }}
                onMouseDown={e => { if (isValid) e.currentTarget.style.transform = 'scale(0.97)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
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
