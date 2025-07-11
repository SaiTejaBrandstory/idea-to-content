'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  full_name: string
  email: string
  is_admin: boolean
  is_approved: boolean
  created_at: string
  last_sign_in_at: string
  avatar_url?: string
}

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    
    if (!user) {
      router.push('/')
      return
    }
    
    fetchUsers()
  }, [user, loading, router])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      setError(null)
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('You are not authorized to view this page.')
          setLoadingUsers(false)
          return
        }
        throw new Error('Failed to fetch users')
      }
      const data = await res.json()
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleApprove = async (userId: string, approve: boolean) => {
    setActionLoading(userId + approve)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve })
      })
      if (res.ok) {
        fetchUsers()
      } else {
        alert('Failed to update user status')
      }
    } catch (err) {
      alert('Failed to update user status')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Please sign in to access this page</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 font-bold">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="mb-4 text-gray-700">Total users: {users.length}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Avatar</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Approved</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Last Login</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2 text-center">
                  {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-full mx-auto" /> : <span>—</span>}
                </td>
                <td className="px-4 py-2">{u.full_name || '—'}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 text-center">{u.is_admin ? 'Admin' : 'User'}</td>
                <td className="px-4 py-2 text-center">{u.is_approved ? '✅' : '❌'}</td>
                <td className="px-4 py-2 text-xs">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-2 text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-2 text-center">
                  {!u.is_admin && (
                    <>
                      {u.is_approved ? (
                        <button
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs mr-2 disabled:opacity-50"
                          disabled={actionLoading === u.id + 'false'}
                          onClick={() => handleApprove(u.id, false)}
                        >
                          {actionLoading === u.id + 'false' ? '...' : 'Reject'}
                        </button>
                      ) : (
                        <button
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs mr-2 disabled:opacity-50"
                          disabled={actionLoading === u.id + 'true'}
                          onClick={() => handleApprove(u.id, true)}
                        >
                          {actionLoading === u.id + 'true' ? '...' : 'Approve'}
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 