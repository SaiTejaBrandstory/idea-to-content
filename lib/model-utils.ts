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
  const pricing: { [key: string]: { input: number; output: number } } = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 }
  }
  return pricing[modelId] || { input: 0.005, output: 0.015 }
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
  // Together.ai pricing varies by model, using approximate values
  const pricing: { [key: string]: { input: number; output: number } } = {
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { input: 0.14, output: 0.28 },
    'meta-llama/Meta-Llama-3.1-70B-Instruct': { input: 0.59, output: 0.79 },
    'deepseek-ai/DeepSeek-V3': { input: 0.14, output: 0.28 },
    'microsoft/WizardLM-2-8x22B': { input: 0.35, output: 0.45 },
    'google/gemma-2-27b-it': { input: 0.20, output: 0.30 },
    'anthropic/claude-3.5-sonnet': { input: 0.25, output: 0.35 }
  }
  return pricing[modelId] || { input: 0.25, output: 0.35 }
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