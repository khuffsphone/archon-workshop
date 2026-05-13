# Release Snapshot — ARCHON-010: VFX Remediation Series

**Date:** 2026-05-12
**Milestone span:** ARCHON-010A through ARCHON-010G
**Classification:** COMPLETE

---

## Overview

ARCHON-010 was a multi-sub-milestone remediation series focused on resolving visual quality failures, a metadata inconsistency, and a broken approval path for two combat VFX assets that failed their initial generation quality rubric.

At series start, two assets (`combat-heal-pulse`, `combat-ambient-arena`) had been generated but produced unusable images: `combat-heal-pulse` rendered entirely greyscale with wing silhouettes instead of a healing pulse, and `combat-ambient-arena` produced a bold heraldic badge rather than a background particle layer. A third asset (`combat-hit-flash-dark`) had a stale contradiction in its `notes` field from a prior review pass.

At series end, all three assets are `approved`, `asset_protected`, and export-eligible. The remediation series also introduced two permanent UI improvements — dashboard remediation controls and an "Approve Latest Candidate" path for regenerated rejected assets — that benefit future operator workflows beyond the immediate targets.

---

## Milestone Summary

| Milestone | Classification | Scope |
|---|---|---|
| **010A** | COMPLETE (read-only) | Visual curation pass on 6 combat VFX assets. Two assets flagged for regen. `combat-hit-flash-dark` metadata inconsistency documented. No statuses changed. |
| **010B** | COMPLETE | Dashboard remediation controls: `updateNote` helper (pure), `Save Note` and `Reject (Remediation)` panel for approved assets. 39 smoke assertions. |
| **010C** | PARTIAL / BLOCKED | Phase 1 (reject targets + fix note) succeeded. Phase 2 (generation) blocked by Playwright `net::ERR_BLOCKED_BY_CLIENT`. No assets generated. |
| **010D** | BLOCKED | Manual Chrome generation attempted. Generation failed with `400 Bad Request — API Key not found`. No assets generated. |
| **010E** | COMPLETE | Rotated revoked `GEMINI_API_KEY`. Verified via read-only API probe (HTTP 200). No code changes. No generation. |
| **010F** | PARTIAL / APPROVAL BLOCKED | Manual Chrome generation succeeded. v2 candidates for both targets generated and visually passed. Approval blocked — UI approve buttons gate on `status === 'pending'`; rejected assets had no approve path. |
| **010G** | COMPLETE | Dashboard UI fix: `hasApprovableCandidate` guard + `Approve Latest Candidate (v{N})` button for `rejected` assets with newer candidates. Both targets approved via new UI. 8 smoke assertions. |

---

## 010C Phase 1 Remediation Results

Executed successfully in ARCHON-010C before the generation block:

| Asset | Action Taken | Result |
|---|---|---|
| `combat-hit-flash-dark` | Note corrected via `Save Note` | Note now: `"Approved after ARCHON-010A visual inspection; previous rejected note was metadata inconsistency only."` Status unchanged. |
| `combat-heal-pulse` | `Reject (Remediation)` via Dashboard | Status: `rejected`, `asset_protected: false` — unblocked for regeneration |
| `combat-ambient-arena` | `Reject (Remediation)` via Dashboard | Status: `rejected`, `asset_protected: false` — unblocked for regeneration |

---

## Final Asset State

| Asset | Status | Protected | Active Version | Active Path | Export Eligible | Approved Via |
|---|---|---|---|---|---|---|
| `combat-hit-flash-dark` | `approved` | 🔒 `true` | v1 | `/generated/images/combat-hit-flash-dark-v1.png` | ✅ Yes | Pre-010 |
| `combat-heal-pulse` | `approved` | 🔒 `true` | **v2** | `/generated/images/combat-heal-pulse-v2.png` | ✅ Yes | ARCHON-010G |
| `combat-ambient-arena` | `approved` | 🔒 `true` | **v2** | `/generated/images/combat-ambient-arena-v2.png` | ✅ Yes | ARCHON-010G |

### Hashes

| Asset | Approved Hash |
|---|---|
| `combat-hit-flash-dark` | `8c771bee25f4fc3095e33c7f4ee262b570e0965102e57d7331641f49823bd55f` |
| `combat-heal-pulse` v2 | `ce72b3fbcd7fedfee8449b8d72829c9967cf2490682b83e04caa23d2ea138a2f` |
| `combat-ambient-arena` v2 | `ebfb41d06f4d701a4d1d2410642f44fdac7cd437a7c3bdee181b7130d8993bc9` |

---

## Source Changes Introduced During ARCHON-010

### ARCHON-010B

