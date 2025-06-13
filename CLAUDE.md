# Claude Instructions for Mock APIs

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Please read the README.md file for comprehensive information about this project, including architecture, development setup, testing, and contribution guidelines.

## Core Principles

### 1. Feedback-Driven Documentation Improvement

**When you receive feedback about code mistakes, always follow this pattern:**

1. **Fix the immediate issue** - Address the specific problem mentioned in the feedback
2. **Identify the root cause** - Ask: "Was this mistake caused by a gap in available information or documentation?"
3. **Update documentation** - Add guidelines to prevent future developers (including yourself) from making the same mistake
4. **Capture the learning** - Update this CLAUDE.md file with the lesson learned

**Why this matters:** Mistakes often stem from missing or unclear documentation. By turning feedback into documentation improvements, we create a continuous improvement cycle that benefits everyone.

### 2. Always Study Existing Patterns First

Before implementing any new feature, **always** examine existing similar implementations:

- For OAuth flows → Study `src/apis/eventpop.ts` as the reference pattern
- For API structure → Examine similar APIs in `src/apis/` directory  
- For testing approaches → Review existing test files and Tester classes

**Common mistake:** Overengineering solutions instead of following established patterns.

## Specific Lessons Learned

### LINE Login Implementation (PR #15)

**Mistakes made and lessons learned:**

1. **Code Duplication**
   - **Mistake:** Created similar HTML generation code in multiple files
   - **Lesson:** Always search for existing functionality before creating new components
   - **Fix:** Extract common patterns into reusable utilities (like `generateAuthorizePage()`)

2. **Wrong Testing Utilities**
   - **Mistake:** Used raw `fetch` instead of configured `apiFetch` from test-utils
   - **Lesson:** Always use the project's configured utilities - they exist for a reason
   - **Documentation updated:** README now includes clear guidance on when to use `api` vs `apiFetch` vs raw HTTP

3. **Overengineering OAuth Flow**
   - **Mistake:** Created complex custom authorize pages instead of simple redirects
   - **Lesson:** Follow the `eventpop.ts` pattern - OAuth endpoints should typically redirect to existing OAuth infrastructure
   - **Pattern:** `redirect('/oauth/protocol/openid-connect/auth?${queryParams})`

4. **Tests Too Long and Direct API Calls**
   - **Mistake:** Tests made direct API calls instead of using Tester pattern
   - **Lesson:** Follow the Test → Tester → api/apiFetch → services architecture
   - **Documentation updated:** Added comprehensive Tester pattern guidelines to README

## When You Make Mistakes

If you receive feedback about code issues:

1. **Don't just fix the code** - understand why the mistake happened
2. **Ask:** "What documentation could have prevented this?"
3. **Update the README** if it helps future developers
4. **Update this CLAUDE.md** if it's a pattern you should remember
5. **Look for similar issues** in the codebase that might need the same fix

## Commands to Remember

```bash
bun dev                 # Start development server
bun generate:types      # Generate types from OpenAPI specs  
bun test               # Run the test suite
```

Always run tests after making changes to ensure nothing is broken.