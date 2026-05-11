# Walkthrough — ARCHON-010B: Review UI Remediation Controls

## Summary

Added safe review-remediation controls to the Dashboard Approved filter view.
No assets generated. No review statuses changed. No manifests modified.
Resolves the tooling gap discovered during ARCHON-010B browser execution.

---

## 1. Changed Files

| File | Change |
|---|---|
| `src/lib/assetReview.ts` | Added `updateNote` pure helper |
| `src/features/dashboard/DashboardPanel.tsx` | Added `onUpdateNote` prop + remediation panel for approved assets |
| `src/App.tsx` | Imported `updateNote`, added `handleUpdateNote`, wired to Dashboard |
| `scripts/smoke-test-archon-010b.mjs` | New — 39 assertions for `updateNote`, `applyReview`, `isOverwriteEligible`, interaction flows |
| `docs/walkthrough-archon-010b.md` | This file |

No generated files modified. No manifests modified. No source code for archon-game modified.

---

## 2. What Was Added

### `updateNote` (assetReview.ts)

Pure, non-mutating helper. Updates only the `notes` field on an asset.

- Does NOT change `status`
- Does NOT change `asset_protected`
- Does NOT change `updated_at`
- Does NOT change `path` or any version field
- Safe to call on a protected approved asset

Use case: ARCHON-010B metadata-only note correction for `combat-hit-flash-dark`.

### `handleUpdateNote` (App.tsx)

Wires `updateNote` into app state. Calls `saveManifest` after update. Shows a success toast.
No status change. Mirrors the pattern of `handleApprove` and `handleReject`.

### Dashboard Remediation Panel (DashboardPanel.tsx)

When filter is set to **Approved**, each asset card now shows a collapsed `⚙ Remediate` toggle button.

Clicking it expands a two-section panel:

**Section 1 — Note correction (status unchanged):**
- Editable note text input pre-populated with current note
- "Save Note (keep approved)" button → calls `onUpdateNote`
- Does NOT change status or protection

**Section 2 — Reject & unprotect:**
- "Reject (Remediation)" button with **two-click confirmation guard**
- First click: button changes to "Confirm Reject" + "Cancel"
- Second click: calls `onReject` — sets status to `rejected`, clears `asset_protected`
- This unblocks the asset for regeneration in a future pass

---

## 3. Test/Smoke Files

| Script | Assertions | Result |
|---|---|---|
| `scripts/smoke-test-archon-010b.mjs` | **39** | ✅ 39/39 |
| `scripts/smoke-test-archon-009c.mjs` (regression) | 37 | ✅ 37/37 |
| `scripts/smoke-test-archon-009a.mjs` (regression) | 129 | ✅ 129/129 |
| `scripts/smoke-test-archon-008d.mjs` (regression) | 54 | ✅ 54/54 |

---

## 4. Browser Verification

### Browser Verification — Dashboard Remediation Panel

| Check | Result |
|---|---|
| App loaded at `http://localhost:3000` | ✅ |
| Dashboard tab opened | ✅ |
| Approved filter selected | ✅ |
| `btn-dash-remediate-toggle-combat-hit-flash-dark` found | ✅ |
| `btn-dash-remediate-toggle-combat-heal-pulse` found | ✅ |
| `btn-dash-remediate-toggle-combat-ambient-arena` found | ✅ |
| Panel collapsed by default (Save/Reject not visible until toggled) | ✅ |
| Expanding panel for `combat-hit-flash-dark` shows note input, Save Note button, Reject button | ✅ |
| Stale note "Rejected during curation pass" pre-populated in input | ✅ |
| "Last note: Rejected during curation pass" visible in card (italic) | ✅ |
| No console errors introduced | ✅ (1 pre-existing error, unrelated) |

---

## 5. Tooling Gaps Resolved

| Gap | Status |
|---|---|
| UI cannot update note on approved asset | ✅ Resolved — `Save Note (keep approved)` path |
| UI cannot reject approved/protected asset outside Scene Lab list | ✅ Resolved — `Reject (Remediation)` path with confirm guard |

---

## 6. Tooling Gaps That Remain (deferred)

| Gap | Deferred to |
|---|---|
| Scene Lab does not list `combat-heal-pulse` or `combat-ambient-arena` | Out of scope; use Dashboard remediation path |
| No "queued for regen" status field | Future milestone |
| `combat-projectile-light/dark` never generated | ARCHON-010C |

---

## 7. Hygiene

| Check | Result |
|---|---|
| No `.gemini` filesystem path in changed files | ✅ |
| No `C:/Users` path in changed files | ✅ |
| No `click_feedback` string in changed files | ✅ |
| No review status changes made | ✅ |
| No assets generated | ✅ |
| No manifest modified | ✅ |
| No archon-game touched | ✅ |
| No dependencies added | ✅ |
| No package.json changes | ✅ |

---

## 8. Commands Run

```bash
# Lint
npm run lint

# Build
npm run build

# Smoke tests
node --import=tsx/esm scripts/smoke-test-archon-010b.mjs
node --import=tsx/esm scripts/smoke-test-archon-009c.mjs
node --import=tsx/esm scripts/smoke-test-archon-009a.mjs
node --import=tsx/esm scripts/smoke-test-archon-008d.mjs

# Artifact gate
node scripts/artifact-check-gate.mjs --all

# Hygiene
findstr /s /i ".gemini" src\lib\assetReview.ts src\features\dashboard\DashboardPanel.tsx src\App.tsx
findstr /s /i "C:/Users" src\lib\assetReview.ts src\features\dashboard\DashboardPanel.tsx src\App.tsx

# Git status
git diff --stat
git diff --name-only
git status -uall --short
git status -sb
```

---

## 9. Gate Classification

```
[SHADOW MODE — no enforcement, no auto-approval, no mutation]

── ARCHON-OPS-001 Artifact Check Gate ──

  🟡 [RISKY]  src/App.tsx
  🟡 [RISKY]  src/features/dashboard/DashboardPanel.tsx
  🟡 [RISKY]  src/lib/assetReview.ts

NOOP: 0  SAFE: 0  RISKY: 3  BLOCKED: 0

🟡 GATE RISKY — Review recommended before staging.
```

Exit code: 1 (RISKY — source file changes; expected)

---

## 10. Git Status

```
## main...origin/main
 M src/App.tsx
 M src/features/dashboard/DashboardPanel.tsx
 M src/lib/assetReview.ts
?? scripts/smoke-test-archon-010b.mjs
```

Not staged. Not committed. Not pushed.

---

## 11. Commit (pending operator approval)

```
feat: ARCHON-010B -- dashboard remediation controls (updateNote + approve-reject for approved assets, 39/39 smoke assertions)
```

Files to stage:
```
src/lib/assetReview.ts
src/features/dashboard/DashboardPanel.tsx
src/App.tsx
scripts/smoke-test-archon-010b.mjs
docs/walkthrough-archon-010b.md
```

---

## 12. Next Milestones

| Milestone | Scope |
|---|---|
| **ARCHON-010B (cont.)** | Use new Dashboard remediation controls to: fix `combat-hit-flash-dark` note; reject + regen `combat-heal-pulse`; reject + regen `combat-ambient-arena` |
| **ARCHON-010C** | Generate `combat-projectile-light` and `combat-projectile-dark` |
