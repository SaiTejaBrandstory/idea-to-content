import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Together from 'together-ai'
import { BlogFormData, BlogContent } from '@/types/blog'
import { processReferences } from '@/lib/reference-processor'
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
    const { sessionId, ...formData }: BlogFormData & { sessionId?: string } = await request.json()
    
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

    // Tone-specific instructions
    const toneInstructions = {
      'Formal': 'Write in a polished, respectful tone using precise language suitable for academic writing or business reports.',
      'Professional': 'Write in a clear, confident, and courteous tone suitable for business emails and proposals.',
      'Diplomatic': 'Write in a tactful, neutral tone that avoids offense, suitable for conflict resolution or HR communications.',
      'Objective': 'Write in a fact-based, unbiased tone suitable for news summaries and data reports.',
      'Friendly': 'Write in a warm, welcoming, conversational tone suitable for onboarding messages and customer support.',
      'Casual': 'Write in a relaxed, informal tone like chatting with a friend.',
      'Playful': 'Write in a fun, humorous tone, sometimes silly, suitable for social media and kids\' content.',
      'Optimistic': 'Write in an encouraging, upbeat, hopeful tone.',
      'Empathetic': 'Write in a tone sensitive to the reader\'s emotions, suitable for apologies and support messages.',
      'Inspirational': 'Write in an uplifting, motivational tone suitable for speeches and self-help content.',
      'Passionate': 'Write with strong, enthusiastic emotion about the topic.',
      'Urgent': 'Write in a pressing, action-oriented tone that calls for immediate attention.',
      'Educational': 'Write in a clear, instructive tone, often step-by-step, suitable for tutorials and explainers.',
      'Analytical': 'Write in a detailed, logical tone, often including comparisons or breakdowns.',
      'Technical': 'Write using specialized vocabulary with precision, suitable for manuals and coding documentation.',
      'Neutral': 'Write in a balanced tone with no strong emotional cues.',
      'Narrative': 'Write in a storytelling style with pacing and character development.',
      'Dramatic': 'Write in a tense, emotional, intense tone suitable for fiction or scripts.',
      'Witty': 'Write in a clever tone, often using wordplay or sarcasm.',
      'Poetic': 'Write in a lyrical, expressive tone using rhythm or metaphor.'
    }

    const selectedToneInstruction = toneInstructions[formData.tone.subtype as keyof typeof toneInstructions] || 'Write in a professional and engaging tone.'

    const prompt = `Write a complete ${formData.blogType.toLowerCase()} blog post with the following specifications:

Title: ${formData.selectedTitle}
Keywords: ${formData.keywords.join(', ')}
Target Word Count: ${formData.wordCount}
Number of Paragraphs: ${paragraphs}
Writing Tone: ${formData.tone.subtype} (${formData.tone.type})

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
10. ${selectedToneInstruction}
11. If you finish before reaching the minimum word count, continue writing more content in the same style. Do not summarize or conclude early. Keep expanding until the minimum is reached.
${extraParagraphInstruction ? `12. ${extraParagraphInstruction}` : ''}

Format your response as follows:

META DESCRIPTION:
[Your meta description here]

INTRODUCTION:
[Your introduction paragraph here]

BODY:
[Your body paragraphs here, separated by double line breaks]

CONCLUSION:
[Your conclusion paragraph here]

CALL TO ACTION:
[Your call to action here]`

    console.log('[generate-blog] FINAL PROMPT:', prompt)

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
        })
        console.log('[generate-blog] OpenAI completion:', completion);
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
      console.error('[generate-blog] No content in completion:', completion);
      throw new Error(`No content generated from ${formData.apiProvider}. Raw response: ${JSON.stringify(completion)}`);
    }

    console.log('[generate-blog] Raw content received:', content);

    // Parse the structured text response
    let blogContent: BlogContent
    try {
      // Split content by sections using a more compatible approach
      const sections = content.split(/\n\n+/);
      
      // Extract sections using index-based approach instead of regex with 's' flag
      const lines = content.split('\n');
      let metaDescription = '';
      let intro = '';
      let body = '';
      let conclusion = '';
      let cta = '';
      
      let currentSection = '';
      let currentContent: string[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === 'META DESCRIPTION:') {
          if (currentSection && currentContent.length > 0) {
            if (currentSection === 'META DESCRIPTION:') metaDescription = currentContent.join('\n').trim();
            else if (currentSection === 'INTRODUCTION:') intro = currentContent.join('\n').trim();
            else if (currentSection === 'BODY:') body = currentContent.join('\n').trim();
            else if (currentSection === 'CONCLUSION:') conclusion = currentContent.join('\n').trim();
            else if (currentSection === 'CALL TO ACTION:') cta = currentContent.join('\n').trim();
          }
          currentSection = 'META DESCRIPTION:';
          currentContent = [];
        } else if (trimmedLine === 'INTRODUCTION:') {
          if (currentSection && currentContent.length > 0) {
            if (currentSection === 'META DESCRIPTION:') metaDescription = currentContent.join('\n').trim();
            else if (currentSection === 'INTRODUCTION:') intro = currentContent.join('\n').trim();
            else if (currentSection === 'BODY:') body = currentContent.join('\n').trim();
            else if (currentSection === 'CONCLUSION:') conclusion = currentContent.join('\n').trim();
            else if (currentSection === 'CALL TO ACTION:') cta = currentContent.join('\n').trim();
          }
          currentSection = 'INTRODUCTION:';
          currentContent = [];
        } else if (trimmedLine === 'BODY:') {
          if (currentSection && currentContent.length > 0) {
            if (currentSection === 'META DESCRIPTION:') metaDescription = currentContent.join('\n').trim();
            else if (currentSection === 'INTRODUCTION:') intro = currentContent.join('\n').trim();
            else if (currentSection === 'BODY:') body = currentContent.join('\n').trim();
            else if (currentSection === 'CONCLUSION:') conclusion = currentContent.join('\n').trim();
            else if (currentSection === 'CALL TO ACTION:') cta = currentContent.join('\n').trim();
          }
          currentSection = 'BODY:';
          currentContent = [];
        } else if (trimmedLine === 'CONCLUSION:') {
          if (currentSection && currentContent.length > 0) {
            if (currentSection === 'META DESCRIPTION:') metaDescription = currentContent.join('\n').trim();
            else if (currentSection === 'INTRODUCTION:') intro = currentContent.join('\n').trim();
            else if (currentSection === 'BODY:') body = currentContent.join('\n').trim();
            else if (currentSection === 'CONCLUSION:') conclusion = currentContent.join('\n').trim();
            else if (currentSection === 'CALL TO ACTION:') cta = currentContent.join('\n').trim();
          }
          currentSection = 'CONCLUSION:';
          currentContent = [];
        } else if (trimmedLine === 'CALL TO ACTION:') {
          if (currentSection && currentContent.length > 0) {
            if (currentSection === 'META DESCRIPTION:') metaDescription = currentContent.join('\n').trim();
            else if (currentSection === 'INTRODUCTION:') intro = currentContent.join('\n').trim();
            else if (currentSection === 'BODY:') body = currentContent.join('\n').trim();
            else if (currentSection === 'CONCLUSION:') conclusion = currentContent.join('\n').trim();
            else if (currentSection === 'CALL TO ACTION:') cta = currentContent.join('\n').trim();
          }
          currentSection = 'CALL TO ACTION:';
          currentContent = [];
        } else if (currentSection) {
          currentContent.push(line);
        }
      }
      
      // Handle the last section
      if (currentSection && currentContent.length > 0) {
        if (currentSection === 'META DESCRIPTION:') metaDescription = currentContent.join('\n').trim();
        else if (currentSection === 'INTRODUCTION:') intro = currentContent.join('\n').trim();
        else if (currentSection === 'BODY:') body = currentContent.join('\n').trim();
        else if (currentSection === 'CONCLUSION:') conclusion = currentContent.join('\n').trim();
        else if (currentSection === 'CALL TO ACTION:') cta = currentContent.join('\n').trim();
      }

      blogContent = {
        title: formData.selectedTitle,
        metaDescription: metaDescription || '',
        intro: intro || '',
        body: body ? body.split(/\n\n+/).filter((p: string) => p.trim()) : [],
        conclusion: conclusion || '',
        cta: cta || ''
      };

      // If parsing failed, create a fallback structure
      if (!intro && !body && !conclusion) {
        console.log('[generate-blog] Failed to parse structured format, creating fallback');
        const paragraphs = content.split(/\n\n+/).filter((p: string) => p.trim());
        if (paragraphs.length >= 3) {
          blogContent = {
            title: formData.selectedTitle || '',
            metaDescription: '',
            intro: '',
            body: paragraphs.slice(1, -1).map((p: string) => p.trim()).filter(Boolean),
            conclusion: paragraphs[paragraphs.length - 1]?.trim() || '',
            cta: ''
          };
        } else {
          // Last resort - treat entire content as body
          blogContent = {
            title: formData.selectedTitle || '',
            metaDescription: '',
            intro: '',
            body: [content.trim() || ''],
            conclusion: '',
            cta: ''
          };
        }
      }
    } catch (parseError) {
      console.error('Failed to parse blog content:', parseError);
      // Create a fallback structure
      blogContent = {
        title: formData.selectedTitle || '',
        metaDescription: '',
        intro: '',
        body: [content.trim() || ''],
        conclusion: '',
        cta: ''
      };
    }

    // Calculate actual word count
    const allText = [blogContent.intro, ...(Array.isArray(blogContent.body) ? blogContent.body : [blogContent.body]), blogContent.conclusion, blogContent.cta || ''].join(' ')
    const actualWordCount = allText.split(/\s+/).filter(Boolean).length
    let tooShort = false
    if (minWordCount && actualWordCount < minWordCount) {
      tooShort = true
    }

    // Calculate cost for history tracking
    let totalCostUsd = 0
    let totalCostInr = 0
    let inputPricePerToken = 0
    let outputPricePerToken = 0
    let pricingUnits = 'per_1K_tokens'

    if (usage) {
      if (formData.apiProvider === 'openai') {
        const pricing = formData.selectedModel?.pricing || { input: 0.005, output: 0.015 }
        inputPricePerToken = pricing.input / 1000
        outputPricePerToken = pricing.output / 1000
        pricingUnits = 'per_1K_tokens'
        totalCostUsd = (usage.prompt_tokens * pricing.input / 1000) + (usage.completion_tokens * pricing.output / 1000)
      } else {
        const pricing = formData.selectedModel?.pricing || { input: 0.25, output: 0.35 }
        inputPricePerToken = pricing.input / 1000000
        outputPricePerToken = pricing.output / 1000000
        pricingUnits = 'per_1M_tokens'
        totalCostUsd = (usage.prompt_tokens * pricing.input / 1000000) + (usage.completion_tokens * pricing.output / 1000000)
      }
      totalCostInr = totalCostUsd * 83
    }

    // Save to history (async, don't wait for it)
    try {
      const allText = [blogContent.intro, ...(Array.isArray(blogContent.body) ? blogContent.body : [blogContent.body]), blogContent.conclusion, blogContent.cta || ''].join(' ')
      
      const historyData = {
        operation_type: 'blog_generation',
        api_provider: formData.apiProvider,
        model_id: formData.model,
        model_name: formData.selectedModel?.name || formData.model,
        keywords: formData.keywords,
        blog_type: formData.blogType,
        selected_title: formData.selectedTitle,
        word_count: formData.wordCount,
        tone_type: formData.tone?.type || null,
        tone_subtype: formData.tone?.subtype || null,
        temperature: formData.temperature,
        paragraphs: formData.paragraphs,
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
        generated_content_preview: allText.substring(0, 500),
        content_length: allText.length,
        // Additional tracking fields
        references_files: formData.references.files.length > 0 ? formData.references.files.map(f => f.name) : [],
        references_urls: formData.references.urls,
        references_custom_text: formData.references.customText || null,
        setup_step: 'blog_generation',
        step_number: 6
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
              operation_type: 'blog_generation',
              api_provider: formData.apiProvider,
              model_id: formData.model,
              model_name: formData.selectedModel?.name || formData.model,
              keywords: formData.keywords,
              blog_type: formData.blogType,
              selected_title: formData.selectedTitle,
              word_count: formData.wordCount,
              tone_type: formData.tone?.type || null,
              tone_subtype: formData.tone?.subtype || null,
              temperature: formData.temperature,
              paragraphs: formData.paragraphs,
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
              generated_content_full: JSON.stringify(blogContent),
              generated_content_preview: allText.substring(0, 500),
              content_length: allText.length,
              references_files: formData.references.files.length > 0 ? formData.references.files.map(f => f.name) : [],
              references_urls: formData.references.urls,
              references_custom_text: formData.references.customText || null,
              setup_step: 'blog_generation',
              step_number: 6,
              ip_address: request.headers.get('x-forwarded-for') || request.ip,
              user_agent: request.headers.get('user-agent')
            })
          console.log('History saved successfully')
        } catch (err: any) {
          console.error('Failed to save history:', err)
        }
      }
    } catch (error) {
      console.error('Error saving history:', error)
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