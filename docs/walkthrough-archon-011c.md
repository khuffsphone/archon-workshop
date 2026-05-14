# Walkthrough — ARCHON-011C: Projectile Export / Game Asset Sync Confirmation

**Date:** 2026-05-14
**Task:** ARCHON-011C — Export Readiness Inspection and Game Sync Confirmation
**Status:** Complete — docs-only milestone — committed `98881be` — pushed to `origin/main`

---

## 1. Files Changed

| Action | File | Purpose |
|---|---|---|
| NEW | `docs/walkthrough-archon-011c.md` | This document — evidence receipt for inspection |
| MODIFIED | `docs/current-state.md` | Updated VFX table, approved count, next priority section |

## 2. Files NOT Changed (Protected)

| File | Reason |
|---|---|
| `src/lib/assetManifest.ts` | Frozen contract — not touched |
| `src/lib/versionGuard.ts` | Frozen contract — not touched |
| `COMBAT_SLICE_REQUIRED_IDS` | Frozen — projectile additions require ARCHON-012 design work |
| `CombatPackManifest` / `COMBAT_PACK_SCHEMA_VERSION` | Frozen |
| `public/generated/manifests/asset-manifest.json` | Runtime artifact — not hand-edited |
| `archon-game/*` | Hard boundary — game does not reference projectile IDs; no sync justified |
| Any source code | Not in scope for a docs-only inspection milestone |

---

## 3. Objective

Determine whether the `combat-projectile-light` and `combat-projectile-dark` assets generated in ARCHON-011B are:
1. Covered by the Workshop export path
2. Referenced by `archon-game`
3. In need of a controlled game-side sync

This is a readiness and confirmation milestone only.

---

## 4. Required Reading Completed

All required files were read before any action was taken:

- `.agents/README.md` — rule precedence, workflow selection, model rotation
- `.agents/rules/10-operating-discipline.md` — inspect before writing, execution gate
- `.agents/rules/12-contract-protection.md` — frozen paths identified
- `.agents/rules/13-closeout-discipline.md` — claim language, evidence requirements
- `.agents/workflows/generated-artifact-hygiene.md` — gitignore and staging rules
- `.agents/workflows/evidence-receipt.md` — evidence ladder
- `docs/walkthrough-archon-011a.md` — ARCHON-011A seeding context
- `docs/walkthrough-archon-011b.md` — ARCHON-011B generation context
- `docs/archon-009b-game-asset-sync-runbook.md` — runbook steps and guardrails
- `docs/release-archon-010-vfx-remediation.md` — ARCHON-010 release context
- `docs/current-state.md` — baseline state before this inspection
- `src/lib/exportEligibility.ts` — eligibility rules: `status === 'approved' && !!path`
- `src/features/export/ExportPanel.tsx` — Export Eligibility Preview UI reference
- `public/generated/manifests/asset-manifest.json` — live workshop manifest
- `.gitignore` — confirmed `public/generated/` (line 10), `public/exports/` (line 32) covered
- `archon-game/src/combat-pack-manifest.json` — game manifest (read-only)
- `archon-game/public/assets/` — game asset directory listing (read-only)
- `archon-game/src/features/combat/CombatScene.tsx` — game VFX rendering logic (read-only)
- `archon-game/src/lib/packLoader.ts` — game pack validation (read-only)
- `archon-game/src/lib/types.ts` — game type contracts (read-only)

---

## 5. Repository State at Inspection

### archon-workshop
```
> git status -sb
## main...origin/main

> git log --oneline -3
8b333ba feat(vfx): ARCHON-011B -- generate combat-projectile-light and combat-projectile-dark
6148cd9 fix: ARCHON-011A seed projectile assets via expansion library
6e6dc5b docs: ARCHON-010H -- VFX remediation release snapshot (010A-010G)
```

### archon-game
```
> git status -sb
## main

> git log --oneline -3
57ee79a ci: ARCHON-005 — add GitHub Actions CI baseline
2791bcd docs: ARCHON-004 manual playtest log -- live browser session complete
3eb5ad1 docs: ARCHON-004 manual playtest log template
```

---

## 6. Workshop Manifest Inspection (Inspection Commands)

### Method

A temporary read-only script (`scripts/_tmp_011c_inspect.mjs`) was written and deleted after execution. It read from:
- `public/generated/manifests/asset-manifest.json`
- `../archon-game/src/combat-pack-manifest.json`

