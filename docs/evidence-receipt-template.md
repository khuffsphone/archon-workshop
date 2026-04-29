# Evidence Receipt Template

> **CRITICAL RULE:** A claim is not accepted unless it has matching evidence.
> 
> Examples:
> - "button exists" does not prove workflow execution
> - "test passed" does not prove command was run unless raw output or meaningful excerpt is shown
> - "browser verified" requires action evidence, state transition evidence, or persistence/export evidence depending on the acceptance criterion

Every walkthrough MUST include a "Verification Receipts" or "Evidence Receipt" section matching this structure.

---

## 1. Task ID
**Task:** `ARCHON-<NNN>` (or relevant task ID)

## 2. Claim-to-Evidence
| Claim | Evidence Provided |
|---|---|
| E.g., Filter logic handles empty results | Smoke test section S3 output |
| E.g., Generate Queued button triggers API | Browser recording `vfx_queue_*.webp`, level 4 evidence |

## 3. Commands Run & Raw Output
*For each verification command (lint, build, smoke tests), provide the exact command, exit code, and raw excerpt.*

### Lint
```powershell
Command: npm run lint
Exit code: 0
<raw excerpt showing 0 errors>
```

### Build
```powershell
Command: npm run build
Exit code: 0
<raw excerpt showing modules and exit 0>
```

### Smoke Test (if applicable)
```powershell
Command: node --import=tsx/esm scripts/smoke-test-<task-id>.mjs
Exit code: 0
<raw excerpt of meaningful start, any failure section, and final pass/fail summary>
```

## 4. Browser Verification Evidence (if applicable)
*Required if UI changed.*

- **Screenshot/Recording:** `<file_name>`
- **Evidence Ladder Level Reached:** `<Level 1-4>` (See `browser-verification.md`)
- **Description:** <What the recording proves: e.g., "Clicked button (Level 2), badge changed to COMPLETED (Level 3)">

## 5. Test/Smoke Files Modified
*Required. If no test files were modified, explicitly write "none".*

| File | Change | Reason |
|---|---|---|
| `scripts/...` | ... | ... |
*(Or: "Test Files Modified: none")*

## 6. Generated Artifact Hygiene (if applicable)
*Required if the task involves file generation, export, or import.*

```powershell
Command: git status -sb && git ls-files --others --exclude-standard
Exit code: 0
<raw output showing NO generated files are staged or untracked>
```

## 7. Screenshot/Local-Path Hygiene
```powershell
Command: findstr /s /i ".gemini" docs\walkthrough-<task-id>.md
Exit code: 1 (no matches found)
```

## 8. Git Verification
*Must run before committing.*

### Git diff stat
```powershell
Command: git diff --stat
<raw excerpt>
```

### Git diff name-only
```powershell
Command: git diff --name-only
<raw excerpt>
```

### Final git status
```powershell
Command: git status -sb
<raw excerpt showing only expected files>
```

## 9. Commit & Push
- **Commit hash:** `<short_hash>`
- **Pushed:** `yes — <branch_name>`
