# Walkthrough — ARCHON-006C: Batch VFX Generation Queue Foundation

**Repo:** `archon-workshop`
**Date:** 2026-04-28 / Lifecycle patch: 2026-04-28
**Status:** Complete (lifecycle patch accepted)

---

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `src/lib/vfxQueue.ts` | **NEW → MODIFIED** | Pure VFX queue data model + lifecycle helpers |
| `src/features/vfx/VFXWorkflowPanel.tsx` | **MODIFIED** | Queue state, Enqueue/Cancel/Retry/Clear Finished UI |
| `src/index.css` | **MODIFIED** | Additive CSS — queue section + lifecycle badges/buttons |
| `scripts/smoke-test-archon-006c.mjs` | **NEW → MODIFIED** | 221-assertion smoke test (14 sections) |
| `docs/walkthrough-archon-006c.md` | **NEW → MODIFIED** | This document |

**Not modified (protected):**
- `server.ts` — frozen
- `src/lib/assetManifest.ts` — frozen
- `src/lib/versionGuard.ts` — frozen
- `src/lib/workshopPersistence.ts` — frozen
- `src/App.tsx` — no change; `handleGenerateSelected` prop kept
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
All helpers are **non-mutating** — every function returns a new array or object; inputs are never modified.

**Status lifecycle:**
```
queued ──cancel──▶ cancelled ──retry──▶ queued
queued ──(future)──▶ generating ──▶ completed | failed
failed  ──retry──▶ queued
completed / cancelled / failed ──clearTerminalEntries──▶ (removed)
```

**Types exported:**

```ts
type VFXQueueStatus = 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';
const TERMINAL_STATUSES: VFXQueueStatus[] = ['completed', 'failed', 'cancelled'];

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
  retryCount:   number;        // incremented by retryQueueEntry()
  enqueuedAt:   string;        // ISO timestamp
  startedAt?:   string;        // set by generation wiring (ARCHON-006D+)
  completedAt?: string;        // set by cancel / generation completion
  errorMessage?: string;       // set by failed status
  priority:     number;        // ordinal — lower = higher priority
}

interface VFXQueueStats {
  queued: number; generating: number; completed: number; failed: number; cancelled: number; total: number;
}
```

**All helpers exported:**

| Function | Purpose |
|---|---|
| `generateQueueId()` | Collision-resistant ID, no crypto dep, `vfxq-<ts36>-<rnd>` format |
| `buildQueueEntry(preset, priority)` | Snapshot-builds a `VFXQueueEntry` from a `VFXPreset`; `retryCount: 0` |
| `cancelQueueEntry(entries, queueId)` | Transitions `queued` → `cancelled`; no-op on other statuses |
| `retryQueueEntry(entries, queueId)` | Transitions `cancelled` or `failed` → `queued`; increments `retryCount`; clears `errorMessage`/`completedAt` |
| `clearTerminalEntries(entries)` | Removes `completed`, `failed`, `cancelled` entries; recalculates priorities |
| `getQueueStats(entries)` | Counts entries by all 5 statuses + total |
| `filterQueueByStatus(entries, status)` | Filters by status; `null` = return all |
| `reorderEntry(entries, from, to)` | Non-mutating reorder with priority recalculation |
| `exportQueueBriefAsJSON(entries)` | Serialises queue to JSON brief package (`queue_version: 2`) |

---

### `src/features/vfx/VFXWorkflowPanel.tsx` — Queue Integration

**Queue state (panel-local, session-scoped):**

```ts
const [vfxQueue, setVfxQueue] = useState<VFXQueueEntry[]>([]);
```

**"Enqueue Selected"** replaces the broken "Generate Selected" button. The old button was calling `handleGenerateSelected()` which silently returned `null` for all VFX catalog IDs.

**`onGenerateSelected` prop:** kept in the component interface for future wiring (ARCHON-006D+).

**Queue section controls:**

| Control | Availability | Action |
|---|---|---|
| **Enqueue Selected** | When presets selected | Builds entries, appends to queue |
| **Cancel** (per row) | When `status === 'queued'` | Transitions to `cancelled` |
| **Retry** (per row) | When `status === 'cancelled'` or `'failed'` | Transitions back to `queued`; increments retryCount |
| **✕ Remove** (per row) | When `status !== 'generating'` | Hard-removes from queue |
| **▲/▼** (per row) | Disabled at boundaries | Reorders with priority recalculation |
| **Export Queue Briefs** | When queue non-empty | Downloads full JSON brief package |
| **Clear Finished** | When any `completed`/`failed`/`cancelled` entries exist | Removes terminal entries; leaves queued/generating |

**Staging disclaimer:** shown in empty-state and non-empty queue header — explicitly states this queue does not trigger real generation.

**All existing functionality preserved unchanged:**
- Filter bar, card grid, intensity pip strip, detail drawer, Copy Brief, Export Catalog JSON, Approve/Reject

---

### `src/index.css` — Additive CSS

~255 lines appended total (including lifecycle patch). All new classes prefixed `.vfx-queue-*`, `.btn-icon*`, `.btn-action-*`, `.btn-danger-sm`. No existing classes modified.

---

## Commands Run

```powershell
# Initial foundation
npm run lint    # tsc --noEmit → 0 errors
npm run build   # vite build → ✓ 55 modules, exit 0
node --import=tsx/esm scripts/smoke-test-archon-006c.mjs
# → 148 passed, 0 failed

# Lifecycle patch
npm run lint    # 0 errors
npm run build   # ✓ 55 modules, exit 0
node --import=tsx/esm scripts/smoke-test-archon-006c.mjs
# → 221 passed, 0 failed
```

