# Workflow: Smoke Test Authoring

**Trigger:** Any task that creates a new library module, data schema, or utility function.

**When NOT needed:** CSS-only changes, doc-only changes, minor bug fixes with existing test coverage.

---

## Naming

```
scripts/smoke-test-<task-id>.mjs
```

Examples: `smoke-test-archon-006a.mjs`, `smoke-test-archon-006b.mjs`

## Structure

Organize assertions into labeled sections:

```js
console.log('\nS1: <Section name>');
// assertions for this section
```

Each section must have a clear theme (schema validation, helper output, filter logic, JSON round-trip, etc.).

## Required coverage categories

Every smoke test must cover all categories that apply to the module under test:

| Category | What to test |
|---|---|
| **Schema structure** | Array type, correct length, required fields present |
| **ID uniqueness** | No duplicate IDs or slot values |
| **Required field completeness** | Every record has non-empty string fields |
| **Enum validity** | All typed fields contain only valid enum values |
| **Numeric fields** | Correct type, in valid range, non-negative |
| **Array fields** | Non-empty, all elements correct type |
| **Helper output** | Non-empty, contains expected key fields |
| **JSON round-trip** | `JSON.parse(exportFn())` succeeds, fields preserved |
| **Filter/search** | Pass case, fail case, empty result case |
| **Edge cases** | null input, empty string, wrong type, missing fields |

## Design rules

- **No DOM, no React, no server required** — the test must run in plain Node.js with `tsx` for TypeScript
- **Import from source**, not from a compiled build: `import(...pathToFileURL('src/lib/module.ts')...)`
- **Import command:** `node --import=tsx/esm scripts/smoke-test-<task-id>.mjs`
- **Exit code:** `process.exit(failed > 0 ? 1 : 0)` — build systems can read the result
- **Do not silence errors** — let import failures surface explicitly with a clear message
- **Each assertion has a label** — the label must describe what it is checking

## Output format

```
── ARCHON-<NNN> Smoke Test ──────────────────────────────────

S1: <Section>
  ✅ <label>
  ✅ <label>

S2: <Section>
  ✅ <label>
  ❌ <label>: <detail>

ARCHON-<NNN> smoke test complete — N passed, N failed
```

## Run before committing

```powershell
node --import=tsx/esm scripts/smoke-test-<task-id>.mjs
```

The smoke test must pass with `0 failed` before the task is committed.
If it fails, fix the implementation — do not modify the test assertions.
