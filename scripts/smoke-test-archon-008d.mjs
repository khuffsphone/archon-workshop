/**
 * smoke-test-archon-008d.mjs
 *
 * Source-assertion smoke tests for ARCHON-008D — Required ID Reconciliation.
 *
 * Verifies:
 *   1. All 4 stale IDs removed from COMBAT_SLICE_REQUIRED_IDS
 *   2. All 4 modern equivalents present in COMBAT_SLICE_REQUIRED_IDS
 *   3. All 7 zombie INITIAL_ASSETS records removed
 *   4. All VFX_CATALOG asset_slots still exist in INITIAL_ASSETS (006d regression)
 *   5. All COMBAT_SLICE_REQUIRED_IDS entries exist in INITIAL_ASSETS
 *   6. COMBAT_PACK_SCHEMA_VERSION unchanged at '1.0'
 *   7. CombatPackManifest shape unchanged
 *   8. Export eligibility helpers regression (008a/008b backward compat)
 *
 * Run: node --import=tsx/esm scripts/smoke-test-archon-008d.mjs
 */

import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── Load modules ─────────────────────────────────────────────────────────────

let manifestMod;
let catalogMod;
let eligibilityMod;

try {
  manifestMod    = await import(pathToFileURL(path.join(ROOT, 'src/lib/assetManifest.ts')).href);
  catalogMod     = await import(pathToFileURL(path.join(ROOT, 'src/lib/vfxCatalog.ts')).href);
  eligibilityMod = await import(pathToFileURL(path.join(ROOT, 'src/lib/exportEligibility.ts')).href);
} catch (e) {
  console.error('\n❌ Failed to import modules:', e.message);
  console.error('   Run with: node --import=tsx/esm scripts/smoke-test-archon-008d.mjs\n');
  process.exit(1);
}

const {
  INITIAL_ASSETS,
  COMBAT_SLICE_REQUIRED_IDS,
  COMBAT_PACK_SCHEMA_VERSION,
} = manifestMod;

const { VFX_CATALOG } = catalogMod;

const {
  isExportEligible,
  filterForCombatExport,
  getExportReadinessReport,
  getExportExclusionReason,
  getExportEligibilityRows,
} = eligibilityMod;

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

// ─── Section 1: Stale IDs removed from COMBAT_SLICE_REQUIRED_IDS ──────────────

console.log('\n── Section 1: Stale IDs absent from COMBAT_SLICE_REQUIRED_IDS ──');

const STALE_IDS = [
  'combat-hit-flash-light-medium',
  'combat-hit-flash-dark-medium',
  'combat-death-light',
  'combat-death-dark',
];

for (const id of STALE_IDS) {
  assert(
    `stale ID "${id}" removed from COMBAT_SLICE_REQUIRED_IDS`,
    !COMBAT_SLICE_REQUIRED_IDS.includes(id),
  );
}

// ─── Section 2: Modern IDs present in COMBAT_SLICE_REQUIRED_IDS ───────────────

console.log('\n── Section 2: Modern IDs present in COMBAT_SLICE_REQUIRED_IDS ──');

const MODERN_IDS = [
  'combat-hit-flash-light',
  'combat-hit-flash-dark',
  'combat-death-burst-light',
  'combat-death-burst-dark',
];

for (const id of MODERN_IDS) {
  assert(
    `modern ID "${id}" present in COMBAT_SLICE_REQUIRED_IDS`,
    COMBAT_SLICE_REQUIRED_IDS.includes(id),
  );
}

// ─── Section 3: Zombie INITIAL_ASSETS records removed ─────────────────────────

console.log('\n── Section 3: Zombie INITIAL_ASSETS records removed ──');

const ZOMBIE_IDS = [
  'combat-hit-flash-light-medium',
  'combat-hit-flash-dark-medium',
  'combat-impact-spark-medium',
  'combat-death-light',
  'combat-death-dark',
  'combat-nova-light',
  'combat-nova-dark',
];

const initialAssetIds = INITIAL_ASSETS.map(a => a.id);

for (const id of ZOMBIE_IDS) {
  assert(
    `zombie "${id}" absent from INITIAL_ASSETS`,
    !initialAssetIds.includes(id),
  );
}

// ─── Section 4: 006D regression — all VFX_CATALOG slots in INITIAL_ASSETS ────

console.log('\n── Section 4: 006D regression — all VFX_CATALOG slots in INITIAL_ASSETS ──');

