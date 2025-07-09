# Claude Code Commands & Setup Guide

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [CLI Aliases](#cli-aliases)
3. [Core Commands](#core-commands)
4. [Custom Slash Commands](#custom-slash-commands)
5. [Configuration & Settings](#configuration--settings)
6. [MCP Server Setup](#mcp-server-setup)
7. [Dangerous Mode](#dangerous-mode)
8. [Uninstall & Reinstall](#uninstall--reinstall)
9. [Backup Checklist](#backup-checklist)

---

## Installation & Setup

### Fresh Installation
```bash
# Install Claude Code globally via npm
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### Setting Up API Key
```bash
# Set your API key (get from https://console.anthropic.com/account/keys)
export ANTHROPIC_API_KEY="your-api-key-here"

# Or add to your shell profile (~/.zshrc or ~/.bashrc)
echo 'export ANTHROPIC_API_KEY="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

---

## CLI Aliases

### Setting up the `cld` alias
Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# Basic Claude alias
alias cld='claude'

# Claude with dangerous mode (skip all permissions)
alias cldd='claude --dangerously-skip-permissions'

# Claude with specific model
alias cld-opus='claude --model claude-3-opus-20240229'

# Claude with MCP debug mode
alias cld-debug='claude --mcp-debug'

# Claude with custom config
alias cld-config='claude --config ~/.claude/custom-config.json'
```

After adding, reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

---

## Core Commands

### Session Management

#### Start New Session
```bash
claude                    # Start interactive session
claude "Fix the auth bug" # Start with specific task
```

#### Resume Last Session
```bash
claude --resume           # Continue last session with context
claude -r                 # Short form
```

#### List Sessions
```bash
claude sessions           # Show all past sessions
claude sessions --limit 10 # Show last 10 sessions
```

### Context Management

#### Clear Context
```
/clear
```
Resets conversation history within current session. Use when:
- Switching to unrelated task
- Context getting cluttered
- Want fresh perspective

#### Compact Context
```
/compact
```
Summarizes conversation to save context window space. Use after:
- Completing a feature
- Making a commit
- Natural breakpoint

### Project Commands

#### Initialize Project
```
/init
```
Creates `CLAUDE.md` file in project root with:
- Project architecture notes
- Coding conventions
- Dependencies
- Custom instructions

#### Read Project Context
```
/recap
```
Reads the CLAUDE.md file to understand project preferences

---

## Custom Slash Commands

### Built-in Commands

#### `/chat` - Conversational Mode
```
/chat
```
- No code generation unless asked
- Provides 3 solution options (🥇 Best, 🥈 Alternative, 🥉 Quick)
- Pure discussion mode

#### `/ui` - UI Development Mode
```
/ui
```
Triggers design reconnaissance:
1. Analyzes 3-5 existing components
2. Checks spacing system
3. Identifies color variables
4. Notes animations/transitions
5. Reviews responsive breakpoints

#### `/user-instructions` - Generate User Docs
```
/user-instructions
```
Creates comprehensive non-technical guides for the app

#### `/test-console-logging` - Enhanced Debug Mode
```
/test-console-logging
```
Outputs detailed test results to browser console with:
- Clear formatting
- Emoji prefixes
- Structured output

#### `/pp` - Pre-Planning Phase
```
/pp
```
Analyzes request from multiple perspectives:
- UX implications
- Technical approach
- Scope definition
- Risk assessment
- Clarifying questions

### Creating Custom Commands

1. Create directory:
```bash
mkdir -p .claude/commands
```

2. Add command file (e.g., `.claude/commands/debug.md`):
```markdown
# Debug Command

Please help me debug this issue by:
1. Analyzing error logs
2. Checking recent changes
3. Running relevant tests
4. Providing fix suggestions
```

3. Use in Claude:
```
/debug
```

---

## Configuration & Settings

### Global Settings
Location: `~/.claude/settings.json`

```json
{
  "model": "claude-3-opus-20240229",
  "autoAcceptPermissions": {
    "edit": true,
    "write": true,
    "run": true
  },
  "preferredNotifChannel": "terminal_bell",
  "hooks": {
    "after_command": "say 'Task completed' && afplay /System/Library/Sounds/Hero.aiff"
  }
}
```

### Project Settings
Location: `.claude/settings.json` (in project root)

```json
{
  "autoAcceptPermissions": {
    "edit": true,
    "write": true,
    "run": true
  },
  "testCommand": "npm test",
  "lintCommand": "npm run lint",
  "formatCommand": "npm run format"
}
```

### Hook Configuration
Hooks run shell commands on events:

```json
{
  "hooks": {
    "before_edit": "echo 'Editing file...'",
    "after_edit": "git add -A",
    "after_command": "afplay /System/Library/Sounds/Hero.aiff",
    "on_error": "say 'Error occurred'"
  }
}
```

---

## MCP Server Setup

### Configure MCP Servers

1. Create/edit `~/.claude.json`:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=your-project-ref"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-access-token"
      }
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "config": {
        "directories": ["/Users/username/projects"]
      }
    }
  }
}
```

2. Project-specific MCP (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "puppeteer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

3. Debug MCP issues:
```bash
claude --mcp-debug
```

### This Project's MCP Setup

#### Current Configuration (`.claude.json`)
This project has a Supabase MCP server configured:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=awewzuxizupxyntbevmg"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_ace62b032309231cd0018277bfff89638c39a0be"
      }
    }
  }
}
```

#### What This Gives You
With the Supabase MCP server configured, Claude has access to:
- **Database Operations**: Create, read, update, delete operations on Supabase tables
- **Real-time Features**: Manage real-time subscriptions and channels
- **Storage Management**: Handle file uploads and storage buckets
- **Auth Management**: User authentication and permissions
- **Functions**: Execute edge functions and stored procedures

#### Supabase Project Details
- **Project Reference**: `awewzuxizupxyntbevmg`
- **Project URL**: `https://awewzuxizupxyntbevmg.supabase.co`
- **Database Schema**: Includes tables for messages, sessions, users
- **Real-time Channels**: Used for live translation message sync

#### How to Use in Claude
When Claude has the Supabase MCP server active, you can ask it to:
- Query database tables directly
- Update real-time configurations
- Check storage buckets
- Manage database migrations
- Debug connection issues

Example commands:
```
"Show me all messages in the database"
"Check the real-time channel configuration"
"List all active sessions"
"Update the message status to 'delivered'"
```

#### Verifying MCP Connection
To check if MCP is working:
```bash
# Run Claude with MCP debug flag
claude --mcp-debug

# In Claude, ask:
"Can you connect to the Supabase database?"
```

#### Troubleshooting MCP
If MCP isn't working:
1. Check that `.claude.json` exists in project root
2. Verify the access token is valid
3. Ensure you have internet connection
4. Try restarting Claude: `exit` then `claude`
5. Check debug output: `claude --mcp-debug`

#### Security Notes
- The access token in `.claude.json` is project-specific
- Don't commit `.claude.json` to public repos
- Consider using environment variables for tokens in shared projects
- The token has full access to your Supabase project

---

## Dangerous Mode

### What is Dangerous Mode?
Skips ALL permission prompts for:
- File edits
- File creation
- Command execution
- System operations

### How to Use

#### Command Line Flag
```bash
claude --dangerously-skip-permissions
```

#### With Alias
```bash
# Add to ~/.zshrc
alias cldd='claude --dangerously-skip-permissions'

# Use
cldd "Fix all the lint errors"
```

#### Combine with Other Flags
```bash
claude --dangerously-skip-permissions --resume
claude --dangerously-skip-permissions --model claude-3-opus-20240229
```

### Use Cases
- Fixing lint errors across many files
- Generating boilerplate code
- Automated refactoring
- Batch file operations
- CI/CD scripts

### Safety Notes
- Only use in trusted environments
- Review changes with `git diff` after
- Consider using in a separate branch
- Not recommended for production systems

---

## Uninstall & Reinstall

### Complete Uninstall

1. Remove Claude Code package:
```bash
npm uninstall -g @anthropic-ai/claude-code
```

2. Remove configuration files:
```bash
# Backup first!
cp -r ~/.claude ~/claude-backup

# Remove configs
rm -rf ~/.claude
rm -f ~/.claude.json
```

3. Remove project configs:
```bash
# In each project
rm -rf .claude/
rm -f .claude.json
rm -f CLAUDE.md
```

4. Remove from shell profile:
```bash
# Remove these lines from ~/.zshrc or ~/.bashrc
# - export ANTHROPIC_API_KEY="..."
# - alias cld='claude'
# - etc.
```

### Clean Reinstall

1. Install fresh:
```bash
npm install -g @anthropic-ai/claude-code
```

2. Restore configs:
```bash
# Restore from backup
cp -r ~/claude-backup ~/.claude
```

3. Set API key:
```bash
export ANTHROPIC_API_KEY="your-key"
```

4. Verify:
```bash
claude --version
```

---

## Backup Checklist

Before uninstalling, backup these files:

### Global Files
- [ ] `~/.claude/settings.json` - Global settings
- [ ] `~/.claude.json` - MCP server configs
- [ ] `~/.claude/commands/` - Custom commands
- [ ] Shell profile aliases (from `~/.zshrc` or `~/.bashrc`)
- [ ] API key from environment

### Project Files (for each project)
- [ ] `.claude/settings.json` - Project settings
- [ ] `.claude/commands/` - Project commands
- [ ] `.claude.json` - Project MCP servers
- [ ] `.mcp.json` - Shared MCP config
- [ ] `CLAUDE.md` - Project instructions

### Backup Script
```bash
#!/bin/bash
# Save as backup-claude.sh

BACKUP_DIR="$HOME/claude-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Global configs
cp -r ~/.claude "$BACKUP_DIR/"
cp ~/.claude.json "$BACKUP_DIR/" 2>/dev/null

# Current project
cp -r .claude "$BACKUP_DIR/project-claude" 2>/dev/null
cp .claude.json "$BACKUP_DIR/project-claude.json" 2>/dev/null
cp CLAUDE.md "$BACKUP_DIR/" 2>/dev/null
cp .mcp.json "$BACKUP_DIR/" 2>/dev/null

# Shell configs
grep -E "(claude|ANTHROPIC)" ~/.zshrc > "$BACKUP_DIR/shell-aliases.txt" 2>/dev/null
grep -E "(claude|ANTHROPIC)" ~/.bashrc >> "$BACKUP_DIR/shell-aliases.txt" 2>/dev/null

echo "Backup completed to: $BACKUP_DIR"
```

---

## Quick Reference Card

### Most Used Commands
```bash
cld                           # Start Claude
cldd                          # Dangerous mode (no prompts)
cld --resume                  # Resume last session
/clear                        # Clear context
/compact                      # Compress context
/init                         # Create CLAUDE.md
/recap                        # Read CLAUDE.md
```

### Key Configs to Remember
1. API Key: `ANTHROPIC_API_KEY` environment variable
2. Global settings: `~/.claude/settings.json`
3. MCP servers: `~/.claude.json`
4. Project instructions: `CLAUDE.md`
5. Auto-accept: Set in settings.json

### Your Specific Setup
- Alias: `cld` → `claude`
- Dangerous mode alias: `cldd` → `claude --dangerously-skip-permissions`
- MCP Server: Supabase (project: awewzuxizupxyntbevmg)
- Hooks: Hero sound + voice announcement on completion
- Chat logs: Auto-created in `chat-logs/` directory

---

This guide should help you maintain your Claude Code setup even after a complete reinstall. Keep this file safe!