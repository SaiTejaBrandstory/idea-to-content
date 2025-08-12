import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Together from 'together-ai'
import { BlogFormData, BlogContent } from '@/types/blog'
import { processReferences } from '@/lib/reference-processor'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSessionId } from '@/lib/session-manager'
import { createTokenParameter, createTemperatureParameter, normalizeOpenAIUsage, isGpt5Model } from '@/lib/model-utils'

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
        const isGpt5 = isGpt5Model(formData.model)
        if (isGpt5) {
          // Prefer Responses API for GPT-5 family; omit explicit token/temperature caps
          const systemInstruction = 'You are a professional content writer and SEO expert. Create high-quality, engaging blog content that provides value to readers while being optimized for search engines.'
          const responsesClient: any = (openai as any)
          let resp: any
          if (responsesClient?.responses?.create) {
            resp = await responsesClient.responses.create({
              model: formData.model,
              input: `SYSTEM: ${systemInstruction}\nUSER: ${prompt}`,
            })
          } else {
            const httpResp = await fetch('https://api.openai.com/v1/responses', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: formData.model,
                input: `SYSTEM: ${systemInstruction}\nUSER: ${prompt}`,
              }),
            })
            resp = await httpResp.json()
          }

          // Map to completion-like shape for downstream logic
          completion = {
            choices: [
              {
                message: {
                  content: resp?.output_text || resp?.output?.[0]?.content?.[0]?.text || '',
                },
              },
            ],
            usage: normalizeOpenAIUsage(resp?.usage),
          }
          usage = completion.usage
        } else {
          // Use Chat Completions for non GPT-5 models, with higher token budget
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
            ...createTemperatureParameter(formData.model, formData.temperature),
            ...createTokenParameter(formData.model, Math.max(maxTokens, 8000)),
          })
          console.log('[generate-blog] OpenAI completion:', completion);
          usage = normalizeOpenAIUsage(completion.usage)
        }
      } catch (apiError: any) {
        console.error('[generate-blog] OpenAI API error:', apiError)
        throw new Error(`OpenAI API error: ${apiError.message || 'Unknown error'}`)
      }
    } else if (formData.apiProvider === 'together') {
      console.log(`[generate-blog] Using Together.ai with model: ${formData.model}`)
      try {
        const together = getTogetherClient()
        
        // Enhanced prompt for Together AI to ensure structured output
        const enhancedPrompt = `${prompt}

🚨 CRITICAL WORD COUNT REQUIREMENT 🚨
You MUST write EXACTLY ${minWordCount} words or MORE. This is MANDATORY.
- Target: ${minWordCount} words minimum
- Current requirement: ${minWordCount} words
- Do NOT stop until you reach ${minWordCount} words
- If you finish before ${minWordCount} words, CONTINUE writing more content
- Add detailed examples, explanations, case studies, and subheadings
- Expand each section with comprehensive details
- Use bullet points, numbered lists, and detailed explanations
- Include relevant statistics, quotes, and real-world examples
- Do NOT summarize or conclude early
- Keep writing until you reach ${minWordCount} words minimum

📝 FORMAT REQUIREMENTS:
You MUST follow this exact format structure. Do not deviate from this format:

META DESCRIPTION:
[Write meta description here - 150-160 characters]

INTRODUCTION:
[Write a comprehensive introduction paragraph here - make this detailed and engaging, at least 200-300 words]

BODY:
[Write extensive body paragraphs here, separated by double line breaks - this section should be the longest and contain the majority of your ${minWordCount} words. Include:
- Multiple detailed paragraphs
- Subheadings (##, ###) for organization
- Bullet points and numbered lists
- Real-world examples and case studies
- Detailed explanations and analysis
- Statistics and data points
- Expert quotes and references
- Step-by-step breakdowns
- Comparison tables or lists
- Detailed how-to instructions
- Comprehensive coverage of all aspects
- At least 8-10 substantial paragraphs for ${minWordCount} words]

CONCLUSION:
[Write a comprehensive conclusion paragraph here - at least 150-200 words]

CALL TO ACTION:
[Write call to action here]

⚠️ REMINDER: You MUST reach ${minWordCount} words minimum. Count your words and ensure you meet this requirement.`
        
        completion = await together.chat.completions.create({
          model: formData.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional content writer and SEO expert. You MUST follow the exact format structure provided by the user. Always include all required sections: META DESCRIPTION, INTRODUCTION, BODY, CONCLUSION, and CALL TO ACTION. Format your response exactly as specified. You MUST write comprehensive, detailed content that meets the specified word count requirements.'
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          ...createTemperatureParameter(formData.model, formData.temperature),
          ...createTokenParameter(formData.model, Math.max(maxTokens, 8000)), // Ensure enough tokens for 1500+ words
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
      console.log('[generate-blog] Parsing content from:', formData.apiProvider);
      
      // Simplified and more robust parsing
      const contentText = content.trim();
      
      // Extract sections using regex patterns
      const metaDescriptionMatch = contentText.match(/META DESCRIPTION:\s*\n([\s\S]*?)(?=\n\s*(?:INTRODUCTION|BODY|CONCLUSION|CALL TO ACTION):)/i);
      const introMatch = contentText.match(/INTRODUCTION:\s*\n([\s\S]*?)(?=\n\s*(?:BODY|CONCLUSION|CALL TO ACTION):)/i);
      const bodyMatch = contentText.match(/BODY:\s*\n([\s\S]*?)(?=\n\s*(?:CONCLUSION|CALL TO ACTION):)/i);
      const conclusionMatch = contentText.match(/CONCLUSION:\s*\n([\s\S]*?)(?=\n\s*(?:CALL TO ACTION):)/i);
      const ctaMatch = contentText.match(/CALL TO ACTION:\s*\n([\s\S]*?)(?=\n\s*$|$)/i);
      
      // Extract and clean the content
      const metaDescription = metaDescriptionMatch ? metaDescriptionMatch[1].trim() : '';
      const intro = introMatch ? introMatch[1].trim() : '';
      const body = bodyMatch ? bodyMatch[1].trim() : '';
      const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';
      const cta = ctaMatch ? ctaMatch[1].trim() : '';

      // Debug: Log parsed sections
      console.log('[generate-blog] Parsed sections:', {
        metaDescription: metaDescription.length,
        intro: intro.length,
        body: body.length,
        conclusion: conclusion.length,
        cta: cta.length
      });

      // If parsing failed, try fallback parsing
      if (!metaDescription && !intro && !body && !conclusion) {
        console.log('[generate-blog] Primary parsing failed, trying fallback...');
        
        // Fallback: Split by double newlines and try to identify sections
        const sections = contentText.split(/\n\s*\n/);
        let fallbackMetaDescription = '';
        let fallbackIntro = '';
        let fallbackBody = '';
        let fallbackConclusion = '';
        let fallbackCta = '';
        
        let currentSection = '';
        for (const section of sections) {
          const trimmedSection = section.trim();
          const upperSection = trimmedSection.toUpperCase();
          
          if (upperSection.includes('META DESCRIPTION') || upperSection.includes('META')) {
            fallbackMetaDescription = trimmedSection.replace(/^.*?META DESCRIPTION:?\s*/i, '').trim();
          } else if (upperSection.includes('INTRODUCTION') || upperSection.includes('INTRO')) {
            fallbackIntro = trimmedSection.replace(/^.*?INTRODUCTION:?\s*/i, '').trim();
          } else if (upperSection.includes('BODY') || upperSection.includes('CONTENT')) {
            fallbackBody = trimmedSection.replace(/^.*?BODY:?\s*/i, '').trim();
          } else if (upperSection.includes('CONCLUSION') || upperSection.includes('CONCLUDE')) {
            fallbackConclusion = trimmedSection.replace(/^.*?CONCLUSION:?\s*/i, '').trim();
          } else if (upperSection.includes('CALL TO ACTION') || upperSection.includes('CTA')) {
            fallbackCta = trimmedSection.replace(/^.*?CALL TO ACTION:?\s*/i, '').trim();
          } else if (currentSection === 'BODY') {
            fallbackBody += '\n\n' + trimmedSection;
          } else if (!currentSection && trimmedSection.length > 50) {
            // If no section identified, assume it's intro
            fallbackIntro = trimmedSection;
          }
        }
        
        // Use fallback values if primary parsing failed
        if (fallbackMetaDescription || fallbackIntro || fallbackBody || fallbackConclusion) {
          console.log('[generate-blog] Using fallback parsing results');
          blogContent = {
            title: formData.selectedTitle,
            metaDescription: fallbackMetaDescription || 'A comprehensive guide covering all aspects of the topic.',
            intro: fallbackIntro || contentText.substring(0, 500),
            body: fallbackBody ? fallbackBody.split(/\n\n+/).filter((p: string) => p.trim()) : [contentText],
            conclusion: fallbackConclusion || contentText.substring(contentText.length - 300),
            cta: fallbackCta || ''
          };
        } else {
          // Last resort: treat entire content as body
          console.log('[generate-blog] Using last resort parsing');
          blogContent = {
            title: formData.selectedTitle,
            metaDescription: 'A comprehensive guide covering all aspects of the topic.',
            intro: contentText.substring(0, Math.min(500, contentText.length)),
            body: [contentText],
            conclusion: contentText.substring(Math.max(0, contentText.length - 300)),
            cta: ''
          };
        }
      } else {
        blogContent = {
          title: formData.selectedTitle,
          metaDescription: metaDescription || 'A comprehensive guide covering all aspects of the topic.',
          intro: intro || '',
          body: body ? body.split(/\n\n+/).filter((p: string) => p.trim()) : [],
          conclusion: conclusion || '',
          cta: cta || ''
        };
      }

      // Final check: ensure we have content in at least one section
      if (!blogContent.intro && !blogContent.body.length && !blogContent.conclusion) {
        console.log('[generate-blog] No content found in any section, using fallback');
        blogContent = {
          title: formData.selectedTitle,
          metaDescription: 'A comprehensive guide covering all aspects of the topic.',
          intro: contentText.substring(0, Math.min(500, contentText.length)),
          body: [contentText],
          conclusion: contentText.substring(Math.max(0, contentText.length - 300)),
          cta: ''
        };
      }
    } catch (parseError) {
      console.error('Failed to parse blog content:', parseError);
      // Create a fallback structure
      blogContent = {
        title: formData.selectedTitle || '',
        metaDescription: 'A comprehensive guide covering all aspects of the topic.',
        intro: content.substring(0, Math.min(500, content.length)),
        body: [content],
        conclusion: content.substring(Math.max(0, content.length - 300)),
        cta: ''
      };
    }

    // Calculate actual word count
    const allText = [blogContent.intro, ...(Array.isArray(blogContent.body) ? blogContent.body : [blogContent.body]), blogContent.conclusion, blogContent.cta || ''].join(' ')
    const actualWordCount = allText.split(/\s+/).filter(Boolean).length
    let tooShort = false
    
    console.log('[generate-blog] Word count analysis:', {
      target: minWordCount,
      actual: actualWordCount,
      difference: minWordCount - actualWordCount,
      provider: formData.apiProvider
    });
    
    if (minWordCount && actualWordCount < minWordCount) {
      tooShort = true
      console.log(`[generate-blog] ⚠️ Content is too short! Target: ${minWordCount}, Actual: ${actualWordCount}, Missing: ${minWordCount - actualWordCount} words`);
      
      // For Together AI, if content is too short, we could potentially regenerate
      if (formData.apiProvider === 'together' && actualWordCount < minWordCount * 0.7) {
        console.log('[generate-blog] Content is significantly shorter than target for Together AI');
      }
    } else {
      console.log(`[generate-blog] ✅ Word count target met! Target: ${minWordCount}, Actual: ${actualWordCount}`);
    }

    // Calculate cost for history tracking
    let totalCostUsd = 0
    let totalCostInr = 0
    let inputPricePerToken = 0
    let outputPricePerToken = 0
    let pricingUnits = 'per_1M_tokens'

    if (formData.apiProvider === 'openai') {
      const pricing = formData.selectedModel?.pricing || { input: 0.50, output: 1.50 } // Default to GPT-3.5-turbo pricing
      inputPricePerToken = pricing.input / 1000000 // Convert from per 1M to per token
      outputPricePerToken = pricing.output / 1000000 // Convert from per 1M to per token
      pricingUnits = 'per_1M_tokens'
      
      if (usage) {
        // Standard Chat Completions API with usage data
        totalCostUsd = (usage.prompt_tokens * inputPricePerToken) + (usage.completion_tokens * outputPricePerToken)
      } else if (isGpt5Model(formData.model)) {
        // GPT-5 Responses API doesn't provide usage, so we estimate
        // Estimate tokens: 1 token ≈ 4 characters for English text
        const inputText = JSON.stringify(formData) // Approximate input size
        const outputText = JSON.stringify(blogContent) // Actual output size
        
        const estimatedInputTokens = Math.ceil(inputText.length / 4)
        const estimatedOutputTokens = Math.ceil(outputText.length / 4)
        
        totalCostUsd = (estimatedInputTokens * inputPricePerToken) + (estimatedOutputTokens * outputPricePerToken)
        
        // Create estimated usage object for consistency
        usage = {
          prompt_tokens: estimatedInputTokens,
          completion_tokens: estimatedOutputTokens,
          total_tokens: estimatedInputTokens + estimatedOutputTokens
        }
        
        console.log(`[generate-blog] GPT-5 token estimation: input=${estimatedInputTokens}, output=${estimatedOutputTokens}, total=${estimatedInputTokens + estimatedOutputTokens}`)
      }
    } else if (formData.apiProvider === 'together') {
      const pricing = formData.selectedModel?.pricing || { input: 0.25, output: 0.35 }
      inputPricePerToken = pricing.input / 1000000
      outputPricePerToken = pricing.output / 1000000
      pricingUnits = 'per_1M_tokens'
      
      if (usage) {
        totalCostUsd = (usage.prompt_tokens * inputPricePerToken) + (usage.completion_tokens * outputPricePerToken)
      }
    }
    
    totalCostInr = totalCostUsd * 83

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