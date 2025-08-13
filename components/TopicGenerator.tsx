'use client'

import { useState } from 'react'
import { BlogFormData } from '@/types/blog'
import { Lightbulb, Check, Copy, Download, FileText, Loader2 } from 'lucide-react'
import { getOpenAIPricing, getTogetherPricing } from '@/lib/model-utils'

// Helper function to organize blog structure in proper order
const organizeBlogStructure = (sections: string[]): string[] => {
  const organized: string[] = []
  const remaining: string[] = []
  
  // Always start with Introduction if it exists
  const introIndex = sections.findIndex(section => 
    section.toLowerCase().includes('introduction') || 
    section.toLowerCase().includes('intro')
  )
  if (introIndex !== -1) {
    organized.push(sections[introIndex])
    sections.splice(introIndex, 1)
  }
  
  // Always end with Conclusion if it exists
  const conclusionIndex = sections.findIndex(section => 
    section.toLowerCase().includes('conclusion') || 
    section.toLowerCase().includes('conclude')
  )
  if (conclusionIndex !== -1) {
    const conclusionSection = sections[conclusionIndex]
    sections.splice(conclusionIndex, 1)
    // Add conclusion at the end
    remaining.push(conclusionSection)
  }
  
  // Add remaining sections in the middle (body)
  organized.push(...sections)
  
  // Add conclusion at the end if it exists
  organized.push(...remaining)
  
  return organized
}

interface TopicGeneratorProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
  generatedTitles: string[]
  setGeneratedTitles: (titles: string[]) => void
  currentSessionId: string | null
  sessionSteps: {
    titleGenerated: boolean
    blogGenerated: boolean
    humanized: boolean
  }
  setSessionSteps: (steps: any) => void
  contentStructure: string | null
  setContentStructure: (structure: string | null) => void
}

