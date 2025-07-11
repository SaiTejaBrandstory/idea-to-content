import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Test basic database connection
    console.log('Testing database connection...');
    
    // Test chat_messages table access
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('count')
      .limit(1);
    
    console.log('Chat messages table test:', { hasData: !!messages, error: messagesError });
    
    // Test chat_sessions table access
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('count')
      .limit(1);
    
    console.log('Chat sessions table test:', { hasData: !!sessions, error: sessionsError });
    
    // Test users table access
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    console.log('Users table test:', { hasData: !!users, error: usersError });
    
    // Try to insert a test message
    const testMessage = {
      session_id: '00000000-0000-0000-0000-000000000000', // Dummy session ID
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy user ID
      role: 'user',
      content: 'Test message',
      model_id: 'test-model',
      model_name: 'Test Model',
      api_provider: 'test',
      input_tokens: 1,
      output_tokens: 0,
      total_tokens: 1,
      input_price_per_token: 0.001,
      output_price_per_token: 0,
      input_cost_usd: 0.001,
      output_cost_usd: 0,
      total_cost_usd: 0.001,
      total_cost_inr: 0.083
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('chat_messages')
      .insert(testMessage)
      .select();
    
    console.log('Test insert result:', { hasData: !!insertData, error: insertError });
    
    // If insert was successful, delete the test message
    if (insertData && insertData.length > 0) {
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', insertData[0].id);
      
      console.log('Test delete result:', { error: deleteError });
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        messagesTable: { accessible: !messagesError, error: messagesError },
        sessionsTable: { accessible: !sessionsError, error: sessionsError },
        usersTable: { accessible: !usersError, error: usersError },
        insertTest: { successful: !insertError, error: insertError }
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 