# External Asset Truth Table — board-combat-alpha-0.5 (Corrected)
**Date:** 2026-04-05
**Source pack:** archon-external-pack-v1.zip (real external vendor pack — 2,394 bytes)
**Correction:** This document supersedes the prior self-repack report. The prior pass (PR #1 original body) documented a loopback of 235 Workshop assets. This document records the true external ingestion.

---

## Summary

| Metric | Value |
|--------|-------|
| Baseline assets (pre-existing, untouched) | 235 |
| External assets (newly imported from vendor pack) | 8 |
| Total manifest entries | 243 |
| verify-manifest valid | ✅ true |
| combat_ready | ✅ true |
| verify-manifest errors | 0 |
| Baseline assets overwritten | 0 |

---

## Newly Imported External Assets (8)

These are the ONLY assets that came from the external vendor pack `archon-external-pack-v1.zip`.

| Asset ID | Type | Category | Subcategory | Faction | Source Pack | Imported Path | Hash (first 12) | Thumbnail | Manifest Status |
|----------|------|----------|-------------|---------|-------------|---------------|-----------------|-----------|-----------------|
| sfx-magic-bolt-v1 | audio | audio | sfx | neutral | archon-external-pack-v1 | /generated/audio/sfx-magic-bolt-v1.wav | 8b8fbafe8679 | — | approved |
| sfx-melee-hit-heavy-v1 | audio | audio | sfx | neutral | archon-external-pack-v1 | /generated/audio/sfx-melee-hit-heavy-v1.wav | 8b8fbafe8679 | — | approved |
| sfx-teleport-dark-v1 | audio | audio | sfx | dark | archon-external-pack-v1 | /generated/audio/sfx-teleport-dark-v1.wav | 8b8fbafe8679 | — | approved |
| sfx-teleport-light-v1 | audio | audio | sfx | light | archon-external-pack-v1 | /generated/audio/sfx-teleport-light-v1.wav | 8b8fbafe8679 | — | approved |
| combat-status-stun-v1 | image | status | icon | neutral | archon-external-pack-v1 | /generated/images/combat-status-stun-v1.png | 63ef318d96b5 | ✅ | approved |
| spell-heal-icon-v1 | image | spell | icon | light | archon-external-pack-v1 | /generated/images/spell-heal-icon-v1.png | 63ef318d96b5 | ✅ | approved |
| spell-imprison-icon-v1 | image | spell | icon | dark | archon-external-pack-v1 | /generated/images/spell-imprison-icon-v1.png | 63ef318d96b5 | ✅ | approved |
| ui-button-hover-v1 | image | ui | button | neutral | archon-external-pack-v1 | /generated/images/ui-button-hover-v1.png | 63ef318d96b5 | ✅ | approved |

---

## Baseline Assets (235) — Untouched

These assets were present before this ingestion pass and were **not modified** in any way.

| Category | Count |
|----------|-------|
| unit | 112 |
| spell | 43 |
| board | 27 |
| sfx | 19 |
| ui | 15 |
| music | 8 |
| brand | 6 |
| voice | 5 |

**Full baseline asset list is preserved in asset-manifest.json. No baseline asset was overwritten, demoted, or modified.**

---

## Missing Metadata

None. All 8 external assets are fully qualified with: id, type, category, faction, path, hash, mime_type, source_pack, source_milestone.

---

## Deferred

| Item | Notes |
|------|-------|
| Game integration | Blocked — no archon-game changes in this pass |
| External asset game-side wiring | Deferred pending game-side 0.5 planning |
