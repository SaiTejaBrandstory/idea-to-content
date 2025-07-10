import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const {
      step_number,
      step_name,
      step_data,
      session_id
    } = await request.json()

    // Validate required fields
    if (!step_number || !step_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert setup progress
    const { data, error } = await supabase
      .from('usage_history')
      .insert({
        user_id: user.id,
        session_id: session_id || `session_${Date.now()}`,
        operation_type: 'setup_progress',
        api_provider: 'none', // No API call for setup steps
        model_id: 'none',
        model_name: 'none',
        setup_step: step_name,
        step_number: step_number,
        keywords: step_data?.keywords || [],
        blog_type: step_data?.blogType || null,
        selected_title: step_data?.selectedTitle || null,
        word_count: step_data?.wordCount || null,
        tone_type: step_data?.tone?.type || null,
        tone_subtype: step_data?.tone?.subtype || null,
        temperature: step_data?.temperature || null,
        paragraphs: step_data?.paragraphs || null,
        references_files: step_data?.references?.files?.map((f: any) => f.name) || [],
        references_urls: step_data?.references?.urls || [],
        references_custom_text: step_data?.references?.customText || null,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        input_price_per_token: 0,
        output_price_per_token: 0,
        pricing_units: 'none',
        input_cost_usd: 0,
        output_cost_usd: 0,
        total_cost_usd: 0,
        total_cost_inr: 0,
        generated_content_preview: `Setup step: ${step_name}`,
        content_length: 0,
        ip_address: request.headers.get('x-forwarded-for') || request.ip,
        user_agent: request.headers.get('user-agent')
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving setup progress:', error)
      return NextResponse.json(
        { error: 'Failed to save setup progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('Error in setup progress POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 