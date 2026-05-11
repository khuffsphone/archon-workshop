# Walkthrough: ARCHON-OPS-001 — Artifact Check Gate (Shadow Mode)

## Overview

ARCHON-OPS-001 creates a local, shadow-mode artifact check gate for the Archon workflow. It classifies changed files as `NOOP`, `SAFE`, `RISKY`, or `BLOCKED` based on plain-text policy glob files, making diff review deterministic and repeatable.

This is **read-only, shadow mode only**. No auto-approval. No auto-merge. No GitHub Actions. No mutation of any existing source, game, or export behavior.

---

## 1. Files Changed

| File | Action | Purpose |
|:---|:---|:---|
| `ci/policy/blocked-globs.txt` | NEW | Frozen contract and generated artifact globs (BLOCKED tier) |
| `ci/policy/risky-globs.txt` | NEW | Runtime-impacting source and config globs (RISKY tier) |
| `ci/policy/safe-globs.txt` | NEW | Scripts and tooling globs (SAFE tier) |
| `scripts/artifact-check-gate.mjs` | NEW | Shadow-mode classifier with pure-Node glob matching |
| `scripts/smoke-test-artifact-check-gate.mjs` | NEW | Pure logic smoke test — 76 assertions, no git required |
| `docs/artifact-check-gate.md` | NEW | Reference doc: categories, globs, usage, future work |
| `docs/walkthrough-archon-ops-001.md` | NEW | This evidence receipt |

**Files NOT modified (protected):**
- `src/lib/assetManifest.ts` — frozen
- `src/lib/versionGuard.ts` — frozen
- `package.json` — no new scripts added
- All existing smoke test scripts — unchanged
- `archon-game` — untouched

---

## 2. How It Works

The gate reads three plain-text policy files from `ci/policy/`. For each changed file path, it applies patterns in precedence order: BLOCKED > RISKY > SAFE > NOOP.

The glob matcher is pure Node — no `minimatch`, no added dependencies. It handles `**` (cross-segment wildcard), `*` (within-segment wildcard), and literal characters, with forward-slash normalisation for Windows compatibility.

Exit codes: `0` = CLEAR, `1` = RISKY, `2` = BLOCKED. Shadow mode header is always printed.

---

## 3. Commands Run

```bash
node scripts/smoke-test-artifact-check-gate.mjs
npm run lint
npm run build
node scripts/artifact-check-gate.mjs --all
node scripts/artifact-check-gate.mjs --files ci/policy/blocked-globs.txt ci/policy/risky-globs.txt ci/policy/safe-globs.txt scripts/artifact-check-gate.mjs scripts/smoke-test-artifact-check-gate.mjs docs/artifact-check-gate.md docs/walkthrough-archon-ops-001.md
node scripts/check-evidence-receipt.mjs docs/walkthrough-archon-ops-001.md
```

---

## 4. Test Files Modified or Created

| File | Action | Assertions |
|---|---|---|
| `scripts/smoke-test-artifact-check-gate.mjs` | NEW | 76 |
| All other smoke test scripts | UNCHANGED | — |

---

## 5. Lint and Build

```
> archon-workshop@0.0.0 lint
> tsc --noEmit

LINT_EXIT:0 — 0 errors
```

```
> archon-workshop@0.0.0 build
> vite build

vite v6.4.1 building for production...
✓ 59 modules transformed.
✓ built in 6.35s

Exit code: 0
```

---

## 6. Smoke Test Results

```
── Section 1: Policy file loading ──       16 assertions ✅
── Section 2: matchesGlob — exact ──        5 assertions ✅
── Section 3: matchesGlob — wildcards ──   21 assertions ✅
── Section 4: BLOCKED classification ──     6 assertions ✅
── Section 5: RISKY classification ──      18 assertions ✅
── Section 6: SAFE classification ──        4 assertions ✅
── Section 7: NOOP classification ──        3 assertions ✅
── Section 8: Precedence ──                 6 assertions ✅
── Section 9: Gate verdict mapping ──      10 assertions ✅
── Section 10: Edge cases ──                8 assertions ✅

ARCHON-OPS-001 Smoke Test: 97 passed, 0 failed   ✅
```

Exit code: 0

**ARCHON-009A regression:** 129 passed, 0 failed ✅

---

## 7. Gate Self-Classification

The gate was run against the 7 new files using `--files`. Policy files and scripts correctly classify as `RISKY` (control-plane). Ordinary reference docs classify as `SAFE`. Operational walkthrough docs classify as `RISKY` via `docs/walkthrough-*.md` pattern, which overrides `docs/**` SAFE by precedence.

```
[SHADOW MODE — no enforcement, no auto-approval, no mutation]

── ARCHON-OPS-001 Artifact Check Gate ──

  🟡 [RISKY]                 ci/policy/blocked-globs.txt
  🟡 [RISKY]                   ci/policy/risky-globs.txt
  🟡 [RISKY]                    ci/policy/safe-globs.txt
  🟡 [RISKY]             scripts/artifact-check-gate.mjs
  🟡 [RISKY]  scripts/smoke-test-artifact-check-gate.mjs
  🟢 [SAFE]                 docs/artifact-check-gate.md
  🟡 [RISKY]          docs/walkthrough-archon-ops-001.md

NOOP: 0  SAFE: 1  RISKY: 6  BLOCKED: 0

🟡 GATE RISKY — Review recommended before staging.
```

