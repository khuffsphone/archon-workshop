# Current State Snapshot

**Updated:** 2026-05-01 (after ARCHON-008D — Export Readiness complete)

---

## What Exists Now

### archon-workshop

| Item | State |
|---|---|
| `server.ts` | Patched. `POST /api/save-asset` now returns `403 Forbidden` if the canonical asset ID resolves to a protected (`asset_protected: true`) asset. All original endpoints preserved. |
| `src/App.tsx` | ~500-line shell. Owns global state: assets, logs, progress, review handlers, tab navigation. Delegates all UI to feature panels. |
| `src/features/generation/GenerationPanel.tsx` | `useGeneration` hook + UI — owns `handleGenerate`, `batchGenerate`, `expandLibrary`. |
| `src/features/export/ExportPanel.tsx` | Owns full export, combat-pack export, import-pack, verify. Enforces version guard. **Export Eligibility Preview table added (008B):** unified single table, eligibility status badge, exclusion reason column, Combat Slice Status summary bar. |
| `src/features/vfx/VFXWorkflowPanel.tsx` | VFX catalog browse, queue management, single/batch generation. Approve/Reject prop signatures include optional `note?: string`. |
| `src/features/scenelab/SceneLabPanel.tsx` | Live arena preview, VFX checklist, per-asset Approve/Reject controls with review note input and 🔒 lock indicators. |
| `src/features/dashboard/DashboardPanel.tsx` | **NEW (007C).** Approval Dashboard: live review summary counts, filterable review queue (Pending/Approved/Rejected/Protected/All), inline approve/reject, system logs. |
| `src/lib/assetManifest.ts` | Extended: `CombatPackManifest` contract type, `COMBAT_SLICE_REQUIRED_IDS` (19 entries, modern VFX IDs — updated 008D), `INITIAL_ASSETS` (zombie records removed in 008D). |
| `src/lib/exportEligibility.ts` | **NEW (008A/008B).** Pure export eligibility helpers: `isExportEligible`, `filterForCombatExport`, `getExportReadinessReport`, `getExportExclusionReason`, `getExportEligibilityRows`. |
| `src/lib/assetReview.ts` | **NEW (007A).** Pure, non-mutating review state transition helpers. |
| `src/lib/reviewQueue.ts` | **NEW (007C).** Pure, non-mutating review queue helpers: `getReviewStats`, `filterAssetsByReviewStatus`, `identifyActionableAssets`. |
| `src/lib/vfxCatalog.ts` | 12 combat VFX presets across 8 families and 3 factions. |
| `src/lib/vfxQueue.ts` | Immutable queue lifecycle: enqueue, cancel, retry, clear, reorder, stats, batch helpers. |
| `src/lib/workshopPersistence.ts` | `localStorage`-based state persistence. `WORKSHOP_STATE_SCHEMA_VERSION` frozen at 1. |
| `src/lib/versionGuard.ts` | `assertPackVersion` + `validatePackAssets`. Shared between workshop and game. |
| `GEMINI_API_KEY` | Present in `.env`. Generation pipeline is live. |
| `.agents/` | Agent instruction system: rules 10–13, workflows, skills. AG-013 enforces closeout language guardrails. |

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
| **Total** | **723** |

### archon-game

| Item | State |
|---|---|
| Project | Vite + React + TypeScript. Sibling to archon-workshop at `c:\Dev\archon-game`. |
| `src/lib/types.ts` | `CombatPackManifest`, `CombatPackAsset`, `CombatState`, `UnitState` interfaces. |
| `src/lib/packLoader.ts` | Schema version check, asset URL resolution. |
| `src/features/combat/CombatEngine.ts` | Pure TS state machine. Knight 20 HP vs Sorceress 16 HP. Turn alternation. |
| `src/features/combat/CombatScene.tsx` | Arena + unit tokens + turn banner + HP bars + victory banner + rematch. |
| `src/combat-pack-manifest.json` | Seeded with expected approved asset paths. |

> **Note:** `archon-game` has not been touched since ARCHON-006. Approved Workshop assets are not yet automatically wired into the game. Manual export + copy script required.

---

## Current Workflow State

### VFX Pipeline (006)

1. Browse 12 VFX presets in the VFX tab → add to generation queue
2. Run single or controlled batch generation against Gemini API
3. Assets land in `public/generated/`, tracked in `asset-manifest.json`

### Review Workflow (007)

4. Dashboard → review pending assets at a glance (filter by status)
5. Scene Lab → contextual detailed review per combat preset
6. Approve / Reject per asset with review note → note durably written to `Asset.notes`
7. Approved assets are locked (`asset_protected: true`); server blocks overwrites with `403`
8. Export approved asset pack as ZIP → import into `archon-game`

### Export Readiness (008)

9. Export tab → Export Eligibility Preview table — see which assets will ship and why
10. Combat Slice Status badge shows "Combat Ready" (all 19 required IDs eligible) or "Not Ready"
11. Exclusion reason column explains per-asset exclusions (pending / rejected / no-file)

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

**ARCHON-009A — VFX Asset Generation Pass**

Trigger generation and review for the 4 modern required VFX IDs (`combat-hit-flash-light`, `combat-hit-flash-dark`, `combat-death-burst-light`, `combat-death-burst-dark`) so the Export Eligibility Preview reaches "Combat Ready" with real generated assets, not just matching required-ID alignment.

See `docs/release-archon-008-export-readiness.md` for the full next-milestone roadmap.
