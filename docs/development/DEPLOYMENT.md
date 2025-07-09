# 🚀 Deployment Guide - Going Live

Complete guide to deploying the Real-time Translator to production with Vercel.

---

## 🎯 Deployment Overview

### Deployment Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│     Vercel      │    │   Supabase      │
│                 │    │                 │    │                 │
│ • Source Code   │    │ • Auto Deploy  │    │ • Database      │
│ • CI/CD Trigger │    │ • Edge CDN      │    │ • Real-time     │
│ • Environment   │    │ • SSL/HTTPS     │    │ • File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Why Vercel?
- **Zero-config deployment** from GitHub
- **Global CDN** with edge caching
- **Automatic HTTPS** and custom domains
- **Preview deployments** for every PR
- **Built-in analytics** and performance monitoring
- **Perfect for React/Vite** applications

---

## ⚡ Quick Deployment (5 minutes)

### 1. Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "feat: ready for production deployment"
git push origin main

# Verify build works locally
npm run build
npm run preview  # Test production build
```

### 2. Deploy to Vercel

**Option A: GitHub Integration (Recommended)**
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "New Project"
4. Select your translator repository
5. Click "Deploy" (Vercel auto-detects Vite)

**Option B: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project directory
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No  
# - Project name? translator-v3
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

### 3. Configure Environment Variables

In Vercel dashboard:
1. Go to **Project Settings** → **Environment Variables**
2. Add production environment variables:

```
VITE_OPENAI_API_KEY=sk-proj-your-production-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_ENV=production
```

### 4. Verify Deployment
```bash
# Your app will be live at:
# https://translator-v3.vercel.app
# or custom domain if configured
```

---

## 🔧 Production Configuration

### Build Optimization

**Vite Production Config** (`vite.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,        // Disable for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          openai: ['openai'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  preview: {
    port: 4173,
    host: true
  }
})
```

**Package.json Scripts**:
```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && vercel --prod",
    "deploy:preview": "vercel"
  }
}
```

### Environment Management

**Production Environment Variables**:
```bash
# Required for production
VITE_OPENAI_API_KEY=sk-proj-live-key-here
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key

# Optional production settings
VITE_ENV=production
VITE_ANALYTICS_ID=your-analytics-id
VITE_SENTRY_DSN=your-sentry-dsn
```

**Environment Validation**:
```typescript
// src/lib/env.ts
function validateEnv() {
  const required = [
    'VITE_OPENAI_API_KEY',
    'VITE_SUPABASE_URL', 
    'VITE_SUPABASE_ANON_KEY'
  ]
  
  const missing = required.filter(key => !import.meta.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
}

// Call on app startup
validateEnv()
```

---

## 🌐 Domain Configuration

### Custom Domain Setup

**1. Add Domain in Vercel**:
1. Go to Project Settings → **Domains**
2. Enter your domain: `translator.yourdomain.com`
3. Choose configuration type

**2. DNS Configuration**:

**For Subdomain** (translator.yourdomain.com):
```
Type: CNAME
Name: translator
Value: cname.vercel-dns.com
```

**For Root Domain** (yourdomain.com):
```
Type: A
Name: @
Value: 76.76.19.61

Type: A  
Name: @
Value: 76.223.126.88
```

**3. SSL Certificate**:
- Vercel automatically provides SSL certificates
- HTTPS redirect is enabled by default
- Certificates auto-renew

### Domain Examples

```bash
# Development
https://translator-v3-git-main-yourusername.vercel.app

# Production (auto-generated)
https://translator-v3.vercel.app  

# Custom domain
https://translator.yourdomain.com
```

---

## 🔄 CI/CD Pipeline

### Automatic Deployments

**GitHub Integration** automatically:
- **Deploys main branch** → Production
- **Deploys PRs** → Preview deployments  
- **Runs build checks** on every commit
- **Sends notifications** on deployment status

### Deployment Workflow

```yaml
# Automatic Vercel workflow (handled by Vercel)
name: Vercel Deployment
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Manual Deployment

```bash
# Deploy current branch to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
git checkout feature-branch
vercel

# Deploy with custom name
vercel --name translator-v3-staging
```

---

## 📊 Production Monitoring

### Vercel Analytics

**Built-in Metrics**:
- Page views and unique visitors
- Core Web Vitals (LCP, FID, CLS)
- Geographic performance data
- Top pages and referrers

**Enable Analytics**:
1. Vercel Dashboard → **Analytics**
2. Enable **Web Analytics**
3. Add to your app:

```typescript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
)
```

### Performance Monitoring

**Core Web Vitals Tracking**:
```typescript
// src/lib/performance.ts
export function trackWebVitals() {
  if (import.meta.env.PROD) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log)
      getFID(console.log)
      getFCP(console.log)
      getLCP(console.log)
      getTTFB(console.log)
    })
  }
}
```

**Error Tracking with Sentry** (Optional):
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react'

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production'
  })
}
```

---

## 🔐 Security Considerations

### Environment Security

**API Key Protection**:
```typescript
// ✅ Good: Environment variables (client-side visible but standard)
const apiKey = import.meta.env.VITE_OPENAI_API_KEY

