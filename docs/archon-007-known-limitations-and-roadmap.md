# ARCHON-007 — Known Limitations and Roadmap

**Repo:** `archon-workshop`
**Applies to:** ARCHON-007 Review Workflow (007A–007C)
**Last updated:** 2026-05-01

---

## 1. Known Limitations

### 1.1 No In-Game Asset Integration
The review and approval workflow operates entirely within the Workshop. Approved assets are locked and protected from overwrite, but there is no automated mechanism to wire reviewed VFX assets into `archon-game`. An operator must manually export a combat pack and run the copy script to integrate assets into the game client.

**Implication:** Approval in the Workshop does not guarantee the game reflects the approved state.

### 1.2 No Batch Review Actions
The Dashboard provides one-at-a-time approve/reject actions per asset. There is no "Approve All Pending" or "Reject All Below Threshold" bulk action. Large queues require sequential review.

### 1.3 Review Notes Not Schema-Versioned
Review notes are stored in the existing `Asset.notes` field in `asset-manifest.json`. They are not schema-versioned in `workshopPersistence.ts` (`WORKSHOP_STATE_SCHEMA_VERSION` is unchanged). If future schema changes alter the `Asset` type, review note data may need a migration step.

### 1.4 Scene Lab Preset-by-Preset Navigation
The Scene Lab detailed review UI requires the operator to switch between presets (e.g., "Knight vs Sorceress" vs. "Board Overview") to see different asset subsets. Assets not assigned to a preset do not appear in Scene Lab's contextual view.

**Workaround:** Use the Dashboard "All" or "Pending" filter for a cross-preset view. Use Scene Lab for context-aware combat slice review.

### 1.5 No Audio VFX Review Pipeline
The ARCHON-007 series covers image-based VFX assets only. Audio VFX (impact sounds, ambient loops, spell casts) have no review catalog, queue, or approval workflow.

### 1.6 Dashboard Review Notes Are Session-Scoped
Review notes entered in the Dashboard's inline note field are stored in React state (`dashboardReviewNotes`) which survives tab switching but is cleared on page refresh. The note is durably written to `Asset.notes` only at the moment of approval or rejection. Partial/draft notes are lost on refresh.

### 1.7 No A/B Comparison or Regeneration From Dashboard
The Dashboard is a command center for review status management. It does not support side-by-side comparison of alternative generations for the same asset slot, nor does it provide a re-generate button. Those operations must be performed in the VFX or Generation tab.

### 1.8 No Quality Scoring
There is no automated quality rating, score, or threshold. Human review is the only quality control mechanism. The first generation that passes human review is accepted.

---

## 2. Risks

### 2.1 Protected Asset Cannot Be Updated Without Rejection First
Once an asset is approved and protected, the only way to replace it is to first reject it (which clears `asset_protected`) and then regenerate. There is no "re-approve after regeneration" shortcut.

### 2.2 `asset-manifest.json` Is a Runtime File
The manifest is written by the server's `/api/save-asset` endpoint. If it is manually deleted or becomes corrupt, all review metadata (approval state, notes, protection flags) is lost.

**Mitigation:** Do not manually edit or delete `public/generated/asset-manifest.json`. If recovery is needed, assets must be re-reviewed from scratch.

### 2.3 Generated Asset Commit Leak (Inherited from 006)
If an operator accidentally runs `git add .`, generated assets or runtime manifests could be staged. The `.gitignore` covers `public/generated/` and `public/exports/` but can be overridden with `git add -f`.

**Mitigation:** Always use explicit file staging. Never use `git add .` or `git add -f`.

---

## 3. Operational Cautions

- Do not close the browser tab during batch generation. The batch runner is React state; tab closure terminates the loop silently.
- Do not manually edit `public/generated/asset-manifest.json` to change review state. Always use the Workshop UI.
- Do not use the Dashboard as a substitute for Scene Lab contextual review. The Dashboard lacks combat-layout context (unit positions, VFX overlay preview).

---

## 4. Agent Discipline Limitations (AG-013)

The AG-013 Closeout Language Guardrails apply to all future tasks. The following discipline gaps were identified during the ARCHON-007 series:

- AG previously claimed "repo is clean" without showing `git status -sb`.
- AG previously claimed "browser verified" when only a UI element was visible (not a state-transition trace).
- AG-013 addresses both via claim-word audits and evidence mapping requirements.

These are documented as process improvements, not product defects.

---

## 5. Current Non-Goals

These items are explicitly out of scope for ARCHON-007 and the foreseeable future unless a new milestone is approved:

- Automated quality scoring or model-based asset review
- Batch approve/reject actions
- In-game VFX preview from the Workshop
- Audio VFX pipeline
- Schema version bump for review metadata
- Multi-provider fallback for generation
- Background generation
- GitHub Actions automation

---

## 6. Recommended Next Work

Listed in rough priority order. None of these are committed milestones — they are recommendations for the operator to consider.

### ARCHON-008A — Game-Side Asset Integration
Wire approved VFX assets from the Workshop into `archon-game` automatically. When an asset is approved and exported, `archon-game`'s combat pack manifest should reflect the new asset without a manual copy script.

**Why now:** The review gate is operational. The remaining gap is automated game-side integration of reviewed assets.

### ARCHON-008B — Batch Dashboard Review
Add "Approve All Pending" and batch reject controls to the Dashboard. This is useful once generation volume scales beyond a handful of assets per session.

**Why:** One-at-a-time review becomes a bottleneck at scale.

### ARCHON-008C — Audio VFX Companion Pipeline
Build a parallel pipeline for audio VFX: catalog of sound presets, generation queue, Gemini audio endpoint integration, and a review/approval workflow.

**Why:** Visual VFX without audio is an incomplete combat experience.

### ARCHON-008D — Export Contract Hardening
Add schema validation to the ZIP export/import pipeline so that `archon-game` can detect and reject incompatible asset packs gracefully.

**Why:** The contract is frozen but not enforced at the boundary. A schema version mismatch causes silent failures in the game.

### PLAYWRIGHT-002 — Playwright Evidence Recording Promotion
Promote Playwright MCP browser evidence collection to a repeatable, documented standard for all browser verification tasks. Define minimum evidence ladder levels per task type.

**Why:** The current Playwright evidence process is ad-hoc. Formalizing it reduces closeout ambiguity.
