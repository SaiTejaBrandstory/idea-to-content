'use client'

import { useState, useRef } from 'react'
import { BlogFormData } from '@/types/blog'
import { Upload, Link, FileText, X, Plus } from 'lucide-react'

interface ReferenceInputProps {
  formData: BlogFormData
  updateFormData: (updates: Partial<BlogFormData>) => void
}

export default function ReferenceInput({ formData, updateFormData }: ReferenceInputProps) {
  const [newUrl, setNewUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          </div>
          
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a URL..."
              className="flex-1 input-field"
            />
            <button
              onClick={addUrl}
              disabled={!newUrl.trim()}
              className="btn-primary px-3 disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {formData.references.urls.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-black text-sm">
                Added URLs ({formData.references.urls.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {formData.references.urls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <Link className="w-3 h-3 text-gray-500 mr-2 flex-shrink-0" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 text-sm truncate"
                      >
                        {url}
                      </a>
                    </div>
                    <button
                      onClick={() => removeUrl(index)}
                      className="text-gray-400 hover:text-black transition-colors p-1 rounded-full hover:bg-gray-200 ml-2 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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