# Walkthrough — ARCHON-006B: Combat VFX Pipeline Foundation

**Repo:** `archon-workshop`
**Date:** 2026-04-28
**Status:** Complete

---

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `src/lib/vfxCatalog.ts` | **NEW** | Typed VFX preset schema + 10 combat slice entries + helpers |
| `src/features/vfx/VFXWorkflowPanel.tsx` | **MODIFIED** | Consumes catalog; filter bar; detail drawer; Export Catalog JSON button |
| `src/index.css` | **MODIFIED** | Additive CSS for filter bar, chips, drawer, pips, tags, brief block |
| `scripts/smoke-test-archon-006b.mjs` | **NEW** | 223-assertion smoke test |
| `docs/walkthrough-archon-006b.md` | **NEW** | This document |

**Not modified (protected):**
- `server.ts`
- `src/lib/assetManifest.ts` — frozen
- `src/lib/versionGuard.ts` — frozen
- `src/lib/workshopPersistence.ts` — frozen
- `src/App.tsx` — no changes needed
- `src/features/export/ExportPanel.tsx`
- `src/features/scenelab/SceneLabPanel.tsx`
- `src/lib/promptTemplates.ts`
- `src/lib/expansionAssets.ts`
- `archon-game` — not touched

---

## What Was Built

### `src/lib/vfxCatalog.ts` — VFX Preset Catalog

Single source of truth for all Combat VFX metadata. Pure TypeScript — no React, no I/O.

**Types exported:**

```ts
type VFXFamily   = "hit" | "projectile" | "beam" | "barrier" | "nova" | "status" | "spawn" | "death";
type VFXFaction  = "light" | "dark" | "neutral";
type VFXLayering = "front" | "mid" | "back" | "overlay";
type VFXIntensity = 1 | 2 | 3 | 4 | 5;

interface VFXPreset {
  id: string;
  name: string;
  family: VFXFamily;
  faction: VFXFaction;
  description: string;
  use_case: string;
  asset_slot: string;        // links to the Asset.id that will be generated/approved
  prompt_brief: string;      // Style-Bible-aligned generation prompt
  negative_prompt?: string;
  visual_tags: string[];
  timing_ms: number;         // 0 = looping
  intensity: VFXIntensity;
  layering: VFXLayering;
  approved_for_generation: boolean;
}
```

**10 catalog entries** (full combat slice):

| Preset | Family | Faction | Intensity | Timing |
|---|---|---|---|---|
| Hit Flash — Light | hit | light | 3 | 150ms |
| Hit Flash — Dark | hit | dark | 3 | 150ms |
| Death Burst — Light | death | light | 5 | 600ms |
| Death Burst — Dark | death | dark | 5 | 600ms |
| Spawn Effect — Light | spawn | light | 3 | 400ms |
| Spawn Effect — Dark | spawn | dark | 3 | 400ms |
| Heal Pulse | nova | neutral | 2 | 500ms |
| Status — Poison | status | dark | 2 | 1200ms |
| Status — Stun | status | neutral | 2 | 1200ms |
| Ambient Arena Effect | nova | neutral | 1 | looping |

**Helpers exported:**

- `buildGenerationBrief(preset)` — formats a copyable plain-text brief including all metadata fields, prompt, negative prompt, and tags
- `exportCatalogAsJSON()` — serialises full catalog to formatted JSON string (caller triggers download)
- `filterCatalog({ family, faction })` — filters catalog by one or both axes; `null` = no filter

**`COMBAT_SLICE_VFX_IDS` moved here** from `VFXWorkflowPanel.tsx` and re-exported from the panel for backward compatibility.

---

### `VFXWorkflowPanel.tsx` — Upgraded Panel

#### New: Filter bar
Family chips (hit / projectile / beam / barrier / nova / status / spawn / death) and faction chips (light / dark / neutral). Multi-toggle — clicking the active chip clears that filter. "All" button resets. Faction chips use faction-colour accent when active.

