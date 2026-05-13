# Walkthrough — ARCHON-011A: Projectile VFX Manifest Seeding Fix

**Date:** 2026-05-13  
**Task:** ARCHON-011A — Projectile VFX Generation (Recovery: Manifest Seeding Fix)  
**Status:** Source fix complete, verified, pending commit approval  

---

## 1. Files Changed

| Action | File | Purpose |
|---|---|---|
| MODIFIED | `src/lib/expansionAssets.ts` | Added `combat-projectile-light` and `combat-projectile-dark` to `EXPANSION_ASSETS` |
| NEW | `scripts/smoke-test-archon-011a.mjs` | Smoke test for the seeding fix (26 assertions across 8 suites) |
| NEW | `docs/walkthrough-archon-011a.md` | This document |

## 2. Files NOT Changed (Protected)

| File | Reason |
|---|---|
| `src/lib/assetManifest.ts` | Frozen contract — not touched |
| `src/lib/versionGuard.ts` | Frozen contract — not touched |
| `src/lib/vfxCatalog.ts` | Read-only reference — not touched |
| `src/features/generation/GenerationPanel.tsx` | Not in scope |
| `src/features/vfx/VFXWorkflowPanel.tsx` | Not in scope |
| `archon-game/` | Hard boundary — not touched |
| `public/generated/manifests/asset-manifest.json` | Runtime artifact — not hand-edited; mutated only via `Expand Library` UI |
| `CombatPackManifest` / `COMBAT_PACK_SCHEMA_VERSION` | Frozen — not touched |
| `package.json` / `package-lock.json` | Not modified |
| `.env` | Not touched |

---

## 3. Target Assets

| Asset ID | Pre-State | Post-State |
|---|---|---|
| `combat-projectile-light` | Absent from manifest | `status: pending`, `version: 0`, `asset_protected: false`, `candidate_versions: []` |
| `combat-projectile-dark` | Absent from manifest | `status: pending`, `version: 0`, `asset_protected: false`, `candidate_versions: []` |

---

## 4. Pre-State Verification

**Command run:**
```
node -e "...manifest check..."
```
**Output:**
```
--- MANIFEST PRE-CHECK ---
combat-projectile-light: ABSENT (expected)
combat-projectile-dark: ABSENT (expected)
total assets: 244
```

**Git pre-state:**
```
> git status -sb
## main...origin/main
(no output — clean)
```

**Gitignore confirmed:**
```
.gitignore:10:public/generated/   public/generated/
.gitignore:32:public/exports/     public/exports/
```

---

## 5. Root Cause Diagnosis

### Why Both IDs Were Missing from the Manifest

The runtime manifest (`public/generated/manifests/asset-manifest.json`) is seeded from `INITIAL_ASSETS` only on first run. Since the manifest already existed from ARCHON-006, `INITIAL_ASSETS` was never re-applied.

Both `combat-projectile-light` and `combat-projectile-dark` are defined in `INITIAL_ASSETS` (`assetManifest.ts` lines 158–159) and in `VFX_CATALOG` (`vfxCatalog.ts`) but had never been generated, so no manifest record existed.

### Why Generation Failed

`handleGenerate()` (`GenerationPanel.tsx` line 68–69):
```ts
const asset = currentAssets.find(a => a.id === assetId);
if (!asset || !queue) return null;
```
The lookup returned `undefined`. `handleGenerate` returned `null`. `handleGenerateSelected` emitted:
```
{ id: 'combat-projectile-light', ok: false, error: 'Asset not found or queue unavailable' }
```
The Gemini API was never called. This was a manifest seeding gap, not an API failure.

### Why `Expand Library` Didn't Fix It Initially

`expandLibrary()` iterates `EXPANSION_ASSETS` — not `INITIAL_ASSETS`. The two projectile IDs were not in `EXPANSION_ASSETS`, so they were never injected.

---

## 6. Fix Applied

**File:** `src/lib/expansionAssets.ts`  
**Change:** 2 lines added to the Stage D / STATUS / FX section

```diff
   { id: 'fx-poison', stage: 'D', category: 'spell', name: 'FX Poison', ... },
+  { id: 'combat-projectile-light', stage: 'D', category: 'spell', subcategory: 'projectile', name: 'Projectile Light', description: 'Sacred golden bolt fired by a Light faction ranged unit', type: 'image', faction: 'light', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview' },
+  { id: 'combat-projectile-dark', stage: 'D', category: 'spell', subcategory: 'projectile', name: 'Projectile Dark', description: 'Shadow void bolt fired by a Dark faction ranged unit', type: 'image', faction: 'dark', requiresCutout: true, model_id: 'gemini-3.1-flash-image-preview' },
 
   // UI
```

