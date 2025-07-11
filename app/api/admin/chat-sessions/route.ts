import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for data operations (bypasses RLS)
    const adminClient = createAdminClient();
    
    // Check admin using admin client to bypass RLS
    const { data: adminData } = await adminClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = adminClient
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching chat sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
    }

    // Fetch user data for each session using admin client
    const sessionsWithUsers = await Promise.all(
      (sessions || []).map(async (session) => {
        try {
          const { data: userData, error: userError } = await adminClient
            .from('users')
            .select('id, full_name, email, created_at')
            .eq('id', session.user_id)
            .single();

          return {
            ...session,
            users: userError ? undefined : userData
          };
        } catch (error) {
          console.error(`Error fetching user data for session ${session.id}:`, error);
          return {
            ...session,
            users: undefined
          };
        }
      })
    );

    return NextResponse.json({ sessions: sessionsWithUsers });
  } catch (error) {
    console.error('Admin chat sessions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 