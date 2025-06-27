'use client'

import { useState } from 'react'
import KeywordInput from '@/components/KeywordInput'
import BlogTypeSelector from '@/components/BlogTypeSelector'
import TopicGenerator from '@/components/TopicGenerator'
import ReferenceInput from '@/components/ReferenceInput'
import BlogPreview from '@/components/BlogPreview'
import { BlogFormData, BlogContent } from '@/types/blog'
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'

export default function Home() {
  const [formData, setFormData] = useState<BlogFormData>({
    keywords: [],
    blogType: 'Informative',
    wordCount: '500-800',
    paragraphs: '5-7',
    selectedTitle: '',
    references: {
      files: [],
      urls: [],
      customText: ''
    },
    temperature: 0.8
  })

  const [generatedContent, setGeneratedContent] = useState<BlogContent | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const updateFormData = (updates: Partial<BlogFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const generateBlog = async () => {
    if (!formData.selectedTitle || formData.keywords.length === 0) {
      alert('Please select a title and add at least one keyword')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to generate blog')
      }

      const data = await response.json()
      setGeneratedContent(data)
    } catch (error) {
      console.error('Error generating blog:', error)
      alert('Failed to generate blog. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const steps = [
    { id: 1, title: 'Keywords', component: KeywordInput },
    { id: 2, title: 'Blog Type', component: BlogTypeSelector },
    { id: 3, title: 'Topics', component: TopicGenerator },
    { id: 4, title: 'References', component: ReferenceInput },
  ]

  const CurrentStepComponent = steps[currentStep - 1]?.component

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-black mr-2" />
              <h1 className="heading-1 gradient-text">
                Idea to Content
              </h1>
            </div>
            <p className="body-text text-gray-600 max-w-xl mx-auto">
              Transform your ideas into compelling blog content with AI-powered generation.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sidebar sticky top-6 rounded-lg shadow-uber">
              {/* Progress Steps */}
              <div className="mb-6">
                <h3 className="heading-3 mb-4 text-black">
                  Setup Progress
                </h3>
                <div className="space-y-2">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex items-center p-3 rounded-lg transition-all duration-200 hover-lift ${
                        currentStep === step.id
                          ? 'bg-black text-white shadow-uber'
                          : currentStep > step.id
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-white text-gray-600 border border-gray-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 transition-all duration-200 ${
                        currentStep === step.id
                          ? 'bg-white text-black'
                          : currentStep > step.id
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {currentStep > step.id ? '✓' : step.id}
                      </div>
                      <span className="font-medium text-sm">{step.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateBlog}
                disabled={isGenerating || !formData.selectedTitle}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-uber hover-glow"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Blog
                  </div>
                )}
              </button>

              {/* Navigation */}
              <div className="flex gap-2 flex-nowrap">
                <button
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                  disabled={currentStep === 4}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  Next
                  <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="card shadow-uber scale-in">
              {CurrentStepComponent && (
                <CurrentStepComponent
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
            </div>

            {/* Generated Content Preview */}
            {generatedContent && (
              <div className="mt-6 slide-up">
                <BlogPreview content={generatedContent} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="caption">
            Powered by OpenAI GPT-4 • Built with Next.js & React
          </p>
        </div>
      </div>
    </div>
  )
} 