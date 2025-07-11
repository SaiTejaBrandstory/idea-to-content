'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { 
  MessageSquare, 
  MessageCircle, 
  DollarSign, 
  Clock, 
  Plus,
  ArrowLeft,
  User,
  Mail,
  Calendar
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  total_messages: number
  total_cost_usd: number
  total_cost_inr: number
  total_tokens: number
  user_id: string
  users?: {
    id: string
    full_name: string
    email: string
    created_at: string
  }
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  model_id: string
  model_name: string
  api_provider: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  total_cost_usd: number
  total_cost_inr: number
  created_at: string
}

interface ChatSessionWithMessages {
  session: ChatSession
  messages: ChatMessage[]
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  created_at: string
  total_sessions: number
  total_messages: number
  total_cost_usd: number
  total_cost_inr: number
  total_tokens: number
  last_activity: string
}

export default function AdminChatHistoryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSessionWithMessages | null>(null)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingSessionDetails, setLoadingSessionDetails] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [showSessionDetail, setShowSessionDetail] = useState(false)
  
  // New state for two-level view
  const [viewMode, setViewMode] = useState<'profiles' | 'sessions'>('profiles')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [loadingUserSessions, setLoadingUserSessions] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/')
      return
    }
    fetchUserProfiles()
  }, [user, loading, router])

  const fetchUserProfiles = async () => {
    try {
      setLoadingProfiles(true)
      setError(null)
      const response = await fetch('/api/admin/user-profiles')
      if (!response.ok) {
        throw new Error('Failed to fetch user profiles')
      }
      const data = await response.json()
      setUserProfiles(data.profiles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoadingProfiles(false)
    }
  }

  const fetchUserSessions = async (userId: string) => {
    try {
      setLoadingUserSessions(true)
      setError(null)
      const response = await fetch(`/api/admin/user-sessions?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch user sessions')
      }
      const data = await response.json()
      setSessions(data.sessions || [])
      setViewMode('sessions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user sessions')
    } finally {
      setLoadingUserSessions(false)
    }
  }

  const handleUserClick = async (userProfile: UserProfile) => {
    setSelectedUser(userProfile)
    await fetchUserSessions(userProfile.id)
  }

  const handleBackToProfiles = () => {
    setViewMode('profiles')
    setSelectedUser(null)
    setSessions([])
    setSelectedSession(null)
    setShowSessionDetail(false)
  }

  const fetchSessions = async () => {
    try {
      console.log('Fetching sessions...')
      setLoadingSessions(true)
      setError(null)
      const response = await fetch('/api/admin/chat-sessions')
      console.log('Response status:', response.status)
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.log('User not admin, redirecting...')
          // User is not admin, redirect to home
          router.push('/')
          return
        }
        throw new Error('Failed to fetch chat sessions')
      }
      const data = await response.json()
      console.log('Sessions data:', data)
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoadingSessions(false)
    }
  }

  const fetchSessionDetail = async (sessionId: string) => {
    try {
      setLoadingSessionDetails(prev => new Set(prev).add(sessionId))
      setError(null)
      const response = await fetch(`/api/admin/chat-messages?sessionId=${sessionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch session details')
      }
      const data = await response.json()
      setSelectedSession(data)
      setShowSessionDetail(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session details')
    } finally {
      setLoadingSessionDetails(prev => {
        const newSet = new Set(prev)
        newSet.delete(sessionId)
        return newSet
      })
    }
  }

  const formatCurrency = (amount: number, currency: 'USD' | 'INR' = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getProviderColor = (provider: string) => {
    const colors: { [key: string]: string } = {
      'openai': 'bg-green-100 text-green-800',
      'together': 'bg-blue-100 text-blue-800'
    }
    return colors[provider] || 'bg-gray-100 text-gray-800'
  }

  const markdownComponents = {
    h1: (props: any) => <h1 className="text-2xl font-bold mb-4 text-black" {...props} />,
    h2: (props: any) => <h2 className="text-xl font-bold mt-8 mb-3 text-gray-900" {...props} />,
    h3: (props: any) => <h3 className="text-base font-bold mt-6 mb-2 text-gray-800" {...props} />,
    p: (props: any) => <p className="text-base text-gray-900 leading-relaxed mb-3" {...props} />,
    ul: (props: any) => <ul className="list-disc ml-6 mb-3" {...props} />,
    ol: (props: any) => <ol className="list-decimal ml-6 mb-3" {...props} />,
    li: (props: any) => <li className="mb-1" {...props} />,
    blockquote: (props: any) => <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-700 mb-3" {...props} />,
    code: (props: any) => <code className="bg-gray-100 px-1 rounded" {...props} />,
  }

  if (loading || loadingProfiles) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchUserProfiles}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Profile Cards View
  if (viewMode === 'profiles') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Chat History</h1>
                <p className="text-gray-600">Select a user to view their chat history</p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userProfiles.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(userProfiles.reduce((sum, user) => sum + user.total_sessions, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cost (USD)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(userProfiles.reduce((sum, user) => sum + user.total_cost_usd, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tokens</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(userProfiles.reduce((sum, user) => sum + user.total_tokens, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User Profile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProfiles.map((userProfile) => (
              <div 
                key={userProfile.id} 
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleUserClick(userProfile)}
              >
                <div className="p-6">
                  {/* User Header */}
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {userProfile.full_name || 'Unnamed User'}
                      </h3>
                      <p className="text-sm text-gray-500">{userProfile.email}</p>
                    </div>
                  </div>

                  {/* User Stats */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sessions:</span>
                      <span className="font-medium">{userProfile.total_sessions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Messages:</span>
                      <span className="font-medium">{formatNumber(userProfile.total_messages)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cost (USD):</span>
                      <span className="font-medium">{formatCurrency(userProfile.total_cost_usd)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tokens:</span>
                      <span className="font-medium">{formatNumber(userProfile.total_tokens)}</span>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Joined: {formatDate(userProfile.created_at)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Last activity: {formatDate(userProfile.last_activity)}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUserClick(userProfile)
                    }}
                    className="w-full bg-violet-600 text-white py-2 px-4 rounded-lg hover:bg-violet-700 text-sm flex items-center justify-center"
                  >
                    View Chat History
                  </button>
                </div>
              </div>
            ))}
          </div>

          {userProfiles.length === 0 && (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">No users have chat sessions yet</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Sessions View
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToProfiles}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Users</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {selectedUser?.full_name || 'User'}'s Chat History
                </h1>
                <p className="text-gray-600">
                  {selectedUser?.email} • {sessions.length} sessions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Summary Stats */}
        {selectedUser && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <MessageCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(sessions.reduce((sum, session) => sum + session.total_messages, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cost (USD)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(sessions.reduce((sum, session) => sum + session.total_cost_usd, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tokens</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(sessions.reduce((sum, session) => sum + session.total_tokens, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loadingUserSessions ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            <span className="ml-2 text-gray-600">Loading user sessions...</span>
          </div>
        ) : (
          <>
            {/* Chat Sessions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <div key={session.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    {/* Session Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {session.title}
                      </h3>
                      <button
                        onClick={() => fetchSessionDetail(session.id)}
                        disabled={loadingSessionDetails.has(session.id)}
                        className="text-violet-600 hover:text-violet-800 text-sm font-medium"
                      >
                        {loadingSessionDetails.has(session.id) ? 'Loading...' : 'Details'}
                      </button>
                    </div>

                    {/* Session Stats */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Messages:</span>
                        <span className="font-medium">{session.total_messages}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cost (USD):</span>
                        <span className="font-medium">{formatCurrency(session.total_cost_usd)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cost (INR):</span>
                        <span className="font-medium">{formatCurrency(session.total_cost_inr, 'INR')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tokens:</span>
                        <span className="font-medium">{formatNumber(session.total_tokens)}</span>
                      </div>
                    </div>

                    {/* Session Info */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Created: {formatDate(session.created_at)}</div>
                      <div>Updated: {formatDate(session.updated_at)}</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => router.push(`/chat?session=${session.id}`)}
                        className="flex-1 bg-violet-600 text-white py-2 px-4 rounded-lg hover:bg-violet-700 text-sm"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => fetchSessionDetail(session.id)}
                        disabled={loadingSessionDetails.has(session.id)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingSessionDetails.has(session.id) ? 'Loading...' : 'Details'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {sessions.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No chat sessions found</h3>
                <p className="text-gray-600">This user hasn't created any chat sessions yet</p>
              </div>
            )}
          </>
        )}

        {/* Session Detail Modal */}
        {showSessionDetail && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedSession.session.title}
                    </h2>
                    <p className="text-gray-600">
                      {selectedSession.messages.length} messages • {formatCurrency(selectedSession.session.total_cost_usd)} total cost
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSessionDetail(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Session Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="font-semibold text-blue-900">Total Messages</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{selectedSession.session.total_messages}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="font-semibold text-green-900">Total Cost (USD)</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(selectedSession.session.total_cost_usd)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Clock className="h-5 w-5 text-purple-600 mr-2" />
                      <h3 className="font-semibold text-purple-900">Total Tokens</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{formatNumber(selectedSession.session.total_tokens)}</p>
                  </div>
                </div>

                {/* Messages */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Conversation</h3>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {selectedSession.messages.map((message) => (
                      <div key={message.id} className="border-l-4 border-violet-200 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              message.role === 'user' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {message.role === 'user' ? 'You' : 'AI'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${getProviderColor(message.api_provider)}`}>
                              {message.api_provider}
                            </span>
                            <span className="text-xs text-gray-500">{message.model_name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-2">
                          <div>
                            <span className="text-gray-600">Tokens:</span>
                            <span className="ml-1 font-medium">{formatNumber(message.total_tokens)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Cost:</span>
                            <span className="ml-1 font-medium">{formatCurrency(message.total_cost_usd)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Model:</span>
                            <span className="ml-1 font-medium">{message.model_name}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded">
                          <ReactMarkdown components={markdownComponents}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 