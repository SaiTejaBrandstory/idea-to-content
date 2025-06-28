import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { keywords, blogType } = await request.json()

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords are required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated from OpenAI')
    }

    const titles = content
      .split('\n')
      .filter(title => title.trim())
      .map(title => title.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 5)

    if (titles.length === 0) {
      throw new Error('No valid titles generated')
    }

    const usage = completion.usage || null
    return NextResponse.json({ titles, usage })
  } catch (error: any) {
    console.error('Error generating titles:', error)
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key. Please check your configuration.' },
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