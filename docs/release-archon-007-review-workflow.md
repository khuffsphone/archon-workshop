# Release Snapshot — ARCHON-007 Review Workflow

**Repo:** `archon-workshop`
**Release Date:** 2026-05-01
**Release Series:** ARCHON-007 (007A through 007C)
**Status:** Complete

---

## 1. Release Title

**ARCHON-007 Review Workflow — Full Release**

---

## 2. Scope Summary

The ARCHON-007 series delivered a complete, human-in-the-loop VFX asset review and approval workflow on top of the ARCHON-006 generation pipeline. Operators can now preview generated assets, annotate them with review notes, approve or reject individual assets, and manage the full review queue from a centralized Dashboard. Approved assets are protected from overwrite by a server-side guard. The Dashboard tab has been transformed into an actionable operator command center.

This series operates entirely within the Workshop UI. It does not affect `archon-game` internals, does not change `CombatPackManifest` or `COMBAT_PACK_SCHEMA_VERSION`, and does not auto-approve any generated file.

---

## 3. Milestone Summary

### ARCHON-007A — VFX Asset Review and Approval Workflow
Implemented a strict, human-in-the-loop review gate for all generated VFX assets. Added per-asset **Approve** and **Reject** buttons to the Scene Lab review panel. Approved assets are locked (`asset_protected: true`) and display a 🔒 indicator. Review notes are durably written through to `Asset.notes` in `asset-manifest.json` at approval/rejection time. A server-side `403 Forbidden` guard on `POST /api/save-asset` prevents any overwrite of a protected asset, even when a versioned ID (e.g. `-v2`) is used. A new pure helper module `src/lib/assetReview.ts` encapsulates all state transition logic.

### ARCHON-007B — Review Workflow Stabilization and Asset Curation Pass
Performed a live curation pass against a realistic set of generated assets to verify the review workflow end-to-end. Identified and corrected a defect in `SceneLabPanel.tsx` (outdated `SCENE_PRESETS` IDs with stale `-medium` suffix). Verified strict persistence of review states across browser refresh. Confirmed the `403` server guard fires correctly on protected assets and allows writes to unprotected ones. Validated all existing smoke tests (006B–007A) with 0 regressions. Added a Process Note to the walkthrough documenting the code modification made during a stabilization-only pass.

### ARCHON-007C — VFX Review Queue / Approval Dashboard
Transformed the existing static Dashboard tab into an actionable operator command center. Added a new pure helper library `src/lib/reviewQueue.ts` (non-mutating, TDD-validated) providing `getReviewStats`, `filterAssetsByReviewStatus`, and `identifyActionableAssets`. Extracted a new `src/features/dashboard/DashboardPanel.tsx` React component with live review summary counts, a filterable asset review queue (Pending / Approved / Rejected / Protected / All), per-asset approve/reject controls with review note input, and a "Detailed Review (Scene Lab) →" navigation shortcut. All review state is derived from the existing asset manifest — no new persistence layer introduced.

### AG-013 — Closeout Language Guardrails
Added `.agents/rules/13-closeout-discipline.md` establishing a 10-entry claim-to-evidence mapping table requiring that high-risk claim words ("clean", "staged", "verified", "complete", etc.) be backed by matching command output before use. Updated supporting workflows (`browser-verification.md`, `docs-closeout.md`, `evidence-receipt.md`) and `.agents/README.md`.

---

## 4. Current Review Workflow Capabilities

