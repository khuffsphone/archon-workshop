/**
 * smoke-test-archon-006a.mjs
 *
 * Tests for ARCHON-006A: Workshop Persistence and Restore.
 *
 * Section A — Unit tests for validateWorkshopState() (no server required).
 * Section B — API round-trip tests (requires server running on localhost:3000).
 *
 * Run: node scripts/smoke-test-archon-006a.mjs
 *
 * The server round-trip tests are skipped gracefully if the server is not running.
 */

// ─── Inline a copy of the validation logic so the smoke test is self-contained
// (avoids needing a TypeScript/ESM transpiler for .ts imports at test time).
// Must be kept in sync with src/lib/workshopPersistence.ts.

const WORKSHOP_STATE_SCHEMA_VERSION = 1;
const VALID_TABS = ['dashboard', 'generation', 'vfx', 'scenelab', 'export'];
const VALID_PRESETS = ['draft', 'production', 'premium'];
const VALID_SCENE_PRESETS = ['combat_knight_vs_sorceress', 'board_overview'];

function validateWorkshopState(raw) {
  const errors = [];

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: [{ field: 'root', message: 'State must be a JSON object.' }] };
  }

  // schema_version
  if (raw['schema_version'] !== WORKSHOP_STATE_SCHEMA_VERSION) {
    errors.push({
      field: 'schema_version',
      message: `Expected schema_version ${WORKSHOP_STATE_SCHEMA_VERSION}, got ${String(raw['schema_version'])}.`,
    });
  }

  // active_tab
  if (!VALID_TABS.includes(raw['active_tab'])) {
    errors.push({
      field: 'active_tab',
      message: `Invalid active_tab "${String(raw['active_tab'])}".`,
    });
  }

  // generation_preset
  if (!VALID_PRESETS.includes(raw['generation_preset'])) {
    errors.push({
      field: 'generation_preset',
      message: `Invalid generation_preset "${String(raw['generation_preset'])}".`,
    });
  }

  // style_lock
  const sl = raw['style_lock'];
  if (typeof sl !== 'object' || sl === null || Array.isArray(sl)) {
    errors.push({ field: 'style_lock', message: 'style_lock must be an object.' });
  } else {
    for (const key of ['light', 'dark', 'ui', 'vfx']) {
      if (typeof sl[key] !== 'string') {
        errors.push({ field: `style_lock.${key}`, message: `style_lock.${key} must be a string.` });
      }
    }
  }

  // scene_lab
  const slab = raw['scene_lab'];
  if (typeof slab !== 'object' || slab === null || Array.isArray(slab)) {
    errors.push({ field: 'scene_lab', message: 'scene_lab must be an object.' });
  } else {
    if (!VALID_SCENE_PRESETS.includes(slab['preset'])) {
      errors.push({
        field: 'scene_lab.preset',
        message: `Invalid scene_lab.preset "${String(slab['preset'])}".`,
      });
    }
    const notes = slab['review_notes'];
    if (typeof notes !== 'object' || notes === null || Array.isArray(notes)) {
      errors.push({ field: 'scene_lab.review_notes', message: 'scene_lab.review_notes must be a flat object.' });
    } else {
      for (const [k, v] of Object.entries(notes)) {
        if (typeof v !== 'string') {
          errors.push({ field: `scene_lab.review_notes.${k}`, message: `Value for "${k}" must be a string.` });
        }
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, state: raw };
}

function buildValidState(overrides = {}) {
  return {
    schema_version: 1,
    saved_at: new Date().toISOString(),
    active_tab: 'dashboard',
    style_lock: { light: '', dark: '', ui: '', vfx: '' },
    generation_preset: 'production',
    scene_lab: {
      preset: 'combat_knight_vs_sorceress',
      review_notes: {},
    },
    ...overrides,
  };
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// ─── Section A: Unit tests — validateWorkshopState ────────────────────────────

console.log('\n── Section A: Unit tests — validateWorkshopState ──────────────────────────\n');

// A1: Valid complete state passes
{
  console.log('A1: Valid complete state → passes');
  const result = validateWorkshopState(buildValidState());
  assert('valid=true', result.valid === true);
  assert('state returned', result.valid && !!result.state);
}

// A2: Valid state with review notes passes
{
  console.log('\nA2: Valid state with review notes → passes');
  const result = validateWorkshopState(buildValidState({
    scene_lab: {
      preset: 'combat_knight_vs_sorceress',
      review_notes: { 'combat-death-light': 'Looks good', 'combat-death-dark': 'Re-generate' },
    },
  }));
  assert('valid=true', result.valid === true);
}

// A3: Valid board_overview preset passes
{
  console.log('\nA3: Valid board_overview scene preset → passes');
  const result = validateWorkshopState(buildValidState({
    scene_lab: { preset: 'board_overview', review_notes: {} },
  }));
  assert('valid=true', result.valid === true);
}

// A4: null input → fails
{
  console.log('\nA4: null input → fails');
  const result = validateWorkshopState(null);
  assert('valid=false', result.valid === false);
  assert('error on root field', !result.valid && result.errors.some(e => e.field === 'root'));
}

// A5: array input → fails
{
  console.log('\nA5: array input → fails');
  const result = validateWorkshopState([]);
  assert('valid=false', result.valid === false);
}

// A6: Wrong schema_version → fails
{
  console.log('\nA6: schema_version mismatch (version 99) → fails');
  const result = validateWorkshopState(buildValidState({ schema_version: 99 }));
  assert('valid=false', result.valid === false);
  assert('error on schema_version', !result.valid && result.errors.some(e => e.field === 'schema_version'));
}

// A7: Missing schema_version → fails
{
  console.log('\nA7: schema_version undefined → fails');
  const s = buildValidState();
  delete s.schema_version;
  const result = validateWorkshopState(s);
  assert('valid=false', result.valid === false);
  assert('error on schema_version', !result.valid && result.errors.some(e => e.field === 'schema_version'));
}

// A8: Invalid active_tab → fails
{
  console.log('\nA8: active_tab = "settings" (unknown) → fails');
  const result = validateWorkshopState(buildValidState({ active_tab: 'settings' }));
  assert('valid=false', result.valid === false);
  assert('error on active_tab', !result.valid && result.errors.some(e => e.field === 'active_tab'));
}

// A9: All valid active_tab values pass
{
  console.log('\nA9: All valid active_tab values → each passes');
  for (const tab of VALID_TABS) {
    const result = validateWorkshopState(buildValidState({ active_tab: tab }));
    assert(`active_tab=${tab} valid`, result.valid === true);
  }
}

// A10: Invalid generation_preset → fails
{
  console.log('\nA10: generation_preset = "ultra" (unknown) → fails');
  const result = validateWorkshopState(buildValidState({ generation_preset: 'ultra' }));
  assert('valid=false', result.valid === false);
  assert('error on generation_preset', !result.valid && result.errors.some(e => e.field === 'generation_preset'));
}

// A11: All valid presets pass
{
  console.log('\nA11: All valid generation_preset values → each passes');
  for (const p of VALID_PRESETS) {
    const result = validateWorkshopState(buildValidState({ generation_preset: p }));
    assert(`preset=${p} valid`, result.valid === true);
  }
}

// A12: style_lock missing key → fails
{
  console.log('\nA12: style_lock missing "vfx" key → fails');
  const s = buildValidState({ style_lock: { light: '', dark: '', ui: '' } });
  const result = validateWorkshopState(s);
  assert('valid=false', result.valid === false);
  assert('error on style_lock.vfx', !result.valid && result.errors.some(e => e.field === 'style_lock.vfx'));
}

// A13: style_lock is a string → fails
{
  console.log('\nA13: style_lock is a string → fails');
  const result = validateWorkshopState(buildValidState({ style_lock: 'broken' }));
  assert('valid=false', result.valid === false);
  assert('error on style_lock', !result.valid && result.errors.some(e => e.field === 'style_lock'));
}

// A14: Invalid scene_lab preset → fails
{
  console.log('\nA14: scene_lab.preset = "unknown_scene" → fails');
  const result = validateWorkshopState(buildValidState({
    scene_lab: { preset: 'unknown_scene', review_notes: {} },
  }));
  assert('valid=false', result.valid === false);
  assert('error on scene_lab.preset', !result.valid && result.errors.some(e => e.field === 'scene_lab.preset'));
}

// A15: review_notes with non-string value → fails
{
  console.log('\nA15: review_notes value is number → fails');
  const result = validateWorkshopState(buildValidState({
    scene_lab: { preset: 'combat_knight_vs_sorceress', review_notes: { 'asset-id': 42 } },
  }));
  assert('valid=false', result.valid === false);
  assert('error on review_notes field', !result.valid && result.errors.some(e => e.field.startsWith('scene_lab.review_notes')));
}

// A16: review_notes is an array → fails
{
  console.log('\nA16: review_notes is an array → fails');
  const result = validateWorkshopState(buildValidState({
    scene_lab: { preset: 'combat_knight_vs_sorceress', review_notes: ['note1'] },
  }));
  assert('valid=false', result.valid === false);
}

// A17: scene_lab is missing entirely → fails
{
  console.log('\nA17: scene_lab missing → fails');
  const s = buildValidState();
  delete s.scene_lab;
  const result = validateWorkshopState(s);
  assert('valid=false', result.valid === false);
  assert('error on scene_lab', !result.valid && result.errors.some(e => e.field === 'scene_lab'));
}

// A18: Multiple simultaneous errors reported
{
  console.log('\nA18: Multiple fields invalid → all errors reported');
  const result = validateWorkshopState({
    schema_version: 99,
    active_tab: 'bad_tab',
    generation_preset: 'super',
    style_lock: null,
    scene_lab: { preset: 'bad_scene', review_notes: {} },
  });
  assert('valid=false', result.valid === false);
  assert('≥4 errors', !result.valid && result.errors.length >= 4,
    !result.valid ? `got ${result.errors.length}` : '');
}

// A19: Extra/unknown keys in payload → valid (permissive of extra fields)
{
  console.log('\nA19: Extra unknown keys present → still valid');
  const result = validateWorkshopState({ ...buildValidState(), extra_field: 'ignored' });
  assert('valid=true', result.valid === true);
}

// A20: Empty review_notes object → valid
{
  console.log('\nA20: Empty review_notes {} → valid');
  const result = validateWorkshopState(buildValidState({
    scene_lab: { preset: 'board_overview', review_notes: {} },
  }));
  assert('valid=true', result.valid === true);
}

// ─── Section B: API round-trip (requires server on :3000) ─────────────────────

console.log('\n── Section B: API round-trip (requires server on localhost:3000) ──────────\n');

let serverAvailable = false;
try {
  const health = await fetch('http://localhost:3000/api/health', { signal: AbortSignal.timeout(2000) });
  serverAvailable = health.ok;
} catch {
  console.log('  ⚠️  Server not running — skipping API round-trip tests.\n');
}

if (serverAvailable) {
  // B1: Save workspace state
  {
    console.log('B1: POST /api/save-workspace-state → 200 success');
    const payload = buildValidState({ active_tab: 'scenelab', generation_preset: 'draft' });
    const res = await fetch('http://localhost:3000/api/save-workspace-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: payload }),
    });
    const data = await res.json();
    assert('status 200', res.ok);
    assert('success=true', data.success === true);
  }

  // B2: Load workspace state — matches what was saved
  {
    console.log('\nB2: GET /api/get-workspace-state → returns saved state');
    const res = await fetch('http://localhost:3000/api/get-workspace-state');
    assert('status 200', res.ok);
    const data = await res.json();
    assert('state not null', data !== null);
    assert('active_tab=scenelab', data?.active_tab === 'scenelab');
    assert('generation_preset=draft', data?.generation_preset === 'draft');
    assert('schema_version=1', data?.schema_version === 1);
  }

  // B3: Saved state passes validateWorkshopState
  {
    console.log('\nB3: Loaded state validates successfully');
    const res = await fetch('http://localhost:3000/api/get-workspace-state');
    const raw = await res.json();
    const result = validateWorkshopState(raw);
    assert('valid=true', result.valid === true);
  }

  // B4: Save another state, verify round-trip fidelity
  {
    console.log('\nB4: Round-trip fidelity — review_notes preserved');
    const payload = buildValidState({
      active_tab: 'export',
      scene_lab: {
        preset: 'board_overview',
        review_notes: { 'combat-death-light': 'Approved for export', 'arena-light': 'Background OK' },
      },
    });
    await fetch('http://localhost:3000/api/save-workspace-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: payload }),
    });
    const res2 = await fetch('http://localhost:3000/api/get-workspace-state');
    const loaded = await res2.json();
    assert('scene_lab.preset=board_overview', loaded?.scene_lab?.preset === 'board_overview');
    assert('review_notes preserved', loaded?.scene_lab?.review_notes?.['combat-death-light'] === 'Approved for export');
    assert('active_tab=export', loaded?.active_tab === 'export');
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\nARCHON-006A smoke test complete — ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
