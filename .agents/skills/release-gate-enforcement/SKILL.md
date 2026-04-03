# Release Gate Enforcement

Use this skill for the QA / Release Engineer.

## Goals
- reject unsupported success claims
- force proof across UI, manifest, export, and game import boundaries
- keep blocking issues explicit and resumable

## Required behavior
- require browser proof for scene-based UI claims
- require non-zero file checks for approved/export claims
- require explicit pass/fail criteria, not vague status updates
- keep a regression list that can be rerun after every major patch

## Default checklist
1. define the release gate matrix
2. map each claim to a proof type
3. verify current pass/fail state
4. record blockers with owner and evidence
5. sign off only when the full path is proven

## Output contract
Return:
- QA matrix
- pass/fail per workstream
- missing proofs
- signoff or explicit refusal
