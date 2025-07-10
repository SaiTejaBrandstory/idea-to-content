import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Together from 'together-ai'
import { 
  getOpenAIModelDescription, 
  getOpenAIPricing, 
  getTogetherModelName, 
  getTogetherModelDescription, 
  getTogetherPricing 
} from '@/lib/model-utils'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSessionId } from '@/lib/session-manager'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Together client only when needed
const getTogetherClient = () => {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('Together.ai API key not configured')
  }
  return new Together({
    apiKey: process.env.TOGETHER_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { keywords, blogType, apiProvider = 'openai', model = 'gpt-4o', tone, sessionId } = await request.json()

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords are required' },
        { status: 400 }
      )
    }

    // Validate API keys based on provider
    if (apiProvider === 'openai' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    if (apiProvider === 'together' && !process.env.TOGETHER_API_KEY) {
      return NextResponse.json(
        { error: 'Together.ai API key not configured' },
        { status: 500 }
      )
    }

    // Blog type specific instruction
    let typeInstruction = ''
    switch (blogType) {
      case 'Listicle':
        typeInstruction = 'Generate titles suitable for a numbered listicle blog post.'
        break
      case 'How-to':
        typeInstruction = 'Generate titles suitable for a step-by-step how-to blog post.'
        break
      case 'Case Study':
        typeInstruction = 'Generate titles suitable for a real-world case study blog post.'
        break
      case 'Solution-based':
        typeInstruction = 'Generate titles suitable for a problem-solving, solution-based blog post.'
        break
      case 'Informative':
      default:
        typeInstruction = 'Generate titles suitable for an educational and comprehensive informative blog post.'
    }

    // Tone-specific instruction
    const toneInstruction = tone ? `The writing tone should be ${tone.subtype} (${tone.type}).` : ''

    const prompt = `Generate 5 engaging, SEO-friendly blog titles for a ${blogType} blog post using these keywords: ${keywords.join(', ')}. ${typeInstruction} ${toneInstruction}

Requirements:
- Each title should be compelling and click-worthy
- Include the main keywords naturally
- Keep titles under 60 characters
- Return only the titles, one per line`

    console.log('[generate-titles] FINAL PROMPT:', prompt)

    let completion: any
    let usage = null

    if (apiProvider === 'openai') {
      console.log(`[generate-titles] Using OpenAI with model: ${model}`)
      completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional content strategist and SEO expert. Generate compelling blog titles that are optimized for search engines and user engagement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300,
      })
      usage = completion.usage
    } else if (apiProvider === 'together') {
      console.log(`[generate-titles] Using Together.ai with model: ${model}`)
      const together = getTogetherClient()
      completion = await together.chat.completions.create({
        model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional content strategist and SEO expert. Generate compelling blog titles that are optimized for search engines and user engagement.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300,
    })
      usage = completion.usage
    }

    if (!completion) {
      throw new Error(`No completion generated from ${apiProvider}`)
    }

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error(`No content generated from ${apiProvider}`)
    }

    const titles = content
      .split('\n')
      .filter((title: string) => title.trim())
      .map((title: string) => title.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 5)

    if (titles.length === 0) {
      throw new Error('No valid titles generated')
    }

    // Calculate cost for history tracking
    let totalCostUsd = 0
    let totalCostInr = 0
    let inputPricePerToken = 0
    let outputPricePerToken = 0
    let pricingUnits = 'per_1K_tokens'

    if (usage) {
      if (apiProvider === 'openai') {
        const pricing = getOpenAIPricing(model)
        inputPricePerToken = pricing.input / 1000
        outputPricePerToken = pricing.output / 1000
        pricingUnits = 'per_1K_tokens'
        totalCostUsd = (usage.prompt_tokens * pricing.input / 1000) + (usage.completion_tokens * pricing.output / 1000)
      } else {
        const pricing = getTogetherPricing(model)
        inputPricePerToken = pricing.input / 1000000
        outputPricePerToken = pricing.output / 1000000
        pricingUnits = 'per_1M_tokens'
        totalCostUsd = (usage.prompt_tokens * pricing.input / 1000000) + (usage.completion_tokens * pricing.output / 1000000)
      }
      totalCostInr = totalCostUsd * 83
    }

    // Save to history (async, don't wait for it)
    try {
      const historyData = {
        operation_type: 'title_generation',
        api_provider: apiProvider,
        model_id: model,
        model_name: apiProvider === 'openai' ? model : getTogetherModelName(model),
        keywords: keywords,
        blog_type: blogType,
        tone_type: tone?.type || null,
        tone_subtype: tone?.subtype || null,
        input_tokens: usage?.prompt_tokens || 0,
        output_tokens: usage?.completion_tokens || 0,
        total_tokens: usage ? usage.prompt_tokens + usage.completion_tokens : 0,
        input_price_per_token: inputPricePerToken,
        output_price_per_token: outputPricePerToken,
        pricing_units: pricingUnits,
        input_cost_usd: usage ? (usage.prompt_tokens * inputPricePerToken) : 0,
        output_cost_usd: usage ? (usage.completion_tokens * outputPricePerToken) : 0,
        total_cost_usd: totalCostUsd,
        total_cost_inr: totalCostInr,
        generated_content_preview: titles.join(', ').substring(0, 500),
        content_length: titles.join(', ').length,
        // Additional tracking fields
        all_generated_titles: titles, // Save all titles, not just selected
        setup_step: 'title_generation',
        step_number: 5
      }

      // Save history directly to database instead of making HTTP request
      const supabase = createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        try {
          await supabase
            .from('usage_history')
            .insert({
              user_id: user.id,
              session_id: sessionId || `session_${user.id}_${Math.floor(Date.now() / (30 * 60 * 1000))}`,
              operation_type: 'title_generation',
              api_provider: apiProvider,
              model_id: model,
              model_name: apiProvider === 'openai' ? model : getTogetherModelName(model),
              keywords: keywords,
              blog_type: blogType,
              tone_type: tone?.type || null,
              tone_subtype: tone?.subtype || null,
              input_tokens: usage?.prompt_tokens || 0,
              output_tokens: usage?.completion_tokens || 0,
              total_tokens: usage ? usage.prompt_tokens + usage.completion_tokens : 0,
              input_price_per_token: inputPricePerToken,
              output_price_per_token: outputPricePerToken,
              pricing_units: pricingUnits,
              input_cost_usd: usage ? (usage.prompt_tokens * inputPricePerToken) : 0,
              output_cost_usd: usage ? (usage.completion_tokens * outputPricePerToken) : 0,
              total_cost_usd: totalCostUsd,
              total_cost_inr: totalCostInr,
                          generated_content_full: titles.join('\n'),
            generated_content_preview: titles.join(', ').substring(0, 500),
            content_length: titles.join('\n').length,
            all_generated_titles: titles,
              setup_step: 'title_generation',
              step_number: 5,
              ip_address: request.headers.get('x-forwarded-for') || request.ip,
              user_agent: request.headers.get('user-agent')
            })
          console.log('[generate-titles] History saved successfully with titles:', titles)
        } catch (err: any) {
          console.error('Failed to save history:', err)
        }
      }
    } catch (error) {
      console.error('Error saving history:', error)
    }

    return NextResponse.json({ 
      titles, 
      usage,
      apiProvider,
      model,
      selectedModel: {
        id: model,
        name: apiProvider === 'openai' ? model : getTogetherModelName(model),
        description: apiProvider === 'openai' ? getOpenAIModelDescription(model) : getTogetherModelDescription(model),
        provider: apiProvider,
        pricing: apiProvider === 'openai' ? getOpenAIPricing(model) : getTogetherPricing(model)
      }
    })
  } catch (error: any) {
    console.error('Error generating titles:', error)
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your configuration.' },
        { status: 401 }
      )
    }
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate titles. Please try again.' },
      { status: 500 }
    )
  }
} 