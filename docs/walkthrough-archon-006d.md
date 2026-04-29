# ARCHON-006D Walkthrough — VFX Asset Generation Integration (First Bounded Slice)

## Summary

Implemented the first bounded slice of VFX generation integration by aligning VFX catalog preset `asset_slot` IDs with the generation-ready asset manifest and wiring the ARCHON-006C VFX queue to the existing server-side generation pipeline. Generation attempts are now honest and real — queue status only advances to `completed` when the existing `handleGenerate` path returns actual success, and transitions to `failed` with the real error message on failure.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/assetManifest.ts` | Added 10 missing VFX catalog slot records to `INITIAL_ASSETS` (additive only) |
| `src/lib/promptTemplates.ts` | Added VFX catalog `prompt_brief` override in `getPromptForAsset` |
| `src/lib/vfxQueue.ts` | Implemented `markEntryGenerating`, `markEntryCompleted`, `markEntryFailed` helpers |
| `src/features/vfx/VFXWorkflowPanel.tsx` | Wired "Generate Queued" button with honest generation loop |
| `src/App.tsx` | Fixed `handleGenerateSelected` bug — now captures and applies generation results |
| `scripts/smoke-test-archon-006d.mjs` | New smoke test covering helpers and slot alignment |
| `docs/walkthrough-archon-006d.md` | This file |

## Test Files Modified

None — no existing smoke tests were modified. One new smoke test was added: `scripts/smoke-test-archon-006d.mjs`.

---

## Key Design Decisions

### 1. Asset Slot Alignment (Additive Only)

The 10 VFX catalog `asset_slot` IDs that were missing from `INITIAL_ASSETS` were added as new pending records using the existing `Asset` shape. No existing IDs were renamed, deleted, or modified. No `CombatPackManifest`, schema version, or export behavior was changed.

The 10 added slots were exactly those reported missing by the smoke test:
```
combat-hit-flash-light, combat-hit-flash-dark,
combat-death-burst-light, combat-death-burst-dark,
combat-heal-pulse, combat-status-poison,
combat-status-stun, combat-ambient-arena,
combat-projectile-light, combat-projectile-dark
```

### 2. Prompt Injection

`getPromptForAsset` now checks the asset ID against `VFX_CATALOG` first. If a match is found, it returns the preset's `prompt_brief` directly — ensuring the generation prompt uses the exact Style Bible content defined in the catalog. All other assets fall through unchanged.

### 3. Pure Status Transition Helpers

Three new deterministic helpers in `vfxQueue.ts`:
- `markEntryGenerating(queue, queueId)` — only transitions `queued → generating`
- `markEntryCompleted(queue, queueId)` — sets `status: 'completed'`, clears `errorMessage`, records `completedAt`
- `markEntryFailed(queue, queueId, error)` — sets `status: 'failed'`, records `errorMessage`

All return new arrays without mutating input.

### 4. Honest Generation Wiring

`handleGenerateQueued` in `VFXWorkflowPanel.tsx`:
1. Skips entries that were cancelled before/during the loop
2. Calls `markEntryGenerating` to visibly transition state
3. Awaits `onGenerateSelected` which delegates to the real `handleGenerate` path
4. Calls `markEntryCompleted` **only** if `result.ok === true`
5. Calls `markEntryFailed` with the real error string on any failure or exception

No fake successes. No premature `completed` transitions.

### 5. Bug Fix: `handleGenerateSelected` in App.tsx

The original implementation discarded the `GenerationResult` from `handleGenerate`, leaving assets permanently stuck as `status: 'generating'` and never persisting the manifest. The fix:
- Returns `GenerationAttemptResult[]` to callers
- Applies `setAssets` with the update payload from each successful result
- Calls `saveManifest` per successful result
- Updates assets to `failed` state on failure (including persisting `error_log`)

---

## Verification Receipts

### 1. Strict TDD: Smoke Test — Phase 1 (Failing)
```
Command: node --import=tsx/esm scripts/smoke-test-archon-006d.mjs
Exit code: 1

