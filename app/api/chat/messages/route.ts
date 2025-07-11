import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get session with messages
    const { data: sessionData, error } = await supabase.rpc('get_chat_session_with_messages', {
      session_uuid: sessionId,
      user_uuid: user.id
    });

    if (error) {
      console.error('Error fetching chat session:', error);
      return NextResponse.json({ error: 'Failed to fetch chat session' }, { status: 500 });
    }

    if (!sessionData || sessionData.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Parse the session data
    const session = {
      id: sessionData[0].session_id,
      title: sessionData[0].session_title,
      created_at: sessionData[0].session_created_at,
      updated_at: sessionData[0].session_updated_at,
      total_messages: sessionData[0].session_total_messages,
      total_cost_usd: sessionData[0].session_total_cost_usd,
      total_cost_inr: sessionData[0].session_total_cost_inr,
      total_tokens: sessionData[0].session_total_tokens
    };

    const messages = sessionData
      .filter((row: any) => row.message_id) // Only include rows with messages
      .map((row: any) => ({
        id: row.message_id,
        role: row.message_role,
        content: row.message_content,
        model_id: row.message_model_id,
        model_name: row.message_model_name,
        api_provider: row.message_api_provider,
        input_tokens: row.message_input_tokens,
        output_tokens: row.message_output_tokens,
        total_tokens: row.message_total_tokens,
        total_cost_usd: row.message_total_cost_usd,
        total_cost_inr: row.message_total_cost_inr,
        created_at: row.message_created_at
      }));

    return NextResponse.json({ session, messages });
  } catch (error) {
    console.error('Chat messages API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, role, content, model, apiProvider, tokens, costs } = await request.json();

    if (!sessionId || !role || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create new message
    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: role,
        content: content,
        model_id: model?.id || model,
        model_name: model?.name || model,
        api_provider: apiProvider,
        input_tokens: tokens?.input || 0,
        output_tokens: tokens?.output || 0,
        total_tokens: tokens?.total || 0,
        input_price_per_token: costs?.input_price || 0,
        output_price_per_token: costs?.output_price || 0,
        input_cost_usd: costs?.input_cost || 0,
        output_cost_usd: costs?.output_cost || 0,
        total_cost_usd: costs?.total_cost || 0,
        total_cost_inr: costs?.total_cost_inr || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat message:', error);
      return NextResponse.json({ error: 'Failed to create chat message' }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Create chat message API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 