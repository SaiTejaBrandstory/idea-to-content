import { useRouter } from 'next/navigation'
import { X, User } from 'lucide-react'
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
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-green-100 text-base font-medium text-green-800 transition"
              onClick={onClose}
            >
              <span role="img" aria-label="admin">🛡️</span> Admin Dashboard
            </Link>
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