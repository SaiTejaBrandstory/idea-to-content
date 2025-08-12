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
    // GPT-5 Series (Flagship Models)
    'gpt-5': 'Latest GPT-5 model with advanced capabilities',
    'gpt-5-mini': 'GPT-5 mini - balanced performance & cost',
    'gpt-5-nano': 'GPT-5 nano - most cost-effective GPT-5',
    'gpt-5-chat-latest': 'Latest GPT-5 chat model',
    
    // GPT-4.1 Series Fine-Tuning
    'gpt-4.1': 'GPT-4.1 with fine-tuning capabilities',
    'gpt-4.1-mini': 'GPT-4.1 mini - efficient fine-tuning',
    'gpt-4.1-nano': 'GPT-4.1 nano - cost-effective fine-tuning',
    
    // GPT-4o Series (Realtime API)
    'gpt-4o': 'GPT-4o realtime model - text mode',
    'gpt-4o-mini': 'GPT-4o mini - fast realtime text',
    'gpt-4o-audio': 'GPT-4o with audio capabilities',
    'gpt-4o-mini-audio': 'GPT-4o mini with audio',
    
    // o1 Series (Reasoning Models)
    'o1-pro': 'o1-pro advanced reasoning model',
    
    // o3 Series
    'o3-pro': 'o3-pro reasoning model',
    
    // Legacy Models
    'gpt-4': 'GPT-4 (legacy)',
    'gpt-4-turbo': 'GPT-4 Turbo (legacy)',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo (legacy)'
  }
  
  // Smart model detection with case-insensitive matching
  const modelIdLower = modelId.toLowerCase();
  
  // GPT-5 variants
  if (modelIdLower.includes('gpt-5') || modelIdLower.includes('gpt5')) {
    if (modelIdLower.includes('mini')) {
      return 'GPT-5 mini - balanced performance & cost';
    } else if (modelIdLower.includes('nano')) {
      return 'GPT-5 nano - most cost-effective GPT-5';
    } else if (modelIdLower.includes('chat-latest')) {
      return 'Latest GPT-5 chat model';
    } else {
      return 'Latest GPT-5 model with advanced capabilities';
    }
  }
  
  // GPT-4.1 variants
  if (modelIdLower.includes('gpt-4.1') || modelIdLower.includes('gpt4.1')) {
    if (modelIdLower.includes('mini')) {
      return 'GPT-4.1 mini - efficient fine-tuning';
    } else if (modelIdLower.includes('nano')) {
      return 'GPT-4.1 nano - cost-effective fine-tuning';
    } else {
      return 'GPT-4.1 with fine-tuning capabilities';
    }
  }
  
  // GPT-4o variants
  if (modelIdLower.includes('gpt-4o') || modelIdLower.includes('gpt4o')) {
    if (modelIdLower.includes('mini')) {
      if (modelIdLower.includes('audio')) {
        return 'GPT-4o mini with audio capabilities';
      } else {
        return 'GPT-4o mini - fast realtime text';
      }
    } else if (modelIdLower.includes('audio')) {
      return 'GPT-4o with audio capabilities';
    } else {
      return 'GPT-4o realtime model - text mode';
    }
  }
  
  // o1 and o3 series
  if (modelIdLower.includes('o1-pro')) {
    return 'o1-pro advanced reasoning model';
  }
  if (modelIdLower.includes('o3-pro')) {
    return 'o3-pro reasoning model';
  }
  
  return descriptions[modelId] || 'OpenAI model'
}

