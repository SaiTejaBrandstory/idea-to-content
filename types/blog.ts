export interface BlogFormData {
  keywords: string[]
  blogType: 'Listicle' | 'Informative' | 'Solution-based' | 'How-to' | 'Case Study'
  wordCount: '300-500' | '500-800' | '800-1200' | '1500+'
  paragraphs: '3-5' | '5-7' | '7+'
  selectedTitle: string
  references: {
    files: File[]
    urls: string[]
    customText: string
  }
  temperature: number
  apiProvider: 'openai' | 'together'
  model: string
  selectedModel?: ModelInfo
}

export interface BlogContent {
  title: string
  metaDescription: string
  intro: string
  body: string[]
  conclusion: string
  cta?: string
}

export interface GeneratedTitle {
  title: string
  emphasis: 'Keyword Emphasis' | 'Concept Emphasis' | 'Solution Emphasis' | 'Viral Emphasis' | 'Hybrid Emphasis'
}

export interface ReferenceContent {
  type: 'file' | 'url' | 'text'
  content: string
  source: string
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  provider: 'openai' | 'together'
  pricing: {
    input: number
    output: number
  }
  author?: string
  type?: string
} 