# Artifact Check Gate — ARCHON-OPS-001

## Purpose

The artifact check gate is a **local, shadow-mode classifier** that answers the following questions about a diff before staging:

- Is any changed file a frozen contract or generated artifact? → **BLOCKED**
- Is any changed file runtime-impacting source or config? → **RISKY**
- Is any changed file implementation-isolated tooling? → **SAFE**
- Is any changed file docs or config with zero runtime impact? → **NOOP**

> [!IMPORTANT]
> This is **shadow mode only**. The gate does not auto-approve, auto-merge, block git operations, or enforce anything. It is a visibility and review acceleration tool. The operator retains full control.

---

## Risk Categories

| Category | Meaning | Action required |
|:---|:---|:---|
| `BLOCKED` | Frozen contract or generated artifact. Must not be staged without a freeze-list override (see `rules/12-contract-protection.md`). | Stop. Review. Provide override phrase if intentional. |
| `RISKY` | Runtime source, build config, **and all control-plane files**: `scripts/`, `ci/policy/`, `.agents/`, and operational evidence docs (`docs/walkthrough-*.md`). | Review diff carefully. Run lint + build + smoke. |
| `SAFE` | Ordinary documentation (`docs/**`) that is not an operational evidence doc. | Review recommended, not blocking. |
| `NOOP` | Files not matching any policy glob. Truly no-impact. | No review required for classification purposes. |

**Precedence:** `BLOCKED` > `RISKY` > `SAFE` > `NOOP`

A file matching both `BLOCKED` and `RISKY` patterns is always classified `BLOCKED`.

---

## Exit Codes

| Code | Verdict | Meaning |
|---|---|---|
| `0` | `GATE CLEAR` | All files are NOOP or SAFE |
| `1` | `GATE RISKY` | At least one RISKY file; no BLOCKED files |
| `2` | `GATE BLOCKED` | At least one BLOCKED file |

---

## Usage

```bash
# Classify staged files (default)
node scripts/artifact-check-gate.mjs

# Classify unstaged changes
node scripts/artifact-check-gate.mjs --unstaged

# Classify all changes vs HEAD
node scripts/artifact-check-gate.mjs --all

# Classify specific file paths
node scripts/artifact-check-gate.mjs --files src/lib/assetManifest.ts server.ts
```

---

## Policy Files

Located in `ci/policy/`. Plain text, one glob per line. Lines starting with `#` are comments.

| File | Category | Contents |
|:---|:---|:---|
| `blocked-globs.txt` | BLOCKED | Frozen contracts (`src/lib/assetManifest.ts`, `src/lib/versionGuard.ts`) and generated artifact directories (`public/generated/**`, `public/exports/**`, `**/*.zip`) |
| `risky-globs.txt` | RISKY | Source TypeScript/TSX (`src/**/*.ts`, `src/**/*.tsx`), server entry (`server.ts`), build config (`vite.config.*`, `tsconfig*.json`), package files, `.gitignore`, **and all control-plane files**: `scripts/**`, `ci/**`, `.agents/**`, `docs/walkthrough-*.md` |
| `safe-globs.txt` | SAFE | Ordinary documentation (`docs/**`). Operational evidence docs (`docs/walkthrough-*.md`) are RISKY via `risky-globs.txt` and take precedence. |

> [!IMPORTANT]
> **Control-plane rationale:** `scripts/`, `ci/policy/`, and `.agents/` files define *how the gate and review process operate*. Changing them alters enforcement behavior and requires the same scrutiny as source code. They are `RISKY`, not `SAFE`.

Files not matching any policy glob are classified **NOOP**.

---

## Glob Pattern Syntax

The gate uses pure Node built-ins — no npm dependencies.

| Pattern | Meaning |
|:---|:---|
| `src/lib/assetManifest.ts` | Exact file path |
| `src/**/*.ts` | Any `.ts` file under `src/`, at any depth |
| `public/generated/**` | Any file under `public/generated/`, at any depth |
| `**/*.zip` | Any `.zip` file, in any directory |
| `tsconfig*.json` | Any file matching `tsconfig` prefix + `.json` suffix |
| `vite.config.*` | `vite.config.` followed by any extension |

Path separators are normalised to forward slashes regardless of OS.

---

## Workflow Integration (Shadow Mode)

Run the gate before `git add` as a review aid:

```bash
# 1. Review what would change
node scripts/artifact-check-gate.mjs --all

# 2. If GATE CLEAR or GATE RISKY — proceed with normal review
# 3. If GATE BLOCKED — do not stage until freeze-list override confirmed
#    See: .agents/rules/12-contract-protection.md

# 4. Run required verification
npm run lint
npm run build
node scripts/smoke-test-<task-id>.mjs

# 5. Stage only expected files
git add <explicit-file-list>
git diff --cached --stat
git status -sb
```

---

## What the Gate Does NOT Do

- Does not run `git add`, `git commit`, or `git push`
- Does not modify any file
- Does not connect to GitHub
- Does not create PR comments or labels
- Does not enforce anything in CI (no GitHub Actions)
- Does not replace lint, build, or smoke test verification
- Does not replace operator review

---

## Extending the Policy

To add a new blocked path, append a glob to `ci/policy/blocked-globs.txt` and add a corresponding assertion to `scripts/smoke-test-artifact-check-gate.mjs`.

Follow the same pattern for risky and safe additions.

Always re-run the smoke test after any policy change:

```bash
node scripts/smoke-test-artifact-check-gate.mjs
```

---

## Future Work (Out of Scope for ARCHON-OPS-001)

- GitHub Actions integration (future ARCHON-OPS-002)
- PR comment annotation
- `npm run gate` script alias in `package.json`
- Per-diff report artifact written to disk
- Integration with `check-evidence-receipt.mjs` for combined closeout validation
