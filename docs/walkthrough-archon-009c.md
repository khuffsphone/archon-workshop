# Walkthrough — ARCHON-009C: Export Preview UX Polish

## Summary

Added interactive filter controls, clickable sort headers, and a Copy JSON Report button to the Export Eligibility Preview in `ExportPanel.tsx`. All changes are read-only UI operations derived from the same asset rows. No export behavior, manifest, or game-side files were modified.

---

## 1. Changed Files

| File | Change |
|---|---|
| `src/lib/exportEligibility.ts` | Added `ExportPreviewFilter` type, `applyPreviewFilter` helper, `ExportPreviewSortKey` type, `ExportPreviewSort` interface, `applyPreviewSort` helper |
| `src/features/export/ExportPanel.tsx` | Rewrote `ExportEligibilityPreview` component to add filter pill bar, sortable column headers, count-in-pill display, empty-filter message, row count footer, Copy JSON Report button |
| `scripts/smoke-test-archon-009c.mjs` | New — 37 assertions covering filter and sort helpers |
| `docs/walkthrough-archon-009c.md` | This file |

---

## 2. Test/Smoke Files

| File | Role |
|---|---|
| `scripts/smoke-test-archon-009c.mjs` | New — 37 assertions for `applyPreviewFilter` and `applyPreviewSort` |
| `scripts/smoke-test-archon-008b.mjs` | Regression — 39/39 ✅ |
| `scripts/smoke-test-archon-009a.mjs` | Regression — 129/129 ✅ |
| `scripts/smoke-test-artifact-check-gate.mjs` | Regression — 97/97 ✅ |

---

## 3. UX Changes

### Filter pill bar (`#eligibility-filter-bar`)
- Renders above the table using `role="group"` and `aria-label="Filter eligibility rows"`.
- Buttons: `All`, `Eligible`, `Excluded`, `Protected`. `Rejected` and `Missing File` are conditionally rendered only when at least one row matches.
- Each pill except `All` shows a live count `(n)` derived from `applyPreviewFilter`.
- Active pill has distinct background and border.

### Sortable column headers
- Columns **Asset ID**, **Status**, **Eligible**, **Exclusion Reason** are clickable.
- Clicking the active column toggles asc/desc. Clicking a new column resets to asc.
- Sort indicator: `↑` (asc), `↓` (desc), `⇅` (inactive, muted).

### Copy JSON Report button (`#btn-copy-eligibility-report`)
- Positioned in the summary banner via `marginLeft: auto`.
- Uses `navigator.clipboard.writeText` — no file write, no download.
- Triggers `toast.success` on success, `toast.error` if clipboard unavailable.

### Row count footer
- Shows `Showing X of Y assets` beneath the table.

---

## 4. Helper Design

`applyPreviewFilter` and `applyPreviewSort` in `exportEligibility.ts`:
- Both are pure functions — input arrays not mutated.
- `applyPreviewSort` returns `[...rows].sort(...)` to avoid mutating the source.
- Boolean columns (`eligible`) sort `true`-first on `asc` direction.

---

## 5. Smoke Test Results

```
── Section 1:  applyPreviewFilter — all           2 assertions ✅
── Section 2:  applyPreviewFilter — eligible       3 assertions ✅
── Section 3:  applyPreviewFilter — excluded       2 assertions ✅
── Section 4:  applyPreviewFilter — protected      3 assertions ✅
── Section 5:  applyPreviewFilter — rejected       3 assertions ✅
── Section 6:  applyPreviewFilter — missing_path   3 assertions ✅
── Section 7:  does not mutate input               2 assertions ✅
── Section 8:  empty input                         1 assertion  ✅
── Section 9:  applyPreviewSort — id asc           1 assertion  ✅
── Section 10: applyPreviewSort — id desc          1 assertion  ✅
── Section 11: applyPreviewSort — status asc       2 assertions ✅
── Section 12: applyPreviewSort — eligible asc     2 assertions ✅
── Section 13: applyPreviewSort — eligible desc    2 assertions ✅
── Section 14: applyPreviewSort — reason asc       2 assertions ✅
── Section 15: does not mutate input               1 assertion  ✅
── Section 16: empty input                         1 assertion  ✅
── Section 17: filter + sort composition           3 assertions ✅
── Section 18: filter + sort — eligible by reason  3 assertions ✅

ARCHON-009C Smoke Test: 37 passed, 0 failed   ✅
```

Exit code: 0

---

## 6. Lint and Build

```
> archon-workshop@0.0.0 lint
> tsc --noEmit

LINT_PASS — 0 errors
```

```
> archon-workshop@0.0.0 build
> vite build

vite v6.4.1 building for production...
✓ 59 modules transformed.
✓ built in 11.85s

Exit code: 0
```