// ❌ Bad: Hardcoded keys
const apiKey = 'sk-proj-hardcoded-key'
```

**Note**: Vite `VITE_*` variables are **client-side visible**. This is normal for frontend apps, but:
- Use **API key restrictions** in OpenAI dashboard
- Set **domain restrictions** for Supabase keys
- Use **rate limiting** and **usage monitoring**

### Content Security Policy

**Vercel Headers** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### HTTPS Enforcement

Vercel automatically:
- **Redirects HTTP → HTTPS**
- **Enables HSTS headers**
- **Provides SSL certificates**
- **Updates certificates automatically**

---

## 🎛️ Production Checklist

### Pre-Deployment

- [ ] **Environment variables** configured in Vercel
- [ ] **Build succeeds** locally (`npm run build`)
- [ ] **Tests pass** (`npm test && npx playwright test`)
- [ ] **Performance optimized** (lighthouse score >90)
- [ ] **Accessibility tested** (screen reader, keyboard)
- [ ] **Mobile tested** on real devices
- [ ] **Error boundaries** in place
- [ ] **Analytics** configured

### Post-Deployment

- [ ] **Smoke test** all critical features
- [ ] **SSL certificate** verified
- [ ] **Custom domain** working (if applicable)
- [ ] **Core Web Vitals** monitored
- [ ] **Error tracking** configured
- [ ] **Performance monitoring** active
- [ ] **Backup plan** documented

### Ongoing Maintenance

- [ ] **Monitor error rates** weekly
- [ ] **Check performance** monthly
- [ ] **Update dependencies** monthly
- [ ] **Review analytics** monthly
- [ ] **Test critical flows** before releases

---

## 🚨 Rollback Procedures

### Quick Rollback

**Option 1: Vercel Dashboard**
1. Go to **Deployments** tab
2. Find last working deployment
3. Click **Promote to Production**

**Option 2: Git Revert**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel auto-deploys the revert
```

**Option 3: Redeploy Previous Version**
```bash
# Checkout previous working commit
git checkout <previous-commit-hash>

# Force deploy
vercel --prod --force
```

### Emergency Procedures

**If Production is Down**:
1. **Check Vercel status** - [status.vercel.com](https://status.vercel.com)
2. **Check recent deployments** - Look for failed builds
3. **Rollback immediately** - Use dashboard or CLI
4. **Investigate root cause** - Check logs and errors
5. **Fix and redeploy** - Test thoroughly before production

**Communication Plan**:
```bash
# Status page updates
# User notifications (if applicable)
# Team notifications
# Post-mortem documentation
```

---

## 🔧 Advanced Configuration

### Vercel Serverless Functions

**API Proxy Configuration**:

The app uses Vercel serverless functions to securely proxy OpenAI API calls:

```typescript
// api/openai/[...path].ts
export default async function handler(req: Request) {
  // Proxy requests to OpenAI API
  // API key stored securely in Vercel environment
  const openaiUrl = `https://api.openai.com/v1/${path}`
  
  return fetch(openaiUrl, {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: req.body
  })
}
```

**Benefits**:
- ✅ **API key security** - Never exposed to client
- ✅ **CORS handling** - Automatic CORS configuration
- ✅ **Rate limiting** - Vercel handles abuse protection
- ✅ **Global edge network** - Low latency worldwide

### Vercel Configuration File

**Complete `vercel.json`**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Cache-Control", 
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Environment-Specific Builds

**Multiple Environments**:
```bash
# Development
vercel --target development

# Preview/Staging  
vercel --target preview

# Production
vercel --target production
```

**Environment Variables per Stage**:
- **Development**: Local `.env.local`
- **Preview**: Vercel preview environment variables
- **Production**: Vercel production environment variables

---

## 📈 Performance Optimization

### Build Optimization

**Bundle Analysis**:
```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true
    })
  ]
})

# Build and analyze
npm run build
```

**Performance Targets**:
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s  
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms
- **Bundle Size**: <500KB initial

### CDN Optimization

Vercel automatically:
- **Compresses assets** (gzip/brotli)
- **Caches static files** globally
- **Optimizes images** (if using Vercel Image)
- **Minifies code** in production
- **Preloads critical resources**

---

## 🔗 Related Documentation

- **[SETUP.md](./SETUP.md)** - Development environment setup
- **[TESTING.md](./TESTING.md)** - Pre-deployment testing
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Deployment issue solutions
- **[MONITORING.md](./MONITORING.md)** - Production monitoring (if exists)

---

## 📞 Support Resources

### Vercel Support
- **Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Status Page**: [status.vercel.com](https://status.vercel.com)

### Project-Specific
- **Build Logs**: Vercel Dashboard → Deployments → Build Logs
- **Function Logs**: Vercel Dashboard → Functions → Logs
- **Analytics**: Vercel Dashboard → Analytics

---

## 🎯 Success Metrics

**Deployment Success**:
- ✅ Build completes in <2 minutes
- ✅ App loads in <3 seconds globally
- ✅ All features work in production
- ✅ SSL certificate active
- ✅ Zero critical errors in first 24 hours

**Ongoing Success**:
- 📊 Core Web Vitals all green
- 📊 Error rate <0.1%
- 📊 Uptime >99.9%
- 📊 Performance score >90
- 📊 User satisfaction maintained