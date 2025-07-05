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
      // This is the only exception to the no-hardcoded rule
      const openaiPricing: { [key: string]: { input: number; output: number } } = {
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 }
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
        units: 'per_1K_tokens'
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