---

## 7. Regression Tests

| Suite | Result |
|---|---|
| ARCHON-008B Smoke Test | 39 passed, 0 failed ✅ |
| ARCHON-009A Smoke Test | 129 passed, 0 failed ✅ |
| ARCHON-OPS-001 Smoke Test | 97 passed, 0 failed ✅ |

---

## 8. Playwright Browser Verification

Browser was running at `http://localhost:3000` (dev server already live on port 3000).

| Check | Result |
|---|---|
| `#eligibility-filter-bar` present | ✅ |
| `#eligibility-filter-all` present (aria-pressed=true on load) | ✅ |
| `#eligibility-filter-eligible` present with count `(244)` | ✅ |
| `#eligibility-filter-excluded` present with count `(0)` | ✅ |
| `#eligibility-filter-protected` present with count `(244)` | ✅ |
| `#btn-copy-eligibility-report` present | ✅ |
| `#sort-header-id` present (shows `↑` — sorted asc by default) | ✅ |
| `#sort-header-status` present (shows `⇅`) | ✅ |
| `#sort-header-eligible` present (shows `⇅`) | ✅ |
| `#sort-header-reason` present (shows `⇅`) | ✅ |
| Initial row count footer | `Showing 244 of 244 assets` |
| Eligible filter clicked → row count | 244 (all eligible) |
| Excluded filter clicked → shows | "No assets match the current filter." |
| Protected filter clicked → row count | 244 |
| Asset ID sort header clicked twice → `↓` indicator | ✅ |
| First row in desc sort | `voice-victory` (last alphabetically) |
| Console errors | None |

Recording: `export_preview_ux_009c_1778511024661.webp`

---

## 9. Hygiene

| Check | Result |
|---|---|
| No `.gemini` filesystem path in files | ✅ |
| No `C:/Users` path in files | ✅ |
| No `click_feedback` path in files | ✅ |
| No dependencies added | ✅ |
| No `package.json` changes | ✅ |
| No export behavior changes | ✅ |
| No manifest changes | ✅ |
| No archon-game changes | ✅ |

---

## 10. Acceptance Criteria

| Criterion | Status |
|---|---|
| Filter pill bar added | ✅ |
| Sort headers added (Asset ID, Status, Eligible, Reason) | ✅ |
| Conditional pills for Rejected/Missing File | ✅ |
| Live count per pill | ✅ |
| Sort toggle (asc/desc) | ✅ |
| Copy JSON Report button | ✅ |
| Row count footer | ✅ |
| Empty-filter message | ✅ |
| No filesystem paths exposed | ✅ |
| Export pipeline untouched | ✅ |
| Smoke test: 37/37 passed | ✅ |
| Lint: 0 errors | ✅ |
| Build: exit 0 | ✅ |
| Regressions: all clean | ✅ |
| Playwright: all controls verified | ✅ |
| Not staged / not committed / not pushed | ✅ |

---

## 11. Commands Run

```bash
node --import=tsx/esm scripts/smoke-test-archon-009c.mjs
npm run lint
npm run build
node --import=tsx/esm scripts/smoke-test-archon-008b.mjs
node --import=tsx/esm scripts/smoke-test-archon-009a.mjs
node scripts/artifact-check-gate.mjs --files <changed files>
git diff --stat
git diff --name-only
git status -sb
```

---

## 12. Gate Classification

```
[SHADOW MODE — no enforcement, no auto-approval, no mutation]

── ARCHON-OPS-001 Artifact Check Gate ──

  🟡 [RISKY]   src/features/export/ExportPanel.tsx
  🟡 [RISKY]   src/lib/exportEligibility.ts
  🟡 [RISKY]   scripts/smoke-test-archon-009c.mjs
  🟢 [SAFE]    docs/walkthrough-archon-009c.md

NOOP: 0  SAFE: 1  RISKY: 3  BLOCKED: 0

🟡 GATE RISKY — Review recommended before staging.
```

Exit code: 1 (RISKY — operator review required before staging)

---

## 13. Git Status

```
## main...origin/main
 M src/features/export/ExportPanel.tsx
 M src/lib/exportEligibility.ts
?? scripts/smoke-test-archon-009c.mjs
?? docs/walkthrough-archon-009c.md
```

Not staged. Not committed. Not pushed.

---

## 14. Commit (pending operator approval)

```
chore: ARCHON-009C -- export preview UX polish (filter, sort, 37/37 smoke assertions)
```

Files to stage:
```
src/features/export/ExportPanel.tsx
src/lib/exportEligibility.ts
scripts/smoke-test-archon-009c.mjs
docs/walkthrough-archon-009c.md
```
