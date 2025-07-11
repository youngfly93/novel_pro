# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Novel is an open-source Notion-style WYSIWYG editor with AI-powered autocompletions. It's a monorepo built with Next.js, TypeScript, and Tiptap (based on ProseMirror).

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
- **AI Integration**: OpenAI API + Vercel AI SDK
- **Build Tools**: Turborepo, tsup, Biome

## Editor Extensions

The editor uses Tiptap extensions located in `packages/headless/src/extensions/`:
- Custom slash commands menu
- AI completion plugin
- Image upload with drag & resize
- Code blocks with syntax highlighting
- Mathematical expressions (KaTeX)
- Twitter embeds

## Environment Variables

For AI features in the demo app:
- `OPENAI_API_KEY` - Required for AI completions
- `BLOB_READ_WRITE_TOKEN` - For Vercel Blob storage (image uploads)

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