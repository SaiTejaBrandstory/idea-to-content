'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { 
  History as HistoryIcon, 
  Filter, 
  Download, 
  DollarSign,
  Activity,
  FileText,
  Zap,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface SessionStep {
  id: number
  operation_type: string
  api_provider: string
  model_name: string
  keywords: string[]
  selected_title?: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  total_cost_usd: number
  total_cost_inr: number
  generated_content_full: string
  generated_content_preview: string
  content_length: number
  created_at: string
  all_generated_titles?: string[]
  references_files?: string[]
  references_urls?: string[]
  references_custom_text?: string
  setup_step?: string
  step_number?: number
}

interface SessionHistory {
  session_id: string
  created_at: string
  steps: SessionStep[]
  total_cost_usd: number
  total_cost_inr: number
  total_tokens: number
  // Input parameters collected from the first step
  keywords?: string[]
  blog_type?: string
  selected_title?: string
  word_count?: number
  tone_type?: string
  tone_subtype?: string
  temperature?: number
  paragraphs?: number
  references_files?: string[]
  references_urls?: string[]
  references_custom_text?: string
}

interface UsageStats {
  total_operations: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
  total_cost_inr: number
  openai_operations: number
  together_operations: number
  rephrasy_operations: number
  humanize_operations: number
}

