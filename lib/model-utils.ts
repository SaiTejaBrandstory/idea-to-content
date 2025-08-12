// Helper functions for model information
export function getOpenAIModelDescription(modelId: string): string {
  const descriptions: { [key: string]: string } = {
    'gpt-4o': 'Latest and most capable model',
    'gpt-4o-mini': 'Fast and efficient model',
    'gpt-3.5-turbo': 'Cost-effective option',
    'gpt-4': 'High performance model',
    'gpt-4-turbo': 'Balanced performance and cost'
  }
  return descriptions[modelId] || 'OpenAI model'
}

export function getOpenAIPricing(modelId: string): { input: number; output: number } {
  // Official OpenAI pricing per 1M tokens (as of August 2025)
  // Source: https://platform.openai.com/docs/pricing
  const pricing: { [key: string]: { input: number; output: number } } = {
    // === GPT-5 Series (Current) ===
    'gpt-5': { input: 1.25, output: 10.00 },
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-5-chat-latest': { input: 1.25, output: 10.00 },
    
    // === GPT-4.1 Series Fine-Tuning ===
    'gpt-4.1': { input: 3.00, output: 12.00 },
    'gpt-4.1-mini': { input: 0.80, output: 3.20 },
    'gpt-4.1-nano': { input: 0.20, output: 0.80 },
    
    // === GPT-4o Series (Current multimodal) ===
    'gpt-4o': { input: 5.00, output: 20.00 },
    'gpt-4o-mini': { input: 0.60, output: 2.40 },
    'gpt-4o-audio': { input: 40.00, output: 80.00 },
    'gpt-4o-mini-audio': { input: 10.00, output: 20.00 },
    
    // === Reasoning Models ===
    'o1-pro': { input: 150.00, output: 600.00 },
    'o3-pro': { input: 20.00, output: 80.00 },
    
    // === Legacy Models ===
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4.5': { input: 75.00, output: 150.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
  }
  
  return pricing[modelId] || { input: 0.50, output: 1.50 } // Default to GPT-3.5-turbo pricing
}

export function getTogetherModelName(modelId: string): string {
  const names: { [key: string]: string } = {
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 'Llama 3.1 8B Turbo',
    'meta-llama/Meta-Llama-3.1-70B-Instruct': 'Llama 3.1 70B',
    'deepseek-ai/DeepSeek-V3': 'DeepSeek V3',
    'microsoft/WizardLM-2-8x22B': 'WizardLM 2',
    'google/gemma-2-27b-it': 'Gemma 2 27B',
    'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet'
  }
  return names[modelId] || modelId.split('/').pop() || modelId
}

export function getTogetherModelDescription(modelId: string): string {
  const descriptions: { [key: string]: string } = {
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 'Fast & efficient (recommended)',
    'meta-llama/Meta-Llama-3.1-70B-Instruct': 'High performance, larger model',
    'deepseek-ai/DeepSeek-V3': 'Advanced reasoning & coding',
    'microsoft/WizardLM-2-8x22B': 'Microsoft\'s instruction model',
    'google/gemma-2-27b-it': 'Google\'s efficient model',
    'anthropic/claude-3.5-sonnet': 'Anthropic\'s balanced model'
  }
  return descriptions[modelId] || 'Together.ai model'
}

