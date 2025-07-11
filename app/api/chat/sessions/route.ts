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

    // Get user's chat sessions
    const { data: sessions, error } = await supabase.rpc('get_user_chat_sessions', {
      user_uuid: user.id,
      limit_count: 50
    });

    if (error) {
      console.error('Error fetching chat sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    console.error('Chat sessions API error:', error);
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

    const { title = 'New Chat' } = await request.json();

    // Create new chat session
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: title
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat session:', error);
      return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Create chat session API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 