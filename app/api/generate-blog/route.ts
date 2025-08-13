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
    const { sessionId, contentStructure, ...formData }: BlogFormData & { sessionId?: string, contentStructure?: string } = await request.json()
    
    console.log('[generate-blog] Received form data:', {
      selectedTitle: formData.selectedTitle,
      keywords: formData.keywords,
      apiProvider: formData.apiProvider,
      model: formData.model,
      blogType: formData.blogType,
      wordCount: formData.wordCount,
      contentStructure: contentStructure ? 'Provided' : 'Not provided'
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
        typeInstructions = 'Write in an educational and comprehensive style with detailed explanations.'
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

${contentStructure ? `Content Structure Outline (Use EXACT word counts from this structure):\n${contentStructure}\n` : ''}

${referenceContext ? `Reference Context:\n${referenceContext}\n` : ''}

${contentStructure ? 
`🚨 CRITICAL: You MUST follow the EXACT content structure outline provided above. Use the exact headings and word count targets specified. The word counts in parentheses (e.g., "122 words") are your EXACT targets - match them precisely, not the original form settings.

🚨 HEADING REQUIREMENTS:
- Use EXACTLY the headings provided in the content structure
- Do NOT change, modify, or create new headings
- Each section must start with the exact heading from the structure
- Maintain the exact order and organization of the structure

🚨 WORD COUNT ENFORCEMENT:
- Introduction: Write EXACTLY the number of words specified in parentheses
- Each heading section: Write EXACTLY the number of words specified in parentheses  
- Conclusion: Write EXACTLY the number of words specified in parentheses
- Total word count must match the sum of all section targets
- Do NOT write fewer words than specified
- Do NOT write more words than specified
- Count your words carefully and ensure each section meets its target

🚨 CRITICAL INSTRUCTIONS:
- Write ACTUAL content for each section, NOT placeholder text
- Follow the EXACT headings from the content structure
- Each section must contain real, engaging content
- Do NOT write "[Write your content here]" - write the actual content
- Ensure each section meets its word count target with real content
- DO NOT change or modify the headings - use them exactly as shown
- Each section should start with the exact heading from the structure` :
`Requirements:`
}

${contentStructure ? 
`Structure Requirements:
1. Follow the EXACT headings from the structure outline
2. Match the EXACT word count targets specified in parentheses for each section
3. Maintain the same order and organization
4. Use the exact section titles provided
5. Ensure each section meets its EXACT word count target (e.g., if it says "1222 words", write exactly that many words)
6. Use proper markdown heading format: ## for main headings
7. IMPORTANT: The word counts in parentheses (e.g., "1222 words") are your targets - match them precisely

Content Requirements:
1. Write engaging content for each section following the structure
2. Naturally incorporate the keywords throughout
3. Make content informative, engaging, and valuable
4. Use the specified writing tone: ${formData.tone.subtype} (${formData.tone.type})
5. ${typeInstructions}
6. ${selectedToneInstruction}

Format your response EXACTLY like this:

META DESCRIPTION:
[Write a compelling meta description here - 150-160 characters]

${contentStructure.split('\n').filter(line => line.trim() !== '').map(line => {
  if (line.toLowerCase().includes('title:')) return '';
  if (line.toLowerCase().includes('introduction')) {
    const wordCount = line.match(/\((\d+)\s*words?\)/)?.[1] || '150';
    return `## Introduction\n[Write approximately ${wordCount} words of introduction content here]`;
  }
  if (line.toLowerCase().includes('heading') || (!line.toLowerCase().includes('introduction') && !line.toLowerCase().includes('conclusion') && line.includes('(') && line.includes('words'))) {
    // Extract heading text (everything before the word count)
    const heading = line.split('(')[0]?.trim() || line;
    const wordCount = line.match(/\((\d+)\s*words?\)/)?.[1] || '200';
    return `## ${heading}\n[Write approximately ${wordCount} words of content here]`;
  }
  if (line.toLowerCase().includes('conclusion')) {
    const wordCount = line.match(/\((\d+)\s*words?\)/)?.[1] || '100';
    return `## Conclusion\n[Write approximately ${wordCount} words of conclusion content here]`;
  }
  return '';
}).filter(line => line !== '').join('\n\n')}

## Call to Action
Write your compelling call to action here - encourage readers to take action, subscribe, or engage further` :

`Requirements:
1. Create a compelling meta description (150-160 characters) that summarizes the blog content
2. Write an engaging introduction paragraph
3. Develop at least ${paragraphs} body paragraphs that flow naturally
4. Include a strong conclusion
5. Add an appropriate call-to-action based on the blog type
6. Naturally incorporate the keywords throughout the content
7. Make the content informative, engaging, and valuable to readers
8. Ensure the total word count is at least ${minWordCount} words. Do not finish until you reach this minimum. Expand on each section with detailed examples, explanations, and subheadings as needed.
9. ${typeInstructions}
10. ${selectedToneInstruction}
11. If you finish before reaching the minimum word count, continue writing more content in the same style. Do not summarize or conclude early. Keep expanding until the minimum is reached.
${extraParagraphInstruction ? `12. ${extraParagraphInstruction}` : ''}

