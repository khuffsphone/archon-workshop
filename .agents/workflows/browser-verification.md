# Workflow: Browser Verification

**Trigger:** Any task that changes visible UI (new component, new panel, new button, layout change, CSS change, state behavior change).

**When NOT needed:** Pure data/library tasks with no React component changes.

---

## Prerequisite

The dev server must be running before browser verification can proceed:

```powershell
npm run dev   # starts on localhost:3000
```

If port 3000 is held by another process (e.g. HAS Next.js dev server), free the port first.
Do not substitute a mock harness for the real dev server when verifying UI behavior.

## Steps

1. **Confirm server is live**
   - Hit `http://localhost:3000/api/health` or observe `Archon Workshop → http://localhost:3000` in terminal
   - If server fails to start, diagnose and fix — do not proceed to browser step

2. **Open the browser subagent**
   - Use the `browser_subagent` tool
   - Always pass a `RecordingName` (lowercase + underscores, ≤ 3 words)
   - Pass a precise task description covering every step to perform

3. **Perform the verification flow**
   - Navigate to the relevant tab/panel
   - Exercise the new behavior step by step
   - For each new feature: trigger it, observe the result, confirm the expected outcome
   - For existing behavior: confirm it still works (approve/reject/generate buttons, export buttons, etc.)

4. **Capture evidence**
   - The browser subagent captures screenshots at each step automatically
   - Confirm the subagent returns screenshot paths or recording path
   - Embed at least one screenshot or the recording path in the walkthrough

5. **Test error/edge cases**
   - For import flows: attempt import of an invalid file; confirm toast error with no state mutation
   - For filter/search: apply a filter that returns 0 results; confirm graceful empty state
   - For async operations: confirm loading states show correctly

6. **Confirm no regressions**
   - Check that previously working features (Export Full Pack, Import Pack, Scene Lab presets, VFX approve/reject) still function
   - `git status -sb` → clean (no unintended changes written to disk)

## Return requirements

Return from this workflow:
- Screenshot or recording path(s)
- Pass/fail for each verification step
- Any unexpected behaviors found
- Whether existing features remain functional

---

## No Silent Skips

Browser verification is **mandatory** when the trigger condition is met. It may not be deferred, substituted, or omitted.

### What a silent skip looks like

- Completing closeout without a screenshot or recording path when UI changed
- Describing the UI as working without evidence ("the panel renders correctly")
- Substituting a DOM snapshot, API harness, or endpoint check for a real browser session
- Reporting "verified" when the dev server was not running and no follow-up was scheduled

### If the dev server is unavailable

State it explicitly in the closeout:

> **Browser verification: BLOCKED** — port 3000 held by `<process>`. Server was not started. Verification is incomplete. Task is NOT accepted.

Do not mark the task complete. Do not commit without flagging this gap. Request operator guidance on whether to free the port, reschedule, or accept the task as provisionally unverified.

### If the operator waives browser verification

The operator must say so explicitly. A waiver is not implied by silence, by a tight scope description, or by the absence of a browser verification instruction in the task prompt.

### Consequence

A task closed without required browser evidence must be re-opened. It is not accepted until the verification step is completed and evidence is embedded in the walkthrough.
