# Walkthrough — ARCHON-006C: Batch VFX Generation Queue Foundation

**Repo:** `archon-workshop`
**Date:** 2026-04-28
**Status:** Complete

---

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `src/lib/vfxQueue.ts` | **NEW** | Pure VFX queue data model and helpers |
| `src/features/vfx/VFXWorkflowPanel.tsx` | **MODIFIED** | Added queue state, Enqueue Selected button, queue list section |
| `src/index.css` | **MODIFIED** | Additive `.vfx-queue-*` CSS — 200 lines, no existing classes changed |
| `scripts/smoke-test-archon-006c.mjs` | **NEW** | 148-assertion smoke test for vfxQueue.ts |
| `docs/walkthrough-archon-006c.md` | **NEW** | This document |

**Not modified (protected):**
- `server.ts` — frozen
- `src/lib/assetManifest.ts` — frozen
- `src/lib/versionGuard.ts` — frozen
- `src/lib/workshopPersistence.ts` — frozen
- `src/App.tsx` — no change needed; `handleGenerateSelected` prop kept
- `src/features/export/ExportPanel.tsx`
- `src/features/scenelab/SceneLabPanel.tsx`
- `archon-game` — not touched
- `asset-manifest.json` — not touched
- `CombatPackManifest` — not touched
- `COMBAT_PACK_SCHEMA_VERSION` — not touched
- ZIP export structure — not touched

---

## Key Design Decision: Why Not Wire Real Generation?

Inspection revealed a critical gap: the 12 VFX catalog asset slots (`combat-hit-flash-light`, etc.) **do not exist in `INITIAL_ASSETS`**. The existing `handleGenerate()` pipeline performs `assets.find(a => a.id === assetId)` and silently returns `null` for any ID not in the manifest.

This means the previous "Generate Selected" button was silently doing nothing for all 12 VFX catalog presets.

**ARCHON-006C resolves this by introducing a staging queue** — a self-contained, operator-visible layer that captures preset generation intent with a full prompt brief snapshot. Real generation wiring (registering VFX slots in the manifest + calling the API) is explicitly ARCHON-006D scope.

---

## What Was Built

### `src/lib/vfxQueue.ts` — VFX Queue Module

Pure TypeScript — no React, no I/O, no `fetch()`. Safe to import in Node.js smoke tests.

**Types exported:**

```ts
type VFXQueueStatus = 'queued' | 'generating' | 'done' | 'failed' | 'skipped';

interface VFXQueueEntry {
  queueId:      string;        // unique per enqueue (allows same preset multiple times)
  presetId:     string;        // VFXPreset.id
  assetSlot:    string;        // VFXPreset.asset_slot
  presetName:   string;        // snapshot
  family:       VFXFamily;     // snapshot
  faction:      VFXFaction;    // snapshot
  intensity:    VFXIntensity;  // snapshot
  promptBrief:  string;        // full prompt brief — snapshot at enqueue time
  status:       VFXQueueStatus;
  enqueuedAt:   string;        // ISO timestamp
  startedAt?:   string;        // set by generation wiring (ARCHON-006D+)
  completedAt?: string;
  errorMessage?: string;
  priority:     number;        // ordinal — lower = higher priority
}

interface VFXQueueStats {
  queued: number; generating: number; done: number; failed: number; skipped: number; total: number;
}

interface VFXQueueBriefExport {
  exported_at: string; queue_version: number; entry_count: number;
  stats: VFXQueueStats; entries: VFXQueueEntry[];
}
```

**Helpers exported:**

| Function | Purpose |
|---|---|
| `generateQueueId()` | Collision-resistant ID, no crypto dep, `vfxq-<ts36>-<rnd>` format |
| `buildQueueEntry(preset, priority)` | Snapshot-builds a `VFXQueueEntry` from a `VFXPreset` |
| `getQueueStats(entries)` | Counts entries by status |
| `filterQueueByStatus(entries, status)` | Filters by status; `null` = return all |
| `reorderEntry(entries, from, to)` | Non-mutating reorder with priority recalculation |
| `exportQueueBriefAsJSON(entries)` | Serialises queue to JSON brief package |

---

### `src/features/vfx/VFXWorkflowPanel.tsx` — Queue Integration

**New state (panel-local, session-scoped):**

```ts
const [vfxQueue, setVfxQueue] = useState<VFXQueueEntry[]>([]);
```

**Button renamed:** `Generate Selected (N)` → `Enqueue Selected (N)` (`id="btn-vfx-enqueue"`)

This is not cosmetic — the old button was calling `handleGenerateSelected()` which silently returned `null` for all VFX catalog IDs. The new button calls `enqueuePresets()` which builds `VFXQueueEntry` objects and appends them to local queue state.

**`onGenerateSelected` prop:** kept in the component interface for future wiring (ARCHON-006D+).

**New VFX Generation Queue section:**

