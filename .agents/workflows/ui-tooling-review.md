# Workflow: UI Tooling Review

**Trigger:** Before or after adding UI to the workshop (new panel tab, new button, new filter, new drawer, new modal).

**Purpose:** Confirm the UI change is clean, functional, accessible enough, and doesn't break any existing UI contract.

---

## Pre-implementation checks

Before writing any JSX:

1. **Check `index.css` for existing class names** that cover the new component's needs — reuse before adding new classes
2. **Check `App.tsx` tab routing** (`VALID_TABS` in `workshopPersistence.ts`) — if you're adding a tab, it must be added to the valid tab list
3. **Check the Props interface** for the panel receiving the new UI — confirm you're not breaking existing callers
4. **Confirm IDs are unique** — all interactive elements must have a unique `id` attribute (e.g. `id="btn-vfx-export-catalog"`) for browser testing

## CSS rules

- **Additive only** — do not modify existing class definitions; add new classes
- **Use CSS variables** from `:root` — do not hardcode colors; use `var(--accent)`, `var(--surface)`, etc.
- **Name new classes with the panel prefix** — e.g. `.vfx-filter-bar`, `.vfx-chip`, `.vfx-drawer`
- **Use `transition`** on interactive elements for micro-animation
- **Test dark background readability** — all text must pass contrast against `var(--bg)` and `var(--surface)`

## Post-implementation checks

After writing the component:

1. **Run `npm run lint`** — confirm 0 TypeScript errors
2. **Run `npm run build`** — confirm the build succeeds
3. **Run browser verification** (see `browser-verification.md`) — confirm the UI renders correctly
4. **Confirm no existing button/panel is broken** — tab bar, Generation panel, VFX panel, Scene Lab, Export panel all still functional
5. **Confirm `VALID_TABS` is consistent** — `workshopPersistence.ts` and `App.tsx` must stay in sync

## Props discipline

- Never add a prop to a panel component without updating the call site in `App.tsx`
- Never remove or rename an existing prop without checking all import sites
- If a prop change would break `WorkshopUIState`, it requires an architecture review first

## Element ID conventions

```
btn-<panel>-<action>          → e.g. btn-vfx-export-catalog
vfx-card-<asset-slot>         → e.g. vfx-card-combat-hit-flash-light
btn-approve-<asset-slot>      → e.g. btn-approve-combat-hit-flash-light
btn-reject-<asset-slot>       → e.g. btn-reject-combat-hit-flash-light
drawer-<asset-slot>           → e.g. drawer-combat-hit-flash-light
btn-copy-brief-<asset-slot>   → e.g. btn-copy-brief-combat-hit-flash-light
```
