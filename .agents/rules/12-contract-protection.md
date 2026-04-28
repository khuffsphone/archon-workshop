# Contract Protection — Archon Workshop

> Non-negotiable. These paths are frozen unless the operator provides an explicit freeze-list acknowledgment.

## Frozen paths — archon-workshop

| Path / Pattern | Reason |
|---|---|
| `src/lib/assetManifest.ts` | Asset manifest schema — changing it can break all generated asset records |
| `src/lib/versionGuard.ts` | Schema version enforcement — changing it can silently accept invalid data |
| `public/generated/manifests/asset-manifest.json` | Live asset data — do not overwrite, only the server pipeline writes this |
| `CombatPackManifest` interface | Game consumer contract — any change must be coordinated with archon-game |
| `COMBAT_PACK_SCHEMA_VERSION` constant | Version sentinel for downstream ingestion — never change silently |
| ZIP export structure (ExportPanel) | `exportFullPack` / `exportCombatPack` — format changes break archon-game ingestion |
| `importPack` behavior | Same downstream consumer risk |

## Frozen paths — archon-game (always off-limits from this repo)

Do not touch any file under `archon-game/` from within `archon-workshop` tasks unless an explicit cross-repo change is approved by the operator and documented in the task plan.

## What "frozen" means

- Do not modify these files as a side effect of another task
- Do not refactor them "while you're in there"
- If a task genuinely requires touching a frozen path, stop and state the requirement before proceeding

## Freeze-list acknowledgment format

When a task requires touching a protected path, the operator's task prompt or approval must contain a phrase like:

> `"freeze-list override approved for workshop-export-contract"`

The phrase must directly name the protected item ID or label. A generic phrase (`"override approved"`) does not satisfy the check. A phrase naming a different item does not satisfy the check.

## Checking your own work

Before committing:
1. Run `git diff --stat` and review every modified file
2. Confirm each file in the diff was listed in the confirmed plan
3. Confirm no frozen path appears in the diff without an explicit acknowledgment
4. If a frozen file appears unexpectedly, do not commit — report it
