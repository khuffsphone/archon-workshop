# Workshop Frontend UI Ops

Use this skill for Scene Lab, dashboard, asset browser, candidate review, screenshot actions, and contextual approval UX.

## Goals
- reduce `src/App.tsx` pressure by extracting stable UI modules
- preserve current approved-asset behavior
- make scene-driven review obvious and fast

## Required behavior
- do not break current persistence or approval flows
- prefer extraction over reinvention
- keep controls simple and explicit
- surface missing scene slots clearly
- expose candidate compare inside the scene context

## Default checklist
1. identify the current UI section to isolate
2. map state it depends on
3. extract a contained component or hook
4. wire existing behavior through props/state instead of duplicating logic
5. verify the scene still works with approved assets
6. produce screenshot proof

## Output contract
Return:
- files changed
- component boundaries added
- behavior preserved
- new behavior added
- screenshot or browser proof
