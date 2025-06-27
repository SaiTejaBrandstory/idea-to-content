import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      openaiConfigured: hasOpenAIKey,
      message: hasOpenAIKey 
        ? 'OpenAI API key is configured' 
        : 'OpenAI API key is not configured'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'API status check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 