---

## Smoke Test Results (Lifecycle Patch)

```
S1:   generateQueueId               —  4 assertions  ✅
S2:   buildQueueEntry (1 preset)    — 18 assertions  ✅
S3:   buildQueueEntry (all 12)      — 96 assertions  ✅
S4:   Duplicate enqueue uniqueness  —  4 assertions  ✅
S5:   TERMINAL_STATUSES constant    —  6 assertions  ✅
S6:   cancelQueueEntry              —  8 assertions  ✅
S7:   retryQueueEntry               — 12 assertions  ✅
S8:   clearTerminalEntries          —  8 assertions  ✅
S9:   getQueueStats                 — 10 assertions  ✅
S10:  filterQueueByStatus           —  7 assertions  ✅
S11:  reorderEntry                  —  8 assertions  ✅
S12:  exportQueueBriefAsJSON        — 19 assertions  ✅
S13:  promptBrief snapshot          —  3 assertions  ✅
S14:  Full lifecycle round-trip     — 18 assertions  ✅

ARCHON-006C smoke test complete — 221 passed, 0 failed ✅
```

---

## Browser Verification Results

### Foundation Pass (2026-04-28)

| Step | Check | Result |
|---|---|---|
| 1–2 | Page loads; VFX tab navigates | ✅ |
| 3 | "Enqueue Selected (0)" button present; old "Generate Selected" gone | ✅ |
| 4 | Queue section shows empty-state message | ✅ |
| 5 | Enqueue 3 → toast + selection cleared | ✅ |
| 6 | 3 queue rows with priority/meta/badge/controls | ✅ |
| 7 | ▲ Move Up reorders entries | ✅ |
| 8 | ✕ Remove → queue count updates | ✅ |
| 9 | Export Queue Briefs → download + toast | ✅ |
| 10 | Clear Queue → empty state | ✅ |
| 11–12 | Filter + Export tab regression PASS | ✅ |

### Lifecycle Patch Pass (2026-04-28)

| Step | Check | Result |
|---|---|---|
| 1–2 | Hard-reload; VFX tab loads | ✅ |
| 3 | 3 entries enqueued; each shows "queued" badge + Cancel button; no Retry visible | ✅ |
| 4 | Cancel entry 1 → badge changes to "CANCELLED"; Retry appears; stat chip "🚫 1 cancelled" | ✅ |
| 5 | Retry → badge shows "QUEUED (RETRY 1)"; Cancel returns; stat chip clears | ✅ |
| 6 | Cancel entry again | ✅ |
| 7 | "Clear Finished" enabled; click → cancelled entry removed; queued entries remain | ✅ |
| 8 | Export Queue Briefs → toast + download | ✅ |
| 9 | Staging disclaimer visible (⚠️ This is a staging queue…) | ✅ |
| 10 | Projectile filter → 2 cards; drawer opens correctly | ✅ |
| 11 | Button reads "Enqueue Selected" not "Generate Selected"; no console errors | ✅ |

---

## Acceptance Criteria (Final)

| Criterion | Status |
|---|---|
| Pure `vfxQueue.ts` module — no I/O, no React | ✅ |
| All helpers non-mutating | ✅ |
| `VFXQueueStatus` covers queued/generating/completed/failed/cancelled | ✅ |
| `TERMINAL_STATUSES` constant | ✅ |
| `retryCount` field in `VFXQueueEntry` | ✅ |
| `cancelQueueEntry()` — queued→cancelled; no-op on others; no mutation | ✅ |
| `retryQueueEntry()` — cancelled/failed→queued; increments retryCount; no mutation | ✅ |
| `clearTerminalEntries()` — removes completed/failed/cancelled; leaves queued/generating | ✅ |
| `getQueueStats()` counts all 5 statuses | ✅ |
| `buildQueueEntry()` snapshots all preset fields | ✅ |
| `filterQueueByStatus()` — null/match/empty | ✅ |
| `reorderEntry()` — non-mutating, priority recalc, OOB safety | ✅ |
| `exportQueueBriefAsJSON()` — round-trips, includes cancelled/completed stats, retryCount | ✅ |
| Cancel button visible on queued rows; transitions to cancelled | ✅ |
| Retry button visible on cancelled/failed rows; transitions back to queued | ✅ |
| Retry badge shows "(retry N)" when retryCount > 0 | ✅ |
| Clear Finished removes only terminal entries | ✅ |
| Clear Finished disabled when no terminal entries | ✅ |
| Stat chips show cancelled count | ✅ |
| Staging disclaimer displayed | ✅ |
| "Enqueue Selected" replaces broken "Generate Selected" | ✅ |
| onGenerateSelected prop preserved for future wiring | ✅ |
| All existing catalog functionality unchanged | ✅ |
| Zero protected contracts touched | ✅ |
| Lint: 0 errors | ✅ |
| Build: 55 modules, exit 0 | ✅ |
| Smoke test: 221/221 | ✅ |
| Browser lifecycle verification: 11/11 PASS | ✅ |
| Walkthrough has no local screenshot paths | ✅ |

---

## Future Work (Not In Scope)

- **ARCHON-006D:** Register the 12 VFX catalog slots in `INITIAL_ASSETS` (or a dedicated VFX manifest) so real generation can be wired to the queue
- **ARCHON-006E+:** Persist queue state across refresh (would require extending `WorkshopUIState` — needs freeze-list acknowledgment)
- **ARCHON-006F+:** Wire queue entries to actual generation calls; update `status` from `queued` → `generating` → `completed`/`failed`

---