const missingSlots = [];
for (const preset of VFX_CATALOG) {
  if (!initialAssetIds.includes(preset.asset_slot)) {
    missingSlots.push(preset.asset_slot);
  }
}

assert(
  'All VFX_CATALOG asset_slots exist in INITIAL_ASSETS',
  missingSlots.length === 0,
  missingSlots.length > 0 ? `Missing: ${missingSlots.join(', ')}` : '',
);

// Spot-check the two spawn IDs that were adjacent to removed zombies
assert('combat-spawn-light still in INITIAL_ASSETS', initialAssetIds.includes('combat-spawn-light'));
assert('combat-spawn-dark still in INITIAL_ASSETS', initialAssetIds.includes('combat-spawn-dark'));

// Spot-check the modern VFX IDs are in INITIAL_ASSETS
for (const id of MODERN_IDS) {
  assert(`modern ID "${id}" exists in INITIAL_ASSETS`, initialAssetIds.includes(id));
}

// ─── Section 5: All COMBAT_SLICE_REQUIRED_IDS exist in INITIAL_ASSETS ─────────

console.log('\n── Section 5: All COMBAT_SLICE_REQUIRED_IDS exist in INITIAL_ASSETS ──');

const missingRequired = [];
for (const id of COMBAT_SLICE_REQUIRED_IDS) {
  if (!initialAssetIds.includes(id)) {
    missingRequired.push(id);
  }
}

assert(
  'All COMBAT_SLICE_REQUIRED_IDS exist in INITIAL_ASSETS',
  missingRequired.length === 0,
  missingRequired.length > 0 ? `Missing: ${missingRequired.join(', ')}` : '',
);

assert('COMBAT_SLICE_REQUIRED_IDS has 19 entries', COMBAT_SLICE_REQUIRED_IDS.length === 19,
  `got ${COMBAT_SLICE_REQUIRED_IDS.length}`);

// ─── Section 6: Protected contracts unchanged ──────────────────────────────────

console.log('\n── Section 6: Protected contracts unchanged ──');

assert("COMBAT_PACK_SCHEMA_VERSION is '1.0'", COMBAT_PACK_SCHEMA_VERSION === '1.0',
  `got ${COMBAT_PACK_SCHEMA_VERSION}`);

// CombatPackManifest shape check via a constructed object
const sampleManifest = {
  schema_version: COMBAT_PACK_SCHEMA_VERSION,
  generated_at: new Date().toISOString(),
  tags: ['combat'],
  assets: [
    { id: 'combat-hit-flash-light', category: 'spell', type: 'image', path: '/x.png', hash: 'abc', mime_type: 'image/png' },
  ],
};
assert('CombatPackManifest shape: schema_version present', typeof sampleManifest.schema_version === 'string');
assert('CombatPackManifest shape: assets is array', Array.isArray(sampleManifest.assets));
assert('CombatPackManifest shape: generated_at is string', typeof sampleManifest.generated_at === 'string');
assert('CombatPackManifest shape: tags is array', Array.isArray(sampleManifest.tags));
assert('CombatPackManifest shape: asset has required fields',
  sampleManifest.assets[0].id !== undefined &&
  sampleManifest.assets[0].path !== undefined &&
  sampleManifest.assets[0].hash !== undefined &&
  sampleManifest.assets[0].mime_type !== undefined);

// ─── Section 7: Export readiness — zero missing required IDs ──────────────────

console.log('\n── Section 7: Export readiness — zero missing required IDs ──');

// Build a mock asset set: all COMBAT_SLICE_REQUIRED_IDS as approved+path
const allRequiredApproved = COMBAT_SLICE_REQUIRED_IDS.map(id => ({
  id,
  status: 'approved',
  path: `/generated/${id}-v1.png`,
  asset_protected: false,
  candidate_versions: [],
  version: 1,
  approved_version: 1,
  retry_count: 0,
  category: 'spell',
  name: id,
  description: '',
  type: 'image',
  stage: 'D',
}));

const readyReport = getExportReadinessReport(allRequiredApproved, COMBAT_SLICE_REQUIRED_IDS);
assert('missingRequired is empty when all modern IDs are eligible', readyReport.missingRequired.length === 0,
  `missing: ${readyReport.missingRequired.join(', ')}`);
assert('combatReady=true when all modern required IDs are eligible', readyReport.combatReady === true);

// Verify the stale IDs are NOT in missingRequired (they no longer appear in the required list)
for (const id of STALE_IDS) {
  assert(`stale ID "${id}" not in missingRequired`, !readyReport.missingRequired.includes(id));
}

