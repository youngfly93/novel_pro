# Novel Pro - AI-Powered WYSIWYG Editor

A Notion-style WYSIWYG editor with AI-powered autocompletion, enhanced with OpenRouter integration for multiple AI models.

## ✨ Features

- 🎨 **Notion-style Editor**: Clean, intuitive WYSIWYG editing experience
- 🤖 **AI-Powered Writing**: Multiple AI models for text generation and improvement
- 🔄 **Smart Model Fallback**: Automatically switches between AI models for optimal availability
- 📝 **Rich Text Editing**: Support for markdown, links, images, and more
- ⚡ **Real-time Collaboration**: Built with modern web technologies
- 🎯 **Customizable**: Easy to extend and customize

## 🚀 AI Capabilities

### Supported AI Models (in priority order):
1. **Claude 3.5 Sonnet** - High-quality responses for complex tasks
2. **GPT-4o Mini** - Fast and cost-effective alternative
3. **Llama 3.2 3B** - Free model for basic tasks

### AI Functions:
- **Continue Writing** - Extend your text naturally
- **Improve Writing** - Enhance clarity and style
- **Fix Grammar** - Correct grammar and spelling errors
- **Make Shorter** - Condense text while preserving meaning
- **Make Longer** - Expand text with additional details
- **Custom Commands** - Use natural language to transform text

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Editor**: Tiptap (ProseMirror-based)
- **AI Integration**: OpenRouter API with multiple model support
- **Styling**: Tailwind CSS
- **Build System**: Turbo (monorepo)
- **Package Manager**: pnpm

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/youngfly93/novel_pro.git
   cd novel_pro
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration**
   
   Create `.env.local` file in the `apps/web` directory:
   ```env
   # OpenRouter API Configuration
   OPENAI_API_KEY=your_openrouter_api_key_here
   OPENAI_BASE_URL=https://openrouter.ai/api/v1
   OPENAI_MODEL=anthropic/claude-3.5-sonnet
   
   # Optional: Vercel Blob (for image uploads)
   BLOB_READ_WRITE_TOKEN=your_blob_token_here
   
   # Optional: Vercel KV (for rate limiting)
   KV_REST_API_URL=your_kv_url_here
   KV_REST_API_TOKEN=your_kv_token_here
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 🔑 API Key Setup

### OpenRouter Setup
1. Visit [OpenRouter](https://openrouter.ai/)
2. Create an account and get your API key
3. Add credits to your account for paid models
4. Copy your API key to the `.env.local` file

### Supported Models
- `anthropic/claude-3.5-sonnet` (Recommended)
- `openai/gpt-4o-mini` (Cost-effective)
- `meta-llama/llama-3.2-3b-instruct:free` (Free tier)

## 🎮 Usage

### Basic Editing
- Type naturally in the editor
- Use `/` to open the command menu
- Format text with markdown shortcuts

### AI Features
- Select text and click the AI button
- Use `++` shortcut to trigger AI autocompletion
- Choose from various AI actions in the popup menu

### Custom AI Commands
- Select text and choose "Custom" from AI menu
- Type natural language instructions
- Example: "Make this more professional" or "Translate to Spanish"

## 🏗️ Project Structure

```
novel_pro/
├── apps/
│   └── web/                 # Next.js web application
│       ├── app/
│       │   └── api/
│       │       ├── generate/     # Main AI API endpoint
│       │       └── debug-env/    # Environment debugging
│       ├── components/      # React components
│       └── styles/         # CSS and styling
├── packages/
│   └── headless/           # Core editor logic
└── docs/                   # Documentation
```

## 🔧 Development

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript checks

### Key Features Implementation
- **Multi-model AI**: Automatic fallback between different AI providers
- **Error Handling**: Graceful degradation when AI services are unavailable
- **Rate Limiting**: Built-in protection against API abuse
- **Security**: API keys are server-side only, never exposed to client

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- Ensure Node.js 18+ support
- Set environment variables
- Build with `pnpm build`
- Serve the `apps/web/.next` directory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Novel](https://github.com/steven-tey/novel) - Original project inspiration
- [Tiptap](https://tiptap.dev/) - Excellent editor framework
- [OpenRouter](https://openrouter.ai/) - AI model access platform
- [Vercel](https://vercel.com/) - Deployment and infrastructure

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/youngfly93/novel_pro/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/youngfly93/novel_pro/discussions)
- 📧 **Contact**: Create an issue for any questions

---

**Made with ❤️ by [youngfly93](https://github.com/youngfly93)**
