# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Failed to get ttlrs" or Title Generation Issues

**Symptoms:**
- Error when clicking "Generate Titles"
- No titles appear after generation
- API errors in console

**Solutions:**

#### Check OpenAI API Key
1. Verify your `.env.local` file exists in the root directory
2. Ensure your OpenAI API key is valid and has credits
3. Test the API key at: http://localhost:3002/api/status

#### Check API Key Format
```env
# .env.local
OPENAI_API_KEY=sk-your-actual-api-key-here
```

#### Common API Key Issues:
- **Invalid key**: Get a new key from [OpenAI Platform](https://platform.openai.com/)
- **No credits**: Add billing information to your OpenAI account
- **Rate limits**: Wait a few minutes and try again

### 2. Blog Generation Fails

**Symptoms:**
- "Failed to generate blog content" error
- JSON parsing errors
- Incomplete content generated

**Solutions:**

#### Check Input Requirements
- Ensure you've selected a title
- Add at least one keyword
- Complete all required steps

#### API Response Issues
- The app now has better error handling
- Check browser console for detailed error messages
- Try regenerating with different settings

### 3. File Upload Issues

**Current Limitations:**
- Only `.txt` files are supported
- PDF and DOCX support removed due to compatibility issues
- URLs are stored as reference context (not scraped)

**Workaround:**
- Convert PDFs to text files
- Copy content from URLs manually
- Use the custom text input for reference material

### 4. Development Server Issues

**Port Already in Use:**
- The app automatically tries ports 3000, 3001, 3002, etc.
- Check the terminal output for the correct port
- Kill other processes using the port if needed

**Compilation Errors:**
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors in the terminal
- Restart the development server: `npm run dev`

### 5. Performance Issues

**Slow Generation:**
- OpenAI API can take 10-30 seconds for complex requests
- Check your internet connection
- Try reducing word count or complexity

**Memory Issues:**
- Close other applications
- Restart the development server
- Check system resources

## API Status Check

Test if everything is working:

```bash
# Check API status
curl http://localhost:3002/api/status

# Or visit in browser:
http://localhost:3002/api/status
```

Expected response:
```json
{
  "status": "ok",
  "openaiConfigured": true,
  "message": "OpenAI API key is configured"
}
```

## Debug Mode

To see detailed error messages:

1. Open browser developer tools (F12)
2. Go to Console tab
3. Try the failing operation
4. Look for error messages and stack traces

## Getting Help

If you're still experiencing issues:

1. Check the browser console for error messages
2. Verify your OpenAI API key is working
3. Try the status endpoint: http://localhost:3002/api/status
4. Restart the development server
5. Check this troubleshooting guide

## Environment Variables

Make sure your `.env.local` file contains:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Important:** Never commit your API key to version control! 