Format your response EXACTLY as follows:

META DESCRIPTION:
[Write a compelling meta description here - 150-160 characters]

## Introduction
[Your introduction paragraph here]

## Body
[Your body paragraphs here, separated by double line breaks. Use ## for main headings and ### for subheadings to organize content clearly. IMPORTANT: Every section or topic should start with a proper markdown heading like ### Section Name, not just bold text.]

## Conclusion
[Your conclusion paragraph here]

## Call to Action
[Your compelling call to action here - encourage readers to take action, subscribe, or engage further]`
}`

    console.log('[generate-blog] FINAL PROMPT:', prompt)
    console.log('[generate-blog] Content Structure provided:', contentStructure)
    console.log('[generate-blog] Content Structure parsed:', contentStructure ? contentStructure.split('\n').filter(line => line.trim() !== '') : 'None')

    let completion: any
    let usage = null

    if (formData.apiProvider === 'openai') {
      console.log(`[generate-blog] Using OpenAI with model: ${formData.model}`)
      try {
        const isGpt5 = isGpt5Model(formData.model)
        if (isGpt5) {
          // Prefer Responses API for GPT-5 family; omit explicit token/temperature caps
          const systemInstruction = 'You are a professional content writer and SEO expert. Create high-quality, engaging blog content that provides value to readers while being optimized for search engines. Use proper markdown heading formatting with ## for main headings. Make headings prominent and clear. IMPORTANT: Write content directly under each main heading without adding subheadings like "Overview" or "Context". Always include a compelling call to action at the end. Include META DESCRIPTION at the top, then use proper markdown headings for all sections. CRITICAL: When a content structure is provided, you MUST follow it EXACTLY with the specified headings and word counts. REPLACE ALL PLACEHOLDER TEXT IN BRACKETS with actual content. Write real, engaging content for each section. DO NOT change the headings - use them exactly as provided in the structure.'
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
                content: 'You are a professional content writer and SEO expert. Create high-quality, engaging blog content that provides value to readers while being optimized for search engines. When following a content structure outline, use proper heading formatting with ## for main headings and ### for subheadings.'
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

INTRODUCTION:
[Write a comprehensive introduction paragraph here - make this detailed and engaging, at least 200-300 words]

BODY:
[Write extensive body paragraphs here, separated by double line breaks - this section should be the longest and contain the majority of your ${minWordCount} words. Include:
- Multiple detailed paragraphs
- Use ## for main headings and ### for subheadings (make headings prominent and clear)
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
[Write a compelling call to action here - encourage readers to take action, subscribe, or engage further]

⚠️ REMINDER: You MUST reach ${minWordCount} words minimum. Count your words and ensure you meet this requirement.`
        
        completion = await together.chat.completions.create({
          model: formData.model,
          messages: [
            {
              role: 'system',
                              content: 'You are a professional content writer and SEO expert. You MUST follow the exact format structure provided by the user. Always include all required sections: META DESCRIPTION, INTRODUCTION, BODY, CONCLUSION, and CALL TO ACTION. Use proper markdown heading formatting with ## for main headings. Make headings prominent and clear. IMPORTANT: Write content directly under each main heading without adding subheadings like "Overview" or "Context". Always include a compelling call to action. Format your response exactly as specified. You MUST write comprehensive, detailed content that meets the specified word count requirements. CRITICAL: When a content structure is provided, you MUST follow it EXACTLY with the specified headings and word counts. REPLACE ALL PLACEHOLDER TEXT IN BRACKETS with actual content. Write real, engaging content for each section. DO NOT change the headings - use them exactly as provided in the structure.'
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
      
      // Extract sections using regex patterns - handle multiple formats
      let metaDescriptionMatch = contentText.match(/META DESCRIPTION:\s*\n([\s\S]*?)(?=\n\s*## |$)/i);
      let introMatch = contentText.match(/## Introduction\s*\n([\s\S]*?)(?=\n\s*## |$)/i);
      let bodyMatch = contentText.match(/## Body\s*\n([\s\S]*?)(?=\n\s*## |$)/i);
      let conclusionMatch = contentText.match(/## Conclusion\s*\n([\s\S]*?)(?=\n\s*## |$)/i);
      let ctaMatch = contentText.match(/## Call to Action\s*\n([\s\S]*?)(?=\n\s*$|$)/i);
      
      // If conclusion not found with ##, try to find it with ###
      if (!conclusionMatch) {
        conclusionMatch = contentText.match(/### Conclusion\s*\n([\s\S]*?)(?=\n\s*### |$)/i);
      }
      
      // Additional fallback: look for conclusion anywhere in the content
      if (!conclusionMatch) {
        conclusionMatch = contentText.match(/(?:##|###)\s*Conclusion\s*\n([\s\S]*?)(?=\n\s*(?:##|###)\s*|$)/i);
      }
      
      // Last resort: look for conclusion section from the end of the content
      if (!conclusionMatch) {
        const conclusionIndex = contentText.toLowerCase().indexOf('## conclusion');
        if (conclusionIndex !== -1) {
          conclusionMatch = {
            1: contentText.substring(conclusionIndex)
          };
        }
      }
      
      // Fallback: try to find sections with different heading levels
      if (!metaDescriptionMatch) {
        metaDescriptionMatch = contentText.match(/META DESCRIPTION:\s*\n([\s\S]*?)(?=\n\s*### |$)/i);
      }
      if (!introMatch) {
        introMatch = contentText.match(/### Introduction\s*\n([\s\S]*?)(?=\n\s*### |$)/i);
      }
      if (!bodyMatch) {
        bodyMatch = contentText.match(/### Body\s*\n([\s\S]*?)(?=\n\s*## |$)/i);
      }
      if (!conclusionMatch) {
        conclusionMatch = contentText.match(/### Conclusion\s*\n([\s\S]*?)(?=\n\s*### |$)/i);
      }
      
      // Additional fallback: try to find any section with "introduction", "body", etc.
      if (!metaDescriptionMatch) {
        metaDescriptionMatch = contentText.match(/META DESCRIPTION:\s*\n([\s\S]*?)(?=\n\s*(?:##|###)\s*|$)/i);
      }
      if (!introMatch) {
        introMatch = contentText.match(/(?:##|###)\s*Introduction\s*\n([\s\S]*?)(?=\n\s*(?:##|###)\s*|$)/i);
      }
      if (!bodyMatch) {
        bodyMatch = contentText.match(/(?:##|###)\s*Body\s*\n([\s\S]*?)(?=\n\s*(?:##|###)\s*|$)/i);
      }
      if (!conclusionMatch) {
        conclusionMatch = contentText.match(/(?:##|###)\s*Conclusion\s*\n([\s\S]*?)(?=\n\s*(?:##|###)\s*|$)/i);
      }
      if (!ctaMatch) {
        ctaMatch = contentText.match(/(?:##|###)\s*Call to Action\s*\n([\s\S]*?)(?=\n\s*$|$)/i);
      }
      
      // Extract and clean the content
      const metaDescription = metaDescriptionMatch ? metaDescriptionMatch[1].trim() : '';
      const intro = introMatch ? introMatch[1].trim() : '';
      let body = bodyMatch ? bodyMatch[1].trim() : '';
      const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';
      const cta = ctaMatch ? ctaMatch[1].trim() : '';

      // If using content structure, parse all individual sections
      if (contentStructure && !body) {
        console.log('[generate-blog] Content structure detected, parsing individual sections...');
        
        // Find all sections that are not Introduction, Conclusion, or Call to Action
        const sectionMatches = contentText.matchAll(/## ([^\n]+)\n([\s\S]*?)(?=\n\s*## |$)/g);
        const sections: string[] = [];
        
        for (const match of sectionMatches) {
          const heading = match[1]?.trim();
          const content = match[2]?.trim();
          
          if (heading && content && 
              !heading.toLowerCase().includes('introduction') && 
              !heading.toLowerCase().includes('conclusion') && 
              !heading.toLowerCase().includes('call to action') &&
              !heading.toLowerCase().includes('meta description')) {
            // Preserve the heading with the content
            sections.push(`## ${heading}\n${content}`);
            console.log(`[generate-blog] Found section: ${heading} with ${content.length} characters`);
          }
        }
        
        if (sections.length > 0) {
          // Combine all sections into body content with headings preserved
          const combinedBody = sections.join('\n\n');
          console.log(`[generate-blog] Combined ${sections.length} sections into body with ${combinedBody.length} characters`);
          
          // Update the body variable
          body = combinedBody;
        }
      }

      // Debug: Log parsed sections
      console.log('[generate-blog] Parsed sections:', {
        metaDescription: metaDescription.length,
        intro: intro.length,
        body: body.length,
        conclusion: conclusion.length,
        cta: cta.length
      });
      
      // Debug: Log the actual content found
      if (metaDescription) console.log('[generate-blog] Meta Description found:', metaDescription.substring(0, 100) + '...');
      if (intro) console.log('[generate-blog] Intro found:', intro.substring(0, 100) + '...');
      if (body) console.log('[generate-blog] Body found:', body.substring(0, 100) + '...');
      if (conclusion) console.log('[generate-blog] Conclusion found:', conclusion.substring(0, 100) + '...');
      if (cta) console.log('[generate-blog] CTA found:', cta.substring(0, 100) + '...');
      
      // Debug: Log conclusion parsing attempts
      console.log('[generate-blog] Conclusion parsing debug:');
      console.log('[generate-blog] - Content contains "conclusion":', contentText.toLowerCase().includes('conclusion'));
      console.log('[generate-blog] - Content contains "## conclusion":', contentText.toLowerCase().includes('## conclusion'));
      console.log('[generate-blog] - Content contains "### conclusion":', contentText.toLowerCase().includes('### conclusion'));
      if (conclusionMatch) {
        console.log('[generate-blog] - Conclusion match found with length:', conclusionMatch[1]?.length || 0);
        console.log('[generate-blog] - Conclusion content preview:', conclusionMatch[1]?.substring(0, 200) + '...');
      } else {
        console.log('[generate-blog] - No conclusion match found');
      }

      // If parsing failed, try fallback parsing
      if (!intro && !body && !conclusion) {
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
          
          // Look for section headers
          if (upperSection.includes('META DESCRIPTION') || upperSection.includes('META')) {
            currentSection = 'META';
            // Keep the heading in the meta description content
            fallbackMetaDescription = trimmedSection;
          } else if (upperSection.includes('INTRODUCTION') || upperSection.includes('INTRO')) {
            currentSection = 'INTRO';
            // Keep the heading in the intro content
            fallbackIntro = trimmedSection;
          } else if (upperSection.includes('BODY') || upperSection.includes('CONTENT')) {
            currentSection = 'BODY';
            // Keep the heading in the body content
            fallbackBody = trimmedSection;
          } else if (upperSection.includes('CONCLUSION') || upperSection.includes('CONCLUDE')) {
            currentSection = 'CONCLUSION';
            // Keep the heading in the conclusion content
            fallbackConclusion = trimmedSection;
          } else if (upperSection.includes('CALL TO ACTION') || upperSection.includes('CTA')) {
            currentSection = 'CTA';
            // Keep the heading in the CTA content
            fallbackCta = trimmedSection;
          } else if (currentSection === 'BODY' && trimmedSection.length > 20) {
            // Continue adding to body if we're in body section
            fallbackBody += '\n\n' + trimmedSection;
          } else if (currentSection === 'INTRO' && trimmedSection.length > 20) {
            // Continue adding to intro if we're in intro section
            fallbackIntro += '\n\n' + trimmedSection;
          } else if (currentSection === 'CONCLUSION' && trimmedSection.length > 20) {
            // Continue adding to conclusion if we're in conclusion section
            fallbackConclusion += '\n\n' + trimmedSection;
          } else if (!currentSection && trimmedSection.length > 50 && !trimmedSection.startsWith('#')) {
            // If no section identified and it's not a heading, assume it's intro
            fallbackIntro = trimmedSection;
          }
        }
        
        // Use fallback values if primary parsing failed
        if (fallbackIntro || fallbackBody || fallbackConclusion) {
          console.log('[generate-blog] Using fallback parsing results');
          blogContent = {
            title: formData.selectedTitle,
            metaDescription: fallbackMetaDescription || 'A comprehensive guide covering all aspects of the topic.',
            intro: fallbackIntro || contentText.substring(0, 500),
            body: fallbackBody ? fallbackBody.split(/\n\n+/).filter((p: string) => p.trim()) : [contentText],
            conclusion: fallbackConclusion || contentText.substring(contentText.length - 300),
          cta: fallbackCta || 'Ready to get started? Take action now!'
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
            cta: 'Ready to get started? Take action now!'
          };
        }
              } else {
          // Process body content to preserve headings when using content structure
          let processedBody: string[] = [];
          if (body) {
            if (contentStructure) {
              // For content structure, preserve headings by splitting at ## markers
              const bodySections = body.split(/(?=## )/).filter((section: string) => section.trim());
              processedBody = bodySections.map((section: string) => section.trim()).filter((section: string) => section.length > 0);
              console.log(`[generate-blog] Content structure body processing: found ${processedBody.length} sections with headings`);
            } else {
              // For regular blog generation, split by paragraphs
              processedBody = body.split(/\n\n+/).filter((p: string) => p.trim());
            }
          }
          
          blogContent = {
            title: formData.selectedTitle,
            metaDescription: metaDescription || 'A comprehensive guide covering all aspects of the topic.',
            intro: intro || '',
            body: processedBody,
            conclusion: conclusion || '',
            cta: cta || 'Ready to get started? Take action now!'
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