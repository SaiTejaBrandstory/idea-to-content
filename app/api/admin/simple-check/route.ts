import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[simple-check] Starting simple admin check...')
    
    // Use regular client for auth checks (has access to session cookies)
    const supabase = createServerSupabaseClient()
    
    // Try to get user with error handling
    let user = null
    
    try {
      const authResult = await supabase.auth.getUser()
      user = authResult.data.user
      console.log('[simple-check] Auth result:', { hasUser: !!user, userId: user?.id })
    } catch (cookieError) {
      console.log('[simple-check] Cookie error:', cookieError)
      return NextResponse.json({
        status: 'cookie_error',
        message: 'Cookies are corrupted',
        error: cookieError instanceof Error ? cookieError.message : String(cookieError)
      })
    }
    
    if (!user) {
      return NextResponse.json({
        status: 'no_user',
        message: 'No authenticated user found'
      })
    }
    
    // Use admin client for data operations (bypasses RLS)
    const adminClient = createAdminClient()
    
    // Try to get user profile
    try {
      const { data: userProfile, error: profileError } = await adminClient
        .from('users')
        .select('is_admin, is_approved, full_name, email')
        .eq('id', user.id)
        .single()
      
      console.log('[simple-check] Profile result:', { userProfile, profileError })
      
      if (profileError) {
        return NextResponse.json({
          status: 'profile_error',
          message: 'User profile not found in database',
          userId: user.id,
          error: profileError.message
        })
      }
      
      return NextResponse.json({
        status: 'success',
        userId: user.id,
        email: user.email,
        isAdmin: userProfile?.is_admin || false,
        isApproved: userProfile?.is_approved || false,
        fullName: userProfile?.full_name,
        profile: userProfile
      })
      
    } catch (dbError) {
      console.log('[simple-check] Database error:', dbError)
      return NextResponse.json({
        status: 'database_error',
        message: 'Database connection error',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      })
    }
    
  } catch (error) {
    console.error('[simple-check] General error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'General error occurred',
      error: error instanceof Error ? error.message : String(error)
    })
  }
} 