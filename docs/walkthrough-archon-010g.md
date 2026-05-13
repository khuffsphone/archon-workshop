# Walkthrough — ARCHON-010G: Approve Regenerated Rejected Candidates UI Fix

## Summary

**Milestone Classification:** COMPLETE

ARCHON-010G implemented a targeted Dashboard UI fix to unblock approval of regenerated `rejected` assets that had newer candidate versions available. The fix added an `Approve Latest Candidate (v{N})` control to the Dashboard rejected filter view with a two-click confirmation guard. Both target assets — `combat-heal-pulse` and `combat-ambient-arena` — were approved through the new UI, with v2 candidates promoted to top-level and both assets now export-eligible.

---

## 1. Files Changed

| File | Change |
|---|---|
| `src/features/dashboard/DashboardPanel.tsx` | MODIFIED — added `approveConfirm` state, `hasApprovableCandidate` helper, `handleApproveLatest` handler, and JSX block for rejected assets with approvable candidates (+81 lines) |
| `scripts/smoke-test-archon-010g.mjs` | NEW — 8-case pure unit smoke test for `hasApprovableCandidate` guard logic |
| `docs/walkthrough-archon-010g.md` | NEW — this file |

### Files NOT Changed
- `App.tsx` — existing `handleApprove` already correctly promotes latest candidate; no changes needed
- `src/lib/assetReview.ts` — no helper changes needed
- `src/features/vfx/VFXWorkflowPanel.tsx` — not in scope
- Export logic, schemas, `archon-game` — untouched

### Test/Smoke Files Modified
- `scripts/smoke-test-archon-010g.mjs` — new file, created for this milestone

---

## 2. Root Cause of Approval Blocker

`handleApprove` in `App.tsx` already correctly promotes `candidate_versions[last]` to the top-level path/hash/thumbnails when called. The problem was purely in the UI layer:

Generation adds a new `candidate_versions` entry and updates `current_display_version` without resetting `status` from `rejected` to `pending`. The approve buttons in DashboardPanel and VFXWorkflowPanel were both gated on `status === 'pending'`, so they never rendered for `rejected` assets — even when a newer candidate was available. Scene Lab's `vfxIds` did not include either target asset, so that path was also unavailable.

Result: no UI button could be clicked to approve a regenerated rejected asset.

---

## 3. Dashboard UI Fix

### New guard helper — `hasApprovableCandidate`

```typescript
const hasApprovableCandidate = (asset: Asset): boolean => {
  if (asset.status !== 'rejected') return false;
  const versions = asset.candidate_versions ?? [];
  if (versions.length < 2) return false;
  const latest = versions[versions.length - 1];
  return (latest?.version ?? 0) > (asset.approved_version ?? 0);
};
```

Guard conditions (all must be true to show button):
- `status === 'rejected'`
- `candidate_versions.length >= 2` (regeneration has occurred)
- `latest.version > (approved_version ?? 0)` (latest candidate is newer than previously approved)

### New handler — `handleApproveLatest`

Two-click confirmation guard (matching the existing reject-remediation pattern):
1. First click → sets `approveConfirm[asset.id] = true`, shows `Confirm Approve v{N}` / `Cancel`
2. Second click → calls `onApprove(asset.id, note)` → triggers existing `handleApprove` in `App.tsx`

### New JSX block

Renders inside the card for any asset satisfying `hasApprovableCandidate`, in the Dashboard rejected filter. Shows:
- Candidate version label (`Approve new candidate (v{N}):`)
- v2 thumbnail preview (`thumbnail_256` from the latest `candidate_versions` entry)
- Approval note input
- Two-click `Approve Latest Candidate (v2)` button

### Button and panel element IDs (unique per asset)
- `dash-approve-latest-panel-{id}` — panel container
- `input-dash-approve-latest-note-{id}` — note input
- `btn-dash-approve-latest-{id}` — first-click button
- `btn-dash-approve-latest-confirm-{id}` — confirm button
- `btn-dash-approve-latest-cancel-{id}` — cancel button

