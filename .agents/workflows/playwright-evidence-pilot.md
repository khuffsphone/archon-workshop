# Workflow: Playwright Evidence Pilot

**Status:** Pilot — localhost only. Not approved for production or external targets.

**Trigger:** A task requires Level 3 or Level 4 browser evidence (state transition or persistence/export) AND the AG `browser_subagent` prose description is insufficient to prove the state change deterministically.

> **Legacy note:** This workflow was established in PLAYWRIGHT-001. It is subordinate to `.agents/rules/10–13` on any point of conflict. If `browser-verification.md` and this workflow conflict, `browser-verification.md` controls.

---

## 1. When to Use This Workflow

Use this workflow when **all** of the following are true:

- The task requires explicit, structured browser evidence (not prose description)
- The acceptance criterion requires Level 3 (state transition) or Level 4 (persistence/export) evidence
- The target is `http://localhost:3000` (the local Archon Workshop dev server)
- Playwright MCP is registered in `mcp_config.json` and confirmed available
- The dev server is confirmed running before the session begins
- The operator has explicitly approved running a Playwright MCP session for this task

---

## 2. When NOT to Use This Workflow

Do not use Playwright MCP if any of the following are true:

- The target URL is not `http://localhost:3000`
- Playwright MCP is not registered/available in the current AG session
- The task does not require structured evidence (prose + screenshot is sufficient)
- The task involves production assets, external APIs, or credentials
- You have not confirmed the dev server is running
- The operator has not approved the Playwright session for this task

In those cases, use the standard `browser_subagent` approach from `browser-verification.md`.

---

## 3. Localhost-Only Rule

**Playwright MCP in this workflow is restricted to `http://localhost:3000` only.**

- All `browser_navigate` calls must target `http://localhost:3000`
- Do not navigate to any external URL during a Playwright MCP session
- Do not expose the MCP server beyond localhost (`--host 0.0.0.0` is prohibited)
- Do not use `--allow-unrestricted-file-access`
- Always use `--isolated` flag to prevent persistent browser profile
- `--allowed-origins` is NOT a security boundary (Playwright's own docs say so) — do not rely on it

If the session accidentally navigates to an external URL, terminate the session and report it.

---

## 4. Evidence Pattern

The required evidence structure for a Playwright MCP session is:

### 4.1 Pre-State Snapshot

Before any action on the feature under test, capture the full accessibility tree:

```
browser_snapshot()
```

Record the relevant elements: their roles, names, values, states (disabled, checked, expanded, etc.).

**This is mandatory.** Do not perform an action without capturing pre-state first.

### 4.2 Action Performed

Execute the action using a deterministic element reference:

```
browser_click(element="role=button, name='Enqueue Selected'")
```

The element reference must be explicit — not a CSS selector guess, not a positional click. Use the role and name from the accessibility tree.

Record the exact `browser_*` tool call used. This is the action receipt.

### 4.3 Post-State Snapshot

After the action, capture the accessibility tree again:

```
browser_snapshot()
```

Compare to pre-state. Record what changed: new elements, changed states, updated values.

**This diff is the state transition evidence.** It is not fabricatable from description.

### 4.4 Screenshot (If Useful)

Capture a screenshot at any point where visual confirmation adds evidence:

```
browser_screenshot()
```

Screenshots supplement accessibility tree evidence but do not substitute for it.

### 4.5 Console / Network Evidence (If Safe)

If the task requires confirming an API call was made or an error did not occur:

- Console: `--console-level error` captures runtime errors during the session
- Network: `--caps devtools` enables network log capture

**Only capture network evidence if the operator has approved it for this specific session.** Network logs may contain sensitive URLs or parameters.

---

## 5. Evidence Block Format in Walkthroughs

Every Playwright MCP evidence block in a walkthrough must follow this format:

```markdown
### Browser Evidence — [Feature or Action Name]

**Evidence Ladder Level:** [Level 1–4]

**Pre-state** (`browser_snapshot`):
- [Relevant element]: [state before action]
- [Relevant element]: [state before action]

**Action:** `browser_click(element="role=button, name='[Button Name]'")`
(or whichever browser_* tool was used)

**Post-state** (`browser_snapshot`):
- [Relevant element]: [state after action — changed elements highlighted]

**Screenshot:** [filename, if captured]
```

Do not write "I clicked the button" without the accessibility tree snapshot. Prose without the pre/post tree does not satisfy this workflow.

---

## 6. Prohibited Uses

The following are explicitly prohibited in any Playwright MCP session under this workflow:

| Prohibited | Reason |
|---|---|
| External URLs | Localhost-only pilot. Any external target requires a new approved workflow. |
| Credentials or secrets | No authentication. If a target requires credentials, do not use this workflow. |
| Production sites | Pilot is local only. Production testing is out of scope. |
| Public tunnels (ngrok, etc.) | Explicitly prohibited. Do not expose localhost externally. |
| `--allow-unrestricted-file-access` | Grants access beyond workspace root. Do not add. |
| `--host 0.0.0.0` | Exposes MCP server beyond localhost. Do not add. |
| Triggering real API generation | Playwright evidence sessions should be non-destructive. Do not trigger Gemini API calls unless the task explicitly requires it and the operator has approved. |
| Automated background execution | Playwright MCP must be operator-triggered per session, not automated. |

---

## 7. Required Closeout Fields

A task using Playwright MCP evidence must include the following in its walkthrough, in addition to the standard evidence receipt template:

```markdown
### Playwright MCP Evidence Summary

- **Playwright MCP version:** `0.0.xx` (from `npx @playwright/mcp@latest --version`)
- **Target URL:** `http://localhost:3000`
- **Flags used:** `--isolated` [list any others]
- **Sessions run:** [count]
- **Evidence level reached:** [Level 1–4 per action]
- **Pre/post snapshots captured:** [yes/no]
- **Screenshots captured:** [yes/no, filenames if yes]
- **Console errors captured:** [yes/no]
- **Network logs captured:** [yes/no]
- **External URLs navigated:** none (must be none)
- **Generated artifacts staged after session:** [git status result]
```

If any external URL was navigated, this field must say so explicitly and the walkthrough is not accepted until the incident is documented.

---

## 8. Relationship to `browser-verification.md`

This workflow does not replace `browser-verification.md`. It is an additive evidence tool for tasks where the accessibility tree structure is needed to prove state transitions.

| Use case | Tool |
|---|---|
| Standard UI change verification | `browser_subagent` per `browser-verification.md` |
| Level 3/4 evidence with explicit pre/post tree | Playwright MCP per this workflow |
| Both needed | Use both; embed both evidence blocks in the walkthrough |

The Evidence Ladder from `browser-verification.md` applies equally here. Playwright MCP raises the achievable evidence level, but the ladder definitions are unchanged.
