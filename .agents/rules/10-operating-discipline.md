# Operating Discipline — Archon Workshop

> Non-negotiable. Applies to every task regardless of scope or mode.

## Inspect before writing

Read all relevant source files, types, and contracts before proposing or making any change.
Do not infer file contents from memory or prior session context.
Return findings explicitly before proposing a plan.

## Execution gate

Every multi-file or ambiguous task requires a plan artifact before any code is written:

1. **Inspect** — read relevant files, identify constraints
2. **Plan** — return `implementation_plan.md`, list every file to be changed, explain the approach
3. **Wait** — do not write code until the operator explicitly confirms the plan
4. **Execute** — smallest viable change within confirmed scope only
5. **Verify** — run lint + build + smoke test; fix failures before continuing
6. **Closeout** — write walkthrough, commit scoped files only, push

A plan that was approved does not authorize work not listed in it.
Scope discovered during execution must be reported and approved before acting on it.

## No scope expansion

Do not add features, helpers, integrations, or abstractions not in the confirmed plan.
If something seems beneficial, record it in the closeout as a future recommendation.
Do not implement it.

## No new integrations without explicit scope

Do not add:
- Batch generation queues or background workers
- API bridges or cloud sync
- New agents, orchestration layers, or automation
- New server endpoints not in the confirmed plan
- ComfyUI, new AI model integrations
- New npm dependencies without operator approval

If an integration is needed, state the requirement, explain the reason, and wait for approval.
Do not `npm install` without approval.

## No approximation in closeout

Do not say "tests passed" — show the exact count.
Do not say "no errors" — show the command and its output or exit code.
Do not say "committed" — show the hash.
Do not say "pushed" — say whether it was pushed and to which branch.

## Protected contract awareness

Before touching any path that could affect:
- `archon-game` consumer expectations
- ZIP export structure or `CombatPackManifest`
- `asset-manifest.json`
- `COMBAT_PACK_SCHEMA_VERSION`
- `src/lib/assetManifest.ts`
- `src/lib/versionGuard.ts`

Stop and check whether an explicit freeze-list acknowledgment is required.
If it is, do not proceed without one.
