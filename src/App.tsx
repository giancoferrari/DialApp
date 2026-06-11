import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from './contexts/AuthContext'
import { fetchShots, insertShot, setClubDistance } from './lib/shots'
import { fetchCourses } from './lib/courses'
import { fetchRounds } from './lib/rounds'
import { fetchPracticeSessions } from './lib/practice'
import { fetchProfile } from './lib/profile'
import { fetchUnreadTotal } from './lib/messages'
import { fetchNotificationUnread } from './lib/notifications'
import { supabase } from './lib/supabase'
import { useIsMobile } from './hooks/useIsMobile'
import type { Shot, View, Club, Course, Round, PracticeSession, UserProfile } from './types'
import TopNav from './components/TopNav'
import Dashboard from './components/Dashboard'
import BagView from './components/BagView'
import DialInView from './components/DialInView'
import ScorecardView from './components/ScorecardView'
import PracticeView from './components/PracticeView'
import FriendsView from './components/FriendsView'
import MatchesView from './components/MatchesView'
import NotificationsView from './components/NotificationsView'
import ToolsView from './components/ToolsView'
import StatsView from './components/StatsView'
import LeaderboardView from './components/LeaderboardView'
import SettingsView from './components/SettingsView'
import ProfileView from './components/ProfileView'
import MessagesView from './components/MessagesView'
import Portal from './components/Portal'
import { Composer } from './components/ProfilePosts'
import LogShotModal from './components/LogShotModal'
import AuthScreen from './components/AuthScreen'
import LegalModal from './components/LegalModal'
import DialWordmark from './components/DialWordmark'
import Onboarding from './components/Onboarding'

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
    width: '100%', background: '#FFFFFF', border: '1px solid #CDD2CC',
    borderRadius: 10, padding: '13px 16px', fontSize: 16, color: '#171A17',
    fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,26,23,0.45)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '32px 32px 28px', width: '100%', maxWidth: 420, boxShadow: '0 20px 50px rgba(23,26,23,0.18)' }}>
        <DialWordmark size={26} />
        {done ? (
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 650, letterSpacing: '-0.02em', color: '#171A17', marginBottom: 8 }}>
              Password updated
            </div>
            <p style={{ fontSize: 14, color: '#494F49', marginBottom: 24 }}>You're all set. Continue using the app.</p>
            <button
              onClick={clearPasswordRecovery}
              style={{ background: '#12371F', color: '#F2F5F1', border: 'none', borderRadius: 12, padding: '12px 28px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 650, color: '#171A17', letterSpacing: '-0.02em', marginTop: 24, marginBottom: 6 }}>
              Set new password
            </div>
            <p style={{ fontSize: 14, color: '#494F49', marginBottom: 24, lineHeight: 1.5 }}>
              Choose a strong password for your account.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="password" required value={password} placeholder="New password"
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#12371F' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#CDD2CC' }}
              />
              <input
                type="password" required value={confirm} placeholder="Confirm new password"
                onChange={e => setConfirm(e.target.value)}
                style={{ ...inputStyle, borderColor: confirm && confirm !== password ? '#BD3A2D' : '#CDD2CC' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#12371F' }}
                onBlur={e => { e.currentTarget.style.borderColor = confirm && confirm !== password ? '#BD3A2D' : '#CDD2CC' }}
              />
              {error && (
                <div style={{ background: '#FBEDEB', border: '1px solid #EFCBC5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#8C2A21' }}>
                  {error}
                </div>
              )}
              <button
                type="submit" disabled={loading}
                style={{ background: loading ? '#9AA09A' : '#12371F', color: '#F2F5F1', border: 'none', borderRadius: 12, padding: '14px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
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
  // Always open on Home (the main page) on load/reload.
  const [view, setView]               = useState<View>('dashboard')
  const [shots, setShots]             = useState<Shot[]>([])
  const [courses, setCourses]         = useState<Course[]>([])
  const [rounds, setRounds]           = useState<Round[]>([])
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([])
  const [profile, setProfile]         = useState<UserProfile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [, setShotsLoading] = useState(true)
  const [logOpen, setLogOpen]         = useState(false)
  const [logPreclub, setLogPreclub]   = useState<Club | null>(null)
  const [legalDoc, setLegalDoc]       = useState<'privacy' | 'terms' | null>(null)
  const [notifCount, setNotifCount]   = useState(0)
  const [msgUnread, setMsgUnread]     = useState(0)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [messageUserId, setMessageUserId] = useState<string | null>(null)
  const [composing, setComposing]     = useState(false)
  const qc = useQueryClient()
  const [roundAutoKey, setRoundAutoKey] = useState(0)

  const pageRef    = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const prevView   = useRef<View>(view)
  const navStack   = useRef<{ view: View; profileUserId: string | null; messageUserId: string | null }[]>([])
  const scrollPos     = useRef<Record<string, number>>({})  // saved scroll per view
  const pendingScroll = useRef(0)                            // scroll to restore after the next view change
  const navDir        = useRef<'forward' | 'back'>('forward') // drives directional page transitions

  // Restore the saved scroll for the view we just switched to (before paint).
  useLayoutEffect(() => {
    if (isMobile && contentRef.current) contentRef.current.scrollTop = pendingScroll.current
    else if (!isMobile) window.scrollTo(0, pendingScroll.current)
  }, [view, isMobile])

  const refreshNotifCount = useCallback(async () => {
    if (!user) return
    const [{ count: fc }, { count: mc }, nUnread] = await Promise.all([
      supabase.from('friendships').select('id', { count: 'exact', head: true })
        .eq('addressee_id', user.id).eq('status', 'pending'),
      supabase.from('match_players').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('status', 'invited'),
      fetchNotificationUnread(user.id).catch(() => 0),
    ])
    setNotifCount((fc ?? 0) + (mc ?? 0) + nUnread)
  }, [user])

  const refreshMsgUnread = useCallback(async () => {
    if (!user) return
    try { setMsgUnread(await fetchUnreadTotal(user.id)) } catch { /* table may not exist yet */ }
  }, [user])

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
      .finally(() => { setShotsLoading(false); setProfileLoaded(true) })
    refreshNotifCount()
    refreshMsgUnread()
  }, [user, refreshNotifCount, refreshMsgUnread])

  // Keep the top-bar badges live: friend requests, match invites & new messages
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`app-badge-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` }, refreshNotifCount)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players', filter: `user_id=eq.${user.id}` }, refreshNotifCount)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, refreshNotifCount)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refreshMsgUnread)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, refreshNotifCount, refreshMsgUnread])

  useGSAP(() => {
    if (!pageRef.current || prevView.current === view) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Directional: forward views enter from the right, back from the left.
      const fromX = navDir.current === 'back' ? -28 : 28
      gsap.fromTo(pageRef.current, { opacity: 0, x: fromX, scale: 0.995 }, { opacity: 1, x: 0, scale: 1, duration: 0.34, ease: 'power3.out' })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(pageRef.current, { opacity: 1, x: 0, scale: 1 })
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

  const handleCloseLog = () => { setLogOpen(false); setLogPreclub(null) }

  const handleLogShot = () => { setLogPreclub(null); setLogOpen(true) }

  const handleLogRound = () => {
    setRoundAutoKey(k => k + 1)
    handleSetView('rounds')
  }

  const handleNotif = () => { handleSetView('notifications') }

  const handleMessages = () => { setMessageUserId(null); handleSetView('messages') }

  const handleMessageUser = (uid: string) => { setMessageUserId(uid); handleSetView('messages', { force: true, keepMessageTarget: true }) }

  const handleViewProfile = (uid: string) => { handleSetView('profile', { profileUserId: uid }) }

  const handlePost = () => setComposing(true)

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

  const applyView = (v: View) => {
    if (pageRef.current) {
      // Exit toward the opposite edge of the incoming direction.
      const toX = navDir.current === 'back' ? 18 : -18
      gsap.to(pageRef.current, {
        opacity: 0, x: toX, scale: 0.995, duration: 0.15, ease: 'power2.in',
        onComplete: () => { setView(v) },
      })
    } else {
      setView(v)
    }
  }

  const handleSetView = (v: View, opts?: { profileUserId?: string; force?: boolean; keepMessageTarget?: boolean; isBack?: boolean }) => {
    if (v === view && v !== 'profile' && v !== 'messages' && !opts?.force) return
    navDir.current = opts?.isBack ? 'back' : 'forward'
    // Save the outgoing view's scroll; restore the destination's (0 for a fresh drill-in).
    scrollPos.current[view] = isMobile ? (contentRef.current?.scrollTop ?? 0) : window.scrollY
    const fresh = !!opts?.profileUserId || !!opts?.keepMessageTarget
    pendingScroll.current = fresh ? 0 : (scrollPos.current[v] ?? 0)
    // Record where we came from so a back arrow can return there.
    if (!opts?.isBack) {
      navStack.current = [...navStack.current, { view, profileUserId, messageUserId }].slice(-25)
    }
    // 'profile' nav resets to own profile unless a specific user was requested
    if (v === 'profile') setProfileUserId(opts?.profileUserId ?? null)
    // 'messages' nav resets to the inbox unless opening a specific thread
    if (v === 'messages' && !opts?.keepMessageTarget) setMessageUserId(null)
    applyView(v)
  }

  const goBack = () => {
    navDir.current = 'back'
    scrollPos.current[view] = isMobile ? (contentRef.current?.scrollTop ?? 0) : window.scrollY
    const stack = navStack.current
    if (!stack.length) { pendingScroll.current = scrollPos.current['dashboard'] ?? 0; setProfileUserId(null); setMessageUserId(null); applyView('dashboard'); return }
    const prev = stack[stack.length - 1]
    navStack.current = stack.slice(0, -1)
    pendingScroll.current = scrollPos.current[prev.view] ?? 0
    setProfileUserId(prev.profileUserId)
    setMessageUserId(prev.messageUserId)
    applyView(prev.view)
  }

  const shellStyle: React.CSSProperties = isMobile
    ? { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }
    : { minHeight: '100vh', position: 'relative' }

  const contentStyle: React.CSSProperties = isMobile
    ? { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never, paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)' }
    : {}

  // New users (no username yet) must complete onboarding before entering.
  if (profileLoaded && !isPasswordRecovery && (!profile || !profile.username)) {
    return <Onboarding userId={user!.id} existingProfile={profile} isMobile={isMobile} onComplete={setProfile} />
  }

  return (
    <>
      {/* ── Background: warm cream with a soft top light (prototype screen) ── */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(circle at 63% 0%, rgba(255,255,255,0.72), transparent 22rem), linear-gradient(180deg, #FFFAF0 0%, #F8F3E7 45%, #F6EFDF 100%)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* ── All app content at z-index 2+ ───────────────────── */}
      <div style={{ ...shellStyle, position: 'relative', zIndex: 2 }}>
      {isPasswordRecovery && <SetNewPasswordModal />}
      <TopNav
        view={view}
        onView={handleSetView}
        onLogShot={handleLogShot}
        onLogRound={handleLogRound}
        onPost={handlePost}
        onNotif={handleNotif}
        onMessages={handleMessages}
        onProfile={() => handleSetView('profile')}
        userEmail={user?.email ?? ''}
        avatarUrl={profile?.avatarUrl ?? null}
        onSignOut={signOut}
        isMobile={isMobile}
        notifCount={notifCount}
        msgUnread={msgUnread}
      />

      <div ref={contentRef} style={contentStyle}>
        <div ref={pageRef}>
          {view === 'dashboard' && (
            <Dashboard
              profile={profile}
              userId={user!.id}
              rounds={rounds}
              onNavigate={handleSetView}
              onViewProfile={handleViewProfile}
              isMobile={isMobile}
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
              key={roundAutoKey}
              courses={courses}
              rounds={rounds}
              onCourseAdded={c => setCourses(prev => [c, ...prev])}
              onCourseDeleted={id => setCourses(prev => prev.filter(c => c.id !== id))}
              onRoundAdded={r => setRounds(prev => [r, ...prev.filter(x => x.id !== r.id)])}
              onRoundDeleted={id => setRounds(prev => prev.filter(r => r.id !== id))}
              isMobile={isMobile}
              homeCourse={profile?.homeCourse ?? null}
              autoStart={roundAutoKey > 0}
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
              meId={user!.id}
              viewUserId={profileUserId ?? user!.id}
              userEmail={user?.email ?? ''}
              isMobile={isMobile}
              onNavigate={handleSetView}
              onBack={goBack}
              onMessage={handleMessageUser}
              onViewProfile={handleViewProfile}
            />
          )}
          {view === 'settings' && (
            <SettingsView
              profile={profile}
              userEmail={user?.email ?? ''}
              userId={user!.id}
              onProfileSaved={setProfile}
              onSignOut={signOut}
              onShowLegal={setLegalDoc}
              onNavigate={handleSetView}
              onBack={goBack}
              isMobile={isMobile}
            />
          )}
          {view === 'messages' && (
            <MessagesView
              key={messageUserId ?? 'inbox'}
              userId={user!.id}
              isMobile={isMobile}
              startUserId={messageUserId}
              onUnreadChange={refreshMsgUnread}
              onViewProfile={handleViewProfile}
            />
          )}
          {view === 'friends' && (
            <FriendsView userId={user!.id} isMobile={isMobile} onViewProfile={handleViewProfile} onNavigate={handleSetView} />
          )}
          {view === 'matches' && (
            <MatchesView userId={user!.id} isMobile={isMobile} />
          )}
          {view === 'notifications' && (
            <NotificationsView userId={user!.id} isMobile={isMobile} onCountChange={setNotifCount} />
          )}
          {view === 'tools' && (
            <ToolsView onNavigate={handleSetView} isMobile={isMobile} />
          )}
          {view === 'stats' && (
            <StatsView rounds={rounds} shots={shots} onNavigate={handleSetView} isMobile={isMobile} />
          )}
          {view === 'leaderboard' && (
            <LeaderboardView meId={user!.id} isMobile={isMobile} onBack={goBack} onViewProfile={handleViewProfile} />
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

      {composing && (
        <Portal>
          <Composer
            meId={user!.id}
            isMobile={isMobile}
            onClose={() => setComposing(false)}
            onCreated={() => { setComposing(false); qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['userPosts'] }); handleSetView('profile') }}
          />
        </Portal>
      )}
      </div>
    </>
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

