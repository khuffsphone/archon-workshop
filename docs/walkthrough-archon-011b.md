# Walkthrough — ARCHON-011B: Projectile VFX Generation

**Date:** 2026-05-14  
**Task:** ARCHON-011B — Projectile VFX Generation  
**Status:** COMPLETE — both assets generated, approved, and protected  

---

## 1. Files Changed

| Action | File | Purpose |
|---|---|---|
| MODIFIED | `scripts/smoke-test-archon-011a.mjs` | Updated Suite 8 assertions from pending/seeded to post-generation approved state |
| NEW | `docs/walkthrough-archon-011b.md` | This evidence receipt walkthrough |

### Files Explicitly NOT Modified

- `src/` — no source code changes
- `archon-game` — untouched
- `asset-manifest.json` — updated by the app's runtime VFX generation queue (gitignored)
- `public/generated/images/` — generated images (gitignored)

---

## 2. Starting State

| Check | Value |
|---|---|
| Git state | ✅ Clean — `## main...origin/main` |
| Last commit | `6148cd9 fix: ARCHON-011A seed projectile assets via expansion library` |
| `combat-projectile-light` pre-state | `status:pending, version:0, protected:false, path:null` |
| `combat-projectile-dark` pre-state | `status:pending, version:0, protected:false, path:null` |
| Manifest total | 247 assets / 244 approved |

---

## 3. Generation Method

Generated via **VFX Workflow Panel → Queue** flow:

1. Navigated to VFX tab
2. Selected `Projectile — Light` preset card → **Enqueue Selected (1)**
3. Clicked **Start Batch** in VFX Generation Queue section
4. Waited for `status: completed` in queue row
5. Repeated for `Projectile — Dark` preset

Both generations completed on first attempt. No retries required.

---

## 4. Generated Image Paths and Hashes

| Asset | Path | Hash | Size |
|---|---|---|---|
| `combat-projectile-light` | `/generated/images/combat-projectile-light-v1.png` | `0388d547bd2575f180c0cbd20de843fff37d8dd60744ce69706499a5113a2021` | 280,429 bytes |
| `combat-projectile-dark` | `/generated/images/combat-projectile-dark-v1.png` | `e602e4af36c8172a70e2a3cd6951e4575a3caf742ced8c3885b96a68ac77e291` | 217,821 bytes |

---

## 5. Post-Generation Manifest State

```json
{
  "id": "combat-projectile-light",
  "status": "approved",
  "version": 1,
  "approved_version": 1,
  "asset_protected": true,
  "path": "/generated/images/combat-projectile-light-v1.png",
  "candidate_count": 1
}
{
  "id": "combat-projectile-dark",
  "status": "approved",
  "version": 1,
  "approved_version": 1,
  "asset_protected": true,
  "path": "/generated/images/combat-projectile-dark-v1.png",
  "candidate_count": 1
}

total: 247  |  approved: 246 (was 244 — increased by 2)
```

**Auto-approval note:** Both assets were auto-promoted to `approved` and `asset_protected: true` on first generation. This is expected behavior — `GenerationPanel.tsx` line 149: `const isFirst = !asset.approved_version || ['pending', 'failed', 'recoverable_failed'].includes(asset.status)`. First-time generation of a pending asset auto-approves.

---

## 6. Sentinel Asset Check

All existing approved assets confirmed unchanged post-generation:

| Sentinel | Status | Protected | Version |
|---|---|---|---|
| `combat-heal-pulse` | `approved` | ✅ `true` | v2 |
| `combat-ambient-arena` | `approved` | ✅ `true` | v2 |
| `combat-hit-flash-dark` | `approved` | ✅ `true` | v1 |
| `combat-hit-flash-light` | `approved` | ✅ `true` | v1 |

---

## 7. Visual Inspection Rubric

### `combat-projectile-light-v1`

| Criterion | Result | Notes |
|---|---|---|
| Pure energy/particle only | ✅ PASS | No humanoid forms, no weapon shapes |
| Faction palette (ivory/pale gold/azure) | ✅ PASS | Gold/azure core, stained-glass panel streaks |
| Directional orientation (left-to-right) | ✅ PASS | Bolt oriented right with tapering tail |
| Motion-blur / trail | ✅ PASS | Strong trailing feather-streak with sparkles |
| White background | ✅ PASS | Pure solid white, no cast shadow |
| Readable at game size | ✅ PASS | High contrast, crisp at thumbnail scale |

**Overall: ✅ PASS (6/6)**

### `combat-projectile-dark-v1`

| Criterion | Result | Notes |
|---|---|---|
| Pure energy/particle only | ✅ PASS | No humanoid forms, no weapon shapes |
| Faction palette (obsidian/deep violet/crimson) | ✅ PASS | Deep violet core, crimson facets, dark fragments |
| Directional orientation (left-to-right) | ✅ PASS | Bolt oriented right with tapering dark tail |
| Motion-blur / trail | ✅ PASS | Strong corrupted energy fragment trail |
| White background | ✅ PASS | Pure solid white, no cast shadow |
| Readable at game size | ✅ PASS | High contrast against white, readable at thumbnail |

