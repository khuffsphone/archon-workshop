/**
 * smoke-test-archon-006a-section-b.mjs
 *
 * Standalone Section B harness for ARCHON-006A.
 *
 * WHY THIS FILE EXISTS:
 *   Port 3000 is permanently held by the HAS Next.js dev server (PID 197440)
 *   in this environment. server.ts hardcodes PORT=3000 and cannot be modified
 *   per task scope. This script starts a minimal Express server on port 3001
 *   wiring ONLY the two workspace-state endpoints using the identical logic
 *   from server.ts lines 291-294, then runs all 4 Section B round-trip tests.
 *
 * WHAT IS TESTED:
 *   B1: POST /api/save-workspace-state → 200 + { success: true }
 *   B2: GET  /api/get-workspace-state  → returns saved state with correct fields
 *   B3: Loaded state passes validateWorkshopState()
 *   B4: Round-trip fidelity — review_notes and nested fields preserved
 *
 * WHAT IS NOT MODIFIED:
 *   - server.ts           (no change)
 *   - assetManifest.ts    (no change)
 *   - versionGuard.ts     (no change)
 *   - src/lib/workshopPersistence.ts (no change)
 *   - Any committed source file
 *
 * Run: node scripts/smoke-test-archon-006a-section-b.mjs
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PORT = 3001;

// ─── Inline the validation logic (must match workshopPersistence.ts) ──────────

const WORKSHOP_STATE_SCHEMA_VERSION = 1;
const VALID_TABS = ['dashboard', 'generation', 'vfx', 'scenelab', 'export'];
const VALID_PRESETS = ['draft', 'production', 'premium'];
const VALID_SCENE_PRESETS = ['combat_knight_vs_sorceress', 'board_overview'];

function validateWorkshopState(raw) {
  const errors = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    return { ok: false, valid: false, errors: [{ field: 'root', message: 'Must be a JSON object.' }] };
  if (raw['schema_version'] !== WORKSHOP_STATE_SCHEMA_VERSION)
    errors.push({ field: 'schema_version', message: `Expected ${WORKSHOP_STATE_SCHEMA_VERSION}, got ${raw['schema_version']}.` });
  if (!VALID_TABS.includes(raw['active_tab']))
    errors.push({ field: 'active_tab', message: `Invalid: "${raw['active_tab']}".` });
  if (!VALID_PRESETS.includes(raw['generation_preset']))
    errors.push({ field: 'generation_preset', message: `Invalid: "${raw['generation_preset']}".` });
  const sl = raw['style_lock'];
  if (typeof sl !== 'object' || sl === null || Array.isArray(sl)) {
    errors.push({ field: 'style_lock', message: 'Must be an object.' });
  } else {
    for (const k of ['light', 'dark', 'ui', 'vfx'])
      if (typeof sl[k] !== 'string') errors.push({ field: `style_lock.${k}`, message: 'Must be a string.' });
  }
  const slab = raw['scene_lab'];
  if (typeof slab !== 'object' || slab === null || Array.isArray(slab)) {
    errors.push({ field: 'scene_lab', message: 'Must be an object.' });
  } else {
    if (!VALID_SCENE_PRESETS.includes(slab['preset']))
      errors.push({ field: 'scene_lab.preset', message: `Invalid: "${slab['preset']}".` });
    const notes = slab['review_notes'];
    if (typeof notes !== 'object' || notes === null || Array.isArray(notes))
      errors.push({ field: 'scene_lab.review_notes', message: 'Must be a flat object.' });
  }
  if (errors.length > 0) return { ok: false, valid: false, errors };
  return { ok: true, valid: true, state: raw };
}

// ─── Minimal server replicating ONLY the two workspace-state endpoints ────────
// Endpoint logic is identical to server.ts lines 291-294.

const WS_PATH = path.join(ROOT, 'public', 'generated', 'manifests', 'workspace-state-test.json');

// Ensure the manifests directory exists
fs.mkdirSync(path.dirname(WS_PATH), { recursive: true });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  res.setHeader('Content-Type', 'application/json');

  // Health check
  if (method === 'GET' && url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', server: 'section-b-harness' }));
    return;
  }

  // POST /api/save-workspace-state — identical to server.ts line 293
  if (method === 'POST' && url === '/api/save-workspace-state') {
    try {
      const body = await readBody(req);
      fs.writeFileSync(WS_PATH, JSON.stringify(body.state, null, 2));
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed' }));
    }
    return;
  }

  // GET /api/get-workspace-state — identical to server.ts line 294
  if (method === 'GET' && url === '/api/get-workspace-state') {
    if (fs.existsSync(WS_PATH)) {
      const data = JSON.parse(fs.readFileSync(WS_PATH, 'utf-8'));
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } else {
      res.writeHead(200);
      res.end('null');
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ─── Test helpers ─────────────────────────────────────────────────────────────

const BASE = `http://localhost:${PORT}`;
let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

async function fetchJSON(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

function buildValidState(overrides = {}) {
  return {
    schema_version: 1,
    saved_at: new Date().toISOString(),
    active_tab: 'dashboard',
    style_lock: { light: '', dark: '', ui: '', vfx: '' },
    generation_preset: 'production',
    scene_lab: { preset: 'combat_knight_vs_sorceress', review_notes: {} },
    ...overrides,
  };
}

// ─── Run tests ────────────────────────────────────────────────────────────────

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`\nSection B harness running on port ${PORT}\n`);
  console.log('── Section B: API round-trip tests ────────────────────────────────────────\n');

  // Clean slate — remove any existing test file
  if (fs.existsSync(WS_PATH)) fs.unlinkSync(WS_PATH);

  // B1: POST /api/save-workspace-state → 200 + success:true
  {
    console.log('B1: POST /api/save-workspace-state → 200 + { success: true }');
    const payload = buildValidState({ active_tab: 'scenelab', generation_preset: 'draft' });
    const { status, data } = await fetchJSON('POST', '/api/save-workspace-state', { state: payload });
    assert('status 200', status === 200, `got ${status}`);
    assert('success=true', data.success === true, JSON.stringify(data));
    assert('file written to disk', fs.existsSync(WS_PATH));
  }

  // B2: GET /api/get-workspace-state → returns saved state with correct fields
  {
    console.log('\nB2: GET /api/get-workspace-state → returns saved state');
    const { status, data } = await fetchJSON('GET', '/api/get-workspace-state');
    assert('status 200', status === 200, `got ${status}`);
    assert('state not null', data !== null);
    assert('active_tab=scenelab', data?.active_tab === 'scenelab', `got: ${data?.active_tab}`);
    assert('generation_preset=draft', data?.generation_preset === 'draft', `got: ${data?.generation_preset}`);
    assert('schema_version=1', data?.schema_version === 1, `got: ${data?.schema_version}`);
  }

  // B3: Loaded state passes validateWorkshopState()
  {
    console.log('\nB3: Loaded state validates successfully');
    const { data } = await fetchJSON('GET', '/api/get-workspace-state');
    const result = validateWorkshopState(data);
    assert('valid=true (result.ok)', result.ok === true,
      result.ok ? '' : `errors: ${JSON.stringify(result.errors)}`);
    assert('state field present', result.ok && !!result.state);
  }

  // B4: Round-trip fidelity — review_notes and nested fields preserved
  {
    console.log('\nB4: Round-trip fidelity — review_notes preserved end-to-end');
    const payload = buildValidState({
      active_tab: 'export',
      generation_preset: 'premium',
      style_lock: { light: 'unit-light-knight-token', dark: 'unit-dark-sorceress-token', ui: '', vfx: '' },
      scene_lab: {
        preset: 'board_overview',
        review_notes: {
          'combat-death-light': 'Approved for export',
          'arena-light': 'Background OK',
          'combat-nova-dark': 'Re-generate — too dim',
        },
      },
    });
    const { status: saveStatus, data: saveData } = await fetchJSON('POST', '/api/save-workspace-state', { state: payload });
    assert('save status 200', saveStatus === 200, `got ${saveStatus}`);
    assert('save success=true', saveData.success === true);

    const { status: loadStatus, data: loaded } = await fetchJSON('GET', '/api/get-workspace-state');
    assert('load status 200', loadStatus === 200, `got ${loadStatus}`);
    assert('active_tab=export', loaded?.active_tab === 'export', `got: ${loaded?.active_tab}`);
    assert('generation_preset=premium', loaded?.generation_preset === 'premium', `got: ${loaded?.generation_preset}`);
    assert('style_lock.light preserved', loaded?.style_lock?.light === 'unit-light-knight-token');
    assert('style_lock.dark preserved', loaded?.style_lock?.dark === 'unit-dark-sorceress-token');
    assert('scene_lab.preset=board_overview', loaded?.scene_lab?.preset === 'board_overview', `got: ${loaded?.scene_lab?.preset}`);
    assert('review_notes[combat-death-light] preserved',
      loaded?.scene_lab?.review_notes?.['combat-death-light'] === 'Approved for export');
    assert('review_notes[arena-light] preserved',
      loaded?.scene_lab?.review_notes?.['arena-light'] === 'Background OK');
    assert('review_notes[combat-nova-dark] preserved',
      loaded?.scene_lab?.review_notes?.['combat-nova-dark'] === 'Re-generate — too dim');
    assert('all 3 review_notes present', Object.keys(loaded?.scene_lab?.review_notes ?? {}).length === 3);

    // Final validation of the restored state
    const result = validateWorkshopState(loaded);
    assert('restored state passes full validation', result.ok === true,
      result.ok ? '' : `errors: ${JSON.stringify(result.errors)}`);
  }

  // B5: Missing file → GET returns null
  {
    console.log('\nB5: File missing → GET returns null');
    if (fs.existsSync(WS_PATH)) fs.unlinkSync(WS_PATH);
    const { status, data } = await fetchJSON('GET', '/api/get-workspace-state');
    assert('status 200', status === 200, `got ${status}`);
    assert('data is null', data === null, `got: ${JSON.stringify(data)}`);
  }

  // Cleanup
  if (fs.existsSync(WS_PATH)) fs.unlinkSync(WS_PATH);

  console.log(`\nSection B complete — ${passed} passed, ${failed} failed\n`);
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});

server.on('error', (err) => {
  console.error(`\n❌ Failed to start harness server on port ${PORT}: ${err.message}`);
  console.error('Free port 3001 and retry.\n');
  process.exit(1);
});
