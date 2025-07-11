"use client"

import { useEffect, useState } from 'react'
import { User, Activity, DollarSign, Zap, Clock, Eye, Users, TrendingUp, Calendar, FileText, Settings } from 'lucide-react'
import ReactMarkdown from 'react-markdown';

interface UserWithStats {
  id: string
  full_name: string
  email: string
  is_admin: boolean
  is_approved: boolean
  created_at: string
  last_sign_in_at: string
  avatar_url?: string
  usage: {
    total_operations: number
    total_input_tokens: number
    total_output_tokens: number
    total_cost_usd: number
    total_cost_inr: number
    openai_operations: number
    together_operations: number
    rephrasy_operations: number
  }
}

interface UserHistory {
  id: number
  user_id: string
  session_id: string
  operation_type: string
  api_provider: string
  model_id: string
  model_name: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  total_cost_usd: number
  total_cost_inr: number
  generated_content_preview: string
  generated_content_full: string
  created_at: string
  keywords?: string[]
  blog_type?: string
  selected_title?: string
  word_count?: string
  tone_type?: string
  temperature?: number
  all_generated_titles?: string[]
}

interface UserDetail {
  user: UserWithStats
  totalUsage: {
    total_operations: number
    total_input_tokens: number
    total_output_tokens: number
    total_cost_usd: number
    total_cost_inr: number
    openai_operations: number
    together_operations: number
    rephrasy_operations: number
  }
  history: UserHistory[]
  statistics: {
    totalSessions: number
    uniqueOperations: string[]
    uniqueProviders: string[]
    totalHistoryEntries: number
  }
}

