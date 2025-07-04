# API Usage & Cost Tracking

## Supported AI Providers

### OpenAI
- **Models**: GPT-4o, GPT-4o Mini, GPT-3.5 Turbo
- **Pricing**: $0.005 per 1K input tokens, $0.015 per 1K output tokens
- **Best for**: High-quality content, complex reasoning

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
Estimated cost: $0.000238 USD (₹0.02 INR)
```

### Server-Side Logs
Check your terminal/console where you're running `npm run dev` for server-side logs:

```
[generate-titles] Using Together.ai with model: meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
[generate-blog] Using Together.ai with model: meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
```

## Cost Calculation

### OpenAI Pricing
- Input tokens: $0.005 per 1,000 tokens
- Output tokens: $0.015 per 1,000 tokens
- Example: 500 input + 1000 output = $0.0025 + $0.015 = $0.0175

### Together.ai Pricing
- **Pay-as-you-go**: Pricing varies by model size and type
- **Smaller models** (8B): Generally more cost-effective
- **Larger models** (70B+): Higher quality but more expensive
- **Approximate**: $0.14-0.59 per 1M input tokens, $0.28-0.79 per 1M output tokens

**Note**: Together.ai pricing is model-specific. Check their [pricing page](https://together.ai/pricing) for exact rates.

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