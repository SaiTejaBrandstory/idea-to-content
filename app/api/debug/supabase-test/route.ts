import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const results = {
      serverClient: null as any,
      adminClient: null as any,
      errors: [] as string[]
    }

    // Test server client creation
    try {
      results.serverClient = createServerSupabaseClient()
      console.log('✅ Server client created successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      results.errors.push(`Server client error: ${errorMsg}`)
      console.error('❌ Server client creation failed:', error)
    }

    // Test admin client creation
    try {
      results.adminClient = createAdminClient()
      console.log('✅ Admin client created successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      results.errors.push(`Admin client error: ${errorMsg}`)
      console.error('❌ Admin client creation failed:', error)
    }

    // Test basic connection if clients were created
    let connectionTest = null
    if (results.serverClient) {
      try {
        const { data, error } = await results.serverClient.auth.getUser()
        connectionTest = {
          success: !error,
          hasUser: !!data?.user,
          error: error?.message || null
        }
        console.log('✅ Connection test successful')
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.errors.push(`Connection test error: ${errorMsg}`)
        console.error('❌ Connection test failed:', error)
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      results: {
        serverClientCreated: !!results.serverClient,
        adminClientCreated: !!results.adminClient,
        connectionTest,
        errors: results.errors
      },
      summary: {
        success: results.errors.length === 0,
        totalErrors: results.errors.length
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Supabase test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 