| File | Change |
|---|---|
| `src/lib/assetReview.ts` | Added `updateNote(asset, note)` — pure, non-mutating helper that updates only the `notes` field |
| `src/features/dashboard/DashboardPanel.tsx` | Added `onUpdateNote` prop, `⚙ Remediate` collapsible toggle, `Save Note (keep approved)` + `Reject (Remediation)` two-click panel |
| `src/App.tsx` | Added `handleUpdateNote`, wired to `DashboardPanel` |
| `scripts/smoke-test-archon-010b.mjs` | 39 assertions: `updateNote`, `applyReview`, `isOverwriteEligible`, interaction flow invariants |

### ARCHON-010G

| File | Change |
|---|---|
| `src/features/dashboard/DashboardPanel.tsx` | Added `approveConfirm` state, `hasApprovableCandidate` guard helper, `handleApproveLatest` two-click handler, and JSX panel for rejected assets with a newer candidate version (+81 lines) |
| `scripts/smoke-test-archon-010g.mjs` | 8 assertions: `hasApprovableCandidate` — all branches including null/empty/undefined edge cases |

### Files NOT Changed

- `App.tsx` (010G) — existing `handleApprove` already correctly promotes `candidate_versions[last]` to top-level
- `src/features/vfx/VFXWorkflowPanel.tsx`
- `src/lib/exportEligibility.ts`
- `src/lib/assetManifest.ts`
- `archon-game` — untouched throughout ARCHON-010

---

## New Smoke Test Coverage Added During ARCHON-010

| Script | Milestone | Assertions |
|---|---|---|
| `scripts/smoke-test-archon-010b.mjs` | 010B | 39 |
| `scripts/smoke-test-archon-010g.mjs` | 010G | 8 |

Cumulative smoke test suite after ARCHON-010: **770 assertions** (723 pre-010 + 47 new).

---

## Security Note — API Key Rotation (010D/010E)

During ARCHON-010E, a key value was pasted into the chat interface by the operator. The operator immediately revoked that key and replaced it with a fresh key. No key value appears in any committed file or documentation. `.env` is and remains gitignored (`.gitignore:13:.env`). No generation occurred during the security incident window.

---

## Generated/Runtime Artifact Hygiene

All generated images, thumbnails, and the runtime manifest (`asset-manifest.json`) are excluded from git tracking:

```
.gitignore:10:public/generated/
.gitignore:32:public/exports/
```

The v2 image and thumbnail files on disk are runtime-only assets. They are not staged or committed.

---

## Protected Contracts — Confirmed Unchanged

| Contract | Status |
|---|---|
| `CombatPackManifest` interface | ✅ Frozen — unchanged |
| `COMBAT_PACK_SCHEMA_VERSION` | ✅ Frozen — unchanged |
| `WORKSHOP_STATE_SCHEMA_VERSION` | ✅ Frozen at 1 |
| ZIP export/import behavior | ✅ Frozen — unchanged |
| `archon-game` internals | ✅ Untouched |

---

## Commit Log — ARCHON-010 Series

| Hash | Commit |
|---|---|
| `98a6426` | docs: ARCHON-010A — VFX quality curation pass (inspection only, 2 flagged for regen) |
| `81f9092` | feat: ARCHON-010B — dashboard remediation controls (updateNote + reject-remediation for approved assets, 39/39 smoke assertions) |
| `d26cf02` | docs: ARCHON-010C — partial/blocked controlled two-asset regen pass |
| `eaacf30` | docs: ARCHON-010D — blocked manual-browser two-asset regen pass (missing API key) |
| `1109ead` | docs: ARCHON-010E — API key configuration fix verified |
| `ff649a8` | docs: ARCHON-010F — partial/blocked; generation succeeded, approval blocked (no UI path for rejected assets) |
| `6ccdc71` | feat(dashboard): ARCHON-010G — add Approve Latest Candidate UI for regenerated rejected assets |

---

## Recommended Next Steps

| Priority | Task |
|---|---|
| **High** | Combat Pack export validation — trigger an export ZIP and confirm `combat-heal-pulse` and `combat-ambient-arena` are included with their v2 paths and hashes |
| **Medium** | Update `archon-game/public/combat-pack-manifest.json` — manually sync approved v2 paths into the game manifest (see `docs/archon-009b-game-asset-sync-runbook.md`) |
| **Low** | Generate `combat-projectile-light` and `combat-projectile-dark` — both are in `INITIAL_ASSETS` but were never generated; deferred from ARCHON-010C |
| **Future** | Consider adding `combat-heal-pulse` and `combat-ambient-arena` to Scene Lab's `vfxIds` list for contextual in-scene preview |