function getOpenAIPricing(modelId: string): { input: number; output: number } {
  const pricing: { [key: string]: { input: number; output: number } } = {
    // === GPT-5 Series (Current - August 2025) ===
    'gpt-5': { input: 1.25, output: 10.00 },
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-5-chat-latest': { input: 1.25, output: 10.00 },
    
    // === GPT-4.1 Series Fine-Tuning (Current) ===
    'gpt-4.1': { input: 3.00, output: 12.00 },
    'gpt-4.1-mini': { input: 0.80, output: 3.20 },
    'gpt-4.1-nano': { input: 0.20, output: 0.80 },
    
    // === GPT-4o Series (Current multimodal) ===
    'gpt-4o': { input: 5.00, output: 20.00 },
    'gpt-4o-mini': { input: 0.60, output: 2.40 },
    'gpt-4o-audio': { input: 40.00, output: 80.00 },
    'gpt-4o-mini-audio': { input: 10.00, output: 20.00 },
    
    // === Reasoning Models (Current) ===
    'o1-pro': { input: 150.00, output: 600.00 },
    'o3-pro': { input: 20.00, output: 80.00 },
    
    // === Legacy Models (Deprecated mid-2025) ===
    // GPT-4 Standard (8k context) - $0.03/$0.06 per 1K → $30/$60 per 1M
    'gpt-4': { input: 30.00, output: 60.00 },
    // GPT-4 Turbo (128k context) - $0.01/$0.03 per 1K → $10/$30 per 1M
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    // GPT-4.5 - high-cost frontier model before GPT-5
    'gpt-4.5': { input: 75.00, output: 150.00 },
    
    // === GPT-3.5 Series (Legacy but still accessible) ===
    // $0.0005/$0.0015 per 1K → $0.50/$1.50 per 1M
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
  }
  
  // Smart model detection with case-insensitive matching
  const modelIdLower = modelId.toLowerCase();
  
  // GPT-5 variants
  if (modelIdLower.includes('gpt-5') || modelIdLower.includes('gpt5')) {
    if (modelIdLower.includes('mini')) {
      return { input: 0.25, output: 2.00 };
    } else if (modelIdLower.includes('nano')) {
      return { input: 0.05, output: 0.40 };
    } else if (modelIdLower.includes('chat-latest')) {
      return { input: 1.25, output: 10.00 };
    } else {
      return { input: 1.25, output: 10.00 }; // Default GPT-5
    }
  }
  
  // GPT-4.1 variants
  if (modelIdLower.includes('gpt-4.1') || modelIdLower.includes('gpt4.1')) {
    if (modelIdLower.includes('mini')) {
      return { input: 0.80, output: 3.20 };
    } else if (modelIdLower.includes('nano')) {
      return { input: 0.20, output: 0.80 };
    } else {
      return { input: 3.00, output: 12.00 }; // Default GPT-4.1
    }
  }
  
  // GPT-4o variants
  if (modelIdLower.includes('gpt-4o') || modelIdLower.includes('gpt4o')) {
    if (modelIdLower.includes('mini')) {
      if (modelIdLower.includes('audio')) {
        return { input: 10.00, output: 20.00 };
      } else {
        return { input: 0.60, output: 2.40 };
      }
    } else if (modelIdLower.includes('audio')) {
      return { input: 40.00, output: 80.00 };
    } else {
      return { input: 5.00, output: 20.00 }; // Default GPT-4o
    }
  }
  
  // o1 and o3 series
  if (modelIdLower.includes('o1-pro')) {
    return { input: 150.00, output: 600.00 };
  }
  if (modelIdLower.includes('o3-pro')) {
    return { input: 20.00, output: 80.00 };
  }
  
  return pricing[modelId] || { input: 0.50, output: 1.50 } // Default to GPT-3.5-turbo pricing
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
  // Together.ai pricing per 1M tokens (accurate as of August 2025)
  const pricing: { [key: string]: { input: number; output: number } } = {
    // === GPT-OSS Models ===
    'gpt-oss-120B': { input: 0.15, output: 0.60 },
    'gpt-oss-20B': { input: 0.05, output: 0.20 },
    
    // === Llama 4 Series ===
    'llama-4-maverick': { input: 0.27, output: 0.85 },
    'llama-4-scout': { input: 0.18, output: 0.59 },
    
    // === Llama 3.1 Series ===
    'llama-3.1-3b-lite': { input: 0.06, output: 0.06 },
    'llama-3.1-3b-turbo': { input: 0.18, output: 0.18 },
    'llama-3.1-8b': { input: 0.10, output: 0.18 },
    'llama-3.1-8b-turbo': { input: 0.18, output: 0.20 },
    'llama-3.1-70b': { input: 0.54, output: 0.88 },
    'llama-3.1-70b-turbo': { input: 0.88, output: 0.90 },
    
    // === Llama 3.2 Series ===
    'llama-3.2-90b-vision': { input: 1.20, output: 1.20 },
    'llama-3.2-405b': { input: 3.50, output: 3.50 },
    
    // === DeepSeek Models ===
    'deepseek-v3': { input: 1.25, output: 1.25 },
    'deepseek-r1': { input: 3.00, output: 7.00 },
    'deepseek-r1-throughput': { input: 0.55, output: 2.19 },
    'deepseek-r1-distill-llama-70b': { input: 2.00, output: 2.00 },
    'deepseek-r1-distill-qwen-14b': { input: 0.10, output: 0.10 },
    
    // === Meta Llama Models (with full paths) ===
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { input: 0.18, output: 0.20 },
    'meta-llama/Meta-Llama-3.1-70B-Instruct': { input: 0.88, output: 0.90 },
    
    // === Other Popular Models ===
    'microsoft/WizardLM-2-8x22B': { input: 0.35, output: 0.45 },
    'google/gemma-2-27b-it': { input: 0.20, output: 0.30 },
    'anthropic/claude-3.5-sonnet': { input: 0.25, output: 0.35 }
  }
  
  // Smart model detection with case-insensitive matching
  const modelIdLower = modelId.toLowerCase();
  
  // GPT-OSS variants
  if (modelIdLower.includes('gpt-oss')) {
    if (modelIdLower.includes('120b')) {
      return { input: 0.15, output: 0.60 };
    } else if (modelIdLower.includes('20b')) {
      return { input: 0.05, output: 0.20 };
    }
  }
  
  // Llama variants
  if (modelIdLower.includes('llama')) {
    if (modelIdLower.includes('4')) {
      if (modelIdLower.includes('maverick')) {
        return { input: 0.27, output: 0.85 };
      } else if (modelIdLower.includes('scout')) {
        return { input: 0.18, output: 0.59 };
      }
    } else if (modelIdLower.includes('3.1')) {
      if (modelIdLower.includes('3b')) {
        if (modelIdLower.includes('lite')) {
          return { input: 0.06, output: 0.06 };
        } else if (modelIdLower.includes('turbo')) {
          return { input: 0.18, output: 0.18 };
        }
      } else if (modelIdLower.includes('8b')) {
        if (modelIdLower.includes('turbo')) {
          return { input: 0.18, output: 0.20 };
        } else {
          return { input: 0.10, output: 0.18 };
        }
      } else if (modelIdLower.includes('70b')) {
        if (modelIdLower.includes('turbo')) {
          return { input: 0.88, output: 0.90 };
        } else {
          return { input: 0.54, output: 0.88 };
        }
      }
    } else if (modelIdLower.includes('3.2')) {
      if (modelIdLower.includes('90b') && modelIdLower.includes('vision')) {
        return { input: 1.20, output: 1.20 };
      } else if (modelIdLower.includes('405b')) {
        return { input: 3.50, output: 3.50 };
      }
    }
  }
  
  // DeepSeek variants
  if (modelIdLower.includes('deepseek')) {
    if (modelIdLower.includes('r1')) {
      if (modelIdLower.includes('throughput')) {
        return { input: 0.55, output: 2.19 };
      } else if (modelIdLower.includes('distill')) {
        if (modelIdLower.includes('llama-70b')) {
          return { input: 2.00, output: 2.00 };
        } else if (modelIdLower.includes('qwen-14b')) {
          return { input: 0.10, output: 0.10 };
        }
      } else {
        return { input: 3.00, output: 7.00 };
      }
    } else if (modelIdLower.includes('v3')) {
      return { input: 1.25, output: 1.25 };
    }
  }
  
  return pricing[modelId] || { input: 0.25, output: 0.35 } // Default fallback
}