---

## 4. Smoke Test Result

```
── ARCHON-010G Smoke Test: hasApprovableCandidate ──

  ✅ returns false for pending asset (even with 2 candidates)
  ✅ returns false for approved asset (even with 2 candidates)
  ✅ returns false for rejected asset with only 1 candidate (no regen)
  ✅ returns true for rejected asset with v2 candidate (v2 > approved_version 1)
  ✅ returns false when latest candidate version equals approved_version
  ✅ returns true when approved_version is undefined (treats as 0)
  ✅ returns false for rejected asset with empty candidate_versions
  ✅ returns false for rejected asset with null candidate_versions

── Results: 8 passed, 0 failed ──
```

Run command: `node scripts/smoke-test-archon-010g.mjs`
Exit code: 0

### Supporting smoke tests (all passing, no regressions)

| Test | Result |
|---|---|
| `smoke-test-archon-010b.mjs` | ✅ passed |
| `smoke-test-archon-009c.mjs` | ✅ passed |
| `smoke-test-archon-009a.mjs` | ✅ 129 passed, 0 failed |

---

## 5. Browser Verification — Approval

All actions performed in the Playwright MCP browser against `http://localhost:3000`.

### Pre-approval pre-conditions confirmed (programmatic DOM check)

| Check | Result |
|---|---|
| Filter active is `rejected` | ✅ |
| `dashboard-card-combat-heal-pulse` exists | ✅ |
| `dashboard-card-combat-ambient-arena` exists | ✅ |
| Heal button label | ✅ `Approve Latest Candidate (v2)` |
| Arena button label | ✅ `Approve Latest Candidate (v2)` |
| Heal thumbnail src | ✅ `.../combat-heal-pulse-v2.png` |
| Arena thumbnail src | ✅ `.../combat-ambient-arena-v2.png` |
| Total visible cards | ✅ **2** — exactly the two targets |
| Confirm buttons visible before first click | ✅ None |
| Any other approval triggered | ✅ None |

### Approval sequence — `combat-heal-pulse`

1. Typed approval note into `#input-dash-approve-latest-note-combat-heal-pulse`
2. Clicked `#btn-dash-approve-latest-combat-heal-pulse` (first click)
3. Confirmed `btn-dash-approve-latest-confirm-combat-heal-pulse` appeared with label `Confirm Approve v2`
4. Clicked `#btn-dash-approve-latest-confirm-combat-heal-pulse` (second click)
5. Dashboard stat counter: Approved **242 → 243**, Rejected **2 → 1**
6. Card removed from rejected filter view

### Approval sequence — `combat-ambient-arena`

1. Typed approval note into `#input-dash-approve-latest-note-combat-ambient-arena`
2. Clicked `#btn-dash-approve-latest-combat-ambient-arena` (first click)
3. Confirmed `btn-dash-approve-latest-confirm-combat-ambient-arena` appeared with label `Confirm Approve v2`
4. Clicked `#btn-dash-approve-latest-confirm-combat-ambient-arena` (second click)
5. Dashboard stat counter: Approved **243 → 244**, Rejected **1 → 0**
6. Card removed from rejected filter view
7. Rejected filter showed: *"All caught up! No assets matching this filter."*

### Final dashboard state after both approvals

- Approved: **244**
- Pending Review: **0**
- Rejected: **0**
- Total: **244**

---

## 6. Pre/Post State

### `combat-heal-pulse`

