# ARCHON-009B — Game Asset Sync Runbook

## Purpose

This runbook describes how to safely verify and manually refresh `archon-game` binary assets and its static combat pack manifest when new or updated assets are approved in `archon-workshop`.

This document was authored at the ARCHON-009B milestone. It reflects the current state as of commit `dfabb50` (archon-workshop) and `57ee79a` (archon-game).

---

## 1. Current Baseline State

As of ARCHON-009B, the game-side assets are **up to date**. No immediate sync is needed.

### Modern VFX IDs — verified 2026-05-04

All 4 modern combat VFX assets are present, git-tracked, and hash-consistent across both repos.

| Asset ID | Game file | Workshop source | Hash (first 16 chars) |
|:---|:---|:---|:---|
| `combat-hit-flash-light` | `public/assets/combat-hit-flash-light-v1.png` | `public/generated/images/combat-hit-flash-light-v1.png` | `72ffd4590eeaf68a` |
| `combat-hit-flash-dark` | `public/assets/combat-hit-flash-dark-v1.png` | `public/generated/images/combat-hit-flash-dark-v1.png` | `8c771bee25f4fc30` |
| `combat-death-burst-light` | `public/assets/combat-death-burst-light-v1.png` | `public/generated/images/combat-death-burst-light-v1.png` | `c5e26053674c23ab` |
| `combat-death-burst-dark` | `public/assets/combat-death-burst-dark-v1.png` | `public/generated/images/combat-death-burst-dark-v1.png` | `86618a66e6b1ce97` |

The full hash baseline is recorded in `archon-game/src/combat-pack-manifest.json`.

### Repository paths

| Repo | Tracked assets | Manifest location |
|:---|:---|:---|
| `archon-workshop` | `public/generated/images/` — **gitignored** | `public/generated/manifests/asset-manifest.json` — **gitignored** |
| `archon-game` | `public/assets/` — **git-tracked** | `src/combat-pack-manifest.json` — **git-tracked** |

> [!IMPORTANT]
> Workshop-generated files are never committed to the workshop repo. The canonical source of truth for asset status is the workshop's in-memory/generated manifest, not git history.

---

## 2. When to Refresh

Refresh game-side assets when **all of the following are true**:

1. One or more assets in the workshop have been **re-generated** with an updated image (new candidate version)
2. The new version has been **approved** and marked `asset_protected: true`
3. The asset's **hash has changed** from the value currently in `archon-game/src/combat-pack-manifest.json`
4. The asset is **export-eligible** (status `"approved"` + non-empty path)

Do **not** refresh because:
- An asset exists in the workshop but has `status: "pending"`, `"rejected"`, or `"generating"`
- The notes field changed but status and hash are unchanged
- An asset exists in `asset-manifest.json` but is not in `COMBAT_SLICE_REQUIRED_IDS`

---

## 3. Manual Refresh Workflow

Work through each step in order. Do not skip steps.

### Step 1 — Identify eligible workshop assets

Open the workshop UI (`npm run dev` in `archon-workshop`) and navigate to the Export Eligibility Preview. Confirm the target asset shows:

- `status: approved`
- `Export: ✅ Eligible`
- `Protected: ✅`

Alternatively, inspect `public/generated/manifests/asset-manifest.json` directly:

```bash
# In archon-workshop — read the manifest entry for the target ID
node -e "
import fs from 'fs';
const m = JSON.parse(fs.readFileSync('public/generated/manifests/asset-manifest.json', 'utf8'));
const a = m.assets.find(x => x.id === 'ASSET_ID_HERE');
console.log(JSON.stringify({ status: a?.status, protected: a?.asset_protected, path: a?.path, hash: a?.hash }, null, 2));
"
```

**Gate:** If `status !== "approved"` or `path` is empty, **stop**. Do not copy.

### Step 2 — Locate the workshop source file

Workshop images are at:

```
C:\Dev\archon-workshop\public\generated\images\<id>-v1.png
```

Verify the file exists and is non-empty:

```cmd
dir C:\Dev\archon-workshop\public\generated\images\<id>-v1.png
```

**Gate:** If the file is missing or 0 bytes, **stop**. Re-generate from the workshop UI first.

### Step 3 — Compare hashes

Get the workshop hash from the manifest (from Step 1). Get the game-side hash from `archon-game/src/combat-pack-manifest.json`:

```bash
# In archon-game
node -e "
import fs from 'fs';
const m = JSON.parse(fs.readFileSync('src/combat-pack-manifest.json', 'utf8'));
const a = m.assets.find(x => x.id === 'ASSET_ID_HERE');
console.log('game hash:', a?.hash);
"
```

Compare manually. If the hashes match, **the file does not need to be copied** — skip to Step 7 and confirm no action is needed.

If the hashes differ, proceed to Step 4.

### Step 4 — Copy the asset file

Copy the source file from the workshop to the game:

```cmd
copy C:\Dev\archon-workshop\public\generated\images\<id>-v1.png ^
     C:\Dev\archon-game\public\assets\<id>-v1.png
```

> [!WARNING]
> Do **not** use `xcopy /s` or `robocopy` across entire directories. Copy only the specific file(s) that passed Steps 1–3.

Verify the copy completed:

```cmd
dir C:\Dev\archon-game\public\assets\<id>-v1.png
```

### Step 5 — Update the game manifest

