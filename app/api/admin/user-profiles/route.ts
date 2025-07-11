import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[user-profiles] Starting API call...')
    
    // Use regular client for auth checks (has access to session cookies)
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    console.log('[user-profiles] Auth check:', { hasUser: !!user, userId: user?.id })
    
    if (!user) {
      console.log('[user-profiles] Unauthorized - no user')
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
    
    console.log('[user-profiles] Admin check result:', { adminData })
    
    if (!adminData?.is_admin) {
      console.log('[user-profiles] Forbidden - user not admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('[user-profiles] User is admin, fetching user profiles...')

    // Get all users with their chat statistics
    const { data: userProfiles, error: usersError } = await adminClient
      .from('users')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false })

    console.log('[user-profiles] Users fetch result:', { userCount: userProfiles?.length, usersError })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get chat sessions separately for each user
    const profiles = await Promise.all(
      (userProfiles || []).map(async (user) => {
        try {
          // Get chat sessions for this user
          const { data: sessions, error: sessionsError } = await adminClient
            .from('chat_sessions')
            .select('id, total_messages, total_cost_usd, total_cost_inr, total_tokens, updated_at')
            .eq('user_id', user.id)
          
          if (sessionsError) {
            console.error(`Error fetching sessions for user ${user.id}:`, sessionsError)
            return {
              id: user.id,
              full_name: user.full_name,
              email: user.email,
              created_at: user.created_at,
              total_sessions: 0,
              total_messages: 0,
              total_cost_usd: 0,
              total_cost_inr: 0,
              total_tokens: 0,
              last_activity: user.created_at
            }
          }

          const totalSessions = sessions?.length || 0
          const totalMessages = sessions?.reduce((sum, session) => sum + (session.total_messages || 0), 0) || 0
          const totalCostUsd = sessions?.reduce((sum, session) => sum + (session.total_cost_usd || 0), 0) || 0
          const totalCostInr = sessions?.reduce((sum, session) => sum + (session.total_cost_inr || 0), 0) || 0
          const totalTokens = sessions?.reduce((sum, session) => sum + (session.total_tokens || 0), 0) || 0
          
          // Find the most recent activity
          const lastActivity = sessions && sessions.length > 0 
            ? sessions.reduce((latest, session) => 
                new Date(session.updated_at) > new Date(latest) ? session.updated_at : latest, 
                sessions[0].updated_at
              )
            : user.created_at

          return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            created_at: user.created_at,
            total_sessions: totalSessions,
            total_messages: totalMessages,
            total_cost_usd: totalCostUsd,
            total_cost_inr: totalCostInr,
            total_tokens: totalTokens,
            last_activity: lastActivity
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error)
          return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            created_at: user.created_at,
            total_sessions: 0,
            total_messages: 0,
            total_cost_usd: 0,
            total_cost_inr: 0,
            total_tokens: 0,
            last_activity: user.created_at
          }
        }
      })
    )

    console.log('[user-profiles] Returning profiles:', { profileCount: profiles.length })
    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Error in user-profiles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 