# Walkthrough: ARCHON-009A Game-Side Consumption Smoke Test

## Overview

This milestone proves that `archon-game` can safely consume the current approved VFX assets from `archon-workshop` under the modern asset IDs — without schema drift, stale ID contamination, or hash inconsistency.

ARCHON-009A replaces the previously proposed generation pass. That generation pass was cancelled because all four modern VFX IDs were already generated, approved, protected, path-backed, and present in the game manifest. No generation was needed.

This milestone is **read-only**. No source code was modified in either repo.

---

## 1. Files Changed

| File | Action | Description |
|:---|:---|:---|
| `scripts/smoke-test-archon-009a.mjs` | NEW | Cross-repo consumption smoke test |
| `docs/walkthrough-archon-009a.md` | NEW | This evidence receipt |

*(No source files modified. No manifests modified. No assets generated or copied.)*

---

## 2. Commands Run

```bash
node scripts/smoke-test-archon-009a.mjs
npm run lint
node --import=tsx/esm scripts/smoke-test-archon-008d.mjs
node --import=tsx/esm scripts/smoke-test-archon-008b.mjs
git add scripts/smoke-test-archon-009a.mjs docs/walkthrough-archon-009a.md
git diff --cached --stat
git diff --cached --name-only
git status -sb
git commit -m "..."
git push origin main
git log --oneline -3
```

---

## 3. Test Files Modified or Created

| File | Assertions |
|---|---|
| `scripts/smoke-test-archon-009a.mjs` | 129 |

---

## 4. Lint and Build

```
> archon-workshop@0.0.0 lint
> tsc --noEmit

Exit code: 0  —  0 errors
```

---

## 5. Smoke Test Results

```
ARCHON-009A Smoke Test: 129 passed, 0 failed   ✅
ARCHON-008D Smoke Test:  54 passed, 0 failed   ✅
ARCHON-008B Smoke Test:  39 passed, 0 failed   ✅
```

Exit code: 0 (all scripts)

### Full 009A section breakdown

| Section | Description | Result |
|---|---|---|
| 1 | Workshop modern VFX readiness | ✅ |
| 2 | Workshop stale/zombie ID absence | ✅ |
| 3 | Game manifest schema contract | ✅ |
| 4 | Modern ID presence in game manifest | ✅ |
| 5 | Hash consistency (workshop ↔ game) | ✅ |
| 6 | Stale ID absence in game manifest | ✅ |
| 7 | `CombatPackAsset` shape validation | ✅ |
| 8 | `combat-hit-flash-dark` inconsistency classification | ✅ |

---

## 6. Browser Verification

Not applicable for this milestone. ARCHON-009A is a read-only file-system smoke test. The prior browser verification (ARCHON-008E) confirmed Export Eligibility Preview shows `✅ Combat Ready` with all 4 modern IDs eligible. That finding stands.

---

## 7. Key Findings Confirmed by Smoke Test

### Modern IDs

All four modern IDs exist in both the workshop `asset-manifest.json` and the game `combat-pack-manifest.json`:

| ID | Workshop status | Workshop path | Game path | Hashes match |
|---|---|---|---|---|
| `combat-hit-flash-light` | `approved` | `/generated/images/combat-hit-flash-light-v1.png` | `/assets/combat-hit-flash-light-v1.png` | ✅ |
| `combat-hit-flash-dark` | `approved` | `/generated/images/combat-hit-flash-dark-v1.png` | `/assets/combat-hit-flash-dark-v1.png` | ✅ |
| `combat-death-burst-light` | `approved` | `/generated/images/combat-death-burst-light-v1.png` | `/assets/combat-death-burst-light-v1.png` | ✅ |
| `combat-death-burst-dark` | `approved` | `/generated/images/combat-death-burst-dark-v1.png` | `/assets/combat-death-burst-dark-v1.png` | ✅ |

### Stale IDs

All 7 zombie IDs are absent from both manifests:

```
combat-hit-flash-light-medium  — ABSENT in workshop ✅  ABSENT in game ✅
combat-hit-flash-dark-medium   — ABSENT in workshop ✅  ABSENT in game ✅
combat-impact-spark-medium     — ABSENT in workshop ✅  ABSENT in game ✅
combat-death-light             — ABSENT in workshop ✅  ABSENT in game ✅
combat-death-dark              — ABSENT in workshop ✅  ABSENT in game ✅
combat-nova-light              — ABSENT in workshop ✅  ABSENT in game ✅
combat-nova-dark               — ABSENT in workshop ✅  ABSENT in game ✅
```

### Schema contract

- `schema_version: "1.0"` — matches `COMBAT_PACK_SCHEMA_VERSION` — ✅
- `CombatPackAsset` shape fields all present for each of the 4 VFX assets — ✅
- Game manifest entries carry **no workshop-internal fields** (`status`, `asset_protected`, `candidate_versions`, `approved_version`, `retry_count`, `notes`) — ✅

### `combat-hit-flash-dark` notes inconsistency — classified

| Field | Value |
|---|---|
| `status` (workshop) | `"approved"` |
| `notes` (workshop) | Contains rejected-language (`"Rejected during curation pass"`) |
| `notes` (game manifest) | **Not present** (not part of `CombatPackAsset`) |
| Export eligibility impact | **None** — `isExportEligible` evaluates `status`, not `notes` |
| Game consumption impact | **None** — notes never included in game manifest |
| Hash match | ✅ |

**Verdict**: The inconsistency is a workshop-internal metadata issue only. It does not block export or game consumption. A future data cleanup pass may correct the `notes` field, but it is not a blocker.

---

## 8. Generated/Export Artifact Hygiene

```bash
$ git check-ignore -v public/generated/
.gitignore:10:public/generated/  public/generated/

$ git ls-files --others --exclude-standard
(no output — nothing untracked)
```

No generated files staged. No runtime manifests modified.

---

## 9. git diff --stat (pre-commit)

```
 scripts/smoke-test-archon-009a.mjs  | 229 ++++++++++++++++++++++++++++++
 docs/walkthrough-archon-009a.md     | (new file)
 2 files changed, (new files)
```

## 10. git diff --name-only (pre-commit)

```
docs/walkthrough-archon-009a.md
scripts/smoke-test-archon-009a.mjs
```

## 11. git status -sb (pre-commit)

```
## main...origin/main
?? docs/walkthrough-archon-009a.md
?? scripts/smoke-test-archon-009a.mjs
```

---

## 12. Commit and Push

```bash
git add scripts/smoke-test-archon-009a.mjs docs/walkthrough-archon-009a.md
git commit -m "feat: ARCHON-009A game-side consumption smoke test - 129 assertions pass"
git push origin main
```

Pushed: yes — main