If any asset file was updated in Step 4, the game's `src/combat-pack-manifest.json` must be refreshed to reflect the new hash and `generated_at` timestamp.

The safest method is to trigger a fresh export from the workshop and extract the manifest from the ZIP:

1. In the workshop UI, click **Export Combat Pack**
2. Open the downloaded ZIP
3. Extract `combat-pack-manifest.json` from the ZIP
4. Copy it to `C:\Dev\archon-game\src\combat-pack-manifest.json`

> [!CAUTION]
> Do **not** hand-edit `combat-pack-manifest.json`. Do not change `schema_version`. Do not add or remove fields. Replace the file wholesale from the ZIP export only.

If the Workshop UI is unavailable, the manifest can be constructed from the server route — but this requires the dev server to be running. See the workshop's `server.ts` route `POST /api/export-combat-pack` for the exact shape.

### Step 6 — Run the cross-repo smoke test

From `archon-workshop`:

```bash
node scripts/smoke-test-archon-009a.mjs
```

Expected: `ARCHON-009A Smoke Test: 129 passed, 0 failed`

If any assertion fails, **do not stage or commit**. Diagnose the failure before proceeding.

### Step 7 — Run the game lint and tests

From `archon-game`:

```bash
npm run lint
npm run test:run
```

Expected: `0 errors`, `552 passed (552)`

If any test fails, **do not stage or commit**.

### Step 8 — Stage and commit game-side changes

Review **only the files that changed** before staging:

```bash
cd C:\Dev\archon-game
git status -sb
```

Stage only the updated files explicitly — never use `git add .`:

```bash
git add public/assets/<id>-v1.png           # only updated asset files
git add src/combat-pack-manifest.json       # only if manifest was refreshed
git diff --cached --stat                    # review before committing
git commit -m "assets: refresh <id> from workshop ARCHON-<milestone>"
git push origin main
```

> [!CAUTION]
> **Do not stage any other files.** Do not stage `dist/`, `node_modules/`, or any generated file. Do not use `git add -A` or `git add .`.

---

## 4. Guardrails — Do Not Violate

| Guardrail | Reason |
|:---|:---|
| Never copy assets with `status !== "approved"` | Unreviewed or rejected assets must not ship |
| Never copy without hash comparison (Step 3) | Skipping this misses silent corruption |
| Never hand-edit `combat-pack-manifest.json` | The manifest shape is a protected contract |
| Never alter `COMBAT_PACK_SCHEMA_VERSION` | Schema bumps require a separate milestone |
| Never stage binary assets without running Steps 6 and 7 | Broken game = blocked release |
| Never use `git add .` in either repo | Risks staging workshop-internal files or generated artifacts |
| Never copy from workshop `public/generated/` to game `src/` | Paths and formats are different; game manifest has different shape |
| No game-side source code edits without a separate milestone | Source changes are outside this runbook's scope |

---

## 5. Trigger Criteria for Future ARCHON-009C Option A (Sync Script)

Revisit the decision to remain docs-only if **any of the following** become true:

1. **Repeated manual updates** — more than 2–3 manual sync operations per milestone
2. **Volume** — more than 10–20 assets need refreshing in a single milestone pass
3. **Recurring hash drift** — assets are being re-generated frequently and hashes diverge between syncs
4. **Manual review becomes unreliable** — operator forgets a step or introduces a mismatch that the smoke test catches after the fact
5. **Binary repo size** — `archon-game` grows materially (>50 MB binary tracked files)

At that point, promote to a proper Node sync script (`scripts/sync-combat-pack-to-game.mjs`) with `--dry-run` mode and hash-only comparison.

---

## 6. Long-Term Binary Asset Strategy Note

**Current strategy:** `archon-game/public/assets/` is fully git-tracked. All 74 binary asset files (PNG/WAV/MP3) are committed directly to the game repo.

**Why this is acceptable now:**
- The current asset set is small
- All assets are already committed and working
- Adding infrastructure overhead (Git LFS, external CDN, fetch-on-build) is not justified at this scale

**Reassess if:**
- The game repo exceeds ~50–100 MB in tracked binary assets
- Clone or CI times become slow due to binary history
- Asset versioning becomes complex enough to need proper binary diffing

**Future options (not now):**
- Git LFS for `public/assets/`
- External asset packaging (separate repo, CDN upload, fetch at build time)
- A dedicated `archon-assets` repo with its own versioning and release tags

These are reserved for a later milestone. Do not implement any of these as part of ARCHON-009B.

---

## 7. Reference

| Item | Location |
|:---|:---|
| Workshop asset manifest | `archon-workshop/public/generated/manifests/asset-manifest.json` |
| Game combat pack manifest | `archon-game/src/combat-pack-manifest.json` |
| Game asset files | `archon-game/public/assets/` |
| Cross-repo smoke test | `archon-workshop/scripts/smoke-test-archon-009a.mjs` |
| Workshop export server route | `archon-workshop/server.ts` → `POST /api/export-combat-pack` |
| Workshop export UI | `archon-workshop/src/features/export/ExportPanel.tsx` |
| Required IDs list | `archon-workshop/src/lib/assetManifest.ts` → `COMBAT_SLICE_REQUIRED_IDS` |
| Game loader | `archon-game/src/lib/packLoader.ts` |
| Game schema types | `archon-game/src/lib/types.ts` → `CombatPackManifest`, `CombatPackAsset` |
