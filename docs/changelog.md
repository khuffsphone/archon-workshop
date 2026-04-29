# Changelog — Archon Workshop

All notable changes to the Archon Workshop are documented here.

Format: `## [version or milestone] — YYYY-MM-DD`

---

## [ARCHON-006 VFX Pipeline] — 2026-04-29

### Added

- **VFX Catalog** (`src/lib/vfxCatalog.ts`) — 12 combat VFX presets across 8 families and 3 factions, each with a generation prompt brief, visual tags, timing metadata, and filter support.
- **VFX Queue** (`src/lib/vfxQueue.ts`) — Immutable queue lifecycle: enqueue, cancel, retry, clear, reorder, stats, and JSON export. Statuses: `queued`, `generating`, `completed`, `failed`, `cancelled`.
- **VFX Batch Helpers** (`src/lib/vfxQueue.ts`) — Pure functions `selectNextBatchJob`, `canRunNextJob`, `calculateBatchDelay` for safe sequential batch execution.
- **VFX Workflow Panel** (`src/features/vfx/VFXWorkflowPanel.tsx`) — Full UI: catalog browse with family/faction filters, preset selection, queue management, and generation controls.
- **Controlled Batch Generation** — Start/Pause/Resume/Abort batch execution with a 2000ms provider rate-limit delay between calls.
- **Workshop Persistence** (`src/lib/workshopPersistence.ts`) — `localStorage`-based state persistence and restore across page refreshes.
- **Smoke Tests** — 4 new smoke test scripts (510 total assertions): `006b` (267), `006c` (221), `006d` (11), `006e` (11).
- **Evidence Receipt Enforcement** — `scripts/check-evidence-receipt.mjs` validator and `docs/evidence-receipt-template.md`.
- **Agent Instruction System** — `.agents/` directory with operating rules (10–13), workflows, and skills.

### Documentation

- `docs/walkthrough-archon-006a.md` through `docs/walkthrough-archon-006f.md` — Full closeout walkthroughs with evidence receipts.
- `docs/repo-map.md` — Repository structure reference.
- `docs/release-archon-006-vfx-pipeline.md` — Release snapshot (this release).
- `docs/runbook-vfx-pipeline.md` — Operator runbook.
- `docs/archon-006-known-limitations-and-roadmap.md` — Known limitations and next milestone recommendations.

### Protected (Unchanged)

- `CombatPackManifest` interface — frozen
- `COMBAT_PACK_SCHEMA_VERSION` — frozen
- ZIP export/import behavior — frozen
- `archon-game` — untouched

---

*Earlier work predating ARCHON-006 is not captured in this changelog.*
