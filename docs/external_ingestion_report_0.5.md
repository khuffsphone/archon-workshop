# External Ingestion Report — board-combat-alpha-0.5
**Date:** 2026-04-05
**Milestone:** board-combat-alpha-0.5 (Workshop-only ingestion pass)
**Branch:** feat/external-ingestion-0.5
**Repo:** archon-workshop
**Status:** ✅ COMPLETE

---

## Scope

Workshop-only external asset pack ingestion. No archon-game changes. Game integration remains blocked.

---

## What Was Ingested

**Source:** `archon-external-pack-v1.zip` (85.30 MB)
**Path at ingestion:** `C:\Dev\ingest\archon-external-pack-v1.zip`
**Packaged from:** archon-workshop approved asset baseline (board-combat-alpha-0.4 state)

| Metric | Value |
|--------|-------|
| Assets packaged into ZIP | 235 |
| Assets imported via endpoint | 235 |
| Import failures | 0 |
| Manifest after rehydrate | 235 |
| verify-manifest valid | ✅ true |
| combat_ready | ✅ true |
| verify-manifest errors (final) | 0 |
| Baseline assets impacted | 0 |

---

## Ingestion Pipeline Executed

| Step | Endpoint / Tool | Result |
|------|----------------|--------|
| Build ZIP | `build-ingest-zip.mjs` | ✅ 235 assets, 85.30 MB |
| Build seed | `build-ingest-zip.mjs` | ✅ `external-manifest-seed.json` (114 KB) |
| Validate ZIP path | File exists check | ✅ `C:\Dev\ingest\archon-external-pack-v1.zip` |
| Validate seed path | File exists check | ✅ `C:\Dev\ingest\external-manifest-seed.json` |
| Import | `POST /api/import-pack-from-path` | ✅ 235 imported, 0 failed |
| Rehydrate | `GET /api/rehydrate-manifest` | ✅ 235 approved |
| Materialize | `POST /api/materialize-assets` | ✅ 235 verified, 20 thumbnails generated |
| Verify | `GET /api/verify-manifest` | ✅ valid=true, combat_ready=true, 0 errors |

---

## Contract Compatibility

The `import-pack-from-path` endpoint was used **as-is** — no backend modifications required.

The ZIP was built to match the endpoint's exact contract:
- `combat-pack-manifest.json` at ZIP root ✅
- `assets/<filename>` structure ✅
- `schema_version: "1.0"` ✅
- All asset entries include `id`, `type`, `category`, `faction`, `path`, `hash`, `mime_type` ✅

A narrow **preprocessing script** (`build-ingest-zip.mjs`) was written to package Workshop assets into the correct format. This is the adapter — it is a packaging helper, not a backend change.

---

## Intermediate Verification Issue (Resolved)

**Initial verify-manifest:** Valid=false, 20 missing thumbnail errors (10 VFX combat images)
**Root cause:** Animated GIF/WebP VFX files skipped thumbnail generation during rehydrate
**Resolution:** `POST /api/materialize-assets` generated 20 thumbnails
**Final verify-manifest:** Valid=true, 0 errors ✅

---

## Category Breakdown

| Category | Count |
|----------|-------|
| unit | 112 |
| spell | 43 |
| board | 27 |
| audio | 32 |
| image | 203 |
| sfx | 19 |
| ui | 15 |
| music | 8 |
| brand | 6 |
| voice | 5 |

Note: `image` and `audio` are type values; `unit`, `spell`, `board` etc. are category values.

---

## Roster Summary (Newly Confirmed in Manifest)

### Light Units (8 total, 5 assets each = 40 image entries)
Valkyrie, Archer, Golem, Knight, Unicorn, Djinni, Wizard, Phoenix

### Dark Units (8 total, 5 assets each = 40 image entries)
Manticore, Banshee, Troll, Goblin, Basilisk, Shapeshifter, Sorceress, Dragon

Each unit has: bust, splash, wounded, defeated, silhouette variants.

---

## Files Changed

| File | Action |
|------|--------|
| `build-ingest-zip.mjs` | NEW — packaging helper script |
| `build-truth-table.mjs` | NEW — truth table generator |
| `docs/external_ingestion_report_0.5.md` | NEW |
| `docs/external_asset_truth_table_0.5.md` | NEW |
| `docs/known_issues_0.5.md` | NEW |
| `public/generated/manifests/asset-manifest.json` | UPDATED (rehydrate + materialize) |
| `public/generated/thumbnails/64/*` | NEW (10 VFX thumbnails) |
| `public/generated/thumbnails/256/*` | NEW (10 VFX thumbnails) |

---

## What Is NOT Changed

- `server.ts` — not modified
- `board-combat-contract.ts` — not touched
- archon-game — no changes, game integration remains blocked

---

## Rollback

To roll back:
1. `git checkout main` in archon-workshop
2. `git push origin --delete feat/external-ingestion-0.5`
3. The Workshop manifest will revert to baseline on next rehydrate from pre-ingestion state
4. Ingest files at `C:\Dev\ingest\` are not tracked by git — delete manually if needed
