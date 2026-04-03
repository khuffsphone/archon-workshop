# Current state snapshot

Updated: 2026-04-02 (after Part 1 initial execution)

---

## What exists now

### archon-workshop

| Item | State |
|---|---|
| `server.ts` | Patched. Adds `POST /api/export-combat-pack` (tag-filtered ZIP + `CombatPackManifest`), `combat_ready` flag on `GET /api/verify-manifest`. All original endpoints preserved. |
| `src/App.tsx` | **Split.** Reduced from 2,908 lines to ~250-line shell. All feature logic extracted to `src/features/`. |
| `src/features/generation/GenerationPanel.tsx` | `useGeneration` hook + UI — owns `handleGenerate`, `batchGenerate`, `expandLibrary`. |
| `src/features/export/ExportPanel.tsx` | Owns full export, combat-pack export, import-pack, verify. Enforces version guard. |
| `src/features/vfx/VFXWorkflowPanel.tsx` | 10-sprite combat VFX checklist. **No auto-approve.** Human gate required per sprite. |
| `src/features/scenelab/SceneLabPanel.tsx` | Live arena preview, VFX checklist, combat readiness indicator. |
| `src/lib/assetManifest.ts` | Extended: `CombatPackManifest` contract type, `COMBAT_SLICE_REQUIRED_IDS`, 10 combat VFX added to `INITIAL_ASSETS` (Stage D). |
| `src/lib/versionGuard.ts` | `assertPackVersion` + `validatePackAssets`. Shared between workshop and game. |
| `GEMINI_API_KEY` | Present in `.env`. Generation pipeline is live. |
| `npm install` | 384 packages, clean. |

### archon-game

| Item | State |
|---|---|
| Project | Vite + React + TypeScript. Sibling to archon-workshop at `c:\Dev\archon-game`. |
| `src/lib/types.ts` | `CombatPackManifest`, `CombatPackAsset`, `CombatState`, `UnitState` interfaces. |
| `src/lib/packLoader.ts` | Schema version check, asset URL resolution. |
| `src/features/combat/CombatEngine.ts` | Pure TS state machine. Knight 20 HP vs Sorceress 16 HP. Turn alternation. |
| `src/features/combat/useCombat.ts` | Battle music lifecycle, sfx-melee-hit, death sounds, voice lines. |
| `src/features/combat/CombatScene.tsx` | Arena + unit tokens + turn banner + HP bars + victory banner + rematch. |
| `src/components/UnitToken.tsx` | Token/defeated image, HP bar with color transitions, defeat stamp. |
| `src/components/TurnBanner.tsx` | Faction-colored turn indicator. |
| `src/combat-pack-manifest.json` | Seeded with expected approved asset paths (pending real asset import). |
| `npm install` | 69 packages, 0 vulnerabilities. |

### QA status (browser-verified)

| Check | Result |
|---|---|
| Intro screen renders | ✅ PASS |
| Begin Battle → turn banner | ✅ PASS |
| HP bars decrease + color-transition | ✅ PASS |
| Combat log records damage | ✅ PASS |
| Death → defeated portrait → "☠ Defeated" | ✅ PASS |
| Victory banner + Rematch | ✅ PASS |
| No JS functional errors | ✅ PASS |
| Unit images (real art) | ⚠ Pending asset import |

---

## Remaining gap — visible art

Unit images show alt-text because real approved images have not been imported yet.

**One-time fix:**
```
1. Open http://localhost:3000 → Export tab → Import Pack
   Load: archon-asset-pack-1775080752211.zip
2. node c:\Dev\copy-combat-assets.mjs
3. Restart archon-game dev server
```

---

## Part 1 interpretation (inherited from pack)

Do not chase broad content growth first.
Finish the factory contract and the browser combat slice path first.

The App.tsx split is done.
The export contract (`CombatPackManifest`) is typed and enforced.
The combat slice is playable with placeholder images.

**Next priority:** import real assets → verify manifest → confirm `combat_ready: true` → export combat pack → wire real images into game.
