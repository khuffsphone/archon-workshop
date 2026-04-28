/**
 * smoke-test-archon-006b.mjs
 *
 * Unit smoke tests for ARCHON-006B — Combat VFX Pipeline Foundation.
 * Tests the vfxCatalog.ts module directly (compiled via tsx/node).
 *
 * Does NOT require a running dev server.
 *
 * Run: node --import=tsx/esm scripts/smoke-test-archon-006b.mjs
 * (tsx handles TypeScript imports)
 */

import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── Load the catalog module via tsx (TypeScript-aware) ───────────────────────

let catalog;
try {
  // tsx registers TypeScript transforms for dynamic import
  catalog = await import(pathToFileURL(path.join(ROOT, 'src/lib/vfxCatalog.ts')).href);
} catch (e) {
  console.error('\n❌ Failed to import vfxCatalog.ts:', e.message);
  console.error('   Run with: node --import=tsx/esm scripts/smoke-test-archon-006b.mjs\n');
  process.exit(1);
}

const {
  VFX_CATALOG,
  VFX_FAMILIES,
  VFX_FACTIONS,
  COMBAT_SLICE_VFX_IDS,
  buildGenerationBrief,
  exportCatalogAsJSON,
  filterCatalog,
} = catalog;

// ─── Test harness ─────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

const VALID_FAMILIES = ['hit', 'projectile', 'beam', 'barrier', 'nova', 'status', 'spawn', 'death'];
const VALID_FACTIONS = ['light', 'dark', 'neutral'];
const VALID_LAYERING = ['front', 'mid', 'back', 'overlay'];
const VALID_INTENSITY = [1, 2, 3, 4, 5];

console.log('\n── ARCHON-006B Smoke Test ─────────────────────────────────────────────────\n');

// ── S1: Catalog structure ──────────────────────────────────────────────────────

console.log('S1: Catalog structure');
assert('VFX_CATALOG is an array', Array.isArray(VFX_CATALOG));
assert('VFX_CATALOG has at least 12 entries', VFX_CATALOG.length >= 12, `got ${VFX_CATALOG.length}`);

const ids = VFX_CATALOG.map(p => p.id);
const uniqueIds = new Set(ids);
assert('All preset IDs are unique', uniqueIds.size === ids.length, `found ${ids.length - uniqueIds.size} duplicates`);

const slots = VFX_CATALOG.map(p => p.asset_slot);
const uniqueSlots = new Set(slots);
assert('All asset_slot values are unique', uniqueSlots.size === slots.length, `found ${slots.length - uniqueSlots.size} duplicates`);

// ── S2: COMBAT_SLICE_VFX_IDS coverage ─────────────────────────────────────────

console.log('\nS2: COMBAT_SLICE_VFX_IDS coverage');
assert('COMBAT_SLICE_VFX_IDS is an array-like with at least 12 entries', COMBAT_SLICE_VFX_IDS.length >= 12, `got ${COMBAT_SLICE_VFX_IDS.length}`);

const sliceSet = new Set(COMBAT_SLICE_VFX_IDS);
for (const preset of VFX_CATALOG) {
  assert(
    `asset_slot "${preset.asset_slot}" is in COMBAT_SLICE_VFX_IDS`,
    sliceSet.has(preset.asset_slot),
  );
}

// ── S3: Required fields non-empty on every preset ─────────────────────────────

console.log('\nS3: Required fields present on all presets');
const REQUIRED_STRING_FIELDS = ['id', 'name', 'description', 'use_case', 'asset_slot', 'prompt_brief'];
for (const preset of VFX_CATALOG) {
  for (const field of REQUIRED_STRING_FIELDS) {
    assert(
      `[${preset.asset_slot}] ${field} is a non-empty string`,
      typeof preset[field] === 'string' && preset[field].length > 0,
    );
  }
}

// ── S4: Enum fields valid ──────────────────────────────────────────────────────

console.log('\nS4: Enum fields valid');
for (const preset of VFX_CATALOG) {
  assert(`[${preset.asset_slot}] family is valid`, VALID_FAMILIES.includes(preset.family), `got "${preset.family}"`);
  assert(`[${preset.asset_slot}] faction is valid`, VALID_FACTIONS.includes(preset.faction), `got "${preset.faction}"`);
  assert(`[${preset.asset_slot}] layering is valid`, VALID_LAYERING.includes(preset.layering), `got "${preset.layering}"`);
  assert(`[${preset.asset_slot}] intensity is valid`, VALID_INTENSITY.includes(preset.intensity), `got "${preset.intensity}"`);
}

// ── S5: visual_tags is non-empty array of strings ─────────────────────────────

console.log('\nS5: visual_tags structure');
for (const preset of VFX_CATALOG) {
  assert(
    `[${preset.asset_slot}] visual_tags is non-empty array`,
    Array.isArray(preset.visual_tags) && preset.visual_tags.length > 0,
  );
  assert(
    `[${preset.asset_slot}] all tags are non-empty strings`,
    preset.visual_tags.every(t => typeof t === 'string' && t.length > 0),
  );
}

// ── S6: timing_ms is a non-negative number ────────────────────────────────────

