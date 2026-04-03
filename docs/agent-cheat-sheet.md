# Agent cheat sheet

## Lead Planner
Mode: Planning
Use when: splitting work, sequencing agents, defining task groups, preventing file collisions.
Do not use for: broad coding while owners are active.

## Frontend
Mode: Planning first, Fast for contained edits
Use when: Scene Lab, dashboard, compare UI, screenshot/review flows, slot assignment.
Owns first: `src/App.tsx`

## Backend
Mode: Planning first, Fast for contained edits
Use when: manifest, queue, export, materialization, rehydrate, zero-byte blocking.
Owns first: `server.ts`

## Generation
Mode: Planning first, Fast for contained edits
Use when: prompts, style locks, presets, blueprints, asset taxonomy, combat VFX families.
Owns first: `src/lib/gemini.ts`, `src/lib/promptTemplates.ts`, `src/lib/assetManifest.ts`, `src/lib/expansionAssets.ts`

## Game Slice
Mode: Planning
Use when: importer and combat slice using approved exported assets.
Blocked by: broken export contract.

## QA
Mode: Planning
Use when: proof, browser validation, release gate, export integrity, scene review proof.
