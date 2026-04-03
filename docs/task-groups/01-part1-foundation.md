# Default task groups for Part 1

## TG-1 Factory contract
Owner: Backend + QA
- verify approved asset materialization
- verify non-zero export
- verify manifest integrity
- verify queue persistence
- define the export contract the game will consume

## TG-2 Workshop UI split
Owner: Frontend
- isolate Scene Lab
- isolate dashboard pipeline controls
- isolate review actions
- isolate screenshot/review-sheet behavior

## TG-3 Combat VFX factory
Owner: Generation
- add Full Combat VFX Pack blueprint
- add combat subcategories
- add specialized prompts
- add combat family generation actions

## TG-4 Scene Lab combat proof
Owner: Frontend + QA
- add Combat FX Test mode
- add slot assignment and missing-slot backfill
- add contextual approval and compare
- add screenshot/review-sheet export

## TG-5 Game import contract
Owner: Game
Blocked until TG-1 passes
- read approved exported manifest
- map approved assets into runtime
- build one combat slice

## TG-6 Release gate
Owner: QA
- verify end-to-end generate -> review -> approve -> export -> import -> render
