'use client'

import { BlogFormData } from '@/types/blog'
import { Settings, Target, Zap } from 'lucide-react'

interface BlogTypeSelectorProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
}

export default function BlogTypeSelector({ formData, updateFormData }: BlogTypeSelectorProps) {
  const blogTypes = [
    { value: 'Listicle', label: 'Listicle', description: 'Numbered lists and bullet points', icon: '📋' },
    { value: 'Informative', label: 'Informative', description: 'Educational and comprehensive content', icon: '📚' },
    { value: 'Solution-based', label: 'Solution-based', description: 'Problem-solving focused content', icon: '🔧' },
    { value: 'How-to', label: 'How-to', description: 'Step-by-step instructional content', icon: '📖' },
    { value: 'Case Study', label: 'Case Study', description: 'Real-world examples and analysis', icon: '📊' },
  ]

  const wordCounts = [
    { value: '300-500', label: '300-500 words', description: 'Short and concise' },
    { value: '500-800', label: '500-800 words', description: 'Standard blog post' },
    { value: '800-1200', label: '800-1200 words', description: 'Comprehensive content' },
    { value: '1500+', label: '1500+ words', description: 'In-depth article' },
  ]

  const paragraphs = [
    { value: '3-5', label: '3-5 paragraphs', description: 'Brief content' },
    { value: '5-7', label: '5-7 paragraphs', description: 'Standard length' },
    { value: '7+', label: '7+ paragraphs', description: 'Detailed content' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <Settings className="w-5 h-5 text-black mr-2" />
          <h2 className="heading-2 text-black">
            Blog Configuration
          </h2>
        </div>
        <p className="body-text text-gray-600 max-w-lg mx-auto">
          Choose the format, length, and structure for your blog content.
        </p>
      </div>

      {/* Blog Type */}
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <Target className="w-4 h-4 text-blue-500 mr-2" />
          <h3 className="heading-3 text-black">
            Blog Format
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {blogTypes.map((type) => (
            <div
              key={type.value}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover-lift ${
                formData.blogType === type.value
                  ? 'border-blue-500 bg-blue-50 shadow-uber'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => updateFormData({ blogType: type.value as BlogFormData['blogType'] })}
            >
              <div className="flex items-start">
                <div className="text-lg mr-3">{type.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-black mb-1 text-sm">{type.label}</div>
                  <div className="text-xs text-gray-600">{type.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Word Count */}
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <Zap className="w-4 h-4 text-blue-500 mr-2" />
          <h3 className="heading-3 text-black">
            Word Count
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {wordCounts.map((count) => (
            <div
              key={count.value}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover-lift ${
                formData.wordCount === count.value
                  ? 'border-blue-500 bg-blue-50 shadow-uber'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => updateFormData({ wordCount: count.value as BlogFormData['wordCount'] })}
            >
              <div className="font-semibold text-black mb-1 text-sm">{count.label}</div>
              <div className="text-xs text-gray-600">{count.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Paragraphs */}
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
          <h3 className="heading-3 text-black">
            Number of Paragraphs
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {paragraphs.map((para) => (
            <div
              key={para.value}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover-lift ${
                formData.paragraphs === para.value
                  ? 'border-blue-500 bg-blue-50 shadow-uber'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => updateFormData({ paragraphs: para.value as BlogFormData['paragraphs'] })}
            >
              <div className="font-semibold text-black mb-1 text-sm">{para.label}</div>
              <div className="text-xs text-gray-600">{para.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Temperature Control */}
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mr-2"></div>
          <h3 className="heading-3 text-black">
            Creativity Level
          </h3>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Conservative</span>
              <span className="text-xs font-medium text-gray-600">Creative</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0.7"
                max="1.0"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => updateFormData({ temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(formData.temperature - 0.7) / 0.3 * 100}%, #E5E7EB ${(formData.temperature - 0.7) / 0.3 * 100}%, #E5E7EB 100%)`
                }}
              />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-black">
                Temperature: {formData.temperature}
              </span>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 text-left">
              <strong>What does Creativity Level do?</strong><br/>
              Lower values (Conservative) make the writing more factual and predictable. Higher values (Creative) make the writing more varied, imaginative, and risk-taking. Adjust this to control how creative or safe the AI's writing style will be.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 