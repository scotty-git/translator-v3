When building or modifying UI, think like a designer. Start with reconnaissance, then apply thoughtful consistency.

**First, do your reconnaissance:**
- Look at 3-5 existing components for patterns
- Check the current spacing system (8px? 16px? 24px?)
- Find the button styles already in use (height, padding, border-radius)
- Identify the color variables/theme (primary, secondary, danger, etc.)
- Note hover states, transitions, and animation patterns
- Check how the app handles responsive breakpoints

**Then ensure consistency while asking why:**

**Spacing & Rhythm:**
- Follow the discovered spacing system (don't use random 5px if everything else uses 8px multiples)
- But ask: Does this component need to breathe more or less than others?
- Border radius should match (don't mix 4px and 8px without reason)

**Interactive Elements:**
- All clickable things need consistent hover/active states
- But consider: Should this button feel more or less prominent?
- Touch targets should be comfortable (roughly 44px) but proportional to context
- Disabled states should be visually clear

**Visual Hierarchy:**
- What should users see first? Make it obvious
- Text hierarchy should clarify what's clickable vs informational
- Group related actions, separate unrelated ones
- Use size, color, and space intentionally

**Modern Patterns to Include:**
- Loading states (skeleton screens or spinners?)
- Empty states (what if there's no data?)
- Error states (inline or toast notifications?)
- Mobile-first responsive design
- Basic accessibility (contrast, focus indicators, aria labels)

Remember: First match what exists, then thoughtfully decide where to deviate. Good UI feels inevitable because it's both consistent and contextually appropriate.