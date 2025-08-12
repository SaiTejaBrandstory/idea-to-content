import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Together from 'together-ai'

// Initialize Together client only when needed
const getTogetherClient = () => {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('Together.ai API key not configured')
  }
  return new Together({
    apiKey: process.env.TOGETHER_API_KEY,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const model = searchParams.get('model')

    if (!provider || !['openai', 'together'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider must be either "openai" or "together"' },
        { status: 400 }
      )
    }

    if (!model) {
      return NextResponse.json(
        { error: 'Model parameter is required' },
        { status: 400 }
      )
    }

    let pricing = null

    if (provider === 'openai') {
      // OpenAI does not provide pricing via API, so we use their published pricing
      // Official OpenAI pricing per 1M tokens (as of August 2025)
      // Source: https://platform.openai.com/docs/pricing
      const openaiPricing: { [key: string]: { input: number; output: number } } = {
        // === GPT-5 Series (Current) ===
        'gpt-5': { input: 1.25, output: 10.00 },
        'gpt-5-mini': { input: 0.25, output: 2.00 },
        'gpt-5-nano': { input: 0.05, output: 0.40 },
        'gpt-5-chat-latest': { input: 1.25, output: 10.00 },
        
        // === GPT-4.1 Series Fine-Tuning ===
        'gpt-4.1': { input: 3.00, output: 12.00 },
        'gpt-4.1-mini': { input: 0.80, output: 3.20 },
        'gpt-4.1-nano': { input: 0.20, output: 0.80 },
        
        // === GPT-4o Series (Current multimodal) ===
        'gpt-4o': { input: 5.00, output: 20.00 },
        'gpt-4o-mini': { input: 0.60, output: 2.40 },
        'gpt-4o-audio': { input: 40.00, output: 80.00 },
        'gpt-4o-mini-audio': { input: 10.00, output: 20.00 },
        
        // === Reasoning Models ===
        'o1-pro': { input: 150.00, output: 600.00 },
        'o3-pro': { input: 20.00, output: 80.00 },
        
        // === Legacy Models ===
        'gpt-4': { input: 30.00, output: 60.00 },
        'gpt-4-turbo': { input: 10.00, output: 30.00 },
        'gpt-4.5': { input: 75.00, output: 150.00 },
        'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
      }
      pricing = openaiPricing[model] || null
      if (!pricing) {
        return NextResponse.json(
          { error: 'Pricing not available for this OpenAI model' },
          { status: 404 }
        )
      }
      return NextResponse.json({
        pricing,
        provider,
        model,
        units: 'per_1M_tokens'
      })
    } else if (provider === 'together') {
      if (!process.env.TOGETHER_API_KEY) {
        return NextResponse.json(
          { error: 'Together.ai API key not configured' },
          { status: 500 }
        )
      }
      try {
        const together = getTogetherClient()
        // Fetch real pricing from Together.ai API
        const models = await together.models.list()
        const modelInfo = models.find((m: any) => m.id === model)
        if (!modelInfo) {
          return NextResponse.json(
            { error: `Model ${model} not found in Together.ai API` },
            { status: 404 }
          )
        }
        if (!modelInfo.pricing || modelInfo.pricing.input == null || modelInfo.pricing.output == null) {
          return NextResponse.json(
            { error: `Pricing not available for Together.ai model ${model}` },
            { status: 404 }
          )
        }
        // Parse pricing as float if needed
        let inputPrice = typeof modelInfo.pricing.input === 'string' ? parseFloat(modelInfo.pricing.input) : modelInfo.pricing.input
        let outputPrice = typeof modelInfo.pricing.output === 'string' ? parseFloat(modelInfo.pricing.output) : modelInfo.pricing.output
        // Together.ai pricing is per 1M tokens
        pricing = {
          input: inputPrice,
          output: outputPrice
        }
        return NextResponse.json({
          pricing,
          provider,
          model,
          units: 'per_1M_tokens'
        })
      } catch (error) {
        console.error('Error fetching Together.ai pricing:', error)
        return NextResponse.json(
          { error: 'Failed to fetch Together.ai pricing' },
          { status: 500 }
        )
      }
    }
    // Should never reach here
    return NextResponse.json(
      { error: 'Unknown error' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing' },
      { status: 500 }
    )
  }
} 