| Capability | Status |
|---|---|
| Per-asset Approve button in Scene Lab | ✅ |
| Per-asset Reject button in Scene Lab | ✅ |
| Review note input persisted to `Asset.notes` on approval/rejection | ✅ |
| `asset_protected` flag set on approval | ✅ |
| Lock icon (🔒) displayed for protected assets | ✅ |
| Approve button disabled for already-approved assets | ✅ |
| Reject button disabled for already-rejected assets | ✅ |
| Server-side `403` guard on `POST /api/save-asset` for protected assets | ✅ |
| Versioned ID stripping (e.g. `-v2`) before protection check | ✅ |
| Review state persists across browser refresh | ✅ |
| Dashboard review summary counts (approved / pending / rejected / total) | ✅ |
| Dashboard Pending filter (shows actionable generated assets only) | ✅ |
| Dashboard Approved filter | ✅ |
| Dashboard Rejected filter | ✅ |
| Dashboard Protected filter | ✅ |
| Dashboard All filter | ✅ |
| Dashboard inline approve/reject with review note | ✅ |
| Dashboard "Detailed Review (Scene Lab) →" navigation shortcut | ✅ |
| Pure, non-mutating review queue helpers (`reviewQueue.ts`) | ✅ |
| Pure, non-mutating review state helpers (`assetReview.ts`) | ✅ |
| Smoke test coverage for review helpers | ✅ |
| All prior VFX pipeline capabilities (006A–006F) preserved | ✅ |

---

## 5. What Is Explicitly Not Included

- No in-game VFX preview or game-side integration of reviewed assets
- No batch approve/reject from the Dashboard (must approve one at a time)
- No audio VFX review pipeline
- No quality scoring or A/B comparison between alternative generations
- No schema version bump for review metadata (review notes stored in existing `Asset.notes` field only)
- Dashboard does not duplicate the full Scene Lab review editor (navigation shortcut provided instead)
- No new persistence system introduced

---

## 6. Verification Summary

### Commands Run

All commands below were run as part of individual milestone closeouts. Results are summarised here; raw output is in the respective walkthrough documents.

```bash
npm run lint        # Exit code: 0 — tsc --noEmit, 0 errors
npm run build       # Exit code: 0 — vite build, 58 modules
node --import=tsx/esm scripts/smoke-test-archon-007c.mjs
node --import=tsx/esm scripts/smoke-test-archon-007a.mjs
node --import=tsx/esm scripts/smoke-test-archon-006e.mjs
node --import=tsx/esm scripts/smoke-test-archon-006d.mjs
node --import=tsx/esm scripts/smoke-test-archon-006c.mjs
node --import=tsx/esm scripts/smoke-test-archon-006b.mjs
node scripts/check-evidence-receipt.mjs docs/walkthrough-archon-007c.md
```

### Test Files Modified

| File | Action |
|---|---|
| `scripts/smoke-test-archon-007a.mjs` | NEW — review state transition helpers |
| `scripts/smoke-test-archon-007c.mjs` | NEW — review queue helpers |

### Smoke Tests

| Script | Assertions | Result |
|---|---|---|
| `smoke-test-archon-007c.mjs` | 10 | ✅ 10 passed, 0 failed |
| `smoke-test-archon-007a.mjs` | 36 | ✅ 36 passed, 0 failed |
| `smoke-test-archon-006e.mjs` | 52 | ✅ 52 passed, 0 failed |
| `smoke-test-archon-006d.mjs` | 16 | ✅ 16 passed, 0 failed |
| `smoke-test-archon-006c.mjs` | 221 | ✅ 221 passed, 0 failed |
| `smoke-test-archon-006b.mjs` | 267 | ✅ 267 passed, 0 failed |

### Build and Lint

| Check | Result |
|---|---|
| `npm run lint` (tsc --noEmit) | ✅ Exit code 0, 0 errors |
| `npm run build` (vite build) | ✅ Exit code 0, 58 modules, built in ~4s |

### Browser Verification

End-to-end filter verification performed in ARCHON-007C via Playwright MCP. Verified:
- Dashboard loads with correct summary counts
- Pending filter shows only actionable generated assets
- Approved filter populates with approved/protected assets
- Rejected filter shows `combat-hit-flash-dark` (REJECTED, last note: "Rejected during curation pass")
- Protected filter shows only `asset_protected: true` assets
- Approve action removes asset from Pending queue and increments Approved count immediately
- Scene Lab detailed review controls remain intact
- VFX batch generation controls remain intact
- Asset-pack export/import controls remain intact

Evidence Ladder Level: Complete State-Transition Trace (Playwright MCP, live state mutation confirmed).

### Evidence Receipt

