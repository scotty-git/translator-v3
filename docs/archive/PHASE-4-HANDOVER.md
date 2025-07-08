# Phase 4 Handover Prompt

Copy and paste this into a new Claude chat to continue with Phase 4:

---

I'm working on a real-time translator app (translator-v3). Phase 3 (Real-time Features) is now complete with all features working:

✅ Phase 3 Completed:
- Supabase real-time message sync
- Message queue system for guaranteed order delivery  
- Status indicators (typing, recording, processing)
- Performance logging system
- Connection recovery with progressive retry delays

The app is running locally at http://127.0.0.1:5173/ with the dev server in background.

**Current Status:**
- Database: Supabase project awewzuxizupxyntbevmg configured and working
- MCP: Supabase MCP configured in ~/.claude.json
- Real-time features: All tested and functional
- Dev server: Running with `nohup npm run dev > dev.log 2>&1 &`

**Ready for Phase 4: Audio & Translation**
According to PRD.md, Phase 4 should implement:
- Push-to-talk audio recording
- Audio format detection and fallback
- OpenAI Whisper integration  
- GPT-4o-mini translation with exact prompts
- TTS voice synthesis

Please read CLAUDE.md first with /recap command to understand the project context and my preferences, then proceed with Phase 4 implementation. Use the Supabase MCP when needed and context7 MCP for latest OpenAI API docs.

The OpenAI API key is in PRD.md line 295. Complete Phase 4 autonomously and only ping me if you need actions from me.

---

This prompt includes:
- Current project state
- What's completed
- Technical setup details
- Clear next steps
- Instructions to read CLAUDE.md
- Reference to API keys and MCP tools