- Header: title with count badge, stat chips (⏳ queued / ⚡ generating / ✅ done / ❌ failed), "Export Queue Briefs" and "Clear Queue" buttons
- Empty state message when queue is empty
- Per-entry row: priority ordinal, status dot, preset name, family·faction·intensity meta, asset slot (monospace), status badge, ▲ ▼ ✕ controls
- ▲/▼ buttons disabled at boundaries (first/last)
- ✕ disabled when entry is `generating`
- Clear Queue skips `generating` entries

**All existing functionality preserved unchanged:**
- Filter bar (family + faction chips)
- Card grid with selection
- Intensity pip strip
- Detail drawer + Copy Brief
- Export Catalog JSON button
- Approve/Reject inline flow

---

### `src/index.css` — Additive CSS

200 lines appended. All new classes prefixed `.vfx-queue-*` or `.btn-icon*` or `.btn-danger-sm`. No existing class modified.

---

## Commands Run

```powershell
npm run lint    # tsc --noEmit → 0 errors
npm run build   # vite build → ✓ 55 modules (up from 54), exit 0
node --import=tsx/esm scripts/smoke-test-archon-006c.mjs
# → 148 passed, 0 failed
```

---

## Smoke Test Results

```
S1:  generateQueueId              —  4 assertions  ✅
S2:  buildQueueEntry (1 preset)   — 17 assertions  ✅
S3:  buildQueueEntry (all 12)     — 84 assertions  ✅
S4:  Duplicate enqueue uniqueness —  4 assertions  ✅
S5:  getQueueStats                —  9 assertions  ✅
S6:  filterQueueByStatus          —  6 assertions  ✅
S7:  reorderEntry                 —  8 assertions  ✅
S8:  exportQueueBriefAsJSON       — 13 assertions  ✅
S9:  promptBrief snapshot         —  3 assertions  ✅

ARCHON-006C smoke test complete — 148 passed, 0 failed ✅
```

---

## Browser Verification Results

**Date:** 2026-04-28
**Server:** `localhost:3000` (existing dev server)
**Recording:** `archon_006c_verification_1777419112101.webp`

| Step | Check | Result |
|---|---|---|
| 1 | Page loads at localhost:3000; all 5 tabs present | ✅ |
| 2 | VFX tab navigates correctly | ✅ |
| 3 | Toolbar: button correctly reads "Enqueue Selected (0)"; other buttons unchanged | ✅ |
| 4 | VFX Generation Queue section visible below cards; shows empty-state message | ✅ |
| 5 | Select 3 presets → Enqueue Selected (3) → toast "3 VFX presets enqueued"; selection clears | ✅ |
| 6 | Queue section shows count badge "3"; 3 rows with priority, name, meta, asset slot, "queued" badge, ▲▼✕ controls | ✅ |
| 7 | ▲ Move Up on entry 2 → entry 2 swaps with entry 1 correctly | ✅ |
| 8 | ✕ Remove entry → queue updates to 2 entries; count badge updates | ✅ |
| 9 | Export Queue Briefs → toast "Queue briefs exported"; download triggered | ✅ |
| 10 | Clear Queue → toast "Queue cleared"; empty-state message returns; count badge "0" | ✅ |
| 11 | Regression: projectile filter → 2 cards; All reset → 12 cards | ✅ |
| 12 | Regression: Export tab loads; Export Full Pack + Export Combat Pack present | ✅ |

---

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Pure `vfxQueue.ts` module with typed `VFXQueueEntry` | ✅ |
| `buildQueueEntry()` snapshots all preset fields | ✅ |
| `getQueueStats()` counts all statuses | ✅ |
| `filterQueueByStatus()` — null, match, empty cases | ✅ |
| `reorderEntry()` — non-mutating, priority recalculation, boundary/OOB safety | ✅ |
| `exportQueueBriefAsJSON()` — round-trips, includes stats | ✅ |
| Duplicate enqueue produces distinct `queueId` values | ✅ |
| "Enqueue Selected" replaces broken "Generate Selected" | ✅ |
| Queue list section below card grid | ✅ |
| Priority ordinals displayed and updated on reorder | ✅ |
| ▲/▼ disabled at boundaries | ✅ |
| ✕ remove updates count badge | ✅ |
| Clear Queue skips generating entries | ✅ |
| Export Queue Briefs downloads JSON | ✅ |
| Queue state is panel-local (no server, no persistence) | ✅ |
| `onGenerateSelected` prop preserved for future wiring | ✅ |
| All existing catalog functionality unchanged | ✅ |
| Zero protected contracts touched | ✅ |
| Build: 55 modules, exit 0 | ✅ |
| Lint: 0 errors | ✅ |
| Smoke test: 148/148 | ✅ |
| Browser verification: 12/12 PASS | ✅ |

---

## Future Work (Not In Scope)

- **ARCHON-006D:** Register the 12 VFX catalog slots in `INITIAL_ASSETS` (or a dedicated VFX manifest) so real generation can be wired to the queue
- **ARCHON-006E+:** Persist queue state across refresh (would require extending `WorkshopUIState` — needs freeze-list acknowledgment)
- **ARCHON-006F+:** Wire queue entries to actual generation calls; update `status` from `queued` → `generating` → `done`/`failed`

---