export default function UserActivityPage() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [showUserDetail, setShowUserDetail] = useState(false)
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/users/activity')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetail = async (userId: string) => {
    try {
      setLoadingUserId(userId)
      setHistoryLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/history`)
      if (!response.ok) {
        throw new Error('Failed to fetch user details')
      }
      const data = await response.json()
      setSelectedUser(data)
      setShowUserDetail(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user details')
    } finally {
      setLoadingUserId(null)
      setHistoryLoading(false)
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

  const getOperationTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'title_generation': 'bg-blue-100 text-blue-800',
      'blog_generation': 'bg-green-100 text-green-800',
      'humanize': 'bg-purple-100 text-purple-800',
      'setup_progress': 'bg-yellow-100 text-yellow-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getProviderColor = (provider: string) => {
    const colors: { [key: string]: string } = {
      'openai': 'bg-green-100 text-green-800',
      'together': 'bg-blue-100 text-blue-800',
      'rephrasy': 'bg-purple-100 text-purple-800'
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
  };

  function preprocessBlogContent(content: string) {
    // Try to parse as JSON first (for blog generation)
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        // If it's a blog object, extract and format the content
        if (parsed.title || parsed.intro || parsed.body || parsed.conclusion || parsed.cta) {
          let formattedContent = '';
          
          // Add title if present
          if (parsed.title) {
            formattedContent += `# ${parsed.title}\n\n`;
          }
          
          // Add meta description if present
          if (parsed.metaDescription) {
            formattedContent += `## Meta Description\n${parsed.metaDescription}\n\n`;
          }
          
          // Add introduction if present
          if (parsed.intro) {
            formattedContent += `## Introduction\n${parsed.intro}\n\n`;
          }
          
          // Add body content
          if (parsed.body) {
            if (Array.isArray(parsed.body)) {
              formattedContent += `## Body\n${parsed.body.join('\n\n')}\n\n`;
            } else {
              formattedContent += `## Body\n${parsed.body}\n\n`;
            }
          }
          
          // Add conclusion if present
          if (parsed.conclusion) {
            formattedContent += `## Conclusion\n${parsed.conclusion}\n\n`;
          }
          
          // Add call to action if present
          if (parsed.cta) {
            formattedContent += `## Call to Action\n${parsed.cta}\n\n`;
          }
          
          return formattedContent.trim();
        }
        // If it's an array or other object, stringify it nicely
        return JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // Not JSON, treat as plain text
    }
    
    // Fallback to original preprocessing for plain text
    return content
      .replace(/META DESCRIPTION:/gi, '## Meta Description\n')
      .replace(/INTRODUCTION:/gi, '\n## Introduction\n')
      .replace(/BODY:/gi, '\n## Body\n')
      .replace(/CONCLUSION:/gi, '\n## Conclusion\n')
      .replace(/CALL TO ACTION:/gi, '\n## Call to Action\n')
      .replace(/\n{2,}/g, '\n\n')
      .trim();
  }

  function formatBlogContentForDisplay(content: string) {
    try {
      const blogData = JSON.parse(content);
      return (
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-xs text-gray-600 mb-1">Meta Title:</div>
            <div className="text-sm font-semibold text-gray-900 mb-2">{blogData.title}</div>
            <div className="text-xs text-gray-600 mb-1">Meta Description:</div>
            <div className="text-sm text-gray-800">{blogData.metaDescription}</div>
          </div>
          <h1 className="text-xl font-bold text-black">{blogData.title}</h1>
          <section>
            <ReactMarkdown components={markdownComponents}>{blogData.intro}</ReactMarkdown>
          </section>
          <section>
            <ReactMarkdown components={markdownComponents}>{Array.isArray(blogData.body) ? blogData.body.join('\n\n') : blogData.body}</ReactMarkdown>
          </section>
          <section>
            <ReactMarkdown components={markdownComponents}>{blogData.conclusion}</ReactMarkdown>
          </section>
          {blogData.cta && (
            <section>
              <div className="bg-black text-white rounded px-4 py-2 text-center text-sm font-semibold">
                {blogData.cta}
              </div>
            </section>
          )}
        </div>
      );
    } catch (error) {
      return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>;
    }
  }

  function formatTitleContentForDisplay(titles: string[]) {
    return (
      <div>
        <div className="font-medium text-gray-700 mb-2">Generated Titles:</div>
        <div className="space-y-2">
          {titles.map((title, i) => (
            <div key={i} className="p-2 bg-white rounded border text-sm">
              {title.replace(/^["']|["']$/g, '')}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function formatContentForDisplay(entry: UserHistory) {
    if (entry.operation_type === 'title_generation') {
      return entry.all_generated_titles && entry.all_generated_titles.length > 0 
        ? formatTitleContentForDisplay(entry.all_generated_titles)
        : <div className="text-gray-500">No titles generated</div>;
    } else if (entry.operation_type === 'blog_generation') {
      return formatBlogContentForDisplay(entry.generated_content_full);
    } else {
      // For humanize and other operations, return as ReactMarkdown
      return <ReactMarkdown components={markdownComponents}>{entry.generated_content_full}</ReactMarkdown>;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
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
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Activity Dashboard</h1>
          <p className="text-gray-600">Monitor user usage, costs, and activity across the platform</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Operations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(users.reduce((sum, user) => sum + user.usage.total_operations, 0))}
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
                  {formatCurrency(users.reduce((sum, user) => sum + user.usage.total_cost_usd, 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tokens</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(users.reduce((sum, user) => sum + user.usage.total_input_tokens + user.usage.total_output_tokens, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* User Header */}
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-12 h-12 rounded-full" />
                    ) : (
                      <User className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {user.full_name || 'Unnamed User'}
                    </h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center mt-1">
                      {user.is_admin && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">
                          Admin
                        </span>
                      )}
                      {user.is_approved ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Operations:</span>
                    <span className="font-medium">{formatNumber(user.usage.total_operations)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cost (USD):</span>
                    <span className="font-medium">{formatCurrency(user.usage.total_cost_usd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cost (INR):</span>
                    <span className="font-medium">{formatCurrency(user.usage.total_cost_inr, 'INR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tokens:</span>
                    <span className="font-medium">{formatNumber(user.usage.total_input_tokens + user.usage.total_output_tokens)}</span>
                  </div>
                </div>

                {/* Provider Breakdown */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Provider Usage:</p>
                  <div className="space-y-1">
                    {user.usage.openai_operations > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>OpenAI:</span>
                        <span>{user.usage.openai_operations}</span>
                      </div>
                    )}
                    {user.usage.together_operations > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Together:</span>
                        <span>{user.usage.together_operations}</span>
                      </div>
                    )}
                    {user.usage.rephrasy_operations > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Rephrasy:</span>
                        <span>{user.usage.rephrasy_operations}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <div>Joined: {formatDate(user.created_at)}</div>
                  {user.last_sign_in_at && (
                    <div>Last login: {formatDate(user.last_sign_in_at)}</div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => fetchUserDetail(user.id)}
                  disabled={loadingUserId === user.id}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loadingUserId === user.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      View History
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* User Detail Modal */}
        {showUserDetail && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedUser.user.full_name || 'Unnamed User'}
                    </h2>
                    <p className="text-gray-600">{selectedUser.user.email}</p>
                  </div>
                  <button
                    onClick={() => setShowUserDetail(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* User Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Activity className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="font-semibold text-blue-900">Total Operations</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{formatNumber(selectedUser.totalUsage.total_operations)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="font-semibold text-green-900">Total Cost (USD)</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(selectedUser.totalUsage.total_cost_usd)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Zap className="h-5 w-5 text-purple-600 mr-2" />
                      <h3 className="font-semibold text-purple-900">Total Tokens</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatNumber(selectedUser.totalUsage.total_input_tokens + selectedUser.totalUsage.total_output_tokens)}
                    </p>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Usage Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Sessions:</span>
                        <span className="font-medium">{selectedUser.statistics.totalSessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>History Entries:</span>
                        <span className="font-medium">{selectedUser.statistics.totalHistoryEntries}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Provider Breakdown</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>OpenAI Operations:</span>
                        <span className="font-medium">{selectedUser.totalUsage.openai_operations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Together Operations:</span>
                        <span className="font-medium">{selectedUser.totalUsage.together_operations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rephrasy Operations:</span>
                        <span className="font-medium">{selectedUser.totalUsage.rephrasy_operations}</span>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Full History */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Full Activity History (Grouped by Session) - {selectedUser.history.length} entries
                    {historyLoading && <span className="ml-2 text-sm text-gray-500">(Loading...)</span>}
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-[70vh] overflow-y-auto">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading full history...</span>
                      </div>
                    ) : selectedUser.history.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No activity recorded yet.</p>
                    ) : (
                      <div className="space-y-6">
                        {(() => {
                          // Group history by session
                          const groupedBySession = selectedUser.history.reduce((groups, entry) => {
                            const sessionId = entry.session_id;
                            if (!groups[sessionId]) {
                              groups[sessionId] = [];
                            }
                            groups[sessionId].push(entry);
                            return groups;
                          }, {} as { [key: string]: typeof selectedUser.history });

                          // Sort sessions by most recent first
                          const sortedSessions = Object.entries(groupedBySession).sort((a, b) => {
                            const aLatest = Math.max(...a[1].map(e => new Date(e.created_at).getTime()));
                            const bLatest = Math.max(...b[1].map(e => new Date(e.created_at).getTime()));
                            return bLatest - aLatest;
                          });

                          return sortedSessions.map(([sessionId, entries]) => {
                            const sessionStart = new Date(Math.min(...entries.map(e => new Date(e.created_at).getTime())));
                            const sessionEnd = new Date(Math.max(...entries.map(e => new Date(e.created_at).getTime())));
                            const totalSessionCost = entries.reduce((sum, e) => sum + e.total_cost_usd, 0);
                            const totalSessionTokens = entries.reduce((sum, e) => sum + e.total_tokens, 0);

                            return (
                              <div key={sessionId} className="bg-white rounded-lg border">
                                {/* Session Header */}
                                <div className="bg-blue-50 px-4 py-3 rounded-t-lg border-b">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium text-blue-900">Session: {sessionId?.slice(0, 12) || 'Unknown'}...</h4>
                                      <p className="text-xs text-blue-700">
                                        {sessionStart.toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })} - {sessionEnd.toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-blue-900">
                                        {entries.length} operations
                                      </div>
                                      <div className="text-xs text-blue-700">
                                        {formatCurrency(totalSessionCost)} • {formatNumber(totalSessionTokens)} tokens
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Session Entries */}
                                <div className="p-4 space-y-3">
                                  {entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((entry) => (
                                    <div key={entry.id} className="border-l-4 border-blue-200 pl-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <span className={`px-2 py-1 rounded text-xs ${getOperationTypeColor(entry.operation_type)}`}>
                                            {entry.operation_type.replace('_', ' ')}
                                          </span>
                                          <span className={`px-2 py-1 rounded text-xs ${getProviderColor(entry.api_provider)}`}>
                                            {entry.api_provider}
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-2">
                                        <div>
                                          <span className="text-gray-600">Tokens:</span>
                                          <span className="ml-1 font-medium">{formatNumber(entry.total_tokens)}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Cost:</span>
                                          <span className="ml-1 font-medium">{formatCurrency(entry.total_cost_usd)}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Model:</span>
                                          <span className="ml-1 font-medium">{entry.model_name}</span>
                                        </div>
                                      </div>
                                      {entry.generated_content_full && (
                                        <div>
                                          <p className="text-xs text-gray-600 mb-1">Preview:</p>
                                          <div className="text-xs text-gray-800 bg-gray-50 p-2 rounded overflow-x-auto">
                                            {formatContentForDisplay(entry)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
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