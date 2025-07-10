'use client'

import { useState, useRef } from 'react'
import { BlogFormData } from '@/types/blog'
import { Upload, Link, FileText, X, Plus, Mic, ChevronDown } from 'lucide-react'

interface ReferenceInputProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
  generatedTitles?: string[]
  setGeneratedTitles?: (titles: string[]) => void
}

export default function ReferenceInput({ formData, updateFormData }: ReferenceInputProps) {
  const [newUrl, setNewUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [toneTypeOpen, setToneTypeOpen] = useState(false)
  const [toneSubtypeOpen, setToneSubtypeOpen] = useState(false)

  const toneOptions = {
    'Professional & Formal': [
      'Formal',
      'Professional', 
      'Diplomatic',
      'Objective'
    ],
    'Friendly & Approachable': [
      'Friendly',
      'Casual',
      'Playful',
      'Optimistic'
    ],
    'Emotive & Expressive': [
      'Empathetic',
      'Inspirational',
      'Passionate',
      'Urgent'
    ],
    'Informative & Analytical': [
      'Educational',
      'Analytical',
      'Technical',
      'Neutral'
    ],
    'Creative & Narrative': [
      'Narrative',
      'Dramatic',
      'Witty',
      'Poetic'
    ]
  }

  const toneDescriptions = {
    'Formal': 'Polished, respectful, uses precise language (e.g., academic writing, business reports)',
    'Professional': 'Clear, confident, and courteous (e.g., emails, proposals)',
    'Diplomatic': 'Tactful, neutral, avoids offense (e.g., conflict resolution, HR memos)',
    'Objective': 'Fact-based and unbiased (e.g., news summaries, data reports)',
    'Friendly': 'Warm, welcoming, conversational (e.g., onboarding messages, customer support)',
    'Casual': 'Relaxed and informal, like chatting with a friend',
    'Playful': 'Fun, humorous, sometimes silly (e.g., social media, kids\' content)',
    'Optimistic': 'Encouraging, upbeat, hopeful',
    'Empathetic': 'Sensitive to the reader\'s emotions (e.g., apologies, support messages)',
    'Inspirational': 'Uplifting, motivational (e.g., speeches, self-help content)',
    'Passionate': 'Strong, enthusiastic emotion on a topic',
    'Urgent': 'Pressing, action-oriented, calls for immediate attention',
    'Educational': 'Clear, instructive, often step-by-step (e.g., tutorials, explainers)',
    'Analytical': 'Detailed, logical, often includes comparisons or breakdowns',
    'Technical': 'Specialized vocabulary, precision (e.g., manuals, coding docs)',
    'Neutral': 'Balanced, no strong emotional cues',
    'Narrative': 'Storytelling, with pacing and character',
    'Dramatic': 'Tense, emotional, intense (great for fiction or scripts)',
    'Witty': 'Clever, often uses wordplay or sarcasm',
    'Poetic': 'Lyrical, expressive, uses rhythm or metaphor'
  }

  const addUrl = () => {
    if (newUrl.trim() && !formData.references.urls.includes(newUrl.trim())) {
      updateFormData({
        references: {
          ...formData.references,
          urls: [...formData.references.urls, newUrl.trim()]
        }
      })
      setNewUrl('')
    }
  }

  const removeUrl = (index: number) => {
    updateFormData({
      references: {
        ...formData.references,
        urls: formData.references.urls.filter((_, i) => i !== index)
      }
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const textFiles = files.filter(file => file.type === 'text/plain')
    
    if (textFiles.length > 0) {
      updateFormData({
        references: {
          ...formData.references,
          files: [...formData.references.files, ...textFiles]
        }
      })
    }
  }

  const removeFile = (index: number) => {
    updateFormData({
      references: {
        ...formData.references,
        files: formData.references.files.filter((_, i) => i !== index)
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addUrl()
    }
  }

  const updateTone = (type: string, subtype: string) => {
    updateFormData({
      tone: {
        type: type as BlogFormData['tone']['type'],
        subtype
      }
    })
  }

  const handleToneTypeChange = (type: string) => {
    // Reset subtype to first option of new type
    const subtypes = toneOptions[type as keyof typeof toneOptions]
    updateTone(type, subtypes[0])
    setToneTypeOpen(false)
  }

  const handleToneSubtypeChange = (subtype: string) => {
    updateTone(formData.tone.type, subtype)
    setToneSubtypeOpen(false)
  }

  const getToneTypeIcon = (type: string) => {
    switch (type) {
      case 'Professional & Formal': return '✅'
      case 'Friendly & Approachable': return '🙂'
      case 'Emotive & Expressive': return '💬'
      case 'Informative & Analytical': return '🧠'
      case 'Creative & Narrative': return '🎭'
      default: return '📝'
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-black mr-2" />
          <h2 className="heading-2 text-black">
            References & Sources
          </h2>
        </div>
        <p className="body-text text-gray-600 max-w-lg mx-auto">
          Add reference materials to enhance your blog content with accurate information.
        </p>
      </div>

      <div className="space-y-6">
        {/* Tone Selection */}
        <div className="space-y-4">
          <div className="flex items-center mb-3">
            <Mic className="w-4 h-4 text-blue-500 mr-2" />
            <h3 className="heading-3 text-black">
              Writing Tone
            </h3>
          </div>
          
          <div className="space-y-4">
            {/* Tone Type Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Tone Type</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setToneTypeOpen(!toneTypeOpen)}
                  className="w-full p-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">{getToneTypeIcon(formData.tone.type)}</span>
                      <span className="font-medium text-gray-900">{formData.tone.type}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${toneTypeOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                {toneTypeOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {Object.keys(toneOptions).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleToneTypeChange(type)}
                        className="w-full p-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center">
                          <span className="mr-2">{getToneTypeIcon(type)}</span>
                          <span className="font-medium text-gray-900">{type}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tone Subtype Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Tone Style</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setToneSubtypeOpen(!toneSubtypeOpen)}
                  className="w-full p-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{formData.tone.subtype}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {toneDescriptions[formData.tone.subtype as keyof typeof toneDescriptions]}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${toneSubtypeOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                {toneSubtypeOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {toneOptions[formData.tone.type].map((subtype) => (
                      <button
                        key={subtype}
                        type="button"
                        onClick={() => handleToneSubtypeChange(subtype)}
                        className="w-full p-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{subtype}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {toneDescriptions[subtype as keyof typeof toneDescriptions]}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <div className="flex items-center mb-3">
            <Upload className="w-4 h-4 text-blue-500 mr-2" />
            <h3 className="heading-3 text-black">
              Upload Files
            </h3>
          </div>
          
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary hover-lift"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Text Files
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Only .txt files are supported
            </p>
          </div>

          {formData.references.files.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-black text-sm">
                Uploaded Files ({formData.references.files.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {formData.references.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center">
                      <FileText className="w-3 h-3 text-gray-500 mr-2" />
                      <span className="font-medium text-black text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-black transition-colors p-1 rounded-full hover:bg-gray-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* URL Input */}
        <div className="space-y-4">
          <div className="flex items-center mb-3">
            <Link className="w-4 h-4 text-blue-500 mr-2" />
            <h3 className="heading-3 text-black">
              Reference URLs
            </h3>
            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-semibold">Coming Soon</span>
          </div>
          <div className="flex gap-2 opacity-60 pointer-events-none select-none">
            <input
              type="url"
              value={newUrl}
              disabled
              placeholder="URL reference support coming soon..."
              className="flex-1 input-field"
            />
            <button
              disabled
              className="btn-primary px-3 opacity-50 cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Text */}
        <div className="space-y-4">
          <div className="flex items-center mb-3">
            <FileText className="w-4 h-4 text-blue-500 mr-2" />
            <h3 className="heading-3 text-black">
              Custom Reference Text
            </h3>
          </div>
          
          <textarea
            value={formData.references.customText}
            onChange={(e) => updateFormData({
              references: {
                ...formData.references,
                customText: e.target.value
              }
            })}
            placeholder="Enter any additional reference text, notes, or context..."
            className="input-field min-h-[120px] resize-none"
            rows={5}
          />
          
          {formData.references.customText && (
            <div className="text-xs text-gray-500">
              {formData.references.customText.length} characters
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
            <div>
              <h4 className="font-semibold text-black mb-1 text-sm">Reference Summary</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Files: {formData.references.files.length}</div>
                <div>URLs: {formData.references.urls.length}</div>
                <div>Custom text: {formData.references.customText ? 'Added' : 'None'}</div>
                <div>Tone: {formData.tone.subtype} ({formData.tone.type})</div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {formData.references.files.length === 0 && 
         formData.references.urls.length === 0 && 
         !formData.references.customText && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="body-text text-gray-500 mb-1">No references added yet</p>
            <p className="caption">Add files, URLs, or custom text to enhance your content</p>
          </div>
        )}
      </div>
    </div>
  )
} 