// scripts/smoke-test-archon-009c.mjs
// ARCHON-009C — Smoke test for Export Preview filter + sort helpers
// Pure Node, zero dependencies, deterministic.

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { register } from 'module';

// ── Bootstrap tsx so we can import TypeScript helpers ─────────────────────────
// Use the same pattern as smoke-test-archon-009a.mjs (tsx/esm loader).
// Run via: node --import=tsx/esm scripts/smoke-test-archon-009c.mjs

import {
  applyPreviewFilter,
  applyPreviewSort,
} from '../src/lib/exportEligibility.ts';

// ── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const section = (label) => console.log(`\n── ${label} ──`);

function assert(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertTrue(label, value) {
  if (value) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label} — expected truthy, got: ${JSON.stringify(value)}`);
    failed++;
  }
}

function assertEqual(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ── Fixture rows ─────────────────────────────────────────────────────────────

/** @type {import('../src/lib/exportEligibility.ts').ExportEligibilityRow[]} */
const ROWS = [
  {
    id: 'asset-a', name: 'Asset A', category: 'unit',
    status: 'approved', isProtected: true,  hasPath: true,
    eligible: true,  exclusionReason: 'eligible',
  },
  {
    id: 'asset-b', name: 'Asset B', category: 'board',
    status: 'rejected', isProtected: false, hasPath: false,
    eligible: false, exclusionReason: 'rejected',
  },
  {
    id: 'asset-c', name: 'Asset C', category: 'sfx',
    status: 'pending',  isProtected: false, hasPath: false,
    eligible: false, exclusionReason: 'pending',
  },
  {
    id: 'asset-d', name: 'Asset D', category: 'music',
    status: 'approved', isProtected: false, hasPath: false,
    eligible: false, exclusionReason: 'approved_no_path',
  },
  {
    id: 'asset-e', name: 'Asset E', category: 'spell',
    status: 'approved', isProtected: true,  hasPath: true,
    eligible: true,  exclusionReason: 'eligible',
  },
  {
    id: 'asset-f', name: 'Asset F', category: 'unit',
    status: 'failed',   isProtected: false, hasPath: false,
    eligible: false, exclusionReason: 'failed',
  },
];

// ── Section 1: applyPreviewFilter ─────────────────────────────────────────────

section('Section 1: applyPreviewFilter — all');
{
  const result = applyPreviewFilter(ROWS, 'all');
  assertEqual('returns all rows',       result.length, ROWS.length);
  assertEqual('same reference length',  result.length, 6);
}

section('Section 2: applyPreviewFilter — eligible');
{
  const result = applyPreviewFilter(ROWS, 'eligible');
  assertEqual('returns 2 eligible rows', result.length, 2);
  assertTrue('all are eligible',         result.every(r => r.eligible));
  assert('IDs', result.map(r => r.id).sort(), ['asset-a', 'asset-e']);
}

section('Section 3: applyPreviewFilter — excluded');
{
  const result = applyPreviewFilter(ROWS, 'excluded');
  assertEqual('returns 4 excluded rows', result.length, 4);
  assertTrue('none are eligible',        result.every(r => !r.eligible));
}

section('Section 4: applyPreviewFilter — protected');
{
  const result = applyPreviewFilter(ROWS, 'protected');
  assertEqual('returns 2 protected rows', result.length, 2);
  assertTrue('all are protected',         result.every(r => r.isProtected));
  assert('IDs', result.map(r => r.id).sort(), ['asset-a', 'asset-e']);
}

section('Section 5: applyPreviewFilter — rejected');
{
  const result = applyPreviewFilter(ROWS, 'rejected');
  assertEqual('returns 1 rejected row',  result.length, 1);
  assertEqual('correct ID',             result[0].id, 'asset-b');
  assertEqual('exclusion reason',       result[0].exclusionReason, 'rejected');
}

section('Section 6: applyPreviewFilter — missing_path');
{
  const result = applyPreviewFilter(ROWS, 'missing_path');
  assertEqual('returns 1 missing_path row', result.length, 1);
  assertEqual('correct ID',               result[0].id, 'asset-d');
  assertEqual('exclusion reason',         result[0].exclusionReason, 'approved_no_path');
}

section('Section 7: applyPreviewFilter — does not mutate input');
{
  const original = [...ROWS];
  applyPreviewFilter(ROWS, 'eligible');
  assertEqual('input length unchanged', ROWS.length, original.length);
  assertEqual('first ID unchanged',     ROWS[0].id, original[0].id);
}

section('Section 8: applyPreviewFilter — empty input');
{
  const result = applyPreviewFilter([], 'eligible');
  assertEqual('returns empty array', result.length, 0);
}

// ── Section 9–14: applyPreviewSort ───────────────────────────────────────────

section('Section 9: applyPreviewSort — by id asc');
{
  const result = applyPreviewSort(ROWS, { key: 'id', direction: 'asc' });
  const ids = result.map(r => r.id);
  assert('sorted a→f', ids, ['asset-a', 'asset-b', 'asset-c', 'asset-d', 'asset-e', 'asset-f']);
}

section('Section 10: applyPreviewSort — by id desc');
{
  const result = applyPreviewSort(ROWS, { key: 'id', direction: 'desc' });
  const ids = result.map(r => r.id);
  assert('sorted f→a', ids, ['asset-f', 'asset-e', 'asset-d', 'asset-c', 'asset-b', 'asset-a']);
}

section('Section 11: applyPreviewSort — by status asc');
{
  const result = applyPreviewSort(ROWS, { key: 'status', direction: 'asc' });
  const statuses = result.map(r => r.status);
  // Lexicographic: approved, approved, approved, failed, pending, rejected
  assertEqual('first status is approved',  statuses[0], 'approved');
  assertEqual('last status is rejected',   statuses[statuses.length - 1], 'rejected');
}

section('Section 12: applyPreviewSort — by eligible asc (eligible first)');
{
  const result = applyPreviewSort(ROWS, { key: 'eligible', direction: 'asc' });
  // true sorts first on asc per implementation
  assertTrue('first row is eligible',      result[0].eligible);
  assertTrue('last row is not eligible',   !result[result.length - 1].eligible);
}

section('Section 13: applyPreviewSort — by eligible desc (ineligible first)');
{
  const result = applyPreviewSort(ROWS, { key: 'eligible', direction: 'desc' });
  assertTrue('first row is NOT eligible',  !result[0].eligible);
  assertTrue('last row IS eligible',       result[result.length - 1].eligible);
}

section('Section 14: applyPreviewSort — by exclusionReason asc');
{
  const result = applyPreviewSort(ROWS, { key: 'exclusionReason', direction: 'asc' });
  const reasons = result.map(r => r.exclusionReason);
  // Lexicographic: approved_no_path, eligible, eligible, failed, pending, rejected
  assertEqual('first reason', reasons[0], 'approved_no_path');
  assertEqual('last reason',  reasons[reasons.length - 1], 'rejected');
}

section('Section 15: applyPreviewSort — does not mutate input');
{
  const original = ROWS.map(r => r.id);
  applyPreviewSort(ROWS, { key: 'id', direction: 'desc' });
  assert('input order unchanged', ROWS.map(r => r.id), original);
}

section('Section 16: applyPreviewSort — empty input');
{
  const result = applyPreviewSort([], { key: 'id', direction: 'asc' });
  assertEqual('returns empty array', result.length, 0);
}

section('Section 17: filter then sort composition');
{
  // Filter to excluded then sort by ID desc
  const filtered = applyPreviewFilter(ROWS, 'excluded');
  const sorted   = applyPreviewSort(filtered, { key: 'id', direction: 'desc' });
  assertEqual('4 excluded rows',    sorted.length, 4);
  assertEqual('last id is asset-b', sorted[sorted.length - 1].id, 'asset-b');
  assertEqual('first id is asset-f', sorted[0].id, 'asset-f');
}

section('Section 18: filter + sort — eligible sorted by exclusionReason');
{
  const filtered = applyPreviewFilter(ROWS, 'eligible');
  const sorted   = applyPreviewSort(filtered, { key: 'exclusionReason', direction: 'asc' });
  assertEqual('2 rows',                sorted.length, 2);
  assertTrue('all eligible',           sorted.every(r => r.eligible));
  assertEqual('reason is eligible',    sorted[0].exclusionReason, 'eligible');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(46));
console.log(`ARCHON-009C Smoke Test: ${passed} passed, ${failed} failed`);
console.log('─'.repeat(46) + '\n');
if (failed > 0) process.exit(1);
