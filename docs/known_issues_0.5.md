# Known Issues — board-combat-alpha-0.5 (Workshop Ingestion — Corrected)
**Date:** 2026-04-05
**Milestone:** board-combat-alpha-0.5

---

## Fixed In This Milestone

### KI-WS-001 — Prior Ingestion Was a Self-Repack Loop
**Severity:** Critical (incorrect PR documentation)
**Root cause:** First ingestion pass (`57d9603`) repackaged 235 existing Workshop assets and re-imported them — no true external ingestion occurred
**Fix:** Real external pack ingested via narrow adapter `ingest-external-pack.mjs`. 8 real external assets imported. Docs corrected.
**Status:** ✅ Corrected in this commit

---

## Open — Carry Forward

### KI-WS-002 — External Assets Use Versioned IDs (-v1 suffix)
**Severity:** Low
**Description:** All 8 external assets use versioned IDs (`sfx-magic-bolt-v1`, etc.). The Workshop manifest's canonical-ID deduplication logic (`stripVersion`) means a future `sfx-magic-bolt` (unversioned) canonical would conflict. Currently no conflict exists.
**Status:** 🟡 Monitor — safe for now, note for 0.6 roster planning

### KI-WS-003 — External Assets Not Yet Wired to archon-game
**Severity:** N/A (intentional)
**Description:** 8 external assets imported to Workshop. No game-side integration performed.
**Status:** 🔵 Blocked by design — deferred to game-side 0.5 after Workshop PR is merged

### KI-WS-004 — import-pack-from-path Incompatible With External Pack Format
**Severity:** Low (workaround in place)
**Description:** The external ZIP uses `external-manifest-seed.json` and `audio/`/`images/` directories. The server endpoint expects `combat-pack-manifest.json` and `assets/`. A narrow adapter script bridges this gap without modifying server.ts.
**Status:** 🟡 Noted — if future external packs proliferate, the endpoint may need a format flag

---

## Not Applicable / Out of Scope

| Item | Notes |
|------|-------|
| archon-game changes | Out of scope for this pass |
| board-combat-contract.ts | FROZEN — not touched |
| server.ts modifications | Not required |
