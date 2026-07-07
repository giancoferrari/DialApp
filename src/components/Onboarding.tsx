import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { upsertProfile, uploadAvatar } from '../lib/profile'
import type { UserProfile } from '../types'
import { color, space, radius, font } from '../lib/tokens'
import { CameraIcon, CheckIcon } from './Icons'
import CountryPicker from './CountryPicker'
import CourseSearch from './CourseSearch'
import DialWordmark from './DialWordmark'
import { flagEmoji, countryName } from '../lib/countries'

// First-run onboarding. Gated for new users (no username yet). Name, username
// and country are already collected at sign-up — so we PREFILL them from the
// auth metadata / existing profile and skip those steps entirely, never asking
// twice. Onboarding then only adds what sign-up didn't: handicap, home course
// and a photo. Green branded welcome/finish bookends a calm, cream flow.

type StepKey = 'welcome' | 'name' | 'country' | 'handicap' | 'course' | 'photo' | 'finish'

export default function Onboarding({ userId, existingProfile, onComplete, isMobile = false }: {
  userId: string
  existingProfile: UserProfile | null
  onComplete: (profile: UserProfile) => void
  isMobile?: boolean
}) {
  // Sign-up already captured name, username and country. Prefer the saved
  // profile, then fall back to the auth metadata stored at sign-up.
  const { user } = useAuth()
  const meta = (user?.user_metadata ?? {}) as { first_name?: string; username?: string }
  const initFirst    = (existingProfile?.firstName ?? meta.first_name ?? '').trim()
  const initUsername = (existingProfile?.username ?? meta.username ?? '').trim().toLowerCase()
  const initCountry  = existingProfile?.country ?? null

  // Only ask for things sign-up didn't already give us.
  const haveName    = initFirst.length >= 1 && /^[a-z0-9_]{3,20}$/.test(initUsername)
  const haveCountry = !!initCountry
  const STEPS: StepKey[] = [
    'welcome',
    ...(haveName ? [] : ['name'] as StepKey[]),
    ...(haveCountry ? [] : ['country'] as StepKey[]),
    'handicap', 'course', 'photo', 'finish',
  ]
  const INPUT_STEPS: StepKey[] = STEPS.filter(s => s !== 'welcome' && s !== 'finish')

  const [step, setStep] = useState<StepKey>('welcome')
  const [dir, setDir]   = useState(0) // bump to retrigger the step-in animation

  const [firstName, setFirstName] = useState(initFirst)
  const [username, setUsername]   = useState(initUsername)
  const [country, setCountry]     = useState<string | null>(initCountry)
  const [handicap, setHandicap]   = useState(existingProfile?.handicapIndex != null ? String(existingProfile.handicapIndex) : '')
  const [homeCourse, setHomeCourse] = useState(existingProfile?.homeCourse ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(existingProfile?.avatarUrl ?? null)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const [usernameErr, setUsernameErr] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveErr, setSaveErr]   = useState<string | null>(null)
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null)

  const go = (next: StepKey) => { setStep(next); setDir(d => d + 1) }
  const idx = STEPS.indexOf(step)
  const nextStep = () => go(STEPS[Math.min(idx + 1, STEPS.length - 1)])
  const prevStep = () => go(STEPS[Math.max(idx - 1, 0)])

  // ── Step 1 validation ──────────────────────────────────────────────────
  const nameValid = firstName.trim().length >= 1 && /^[a-z0-9_]{3,20}$/.test(username)

  const submitName = async () => {
    setUsernameErr(null)
    if (firstName.trim().length < 1) return
    const u = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setUsernameErr('3–20 letters, numbers or underscores.'); return }
    setChecking(true)
    try {
      const { data } = await supabase.from('user_profiles').select('user_id').eq('username', u).neq('user_id', userId).maybeSingle()
      if (data) { setUsernameErr('That username is taken.'); setChecking(false); return }
    } catch { /* if the check fails, let the DB constraint catch it at save */ }
    setChecking(false)
    nextStep()
  }

  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarBusy(true)
    try { setAvatarUrl(await uploadAvatar(userId, f)) }
    catch { /* ignore — they can set it later in Settings */ }
    finally { setAvatarBusy(false) }
  }

  // ── Commit everything, then show the finish screen ──────────────────────
  const commit = async () => {
    setSaving(true); setSaveErr(null)
    try {
      const hcp = handicap.trim() ? Number(handicap) : null
      const profile = await upsertProfile(userId, {
        firstName: firstName.trim(),
        username: username.trim().toLowerCase(),
        country: country ?? null,
        handicapIndex: hcp != null && !Number.isNaN(hcp) ? hcp : null,
        homeCourse: homeCourse.trim() || null,
        avatarUrl: avatarUrl ?? null,
      })
      setSavedProfile(profile)
      go('finish')
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : 'Could not save your profile. Try again.')
    } finally { setSaving(false) }
  }

  const finishProfile = () => { if (savedProfile) onComplete(savedProfile) }

  const onGreen = step === 'welcome' || step === 'finish'
  const pad = isMobile ? space[5] : space[7]

  // ── Shared bits ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: color.white,
    border: `1.5px solid ${color.border}`, borderRadius: radius.md,
    padding: '15px 16px', fontSize: 16, color: color.ink, outline: 'none',
    fontFamily: font.body,
  }
  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = color.green }
  const blur  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = color.border }

  const PrimaryBtn = ({ label, onClick, disabled, onAccent }: { label: string; onClick: () => void; disabled?: boolean; onAccent?: boolean }) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', border: 'none', borderRadius: radius.md, padding: '16px',
      fontFamily: font.body, fontSize: 16, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? color.borderStrong : (onAccent ? color.white : color.green),
      color: disabled ? color.muted : (onAccent ? color.green : color.onGreen),
      transition: 'transform 0.15s cubic-bezier(0.22,1,0.36,1), background 0.15s',
    }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >{label}</button>
  )

  const headline = (text: string, sub?: string) => (
    <div style={{ marginBottom: space[6] }}>
      <h1 style={{ margin: 0, fontFamily: font.display, fontSize: isMobile ? 30 : 38, lineHeight: 1.05, letterSpacing: '-0.03em', fontWeight: 700, color: color.ink }}>{text}</h1>
      {sub && <p style={{ margin: `${space[3]}px 0 0`, fontFamily: font.body, fontSize: 15, lineHeight: 1.5, color: color.muted }}>{sub}</p>}
    </div>
  )

  // Bottom action row for the cream input steps.
  const actions = (primary: React.ReactNode, opts?: { back?: boolean; skip?: () => void }) => (
    <div style={{ marginTop: 'auto', paddingTop: space[6], display: 'flex', flexDirection: 'column', gap: space[3] }}>
      {primary}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: space[5], minHeight: 20 }}>
        {opts?.back !== false && (
          <button onClick={prevStep} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.body, fontSize: 14, color: color.faint, padding: 0 }}>Back</button>
        )}
        {opts?.skip && (
          <button onClick={opts.skip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.muted, padding: 0 }}>Skip for now</button>
        )}
      </div>
    </div>
  )

  const progress = INPUT_STEPS.includes(step) ? (INPUT_STEPS.indexOf(step) + 1) / INPUT_STEPS.length : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: onGreen
        ? `radial-gradient(ellipse 120% 80% at 50% 0%, ${color.greenMid}22 0%, transparent 55%), ${color.green}`
        : `radial-gradient(ellipse 130% 70% at 5% 100%, rgba(52,82,37,0.10) 0%, transparent 55%), ${color.cream}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transition: 'background 0.4s ease',
    }}>
      {/* Progress bar — only on the cream input steps */}
      {progress > 0 && (
        <div style={{ paddingTop: `calc(env(safe-area-inset-top) + ${space[5]}px)`, paddingLeft: pad, paddingRight: pad }}>
          <div style={{ height: 4, borderRadius: 999, background: color.creamDeep, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: color.green, borderRadius: 999, transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
        </div>
      )}

      <div
        key={dir}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: `${space[6]}px ${pad}px calc(env(safe-area-inset-bottom) + ${space[6]}px)`,
          maxWidth: 460, width: '100%', margin: '0 auto',
          animation: 'onboardIn 0.36s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ paddingTop: `calc(env(safe-area-inset-top) + ${space[6]}px)` }}><DialWordmark size={26} onDark /></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{ margin: 0, fontFamily: font.display, fontSize: isMobile ? 40 : 52, lineHeight: 1.02, letterSpacing: '-0.04em', fontWeight: 700, color: color.cream }}>
                Welcome to the clubhouse.
              </h1>
              <p style={{ margin: `${space[5]}px 0 0`, fontFamily: font.body, fontSize: 17, lineHeight: 1.55, color: 'rgba(242,245,241,0.72)', maxWidth: 360 }}>
                Let's set up your player profile — it takes about a minute, and you can change anything later.
              </p>
            </div>
            <PrimaryBtn label="Get started" onClick={nextStep} onAccent />
          </div>
        )}

        {/* ── NAME + USERNAME (required) ── */}
        {step === 'name' && (
          <>
            {headline("First, the basics", "This is how other golfers will find and recognize you.")}
            <div style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
              <div>
                <label style={{ display: 'block', fontFamily: font.body, fontSize: 13, fontWeight: 500, color: color.inkSoft, marginBottom: space[2] }}>Name</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Your name" style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: font.body, fontSize: 13, fontWeight: 500, color: color.inkSoft, marginBottom: space[2] }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: color.faint, pointerEvents: 'none' }}>@</span>
                  <input
                    value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameErr(null) }}
                    placeholder="username" maxLength={20}
                    style={{ ...inputStyle, paddingLeft: 30, borderColor: usernameErr ? color.danger : color.border }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>
                <div style={{ minHeight: 18, marginTop: space[2], fontFamily: font.body, fontSize: 12.5, color: usernameErr ? color.danger : color.faint }}>
                  {usernameErr ?? 'Lowercase letters, numbers and underscores.'}
                </div>
              </div>
            </div>
            {actions(
              <PrimaryBtn label={checking ? 'Checking…' : 'Continue'} onClick={submitName} disabled={!nameValid || checking} />,
              { back: false },
            )}
          </>
        )}

        {/* ── COUNTRY ── */}
        {step === 'country' && (
          <>
            {headline("Where do you play?", "Your flag shows up on your profile, the leaderboard and in matches.")}
            <CountryPicker value={country} onChange={setCountry} isMobile={isMobile} zIndex={600} />
            {country && (
              <div style={{ marginTop: space[4], display: 'flex', alignItems: 'center', gap: space[3], padding: space[4], background: color.white, border: `1px solid ${color.border}`, borderRadius: radius.card }}>
                <span style={{ fontSize: 30, lineHeight: 1 }}>{flagEmoji(country)}</span>
                <span style={{ fontFamily: font.body, fontSize: 15, fontWeight: 600, color: color.ink }}>{countryName(country)}</span>
              </div>
            )}
            {actions(
              <PrimaryBtn label="Continue" onClick={nextStep} disabled={!country} />,
              { skip: nextStep },
            )}
          </>
        )}

        {/* ── HANDICAP ── */}
        {step === 'handicap' && (
          <>
            {headline("What's your handicap?", "Helps us track your progress. You can skip this.")}
            <input
              value={handicap}
              onChange={e => setHandicap(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="e.g. 12.4" inputMode="decimal"
              style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums', fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: '-0.01em' }}
              onFocus={focus} onBlur={blur}
            />
            {actions(
              <PrimaryBtn label="Continue" onClick={nextStep} disabled={!handicap.trim()} />,
              { skip: nextStep },
            )}
          </>
        )}

        {/* ── HOME COURSE ── */}
        {step === 'course' && (
          <>
            {headline("Your home course?", "Where you play most. Search by name — or skip and add it later.")}
            <CourseSearch value={homeCourse} onChange={setHomeCourse} onSelect={() => {}} placeholder="Search courses…" />
            {actions(
              <PrimaryBtn label="Continue" onClick={nextStep} disabled={!homeCourse.trim()} />,
              { skip: nextStep },
            )}
          </>
        )}

        {/* ── PHOTO ── */}
        {step === 'photo' && (
          <>
            {headline("Add a profile photo", "A friendly face makes the feed feel alive. Optional, of course.")}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: space[2] }}>
              <label style={{ cursor: 'pointer', position: 'relative' }}>
                <input type="file" accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
                <div style={{
                  width: 140, height: 140, borderRadius: '50%', overflow: 'hidden',
                  background: avatarUrl ? color.green : color.white,
                  border: `2px dashed ${avatarUrl ? 'transparent' : color.borderStrong}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: avatarUrl ? '0 12px 32px rgba(31,58,42,0.20)' : 'none',
                }}>
                  {avatarBusy
                    ? <span style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>Uploading…</span>
                    : avatarUrl
                      ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space[2], color: color.faint }}>
                          <CameraIcon size={30} color={color.faint} />
                          <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 500 }}>Tap to add</span>
                        </div>}
                </div>
              </label>
            </div>
            {saveErr && <div style={{ marginTop: space[4], textAlign: 'center', fontFamily: font.body, fontSize: 13, color: color.danger }}>{saveErr}</div>}
            {actions(
              <PrimaryBtn label={saving ? 'Saving…' : 'Finish'} onClick={commit} disabled={saving} />,
              { skip: () => { if (!saving) commit() } },
            )}
          </>
        )}

        {/* ── FINISH ── */}
        {step === 'finish' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ paddingTop: `calc(env(safe-area-inset-top) + ${space[6]}px)` }}><DialWordmark size={26} onDark /></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(159,212,180,0.16)', border: '1px solid rgba(159,212,180,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: space[5], animation: 'popIn 0.5s cubic-bezier(0.22,1,0.36,1)' }}>
                <CheckIcon size={30} color="#9FD4B4" />
              </div>
              <h1 style={{ margin: 0, fontFamily: font.display, fontSize: isMobile ? 38 : 48, lineHeight: 1.03, letterSpacing: '-0.04em', fontWeight: 700, color: color.cream }}>
                You're all set{firstName.trim() ? `, ${firstName.trim()}` : ''}.
              </h1>
              <p style={{ margin: `${space[5]}px 0 0`, fontFamily: font.body, fontSize: 17, lineHeight: 1.55, color: 'rgba(242,245,241,0.72)', maxWidth: 360 }}>
                Welcome to Dial. Track your shots, log rounds, challenge friends, and climb the ranks.
              </p>
            </div>
            <PrimaryBtn label="Enter Dial" onClick={finishProfile} onAccent />
          </div>
        )}
      </div>
    </div>
  )
}
