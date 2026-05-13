# Current State Snapshot

**Updated:** 2026-05-12 (after ARCHON-010G — VFX Remediation Complete)

---

## What Exists Now

### archon-workshop

| Item | State |
|---|---|
| `server.ts` | Patched. `POST /api/save-asset` returns `403 Forbidden` if the canonical asset ID resolves to a protected (`asset_protected: true`) asset. All original endpoints preserved. |
| `src/App.tsx` | ~500-line shell. Owns global state: assets, logs, progress, review handlers, tab navigation. Delegates all UI to feature panels. Includes `handleUpdateNote` (010B). |
| `src/features/generation/GenerationPanel.tsx` | `useGeneration` hook + UI — owns `handleGenerate`, `batchGenerate`, `expandLibrary`. |
| `src/features/export/ExportPanel.tsx` | Owns full export, combat-pack export, import-pack, verify. Enforces version guard. **Export Eligibility Preview table added (008B):** unified single table, eligibility status badge, exclusion reason column, Combat Slice Status summary bar. |
| `src/features/vfx/VFXWorkflowPanel.tsx` | VFX catalog browse, queue management, single/batch generation. Approve/Reject prop signatures include optional `note?: string`. |
| `src/features/scenelab/SceneLabPanel.tsx` | Live arena preview, VFX checklist, per-asset Approve/Reject controls with review note input and 🔒 lock indicators. |
| `src/features/dashboard/DashboardPanel.tsx` | **Approval Dashboard (007C).** Live review summary counts, filterable review queue (Pending/Approved/Rejected/Protected/All). **010B:** `⚙ Remediate` collapsible panel for approved assets — `Save Note` + two-click `Reject (Remediation)`. **010G:** `Approve Latest Candidate (v{N})` button with two-click guard for rejected assets with a newer candidate version. |
| `src/lib/assetManifest.ts` | Extended: `CombatPackManifest` contract type, `COMBAT_SLICE_REQUIRED_IDS` (19 entries, modern VFX IDs — updated 008D), `INITIAL_ASSETS` (zombie records removed in 008D). |
| `src/lib/exportEligibility.ts` | **NEW (008A/008B).** Pure export eligibility helpers: `isExportEligible`, `filterForCombatExport`, `getExportReadinessReport`, `getExportExclusionReason`, `getExportEligibilityRows`. |
| `src/lib/assetReview.ts` | **NEW (007A).** Pure, non-mutating review state transition helpers. **010B:** `updateNote` helper added. |
| `src/lib/reviewQueue.ts` | **NEW (007C).** Pure, non-mutating review queue helpers: `getReviewStats`, `filterAssetsByReviewStatus`, `identifyActionableAssets`. |
| `src/lib/vfxCatalog.ts` | 12 combat VFX presets across 8 families and 3 factions. |
| `src/lib/vfxQueue.ts` | Immutable queue lifecycle: enqueue, cancel, retry, clear, reorder, stats, batch helpers. |
| `src/lib/workshopPersistence.ts` | `localStorage`-based state persistence. `WORKSHOP_STATE_SCHEMA_VERSION` frozen at 1. |
| `src/lib/versionGuard.ts` | `assertPackVersion` + `validatePackAssets`. Shared between workshop and game. |
| `GEMINI_API_KEY` | Present in `.env` (gitignored). Rotated during ARCHON-010E. Generation pipeline is live. |
| `.agents/` | Agent instruction system: rules 10–13, workflows, skills. AG-013 enforces closeout language guardrails. |

### Runtime Asset State (VFX — Combat Targets)

| Asset | Status | Protected | Active Version | Export Eligible |
|---|---|---|---|---|
| `combat-hit-flash-light` | `approved` | 🔒 | v1 | ✅ Yes |
| `combat-hit-flash-dark` | `approved` | 🔒 | v1 | ✅ Yes |
| `combat-death-burst-light` | `approved` | 🔒 | v1 | ✅ Yes |
| `combat-death-burst-dark` | `approved` | 🔒 | v1 | ✅ Yes |
| `combat-heal-pulse` | `approved` | 🔒 | **v2** | ✅ Yes |
| `combat-ambient-arena` | `approved` | 🔒 | **v2** | ✅ Yes |

