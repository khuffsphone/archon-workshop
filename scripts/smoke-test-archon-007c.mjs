import {
  getReviewStats,
  filterAssetsByReviewStatus,
  identifyActionableAssets,
} from '../src/lib/reviewQueue.ts';
import assert from 'assert/strict';

// Helper for test output
let passedCount = 0;
let failedCount = 0;

function pass(msg) {
  console.log(`  ✅ ${msg}`);
  passedCount++;
}

function fail(msg, err) {
  console.error(`  ❌ ${msg}`);
  console.error(err);
  failedCount++;
}

function runTest(name, fn) {
  try {
    fn();
    pass(name);
  } catch (err) {
    fail(name, err);
  }
}

console.log('\n── ARCHON-007C Smoke Test: Review Queue Helpers ──\n');

// ─── Fixtures ───────────────────────────────────────────────────────────────

const mockAssets = [
  { id: 'a1', status: 'pending', asset_protected: false },
  { id: 'a2', status: 'pending', notes: 'Needs look' },
  { id: 'a3', status: 'approved', asset_protected: true },
  { id: 'a4', status: 'approved', asset_protected: false }, // unusual but possible
  { id: 'a5', status: 'rejected', notes: 'Bad colors' },
  { id: 'a6', status: 'generating' },
  { id: 'a7', status: 'failed' },
  { id: 'a8' }, // missing status safely handled
];

const emptyAssets = [];

// ─── Tests ──────────────────────────────────────────────────────────────────

console.log('S1: getReviewStats');

runTest('Handles empty asset list', () => {
  const stats = getReviewStats(emptyAssets);
  assert.equal(stats.total, 0);
  assert.equal(stats.pending, 0);
  assert.equal(stats.approved, 0);
  assert.equal(stats.rejected, 0);
  assert.equal(stats.protected, 0);
});

runTest('Counts assets by review status accurately', () => {
  const stats = getReviewStats(mockAssets);
  assert.equal(stats.total, 8);
  assert.equal(stats.pending, 2);
  assert.equal(stats.approved, 2);
  assert.equal(stats.rejected, 1);
  assert.equal(stats.protected, 1);
});

runTest('Does not mutate input array', () => {
  const original = JSON.stringify(mockAssets);
  getReviewStats(mockAssets);
  assert.equal(JSON.stringify(mockAssets), original);
});

console.log('\nS2: filterAssetsByReviewStatus');

runTest('Handles missing review fields safely (returns everything on "all")', () => {
  const filtered = filterAssetsByReviewStatus(mockAssets, 'all');
  assert.equal(filtered.length, 8);
});

runTest('Filters by pending', () => {
  const filtered = filterAssetsByReviewStatus(mockAssets, 'pending');
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every(a => a.status === 'pending'));
});

runTest('Filters by approved', () => {
  const filtered = filterAssetsByReviewStatus(mockAssets, 'approved');
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every(a => a.status === 'approved'));
});

runTest('Filters by rejected', () => {
  const filtered = filterAssetsByReviewStatus(mockAssets, 'rejected');
  assert.equal(filtered.length, 1);
  assert.ok(filtered.every(a => a.status === 'rejected'));
});

runTest('Filters by protected (derived state)', () => {
  const filtered = filterAssetsByReviewStatus(mockAssets, 'protected');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'a3');
});

runTest('Does not mutate input array during filtering', () => {
  const original = JSON.stringify(mockAssets);
  filterAssetsByReviewStatus(mockAssets, 'pending');
  assert.equal(JSON.stringify(mockAssets), original);
});

console.log('\nS3: identifyActionableAssets');

runTest('Identifies assets that need operator review action', () => {
  // Actionable means generated (has path/thumbnail) AND pending
  const actionableMocks = [
    { id: 'action1', status: 'pending', path: '/foo.png' },
    { id: 'not-action1', status: 'pending' }, // no path yet
    { id: 'not-action2', status: 'approved', path: '/foo.png' },
    { id: 'not-action3', status: 'rejected', path: '/foo.png' },
  ];
  
  const actionable = identifyActionableAssets(actionableMocks);
  assert.equal(actionable.length, 1);
  assert.equal(actionable[0].id, 'action1');
});

console.log(`\nARCHON-007C smoke test complete — ${passedCount} passed, ${failedCount} failed\n`);
if (failedCount > 0) process.exit(1);
