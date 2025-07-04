'use client'

import { useState } from 'react'
import { BlogFormData } from '@/types/blog'
import { Lightbulb, Check, Copy, Download } from 'lucide-react'

interface TopicGeneratorProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
}

export default function TopicGenerator({ formData, updateFormData }: TopicGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([])
  const [error, setError] = useState('')
  const [cost, setCost] = useState<string | null>(null)
  const [apiProvider, setApiProvider] = useState<string | null>(null)

  const emphasisTypes = [
    'Keyword Emphasis',
    'Concept Emphasis',
    'Solution Emphasis',
    'Viral Emphasis',
    'Hybrid Emphasis'
  ];

  // Cost calculation using real API pricing and usage data
  const calculateCost = async (usage: any, provider: string, model: string) => {
    if (!usage) return null
    
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
      
      console.log(`[cost] Pricing data:`, pricingData)
      console.log(`[cost] Units: ${units}, Pricing:`, pricing)
      console.log(`[cost] Token usage: ${input} input, ${output} output`)
      
      let inputCost = 0
      let outputCost = 0
      
      if (units === 'per_1M_tokens') {
        // Together.ai pricing is per 1M tokens
        inputCost = (input / 1000000) * pricing.input
        outputCost = (output / 1000000) * pricing.output
        console.log(`[cost] Using per_1M_tokens calculation`)
      } else {
        // OpenAI pricing is per 1K tokens
        inputCost = (input / 1000) * pricing.input
        outputCost = (output / 1000) * pricing.output
        console.log(`[cost] Using per_1K_tokens calculation`)
      }
      
      console.log(`[cost] Calculated costs: input=${inputCost}, output=${outputCost}`)
      
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



  const generateTitles = async () => {
    if (formData.keywords.length === 0) {
      setError('Please add keywords first')
      return
    }

    setIsGenerating(true)
    setError('')
    setCost(null)
    setApiProvider(null)

    try {
      console.log(`Generating titles using ${formData.apiProvider} with model: ${formData.model}`)
      
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: formData.keywords,
          blogType: formData.blogType,
          apiProvider: formData.apiProvider,
          model: formData.model,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate titles')
      }

      const data = await response.json()
      setGeneratedTitles((data.titles || []).map((t: any) => typeof t === 'string' ? t : t.title))
      
      // Set API provider for display
      setApiProvider(formData.apiProvider)
      
      // Calculate cost based on provider
      if (data.usage) {
        const calculatedCost = await calculateCost(data.usage, formData.apiProvider, formData.model)
        setCost(calculatedCost)
        console.log(`Generated ${data.titles.length} titles using ${formData.apiProvider} (${formData.model})`)
        console.log(`Token usage: ${data.usage.prompt_tokens} input, ${data.usage.completion_tokens} output`)
        console.log(`Estimated cost: ${calculatedCost}`)
      } else {
        setCost(null)
      }
    } catch (error) {
      console.error('Error generating titles:', error)
      setError('Failed to generate titles. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectTitle = (title: string) => {
    updateFormData({ selectedTitle: title })
  }

  const copyTitle = (title: string) => {
    navigator.clipboard.writeText(title)
  }

  const downloadTitles = () => {
    const content = generatedTitles.map((title, index) => `${index + 1}. ${title}`).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-titles.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <Lightbulb className="w-5 h-5 text-black mr-2" />
          <h2 className="heading-2 text-black">
            Generate Blog Titles
          </h2>
        </div>
        <p className="body-text text-gray-600 max-w-lg mx-auto">
          Generate compelling titles based on your keywords and blog type using the selected model.
        </p>
        
        {/* Model Information */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-black text-sm mb-1">Selected Model</h4>
              <p className="text-sm text-gray-700">
                {formData.selectedModel ? (
                  <>
                    <span className="font-medium">{formData.selectedModel.name}</span>
                    <span className="text-gray-500 ml-2">({formData.selectedModel.provider === 'openai' ? 'OpenAI' : 'Together.ai'})</span>
                  </>
                ) : (
                  <span className="text-gray-500">{formData.model} ({formData.apiProvider === 'openai' ? 'OpenAI' : 'Together.ai'})</span>
                )}
              </p>
            </div>
            {formData.selectedModel && (
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  ${formData.selectedModel.pricing.input}/{formData.selectedModel.provider === 'together' ? '1M' : '1K'} input
                </p>
                <p className="text-xs text-gray-500">
                  ${formData.selectedModel.pricing.output}/{formData.selectedModel.provider === 'together' ? '1M' : '1K'} output
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Generate Button */}
        <div className="text-center">
          <button
            onClick={generateTitles}
            disabled={isGenerating || formData.keywords.length === 0 || !formData.model}
            className="btn-primary px-6 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
          >
            {isGenerating ? (
              <div className="flex items-center">
                Generating Titles...
              </div>
            ) : (
              <div className="flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                Generate Titles
              </div>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Generated Titles */}
        {generatedTitles.length > 0 && (
          <div className="space-y-4">
            {/* API Provider and Cost Info */}
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <div className="flex items-center space-x-4">
                {apiProvider && (
                  <span className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                    Generated with {apiProvider === 'openai' ? 'OpenAI' : 'Together.ai'} ({formData.model})
                  </span>
                )}
                {cost && <span>Cost: {cost}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="heading-3 text-black">
                Generated Titles ({generatedTitles.length})
              </h3>
              <button
                onClick={downloadTitles}
                className="btn-secondary px-3 py-2 text-xs hover-lift"
              >
                <Download className="w-3 h-3 mr-1" />
                Download All
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {generatedTitles.map((title, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border cursor-pointer ${
                    formData.selectedTitle === title
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => selectTitle(title)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 mr-2">
                          #{index + 1}
                        </span>
                        {formData.selectedTitle === title && (
                          <Check className="w-4 h-4 text-blue-500 mr-2" />
                        )}
                      </div>
                      <h4 className="font-semibold text-black mb-2 text-sm leading-relaxed">
                        {title}
                      </h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Title Display */}
        {formData.selectedTitle && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-black mb-1 text-sm">Selected Title</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{formData.selectedTitle}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isGenerating && generatedTitles.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lightbulb className="w-6 h-6 text-gray-400" />
            </div>
            <p className="body-text text-gray-500 mb-1">No titles generated yet</p>
            <p className="caption">Click "Generate Titles" to create compelling blog titles</p>
          </div>
        )}
      </div>
    </div>
  )
} 