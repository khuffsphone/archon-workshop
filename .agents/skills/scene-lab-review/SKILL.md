---
name: scene-lab-review
description: >
  Use this skill whenever you need to visually inspect, validate, or capture
  proof of UI state in Scene Lab or any browser-based preview environment.
  The skill drives a browser subagent, captures a recording, and produces a
  structured QA artifact.
---

# Scene Lab Review Skill

## When to Use

- Any task that changes visible UI and requires visual proof.
- QA validation of a new screen or interaction.
- Verifying that an animation, layout, or color change shipped correctly.

## Step-by-Step

### 1. Launch the browser subagent

```
browser_subagent(
  TaskName   = "Scene Lab Review — <feature name>",
  TaskSummary = "Capture visual proof of <what changed>.",
  RecordingName = "scene_lab_<feature>_review",
  Task = """
    1. Open <URL or local dev server>.
    2. Navigate to <screen / component>.
    3. Interact with <specific UI element> to exercise the change.
    4. Take a screenshot of the final state.
    5. Return: screenshot path, any console errors, and pass/fail verdict.
  """
)
```

### 2. Collect results

The subagent must return:
- Absolute path to the saved `.webp` recording.
- Any console errors encountered.
- A pass/fail verdict per acceptance criterion.

### 3. Produce the QA artifact

Write a `qa_report.md` artifact that includes:

```markdown
# QA Report — <Feature Name>
**Date**: <ISO date>
**Agent**: Scene Lab Review

## Scope
- What was tested.

## Evidence
![Recording](<absolute path to .webp>)

## Results
| Criterion | Result | Notes |
|---|---|---|
| <criterion> | PASS / FAIL | <notes> |

## Open Defects
- <defect description, or "None">
```

## Rules

- Never skip the recording. `RecordingName` is mandatory.
- If the page fails to load, report `open_browser_url` failure immediately and ask the user how to proceed.
- Embed the recording path in the artifact — do not just claim the UI is correct.
