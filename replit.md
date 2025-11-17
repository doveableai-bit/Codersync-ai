# CodeSyncer AI

A modern web application that helps you automatically organize and sync code to GitHub.

## Overview
CodeSyncer AI allows users to:
- Paste paragraphs containing multiple code blocks and automatically detect, separate, and extract each one
- Upload code files directly (supports .txt, .js, .py, .html, .css, .json, .md, .zip)
- Automatically organize code into proper file/folder structures
- Sync all code to a GitHub repository with OAuth authentication
- Preview files and code structure before syncing

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **AI**: Google Gemini API for intelligent code parsing and extraction
- **Version Control**: GitHub OAuth integration for repository syncing
- **Styling**: Tailwind CSS (via CDN in index.html)

## Project Structure
```
/
├── components/          # React components
│   ├── CodeInput.tsx   # Main text/file input component
│   ├── FilePreview.tsx # File structure preview
│   ├── GithubSync.tsx  # GitHub integration UI
│   ├── Header.tsx      # App header with mode switching
│   └── Icons.tsx       # SVG icon components
├── services/           # API services
│   ├── geminiService.ts    # Gemini AI integration
│   └── githubService.ts    # GitHub API integration
├── utils/              # Utility functions
│   └── helpers.ts      # Helper functions
├── App.tsx             # Main app component
├── index.tsx           # App entry point
├── types.ts            # TypeScript type definitions
└── vite.config.ts      # Vite configuration

## Environment Variables
- `GEMINI_API_KEY`: Required - Google Gemini API key for AI-powered code parsing

## Development
The app runs on port 5000 using Vite's development server with HMR enabled.

## Key Features
1. **Paragraph Mode**: Paste text with multiple code blocks; AI automatically detects and separates them
2. **File Upload Mode**: Upload code files directly
3. **GitHub Integration**: OAuth authentication to sync code to repositories
4. **Smart File Organization**: AI-powered file naming and folder structure
5. **Live Preview**: See your organized files before syncing

## Recent Changes
- 2024-11-17: Configured for Replit environment
  - Updated port from 3000 to 5000
  - Added HMR configuration for Replit's proxy
  - Configured deployment settings
  - Integrated Gemini API key from Replit Secrets

## Security Notes
- GitHub Client ID and Secret are visible in the code (from original import)
- The code uses a CORS proxy for OAuth flow (demo purposes only)
- For production, implement proper backend OAuth flow
