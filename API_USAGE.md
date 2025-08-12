# API Usage & Cost Tracking

## Supported AI Providers

### OpenAI
- **Models**: GPT-5, GPT-5 Mini, GPT-5 Nano, GPT-4o, GPT-4o Mini, GPT-3.5 Turbo
- **Pricing**: Official OpenAI pricing per 1M tokens (source: https://platform.openai.com/docs/pricing)
  - GPT-5: $1.25/$10.00 per 1M tokens (input/output)
  - GPT-5 Mini: $0.25/$2.00 per 1M tokens (input/output)
  - GPT-5 Nano: $0.05/$0.40 per 1M tokens (input/output)
  - GPT-4o: $5.00/$20.00 per 1M tokens (input/output)
  - GPT-4o Mini: $0.60/$2.40 per 1M tokens (input/output)
  - GPT-3.5 Turbo: $0.50/$1.50 per 1M tokens (input/output)
- **Best for**: High-quality content, complex reasoning, latest AI capabilities

### Together.ai
- **Models**: Llama 3.1 8B Turbo (recommended), Llama 3.1 70B, DeepSeek V3, WizardLM 2, Gemma 2 27B, Claude 3.5 Sonnet
- **Pricing**: Pay-as-you-go pricing varies by model size and type
- **Best for**: Cost-effective content generation, open-source models, fast inference

## Recommended Models

### For Blog Content Generation
- **OpenAI**: GPT-4o (best quality, higher cost)
- **Together.ai**: Llama 3.1 8B Turbo (fast & efficient, recommended by Together.ai)

### For Different Use Cases
- **Technical Content**: DeepSeek V3, GPT-4o
- **Creative Writing**: Llama 3.1 70B, GPT-4o
- **Quick Drafts**: Llama 3.1 8B Turbo, GPT-4o Mini
- **Cost-Effective**: Any Together.ai model

## How to Identify Which API Was Used

### Frontend Indicators
1. **Title Generation**: After generating titles, you'll see a blue dot indicator showing:
   - "Generated with OpenAI (model-name)" or
   - "Generated with Together.ai (model-name)"

2. **Blog Generation**: In the blog preview, you'll see:
   - Word count and API provider info at the top
   - Cost calculation based on the actual provider used

3. **Model Selection**: In the model selector, you'll see:
   - **Latest Models**: Showcases all GPT-5 series models with purple highlighting and 🚀 icon
   - **Featured Models**: Shows popular and reliable models with yellow highlighting and ⭐ icon
   - **Pricing Display**: Shows input/output rates per 1M tokens (e.g., "$5.00/$20.00 per 1M tokens")
   - **Selected Model Info**: Shows individual input/output rates per 1M tokens

### Console Logging
Open your browser's Developer Tools (F12) and check the Console tab for detailed logs:

#### Title Generation Logs:
```
Generating titles using together with model: meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
Generated 5 titles using together (meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo)
Token usage: 150 input, 200 output
Estimated cost: $0.000049 USD (₹0.00 INR)
```

#### Blog Generation Logs:
```
Generating blog using together with model: meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
Generated blog using together (meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo)
Token usage: 500 input, 1200 output
Estimated cost: $0.000147 USD (₹0.01 INR)
```

## Pricing Standardization (Completed)

### What Was Updated
All OpenAI pricing has been standardized to use **official pricing data per 1M tokens** from https://platform.openai.com/docs/pricing

### Files Updated
- `lib/model-utils.ts` - Updated pricing function
- `app/api/models/route.ts` - Updated main models API
- `app/api/pricing/route.ts` - Updated pricing API
- `app/api/featured-models/route.ts` - Updated featured models
- `app/page.tsx` - Updated hardcoded pricing
- `app/api/generate-blog/route.ts` - Updated cost calculations
- `app/api/generate-titles/route.ts` - Updated cost calculations
- `app/api/assistant-chat/route.ts` - Updated fallback pricing
- `components/BlogPreview.tsx` - Updated pricing comments and calculations
- `components/ModelSelector.tsx` - Updated pricing display and calculations
- `components/TopicGenerator.tsx` - Updated pricing comments and calculations

### Pricing Units
- **Before**: Mixed units (some per 1K tokens, some per 1M tokens)
- **After**: Consistent per 1M tokens across all files
- **Source**: Official OpenAI pricing documentation

### Cost Calculation
All cost calculations now correctly use:
```typescript
const inputPricePerToken = pricing.input / 1000000; // Convert from per 1M to per token
const outputPricePerToken = pricing.output / 1000000;
```

This ensures accurate cost tracking and prevents the 1000x pricing discrepancy that existed before.

### GPT-5 Models Cost Calculation
**Problem Fixed**: GPT-5 models using the Responses API don't provide usage data, causing "Pricing not available" errors.

**Solution Implemented**: 
- **Token Estimation**: When usage data is unavailable, estimate tokens using character count (1 token ≈ 4 characters)
- **Cost Calculation**: Apply official pricing rates to estimated tokens
- **Consistent Tracking**: All GPT-5 models now show proper costs in title generation, blog generation, and chat

**Example GPT-5 Cost Calculation**:
```typescript
if (isGpt5Model(modelId)) {
  // Estimate tokens for GPT-5 Responses API
  const estimatedInputTokens = Math.ceil(inputText.length / 4)
  const estimatedOutputTokens = Math.ceil(outputText.length / 4)
  
  // Calculate cost using official pricing
  totalCost = (estimatedInputTokens * inputPricePerToken) + (estimatedOutputTokens * outputPricePerToken)
}
```

**Models Now Working**:
- ✅ GPT-5: $1.25/$10.00 per 1M tokens
- ✅ GPT-5 Mini: $0.25/$2.00 per 1M tokens  
- ✅ GPT-5 Nano: $0.05/$0.40 per 1M tokens
- ✅ GPT-5 Chat Latest: $1.25/$10.00 per 1M tokens

## Environment Variables

Add these to your `.env.local` file:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Together.ai API Configuration
TOGETHER_API_KEY=your_together_api_key_here
```

## Getting Started with Together.ai

1. **Sign up** at [together.ai](https://together.ai)
2. **Get your API key** from the dashboard
3. **Add to .env.local**: `TOGETHER_API_KEY=your_key_here`
4. **Start with Llama 3.1 8B Turbo** (recommended for beginners)

## Troubleshooting

### "API key not configured" Error
- Make sure you have the correct API key in `.env.local`
- Restart your development server after adding API keys
- Check that the API key is valid and has sufficient credits

### Cost Not Showing
- Check browser console for any errors
- Verify that the API response includes `usage` data
- Some models might not return usage information

### Wrong Provider Being Used
- Check the UI to ensure you've selected the correct provider
- Verify that the model selection matches your provider choice
- Clear browser cache if UI seems stuck

## Resources

- [Together.ai Documentation](https://docs.together.ai/docs/introduction)
- [Together.ai Pricing](https://together.ai/pricing)
- [Together.ai Playground](https://together.ai/playground)
- [Together Cookbook](https://docs.together.ai/docs/together-cookbook) - Python recipes and examples 