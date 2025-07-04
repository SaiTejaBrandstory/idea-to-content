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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Together client only when needed
const getTogetherClient = () => {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('Together.ai API key not configured')
  }
  return new Together()
}

export async function POST(request: NextRequest) {
  try {
    const { keywords, blogType, apiProvider = 'openai', model = 'gpt-4o' } = await request.json()

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

    const prompt = `Generate 5 engaging, SEO-friendly blog titles for a ${blogType} blog post using these keywords: ${keywords.join(', ')}. ${typeInstruction}

Requirements:
- Each title should be compelling and click-worthy
- Include the main keywords naturally
- Keep titles under 60 characters
- Return only the titles, one per line`

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