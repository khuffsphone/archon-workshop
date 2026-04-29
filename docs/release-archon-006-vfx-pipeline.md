# Release Snapshot — ARCHON-006 VFX Pipeline

**Repo:** `archon-workshop`
**Release Date:** 2026-04-29
**Release Series:** ARCHON-006 (006A through 006F)
**Status:** Complete

---

## 1. Release Title

**ARCHON-006 VFX Pipeline — Full Release**

---

## 2. Scope Summary

The ARCHON-006 series delivered a complete, end-to-end VFX asset generation pipeline inside the Archon Workshop. The pipeline enables operators to browse a curated VFX preset catalog, build and manage a generation queue, run single or controlled batch generation against the Gemini AI provider, and export the resulting queue briefs or ZIP asset packs.

This pipeline operates entirely within the Workshop UI. It does not affect `archon-game` internals, does not auto-run in the background, and does not commit generated files to the repository.

---

## 3. Milestone Summary

### ARCHON-006A — Workshop Persistence and Restore
Implemented `workshopPersistence.ts` to save and restore Workshop UI state (active tab, generation selections, panel scroll) across page refreshes via `localStorage`. Validated with a comprehensive smoke test (asset manifest + INITIAL_ASSETS schema).

### ARCHON-006B — VFX Catalog Foundation
Delivered `vfxCatalog.ts` with 12 combat VFX presets across 8 families (hit, death, spawn, heal, status, ambient, projectile, beam) and 3 factions (light, dark, neutral). Each preset carries a `prompt_brief`, visual tags, and timing metadata. Catalog can be filtered by family and faction, and exported as JSON. Validated with 267 smoke test assertions.

### ARCHON-006C — Batch VFX Queue Foundation
Delivered `vfxQueue.ts` with a complete immutable queue lifecycle: enqueue, cancel, retry, clear terminal entries, stats, reorder, and JSON export. Queue entries carry status (`queued`, `generating`, `completed`, `failed`, `cancelled`), retry counts, error messages, and priority. Validated with 221 smoke test assertions.

### ARCHON-006D — First VFX Queue-to-Generation Integration
Wired the VFX queue to the Gemini generation pipeline via `VFXWorkflowPanel.tsx`. A single queued entry can be generated honestly: status transitions to `generating` only on actual API call, to `completed` only on API success, and to `failed` with a visible error message on any failure. Cancelled entries are skipped. Validated with 11 smoke test assertions (generation transition helpers + slot alignment).

### ARCHON-006E — Controlled Batch VFX Generation Execution
Replaced the uncontrolled `for...of` generation loop with a controlled async batch runner using `useRef` for pause/abort state. Added three pure helper functions (`selectNextBatchJob`, `canRunNextJob`, `calculateBatchDelay`) to the queue library. Added Start/Pause/Resume/Abort batch controls to the UI. Rate-limit delay of 2000ms enforced between provider calls. Validated with 11 smoke test assertions (batch helper logic).

### ARCHON-006F — VFX Pipeline Stabilization and Release Candidate Review
Performed an end-to-end integration test of the complete 006A–006E pipeline: catalog filtering, queue management, single generation, batch generation with pause/resume/abort, queue export, and asset-pack export/import controls. No defects found. All smoke tests passed. Generated artifact hygiene confirmed.

---

## 4. Current VFX Pipeline Capabilities

| Capability | Status |
|---|---|
| Browse 12 VFX presets with family/faction filters | ✅ |
| Select and enqueue multiple presets | ✅ |
| Duplicate presets in queue (distinct `queueId`) | ✅ |
| Cancel / retry / clear individual queue entries | ✅ |
| Reorder queue entries | ✅ |
| Generate a single queued entry | ✅ |
| Controlled batch generation (sequential, rate-limited) | ✅ |
| Pause batch after current in-flight job | ✅ |
| Resume paused batch | ✅ |
| Abort batch (stops after current job, leaves remaining queued) | ✅ |
| Skip cancelled entries during batch | ✅ |
| Retry failed entries | ✅ |
| Show error message on failed entries | ✅ |
| Export queue brief as JSON | ✅ |
| Export full asset pack as ZIP | ✅ (existing pipeline, unmodified) |
| Import asset pack from ZIP | ✅ (existing pipeline, unmodified) |
| Persist workspace state across refresh | ✅ |
| Generated assets gitignored | ✅ |

---

