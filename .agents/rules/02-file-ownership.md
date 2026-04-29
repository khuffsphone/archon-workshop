> **Legacy note:** This file predates the ARCHON-006 operating discipline.
> If this file conflicts with rules/10–13, rules/10–13 control.
>
> **⚠️ Important:** The multi-agent split described here (Frontend agent, Backend agent, Generation agent) is the **retired** model. ARCHON-006+ tasks operate with a single operator/agent completing full tasks under explicit scope approval. The escalation/handoff protocol in this file does **not** apply. Do not refuse to edit a file solely because this rule assigns it to a different agent. Follow the confirmed task plan and freeze-list rules in `12-contract-protection.md` instead.

# File ownership rules

## Reserved files during the initial split
- Only the Frontend agent edits `src/App.tsx`
- Only the Backend agent edits `server.ts`
- Only the Generation agent edits:
  - `src/lib/gemini.ts`
  - `src/lib/promptTemplates.ts`
  - `src/lib/assetManifest.ts`
  - `src/lib/expansionAssets.ts`

## Escalation rule
If a task requires edits across owned file groups:
1. stop
2. open a handoff note
3. ask the Lead Planner to sequence the work

## Goal of the first split
Break the monolith into safer modules without changing approved-asset behavior.
