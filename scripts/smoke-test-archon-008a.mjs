/**
 * ARCHON-008A — Export Readiness Smoke Test
 *
 * Verifies that the workshop's export eligibility logic correctly classifies
 * assets by review status, and that the CombatPackManifest shape is compatible
 * with archon-game's packLoader contract.
 *
 * Run with:
 *   node --import=tsx/esm scripts/smoke-test-archon-008a.mjs
 */

import { isExportEligible, filterForCombatExport, getExportReadinessReport } from '../src/lib/exportEligibility.ts';
import { COMBAT_PACK_SCHEMA_VERSION } from '../src/lib/assetManifest.ts';
import { validatePack, PackVersionError, PackMissingAssetsError } from '../../archon-game/src/lib/packLoader.ts';

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

function assertThrows(fn, ErrorClass, label) {
  try {
    fn();
    console.error(`  ❌ FAIL: ${label} (expected throw, got none)`);
    failed++;
  } catch (e) {
    if (e instanceof ErrorClass) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${label} (wrong error type: ${e?.constructor?.name})`);
      failed++;
    }
  }
}

function assertNotThrows(fn, label) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${label} (unexpected throw: ${e?.message})`);
    failed++;
  }
}

// ─── Asset fixtures ───────────────────────────────────────────────────────────

/** Minimal valid Asset-like object for smoke testing */
function makeAsset(overrides = {}) {
  return {
    id: 'test-asset',
    category: 'spell',
    name: 'Test Asset',
    description: 'Test',
    status: 'approved',
    type: 'image',
    stage: 'D',
    version: 1,
    candidate_versions: [],
    asset_protected: true,
    retry_count: 0,
    path: '/generated/images/test-asset.png',
    ...overrides,
  };
}

// ─── Section 1: isExportEligible ─────────────────────────────────────────────

console.log('\n── Section 1: isExportEligible ──');

assert(
  isExportEligible(makeAsset({ status: 'approved', asset_protected: true, path: '/generated/images/a.png' })),
  'approved + protected + path → eligible'
);

assert(
  isExportEligible(makeAsset({ status: 'approved', asset_protected: false, path: '/generated/images/a.png' })),
  'approved + not protected + path → eligible (protection flag does not affect eligibility)'
);

assert(
  !isExportEligible(makeAsset({ status: 'rejected', path: '/generated/images/a.png' })),
  'rejected + path → NOT eligible'
);

assert(
  !isExportEligible(makeAsset({ status: 'pending', path: undefined })),
  'pending + no path → NOT eligible'
);

assert(
  !isExportEligible(makeAsset({ status: 'pending', path: '/generated/images/a.png' })),
  'pending + path → NOT eligible (not yet approved)'
);

assert(
  !isExportEligible(makeAsset({ status: 'approved', path: undefined })),
  'approved + no path → NOT eligible (file not yet generated)'
);

assert(
  !isExportEligible(makeAsset({ status: 'failed', path: undefined })),
  'failed + no path → NOT eligible'
);

assert(
  !isExportEligible(makeAsset({ status: 'generating', path: undefined })),
  'generating + no path → NOT eligible'
);

// ─── Section 2: filterForCombatExport ────────────────────────────────────────

console.log('\n── Section 2: filterForCombatExport ──');

const mixedRoster = [
  makeAsset({ id: 'a', status: 'approved', path: '/generated/images/a.png' }),
  makeAsset({ id: 'b', status: 'rejected', path: '/generated/images/b.png' }),
  makeAsset({ id: 'c', status: 'pending', path: undefined }),
  makeAsset({ id: 'd', status: 'approved', path: undefined }),
  makeAsset({ id: 'e', status: 'failed', path: undefined }),
];

const filtered = filterForCombatExport(mixedRoster);

assert(
  filtered.length === 1 && filtered[0].id === 'a',
  'filterForCombatExport returns only approved+path assets (1 of 5)'
);

assert(
  !filtered.some(a => a.status === 'rejected'),
  'filterForCombatExport excludes rejected assets'
);

assert(
  !filtered.some(a => a.status === 'pending'),
  'filterForCombatExport excludes pending assets'
);

