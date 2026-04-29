# Workflow: Generated Artifact Hygiene

**Trigger:** Any task that generates, saves, exports, imports, or writes files to disk. This includes:

- AI image or audio generation (files written to `public/generated/`)
- ZIP export or import operations
- Manifest writes or updates (`asset-manifest.json`)
- Any `fs.writeFile` / `fs.copyFile` path in the server pipeline

**When NOT needed:** Pure in-memory logic changes, CSS-only changes, doc-only changes, lint/build fixes with no file output.

---

## Purpose

Generated files are not source-controlled. They must never be committed to git. They must also not be faked, pre-seeded, or referenced in walkthroughs via local machine paths.

This workflow enforces the boundary between source-controlled implementation code and runtime-generated output.

---

## Pre-Task Checks

Before starting any task that involves file generation or export:

1. **Confirm `.gitignore` covers generated output directories:**
   - `public/generated/` — AI-generated assets
   - `public/exports/` — ZIP export bundles
   - `*.zip` — export archives

   ```powershell
   git check-ignore -v public/generated/ public/exports/
   ```

   If either path is NOT ignored, stop. Do not generate files until the `.gitignore` is corrected.

2. **Do not pre-seed generated files.** Do not copy assets into `public/generated/` manually to simulate success. The generation pipeline must produce them.

3. **Do not reference local machine paths in documentation.** Paths like `C:\Users\KHuff\...` or `.gemini\brain\...` must not appear in committed walkthrough files.

---

## During Generation

- **Do not mark an asset `approved` or `completed` without real generation success.** Queue entries must only transition to `completed` when the server pipeline returns an actual success result with a real file path.

- **Do not write to frozen manifest paths.** Only the server's `save-asset` endpoint writes to `asset-manifest.json`. Do not write manifest data from client-side code directly.

- **Do not write outside designated output directories.** Generated files belong in `public/generated/`. Do not scatter files into `src/`, `dist/`, or the repo root.

---

## After Generation

When a task generates or exports files, include this check in the closeout:

```powershell
# Confirm generated files are not staged
git status -sb
git ls-files --others --exclude-standard
```

Expected: no files from `public/generated/` or `public/exports/` appear in the untracked or staged lists (they should be gitignored).

If a generated file appears in `git status` output, **do not commit**. Report it and confirm `.gitignore` coverage before proceeding.

---

## Hygiene Check for Walkthrough Docs

Before committing a walkthrough file, run:

```powershell
findstr /s /i ".gemini"     docs\walkthrough-<task-id>.md
findstr /s /i "click_feedback" docs\walkthrough-<task-id>.md
findstr /s /i "C:/Users"    docs\walkthrough-<task-id>.md
findstr /s /i "C:\Users"    docs\walkthrough-<task-id>.md
```

All four commands should return exit code 1 (no matches). If any match is found:

1. Identify the leaked path
2. Replace it with a relative path or a neutral description
3. Re-run the check before committing

---

## What a Hygiene Violation Looks Like

| Violation | Example | Correct alternative |
|---|---|---|
| Local machine path in walkthrough | `C:\Users\KHuff\.gemini\brain\…\screenshot.png` | `vfx_queue_verification_*.webp` (recording name only) |
| Antigravity click_feedback path | `.system_generated\click_feedback\click_feedback_123.png` | Describe what the screenshot shows |
| Generated asset path embedded in doc | `public/generated/images/combat-hit-flash-light.webp` — embedded as absolute path | Omit the absolute path; describe the asset state |
| Fake completed status | Queue entry marked `completed` with no real file on disk | Only mark completed when server returns success |
| Generated file committed to git | `public/generated/…` appears in `git add` | Confirm `.gitignore` excludes the path |

---

## Return Requirements

Include in the closeout:

- Result of `git status -sb` (confirm no generated files staged)
- Result of the four `findstr` hygiene checks (exit codes)
- Confirmation that `.gitignore` covers all generated output paths
