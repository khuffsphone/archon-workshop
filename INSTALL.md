# Install this setup pack into Antigravity

## 1. Create workspaces
Create two folders on disk:
- `archon-workshop`
- `archon-game`

## 2. Copy the pack
Copy:
- `archon-antigravity-setup-pack/archon-workshop/*` into your real `archon-workshop/`
- `archon-antigravity-setup-pack/archon-game/*` into your real `archon-game/`

Keep the hidden `.agents/` folders.

## 3. Open in Antigravity
In Agent Manager:
- open `archon-workshop`
- confirm `.agents/rules`, `.agents/skills`, and `.agents/workflows` are present
- start the Lead Planner in Planning mode
- paste `docs/kickoff-prompts/01-lead-planner.md`

Only open `archon-game` after the Workshop export gate passes.

## 4. Pin knowledge items
Seed these as pinned Knowledge Items:
- Archon naming taxonomy
- Part 1 acceptance contract
- Approved export contract
- Light style lock reference set
- Dark style lock reference set
- UI style lock reference set
- Spell/VFX style lock reference set

## 5. Browser use
Give QA browser access for screenshot proof, review-sheet proof, and export verification.

## 6. Operating rule
Use Planning mode for:
- Lead Planner
- QA
- Game Slice Engineer
- any cross-file or cross-agent task

Use Fast mode only for small contained follow-up patches.
