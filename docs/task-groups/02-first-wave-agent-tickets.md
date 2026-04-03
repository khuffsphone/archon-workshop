# First-wave agent tickets

## Lead Planner / Tech Director
- produce task groups and file ownership map
- confirm no two agents are assigned the same monolith file
- define release gate dependencies

## Workshop Frontend Engineer
- isolate Scene Lab / Demo Scene boundaries inside `src/App.tsx`
- extract the first safe UI module
- wire missing-slot visibility and contextual compare path

## Workshop Backend Engineer
- audit `server.ts` for manifest verification, export, materialization, and queue restore
- add or tighten non-zero file validation
- make export fail loudly on missing approved files

## Generation + Asset Library Engineer
- audit style lock and preset routing in `src/lib/gemini.ts` and `src/lib/promptTemplates.ts`
- add Full Combat VFX Pack without duplicates
- add combat-specific prompt templates and family actions

## QA / Release Engineer
- build the release gate matrix
- verify current pass/fail state
- define artifact proof expected from every workstream

## Archon Game Slice Engineer
Do not start until QA confirms the Workshop export contract is trustworthy.
