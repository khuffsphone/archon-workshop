# Known Issues — board-combat-alpha-0.5 (Workshop Ingestion)
**Date:** 2026-04-05
**Milestone:** board-combat-alpha-0.5

---

## Fixed In This Milestone

### KI-WS-001 — VFX Thumbnails Missing After Rehydrate
**Severity:** Low (blocked verify-manifest from reporting valid=true)
**Root cause:** 10 animated VFX combat images skipped thumbnail generation during `rehydrate-manifest`
**Fix:** `materialize-assets` endpoint generated 20 thumbnails (64px and 256px variants)
**Status:** ✅ Fixed — verify-manifest valid=true, 0 errors

---

## Open — Carry Forward

### KI-WS-002 — external-manifest-seed.json Not Consumed by Ingestion Endpoint
**Severity:** Low (metadata completeness gap)
**Description:** The `import-pack-from-path` endpoint does not read `external-manifest-seed.json`. Seed metadata (descriptions, stage, tags, subcategory) is not yet merged into the live manifest. Current manifest uses auto-classification from `rehydrate-manifest` ID-prefix heuristics.
**Impact:** Asset metadata is functional but some description/tag fields are sparse
**Status:** 🟡 Deferred — requires a reconcile script (`reconcile-external-seed.mjs`)
**Owner:** Workshop tooling — can be done in a follow-up commit to this branch

### KI-WS-003 — 8 New Unit Types Not Classified for Game Integration
**Severity:** N/A (Workshop only milestone)
**Description:** Valkyrie, Archer, Golem, Unicorn, Djinni, Wizard, Phoenix (light) and Manticore, Banshee, Troll, Goblin, Basilisk, Shapeshifter, Dragon (dark) are imported and approved in Workshop but have no corresponding game-side roster entries.
**Impact:** Zero — game integration is intentionally blocked in this pass
**Status:** 🔵 Deferred to game-side 0.5 (post-Workshop-ingestion verification)

### KI-WS-004 — Spell / Barrier / Board Tile Classification Sparse
**Severity:** Low
**Description:** 43 spell assets and 27 board assets are imported with auto-classification. Some may need manual subcategory or stage review.
**Impact:** Workshop display only — no gameplay impact
**Status:** 🟡 Deferred — content review pass recommended before game integration

---

## Not Applicable / Out of Scope

| Item | Notes |
|------|-------|
| archon-game changes | Out of scope for this pass |
| board-combat-contract.ts | FROZEN — not touched |
| server.ts modifications | Not required — existing endpoint used as-is |
