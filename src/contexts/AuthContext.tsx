import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { upsertProfile } from '../lib/profile'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isPasswordRecovery: boolean
  signIn: (emailOrUsername: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, firstName: string, lastName: string, username: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  clearPasswordRecovery: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                         = useState<User | null>(null)
  const [session, setSession]                   = useState<Session | null>(null)
  const [loading, setLoading]                   = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    // Request persistent storage so iOS doesn't clear the auth token
    if (navigator.storage?.persist) navigator.storage.persist()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Access token may be expired — refresh proactively
        const expires = session.expires_at ? session.expires_at * 1000 : 0
        if (expires && expires < Date.now()) {
          const { data } = await supabase.auth.refreshSession()
          setSession(data.session)
          setUser(data.session?.user ?? null)
        } else {
          setSession(session)
          setUser(session.user)
        }
      } else {
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (emailOrUsername: string, password: string) => {
    let email = emailOrUsername.trim()
    if (!email.includes('@')) {
      const { data, error: rpcErr } = await supabase.rpc('get_email_by_username', { lookup_username: email })
      if (rpcErr || !data) return { error: 'No account found with that username.' }
      email = data as string
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`.trim(), username },
      },
    })
    if (error) return { error: error.message }
    if (data.user) {
      try { await upsertProfile(data.user.id, { username }) } catch { /* non-fatal */ }
    }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error: error?.message ?? null }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) setIsPasswordRecovery(false)
    return { error: error?.message ?? null }
  }

  const clearPasswordRecovery = () => setIsPasswordRecovery(false)

  return (
    <AuthContext.Provider value={{ user, session, loading, isPasswordRecovery, signIn, signUp, signOut, resetPasswordForEmail, updatePassword, clearPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