The script was deleted immediately after running. It is not committed.

### Workshop Manifest Output
```
=== WORKSHOP MANIFEST STATE ===
{
  "id": "combat-projectile-light",
  "status": "approved",
  "asset_protected": true,
  "path": "/generated/images/combat-projectile-light-v1.png",
  "hash": "0388d547bd2575f180c0cbd20de843fff37d8dd60744ce69706499a5113a2021",
  "approved_version": 1,
  "current_display_version": 1,
  "candidate_versions_count": 1,
  "export_eligible": true
}
{
  "id": "combat-projectile-dark",
  "status": "approved",
  "asset_protected": true,
  "path": "/generated/images/combat-projectile-dark-v1.png",
  "hash": "e602e4af36c8172a70e2a3cd6951e4575a3caf742ced8c3885b96a68ac77e291",
  "approved_version": 1,
  "current_display_version": 1,
  "candidate_versions_count": 1,
  "export_eligible": true
}

=== COMBAT_SLICE_REQUIRED_IDS membership ===
  combat-projectile-light in COMBAT_SLICE_REQUIRED_IDS: false
  combat-projectile-dark in COMBAT_SLICE_REQUIRED_IDS: false

=== EXPORT READINESS — Workshop manifest ===
  total assets: 247
  approved+path (eligible): 246
  COMBAT_SLICE_REQUIRED_IDS missing from eligible: none — COMBAT READY

=== GAME MANIFEST — projectile IDs ===
  combat-projectile-light: NOT PRESENT in archon-game/src/combat-pack-manifest.json
  combat-projectile-dark: NOT PRESENT in archon-game/src/combat-pack-manifest.json

=== GAME ASSETS DIR — projectile files ===
  combat-projectile-light-v1.png: NOT FOUND
  combat-projectile-dark-v1.png: NOT FOUND

=== HASH CROSS-CHECK ===
  combat-projectile-light: missing from game manifest — no cross-check possible
  combat-projectile-dark: missing from game manifest — no cross-check possible

=== EXISTING GAME MANIFEST ENTRIES THAT NEED SYNC ===
  combat-heal-pulse: ws_version=2 gm_hash=8b71479b6975c070 ws_hash=ce72b3fbcd7fedfe match=false
  combat-ambient-arena: ws_version=2 gm_hash=db451dc55514a732 ws_hash=ebfb41d06f4d701a match=false
```

Exit code: 0

---

## 7. Export Eligibility Preview Verification

### Browser Verification (Playwright MCP — read-only)

Navigation: `http://localhost:3000` → `📦 Export` tab

**Header state:** `✅ 246` approved · `⏳ 1` pending · `❌ 0` rejected

**Combat Slice status:**
> **Combat Ready** — Total: 247 · Eligible: 246 · Excluded: 1 · Rejected: 0 · Pending: 1

**Projectile asset rows:**

| Row ID | UI text |
|---|---|
| `eligibility-row-combat-projectile-light` | `combat-projectile-light · spell · light · approved 🔒 ✅ Ships —` |
| `eligibility-row-combat-projectile-dark` | `combat-projectile-dark · spell · dark · approved 🔒 ✅ Ships —` |

Both assets are export-eligible and will be included in the next `Export Combat Pack` ZIP.

Browser verification level: Level 2 (UI state snapshot — eligibility row presence + status badges confirmed).

---

## 8. Game-Side Inspection Results

### `archon-game/src/combat-pack-manifest.json`
- Searched all 394 lines
- `combat-projectile-light`: **NOT PRESENT**
- `combat-projectile-dark`: **NOT PRESENT**
- Total assets in game manifest: 47

### `archon-game/public/assets/`
- Listed 71 files (all gittracked binaries)
- `combat-projectile-light-v1.png`: **NOT FOUND**
- `combat-projectile-dark-v1.png`: **NOT FOUND**

### `archon-game/src/features/combat/CombatScene.tsx`
- `getAssetUrl()` is called for: `arena-light`, `arena-dark`, `combat-ambient-arena`, `combat-hit-flash-light`, `combat-hit-flash-dark`, `combat-death-burst-light`, `combat-death-burst-dark`, `combat-spawn-light`, `combat-spawn-dark`, `combat-status-stun-v1`, `ui-button-hover-v1`, `spell-heal-icon-v1`, `spell-imprison-icon-v1`
- **No call to `getAssetUrl('combat-projectile-light')` or `getAssetUrl('combat-projectile-dark')`**
- Projectile VFX are not displayed anywhere in the current game

