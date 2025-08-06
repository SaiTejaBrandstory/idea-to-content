import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      // Supabase variables
      NEXT_PUBLIC_SUPABASE_URL: {
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        hasValue: !!process.env.NEXT_PUBLIC_SUPABASE_URL
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
        hasValue: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        hasValue: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      
      // API Keys
      OPENAI_API_KEY: {
        value: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
        hasValue: !!process.env.OPENAI_API_KEY
      },
      TOGETHER_API_KEY: {
        value: process.env.TOGETHER_API_KEY ? 'SET' : 'MISSING',
        hasValue: !!process.env.TOGETHER_API_KEY
      },
      REPHRASY_API_KEY: {
        value: process.env.REPHRASY_API_KEY ? 'SET' : 'MISSING',
        hasValue: !!process.env.REPHRASY_API_KEY
      }
    }

    const missingVars = Object.entries(envVars)
      .filter(([_, config]) => !config.hasValue)
      .map(([key]) => key)

    const allSupabaseVarsSet = envVars.NEXT_PUBLIC_SUPABASE_URL.hasValue && 
                               envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY.hasValue && 
                               envVars.SUPABASE_SERVICE_ROLE_KEY.hasValue

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environmentVariables: envVars,
      missingVariables: missingVars,
      supabaseConfigured: allSupabaseVarsSet,
      summary: {
        totalVars: Object.keys(envVars).length,
        setVars: Object.keys(envVars).length - missingVars.length,
        missingVars: missingVars.length
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Environment check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 