S1: Queue Generation Transition Helpers
  ❌ Helpers exist and execute without throwing: vfxQueue.markEntryGenerating is not a function

S2: Slot Alignment Validation
  ❌ All VFX catalog asset slots exist in INITIAL_ASSETS: Missing: combat-hit-flash-light, ...

ARCHON-006D smoke test complete — 9 passed, 2 failed
```

### 2. Smoke Tests — Post-Implementation (All Passing)
```
Command: node --import=tsx/esm scripts/smoke-test-archon-006d.mjs
Exit code: 0

ARCHON-006D smoke test complete — 11 passed, 0 failed
```

```
Command: node --import=tsx/esm scripts/smoke-test-archon-006c.mjs
Exit code: 0
(All lifecycle helper tests pass)
```

```
Command: node --import=tsx/esm scripts/smoke-test-archon-006b.mjs
Exit code: 0

ARCHON-006B smoke test complete — 267 passed, 0 failed
```

### 3. Lint
```
Command: npm.cmd run lint (tsc --noEmit)
Exit code: 0
No type errors.
```

### 4. Build
```
Command: npm.cmd run build
Exit code: 0

vite v6.4.1 building for production...
✓ 55 modules transformed.
dist/assets/index-CNa0p1qH.css   15.25 kB
dist/assets/index-DAZ-yrpx.js   706.12 kB
✓ built in 6.36s
```

### 5. Browser Verification — Real Generation Click
**Verdict: PASS**

Recording: `vfx_generate_queued_live_*.webp` (captured by browser subagent)

#### Observed UI flow:

**Initial state:** VFX panel loaded with 12 preset cards, queue empty.

**Enqueue:** Selected "Hit Flash — Light" (`combat-hit-flash-light`), clicked Enqueue Selected. Queue showed 1 entry, status badge: `queued`.

**Generate Queued clicked (live path):**
- Entry immediately transitioned to `generating` (status dot turned yellow)
- API call dispatched via the existing `handleGenerate` → Gemini image generation path
- **Result: `COMPLETED`** — the API key is present and generation succeeded. The entry's badge changed to `COMPLETED` (green). The asset thumbnail appeared on the preset card in the grid.

**Screenshot evidence (second screenshot captured post-generation):**
```
Queue header:  VFX Generation Queue (3)
               ✅ 1 completed   ❌ 1 failed   🚫 1 cancelled
Entry 1:  Hit Flash — Light    hit · light · intensity 3/5    COMPLETED
Entry 2:  Spawn Effect — Dark  spawn · dark · intensity 3/5   CANCELLED
Entry 3:  Projectile — Dark    projectile · dark · intensity 3/5   FAILED → Retry
```

**Cancelled entry did not run:** "Spawn Effect — Dark" was cancelled before Generate Queued clicked. It remained `CANCELLED` throughout. The `CANCELLED` badge and Retry button were visible.

**Failed entry:** "Projectile — Dark" shows `FAILED` badge with Retry button — an honest failure state (second queue run, different conditions).

**Retry confirmed:** Clicking Retry on the failed "Projectile — Dark" entry returned it to `queued (retry 1)` status with Cancel button visible (third screenshot shows badge: `QUEUED (RETRY 1)`).

**Export Queue Briefs:** Confirmed button triggers download.

**Export tab:** Navigated to Export tab — controls intact, no regressions.

**No fake completion:** The `COMPLETED` status only appeared after the server confirmed successful image generation and save. The `FAILED` entry shows the honest backend error. No entry was marked completed without real success.

---

## Scope Boundaries Respected

- ✅ `server.ts` not touched
- ✅ `CombatPackManifest` not touched
- ✅ `COMBAT_PACK_SCHEMA_VERSION` not touched
- ✅ ZIP export/import behavior not changed
- ✅ `archon-game` not touched
- ✅ No new dependencies added
- ✅ No fake generated assets
- ✅ No background workers or orchestration added
- ✅ No providers or Gemini behavior changed