export default function TopicGenerator({ 
  formData, 
  updateFormData, 
  generatedTitles, 
  setGeneratedTitles, 
  currentSessionId, 
  sessionSteps, 
  setSessionSteps, 
  contentStructure, 
  setContentStructure 
}: TopicGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [cost, setCost] = useState<string | null>(null)
  const [apiProvider, setApiProvider] = useState<string | null>(null)
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false)
  const [structureCost, setStructureCost] = useState<string | null>(null)
  const [showCustomStrategy, setShowCustomStrategy] = useState(false)
  const [activeStructureType, setActiveStructureType] = useState<'generated' | 'custom' | null>(null)
  const [appliedStructure, setAppliedStructure] = useState<'generated' | 'custom' | null>(null)

  const emphasisTypes = [
    'Keyword Emphasis',
    'Concept Emphasis',
    'Solution Emphasis',
    'Viral Emphasis',
    'Hybrid Emphasis'
  ]

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
        // OpenAI pricing is per 1M tokens
        inputCost = (input / 1000000) * pricing.input
        outputCost = (output / 1000000) * pricing.output
        console.log(`[cost] Using per_1M_tokens calculation`)
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
    if (!currentSessionId) {
      setError('Please start a new blog first')
      return
    }

    if (sessionSteps.titleGenerated) {
      setError('Titles have already been generated in this blog')
      return
    }

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
          tone: formData.tone,
          sessionId: currentSessionId
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

      // Mark titles as generated in session
      setSessionSteps((prev: any) => ({ ...prev, titleGenerated: true }))
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

  const generateContentStructure = async () => {
    if (!currentSessionId) {
      setError('Please start a new blog first')
      return
    }

    if (!formData.selectedTitle) {
      setError('Please select a title first')
      return
    }

    if (formData.keywords.length === 0) {
      setError('Please add keywords first')
      return
    }

    // Clear any existing content structure before generating new one
    setContentStructure(null)
    setIsGeneratingStructure(true)
    setError('')
    setStructureCost(null)

    try {
      console.log(`Generating content structure using ${formData.apiProvider} with model: ${formData.model}`)
      console.log(`Keywords: ${formData.keywords.join(', ')}`)
      console.log(`Title: ${formData.selectedTitle}`)
      
      const response = await fetch('/api/generate-content-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.selectedTitle,
          keywords: formData.keywords,
          blogType: formData.blogType,
          apiProvider: formData.apiProvider,
          model: formData.model,
          tone: formData.tone,
          wordCount: formData.wordCount,
          paragraphs: formData.paragraphs,
          sessionId: currentSessionId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content structure')
      }

      const data = await response.json()
      console.log('Generated structure:', data.structure)
      setContentStructure(data.structure)
      setActiveStructureType('generated')
      setAppliedStructure(null)
      
      // Calculate cost based on provider
      if (data.usage) {
        const calculatedCost = await calculateCost(data.usage, formData.apiProvider, formData.model)
        setStructureCost(calculatedCost)
        console.log(`Generated content structure using ${formData.apiProvider} (${formData.model})`)
        console.log(`Token usage: ${data.usage.prompt_tokens} input, ${data.usage.completion_tokens} output`)
        console.log(`Estimated cost: ${calculatedCost}`)
      } else {
        setStructureCost(null)
      }
    } catch (error: any) {
      console.error('Error generating content structure:', error)
      setError('Failed to generate content structure. Please try again.')
    } finally {
      setIsGeneratingStructure(false)
    }
  }

  const clearContentStructure = () => {
    setContentStructure(null)
    setStructureCost(null)
    setError('')
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
      {!currentSessionId ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="heading-2 text-gray-600 mb-4">Blog Creation Required</h2>
          <p className="body-text text-gray-500 mb-6">
            Please start a new blog to begin generating titles.
          </p>
        </div>
      ) : (
        <>
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
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
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
                      ${formData.selectedModel.pricing.input}/1M input
                    </p>
                    <p className="text-xs text-gray-500">
                      ${formData.selectedModel.pricing.output}/1M output
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

            {/* Generate Content Structure Section */}
            {formData.selectedTitle && (
              <div className="space-y-4">
                {/* Structure Type Selection */}
                <div className="space-y-3 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose Structure Type:</label>
                  
                  {/* Radio Button 1: Generate Content Structure */}
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                    activeStructureType === 'generated' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      id="generateStructure"
                      name="structureType"
                      value="generated"
                      checked={activeStructureType === 'generated'}
                      onChange={() => {
                        setActiveStructureType('generated')
                        setShowCustomStrategy(false)
                        setAppliedStructure(null)
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="generateStructure" className={`text-sm font-medium cursor-pointer ${
                      activeStructureType === 'generated' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      🔄 Generate Content Structure Outline
                    </label>
                  </div>
                  
                  {/* Radio Button 2: Create Custom Strategy */}
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                    activeStructureType === 'custom' 
                      ? 'border-purple-300 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      id="customStrategy"
                      name="structureType"
                      value="custom"
                      checked={activeStructureType === 'custom'}
                      onChange={() => {
                        console.log('Custom strategy radio selected!')
                        setActiveStructureType('custom')
                        setShowCustomStrategy(false)
                        setAppliedStructure(null)
                      }}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <label htmlFor="customStrategy" className={`text-sm font-medium cursor-pointer ${
                      activeStructureType === 'custom' ? 'text-purple-700' : 'text-gray-700'
                    }`}>
                      🎯 Create Custom Content Outline
                    </label>
                  </div>
                  
                  {/* Radio Button 3: None (Deselect) */}
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                    activeStructureType === null 
                      ? 'border-gray-300 bg-gray-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      id="none"
                      name="structureType"
                      value=""
                      checked={activeStructureType === null}
                      onChange={() => {
                        setActiveStructureType(null)
                        setShowCustomStrategy(false)
                        setAppliedStructure(null)
                      }}
                      className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500"
                    />
                    <label htmlFor="none" className={`text-sm font-medium cursor-pointer ${
                      activeStructureType === null ? 'text-gray-700' : 'text-gray-500'
                    }`}>
                      ❌ None (Clear Selection)
                    </label>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3 mb-4">
                  {/* Generate Content Structure Button */}
                  {activeStructureType === 'generated' && (
                    <button
                      onClick={generateContentStructure}
                      disabled={isGeneratingStructure}
                      className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingStructure ? '🔄 Generating...' : '🚀 Generate Content Structure Outline'}
                    </button>
                  )}
                  
                  {/* Create Custom Strategy Button */}
                  {activeStructureType === 'custom' && (
                    <button
                      onClick={() => {
                        console.log('Custom strategy button clicked!')
                        setShowCustomStrategy(true)
                      }}
                      className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                    >
                      ✏️ Create Custom Content Outline
                    </button>
                  )}
                </div>

                {/* Custom Strategy Form - Display when showCustomStrategy is true */}
                {showCustomStrategy && (
                  <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900 text-sm">🎯 Create Custom Strategy</h5>
                      <button
                        onClick={() => setShowCustomStrategy(false)}
                        className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        ← Back
                      </button>
                    </div>
                    
                    {/* Custom Strategy Input Fields */}
                    <div className="space-y-3">
                      {/* Title Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title:</label>
                        <input
                          type="text"
                          id="customTitle"
                          placeholder="Enter your blog title"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      {/* Words Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Words:</label>
                        <input
                          type="text"
                          id="customWords"
                          placeholder="e.g., 1500+"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      {/* Paragraphs Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Paragraphs:</label>
                        <input
                          type="text"
                          id="customParagraphs"
                          placeholder="e.g., 5-7"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      {/* Content Structure Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Content Structure:</label>
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              id="customStructure"
                              placeholder="e.g., Introduction, Main Point 1, Main Point 2, Conclusion (add all sections you want)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById('customStructure') as HTMLInputElement
                                const value = input.value.trim()
                                if (value) {
                                  // Add to the list below
                                  const listContainer = document.getElementById('customStructureList')
                                  if (listContainer) {
                                    const newItem = document.createElement('div')
                                    newItem.className = 'flex items-center justify-between bg-gray-50 px-3 py-2 rounded border'
                                    newItem.innerHTML = `
                                      <span class="text-sm text-gray-700">${value}</span>
                                      <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 text-xs">×</button>
                                    `
                                    listContainer.appendChild(newItem)
                                    input.value = ''
                                  }
                                }
                              }}
                              className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              +
                            </button>
                          </div>
                          <div id="customStructureList" className="space-y-1">
                            {/* Dynamic list items will be added here */}
                          </div>
                          <p className="text-xs text-gray-500">
                            💡 Add each section one by one. The system will automatically organize them in proper blog order:
                            <br />• Introduction (will be placed first)
                            <br />• Your main points (will be placed in the middle)
                            <br />• Conclusion (will be placed last)
                          </p>
                        </div>
                      </div>
                      
                      {/* Apply Custom Strategy Button */}
                      <button
                        onClick={() => {
                          const title = (document.getElementById('customTitle') as HTMLInputElement)?.value.trim()
                          const words = (document.getElementById('customWords') as HTMLInputElement)?.value.trim()
                          const paragraphs = (document.getElementById('customParagraphs') as HTMLInputElement)?.value.trim()
                          const structureList = document.getElementById('customStructureList')
                          
                          if (title && words && paragraphs && structureList) {
                            // Build custom structure
                            const structureItems = Array.from(structureList.children).map(item => 
                              item.querySelector('span')?.textContent || ''
                            ).filter(text => text.trim() !== '')
                            
                            if (structureItems.length > 0) {
                              // Calculate word count per section more evenly
                              const wordsPerSection = Math.round(parseInt(words) / structureItems.length)
                              
                              // Organize sections in proper blog order
                              const organizedStructure = organizeBlogStructure(structureItems)
                              
                              const customStructure = [
                                `Title: ${title}`,
                                ...organizedStructure.map((item, index) => `${item} (${wordsPerSection} words)`)
                              ].join('\n')
                              
                              // Update form data with custom values
                              updateFormData({
                                selectedTitle: title,
                                wordCount: words as '300-500' | '500-800' | '800-1200' | '1500+',
                                paragraphs: paragraphs as '3-5' | '5-7' | '7+'
                              })
                              
                              // Set the custom structure
                              setContentStructure(customStructure)
                              setActiveStructureType('custom')
                              setAppliedStructure('custom')
                              
                              // Clear inputs
                              ;(document.getElementById('customTitle') as HTMLInputElement).value = ''
                              ;(document.getElementById('customWords') as HTMLInputElement).value = ''
                              ;(document.getElementById('customParagraphs') as HTMLInputElement).value = ''
                              structureList.innerHTML = ''
                              
                              // Hide the form
                              setShowCustomStrategy(false)
                              
                              // Show success message
                              console.log('Custom strategy applied successfully!')
                            } else {
                              console.error('Please add at least one content structure item')
                            }
                          } else {
                            console.error('Please fill in all fields')
                          }
                        }}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      >
                        Apply Custom Strategy
                      </button>
                    </div>
                  </div>
                )}

                {/* Content Structure Display */}
                {contentStructure && contentStructure.trim() !== '' && contentStructure.length > 10 ? (
                  <div className="space-y-3">
                    {/* API Provider and Cost Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                      <div className="flex items-center space-x-4">
                        {apiProvider && (
                          <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-purple-500 mr-1"></span>
                            Structure generated with {apiProvider === 'openai' ? 'OpenAI' : 'Together.ai'} ({formData.model})
                          </span>
                        )}
                        {structureCost && <span>Cost: {structureCost}</span>}
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-900 text-sm">📋 Content Structure Outline</h4>
                      </div>
                      <div className="text-xs text-gray-500 mb-3 text-center">
                        💡 Click edit icon to modify headings
                      </div>
                      
                       {/* Current Form Data Display */}
                       <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                         <h5 className="text-xs font-medium text-gray-700 mb-2">📋 Current Active Settings:</h5>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                           <div className="flex items-center space-x-1">
                             <span className="text-gray-500">Type:</span>
                             <span className="font-medium text-gray-700">{formData.blogType}</span>
                           </div>
                           <div className="flex items-center space-x-1">
                             <span className="text-gray-500">Tone:</span>
                             <span className="font-medium text-gray-700">{formData.tone?.type} ({formData.tone?.subtype})</span>
                           </div>
                           <div className="flex items-center space-x-1">
                             <span className="text-gray-500">Words:</span>
                             <span className="font-medium text-gray-700">{formData.wordCount}</span>
                           </div>
                           <div className="flex items-center space-x-1">
                             <span className="text-gray-500">Paragraphs:</span>
                             <span className="font-medium text-gray-700">{formData.paragraphs}</span>
                           </div>
                         </div>
                         <div className="mt-2 pt-2 border-t border-gray-200">
                           <div className="flex items-center space-x-1">
                             <span className="text-gray-500">Title:</span>
                             <span className="font-medium text-gray-700">{formData.selectedTitle}</span>
                           </div>
                           <div className="mt-1 flex items-center space-x-1">
                             <span className="text-gray-500">Keywords:</span>
                             <span className="font-medium text-gray-700">{formData.keywords.join(', ')}</span>
                           </div>
                         </div>
                         
                         {/* Active Structure Status */}
                         {appliedStructure && (
                           <div className="mt-2 pt-2 border-t border-gray-200">
                             <div className="flex items-center space-x-1">
                               <span className="text-gray-500">Applied Structure:</span>
                               <span className={`font-medium ${
                                 appliedStructure === 'generated' ? 'text-blue-600' : 'text-purple-600'
                               }`}>
                                 {appliedStructure === 'generated' ? '🔄 AI Generated' : '🎯 Custom Strategy'}
                               </span>
                             </div>
                           </div>
                         )}
                       </div>
                       
                       {/* Show Generated Structure ONLY when 'generated' is selected */}
                       {activeStructureType === 'generated' && (
                         <div className="space-y-2 mb-4">
                           <h5 className="text-xs font-medium text-gray-700 mb-2">📋 Generated Content Structure:</h5>
                           {contentStructure!.split('\n')
                             .filter(line => line.trim() !== '') // Filter out empty lines
                             .map((line, index) => (
                             <div 
                               key={index} 
                               className="card hover:shadow-md transition-all duration-200 group"
                             >
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center space-x-2">
                                   <div className="text-gray-400 text-xs font-mono">#{index + 1}</div>
                                   <div className="text-sm text-gray-700 leading-relaxed select-text flex-1">
                                     {/* Show only the heading text, remove word count */}
                                     {(() => {
                                       const parts = line.split('(')
                                       if (parts.length === 2) {
                                         const textPart = parts[0].trim()
                                         return (
                                           <span 
                                             data-line={index}
                                             data-text-only="true"
                                             className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                             title="Click to edit heading text only"
                                           >
                                             {textPart}
                                           </span>
                                         )
                                       }
                                       return line
                                     })()}
                                   </div>
                                 </div>
                                 <div className="flex items-center space-x-1">
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation()
                                       // Enable inline editing for text part only
                                       const textElement = e.currentTarget.closest('.card')?.querySelector('[data-text-only]') as HTMLElement
                                       if (textElement) {
                                         textElement.contentEditable = 'true'
                                         textElement.focus()
                                         textElement.classList.add('ring-1', 'ring-gray-300', 'ring-inset', 'bg-white', 'px-3', 'py-2', 'rounded-md', 'border', 'border-gray-200', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:border-blue-500')
                                         
                                         // Handle save on blur or enter key
                                         const handleSave = () => {
                                           textElement.contentEditable = 'false'
                                           textElement.classList.remove('ring-1', 'ring-gray-300', 'ring-inset', 'bg-white', 'px-3', 'py-2', 'rounded-md', 'border', 'border-gray-200', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:border-blue-500')
                                           
                                           // Update only the text part, preserve word count in backend
                                           const newLines = contentStructure!.split('\n')
                                           const currentLine = newLines[index]
                                           const parts = currentLine.split('(')
                                           if (parts.length === 2) {
                                             const newText = textElement.textContent || parts[0].trim()
                                             const wordCountPart = parts[1]
                                             newLines[index] = `${newText} (${wordCountPart}`
                                           } else {
                                             newLines[index] = textElement.textContent || currentLine
                                           }
                                           setContentStructure(newLines.join('\n'))
                                         }
                                         
                                         textElement.addEventListener('blur', handleSave, { once: true })
                                         textElement.addEventListener('keydown', (e: KeyboardEvent) => {
                                           if (e.key === 'Enter') {
                                             e.preventDefault()
                                             handleSave()
                                           }
                                         }, { once: true })
                                       }
                                     }}
                                     className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded"
                                     title="Edit heading text only (word count preserved)"
                                   >
                                     <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                     </svg>
                                   </button>
                                 </div>
                               </div>
                             </div>
                           ))}
                           
                           {/* Apply Generated Structure Button */}
                           <div className="text-center mt-3">
                             <button
                               onClick={() => {
                                 setActiveStructureType('generated')
                                 setAppliedStructure('generated')
                               }}
                               className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                                 appliedStructure === 'generated' 
                                   ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500' 
                                   : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500'
                               }`}
                             >
                               {appliedStructure === 'generated' ? '✅ Applied' : '🔵 Apply'}
                             </button>
                           </div>
                         </div>
                       )}
                       
                       {/* Show Custom Structure when 'custom' is selected */}
                       {activeStructureType === 'custom' && (
                         <div className="space-y-2 mb-4">
                           <h5 className="text-xs font-medium text-gray-700 mb-2">📋 Custom Content Structure:</h5>
                           {contentStructure!.split('\n')
                             .filter(line => line.trim() !== '') // Filter out empty lines
                             .map((line, index) => (
                             <div 
                               key={index} 
                               className="card hover:shadow-md transition-all duration-200 group"
                             >
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center space-x-2">
                                   <div className="text-gray-400 text-xs font-mono">#{index + 1}</div>
                                   <div className="text-sm text-gray-700 leading-relaxed select-text flex-1">
                                     {line}
                                   </div>
                                 </div>
                               </div>
                             </div>
                           ))}
                           
                           {/* Apply Custom Structure Button */}
                           <div className="text-center mt-3">
                             <button
                               onClick={() => {
                                 setActiveStructureType('custom')
                                 setAppliedStructure('custom')
                               }}
                               className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                                 appliedStructure === 'custom' 
                                   ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500' 
                                   : 'bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-500'
                               }`}
                             >
                               {appliedStructure === 'custom' ? '✅ Applied' : '🎯 Apply'}
                             </button>
                           </div>
                         </div>
                       )}

                     </div>
                   </div>
                 ) : null}
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
        </>
      )}
    </div>
  )
}