export function getTogetherPricing(modelId: string): { input: number; output: number } {
  // Together.ai real pricing per 1M tokens (accurate as of 2025)
  // Source: https://www.together.ai/pricing
  const pricing: { [key: string]: { input: number; output: number } } = {
    // === GPT-OSS Models ===
    'gpt-oss-120B': { input: 0.15, output: 0.60 },
    'gpt-oss-20B': { input: 0.05, output: 0.20 },
    
    // === Llama 4 Series ===
    'llama-4-maverick': { input: 0.27, output: 0.85 },
    'llama-4-scout': { input: 0.18, output: 0.59 },
    
    // === Llama 3.1 Series ===
    'llama-3.1-3b-lite': { input: 0.06, output: 0.06 },
    'llama-3.1-3b-turbo': { input: 0.18, output: 0.18 },
    'llama-3.1-8b': { input: 0.10, output: 0.18 },
    'llama-3.1-8b-turbo': { input: 0.18, output: 0.20 },
    'llama-3.1-70b': { input: 0.54, output: 0.88 },
    'llama-3.1-70b-turbo': { input: 0.88, output: 0.90 },
    
    // === Llama 3.2 Series ===
    'llama-3.2-90b-vision': { input: 1.20, output: 1.20 },
    'llama-3.2-405b': { input: 3.50, output: 3.50 },
    
    // === DeepSeek Models ===
    'deepseek-v3': { input: 1.25, output: 1.25 },
    'deepseek-r1': { input: 3.00, output: 7.00 },
    'deepseek-r1-throughput': { input: 0.55, output: 2.19 },
    'deepseek-r1-distill-llama-70b': { input: 2.00, output: 2.00 },
    'deepseek-r1-distill-qwen-14b': { input: 1.60, output: 1.60 },
    
    // === Meta Llama Models (with full paths) ===
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { input: 0.18, output: 0.20 },
    'meta-llama/Meta-Llama-3.1-70B-Instruct': { input: 0.88, output: 0.90 },
    
    // === Qwen Models ===
    'qwen3-235b-a22b-instruct-2507': { input: 0.20, output: 0.60 },
    'qwen3-coder-480b-a35b-instruct': { input: 2.00, output: 2.00 },
    'qwen2.5-72b': { input: 1.20, output: 1.20 },
    'qwen2.5-coder-32b': { input: 0.80, output: 0.80 },
    'qwen-qwq-32b': { input: 1.20, output: 1.20 },
    
    // === Other Popular Models ===
    'microsoft/WizardLM-2-8x22B': { input: 0.35, output: 0.45 },
    'google/gemma-2-27b-it': { input: 0.20, output: 0.30 },
    'anthropic/claude-3.5-sonnet': { input: 0.25, output: 0.35 }
  }
  
  // Smart model detection with case-insensitive matching
  const modelIdLower = modelId.toLowerCase();
  
  // Try exact match first
  if (pricing[modelId]) {
    return pricing[modelId];
  }
  
  // Try partial matches for common patterns
  for (const [key, value] of Object.entries(pricing)) {
    if (modelIdLower.includes(key.toLowerCase()) || key.toLowerCase().includes(modelIdLower)) {
      return value;
    }
  }
  
  // Default fallback pricing for unknown models
  return { input: 0.25, output: 0.35 }
} 

// Model utility functions

/**
 * Detects if a model is GPT-5 and returns the correct token parameter name
 * GPT-5 uses 'max_completion_tokens' instead of 'max_tokens'
 */
export function getTokenParameter(modelId: string): 'max_tokens' | 'max_completion_tokens' {
  // Check if the model is GPT-5 (case insensitive)
  if (modelId.toLowerCase().includes('gpt-5') || modelId.toLowerCase().includes('gpt5')) {
    return 'max_completion_tokens';
  }
  return 'max_tokens';
}

/**
 * Creates the token parameter object for API calls
 */
export function createTokenParameter(modelId: string, tokenCount: number) {
  const paramName = getTokenParameter(modelId);
  return { [paramName]: tokenCount };
}

/**
 * Returns true if the model id appears to be a GPT-5 family model
 */
export function isGpt5Model(modelId: string): boolean {
  return /gpt-5/i.test(modelId || '')
}

/**
 * Normalize OpenAI usage object into { prompt_tokens, completion_tokens, total_tokens }
 * Handles both Chat Completions (prompt_tokens/completion_tokens) and
 * Responses API (input_tokens/output_tokens) shapes.
 */
export function normalizeOpenAIUsage(raw: any): {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
} | null {
  if (!raw || typeof raw !== 'object') return null
  const prompt =
    (typeof raw.prompt_tokens === 'number' ? raw.prompt_tokens : undefined) ??
    (typeof raw.input_tokens === 'number' ? raw.input_tokens : undefined) ??
    (typeof raw?.tokens?.input_tokens === 'number' ? raw.tokens.input_tokens : undefined) ??
    0
  const completion =
    (typeof raw.completion_tokens === 'number' ? raw.completion_tokens : undefined) ??
    (typeof raw.output_tokens === 'number' ? raw.output_tokens : undefined) ??
    (typeof raw?.tokens?.output_tokens === 'number' ? raw.tokens.output_tokens : undefined) ??
    0
  const total =
    (typeof raw.total_tokens === 'number' ? raw.total_tokens : undefined) ??
    (typeof raw.tokens_used === 'number' ? raw.tokens_used : undefined) ??
    prompt + completion
  return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: total }
}

/**
 * Creates the temperature parameter object for API calls
 * GPT-5 only supports temperature: 1, so we omit it for GPT-5 models
 */
export function createTemperatureParameter(modelId: string, temperature: number) {
  // Check if the model is GPT-5 (case insensitive)
  if (modelId.toLowerCase().includes('gpt-5') || modelId.toLowerCase().includes('gpt5')) {
    // GPT-5 only supports temperature: 1, so we omit the parameter entirely
    return {};
  }
  return { temperature };
} 