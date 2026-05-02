# Release Snapshot — ARCHON-008 Export Readiness

**Repo:** `archon-workshop`
**Release Date:** 2026-05-01
**Release Series:** ARCHON-008 (008A through 008D)
**Status:** Complete

---

## 1. Release Title

**ARCHON-008 Export Readiness — Full Release**

---

## 2. Scope Summary

The ARCHON-008 series delivered the complete operator-facing **Export Readiness** layer on top of the ARCHON-007 Review Workflow. Operators can now inspect which approved VFX assets are eligible for export, understand why each asset is included or excluded from a combat pack, and receive a clear "Combat Ready" or "Not Ready" verdict before triggering any ZIP export.

The series also corrected a structural defect: `COMBAT_SLICE_REQUIRED_IDS` contained 4 stale IDs referencing asset naming conventions that `archon-game` had already superseded. The root cause was diagnosed (ARCHON-008C) and remediated (ARCHON-008D) by pruning 7 zombie `INITIAL_ASSETS` records and updating the required list to use the modern VFX IDs the game actually expects.

This series operates entirely within the Workshop source layer. It does not modify `archon-game`, `CombatPackManifest`, `COMBAT_PACK_SCHEMA_VERSION`, ZIP export/import behavior, or any generated runtime manifest.

---

## 3. Milestone Summary

### ARCHON-008A — Game Export / Consumption Readiness Helpers

Added deterministic export eligibility helper functions as a pure, testable library in `src/lib/exportEligibility.ts`:
- `isExportEligible(asset)` — returns `true` for approved assets with a file path.
- `filterForCombatExport(assets)` — returns only eligible assets.
- `getExportReadinessReport(assets, requiredIds)` — returns `{ combatReady, missingRequired, eligibleCount, totalCount }`.

33 smoke assertions across 5 test sections. No UI changes, no schema changes, no game changes.

### ARCHON-008B — Export Eligibility Preview UI

Added a unified operator-facing Export Eligibility Preview table to `src/features/export/ExportPanel.tsx`:
- Single table showing all assets with eligibility status and exclusion reason.
- Status badge: **✅ Ships** (eligible) or **Excluded** with reason column (pending / rejected / no-file).
- Combat Slice Status summary bar: Total / Eligible / Excluded / Rejected / Pending counts.
- "Combat Ready" green badge when all required IDs are eligible; "Not Ready" otherwise.

39 smoke assertions. Read-only UI — no export behavior was changed.

### ARCHON-008C — Export Readiness Issue Resolution Plan (Docs-Only)

Cross-repo inspection confirming the "Not Ready" state was caused by a **stale required-ID list** in `assetManifest.ts`, not missing generated assets or a catalog/manifest naming mismatch. `archon-game` had already transitioned to modern IDs (`combat-hit-flash-light`, `combat-death-burst-light`, etc.). Resolution deferred to ARCHON-008D. No source changes made.

### ARCHON-008D — Required ID Reconciliation

Resolved the stale required-ID defect identified in ARCHON-008C:

**`INITIAL_ASSETS` — 7 zombie records removed:**
| Removed ID | Reason |
|:---|:---|
| `combat-hit-flash-light-medium` | Superseded by `combat-hit-flash-light` |
| `combat-hit-flash-dark-medium` | Superseded by `combat-hit-flash-dark` |
| `combat-impact-spark-medium` | No VFX catalog entry; unused |
| `combat-death-light` | Superseded by `combat-death-burst-light` |
| `combat-death-dark` | Superseded by `combat-death-burst-dark` |
| `combat-nova-light` | No VFX catalog entry; unused |
| `combat-nova-dark` | No VFX catalog entry; unused |

**`COMBAT_SLICE_REQUIRED_IDS` — 4 stale → 4 modern:**
| Removed | Added |
|:---|:---|
| `combat-hit-flash-light-medium` | `combat-hit-flash-light` |
| `combat-hit-flash-dark-medium` | `combat-hit-flash-dark` |
| `combat-death-light` | `combat-death-burst-light` |
| `combat-death-dark` | `combat-death-burst-dark` |

54 smoke assertions across 9 sections. All 635 regression assertions pass.

---

## 4. Current Export Readiness Capabilities

