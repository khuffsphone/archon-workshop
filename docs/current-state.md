# Current State Snapshot

**Updated:** 2026-05-14 (after ARCHON-011C — Projectile Export/Sync Confirmation)

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
| `combat-projectile-light` | `approved` | 🔒 | v1 | ✅ Yes |
| `combat-projectile-dark` | `approved` | 🔒 | v1 | ✅ Yes |

All eight combat VFX assets are approved and export-eligible. Export Eligibility Preview reports **Combat Ready** (all 19 `COMBAT_SLICE_REQUIRED_IDS` satisfied, 246/247 assets eligible).

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
| `scripts/smoke-test-archon-011a.mjs` | 26 |
| **Total** | **962** |

### archon-game

| Item | State |
|---|---|
| Project | Vite + React + TypeScript. Sibling to archon-workshop at `c:\Dev\archon-game`. |
| `src/lib/types.ts` | `CombatPackManifest`, `CombatPackAsset`, `CombatState`, `UnitState` interfaces. |
| `src/lib/packLoader.ts` | Schema version check, asset URL resolution. |
| `src/features/combat/CombatEngine.ts` | Pure TS state machine. Knight 20 HP vs Sorceress 16 HP. Turn alternation. |
| `src/features/combat/CombatScene.tsx` | Arena + unit tokens + turn banner + HP bars + victory banner + rematch. |
| `src/combat-pack-manifest.json` | Seeded with expected approved asset paths. **Not yet updated to reflect v2 paths for `combat-heal-pulse` and `combat-ambient-arena`.** Projectile IDs not present (not yet referenced by game). |

> **Note:** `archon-game` has not been touched since ARCHON-006. Approved Workshop assets are not yet automatically wired into the game. Manual export + copy script required. See `docs/archon-009b-game-asset-sync-runbook.md`.
>
> **ARCHON-011C finding:** `combat-projectile-light` and `combat-projectile-dark` are **not referenced** by `CombatScene.tsx` or any game component. Copying assets without a corresponding `CombatScene.tsx` implementation would produce dead binary files. A sync is deferred to ARCHON-012 (game VFX implementation milestone).

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

**ARCHON-012 — Game VFX: Add Projectile Combat Effects to CombatScene**

Both `combat-projectile-light` and `combat-projectile-dark` are approved, export-eligible, and will ship in the next `Export Combat Pack` ZIP. However, the game (`CombatScene.tsx`) does not yet call `getAssetUrl()` for either ID. The correct unlock sequence is:

1. Design when/how projectile VFX fire in combat (ranged attack event? spell cast?)
2. Add `getAssetUrl('combat-projectile-light')` / `'combat-projectile-dark'` calls to `CombatScene.tsx`
3. Add both IDs to `COMBAT_SLICE_REQUIRED_IDS` (freeze-list acknowledgment required for `assetManifest.ts`)
4. Add them to the game's required ID list for `validatePack()`
5. Run the sync runbook: copy assets, export ZIP, replace `combat-pack-manifest.json` wholesale
6. Commit game-side changes after `npm run lint` + 552 tests pass

**Deferred sync items (bundle with ARCHON-012 or separate milestone):**
- `combat-heal-pulse` v2 hash mismatch: game has v1 hash `8b71479b…`, workshop has v2 hash `ce72b3fb…`
- `combat-ambient-arena` v2 hash mismatch: game has v1 hash `db451dc5…`, workshop has v2 hash `ebfb41d0…`

See `docs/archon-009b-game-asset-sync-runbook.md` for the step-by-step sync procedure.