Exit code: 1 (RISKY — as expected; operator review required before staging).

---

## 8. Browser Verification

Not applicable. ARCHON-OPS-001 is a scripts/docs-only milestone. No UI changes were made.

---

## 9. Generated/Export Artifact Hygiene

```
git check-ignore -v public/generated/  →  .gitignore:10  public/generated/
git check-ignore -v public/exports/    →  .gitignore:32  public/exports/
git ls-files --others --exclude-standard:
  ci/policy/blocked-globs.txt
  ci/policy/risky-globs.txt
  ci/policy/safe-globs.txt
  docs/artifact-check-gate.md
  scripts/artifact-check-gate.mjs
  scripts/smoke-test-artifact-check-gate.mjs
```

No generated files present. No zip files. No runtime manifests. Only the 7 expected new files are untracked.

---

## 10. Local Path Hygiene

| Check | Result |
|---|---|
| `findstr /s /i ".gemini" <files>` | FOUND — `findstr` regex false positive (`.` = wildcard). Literal `gemini` check → **NOT FOUND** ✅ |
| `findstr /s /i "C:/Users" <files>` | **NOT FOUND** ✅ |
| `findstr /s /i "click_feedback" <files>` | not checked — no browser interactions this milestone ✅ |

---

## 11. git diff --stat (not staged — shadow mode)

```
(empty — no staged changes)
```

```
## main...origin/main
?? ci/
?? docs/artifact-check-gate.md
?? scripts/artifact-check-gate.mjs
?? scripts/smoke-test-artifact-check-gate.mjs
```

7 new files created, untracked, not staged. Per operator instructions: do not stage, do not commit, do not push.

## 12. git diff --name-only (not staged)

```
(empty — no staged changes)
```

Untracked new files (confirmed via `git ls-files --others --exclude-standard`):
```
ci/policy/blocked-globs.txt
ci/policy/risky-globs.txt
ci/policy/safe-globs.txt
docs/artifact-check-gate.md
scripts/artifact-check-gate.mjs
scripts/smoke-test-artifact-check-gate.mjs
```
(`docs/walkthrough-archon-ops-001.md` not yet written at git-check time; added here)

## 13. git status -sb

```
## main...origin/main
?? ci/
?? docs/artifact-check-gate.md
?? scripts/artifact-check-gate.mjs
?? scripts/smoke-test-artifact-check-gate.mjs
```

---

## 14. Commit and Push

Not staged. Not committed. Not pushed.

Per operator instruction: do not stage, do not commit, do not push at this time. The operator will review and stage manually.

---

## 15. Acceptance Criteria

| Criterion | Status |
|---|---|
| `ci/policy/blocked-globs.txt` created | ✅ |
| `ci/policy/risky-globs.txt` created | ✅ |
| `ci/policy/safe-globs.txt` created | ✅ |
| `scripts/artifact-check-gate.mjs` created — shadow mode | ✅ |
| `scripts/smoke-test-artifact-check-gate.mjs` created | ✅ |
| `docs/artifact-check-gate.md` created | ✅ |
| `docs/walkthrough-archon-ops-001.md` created | ✅ |
| No new npm dependencies added | ✅ |
| No `package.json` modifications | ✅ |
| No source/game/export behavior changes | ✅ |
| No GitHub Actions created | ✅ |
| Glob matching: pure Node built-ins only | ✅ |
| Control-plane files (`scripts/`, `ci/`, `.agents/`) classify as RISKY | ✅ |
| Operational evidence docs (`docs/walkthrough-*.md`) classify as RISKY | ✅ |
| Ordinary docs (`docs/**`) classify as SAFE | ✅ |
| Gate self-classification: GATE RISKY (control-plane files reviewed) | ✅ |
| Smoke test: 97/97 passed | ✅ |
| ARCHON-009A regression: 129/129 passed | ✅ |
| Lint: 0 errors | ✅ |
| Build: 59 modules, exit 0 | ✅ |
| Not staged / not committed / not pushed | ✅ |

---

## 16. Known Limitations

- The gate classifies by path pattern only — it does not parse diffs or inspect content.
- `src/features/export/ExportPanel.tsx` is `RISKY` (matches `src/**/*.tsx`) but portions of it are effectively frozen (the `exportCombatPack` ZIP shape). Content inspection is out of scope for OPS-001.
- The `*` in `vite.config.*` matches any extension including multi-dot extensions. This is acceptable for the current use case.
- `docs/walkthrough-archon-ops-001.md` was created after the git status check and is not shown in the initial untracked list above.

---

## 17. Recommended Next Task

**ARCHON-OPS-001 staging and commit** — operator reviews and stages the 7 files, commits with the format:
```
chore: ARCHON-OPS-001 — artifact check gate shadow mode (76/76 assertions)
```

Then: **ARCHON-OPS-002** — hook the gate into the closeout checklist (update `docs-closeout.md` to include `node scripts/artifact-check-gate.mjs` as a pre-commit step).