### `archon-game/src/lib/packLoader.ts`
- `validatePack()` checks only that `requiredIds` are present in the manifest
- Projectile IDs are not in `COMBAT_SLICE_REQUIRED_IDS` (confirmed: `false` for both)
- Game validation will not fail due to absent projectile IDs

---

## 9. Pre-existing Hash Mismatches (Out of Scope — Already Documented)

| Asset | Status | Workshop hash (first 16) | Game manifest hash (first 16) | Match |
|---|---|---|---|---|
| `combat-heal-pulse` | v2 in workshop, v1 in game | `ce72b3fbcd7fedfe` | `8b71479b6975c070` | ❌ No |
| `combat-ambient-arena` | v2 in workshop, v1 in game | `ebfb41d06f4d701a` | `db451dc55514a732` | ❌ No |

These were noted in `docs/current-state.md` and `docs/release-archon-010-vfx-remediation.md`. They are **out of scope** for ARCHON-011C.

---

## 10. Sync Decision

### Verdict: **No sync needed at this time (Option D)**

**Primary finding:** `archon-game/src/features/combat/CombatScene.tsx` does not reference `combat-projectile-light` or `combat-projectile-dark`. Copying the PNGs to `archon-game/public/assets/` without a corresponding UI implementation would produce dead binary files — assets present on disk but never rendered.

**Eligibility chain is satisfied:** Workshop → approved → export-eligible → will ship in next ZIP. The workshop side of the pipeline is complete.

**The game-side unlock requires a separate design + implementation milestone (ARCHON-012):**

1. Design: when does the projectile fire? (ranged attack event? spell sequence? visual-only animation?)
2. Implement: add `getAssetUrl('combat-projectile-light')` / `'combat-projectile-dark'` calls to `CombatScene.tsx`
3. Add both IDs to `COMBAT_SLICE_REQUIRED_IDS` in `assetManifest.ts`
4. Add them to the game's `requiredIds` passed to `validatePack()`
5. Then execute the runbook: copy assets, export ZIP, refresh `combat-pack-manifest.json`, commit game-side changes after lint + 552 tests pass

### Sync decision matrix

| Question | Finding | Sync required? |
|---|---|---|
| Are both assets `approved` and `asset_protected`? | ✅ Yes | — |
| Are both assets export-eligible? | ✅ Yes | — |
| Does the game reference either projectile ID? | ❌ No | No |
| Are either IDs in `COMBAT_SLICE_REQUIRED_IDS`? | ❌ No | No |
| Do projectile PNGs exist in game `public/assets/`? | ❌ No | — |
| Would copying without UI implementation be useful? | ❌ No | No |

**Sync type decision: None at this time** — `docs/current-state.md` update only.

---

## 11. Commands Run

### git status checks
```
> git status -sb     (archon-workshop)
## main...origin/main

> git status -sb     (archon-game)
## main
```
Exit codes: 0 / 0

### Inspection script
```
> node --import=tsx/esm scripts/_tmp_011c_inspect.mjs
(full output in Section 6 above)
Exit code: 0
Script deleted after run.
```

### Browser verification
Playwright MCP — read-only navigation to `http://localhost:3000` → Export tab.
Exit code: N/A (browser session)

### Lint
```
> npm run lint
> tsc --noEmit
Exit code: 0 — 0 errors
```

### Smoke tests (regression)
```
> node --import=tsx/esm scripts/smoke-test-archon-011a.mjs
✅ All 26 assertions passed.
Exit code: 0

> node --import=tsx/esm scripts/smoke-test-archon-010g.mjs
── Results: 8 passed, 0 failed ──
Exit code: 0

> node --import=tsx/esm scripts/smoke-test-archon-010b.mjs
✅ All 39 assertions passed.
Exit code: 0
```

---

## 12. Test Files Modified

None. This is a docs-only milestone. No smoke test scripts were created or modified.

---

## 13. Generated Artifact Hygiene

