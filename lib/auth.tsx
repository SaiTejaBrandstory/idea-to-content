'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from './supabase-client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session with timeout
    const getSession = async () => {
      let didFinish = false
      const timeout = setTimeout(() => {
        if (!didFinish) {
          setLoading(false)
        }
      }, 5000)
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          // Clear any corrupted session data
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
        
        didFinish = true
        setLoading(false)
        clearTimeout(timeout)
      } catch (err) {
        console.error('Error in getSession:', err)
        didFinish = true
        setLoading(false)
        clearTimeout(timeout)
        // Clear session on error
        setSession(null)
        setUser(null)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
        } else if (event === 'TOKEN_REFRESHED') {
          setSession(session)
          setUser(session?.user ?? null)
        } else if (event === 'SIGNED_IN') {
          setSession(session)
          setUser(session?.user ?? null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // First check if we have a valid session
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (!currentSession) {
        // No session exists, just clear local state
        setSession(null)
        setUser(null)
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        // If signOut fails, still clear local state
        console.error('Error signing out:', error)
        setSession(null)
        setUser(null)
        throw error
      }
    } catch (error) {
      console.error('Error in signOut:', error)
      // Always clear local state even if server signOut fails
      setSession(null)
      setUser(null)
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 