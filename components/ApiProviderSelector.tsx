'use client'

import { BlogFormData } from '@/types/blog'
import { Cpu } from 'lucide-react'

interface ApiProviderSelectorProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
}

export default function ApiProviderSelector({ formData, updateFormData }: ApiProviderSelectorProps) {
  const apiProviders = [
    { value: 'openai', label: 'OpenAI', description: 'GPT-4 and GPT-3.5 models', icon: '🤖' },
    { value: 'together', label: 'Together.ai', description: 'Open source models', icon: '🔗' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Cpu className="w-4 h-4 text-blue-500 mr-2" />
        <h3 className="heading-3 text-black">
          AI Provider
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {apiProviders.map((provider) => (
          <div
            key={provider.value}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover-lift ${
              formData.apiProvider === provider.value
                ? 'border-blue-500 bg-blue-50 shadow-uber'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onClick={() => {
              updateFormData({ 
                apiProvider: provider.value as BlogFormData['apiProvider'],
                model: provider.value === 'openai' ? 'gpt-4o' : 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
                selectedModel: undefined // Reset selected model when provider changes
              })
            }}
          >
            <div className="flex items-start">
              <div className="text-lg mr-3">{provider.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-black mb-1 text-sm">{provider.label}</div>
                <div className="text-xs text-gray-600">{provider.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 