import { useRouter } from 'next/navigation'
import { X, User, History, Activity, MessageSquare, Users } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

interface UserSidebarProps {
  open: boolean
  onClose: () => void
}

export default function UserSidebar({ open, onClose }: UserSidebarProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!user) return setIsAdmin(false)
      const res = await fetch(`/api/admin/users`, { method: 'HEAD' })
      setIsAdmin(res.status === 200)
    }
    fetchAdmin()
  }, [user])

  if (!open) return null

  const handleProfileClick = () => {
    onClose()
    router.push('/profile')
  }

  const handleHistoryClick = () => {
    onClose()
    router.push('/history')
  }

  const handleChatHistoryClick = () => {
    onClose()
    router.push('/profile/chat-history')
  }

  const handleAdminChatHistoryClick = () => {
    onClose()
    router.push('/admin/chat-history')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose}></div>
      {/* Sidebar */}
      <aside className="relative w-full max-w-xs bg-white h-full shadow-xl flex flex-col p-6 animate-slide-in">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X size={24} />
        </button>
        <nav className="mt-16 flex flex-col gap-2">
          <button
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-violet-100 text-base font-medium text-gray-800 transition"
            onClick={handleProfileClick}
          >
            <User size={20} />
            Profile
          </button>
          <button
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-blue-100 text-base font-medium text-blue-800 transition"
            onClick={handleHistoryClick}
          >
            <History size={20} />
            Usage History
          </button>
          <button
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-purple-100 text-base font-medium text-purple-800 transition"
            onClick={handleChatHistoryClick}
          >
            <MessageSquare size={20} />
            Chat History
          </button>
          {isAdmin && (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-green-100 text-base font-medium text-green-800 transition"
                onClick={onClose}
              >
                <span role="img" aria-label="admin">🛡️</span> Admin Dashboard
              </Link>
              <Link
                href="/admin/user-activity"
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-yellow-100 text-base font-medium text-yellow-700 transition"
                onClick={onClose}
              >
                <Activity size={20} /> User Activity
              </Link>
              <button
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-indigo-100 text-base font-medium text-indigo-700 transition"
                onClick={handleAdminChatHistoryClick}
              >
                <Users size={20} /> All Chat History
              </button>
            </>
          )}
        </nav>
      </aside>
      <style jsx global>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </div>
  )
} 