| Capability | Status |
|---|---|
| `isExportEligible(asset)` — pure eligibility predicate | ✅ |
| `filterForCombatExport(assets)` — eligible-asset filter | ✅ |
| `getExportReadinessReport(assets, requiredIds)` — readiness report | ✅ |
| `getExportExclusionReason(asset)` — per-asset exclusion reason | ✅ |
| `getExportEligibilityRows(assets)` — UI row DTOs | ✅ |
| Export Eligibility Preview table (unified, all assets) | ✅ |
| Eligibility status badge per row (✅ Ships / Excluded) | ✅ |
| Exclusion reason column (pending / rejected / no-file / eligible) | ✅ |
| Combat Slice Status summary bar (Total / Eligible / Excluded / Rejected / Pending) | ✅ |
| "Combat Ready" green badge when all required IDs are eligible | ✅ |
| "Not Ready" indicator when required IDs are missing or ineligible | ✅ |
| `COMBAT_SLICE_REQUIRED_IDS` aligned to modern VFX naming | ✅ |
| Zombie `INITIAL_ASSETS` records removed | ✅ |
| All VFX catalog slots still present in `INITIAL_ASSETS` | ✅ |
| All prior VFX pipeline capabilities (006A–006F) preserved | ✅ |
| All prior review workflow capabilities (007A–007C) preserved | ✅ |

---

## 5. What Is Explicitly Not Included

- No automatic export triggered by the preview; the preview is read-only.
- No in-game wiring of approved assets — approved Workshop VFX are not automatically placed into `archon-game`'s combat pack.
- No audio VFX export eligibility (audio assets are out of scope for the combat pack export path).
- No sortable or filterable columns in the Export Eligibility Preview table.
- No pagination for large asset sets.
- No diff/comparison view between export previews.

---

## 6. Verification Summary

### Commands Run

All commands run as part of individual milestone closeouts and confirmed in ARCHON-008E re-verification.

```bash
npm run lint        # Exit code: 0 — tsc --noEmit, 0 errors
npm run build       # Exit code: 0 — vite build, 59 modules
node --import=tsx/esm scripts/smoke-test-archon-008d.mjs
node --import=tsx/esm scripts/smoke-test-archon-008b.mjs
node --import=tsx/esm scripts/smoke-test-archon-008a.mjs
node --import=tsx/esm scripts/smoke-test-archon-006d.mjs
node --import=tsx/esm scripts/smoke-test-archon-006b.mjs
node scripts/check-evidence-receipt.mjs docs/walkthrough-archon-008e.md
```

### Test Files Added

| File | Action | Assertions |
|---|---|---|
| `scripts/smoke-test-archon-008a.mjs` | NEW (008A) | 33 |
| `scripts/smoke-test-archon-008b.mjs` | NEW (008B) | 39 |
| `scripts/smoke-test-archon-008d.mjs` | NEW (008D) | 54 |

### Smoke Test Results (all milestones)

| Script | Assertions | Result |
|---|---|---|
| `smoke-test-archon-008d.mjs` | 54 | ✅ 54 passed, 0 failed |
| `smoke-test-archon-008b.mjs` | 39 | ✅ 39 passed, 0 failed |
| `smoke-test-archon-008a.mjs` | 33 | ✅ 33 passed, 0 failed |
| `smoke-test-archon-007c.mjs` | 10 | ✅ 10 passed, 0 failed |
| `smoke-test-archon-007a.mjs` | 36 | ✅ 36 passed, 0 failed |
| `smoke-test-archon-006e.mjs` | 52 | ✅ 52 passed, 0 failed |
| `smoke-test-archon-006d.mjs` | 11 | ✅ 11 passed, 0 failed |
| `smoke-test-archon-006c.mjs` | 221 | ✅ 221 passed, 0 failed |
| `smoke-test-archon-006b.mjs` | 267 | ✅ 267 passed, 0 failed |
| **Total** | **723** | **✅ 0 failures** |

### Build and Lint

| Check | Result |
|---|---|
| `npm run lint` (tsc --noEmit) | ✅ Exit code 0, 0 errors |
| `npm run build` (vite build) | ✅ Exit code 0, 59 modules |

### Browser Verification (Playwright MCP — ARCHON-008E)

Live re-verification at `http://localhost:3000` (Export tab already active):

| Evidence | Result |
|---|---|
| Stale ID `combat-hit-flash-light-medium` in table | NOT FOUND ✅ |
| Stale ID `combat-hit-flash-dark-medium` in table | NOT FOUND ✅ |
| Stale ID `combat-death-light` in table | NOT FOUND ✅ |
| Stale ID `combat-death-dark` in table | NOT FOUND ✅ |
| Modern ID `combat-hit-flash-light` present and eligible | ✅ Ships |
| Modern ID `combat-hit-flash-dark` present and eligible | ✅ Ships |
| Modern ID `combat-death-burst-light` present and eligible | ✅ Ships |
| Modern ID `combat-death-burst-dark` present and eligible | ✅ Ships |
| Combat Slice Status badge | `✅ Combat Ready` |
| Total / Eligible / Excluded / Rejected / Pending | 244 / 244 / 0 / 0 / 0 |
| Mutations performed | None (read-only) |

