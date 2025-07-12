#!/bin/bash
# safe-test-unicode.sh - Converts non-ASCII to Unicode escape sequences
# Preserves the information but makes it JSON-safe
npx playwright test "$@" 2>&1 | python3 -c "
import sys
for line in sys.stdin:
    output = ''
    for char in line:
        if ord(char) > 127:
            output += f'\\\\u{ord(char):04x}'
        else:
            output += char
    print(output, end='')
"