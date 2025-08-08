'use client'

import { useState, useEffect } from 'react'
import { BlogFormData, ModelInfo } from '@/types/blog'
import { Cpu, Database, DollarSign, Loader2 } from 'lucide-react'
import ApiProviderSelector from './ApiProviderSelector'

interface ModelSelectorProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
  generatedTitles?: string[]
  setGeneratedTitles?: (titles: string[]) => void
}

export default function ModelSelector({ formData, updateFormData }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Fetch models when provider changes
  useEffect(() => {
    if (formData.apiProvider) {
      fetchModels(formData.apiProvider)
    }
  }, [formData.apiProvider])

  const fetchModels = async (provider: string) => {
    setLoading(true)
    setError('')
    
    try {
      console.log(`Fetching models for provider: ${provider}`)
      const response = await fetch(`/api/models?provider=${provider}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      
      const data = await response.json()
      setModels(data.models || [])
      
      // Debug: Log all available model IDs
      console.log(`[models] Available model IDs for ${provider}:`, data.models?.map((m: ModelInfo) => m.id) || [])
      
      // Auto-select first model if current model is not in the list
      if (data.models && data.models.length > 0) {
        const currentModelExists = data.models.some((model: ModelInfo) => model.id === formData.model)
        if (!currentModelExists) {
          const firstModel = data.models[0]
          updateFormData({ 
            model: firstModel.id,
            selectedModel: firstModel
          })
        } else {
          // Update selectedModel with current model info
          const currentModel = data.models.find((model: ModelInfo) => model.id === formData.model)
          if (currentModel) {
            updateFormData({ selectedModel: currentModel })
          }
        }
      }
      
      console.log(`Loaded ${data.models.length} models for ${provider}`)
    } catch (error) {
      console.error('Error fetching models:', error)
      setError('Failed to load models. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectModel = (model: ModelInfo) => {
    updateFormData({ 
      model: model.id,
      selectedModel: model
    })
    console.log(`Selected model: ${model.name} (${model.id})`)
  }

  const calculateCost = (model: ModelInfo, inputTokens: number = 1000, outputTokens: number = 1000) => {
    const inputCost = (inputTokens / 1000) * model.pricing.input
    const outputCost = (outputTokens / 1000) * model.pricing.output
    const total = inputCost + outputCost
    return total > 0 ? `$${total.toFixed(6)}` : '$0.000000'
  }

  const getUsageLabel = (type: string) => {
    switch (type) {
      case 'chat': return 'Chat/Conversation';
      case 'code': return 'Code Generation';
      case 'embedding': return 'Embeddings/Search';
      case 'rerank': return 'Reranking';
      case 'vision': return 'Vision/Image';
      case 'text-to-speech': return 'Text-to-Speech';
      case 'audio': return 'Audio';
      default: return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Other';
    }
  }

  // State for featured models
  const [featuredModels, setFeaturedModels] = useState<ModelInfo[]>([])

  // Fetch featured models when provider changes
  useEffect(() => {
    if (formData.apiProvider) {
      fetchFeaturedModels(formData.apiProvider)
    }
  }, [formData.apiProvider])

  const fetchFeaturedModels = async (provider: string) => {
    try {
      console.log(`Fetching featured models for provider: ${provider}`)
      const response = await fetch(`/api/featured-models?provider=${provider}`)
      
      if (!response.ok) {
        console.warn('Failed to fetch featured models, will use all models')
        setFeaturedModels([])
        return
      }
      
      const data = await response.json()
      setFeaturedModels(data.featuredModels || [])
      
      console.log(`Loaded ${data.featuredModels.length} featured models for ${provider}`)
    } catch (error) {
      console.error('Error fetching featured models:', error)
      setFeaturedModels([])
    }
  }

  // Filter models by search
  const filteredModels = models.filter((model) => {
    const q = search.toLowerCase()
    return (
      model.name.toLowerCase().includes(q) ||
      (model.description && model.description.toLowerCase().includes(q)) ||
      (model.author && model.author.toLowerCase().includes(q)) ||
      (model.type && model.type.toLowerCase().includes(q))
    )
  })

  // Separate featured and regular models
  const featuredModelIds = featuredModels.map(model => model.id)
  const filteredFeaturedModels = filteredModels.filter(model => featuredModelIds.includes(model.id))
  const regularModels = filteredModels.filter(model => !featuredModelIds.includes(model.id))
  
  // Debug: Log featured model matching
  console.log(`[models] Featured model IDs:`, featuredModelIds)
  console.log(`[models] Found featured models:`, filteredFeaturedModels.map(m => m.id))
  console.log(`[models] Missing featured models:`, featuredModelIds.filter((id: string) => !filteredFeaturedModels.some(m => m.id === id)))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <Database className="w-5 h-5 text-black mr-2" />
          <h2 className="heading-2 text-black">
            Select AI Model
          </h2>
        </div>
        <p className="body-text text-gray-600 max-w-lg mx-auto">
          Choose the AI model that best fits your content generation needs.
        </p>
      </div>

      {/* API Provider Selection */}
      <ApiProviderSelector formData={formData} updateFormData={updateFormData} />

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search models by name, type, or description..."
          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600">Loading available models...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Models Grid */}
      {!loading && filteredModels.length > 0 && (
        <div className="space-y-6">
          {/* Featured Models */}
          {filteredFeaturedModels.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="heading-3 text-black flex items-center">
                  <span className="text-yellow-500 mr-2">⭐</span>
                  Featured Models ({filteredFeaturedModels.length})
                </h3>
                <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded-full">
                  Popular & Reliable
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeaturedModels.map((model) => (
                  <div
                    key={model.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover-lift ${
                      formData.model === model.id
                        ? 'border-blue-500 bg-blue-50 shadow-uber'
                        : 'border-yellow-200 hover:border-yellow-300 bg-yellow-50'
                    }`}
                    onClick={() => selectModel(model)}
                  >
                    <div className="space-y-3">
                      {/* Model Name and Description */}
                      <div>
                        <div className="font-semibold text-black mb-1 text-sm flex items-center">
                          {model.name}
                          <span className="text-yellow-500 ml-1">⭐</span>
                        </div>
                        {model.description && <div className="text-xs text-gray-600">{model.description}</div>}
                      </div>
                      {/* Author and Type */}
                      <div className="flex items-center text-xs text-gray-500 gap-2">
                        {model.author && <span>By {model.author}</span>}
                        {model.type && <span className="px-2 py-0.5 bg-blue-100 rounded-full text-blue-700 font-semibold">{getUsageLabel(model.type)}</span>}
                      </div>
                      {/* Pricing Info */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center text-gray-500">
                          <DollarSign className="w-3 h-3 mr-1" />
                          <span>~{calculateCost(model)} per 1K tokens</span>
                        </div>
                        {formData.model === model.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      {/* Model ID (small) */}
                      <div className="text-xs text-gray-400 font-mono">
                        {model.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Other Models */}
          {regularModels.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="heading-3 text-black">
                  All Models ({regularModels.length})
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {regularModels.map((model) => (
                  <div
                    key={model.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover-lift ${
                      formData.model === model.id
                        ? 'border-blue-500 bg-blue-50 shadow-uber'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => selectModel(model)}
                  >
                    <div className="space-y-3">
                      {/* Model Name and Description */}
                      <div>
                        <div className="font-semibold text-black mb-1 text-sm">{model.name}</div>
                        {model.description && <div className="text-xs text-gray-600">{model.description}</div>}
                      </div>
                      {/* Author and Type */}
                      <div className="flex items-center text-xs text-gray-500 gap-2">
                        {model.author && <span>By {model.author}</span>}
                        {model.type && <span className="px-2 py-0.5 bg-blue-100 rounded-full text-blue-700 font-semibold">{getUsageLabel(model.type)}</span>}
                      </div>
                      {/* Pricing Info */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center text-gray-500">
                          <DollarSign className="w-3 h-3 mr-1" />
                          <span>~{calculateCost(model)} per 1K tokens</span>
                        </div>
                        {formData.model === model.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      {/* Model ID (small) */}
                      <div className="text-xs text-gray-400 font-mono">
                        {model.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Model Info */}
      {formData.selectedModel && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
            <div>
              <h4 className="font-semibold text-black mb-1 text-sm">Selected Model</h4>
              <p className="text-sm text-gray-700 mb-2">{formData.selectedModel.name}</p>
              <div className="text-xs text-gray-600">
                <div>Input: ${formData.selectedModel.pricing.input}/1K tokens</div>
                <div>Output: ${formData.selectedModel.pricing.output}/1K tokens</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredModels.length === 0 && !error && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Database className="w-6 h-6 text-gray-400" />
          </div>
          <p className="body-text text-gray-500 mb-1">No models available</p>
          <p className="caption">Please check your API configuration</p>
        </div>
      )}
    </div>
  )
}
