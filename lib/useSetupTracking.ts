import { useCallback } from 'react'

interface SetupStepData {
  keywords?: string[]
  blogType?: string
  selectedTitle?: string
  wordCount?: string
  tone?: {
    type: string
    subtype: string
  }
  temperature?: number
  paragraphs?: string
  references?: {
    files: File[]
    urls: string[]
    customText: string
  }
  apiProvider?: string
  model?: string
}

export const useSetupTracking = () => {
  const trackSetupStep = useCallback(async (
    stepNumber: number,
    stepName: string,
    stepData: SetupStepData,
    sessionId?: string
  ) => {
    try {
      await fetch('/api/history/setup-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step_number: stepNumber,
          step_name: stepName,
          step_data: stepData,
          session_id: sessionId
        })
      })
    } catch (error) {
      console.error('Failed to track setup step:', error)
    }
  }, [])

  return { trackSetupStep }
}

// Setup step definitions
export const SETUP_STEPS = {
  KEYWORDS: { number: 1, name: 'keywords' },
  BLOG_TYPE: { number: 2, name: 'blog_type' },
  REFERENCES: { number: 3, name: 'references' },
  MODEL_SELECTION: { number: 4, name: 'model_selection' },
  TITLE_GENERATION: { number: 5, name: 'title_generation' },
  BLOG_GENERATION: { number: 6, name: 'blog_generation' },
  HUMANIZE: { number: 7, name: 'humanize' }
} as const 