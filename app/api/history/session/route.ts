import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    let query = supabase
      .from('usage_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      
    // Debug: Let's also check what columns are available
    console.log('[session-history] Querying for user:', user.id)

    // If session_id provided, filter by session
    if (session_id) {
      query = query.eq('session_id', session_id)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching session history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch session history' },
        { status: 500 }
      )
    }

    // Debug: Check if we're getting any data at all
    console.log('[session-history] Raw database response:', {
      data_length: data?.length || 0,
      error: error,
      count: count
    })

    console.log('[session-history] Retrieved data:', data?.length || 0, 'records')
    if (data && data.length > 0) {
      // Log all title generation records
      const titleRecords = data.filter(item => item.operation_type === 'title_generation')
      console.log('[session-history] Title generation records found:', titleRecords.length)
      
      if (titleRecords.length === 0) {
        console.log('[session-history] No title generation records found in database')
        // Let's check what operation types we do have
        const operationTypes = Array.from(new Set(data.map(item => item.operation_type)))
        console.log('[session-history] Available operation types:', operationTypes)
      } else {
        titleRecords.forEach((record, index) => {
          console.log(`[session-history] Title record ${index + 1}:`, {
            id: record.id,
            session_id: record.session_id,
            all_generated_titles: record.all_generated_titles,
            has_titles: !!record.all_generated_titles,
            titles_count: record.all_generated_titles?.length || 0,
            created_at: record.created_at,
            // Check if the field exists at all
            has_all_generated_titles_field: 'all_generated_titles' in record
          })
        })
      }
      
      console.log('[session-history] Sample record:', {
        id: data[0].id,
        operation_type: data[0].operation_type,
        session_id: data[0].session_id,
        all_generated_titles: data[0].all_generated_titles,
        has_titles: !!data[0].all_generated_titles,
        titles_count: data[0].all_generated_titles?.length || 0
      })
    }

    // Group by session_id to show complete workflows
    console.log('[session-history] Starting session grouping...')
    const sessions = data.reduce((acc: any, item) => {
      // Use the session_id from the database
      const sessionId = item.session_id || `session_${user.id}_${Math.floor(new Date(item.created_at).getTime() / (30 * 60 * 1000))}`
      
      // Debug session grouping for title generation
      if (item.operation_type === 'title_generation') {
        console.log(`[session-history] Processing title generation item:`, {
          id: item.id,
          session_id: item.session_id,
          calculated_session_id: sessionId,
          all_generated_titles: item.all_generated_titles,
          titles_count: item.all_generated_titles?.length || 0
        })
      }
      
      if (!acc[sessionId]) {
        acc[sessionId] = {
          session_id: sessionId,
          created_at: item.created_at,
          steps: [],
          total_cost_usd: 0,
          total_cost_inr: 0,
          total_tokens: 0,
          // Initialize with empty values, will be populated from steps
          keywords: [],
          blog_type: null,
          selected_title: null,
          word_count: null,
          tone_type: null,
          tone_subtype: null,
          temperature: null,
          paragraphs: null,
          references_files: [],
          references_urls: [],
          references_custom_text: null
        }
      }
      
      // Collect inputs from each step
      if (item.keywords && item.keywords.length > 0) {
        acc[sessionId].keywords = item.keywords
      }
      if (item.blog_type) {
        acc[sessionId].blog_type = item.blog_type
      }
      if (item.selected_title) {
        acc[sessionId].selected_title = item.selected_title
      }
      if (item.word_count) {
        acc[sessionId].word_count = item.word_count
      }
      if (item.tone_type) {
        acc[sessionId].tone_type = item.tone_type
      }
      if (item.tone_subtype) {
        acc[sessionId].tone_subtype = item.tone_subtype
      }
      if (item.temperature) {
        acc[sessionId].temperature = item.temperature
      }
      if (item.paragraphs) {
        acc[sessionId].paragraphs = item.paragraphs
      }
      if (item.references_files && item.references_files.length > 0) {
        acc[sessionId].references_files = item.references_files
      }
      if (item.references_urls && item.references_urls.length > 0) {
        acc[sessionId].references_urls = item.references_urls
      }
      if (item.references_custom_text) {
        acc[sessionId].references_custom_text = item.references_custom_text
      }
      
      acc[sessionId].steps.push({
        id: item.id,
        operation_type: item.operation_type,
        api_provider: item.api_provider,
        model_name: item.model_name,
        created_at: item.created_at,
        keywords: item.keywords,
        blog_type: item.blog_type,
        selected_title: item.selected_title,
        word_count: item.word_count,
        tone_type: item.tone_type,
        tone_subtype: item.tone_subtype,
        temperature: item.temperature,
        paragraphs: item.paragraphs,
        input_tokens: item.input_tokens,
        output_tokens: item.output_tokens,
        total_tokens: item.total_tokens,
        total_cost_usd: item.total_cost_usd,
        total_cost_inr: item.total_cost_inr,
        generated_content_full: item.generated_content_full,
        generated_content_preview: item.generated_content_preview,
        content_length: item.content_length,
        all_generated_titles: item.all_generated_titles,
        references_files: item.references_files,
        references_urls: item.references_urls,
        references_custom_text: item.references_custom_text,
        setup_step: item.setup_step,
        step_number: item.step_number
      })
      
      acc[sessionId].total_cost_usd += parseFloat(item.total_cost_usd || 0)
      acc[sessionId].total_cost_inr += parseFloat(item.total_cost_inr || 0)
      acc[sessionId].total_tokens += (item.total_tokens || 0)
      
      return acc
    }, {})

    // Convert to array and sort by oldest first (chronological order), with steps in chronological order
    const sessionArray = Object.values(sessions).map((session: any) => ({
      ...session,
      steps: session.steps.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })).sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    console.log('[session-history] Final grouped sessions:', sessionArray.map((session: any) => ({
      session_id: session.session_id,
      steps: session.steps.map((step: any) => step.operation_type),
      total_steps: session.steps.length,
      title_steps: session.steps.filter((step: any) => step.operation_type === 'title_generation').length,
      has_titles: session.steps.some((step: any) => step.all_generated_titles && step.all_generated_titles.length > 0)
    })))
    
    // Debug each session's title data
    sessionArray.forEach((session: any, index: number) => {
      const titleSteps = session.steps.filter((step: any) => step.operation_type === 'title_generation')
      if (titleSteps.length > 0) {
        console.log(`[session-history] Session ${index + 1} title data:`, {
          session_id: session.session_id,
          title_steps_count: titleSteps.length,
          title_steps: titleSteps.map((step: any) => ({
            id: step.id,
            all_generated_titles: step.all_generated_titles,
            titles_count: step.all_generated_titles?.length || 0
          }))
        })
      }
    })

    return NextResponse.json({
      data: sessionArray,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error in session history GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 