#### New: Detail drawer
Clicking "▼ Brief" on any card opens an inline expansion panel below it showing:
- Asset Slot (monospaced), Use Case, Timing, Layering, Intensity
- Visual Tags (pill badges)
- Prompt Brief (scrollable, monospaced)
- Negative Prompt (red tint)
- **Copy Brief** button — copies `buildGenerationBrief()` output to clipboard

#### New: Export Catalog JSON button
"Export Catalog JSON" in the toolbar downloads `vfx-catalog-<timestamp>.json` containing the full 10-entry catalog with metadata.

#### New: Intensity pips
Each card shows 5 small horizontal bars (lit = filled gold) indicating intensity 1–5.

#### Preserved:
- All existing props and their signatures unchanged
- Select All / Clear / Generate Selected behaviour unchanged
- Approve / Reject buttons unchanged
- Status dot and thumbnail unchanged

---

## `COMBAT_SLICE_VFX_IDS` Migration

| Before | After |
|---|---|
| Defined in `VFXWorkflowPanel.tsx` | Defined in `vfxCatalog.ts` |
| Imported by `SceneLabPanel.tsx` from `VFXWorkflowPanel` | Still importable from `VFXWorkflowPanel` (re-export) |

No import sites broken. Zero changes to `SceneLabPanel.tsx`.

---

## Commands Run

```powershell
npm run lint     # tsc --noEmit → 0 errors
npm run build    # vite build → ✓ 54 modules, exit 0 (was 53 before)
node --import=tsx/esm scripts/smoke-test-archon-006b.mjs
# → 223 passed, 0 failed
```

---

## Smoke Test Results

```
S1:  Catalog structure             — 4 assertions  ✅
S2:  COMBAT_SLICE_VFX_IDS coverage — 11 assertions ✅
S3:  Required fields               — 60 assertions ✅
S4:  Enum fields valid             — 40 assertions ✅
S5:  visual_tags structure         — 20 assertions ✅
S6:  timing_ms                     — 10 assertions ✅
S7:  VFX_FAMILIES and VFX_FACTIONS — 13 assertions ✅
S8:  buildGenerationBrief          — 50 assertions ✅
S9:  exportCatalogAsJSON           — 7 assertions  ✅
S10: filterCatalog                 — 8 assertions  ✅

ARCHON-006B smoke test complete — 223 passed, 0 failed ✅
```

---

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Typed `VFXPreset` schema created | ✅ |
| All 8 VFXFamily values defined | ✅ |
| All 3 VFXFaction values defined | ✅ |
| 10 combat slice presets with full metadata | ✅ |
| Each preset has a Style-Bible-aligned `prompt_brief` | ✅ |
| Each preset has `negative_prompt`, `visual_tags`, `timing_ms`, `intensity`, `layering` | ✅ |
| `buildGenerationBrief()` output contains all key fields | ✅ |
| `exportCatalogAsJSON()` round-trips through JSON.parse | ✅ |
| `filterCatalog()` filters correctly by family and faction | ✅ |
| `COMBAT_SLICE_VFX_IDS` migrated to catalog (backward compat re-export preserved) | ✅ |
| VFX panel filter bar — family chips | ✅ |
| VFX panel filter bar — faction chips with faction colours | ✅ |
| VFX card inline detail drawer | ✅ |
| Copy Brief button | ✅ |
| Intensity pip visual indicator | ✅ |
| Export Catalog JSON button | ✅ |
| All existing props/approve/reject/generate behaviour preserved | ✅ |
| Zero changes to protected contracts | ✅ |
| Build passes: 54 modules, exit 0 | ✅ |
| Lint passes: 0 errors | ✅ |
| Smoke test: 223/223 | ✅ |

---

## Recommended Next Task

**ARCHON-007 — VFX Scene Preview Integration:** Use the persisted `sceneLabPreset` (from ARCHON-006A) to drive the Scene Lab canvas selection, and wire the VFX catalog presets into the Scene Lab VFX checklist so that `scene_lab.review_notes` keys correspond directly to `VFXPreset.asset_slot` values — making the review flow type-safe end-to-end.