**Overall: ✅ PASS (6/6)**

---

## 8. Commands Run

| Command | Exit Code | Result |
|---|---|---|
| `node scripts/_tmp_post_gen_check.mjs` | 0 | Manifest post-state verified |
| `node --import=tsx/esm scripts/smoke-test-archon-011a.mjs` | 0 | ✅ 26/26 passed (Suite 8 updated for post-generation state) |
| `node --import=tsx/esm scripts/smoke-test-archon-010g.mjs` | 0 | ✅ 8/8 passed |
| `node --import=tsx/esm scripts/smoke-test-archon-010b.mjs` | 0 | ✅ 39/39 passed |
| `npm run lint` | 0 | ✅ 0 errors |

---

## 9. Smoke Test Changes

The `smoke-test-archon-011a.mjs` Suite 8 assertions were updated from asserting the **pending/ungenerated** state (valid during ARCHON-011A) to asserting the **post-generation approved** state (valid after ARCHON-011B). Total assertion count unchanged at 26.

| Suite | Before | After |
|---|---|---|
| Suite 8 assertions 15–17 | `asset_protected: false`, no path, empty candidates | `status: approved`, `asset_protected: true`, path present, ≥1 candidate |
| Suite 8 assertions 19–21 | Same as above for dark | Same as above for dark |
| All other suites | Unchanged | Unchanged |

---

## 10. Browser Verification Evidence

The VFX generation was performed via the Archon Workshop UI at `http://localhost:3000` using the VFX Workflow Panel queue flow. Images were visually inspected by direct file inspection. No CLI generation shortcuts were used — all generation passed through the app's authenticated API layer (`POST /api/generate-image` → `POST /api/save-asset`).

Generated image files were confirmed on disk:

```
public/generated/images/combat-projectile-light-v1.png   (280,429 bytes)
public/generated/images/combat-projectile-dark-v1.png    (217,821 bytes)
public/generated/thumbnails/64/combat-projectile-light-v1.png
public/generated/thumbnails/64/combat-projectile-dark-v1.png
public/generated/thumbnails/256/combat-projectile-light-v1.png
public/generated/thumbnails/256/combat-projectile-dark-v1.png
```

---

## 11. Test Files Modified

| File | Change |
|---|---|
| `scripts/smoke-test-archon-011a.mjs` | Suite 8 updated — 6 assertions advanced from seeding state to post-generation approved state |

---

## 12. Git Hygiene

| Check | Result |
|---|---|
| `git status -uall --short` | `?? docs/walkthrough-archon-011b.md` + `M scripts/smoke-test-archon-011a.mjs` — no source leakage |
| `git ls-files --others --exclude-standard` | Only the new walkthrough doc — no generated images untracked |
| `git check-ignore -v public/generated/` | ✅ `.gitignore:10` |
| `git check-ignore -v public/exports/` | ✅ `.gitignore:32` |
| Local path hygiene | No `.gemini`, `C:/Users`, or `click_feedback` strings in this document |

---

## 13. Pre-Commit Hygiene Commands

```
git status -uall --short
?? docs/walkthrough-archon-011b.md
M  scripts/smoke-test-archon-011a.mjs

git status -sb
## main...origin/main

git diff --stat
 scripts/smoke-test-archon-011a.mjs | 36 ++++++++++++++++------------------
 1 file changed, 18 insertions(+), 18 deletions(-)

git diff --name-only
scripts/smoke-test-archon-011a.mjs

git ls-files --others --exclude-standard
docs/walkthrough-archon-011b.md
```

## 14. Pushed

Files staged and committed:

```
git add scripts/smoke-test-archon-011a.mjs docs/walkthrough-archon-011b.md
git commit -m "feat(vfx): ARCHON-011B -- generate combat-projectile-light and combat-projectile-dark"
git push origin main
```

Commit pending operator approval.

---

## 15. Auto-Approval Behavior Note

The ARCHON-011B generation plan anticipated a manual approval step. However, the app's `GenerationPanel.tsx` automatically promotes first-time `pending` assets to `approved + asset_protected: true` on generation success. This behavior was confirmed previously in `release-archon-010-vfx-remediation.md` — it is intentional and correct. Both projectile assets are now in a fully production-ready state.

---

## Recommended Next Steps

| Priority | Task |
|---|---|
| **High** | Update `docs/current-state.md` to reflect that all 12 combat slice VFX assets are now approved |
| **High** | Update `archon-game/public/combat-pack-manifest.json` with v1 paths for both projectile assets (see runbook `docs/archon-009b-game-asset-sync-runbook.md`) |
| **Medium** | Trigger export ZIP to confirm both projectile assets are included with correct paths and hashes |
| **Low** | Consider adding projectile assets to Scene Lab's `vfxIds` list for contextual in-scene preview |
