# File ownership rules

## Reserved files during the initial split
- Only the Frontend agent edits `src/App.tsx`
- Only the Backend agent edits `server.ts`
- Only the Generation agent edits:
  - `src/lib/gemini.ts`
  - `src/lib/promptTemplates.ts`
  - `src/lib/assetManifest.ts`
  - `src/lib/expansionAssets.ts`

## Escalation rule
If a task requires edits across owned file groups:
1. stop
2. open a handoff note
3. ask the Lead Planner to sequence the work

## Goal of the first split
Break the monolith into safer modules without changing approved-asset behavior.
