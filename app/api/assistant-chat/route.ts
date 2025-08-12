import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Together from 'together-ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTokenParameter, createTemperatureParameter, normalizeOpenAIUsage, isGpt5Model } from '@/lib/model-utils';

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
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let inputCost = 0;
    let outputCost = 0;
    let totalCost = 0;
    let totalCostInr = 0;

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
        const modelId = model.id || model
        let chatResponse: any = null;
        if (isGpt5Model(modelId)) {
          // Use Responses API for GPT-5 family without explicit caps
          const responsesClient: any = (openai as any)
          let resp: any
          if (responsesClient?.responses?.create) {
            resp = await responsesClient.responses.create({
              model: modelId,
              input: chatMessages.map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`).join('\n'),
            })
          } else {
            const httpResp = await fetch('https://api.openai.com/v1/responses', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: modelId,
                input: chatMessages.map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`).join('\n'),
              }),
            })
            resp = await httpResp.json()
          }
          aiMessage = resp?.output_text || resp?.output?.[0]?.content?.[0]?.text || ''
          // We don't receive a consistent usage format here; skip detailed cost calc for now
        } else {
          chatResponse = await openai.chat.completions.create({
            model: modelId,
            messages: chatMessages,
            ...createTokenParameter(modelId, 4000),
            ...createTemperatureParameter(modelId, 0.7),
          });
          aiMessage = chatResponse.choices[0]?.message?.content || '';
          // Could normalize usage here if needed in future:
          // const usage = normalizeOpenAIUsage(chatResponse.usage)
        }
        
        // Get model pricing from models API
        let modelPricing = { input: 0.50, output: 1.50 }; // Default to GPT-3.5-turbo pricing
        try {
          const modelsResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/models?provider=openai`);
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            const currentModel = modelsData.models?.find((m: any) => m.id === modelId);
            if (currentModel?.pricing) {
              modelPricing = currentModel.pricing;
            }
          }
        } catch (error) {
          console.warn('Failed to fetch model pricing, using defaults:', error);
        }
        
        // Calculate costs for OpenAI
        let usage: any = null;
        
        if (isGpt5Model(modelId)) {
          // For GPT-5 Responses API, we need to estimate tokens since usage isn't provided
          // Rough estimation: 1 token ≈ 4 characters for English text
          const inputText = chatMessages.map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
          const outputText = aiMessage;
          
          inputTokens = Math.ceil(inputText.length / 4);
          outputTokens = Math.ceil(outputText.length / 4);
          totalTokens = inputTokens + outputTokens;
          
          console.log(`GPT-5 token estimation: input=${inputTokens}, output=${outputTokens}, total=${totalTokens}`);
        } else {
          // For Chat Completions API, we get usage data
          usage = chatResponse.usage;
          inputTokens = usage?.prompt_tokens || 0;
          outputTokens = usage?.completion_tokens || 0;
          totalTokens = usage?.total_tokens || 0;
        }
        
        // Calculate costs using actual model pricing
        // Pricing is per 1M tokens, so divide by 1,000,000 to get per token cost
        const inputPricePerToken = modelPricing.input / 1000000; // Convert from per 1M to per token
        const outputPricePerToken = modelPricing.output / 1000000;
        
        inputCost = inputTokens * inputPricePerToken;
        outputCost = outputTokens * outputPricePerToken;
        totalCost = inputCost + outputCost;
        totalCostInr = totalCost * 83; // Approximate INR conversion
        
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
        inputTokens = usage?.prompt_tokens || 0;
        outputTokens = usage?.completion_tokens || 0;
        totalTokens = usage?.total_tokens || 0;
        
        // Get real Together.ai pricing from our pricing API
        let inputPricePerToken = 0.00000025; // Default fallback: $0.25 per 1M tokens
        let outputPricePerToken = 0.00000035; // Default fallback: $0.35 per 1M tokens
        
        try {
          const pricingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/pricing?provider=together&model=${encodeURIComponent(togetherModelId)}`);
          if (pricingResponse.ok) {
            const pricingData = await pricingResponse.json();
            if (pricingData.pricing) {
              // Convert from per 1M tokens to per token
              inputPricePerToken = pricingData.pricing.input / 1000000;
              outputPricePerToken = pricingData.pricing.output / 1000000;
              console.log(`[cost] Together.ai real pricing for ${togetherModelId}: input=$${pricingData.pricing.input}/1M, output=$${pricingData.pricing.output}/1M`);
            }
          }
        } catch (error) {
          console.warn('Failed to fetch Together.ai real pricing, using fallback:', error);
        }
        
        inputCost = inputTokens * inputPricePerToken;
        outputCost = outputTokens * outputPricePerToken;
        totalCost = inputCost + outputCost;
        totalCostInr = totalCost * 83; // Approximate INR conversion
        
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

    return NextResponse.json({ 
      aiMessage,
      cost: {
        inputTokens,
        outputTokens,
        totalTokens,
        inputCost,
        outputCost,
        totalCost,
        totalCostInr
      }
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || JSON.stringify(error) || 'Failed to get AI response' }, { status: 500 });
  }
} 