export default function History() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionHistory[]>([])
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [showContent, setShowContent] = useState<Set<string>>(new Set())
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set())
  const [loadingContent, setLoadingContent] = useState<Set<string>>(new Set())
  
  // No filters needed - show all operations

  // Load session history data
  const loadSessions = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({
        page: '1',
        limit: '50'
      })

      const response = await fetch(`/api/history/session?${params}`)
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to view history')
          return
        }
        throw new Error(`Failed to load history: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('[History] Received sessions data:', data.data ? data.data.length : 0, 'sessions')
      if (data.data && data.data.length > 0) {
        console.log('[History] Sample session:', {
          session_id: data.data[0].session_id,
          steps: data.data[0].steps.map((step: any) => step.operation_type),
          total_steps: data.data[0].steps.length,
          title_steps: data.data[0].steps.filter((step: any) => step.operation_type === 'title_generation').length,
          has_titles: data.data[0].steps.some((step: any) => step.all_generated_titles && step.all_generated_titles.length > 0)
        })
        
        // Debug each step in detail
        data.data[0].steps.forEach((step: any, index: number) => {
          console.log(`[History] Step ${index + 1}:`, {
            operation_type: step.operation_type,
            has_generated_content: !!step.generated_content_full,
            has_titles: !!step.all_generated_titles,
            titles_count: step.all_generated_titles?.length || 0,
            titles: step.all_generated_titles
          })
        })
      }
      setSessions(data.data || [])
    } catch (err) {
      setError('Failed to load history')
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/history/stats')
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Unauthorized access to stats')
          return
        }
        throw new Error(`Failed to load statistics: ${response.status}`)
      }
      
      const data = await response.json()
      setStats(data.total_usage)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      console.log('No user found, redirecting to home')
      router.push('/')
      return
    }
    
    console.log('User authenticated:', user.id)
    loadSessions()
    loadStats()
  }, [user, authLoading, router])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'title_generation': return <FileText className="w-4 h-4" />
      case 'blog_generation': return <Zap className="w-4 h-4" />
      case 'humanize': return <User className="w-4 h-4" />
      case 'setup_progress': return <Clock className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'text-green-600'
      case 'together': return 'text-blue-600'
      case 'rephrasy': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  const getWorkflowType = (steps: SessionStep[]) => {
    const stepTypes = steps.map(step => step.operation_type)
    
    if (stepTypes.includes('title_generation') && stepTypes.includes('blog_generation') && stepTypes.includes('humanize')) {
      return 'Complete Workflow (Title → Blog → Humanize)'
    } else if (stepTypes.includes('title_generation') && stepTypes.includes('blog_generation')) {
      return 'Title → Blog Generation'
    } else if (stepTypes.includes('blog_generation') && stepTypes.includes('humanize')) {
      return 'Blog → Humanize'
    } else if (stepTypes.includes('title_generation')) {
      return 'Title Generation'
    } else if (stepTypes.includes('blog_generation')) {
      return 'Blog Generation'
    } else if (stepTypes.includes('humanize')) {
      return 'Humanize'
    } else {
      return 'Custom Workflow'
    }
  }

  const toggleSession = async (sessionId: string) => {
    setLoadingSessions(prev => new Set(prev).add(sessionId))
    
    // Simulate a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
    setLoadingSessions(prev => {
      const newSet = new Set(prev)
      newSet.delete(sessionId)
      return newSet
    })
  }

  const toggleContent = async (sessionId: string) => {
    setLoadingContent(prev => new Set(prev).add(sessionId))
    
    // Simulate a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const newShowContent = new Set(showContent)
    if (newShowContent.has(sessionId)) {
      newShowContent.delete(sessionId)
    } else {
      newShowContent.add(sessionId)
    }
    setShowContent(newShowContent)
    setLoadingContent(prev => {
      const newSet = new Set(prev)
      newSet.delete(sessionId)
      return newSet
    })
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

  const formatBlogContent = (content: string) => {
    try {
      const blogData = JSON.parse(content)
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
      )
    } catch (error) {
      return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    }
  }

  const formatHumanizedContent = (content: string) => {
    return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
  }

  const downloadHistory = () => {
    const csvData = [
      ['Session ID', 'Date', 'Steps', 'Total Tokens', 'Total Cost USD', 'Total Cost INR'],
      ...sessions.map(session => [
        session.session_id,
        formatDate(session.created_at),
        session.steps.map(step => step.operation_type).join(' → '),
        session.total_tokens,
        session.total_cost_usd,
        session.total_cost_inr
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session_history_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">Please sign in to view history</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <HistoryIcon className="w-5 h-5 text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-900">Usage History</h1>
        </div>
        <button
          onClick={downloadHistory}
          className="btn-secondary text-sm px-3 py-1"
        >
          <Download className="w-3 h-3 mr-1" />
          Export
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
            <div className="text-xs text-blue-600 font-medium">Sessions</div>
            <div className="text-lg font-bold text-blue-700">{sessions.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
            <div className="text-xs text-green-600 font-medium">Operations</div>
            <div className="text-lg font-bold text-green-700">{stats?.total_operations ?? 0}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 text-center">
            <div className="text-xs text-orange-600 font-medium">Tokens</div>
            <div className="text-lg font-bold text-orange-700">{(stats?.total_input_tokens || 0) + (stats?.total_output_tokens || 0)}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 text-center">
            <div className="text-xs text-purple-600 font-medium">Cost USD</div>
            <div className="text-lg font-bold text-purple-700">${stats?.total_cost_usd?.toFixed(4) ?? '0.0000'}</div>
          </div>
          <div className="bg-pink-50 rounded-lg p-4 border border-pink-200 text-center">
            <div className="text-xs text-pink-600 font-medium">Cost INR</div>
            <div className="text-lg font-bold text-pink-700">₹{stats?.total_cost_inr?.toFixed(2) ?? '0.00'}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 text-center">
            <div className="text-xs text-yellow-600 font-medium">Humanize</div>
            <div className="text-lg font-bold text-yellow-700">{stats?.humanize_operations ?? 0}</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-6">
        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <HistoryIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No session history found</p>
          </div>
        ) : (
          sessions.map((session, sessionIndex) => (
            <div key={session.session_id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Session Header - Always Visible */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleSession(session.session_id)}
                      disabled={loadingSessions.has(session.session_id)}
                      className="flex items-center space-x-2 text-left hover:bg-gray-50 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingSessions.has(session.session_id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      ) : expandedSessions.has(session.session_id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <HistoryIcon className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium text-gray-900">
                          Session {sessionIndex + 1}: {session.session_id.substring(0, 8)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          {getWorkflowType(session.steps)} • {session.steps.length} steps
                        </div>
                        {session.keywords && session.keywords.length > 0 && (
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            🔍 {session.keywords.join(', ')}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(session.created_at)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {session.total_tokens.toLocaleString()} tokens • {formatCost(session.total_cost_usd)}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleContent(session.session_id)}
                      disabled={loadingContent.has(session.session_id)}
                      className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingContent.has(session.session_id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                      ) : showContent.has(session.session_id) ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hide Content</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Show Content</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Session Details - Collapsible */}
              {expandedSessions.has(session.session_id) && (
                <div className="p-4 space-y-4">
                  {/* Quick Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Keywords:</strong> {session.keywords?.join(', ') || 'None'}
                    </div>
                    <div>
                      <strong>Blog Type:</strong> {session.blog_type || 'Not specified'}
                    </div>
                    <div>
                      <strong>Word Count:</strong> {session.word_count || 'Not specified'}
                    </div>
                    <div>
                      <strong>Tone:</strong> {session.tone_subtype} ({session.tone_type})
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Workflow Steps</h3>
                    {session.steps.map((step, stepIndex) => (
                      <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Step {stepIndex + 1}
                            </span>
                            {getOperationIcon(step.operation_type)}
                            <span className="font-medium text-gray-900">
                              {step.operation_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                            <span className={`text-xs font-medium ${getProviderColor(step.api_provider)}`}>
                              {step.api_provider === 'openai' ? 'OpenAI' : 
                               step.api_provider === 'together' ? 'Together.ai' : 
                               step.api_provider === 'rephrasy' ? 'Rephrasy' : 
                               step.api_provider}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {step.total_tokens} tokens • {formatCost(step.total_cost_usd)}
                          </div>
                        </div>

                        {/* Generated Content - Only show if content is enabled */}
                        {showContent.has(session.session_id) && step.generated_content_full && (
                          <div className="bg-gray-50 p-4 rounded border">
                            {step.operation_type === 'title_generation' && step.all_generated_titles && step.all_generated_titles.length > 0 ? (
                              <div>
                                <div className="font-medium text-gray-700 mb-2">Generated Titles:</div>
                                <div className="space-y-2">
                                  {step.all_generated_titles.map((title, i) => (
                                    <div key={i} className="p-2 bg-white rounded border text-sm">
                                      {title}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : step.operation_type === 'blog_generation' ? (
                              <div>
                                <div className="font-medium text-gray-700 mb-2">Generated Blog:</div>
                                <div className="max-h-96 overflow-y-auto bg-white p-3 rounded border">
                                  {formatBlogContent(step.generated_content_full)}
                                </div>
                              </div>
                            ) : step.operation_type === 'humanize' ? (
                              <div>
                                <div className="font-medium text-gray-700 mb-2">Humanized Content:</div>
                                <div className="max-h-96 overflow-y-auto bg-white p-3 rounded border">
                                  {formatHumanizedContent(step.generated_content_full)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-600">{step.generated_content_preview}</div>
                            )}
                          </div>
                        )}

                        {/* References for Blog Generation */}
                        {step.operation_type === 'blog_generation' && 
                         ((step.references_files && step.references_files.length > 0) || 
                          (step.references_urls && step.references_urls.length > 0) || 
                          step.references_custom_text) && (
                          <div className="mt-3 text-sm">
                            <strong>References Used:</strong>
                            {step.references_files && step.references_files.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                Files: {step.references_files.join(', ')}
                              </div>
                            )}
                            {step.references_urls && step.references_urls.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                URLs: {step.references_urls.join(', ')}
                              </div>
                            )}
                            {step.references_custom_text && (
                              <div className="text-xs text-gray-600 mt-1">
                                Custom Text: {step.references_custom_text.substring(0, 100)}...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
} 