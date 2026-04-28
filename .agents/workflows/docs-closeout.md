# Workflow: Docs Closeout

**Trigger:** Every task, regardless of scope, before committing.

**Purpose:** Ensure every task leaves a durable record that future agents and operators can read to understand what was done, how it was verified, and what to do next.

---

## Walkthrough file

Create or update `docs/walkthrough-<task-id>.md` before committing.

Naming:
```
docs/walkthrough-archon-006a.md
docs/walkthrough-archon-006b.md
docs/walkthrough-archon-007.md
```

## Required walkthrough sections

### 1. Header

```markdown
# Walkthrough — ARCHON-<NNN>: <Task Name>

**Repo:** `archon-workshop`
**Date:** <YYYY-MM-DD>
**Status:** Complete
```

### 2. Files Changed table

```markdown
| File | Action | Purpose |
|---|---|---|
| `src/lib/newModule.ts` | **NEW** | … |
| `src/features/…/Panel.tsx` | **MODIFIED** | … |
```

And a "Not modified (protected)" list naming every frozen file explicitly.

### 3. Technical description

Explain:
- What the new/changed code does
- Key design decisions and why they were made
- How it connects to existing components
- What was explicitly excluded and why

### 4. Commands run

```markdown
\```powershell
npm run lint    # → 0 errors
npm run build   # → ✓ N modules, exit 0
node --import=tsx/esm scripts/smoke-test-<task-id>.mjs
# → N passed, 0 failed
\```
```

### 5. Smoke test results (if applicable)

Section-by-section breakdown:
```
S1: <section name> — N assertions ✅
S2: <section name> — N assertions ✅
…
Total — N passed, 0 failed ✅
```

### 6. Browser verification results (if UI changed)

```markdown
| Step | Check | Result |
|---|---|---|
| Tab switch | Scene Lab panel renders | ✅ |
```

### 7. Acceptance criteria table

```markdown
| Criterion | Status |
|---|---|
| <criterion> | ✅ |
```

### 8. Known limitations

List any edge cases, gaps, deferred items, or assumptions made. This is the section where you surface follow-up recommendations without implementing them.

### 9. Recommended next task

Name the logical next task and why it follows from this one.

---

## Before the commit

- [ ] Walkthrough file exists and all sections are complete (no "TBD")
- [ ] `git diff --stat` reviewed — only expected files in the diff
- [ ] No frozen file appears in the diff without explicit acknowledgment
- [ ] `git add` lists only files from the confirmed plan
- [ ] Commit message follows the format: `feat|fix|docs|chore: TASK-ID — <description> (<N>/<N> assertions)`

## After the commit

- Run `git log --oneline -1` to capture the commit hash
- Include the hash in the closeout summary returned to the operator
- Push to `origin/main` and confirm success