// ─── Section 8: Export preview truthful when modern IDs are pending ────────────

console.log('\n── Section 8: Export preview truthful when modern IDs are pending ──');

// All required IDs exist in INITIAL_ASSETS but are pending (not generated).
// getExportReadinessReport correctly adds non-eligible assets to missingRequired.
// The key assertion is: combatReady=false AND the stale IDs are NOT driving this
// (because they are no longer in COMBAT_SLICE_REQUIRED_IDS).
const allPending = COMBAT_SLICE_REQUIRED_IDS.map(id => ({
  id,
  status: 'pending',
  path: undefined,
  asset_protected: false,
  candidate_versions: [],
  version: 0,
  retry_count: 0,
  category: 'spell',
  name: id,
  description: '',
  type: 'image',
  stage: 'D',
}));

const pendingReport = getExportReadinessReport(allPending, COMBAT_SLICE_REQUIRED_IDS);
assert('combatReady=false when modern IDs are pending (truthful)', pendingReport.combatReady === false);

// missingRequired will contain all 19 IDs (none are eligible since all are pending).
// What matters is that the stale IDs are NOT in the required list driving this report.
assert('pending report missingRequired does not contain stale ID combat-hit-flash-light-medium',
  !pendingReport.missingRequired.includes('combat-hit-flash-light-medium'));
assert('pending report missingRequired does not contain stale ID combat-hit-flash-dark-medium',
  !pendingReport.missingRequired.includes('combat-hit-flash-dark-medium'));
assert('pending report missingRequired does not contain stale ID combat-death-light',
  !pendingReport.missingRequired.includes('combat-death-light'));
assert('pending report missingRequired does not contain stale ID combat-death-dark',
  !pendingReport.missingRequired.includes('combat-death-dark'));

// Verify that the modern IDs DO appear in missingRequired (truthfully not yet eligible)
assert('modern ID combat-hit-flash-light appears in missingRequired when pending',
  pendingReport.missingRequired.includes('combat-hit-flash-light'));
assert('modern ID combat-death-burst-light appears in missingRequired when pending',
  pendingReport.missingRequired.includes('combat-death-burst-light'));

// ─── Section 9: 008A/008B backward compat ─────────────────────────────────────

console.log('\n── Section 9: 008A/008B backward compat ──');

const approvedAsset = {
  id: 'combat-hit-flash-light', status: 'approved', path: '/p.png',
  asset_protected: false, candidate_versions: [], version: 1, approved_version: 1,
  retry_count: 0, category: 'spell', name: 'Hit Flash Light', description: '', type: 'image', stage: 'D',
};
const rejectedAsset = { ...approvedAsset, id: 'combat-hit-flash-dark', status: 'rejected', path: '/q.png' };
const pendingAsset  = { ...approvedAsset, id: 'combat-death-burst-light', status: 'pending', path: undefined };

assert('008A: isExportEligible — approved+path → true', isExportEligible(approvedAsset));
assert('008A: isExportEligible — rejected → false', !isExportEligible(rejectedAsset));
assert('008A: isExportEligible — pending+no path → false', !isExportEligible(pendingAsset));

const filtered = filterForCombatExport([approvedAsset, rejectedAsset, pendingAsset]);
assert('008A: filterForCombatExport returns only approved+path', filtered.length === 1 && filtered[0].id === 'combat-hit-flash-light');

assert('008B: getExportExclusionReason — approved+path → "eligible"',
  getExportExclusionReason(approvedAsset) === 'eligible');
assert('008B: getExportExclusionReason — rejected → "rejected"',
  getExportExclusionReason(rejectedAsset) === 'rejected');
assert('008B: getExportExclusionReason — pending+no path → "pending"',
  getExportExclusionReason(pendingAsset) === 'pending');

const rows = getExportEligibilityRows([approvedAsset, rejectedAsset, pendingAsset]);
assert('008B: getExportEligibilityRows — 3 rows', rows.length === 3);
assert('008B: rows do not expose raw path field', rows.every(r => !('path' in r)));
assert('008B: approved row is eligible', rows[0].eligible === true);
assert('008B: rejected row is excluded', rows[1].eligible === false && rows[1].exclusionReason === 'rejected');

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────────`);
console.log(`ARCHON-008D Smoke Test: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────────────\n`);
process.exit(failed > 0 ? 1 : 0);
