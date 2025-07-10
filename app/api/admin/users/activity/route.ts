import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get all users with their usage statistics (admin only)
export async function GET(request: NextRequest) {
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

  try {
    // Get all users
    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('id, full_name, email, is_admin, is_approved, created_at, last_sign_in_at, avatar_url')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('Error getting users:', usersError)
      return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
    }

    // Get usage statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        try {
          const { data: totalUsage, error: totalError } = await adminClient
            .rpc('get_user_total_usage', { user_uuid: user.id })
          
          if (totalError) {
            console.error(`Error getting usage for user ${user.id}:`, totalError)
            return {
              ...user,
              usage: {
                total_operations: 0,
                total_input_tokens: 0,
                total_output_tokens: 0,
                total_cost_usd: 0,
                total_cost_inr: 0,
                openai_operations: 0,
                together_operations: 0,
                rephrasy_operations: 0
              }
            }
          }

          return {
            ...user,
            usage: totalUsage[0] || {
              total_operations: 0,
              total_input_tokens: 0,
              total_output_tokens: 0,
              total_cost_usd: 0,
              total_cost_inr: 0,
              openai_operations: 0,
              together_operations: 0,
              rephrasy_operations: 0
            }
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error)
          return {
            ...user,
            usage: {
              total_operations: 0,
              total_input_tokens: 0,
              total_output_tokens: 0,
              total_cost_usd: 0,
              total_cost_inr: 0,
              openai_operations: 0,
              together_operations: 0,
              rephrasy_operations: 0,
              humanize_operations: 0
            }
          }
        }
      })
    )

    return NextResponse.json({ users: usersWithStats })
  } catch (error) {
    console.error('Error in user activity API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 