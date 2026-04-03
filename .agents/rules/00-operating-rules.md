# Archon Workshop — Permanent Operating Rules

## Agent Mode Policy

| Task Type | Mode |
|---|---|
| Feature design, architecture, multi-file changes, QA reviews | **Planning Mode** |
| Small localized patches (single file, clear scope) | **Fast Mode** |

**Planning Mode workflow:** Research → Implementation Plan artifact → User approval → Execute → Walkthrough artifact.  
**Fast Mode:** Execute immediately, no plan required.

## Artifact Requirement

Every agent task, regardless of mode, **must** leave a terminal artifact before yielding control.  
Acceptable artifact types:
- `walkthrough.md` — what was done and how it was verified  
- `task.md` — live TODO list during execution  
- `implementation_plan.md` — design document for user review  
- Domain-specific reports (QA reports, diff summaries, etc.)

Agents that complete work without producing an artifact have **not** completed the task.

## Browser Subagent Usage

- Use the `browser_subagent` tool for all UI review tasks.  
- Always pass a `RecordingName` so the session is saved as a `.webp` video artifact.  
- Return a screenshot or recording path in the final walkthrough.  
- Do **not** trust verbal claims about UI state — capture proof.

## Knowledge & Memory

- Style decisions, palette rules, faction references, and naming conventions **must** be written as Knowledge Items (KIs) or committed to `.agents/rules/` so they survive across sessions.  
- Do not re-litigate decisions already captured in a KI or rule file.  
- When a KI exists for a topic, read it before doing independent research.

## QA Agent Rules

- QA runs in **Planning Mode**.  
- QA must produce a `qa_report.md` artifact listing: test scope, pass/fail results, and any open defects.  
- QA must use the browser subagent to validate any UI behavior changes.

## General Hygiene

- Prefer `multi_replace_file_content` for non-contiguous edits; `replace_file_content` for single contiguous blocks.  
- Never run destructive commands without user approval (`SafeToAutoRun: false`).  
- Keep responses concise; let artifacts carry the detail.
