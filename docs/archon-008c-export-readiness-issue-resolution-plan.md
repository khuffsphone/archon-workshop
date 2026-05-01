# ARCHON-008C — Export Readiness Issue Resolution Plan

## 1. Executive Verdict

The export readiness issue reported in the ARCHON-008B preview ("Not Ready" with 4 missing required IDs) is a false negative caused by a stale required-ID list in the workshop codebase.

The `archon-game` repository has fully transitioned to the modernized VFX naming schema (introduced in ARCHON-006D). It neither requires nor references the missing IDs. The combat pack export pipeline itself is safe and functional, and the issue is entirely local to the workshop's `COMBAT_SLICE_REQUIRED_IDS` constant.

## 2. Missing Required IDs

The export eligibility preview reports these 4 specific IDs as missing:
- `combat-hit-flash-light-medium`
- `combat-hit-flash-dark-medium`
- `combat-death-light`
- `combat-death-dark`

## 3. Where Those IDs Are Defined

The missing IDs are defined in the `archon-workshop` codebase:
- **File:** `src/lib/assetManifest.ts`
- **Location:** Inside the `COMBAT_SLICE_REQUIRED_IDS` array (lines 212–215).

## 4. Cross-Reference Table

| Missing ID | In `VFX_CATALOG`? | In `INITIAL_ASSETS`? | In `asset-manifest.json`? | In `archon-game`? | Modern Approved Equivalent | Recommended Action |
|:---|:---:|:---:|:---:|:---:|:---|:---|
| `combat-hit-flash-light-medium` | No | Yes (pending) | Yes (pending) | **No** | `combat-hit-flash-light` | Replace with modern ID |
| `combat-hit-flash-dark-medium` | No | Yes (pending) | Yes (pending) | **No** | `combat-hit-flash-dark` | Replace with modern ID |
| `combat-death-light` | No | Yes (pending) | Yes (pending) | **No** | `combat-death-burst-light` | Replace with modern ID |
| `combat-death-dark` | No | Yes (pending) | Yes (pending) | **No** | `combat-death-burst-dark` | Replace with modern ID |

*(Note: The stale IDs still exist in the `INITIAL_ASSETS` roster as ungenerated `pending` records. They were correctly excluded from export because they have no path.)*

## 5. Root Cause Classification

**A. Stale Required-ID List**

The root cause is a stale required-ID list within `archon-workshop`. The `COMBAT_SLICE_REQUIRED_IDS` constant was not updated when the VFX catalog was modernized in ARCHON-006D. Because `archon-game` was updated to expect the new IDs, the game consumer contract is intact. The export preview logic is functioning correctly; it is truthfully reporting that it cannot find eligible assets for the stale IDs it was told to check.

## 6. Recommended Option

**Option A — Update Required-ID List**

We recommend updating the required-ID list as the correct resolution. Because `archon-game` already expects the modern IDs, no alias mapping or backward compatibility layer is needed. 

The fix will require:
1. Updating `COMBAT_SLICE_REQUIRED_IDS` in `src/lib/assetManifest.ts` to use the modern equivalents.
2. Removing the stale, unused zombie records from the `INITIAL_ASSETS` roster in the same file to prevent manifest pollution.

## 7. Proposed Future Milestone

**ARCHON-008D — Required ID Reconciliation**

The implementation of Option A should be assigned to a new milestone, ARCHON-008D. 

Acceptance Criteria for ARCHON-008D:
- The 4 stale IDs are removed from `COMBAT_SLICE_REQUIRED_IDS`.
- The 4 modern equivalents are present in `COMBAT_SLICE_REQUIRED_IDS`.
- Stale, obsolete `pending` records (including `-medium` suffixed effects and non-burst death effects) are removed from `INITIAL_ASSETS`.
- Regression tests (e.g., `smoke-test-archon-006c.mjs`) are updated to reflect the new expected asset counts.
- The Export Eligibility Preview achieves a "✅ Combat Ready" state for a fully generated manifest.

## 8. Implementation Risk Caveat

> [!CAUTION]
> The future ARCHON-008D milestone is likely low risk, but it is **not risk-free**. It touches protected source-of-truth fields (`COMBAT_SLICE_REQUIRED_IDS` and `INITIAL_ASSETS`) that dictate export readiness and manifest shape. Strict verification of manifest parsing, asset counts, and regression tests will be required during implementation.

## 9. Out-of-Scope Items for ARCHON-008C

The current ARCHON-008C milestone is explicitly limited to planning and diagnosis.
The following actions are strictly **out of scope** for ARCHON-008C:
- Modifying source code or constants (no source fix in 008C).
- Cleaning up the generated `asset-manifest.json` (no generated manifest cleanup in 008C).
- Modifying the `archon-game` consumer code (no game-side change in 008C).
