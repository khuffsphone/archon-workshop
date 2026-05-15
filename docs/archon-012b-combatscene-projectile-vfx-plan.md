# ARCHON-012B — CombatScene Projectile VFX Implementation Plan

**Status:** PLAN COMPLETE — implementation deferred to next approved milestone  
**Authored:** 2026-05-15  
**Scope:** `archon-game` only. `archon-workshop` not modified.  
**Planning repo:** `c:\Dev\archon-game` (read-only during this milestone)  
**Implementation files:** zero — docs-only closeout

---

## 1. Objective

Integrate `combat-projectile-light` and `combat-projectile-dark` PNG assets into the
turn-based DOM combat path (`CombatScene`) in `archon-game`.

Both assets are on disk (`public/assets/`) and in `src/combat-pack-manifest.json` since
`d0ffb97` (ARCHON-012A). They are not yet referenced by any code in the `combat/` feature
folder. This plan documents how they will be wired up.

---

## 2. Operator Decisions (from ARCHON-012B planning review)

| # | Question | Decision |
|---|---|---|
| Q1 | Add `data-turn-faction` to `#combat-scene` in `CombatScene.tsx`? | **No. `CombatScene.tsx` remains frozen.** |
| Q2 | Board-launched mode only, or also standalone? | **Board-launched / `CombatBridge` path only. Standalone deferred.** |
| Q3 | Dark faction only, or both factions? | **Both factions.** Light → `combat-projectile-light`. Dark → `combat-projectile-dark`. |
| Q4 | Delay `setState(next)` by 200ms for visible travel window? | **No. Keep projectile VFX cosmetic (no state delay). Travel-window animation phase is a future milestone.** |

---

## 3. Freeze Rules

| File | Status |
|---|---|
| `src/features/combat/CombatScene.tsx` | **FROZEN** — per `CombatBridge.tsx` line 8. Not modified in this or any future milestone without explicit unfreeze. |
| `src/features/combat/CombatEngine.ts` | **FROZEN** — per `CombatBridge.tsx` line 9. |
| `src/features/combat/useCombat.ts` | Editable — not explicitly frozen. |
| `src/features/combat/CombatBridge.tsx` | Editable — the primary integration point for this milestone. |

---

## 4. Asset State at Time of Planning

| Asset | On disk | In manifest | Referenced by combat code |
|---|---|---|---|
| `combat-projectile-light-v1.png` | ✅ `public/assets/` (280,429 bytes) | ✅ `combat-pack-manifest.json` line 394 | ❌ None |
| `combat-projectile-dark-v1.png` | ✅ `public/assets/` (217,821 bytes) | ✅ `combat-pack-manifest.json` line 405 | ❌ None |

`getAssetUrl(pack, 'combat-projectile-light')` and `getAssetUrl(pack, 'combat-projectile-dark')`
return correct non-empty strings with the current manifest.

---

## 5. Implementation Design

### 5.1 Integration Point

All changes live in **`src/features/combat/CombatBridge.tsx`**. Specifically, within the
`BoardCombatAdapter` component (or its `CombatSceneWithResult` child), which wraps
`CombatScene` for board-launched combat.

`CombatScene.tsx` is not touched.

### 5.2 Projectile Overlay Rendering

A new sibling `<div>` is rendered **absolutely positioned over `<CombatSceneWithResult>`**,
mirroring the existing `vfx-overlay` DOM pattern from `CombatScene.tsx`:

```tsx
// New state in BoardCombatAdapter (or CombatSceneWithResult):
const [projVfx, setProjVfx] = useState<{ id: string; side: 'left' | 'right' } | null>(null);

// In JSX, sibling to <CombatSceneWithResult>:
{projVfx && (() => {
  const url = getAssetUrl(pack, projVfx.id);
  return url ? (
    <div
      className={`vfx-overlay vfx-overlay--${projVfx.side} vfx-overlay--projectile`}
      id={`vfx-projectile-${projVfx.side}`}
    >
      <img src={url} alt="" className="vfx-overlay-img vfx-projectile-img" />
    </div>
  ) : null;
})()}
```

If `getAssetUrl` returns `''` (asset absent from pack), nothing renders. Graceful fallback.

### 5.3 Attacker Faction Detection

**Constraint:** `CombatScene.tsx` is frozen. It cannot be modified to expose
`state.turnFaction` via a `data-` attribute or any other mechanism. `CombatBridge` does
not directly own `CombatState` — it renders `CombatScene` as a black box.

#### Rejected approach — DOM text parsing (do not use)