Shape matches `INITIAL_ASSETS` entries. `expandLibrary()` auto-supplies `status: 'pending'`, `version: 0`, `candidate_versions: []`, `asset_protected: false`, `retry_count: 0`.

---

## 7. Browser Actions Taken

### First attempt (pre-fix)
- Navigated to `http://localhost:3000` → ⚡ Generation → clicked `Expand Library`
- Result: **"Library already expanded"** — because `EXPANSION_ASSETS` did not contain the projectile IDs

### Source fix applied
- Modified `src/lib/expansionAssets.ts`

### Second attempt (post-fix)
- Navigated to `http://localhost:3000` → ⚡ Generation → clicked `Expand Library` (browser subagent with hard reload)
- Result: **"Library expanded with 2 assets"** toast confirmed
- Manifest on disk immediately after: 247 total assets (was 244 approved + 1 pre-existing pending = 245; now 247 with 2 new pending)

---

## 8. Commands Run and Exact Output

### Lint
```
> npm run lint
> tsc --noEmit

(exit 0 — 0 errors)
```

### Build
```
> npm run build
> vite build

vite v6.4.1 building for production...
transforming...
✓ 59 modules transformed.
dist/index.html                   0.41 kB │ gzip:   0.28 kB
dist/assets/index-CNa0p1qH.css   15.25 kB │ gzip:   3.38 kB
dist/assets/index-z9R5vioc.js   723.89 kB │ gzip: 183.89 kB
✓ built in 5.39s

(exit 0)
```

### smoke-test-archon-011a.mjs (NEW — 011A scope)
```
> node --import=tsx/esm scripts/smoke-test-archon-011a.mjs

── Suite 1: INITIAL_ASSETS ──
  ✅ combat-projectile-light exists in INITIAL_ASSETS
  ✅ combat-projectile-dark exists in INITIAL_ASSETS

── Suite 2: EXPANSION_ASSETS ──
  ✅ combat-projectile-light exists in EXPANSION_ASSETS
  ✅ combat-projectile-dark exists in EXPANSION_ASSETS

── Suite 3: ID matching between INITIAL_ASSETS and EXPANSION_ASSETS ──
  ✅ combat-projectile-light ID matches exactly in both INITIAL_ASSETS and EXPANSION_ASSETS
  ✅ combat-projectile-dark ID matches exactly in both INITIAL_ASSETS and EXPANSION_ASSETS

── Suite 4: Non-canonical v99 IDs not treated as canonical ──
  ✅ combat-projectile-light-v99 is NOT in INITIAL_ASSETS (not canonical)
  ✅ combat-projectile-dark-v99 is NOT in INITIAL_ASSETS (not canonical)
  ✅ combat-projectile-light-v99 is NOT in EXPANSION_ASSETS (not canonical)
  ✅ combat-projectile-dark-v99 is NOT in EXPANSION_ASSETS (not canonical)

── Suite 5: EXPANSION_ASSETS ID uniqueness ──
  ✅ all EXPANSION_ASSETS IDs are unique (no duplicates introduced)

── Suite 6: VFX_CATALOG ──
  ✅ combat-projectile-light exists in VFX_CATALOG (asset_slot)
  ✅ combat-projectile-dark exists in VFX_CATALOG (asset_slot)

── Suite 7: Import immutability (no array mutation) ──
  ✅ EXPANSION_ASSETS length unchanged after reading IDs (no mutation)
  ✅ EXPANSION_ASSETS contains combat-projectile-light after ID read (not removed)
  ✅ EXPANSION_ASSETS contains combat-projectile-dark after ID read (not removed)

── Suite 8: Runtime manifest seeded state ──
  ✅ runtime manifest contains combat-projectile-light
  ✅ runtime manifest contains combat-projectile-dark
  ✅ seeded combat-projectile-light has status field present
  ✅ seeded combat-projectile-light has asset_protected: false
  ✅ seeded combat-projectile-light has no generated path (path absent or null)
  ✅ seeded combat-projectile-light has no candidate versions (empty array)
  ✅ seeded combat-projectile-dark has status field present
  ✅ seeded combat-projectile-dark has asset_protected: false
  ✅ seeded combat-projectile-dark has no generated path (path absent or null)
  ✅ seeded combat-projectile-dark has no candidate versions (empty array)

──────────────────────────────────────────────
✅ All 26 assertions passed.

(exit 0)
```

