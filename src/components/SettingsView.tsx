import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { upsertProfile, uploadAvatar, deleteAccount } from '../lib/profile'
import type { UserProfile, View } from '../types'
import { getRank } from '../lib/points'
import { CameraIcon, CheckIcon, CloseIcon, ShieldIcon, ChevronRightIcon, ChevronLeftIcon } from './Icons'
import CountryPicker from './CountryPicker'
import Portal from './Portal'
import { useEdgeSwipeBack } from '../hooks/useGestures'
import { color, font, radius, onHero } from '../lib/tokens'
import { card as cardSurface } from '../lib/surfaces'

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
  { id: 'black', hex: '#1A1C1A' },
  { id: 'blue',  hex: '#2563EB' },
  { id: 'white', hex: '#E4E6E1' },
  { id: 'red',   hex: '#C0392B' },
  { id: 'gold',  hex: '#A8852F' },
  { id: 'green', hex: '#35704F' },
]

const PW_RULES = [
  { test: (s: string) => s.length >= 8,            label: 'At least 8 characters' },
  { test: (s: string) => /[A-Z]/.test(s),          label: 'One uppercase letter'  },
  { test: (s: string) => /[0-9]/.test(s),          label: 'One number'            },
  { test: (s: string) => /[^A-Za-z0-9]/.test(s),  label: 'One special character' },
]

const DIVIDER = `1px solid ${color.border}`

// ── Primitives ──────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, margin: '26px 0 8px 2px' }}>
      {label}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...cardSurface, overflow: 'hidden' }}>
      {children}
    </div>
  )
}

