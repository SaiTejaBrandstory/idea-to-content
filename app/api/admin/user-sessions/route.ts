import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Use regular client for auth checks (has access to session cookies)
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for data operations (bypasses RLS)
    const adminClient = createAdminClient()
    
    // Check admin using admin client to bypass RLS
    const { data: adminData } = await adminClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!adminData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get chat sessions for the specific user, ordered by recent to old
    const { data: sessions, error: sessionsError } = await adminClient
      .from('chat_sessions')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        total_messages,
        total_cost_usd,
        total_cost_inr,
        total_tokens,
        user_id
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (sessionsError) {
      console.error('Error fetching user sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch user sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('Error in user-sessions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 