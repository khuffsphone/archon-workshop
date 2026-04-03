---
name: patch-task
description: >
  Specialist instructions for small, localized patch tasks — single-file edits,
  balance tweaks, copy changes. Runs in Fast Mode. No plan required. Must still
  produce a walkthrough artifact.
---

# Patch Task Skill

## When to Use

- Scope is **one file** or a tightly bounded set of lines.
- Change is unambiguous (fix a bug, adjust a constant, correct a string).
- No architectural decisions required.

## Step-by-Step

### 1. Verify scope is truly small

If you discover during research that the change touches more than one component
or requires a design decision, **stop** and switch to Planning Mode immediately.

### 2. Make the edit

- Use `replace_file_content` for a single contiguous block.
- Use `multi_replace_file_content` for multiple non-adjacent lines in the same file.
- Never overwrite an entire file unless scope explicitly requires it.

### 3. Verify

- Run any relevant lint or test command.
- If the change affects UI, use the Scene Lab Review skill to capture proof.

### 4. Leave a walkthrough artifact

Even for tiny patches, write a `walkthrough.md`:

```markdown
# Patch Walkthrough — <brief description>
**Date**: <ISO date>
**Mode**: Fast

## What Changed
- File: `<path>`
- Lines: <range>
- Summary: <one sentence>

## Verification
- [ ] Lint/tests pass
- [ ] Screenshot / recording: <path or "N/A">
```

## Rules

- Fast Mode only. If the task grows, escalate to Planning Mode.
- The walkthrough artifact is **required** even for one-line fixes.
