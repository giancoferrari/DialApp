import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from './contexts/AuthContext'
import { fetchShots, insertShot } from './lib/shots'
import type { Shot, View, Club } from './types'
import TopNav from './components/TopNav'
import Dashboard from './components/Dashboard'
import BagView from './components/BagView'
import LogShotModal from './components/LogShotModal'
import AuthScreen from './components/AuthScreen'
import LegalModal from './components/LegalModal'
import DialWordmark from './components/DialWordmark'

gsap.registerPlugin(useGSAP)

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <DialWordmark size={32} />
    </div>
  )
}

function AppShell() {
  const { user, signOut } = useAuth()
  const [view, setView]             = useState<View>('dashboard')
  const [shots, setShots]           = useState<Shot[]>([])
  const [shotsLoading, setShotsLoading] = useState(true)
  const [logOpen, setLogOpen]       = useState(false)
  const [logPreclub, setLogPreclub] = useState<Club | null>(null)
  const [legalDoc, setLegalDoc]     = useState<'privacy' | 'terms' | null>(null)

  const pageRef  = useRef<HTMLDivElement>(null)
  const prevView = useRef<View>(view)

  // Load shots from Supabase when user is available
  useEffect(() => {
    if (!user) return
    setShotsLoading(true)
    fetchShots()
      .then(data => setShots(data))
      .catch(console.error)
      .finally(() => setShotsLoading(false))
  }, [user])

  // Crossfade on view change
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
    // Optimistic update
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

  const handleSetView = (v: View) => {
    if (v === view) return
    if (pageRef.current) {
      gsap.to(pageRef.current, {
        opacity: 0, y: -8, duration: 0.18, ease: 'power2.in',
        onComplete: () => setView(v),
      })
    } else {
      setView(v)
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <TopNav
        view={view}
        onView={handleSetView}
        onLog={handleLog}
        userEmail={user?.email ?? ''}
        onSignOut={signOut}
      />

      <div ref={pageRef}>
        {view === 'dashboard' && (
          <Dashboard
            shots={shots}
            loading={shotsLoading}
            onOpenBag={() => handleSetView('bag')}
            onLog={handleLog}
            onLogFor={handleLogFor}
          />
        )}
        {view === 'bag' && (
          <BagView shots={shots} onLogFor={handleLogFor} />
        )}
      </div>

      <LogShotModal
        open={logOpen}
        preclub={logPreclub}
        shots={shots}
        onClose={handleCloseLog}
        onSave={handleSave}
      />

      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}

      {/* Background blobs */}
      <div style={{
        position: 'fixed', bottom: -120, left: -80,
        width: 320, height: 320, background: '#B5C29A', opacity: 0.15,
        borderRadius: '58% 42% 62% 38% / 47% 56% 44% 53%',
        zIndex: -1, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', top: '40%', right: -180,
        width: 380, height: 380, background: '#D9824D', opacity: 0.06,
        borderRadius: '60% 40% 55% 45% / 50% 52% 48% 50%',
        zIndex: -1, pointerEvents: 'none',
      }} />
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