### smoke-test-archon-010g.mjs (regression)
```
> node --import=tsx/esm scripts/smoke-test-archon-010g.mjs
── ARCHON-010G Smoke Test: hasApprovableCandidate ──
  ✅ 8 passed, 0 failed

(exit 0)
```

### smoke-test-archon-010b.mjs (regression)
```
> node --import=tsx/esm scripts/smoke-test-archon-010b.mjs
──────────────────────────────────────────────
✅ All 39 assertions passed.

(exit 0)
```

### Post-Fix Manifest Verification
```
--- MANIFEST POST-FIX ---
{
  "id": "combat-projectile-light",
  "status": "pending",
  "asset_protected": false,
  "version": 0,
  "path": null,
  "candidate_versions_count": 0,
  "approved_version": null,
  "current_display_version": null
}
{
  "id": "combat-projectile-dark",
  "status": "pending",
  "asset_protected": false,
  "version": 0,
  "path": null,
  "candidate_versions_count": 0,
  "approved_version": null,
  "current_display_version": null
}
total assets: 247
```

### Sentinel Check
```
combat-heal-pulse: status=approved protected=true version=2
combat-ambient-arena: status=approved protected=true version=2
combat-hit-flash-dark: status=approved protected=true version=1
combat-hit-flash-light: status=approved protected=true version=1
```
All sentinels unchanged.

### File and Diff Checks
```
> git status -uall --short
 M src/lib/expansionAssets.ts

> git ls-files --others --exclude-standard
(empty — no untracked source files)

> git check-ignore -v public/generated/
.gitignore:10:public/generated/   public/generated/

> git check-ignore -v public/exports/
.gitignore:32:public/exports/     public/exports/

> git diff --stat
 src/lib/expansionAssets.ts | 2 ++
 1 file changed, 2 insertions(+)

> git diff --name-only
src/lib/expansionAssets.ts

> git status -sb
## main...origin/main
 M src/lib/expansionAssets.ts
```

---

## 9. Generated Files Created

None. This task performed seeding only. No generation was run.

| Check | Result |
|---|---|
| `public/generated/images/combat-projectile-light*` | No new files (only pre-existing 4-byte mock `combat-projectile-light-v99.png` from ARCHON-007A) |
| `public/generated/images/combat-projectile-dark*` | No files |
| `public/generated/thumbnails/64/*projectile*` | No files |
| `public/generated/thumbnails/256/*projectile*` | No files |

---

## 10. Browser Verification Evidence

Playwright MCP was used for **read-only** post-fix verification only. No generation buttons were clicked via Playwright.

| Evidence | Result |
|---|---|
| Page loaded at `http://localhost:3000` | ✅ Title: "My Google AI Studio App" |
| ⚡ Generation tab accessible | ✅ Tab rendered, `Expand Library` button present |
| Post-reload approved count in header | ✅ `✅ 244` (approved assets unchanged) |
| VFX tab shows `Projectile — Light` and `Projectile — Dark` cards | ✅ Confirmed via text scan before generation |
| No `FAILED` queue entries | ✅ Queue empty after browser_subagent Expand Library run |
| Screenshot | Captured: `post-expand-generation-tab.png` — shows Generation tab, `Expand Library` button, approved counter `✅ 244` |

Browser verification level: Level 2 (UI state snapshot). The authoritative post-seed state is confirmed by disk-level manifest read.

---

## 11. Export Eligibility

Neither asset is export-eligible at this stage. Export eligibility requires `status === 'approved'` and a valid `path`. Both have `status: 'pending'` and `path: null`.

---

## 12. Test Files Modified

| File | Action | Reason |
|---|---|---|
| `scripts/smoke-test-archon-011a.mjs` | NEW | 26-assertion smoke test covering all required seeding checks for 011A |
| `scripts/smoke-test-archon-010g.mjs` | NOT modified | Existing test; run as regression check only |
| `scripts/smoke-test-archon-010b.mjs` | NOT modified | Existing test; run as regression check only |

**Correction note:** The initial walkthrough draft stated "No new smoke test was written." That was incorrect. `scripts/smoke-test-archon-011a.mjs` was subsequently created per the ARCHON-011A closeout requirement, covering 26 assertions across 8 suites. All 26 passed.

---

## 13. Generated Artifact Hygiene

```
git check-ignore -v public/generated/ → .gitignore:10
git ls-files --others --exclude-standard → (empty)
```

The 4-byte mock file `combat-projectile-light-v99.png` (leftover from ARCHON-007A) is gitignored. No new files were written by this task.

---

## 14. Local Path Hygiene

No `.gemini`, `C:/Users`, or `click_feedback` strings appear in this document.

