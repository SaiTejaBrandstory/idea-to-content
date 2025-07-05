import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Together from 'together-ai';

const getTogetherClient = () => {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('Together.ai API key not configured');
  }
  return new Together({ apiKey: process.env.TOGETHER_API_KEY });
};

export async function POST(req: NextRequest) {
  try {
    const { message, model, provider, messages } = await req.json();
    if (!message || !model || !provider) {
      return NextResponse.json({ error: 'Missing required fields (message, model, provider)' }, { status: 400 });
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