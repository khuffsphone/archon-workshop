/**
 * Smoke test — ARCHON-010G: hasApprovableCandidate guard logic
 *
 * Tests the same logic used in DashboardPanel.tsx to gate the
 * "Approve Latest Candidate" button for rejected assets.
 *
 * Run: node scripts/smoke-test-archon-010g.mjs
 * No server required. Pure unit test.
 */

import assert from 'assert';

// ── Mirror of hasApprovableCandidate from DashboardPanel.tsx ─────────────────
// Tested independently to verify guard logic without importing React components.
function hasApprovableCandidate(asset) {
  if (asset.status !== 'rejected') return false;
  const versions = asset.candidate_versions ?? [];
  if (versions.length < 2) return false;
  const latest = versions[versions.length - 1];
  return (latest?.version ?? 0) > (asset.approved_version ?? 0);
}

// ── Test harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Test cases ───────────────────────────────────────────────────────────────
console.log('\n── ARCHON-010G Smoke Test: hasApprovableCandidate ──\n');

test('returns false for pending asset (even with 2 candidates)', () => {
  assert.strictEqual(hasApprovableCandidate({
    status: 'pending', approved_version: 1,
    candidate_versions: [
      { version: 1, path: '/v1.png', created_at: '2026-01-01T00:00:00Z' },
      { version: 2, path: '/v2.png', created_at: '2026-01-02T00:00:00Z' },
    ],
  }), false);
});

test('returns false for approved asset (even with 2 candidates)', () => {
  assert.strictEqual(hasApprovableCandidate({
    status: 'approved', approved_version: 2,
    candidate_versions: [
      { version: 1, path: '/v1.png', created_at: '2026-01-01T00:00:00Z' },
      { version: 2, path: '/v2.png', created_at: '2026-01-02T00:00:00Z' },
    ],
  }), false);
});

test('returns false for rejected asset with only 1 candidate (no regen)', () => {
  assert.strictEqual(hasApprovableCandidate({
    status: 'rejected', approved_version: 1,
    candidate_versions: [
      { version: 1, path: '/v1.png', created_at: '2026-01-01T00:00:00Z' },
    ],
  }), false);
});

test('returns true for rejected asset with v2 candidate (v2 > approved_version 1)', () => {
  assert.strictEqual(hasApprovableCandidate({
    status: 'rejected', approved_version: 1,
    candidate_versions: [
      { version: 1, path: '/v1.png', created_at: '2026-01-01T00:00:00Z' },
      { version: 2, path: '/v2.png', created_at: '2026-01-02T00:00:00Z' },
    ],
  }), true);
});

test('returns false when latest candidate version equals approved_version', () => {
  assert.strictEqual(hasApprovableCandidate({
    status: 'rejected', approved_version: 2,
    candidate_versions: [
      { version: 1, path: '/v1.png', created_at: '2026-01-01T00:00:00Z' },
      { version: 2, path: '/v2.png', created_at: '2026-01-02T00:00:00Z' },
    ],
  }), false);
});

test('returns true when approved_version is undefined (treats as 0)', () => {
  assert.strictEqual(hasApprovableCandidate({
    status: 'rejected', approved_version: undefined,
    candidate_versions: [
      { version: 1, path: '/v1.png', created_at: '2026-01-01T00:00:00Z' },
      { version: 2, path: '/v2.png', created_at: '2026-01-02T00:00:00Z' },
    ],
  }), true);
});

test('returns false for rejected asset with empty candidate_versions', () => {
  assert.strictEqual(hasApprovableCandidate({
    status: 'rejected', approved_version: 1,
    candidate_versions: [],
  }), false);
});

test('returns false for rejected asset with null candidate_versions', () => {
  assert.strictEqual(hasApprovableCandidate({
    status: 'rejected', approved_version: 1,
    candidate_versions: null,
  }), false);
});

// ── Results ──────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
