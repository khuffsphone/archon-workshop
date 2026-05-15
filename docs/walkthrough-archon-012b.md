# Walkthrough — ARCHON-012B: CombatScene Projectile VFX Runtime Integration Plan

**Date:** 2026-05-15  
**Task:** ARCHON-012B — Planning and docs-only closeout  
**Status:** COMPLETE — docs created, no source code modified  
**Repos modified:** `archon-workshop` (docs only). `archon-game` untouched.

---

## 1. What Was Done

ARCHON-012B was a **planning-only milestone**. Its deliverables are:

- `docs/archon-012b-combatscene-projectile-vfx-plan.md` — forward-looking implementation plan
- `docs/walkthrough-archon-012b.md` — this file

No source code was written. No assets were copied. No manifests were modified. No commits
were made to `archon-game`.

---

## 2. Inspection Summary

All required files were read in a single parallel pass:

| File | Key finding |
|---|---|
| `CombatScene.tsx` | Frozen. No projectile references. VFX uses `vfxOverlay` state → `<img>` overlay anchored to defender's side. Trigger: `useEffect` on `[state.turnNumber, state.lastEvent]`. |
| `useCombat.ts` | Not frozen. Contains `state.turnFaction === 'dark'` branch for `sfx-magic-bolt-v1` — the natural mirror for projectile VFX trigger. `handleAttack` applies damage synchronously at `t=0`. |
| `CombatEngine.ts` | Frozen. Emits `lastEvent: 'hit'|'death'` and `lastEventFaction: defFaction`. No attacker-faction event. No `isRanged` flag. |
| `CombatBridge.tsx` | Not frozen. Wraps `CombatScene` via `CombatSceneWithResult`. Chosen integration point. |
| `combat-pack-manifest.json` | Both projectile IDs present (added by `d0ffb97`). |
| `public/assets/` | Both PNGs present (added by `d0ffb97`). |
| `App.tsx` | `REQUIRED_IDS` has 6 entries — neither projectile ID included. |
| `types.ts` | `UnitState` has no `isRanged`, `attackType`, or `role` field. |

---

## 3. Open Questions — Answered

All four planning questions were answered by the operator before docs closeout:

| # | Question | Answer |
|---|---|---|
| Q1 | Add `data-turn-faction` to `#combat-scene`? | **No.** `CombatScene.tsx` remains frozen. Attacker-faction detection deferred to ARCHON-012C action-flow design. |
| Q2 | Board-launched mode only, or standalone too? | **Board-launched (`CombatBridge`) only.** Standalone `?mode=combat` deferred. |
| Q3 | Dark faction only, or both factions? | **Both factions.** Light → `combat-projectile-light`. Dark → `combat-projectile-dark`. |
| Q4 | Delay `setState(next)` for visible travel window? | **No.** Keep VFX cosmetic. Travel-window animation phase is a future milestone. |

---

## 4. Implementation Design (summary)

Full specification in `docs/archon-012b-combatscene-projectile-vfx-plan.md`.

**Integration point:** `CombatBridge.tsx` — a sibling overlay div rendered absolutely over
`CombatSceneWithResult`. `CombatScene.tsx` is not touched.

**Attacker detection — rejected approach:** DOM text parsing on `#btn-attack` was
considered and rejected. It couples VFX logic to a UI string, breaks silently on label
changes, and cannot reliably distinguish stun-skip turns. It is documented in the plan
only as a last-resort diagnostic option.

**Attacker detection — recommended approach (ARCHON-012C):** Derive attacker faction from
the combat action flow, not from the DOM. `useCombat.ts` (not frozen) owns
`state.turnFaction` at the moment `handleAttack` fires. The recommended direction is for
`useCombat` to emit a transient projectile cue (via custom event, module-level ref, or
hook return value) when an attack resolves with `lastEvent !== 'none'`. `CombatBridge`
listens for this cue and manages the overlay state. The exact mechanism is a design
decision for ARCHON-012C.

**Stun-skip safety:** Because the cue originates inside `handleAttack`, it can gate on
`next.lastEvent !== 'none'` — ensuring no projectile fires on a stun turn.

