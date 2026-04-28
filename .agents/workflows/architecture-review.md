# Workflow: Architecture Review

**Trigger:** Before implementing any task that:
- Adds a new library module under `src/lib/`
- Changes how state flows between `App.tsx` and a panel component
- Adds or modifies a server endpoint
- Introduces a new data contract (schema, type, or serialization format)
- Touches the persistence or export pipeline

**When NOT needed:** CSS additions, minor UI copy changes, additive catalog entries, doc updates.

---

## Steps

### 1. Read current state

Before proposing any design:

- Read the module to be changed in full
- Read its direct dependents (who imports it?)
- Read `src/lib/assetManifest.ts` to confirm your change does not touch the frozen schema
- Read `src/lib/workshopPersistence.ts` if touching state persistence
- Run `grep -r "import.*<module>"` to find all import sites

### 2. Identify contracts at risk

For each file you plan to modify, answer:

| Question | Answer |
|---|---|
| Does this file export types consumed by `App.tsx`? | — |
| Does this file export types consumed by `archon-game`? | — |
| Does changing this file affect the ZIP export structure? | — |
| Does changing this file affect `asset-manifest.json`? | — |
| Does changing this file affect existing approved assets? | — |

If any answer is "yes" or "unknown", stop and document the risk before proceeding.

### 3. State ownership check

If adding state:
- Where will this state live? (App-level, panel-level, library-level?)
- Does it need to survive browser refresh? If yes, does it belong in `WorkshopUIState`?
- Is it transient UI state (selection, loading flags)? If yes, keep it local to the panel.
- Does it need to be included in export/import flows?

### 4. Dependency check

Before importing any package:
- Check `package.json` — is it listed in `dependencies` or `devDependencies`?
- If not listed, do not import it. Propose adding it with `npm install <pkg>` and wait for approval.
- Prefer local helpers over new dependencies for simple utilities.

### 5. Propose the design

Return a proposed design including:
- New files to create (with purpose)
- Files to modify (with scope of change)
- Files explicitly NOT touched
- State ownership decisions
- Any contracts touched and whether acknowledgment is needed

### 6. Wait for confirmation before writing

Do not write any code until the operator confirms the design is acceptable.
