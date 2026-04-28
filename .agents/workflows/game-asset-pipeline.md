# Workflow: Game Asset Pipeline

**Trigger:** Any task that touches asset generation, approval, manifest writing, or export to `archon-game`.

**Purpose:** Ensure the asset pipeline remains correct, non-destructive, and consumer-compatible at every step.

---

## Golden rules (never negotiate these)

1. **Never overwrite an approved asset.** If `asset.status === 'approved'`, the existing file is production data. Regeneration requires explicit operator instruction.
2. **Never auto-approve.** Approval requires human review (Scene Lab review pass + explicit approve button click).
3. **Never write to `asset-manifest.json` from client-side code.** Only `server.ts` API endpoints write manifest data.
4. **Never change `COMBAT_PACK_SCHEMA_VERSION`** without explicit operator approval and freeze-list acknowledgment.
5. **Never change `CombatPackManifest`** without coordinating with `archon-game` consumer expectations.

## Before generating assets

1. Check the asset's current status: `pending` / `approved` / `failed` / `recoverable_failed`
2. Only generate assets with status `pending` or `failed` unless explicitly directed otherwise
3. Confirm the asset's `id` exists in the manifest — do not generate for IDs not in `INITIAL_ASSETS` or the expansion assets list
4. Confirm the generation model is appropriate for the asset category (image → Gemini image model; audio → Lyria; voice → TTS)

## After generation

1. Confirm the generated file exists and is non-zero bytes
2. Confirm the manifest was updated with the new `path`, `thumbnail_256`, and `status`
3. Do not mark `status: approved` — leave it as `pending` for human review
4. Log the generation event with asset ID, model used, and result

## Export flow — what is frozen

Do not change:
- `exportFullPack` function behavior
- `exportCombatPack` function behavior
- ZIP file structure (directory layout inside the archive)
- `CombatPackManifest` shape
- `CombatPackAsset` shape
- `COMBAT_PACK_SCHEMA_VERSION` value

Adding new export buttons for different formats (e.g. workshop state) is acceptable, as long as the existing export functions are not modified.

## Import flow — what is frozen

- `importPack` must continue to accept the same ZIP structure it currently expects
- Any changes to import behavior require freeze-list acknowledgment for `workshop-export-contract`

## Persistence scope

Workshop UI state persistence (`workspace-state.json` via `workshopPersistence.ts`) covers only UI configuration — tabs, presets, review notes, style locks. It does not and must not contain:
- Asset file paths
- Generated blobs
- Manifest data
- Any `archon-game` consumer contract data

## Verification after pipeline work

```powershell
npm run lint           # 0 errors
npm run build          # exit 0
# verify manifest file is valid JSON
node -e "JSON.parse(require('fs').readFileSync('public/generated/manifests/asset-manifest.json','utf8')); console.log('manifest OK')"
```
