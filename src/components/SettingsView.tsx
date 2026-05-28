import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { upsertProfile, uploadAvatar } from '../lib/profile'
import type { UserProfile, View } from '../types'
import { getRank } from '../lib/points'
import { CameraIcon, CheckIcon, CloseIcon, ShieldIcon, ChevronRightIcon } from './Icons'

// ── Local preferences (no DB needed) ──────────────────────
type Prefs = {
  defaultHoles: 9 | 18
  units: 'yards' | 'meters'
  showHandicap: boolean
  showRank: boolean
  visibility: 'Public' | 'Friends only' | 'Private'
  teePreference: string
}

const DEFAULT_PREFS: Prefs = {
  defaultHoles: 18,
  units: 'yards',
  showHandicap: true,
  showRank: true,
  visibility: 'Public',
  teePreference: 'white',
}

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('dial_prefs') ?? '{}') }
  } catch { return DEFAULT_PREFS }
}

function savePrefs(p: Prefs) {
  try { localStorage.setItem('dial_prefs', JSON.stringify(p)) } catch { /* */ }
}

const TEE_OPTIONS = [
  { id: 'black', hex: '#1F1D17' },
  { id: 'blue',  hex: '#2563EB' },
  { id: 'white', hex: '#E0D8C5' },
  { id: 'red',   hex: '#DC2626' },
  { id: 'gold',  hex: '#C8A84B' },
  { id: 'green', hex: '#5C7A4D' },
]

const PW_RULES = [
  { test: (s: string) => s.length >= 8,            label: 'At least 8 characters' },
  { test: (s: string) => /[A-Z]/.test(s),          label: 'One uppercase letter'  },
  { test: (s: string) => /[0-9]/.test(s),          label: 'One number'            },
  { test: (s: string) => /[^A-Za-z0-9]/.test(s),  label: 'One special character' },
]

// ── Primitives ──────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#4A4235', textTransform: 'uppercase', margin: '28px 0 8px 4px' }}>
      {label}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(250,246,234,0.70)', backdropFilter: 'blur(36px) saturate(180%)', WebkitBackdropFilter: 'blur(36px) saturate(180%)', border: '1px solid rgba(255,255,255,0.62)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 24px rgba(31,29,23,0.08), inset 0 1px 0 rgba(255,255,255,0.80)' }}>
      {children}
    </div>
  )
}

