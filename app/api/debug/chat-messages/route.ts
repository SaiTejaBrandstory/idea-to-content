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
    const provider = searchParams.get('provider');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by provider if specified
    if (provider) {
      query = query.eq('api_provider', provider);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching chat messages:', error);
      return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
    }

    // Group messages by provider for analysis
    const providerStats = messages.reduce((acc, msg) => {
      const provider = msg.api_provider || 'unknown';
      if (!acc[provider]) {
        acc[provider] = { count: 0, total_cost: 0, models: new Set() };
      }
      acc[provider].count++;
      acc[provider].total_cost += msg.total_cost_usd || 0;
      acc[provider].models.add(msg.model_name || msg.model_id);
      return acc;
    }, {} as any);

    // Convert Sets to arrays for JSON serialization
    Object.keys(providerStats).forEach(provider => {
      providerStats[provider].models = Array.from(providerStats[provider].models);
    });

    return NextResponse.json({ 
      messages: messages || [],
      providerStats,
      totalMessages: messages?.length || 0
    });
  } catch (error) {
    console.error('Debug chat messages API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 