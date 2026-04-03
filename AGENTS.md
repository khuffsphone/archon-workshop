# AGENTS.md — Archon Workshop

This workspace uses Antigravity's `.agents/rules` and `.agents/skills` structure as the primary source of agent guidance.

Read in this order:
1. `.agents/rules/*`
2. relevant `.agents/skills/*/SKILL.md`
3. `docs/current-state.md`
4. agent-specific kickoff prompt in `docs/kickoff-prompts/`

Primary Part 1 goal:
Finish Archon Workshop as a durable asset factory and prove it by feeding one playable Archon combat slice.

Primary constraints:
- patch in place
- do not rebuild from scratch
- do not overwrite approved assets
- do not auto-approve art
- do not claim success without proof artifacts

Current file ownership rule:
- only one active editor on `src/App.tsx`
- only one active editor on `server.ts`
- only one active editor on generation library files

When a task completes, leave:
- changed files
- tests/builds run
- proof artifact
- known risks
- rollback note
