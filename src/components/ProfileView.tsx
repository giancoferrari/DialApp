import { useState, useEffect, useRef } from 'react'
import { upsertProfile, uploadAvatar } from '../lib/profile'
import { CLUBS_DATA } from '../data'
import type { UserProfile, EquipmentItem, Shot, Round } from '../types'
import { CloseIcon, CheckIcon, CameraIcon, PencilIcon } from './Icons'

interface Props {
  profile: UserProfile | null
  userEmail: string
  shots: Shot[]
  rounds: Round[]
  onProfileSaved: (p: UserProfile) => void
  onSignOut: () => void
  userId: string
  isMobile?: boolean
}

const GOAL_PRESETS = [100, 95, 90, 85, 80, 75, 70]

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
      color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 16,
    }}>
      {label}
    </div>
  )
}

function ProgressBar({ value, max, color = '#1F3A2A' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div style={{ height: 6, background: '#F0EBDD', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  )
}

export default function ProfileView({
  profile, userEmail, shots, rounds, onProfileSaved, onSignOut, userId, isMobile = false,
}: Props) {
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [savedFlash, setSavedFlash]       = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)
  const [draftUsername, setDraftUsername] = useState(profile?.username ?? '')

  const [handicap,   setHandicap]   = useState<string>(profile?.handicapIndex != null ? String(profile.handicapIndex) : '')
  const [homeCourse, setHomeCourse] = useState<string>(profile?.homeCourse ?? '')
  const [goalScore,  setGoalScore]  = useState<string>(profile?.goalScore != null ? String(profile.goalScore) : '')
  const [goalHcp,    setGoalHcp]    = useState<string>(profile?.goalHandicap != null ? String(profile.goalHandicap) : '')
  const [goalNotes,  setGoalNotes]  = useState<string>(profile?.goalNotes ?? '')
  const [equipment,  setEquipment]  = useState<EquipmentItem[]>(
    profile?.equipment.length
      ? profile.equipment
      : CLUBS_DATA.map(c => ({ clubId: c.id, brand: '', model: '' }))
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!profile) return
    setDraftUsername(profile.username ?? '')
    setHandicap(profile.handicapIndex != null ? String(profile.handicapIndex) : '')
    setHomeCourse(profile.homeCourse ?? '')
    setGoalScore(profile.goalScore != null ? String(profile.goalScore) : '')
    setGoalHcp(profile.goalHandicap != null ? String(profile.goalHandicap) : '')
    setGoalNotes(profile.goalNotes ?? '')
    if (profile.equipment.length) setEquipment(profile.equipment)
  }, [profile])

  const save = async (patch: Partial<Parameters<typeof upsertProfile>[1]>) => {
    setSaving(true); setSaveError(null)
    try {
      const saved = await upsertProfile(userId, patch)
      onProfileSaved(saved)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally { setSaving(false) }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setSaveError(null)
    try {
      const url = await uploadAvatar(userId, file)
      const saved = await upsertProfile(userId, { avatarUrl: url })
      onProfileSaved(saved)
    } catch {
      setSaveError('Photo upload failed. Make sure the "avatars" storage bucket exists in Supabase with public access.')
    } finally {
      setUploadingAvatar(false)
      if (e.target) e.target.value = ''
    }
  }

  const saveUsername = async () => {
    const trimmed = draftUsername.trim().toLowerCase()
    setEditingUsername(false)
    await save({ username: trimmed || null })
  }

  const updateEquipmentField = (clubId: string, field: 'brand' | 'model', val: string) => {
    setEquipment(prev => prev.map(e => e.clubId === clubId ? { ...e, [field]: val } : e))
  }

  const saveEquipment = () => save({ equipment })

  // ── Derived stats ──────────────────────────────────────
  const totalShots    = shots.length
  const avgDriver     = shots.filter(s => s.clubId === 'driver').reduce((acc, s, _, arr) => acc + s.yardage / arr.length, 0) || 0
  const longestDrive  = Math.max(0, ...shots.filter(s => s.clubId === 'driver').map(s => s.yardage))

  const roundsWithScores = rounds.filter(r => r.roundHoles.length > 0)
  const bestRound = roundsWithScores.reduce<{ score: number; courseName: string; date: string } | null>((best, r) => {
    const score = r.roundHoles.reduce((s, h) => s + (h.score ?? 0), 0)
    if (!best || score < best.score) return { score, courseName: r.courseName, date: r.playedAt }
    return best
  }, null)
  const avgScore = roundsWithScores.length
    ? Math.round(roundsWithScores.reduce((sum, r) => sum + r.roundHoles.reduce((s, h) => s + (h.score ?? 0), 0), 0) / roundsWithScores.length)
    : null

  const courseMap: Record<string, { name: string; bestScore: number | null; count: number }> = {}
  rounds.forEach(r => {
    if (!courseMap[r.courseName]) courseMap[r.courseName] = { name: r.courseName, bestScore: null, count: 0 }
    courseMap[r.courseName].count++
    if (r.roundHoles.length > 0) {
      const score = r.roundHoles.reduce((s, h) => s + (h.score ?? 0), 0)
      const cur = courseMap[r.courseName].bestScore
      if (cur === null || score < cur) courseMap[r.courseName].bestScore = score
    }
  })
  const coursesPlayed = Object.values(courseMap).sort((a, b) => b.count - a.count)

  const goalScoreNum = goalScore ? parseInt(goalScore) : null
  const goalHcpNum   = goalHcp   ? parseFloat(goalHcp)  : null
  const hcpNum       = handicap  ? parseFloat(handicap) : null

  const goalScorePct = goalScoreNum && bestRound
    ? Math.min(100, Math.round((1 - (bestRound.score - goalScoreNum) / 20) * 100))
    : null

  const px = isMobile ? 20 : 40

  const card: React.CSSProperties = {
    background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 20, padding: '24px',
  }

  const CATS = [
    { id: 'woods',   label: 'Woods'   },
    { id: 'hybrids', label: 'Hybrids' },
    { id: 'irons',   label: 'Irons'   },
    { id: 'wedges',  label: 'Wedges'  },
  ] as const

  const displayName = profile?.username ? `@${profile.username}` : 'Add username'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* ── Instagram-style profile header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>

        {/* Avatar */}
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 88, height: 88, borderRadius: 44,
              background: '#1F3A2A', overflow: 'hidden',
              border: '3px solid #E0D8C5', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 36, color: '#D9824D' }}>
                {userEmail ? userEmail[0].toUpperCase() : 'G'}
              </span>
            )}
            {uploadingAvatar && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(31,29,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#FAF6EA', fontSize: 22 }}>…</span>
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 28, height: 28, borderRadius: 14,
              background: '#1F3A2A', border: '2px solid #F5F0E8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <CameraIcon size={13} color="#FAF6EA" />
          </button>
          <input
            ref={fileInputRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={handleAvatarChange}
          />
        </div>

        {/* Username */}
        {editingUsername ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <input
              autoFocus
              value={draftUsername}
              onChange={e => setDraftUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20))}
              onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false) }}
              placeholder="username"
              style={{
                textAlign: 'center', background: '#F0EBDD',
                border: '1px solid #1F3A2A', borderRadius: 10,
                padding: '8px 14px', fontSize: 17, color: '#1F1D17',
                outline: 'none', fontFamily: "'DM Sans', sans-serif", width: 180,
              }}
            />
            <button
              onClick={saveUsername}
              style={{ background: '#1F3A2A', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <CheckIcon size={14} color="#FAF6EA" />
            </button>
            <button
              onClick={() => setEditingUsername(false)}
              style={{ background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <CloseIcon size={12} color="#6B6857" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraftUsername(profile?.username ?? ''); setEditingUsername(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6,
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
              borderRadius: 8, transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(31,29,23,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <span style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 22, fontWeight: 700, color: profile?.username ? '#1F1D17' : '#B5AC95',
              letterSpacing: '-0.02em',
            }}>
              {displayName}
            </span>
            <PencilIcon size={14} color="#B5AC95" />
          </button>
        )}

        <div style={{ fontSize: 13, color: '#B5AC95', marginBottom: 24 }}>{userEmail}</div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: isMobile ? 32 : 48 }}>
          {[
            { value: totalShots,              label: 'shots'    },
            { value: roundsWithScores.length, label: 'rounds'   },
            { value: hcpNum != null ? hcpNum.toFixed(1) : '—', label: 'handicap' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 30, fontWeight: 700, color: '#1F1D17',
                letterSpacing: '-0.04em', lineHeight: 1,
              }}>
                {s.value}
              </div>
              <div style={{
                fontSize: 10, color: '#6B6857', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 5,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {savedFlash && (
          <div style={{
            marginTop: 16, display: 'flex', alignItems: 'center', gap: 6,
            background: '#1F3A2A', color: '#FAF6EA', borderRadius: 999,
            padding: '6px 14px', fontSize: 13, fontWeight: 500,
          }}>
            <CheckIcon size={13} color="#FAF6EA" /> Saved
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#E0D8C5', marginBottom: 28 }} />

      {saveError && (
        <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#D9824D', lineHeight: 1.45, marginBottom: 20 }}>
          {saveError}
        </div>
      )}

      {/* ── Handicap + Quick Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>

        <div style={{ ...card, background: '#1F3A2A', color: '#FAF6EA' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#B5C29A', textTransform: 'uppercase', marginBottom: 12 }}>
            Handicap Index
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 80, fontWeight: 700, lineHeight: 0.9, letterSpacing: '-0.04em', color: '#FAF6EA' }}>
              {hcpNum != null ? hcpNum.toFixed(1) : '—'}
            </div>
            <div style={{ paddingBottom: 8, fontSize: 14, color: '#B5C29A' }}>HCP</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="number" step="0.1" min="0" max="54" placeholder="e.g. 14.2"
              value={handicap}
              onChange={e => setHandicap(e.target.value)}
              onBlur={() => save({ handicapIndex: handicap ? parseFloat(handicap) : null })}
              style={{
                flex: 1, minWidth: 100, background: 'rgba(250,246,234,0.12)',
                border: '1px solid rgba(250,246,234,0.2)', borderRadius: 10,
                padding: '9px 12px', fontSize: 14, color: '#FAF6EA', outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button
              onClick={() => save({ handicapIndex: handicap ? parseFloat(handicap) : null })}
              disabled={saving}
              style={{
                background: '#D9824D', color: '#FAF6EA', border: 'none',
                borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? '…' : 'Update'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Best round',    value: bestRound ? `${bestRound.score} @ ${bestRound.courseName}` : '—' },
            { label: 'Avg score',     value: avgScore ? String(avgScore) : '—' },
            { label: 'Avg driver',    value: avgDriver ? `${Math.round(avgDriver)} yds` : '—' },
            { label: 'Longest drive', value: longestDrive ? `${longestDrive} yds` : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: '#FAF6EA', border: '1px solid #E0D8C5', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#6B6857', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Goals ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <SectionHeader label="Goals" />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>

          <div>
            <div style={{ fontSize: 13, color: '#6B6857', marginBottom: 10 }}>Score to break</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {GOAL_PRESETS.map(g => (
                <button
                  key={g}
                  onClick={() => { setGoalScore(String(g)); save({ goalScore: g }) }}
                  style={{
                    border: '1px solid', borderRadius: 999, padding: '5px 12px',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    background: goalScoreNum === g ? '#1F3A2A' : 'transparent',
                    color: goalScoreNum === g ? '#FAF6EA' : '#1F1D17',
                    borderColor: goalScoreNum === g ? '#1F3A2A' : '#E0D8C5',
                    transition: 'all 0.15s',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            {goalScorePct !== null && bestRound && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6857', marginBottom: 6 }}>
                  <span>Best: <strong style={{ color: '#1F1D17' }}>{bestRound.score}</strong></span>
                  <span>Goal: <strong style={{ color: '#1F3A2A' }}>break {goalScoreNum}</strong></span>
                </div>
                <ProgressBar value={goalScorePct} max={100} color={bestRound.score <= (goalScoreNum ?? 999) ? '#5C7A4D' : '#1F3A2A'} />
                {bestRound.score <= (goalScoreNum ?? 999) && (
                  <div style={{ fontSize: 12, color: '#5C7A4D', fontWeight: 600, marginTop: 6 }}>
                    Goal achieved! Best: {bestRound.score}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, color: '#6B6857', marginBottom: 10 }}>Target handicap</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="number" step="0.1" min="0" max="54" placeholder="e.g. 10.0"
                value={goalHcp}
                onChange={e => setGoalHcp(e.target.value)}
                style={{
                  flex: 1, background: '#F0EBDD', border: '1px solid #E0D8C5',
                  borderRadius: 10, padding: '9px 12px', fontSize: 14,
                  color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#E0D8C5'
                  save({ goalHandicap: goalHcp ? parseFloat(goalHcp) : null })
                }}
              />
            </div>
            {hcpNum != null && goalHcpNum != null && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6857', marginBottom: 6 }}>
                  <span>Current: <strong style={{ color: '#1F1D17' }}>{hcpNum.toFixed(1)}</strong></span>
                  <span>Target: <strong style={{ color: '#1F3A2A' }}>{goalHcpNum.toFixed(1)}</strong></span>
                </div>
                <ProgressBar
                  value={Math.max(0, hcpNum - goalHcpNum)}
                  max={Math.max(1, hcpNum - goalHcpNum + 5)}
                  color={hcpNum <= goalHcpNum ? '#5C7A4D' : '#D9824D'}
                />
                {hcpNum <= goalHcpNum && (
                  <div style={{ fontSize: 12, color: '#5C7A4D', fontWeight: 600, marginTop: 6 }}>
                    Goal reached!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 8 }}>Notes & intentions</div>
          <textarea
            value={goalNotes}
            onChange={e => setGoalNotes(e.target.value)}
            placeholder="e.g. Work on course management, fix the 3-wood slice, practice 50-100yd wedge shots…"
            rows={3}
            style={{ width: '100%', background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#1F1D17', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5'; save({ goalNotes: goalNotes || null }) }}
          />
        </div>
      </div>

      {/* ── Home Course ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <SectionHeader label="Home Course" />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B6857', textTransform: 'uppercase', marginBottom: 6 }}>Home course</div>
          <input
            type="text"
            value={homeCourse}
            placeholder="Where do you play most?"
            onChange={e => setHomeCourse(e.target.value)}
            onBlur={() => save({ homeCourse: homeCourse || null })}
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box',
              background: '#F0EBDD', border: '1px solid #E0D8C5',
              borderRadius: 10, padding: '10px 12px', fontSize: 14,
              color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
          />
        </div>
      </div>

      {/* ── Courses played ── */}
      {coursesPlayed.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <SectionHeader label="Courses Played" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {coursesPlayed.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0EBDD' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.02em' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#6B6857', marginTop: 2 }}>
                    {c.count} {c.count === 1 ? 'round' : 'rounds'}
                    {homeCourse === c.name && <span style={{ marginLeft: 8, fontSize: 11, color: '#5C7A4D', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Home</span>}
                  </div>
                </div>
                {c.bestScore && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.03em' }}>{c.bestScore}</div>
                    <div style={{ fontSize: 11, color: '#6B6857' }}>best</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Equipment ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <SectionHeader label="What's in the bag" />
          <button
            onClick={saveEquipment}
            disabled={saving}
            style={{
              background: saving ? '#C9C0A8' : '#1F3A2A', color: '#FAF6EA', border: 'none',
              borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {saving ? 'Saving…' : 'Save equipment'}
          </button>
        </div>

        {CATS.map(cat => {
          const clubsInCat = CLUBS_DATA.filter(c => c.cat === cat.id)
          return (
            <div key={cat.id} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#B5AC95', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                {cat.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clubsInCat.map(club => {
                  const eq = equipment.find(e => e.clubId === club.id) ?? { clubId: club.id, brand: '', model: '' }
                  return (
                    <div key={club.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr 1fr', gap: 8, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, background: '#F0EBDD',
                          border: '1px solid #E0D8C5', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif",
                          fontSize: 11, fontWeight: 700, color: '#1F3A2A', letterSpacing: '-0.01em',
                          flexShrink: 0,
                        }}>
                          {club.abbr}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1F1D17', fontFamily: "'DM Sans', sans-serif" }}>{club.name}</span>
                      </div>
                      <input
                        type="text" placeholder="Brand"
                        value={eq.brand}
                        onChange={e => updateEquipmentField(club.id, 'brand', e.target.value)}
                        style={{ background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                      />
                      <input
                        type="text" placeholder="Model"
                        value={eq.model}
                        onChange={e => updateEquipmentField(club.id, 'model', e.target.value)}
                        style={{ background: '#F0EBDD', border: '1px solid #E0D8C5', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Account ── */}
      <div style={{ ...card }}>
        <SectionHeader label="Account" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#B5AC95', fontWeight: 500, marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 14, color: '#1F1D17', fontWeight: 500 }}>{userEmail}</div>
          </div>
          <button
            onClick={onSignOut}
            style={{
              background: 'transparent', border: '1px solid #E0D8C5', borderRadius: 999,
              padding: '9px 20px', fontSize: 13.5, fontWeight: 500, color: '#D9824D',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFF5EE'; e.currentTarget.style.borderColor = '#D9824D' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E0D8C5' }}
          >
            Sign out
          </button>
        </div>
      </div>

    </div>
  )
}
