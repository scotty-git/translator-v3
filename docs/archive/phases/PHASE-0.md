# Phase 0: Project Setup & Infrastructure

## Overview
Initialize the Real-time Translator v3 project with modern tooling and development environment.

## Goals
- Set up Vite + React 19 + UnoCSS (stable Tailwind alternative)
- Configure TypeScript with strict mode
- Establish code quality tools
- Create project structure
- Set up development environment with VPN detection
- Ensure localhost accessibility (127.0.0.1 for VPN users)

## Implementation Steps

### 1. Initialize Project
```bash
npm create vite@latest . -- --template react-ts
npm install
```

### 2. Install Dependencies
```bash
# Core dependencies
npm install @supabase/supabase-js openai react-router-dom
npm install -D @types/react @types/react-dom

# UnoCSS (stable Tailwind alternative)
npm install -D unocss @unocss/reset

# Development tools
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
npm install -D @vitejs/plugin-react
```

### 3. Configure TypeScript (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 4. Configure Vite (vite.config.ts)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import path from 'path'
import dns from 'dns'

// Force IPv4 first for NordVPN compatibility
dns.setDefaultResultOrder('ipv4first')

export default defineConfig({
  plugins: [react(), UnoCSS()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0' // CRITICAL: Must be 0.0.0.0 for proper binding
  }
})
```

### 5. UnoCSS Configuration (uno.config.ts)
```typescript
import { defineConfig, presetUno, presetWebFonts } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(), // Default preset with Tailwind-compatible utilities
    presetWebFonts({
      provider: 'none',
      fonts: {
        sans: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
        mono: 'ui-monospace,SFMono-Regular,"SF Mono",Consolas,"Liberation Mono",Menlo,monospace',
      },
    }),
  ],
  theme: {
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
    },
  },
})
```

### 6. Project Structure
```
translator-v3/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/        # Base UI components
│   │   └── layout/    # Layout components
│   ├── features/      # Feature-specific components
│   │   ├── session/   # Session management
│   │   ├── audio/     # Audio recording
│   │   └── messages/  # Message display
│   ├── hooks/         # Custom React hooks
│   ├── lib/          # Utilities and helpers
│   ├── services/     # API services
│   │   ├── openai/   # OpenAI integration
│   │   └── supabase/ # Supabase client
│   ├── types/        # TypeScript definitions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── phases/           # Phase documentation
├── tests/           # Test files
└── scripts/         # Development scripts
```

### 7. ESLint Configuration (.eslintrc.cjs)
```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
```

### 8. Prettier Configuration (.prettierrc)
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

### 9. VPN Detection Script (scripts/check-localhost.js)
```javascript
async function checkLocalhostAccess() {
  console.log('🔍 Checking localhost accessibility...\n')
  
  try {
    const response = await fetch('http://localhost:5173', {
      signal: AbortSignal.timeout(2000)
    })
    console.log('✅ Localhost is accessible!')
    console.log('🌐 Access your dev server at: http://localhost:5173\n')
    return true
  } catch (error) {
    console.warn('⚠️  Localhost might be blocked!\n')
    console.warn('Common causes:')
    console.warn('1. 🛡️  VPN software (NordVPN, ExpressVPN, etc.)')
    console.warn('2. 🔥 Firewall settings')
    console.warn('3. 🔧 Proxy configurations\n')
    console.warn('Solutions to try:')
    console.warn('• Temporarily disable VPN')
    console.warn('• Access via http://127.0.0.1:5173')
    console.warn('• Use your network IP (find with: ifconfig | grep inet)')
    console.warn('• Check firewall allows port 5173\n')
    return false
  }
}

// Auto-run check
checkLocalhostAccess()
```

### 10. Package.json Scripts
```json
{
  "name": "translator-v3",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:network": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "check:localhost": "node scripts/check-localhost.js",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit"
  }
}
```

### 11. Environment Variables (.env.example)
```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=your-openai-api-key-here

# Supabase Configuration (will be set in Phase 1)
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 12. Git Configuration (.gitignore)
```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Environment variables
.env
.env.local
.env.*.local

# Test coverage
coverage
*.lcov
```

