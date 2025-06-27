# Setup Guide

## Environment Configuration

1. Create a `.env.local` file in the root directory with the following content:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

2. Get your OpenAI API key:
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Sign up or log in
   - Go to API Keys section
   - Create a new API key
   - Copy the key and replace `your_openai_api_key_here` in your `.env.local` file

## Running the Application

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to: http://localhost:3000

## Troubleshooting

- If you see linter errors, they should be resolved after installing dependencies
- Make sure your OpenAI API key is valid and has sufficient credits
- Check the browser console for any runtime errors 