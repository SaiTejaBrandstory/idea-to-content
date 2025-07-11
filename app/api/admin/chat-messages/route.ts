import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get session with messages
    const { data: sessionData, error } = await supabase.rpc('get_chat_session_with_messages', {
      session_uuid: sessionId,
      user_uuid: null // Admin can access any session
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
      total_tokens: sessionData[0].session_total_tokens,
      user_id: sessionData[0].session_user_id
    };

    // Fetch user data separately using admin client
    let sessionUserData = undefined;
    try {
      const adminClient = createAdminClient();
      const { data: user, error: userError } = await adminClient
        .from('users')
        .select('id, full_name, email, created_at')
        .eq('id', session.user_id)
        .single();
      
      if (!userError && user) {
        sessionUserData = user;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }

    const sessionWithUser = {
      ...session,
      users: sessionUserData
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

    return NextResponse.json({ session: sessionWithUser, messages });
  } catch (error) {
    console.error('Admin chat messages API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 