Parsing the `#btn-attack` button label (e.g. checking for `'Knight'` vs `'Sorceress'`
in the button's `textContent`) was considered and **rejected** as too fragile:

- Breaks silently on any label wording change in `CombatScene.tsx`
- Couples VFX logic to a UI string rather than to state
- Cannot distinguish stun-skip turns from normal turns reliably
- Provides no testable contract

This approach is documented here only as a last-resort diagnostic option. It must not
appear as the recommended implementation path.

#### Recommended approach — action-flow-based cue via `useCombat` / `CombatBridge`

The correct integration surface is the **combat action flow**, not the DOM. The full
mechanism design is deferred to ARCHON-012C, but the architectural direction is:

1. **`useCombat.ts` as cue emitter** — `useCombat` is not frozen and is the owner of
   `state.turnFaction` at the moment `handleAttack` is called. It is the correct layer
   to derive and emit a transient projectile cue. Options include:
   - Returning a `projectileCue: Faction | null` value from the hook that resets to
     `null` after one render cycle
   - Writing a module-level ref or singleton that `CombatBridge` can subscribe to
   - Dispatching a lightweight custom DOM event (e.g. `combat:projectile-cue`) carrying
     `{ faction: 'light' | 'dark' }` — analogous to `arena:sfx` in ArenaScene

2. **`CombatBridge.tsx` as overlay renderer** — `CombatBridge` listens for the cue
   (via event listener, ref read, or hook return value) and manages `projVfx` state
   to render the sibling overlay. It does not inspect the DOM for label text.

3. **`CombatScene.tsx` untouched** — the frozen baseline is preserved in full.

4. **Stun-skip safety** — because the cue originates from inside `handleAttack` (which
   short-circuits on stun: `processAttack` returns `lastEvent: 'none'`), the cue can
   check `next.lastEvent !== 'none'` before emitting, ensuring no projectile fires on a
   stun turn.

The exact mechanism (custom event vs. module ref vs. hook return) is an ARCHON-012C
design decision. The constraint is that it must not touch `CombatScene.tsx` and must
not rely on DOM text content.

### 5.4 Trigger Flow

Conceptual flow for the recommended action-based approach (exact mechanism TBD in
ARCHON-012C):

```
t=0ms    handleAttack() fires in useCombat.ts
         attFaction = state.turnFaction   ← known here, before processAttack
         next = processAttack(state)

         if (next.lastEvent !== 'none') {
           emit projectile cue { faction: attFaction }  ← via chosen mechanism
         }

         setState(next)
         setTimeout(() => setAnimating(false), 500)

t=0ms    CombatBridge receives cue → setProjVfx({ id: 'combat-projectile-{faction}', side })
         CombatScene useEffect fires: setVfxOverlay({ id: 'combat-hit-flash-...', side })

t=60ms   sfx-magic-bolt-v1 plays (dark faction only — existing logic in useCombat.ts, unchanged)

t=250ms  setProjVfx(null)   ← projectile overlay clears; hit-flash still showing

t=500ms  setAnimating(false) — button re-enabled
```

**Note:** Because `setState(next)` is NOT delayed (Q4 decision), the hit-flash VFX in
`CombatScene` fires nearly simultaneously with the projectile. The projectile is visible
for ~250ms alongside the hit-flash rather than as a distinct pre-impact effect. This is
the cosmetic-only behavior. A proper travel window (pre-impact delay) is a future
animation-phase milestone.

### 5.5 Projectile Side Mapping

The projectile flies **from the attacker's side toward the defender's side**:

| Attacker | Defender | Projectile asset | Projectile div side | CSS animation direction |
|---|---|---|---|---|
| `light` (left) | `dark` (right) | `combat-projectile-light` | `right` | left-to-right (ltr) |
| `dark` (right) | `light` (left) | `combat-projectile-dark` | `left` | right-to-left (rtl) |

The overlay div uses class `vfx-overlay--left` or `vfx-overlay--right` (anchoring side =
**defender** side, to match existing `vfx-overlay` layout conventions). The CSS animation
translates the image across.

### 5.6 CSS Animation

New additions to `src/index.css` (or the combat CSS file):

```css
/* Projectile VFX — cosmetic, no physics */
.vfx-overlay--projectile {
  pointer-events: none;
  z-index: 12; /* above arena-bg (z:1), below hit-flash (z:14) */
}

.vfx-projectile-img {
  width: 120px;
  height: auto;
  opacity: 0.92;
}

/* Dark (right) → Light (left) */
.vfx-overlay--projectile.vfx-overlay--left .vfx-projectile-img {
  animation: proj-rtl 250ms ease-out forwards;
}

/* Light (left) → Dark (right) */
.vfx-overlay--projectile.vfx-overlay--right .vfx-projectile-img {
  animation: proj-ltr 250ms ease-out forwards;
}

@keyframes proj-rtl {
  from { transform: translateX(80px)  scaleX(1); opacity: 0.92; }
  to   { transform: translateX(-80px) scaleX(1); opacity: 0; }
}

@keyframes proj-ltr {
  from { transform: translateX(-80px); opacity: 0.92; }
  to   { transform: translateX(80px);  opacity: 0; }
}
```

---

## 6. Files Changed (implementation)

| File | Action | Reason |
|---|---|---|
| `src/features/combat/CombatBridge.tsx` | MODIFY | Add projVfx state, wrapper click handler, sibling overlay |
| `src/index.css` | MODIFY | Add `@keyframes proj-rtl/ltr` and `.vfx-overlay--projectile` |
| `src/features/combat/__tests__/combatProjectileVfx.test.ts` | NEW | Smoke tests for projectile VFX plumbing |
| `src/App.tsx` | MODIFY (optional) | Add projectile IDs to `REQUIRED_IDS` after rendering confirmed |

**Not modified:**
- `CombatScene.tsx`, `CombatEngine.ts`, `types.ts`, `combat-pack-manifest.json`,
  `public/assets/`, any Arena files, any archon-workshop files.

---

## 7. Test Requirements

New file: `src/features/combat/__tests__/combatProjectileVfx.test.ts`

Note: `src/features/combat/` has no `__tests__/` directory. It will be created.

| Suite | Test | Assertion |
|---|---|---|
| `getAssetUrl` — present | light resolves | Returns `/assets/combat-projectile-light-v1.png` |
| `getAssetUrl` — present | dark resolves | Returns `/assets/combat-projectile-dark-v1.png` |
| `getAssetUrl` — absent | light missing | Returns falsy |
| `getAssetUrl` — absent | dark missing | Returns falsy |
| Cue emission | normal hit | Cue fires with correct `faction` |
| Cue emission | stun skip (`lastEvent === 'none'`) | Cue does NOT fire |
| Cue emission | death event | Cue fires with correct `faction` |
| Side mapping | light attacker (`faction: 'light'`) | `projVfx.side === 'right'` |
| Side mapping | dark attacker (`faction: 'dark'`) | `projVfx.side === 'left'` |
| Fallback | asset absent from pack | No overlay rendered, no throw |

Note: Tests for `getAttackerFactionFromDOM` are **not included** — that function is a
rejected approach and must not appear in the test suite.

Target baseline: **564 + ≥10 new = ≥574 tests passing**.

---

## 8. Deferred Items

| Item | Reason deferred | Suggested milestone |
|---|---|---|
| Full implementation (source code, tests) | ARCHON-012B is docs-only | ARCHON-012C |
| Attacker-faction cue mechanism selection (custom event vs. module ref vs. hook return) | Design decision requiring ARCHON-012C planning pass | ARCHON-012C |
| Visible travel window (pre-impact state delay) | Q4 decision — no `setState` delay in first implementation | Animation-phase milestone after ARCHON-012C |
| `data-turn-faction` attribute on `#combat-scene` | Q1 decision — `CombatScene.tsx` frozen | When `CombatScene.tsx` explicitly unfrozen |
| Standalone mode (`?mode=combat`) projectile VFX | Q2 decision — board-launched only | Standalone polish milestone |
| Promote IDs to `REQUIRED_IDS` / workshop `COMBAT_SLICE_REQUIRED_IDS` | After rendering confirmed working | Same milestone as ARCHON-012C implementation |
| `combat-heal-pulse` / `combat-ambient-arena` v2 hash sync | Pre-existing, out of scope | ARCHON-013 |

---

## 9. Verification Plan

### Automated
```bash
npm run lint        # tsc --noEmit — 0 errors
npm run test:run    # ≥ 574 passing (564 baseline + ≥10 new)
```

### Manual (browser)
```
http://localhost:5173/?mode=board
```
1. Trigger board combat (any attacker vs defender)
2. Dark attacker clicks attack → `combat-projectile-dark` bolt visible briefly, clears, hit-flash shows
3. Light attacker clicks attack → `combat-projectile-light` bolt visible briefly
4. During stun skip (`lastEvent === 'none'`) → cue not emitted → no projectile overlay
5. Remove both projectile entries from manifest → graceful fallback, no render, no crash

### Evidence
- Screenshot or Playwright recording: at least one frame with projectile sprite visible
- `git diff --stat` showing only expected files
- `npm run test:run` output at ≥574

---

*No source files were modified during ARCHON-012B. Implementation begins in the next approved milestone.*