function Row({ label, description, last, children }: { label: string; description?: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding: '13px 18px', borderBottom: last ? 'none' : '1px solid rgba(224,216,197,0.5)', display: 'flex', alignItems: 'center', gap: 12, minHeight: 52 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1F1D17', fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
        {description && <div style={{ fontSize: 11.5, color: '#6B5F4E', marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 44, height: 26, borderRadius: 13, background: value ? '#1F3A2A' : '#8B8272', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.22s ease', padding: 0, flexShrink: 0 }}
    >
      <div style={{ width: 20, height: 20, borderRadius: 10, background: '#FAF6EA', position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left 0.22s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} />
    </button>
  )
}

function Segment({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: '#EDE8D4', borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{ padding: '5px 13px', borderRadius: 7, border: 'none', background: value === opt ? '#FAF6EA' : 'transparent', color: value === opt ? '#1F1D17' : '#4A4235', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', boxShadow: value === opt ? '0 1px 4px rgba(31,29,23,0.10)' : 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── Inline text field ──────────────────────────────────────
function EditableRow({
  label, description, value, placeholder, prefix, type = 'text', last, onSave,
}: {
  label: string; description?: string; value: string; placeholder?: string; prefix?: string
  type?: 'text' | 'number'; last?: boolean; onSave: (v: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setDraft(value) }, [value])

  const commit = async () => {
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  const cancel = () => { setDraft(value); setEditing(false) }

  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid rgba(224,216,197,0.5)' }}>
      <div
        style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: editing ? 'default' : 'pointer', minHeight: 52, transition: 'background 0.12s' }}
        onClick={() => { if (!editing) setEditing(true) }}
        onMouseEnter={e => { if (!editing) e.currentTarget.style.background = 'rgba(31,58,42,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1F1D17', fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
          {description && <div style={{ fontSize: 11.5, color: '#6B5F4E', marginTop: 2 }}>{description}</div>}
        </div>
        {!editing && (
          <>
            <div style={{ fontSize: 13.5, color: value ? '#4A4235' : '#8B8272', fontFamily: "'DM Sans', sans-serif", maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value ? `${prefix ?? ''}${value}` : (placeholder ?? '—')}
            </div>
            <ChevronRightIcon size={15} color="#8B8272" />
          </>
        )}
      </div>
      {editing && (
        <div style={{ padding: '0 18px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
          {prefix && <span style={{ fontSize: 14, color: '#4A4235', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>{prefix}</span>}
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
            style={{ flex: 1, background: '#EDE8D4', border: '1.5px solid #1F3A2A', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
          />
          <button onClick={commit} disabled={saving} style={{ width: 34, height: 34, borderRadius: 10, background: '#1F3A2A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <CheckIcon size={14} color="#FAF6EA" />
          </button>
          <button onClick={cancel} style={{ width: 34, height: 34, borderRadius: 10, background: '#EDE8D4', border: '1px solid #E0D8C5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <CloseIcon size={12} color="#4A4235" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────
interface Props {
  profile: UserProfile | null
  userEmail: string
  userId: string
  onProfileSaved: (p: UserProfile) => void
  onSignOut: () => void
  onShowLegal: (doc: 'privacy' | 'terms') => void
  onNavigate: (v: View) => void
  isMobile?: boolean
}

export default function SettingsView({ profile, userEmail, userId, onProfileSaved, onSignOut, onShowLegal, isMobile = false }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savedFlash, setSavedFlash] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password change
  const [showPw, setShowPw] = useState(false)
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const updatePref = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePrefs(next)
  }

  const flash = (msg: string) => {
    setSavedFlash(msg)
    setTimeout(() => setSavedFlash(null), 2000)
  }

  const save = async (patch: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const saved = await upsertProfile(userId, patch)
      onProfileSaved(saved)
      flash('Saved')
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
      setTimeout(() => setSaveError(null), 3000)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(userId, file)
      const saved = await upsertProfile(userId, { avatarUrl: url })
      onProfileSaved(saved)
      flash('Photo updated')
    } catch { setSaveError('Photo upload failed') }
    finally { setUploadingAvatar(false); if (e.target) e.target.value = '' }
  }

  const handlePasswordSave = async () => {
    if (pwNew !== pwConfirm) { setPwError('Passwords do not match'); return }
    const failed = PW_RULES.filter(r => !r.test(pwNew))
    if (failed.length) { setPwError(failed[0].label + ' required'); return }
    setPwSaving(true); setPwError(null)
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwSaving(false)
    if (error) { setPwError(error.message); return }
    setPwSuccess(true)
    setPwNew(''); setPwConfirm('')
    setTimeout(() => { setPwSuccess(false); setShowPw(false) }, 2000)
  }

  const rank = getRank(profile?.rankedPoints ?? 0)
  const displayName = profile?.firstName ? profile.firstName : profile?.username ? `@${profile.username}` : userEmail.split('@')[0]
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const px = isMobile ? 20 : 40

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: `${isMobile ? 28 : 48}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* ── Page title ── */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#D9824D', textTransform: 'uppercase', marginBottom: 8 }}>Your account</div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: isMobile ? 32 : 44, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.035em', margin: '0 0 28px', lineHeight: 1 }}>
        Profile
      </h1>

      {/* ── Flash messages ── */}
      {savedFlash && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1F3A2A', color: '#FAF6EA', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 500, marginBottom: 16, width: 'fit-content' }}>
          <CheckIcon size={13} color="#FAF6EA" /> {savedFlash}
        </div>
      )}
      {saveError && (
        <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#D9824D', marginBottom: 16 }}>
          {saveError}
        </div>
      )}

      {/* ── Profile header card ── */}
      <div style={{ background: 'rgba(31,58,42,0.84)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, padding: '28px 24px', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 8px 32px rgba(31,58,42,0.22), inset 0 1px 0 rgba(255,255,255,0.14)', marginBottom: 4 }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ width: 76, height: 76, borderRadius: 38, background: '#1F3A2A', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 28, color: '#D9824D' }}>{initial}</span>
            }
            {uploadingAvatar && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(31,29,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#FAF6EA', fontSize: 18 }}>…</span>
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, background: '#D9824D', border: '2px solid rgba(31,58,42,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <CameraIcon size={11} color="#FAF6EA" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(250,246,234,0.55)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.username ? `@${profile.username}` : userEmail}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: rank.color + '22', border: `1px solid ${rank.color}44`, borderRadius: 999, padding: '3px 10px 3px 7px' }}>
            <ShieldIcon size={11} color={rank.color} />
            <span style={{ fontSize: 11, fontWeight: 700, color: rank.color, letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>{rank.name}</span>
          </div>
        </div>

        {/* Points */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: '#FAF6EA', letterSpacing: '-0.04em', lineHeight: 1 }}>{profile?.rankedPoints ?? 0}</div>
          <div style={{ fontSize: 10, color: 'rgba(250,246,234,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>points</div>
        </div>
      </div>

      {/* ── ACCOUNT ── */}
      <SectionLabel label="Account" />
      <Card>
        <EditableRow
          label="First Name"
          description="Shown in greetings and match history"
          value={profile?.firstName ?? ''}
          placeholder="Add your first name"
          onSave={v => save({ firstName: v || null })}
        />
        <EditableRow
          label="Username"
          description="Your @handle — visible to other players"
          value={profile?.username ?? ''}
          placeholder="Add a username"
          prefix="@"
          onSave={v => save({ username: v.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20) || null })}
          last
        />
      </Card>

      {/* ── SECURITY ── */}
      <SectionLabel label="Security" />
      <Card>
        <Row label="Email" description="Your sign-in address" last>
          <div style={{ fontSize: 13.5, color: '#4A4235', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
        </Row>
      </Card>

      <div style={{ marginTop: 10 }}>
        <Card>
          <div
            onClick={() => { setShowPw(v => !v); setPwError(null); setPwSuccess(false) }}
            style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 52 }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1F1D17', fontFamily: "'DM Sans', sans-serif" }}>Change password</div>
              {!showPw && <div style={{ fontSize: 11.5, color: '#6B5F4E', marginTop: 2 }}>Update your account password</div>}
            </div>
            <div style={{ transform: showPw ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease' }}>
              <ChevronRightIcon size={15} color="#8B8272" />
            </div>
          </div>

          {showPw && (
            <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pwSuccess ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(92,122,77,0.12)', border: '1px solid rgba(92,122,77,0.3)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#5C7A4D', fontWeight: 500 }}>
                  <CheckIcon size={14} color="#5C7A4D" /> Password updated successfully
                </div>
              ) : (
                <>
                  <input
                    type="password" placeholder="New password" value={pwNew}
                    onChange={e => setPwNew(e.target.value)}
                    style={{ background: '#EDE8D4', border: '1.5px solid #E0D8C5', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                  />
                  <input
                    type="password" placeholder="Confirm new password" value={pwConfirm}
                    onChange={e => setPwConfirm(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handlePasswordSave() }}
                    style={{ background: '#EDE8D4', border: `1.5px solid ${pwConfirm && pwConfirm !== pwNew ? '#D9824D' : '#E0D8C5'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#1F1D17', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                    onBlur={e => { e.currentTarget.style.borderColor = pwConfirm && pwConfirm !== pwNew ? '#D9824D' : '#E0D8C5' }}
                  />
                  {/* Password strength hints */}
                  {pwNew.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PW_RULES.map(r => {
                        const ok = r.test(pwNew)
                        return (
                          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: ok ? '#5C7A4D' : '#6B5F4E', fontWeight: 500 }}>
                            <div style={{ width: 6, height: 6, borderRadius: 3, background: ok ? '#5C7A4D' : '#8B8272' }} />
                            {r.label}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {pwError && (
                    <div style={{ fontSize: 12.5, color: '#D9824D', fontWeight: 500 }}>{pwError}</div>
                  )}
                  <button
                    onClick={handlePasswordSave}
                    disabled={pwSaving || !pwNew || !pwConfirm}
                    style={{ background: pwSaving || !pwNew || !pwConfirm ? '#8B8272' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 12, padding: '11px', fontSize: 13.5, fontWeight: 500, cursor: pwSaving || !pwNew || !pwConfirm ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
                  >
                    {pwSaving ? 'Updating…' : 'Update password'}
                  </button>
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── GOLF PROFILE ── */}
      <SectionLabel label="Golf Profile" />
      <Card>
        <EditableRow
          label="Handicap Index"
          description="Your current official handicap"
          value={profile?.handicapIndex != null ? String(profile.handicapIndex) : ''}
          placeholder="e.g. 14.2"
          type="number"
          onSave={v => save({ handicapIndex: v ? parseFloat(v) : null })}
        />
        <EditableRow
          label="Home Course"
          description="Your regular course"
          value={profile?.homeCourse ?? ''}
          placeholder="Add home course"
          onSave={v => save({ homeCourse: v || null })}
        />

        {/* Preferred tee */}
        <Row label="Preferred Tee" description="Default tee for scorecards" last>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {TEE_OPTIONS.map(t => (
              <button
                key={t.id}
                onClick={() => updatePref({ teePreference: t.id })}
                style={{ width: 22, height: 22, borderRadius: 11, background: t.hex, border: prefs.teePreference === t.id ? '2px solid #1F3A2A' : '2px solid transparent', outline: prefs.teePreference === t.id ? '2px solid rgba(31,58,42,0.3)' : 'none', cursor: 'pointer', transition: 'all 0.15s', boxSizing: 'border-box' }}
              />
            ))}
          </div>
        </Row>
      </Card>

      {/* ── GAME DEFAULTS ── */}
      <SectionLabel label="Game Defaults" />
      <Card>
        <Row label="Default Holes" description="Used when starting a new round">
          <Segment options={['9', '18']} value={String(prefs.defaultHoles)} onChange={v => updatePref({ defaultHoles: parseInt(v) as 9 | 18 })} />
        </Row>
        <Row label="Distance Units" description="Yards or metres on scorecards" last>
          <Segment options={['Yards', 'Meters']} value={prefs.units === 'yards' ? 'Yards' : 'Meters'} onChange={v => updatePref({ units: v === 'Yards' ? 'yards' : 'meters' })} />
        </Row>
      </Card>

      {/* ── GOALS ── */}
      <SectionLabel label="Goals" />
      <Card>
        <EditableRow
          label="Score Goal"
          description="Target score to break"
          value={profile?.goalScore != null ? String(profile.goalScore) : ''}
          placeholder="e.g. 85"
          type="number"
          onSave={v => save({ goalScore: v ? parseInt(v) : null })}
        />
        <EditableRow
          label="Target Handicap"
          description="Handicap you're working toward"
          value={profile?.goalHandicap != null ? String(profile.goalHandicap) : ''}
          placeholder="e.g. 10.0"
          type="number"
          onSave={v => save({ goalHandicap: v ? parseFloat(v) : null })}
          last
        />
      </Card>

      {/* ── PRIVACY ── */}
      <SectionLabel label="Privacy" />
      <Card>
        <Row label="Show handicap on profile" description="Other players can see your handicap index">
          <Toggle value={prefs.showHandicap} onChange={v => updatePref({ showHandicap: v })} />
        </Row>
        <Row label="Show rank publicly" description="Display your tier and points to others">
          <Toggle value={prefs.showRank} onChange={v => updatePref({ showRank: v })} />
        </Row>
        <Row label="Profile visibility" description="Who can find and view your profile" last>
          <Segment options={['Public', 'Friends only', 'Private']} value={prefs.visibility} onChange={v => updatePref({ visibility: v as Prefs['visibility'] })} />
        </Row>
      </Card>

      {/* ── ABOUT ── */}
      <SectionLabel label="About" />
      <Card>
        <Row label="Version" last={false}>
          <span style={{ fontSize: 13.5, color: '#6B5F4E', fontFamily: "'DM Sans', sans-serif" }}>1.0.0</span>
        </Row>
        <div
          onClick={() => onShowLegal('privacy')}
          style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid rgba(224,216,197,0.5)', minHeight: 52 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1F1D17', fontFamily: "'DM Sans', sans-serif" }}>Privacy Policy</div>
          <ChevronRightIcon size={15} color="#8B8272" />
        </div>
        <div
          onClick={() => onShowLegal('terms')}
          style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 52 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1F1D17', fontFamily: "'DM Sans', sans-serif" }}>Terms of Service</div>
          <ChevronRightIcon size={15} color="#8B8272" />
        </div>
      </Card>

      {/* ── SIGN OUT ── */}
      <SectionLabel label="Account actions" />
      <button
        onClick={onSignOut}
        style={{ width: '100%', background: 'rgba(250,246,234,0.62)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 18, padding: '16px', fontSize: 14, fontWeight: 600, color: '#D9824D', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', boxShadow: '0 4px 20px rgba(31,29,23,0.07), inset 0 1px 0 rgba(255,255,255,0.65)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,130,77,0.10)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,246,234,0.62)' }}
      >
        Sign out
      </button>

    </div>
  )
}

