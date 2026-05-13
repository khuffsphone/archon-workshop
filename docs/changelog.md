# Changelog — Archon Workshop

All notable changes to the Archon Workshop are documented here.

Format: `## [version or milestone] — YYYY-MM-DD`

---

## [ARCHON-010 VFX Remediation] — 2026-05-12

### Added

- **`updateNote` helper** (`src/lib/assetReview.ts`) — Pure, non-mutating function that updates only the `notes` field on an asset without touching status, protection, or version fields (010B).
- **Dashboard Remediation Panel** (`src/features/dashboard/DashboardPanel.tsx`) — Collapsible `⚙ Remediate` toggle per card in the Approved filter. Exposes a `Save Note (keep approved)` path and a two-click `Reject (Remediation)` path that clears `asset_protected` and sets status to `rejected`, unblocking the asset for future regeneration (010B).
- **Approve Latest Candidate UI** (`src/features/dashboard/DashboardPanel.tsx`) — New `hasApprovableCandidate` guard helper and `handleApproveLatest` two-click handler. Renders `Approve Latest Candidate (v{N})` button with candidate thumbnail preview for any `rejected` asset whose latest candidate version is newer than its `approved_version` (010G).
- **Smoke Tests** — 2 new smoke test scripts: `010b` (39 assertions), `010g` (8 assertions). Cumulative suite: **770 assertions**.

### Modified

- `src/features/dashboard/DashboardPanel.tsx` — Remediation panel (010B) + Approve Latest Candidate panel (010G).
- `src/App.tsx` — Added `handleUpdateNote`, wired to `DashboardPanel.onUpdateNote` (010B).

### Runtime State Changes (gitignored, not committed)

- `combat-hit-flash-dark` — `notes` field corrected; status remains `approved` / `asset_protected: true` (010C).
- `combat-heal-pulse` — Rejected (010C), v2 generated (010F), approved via new UI (010G). Now `status: approved`, `asset_protected: true`, active path points to v2.
- `combat-ambient-arena` — Rejected (010C), v2 generated (010F), approved via new UI (010G). Now `status: approved`, `asset_protected: true`, active path points to v2.

### Security

- `GEMINI_API_KEY` rotated during 010E after a key value was inadvertently pasted in chat. Replacement key verified via read-only API probe. `.env` remains gitignored.

### Documentation

- `docs/walkthrough-archon-010a.md` through `docs/walkthrough-archon-010g.md` — Per-milestone evidence receipts.
- `docs/release-archon-010-vfx-remediation.md` — This release snapshot.

### Protected (Unchanged)

- `CombatPackManifest` interface — frozen
- `COMBAT_PACK_SCHEMA_VERSION` — frozen
- `WORKSHOP_STATE_SCHEMA_VERSION` — frozen
- ZIP export/import behavior — frozen
- `archon-game` — untouched

---

## [ARCHON-008 Export Readiness] — 2026-05-01

### Added

- **Export Eligibility Helpers** (`src/lib/exportEligibility.ts`) — Pure, testable functions: `isExportEligible`, `filterForCombatExport`, `getExportReadinessReport`, `getExportExclusionReason`, `getExportEligibilityRows`. No UI coupling.
- **Export Eligibility Preview** (`src/features/export/ExportPanel.tsx`) — Unified operator table showing every asset's eligibility status and exclusion reason. Combat Slice Status summary bar (Total / Eligible / Excluded / Rejected / Pending). "✅ Combat Ready" badge when all 19 required IDs are eligible.
- **Smoke Tests** — 3 new smoke test scripts: `008a` (33 assertions), `008b` (39 assertions), `008d` (54 assertions). Total suite: 723 assertions.

### Modified

- `src/lib/assetManifest.ts` — `COMBAT_SLICE_REQUIRED_IDS` updated: 4 stale IDs replaced with their modern equivalents. 7 zombie `INITIAL_ASSETS` records removed (no VFX catalog entries, superseded by 006D additions).
- `src/features/export/ExportPanel.tsx` — Export Eligibility Preview table added (008B).

### Documentation

- `docs/archon-008c-export-readiness-issue-resolution-plan.md` — Cross-repo diagnosis of stale required-ID root cause.
- `docs/release-archon-008-export-readiness.md` — Release snapshot for the full 008 series.
- `docs/walkthrough-archon-008a.md` through `docs/walkthrough-archon-008e.md` — Milestone evidence receipts.

### Protected (Unchanged)

- `CombatPackManifest` interface — frozen
- `COMBAT_PACK_SCHEMA_VERSION` — frozen
- `WORKSHOP_STATE_SCHEMA_VERSION` — frozen
- ZIP export/import behavior — frozen
- `archon-game` — untouched

---

## [ARCHON-007 Review Workflow] — 2026-05-01


### Added

