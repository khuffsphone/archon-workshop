# Archon Workshop — Repo Map

A quick-reference guide to what lives where. Read this when orienting to the codebase or when planning a task that touches multiple areas.

---

## Top-Level Layout

```
archon-workshop/
├── src/                  React + TypeScript app (Vite)
├── server.ts             Express backend — generation pipeline, asset saving
├── scripts/              Smoke tests (Node ESM, tsx)
├── docs/                 Walkthroughs, current state, agent docs
├── .agents/              Agent rules, workflows, skills
├── public/
│   ├── generated/        AI-generated assets — GITIGNORED, do not commit
│   └── exports/          ZIP export bundles — GITIGNORED, do not commit
├── dist/                 Vite build output — GITIGNORED
├── AGENTS.md             Root agent read-order entry point
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## `src/` — Application Source

### Entry Point

| File | Purpose |
|---|---|
| `src/main.tsx` | Vite entry — mounts React app |
| `src/App.tsx` | Root component — all panel state, tab routing, generation wiring |
| `src/index.css` | Global styles — design tokens, panel layouts |

### `src/lib/` — Core Libraries

| File | Purpose | Frozen? |
|---|---|---|
| `assetManifest.ts` | Asset schema (`Asset` type), `INITIAL_ASSETS` roster, `CombatPackManifest` | ⚠️ Frozen — see `12-contract-protection.md` |
| `versionGuard.ts` | Schema version enforcement for ZIP import | ⚠️ Frozen |
| `gemini.ts` | Gemini API client — image and audio generation | Sensitive |
| `promptTemplates.ts` | `getPromptForAsset` — routes asset IDs to generation prompts | |
| `expansionAssets.ts` | Expansion pack asset definitions | |
| `vfxCatalog.ts` | VFX preset catalog — 12 combat presets, `prompt_brief`, metadata | |
| `vfxQueue.ts` | VFX generation queue — lifecycle helpers, stats, export | |
| `workshopPersistence.ts` | Workshop UI state persistence (localStorage) | |

### `src/features/` — Panel Components

| Directory | Component | Purpose |
|---|---|---|
| `generation/` | `GenerationPanel.tsx` | Asset-by-asset generation UI; `useGeneration` hook |
| `export/` | `ExportPanel.tsx` | ZIP export/import; `exportFullPack`, `exportCombatPack`, `importPack` |
| `vfx/` | `VFXWorkflowPanel.tsx` | VFX catalog browse, filter, queue, generate |
| `scenelab/` | `SceneLabPanel.tsx` | In-context VFX preview and approve/reject |

---

## `server.ts` — Backend Pipeline

| Endpoint | Purpose |
|---|---|
| `POST /api/generate-image` | Calls Gemini image generation |
| `POST /api/generate-audio` | Calls Gemini audio generation |
| `POST /api/save-asset` | Saves generated file to `public/generated/`; updates manifest |
| `POST /api/materialize-assets` | Bulk materialization helper |
| `GET /api/health` | Health check |

**Frozen behavior:** `save-asset` is the only path that writes to `asset-manifest.json`. Do not write manifest data from client code.

---

## `scripts/` — Smoke Tests

| File | Covers |
|---|---|
| `smoke-test-archon-006a.mjs` | Asset manifest schema, INITIAL_ASSETS structure |
| `smoke-test-archon-006a-section-b.mjs` | Extended manifest validation |
| `smoke-test-archon-006b.mjs` | VFX catalog structure, filter, export (267 assertions) |
| `smoke-test-archon-006c.mjs` | VFX queue lifecycle helpers (221 assertions) |
| `smoke-test-archon-006d.mjs` | Generation transition helpers + slot alignment (11 assertions) |

Run command: `node --import=tsx/esm scripts/smoke-test-<task-id>.mjs`

---

## `docs/` — Documentation

| File / Directory | Purpose |
|---|---|
| `current-state.md` | Authoritative snapshot of current Workshop + game state |
| `walkthrough-archon-006a.md` | VFX catalog foundation closeout |
| `walkthrough-archon-006b.md` | VFX workflow panel closeout |
| `walkthrough-archon-006c.md` | VFX queue foundation closeout |
| `walkthrough-archon-006d.md` | VFX generation integration closeout |
| `agent-cheat-sheet.md` | Quick reference for agents |
| `kickoff-prompts/` | Per-task operator prompts |
| `handoff-templates/` | Agent-to-agent handoff format |
| `task-groups/` | Part 1 task group planning docs |

---

## `.agents/` — Agent Instruction System

| Path | Purpose |
|---|---|
| `.agents/README.md` | **Read first** — precedence, read order, model rotation |
| `.agents/rules/10-13` | Current ARCHON-era rules — non-negotiable |
| `.agents/rules/00-05` | Legacy rules — yield to 10–13 on conflict |
| `.agents/workflows/` | Workflow protocols triggered by task type |
| `.agents/skills/` | Domain-specific skill packs (11 subdirectories) |

---

## Gitignored Paths (Never Commit)

| Path | Content |
|---|---|
| `public/generated/` | AI-generated images and audio |
| `public/exports/` | ZIP export bundles |
| `*.zip` | Export archives |
| `dist/` | Vite production build |
| `.env`, `.env.local` | API keys and secrets |
| `node_modules/` | npm dependencies |

---

## Key Frozen Contracts

These paths require an explicit freeze-list acknowledgment before modification. See `12-contract-protection.md`.

| Item | Why frozen |
|---|---|
| `CombatPackManifest` interface | Game consumer contract |
| `COMBAT_PACK_SCHEMA_VERSION` | Downstream ingestion version sentinel |
| ZIP export structure (`exportFullPack`, `exportCombatPack`) | `archon-game` ingestion depends on this format |
| `importPack` behavior | Same downstream risk |
| `asset-manifest.json` (runtime, in `public/generated/`) | Live asset data — server pipeline writes only |
