# Closeout Discipline — Archon Workshop

> Non-negotiable. A task is not complete until closeout is complete.

## Required closeout checklist

Every task must return all of the following before yielding control:

```
Files changed:
  <list each with NEW / MODIFIED / DELETED and the file path>

Commands run:
  <exact command and full output or exit code — not a summary>

Typecheck result:
  npm run lint → <0 errors / N errors>

Build result:
  npm run build → <exit code, module count>

Smoke test result (if applicable):
  node --import=tsx/esm scripts/smoke-test-<task-id>.mjs
  → <N passed, 0 failed>

Test Files Modified:
  <list any smoke scripts or test files changed — or "none">

Browser verification result (if UI changed):
  <screenshot or recording path — not a verbal description>

Walkthrough:
  docs/walkthrough-<task-id>.md → <NEW / UPDATED>

Known limitations:
  <list any edge cases, gaps, deferred items, or follow-up recommendations>

Commit hash:
  <short hash> — <full commit message>

Pushed:
  yes / no — <branch>
```

## Show Receipts Requirement

A closeout is invalid if it only says "tests passed," "build passed," or "all checks passed."

For each verification command, report:

1. **Exact command run**
2. **Exit code**
3. **Relevant raw stdout/stderr excerpt** — do not paraphrase
4. **Final pass/fail line**

Do not fabricate or paraphrase test output. If output is long, include the meaningful beginning, the failure section if any, and the final summary line.

This applies to:
- `npm run lint`
- `npm run build`
- `node --import=tsx/esm scripts/smoke-test-<task-id>.mjs`
- Any other verification command run as part of closeout

## What "not complete" looks like

- "Tests passed" without showing the count
- "No errors" without showing the command output
- "Committed" without showing the hash
- "The UI works" without a screenshot or recording
- No walkthrough doc created
- Walkthrough exists but still contains pending/TBD sections
- Test files were modified without a "Test Files Modified" disclosure
- Verification output is paraphrased or summarized instead of shown

## Walkthrough doc requirements

A walkthrough must contain:
- Files changed (table with action and purpose)
- Files NOT changed (protected list)
- How the feature works (brief technical description)
- Commands run and their output
- Smoke test results (section-by-section pass counts)
- Test Files Modified (table of any changed test/smoke files with reason — or "none")
- Browser verification results (if UI changed)
- Acceptance criteria table with ✅ / ❌ per criterion
- Known limitations
- Recommended next task

## Git hygiene

- `git add` only the files changed by this task — never `git add .`
- Run `git status -sb` after staging to confirm only expected files are staged
- If a file appears staged that was not in the confirmed plan, unstage it and report it
- Commit message format: `feat|fix|docs|chore: TASK-ID — <short description> (<smoke test result>)`

## Walkthrough naming

```
docs/walkthrough-archon-<NNN><optional-letter>.md
```

Examples: `walkthrough-archon-006a.md`, `walkthrough-archon-006b.md`, `walkthrough-archon-007.md`
