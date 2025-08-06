'use client'

import { useState } from 'react'
import { Sparkles, Users, Zap, Copy, Download, CheckCircle, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ProtectedRoute from '@/components/ProtectedRoute'

interface HumanizedContent {
  output: string;
  new_flesch_score: number;
  credits_consumed?: number;
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

// Function to format text with proper paragraphs
function formatTextWithParagraphs(text: string) {
  // Split by double newlines to preserve paragraph breaks
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.map((paragraph, index) => (
    <p key={index} className="text-gray-800 leading-relaxed mb-3">
      {paragraph.trim()}
    </p>
  ));
}

// Function to calculate word count
function calculateWordCount(text: string) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// Fixed word limit
const WORD_LIMIT = 2000;

export default function AIHumanizePage() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState<HumanizedContent | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)

  const inputWordCount = calculateWordCount(inputText);
  const isOverLimit = inputWordCount > WORD_LIMIT;
  const canSubmit = inputText.trim() && !isOverLimit;

  const handleHumanize = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to humanize')
      return
    }

    if (isOverLimit) {
      toast.error(`Word limit exceeded. Maximum ${WORD_LIMIT} words allowed.`)
      return
    }
    
    setIsProcessing(true)
    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: inputText,
          sessionId: `humanize_${Date.now()}`
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setOutputText(data)
      toast.success('Content humanized successfully!')
    } catch (error: any) {
      console.error('Error humanizing content:', error)
      toast.error(`Failed to humanize content: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(stripMarkdown(text))
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      toast.error('Failed to copy text')
    }
  }

  const downloadText = (text: string, prefix: string = '') => {
    const cleanText = stripMarkdown(text)
    const blob = new Blob([cleanText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${prefix}humanized_content.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Download started!')
  }

  // Calculate word counts
  const outputWordCount = outputText ? calculateWordCount(outputText.output) : 0

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mr-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">AI Humanize</h1>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Transform AI-generated content into more natural, human-like text that maintains authenticity and readability.
            </p>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Section */}
              <div className="card shadow-uber">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Sparkles className="w-5 h-5 text-violet-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">Input Text</h2>
                  </div>
                  <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                    {inputWordCount}/{WORD_LIMIT} words
                  </div>
                </div>
                
                {/* Word Limit Warning */}
                {isOverLimit && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-700">
                      Word limit exceeded. Please reduce text to {WORD_LIMIT} words.
                    </span>
                  </div>
                )}
                
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your AI-generated content here to humanize it..."
                  className={`w-full h-80 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm ${
                    isOverLimit ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
                <button
                  onClick={handleHumanize}
                  disabled={isProcessing || !canSubmit}
                  className="mt-4 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Humanize Content
                    </>
                  )}
                </button>
              </div>

              {/* Output Section */}
              <div className="card shadow-uber">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-green-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">Humanized Output</h2>
                  </div>
                  {outputText && (
                    <div className="text-sm text-gray-500">
                      {outputWordCount} words
                    </div>
                  )}
                </div>
                <div className="w-full h-80 p-4 border border-gray-200 rounded-lg bg-gray-50 overflow-y-auto">
                  {outputText ? (
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {outputText.output}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm">Humanized content will appear here...</p>
                  )}
                </div>
                
                {/* Flesch Score - Outside below output box */}
                {outputText && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Flesch Score:</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-3 h-3 rounded-full ${getFleschScoreColor(outputText.new_flesch_score)}`}></div>
                          <span className="text-sm font-semibold text-gray-900">{outputText.new_flesch_score.toFixed(1)}</span>
                          <span className="text-sm text-gray-600">({getFleschScoreLabel(outputText.new_flesch_score)})</span>
                        </div>
                      </div>
                      {outputText.credits_consumed && (
                        <div className="text-sm text-gray-600">
                          Credits: <span className="font-medium text-blue-600">{outputText.credits_consumed}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {outputText && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => copyToClipboard(outputText.output)}
                      className="btn-secondary px-4 py-2 text-xs hover-lift flex items-center"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => downloadText(outputText.output, 'humanized_')}
                      className="btn-primary px-4 py-2 text-xs hover-lift flex items-center"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download TXT
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mt-12 card shadow-uber">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Natural Language</h4>
                  <p className="text-sm text-gray-600">Convert robotic text into natural, conversational language</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Readability Score</h4>
                  <p className="text-sm text-gray-600">Get Flesch readability scores to ensure content is easily digestible</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Quick Processing</h4>
                  <p className="text-sm text-gray-600">Instant transformation with advanced AI algorithms</p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="mt-8 card shadow-uber">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h3>
              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-baseline gap-3">
                  <div className="w-6 h-6 bg-violet-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <div className="flex-1">
                    <strong>Paste AI Content:</strong> Copy and paste any AI-generated text that needs to be made more human-like.
                  </div>
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="w-6 h-6 bg-violet-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <div className="flex-1">
                    <strong>Click Humanize:</strong> Our advanced AI analyzes and transforms the text to sound more natural and conversational.
                  </div>
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="w-6 h-6 bg-violet-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <div className="flex-1">
                    <strong>Get Results:</strong> Receive humanized content with a readability score and download or copy the improved text.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 