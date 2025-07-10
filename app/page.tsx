'use client'

import { useState, useMemo, useEffect } from 'react'
import KeywordInput from '@/components/KeywordInput'
import BlogTypeSelector from '@/components/BlogTypeSelector'
import TopicGenerator from '@/components/TopicGenerator'
import ReferenceInput from '@/components/ReferenceInput'
import ModelSelector from '@/components/ModelSelector'
import BlogPreview from '@/components/BlogPreview'
import ProtectedRoute from '@/components/ProtectedRoute'
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
    tone: {
      type: 'Professional & Formal',
      subtype: 'Professional'
    },
    temperature: 0.8,
    apiProvider: 'openai',
    model: 'gpt-4o',
    selectedModel: {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'OpenAI\'s latest model with improved performance',
      provider: 'openai',
      pricing: { input: 0.005, output: 0.015 }
    }
  })

  const [generatedContent, setGeneratedContent] = useState<BlogContent | null>(null)
  const [humanizedContent, setHumanizedContent] = useState<{ output: string; new_flesch_score: number } | null>(null)
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isContentGenerated, setIsContentGenerated] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessionSteps, setSessionSteps] = useState<{
    titleGenerated: boolean
    blogGenerated: boolean
    humanized: boolean
  }>({
    titleGenerated: false,
    blogGenerated: false,
    humanized: false
  })

  // Persist humanized content in localStorage
  const setHumanizedContentPersistent = (content: { output: string; new_flesch_score: number } | null) => {
    setHumanizedContent(content)
    if (content && generatedContent) {
      localStorage.setItem('humanizedContent', JSON.stringify(content))
    } else {
      localStorage.removeItem('humanizedContent')
    }
  }

  // Persist generated titles in localStorage
  const setGeneratedTitlesPersistent = (titles: string[]) => {
    setGeneratedTitles(titles)
    if (titles.length > 0) {
      localStorage.setItem('generatedTitles', JSON.stringify(titles))
    } else {
      localStorage.removeItem('generatedTitles')
    }
  }

  // Load saved content from localStorage on mount
  useEffect(() => {
    // Load humanized content
    const savedHumanized = localStorage.getItem('humanizedContent')
    if (savedHumanized) {
      try {
        const parsed = JSON.parse(savedHumanized)
        setHumanizedContent(parsed)
      } catch (error) {
        console.error('Failed to parse saved humanized content:', error)
        localStorage.removeItem('humanizedContent')
      }
    }

    // Load generated titles
    const savedTitles = localStorage.getItem('generatedTitles')
    if (savedTitles) {
      try {
        const parsed = JSON.parse(savedTitles)
        setGeneratedTitles(parsed)
      } catch (error) {
        console.error('Failed to parse saved generated titles:', error)
        localStorage.removeItem('generatedTitles')
      }
    }
  }, [])

  const startNewSession = () => {
    const sessionId = `session_${Date.now()}`
    setCurrentSessionId(sessionId)
    setSessionSteps({
      titleGenerated: false,
      blogGenerated: false,
      humanized: false
    })
    setGeneratedContent(null)
    setHumanizedContent(null)
    setGeneratedTitles([])
    setIsContentGenerated(false)
    setCurrentStep(1)
    setFormData({
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
      tone: {
        type: 'Professional & Formal',
        subtype: 'Professional'
      },
      temperature: 0.8,
      apiProvider: 'openai',
      model: 'gpt-4o',
      selectedModel: {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'OpenAI\'s latest model with improved performance',
        provider: 'openai',
        pricing: { input: 0.005, output: 0.015 }
      }
    })
    // Clear localStorage
    localStorage.removeItem('humanizedContent')
    localStorage.removeItem('generatedTitles')
    // Clear humanized content state
    setHumanizedContent(null)
  }

  const updateFormData = (updates: Partial<BlogFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    
    // Clear generated titles if keywords change
    if (updates.keywords && updates.keywords.length !== formData.keywords.length) {
      setGeneratedTitlesPersistent([])
    }
  }

  const generateBlog = async () => {
    if (!currentSessionId) {
      alert('Please start a new blog first')
      return
    }

    if (sessionSteps.blogGenerated) {
      alert('Blog has already been generated in this blog')
      return
    }

    if (!formData.selectedTitle || formData.keywords.length === 0) {
      alert('Please select a title and add at least one keyword')
      return
    }

    setIsGenerating(true)
    try {
      console.log('Sending blog generation request with data:', {
        selectedTitle: formData.selectedTitle,
        keywords: formData.keywords,
        apiProvider: formData.apiProvider,
        model: formData.model,
        blogType: formData.blogType,
        wordCount: formData.wordCount,
        sessionId: currentSessionId
      })

      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          sessionId: currentSessionId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setGeneratedContent(data)
      setSessionSteps(prev => ({ ...prev, blogGenerated: true }))
      setIsContentGenerated(true)
    } catch (error: any) {
      console.error('Error generating blog:', error)
      alert(`Failed to generate blog: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const steps = [
    { id: 1, title: 'Keywords', component: KeywordInput },
    { id: 2, title: 'Blog Type', component: BlogTypeSelector },
    { id: 3, title: 'References', component: ReferenceInput },
    { id: 4, title: 'Select Model', component: ModelSelector },
    { id: 5, title: 'Topics', component: TopicGenerator },
  ]

  const CurrentStepComponent = useMemo(() => {
    return steps[currentStep - 1]?.component
  }, [currentStep])



  return (
    <div className="min-h-screen bg-white text-black">
      <ProtectedRoute>
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sidebar sticky top-6 rounded-lg shadow-uber">
                {/* Blog Management */}
                <div className="mb-6">
                  {!currentSessionId ? (
                    <button
                      onClick={startNewSession}
                      className="w-full btn-primary mb-4 shadow-uber hover-glow"
                    >
                      Start a Blog
                    </button>
                  ) : (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800">Blog in Progress</span>
                        <button
                          onClick={startNewSession}
                          className="text-xs btn-secondary px-2 py-1"
                        >
                          New Blog
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
                          !currentSessionId
                            ? 'bg-gray-100 text-gray-400 border border-gray-200'
                            : currentStep === step.id
                            ? 'bg-black text-white shadow-uber'
                            : currentStep > step.id
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 transition-all duration-200 ${
                          !currentSessionId
                            ? 'bg-gray-300 text-gray-400'
                            : currentStep === step.id
                            ? 'bg-white text-black'
                            : currentStep > step.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {!currentSessionId ? '🔒' : currentStep > step.id ? '✓' : step.id}
                        </div>
                        <span className="font-medium text-sm">{step.title}</span>
                      </div>
                    ))}
                    
                    {/* Content Generated Indicator */}
                    {isContentGenerated && (
                      <div className="flex items-center p-3 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 bg-blue-600 text-white">
                          ✓
                        </div>
                        <span className="font-medium text-sm">Content Generated</span>
                      </div>
                    )}

                    {/* Humanized Indicator */}
                    {sessionSteps.humanized && (
                      <div className="flex items-center p-3 rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 bg-purple-600 text-white">
                          ✓
                        </div>
                        <span className="font-medium text-sm">Content Humanized</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateBlog}
                  disabled={isGenerating || !formData.selectedTitle || isContentGenerated || !currentSessionId || sessionSteps.blogGenerated}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-uber hover-glow"
                >
                  {sessionSteps.blogGenerated ? (
                    <div className="flex items-center justify-center">
                      ✓ Blog Generated
                    </div>
                  ) : isGenerating ? (
                    <div className="flex items-center justify-center">
                      Generating...
                    </div>
                  ) : isContentGenerated ? (
                    <div className="flex items-center justify-center">
                      ✓ Content Generated
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
                    disabled={currentStep === 1 || isContentGenerated || !currentSessionId || sessionSteps.titleGenerated || sessionSteps.blogGenerated || sessionSteps.humanized}
                    className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                    disabled={currentStep === 5 || isContentGenerated || !currentSessionId || sessionSteps.titleGenerated || sessionSteps.blogGenerated || sessionSteps.humanized}
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
                                {!currentSessionId ? (
                    <div className="card shadow-uber scale-in">
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔒</div>
                        <h2 className="heading-2 text-gray-600 mb-4">Blog Creation Required</h2>
                        <p className="body-text text-gray-500 mb-6">
                          Please start a new blog to begin generating content.
                        </p>
                        <button
                          onClick={startNewSession}
                          className="btn-primary px-8 py-3 shadow-uber hover-glow"
                        >
                          Start a Blog
                        </button>
                      </div>
                    </div>
                  ) : (
                <>
                  <div className="card shadow-uber scale-in">
                    {CurrentStepComponent && (
                      <CurrentStepComponent
                        formData={formData}
                        updateFormData={updateFormData}
                        generatedTitles={generatedTitles}
                        setGeneratedTitles={setGeneratedTitlesPersistent}
                        currentSessionId={currentSessionId}
                        sessionSteps={sessionSteps}
                        setSessionSteps={setSessionSteps}
                      />
                    )}
                  </div>

                  {/* Generated Content Preview */}
                  {generatedContent && (
                    <div className="mt-6 slide-up">
                      <BlogPreview 
                        content={generatedContent} 
                        humanizedContent={humanizedContent}
                        setHumanizedContent={setHumanizedContentPersistent}
                        currentSessionId={currentSessionId}
                        sessionSteps={sessionSteps}
                        setSessionSteps={setSessionSteps}
                      />
                      
                      {/* Start New Blog Button */}
                      <div className="mt-6 text-center">
                        <button
                          onClick={startNewSession}
                          className="btn-primary px-8 py-3 shadow-uber hover-glow"
                        >
                          Start a New Blog
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    </div>
  )
} 