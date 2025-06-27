# Idea to Content - AI Blog Generator

A full-stack AI-powered blog content generator built with Next.js, React, and OpenAI. Create complete blog posts with guided inputs, multiple formats, and intelligent content generation.

## 🚀 Features

- **Multi-step Content Creation**: Guided workflow from keywords to complete blog
- **Multiple Blog Formats**: Listicle, Informative, Solution-based, How-to, Case Study
- **Smart Title Generation**: 5 different emphasis styles for SEO-optimized titles
- **Reference Integration**: Upload PDFs, add URLs, or paste custom text
- **Real-time Preview**: See generated content with copy and export options
- **Modern UI**: Beautiful interface built with Tailwind CSS and React

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: OpenAI GPT-4o
- **File Processing**: PDF parsing, URL scraping with Cheerio
- **UI Components**: Custom components with modern design

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd idea-to-content
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Get your OpenAI API key**
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Create an account or sign in
   - Navigate to API Keys section
   - Create a new API key
   - Copy and paste it into your `.env.local` file

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 How to Use

### Step 1: Add Keywords
- Enter relevant keywords for your blog topic
- Each keyword should be on a new line
- Keywords will be used for SEO optimization

### Step 2: Configure Blog Settings
- Choose blog format (Listicle, Informative, etc.)
- Select word count range
- Set number of paragraphs
- Adjust creativity level (temperature)

### Step 3: Generate Titles
- Click "Generate Titles" to create 5 different title options
- Each title uses a different emphasis style:
  - **Keyword Emphasis**: SEO-focused
  - **Concept Emphasis**: Topic-centered
  - **Solution Emphasis**: Problem-solution
  - **Viral Emphasis**: Clickbait-style
  - **Hybrid Emphasis**: Balanced approach

### Step 4: Add References (Optional)
- Upload PDF, TXT, or DOCX files
- Add reference URLs for content scraping
- Paste custom reference text or outlines

### Step 5: Generate Content
- Click "Generate Blog" to create complete content
- AI will generate:
  - Meta description
  - Introduction
  - Body paragraphs
  - Conclusion
  - Call-to-action (if applicable)

### Step 6: Export & Copy
- Copy content to clipboard
- Export as Markdown file
- Use the generated content in your CMS

## 🔧 API Endpoints

### `/api/generate-titles`
Generates 5 blog titles with different emphasis styles.

**Request:**
```json
{
  "keywords": ["keyword1", "keyword2"],
  "blogType": "Informative",
  "emphasisTypes": ["Keyword Emphasis", "Concept Emphasis", ...]
}
```

### `/api/generate-blog`
Generates complete blog content based on form data.

**Request:**
```json
{
  "keywords": ["keyword1", "keyword2"],
  "blogType": "Informative",
  "wordCount": "500-800",
  "paragraphs": "5-7",
  "selectedTitle": "Your Blog Title",
  "references": {
    "files": [],
    "urls": [],
    "customText": ""
  },
  "temperature": 0.8
}
```

## 📁 Project Structure

```
idea-to-content/
├── app/
│   ├── api/
│   │   ├── generate-blog/
│   │   └── generate-titles/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── BlogPreview.tsx
│   ├── BlogTypeSelector.tsx
│   ├── KeywordInput.tsx
│   ├── ReferenceInput.tsx
│   └── TopicGenerator.tsx
├── lib/
│   └── reference-processor.ts
├── types/
│   └── blog.ts
├── package.json
├── tailwind.config.js
└── README.md
```

## 🎨 Customization

### Styling
- Modify `tailwind.config.js` for custom colors and themes
- Update `app/globals.css` for additional custom styles

### AI Prompts
- Edit API route files to customize AI prompts
- Adjust temperature and max_tokens for different content styles

### Blog Formats
- Add new blog types in `types/blog.ts`
- Update `BlogTypeSelector.tsx` with new options

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
- **Netlify**: Configure build settings for Next.js
- **Railway**: Add environment variables and deploy
- **DigitalOcean App Platform**: Use Next.js preset

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Verify your OpenAI API key is correct
3. Ensure all dependencies are installed
4. Check that your environment variables are set

## 🔮 Future Enhancements

- [ ] Streaming content generation
- [ ] Multiple language support
- [ ] Content templates
- [ ] SEO analysis tools
- [ ] Social media post generation
- [ ] Content scheduling
- [ ] Team collaboration features

---

Built with ❤️ using Next.js and OpenAI 