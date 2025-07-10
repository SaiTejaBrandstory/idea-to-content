import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get user history and usage statistics (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Use regular client for auth checks (has access to session cookies)
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use admin client for data operations (bypasses RLS)
  const adminClient = createAdminClient()
  
  // Check admin using admin client to bypass RLS
  const { data: adminData } = await adminClient
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!adminData?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = params
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  try {
    // Get user details
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, full_name, email, is_admin, is_approved, created_at, last_sign_in_at, avatar_url')
      .eq('id', userId)
      .single()
    
    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's total usage statistics using the function
    const { data: totalUsage, error: totalError } = await adminClient
      .rpc('get_user_total_usage', { user_uuid: userId })
    
    if (totalError) {
      console.error('Error getting total usage:', totalError)
      return NextResponse.json({ error: 'Failed to get usage statistics' }, { status: 500 })
    }

    // Get user's full history (all entries)
    const { data: history, error: historyError } = await adminClient
      .from('usage_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (historyError) {
      console.error('Error getting history:', historyError)
      return NextResponse.json({ error: 'Failed to get user history' }, { status: 500 })
    }



    // Calculate additional statistics
    const totalSessions = new Set(history.map(h => h.session_id)).size
    const uniqueOperations = Array.from(new Set(history.map(h => h.operation_type)))
    const uniqueProviders = Array.from(new Set(history.map(h => h.api_provider)))

    return NextResponse.json({
      user: userData,
      totalUsage: totalUsage[0] || {
        total_operations: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_inr: 0,
        openai_operations: 0,
        together_operations: 0,
        rephrasy_operations: 0
      },
      history: history,
      statistics: {
        totalSessions,
        uniqueOperations,
        uniqueProviders,
        totalHistoryEntries: history.length
      }
    })
  } catch (error) {
    console.error('Error in user history API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 