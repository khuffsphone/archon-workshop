# Workshop Backend Pipeline

Use this skill for manifest integrity, queue persistence, export, rehydrate, materialization, orphan import, and zero-byte blocking.

## Goals
- the manifest must match real files
- approved exports must be real and portable
- queue state must survive refresh/reload

## Required behavior
- never fake success
- fail loudly when approved files are missing
- block zero-byte outputs during save, rehydrate, approve, export, and materialize
- preserve candidate history
- keep approved versions stable until explicitly changed

## Default checklist
1. define the data contract touched by the patch
2. identify all read/write paths affected
3. patch validation before patching export
4. materialize approved assets before export
5. verify manifest alignment after write
6. leave a repair path for broken entries
7. produce proof with file counts and non-zero checks

## Output contract
Return:
- files changed
- endpoints/services changed
- verification run
- counts of assets verified/repaired/flagged
- explicit risks
