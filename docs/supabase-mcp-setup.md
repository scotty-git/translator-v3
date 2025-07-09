# Supabase MCP Setup (Project Level)

## Overview
This project has a project-level Supabase MCP server configured, providing direct access to Supabase management tools within Claude Code.

## Configuration
- **Location**: `.mcp.json` (in project root)
- **Scope**: Project-level only (not available in other projects)
- **Mode**: Read-only (for safety)
- **Project**: awewzuxizupxyntbevmg

## Available Tools
Once activated, you'll have access to:
- `list_tables` - View all database tables
- `execute_sql` - Run read-only SQL queries
- `get_project` - Get project details
- `get_logs` - View service logs (api, postgres, etc.)
- `search_docs` - Search Supabase documentation
- `generate_typescript_types` - Generate types from schema

## Security Notes
- `.mcp.json` is gitignored to protect the access token
- Server runs in read-only mode to prevent accidental changes
- Token is scoped to this specific project only

## Activation
1. Restart Claude Code after setup
2. Approve the MCP server when prompted
3. Tools will be available in this project only