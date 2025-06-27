'use client'

import { BlogContent } from '@/types/blog'
import { useMemo } from 'react'

interface BlogPreviewProps {
  content: BlogContent & { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }
}

function renderBody(body: string[] | string) {
  const lines = Array.isArray(body) ? body : [body]
  return lines.map((line, idx) => {
    if (line.trim().startsWith('### ')) {
      return <h3 key={idx} className="text-base font-semibold mt-6 mb-2 text-gray-800">{line.replace(/^### /, '')}</h3>
    } else if (line.trim().startsWith('## ')) {
      return <h2 key={idx} className="text-xl font-bold mt-8 mb-3 text-gray-900">{line.replace(/^## /, '')}</h2>
    } else if (line.trim()) {
      return <p key={idx} className="text-base text-gray-900 leading-relaxed mb-3">{line}</p>
    } else {
      return null
    }
  })
}

function getPlainText(content: BlogContent) {
  let result = ''
  result += `Meta Title: ${content.title}\n\n`
  result += `Meta Description: ${content.metaDescription}\n\n`
  result += `${content.title}\n\n`
  result += `${content.intro}\n\n`
  const bodyLines = Array.isArray(content.body) ? content.body : [content.body]
  for (const line of bodyLines) {
    if (line.trim().startsWith('### ')) {
      result += `${line.replace(/^### /, '')}\n\n`
    } else if (line.trim().startsWith('## ')) {
      result += `${line.replace(/^## /, '')}\n\n`
    } else if (line.trim()) {
      result += `${line}\n\n`
    }
  }
  result += `${content.conclusion}\n\n`
  if (content.cta) {
    result += `Call to Action: ${content.cta}\n\n`
  }
  return result.trim()
}

function getCost(usage?: { prompt_tokens?: number; completion_tokens?: number }) {
  if (!usage) return null
  // GPT-4o pricing as of June 2024: $0.005/1K input, $0.015/1K output
  const input = usage.prompt_tokens || 0
  const output = usage.completion_tokens || 0
  const inputCost = (input / 1000) * 0.005
  const outputCost = (output / 1000) * 0.015
  const total = inputCost + outputCost
  if (total > 0) {
    const inr = total * 83
    return `$${total.toFixed(4)} USD (₹${inr.toFixed(2)} INR)`
  }
  return null
}

export default function BlogPreview({ content }: BlogPreviewProps) {
  // Calculate word count
  const wordCount = useMemo(() => {
    const allText = [content.intro, ...(Array.isArray(content.body) ? content.body : [content.body]), content.conclusion, content.cta || ''].join(' ')
    return allText.split(/\s+/).filter(Boolean).length
  }, [content])

  const cost = getCost(content.usage)

  // Download as TXT with proper line breaks
  const downloadBlog = () => {
    const blogText = getPlainText(content)
    const blob = new Blob([blogText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Copy to clipboard with proper line breaks
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getPlainText(content))
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 bg-white">
      {/* Word Count & Cost */}
      <div className="mb-2 text-xs text-gray-500 font-medium">
        Word count: {wordCount}
        {cost && <span className="ml-4">• Cost: {cost}</span>}
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

      {/* Intro */}
      <section className="mb-5">
        <p className="text-base text-gray-900 leading-relaxed mb-3">{content.intro}</p>
      </section>

      {/* Body Paragraphs & Headings */}
      <section className="mb-5">
        {renderBody(content.body)}
      </section>

      {/* Conclusion */}
      <section className="mb-5">
        <p className="text-base text-gray-900 leading-relaxed mb-3 font-semibold">{content.conclusion}</p>
      </section>

      {/* CTA */}
      {content.cta && (
        <section className="mt-8">
          <div className="bg-black text-white rounded-lg px-6 py-4 text-center text-base font-semibold">
            {content.cta}
          </div>
        </section>
      )}

      {/* Export Options */}
      <div className="flex gap-2 pt-4 border-t border-gray-200 mt-8">
        <button
          onClick={downloadBlog}
          className="btn-primary px-4 py-2 text-xs hover-lift"
        >
          Download TXT
        </button>
        <button
          onClick={copyToClipboard}
          className="btn-secondary px-4 py-2 text-xs hover-lift"
        >
          Copy All
        </button>
      </div>
    </div>
  )
} 