import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('[make-admin] Starting make admin process...')
    
    // Use regular client for auth checks (has access to session cookies)
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    console.log('[make-admin] Auth check:', { hasUser: !!user, userId: user?.id })
    
    if (!user) {
      console.log('[make-admin] Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for data operations (bypasses RLS)
    const adminClient = createAdminClient()
    
    // Check if user exists in users table
    console.log('[make-admin] Checking user profile for:', user.id)
    const { data: userProfile } = await adminClient
      .from('users')
      .select('is_admin, is_approved, full_name, email')
      .eq('id', user.id)
      .single()

    console.log('[make-admin] Profile check result:', { userProfile })

    if (!userProfile) {
      console.log('[make-admin] Profile error - user not found in users table')
      return NextResponse.json({ 
        error: 'User profile not found',
        details: 'User does not exist in database'
      }, { status: 404 })
    }

    // Update user to be admin and approved
    console.log('[make-admin] Making user admin...')
    const { data: updateData, error: updateError } = await adminClient
      .from('users')
      .update({ 
        is_admin: true, 
        is_approved: true,
        full_name: userProfile?.full_name || user.user_metadata?.full_name || '',
        email: user.email || ''
      })
      .eq('id', user.id)
      .select()

    console.log('[make-admin] Update result:', { updateData, updateError })

    if (updateError) {
      console.error('[make-admin] Update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update user',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User is now admin and approved',
      user: {
        id: user.id,
        email: user.email,
        isAdmin: true,
        isApproved: true
      }
    })
  } catch (error) {
    console.error('[make-admin] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 