## 5. What Is Explicitly Not Included

- No background generation (pipeline runs only on explicit user action)
- No parallel batch execution (strictly sequential, `concurrency: 1`)
- No automated retry on failure (user must click Retry manually)
- No ComfyUI integration
- No MCP integration
- No GitHub Actions automation
- No new AI providers beyond Gemini
- No VFX preview in the game client (assets generated but not yet reviewed/approved)
- No VFX quality scoring or curation workflow
- No audio VFX companion pipeline

---

## 6. Verification Summary

### Smoke Tests

| Script | Assertions | Result |
|---|---|---|
| `smoke-test-archon-006b.mjs` | 267 | ✅ 267 passed, 0 failed |
| `smoke-test-archon-006c.mjs` | 221 | ✅ 221 passed, 0 failed |
| `smoke-test-archon-006d.mjs` | 11 | ✅ 11 passed, 0 failed |
| `smoke-test-archon-006e.mjs` | 11 | ✅ 11 passed, 0 failed |

### Build and Lint

| Check | Result |
|---|---|
| `npm run lint` (tsc --noEmit) | ✅ Exit code 0, 0 errors |
| `npm run build` (vite build) | ✅ Exit code 0, 55 modules, built in ~7s |

### Browser Verification

End-to-end integration verified in ARCHON-006F using `browser_subagent`. Recording: `archon_006f_pipeline_integration_*.webp`. 13-point verification checklist covering catalog, queue, batch, pause/resume/abort, export, and persistence confirmed. Evidence Ladder Level 4 reached (Persistence/Export).

### Evidence Receipt

`node scripts/check-evidence-receipt.mjs docs/walkthrough-archon-006f.md` → ✅ PASSED (10/10 checks).

---

## 7. Generated Artifact Hygiene Status

- `public/generated/` is covered by `.gitignore:10`
- `git check-ignore -v public/generated/` → `.gitignore:10:public/generated/ public/generated/`
- `git status -uall --short` → clean (no generated assets staged or untracked)
- `git ls-files --others --exclude-standard` → empty (no leaked artifacts)

Generated files are produced at runtime and are never committed to the repository.

---

## 8. Protected Contract Status

| Contract | Status |
|---|---|
| `CombatPackManifest` interface | ✅ Unchanged |
| `COMBAT_PACK_SCHEMA_VERSION` | ✅ Unchanged |
| ZIP export structure (`exportFullPack`, `exportCombatPack`) | ✅ Unchanged |
| `importPack` behavior | ✅ Unchanged |
| `asset-manifest.json` runtime write path | ✅ Server-only, unchanged |
| `archon-game` consumer expectations | ✅ Unchanged |

---

## 9. Known Limitations

See `docs/archon-006-known-limitations-and-roadmap.md` for the full list.

Summary:
- Generated VFX assets are not yet reviewed, approved, or scored before game integration
- Batch execution dies silently if the browser tab is closed mid-run
- No automatic retry on provider error (manual retry only)
- The 2000ms rate-limit delay is a fixed constant, not configurable from the UI
- No audio VFX pipeline exists yet
- Asset quality is entirely dependent on the Gemini provider's output; no curation layer exists

---

## 10. Recommended Next Milestones

| Milestone | Description |
|---|---|
| ARCHON-007A | VFX Asset Review and Approval Workflow |
| ARCHON-007B | VFX Quality Scoring / Curation |
| ARCHON-007C | Audio VFX Companion Pipeline |
| ARCHON-007D | Export Contract Hardening for Game Consumption |
| PLAYWRIGHT-001 | Localhost-only browser evidence pilot |
| MCP-001 | Read-only GitHub MCP feasibility |

---

## 11. Proposed Release Tag / Version Marker

**Proposed tag:** `v0.6.0-vfx-pipeline`

> **This tag has NOT been created.** Explicit operator approval is required before running `git tag`. This document names the proposal only.

---

## 12. Walkthrough Documents

| Milestone | Walkthrough |
|---|---|
| 006A | `docs/walkthrough-archon-006a.md` |
| 006B | `docs/walkthrough-archon-006b.md` |
| 006C | `docs/walkthrough-archon-006c.md` |
| 006D | `docs/walkthrough-archon-006d.md` |
| 006E | `docs/walkthrough-archon-006e.md` |
| 006F | `docs/walkthrough-archon-006f.md` |
| 006G | `docs/walkthrough-archon-006g.md` |