| Field | Pre-State | Post-State |
|---|---|---|
| `status` | `rejected` | ✅ `approved` |
| `asset_protected` | `false` | ✅ `true` |
| top-level `path` | `/generated/images/combat-heal-pulse-v1.png` | ✅ `/generated/images/combat-heal-pulse-v2.png` |
| top-level `hash` | `8b71479b…` (v1) | ✅ `ce72b3fb…` (v2) |
| `approved_version` | `1` | ✅ `2` |
| `current_display_version` | `2` | ✅ `2` |
| `candidate_versions` count | 2 | 2 (unchanged) |
| `thumbnail_64` | `.../combat-heal-pulse.png` (v1 canonical) | ✅ `.../combat-heal-pulse-v2.png` |
| `thumbnail_256` | `.../combat-heal-pulse.png` (v1 canonical) | ✅ `.../combat-heal-pulse-v2.png` |
| `preferred_playback_file` | absent | ✅ `/generated/images/combat-heal-pulse-v2.png` |
| `notes` | (none) | ✅ ARCHON-010G approval note |
| export eligible | ❌ No | ✅ Yes |
| `updated_at` | `2026-05-11T21:41:43.348Z` | ✅ `2026-05-12T00:40:36.554Z` |

### `combat-ambient-arena`

| Field | Pre-State | Post-State |
|---|---|---|
| `status` | `rejected` | ✅ `approved` |
| `asset_protected` | `false` | ✅ `true` |
| top-level `path` | `/generated/images/combat-ambient-arena-v1.png` | ✅ `/generated/images/combat-ambient-arena-v2.png` |
| top-level `hash` | `db451dc5…` (v1) | ✅ `ebfb41d0…` (v2) |
| `approved_version` | `1` | ✅ `2` |
| `current_display_version` | `2` | ✅ `2` |
| `candidate_versions` count | 2 | 2 (unchanged) |
| `thumbnail_64` | `.../combat-ambient-arena.png` (v1 canonical) | ✅ `.../combat-ambient-arena-v2.png` |
| `thumbnail_256` | `.../combat-ambient-arena.png` (v1 canonical) | ✅ `.../combat-ambient-arena-v2.png` |
| `preferred_playback_file` | absent | ✅ `/generated/images/combat-ambient-arena-v2.png` |
| `notes` | (none) | ✅ ARCHON-010G approval note |
| export eligible | ❌ No | ✅ Yes |
| `updated_at` | `2026-05-11T21:41:50.965Z` | ✅ `2026-05-12T00:41:12.220Z` |

### `combat-hit-flash-dark` (sentinel — must be unchanged)

| Field | Pre-State | Post-State |
|---|---|---|
| `status` | `approved` | `approved` ✅ unchanged |
| `asset_protected` | `true` | `true` ✅ unchanged |
| `path` | `/generated/images/combat-hit-flash-dark-v1.png` | unchanged ✅ |
| `hash` | `8c771bee…` | unchanged ✅ |
| `updated_at` | `2026-05-01T23:53:14.654Z` | unchanged ✅ |

---

## 7. v2 Path/Hash Promotion Confirmed

Both assets: v2 `path`, `hash`, `thumbnail_64`, `thumbnail_256`, and `preferred_playback_file` are now at the top level.

- `combat-heal-pulse` top-level hash: `ce72b3fbcd7fedfee8449b8d72829c9967cf2490682b83e04caa23d2ea138a2f` ✅ matches `candidate_versions[1].hash`
- `combat-ambient-arena` top-level hash: `ebfb41d06f4d701a4d1d2410642f44fdac7cd437a7c3bdee181b7130d8993bc9` ✅ matches `candidate_versions[1].hash`

Promotion was performed by the existing `handleApprove` function in `App.tsx` (lines 317–328), which reads `candidate_versions[last]` and overwrites the top-level fields. No direct manifest writes were performed.

---

## 8. Export Eligibility Result

`isExportEligible` in `exportEligibility.ts`: `asset.status === 'approved' && !!asset.path`

| Asset | `status` | `path` present | Export Eligible |
|---|---|---|---|
| `combat-heal-pulse` | `approved` | ✅ (`…v2.png`) | ✅ Yes |
| `combat-ambient-arena` | `approved` | ✅ (`…v2.png`) | ✅ Yes |

---

## 9. No Generation During Approval