- **VFX Asset Review Workflow** (`src/lib/assetReview.ts`) — Pure, testable helper module for computing review state transitions (approve, reject, protect, derive status).
- **Scene Lab Approve/Reject Controls** (`src/features/scenelab/SceneLabPanel.tsx`) — Per-asset Approve and Reject buttons with review note input. Approved assets display a 🔒 lock icon and have their Approve button disabled.
- **Server-Side Overwrite Guard** (`server.ts`) — `POST /api/save-asset` returns `403 Forbidden` if the canonical asset ID (version suffix stripped) resolves to a protected asset. Prevents any overwrite of an approved asset.
- **Review Queue Helpers** (`src/lib/reviewQueue.ts`) — Pure, non-mutating helpers: `getReviewStats` (summary counts), `filterAssetsByReviewStatus` (filter by state), `identifyActionableAssets` (generated & pending).
- **Approval Dashboard** (`src/features/dashboard/DashboardPanel.tsx`) — New React component replacing the static Dashboard view. Provides live review summary counts, a filterable review queue (Pending / Approved / Rejected / Protected / All), inline approve/reject with note input, and a "Detailed Review (Scene Lab) →" navigation shortcut.
- **Smoke Tests** — 2 new smoke test scripts: `007a` (36 assertions), `007c` (10 assertions).

### Modified

- `src/App.tsx` — Wired `handleApprove` / `handleReject` handlers, `dashboardReviewNotes` state, and `DashboardPanel` rendering.
- `src/features/scenelab/SceneLabPanel.tsx` — Added review controls; corrected outdated `SCENE_PRESETS` IDs (007B stabilization fix).
- `src/features/vfx/VFXWorkflowPanel.tsx` — Updated `onApprove`/`onReject` prop signatures to accept an optional `note?: string` parameter for type consistency.
- `server.ts` — Added protected-asset overwrite guard to `/api/save-asset`.

### Agent Discipline

- **AG-013** (`.agents/rules/13-closeout-discipline.md`) — Added Closeout Language Guardrails: 10-entry claim-to-evidence mapping table requiring that claim words ("clean", "staged", "verified", "complete", etc.) be backed by matching command output before use.
- Updated `.agents/workflows/browser-verification.md`, `docs-closeout.md`, `evidence-receipt.md`, and `.agents/README.md`.

### Documentation

- `docs/walkthrough-archon-007a.md` — 007A closeout walkthrough and evidence receipt.
- `docs/walkthrough-archon-007b.md` — 007B stabilization walkthrough with Process Note on code-during-verification discipline.
- `docs/walkthrough-archon-007c.md` — 007C Dashboard walkthrough with Playwright MCP state-transition evidence.
- `docs/release-archon-007-review-workflow.md` — Release snapshot for the full 007 series.
- `docs/archon-007-known-limitations-and-roadmap.md` — Known limitations and next milestone recommendations for 007.

### Protected (Unchanged)

- `CombatPackManifest` interface — frozen
- `COMBAT_PACK_SCHEMA_VERSION` — frozen
- `WORKSHOP_STATE_SCHEMA_VERSION` — frozen
- ZIP export/import behavior — frozen
- `archon-game` — untouched

---

## [ARCHON-006 VFX Pipeline] — 2026-04-29


### Added

- **VFX Catalog** (`src/lib/vfxCatalog.ts`) — 12 combat VFX presets across 8 families and 3 factions, each with a generation prompt brief, visual tags, timing metadata, and filter support.
- **VFX Queue** (`src/lib/vfxQueue.ts`) — Immutable queue lifecycle: enqueue, cancel, retry, clear, reorder, stats, and JSON export. Statuses: `queued`, `generating`, `completed`, `failed`, `cancelled`.
- **VFX Batch Helpers** (`src/lib/vfxQueue.ts`) — Pure functions `selectNextBatchJob`, `canRunNextJob`, `calculateBatchDelay` for safe sequential batch execution.
- **VFX Workflow Panel** (`src/features/vfx/VFXWorkflowPanel.tsx`) — Full UI: catalog browse with family/faction filters, preset selection, queue management, and generation controls.
- **Controlled Batch Generation** — Start/Pause/Resume/Abort batch execution with a 2000ms provider rate-limit delay between calls.
- **Workshop Persistence** (`src/lib/workshopPersistence.ts`) — `localStorage`-based state persistence and restore across page refreshes.
- **Smoke Tests** — 4 new smoke test scripts (510 total assertions): `006b` (267), `006c` (221), `006d` (11), `006e` (11).
- **Evidence Receipt Enforcement** — `scripts/check-evidence-receipt.mjs` validator and `docs/evidence-receipt-template.md`.
- **Agent Instruction System** — `.agents/` directory with operating rules (10–13), workflows, and skills.

### Documentation

- `docs/walkthrough-archon-006a.md` through `docs/walkthrough-archon-006f.md` — Full closeout walkthroughs with evidence receipts.
- `docs/repo-map.md` — Repository structure reference.
- `docs/release-archon-006-vfx-pipeline.md` — Release snapshot (this release).
- `docs/runbook-vfx-pipeline.md` — Operator runbook.
- `docs/archon-006-known-limitations-and-roadmap.md` — Known limitations and next milestone recommendations.

### Protected (Unchanged)

- `CombatPackManifest` interface — frozen
- `COMBAT_PACK_SCHEMA_VERSION` — frozen
- ZIP export/import behavior — frozen
- `archon-game` — untouched

---

*Earlier work predating ARCHON-006 is not captured in this changelog.*
