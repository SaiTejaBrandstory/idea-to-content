import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GeneratedTitle } from '@/types/blog'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { keywords, blogType, emphasisTypes } = await request.json()

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

    const prompt = `Generate 5 blog titles for a ${blogType} blog post using these keywords: ${keywords.join(', ')}.

For each title, use a different emphasis style:
${emphasisTypes.map((type: string, index: number) => `${index + 1}. ${type}`).join('\n')}

Requirements:
- Each title should be engaging and SEO-friendly
- Include the main keywords naturally
- Make titles compelling and click-worthy
- Keep titles under 60 characters
- Return only the titles, one per line

Format your response as a simple list of titles, one per line.`

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

    const generatedTitles: GeneratedTitle[] = titles.map((title, index) => ({
      title,
      emphasis: emphasisTypes[index] || 'Hybrid Emphasis'
    }))

    return NextResponse.json({ titles: generatedTitles })
  } catch (error: any) {
    console.error('Error generating titles:', error)
    
    // Handle specific OpenAI errors
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