Stale-ID absence and modern-ID presence confirmed via `document.body.innerText` JavaScript evaluation (not screenshot OCR). `staleFound: []`, `modernFound: [all 4]`.

Evidence Ladder Level: DOM-evaluated, screenshot-corroborated state verification.

### Evidence Receipts

| Milestone | Status |
|---|---|
| `check-evidence-receipt.mjs docs/walkthrough-archon-008a.md` | ✅ PASSED |
| `check-evidence-receipt.mjs docs/walkthrough-archon-008b.md` | ✅ PASSED |
| `check-evidence-receipt.mjs docs/walkthrough-archon-008c.md` | ✅ PASSED |
| `check-evidence-receipt.mjs docs/walkthrough-archon-008d.md` | ✅ PASSED |
| `check-evidence-receipt.mjs docs/walkthrough-archon-008e.md` | ✅ PASSED |

### git status -sb (post ARCHON-008D push, pre 008E)

```
## main...origin/main
```

### Commits

| Milestone | Hash | Message |
|---|---|---|
| 008A | `bba7f02` | `feat: ARCHON-008A Export Readiness Smoke Test and eligibility helpers` |
| 008A process note | `6c94e51` | `docs: ARCHON-008A process note — confirmation gate miss` |
| 008B | `17cde5c` | `feat: ARCHON-008B export eligibility preview - 39 smoke tests pass` |
| 008C | `2739f5e` | `docs: ARCHON-008C export readiness issue resolution plan` |
| 008D | `e2a8b65` | `feat: ARCHON-008D required ID reconciliation - 54 smoke tests pass` |

---

## 7. Generated Artifact Hygiene Status

- `public/generated/` — covered by `.gitignore:10`
- `public/exports/` — covered by `.gitignore:32`
- `git status -uall --short` post ARCHON-008D → `## main...origin/main` (clean)
- `git ls-files --others --exclude-standard` → empty (no untracked files)
- `public/exports/combat-pack-v1.1.zip` — present but correctly gitignored; timestamp `04/02/2026` confirms it predates the entire ARCHON-008 series

Generated files are produced at runtime and are never committed to the repository.

---

## 8. Protected Contract Status

| Contract | Status |
|---|---|
| `CombatPackManifest` interface | ✅ Unchanged |
| `COMBAT_PACK_SCHEMA_VERSION` (`'1.0'`) | ✅ Unchanged |
| ZIP export structure (`exportFullPack`, `exportCombatPack`) | ✅ Unchanged |
| `importPack` behavior | ✅ Unchanged |
| `asset-manifest.json` runtime write path | ✅ Server-only, unchanged |
| `archon-game` consumer expectations | ✅ Unchanged |
| `WORKSHOP_STATE_SCHEMA_VERSION` | ✅ Unchanged (frozen at 1) |

---

## 9. Known Limitations

- Export preview readiness is a **workshop-side estimate** — the actual combat pack export also applies server-side tag filtering not reflected in the client preview.
- The preview shows all assets (244 at time of writing); there is no filtering or pagination.
- Audio VFX assets have no export eligibility path; the combat pack export is image-only.
- Approved workshop assets still require a manual copy step to wire into `archon-game`'s combat pack manifest.
- The Export Eligibility Preview table does not sort by eligibility status by default.

---

## 10. Recommended Next Milestones

| Milestone | Description |
|---|---|
| ARCHON-009A | VFX asset generation pass — trigger and review the 4 modern required IDs (`combat-hit-flash-light`, `combat-hit-flash-dark`, `combat-death-burst-light`, `combat-death-burst-dark`) |
| ARCHON-009B | `archon-game` automatic wiring — generate a post-export integration script to copy approved assets into the game's combat pack without manual steps |
| ARCHON-009C | Export preview UX — add column sorting and eligibility-status filter to the Export Eligibility Preview table |
| ARCHON-009D | Audio VFX export companion — extend the export eligibility and combat pack pipeline to include approved audio assets |
| PLAYWRIGHT-002 | Promote Playwright evidence recording to a standard, reproducible CI evidence pipeline |

---

## 11. Proposed Release Tag / Version Marker

**Proposed tag:** `v0.8.0-export-readiness`

> **This tag has NOT been created.** Explicit operator approval is required before running `git tag`. This document names the proposal only.

---

## 12. Walkthrough Documents

| Milestone | Walkthrough |
|---|---|
| 008A | `docs/walkthrough-archon-008a.md` |
| 008B | `docs/walkthrough-archon-008b.md` |
| 008C | `docs/walkthrough-archon-008c.md` |
| 008D | `docs/walkthrough-archon-008d.md` |
| 008E | `docs/walkthrough-archon-008e.md` |