The `handleApprove` function does not call any generation endpoint. It is a pure state update: it reads from `candidate_versions`, promotes fields, calls `applyReview`, and calls `saveManifest`. No API calls to Gemini were made. No new image files were created during the approval step. The v2 files already existed on disk from the ARCHON-010F batch run.

---

## 10. No Game Files Changed

No files under `archon-game/` were modified. The approval action writes only to `public/generated/manifests/asset-manifest.json`, which is gitignored. The `archon-game` manifest (`public/game-export/`) was not touched. No export was triggered.

---

## 11. Artifact Gate Result

```
[SHADOW MODE — no enforcement, no auto-approval, no mutation]

── ARCHON-OPS-001 Artifact Check Gate ──

  🟡 [RISKY]  src/features/dashboard/DashboardPanel.tsx

NOOP: 0  SAFE: 0  RISKY: 1  BLOCKED: 0

🟡 GATE RISKY — Review recommended before staging.
```

`RISKY` classification for `DashboardPanel.tsx` is expected and correct — it is the intentional source file change for this milestone. It is not `BLOCKED`. No generated files, manifests, or runtime artifacts appear in the staged set.

---

## 12. Generated/Export Artifact Hygiene

The `public/generated/` directory (images, thumbnails, manifests) is excluded from git tracking by `.gitignore:10:public/generated/`. The `public/exports/` directory is excluded by `.gitignore:32:public/exports/`. No generated files are staged or committed.

```
.gitignore:10:public/generated/  public/generated/
.gitignore:32:public/exports/    public/exports/
```

---

## 13. Local Path Hygiene

The following strings are absent from this document:

| Pattern | Result |
|---|---|
| `.gemini` (local app data path) | ✅ 0 hits |
| `click_feedback` (Playwright session artifacts) | ✅ 0 hits (self-referential hygiene attestation only) |
| `C:/Users` (local filesystem path) | ✅ 0 hits |

---

## 14. Commands Run

```bash
node scripts/smoke-test-archon-010g.mjs
node --import=tsx/esm scripts/smoke-test-archon-010b.mjs
node --import=tsx/esm scripts/smoke-test-archon-009c.mjs
node --import=tsx/esm scripts/smoke-test-archon-009a.mjs
npm run lint
npm run build
node scripts/artifact-check-gate.mjs --all
node scripts/check-evidence-receipt.mjs docs/walkthrough-archon-010g.md
git status -uall --short
git ls-files --others --exclude-standard
git check-ignore -v public/generated/
git check-ignore -v public/exports/
git diff --stat
git diff --name-only
git status -sb
```

Exit code: 0 for all expected passes. Artifact gate exits 1 (RISKY — expected for intentional source change in shadow mode).

---

## 15. Git Status

```
 M src/features/dashboard/DashboardPanel.tsx
?? scripts/smoke-test-archon-010g.mjs
?? docs/walkthrough-archon-010g.md
## main...origin/main
```

## 16. Commit (pending operator approval)

```
feat(dashboard): ARCHON-010G -- add Approve Latest Candidate UI for regenerated rejected assets
```

Files to stage:
- `src/features/dashboard/DashboardPanel.tsx`
- `scripts/smoke-test-archon-010g.mjs`
- `docs/walkthrough-archon-010g.md`

No staged files yet.
Pushed confirmation: N/A.

---

## 17. Recommended Next Task

**ARCHON-010 series is now complete:**

| Asset | Final Status |
|---|---|
| `combat-hit-flash-dark` | `approved` / `protected` / v1 |
| `combat-heal-pulse` | `approved` / `protected` / v2 |
| `combat-ambient-arena` | `approved` / `protected` / v2 |

All three combat slice VFX targets are approved and export-eligible.

Recommended next task: **Combat Pack export validation** — trigger an export to verify the ZIP/manifest correctly includes all three approved assets with their v2 paths and hashes, confirming end-to-end pipeline integrity after the ARCHON-010 remediation series.