function Row({ label, description, last, children }: { label: string; description?: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding: '13px 16px', borderBottom: last ? 'none' : DIVIDER, display: 'flex', alignItems: 'center', gap: 12, minHeight: 52 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: color.ink, fontFamily: font.body }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-pressed={value}
      style={{ width: 44, height: 26, borderRadius: 13, background: value ? color.green : color.borderStrong, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.22s ease', padding: 0, flexShrink: 0 }}
    >
      <div style={{ width: 20, height: 20, borderRadius: 10, background: color.white, position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left 0.22s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </button>
  )
}

function Segment({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: color.sand, borderRadius: radius.sm, padding: 3, gap: 2, flexShrink: 0 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: value === opt ? color.white : 'transparent', color: value === opt ? color.ink : color.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', boxShadow: value === opt ? '0 1px 3px rgba(23,26,23,0.08)' : 'none', fontFamily: font.body, whiteSpace: 'nowrap' }}>
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
    <div style={{ borderBottom: last ? 'none' : DIVIDER }}>
      <div
        style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: editing ? 'default' : 'pointer', minHeight: 52, transition: 'background 0.12s' }}
        onClick={() => { if (!editing) setEditing(true) }}
        onMouseEnter={e => { if (!editing) e.currentTarget.style.background = color.sand }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: color.ink, fontFamily: font.body }}>{label}</div>
          {description && <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>{description}</div>}
        </div>
        {!editing && (
          <>
            <div style={{ fontSize: 14, color: value ? color.inkSoft : color.faint, fontFamily: font.body, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value ? `${prefix ?? ''}${value}` : (placeholder ?? '—')}
            </div>
            <ChevronRightIcon size={15} color={color.faint} />
          </>
        )}
      </div>
      {editing && (
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
          {prefix && <span style={{ fontSize: 14, color: color.inkSoft, fontFamily: font.body, flexShrink: 0 }}>{prefix}</span>}
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
            style={{ flex: 1, background: color.sand, border: `1px solid ${color.green}`, borderRadius: radius.sm, padding: '9px 12px', fontSize: 16, color: color.ink, outline: 'none', fontFamily: font.body }}
          />
          <button onClick={commit} disabled={saving} aria-label="Save" style={{ width: 34, height: 34, borderRadius: radius.sm, background: color.green, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <CheckIcon size={14} color={color.onGreen} />
          </button>
          <button onClick={cancel} aria-label="Cancel" style={{ width: 34, height: 34, borderRadius: radius.sm, background: color.sand, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <CloseIcon size={12} color={color.inkSoft} />
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
  onBack?: () => void
  isMobile?: boolean
}

export default function SettingsView({ profile, userEmail, userId, onProfileSaved, onSignOut, onShowLegal, onNavigate, onBack, isMobile = false }: Props) {
  useEdgeSwipeBack(() => (onBack ? onBack() : onNavigate('profile')))
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

  // Delete account
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') return
    setDeleting(true); setDeleteError(null)
    try {
      await deleteAccount()
      // Account + session are gone server-side; clear local state and bounce out.
      onSignOut()
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete your account. Please try again.')
      setDeleting(false)
    }
  }

  const rank = getRank(profile?.rankedPoints ?? 0)
  const displayName = profile?.firstName ? profile.firstName : profile?.username ? `@${profile.username}` : userEmail.split('@')[0]
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const px = isMobile ? 20 : 40

  const pwInput = (extraBorder?: string): React.CSSProperties => ({
    background: color.sand, border: `1px solid ${extraBorder ?? color.border}`, borderRadius: radius.sm, padding: '10px 14px', fontSize: 16, color: color.ink, outline: 'none', fontFamily: font.body,
  })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: `${isMobile ? 24 : 44}px ${px}px ${isMobile ? 120 : 80}px` }}>

      {/* ── Page title ── */}
      <button
        onClick={() => (onBack ? onBack() : onNavigate('profile'))}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 500, color: color.inkSoft, padding: 0, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}
      >
        <ChevronLeftIcon size={18} color={color.inkSoft} /> Back
      </button>
      <h1 style={{ fontFamily: font.display, fontSize: isMobile ? 30 : 36, fontWeight: 600, color: color.ink, letterSpacing: '-0.02em', margin: '0 0 22px', lineHeight: 1 }}>
        Settings
      </h1>

      {/* ── Flash messages ── */}
      {savedFlash && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: color.green, color: color.onGreen, borderRadius: radius.md, padding: '10px 16px', fontSize: 13, fontWeight: 500, marginBottom: 16, width: 'fit-content' }}>
          <CheckIcon size={13} color="#9FD4B4" /> {savedFlash}
        </div>
      )}
      {saveError && (
        <div style={{ background: '#FBEDEB', border: '1px solid #EFCBC5', borderRadius: radius.md, padding: '10px 14px', fontSize: 13, color: color.dangerDeep, marginBottom: 16 }}>
          {saveError}
        </div>
      )}

      {/* ── Profile header card (dark) ── */}
      <div style={{ background: color.green, borderRadius: radius.lg, padding: '24px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ width: 72, height: 72, borderRadius: 36, background: 'rgba(255,255,255,0.10)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.16)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: font.body, fontWeight: 600, fontSize: 26, color: color.onGreen }}>{initial}</span>
            }
            {uploadingAvatar && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,17,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: color.onGreen, fontSize: 18 }}>…</span>
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change photo"
            style={{ position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, background: color.white, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <CameraIcon size={12} color={color.green} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600, color: color.onGreen, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </div>
          <div style={{ fontSize: 12.5, color: onHero.faint, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.username ? `@${profile.username}` : userEmail}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: onHero.fill, border: `1px solid ${onHero.border}`, borderRadius: 999, padding: '3px 11px 3px 8px' }}>
            <ShieldIcon size={11} color={rank.color} />
            <span style={{ fontSize: 12, fontWeight: 600, color: color.onGreen, fontFamily: font.body }}>{rank.name}</span>
          </div>
        </div>

        {/* Points */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: font.display, fontSize: 26, fontWeight: 600, color: color.onGreen, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{profile?.rankedPoints ?? 0}</div>
          <div style={{ fontSize: 11, color: onHero.faint, fontWeight: 500, marginTop: 3 }}>points</div>
        </div>
      </div>

      {/* ── ACCOUNT ── */}
      <SectionLabel label="Account" />
      <Card>
        <EditableRow
          label="First name"
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

      {/* ── LOCATION ── */}
      <SectionLabel label="Location" />
      <Card>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: color.ink, fontFamily: font.body, marginBottom: 4 }}>Country</div>
          <div style={{ fontSize: 12, color: color.muted, marginBottom: 10 }}>Your flag shows on your profile</div>
          <CountryPicker value={profile?.country ?? null} onChange={code => save({ country: code })} isMobile={isMobile} />
        </div>
      </Card>

      {/* ── SECURITY ── */}
      <SectionLabel label="Security" />
      <Card>
        <Row label="Email" description="Your sign-in address" last>
          <div style={{ fontSize: 14, color: color.inkSoft, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
        </Row>
      </Card>

      <div style={{ marginTop: 10 }}>
        <Card>
          <div
            onClick={() => { setShowPw(v => !v); setPwError(null); setPwSuccess(false) }}
            style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 52 }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: color.ink, fontFamily: font.body }}>Change password</div>
              {!showPw && <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>Update your account password</div>}
            </div>
            <div style={{ transform: showPw ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease' }}>
              <ChevronRightIcon size={15} color={color.faint} />
            </div>
          </div>

          {showPw && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pwSuccess ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: color.greenTint, border: `1px solid ${color.sageLight}`, borderRadius: radius.md, padding: '12px 14px', fontSize: 13, color: color.greenDeep, fontWeight: 500 }}>
                  <CheckIcon size={14} color={color.positive} /> Password updated successfully
                </div>
              ) : (
                <>
                  <input
                    type="password" placeholder="New password" value={pwNew}
                    onChange={e => setPwNew(e.target.value)}
                    style={pwInput()}
                    onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                    onBlur={e => { e.currentTarget.style.borderColor = color.border }}
                  />
                  <input
                    type="password" placeholder="Confirm new password" value={pwConfirm}
                    onChange={e => setPwConfirm(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handlePasswordSave() }}
                    style={pwInput(pwConfirm && pwConfirm !== pwNew ? color.danger : color.border)}
                    onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                    onBlur={e => { e.currentTarget.style.borderColor = pwConfirm && pwConfirm !== pwNew ? color.danger : color.border }}
                  />
                  {pwNew.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {PW_RULES.map(r => {
                        const ok = r.test(pwNew)
                        return (
                          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: ok ? color.positive : color.muted, fontWeight: 500 }}>
                            <div style={{ width: 6, height: 6, borderRadius: 3, background: ok ? color.positive : color.borderStrong }} />
                            {r.label}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {pwError && (
                    <div style={{ fontSize: 12.5, color: color.danger, fontWeight: 500 }}>{pwError}</div>
                  )}
                  <button
                    onClick={handlePasswordSave}
                    disabled={pwSaving || !pwNew || !pwConfirm}
                    style={{ background: pwSaving || !pwNew || !pwConfirm ? color.borderStrong : color.green, color: pwSaving || !pwNew || !pwConfirm ? color.inkSoft : color.onGreen, border: 'none', borderRadius: radius.md, padding: '11px', fontSize: 14, fontWeight: 600, cursor: pwSaving || !pwNew || !pwConfirm ? 'not-allowed' : 'pointer', fontFamily: font.body, transition: 'background 0.15s' }}
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
      <SectionLabel label="Golf profile" />
      <Card>
        <EditableRow
          label="Handicap index"
          description="Your current official handicap"
          value={profile?.handicapIndex != null ? String(profile.handicapIndex) : ''}
          placeholder="e.g. 14.2"
          type="number"
          onSave={v => save({ handicapIndex: v ? parseFloat(v) : null })}
        />
        <EditableRow
          label="Home course"
          description="Your regular course"
          value={profile?.homeCourse ?? ''}
          placeholder="Add home course"
          onSave={v => save({ homeCourse: v || null })}
        />

        {/* Preferred tee */}
        <Row label="Preferred tee" description="Default tee for scorecards" last>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {TEE_OPTIONS.map(t => (
              <button
                key={t.id}
                onClick={() => updatePref({ teePreference: t.id })}
                aria-label={`${t.id} tee`}
                style={{ width: 22, height: 22, borderRadius: 11, background: t.hex, border: `1px solid ${color.border}`, outline: prefs.teePreference === t.id ? `2px solid ${color.green}` : 'none', outlineOffset: 1, cursor: 'pointer', transition: 'all 0.15s', boxSizing: 'border-box' }}
              />
            ))}
          </div>
        </Row>
      </Card>

      {/* ── GAME DEFAULTS ── */}
      <SectionLabel label="Game defaults" />
      <Card>
        <Row label="Default holes" description="Used when starting a new round">
          <Segment options={['9', '18']} value={String(prefs.defaultHoles)} onChange={v => updatePref({ defaultHoles: parseInt(v) as 9 | 18 })} />
        </Row>
        <Row label="Distance units" description="Yards or metres on scorecards" last>
          <Segment options={['Yards', 'Meters']} value={prefs.units === 'yards' ? 'Yards' : 'Meters'} onChange={v => updatePref({ units: v === 'Yards' ? 'yards' : 'meters' })} />
        </Row>
      </Card>

      {/* ── GOALS ── */}
      <SectionLabel label="Goals" />
      <Card>
        <EditableRow
          label="Score goal"
          description="Target score to break"
          value={profile?.goalScore != null ? String(profile.goalScore) : ''}
          placeholder="e.g. 85"
          type="number"
          onSave={v => save({ goalScore: v ? parseInt(v) : null })}
        />
        <EditableRow
          label="Target handicap"
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
        <Row label="Version">
          <span style={{ fontSize: 14, color: color.muted, fontFamily: font.body }}>1.0.0</span>
        </Row>
        <div
          onClick={() => onShowLegal('privacy')}
          style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: DIVIDER, minHeight: 52 }}
          onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: color.ink, fontFamily: font.body }}>Privacy Policy</div>
          <ChevronRightIcon size={15} color={color.faint} />
        </div>
        <div
          onClick={() => onShowLegal('terms')}
          style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 52 }}
          onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: color.ink, fontFamily: font.body }}>Terms of Service</div>
          <ChevronRightIcon size={15} color={color.faint} />
        </div>
      </Card>

      {/* ── SIGN OUT ── */}
      <SectionLabel label="Account actions" />
      <button
        onClick={onSignOut}
        style={{ width: '100%', ...cardSurface, padding: '16px', fontSize: 14, fontWeight: 600, color: color.ink, cursor: 'pointer', fontFamily: font.body, transition: 'background 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = color.sand }}
        onMouseLeave={e => { e.currentTarget.style.background = color.white }}
      >
        Sign out
      </button>

      {/* ── DANGER ZONE ── */}
      <SectionLabel label="Danger zone" />
      <Card>
        <div
          onClick={() => { setShowDelete(true); setDeleteConfirm(''); setDeleteError(null) }}
          style={{ padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 52 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FBEDEB' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: color.danger, fontFamily: font.body }}>Delete account</div>
            <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>Permanently erase your account and all your data</div>
          </div>
          <ChevronRightIcon size={15} color={color.danger} />
        </div>
      </Card>

      {/* ── DELETE CONFIRMATION ── */}
      {showDelete && (
        <Portal>
          <div
            onClick={() => { if (!deleting) setShowDelete(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(23,26,23,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24, animation: 'fadeIn 0.2s ease' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 420, background: color.sheet, borderRadius: isMobile ? '24px 24px 0 0' : radius.sheet, padding: '26px 24px calc(env(safe-area-inset-bottom) + 24px)', boxShadow: '0 24px 52px rgba(42,36,24,0.30)', animation: isMobile ? 'slideUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)' : 'scaleIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 24, background: '#FBEDEB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>⚠️</span>
              </div>
              <h2 style={{ margin: 0, fontFamily: font.display, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: color.ink }}>
                Delete your account?
              </h2>
              <p style={{ margin: '10px 0 0', fontFamily: font.body, fontSize: 14, lineHeight: 1.55, color: color.muted }}>
                This is permanent. Your profile, rounds, matches, posts, messages and stats will be erased and cannot be recovered.
              </p>
              <div style={{ marginTop: 18, fontFamily: font.body, fontSize: 13, fontWeight: 500, color: color.inkSoft, marginBottom: 8 }}>
                Type <span style={{ fontWeight: 700, color: color.ink }}>DELETE</span> to confirm
              </div>
              <input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', background: color.white, border: `1.5px solid ${deleteConfirm && deleteConfirm.trim().toUpperCase() !== 'DELETE' ? color.danger : color.border}`, borderRadius: radius.sm, padding: '13px 14px', fontSize: 16, color: color.ink, outline: 'none', fontFamily: font.body, letterSpacing: '0.04em' }}
                onKeyDown={e => { if (e.key === 'Enter') handleDeleteAccount() }}
              />
              {deleteError && (
                <div style={{ marginTop: 12, background: '#FBEDEB', border: '1px solid #EFCBC5', borderRadius: radius.sm, padding: '10px 14px', fontSize: 13, color: color.dangerDeep, lineHeight: 1.45 }}>
                  {deleteError}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm.trim().toUpperCase() !== 'DELETE'}
                  style={{ width: '100%', border: 'none', borderRadius: radius.md, padding: '14px', fontFamily: font.body, fontSize: 15, fontWeight: 600, cursor: deleting || deleteConfirm.trim().toUpperCase() !== 'DELETE' ? 'not-allowed' : 'pointer', background: deleting || deleteConfirm.trim().toUpperCase() !== 'DELETE' ? color.borderStrong : color.danger, color: deleting || deleteConfirm.trim().toUpperCase() !== 'DELETE' ? color.muted : '#FFFFFF', transition: 'background 0.15s' }}
                >
                  {deleting ? 'Deleting…' : 'Delete my account'}
                </button>
                <button
                  onClick={() => { if (!deleting) setShowDelete(false) }}
                  disabled={deleting}
                  style={{ width: '100%', border: 'none', borderRadius: radius.md, padding: '14px', fontFamily: font.body, fontSize: 15, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', background: 'transparent', color: color.inkSoft }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

    </div>
  )
}
