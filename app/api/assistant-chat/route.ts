import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Together from 'together-ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const getTogetherClient = () => {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('Together.ai API key not configured');
  }
  return new Together({ apiKey: process.env.TOGETHER_API_KEY });
};

export async function POST(req: NextRequest) {
  try {
    const { message, model, provider, messages, sessionId } = await req.json();
    console.log('API received request:', { 
      provider, 
      modelId: model?.id, 
      modelName: model?.name,
      sessionId 
    });
    if (!message || !model || !provider) {
      return NextResponse.json({ error: 'Missing required fields (message, model, provider)' }, { status: 400 });
    }

    // Get the current user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let aiMessage = '';

    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const chatMessages = (messages || []).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      chatMessages.push({ role: 'user', content: message });
      try {
        const response = await openai.chat.completions.create({
          model: model.id || model,
          messages: chatMessages,
          max_tokens: 1024,
          temperature: 0.7,
        });
        aiMessage = response.choices[0]?.message?.content || '';
        
        // Calculate costs for OpenAI
        const usage = response.usage;
        const inputTokens = usage?.prompt_tokens || 0;
        const outputTokens = usage?.completion_tokens || 0;
        const totalTokens = usage?.total_tokens || 0;
        
        // OpenAI pricing (per 1K tokens)
        const inputPricePerToken = 0.005 / 1000; // $0.005 per 1K input tokens
        const outputPricePerToken = 0.015 / 1000; // $0.015 per 1K output tokens
        
        const inputCost = inputTokens * inputPricePerToken;
        const outputCost = outputTokens * outputPricePerToken;
        const totalCost = inputCost + outputCost;
        const totalCostInr = totalCost * 83; // Approximate INR conversion
        
        // Save user message to database if sessionId is provided
        if (sessionId) {
          console.log('Saving Together AI user message:', { sessionId, model: model.id || model, provider });
          const { error: userError } = await supabase.from('chat_messages').insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'user',
            content: message,
            model_id: (model.id || model).toString().substring(0, 100), // Truncate to 100 chars
            model_name: (model.name || model).toString().substring(0, 100), // Truncate to 100 chars
            api_provider: provider,
            input_tokens: inputTokens,
            output_tokens: 0,
            total_tokens: inputTokens,
            input_price_per_token: inputPricePerToken,
            output_price_per_token: 0,
            input_cost_usd: inputCost,
            output_cost_usd: 0,
            total_cost_usd: inputCost,
            total_cost_inr: inputCost * 83
          });
          if (userError) {
            console.error('Error saving Together AI user message:', userError);
          }
        }
        
        // Save AI response to database if sessionId is provided
        if (sessionId) {
          console.log('Saving Together AI assistant message:', { sessionId, model: model.id || model, provider });
          const { error: assistantError } = await supabase.from('chat_messages').insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: aiMessage,
            model_id: (model.id || model).toString().substring(0, 100), // Truncate to 100 chars
            model_name: (model.name || model).toString().substring(0, 100), // Truncate to 100 chars
            api_provider: provider,
            input_tokens: 0,
            output_tokens: outputTokens,
            total_tokens: outputTokens,
            input_price_per_token: 0,
            output_price_per_token: outputPricePerToken,
            input_cost_usd: 0,
            output_cost_usd: outputCost,
            total_cost_usd: outputCost,
            total_cost_inr: totalCostInr
          });
          if (assistantError) {
            console.error('Error saving Together AI assistant message:', assistantError);
          }
        }
      } catch (err: any) {
        console.error('OpenAI API error:', err);
        return NextResponse.json({ error: err.message || 'OpenAI API error' }, { status: 500 });
      }
    } else if (provider === 'together') {
      if (!process.env.TOGETHER_API_KEY) {
        return NextResponse.json({ error: 'Together.ai API key not configured' }, { status: 500 });
      }
      const chatMessages = (messages || []).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      chatMessages.push({ role: 'user', content: message });
      let max_new_tokens = 128;
      const togetherModelId = model.id || model;
      if (/deepseek/i.test(togetherModelId)) {
        max_new_tokens = 20;
      } else if (/llama|mistral|gemma|wizardlm|phi|claude|mixtral/i.test(togetherModelId)) {
        max_new_tokens = 512;
      }
      try {
        const togetherRes = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: togetherModelId,
            messages: chatMessages,
            max_new_tokens,
            temperature: 0.7,
          }),
        });
        const response = await togetherRes.json();
        if (!togetherRes.ok) {
          console.error('Together API error:', response);
          return NextResponse.json({ error: response.error?.message || JSON.stringify(response) || 'Together API error' }, { status: togetherRes.status });
        }
        aiMessage = response.choices[0]?.message?.content || '';
        
        // Calculate costs for Together.ai
        const usage = response.usage;
        const inputTokens = usage?.prompt_tokens || 0;
        const outputTokens = usage?.completion_tokens || 0;
        const totalTokens = usage?.total_tokens || 0;
        
        // Together.ai pricing (approximate - varies by model)
        // Using more accurate pricing for Together.ai models
        let inputPricePerToken = 0.00000014; // Default: $0.14 per 1M tokens
        let outputPricePerToken = 0.00000028; // Default: $0.28 per 1M tokens
        
        // Adjust pricing based on model type
        if (/llama-3-8b/i.test(togetherModelId)) {
          inputPricePerToken = 0.0000002; // $0.20 per 1M tokens
          outputPricePerToken = 0.0000002; // $0.20 per 1M tokens
        } else if (/llama-3-70b/i.test(togetherModelId)) {
          inputPricePerToken = 0.00000059; // $0.59 per 1M tokens
          outputPricePerToken = 0.00000079; // $0.79 per 1M tokens
        } else if (/mistral/i.test(togetherModelId)) {
          inputPricePerToken = 0.00000014; // $0.14 per 1M tokens
          outputPricePerToken = 0.00000042; // $0.42 per 1M tokens
        } else if (/gemma/i.test(togetherModelId)) {
          inputPricePerToken = 0.0000001; // $0.10 per 1M tokens
          outputPricePerToken = 0.0000001; // $0.10 per 1M tokens
        }
        
        const inputCost = inputTokens * inputPricePerToken;
        const outputCost = outputTokens * outputPricePerToken;
        const totalCost = inputCost + outputCost;
        const totalCostInr = totalCost * 83; // Approximate INR conversion
        
        // Save user message to database if sessionId is provided
        if (sessionId) {
          console.log('Saving Together AI user message:', { sessionId, model: model.id || model, provider });
          const { error: userError } = await supabase.from('chat_messages').insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'user',
            content: message,
            model_id: (model.id || model).toString().substring(0, 100), // Truncate to 100 chars
            model_name: (model.name || model.id || model).toString().substring(0, 100), // Use model.id as fallback
            api_provider: provider,
            input_tokens: inputTokens,
            output_tokens: 0,
            total_tokens: inputTokens,
            input_price_per_token: inputPricePerToken,
            output_price_per_token: 0,
            input_cost_usd: inputCost,
            output_cost_usd: 0,
            total_cost_usd: inputCost,
            total_cost_inr: inputCost * 83
          });
          if (userError) {
            console.error('Error saving Together AI user message:', userError);
          }
        }
        
        // Save AI response to database if sessionId is provided
        if (sessionId) {
          console.log('Saving Together AI assistant message:', { sessionId, model: model.id || model, provider });
          const { error: assistantError } = await supabase.from('chat_messages').insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: aiMessage,
            model_id: (model.id || model).toString().substring(0, 100), // Truncate to 100 chars
            model_name: (model.name || model.id || model).toString().substring(0, 100), // Use model.id as fallback
            api_provider: provider,
            input_tokens: 0,
            output_tokens: outputTokens,
            total_tokens: outputTokens,
            input_price_per_token: 0,
            output_price_per_token: outputPricePerToken,
            input_cost_usd: 0,
            output_cost_usd: outputCost,
            total_cost_usd: outputCost,
            total_cost_inr: totalCostInr
          });
          if (assistantError) {
            console.error('Error saving Together AI assistant message:', assistantError);
          }
        }
      } catch (err: any) {
        console.error('Together API error:', err);
        return NextResponse.json({ error: err.message || 'Together API error' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    return NextResponse.json({ aiMessage });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || JSON.stringify(error) || 'Failed to get AI response' }, { status: 500 });
  }
} 