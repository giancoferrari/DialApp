import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import DialWordmark from './DialWordmark'
import CountryPicker from './CountryPicker'

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

  if (score <= 1) return { score, label: 'Weak',   color: '#D9824D' }
  if (score <= 2) return { score, label: 'Fair',   color: '#C8A84B' }
  if (score <= 3) return { score, label: 'Good',   color: '#5C7A4D' }
  return             { score, label: 'Strong', color: '#1F3A2A' }
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
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }
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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#FAF6EA',
    border: '1px solid #E0D8C5', borderRadius: 14,
    padding: '13px 16px', fontSize: 15, color: '#1F1D17',
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.08em', color: '#4A4235',
    textTransform: 'uppercase', marginBottom: 6,
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div ref={containerRef} style={{ width: '100%', maxWidth: 460 }}>

        {/* Wordmark + tagline */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <DialWordmark size={36} />
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 15,
            color: '#4A4235', marginTop: 8, marginBottom: 0,
          }}>
            Your personal yardage book.
          </p>
        </div>

        {/* Main card */}
        <div style={{
          background: '#FFFDF8',
          border: '1px solid #E0D8C5',
          borderRadius: 28, padding: '32px 36px',
          boxShadow: '0 8px 40px rgba(31,58,42,0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
        }}>
          {confirmed ? (
            /* Email confirmation sent state */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32,
                background: '#1F3A2A', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    stroke="#D9824D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                color: '#5C7A4D', textTransform: 'uppercase', marginBottom: 8,
              }}>
                Check your inbox
              </div>
              <div style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 24, fontWeight: 700, color: '#1F1D17',
                letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 12,
              }}>
                Confirm your email
              </div>
              <p style={{ fontSize: 14, color: '#4A4235', lineHeight: 1.6, marginBottom: 20 }}>
                We sent a verification link to{' '}
                <strong style={{ color: '#1F1D17' }}>{email}</strong>.
                Click it to activate your account, then come back here to sign in.
              </p>
              <p style={{ fontSize: 12, color: '#6B5F4E' }}>
                Don't see it? Check your spam folder.
              </p>
              <button
                onClick={() => { setConfirmed(false); setMode('signin') }}
                style={{
                  marginTop: 20, background: 'transparent', border: 'none',
                  color: '#1F3A2A', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'underline',
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Mode tabs — hidden when in forgot mode */}
              {mode !== 'forgot' && (
                <div style={{
                  display: 'flex', gap: 4, background: '#F0EBDD',
                  border: '1px solid #E0D8C5', borderRadius: 999,
                  padding: 4, marginBottom: 28,
                }}>
                  {(['signin', 'signup'] as Mode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      style={{
                        flex: 1, border: 'none', borderRadius: 999,
                        padding: '9px 0', cursor: 'pointer',
                        background: mode === m ? '#1F3A2A' : 'transparent',
                        color: mode === m ? '#FAF6EA' : '#4A4235',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13.5, fontWeight: 500,
                        transition: 'all 0.18s ease',
                      }}
                      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      {m === 'signin' ? 'Sign in' : 'Create account'}
                    </button>
                  ))}
                </div>
              )}

              {/* Form */}
              <div ref={formRef}>
                {/* Forgot password form */}
                {mode === 'forgot' && (
                  <div>
                    <button
                      onClick={() => switchMode('signin')}
                      style={{ background: 'none', border: 'none', color: '#4A4235', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: 20, padding: 0 }}
                    >
                      ← Back to sign in
                    </button>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.025em', marginBottom: 8 }}>
                      Reset password
                    </div>
                    <p style={{ fontSize: 14, color: '#4A4235', lineHeight: 1.55, marginBottom: 24 }}>
                      Enter your email and we'll send you a link to reset your password. The link expires in 30 minutes.
                    </p>
                    {resetSent ? (
                      <div style={{ background: 'rgba(92,122,77,0.10)', border: '1px solid rgba(92,122,77,0.3)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#3D5C2A', lineHeight: 1.5 }}>
                        <strong>Check your inbox.</strong> We sent a reset link to <strong>{email}</strong>. It expires in 30 minutes.
                        <div style={{ marginTop: 12 }}>
                          <button
                            onClick={() => switchMode('signin')}
                            style={{ background: 'none', border: 'none', color: '#1F3A2A', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline', padding: 0 }}
                          >
                            Back to sign in
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>Email</label>
                          <input
                            type="email" required value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            style={inputStyle}
                            onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                          />
                        </div>
                        {error && (
                          <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D' }}>
                            {error}
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={loading || cooldown > 0}
                          style={{ width: '100%', background: (loading || cooldown > 0) ? '#8B8272' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '14px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: (loading || cooldown > 0) ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { if (!loading && !cooldown) e.currentTarget.style.background = '#16271D' }}
                          onMouseLeave={e => { if (!loading && !cooldown) e.currentTarget.style.background = '#1F3A2A' }}
                        >
                          {loading ? 'Sending…' : cooldown > 0 ? `Try again in ${cooldown}s` : 'Send reset link'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: mode === 'forgot' ? 'none' : undefined }}>

                  {/* First + last name — signup only */}
                  {mode === 'signup' && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>First name</label>
                        <input
                          type="text" required value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder="First name"
                          style={inputStyle}
                          onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Last name</label>
                        <input
                          type="text" required value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder="Last name"
                          style={inputStyle}
                          onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Username — signup only */}
                  {mode === 'signup' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Username</label>
                      <input
                        type="text" required value={username}
                        onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                        placeholder="e.g. tigerwoods99"
                        style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                      />
                      <div style={{ fontSize: 11, color: '#6B5F4E', marginTop: 5 }}>
                        Used to find you on Dial. Min. 3 characters, no spaces.
                      </div>
                    </div>
                  )}

                  {/* Country — signup only */}
                  {mode === 'signup' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Country</label>
                      <CountryPicker value={country} onChange={setCountry} />
                      <div style={{ fontSize: 11, color: '#6B5F4E', marginTop: 5 }}>
                        Your flag appears on your profile. You can change this later.
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>{mode === 'signin' ? 'Email or username' : 'Email'}</label>
                    <input
                      type={mode === 'signin' ? 'text' : 'email'} required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={mode === 'signin' ? 'you@example.com or @username' : 'you@example.com'}
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                    />
                  </div>

                  {/* Password */}
                  <div style={{ marginBottom: mode === 'signup' ? 8 : 12 }}>
                    <label style={labelStyle}>Password</label>
                    <input
                      type="password" required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                      style={inputStyle}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#1F3A2A'
                        if (mode === 'signup') setShowPwHints(true)
                      }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
                    />
                  </div>

                  {/* Forgot password link — sign-in only */}
                  {mode === 'signin' && (
                    <div style={{ textAlign: 'right', marginBottom: 20, marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        style={{ background: 'none', border: 'none', color: '#5C7A4D', fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0, fontWeight: 500 }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Password strength — signup only */}
                  {mode === 'signup' && showPwHints && password && strength && (
                    <div style={{ marginBottom: 14 }}>
                      {/* Strength bar */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: strength.score >= i ? strength.color : '#E0D8C5',
                            transition: 'background 0.2s',
                          }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: strength.color, fontWeight: 500 }}>
                        {strength.label} password
                      </div>
                      {/* Requirements */}
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {[
                          { ok: password.length >= 8,          text: 'At least 8 characters' },
                          { ok: /[A-Z]/.test(password),         text: 'One uppercase letter' },
                          { ok: /[0-9]/.test(password),         text: 'One number' },
                          { ok: /[^A-Za-z0-9]/.test(password),  text: 'One special character (! @ # $ ...)' },
                        ].map(req => (
                          <div key={req.text} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 11.5, color: req.ok ? '#5C7A4D' : '#6B5F4E',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 10 10">
                              {req.ok
                                ? <path d="M1.5 5.5l2.5 2.5 4.5-5" stroke="#5C7A4D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                : <circle cx="5" cy="5" r="2" fill="#E0D8C5"/>
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
                          borderColor: confirm && confirm !== password ? '#D9824D' : '#E0D8C5',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor =
                            confirm && confirm !== password ? '#D9824D' : '#E0D8C5'
                        }}
                      />
                      {confirm && confirm !== password && (
                        <div style={{ fontSize: 11.5, color: '#D9824D', marginTop: 5 }}>
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
                            <button type="button" onClick={() => onShowLegal('terms')} style={{ background: 'none', border: 'none', color: '#1F3A2A', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Terms of Service</button>
                          </>,
                        },
                        {
                          checked: agreePrivacy,
                          onChange: () => setAgreePrivacy(v => !v),
                          label: <>I have read the{' '}
                            <button type="button" onClick={() => onShowLegal('privacy')} style={{ background: 'none', border: 'none', color: '#1F3A2A', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Privacy Policy</button>
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
                              border: `1.5px solid ${item.checked ? '#1F3A2A' : '#8B8272'}`,
                              background: item.checked ? '#1F3A2A' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s', cursor: 'pointer',
                            }}
                          >
                            {item.checked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="#FAF6EA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span style={{ fontSize: 13, color: '#4A4235', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div style={{
                      background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)',
                      borderRadius: 10, padding: '10px 14px',
                      fontSize: 13, color: '#D9824D', marginBottom: 16,
                    }}>
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || cooldown > 0}
                    style={{
                      width: '100%', background: (loading || cooldown > 0) ? '#8B8272' : '#1F3A2A',
                      color: '#FAF6EA', border: 'none', borderRadius: 999,
                      padding: '14px 24px', fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14, fontWeight: 500, cursor: (loading || cooldown > 0) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!loading && !cooldown) e.currentTarget.style.background = '#16271D' }}
                    onMouseLeave={e => { if (!loading && !cooldown) e.currentTarget.style.background = '#1F3A2A' }}
                    onMouseDown={e => { if (!loading && !cooldown) e.currentTarget.style.transform = 'scale(0.98)' }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {loading ? 'Please wait…'
                      : cooldown > 0 ? `Try again in ${cooldown}s`
                      : mode === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Legal footer — sign-in only */}
        {mode !== 'signup' && (
          <p style={{
            textAlign: 'center', fontSize: 12, color: '#6B5F4E',
            marginTop: 20, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
          }}>
            <button onClick={() => onShowLegal('terms')} style={{
              background: 'none', border: 'none', color: '#4A4235', fontSize: 12,
              cursor: 'pointer', textDecoration: 'underline', padding: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Terms of Service
            </button>
            {' '}·{' '}
            <button onClick={() => onShowLegal('privacy')} style={{
              background: 'none', border: 'none', color: '#4A4235', fontSize: 12,
              cursor: 'pointer', textDecoration: 'underline', padding: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Privacy Policy
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

