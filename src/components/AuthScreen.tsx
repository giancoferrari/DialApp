import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import DialWordmark from './DialWordmark'
import CountryPicker from './CountryPicker'
import { color, font } from '../lib/tokens'

type Mode = 'signin' | 'signup' | 'forgot'

interface Props {
  onShowLegal: (doc: 'privacy' | 'terms') => void
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: 'Weak',   color: color.danger }
  if (score <= 2) return { score, label: 'Fair',   color: color.gold }
  if (score <= 3) return { score, label: 'Good',   color: color.birdie }
  return             { score, label: 'Strong', color: color.green }
}

export default function AuthScreen({ onShowLegal }: Props) {
  const { signIn, signUp, resetPasswordForEmail } = useAuth()
  const [mode, setMode]         = useState<Mode>('signin')
  const [resetSent, setResetSent] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [username, setUsername]   = useState('')
  const [country, setCountry]     = useState<string | null>(null)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [showPwHints, setShowPwHints] = useState(false)

  const [agreeTerms, setAgreeTerms]     = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeAge, setAgreeAge]         = useState(false)

  const [cooldown, setCooldown]   = useState(0)  // seconds remaining
  const cooldownUntil = useRef<number>(0)
  const failCount     = useRef<number>(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const formRef      = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current) }
  }, [])

  const startCooldown = () => {
    failCount.current++
    const secs = Math.min(failCount.current * 30, 120)  // 30s, 60s, 90s, capped at 120s
    cooldownUntil.current = Date.now() + secs * 1000
    setCooldown(secs)
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      const remaining = Math.ceil((cooldownUntil.current - Date.now()) / 1000)
      if (remaining <= 0) {
        setCooldown(0)
        clearInterval(cooldownTimer.current!)
        cooldownTimer.current = null
      } else {
        setCooldown(remaining)
      }
    }, 500)
  }

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        containerRef.current?.children ?? [],
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
      )
    })
    return () => mm.revert()
  }, { scope: containerRef })

  const switchMode = (next: Mode) => {
    if (next === mode) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setMode(next); setError(null); setEmail(''); setPassword(''); setConfirm('')
      setFirstName(''); setLastName(''); setUsername(''); setCountry(null); setShowPwHints(false); setResetSent(false)
      setAgreeTerms(false); setAgreePrivacy(false); setAgreeAge(false)
      return
    }
    gsap.to(formRef.current, {
      opacity: 0, y: 6, duration: 0.15, ease: 'power2.in',
      onComplete: () => {
        setMode(next); setError(null); setEmail(''); setPassword(''); setConfirm('')
        setFirstName(''); setLastName(''); setUsername(''); setCountry(null); setShowPwHints(false); setResetSent(false)
        setAgreeTerms(false); setAgreePrivacy(false); setAgreeAge(false)
        gsap.fromTo(formRef.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' })
      },
    })
  }

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8)            return 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(pw))        return 'Password must contain at least one uppercase letter.'
    if (!/[0-9]/.test(pw))        return 'Password must contain at least one number.'
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain at least one special character (e.g. ! @ # $).'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldown > 0) return
    setError(null)

    if (mode === 'forgot') {
      if (!email.trim()) { setError('Please enter your email.'); return }
      setLoading(true)
      const { error: err } = await resetPasswordForEmail(email.trim())
      setLoading(false)
      if (err) { setError(err); startCooldown() }
      else { setResetSent(true) }
      return
    }

    if (mode === 'signup') {
      if (!firstName.trim()) { setError('Please enter your first name.'); return }
      if (!lastName.trim())  { setError('Please enter your last name.'); return }
      if (!username.trim())  { setError('Please choose a username.'); return }
      if (username.includes('@')) { setError('Username cannot contain @.'); return }
      if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return }
      if (/\s/.test(username)) { setError('Username cannot contain spaces.'); return }
      const pwErr = validatePassword(password)
      if (pwErr) { setError(pwErr); return }
      if (password !== confirm) { setError('Passwords do not match.'); return }
      if (!agreeTerms)   { setError('Please accept the Terms of Service to continue.'); return }
      if (!agreePrivacy) { setError('Please accept the Privacy Policy to continue.'); return }
      if (!agreeAge)     { setError('You must be 18 or older to create an account.'); return }
    }

    setLoading(true)
    const { error: err } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, firstName.trim(), lastName.trim(), username.trim(), country ?? '')
    setLoading(false)

    if (err) {
      setError(err)
      startCooldown()
    } else if (mode === 'signup') {
      setConfirmed(true)
    }
  }

  const strength = password ? passwordStrength(password) : null
  const disabled = loading || cooldown > 0

  const inputStyle: React.CSSProperties = {
    width: '100%', background: color.white,
    border: `1px solid ${color.borderStrong}`, borderRadius: 10,
    padding: '13px 14px', fontSize: 16, color: color.ink,
    fontFamily: font.body, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 500,
    color: color.inkSoft, marginBottom: 6,
  }

  const hintStyle: React.CSSProperties = { fontSize: 12, color: color.muted, marginTop: 6, lineHeight: 1.45 }

  const linkBtn: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontFamily: font.body, fontSize: 'inherit', fontWeight: 500,
    color: color.green, textDecoration: 'underline', textUnderlineOffset: 3,
  }

  const submitBtn: React.CSSProperties = {
    width: '100%', background: disabled ? color.borderStrong : color.green,
    color: disabled ? color.inkSoft : color.onGreen, border: 'none', borderRadius: 12,
    padding: '14px 24px', fontFamily: font.body,
    fontSize: 15, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  }

  const errorBox = error && (
    <div style={{
      background: '#FBEDEB', border: '1px solid #EFCBC5',
      borderRadius: 10, padding: '11px 14px',
      fontSize: 13, lineHeight: 1.45, color: color.dangerDeep, marginBottom: 16,
    }}>
      {error}
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', background: color.cream,
    }}>
      <div ref={containerRef} style={{ width: '100%', maxWidth: 380 }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <DialWordmark size={30} />
        </div>

        {confirmed ? (
          /* Email confirmation sent state */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              background: color.greenTint, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  stroke={color.green} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 650, color: color.ink, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 10px' }}>
              Confirm your email
            </h1>
            <p style={{ fontSize: 14, color: color.inkSoft, lineHeight: 1.6, margin: '0 0 8px' }}>
              We sent a verification link to <strong style={{ color: color.ink, fontWeight: 600 }}>{email}</strong>.
              Click it to activate your account, then come back here to sign in.
            </p>
            <p style={{ fontSize: 13, color: color.muted, margin: 0 }}>
              Don't see it? Check your spam folder.
            </p>
            <button
              onClick={() => { setConfirmed(false); setMode('signin') }}
              style={{ ...linkBtn, fontSize: 14, marginTop: 24 }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <div ref={formRef}>
            {/* Heading */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 650, color: color.ink, letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0 }}>
                {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
              </h1>
              <p style={{ fontSize: 14, color: color.muted, lineHeight: 1.5, margin: '8px 0 0' }}>
                {mode === 'signin' && 'Sign in to your yardage book.'}
                {mode === 'signup' && 'Track rounds, play matches, climb the ranks.'}
                {mode === 'forgot' && "Enter your email and we'll send you a reset link. It expires in 30 minutes."}
              </p>
            </div>

            {/* Forgot password form */}
            {mode === 'forgot' && (
              resetSent ? (
                <div style={{ background: color.greenTint, border: `1px solid ${color.sageLight}`, borderRadius: 12, padding: '14px 16px', fontSize: 14, color: color.greenDeep, lineHeight: 1.55 }}>
                  <strong style={{ fontWeight: 600 }}>Check your inbox.</strong> We sent a reset link to <strong style={{ fontWeight: 600 }}>{email}</strong>. It expires in 30 minutes.
                  <div style={{ marginTop: 12, fontSize: 14 }}>
                    <button onClick={() => switchMode('signin')} style={linkBtn}>Back to sign in</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                      onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                    />
                  </div>
                  {errorBox}
                  <button type="submit" disabled={disabled} style={submitBtn}>
                    {loading ? 'Sending…' : cooldown > 0 ? `Try again in ${cooldown}s` : 'Send reset link'}
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: color.muted }}>
                    <button type="button" onClick={() => switchMode('signin')} style={linkBtn}>Back to sign in</button>
                  </div>
                </form>
              )
            )}

            {/* Sign in / sign up form */}
            <form onSubmit={handleSubmit} style={{ display: mode === 'forgot' ? 'none' : undefined }}>

              {/* First + last name — signup only */}
              {mode === 'signup' && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>First name</label>
                    <input
                      type="text" required value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="First name"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                      onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Last name</label>
                    <input
                      type="text" required value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Last name"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                      onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                    />
                  </div>
                </div>
              )}

              {/* Username — signup only */}
              {mode === 'signup' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Username</label>
                  <input
                    type="text" required value={username}
                    onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                    placeholder="e.g. tigerwoods99"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                    onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                  />
                  <div style={hintStyle}>Used to find you on Dial. At least 3 characters, no spaces.</div>
                </div>
              )}

              {/* Country — signup only */}
              {mode === 'signup' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Country</label>
                  <CountryPicker value={country} onChange={setCountry} />
                  <div style={hintStyle}>Your flag appears on your profile. You can change this later.</div>
                </div>
              )}

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{mode === 'signin' ? 'Email or username' : 'Email'}</label>
                <input
                  type={mode === 'signin' ? 'text' : 'email'} required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={mode === 'signin' ? 'you@example.com or @username' : 'you@example.com'}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                  onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: mode === 'signup' ? 10 : 8 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <label style={labelStyle}>Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font.body, fontSize: 13, fontWeight: 500, color: color.muted }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  style={inputStyle}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = color.green
                    if (mode === 'signup') setShowPwHints(true)
                  }}
                  onBlur={e => { e.currentTarget.style.borderColor = color.borderStrong }}
                />
              </div>

              {/* Password strength — signup only */}
              {mode === 'signup' && showPwHints && password && strength && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: strength.score >= i ? strength.color : color.border,
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: strength.color, fontWeight: 500 }}>
                    {strength.label} password
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[
                      { ok: password.length >= 8,          text: 'At least 8 characters' },
                      { ok: /[A-Z]/.test(password),         text: 'One uppercase letter' },
                      { ok: /[0-9]/.test(password),         text: 'One number' },
                      { ok: /[^A-Za-z0-9]/.test(password),  text: 'One special character (! @ # $ ...)' },
                    ].map(req => (
                      <div key={req.text} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, color: req.ok ? color.positive : color.muted,
                      }}>
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          {req.ok
                            ? <path d="M1.5 5.5l2.5 2.5 4.5-5" stroke={color.positive} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            : <circle cx="5" cy="5" r="2" fill={color.borderStrong}/>
                          }
                        </svg>
                        {req.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm password — signup only */}
              {mode === 'signup' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Confirm password</label>
                  <input
                    type="password" required value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    style={{
                      ...inputStyle,
                      borderColor: confirm && confirm !== password ? color.danger : color.borderStrong,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = color.green }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor =
                        confirm && confirm !== password ? color.danger : color.borderStrong
                    }}
                  />
                  {confirm && confirm !== password && (
                    <div style={{ fontSize: 12, color: color.danger, marginTop: 6 }}>
                      Passwords don't match
                    </div>
                  )}
                </div>
              )}

              {/* Legal checkboxes — signup only */}
              {mode === 'signup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {[
                    {
                      checked: agreeTerms,
                      onChange: () => setAgreeTerms(v => !v),
                      label: <>I agree to the{' '}
                        <button type="button" onClick={() => onShowLegal('terms')} style={{ ...linkBtn, fontSize: 13 }}>Terms of Service</button>
                      </>,
                    },
                    {
                      checked: agreePrivacy,
                      onChange: () => setAgreePrivacy(v => !v),
                      label: <>I have read the{' '}
                        <button type="button" onClick={() => onShowLegal('privacy')} style={{ ...linkBtn, fontSize: 13 }}>Privacy Policy</button>
                      </>,
                    },
                    {
                      checked: agreeAge,
                      onChange: () => setAgreeAge(v => !v),
                      label: 'I confirm that I am 18 years of age or older',
                    },
                  ].map((item, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <div
                        onClick={item.onChange}
                        style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          border: `1.5px solid ${item.checked ? color.green : color.borderStrong}`,
                          background: item.checked ? color.green : color.white,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s', cursor: 'pointer',
                        }}
                      >
                        {item.checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke={color.onGreen} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 13, color: color.inkSoft, lineHeight: 1.4, fontFamily: font.body }}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {errorBox}

              {/* Submit */}
              <button
                type="submit"
                disabled={disabled}
                style={{ ...submitBtn, marginTop: mode === 'signin' ? 16 : 0 }}
                onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = color.greenDeep }}
                onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = color.green }}
              >
                {loading ? 'Please wait…'
                  : cooldown > 0 ? `Try again in ${cooldown}s`
                  : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>

              {/* Mode switch */}
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: color.muted }}>
                {mode === 'signin'
                  ? <>New to Dial?{' '}<button type="button" onClick={() => switchMode('signup')} style={linkBtn}>Create an account</button></>
                  : <>Already have an account?{' '}<button type="button" onClick={() => switchMode('signin')} style={linkBtn}>Sign in</button></>}
              </div>
            </form>
          </div>
        )}

        {/* Legal footer — sign-in only */}
        {mode === 'signin' && !confirmed && (
          <p style={{ textAlign: 'center', fontSize: 12, color: color.faint, marginTop: 32, fontFamily: font.body }}>
            <button onClick={() => onShowLegal('terms')} style={{ background: 'none', border: 'none', color: color.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0, fontFamily: font.body }}>
              Terms of Service
            </button>
            {' '}·{' '}
            <button onClick={() => onShowLegal('privacy')} style={{ background: 'none', border: 'none', color: color.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0, fontFamily: font.body }}>
              Privacy Policy
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
