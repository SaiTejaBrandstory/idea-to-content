'use client'

import { useAuth } from '@/lib/auth'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Sparkles } from 'lucide-react'

interface UserProfile {
  full_name: string;
  email: string;
  avatar_url: string;
  created_at: string;
  last_sign_in_at: string;
  is_approved: boolean;
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (loading) return; // Wait for auth to finish
    if (!user) {
      setFetching(false); // No user, stop fetching
      return;
    }
    const fetchProfile = async () => {
      setFetching(true);
      setError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('full_name, email, avatar_url, created_at, last_sign_in_at, is_approved')
        .eq('id', user.id)
        .single();
      if (error) {
        setError('Failed to load profile. Please try again later.');
        setProfile(null);
      } else if (!data) {
        setError('User not found.');
        setProfile(null);
      } else {
        setProfile(data);
      }
      setFetching(false);
    };
    fetchProfile();
  }, [user, loading]);

  // Avatar preview
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(avatarFile)
    return () => reader.abort()
  }, [avatarFile])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setAvatarFile(file)
  }

  const handleCancel = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const handleSave = async () => {
    if (!avatarFile || !user) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const filePath = `${user.id}/${avatarFile.name}`
    // Upload avatar to 'avatars' bucket with user id as filename
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true })
    if (uploadError) {
      setError('Failed to upload avatar. Please try again.')
      setSaving(false)
      return
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const avatar_url = publicUrlData?.publicUrl
    if (!avatar_url) {
      setError('Failed to get avatar URL.')
      setSaving(false)
      return
    }
    // Update user profile
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url })
      .eq('id', user.id)
    if (updateError) {
      setError('Failed to update profile. Please try again.')
      setSaving(false)
      return
    }
    setProfile((prev) => prev ? { ...prev, avatar_url } : prev)
    setAvatarFile(null)
    setAvatarPreview(null)
    setSaving(false)
    
    // Trigger storage event to notify header component
    localStorage.setItem('avatar-updated', Date.now().toString())
    window.dispatchEvent(new StorageEvent('storage', { key: 'avatar-updated' }))
  }

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      setSaving(false);
      // Show success message
      alert('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    if (!window.confirm('Are you sure you want to remove your avatar?')) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // Extract the file path from the avatar_url
    const url = new URL(profile.avatar_url);
    const pathParts = url.pathname.split('/');
    // Find the index of 'avatars' in the path
    const avatarsIdx = pathParts.findIndex(p => p === 'avatars');
    const filePath = avatarsIdx !== -1 ? pathParts.slice(avatarsIdx + 1).join('/') : '';
    if (filePath) {
      await supabase.storage.from('avatars').remove([filePath]);
    }
    // Update user profile
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: '' })
      .eq('id', user.id);
    if (updateError) {
      setError('Failed to remove avatar. Please try again.');
      setSaving(false);
      return;
    }
    setProfile((prev) => prev ? { ...prev, avatar_url: '' } : prev);
    setSaving(false);
    
    // Trigger storage event to notify header component
    localStorage.setItem('avatar-updated', Date.now().toString())
    window.dispatchEvent(new StorageEvent('storage', { key: 'avatar-updated' }))
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-black" />
          <div className="text-lg font-semibold text-red-600 mb-2">{error}</div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-black" />
          <div className="text-center text-lg font-semibold">Please log in to view your profile.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form className="bg-white p-8 rounded-lg shadow flex flex-col md:flex-row gap-8 items-center md:items-start w-full max-w-2xl">
        {/* Avatar section */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover object-center" />
            ) : profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name || 'User'} className="w-full h-full object-cover object-center" />
            ) : (
              <Sparkles className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="flex justify-center mt-2">
            <button
              type="button"
              className="px-4 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              Upload
            </button>
            {profile.avatar_url && (
              <button
                type="button"
                className="ml-2 px-4 py-1 bg-gray-300 text-gray-800 rounded hover:bg-red-500 hover:text-white text-sm transition-colors"
                onClick={handleRemoveAvatar}
                disabled={saving}
              >
                Remove
              </button>
            )}
          </div>
          {(avatarFile || avatarPreview) && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-xs"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        {/* Info section */}
        <div className="flex-1 flex flex-col gap-4 w-full">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative group">
              <input
                type="text"
                value={profile.full_name || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="Enter your full name"
              />
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-violet-600 text-white px-2 py-1 rounded hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative group">
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700 pr-10"
              />
              <button
                type="button"
                disabled
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-200 text-gray-400 px-2 py-1 rounded flex items-center cursor-not-allowed"
                tabIndex={-1}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M4 21h17v2H2V3h2v18zm16.7-13.3a1 1 0 0 0-1.4 0l-9.3 9.3-1.3 4.7 4.7-1.3 9.3-9.3a1 1 0 0 0 0-1.4l-2-2zm-2.3 2.3-2-2 1.3-1.3 2 2-1.3 1.3z"/></svg>
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Registered: {profile.created_at ? new Date(profile.created_at).toLocaleString() : '—'}</div>
          <div className="text-xs text-gray-500">Last login: {profile.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleString() : '—' /* TODO: Ensure last_sign_in_at is set in DB on login */}</div>
        </div>
      </form>
    </div>
  )
} 