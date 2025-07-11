import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Update session title
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', params.sessionId)
      .eq('user_id', user.id) // Ensure user owns the session
      .select()
      .single();

    if (error) {
      console.error('Error updating session title:', error);
      return NextResponse.json({ error: 'Failed to update session title' }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Update session title API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 