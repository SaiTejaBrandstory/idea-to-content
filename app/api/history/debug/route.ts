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

    // Get recent history entries with all columns
    const { data, error } = await supabase
      .from('usage_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching debug data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch debug data' },
        { status: 500 }
      )
    }

    // Check if new columns exist
    const sampleEntry = data[0]
    const columnCheck = {
      has_generated_content_full: 'generated_content_full' in sampleEntry,
      has_all_generated_titles: 'all_generated_titles' in sampleEntry,
      has_references_files: 'references_files' in sampleEntry,
      has_references_urls: 'references_urls' in sampleEntry,
      has_references_custom_text: 'references_custom_text' in sampleEntry,
      has_setup_step: 'setup_step' in sampleEntry,
      has_step_number: 'step_number' in sampleEntry,
      has_word_count: 'word_count' in sampleEntry,
      has_paragraphs: 'paragraphs' in sampleEntry,
      has_temperature: 'temperature' in sampleEntry
    }

    return NextResponse.json({
      message: 'Debug data retrieved successfully',
      user_id: user.id,
      total_entries: data.length,
      column_check: columnCheck,
      recent_entries: data.map(entry => ({
        id: entry.id,
        session_id: entry.session_id,
        operation_type: entry.operation_type,
        api_provider: entry.api_provider,
        created_at: entry.created_at,
        has_full_content: !!entry.generated_content_full,
        content_length: entry.generated_content_full?.length || 0,
        has_titles: !!entry.all_generated_titles,
        titles_count: entry.all_generated_titles?.length || 0,
        has_references: !!(entry.references_files?.length || entry.references_urls?.length || entry.references_custom_text),
        setup_step: entry.setup_step,
        step_number: entry.step_number
      }))
    })
  } catch (error) {
    console.error('Error in debug GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 