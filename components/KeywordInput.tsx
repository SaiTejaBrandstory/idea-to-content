'use client'

import { useState } from 'react'
import { BlogFormData } from '@/types/blog'
import { X, Plus, Hash } from 'lucide-react'

interface KeywordInputProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
}

export default function KeywordInput({ formData, updateFormData }: KeywordInputProps) {
  const [newKeyword, setNewKeyword] = useState('')

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      updateFormData({
        keywords: [...formData.keywords, newKeyword.trim()]
      })
      setNewKeyword('')
    }
  }

  const removeKeyword = (index: number) => {
    updateFormData({
      keywords: formData.keywords.filter((_, i) => i !== index)
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <Hash className="w-5 h-5 text-black mr-2" />
          <h2 className="heading-2 text-black">
            Keywords & Topics
          </h2>
        </div>
        <p className="body-text text-gray-600 max-w-lg mx-auto">
          Enter the main keywords and topics for your blog content.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter a keyword..."
            className="flex-1 input-field"
          />
          <button
            onClick={addKeyword}
            disabled={!newKeyword.trim()}
            className="btn-primary px-3 disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {formData.keywords.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="heading-3 text-black">
                Keywords ({formData.keywords.length})
              </h3>
              <div className="text-xs text-gray-500 font-medium">
                {formData.keywords.length} of 10
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {formData.keywords.map((keyword, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover-lift transition-all duration-200"
                >
                  <div className="flex items-center">
                    <Hash className="w-3 h-3 text-gray-500 mr-2" />
                    <span className="font-medium text-black text-sm">{keyword}</span>
                  </div>
                  <button
                    onClick={() => removeKeyword(index)}
                    className="text-gray-400 hover:text-black transition-colors p-1 rounded-full hover:bg-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {formData.keywords.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Hash className="w-6 h-6 text-gray-400" />
            </div>
            <p className="body-text text-gray-500 mb-1">No keywords added yet</p>
            <p className="caption">Start by adding your first keyword above</p>
          </div>
        )}

        {formData.keywords.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-black mb-1 text-sm">Pro Tip</h4>
                <p className="text-xs text-gray-600">
                  Use specific, relevant keywords that your target audience would search for.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 