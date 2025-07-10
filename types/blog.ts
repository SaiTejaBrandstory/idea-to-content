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
  tone: {
    type: 'Professional & Formal' | 'Friendly & Approachable' | 'Emotive & Expressive' | 'Informative & Analytical' | 'Creative & Narrative'
    subtype: string
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

export interface Model {
  id: string;
  name: string;
  // ...other properties
  type?: string; // Optional type property for compatibility
}

// History tracking types
export interface UsageHistory {
  id: number
  user_id: string
  session_id: string
  operation_type: 'title_generation' | 'blog_generation' | 'humanize' | 'setup_progress'
  api_provider: 'openai' | 'together' | 'rephrasy' | 'none'
  model_id: string
  model_name: string
  keywords: string[]
  blog_type?: string
  selected_title?: string
  word_count?: string
  tone_type?: string
  tone_subtype?: string
  temperature?: number
  paragraphs?: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  input_price_per_token: number
  output_price_per_token: number
  pricing_units: 'per_1K_tokens' | 'per_1M_tokens' | 'none'
  input_cost_usd: number
  output_cost_usd: number
  total_cost_usd: number
  total_cost_inr: number
  generated_content_preview: string
  content_length: number
  created_at: string
  ip_address?: string
  user_agent?: string
  // Additional tracking fields
  all_generated_titles?: string[]
  references_files?: string[]
  references_urls?: string[]
  references_custom_text?: string
  setup_step?: string
  step_number?: number
}

export interface UsageStatistics {
  total_operations: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
  total_cost_inr: number
  openai_operations: number
  together_operations: number
}

export interface DailyUsageStats {
  date: string
  total_cost: number
  operations: number
  openai_operations: number
  together_operations: number
} 