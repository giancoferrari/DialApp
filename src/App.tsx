import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from './contexts/AuthContext'
import { fetchShots, insertShot, setClubDistance } from './lib/shots'
import { fetchCourses } from './lib/courses'
import { fetchRounds } from './lib/rounds'
import { fetchPracticeSessions } from './lib/practice'
import { fetchProfile } from './lib/profile'
import { useIsMobile } from './hooks/useIsMobile'
import type { Shot, View, Club, Course, Round, PracticeSession, UserProfile } from './types'
import TopNav from './components/TopNav'
import Dashboard from './components/Dashboard'
import BagView from './components/BagView'
import DialInView from './components/DialInView'
import ScorecardView from './components/ScorecardView'
import PracticeView from './components/PracticeView'
import ProfileView from './components/ProfileView'
import LogShotModal from './components/LogShotModal'
import AuthScreen from './components/AuthScreen'
import LegalModal from './components/LegalModal'
import DialWordmark from './components/DialWordmark'

gsap.registerPlugin(useGSAP)

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <DialWordmark size={32} />
    </div>
  )
}

function SetNewPasswordModal() {
  const { updatePassword, clearPasswordRecovery } = useAuth()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8)            return 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(pw))        return 'Must contain at least one uppercase letter.'
    if (!/[0-9]/.test(pw))        return 'Must contain at least one number.'
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Must contain at least one special character.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError(null)
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) { setError(err) }
    else { setDone(true) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#FAF6EA', border: '1px solid #E0D8C5',
    borderRadius: 14, padding: '13px 16px', fontSize: 15, color: '#1F1D17',
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,29,23,0.6)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#F0EBDD', borderRadius: 28, padding: '36px 40px', width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(31,58,42,0.2)' }}>
        <DialWordmark size={28} />
        {done ? (
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: '#1F1D17', marginBottom: 10 }}>
              Password updated!
            </div>
            <p style={{ fontSize: 14, color: '#6B6857', marginBottom: 24 }}>You're all set. Continue using the app.</p>
            <button
              onClick={clearPasswordRecovery}
              style={{ background: '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '12px 28px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#1F1D17', letterSpacing: '-0.025em', marginTop: 20, marginBottom: 6 }}>
              Set new password
            </div>
            <p style={{ fontSize: 14, color: '#6B6857', marginBottom: 24, lineHeight: 1.5 }}>
              Choose a strong password for your account.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="password" required value={password} placeholder="New password"
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E0D8C5' }}
              />
              <input
                type="password" required value={confirm} placeholder="Confirm new password"
                onChange={e => setConfirm(e.target.value)}
                style={{ ...inputStyle, borderColor: confirm && confirm !== password ? '#D9824D' : '#E0D8C5' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1F3A2A' }}
                onBlur={e => { e.currentTarget.style.borderColor = confirm && confirm !== password ? '#D9824D' : '#E0D8C5' }}
              />
              {error && (
                <div style={{ background: 'rgba(217,130,77,0.10)', border: '1px solid rgba(217,130,77,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D9824D' }}>
                  {error}
                </div>
              )}
              <button
                type="submit" disabled={loading}
                style={{ background: loading ? '#C9C0A8' : '#1F3A2A', color: '#FAF6EA', border: 'none', borderRadius: 999, padding: '14px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
              >
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function AppShell() {
  const { user, signOut, isPasswordRecovery } = useAuth()
  const isMobile = useIsMobile()
  const [view, setView]               = useState<View>(() => {
    try { return (localStorage.getItem('dial_view') as View | null) ?? 'dashboard' }
    catch { return 'dashboard' }
  })
  const [shots, setShots]             = useState<Shot[]>([])
  const [courses, setCourses]         = useState<Course[]>([])
  const [rounds, setRounds]           = useState<Round[]>([])
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([])
  const [profile, setProfile]         = useState<UserProfile | null>(null)
  const [shotsLoading, setShotsLoading] = useState(true)
  const [logOpen, setLogOpen]         = useState(false)
  const [logPreclub, setLogPreclub]   = useState<Club | null>(null)
  const [legalDoc, setLegalDoc]       = useState<'privacy' | 'terms' | null>(null)

  const pageRef    = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const prevView   = useRef<View>(view)

  useEffect(() => {
    if (!user) return
    setShotsLoading(true)
    Promise.all([
      fetchShots(user.id),
      fetchCourses(user.id),
      fetchRounds(user.id),
      fetchPracticeSessions(user.id),
      fetchProfile(user.id),
    ])
      .then(([s, c, r, p, prof]) => {
        setShots(s); setCourses(c); setRounds(r)
        setPracticeSessions(p); setProfile(prof)
      })
      .catch(console.error)
      .finally(() => setShotsLoading(false))
  }, [user])

  useGSAP(() => {
    if (!pageRef.current || prevView.current === view) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(pageRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out' })
    })
    prevView.current = view
    return () => mm.revert()
  }, { dependencies: [view] })

  const handleSave = async (shot: Shot) => {
    setShots(prev => [shot, ...prev])
    try {
      const saved = await insertShot(user!.id, { clubId: shot.clubId, yardage: shot.yardage, ts: shot.ts, note: shot.note })
      setShots(prev => prev.map(s => s.id === shot.id ? saved : s))
    } catch (err) {
      console.error('Failed to save shot:', err)
      setShots(prev => prev.filter(s => s.id !== shot.id))
    }
  }

  const handleLog    = () => { setLogPreclub(null); setLogOpen(true) }
  const handleLogFor = (club: Club) => { setLogPreclub(club); setLogOpen(true) }
  const handleCloseLog = () => { setLogOpen(false); setLogPreclub(null) }

  const handleSetDistance = async (clubId: string, yardage: number) => {
    if (!user) return
    const tempId = -Date.now()
    setShots(prev => [
      { id: tempId, clubId, yardage, ts: Date.now(), note: '' },
      ...prev.filter(s => s.clubId !== clubId),
    ])
    try {
      const saved = await setClubDistance(user.id, clubId, yardage)
      setShots(prev => prev.map(s => s.id === tempId ? saved : s))
    } catch (err) {
      console.error('Failed to set distance:', err)
      setShots(prev => prev.filter(s => s.id !== tempId))
    }
  }

  const handleSetView = (v: View) => {
    if (v === view) return
    try { localStorage.setItem('dial_view', v) } catch { /* */ }
    const resetScroll = () => {
      if (contentRef.current) contentRef.current.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    if (pageRef.current) {
      gsap.to(pageRef.current, {
        opacity: 0, y: -8, duration: 0.18, ease: 'power2.in',
        onComplete: () => { setView(v); resetScroll() },
      })
    } else {
      setView(v); resetScroll()
    }
  }

  const shellStyle: React.CSSProperties = isMobile
    ? { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }
    : { minHeight: '100vh', position: 'relative' }

  const contentStyle: React.CSSProperties = isMobile
    ? { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never, paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }
    : {}

  return (
    <div style={shellStyle}>
      {isPasswordRecovery && <SetNewPasswordModal />}
      <TopNav
        view={view}
        onView={handleSetView}
        onLog={handleLog}
        onProfile={() => handleSetView('profile')}
        userEmail={user?.email ?? ''}
        avatarUrl={profile?.avatarUrl ?? null}
        onSignOut={signOut}
        isMobile={isMobile}
      />

      <div ref={contentRef} style={contentStyle}>
        <div ref={pageRef}>
          {view === 'dashboard' && (
            <Dashboard
              shots={shots}
              loading={shotsLoading}
              onOpenBag={() => handleSetView('bag')}
              onLog={handleLog}
              onLogFor={handleLogFor}
              isMobile={isMobile}
              userName={user?.user_metadata?.first_name ?? ''}
            />
          )}
          {view === 'bag' && (
            <BagView shots={shots} onSetDistance={handleSetDistance} isMobile={isMobile} />
          )}
          {view === 'dialin' && (
            <DialInView shots={shots} isMobile={isMobile} />
          )}
          {view === 'rounds' && (
            <ScorecardView
              courses={courses}
              rounds={rounds}
              onCourseAdded={c => setCourses(prev => [c, ...prev])}
              onCourseDeleted={id => setCourses(prev => prev.filter(c => c.id !== id))}
              onRoundAdded={r => setRounds(prev => [r, ...prev.filter(x => x.id !== r.id)])}
              onRoundDeleted={id => setRounds(prev => prev.filter(r => r.id !== id))}
              isMobile={isMobile}
              homeCourse={profile?.homeCourse ?? null}
            />
          )}
          {view === 'practice' && (
            <PracticeView
              sessions={practiceSessions}
              onSave={s => setPracticeSessions(prev => [s, ...prev])}
              onDelete={id => setPracticeSessions(prev => prev.filter(s => s.id !== id))}
              isMobile={isMobile}
            />
          )}
          {view === 'profile' && (
            <ProfileView
              profile={profile}
              userEmail={user?.email ?? ''}
              shots={shots}
              rounds={rounds}
              userId={user!.id}
              onProfileSaved={setProfile}
              onSignOut={signOut}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>

      <LogShotModal
        open={logOpen}
        preclub={logPreclub}
        shots={shots}
        onClose={handleCloseLog}
        onSave={handleSave}
        isMobile={isMobile}
      />

      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}

      <div style={{ position: 'fixed', bottom: -120, left: -80, width: 320, height: 320, background: '#B5C29A', opacity: 0.15, borderRadius: '58% 42% 62% 38% / 47% 56% 44% 53%', zIndex: -1, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '40%', right: -180, width: 380, height: 380, background: '#D9824D', opacity: 0.06, borderRadius: '60% 40% 55% 45% / 50% 52% 48% 50%', zIndex: -1, pointerEvents: 'none' }} />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null)

  if (loading) return <LoadingScreen />

  if (!user) {
    return (
      <>
        <AuthScreen onShowLegal={setLegalDoc} />
        {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
      </>
    )
  }

  return <AppShell />
}