// Fallback models if API fails
function getFallbackOpenAIModels() {
  return [
    // GPT-5 Series (Flagship Models)
    { id: 'gpt-5', name: 'gpt-5', description: 'Latest GPT-5 model with advanced capabilities', provider: 'openai', pricing: { input: 1.25, output: 10.00 } },
    { id: 'gpt-5-mini', name: 'gpt-5-mini', description: 'GPT-5 mini model - balanced performance', provider: 'openai', pricing: { input: 0.25, output: 2.00 } },
    { id: 'gpt-5-nano', name: 'gpt-5-nano', description: 'GPT-5 nano model - most cost-effective', provider: 'openai', pricing: { input: 0.05, output: 0.40 } },
    
    // GPT-4.1 Series Fine-Tuning
    { id: 'gpt-4.1', name: 'gpt-4.1', description: 'GPT-4.1 with fine-tuning capabilities', provider: 'openai', pricing: { input: 3.00, output: 12.00 } },
    { id: 'gpt-4.1-mini', name: 'gpt-4.1-mini', description: 'GPT-4.1 mini - efficient fine-tuning', provider: 'openai', pricing: { input: 0.80, output: 3.20 } },
    { id: 'gpt-4.1-nano', name: 'gpt-4.1-nano', description: 'GPT-4.1 nano - cost-effective fine-tuning', provider: 'openai', pricing: { input: 0.20, output: 0.80 } },
    
    // GPT-4o Series (Realtime API)
    { id: 'gpt-4o', name: 'gpt-4o', description: 'GPT-4o realtime model - text mode', provider: 'openai', pricing: { input: 5.00, output: 20.00 } },
    { id: 'gpt-4o-mini', name: 'gpt-4o-mini', description: 'GPT-4o mini - fast realtime text', provider: 'openai', pricing: { input: 0.60, output: 2.40 } },
    { id: 'gpt-4o-audio', name: 'gpt-4o-audio', description: 'GPT-4o with audio capabilities', provider: 'openai', pricing: { input: 40.00, output: 80.00 } },
    { id: 'gpt-4o-mini-audio', name: 'gpt-4o-mini-audio', description: 'GPT-4o mini with audio', provider: 'openai', pricing: { input: 10.00, output: 20.00 } },
    
    // o1 Series (Reasoning Models)
    { id: 'o1-pro', name: 'o1-pro', description: 'o1-pro advanced reasoning model', provider: 'openai', pricing: { input: 150.00, output: 600.00 } },
    
    // o3 Series
    { id: 'o3-pro', name: 'o3-pro', description: 'o3-pro reasoning model', provider: 'openai', pricing: { input: 20.00, output: 80.00 } },
    
    // Legacy Models (Deprecated mid-2025)
    { id: 'gpt-4', name: 'gpt-4', description: 'GPT-4 (legacy - 8k context)', provider: 'openai', pricing: { input: 30.00, output: 60.00 } },
    { id: 'gpt-4-turbo', name: 'gpt-4-turbo', description: 'GPT-4 Turbo (legacy - 128k context)', provider: 'openai', pricing: { input: 10.00, output: 30.00 } },
    { id: 'gpt-4.5', name: 'gpt-4.5', description: 'GPT-4.5 (legacy - frontier model)', provider: 'openai', pricing: { input: 75.00, output: 150.00 } },
    { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', description: 'GPT-3.5 Turbo (legacy but accessible)', provider: 'openai', pricing: { input: 0.50, output: 1.50 } }
  ]
}

function getFallbackTogetherModels() {
  return [
    // === GPT-OSS Models (Most Cost-Effective) ===
    { id: 'gpt-oss-20B', name: 'GPT-OSS 20B', description: 'Most cost-effective option', provider: 'together', pricing: { input: 0.05, output: 0.20 } },
    { id: 'gpt-oss-120B', name: 'GPT-OSS 120B', description: 'Balanced performance & cost', provider: 'together', pricing: { input: 0.15, output: 0.60 } },
    
    // === Llama 3.1 Series ===
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo', description: 'Fast & efficient (recommended)', provider: 'together', pricing: { input: 0.18, output: 0.20 } },
    { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', description: 'High performance, larger model', provider: 'together', pricing: { input: 0.88, output: 0.90 } },
    
    // === DeepSeek Models ===
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: 'Advanced reasoning & coding', provider: 'together', pricing: { input: 1.25, output: 1.25 } },
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'High-performance reasoning', provider: 'together', pricing: { input: 3.00, output: 7.00 } }
  ]
} 