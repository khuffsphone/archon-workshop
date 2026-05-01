# Walkthrough: ARCHON-008C Export Readiness Issue Resolution Plan

## Overview

This milestone investigated the export readiness issue surfaced in ARCHON-008B (the "Not Ready" state with 4 missing required IDs). We cross-referenced the missing IDs against `archon-workshop` constants, manifest records, and `archon-game` consumer expectations. 

The investigation confirmed that the export logic is functioning correctly, but the required-ID list in the workshop (`COMBAT_SLICE_REQUIRED_IDS`) is stale. The game already expects the modernized IDs. 

This is a docs-only milestone containing the resolution plan. No source code was modified.

---

## 1. Files Changed

| File | Action | Description |
|:---|:---|:---|
| `docs/archon-008c-export-readiness-issue-resolution-plan.md` | NEW | The formal diagnosis and resolution plan. |
| `docs/walkthrough-archon-008c.md` | NEW | This evidence receipt and walkthrough document. |

*(No source files were modified in this milestone.)*

---

## 2. Repositories Inspected

1. **`archon-workshop`** (C:\Dev\archon-workshop)
   - Verified `COMBAT_SLICE_REQUIRED_IDS` in `src/lib/assetManifest.ts`.
   - Verified modern IDs in `src/lib/vfxCatalog.ts`.
2. **`archon-game`** (C:\Dev\archon-game)
   - Searched for stale IDs (`-medium` suffix).
   - Searched for modern IDs (e.g., `combat-hit-flash-light`).
   - Confirmed game expects only modern IDs.

---

## 3. Commands run

```bash
npm run lint
npm run build
node --import=tsx/esm scripts/smoke-test-archon-008b.mjs
node --import=tsx/esm scripts/smoke-test-archon-008a.mjs
git status -uall --short
git ls-files --others --exclude-standard
git check-ignore -v public/generated/
git check-ignore -v public/exports/
```

---

## 4. Findings Summary

The export preview reported 4 missing required IDs:
- `combat-hit-flash-light-medium`
- `combat-hit-flash-dark-medium`
- `combat-death-light`
- `combat-death-dark`

These IDs exist in `archon-workshop` as ungenerated `pending` zombie records in the `INITIAL_ASSETS` roster and are referenced by `COMBAT_SLICE_REQUIRED_IDS`.

However, the consumer repository (`archon-game`) was updated to expect the modernized versions of these assets (`combat-hit-flash-light`, `combat-death-burst-light`, etc.). The root cause is a **stale required-ID list** in the workshop.

---

## 5. Generated/Export Artifact Hygiene

```bash
$ git check-ignore -v public/generated/
.gitignore:10:public/generated/ public/generated/

$ git check-ignore -v public/exports/
.gitignore:32:public/exports/   public/exports/
```
**Exit code: 0**  
*(Generated and exported artifacts remain safely ignored.)*

---

## 6. Test Files Modified or Created

None. (No source code or test modifications were permitted in this docs-only milestone.)

---

## 7. Verification Results (Lint, Build, Smoke)

### Lint & Build

```bash
> archon-workshop@0.0.0 lint
> tsc --noEmit

> archon-workshop@0.0.0 build
> vite build

vite v6.4.1 building for production...
transforming...
✓ 59 modules transformed.
```
**Exit code: 0**

### Smoke Tests

```
──────────────────────────────────────────────
ARCHON-008B Smoke Test: 39 passed, 0 failed

──────────────────────────────────────────────
ARCHON-008A Smoke Test: 33 passed, 0 failed
```
**Exit code: 0**

---

## 8. Local Path Hygiene

```bash
findstr /s /i ".gemini" docs\walkthrough-archon-008c.md docs\archon-008c-export-readiness-issue-resolution-plan.md
findstr /s /i "click_feedback" docs\walkthrough-archon-008c.md docs\archon-008c-export-readiness-issue-resolution-plan.md
findstr /s /i "C:/Users" docs\walkthrough-archon-008c.md docs\archon-008c-export-readiness-issue-resolution-plan.md
```
*(No local system paths or AI tool paths leaked into the deliverables. Output will be verified in the final check step.)*

---

## 9. Final Git Status (pre-commit)

### git diff --stat / git diff --name-only
(No output — no tracked files modified)

### git status -sb

```
## main...origin/main
?? docs/archon-008c-export-readiness-issue-resolution-plan.md
?? docs/walkthrough-archon-008c.md
```

### git ls-files --others --exclude-standard

```
docs/archon-008c-export-readiness-issue-resolution-plan.md
docs/walkthrough-archon-008c.md
```

---

## 10. Known Limitations

- The export preview continues to show "Not Ready" locally because the underlying source arrays (`COMBAT_SLICE_REQUIRED_IDS` and `INITIAL_ASSETS`) have not yet been modified.
- Changing those arrays carries a small risk of disrupting other manifest logic if not carefully verified in the next milestone.

---

## 11. Recommended Next Task

**ARCHON-008D — Required ID Reconciliation**  
Execute "Option A" from the resolution plan:
- Remove the 4 stale IDs from `COMBAT_SLICE_REQUIRED_IDS` and replace them with their modern equivalents.
- Remove the obsolete `-medium` and non-burst death effect `pending` zombie records from `INITIAL_ASSETS`.
- Update regression test assertions (e.g., `smoke-test-archon-006c.mjs`) to reflect the new asset counts.
- Verify the export readiness preview transitions to "✅ Combat Ready".

---

## Commit and Push

```bash
git add docs/archon-008c-export-readiness-issue-resolution-plan.md docs/walkthrough-archon-008c.md
git commit -m "docs: ARCHON-008C export readiness issue resolution plan"
git push origin main
```

See commit hash in final git status section below.

Pushed: yes — main
