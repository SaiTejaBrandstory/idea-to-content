import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[check-admin] Starting admin check...')
    
    // Use regular client for auth checks (has access to session cookies)
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    console.log('[check-admin] Auth check:', { hasUser: !!user, userId: user?.id })
    
    if (!user) {
      console.log('[check-admin] Unauthorized - no user')
      return NextResponse.json({ 
        error: 'Unauthorized',
        code: 'NO_USER',
        hasUser: false
      }, { status: 401 })
    }

    // Use admin client for data operations (bypasses RLS)
    const adminClient = createAdminClient()
    
    // Check admin using admin client to bypass RLS
    const { data: adminData } = await adminClient
      .from('users')
      .select('is_admin, is_approved, full_name, email')
      .eq('id', user.id)
      .single()

    console.log('[check-admin] Admin check result:', { adminData })

    if (!adminData) {
      console.log('[check-admin] Profile error - user not found in database')
      return NextResponse.json({ 
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND',
        hasUser: true,
        userId: user.id
      }, { status: 404 })
    }

    return NextResponse.json({
      isAdmin: adminData?.is_admin || false,
      isApproved: adminData?.is_approved || false,
      fullName: adminData?.full_name,
      email: adminData?.email,
      userId: user.id,
      hasUser: true
    })
  } catch (error) {
    console.error('[check-admin] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 