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
      session_id,
      operation_type,
      api_provider,
      model_id,
      model_name,
      keywords,
      blog_type,
      selected_title,
      word_count,
      tone_type,
      tone_subtype,
      temperature,
      paragraphs,
      input_tokens,
      output_tokens,
      total_tokens,
      input_price_per_token,
      output_price_per_token,
      pricing_units,
      input_cost_usd,
      output_cost_usd,
      total_cost_usd,
      total_cost_inr,
      generated_content_preview,
      content_length
    } = await request.json()

    // Validate required fields
    if (!operation_type || !api_provider || !model_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert usage history
    const { data, error } = await supabase
      .from('usage_history')
      .insert({
        user_id: user.id,
        session_id: session_id || `session_${Date.now()}`,
        operation_type,
        api_provider,
        model_id,
        model_name,
        keywords: keywords || [],
        blog_type,
        selected_title,
        word_count,
        tone_type,
        tone_subtype,
        temperature,
        paragraphs,
        input_tokens,
        output_tokens,
        total_tokens,
        input_price_per_token,
        output_price_per_token,
        pricing_units,
        input_cost_usd,
        output_cost_usd,
        total_cost_usd,
        total_cost_inr,
        generated_content_preview,
        content_length,
        ip_address: request.headers.get('x-forwarded-for') || request.ip,
        user_agent: request.headers.get('user-agent')
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving usage history:', error)
      return NextResponse.json(
        { error: 'Failed to save usage history' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('Error in history POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('History API - Auth check:', { user: !!user, error: authError?.message })
    
    if (authError || !user) {
      console.log('History API - Unauthorized:', { authError: authError?.message, user: !!user })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const operation_type = searchParams.get('operation_type')
    const api_provider = searchParams.get('api_provider')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    // Build query
    let query = supabase
      .from('usage_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (operation_type) {
      query = query.eq('operation_type', operation_type)
    }
    if (api_provider) {
      query = query.eq('api_provider', api_provider)
    }
    if (date_from) {
      query = query.gte('created_at', date_from)
    }
    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching usage history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch usage history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error in history GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 