# Launch sequence

## Phase 0 — seed memory
Create or pin these Knowledge Items in Antigravity:
- Archon naming taxonomy
- Part 1 acceptance contract
- Light faction style references
- Dark faction style references
- UI style references
- Spell / VFX style references
- Approved export contract

## Phase 1 — Workshop workspace
1. Open `archon-workshop`
2. Confirm `.agents/rules` and `.agents/skills` are present
3. Start **Lead Planner** in **Planning**
4. Paste `docs/kickoff-prompts/01-lead-planner.md`
5. Review the implementation plan and task groups

## Phase 2 — parallel Workshop execution
After approving the Lead plan:
1. Start **Workshop Frontend Engineer**
2. Start **Workshop Backend Engineer**
3. Start **Generation + Asset Library Engineer**
4. Start **QA / Release Engineer**

Keep QA attached to the browser subagent for visible proof.

## Phase 3 — unlock game workspace
Only after QA confirms:
- manifest integrity passes
- approved exports are materialized
- zero-byte files are blocked
- combat VFX blueprint exists
- Scene Lab can approve VFX in context

Then:
1. Open `archon-game`
2. Start **Archon Game Slice Engineer**
3. Paste `archon-game/docs/kickoff-prompts/05-game-slice.md`

## Phase 4 — release gate
QA signs off only if the whole chain works:
- generate
- review
- approve
- materialize
- export
- import into game
- render inside one browser combat slice
