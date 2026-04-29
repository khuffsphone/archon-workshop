# Workflow: Evidence Receipt Enforcement

**Trigger:** Every implementation or verification task, before closeout.

**Purpose:** Ensure every task is closed with deterministic, checkable evidence rather than vague claims.

---

## The Core Rule

If evidence is missing, the task is not closed.

You cannot close a task by merely saying:
- "tests passed"
- "browser verified"
- "button visible"
- "all checks passed"

## Required Closeout Components

Every task closeout (and its accompanying walkthrough markdown file) **must** include the following elements. Use the template at `docs/evidence-receipt-template.md` as your structure.

### 1. Command Verification
For every verification step (lint, build, smoke tests):
- Exact command run
- Exit code
- Raw stdout/stderr excerpt (do not paraphrase! Include meaningful start, failures if any, and final pass/fail line)

### 2. Browser Evidence (if applicable)
If the task modified UI or user-facing behavior:
- Evidence ladder level reached (1-4, see `browser-verification.md`)
- The screenshot or recording name

### 3. Generated Artifact Hygiene (if applicable)
If the task involved file generation, export, or import:
- A generated artifact check confirming no runtime assets are staged (`git status -sb`, `git ls-files --others --exclude-standard`)

### 4. Git State
- `git diff --stat` output
- `git diff --name-only` output
- `git status -sb` output

## Enforcement

Before committing, run the lightweight evidence checker script on your walkthrough document:

```powershell
node scripts/check-evidence-receipt.mjs docs/walkthrough-<task-id>.md
```

If the script fails (exit code > 0), your closeout is incomplete. Fix the walkthrough document to include the missing evidence sections before committing.
