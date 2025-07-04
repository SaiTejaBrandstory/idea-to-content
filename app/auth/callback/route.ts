import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerSupabaseClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
      }
      
      if (data?.user) {
        // Update last_sign_in_at in users table
        try {
          await supabase
            .from('users')
            .update({ last_sign_in_at: new Date().toISOString() })
            .eq('id', data.user.id)
        } catch (dbError) {
          console.error('Error updating user sign-in time:', dbError)
          // Don't fail the auth flow if this fails
        }
        
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        // Fallback: try to get user from session
        const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
        
        if (sessionError) {
          console.error('Error getting user from session:', sessionError)
          return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(sessionError.message)}`)
        }
        
        if (sessionData?.user) {
          try {
            await supabase
              .from('users')
              .update({ last_sign_in_at: new Date().toISOString() })
              .eq('id', sessionData.user.id)
          } catch (dbError) {
            console.error('Error updating user sign-in time:', dbError)
            // Don't fail the auth flow if this fails
          }
          
          return NextResponse.redirect(`${origin}${next}`)
        }
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Unexpected error occurred')}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No authorization code provided')}`)
} 