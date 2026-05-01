/**
 * ARCHON-008B — Export Eligibility Preview Smoke Test
 *
 * Verifies the new per-asset exclusion reason helpers and row-level
 * export eligibility data. Also runs 008A backward-compat checks.
 *
 * Run with:
 *   node --import=tsx/esm scripts/smoke-test-archon-008b.mjs
 */

import {
  isExportEligible,
  getExportExclusionReason,
  getExportEligibilityRows,
  getExportReadinessReport,
} from '../src/lib/exportEligibility.ts';

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

// ─── Asset fixtures ───────────────────────────────────────────────────────────

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

// ─── Section 1: getExportExclusionReason ─────────────────────────────────────

console.log('\n── Section 1: getExportExclusionReason ──');

assert(
  getExportExclusionReason(makeAsset({ status: 'approved', path: '/generated/images/a.png' })) === 'eligible',
  'approved + path → "eligible"'
);

assert(
  getExportExclusionReason(makeAsset({ status: 'rejected', path: '/generated/images/a.png' })) === 'rejected',
  'rejected + path → "rejected"'
);

assert(
  getExportExclusionReason(makeAsset({ status: 'pending', path: undefined })) === 'pending',
  'pending + no path → "pending"'
);

assert(
  getExportExclusionReason(makeAsset({ status: 'pending', path: '/generated/images/a.png' })) === 'pending',
  'pending + path → "pending" (not yet approved)'
);

assert(
  getExportExclusionReason(makeAsset({ status: 'generating', path: undefined })) === 'generating',
  'generating → "generating"'
);

assert(
  getExportExclusionReason(makeAsset({ status: 'failed', path: undefined })) === 'failed',
  'failed → "failed"'
);

assert(
  getExportExclusionReason(makeAsset({ status: 'recoverable_failed', path: undefined })) === 'failed',
  'recoverable_failed → "failed"'
);

assert(
  getExportExclusionReason(makeAsset({ status: 'approved', path: undefined })) === 'approved_no_path',
  'approved + no path → "approved_no_path"'
);

// ─── Section 2: getExportEligibilityRows — empty and mutation safety ──────────

console.log('\n── Section 2: getExportEligibilityRows ──');

assert(
  getExportEligibilityRows([]).length === 0,
  'empty input returns empty array'
);

const roster = [
  makeAsset({ id: 'a', status: 'approved', path: '/generated/images/a.png', asset_protected: true, name: 'Asset A', faction: 'light' }),
  makeAsset({ id: 'b', status: 'rejected', path: '/generated/images/b.png', asset_protected: false, name: 'Asset B' }),
  makeAsset({ id: 'c', status: 'pending', path: undefined, name: 'Asset C' }),
  makeAsset({ id: 'd', status: 'approved', path: undefined, name: 'Asset D' }),
  makeAsset({ id: 'e', status: 'failed', path: undefined, name: 'Asset E' }),
];

const rosterCopy = JSON.stringify(roster);
const rows = getExportEligibilityRows(roster);

assert(JSON.stringify(roster) === rosterCopy, 'getExportEligibilityRows does not mutate input array');
assert(rows.length === roster.length, 'returns one row per asset');

// Eligible row (a)
const rowA = rows.find(r => r.id === 'a');
assert(rowA !== undefined, 'eligible row exists for asset a');
assert(rowA?.eligible === true, 'eligible row: eligible=true');
assert(rowA?.hasPath === true, 'eligible row: hasPath=true');
assert(rowA?.isProtected === true, 'eligible row: isProtected=true (protected approved asset is eligible)');
assert(rowA?.exclusionReason === 'eligible', 'eligible row: exclusionReason="eligible"');
assert(rowA?.faction === 'light', 'eligible row: faction present');

// Rejected row (b)
const rowB = rows.find(r => r.id === 'b');
assert(rowB?.eligible === false, 'rejected row: eligible=false');
assert(rowB?.exclusionReason === 'rejected', 'rejected row: exclusionReason="rejected"');
assert(rowB?.isProtected === false, 'rejected row: isProtected=false');

// Pending row (c)
const rowC = rows.find(r => r.id === 'c');
assert(rowC?.eligible === false, 'pending row: eligible=false');
assert(rowC?.exclusionReason === 'pending', 'pending row: exclusionReason="pending"');
assert(rowC?.hasPath === false, 'pending row: hasPath=false');

// Approved no-path row (d)
const rowD = rows.find(r => r.id === 'd');
assert(rowD?.eligible === false, 'approved_no_path row: eligible=false');
assert(rowD?.exclusionReason === 'approved_no_path', 'approved_no_path row: exclusionReason="approved_no_path"');

// Failed row (e)
const rowE = rows.find(r => r.id === 'e');
assert(rowE?.eligible === false, 'failed row: eligible=false');
assert(rowE?.exclusionReason === 'failed', 'failed row: exclusionReason="failed"');

// Path safety — raw path must NOT be present in any row
const anyRowHasPath = rows.some(r => 'path' in r);
assert(!anyRowHasPath, 'rows do NOT contain a raw "path" field (path safety)');

// Count check
const eligibleCount = rows.filter(r => r.eligible).length;
assert(eligibleCount === 1, 'exactly 1 of 5 mixed assets is eligible');

// ─── Section 3: 008A backward-compat ─────────────────────────────────────────

console.log('\n── Section 3: 008A backward-compat ──');

assert(
  isExportEligible(makeAsset({ status: 'approved', path: '/generated/images/a.png' })) === true,
  '008A: isExportEligible — approved+path still returns true'
);

assert(
  isExportEligible(makeAsset({ status: 'rejected', path: '/generated/images/a.png' })) === false,
  '008A: isExportEligible — rejected still returns false'
);

const report = getExportReadinessReport(roster, ['a', 'b', 'z']);
assert(report.total === 5, '008A: getExportReadinessReport — total correct');
assert(report.eligible === 1, '008A: getExportReadinessReport — eligible correct');
assert(report.rejected === 1, '008A: getExportReadinessReport — rejected correct');
assert(report.pending === 1, '008A: getExportReadinessReport — pending correct');
assert(report.missingRequired.includes('b'), '008A: getExportReadinessReport — rejected ID is missing from eligible');
assert(report.missingRequired.includes('z'), '008A: getExportReadinessReport — unknown ID is missing');
assert(!report.missingRequired.includes('a'), '008A: getExportReadinessReport — eligible ID not in missingRequired');
assert(!report.combatReady, '008A: getExportReadinessReport — combatReady=false when missing');

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────────`);
console.log(`ARCHON-008B Smoke Test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
