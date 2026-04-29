# PLAYWRIGHT-001 — Localhost Browser Evidence Pilot

**Repo:** `archon-workshop`
**Date:** 2026-04-29
**Status:** Feasibility Brief — Complete

---

## 1. Executive Verdict

**Classification: Feasible but blocked on one operator action.**

Playwright MCP v0.0.71 is available via `npx` without any `package.json` modification. A localhost-only pilot against `http://localhost:3000` is achievable with no source code changes, no credentials, and no public tunnel. The one missing piece is that `mcp_config.json` at the Antigravity app data directory is currently empty — Playwright MCP is not yet registered as an AG tool.

The evidence quality improvement over the current AG browser subagent is real and material. The pilot is recommended with the constraints documented below.

**Go / no-go: GO — pending operator approval of `mcp_config.json` update.**

---

## 2. Current Browser Verification Pain Point

The ARCHON-006 series repeatedly surfaced the same evidence failure modes:

| Failure mode | Example |
|---|---|
| Presence ≠ workflow | "button is visible" closed as verified |
| Prose ≠ action | "I clicked the button" without deterministic reference |
| Screenshot ≠ state transition | One screenshot at end, no before/after |
| Harness ≠ real browser | Smoke test passing treated as browser verification |

The AG `browser_subagent` tool is a general-purpose browser agent. It narrates what it did in prose and captures screenshots automatically. It does not produce structured accessibility tree data, does not record the exact element reference used for each action, and does not produce a structured `pre-state → action → post-state` artifact chain.

These gaps allowed agents to close tasks with Level 1 or Level 2 evidence when Level 3 or Level 4 was required. ARCHON-006E, 006F, and 006G each required walkthrough corrections as a result.

---

## 3. What Playwright MCP Adds

### The Required Evidence Pattern

```
Pre-state → Action performed → Post-state → Artifact
```

Playwright MCP delivers this natively:

| Evidence component | AG browser subagent | Playwright MCP |
|---|---|---|
| Pre-state snapshot | ⚠️ Partial DOM read | ✅ Full ARIA accessibility tree |
| Exact element reference | ❌ Prose description | ✅ `role=button, name="Start Batch"` (deterministic) |
| Action performed | ✅ Prose narration | ✅ `browser_click` call with element ref |
| Post-state snapshot | ❌ Not structured | ✅ Full ARIA tree, diffable from pre-state |
| Screenshot | ✅ Auto WebP | ✅ On-demand |
| Console error capture | ❌ | ✅ via `--console-level error` |
| Network log | ❌ | ✅ via `--caps devtools` |
| Deterministic replay script | ❌ | ✅ via `--codegen typescript` |

### Concrete Example

**Current AG evidence (Level 2 at best):**
> "Clicked the Start Batch button. Processing began."

**Playwright MCP evidence (Level 3):**
```
browser_snapshot → pre-state tree: button[name="Start Batch", disabled=false], 
                                    list[12 items, status="queued"]
browser_click(element="role=button, name='Start Batch'")
browser_snapshot → post-state tree: button[name="Pause Batch", disabled=false],
                                     list item[0, status="generating"]
```

The post-state tree directly proves the state transition. This cannot be fabricated by description alone.

---

## 4. What Playwright MCP Does Not Solve

- **Provider/API failures:** Playwright MCP captures browser state. It does not capture server-side Gemini API responses or server logs. Server evidence still requires terminal output.
- **Smoke test substitution:** Playwright MCP evidence is browser evidence. It does not replace pure-function smoke tests for data contracts or library logic.
- **Automated CI:** This is a manual, operator-triggered pilot. Playwright MCP is not wired into any CI pipeline and should not be.
- **Evidence retention:** Playwright accessibility trees and screenshots are produced during the session. If not explicitly saved and embedded in a walkthrough, the evidence is ephemeral.
- **`--allowed-origins` as a security boundary:** Playwright's own documentation states: *"`--allowed-origins` does NOT serve as a security boundary and does NOT affect redirects."* It is not listed here as a protection.

---

## 5. Security Posture

| Control | Status | Note |
|---|---|---|
| Target URL restricted to localhost | ✅ | Pilot targets `http://localhost:3000` only |
| Isolated browser profile | ✅ | `--isolated` flag — profile kept in memory, not written to disk |
| No credentials | ✅ | Workshop has no authentication |
| No public tunnel | ✅ | Localhost only, not exposed externally |
| No unrestricted file access | ✅ | `--allow-unrestricted-file-access` NOT used; default restricts to workspace root |
| No repo write via MCP | ✅ | Playwright MCP has no git tools |
| No persistent login state | ✅ | `--isolated` enforces this |
| MCP server bound to localhost | ✅ | `--host localhost` is the default |
| `mcp_config.json` contains no secrets | ✅ | Only `npx` command and `--isolated` flag |
| `--allowed-origins` as security boundary | ❌ | Explicitly documented by Playwright as NOT a security boundary — not relied on |

**Honest statement:** The localhost constraint is an **operational** constraint, not a cryptographic one. An operator could navigate to an external URL if they chose to. The protection is the pilot design and operator discipline, not a technical enforcement.

---

## 6. Localhost-Only Constraints

The pilot must observe the following:

