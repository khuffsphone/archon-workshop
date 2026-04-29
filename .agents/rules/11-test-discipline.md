# Test Discipline — Archon Workshop

> Non-negotiable. A failing test is evidence about the implementation, not the test.

## Primary rule

**If a test exposes a logic defect, fix the logic.**

Do not weaken, skip, delete, reorder, or reinterpret a failing test unless the operator explicitly approves that the test itself is wrong.

This rule has no exceptions without operator sign-off.

## Why this rule exists

During HAS-008 implementation, a smoke test correctly identified that an acknowledgment check was broken: an override phrase for `workshop-export-contract` was incorrectly satisfying the check for `has-decision-schema` due to proximity-based matching. The initial response was to move the items further apart in the test to make the proximity check pass. This was wrong — the test was correct; the implementation was defective. The correct fix replaced proximity matching with compound regex patterns that structurally bind the override phrase to the target item.

**The lesson:** do not adjust the test to avoid the failure mode.

## Additional rules

- **Run smoke tests before declaring a task complete.** If the server is not running for integration tests, say so explicitly — do not skip.
- **Do not change test inputs to avoid triggering a rule being tested.** The test input should be the natural trigger for the behavior being verified.
- **Never delete a test assertion** without operator approval and a written reason.
- **Add regression coverage** for every defect caught during implementation. If a bug is found and fixed, add a test case that would have caught it.
- **If a test seems wrong, stop and explain why** before modifying it. Get operator approval before changing any assertion.
- **Report exact results:** `N passed, 0 failed` with the full command used. Do not paraphrase.

## Test Integrity Rules

If a test exposes a logic defect, fix the logic. Do not weaken, move, delete, or reinterpret the test unless the operator explicitly approves that the test itself is invalid.

Before modifying any existing test or smoke script, stop and explain:

1. Why the current test is wrong or obsolete
2. What acceptance criterion changed
3. Why the implementation cannot satisfy the existing test
4. The exact proposed test diff

Do not change tests merely to make implementation pass.

When tests are modified, disclose them separately in closeout under "Test Files Modified."

## Smoke test authoring expectations

Every new feature or library module must include a smoke test.

Minimum coverage:
- Schema / structural validation (field types, enum values, required fields)
- Edge cases: null input, wrong type, empty collections
- Helper function output (non-empty, contains expected fields)
- JSON round-trip for any serialization helper
- Filter/search logic covering pass, fail, and empty-result cases

Run command: `node --import=tsx/esm scripts/smoke-test-<task-id>.mjs`
