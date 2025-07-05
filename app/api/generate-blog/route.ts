import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Together from 'together-ai'
import { BlogFormData, BlogContent } from '@/types/blog'
import { processReferences } from '@/lib/reference-processor'

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
    const formData: BlogFormData = await request.json()
    
    console.log('[generate-blog] Received form data:', {
      selectedTitle: formData.selectedTitle,
      keywords: formData.keywords,
      apiProvider: formData.apiProvider,
      model: formData.model,
      blogType: formData.blogType,
      wordCount: formData.wordCount
    })

    if (!formData.selectedTitle || formData.keywords.length === 0) {
      return NextResponse.json(
        { error: 'Title and keywords are required' },
        { status: 400 }
      )
    }

    // Validate API keys based on provider
    if (formData.apiProvider === 'openai' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    if (formData.apiProvider === 'together' && !process.env.TOGETHER_API_KEY) {
      return NextResponse.json(
        { error: 'Together.ai API key not configured' },
        { status: 500 }
      )
    }

    // Process references if any
    let referenceContext = ''
    if (formData.references.files.length > 0 || formData.references.urls.length > 0 || formData.references.customText) {
      try {
        referenceContext = await processReferences(formData.references)
      } catch (error) {
        console.warn('Failed to process references:', error)
        // Continue without references if processing fails
      }
    }

    // Calculate max tokens based on word count
    const wordCountMap = {
      '300-500': 800,
      '500-800': 1200,
      '800-1200': 1800,
      '1500+': 5000
    }
    const maxTokens = wordCountMap[formData.wordCount] || 1200

    // For 1500+ word count, set paragraphs to at least 10 (use '7+' for type, clarify in prompt)
    let paragraphs = formData.paragraphs
    let minWordCount = 0
    let extraParagraphInstruction = ''
    if (formData.wordCount === '1500+') {
      paragraphs = '7+'
      minWordCount = 1500
      extraParagraphInstruction = 'For in-depth articles (1500+ words), write at least 10 body paragraphs.'
    } else if (formData.wordCount === '800-1200') {
      minWordCount = 800
    } else if (formData.wordCount === '500-800') {
      minWordCount = 500
    } else if (formData.wordCount === '300-500') {
      minWordCount = 300
    }

    // Blog type specific instructions
    let typeInstructions = ''
    switch (formData.blogType) {
      case 'Listicle':
        typeInstructions = 'Write the body as a numbered list, with each point as a separate paragraph. Use clear headings for each section.'
        break
      case 'How-to':
        typeInstructions = 'Write the body as a step-by-step guide, with each step clearly numbered and explained.'
        break
      case 'Case Study':
        typeInstructions = 'Structure the blog as a real-world case study, including background, challenge, solution, and results sections.'
        break
      case 'Solution-based':
        typeInstructions = 'Focus on a problem and provide a detailed solution, including problem statement, analysis, and actionable steps.'
        break
      case 'Informative':
      default:
        typeInstructions = 'Write in an educational and comprehensive style, using subheadings and detailed explanations.'
    }

    const prompt = `Write a complete ${formData.blogType.toLowerCase()} blog post with the following specifications:

Title: ${formData.selectedTitle}
Keywords: ${formData.keywords.join(', ')}
Target Word Count: ${formData.wordCount}
Number of Paragraphs: ${paragraphs}

${referenceContext ? `Reference Context:\n${referenceContext}\n` : ''}

Requirements:
1. Create a compelling meta description (150-160 characters)
2. Write an engaging introduction paragraph
3. Develop at least ${paragraphs} body paragraphs that flow naturally
4. Include a strong conclusion
5. Add an appropriate call-to-action based on the blog type
6. Naturally incorporate the keywords throughout the content
7. Make the content informative, engaging, and valuable to readers
8. Ensure the total word count is at least ${minWordCount} words. Do not finish until you reach this minimum. Expand on each section with detailed examples, explanations, and subheadings as needed. Use subheadings (##, ###) where appropriate for clarity and structure.
9. ${typeInstructions}
10. If you finish before reaching the minimum word count, continue writing more content in the same style. Do not summarize or conclude early. Keep expanding until the minimum is reached.
${extraParagraphInstruction ? `11. ${extraParagraphInstruction}` : ''}

Format your response as JSON with the following structure:
{
  "title": "The exact title provided",
  "metaDescription": "SEO-optimized meta description",
  "intro": "Introduction paragraph",
  "body": ["paragraph 1", "paragraph 2", "paragraph 3", ...],
  "conclusion": "Conclusion paragraph",
  "cta": "Call to action (optional based on blog type)"
}`

    let completion: any
    let usage = null

    if (formData.apiProvider === 'openai') {
      console.log(`[generate-blog] Using OpenAI with model: ${formData.model}`)
      try {
        completion = await openai.chat.completions.create({
          model: formData.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional content writer and SEO expert. Create high-quality, engaging blog content that provides value to readers while being optimized for search engines.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: formData.temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' }
        })
        usage = completion.usage
      } catch (apiError: any) {
        console.error('[generate-blog] OpenAI API error:', apiError)
        throw new Error(`OpenAI API error: ${apiError.message || 'Unknown error'}`)
      }
    } else if (formData.apiProvider === 'together') {
      console.log(`[generate-blog] Using Together.ai with model: ${formData.model}`)
      try {
        const together = getTogetherClient()
        completion = await together.chat.completions.create({
          model: formData.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional content writer and SEO expert. Create high-quality, engaging blog content that provides value to readers while being optimized for search engines.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: formData.temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    })
        usage = completion.usage
      } catch (apiError: any) {
        console.error('[generate-blog] Together.ai API error:', apiError)
        throw new Error(`Together.ai API error: ${apiError.message || 'Unknown error'}`)
      }
    }

    if (!completion) {
      throw new Error(`No completion generated from ${formData.apiProvider}`)
    }

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error(`No content generated from ${formData.apiProvider}`)
    }

    let blogContent: BlogContent
    try {
      blogContent = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      throw new Error(`Invalid response format from ${formData.apiProvider}`)
    }

    // Validate the response structure
    if (!blogContent.title || !blogContent.metaDescription || !blogContent.intro || !blogContent.body || !blogContent.conclusion) {
      throw new Error('Incomplete blog content generated')
    }

    // Calculate actual word count
    const allText = [blogContent.intro, ...(Array.isArray(blogContent.body) ? blogContent.body : [blogContent.body]), blogContent.conclusion, blogContent.cta || ''].join(' ')
    const actualWordCount = allText.split(/\s+/).filter(Boolean).length
    let tooShort = false
    if (minWordCount && actualWordCount < minWordCount) {
      tooShort = true
    }

    // Return token usage and tooShort flag if available
    return NextResponse.json({ 
      ...blogContent, 
      usage, 
      tooShort, 
      actualWordCount,
      apiProvider: formData.apiProvider,
      model: formData.model,
      selectedModel: formData.selectedModel || {
        id: formData.model,
        name: formData.model,
        description: `Model: ${formData.model}`,
        provider: formData.apiProvider,
        pricing: { input: 0, output: 0 }
      }
    })
  } catch (error: any) {
    console.error('Error generating blog:', error)
    
    // Handle specific API errors
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

    if (error?.message?.includes('JSON')) {
      return NextResponse.json(
        { error: 'Failed to generate properly formatted content. Please try again.' },
        { status: 500 }
      )
    }

    // Handle API-specific errors
    if (error?.message?.includes('OpenAI API error')) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: 500 }
      )
    }

    if (error?.message?.includes('Together.ai API error')) {
      return NextResponse.json(
        { error: `Together.ai API error: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: `Failed to generate blog content: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
} 