1. Dev server must be started manually before the session: `npm run dev`
2. All `browser_navigate` calls must target `http://localhost:3000` only
3. No external URLs in any Playwright session
4. No `--allow-unrestricted-file-access` flag
5. `--isolated` flag always set (no persistent profile)
6. MCP server bound to `localhost` (default — do not use `--host 0.0.0.0`)
7. No credentials, storage state, or secrets files

---

## 7. Whether Antigravity Can Use It Directly

**Yes, after one configuration step.**

Antigravity exposes an `mcp_config.json` file in its app data directory. This file currently exists but is **empty**. Adding the Playwright MCP server entry enables AG to call `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_screenshot`, and related tools directly in conversation, alongside the existing `browser_subagent`.

The two tools are complementary:
- **`browser_subagent`**: best for multi-step flows with prose narration and automatic WebP recording
- **Playwright MCP tools**: best for explicit evidence capture at critical verification moments (pre/post snapshots, exact element refs)

This is not a replacement — it is an addition to the evidence toolkit.

---

## 8. Whether Claude or Another MCP Client Would Be Better Suited

Claude's MCP client support is more mature and better documented. However, since the operator is working in AG and AG already has `mcp_config.json` infrastructure, **AG is the correct starting point.** If the AG pilot reveals limitations in how AG surfaces Playwright tool output, a follow-on evaluation with Claude could be scoped as PLAYWRIGHT-002.

---

## 9. Pilot Design

### Prerequisites
1. Dev server running: `cmd.exe /c "npm run dev"` → `http://localhost:3000`
2. Playwright MCP registered in `mcp_config.json`
3. AG session restarted to pick up new MCP config

### Candidate Flow (No Generation — Evidence Only)

| Step | Action | Evidence Captured |
|---|---|---|
| 1 | `browser_navigate("http://localhost:3000")` | Page loaded |
| 2 | Click VFX tab | Navigation action |
| 3 | `browser_snapshot()` | **Pre-state:** catalog visible, queue empty |
| 4 | Click one VFX preset card | Action evidence (element ref) |
| 5 | `browser_snapshot()` | **Post-state:** preset selected (highlighted) |
| 6 | Click "Enqueue Selected" | Action evidence |
| 7 | `browser_snapshot()` | **Post-state:** queue item appears with `QUEUED` status |
| 8 | Click "Export Queue Briefs" | Action evidence (no API call) |
| 9 | `browser_snapshot()` | State confirmation |
| 10 | `git status -uall --short` | Artifact hygiene — no generated files |

**Generation is NOT triggered in this pilot.** No Gemini API calls. No new generated assets.

---

## 10. Setup Notes

### Step 1: Register Playwright MCP in AG

Add to the Antigravity `mcp_config.json` file (located in the AG app data directory):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated"
      ]
    }
  }
}
```

> **This is an example only. Do not apply without explicit operator approval.**
> `--isolated` keeps the browser profile in memory and does not write to disk.
> Do not add `--allow-unrestricted-file-access`.
> Do not add `--host 0.0.0.0`.
> `--allowed-origins` is NOT a security boundary per Playwright's documentation.

### Step 2: Restart AG

The new MCP server configuration is picked up on the next AG session start.

### Step 3: Verify Tool Availability

In AG, confirm the Playwright MCP tools (`browser_navigate`, `browser_snapshot`, `browser_click`) are available.

### Step 4: Start Dev Server

```powershell
cmd.exe /c "npm run dev"
```

Wait for `http://localhost:3000` to be live.

---

## 11. Evidence Format

A Playwright MCP evidence block in a walkthrough should follow this structure:

```markdown
### Browser Evidence — [Feature Name]

**Pre-state snapshot** (`browser_snapshot` result):
- Queue panel: 0 items
- "Start Batch" button: disabled

**Action:** `browser_click(element="role=button, name='Enqueue Selected'")`

**Post-state snapshot** (`browser_snapshot` result):
- Queue panel: 1 item, status=QUEUED
- "Start Batch" button: enabled

**Screenshot:** [filename if captured]

**Evidence ladder level reached:** Level 3 (State Transition Evidence)
```

This format is deterministic and not fabricatable from description alone.

---

## 12. Go / No-Go Recommendation

**GO** — with the following conditions:

1. Operator explicitly approves the `mcp_config.json` update as a separate action
2. The pilot flow does not trigger real generation (evidence only)
3. Generated artifact hygiene is confirmed after the pilot session
4. Evidence captured during the pilot is embedded in a walkthrough, not discarded
5. If the pilot reveals that AG does not surface Playwright tool output usefully, the finding is documented and a Claude-client follow-on is evaluated

**Would be NO-GO if:**
- Playwright MCP required a public tunnel
- Playwright MCP required write access to the repo
- The evidence it produced was indistinguishable from what the AG subagent already provides
- Setup required modifying `package.json` or source code

None of those conditions are true.

---

## 13. Next Step If Viable

1. **Operator approves `mcp_config.json` update** (separate explicit action)
2. AG session restarted to pick up Playwright MCP tools
3. Dev server confirmed running at `http://localhost:3000`
4. Pilot flow executed (no generation) — accessibility tree evidence captured
5. Evidence embedded in `docs/walkthrough-playwright-001.md`
6. Evidence receipt checker run against walkthrough
7. Commit pushed

If step 4 produces evidence that demonstrably satisfies Level 3 (state transition) for a VFX queue action, the pilot is successful and Playwright MCP is recommended for future UI verification tasks.
