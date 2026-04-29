# .agents/ — Archon Workshop Agent Instruction System

This directory contains all operating rules, workflow protocols, and skill definitions used by agents working in `archon-workshop`.

**Read this file first.** It defines precedence, read order, and model selection. Everything else in this directory is subordinate to it.

---

## Rule Precedence

When rules conflict, the higher-numbered rule controls.

```
10-operating-discipline.md   ← highest authority on operating behavior
11-test-discipline.md        ← highest authority on test handling
12-contract-protection.md    ← highest authority on frozen paths
13-closeout-discipline.md    ← highest authority on closeout and evidence
    ↑ These four are non-negotiable. They override all rules below them.

00–05 rules                  ← legacy tier. Still valid where non-conflicting.
                               Superseded by 10–13 on any point of conflict.
```

Files with this header are legacy-tier and yield to `10–13`:

> **Legacy note:** This file predates the ARCHON-006 operating discipline. If this file conflicts with rules/10–13, rules/10–13 control.

---

## Required Read Order — Start of Every Task

Read in this order before doing anything else:

1. **This file** — `.agents/README.md`
2. **Core rules** — `.agents/rules/10-operating-discipline.md` through `13-closeout-discipline.md`
3. **Relevant workflows** — see the Workflow Selection guide below
4. **Task-specific docs** — walkthroughs named in the task prompt, if any
5. **Legacy rules** — `.agents/rules/00–05` only as supplemental context; do not follow them where they conflict with `10–13`

Do not skip steps 1–2. Do not read legacy rules before reading `10–13`.

---

## Workflow Selection

Use workflows when the trigger condition is met. Do not use a workflow speculatively.

| Trigger | Workflow |
|---|---|
| Adding a new `src/lib/` module, changing data contracts, modifying state flow, touching persistence or export | `architecture-review.md` |
| Any UI change (new component, new button, state behavior, async flow) | `browser-verification.md` |
| Creating a new library module, schema, or utility function | `smoke-test-author.md` |
| Explicitly requested, or working on validators, persistence, queue lifecycle, import/export, freeze-list logic, bug fixes, contract-sensitive code | `strict-tdd.md` |
| Any task that generates, saves, exports, or imports files (images, audio, ZIPs, manifests) | `generated-artifact-hygiene.md` |
| Every task before committing | `docs-closeout.md` |
| Every implementation or verification task before closeout | `evidence-receipt.md` |
| Task adds or changes game asset generation pipeline | `game-asset-pipeline.md` |
| Task involves UI tooling or panel components | `ui-tooling-review.md` |

Workflows with no header or trigger block (`combat-vfx-backfill.md`, `launch-part1.md`, `scene-lab-combat-review.md`, `verify-export-gate.md`) are legacy stubs. Use them only if they are explicitly named in the task prompt.


---

## Model Rotation Guidance

Use the right model for the task type. The operator will specify the model in the task prompt. If not specified, use the defaults below.

| Task type | Preferred model |
|---|---|
| Planning pass, inspection report, execution-gate plan | **Gemini 3.1 Pro High** |
| Browser-heavy verification, multi-tab UI walkthrough | **Gemini 3.1 Pro High** |
| TypeScript implementation, bug fix, test repair | **Claude Sonnet 4.6 Thinking** |
| Docs-only tasks (rules, workflows, walkthroughs) | **Claude Sonnet 4.6 Thinking** |
| Closeout, smoke test authoring, contract-sensitive code | **Claude Sonnet 4.6 Thinking** |

**If the operator specifies a model, that overrides this table.** Model switches mid-task require an explicit operator instruction.

---

## No Scope Creep

The confirmed plan is the ceiling. If something seems beneficial but is not in the plan, do not implement it.

Specifically forbidden without explicit plan approval:

- New npm dependencies
- New server endpoints
- New agents, orchestration, automation, MCP, CI hooks, API bridges
- Background workers or cloud sync
- Changes to `archon-game`
- Changes to frozen paths (see `12-contract-protection.md`) without a freeze-list acknowledgment

If a scope gap is discovered during execution, stop, report it, and wait for approval before proceeding.

---

## Closeout Expectations

Every task, without exception, must satisfy all of the following before yielding control:

- [ ] `npm run lint` run and exit code shown (raw output, not paraphrased)
- [ ] `npm run build` run and exit code shown (module count + build time)
- [ ] Smoke test run with raw output if a smoke test exists for this task
- [ ] Browser verification performed if any UI changed (screenshot or recording path in walkthrough)
- [ ] Walkthrough doc created or updated at `docs/walkthrough-<task-id>.md`
- [ ] "Test Files Modified" section present in walkthrough (even if answer is "none")
- [ ] `git diff --stat` reviewed — only expected files staged
- [ ] `git status -sb` clean after commit
- [ ] Commit hash shown
- [ ] Push confirmed with branch name

A closeout that says "tests passed" without showing output is **invalid** under `13-closeout-discipline.md`.

---

## Skills

Skills are in `.agents/skills/`. Each skill subdirectory contains a `SKILL.md` describing its scope. Read a skill's `SKILL.md` only when the task explicitly involves that skill domain.

Do not read all skills speculatively. Identify which skill is relevant from the task description, then read only that skill's `SKILL.md`.
