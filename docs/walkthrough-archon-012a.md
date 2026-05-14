# Walkthrough: ARCHON-012A — Projectile VFX Runtime Integration

**Date:** 2026-05-14
**Repository:** `archon-game`
**Commit:** `d0ffb97`
**Status:** ✅ Complete

---

## Objective

Integrate the approved `combat-projectile-light` and `combat-projectile-dark` VFX assets
into `archon-game`'s `ArenaScene` renderer so that caster-role pieces fire PNG-sprite
projectile bolts instead of the procedural ellipse fallback.

---

## Key Finding: Two Combat Systems

`archon-game` contains two independent combat renderers. Only the **ArenaScene** is in scope.

| System | Mode | Rendering | Scope |
|---|---|---|---|
| `CombatScene` (v1, frozen) | Turn-based standalone | React DOM `<img>` overlays | ❌ Not touched |
| **`ArenaScene`** (v2.0) | Real-time 2D platformer (`?arena=1`) | `<canvas>` via `GameLoop` | ✅ Modified |

`CombatScene` is explicitly frozen (`CombatBridge.tsx` doc comment). It was not modified.

---

## Pre-execution: Asset Sync

| Check | Result |
|---|---|
| SHA-256 `combat-projectile-light-v1.png` | `0388d547…` — matches workshop manifest ✅ |
| SHA-256 `combat-projectile-dark-v1.png` | `e602e4af…` — matches workshop manifest ✅ |
| Copy to `archon-game/public/assets/` | ✅ Both files present |
| Entries added to `archon-game/src/combat-pack-manifest.json` | ✅ 2 entries with correct hashes, paths, `source_milestone: 012A` |

---

## Code Changes

### `src/features/arena/arenaConfig.ts`
Added two new exported constants for visual draw size (distinct from hitbox for physics):
```ts
export const PROJECTILE_DRAW_W = 56;  // 2× PROJECTILE_W (hitbox: 28px)
export const PROJECTILE_DRAW_H = 40;  // 2× PROJECTILE_H (hitbox: 20px)
```
Physics hitbox unchanged. Physics uses `PROJECTILE_W/H`; renderer uses `PROJECTILE_DRAW_W/H`.

### `src/features/arena/arenaRenderer.ts`
Extended `drawProjectiles()` signature with optional `images?` parameter:
```ts
export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[],
  images?: { light: HTMLImageElement | null; dark: HTMLImageElement | null },
): void
```
When `images?.[proj.faction]` is a loaded `HTMLImageElement`, draws the PNG sprite at
`PROJECTILE_DRAW_W × PROJECTILE_DRAW_H` with horizontal-flip support for leftward bolts.
When absent (image not in pack, or not yet loaded), falls back to the existing procedural
glowing ellipse — **zero breakage** if the manifest is missing the entries.

### `src/features/arena/gameLoop.ts`
- `ArenaConfig` interface extended with two optional fields:
  ```ts
  projectileUrlLight?: string;
  projectileUrlDark?:  string;
  ```
- `GameLoop` class: added `private projImgLight/Dark: HTMLImageElement | null` fields;
  preloaded in constructor when URLs are supplied.
- `_render()` now calls `drawProjectiles(ctx, this.projectiles, { light, dark })`.

### `src/features/arena/ArenaScene.tsx`
In the arena `useEffect`, resolved projectile URLs from the combat pack:
```ts
const projUrlLight = getAssetUrl(payload.pack, 'combat-projectile-light') || undefined;
const projUrlDark  = getAssetUrl(payload.pack, 'combat-projectile-dark')  || undefined;
```
Passed into `new GameLoop(canvas, { …, projectileUrlLight, projectileUrlDark })`.

### `src/features/arena/__tests__/arenaProjectileAsset.test.ts` _(NEW)_
12-assertion plumbing test covering:
1. `getAssetUrl` returns falsy for both projectile IDs when absent from pack
2. `getAssetUrl` returns correct paths when IDs are present
3. `ArenaConfig` type accepts optional `projectileUrlLight/Dark`
4. `drawProjectiles()` is backward-compatible (2-arg call does not throw)
5. `drawProjectiles()` handles `images.light/dark = null` without throwing
6. `PROJECTILE_DRAW_W/H` are exported and exactly 2× their hitbox counterparts

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Optional / graceful integration | Pack and game can be deployed independently; fallback ellipse ensures no crash |
| `PROJECTILE_DRAW_W/H` at 2× hitbox | 28×20px is illegible; 56×40px is visible without changing physics |
| Horizontal-flip support in renderer | Rightward sprite flipped via `ctx.scale(-1,1)` for leftward projectiles |
| `REQUIRED_IDS` unchanged | Projectile IDs are optional enhancements, not required for startup |
| `CombatScene.tsx` NOT touched | Frozen baseline; has no projectile rendering path |

---

## Verification Results

| Check | Result |
|---|---|
| `npm run lint` (tsc --noEmit) | ✅ Exit 0, 0 errors |
| `npm run test:run` | ✅ 564/564 passed (552 baseline + 12 new) |
| `git status -uall --short` | ✅ Exactly 8 expected files (5M + 3A) |
| `git ls-files --others --exclude-standard` | ✅ Empty after staging |
| Commit `d0ffb97` pushed to `origin/main` | ✅ |

---

## Files Changed (`archon-game`)

| Action | File |
|---|---|
| MODIFY | `src/combat-pack-manifest.json` |
| MODIFY | `src/features/arena/ArenaScene.tsx` |
| MODIFY | `src/features/arena/arenaConfig.ts` |
| MODIFY | `src/features/arena/arenaRenderer.ts` |
| MODIFY | `src/features/arena/gameLoop.ts` |
| NEW | `src/features/arena/__tests__/arenaProjectileAsset.test.ts` |
| NEW (binary) | `public/assets/combat-projectile-light-v1.png` |
| NEW (binary) | `public/assets/combat-projectile-dark-v1.png` |

---

## Files NOT Changed

| File | Reason |
|---|---|
| `src/features/combat/CombatScene.tsx` | Frozen baseline |
| `src/features/combat/CombatEngine.ts` | No VFX path |
| `src/features/combat/useCombat.ts` | No VFX path |
| `src/features/combat/CombatBridge.tsx` | Not in scope |
| `src/lib/types.ts` | Frozen contract |
| `src/lib/packLoader.ts` | No change needed |
| `src/App.tsx` (`REQUIRED_IDS`) | Projectile IDs kept optional |
| `src/lib/board-combat-contract.ts` | Frozen contract |
| `archon-workshop/*` | Not in scope |

---

## Deferred to ARCHON-013

- Promote `combat-projectile-light/dark` to `REQUIRED_IDS` once considered stable
- Patch `combat-heal-pulse` / `combat-ambient-arena` v2 hash mismatches between repos
- Manual `?arena=1` visual verification of PNG sprite rendering in browser
