import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Together from 'together-ai'

// Initialize Together client only when needed
const getTogetherClient = () => {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('Together.ai API key not configured')
  }
  return new Together()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider || !['openai', 'together'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider must be either "openai" or "together"' },
        { status: 400 }
      )
    }

    let models: any[] = []

    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 500 }
        )
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      try {
        const response = await openai.models.list()
        models = response.data
          .map(model => ({
            id: model.id,
            name: model.id,
            description: (model as any).description || getOpenAIModelDescription(model.id),
            provider: 'openai',
            pricing: getOpenAIPricing(model.id),
            type: (model as any).type || '',
            // Add more fields if available
          }))
      } catch (error) {
        console.error('Error fetching OpenAI models:', error)
        // Fallback to hardcoded models if API fails
        models = getFallbackOpenAIModels()
      }
    } else if (provider === 'together') {
      if (!process.env.TOGETHER_API_KEY) {
        return NextResponse.json(
          { error: 'Together.ai API key not configured' },
          { status: 500 }
        )
      }

      try {
        const together = getTogetherClient()
        const response = await together.models.list()
        models = response.map((model: any) => ({
          id: model.id,
          name: model.name || getTogetherModelName(model.id),
          description: model.description || getTogetherModelDescription(model.id),
          provider: 'together',
          pricing: getTogetherPricing(model.id),
          author: model.author || '',
          type: (model as any).type || '',
          // You can add more fields if needed
        }))
      } catch (error) {
        console.error('Error fetching Together.ai models:', error)
        // Fallback to hardcoded models if API fails
        models = getFallbackTogetherModels()
      }
    }

    return NextResponse.json({ models })
  } catch (error: any) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

// Helper functions for model information
function getOpenAIModelDescription(modelId: string): string {
  const descriptions: { [key: string]: string } = {
    'gpt-4o': 'Latest and most capable model',
    'gpt-4o-mini': 'Fast and efficient model',
    'gpt-3.5-turbo': 'Cost-effective option',
    'gpt-4': 'High performance model',
    'gpt-4-turbo': 'Balanced performance and cost'
  }
  return descriptions[modelId] || 'OpenAI model'
}

function getOpenAIPricing(modelId: string): { input: number; output: number } {
  const pricing: { [key: string]: { input: number; output: number } } = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 }
  }
  return pricing[modelId] || { input: 0.005, output: 0.015 }
}

function getTogetherModelName(modelId: string): string {
  const names: { [key: string]: string } = {
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 'Llama 3.1 8B Turbo',
    'meta-llama/Meta-Llama-3.1-70B-Instruct': 'Llama 3.1 70B',
    'deepseek-ai/DeepSeek-V3': 'DeepSeek V3',
    'microsoft/WizardLM-2-8x22B': 'WizardLM 2',
    'google/gemma-2-27b-it': 'Gemma 2 27B',
    'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet'
  }
  return names[modelId] || modelId.split('/').pop() || modelId
}

function getTogetherModelDescription(modelId: string): string {
  const descriptions: { [key: string]: string } = {
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 'Fast & efficient (recommended)',
    'meta-llama/Meta-Llama-3.1-70B-Instruct': 'High performance, larger model',
    'deepseek-ai/DeepSeek-V3': 'Advanced reasoning & coding',
    'microsoft/WizardLM-2-8x22B': 'Microsoft\'s instruction model',
    'google/gemma-2-27b-it': 'Google\'s efficient model',
    'anthropic/claude-3.5-sonnet': 'Anthropic\'s balanced model'
  }
  return descriptions[modelId] || 'Together.ai model'
}

function getTogetherPricing(modelId: string): { input: number; output: number } {
  // Together.ai pricing varies by model, using approximate values
  const pricing: { [key: string]: { input: number; output: number } } = {
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { input: 0.14, output: 0.28 },
    'meta-llama/Meta-Llama-3.1-70B-Instruct': { input: 0.59, output: 0.79 },
    'deepseek-ai/DeepSeek-V3': { input: 0.14, output: 0.28 },
    'microsoft/WizardLM-2-8x22B': { input: 0.35, output: 0.45 },
    'google/gemma-2-27b-it': { input: 0.20, output: 0.30 },
    'anthropic/claude-3.5-sonnet': { input: 0.25, output: 0.35 }
  }
  return pricing[modelId] || { input: 0.25, output: 0.35 }
}

// Fallback models if API fails
function getFallbackOpenAIModels() {
  return [
    { id: 'gpt-4o', name: 'gpt-4o', description: 'Latest and most capable model', provider: 'openai', pricing: { input: 0.005, output: 0.015 } },
    { id: 'gpt-4o-mini', name: 'gpt-4o-mini', description: 'Fast and efficient model', provider: 'openai', pricing: { input: 0.00015, output: 0.0006 } },
    { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', description: 'Cost-effective option', provider: 'openai', pricing: { input: 0.0005, output: 0.0015 } }
  ]
}

function getFallbackTogetherModels() {
  return [
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo', description: 'Fast & efficient (recommended)', provider: 'together', pricing: { input: 0.14, output: 0.28 } },
    { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', description: 'High performance, larger model', provider: 'together', pricing: { input: 0.59, output: 0.79 } },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: 'Advanced reasoning & coding', provider: 'together', pricing: { input: 0.14, output: 0.28 } }
  ]
} 