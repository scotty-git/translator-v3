#!/bin/bash
# safe-test-smart.sh - Smart replacement of Unicode characters
#
# 🚨 CRITICAL: This script prevents Claude Code JSON corruption!
# 
# NEVER run Playwright tests directly - they output Unicode/emoji characters
# that corrupt ~/.claude.json and break your entire Claude Code session.
#
# This sanitizer replaces ALL non-ASCII characters with safe, readable labels
# so Claude can process test output without corruption.
#
# Usage:
#   ./scripts/safe-test-smart.sh tests/my-test.spec.ts
#   ./scripts/safe-test-smart.sh --project=chromium
#
# What it does:
# - Emojis → [EMOJI]
# - Arrows → [ARROW]  
# - Symbols → [SYM]
# - Accented letters → plain ASCII (é→e, ñ→n)
# - Everything else → [U+XXXX] format
#
# This MUST be used for ALL Playwright test runs to prevent corruption!

npx playwright test "$@" 2>&1 | python3 -c "
import sys
import unicodedata

def safe_char(char):
    code = ord(char)
    if code <= 127:
        return char
    
    # Get Unicode category
    category = unicodedata.category(char)
    
    # Emoji and symbols
    if 0x1F300 <= code <= 0x1F9FF:
        return '[EMOJI]'
    # Arrows
    elif 0x2190 <= code <= 0x21FF:
        return '[ARROW]'
    # Box drawing
    elif 0x2500 <= code <= 0x257F:
        return '[BOX]'
    # Math symbols
    elif category.startswith('Sm'):
        return '[MATH]'
    # Currency
    elif category == 'Sc':
        return '[CURR]'
    # Other symbols
    elif category.startswith('S'):
        return '[SYM]'
    # Letters with accents
    elif category.startswith('L'):
        # Try to get ASCII equivalent
        try:
            normalized = unicodedata.normalize('NFD', char)
            ascii_char = normalized.encode('ascii', 'ignore').decode('ascii')
            if ascii_char:
                return ascii_char
        except:
            pass
        return '[CHAR]'
    else:
        return '[U+{:04X}]'.format(code)

for line in sys.stdin:
    output = ''.join(safe_char(c) for c in line)
    print(output, end='')
"