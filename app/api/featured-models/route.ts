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

    let featuredModels: any[] = []

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
        const allModels = response.data
        
        // OpenAI featured models - these are the most popular and reliable
        const featuredModelIds = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
        
        featuredModels = allModels
          .filter(model => featuredModelIds.includes(model.id))
          .map(model => ({
            id: model.id,
            name: model.id,
            description: getOpenAIModelDescription(model.id),
            provider: 'openai',
            pricing: getOpenAIPricing(model.id),
            type: model.type || 'chat',
            isFeatured: true
          }))
          .sort((a, b) => {
            // Sort by popularity: gpt-4o first, then gpt-4o-mini, then gpt-3.5-turbo
            const order = { 'gpt-4o': 1, 'gpt-4o-mini': 2, 'gpt-3.5-turbo': 3, 'gpt-4': 4, 'gpt-4-turbo': 5 }
            return (order[a.id as keyof typeof order] || 999) - (order[b.id as keyof typeof order] || 999)
          })
      } catch (error) {
        console.error('Error fetching OpenAI models:', error)
        return NextResponse.json(
          { error: 'Failed to fetch OpenAI models' },
          { status: 500 }
        )
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
        const allModels = await together.models.list()
        
        // Define criteria for featured models
        const isFeaturedModel = (model: any) => {
          const name = model.name?.toLowerCase() || ''
          const id = model.id?.toLowerCase() || ''
          
          // Popular model families
          const popularFamilies = [
            'llama', 'gpt', 'claude', 'gemma', 'wizardlm', 'phi', 'deepseek', 'mistral'
          ]
          
          // Popular model sizes
          const popularSizes = ['8b', '14b', '27b', '70b', '405b']
          
          // Check if model name contains popular indicators
          const hasPopularFamily = popularFamilies.some(family => 
            name.includes(family) || id.includes(family)
          )
          
          const hasPopularSize = popularSizes.some(size => 
            name.includes(size) || id.includes(size)
          )
          
          // Check for specific popular models
          const specificPopularModels = [
            'deepseek-v3', 'deepseek-v2', 'claude-3.5', 'claude-3', 'gpt-4', 'gpt-3.5',
            'llama-3.1', 'llama-3', 'gemma-2', 'wizardlm-2', 'phi-3.5', 'mistral-7b'
          ]
          
          const isSpecificPopular = specificPopularModels.some(popular => 
            name.includes(popular) || id.includes(popular)
          )
          
          // Check for instruction models (better for chat)
          const isInstructionModel = name.includes('instruct') || id.includes('instruct')
          
          // Check for turbo models (faster)
          const isTurboModel = name.includes('turbo') || id.includes('turbo')
          
          return hasPopularFamily && (hasPopularSize || isSpecificPopular || isInstructionModel || isTurboModel)
        }
        
        // Filter and map featured models
        featuredModels = allModels
          .filter(isFeaturedModel)
          .map(model => ({
            id: model.id,
            name: model.name || getTogetherModelName(model.id),
            description: model.description || getTogetherModelDescription(model.id),
            provider: 'together',
            pricing: getTogetherPricing(model.id),
            author: model.author || '',
            type: model.type || 'chat',
            isFeatured: true
          }))
          .sort((a, b) => {
            // Sort by popularity/quality indicators
            const getPriority = (model: any) => {
              const name = model.name.toLowerCase()
              const id = model.id.toLowerCase()
              
              // Highest priority models
              if (name.includes('llama-3.1') && name.includes('8b') && name.includes('turbo')) return 1
              if (id.includes('deepseek-v3')) return 2
              if (name.includes('llama-3.1') && name.includes('70b')) return 3
              if (name.includes('wizardlm-2')) return 4
              if (name.includes('gemma-2') && name.includes('27b')) return 5
              if (name.includes('claude-3.5')) return 6
              if (name.includes('llama-3.1') && name.includes('405b')) return 7
              if (name.includes('phi-3.5')) return 8
              if (name.includes('gemma-2') && name.includes('9b')) return 9
              
              // Default priority
              return 999
            }
            
            return getPriority(a) - getPriority(b)
          })
          .slice(0, 10) // Limit to top 10 featured models
      } catch (error) {
        console.error('Error fetching Together.ai models:', error)
        return NextResponse.json(
          { error: 'Failed to fetch Together.ai models' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ 
      featuredModels,
      provider,
      total: featuredModels.length
    })
  } catch (error: any) {
    console.error('Error fetching featured models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch featured models' },
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