// ─── Section 3: getExportReadinessReport ─────────────────────────────────────

console.log('\n── Section 3: getExportReadinessReport ──');

const report = getExportReadinessReport(mixedRoster, ['a', 'b', 'z']);

assert(report.total === 5, 'report.total counts all assets');
assert(report.eligible === 1, 'report.eligible counts only approved+path');
assert(report.rejected === 1, 'report.rejected counts rejected assets');
assert(report.pending === 1, 'report.pending counts pending assets');
assert(
  report.missingRequired.includes('b') && report.missingRequired.includes('z'),
  'report.missingRequired lists IDs not in eligible set'
);
assert(
  !report.missingRequired.includes('a'),
  'report.missingRequired does not include present+eligible IDs'
);
assert(!report.combatReady, 'report.combatReady is false when required IDs are missing');

const allApproved = [
  makeAsset({ id: 'x', status: 'approved', path: '/generated/images/x.png' }),
  makeAsset({ id: 'y', status: 'approved', path: '/generated/images/y.png' }),
];
const readyReport = getExportReadinessReport(allApproved, ['x', 'y']);
assert(readyReport.combatReady, 'report.combatReady is true when all required IDs are eligible');
assert(readyReport.missingRequired.length === 0, 'report.missingRequired is empty when fully ready');

// ─── Section 4: CombatPackManifest shape conformance ─────────────────────────

console.log('\n── Section 4: CombatPackManifest shape conformance ──');

const sampleManifest = {
  schema_version: COMBAT_PACK_SCHEMA_VERSION,
  generated_at: new Date().toISOString(),
  tags: ['knight', 'sorceress'],
  assets: [
    { id: 'unit-light-knight-token', category: 'unit', subcategory: 'token', faction: 'light', type: 'image', path: '/assets/unit-light-knight-token-v1.png', hash: 'abc123', mime_type: 'image/png' },
  ],
};

assert(sampleManifest.schema_version === '1.0', `CombatPackManifest.schema_version is '1.0'`);
assert(Array.isArray(sampleManifest.assets), 'CombatPackManifest.assets is an array');
assert(typeof sampleManifest.generated_at === 'string', 'CombatPackManifest.generated_at is a string');
assert(Array.isArray(sampleManifest.tags), 'CombatPackManifest.tags is an array');

const sampleAsset = sampleManifest.assets[0];
assert('id' in sampleAsset && 'category' in sampleAsset && 'type' in sampleAsset && 'path' in sampleAsset && 'hash' in sampleAsset && 'mime_type' in sampleAsset,
  'CombatPackAsset has required fields: id, category, type, path, hash, mime_type'
);

// Confirm review metadata fields are ABSENT from CombatPackAsset
assert(!('status' in sampleAsset), 'CombatPackAsset does NOT contain status (review metadata excluded)');
assert(!('asset_protected' in sampleAsset), 'CombatPackAsset does NOT contain asset_protected');
assert(!('notes' in sampleAsset), 'CombatPackAsset does NOT contain notes');
assert(!('candidate_versions' in sampleAsset), 'CombatPackAsset does NOT contain candidate_versions');

// ─── Section 5: archon-game packLoader contract ───────────────────────────────

console.log('\n── Section 5: archon-game packLoader contract ──');

assertThrows(
  () => validatePack({ schema_version: '0.9', generated_at: '', tags: [], assets: [] }, ['any-id']),
  PackVersionError,
  'validatePack throws PackVersionError on schema_version mismatch'
);

assertThrows(
  () => validatePack({ schema_version: '1.0', generated_at: '', tags: [], assets: [] }, ['missing-id']),
  PackMissingAssetsError,
  'validatePack throws PackMissingAssetsError when required ID is absent'
);

assertNotThrows(
  () => validatePack({ schema_version: '1.0', generated_at: '', tags: [], assets: [] }, []),
  'validatePack does NOT throw when requiredIds list is empty'
);

assertNotThrows(
  () => validatePack(sampleManifest, ['unit-light-knight-token']),
  'validatePack does NOT throw when manifest contains all required IDs'
);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────────`);
console.log(`ARCHON-008A Smoke Test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
