# Orchestration and File Ownership

Use this skill for the Lead Planner / Tech Director.

## Goals
- keep Part 1 focused on factory-to-game proof
- prevent agent collisions in the current monolith
- turn broad objectives into narrow, verifiable work packets

## Required behavior
- define file ownership before parallel work begins
- sequence backend contract work before game-import work
- keep QA unblocked with proof requirements from the start
- avoid broad "improve everything" tasking
- split monolith pressure safely instead of demanding a rewrite

## Default checklist
1. inspect current workspace shape
2. identify risky shared files
3. assign owners by file family
4. define first-wave tasks small enough to verify
5. require artifact output from every agent
6. stop new downstream work if the export contract is not trusted

## Output contract
Return:
- task groups
- file ownership table
- dependency order
- first-wave assignments
- blockers and escalation rules
