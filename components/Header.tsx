'use client'

import { Sparkles, User } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import UserSidebar from './UserSidebar'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import React from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const { user, loading, signInWithGoogle } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<{ created_at: string; last_sign_in_at: string; is_approved: boolean; avatar_url?: string } | null>(null)
  const pathname = usePathname()

  const fetchProfile = async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('created_at, last_sign_in_at, is_approved, avatar_url')
      .eq('id', user.id)
      .single()
    setProfile(data)
  }

  useEffect(() => {
    if (user) fetchProfile()
  }, [user])

  // Listen for storage events to refresh profile when avatar is updated
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'avatar-updated' && user) {
        fetchProfile()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder: implement avatar upload logic here
    alert('Avatar upload not implemented yet!')
  }

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src="/idea.gif" 
                  alt="Idea to Content Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="heading-2 gradient-text font-bold break-words text-base sm:text-lg md:text-xl lg:text-2xl leading-tight max-w-xs sm:max-w-none whitespace-normal">Idea to Content</h1>
                <p className="caption text-gray-500 text-xs sm:text-xs md:text-sm leading-snug whitespace-normal">AI Blog Generator</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`body-text font-medium transition-colors ${
                pathname === '/' 
                  ? 'text-violet-700' 
                  : 'text-black hover:text-violet-700'
              }`}
            >
              Home
            </Link>
            <Link 
              href="/chat" 
              className={`body-text font-medium transition-colors ${
                pathname === '/chat' 
                  ? 'text-violet-700' 
                  : 'text-black hover:text-violet-700'
              }`}
            >
              AI Assistant
            </Link>
            <Link 
              href="/ai-humanize" 
              className={`body-text font-medium transition-colors ${
                pathname === '/ai-humanize' 
                  ? 'text-violet-700' 
                  : 'text-black hover:text-violet-700'
              }`}
            >
              AI Humanize
            </Link>
          </nav>

          {/* Auth Buttons */}
          {loading ? (
            <div className="w-16 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center space-x-2">
              <button
                className="flex items-center justify-center rounded-full border-2 border-transparent hover:border-violet-500 transition-colors overflow-hidden"
                style={{ width: 32, height: 32 }}
                onClick={() => setSidebarOpen(true)}
                aria-label="Open profile sidebar"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={user.user_metadata?.full_name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={22} className="text-gray-700" />
                )}
              </button>
              <UserSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          ) : (
            <button
              className="cssbuttons-io cssbuttons-io-small"
              type="button"
              onClick={signInWithGoogle}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span>
                <User size={16} style={{ marginRight: 6 }} />
                Login
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
} 