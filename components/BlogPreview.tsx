'use client'

import { BlogContent, ModelInfo } from '@/types/blog'
import { useMemo, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

interface BlogPreviewProps {
  content: BlogContent & { 
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    apiProvider?: string
    model?: string
    selectedModel?: ModelInfo
  }
  humanizedContent?: { output: string; new_flesch_score: number } | null
  setHumanizedContent: (content: { output: string; new_flesch_score: number } | null) => void
  currentSessionId?: string | null
  sessionSteps?: {
    titleGenerated: boolean
    blogGenerated: boolean
    humanized: boolean
  }
  setSessionSteps?: (steps: any) => void
}

const markdownComponents = {
  h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold mb-4 text-black" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-xl font-bold mt-8 mb-3 text-gray-900" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-base font-bold mt-6 mb-2 text-gray-800" {...props} />,
  p: ({node, ...props}: any) => <p className="text-base text-gray-900 leading-relaxed mb-3" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc ml-6 mb-3" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal ml-6 mb-3" {...props} />,
  li: ({node, ...props}: any) => <li className="mb-1" {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-700 mb-3" {...props} />,
  code: ({node, ...props}: any) => <code className="bg-gray-100 px-1 rounded" {...props} />,
}

interface HumanizedContent {
  output: string;
  new_flesch_score: number;
}

const getFleschScoreColor = (score: number) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getFleschScoreLabel = (score: number) => {
  if (score >= 80) return 'Very Easy';
  if (score >= 60) return 'Easy';
  if (score >= 40) return 'Medium';
  return 'Difficult';
};

function stripMarkdown(md: string) {
  return md
    .replace(/^#+\s?/gm, '') // Remove headings
    .replace(/[\*_~`>]/g, '') // Remove *, _, ~, `, >
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
    .replace(/!\[(.*?)\]\(.*?\)/g, '') // Remove images
    .replace(/^\s*-\s+/gm, '') // Remove list dashes
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
    .replace(/^\s*>+\s?/gm, '') // Remove blockquotes
    .replace(/\n{2,}/g, '\n\n') // Normalize newlines
    .trim();
}

export default function BlogPreview({ content, humanizedContent, setHumanizedContent, currentSessionId, sessionSteps, setSessionSteps }: BlogPreviewProps) {
  const [isHumanizing, setIsHumanizing] = useState(false);

  // Calculate word count
  const wordCount = useMemo(() => {
    const allText = [content.intro, ...(Array.isArray(content.body) ? content.body : [content.body]), content.conclusion, content.cta || ''].join(' ')
    return allText.split(/\s+/).filter(Boolean).length
  }, [content])

  // Cost calculation using real API pricing and usage data
  const getCost = async (usage?: { prompt_tokens?: number; completion_tokens?: number }, provider?: string, model?: string, selectedModel?: ModelInfo) => {
    if (!usage || !provider || !model) return null
    
    const input = usage.prompt_tokens || 0
    const output = usage.completion_tokens || 0
    
    try {
      // Fetch real-time pricing from the API
      const pricingResponse = await fetch(`/api/pricing?provider=${provider}&model=${encodeURIComponent(model)}`)
      
      if (!pricingResponse.ok) {
        const errorData = await pricingResponse.json().catch(() => ({}))
        console.warn(`[cost] Pricing API returned ${pricingResponse.status}:`, errorData.error || 'Unknown error')
        return 'Pricing not available'
      }
      
      const pricingData = await pricingResponse.json()
      const { pricing, units } = pricingData
      
      let inputCost = 0
      let outputCost = 0
      
      if (units === 'per_1M_tokens') {
        // Together.ai pricing is per 1M tokens
        inputCost = (input / 1000000) * pricing.input
        outputCost = (output / 1000000) * pricing.output
      } else {
        // OpenAI pricing is per 1K tokens
        inputCost = (input / 1000) * pricing.input
        outputCost = (output / 1000) * pricing.output
      }
      
    const total = inputCost + outputCost
    if (total > 0) {
      const inr = total * 83
        return `$${total.toFixed(6)} USD (₹${inr.toFixed(2)} INR)`
    }
    return null
    } catch (error) {
      console.error('Error calculating cost with real pricing:', error)
      return 'Pricing not available'
    }
  }



  // Use useEffect to calculate cost asynchronously
  const [cost, setCost] = useState<string | null>(null)

  useEffect(() => {
    if (content.usage && content.apiProvider && content.model) {
      getCost(content.usage, content.apiProvider, content.model, content.selectedModel)
        .then(setCost)
        .catch(() => setCost('Pricing not available'))
    } else {
      setCost(null)
    }
  }, [content.usage, content.apiProvider, content.model, content.selectedModel])

  // Humanize the content
  const humanizeContent = async (text: string) => {
    if (!currentSessionId) {
      toast.error('Please start a new blog first');
      return;
    }

    if (sessionSteps?.humanized) {
      toast.error('Content has already been humanized in this blog');
      return;
    }

    try {
      setIsHumanizing(true);

      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, sessionId: currentSessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to humanize content');
      }

      const data = await response.json();
      setHumanizedContent(data);
      
      // Save humanized content to localStorage
      localStorage.setItem('humanizedContent', JSON.stringify(data));
      
      // Mark as humanized in session
      if (setSessionSteps) {
        setSessionSteps((prev: any) => ({ ...prev, humanized: true }));
      }
      
      toast.success('Content humanized!');
    } catch (error) {
      toast.error('Failed to humanize content');
      console.error('Humanization error:', error);
    } finally {
      setIsHumanizing(false);
    }
  };

  // Copy to clipboard with proper line breaks
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(stripMarkdown(text))
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err)
      toast.error('Failed to copy text');
    }
  }

  // Download as TXT with proper line breaks
  const downloadBlog = (text: string, prefix: string = '') => {
    const blogText = stripMarkdown(`${text}`.trim())
    const blob = new Blob([blogText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${prefix}${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Get the full blog text for humanization
  const getFullBlogText = () => {
    return `${content.title}\n\n${content.metaDescription}\n\n${content.intro}\n\n${Array.isArray(content.body) ? content.body.join('\n\n') : content.body}\n\n${content.conclusion}${content.cta ? `\n\n${content.cta}` : ''}`.trim();
  };

  // Get formatted blog text with meta info
  const getFormattedBlogText = () => {
    return `Meta Title: ${content.title}\n\nMeta Description: ${content.metaDescription}\n\n${content.title}\n\n${content.intro}\n\n${Array.isArray(content.body) ? content.body.join('\n\n') : content.body}\n\n${content.conclusion}\n\n${content.cta ? `Call to Action: ${content.cta}\n\n` : ''}`.trim();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 bg-white">
      {/* Word Count, API Provider & Cost */}
      <div className="mb-2 text-xs text-gray-500 font-medium">
        <div className="flex items-center justify-between">
          <span>Word count: {wordCount}</span>
          <div className="flex items-center space-x-4">
            {content.apiProvider && (
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                Generated with {content.apiProvider === 'openai' ? 'OpenAI' : 'Together.ai'} ({content.model})
              </span>
            )}
            {cost && <span>Cost: {cost}</span>}
          </div>
        </div>
      </div>

      {/* Meta Info Box */}
      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 mb-1">Meta Title:</div>
        <div className="text-sm text-gray-900 mb-2 font-semibold">{content.title}</div>
        <div className="text-xs text-gray-600 mb-1">Meta Description:</div>
        <div className="text-sm text-gray-800">{content.metaDescription}</div>
      </div>

      {/* Blog Title */}
      <h1 className="text-2xl font-bold mb-6 text-black">{content.title}</h1>

      {/* Original Content */}
      <div>
        {/* Intro */}
        <section className="mb-5">
          <ReactMarkdown components={markdownComponents}>{content.intro}</ReactMarkdown>
        </section>

        {/* Body Paragraphs & Headings */}
        <section className="mb-5">
          <ReactMarkdown components={markdownComponents}>{Array.isArray(content.body) ? content.body.join('\n\n') : content.body}</ReactMarkdown>
        </section>

        {/* Conclusion */}
        <section className="mb-5">
          <ReactMarkdown components={markdownComponents}>{content.conclusion}</ReactMarkdown>
        </section>
      </div>

      {/* CTA */}
      {content.cta && (
        <section className="mt-8">
          <div className="bg-black text-white rounded-lg px-6 py-4 text-center text-base font-semibold">
            {content.cta}
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-200 mt-8">
        <button
          onClick={() => downloadBlog(getFormattedBlogText())}
          className="btn-primary px-4 py-2 text-xs hover-lift"
        >
          Download TXT
        </button>
        <button
          onClick={() => copyToClipboard(getFormattedBlogText())}
          className="btn-secondary px-4 py-2 text-xs hover-lift"
        >
          Copy All
        </button>
        <button
          onClick={() => humanizeContent(getFullBlogText())}
          disabled={isHumanizing || sessionSteps?.humanized}
          className="px-4 py-2 text-xs hover-lift disabled:opacity-50 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors duration-150"
        >
          {sessionSteps?.humanized ? '✓ Humanized' : isHumanizing ? 'Humanizing...' : 'Humanize'}
        </button>
      </div>

      {/* Humanized Content */}
      {humanizedContent && (
        <div className="mt-8 pt-8 border-t-2 border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-blue-900">Humanized Version</h2>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">Flesch Score:</div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getFleschScoreColor(humanizedContent.new_flesch_score)}`}></div>
                <div className="text-sm font-medium">{humanizedContent.new_flesch_score.toFixed(1)}</div>
                <div className="text-xs text-gray-500">({getFleschScoreLabel(humanizedContent.new_flesch_score)})</div>
              </div>
            </div>
          </div>
          
          <div className="prose max-w-none p-6 rounded-xl bg-blue-50 border border-blue-100">
            <ReactMarkdown components={markdownComponents}>{humanizedContent.output}</ReactMarkdown>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => downloadBlog(humanizedContent.output, 'humanized_')}
              className="btn-primary px-4 py-2 text-xs hover-lift"
            >
              Download TXT
            </button>
            <button
              onClick={() => copyToClipboard(humanizedContent.output)}
              className="btn-secondary px-4 py-2 text-xs hover-lift"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 