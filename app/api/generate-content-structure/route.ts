import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getOpenAIModelDescription, getOpenAIPricing, getTogetherModelName, getTogetherModelDescription, getTogetherPricing, createTokenParameter, createTemperatureParameter, normalizeOpenAIUsage, isGpt5Model } from '@/lib/model-utils'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Helper function to get Together AI client
function getTogetherClient() {
  return new OpenAI({
    baseURL: 'https://api.together.xyz/v1',
    apiKey: process.env.TOGETHER_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { title, keywords, blogType, apiProvider = 'openai', model = 'gpt-4o', tone, wordCount, paragraphs, sessionId } = await request.json()

    if (!title || !keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Title and keywords are required' },
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
        typeInstruction = 'Create a structure for a numbered listicle blog post with clear sections for each point.'
        break
      case 'How-to':
        typeInstruction = 'Create a structure for a step-by-step how-to blog post with clear progression.'
        break
      case 'Case Study':
        typeInstruction = 'Create a structure for a real-world case study blog post with problem, solution, and results.'
        break
      case 'Solution-based':
        typeInstruction = 'Create a structure for a problem-solving, solution-based blog post.'
        break
      case 'Informative':
      default:
        typeInstruction = 'Create a structure for an educational and comprehensive informative blog post.'
    }

    // Tone-specific instruction
    const toneInstruction = tone ? `The writing tone should be ${tone.subtype} (${tone.type}).` : ''

    // Calculate dynamic word counts based on form data
    const parseWordCount = (wordCountStr: string) => {
      if (wordCountStr.includes('-')) {
        const [min, max] = wordCountStr.split('-').map(w => parseInt(w.replace(/\D/g, '')))
        return Math.round((min + max) / 2)
      }
      return parseInt(wordCountStr.replace(/\D/g, '')) || 500
    }

    const parseParagraphs = (paragraphsStr: string) => {
      if (paragraphsStr.includes('-')) {
        const [min, max] = paragraphsStr.split('-').map(p => parseInt(p.replace(/\D/g, '')))
        return Math.round((min + max) / 2)
      }
      return parseInt(paragraphsStr.replace(/\D/g, '')) || 5
    }

    const totalWords = parseWordCount(wordCount)
    const totalParagraphs = parseParagraphs(paragraphs)
    
    // Calculate section word counts dynamically
    const introWords = Math.round(totalWords * 0.15) // 15% for intro
    const conclusionWords = Math.round(totalWords * 0.10) // 10% for conclusion
    const bodyWords = totalWords - introWords - conclusionWords
    const bodySectionWords = Math.round(bodyWords / (totalParagraphs - 2)) // Distribute remaining words among body sections

    const prompt = `Create a simple CONTENT STRUCTURE OUTLINE for a blog post titled: "${title}"

Blog Type: ${blogType}
Target Word Count: ${wordCount} (approximately ${totalWords} words)
Target Paragraphs: ${paragraphs} (approximately ${totalParagraphs} sections)
Keywords to include: ${keywords.join(', ')}

${typeInstruction} ${toneInstruction}

🚨 CRITICAL FORMAT REQUIREMENTS - FOLLOW EXACTLY:
- Generate ONLY a structure outline - NO content, NO descriptions, NO explanations
- Each section must be on its own line
- Each line must end with word count in parentheses
- Use the EXACT format shown below
- Generate ACTUAL, SPECIFIC headings based on the keywords and title
- DO NOT write full content or paragraphs
- DO NOT create run-on sentences or long descriptions
- Each heading should be 3-8 words maximum

📋 REQUIRED FORMAT - COPY THIS EXACTLY:
Title: ${title}
Introduction (${introWords} words)
${Array.from({ length: totalParagraphs - 2 }, (_, i) => `Heading ${i + 1}: [Generate a unique, specific heading about ${keywords[i] || 'the main topic'} - make it descriptive and professional] (${bodySectionWords} words)`).join('\n')}
Conclusion (${conclusionWords} words)

🚨 FORBIDDEN:
- DO NOT write full content or descriptions
- DO NOT add extra text or explanations
- DO NOT use brackets or special formatting
- DO NOT deviate from the exact format above
- DO NOT add any text before or after the structure
- DO NOT use placeholder text like "[Create a heading about...]"
- DO NOT create long, run-on headings with multiple topics
- DO NOT write paragraphs or explanations in headings
- DO NOT exceed 8 words per heading

🚨 REQUIRED:
- Each heading must be on its own line
- Each line must end with (X words) in parentheses
- Headings must be ACTUAL, SPECIFIC headings based on the keywords: ${keywords.join(', ')}
- Total word count must add up to approximately ${totalWords} words
- Use clear, professional headings that are ready for blog generation
- Replace ALL placeholder text with real headings
- Do NOT use generic headings like "Heading 1:", "Heading 2:" - use descriptive titles
- Each heading should be specific to the topic and keywords
- Generate UNIQUE headings for each section - no repetitive or generic titles
- Make headings descriptive and engaging - create original, topic-specific headings

🚨 FINAL INSTRUCTION:
Return ONLY the structure outline in the exact format specified above. Replace all placeholder text with actual, specific headings. Nothing else. No explanations, no descriptions, no additional text. Just the structure outline with real headings.

🚨 EXAMPLE OF CORRECT OUTPUT:
Title: AI in Modern Organizations
Introduction (150 words)
AI Governance Frameworks (200 words)
Advanced Analytics Tools (200 words)
Risk Management Strategies (200 words)
Stakeholder Training Programs (200 words)
Conclusion (100 words)

🚨 EXAMPLE OF WRONG OUTPUT (DO NOT DO THIS):
Title: The Strategic Role of AI in Modern Organizations: Integrating Advanced Analytics, Ethical Governance, Transparent Decision Making, Data Quality, Model Monitoring, Stakeholder Alignment, Risk Management, and Practical Deployment Across Departments to Enable Sustainable Performance and Innovation While Aligning with Compliance Standards, Regulatory Considerations, and Organizational Culture, this heading emphasizes deploying ai responsibly through governance frameworks, explainability, auditability, and continuous improvement to amplify human judgment rather than replace it while accelerating measurable business outcomes...`

    console.log('[generate-content-structure] FINAL PROMPT:', prompt)

    let completion: any
    let usage = null

    if (apiProvider === 'openai') {
      console.log(`[generate-content-structure] Using OpenAI with model: ${model}`)

      if (isGpt5Model(model)) {
        // Prefer Responses API for GPT-5 family; omit explicit token/temperature caps
        const systemInstruction = `You are a professional content strategist and blog structure expert. Your ONLY job is to create SIMPLE STRUCTURE OUTLINES.

🚨 CRITICAL FORMAT REQUIREMENTS - YOU MUST FOLLOW THIS EXACTLY:
- Return ONLY the structure outline - NO explanations, NO descriptions, NO extra text
- Use EXACTLY this format for each line:
  * Title: [Actual title]
  * Introduction (X words)
  * Heading 1: [Actual, specific heading about the keyword] (X words)
  * Heading 2: [Actual, specific heading about the keyword] (X words)
  * Heading 3: [Actual, specific heading about the keyword] (X words)
  * Conclusion (X words)

🚨 PLACEHOLDER REPLACEMENT - YOU MUST:
- Replace [Actual title] with the real title
- Replace [Generate a unique, specific heading about...] with real, specific headings
- Each heading should be about the specific keywords: ${keywords.join(', ')}
- Make headings descriptive and professional
- Do NOT leave any placeholder text in brackets
- Generate UNIQUE headings based on the keywords - create original, engaging headings
- Do NOT use generic "Heading 1:", "Heading 2:" format

🚨 FORBIDDEN:
- DO NOT write full content
- DO NOT add descriptions or explanations
- DO NOT use brackets or extra formatting
- DO NOT deviate from the exact format above
- DO NOT add any text before or after the structure
- DO NOT use placeholder text like "[Create a heading about...]"

🚨 REQUIRED:
- Each heading must be on its own line
- Each line must end with (X words) in parentheses
- Headings must be ACTUAL, SPECIFIC headings based on the keywords provided
- Total word count must match the target specified
- Use clear, professional headings that are ready for blog generation
- Replace any placeholder text with real headings

Return ONLY the structure outline in the exact format specified. Replace all placeholder text with actual, specific headings. Nothing else.`
        
        try {
          console.log(`[generate-content-structure] Attempting GPT-5 Responses API for model: ${model}`)
          
          const httpResp = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model,
              input: `SYSTEM: ${systemInstruction}\nUSER: ${prompt}`,
            }),
          })
          
          if (!httpResp.ok) {
            const errorData = await httpResp.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(`OpenAI API error: ${errorData.error?.message || `HTTP ${httpResp.status}`}`)
          }
          
          const resp = await httpResp.json()
          console.log(`[generate-content-structure] GPT-5 Responses API response:`, JSON.stringify(resp, null, 2))
          
          // Try multiple possible response formats
          let content = ''
          if (resp?.output_text) {
            content = resp.output_text
          } else if (resp?.output?.[0]?.content?.[0]?.text) {
            content = resp.output[0].content[0].text
          } else if (resp?.output?.[0]?.text) {
            content = resp.output[0].text
          } else if (resp?.choices?.[0]?.message?.content) {
            content = resp.choices[0].message.content
          } else if (resp?.output && Array.isArray(resp.output)) {
            // Handle the actual GPT-5 format we're seeing
            for (const output of resp.output) {
              if (output.type === 'message' && output.content && Array.isArray(output.content)) {
                for (const contentItem of output.content) {
                  if (contentItem.type === 'output_text' && contentItem.text) {
                    content = contentItem.text
                    break
                  }
                }
                if (content) break
              }
            }
          } else {
            console.warn('[generate-content-structure] GPT-5 response format not recognized, attempting fallback')
            throw new Error('GPT-5 response format not recognized')
          }
          
          if (!content || content.trim() === '') {
            throw new Error('GPT-5 API returned empty content')
          }
          
          console.log(`[generate-content-structure] GPT-5 content extracted:`, content.substring(0, 200) + '...')
          
          // Map to completion-like shape for downstream logic
          completion = {
            choices: [
              {
                message: {
                  content: content,
                },
              },
            ],
            usage: normalizeOpenAIUsage(resp?.usage),
          }
          usage = completion.usage
          console.log('[generate-content-structure] GPT-5 Responses API successful')
        } catch (error: any) {
          console.error('[generate-content-structure] GPT-5 Responses API failed, falling back to Chat Completions:', error)
          // Fall back to standard Chat Completions API
          const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4o', // Use GPT-4o as fallback for GPT-5
            messages: [
              {
                role: 'system',
                content: `You are a professional content strategist and blog structure expert. Your ONLY job is to create SIMPLE STRUCTURE OUTLINES.

🚨 CRITICAL FORMAT REQUIREMENTS - YOU MUST FOLLOW THIS EXACTLY:
- Return ONLY the structure outline - NO explanations, NO descriptions, NO extra text
- Use EXACTLY this format for each line:
  * Title: [Actual title]
  * Introduction (X words)
  * Heading 1: [Actual, specific heading about the keyword] (X words)
  * Heading 2: [Actual, specific heading about the keyword] (X words)
  * Heading 3: [Actual, specific heading about the keyword] (X words)
  * Conclusion (X words)

🚨 FORBIDDEN:
- DO NOT write full content
- DO NOT add descriptions or explanations
- DO NOT use brackets or extra formatting
- DO NOT deviate from the exact format above
- DO NOT add any text before or after the structure
- DO NOT use placeholder text like "[Create a heading about...]"

🚨 REQUIRED:
- Each heading must be on its own line
- Each line must end with (X words) in parentheses
- Headings must be ACTUAL, SPECIFIC headings based on the keywords provided
- Total word count must match the target specified
- Use clear, professional headings that are ready for blog generation
- Replace any placeholder text with real headings

Return ONLY the structure outline in the exact format specified. Replace all placeholder text with actual, specific headings. Nothing else.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            ...createTemperatureParameter('gpt-4o', 0.7),
            ...createTokenParameter('gpt-4o', 1000),
          })

          completion = chatCompletion
          usage = normalizeOpenAIUsage(chatCompletion.usage)
          console.log('[generate-content-structure] Fallback to GPT-4o successful')
        }
      } else {
        // Standard Chat Completions API for other models
        const chatCompletion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: `You are a professional content strategist and blog structure expert. Your ONLY job is to create SIMPLE STRUCTURE OUTLINES.

🚨 CRITICAL FORMAT REQUIREMENTS - YOU MUST FOLLOW THIS EXACTLY:
- Return ONLY the structure outline - NO explanations, NO descriptions, NO extra text
- Use EXACTLY this format for each line:
  * Title: [Actual title]
  * Introduction (X words)
  * Heading 1: [Actual, specific heading about the keyword] (X words)
  * Heading 2: [Actual, specific heading about the keyword] (X words)
  * Heading 3: [Actual, specific heading about the keyword] (X words)
  * Conclusion (X words)

🚨 FORBIDDEN:
- DO NOT write full content
- DO NOT add descriptions or explanations
- DO NOT use brackets or extra formatting
- DO NOT deviate from the exact format above
- DO NOT add any text before or after the structure
- DO NOT use placeholder text like "[Create a heading about...]"

🚨 REQUIRED:
- Each heading must be on its own line
- Each line must end with (X words) in parentheses
- Headings must be ACTUAL, SPECIFIC headings based on the keywords provided
- Total word count must match the target specified
- Use clear, professional headings that are ready for blog generation
- Replace any placeholder text with real headings

Return ONLY the structure outline in the exact format specified. Replace all placeholder text with actual, specific headings. Nothing else.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          ...createTemperatureParameter(model, 0.7),
          ...createTokenParameter(model, 1000),
        })

        completion = chatCompletion
        usage = normalizeOpenAIUsage(chatCompletion.usage)
      }
    } else if (apiProvider === 'together') {
      console.log(`[generate-content-structure] Using Together.ai with model: ${model}`)
      
      try {
        const together = getTogetherClient()
        completion = await together.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are a professional content strategist and blog structure expert. Your ONLY job is to create SIMPLE STRUCTURE OUTLINES.

🚨 CRITICAL FORMAT REQUIREMENTS - YOU MUST FOLLOW THIS EXACTLY:
- Return ONLY the structure outline - NO explanations, NO descriptions, NO extra text
- Use EXACTLY this format for each line:
  * Title: [Actual title]
  * Introduction (X words)
  * Heading 1: [Actual, specific heading about the keyword] (X words)
  * Heading 2: [Actual, specific heading about the keyword] (X words)
  * Heading 3: [Actual, specific heading about the keyword] (X words)
  * Conclusion (X words)

🚨 FORBIDDEN:
- DO NOT write full content
- DO NOT add descriptions or explanations
- DO NOT use brackets or extra formatting
- DO NOT deviate from the exact format above
- DO NOT add any text before or after the structure
- DO NOT use placeholder text like "[Create a heading about...]"

🚨 REQUIRED:
- Each heading must be on its own line
- Each line must end with (X words) in parentheses
- Headings must be ACTUAL, SPECIFIC headings based on the keywords provided
- Total word count must match the target specified
- Use clear, professional headings that are ready for blog generation
- Replace any placeholder text with real headings

Return ONLY the structure outline in the exact format specified. Replace all placeholder text with actual, specific headings. Nothing else.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          ...createTemperatureParameter(model, 0.7),
          ...createTokenParameter(model, 1000),
        })
        usage = completion.usage
        console.log('[generate-content-structure] Together.ai completion successful')
      } catch (error: any) {
        console.error('[generate-content-structure] Together.ai API error:', error)
        throw new Error(`Together.ai API error: ${error.message || 'Unknown error'}`)
      }
    } else {
      throw new Error(`Unsupported API provider: ${apiProvider}`)
    }

    if (!completion?.choices?.[0]?.message?.content) {
      console.error('[generate-content-structure] Invalid completion structure:', JSON.stringify(completion, null, 2))
      throw new Error('No content generated from the API - completion structure is invalid')
    }

    const structure = completion.choices[0].message.content.trim()
    
    if (!structure || structure.length === 0) {
      console.error('[generate-content-structure] Empty content received from API')
      throw new Error('API returned empty content')
    }
    
    console.log('[generate-content-structure] Raw structure received:', structure.substring(0, 200) + '...')

    // Post-process GPT-5 responses to ensure proper formatting
    let processedStructure = structure
    if (isGpt5Model(model)) {
      console.log('[generate-content-structure] Post-processing GPT-5 response for proper formatting')
      
      // Split into lines and clean each line
      const lines = processedStructure.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
      const cleanedLines: string[] = []
      
      for (const line of lines) {
        // Check if line matches expected format
        if (line.toLowerCase().startsWith('title:') || 
            line.toLowerCase().startsWith('introduction') ||
            line.toLowerCase().includes('heading') ||
            line.toLowerCase().startsWith('conclusion')) {
          
          // Ensure proper word count format
          if (!line.includes('(') || !line.includes('words')) {
            // Add default word count if missing
            if (line.toLowerCase().startsWith('introduction')) {
              cleanedLines.push(`${line} (${introWords} words)`)
            } else if (line.toLowerCase().includes('heading')) {
              cleanedLines.push(`${line} (${bodySectionWords} words)`)
            } else if (line.toLowerCase().startsWith('conclusion')) {
              cleanedLines.push(`${line} (${Math.round(totalWords * 0.10)} words)`)
            } else {
              cleanedLines.push(line)
            }
          } else {
            cleanedLines.push(line)
          }
        }
      }
      
      processedStructure = cleanedLines.join('\n')
      console.log('[generate-content-structure] Post-processed structure:', processedStructure.substring(0, 200) + '...')
    }

    // Clean up the structure to ensure it follows the correct format
    const cleanStructure = processedStructure
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => {
        // Keep only lines that match our expected format
        return line && (
          line.toLowerCase().startsWith('title:') ||
          line.toLowerCase().startsWith('introduction') ||
          line.toLowerCase().includes('heading') ||
          line.toLowerCase().startsWith('conclusion')
        );
      })
      .map((line: string) => {
        // Clean up placeholder text and generic headings
        let cleanedLine = line
        
        // Remove any "#1", "#2" prefixes
        cleanedLine = cleanedLine.replace(/^#\d+\s*/, '')
        
        // Replace generic "Heading X:" with more descriptive text
        if (cleanedLine.match(/^Heading \d+:/i)) {
          const keyword = keywords[0] || 'the main topic'
          const headingNumber = cleanedLine.match(/Heading (\d+):/i)?.[1] || '1'
          
          // Remove the "Heading X:" prefix and keep only the actual heading text
          cleanedLine = cleanedLine.replace(/^Heading \d+:\s*/i, '')
        }
        
        // Remove any remaining placeholder text in brackets
        cleanedLine = cleanedLine.replace(/\[.*?\]/g, '')
        
        // Ensure word count is present
        if (!cleanedLine.includes('(') || !cleanedLine.includes('words')) {
          if (cleanedLine.toLowerCase().startsWith('introduction')) {
            cleanedLine = `${cleanedLine} (${introWords} words)`
          } else if (cleanedLine.toLowerCase().includes('heading')) {
            cleanedLine = `${cleanedLine} (${bodySectionWords} words)`
          } else if (cleanedLine.toLowerCase().startsWith('conclusion')) {
            cleanedLine = `${cleanedLine} (${Math.round(totalWords * 0.10)} words)`
          }
        }
        
        return cleanedLine
      })
      .join('\n');



    // Calculate costs for OpenAI
    let inputTokens = 0
    let outputTokens = 0
    let totalTokens = 0
    let totalCostUsd = 0

    if (apiProvider === 'openai' && usage) {
      inputTokens = usage.prompt_tokens || 0
      outputTokens = usage.completion_tokens || 0
      totalTokens = usage.total_tokens || 0
      
      const pricing = getOpenAIPricing(model)
      const inputPricePerToken = pricing.input / 1000000
      const outputPricePerToken = pricing.output / 1000000
      
      totalCostUsd = (inputTokens * inputPricePerToken) + (outputTokens * outputPricePerToken)
    }

    // Calculate costs for Together.ai
    if (apiProvider === 'together' && usage) {
      inputTokens = usage.prompt_tokens || 0
      outputTokens = usage.completion_tokens || 0
      totalTokens = usage.total_tokens || 0
      
      // Get real Together.ai pricing from our pricing API
      let inputPricePerToken = 0.00000025 // Default fallback: $0.25 per 1M tokens
      let outputPricePerToken = 0.00000035 // Default fallback: $0.35 per 1M tokens
      
      try {
        const pricingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/pricing?provider=together&model=${encodeURIComponent(model)}`)
        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json()
          if (pricingData.pricing) {
            inputPricePerToken = pricingData.pricing.input / 1000000
            outputPricePerToken = pricingData.pricing.output / 1000000
          }
        }
      } catch (error) {
        console.warn('Failed to fetch Together.ai pricing, using fallback values:', error)
      }
      
      totalCostUsd = (inputTokens * inputPricePerToken) + (outputTokens * outputPricePerToken)
    }

    // If the cleaned structure is still poor quality, rebuild it completely
    if (cleanStructure.includes('Heading 1:') || cleanStructure.includes('#1') || !cleanStructure.includes('(')) {
      console.log('[generate-content-structure] Structure quality poor, rebuilding completely')
      
      const rebuiltStructure = [
        `Title: ${title}`,
        `Introduction (${introWords} words)`,
        ...Array.from({ length: totalParagraphs - 2 }, (_, i) => {
          const keyword = keywords[0] || 'the main topic'
          return `${keyword} Section ${i + 1} (${bodySectionWords} words)`
        }),
        `Conclusion (${Math.round(totalWords * 0.10)} words)`
      ].join('\n')
      
      console.log('[generate-content-structure] Rebuilt structure:', rebuiltStructure.substring(0, 200) + '...')
      return NextResponse.json({
        structure: rebuiltStructure,
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: totalTokens,
          total_cost_usd: totalCostUsd
        }
      })
    }

    return NextResponse.json({
      structure: cleanStructure,
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
        total_cost_usd: totalCostUsd
      }
    })

  } catch (error: any) {
    console.error('[generate-content-structure] Error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate content structure'
    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = 'API key not configured or invalid'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please check your account limits.'
      } else if (error.message.includes('model')) {
        errorMessage = 'Model not available or invalid. Please try a different model.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
