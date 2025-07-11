# 🌐 Real-time Translator v3

**Break language barriers instantly with real-time voice translation.**  
Mobile-first PWA enabling seamless English ↔ Spanish/Portuguese conversations on a single device.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.50-3ECF8E?logo=supabase)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-5.8-412991?logo=openai)](https://openai.com/)
[![UnoCSS](https://img.shields.io/badge/UnoCSS-66.3-4C4C4C?logo=css3)](https://unocss.dev/)

---

## ⚡ Quick Start (30 seconds)

```bash
# 1. Clone and install
git clone <repo-url>
cd translator-v3
npm install

# 2. Set up environment
cp .env.example .env.local
# Add your OpenAI API key and Supabase credentials

# 3. Start development server
npm run dev

# 4. Open in browser
# http://127.0.0.1:5173 (VPN-compatible)
```

🎯 **Ready to code!** See [SETUP.md](./docs/development/SETUP.md) for detailed setup or [ARCHITECTURE.md](./docs/technical/ARCHITECTURE.md) for system overview.

---

## 🚀 What This Is

**For Users**: Speak in your language on one side of the device, hand it to the other person to speak in their language, and see instant translations.

**For Developers**: A production-ready React PWA with mobile-first design, OpenAI translation pipeline, and comprehensive testing.

### ✨ Key Features
- 🎤 **Real-time Voice Translation** - Whisper STT → GPT-4o-mini → Native TTS
- 📱 **Mobile-First PWA** - Works offline, installable, touch-optimized
- ⚡ **Persistent Audio Stream** - Instant recording with no permission delays
- 🔄 **Single-Device Translation** - Perfect for face-to-face conversations
- 🌍 **3 Languages** - English, Spanish (Español), Portuguese (Português)
- 🎯 **Smart Permission Handling** - Only asks for microphone on first use
- ⚡ **Sub-100ms Feedback** - Real-time status, performance monitoring
- 🎨 **Modern UI** - Dark/light themes, animations, accessibility (WCAG 2.1 AA)

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | React 19 + TypeScript | Modern UI with type safety |
| **Build** | Vite | Lightning-fast development |
| **Styling** | UnoCSS | Utility-first CSS with performance |
| **Storage** | LocalStorage | Client-side data persistence |
| **AI** | OpenAI (Whisper, GPT-4o-mini, TTS) | Translation pipeline |
| **Audio** | PersistentAudioManager | Mobile-optimized recording |
| **Testing** | Playwright + Vitest | E2E and unit testing |
| **Deployment** | Vercel | Auto-deploy with serverless API |

---

## 📋 Essential Commands

```bash
# Development
npm run dev              # Start dev server (http://127.0.0.1:5173)
npm run dev:network      # Start with network access (0.0.0.0)

# Quality Assurance  
npm run test             # Run unit tests
npm run test:coverage    # Test coverage report
npx playwright test      # Run E2E tests
npm run lint             # ESLint check
npm run type-check       # TypeScript validation

# Build & Deploy
npm run build            # Production build
npm run preview          # Preview production build
npx vercel --prod        # Deploy to Vercel
```

---

## 📁 Project Structure

```
translator-v3/
├── 📄 CLAUDE.md              # Vibe coder workflow guide
├── 📄 README.md              # This file
├── 📄 CONTRIBUTING.md        # Development guidelines
├── 📄 docs/                  # Documentation directory
│   ├── 📁 technical/         # Architecture, API, Components, Testing
│   ├── 📁 development/       # Setup, Deployment, Troubleshooting
│   ├── 📁 user/              # User guide, FAQ
│   └── 📁 archive/           # Historical documentation
├── 🔧 src/
│   ├── 🎨 components/        # Reusable UI components
│   ├── ⚛️  features/          # Feature-based modules
│   │   ├── 📁 translator/    # Translation components
│   │   │   ├── 📄 solo/      # SoloTranslator (core UI)
│   │   │   └── 📄 SessionTranslator.tsx  # Session orchestrator
│   │   └── 📁 home/          # Home screen
│   ├── 📚 lib/               # Utilities & services
│   ├── 🌐 services/          # External integrations & business logic
│   │   ├── 📁 queues/        # Message queue management
│   │   ├── 📁 pipeline/      # Translation pipeline
│   │   ├── 📁 presence/      # Real-time presence
│   │   ├── 📁 realtime/      # Real-time connection
│   │   └── 📁 session/       # Session state management
│   └── 🧪 tests/             # Test utilities
├── 🧪 tests/                 # E2E tests (Playwright)
└── 📱 public/                # PWA assets & manifest
```

**Key Directories:**
- `src/features/translator/solo/` - **SoloTranslator** (core translation UI)
- `src/features/translator/SessionTranslator.tsx` - **SessionTranslator** (session orchestrator)
- `src/services/` - **Service Architecture** (queues, pipeline, presence, realtime, session)
- `src/lib/` - Core utilities (performance, caching, retry logic)
- `tests/` - E2E validation tests

---

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[SETUP.md](./docs/development/SETUP.md)** | Zero-to-hero setup guide | New developers |
| **[ARCHITECTURE.md](./docs/technical/ARCHITECTURE.md)** | System design & data flow | Technical contributors |
| **[API.md](./docs/technical/API.md)** | Service integrations | Backend developers |
| **[COMPONENTS.md](./docs/technical/COMPONENTS.md)** | UI patterns & design system | Frontend developers |
| **[TESTING.md](./docs/technical/TESTING.md)** | QA strategies & test writing | QA engineers |
| **[DEPLOYMENT.md](./docs/development/DEPLOYMENT.md)** | Production deployment | DevOps |
| **[TROUBLESHOOTING.md](./docs/development/TROUBLESHOOTING.md)** | Common issues & solutions | All developers |
| **[USER-GUIDE.md](./docs/user/USER-GUIDE.md)** | End-user instructions | Non-technical users |
| **[FAQ.md](./docs/user/FAQ.md)** | Frequently asked questions | End users |

---

## 🎯 Current Status

**Production Ready** - Single-device translator with advanced features:
- ✅ **Clean Architecture** - Service-based design with SoloTranslator + SessionTranslator
- ✅ **Phase 2D Complete** - Mega-component refactor finished (45% code reduction)
- ✅ Internationalization (3 languages)
- ✅ PWA with offline support
- ✅ WCAG 2.1 AA accessibility
- ✅ Performance optimization & caching
- ✅ Comprehensive error handling
- ✅ Master test suite passing

**Focus**: Perfected single-device translation experience with clean, maintainable architecture.

---

## 🤝 Contributing

1. **Check existing docs** - Read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines
2. **Run tests** - Ensure `npm test` and `npx playwright test` pass
3. **Follow patterns** - Use existing component and service patterns
4. **Update docs** - Keep documentation current with changes

---

## 📞 Support

- **Setup Issues**: See [SETUP.md](./docs/development/SETUP.md) and [TROUBLESHOOTING.md](./docs/development/TROUBLESHOOTING.md)
- **Technical Questions**: Check [API.md](./docs/technical/API.md) and [ARCHITECTURE.md](./docs/technical/ARCHITECTURE.md)  
- **User Questions**: See [USER-GUIDE.md](./docs/user/USER-GUIDE.md) and [FAQ.md](./docs/user/FAQ.md)
- **Bug Reports**: Use existing test patterns in `tests/` directory

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

---

**🚀 Ready to build real-time translation magic?** Start with [SETUP.md](./docs/development/SETUP.md) or dive into [ARCHITECTURE.md](./docs/technical/ARCHITECTURE.md)!