console.log('\nS6: timing_ms');
for (const preset of VFX_CATALOG) {
  assert(
    `[${preset.asset_slot}] timing_ms >= 0`,
    typeof preset.timing_ms === 'number' && preset.timing_ms >= 0,
    `got ${preset.timing_ms}`,
  );
}

// ── S7: VFX_FAMILIES and VFX_FACTIONS constants ───────────────────────────────

console.log('\nS7: VFX_FAMILIES and VFX_FACTIONS');
assert('VFX_FAMILIES has 8 entries', VFX_FAMILIES.length === 8, `got ${VFX_FAMILIES.length}`);
assert('VFX_FACTIONS has 3 entries', VFX_FACTIONS.length === 3, `got ${VFX_FACTIONS.length}`);
for (const f of VALID_FAMILIES) assert(`VFX_FAMILIES includes "${f}"`, VFX_FAMILIES.includes(f));
for (const f of VALID_FACTIONS) assert(`VFX_FACTIONS includes "${f}"`, VFX_FACTIONS.includes(f));

// ── S8: buildGenerationBrief ──────────────────────────────────────────────────

console.log('\nS8: buildGenerationBrief');
for (const preset of VFX_CATALOG) {
  const brief = buildGenerationBrief(preset);
  assert(`[${preset.asset_slot}] brief is a non-empty string`, typeof brief === 'string' && brief.length > 0);
  assert(`[${preset.asset_slot}] brief contains id`, brief.includes(preset.id));
  assert(`[${preset.asset_slot}] brief contains family`, brief.includes(preset.family));
  assert(`[${preset.asset_slot}] brief contains faction`, brief.includes(preset.faction));
  assert(`[${preset.asset_slot}] brief contains prompt_brief text`, brief.includes(preset.prompt_brief.slice(0, 20)));
}

// ── S9: exportCatalogAsJSON ───────────────────────────────────────────────────

console.log('\nS9: exportCatalogAsJSON');
const jsonStr = exportCatalogAsJSON();
assert('exportCatalogAsJSON returns a string', typeof jsonStr === 'string');
let parsed;
try {
  parsed = JSON.parse(jsonStr);
  assert('JSON round-trips without error', true);
} catch (e) {
  assert('JSON round-trips without error', false, e.message);
}
if (parsed) {
  assert('exported JSON has entries array', Array.isArray(parsed.entries));
  assert('exported JSON has at least 12 entries', parsed.entries?.length >= 12, `got ${parsed.entries?.length}`);
  assert('exported JSON has catalog_version field', parsed.catalog_version === 1);
  assert('exported JSON has exported_at field', typeof parsed.exported_at === 'string');
  assert('exported JSON entry_count matches entries length', parsed.entry_count === parsed.entries?.length);
}

// ── S10: filterCatalog ────────────────────────────────────────────────────────

console.log('\nS10: filterCatalog');
const allResults = filterCatalog({ family: null, faction: null });
assert('filterCatalog(null, null) returns all catalog entries', allResults.length === VFX_CATALOG.length, `got ${allResults.length}`);

const hitResults = filterCatalog({ family: 'hit', faction: null });
assert('filterCatalog(hit, null) returns ≥1', hitResults.length >= 1, `got ${hitResults.length}`);
assert('filterCatalog(hit, null) all have family=hit', hitResults.every(p => p.family === 'hit'));

const darkResults = filterCatalog({ family: null, faction: 'dark' });
assert('filterCatalog(null, dark) returns ≥1', darkResults.length >= 1, `got ${darkResults.length}`);
assert('filterCatalog(null, dark) all have faction=dark', darkResults.every(p => p.faction === 'dark'));

const lightHitResults = filterCatalog({ family: 'hit', faction: 'light' });
assert('filterCatalog(hit, light) returns ≥1', lightHitResults.length >= 1, `got ${lightHitResults.length}`);
assert('filterCatalog(hit, light) all match both filters',
  lightHitResults.every(p => p.family === 'hit' && p.faction === 'light'));

const projectileResults = filterCatalog({ family: 'projectile', faction: null });
assert('filterCatalog(projectile, null) returns ≥2 (light + dark)', projectileResults.length >= 2, `got ${projectileResults.length}`);
assert('filterCatalog(projectile, null) all have family=projectile', projectileResults.every(p => p.family === 'projectile'));

// ── S11: Family and faction coverage ──────────────────────────────────────────

console.log('\nS11: Family and faction coverage');
const representedFamilies = new Set(VFX_CATALOG.map(p => p.family));
assert('At least 6 distinct VFX families represented', representedFamilies.size >= 6, `got ${representedFamilies.size}: ${[...representedFamilies].join(', ')}`);
assert('Light faction is represented', VFX_CATALOG.some(p => p.faction === 'light'));
assert('Dark faction is represented', VFX_CATALOG.some(p => p.faction === 'dark'));
assert('Neutral faction is represented', VFX_CATALOG.some(p => p.faction === 'neutral'));
assert('projectile family has both light and dark entries',
  VFX_CATALOG.some(p => p.family === 'projectile' && p.faction === 'light') &&
  VFX_CATALOG.some(p => p.family === 'projectile' && p.faction === 'dark'));

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\nARCHON-006B smoke test complete — ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
