---
name: vfx-workflow
description: >
  Repeatable specialist instructions for producing and approving one combat VFX
  sprite from archon-workshop. Run this skill once per sprite.
  Owner: Generation + Asset Library agent.
---

# VFX Production Workflow

## Scope
This skill covers production of the 10 combat VFX sprites required for the
Knight vs Sorceress combat slice. All 10 IDs are listed in
`src/features/vfx/VFXWorkflowPanel.tsx` (`COMBAT_SLICE_VFX_IDS`).

## Prerequisites
- `archon-workshop` running at `http://localhost:3000` (`npm run dev`)
- GEMINI_API_KEY present in `.env`
- 131 approved base assets already imported (run Import Pack first)

## Step-by-Step

### 1. Navigate to VFX Tab
Open `http://localhost:3000` → click **✨ VFX** tab.
Confirm all 10 sprite cards are visible with `pending` status dots.

### 2. Select sprites for this run
- Check only the sprites you intend to generate in this session (1–3 max per run).
- Click **Generate Selected**.
- The queue will route each to `flash_image` lane (concurrency 3).

### 3. Monitor generation
- Status dot turns yellow (generating).
- Watch the Dashboard log for completion or error messages.
- On error, the card stays `pending` — retry by selecting it again.

### 4. Review in Scene Lab
- Navigate to **🎬 Scene Lab** tab.
- Select preset **Knight vs Sorceress**.
- Confirm the generated VFX thumbnail appears in the VFX checklist.
- Add a review note (e.g. "flash intensity acceptable, colours match faction").

### 5. Approve (human gate)
- Return to **✨ VFX** tab.
- If the generated image visually meets the faction palette (see `style-decisions.md`):
  - Click **Approve** on the card.
- If it does not meet quality:
  - Click **Reject** → repeat from Step 2.

> [!WARNING]
> **No auto-approval.** You must click Approve for each sprite individually.
> The game's Export Combat Pack step will reject any sprite without `status: "approved"`.

### 6. After all 10 are approved
- Go to **📦 Export** tab.
- Click **Verify Manifest** → confirm `combat_ready: YES ✅`.
- Click **Export Combat Pack**.
- Copy the downloaded ZIP to `archon-game/public/` and extract.

## Artifact Requirement
After each VFX production session, leave an artifact at:
`artifacts/vfx-session-YYYY-MM-DD.md`

Include:
- IDs generated
- IDs approved / rejected
- Rollback note: which version numbers were rejected (so they can be pruned)
- Screenshot or thumbnail embed if available
