import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

    const { text, sessionId } = await request.json();
    const apiKey = process.env.REPHRASY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'REPHRASY_API_KEY not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://v1-humanizer.rephrasy.ai/api', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model: "Undetectable Model",
        words: true,
        costs: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Rephrasy API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Calculate costs from Rephrasy response
    const inputTokens = data.input_tokens || 0;
    const outputTokens = data.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    
    // Rephrasy pricing (approximate - adjust based on actual pricing)
    const inputPricePerToken = 0.0000001; // $0.0001 per 1M tokens
    const outputPricePerToken = 0.0000002; // $0.0002 per 1M tokens
    
    const inputCostUsd = inputTokens * inputPricePerToken;
    const outputCostUsd = outputTokens * outputPricePerToken;
    const totalCostUsd = inputCostUsd + outputCostUsd;
    const totalCostInr = totalCostUsd * 83; // Approximate INR conversion

    // Save to history (async, don't wait for it)
    try {
      const historyData = {
        operation_type: 'humanize',
        api_provider: 'rephrasy',
        model_id: 'Undetectable Model',
        model_name: 'Rephrasy Humanizer',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        input_price_per_token: inputPricePerToken,
        output_price_per_token: outputPricePerToken,
        pricing_units: 'per_1M_tokens',
        input_cost_usd: inputCostUsd,
        output_cost_usd: outputCostUsd,
        total_cost_usd: totalCostUsd,
        total_cost_inr: totalCostInr,
                      generated_content_full: data.output || '',
              generated_content_preview: data.output?.substring(0, 500) || 'Humanized content',
              content_length: data.output?.length || 0,
        setup_step: 'humanize',
        step_number: 7
      }

      // Save history directly to database instead of making HTTP request
      if (user) {
        try {
          await supabase
            .from('usage_history')
            .insert({
              user_id: user.id,
              session_id: sessionId || `session_${user.id}_${Math.floor(Date.now() / (30 * 60 * 1000))}`,
              operation_type: 'humanize',
              api_provider: 'rephrasy',
              model_id: 'Undetectable Model',
              model_name: 'Rephrasy Humanizer',
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: totalTokens,
              input_price_per_token: inputPricePerToken,
              output_price_per_token: outputPricePerToken,
              pricing_units: 'per_1M_tokens',
              input_cost_usd: inputCostUsd,
              output_cost_usd: outputCostUsd,
              total_cost_usd: totalCostUsd,
              total_cost_inr: totalCostInr,
              generated_content_full: data.output || '',
              generated_content_preview: data.output?.substring(0, 500) || 'Humanized content',
              content_length: data.output?.length || 0,
              setup_step: 'humanize',
              step_number: 7,
              ip_address: request.headers.get('x-forwarded-for') || request.ip,
              user_agent: request.headers.get('user-agent')
            })
          console.log('Humanize history saved successfully')
        } catch (err: any) {
          console.error('Failed to save humanize history:', err)
        }
      }
    } catch (error) {
      console.error('Error saving humanize history:', error)
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to humanize text' },
      { status: 500 }
    );
  }
} 