# ARCHON-006 — Known Limitations and Roadmap

**Repo:** `archon-workshop`
**Applies to:** ARCHON-006 VFX Pipeline (006A–006F)
**Last updated:** 2026-04-29

---

## 1. Known Limitations

### 1.1 No In-Game Integration Review
Generated VFX assets are saved to `public/generated/` and referenced in `asset-manifest.json`, but no workflow exists to review, approve, or reject them before they are used in `archon-game`. Any generated file is immediately available to the game's asset pipeline.

**Implication:** A low-quality or incorrect generation can propagate to the game without a human review gate.

### 1.2 No Audio VFX Pipeline
The ARCHON-006 series covers image-based VFX assets only. Audio VFX (impact sounds, ambient loops, spell casts) do not have a corresponding catalog, queue, or generation pipeline.

### 1.3 Sequential Only (No Parallel Batching)
Batch generation is strictly sequential (`concurrency: 1`). Each job waits for the previous to complete before starting. Large queues (12+ items) will take significant wall-clock time at the 2000ms rate-limit delay.

### 1.4 Manual Retry Only
When a job fails, the operator must click **Retry** manually. There is no automatic retry, exponential backoff, or dead-letter queue.

### 1.5 Fixed Rate-Limit Delay
The 2000ms delay between provider calls is a hardcoded constant in `VFXWorkflowPanel.tsx`. It is not configurable from the UI or from environment variables.

### 1.6 Batch Terminates on Tab Close
The batch runner is an async loop in React component state. If the browser tab is closed or the page is refreshed while a batch is running, the loop terminates silently. Remaining `QUEUED` entries are not persisted across refresh.

**Workaround:** Export queue briefs before closing if you need to record what was not processed.

### 1.7 No Asset Quality Scoring
There is no mechanism to rate, score, or compare generated assets. The first successful generation for a slot is accepted as-is.

### 1.8 Provider Dependency
All generation depends on the Gemini API. Rate limits, outages, or billing blocks will cause generation failures. There is no fallback provider.

---

## 2. Risks

### 2.1 API Quota Exhaustion
Running a full 12-item batch against Gemini will consume a significant number of generation credits. Repeated retries on failure can accelerate quota exhaustion.

**Mitigation:** Pause or abort the batch before retrying failed entries. Monitor API usage in the Google AI Studio console.

### 2.2 Generated Asset Commit Leak
If an operator accidentally runs `git add .` instead of staging specific files, generated assets in `public/generated/` could be committed to the repository.

**Mitigation:** The `.gitignore` prevents untracked files from being seen by default, but `git add -f` can override it. Never use `git add .` or `git add -f` without reviewing the diff.

### 2.3 Manifest Staleness
The runtime `asset-manifest.json` is written by the server's `/api/save-asset` endpoint. If this file is manually edited or deleted, the asset manifest will become inconsistent with the files on disk.

**Mitigation:** Never manually edit `public/generated/asset-manifest.json`. If it becomes corrupt, delete it and regenerate affected assets.

---

## 3. Operational Cautions

- Do not run `npm run build` as a substitute for `npm run dev` during generation sessions. The production build does not include the dev server endpoints.
- Do not expose the Workshop on a public network. The `/api/generate-*` endpoints do not require authentication and would allow unrestricted provider calls.
- Do not commit `.env` or `.env.local`. The API key must remain local.

---

## 4. Provider / API Limitations

| Limitation | Detail |
|---|---|
| Rate limits | Gemini API enforces per-minute and per-day quotas. The 2000ms delay between calls is a conservative safeguard, not a guarantee. |
| Model availability | Generation quality depends on the Gemini model version configured in `src/lib/gemini.ts`. Model upgrades require code changes. |
| Image-only | The current pipeline generates images. Audio generation uses a separate endpoint but has no VFX catalog or queue integration. |
| Prompt sensitivity | Generation quality is highly dependent on the `prompt_brief` in `vfxCatalog.ts`. Poor prompts produce poor assets. |

---

## 5. Generated Artifact Policy

- All AI-generated files live in `public/generated/`.
- This directory is covered by `.gitignore` and must never be committed.
- `asset-manifest.json` inside `public/generated/` is a runtime file written by the server. It is also gitignored.
- Generated ZIPs in `public/exports/` are also gitignored.
- Intentional, curated assets should be promoted to a separate source-controlled location (not yet implemented).

---

## 6. Asset Quality Limitations

- Generated VFX assets are prompt-driven. Quality varies between runs, even for identical prompts.
- No automated quality gate exists. Human review is the only quality control mechanism.
- There is no A/B comparison or side-by-side view of alternative generations for the same slot.
- The Gemini model may produce assets that are technically valid but stylistically inconsistent with the Archon visual design language.

---

## 7. Current Non-Goals

These items are explicitly out of scope for ARCHON-006 and the foreseeable future unless a new milestone is approved:

- Parallel / concurrent generation
- Automatic retry with backoff
- Cloud storage of generated assets
- VFX animation (assets are static images)
- Real-time game preview of generated VFX
- Multi-provider fallback (e.g., Stable Diffusion, DALL-E)
- Background generation without operator action
- GitHub Actions automation for generation
- MCP integration

---

## 8. Recommended Next Work

Listed in rough priority order. None of these are committed milestones — they are recommendations for the operator to consider.

### ARCHON-007A — VFX Asset Review and Approval Workflow
Add a review step between generation and game integration. Operators should be able to preview, approve, reject, and regenerate individual VFX assets before they are packaged for the game.

**Why now:** Without a review gate, low-quality generations propagate automatically. This is the most significant gap in the current pipeline.

### ARCHON-007B — VFX Quality Scoring / Curation
Allow operators to tag generated assets with quality ratings or notes. Maintain a history of generated alternatives per slot so the best can be selected.

**Why:** Enables systematic improvement of asset quality over time rather than accepting the first successful generation.

### ARCHON-007C — Audio VFX Companion Pipeline
Build a parallel pipeline for audio VFX assets: catalog of sound presets (impact, ambient, cast), queue, and generation via the Gemini audio endpoint.

**Why:** Visual VFX without audio is an incomplete combat experience.

### ARCHON-007D — Export Contract Hardening for Game Consumption
Add schema validation to the ZIP export/import pipeline so that `archon-game` can detect and reject incompatible asset packs gracefully.

**Why:** The current contract is frozen but not enforced at the boundary. A schema version mismatch causes silent failures in game.

### PLAYWRIGHT-001 — Localhost-only Browser Evidence Pilot
Evaluate using Playwright to capture evidence screenshots and recordings for browser verification tasks, replacing the current browser subagent approach.

**Why:** The current evidence recordings are not deterministic and cannot be re-run in CI. Playwright would make browser evidence reproducible.

### MCP-001 — Read-only GitHub MCP Feasibility
Assess whether adding a read-only GitHub MCP tool would safely enable agents to reference PR history and issue context without write access.

**Why:** Agents currently have no visibility into PR review history or issue discussions. Read-only access could improve task grounding.