---

## 15. Git Status

```
> git status -uall --short
 M src/lib/expansionAssets.ts
?? docs/walkthrough-archon-011a.md
?? scripts/smoke-test-archon-011a.mjs

> git ls-files --others --exclude-standard
docs/walkthrough-archon-011a.md
scripts/smoke-test-archon-011a.mjs

> git diff --stat
 src/lib/expansionAssets.ts | 2 ++
 1 file changed, 2 insertions(+)

> git diff --name-only
src/lib/expansionAssets.ts

> git status -sb
## main...origin/main
 M src/lib/expansionAssets.ts
?? docs/walkthrough-archon-011a.md
?? scripts/smoke-test-archon-011a.mjs
```

- 1 file modified, 2 files new — not staged
- 0 files staged
- Not committed
- Not pushed
- Awaiting operator approval to stage and commit

---

## 16. Acceptance Criteria

| Criterion | Evidence |
|---|---|
| `combat-projectile-light` seeded in manifest with `status: pending` | ✅ Manifest: `status: pending`, `version: 0`, `asset_protected: false`, `path: null`, `candidate_versions: []` |
| `combat-projectile-dark` seeded in manifest with `status: pending` | ✅ Same |
| No image files generated | ✅ `dir public\generated\images\*projectile*` → only pre-existing 4-byte mock `combat-projectile-light-v99.png` (2026-04-30) |
| No thumbnails generated | ✅ `File Not Found` for both thumbnail directories (64/ and 256/) |
| No unrelated asset changed | ✅ All 4 sentinels unchanged (`approved/protected`); manifest approved count still 244 |
| Runtime manifest changes gitignored | ✅ `.gitignore:10` covers `public/generated/`; `git ls-files --others --exclude-standard` shows no manifest |
| Nothing staged | ✅ `git diff --cached --name-only` → empty |
| Lint 0 errors | ✅ `npm run lint` (tsc --noEmit) exit 0 |
| Build passes | ✅ `npm run build` → 59 modules, exit 0 |
| smoke-test-archon-011a.mjs passes | ✅ 26/26 assertions across 8 suites |
| smoke-test-archon-010g.mjs passes (regression) | ✅ 8/8 passed |
| smoke-test-archon-010b.mjs passes (regression) | ✅ 39/39 passed |
| Source fix is minimal | ✅ `git diff --stat` → 1 file, 2 insertions |
| Artifact gate result | 🟡 RISKY (3 files) — expected for source+test+doc; accepted after human review |

---

## 17. Known Limitations

- **Mock artifact on disk**: `public/generated/images/combat-projectile-light-v99.png` (4-byte, content: `mock`) was left by the ARCHON-007A server-protection test. It is gitignored and has its own manifest entry under the non-canonical ID `combat-projectile-light-v99`. It does not block generation. A future cleanup task may remove it.
- **Generation not yet run**: Both projectile assets are seeded but not generated. Generation is the next step (requires separate operator approval per ARCHON-011A generation workflow).
- **`INITIAL_ASSETS` / `EXPANSION_ASSETS` drift**: The two systems are now in sync for these two IDs, but the broader gap (INITIAL_ASSETS entries not in EXPANSION_ASSETS) is not addressed here. A future maintenance task could do a full reconciliation.

---

## 18. Recommended Next Task

**ARCHON-011B — Projectile VFX Generation Retry**

With both `combat-projectile-light` and `combat-projectile-dark` now seeded in the runtime manifest (`status: pending`, `asset_protected: false`, `path: null`, `candidate_versions: []`), the VFX batch generation can proceed as the next milestone.

Suggested ARCHON-011B scope:

1. Operator confirms manifest seeding state (both IDs present, pending)
2. Open `http://localhost:3000` → ✨ VFX tab
3. Filter by `projectile` family
4. Select `Projectile — Light` and `Projectile — Dark` only
5. Verify button reads `Enqueue Selected (2)`
6. Enqueue → verify queue shows exactly 2 rows
7. Click `Start Batch` — do not use Playwright MCP for this action
8. Wait for both jobs to complete
9. Post-generation read-only verification via Playwright MCP:
   - Confirm both assets now have `version: 1`, `status: pending` or `approved`, `path` present
   - Confirm no unrelated asset changed
   - Confirm generated files exist under `public/generated/images/` (gitignored)
10. Visual inspection per rubric:
    - `combat-projectile-light`: gold/azure, directional, no character forms
    - `combat-projectile-dark`: violet/crimson, directional, no character forms
11. Return visual verdict for each — do not approve without explicit follow-up operator confirmation
