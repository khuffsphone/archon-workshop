# External Ingestion Report — board-combat-alpha-0.5 (Corrected)
**Date:** 2026-04-05
**Milestone:** board-combat-alpha-0.5 (Workshop-only ingestion pass — corrected)
**Branch:** feat/external-ingestion-0.5
**Repo:** archon-workshop
**Status:** ✅ COMPLETE — TRUE EXTERNAL INGESTION

---

## Correction Notice

The first commit on this branch (`57d9603`) documented an incorrect ingestion pass:
- `build-ingest-zip.mjs` repackaged all 235 existing Workshop assets into a ZIP and imported them back (self-repack loop)
- This was **not** an external ingestion — it was a loopback
- That commit is superseded by the current corrected pass

This document reflects the **true external ingestion** using the real vendor pack on disk.

---

## Real Input Files

| File | Path | Size | Modified |
|------|------|------|----------|
| ZIP | `C:\Dev\ingest\archon-external-pack-v1.zip` | **2,394 bytes** | 2026-04-05 14:48:59 |
| Seed | `C:\Dev\ingest\external-manifest-seed.json` | **1,844 bytes** | 2026-04-05 14:48:59 |

---

## Contract Compatibility Assessment

The real ZIP uses a **different structure** than `import-pack-from-path` expects:

| Difference | Real ZIP | Endpoint Expects |
|------------|----------|-----------------|
| Manifest filename | `external-manifest-seed.json` | `combat-pack-manifest.json` |
| Asset directories | `audio/`, `images/` | `assets/` |

**Decision:** Narrow adapter implemented — `ingest-external-pack.mjs`
- No changes to `server.ts`
- No backend redesign
- Adapter reads ZIP directly, extracts to correct Workshop dirs, appends to live manifest

---

## What Was Ingested

**8 external assets from `archon-external-pack-v1`:**

| Asset ID | Type | Category | Faction |
|----------|------|----------|---------|
| sfx-magic-bolt-v1 | audio | sfx | neutral |
| sfx-melee-hit-heavy-v1 | audio | sfx | neutral |
| sfx-teleport-dark-v1 | audio | dark | dark |
| sfx-teleport-light-v1 | audio | sfx | light |
| combat-status-stun-v1 | image | status | neutral |
| spell-heal-icon-v1 | image | spell | light |
| spell-imprison-icon-v1 | image | spell | dark |
| ui-button-hover-v1 | image | ui | neutral |

---

## What Was Preserved (Baseline)

**235 baseline assets — zero overwritten, zero demoted, zero modified.**

The adapter uses append-only logic: it never touches existing manifest entries.

---

## Ingestion Pipeline

| Step | Tool / Endpoint | Result |
|------|----------------|--------|
| Validate inputs | File existence check | ✅ Both files present, non-zero |
| Contract check | ZIP structure inspection | ⚠ Incompatible → narrow adapter used |
| Extract + copy | `ingest-external-pack.mjs` | ✅ 8 imported, 0 failed |
| Manifest append | `ingest-external-pack.mjs` | ✅ Appended 8 entries (source_pack tagged) |
| Thumbnail generate | `verify-manifest-local.mjs` | ✅ 8 thumbnails generated for image assets |
| Verify manifest | `verify-manifest-local.mjs` | ✅ valid=true, combat_ready=true, 0 errors |

---

## Verify-Manifest Results

```
valid:         true
combat_ready:  true
error_count:   0
Baseline (no source_pack): 235
External (source_pack set): 8
Total: 243
```

---

## Files Changed

| File | Action |
|------|--------|
| `ingest-external-pack.mjs` | NEW — narrow ingestion adapter |
| `verify-manifest-local.mjs` | NEW — local verify without HTTP server |
| `build-truth-table.mjs` | UPDATED — corrected to distinguish baseline vs external |
| `docs/external_ingestion_report_0.5.md` | UPDATED — this file |
| `docs/external_asset_truth_table_0.5.md` | UPDATED — 8 external rows, baseline summary |
| `docs/known_issues_0.5.md` | UPDATED |
| `docs/phase0_input_validation_0.5.md` | NEW |
| `public/generated/manifests/asset-manifest.json` | UPDATED (gitignored — not committed) |

---

## What Is NOT Changed

- `server.ts` — not modified
- `board-combat-contract.ts` — FROZEN
- archon-game — no changes, blocked
- Any baseline asset file — untouched

---

## Rollback

1. Remove the 8 external asset files from `public/generated/audio/` and `public/generated/images/`
2. Revert asset-manifest.json to remove the 8 external entries (filter by `source_pack: 'archon-external-pack-v1'`)
3. No server.ts changes to revert
4. Delete `ingest-external-pack.mjs` and `verify-manifest-local.mjs`