`node scripts/check-evidence-receipt.mjs docs/walkthrough-archon-007c.md` → ✅ PASSED (10/10 checks).

### git diff --stat (ARCHON-007C — final milestone commit)
```
 src/App.tsx                               |  30 ++--
 src/features/dashboard/DashboardPanel.tsx | 158 ++++++++++++++++++++
 src/features/vfx/VFXWorkflowPanel.tsx     |   4 +-
 src/lib/reviewQueue.ts                    |  31 ++++
 4 files changed, 204 insertions(+), 19 deletions(-)
```

### git diff --name-only (ARCHON-007C — final milestone commit)
```
src/App.tsx
src/features/dashboard/DashboardPanel.tsx
src/features/vfx/VFXWorkflowPanel.tsx
src/lib/reviewQueue.ts
```

### git status -sb (post ARCHON-007C push)
```
## main...origin/main
```

### Commit
- 007A: `11d2798  feat: implement ARCHON-007A VFX Review Workflow`
- 007B: `c505fc8  chore: ARCHON-007B Review Workflow Curation Pass`
- AG-013: `c38e11b  docs: AG-013 — Closeout Language Guardrails`
- 007C: `a158843  feat: implement ARCHON-007C Review Queue Dashboard`

### Pushed
All four commits pushed to `origin/main`. Verified via `git status -sb` returning `## main...origin/main` with no ahead/behind delta.


---

## 7. Generated Artifact Hygiene Status

- `public/generated/` is covered by `.gitignore:10`
- `git check-ignore -v public/generated/` → `.gitignore:10:public/generated/ public/generated/`
- `public/exports/` is covered by `.gitignore:32`
- `git check-ignore -v public/exports/` → `.gitignore:32:public/exports/ public/exports/`
- `git status -uall --short` after ARCHON-007C commit → `## main...origin/main` (clean, no untracked generated artifacts)

Generated files are produced at runtime and are never committed to the repository.

---

## 8. Protected Contract Status

| Contract | Status |
|---|---|
| `CombatPackManifest` interface | ✅ Unchanged |
| `COMBAT_PACK_SCHEMA_VERSION` | ✅ Unchanged |
| ZIP export structure (`exportFullPack`, `exportCombatPack`) | ✅ Unchanged |
| `importPack` behavior | ✅ Unchanged |
| `asset-manifest.json` runtime write path | ✅ Server-only, unchanged |
| `archon-game` consumer expectations | ✅ Unchanged |
| `WORKSHOP_STATE_SCHEMA_VERSION` | ✅ Unchanged (review notes stored in existing `Asset.notes` field) |

---

## 9. Known Limitations

See `docs/archon-007-known-limitations-and-roadmap.md` for the full list.

Summary:
- No in-game VFX preview — reviewed assets are not automatically wired into `archon-game`
- Dashboard approve/reject is one-at-a-time; no batch review action exists
- Review notes live in `Asset.notes` only; not schema-versioned in `workshopPersistence`
- Scene Lab requires preset-by-preset navigation for detailed review context
- No audio VFX review pipeline exists

---

## 10. Recommended Next Milestones

| Milestone | Description |
|---|---|
| ARCHON-008A | Game-side asset integration: wire approved VFX assets into `archon-game` combat pack |
| ARCHON-008B | Batch Dashboard review actions (approve all pending, reject all below threshold) |
| ARCHON-008C | Audio VFX companion pipeline (catalog, queue, generation, review) |
| ARCHON-008D | Export contract hardening: schema validation at `archon-game` boundary |
| PLAYWRIGHT-002 | Playwright evidence recording promotion to standard CI evidence pipeline |

---

## 11. Proposed Release Tag / Version Marker

**Proposed tag:** `v0.7.0-review-workflow`

> **This tag has NOT been created.** Explicit operator approval is required before running `git tag`. This document names the proposal only.

---

## 12. Walkthrough Documents

| Milestone | Walkthrough |
|---|---|
| 007A | `docs/walkthrough-archon-007a.md` |
| 007B | `docs/walkthrough-archon-007b.md` |
| 007C | `docs/walkthrough-archon-007c.md` |