All six combat VFX targets are approved and export-eligible.

### Smoke Test Coverage

| Script | Assertions |
|---|---|
| `scripts/smoke-test-archon-006b.mjs` | 267 |
| `scripts/smoke-test-archon-006c.mjs` | 221 |
| `scripts/smoke-test-archon-006d.mjs` | 11 |
| `scripts/smoke-test-archon-006e.mjs` | 52 |
| `scripts/smoke-test-archon-007a.mjs` | 36 |
| `scripts/smoke-test-archon-007c.mjs` | 10 |
| `scripts/smoke-test-archon-008a.mjs` | 33 |
| `scripts/smoke-test-archon-008b.mjs` | 39 |
| `scripts/smoke-test-archon-008d.mjs` | 54 |
| `scripts/smoke-test-archon-009a.mjs` | 129 |
| `scripts/smoke-test-archon-009c.mjs` | 37 |
| `scripts/smoke-test-archon-010b.mjs` | 39 |
| `scripts/smoke-test-archon-010g.mjs` | 8 |
| **Total** | **936** |

### archon-game

| Item | State |
|---|---|
| Project | Vite + React + TypeScript. Sibling to archon-workshop at `c:\Dev\archon-game`. |
| `src/lib/types.ts` | `CombatPackManifest`, `CombatPackAsset`, `CombatState`, `UnitState` interfaces. |
| `src/lib/packLoader.ts` | Schema version check, asset URL resolution. |
| `src/features/combat/CombatEngine.ts` | Pure TS state machine. Knight 20 HP vs Sorceress 16 HP. Turn alternation. |
| `src/features/combat/CombatScene.tsx` | Arena + unit tokens + turn banner + HP bars + victory banner + rematch. |
| `src/combat-pack-manifest.json` | Seeded with expected approved asset paths. **Not yet updated to reflect v2 paths for `combat-heal-pulse` and `combat-ambient-arena`.** |

> **Note:** `archon-game` has not been touched since ARCHON-006. Approved Workshop assets are not yet automatically wired into the game. Manual export + copy script required. See `docs/archon-009b-game-asset-sync-runbook.md`.

---

## Current Workflow State

### VFX Pipeline (006)

1. Browse 12 VFX presets in the VFX tab → add to generation queue
2. Run single or controlled batch generation against Gemini API
3. Assets land in `public/generated/`, tracked in `asset-manifest.json`

### Review Workflow (007 / 010)

4. Dashboard → review pending assets at a glance (filter by status)
5. Scene Lab → contextual detailed review per combat preset
6. Approve / Reject per asset with review note → note durably written to `Asset.notes`
7. Approved assets are locked (`asset_protected: true`); server blocks overwrites with `403`
8. **010B:** Approved assets can be note-corrected or remediation-rejected via the `⚙ Remediate` panel
9. **010G:** Rejected assets with a newer candidate version can be approved via `Approve Latest Candidate (v{N})` button
10. Export approved asset pack as ZIP → import into `archon-game`

### Export Readiness (008)

11. Export tab → Export Eligibility Preview table — see which assets will ship and why
12. Combat Slice Status badge shows "Combat Ready" (all 19 required IDs eligible) or "Not Ready"
13. Exclusion reason column explains per-asset exclusions (pending / rejected / no-file)

---

## Protected Contracts

| Contract | Status |
|---|---|
| `CombatPackManifest` interface | ✅ Frozen |
| `COMBAT_PACK_SCHEMA_VERSION` | ✅ Frozen |
| `WORKSHOP_STATE_SCHEMA_VERSION` | ✅ Frozen at 1 |
| ZIP export/import behavior | ✅ Frozen |
| `archon-game` internals | ✅ Untouched |

---

## Next Priority

**Combat Pack Export Validation**

Trigger an export ZIP and confirm that all six approved VFX assets are included with correct paths and hashes — particularly that `combat-heal-pulse` and `combat-ambient-arena` appear with their v2 paths.

Optionally follow with a game manifest sync (see `docs/archon-009b-game-asset-sync-runbook.md`) to bring `archon-game/public/combat-pack-manifest.json` up to date with the v2 approvals.

See `docs/release-archon-010-vfx-remediation.md` for the full ARCHON-010 next-steps roadmap.
