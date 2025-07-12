# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Novel Pro is an enhanced version of the open-source Notion-style WYSIWYG editor with AI-powered autocompletions. It features OpenRouter integration for multiple AI models with automatic fallback, runtime API configuration, and enhanced AI capabilities. Built as a monorepo with Next.js, TypeScript, and Tiptap (based on ProseMirror).

## Architecture

The project uses a monorepo structure with:
- `apps/web/` - Next.js demo application showcasing the editor
- `packages/headless/` - Core editor package (published as "novel" on npm)
- `packages/tsconfig/` - Shared TypeScript configurations

The core editor (`packages/headless`) is framework-agnostic and can be integrated into any React application.

## Essential Commands

```bash
# Development
pnpm dev          # Start all packages in development mode
pnpm build        # Build all packages

# Code Quality (run these before committing!)
pnpm lint         # Run Biome linter
pnpm lint:fix     # Auto-fix linting issues
pnpm format       # Check code formatting
pnpm format:fix   # Auto-fix formatting issues
pnpm typecheck    # Run TypeScript type checking

# Publishing
pnpm changeset    # Create a changeset for version updates
pnpm version:packages  # Version packages with changesets
pnpm publish:packages  # Publish to npm

# Cleanup
pnpm clean        # Clean all build artifacts
```

## Development Workflow

1. **Before making changes**: Run `pnpm dev` to start the development server
2. **After making changes**: Always run `pnpm lint:fix`, `pnpm format:fix`, and `pnpm typecheck`
3. **For commits**: Use conventional commit format (feat:, fix:, chore:, etc.)

## Key Technologies

- **Editor Core**: Tiptap v2 (ProseMirror-based)
- **UI Components**: Radix UI with Tailwind CSS
- **State Management**: Jotai for editor state
- **AI Integration**: OpenRouter API with multi-model support (Claude 3.5 Sonnet, GPT-4o Mini, Llama 3.2 3B)
- **Build Tools**: Turborepo, tsup, Biome
- **Runtime**: Vercel Edge Functions for AI endpoints

## Editor Extensions

The editor uses Tiptap extensions located in `packages/headless/src/extensions/`:
- Custom slash commands menu
- AI completion plugin
- Image upload with drag & resize
- Code blocks with syntax highlighting
- Mathematical expressions (KaTeX)
- Twitter embeds

## Environment Variables

The app supports both environment-based and runtime API configuration:

**For AI features** (Optional - can be configured via web interface):
- `OPENAI_API_KEY` - OpenRouter or OpenAI API key
- `OPENAI_BASE_URL` - API base URL (defaults to https://openrouter.ai/api/v1)
- `OPENAI_MODEL` - Default model (defaults to anthropic/claude-3.5-sonnet)

**For additional features**:
- `BLOB_READ_WRITE_TOKEN` - For Vercel Blob storage (image uploads)
- `KV_REST_API_URL` - For Vercel KV (rate limiting)
- `KV_REST_API_TOKEN` - For Vercel KV authentication

## Code Style Guidelines

- Use Biome for all linting and formatting (no ESLint/Prettier)
- Follow existing patterns in the codebase
- Components use `.tsx` extension, utilities use `.ts`
- Tailwind classes for styling (no CSS modules)
- Prefer composition over inheritance
- Use TypeScript strict mode

## Testing

Currently, the project does not have a test suite. When implementing features, ensure manual testing in the demo app.

## Package Structure

The headless package exports:
- Core editor components (`EditorRoot`, `EditorContent`, etc.)
- All Tiptap extensions
- Utility functions and hooks
- TypeScript types

When modifying the headless package, ensure changes are backward compatible as it's published to npm.

## AI Configuration

This project supports flexible AI configuration:

**Runtime Configuration** (Recommended):
- Access via `/settings` page in the web app
- Configure API keys, models, and providers without redeployment
- Supports OpenRouter and OpenAI providers
- Settings stored locally in browser for security

**API Endpoints**:
- `/api/generate` - Main AI completion endpoint with multi-model fallback
- `/api/test-api-key` - Validates API configuration
- `/api/debug-env` - Environment debugging (development only)

**Model Priority** (OpenRouter):
1. `anthropic/claude-3.5-sonnet` - High-quality responses
2. `openai/gpt-4o-mini` - Cost-effective alternative  
3. `meta-llama/llama-3.2-3b-instruct:free` - Free tier model