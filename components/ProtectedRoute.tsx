'use client'

import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Sparkles } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signInWithGoogle } = useAuth()
  const [isApproved, setIsApproved] = useState<boolean | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (!user) {
      setFetching(false)
      setError(null)
      return
    }
    const fetchApproval = async () => {
      setFetching(true)
      setError(null)
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('is_approved')
        .eq('id', user.id)
        .single()
      
      if (fetchError) {
        console.error('Error fetching approval status:', fetchError)
        if (fetchError.code === 'PGRST116') {
          // User not found in database
          setError('User account not found. Please contact support.')
        } else {
          setError('Failed to check approval status. Please try again.')
        }
        setIsApproved(null)
      } else {
        setIsApproved(data?.is_approved ?? null)
      }
      setFetching(false)
    }
    fetchApproval()
  }, [user])

  // Show spinner/blank if loading, fetching, or isApproved === null (and no error)
  if (loading || (user && fetching) || (user && isApproved === null && !error)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="loader"></div>
      </div>
    )
  }

  // Show error if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow flex flex-col items-center" style={{ minWidth: 320 }}>
          <Sparkles className="w-10 h-10 text-red-400 mb-4" />
          <div className="text-xl font-bold mb-1 text-red-600">Error</div>
          <div className="text-gray-600 mb-2 text-center">{error}</div>
          <button
            type="button"
            className="button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="flex flex-col items-center w-full max-w-md p-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 text-center break-words leading-tight max-w-xs sm:max-w-xl whitespace-normal">Sign in to Create Smarter Content</h1>
          <p className="text-gray-600 text-center mb-8">Generate high-quality, engaging blog posts from your ideas with just a few clicks.</p>
          <button
            type="button"
            className="button"
            onClick={signInWithGoogle}
          >
            <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262">
              <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
              <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
              <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"></path>
              <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    )
  }

  // Show approval page if isApproved === false and not on /profile
  if (isApproved === false && pathname !== '/profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white p-8 rounded-lg shadow flex flex-col items-center" style={{ minWidth: 320 }}>
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.full_name || 'User'}
              className="w-20 h-20 rounded-full mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-gray-400" />
            </div>
          )}
          <div className="text-xl font-bold mb-1">{user.user_metadata?.full_name || 'User'}</div>
          <div className="text-gray-600 mb-2">{user.email}</div>
          <div className="text-sm font-medium mb-2">
            Status: <span className="text-yellow-600">Waiting for admin approval ⏳</span>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            You cannot use the app until your account is approved by an admin.
          </div>
        </div>
      </div>
    )
  }

  // Show normal page if isApproved === true
  return <>{children}</>
} 