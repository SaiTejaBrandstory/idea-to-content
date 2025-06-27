import { BlogFormData } from '@/types/blog'

export async function processReferences(references: BlogFormData['references']): Promise<string> {
  const processedContent: string[] = []

  // Process files
  for (const file of references.files) {
    try {
      if (file.type === 'text/plain') {
        const text = await file.text()
        processedContent.push(`Text Content (${file.name}): ${text.substring(0, 1000)}...`)
      }
      // Note: PDF and DOCX processing would require additional server-side libraries
      // For now, we'll skip these to avoid compatibility issues
    } catch (error) {
      console.warn(`Failed to process file ${file.name}:`, error)
    }
  }

  // Process URLs - simplified approach
  for (const url of references.urls) {
    try {
      // For now, just add the URL as reference context
      // In a production environment, you'd want to implement proper URL scraping
      processedContent.push(`Reference URL: ${url}`)
    } catch (error) {
      console.warn(`Failed to process URL ${url}:`, error)
    }
  }

  // Add custom text
  if (references.customText.trim()) {
    processedContent.push(`Custom Reference: ${references.customText}`)
  }

  return processedContent.join('\n\n')
} 