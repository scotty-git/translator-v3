#!/bin/bash
# setup-safe-playwright.sh - One-time setup for safe Playwright testing
#
# This script ensures the sanitizer is ready to use and provides
# helpful information about preventing Claude Code corruption.

echo "🛡️  Setting up Safe Playwright Testing..."
echo ""

# Make sure all scripts are executable
chmod +x scripts/safe-test-*.sh

# Check if scripts exist
if [ ! -f "scripts/safe-test-smart.sh" ]; then
    echo "❌ Error: safe-test-smart.sh not found in scripts directory!"
    echo "Please ensure you have the sanitizer scripts in place."
    exit 1
fi

echo "✅ Sanitizer scripts are executable"
echo ""
echo "🚨 CRITICAL INFORMATION:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEVER run Playwright tests directly with 'npx playwright test'"
echo "This can corrupt ~/.claude.json and break your Claude Code session!"
echo ""
echo "ALWAYS use one of these commands instead:"
echo "  • npm run test:e2e"
echo "  • ./scripts/safe-test-smart.sh [test-file]"
echo "  • npm run test:playwright"
echo ""
echo "The sanitizer removes Unicode/emoji characters that cause corruption."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Run 'npm run' to see all available test commands."
echo ""
echo "✅ Setup complete! Safe testing is ready."