```
> git check-ignore -v public/generated/
.gitignore:10:public/generated/

> git check-ignore -v public/exports/
.gitignore:32:public/exports/

> git status -uall --short
(post-commit — clean)

> git ls-files --others --exclude-standard
(empty)
```

No generated files were staged or committed.

---

## 14. Browser Verification

Playwright MCP read-only session against `http://localhost:3000 → Export tab`:

- Page title: "My Google AI Studio App" ✅
- Header: ✅ 246 approved, ⏳ 1 pending, ❌ 0 rejected
- `eligibility-row-combat-projectile-light`: `approved 🔒 ✅ Ships`
- `eligibility-row-combat-projectile-dark`: `approved 🔒 ✅ Ships`
- Combat Slice status: **Combat Ready** (19/19 required IDs satisfied)

Evidence level: Level 2 (UI state snapshot — row presence + status badges).

---

## 15. Acceptance Criteria

| Criterion | Evidence |
|---|---|
| Workshop manifest state confirmed for both projectile assets | ✅ Script output: `status: approved`, `asset_protected: true`, `path` present, `hash` present, `export_eligible: true` |
| Export Eligibility Preview includes both projectile assets | ✅ `eligibility-row-combat-projectile-light` and `eligibility-row-combat-projectile-dark` both show `✅ Ships` |
| Export Eligibility Preview shows Combat Ready | ✅ `Combat Ready` — Total: 247, Eligible: 246 |
| Game manifest does NOT reference projectile IDs | ✅ `NOT PRESENT` for both |
| Game assets directory does NOT contain projectile PNGs | ✅ `NOT FOUND` for both |
| `CombatScene.tsx` does NOT call `getAssetUrl('combat-projectile-*')` | ✅ Confirmed — no reference in 280-line component |
| Sync decision documented with rationale | ✅ Option D — no sync; see Section 10 |
| `docs/current-state.md` updated | ✅ VFX table + approved count + next priority updated |
| No source code modified | ✅ `git diff --name-only` → docs only |
| Lint passes | ✅ Exit 0, 0 errors |
| Smoke tests pass | ✅ 26/26 + 8/8 + 39/39 |
| No generated files staged | ✅ gitignored; `git ls-files --others --exclude-standard` empty |
| Evidence receipt check passes | ✅ 10/10 |
| Local path hygiene clean | ✅ No `.gemini`, `C:/Users`, `click_feedback` matches |

---

## 16. Known Limitations / Deferred Items

| Item | Status |
|---|---|
| `combat-heal-pulse` v2 hash mismatch with game manifest | Pre-existing — deferred to future sync milestone (ARCHON-012 or standalone) |
| `combat-ambient-arena` v2 hash mismatch with game manifest | Same |
| Game does not render projectile VFX | By design — requires ARCHON-012 design + implementation work |

---

## 17. Recommended Next Task

**ARCHON-012 — Game VFX: Add Projectile Combat Effects to CombatScene**

Scope:
1. Design the projectile VFX trigger (ranged attack event, spell cast, or visual-only turn animation)
2. Add `getAssetUrl('combat-projectile-light')` / `'combat-projectile-dark'` to `CombatScene.tsx`
3. Add both IDs to `COMBAT_SLICE_REQUIRED_IDS` (requires freeze-list acknowledgment for `assetManifest.ts`)
4. Sync assets to `archon-game/public/assets/` per `docs/archon-009b-game-asset-sync-runbook.md`
5. Export ZIP from workshop, replace `archon-game/src/combat-pack-manifest.json` wholesale
6. Run `archon-game` lint + 552 tests before committing
7. Optionally bundle the `combat-heal-pulse` and `combat-ambient-arena` v2 hash sync in the same milestone

---

## 18. Git State

```
> git diff --stat
 docs/current-state.md            | 22 +++---
 docs/walkthrough-archon-011c.md  | 198 ++++++++++++++++++++++++++++++
 2 files changed, 212 insertions(+), 8 deletions(-)

> git diff --name-only
docs/current-state.md
docs/walkthrough-archon-011c.md

> git status -sb
## main...origin/main
```

## 19. Commit Hash

```
98881be docs: ARCHON-011C -- export/game sync readiness inspection -- no sync needed
```

## 20. Pushed

```
To https://github.com/khuffsphone/archon-workshop.git
   8b333ba..98881be  main -> main
```

Pushed: yes — `origin/main`
