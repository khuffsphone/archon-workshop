# Strict TDD Workflow

Use this workflow only when explicitly requested or when working on:
- validators
- persistence
- import/export
- queue lifecycle logic
- freeze-list logic
- bug fixes
- contract-sensitive code

## Phase 1 — Test Authoring Only

- Write or update the smoke test only.
- Do not modify implementation files.
- Run the test and prove it fails for the missing behavior.
- Commit the failing test if instructed by the user.

## Phase 2 — Confirmation Gate

Stop and ask for approval before implementation.

## Phase 3 — Implementation

- Modify implementation code to satisfy the committed test.
- Do not weaken the test.
- Run the test again and provide raw output.

## Phase 4 — Closeout

Return:
- failing-test evidence
- implementation files changed
- final passing output
- any test changes made after Phase 1, with justification
