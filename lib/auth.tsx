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
    // Get initial session with shorter timeout
    const getSession = async () => {
      console.log('[Auth] Starting session fetch...')
      let didFinish = false
      const timeout = setTimeout(() => {
        if (!didFinish) {
          console.warn('[Auth] Session fetch timed out, clearing session')
          setSession(null)
          setUser(null)
          setLoading(false)
        }
      }, 5000) // Increased timeout to 5 seconds
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[Auth] Session fetch result:', { hasSession: !!session, hasUser: !!session?.user, error })
        
        if (error) {
          console.error('[Auth] Error getting session:', error)
          // Don't clear session on network errors, just set loading to false
          setLoading(false)
          return
        } else if (session?.user) {
          console.log('[Auth] Setting session and user immediately')
          // Set session and user immediately
          setSession(session)
          setUser(session.user)
          
          // Then validate the user exists in database (but don't clear session if it fails)
          try {
            console.log('[Auth] Validating user in database...')
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .single()
            
            if (userError) {
              console.warn('[Auth] User not found in database, but keeping session:', userError)
              // Don't clear session, just log the warning
            } else {
              console.log('[Auth] User validated successfully')
            }
          } catch (validationError) {
            console.warn('[Auth] Error validating user in database, but keeping session:', validationError)
            // Don't clear session on validation errors
          }
        } else {
          console.log('[Auth] No session found')
          setSession(null)
          setUser(null)
        }
        
        didFinish = true
        setLoading(false)
        clearTimeout(timeout)
      } catch (err) {
        console.error('[Auth] Error in getSession:', err)
        didFinish = true
        setLoading(false)
        clearTimeout(timeout)
        // Don't clear session on general errors, just set loading to false
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, session?.user?.id)
        
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