### 13. Basic App Component (src/App.tsx)
```typescript
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    console.log('🚀 Real-time Translator v3 initialized')
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Real-time Translator v3
        </h1>
        <p className="text-center text-gray-600 mt-2">
          Phase 0: Project Setup Complete ✅
        </p>
      </div>
    </div>
  )
}

export default App
```

### 14. Main Entry (src/main.tsx)
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 15. Base Styles (src/index.css)
```css
@import "tailwindcss"; /* This is handled by UnoCSS */
```

### 16. Main Entry with CSS Imports (src/main.tsx)
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import '@unocss/reset/tailwind.css'
import 'uno.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

## Tests

### Test 1: Development Server
```bash
npm run dev
# Expected: Server starts on http://localhost:5173
# If using VPN: Access via http://127.0.0.1:5173
# Check console for "VITE v5.x.x ready in XXX ms"
```

### Test 2: VPN Detection
```bash
npm run check:localhost
# Expected: Shows localhost accessibility status
# If blocked, provides troubleshooting steps
```

### Test 3: Build Process
```bash
npm run build
# Expected: Creates dist/ folder with built assets
# No TypeScript or build errors
```

### Test 4: Type Checking
```bash
npm run type-check
# Expected: No TypeScript errors
```

### Test 5: Linting
```bash
npm run lint
# Expected: No ESLint errors or warnings
```

## Refactoring Checklist
- [ ] Remove Vite boilerplate (logo, counter, etc.)
- [ ] Delete unused CSS files
- [ ] Organize imports with consistent ordering
- [ ] Set up import aliases (@/components, @/lib, etc.)
- [ ] Configure VS Code settings for project
- [ ] Add pre-commit hooks with husky
- [ ] Set up commitlint for conventional commits

## Success Criteria
- [x] Dev server runs on port 5173 with 0.0.0.0 host
- [x] TypeScript strict mode enabled without errors
- [x] ESLint and Prettier working together
- [x] Project structure follows feature-based organization
- [x] VPN detection script functional
- [x] All dependencies installed and up to date
- [x] Build process completes successfully with UnoCSS
- [x] Hot Module Replacement (HMR) working
- [x] Localhost accessible via 127.0.0.1 when VPN is active

## Implementation Notes
- Using UnoCSS instead of Tailwind v4 (which had stability issues)
- UnoCSS provides Tailwind-compatible utilities with better performance
- All core dependencies installed including Supabase and OpenAI SDKs
- Environment variables configured with API keys
- VPN users must access via http://127.0.0.1:5173 instead of localhost

## VPN/Localhost Troubleshooting Guide

### CRITICAL: If Using VPN (NordVPN, ExpressVPN, etc.)
**Always access via:** http://127.0.0.1:5173 (NOT localhost)

### Quick Fix for macOS + VPN:
```bash
sudo networksetup -setproxybypassdomains Wi-Fi "*.local" "169.254/16" "localhost" "127.0.0.1" "::1" "[::1]"
```

## Common Issues & Solutions

### Issue: "Site can't be reached" on localhost:5173
**Solution**: 
1. Check vite.config.ts has `host: '0.0.0.0'`
2. If using VPN: Access via http://127.0.0.1:5173
3. Run VPN detection script: `npm run check:localhost`
4. Keep dev server running in dedicated terminal

### Issue: TypeScript errors on build
**Solution**: Ensure strict mode is configured properly and fix type errors

### Issue: UnoCSS styles not applying
**Solution**: 
1. Ensure `import 'uno.css'` is in main.tsx
2. Check uno.config.ts is properly configured
3. Restart dev server after config changes

### Issue: Dev server keeps stopping
**Solution**: 
1. Keep `npm run dev` in dedicated terminal
2. Use separate terminals for other commands
3. Never run commands in the dev server terminal

## Important Development Rules

1. **NEVER use default 120s timeout** - Always use 15s max for commands
2. **NEVER kill the dev server** - Keep it running in dedicated terminal
3. **ALWAYS test locally first** - Before deploying to Vercel
4. **ALWAYS use 127.0.0.1** - When VPN is active
5. **ALWAYS handle missing env vars** - Add fallbacks to prevent crashes

## Next Steps
- Phase 1: Set up Supabase integration and database schema
- Create .env file with actual API keys
- Test connection to external services