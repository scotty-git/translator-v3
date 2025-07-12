#!/bin/bash
# safe-test-ascii.sh - Replaces ALL non-ASCII with [?]
npx playwright test "$@" 2>&1 | python3 -c "
import sys
for line in sys.stdin:
    output = ''
    for char in line:
        if ord(char) <= 127:
            output += char
        else:
            output += '[?]'
    print(output, end='')
"