**Timing:** Projectile overlay fires at `t=0` alongside hit-flash (no state delay). The
250ms overlay lifetime provides a brief co-visible bolt + flash window. A proper
pre-impact travel window is a future animation-phase milestone.

**Fallback:** If `getAssetUrl` returns `''` (IDs absent from pack), nothing renders.
Combat is unaffected.

---

## 5. Deferred Items

| Item | Milestone |
|---|---|
| Source implementation of projectile VFX in `CombatBridge.tsx` | Next approved implementation milestone |
| Visible pre-impact travel window (state delay in `handleAttack`) | Animation-phase milestone after initial VFX confirmed |
| `data-turn-faction` on `#combat-scene` (cleaner attacker detection) | When `CombatScene.tsx` explicitly unfrozen |
| Standalone mode (`?mode=combat`) projectile VFX | Standalone polish milestone |
| Promote IDs to `REQUIRED_IDS` / `COMBAT_SLICE_REQUIRED_IDS` | Same milestone as implementation |
| `combat-heal-pulse` / `combat-ambient-arena` v2 hash sync | ARCHON-013 |

---

## 6. Commands Run

```bash
# All read-only — archon-game (planning pass)

git status -sb
# Exit: 0 — ## main (clean, d0ffb97 HEAD)

git log --oneline -5
# Exit: 0

npm run lint
# Exit: 0 — 0 errors (tsc --noEmit) — confirmed in ARCHON-012A/012B audit

npm run test:run
# Exit: 0 — 564/564 passing — confirmed in ARCHON-012A/012B audit
# Not re-run in planning pass; no source files changed
```

File reads performed (no writes):
- `CombatScene.tsx`, `useCombat.ts`, `CombatEngine.ts`, `CombatBridge.tsx`
- `src/lib/types.ts`, `src/lib/packLoader.ts`
- `src/App.tsx` (lines 1–50)
- `src/features/arena/arenaRenderer.ts`, `ArenaScene.tsx`, `arenaConfig.ts`
- `src/features/arena/__tests__/arenaProjectileAsset.test.ts`
- `src/combat-pack-manifest.json` (grep search)
- `public/assets/` (directory listing)

Grep searches (read-only):
- `combat-projectile` across `src/`
- `sfx-magic-bolt` across `src/`
- `lastEvent`, `setTimeout`, `turnFaction` across `src/features/combat/`

---

## 7. Test / Smoke Files

**No test files modified in ARCHON-012B.** This is a docs-only milestone.

New test file planned for ARCHON-012C implementation:
- `src/features/combat/__tests__/combatProjectileVfx.test.ts` (NEW — not yet created)

Existing baselines untouched:
- `src/features/arena/__tests__/arenaProjectileAsset.test.ts` — 12 tests (from `d0ffb97`)
- All 17 test files — 564 tests passing as of last verified run

---

## 8. Files Modified — `git diff --stat`

```
# archon-game — git diff --stat
(no changes — 0 files)

# archon-workshop — untracked new files (not yet staged)
 docs/archon-012b-combatscene-projectile-vfx-plan.md   NEW
 docs/walkthrough-archon-012b.md                        NEW
```

`git diff --name-only` (archon-game): *(empty)*  
`git diff --name-only` (archon-workshop, untracked): 2 new docs files

**archon-game:** zero files modified, zero files staged, zero commits.

---

## 9. Git State

### archon-game
```
## main
(clean — d0ffb97 HEAD unchanged)
```

### archon-workshop
```
## main...origin/main
?? docs/archon-012b-combatscene-projectile-vfx-plan.md
?? docs/walkthrough-archon-012b.md
(2 new untracked docs files — not yet staged or committed)
```

---

## 10. Staged / Pushed Status

Neither doc has been staged or pushed. Both remain untracked in `archon-workshop`.

To close out this milestone commit:
```bash
git add docs/archon-012b-combatscene-projectile-vfx-plan.md docs/walkthrough-archon-012b.md
git commit -m "docs: ARCHON-012B -- CombatScene projectile VFX integration plan and closeout"
git push
```

Staging and push require explicit operator instruction.

---

*ARCHON-012B planning and docs-only closeout complete.*  
*Implementation proceeds in ARCHON-012C, the next approved milestone.*
