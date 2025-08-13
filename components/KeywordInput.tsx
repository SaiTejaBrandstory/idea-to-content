'use client'

import { useState, useCallback } from 'react'
import { BlogFormData } from '@/types/blog'
import { X, Plus, Hash, FileText, AlertCircle } from 'lucide-react'

interface KeywordInputProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
  generatedTitles?: string[]
  setGeneratedTitles?: (titles: string[]) => void
}

export default function KeywordInput({ formData, updateFormData }: KeywordInputProps) {
  const [newKeyword, setNewKeyword] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [bulkError, setBulkError] = useState<string | null>(null)

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      updateFormData({
        keywords: [...formData.keywords, newKeyword.trim()]
      })
      setNewKeyword('')
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    updateFormData({
      keywords: formData.keywords.filter(keyword => keyword !== keywordToRemove)
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  // Process bulk text input
  const processBulkText = useCallback(() => {
    if (!bulkText.trim()) {
      setBulkError('Please enter some text to process')
      return
    }

    // Split by multiple possible separators: newlines, commas, semicolons, pipes, or tabs
    const separators = /[\n\r,;|,\t]+/
    const lines = bulkText.split(separators)
    const keywords: string[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !keywords.includes(trimmed)) {
        // Handle CSV format (remove quotes and extra spaces)
        const cleanKeyword = trimmed
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim()
        
        if (cleanKeyword && cleanKeyword.length > 0 && cleanKeyword.length <= 100) {
          keywords.push(cleanKeyword)
        }
      }
    }

    if (keywords.length === 0) {
      setBulkError('No valid keywords found in the text')
      return
    }

    // Check if adding these keywords would exceed the limit
    const currentCount = formData.keywords.length
    const availableSlots = 10 - currentCount
    
    if (keywords.length > availableSlots) {
      setBulkError(`Only ${availableSlots} keyword slots available. Found ${keywords.length} keywords.`)
      return
    }

    // Add new keywords (avoiding duplicates with existing ones)
    const newKeywords = keywords.filter(keyword => !formData.keywords.includes(keyword))
    
    if (newKeywords.length === 0) {
      setBulkError('All keywords already exist')
      return
    }

    updateFormData({
      keywords: [...formData.keywords, ...newKeywords]
    })
    
    setBulkText('')
    setBulkError(null)
  }, [bulkText, formData.keywords, updateFormData])

  return (
    <div className="space-y-4">
      {/* Current Keywords Display */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Keywords ({formData.keywords.length}/10)
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.keywords.map((keyword, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              <Hash className="w-3 h-3" />
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(keyword)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Keyword Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a single keyword..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={100}
        />
        <button
          type="button"
          onClick={addKeyword}
          disabled={!newKeyword.trim() || formData.keywords.length >= 10}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Bulk Text Input Section */}
      <div className="space-y-3">
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Bulk Keyword Input</h3>
          <p className="text-xs text-gray-500 mb-3">Paste multiple keywords separated by commas, semicolons, pipes, tabs, or newlines</p>
        </div>
        
        <div className="space-y-3">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Paste your keywords here...&#10;Example:&#10;artificial intelligence, machine learning&#10;deep learning; neural networks&#10;data science|automation|robotics"
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          
          {bulkError && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {bulkError}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {bulkText.length > 0 && (
                <span>
                  Found {bulkText.split(/[\n\r,;|,\t]+/).filter(word => word.trim().length > 0).length} potential keywords
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={processBulkText}
              disabled={!bulkText.trim() || formData.keywords.length >= 10}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Process Keywords
            </button>
          </div>
        </div>
        
        {/* Examples Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-xs font-medium text-gray-700 mb-3">📝 Format Examples:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-2">
              <div>
                <span className="font-medium text-blue-600">Commas:</span>
                <div className="bg-white p-2 rounded border text-gray-700 font-mono">
                  artificial intelligence, machine learning
                </div>
              </div>
              <div>
                <span className="font-medium text-green-600">Semicolons:</span>
                <div className="bg-white p-2 rounded border text-gray-700 font-mono">
                  deep learning; neural networks
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-purple-600">Pipes:</span>
                <div className="bg-white p-2 rounded border text-gray-700 font-mono">
                  data science|automation|robotics
                </div>
              </div>
              <div>
                <span className="font-medium text-orange-600">Newlines:</span>
                <div className="bg-white p-2 rounded border text-gray-700 font-mono">
                  cybersecurity<br/>web development<br/>mobile apps
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p>• Keywords help generate more relevant and targeted content</p>
        <p>• Maximum 10 keywords allowed</p>
        <p>• Each keyword should be under 100 characters</p>
      </div>
    </div>
  )
} 