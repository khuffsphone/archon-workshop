/**
 * smoke-test-archon-010b.mjs
 *
 * Deterministic tests for ARCHON-010B: Review UI Remediation Controls.
 *
 * Tests:
 *   - updateNote: pure helper — does not change status, asset_protected, path
 *   - applyReview: existing helper — retains correct behaviour (no regression)
 *   - isOverwriteEligible: retains correct behaviour (no regression)
 *   - interaction: reject followed by re-approve restores protection
 *   - interaction: updateNote after applyReview does not alter status
 */

import { applyReview, updateNote, isOverwriteEligible } from '../src/lib/assetReview.ts';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const approvedProtected = {
  id: 'combat-hit-flash-dark',
  status: 'approved',
  asset_protected: true,
  path: '/generated/images/combat-hit-flash-dark-v1.png',
  notes: 'Rejected during curation pass',
  updated_at: '2025-01-01T00:00:00.000Z',
};

const pendingUnprotected = {
  id: 'combat-heal-pulse',
  status: 'pending',
  asset_protected: false,
  path: '/generated/images/combat-heal-pulse-v1.png',
  notes: '',
  updated_at: '2025-01-01T00:00:00.000Z',
};

const rejectedUnprotected = {
  id: 'combat-ambient-arena',
  status: 'rejected',
  asset_protected: false,
  path: '/generated/images/combat-ambient-arena-v1.png',
  notes: 'Rejected in ARCHON-010B',
  updated_at: '2025-01-01T00:00:00.000Z',
};

// ─── updateNote tests ────────────────────────────────────────────────────────

console.log('\n── updateNote ──');

{
  const correctedNote = 'Approved after ARCHON-010A visual inspection; previous rejected note was metadata inconsistency only.';
  const result = updateNote(approvedProtected, correctedNote);

  assert('updateNote: returns a new object (immutable)', result !== approvedProtected);
  assert('updateNote: note is updated', result.notes === correctedNote);
  assert('updateNote: status unchanged (still approved)', result.status === 'approved');
  assert('updateNote: asset_protected unchanged (still true)', result.asset_protected === true);
  assert('updateNote: path unchanged', result.path === approvedProtected.path);
  assert('updateNote: id unchanged', result.id === approvedProtected.id);
  assert('updateNote: updated_at unchanged (no timestamp mutation)', result.updated_at === approvedProtected.updated_at);
}

{
  // updateNote on pending asset — also safe
  const result = updateNote(pendingUnprotected, 'some note');
  assert('updateNote on pending: status unchanged (still pending)', result.status === 'pending');
  assert('updateNote on pending: asset_protected unchanged (still false)', result.asset_protected === false);
  assert('updateNote on pending: note updated', result.notes === 'some note');
}

{
  // Empty string note is a valid correction
  const result = updateNote(approvedProtected, '');
  assert('updateNote: empty string note is accepted', result.notes === '');
  assert('updateNote: empty string note does not unprotect', result.asset_protected === true);
}

// ─── applyReview regression tests ────────────────────────────────────────────

console.log('\n── applyReview (regression) ──');

{
  const result = applyReview(pendingUnprotected, { status: 'approved', note: 'Approved in 010B' });
  assert('applyReview approved: status is approved', result.status === 'approved');
  assert('applyReview approved: asset_protected is true', result.asset_protected === true);
  assert('applyReview approved: note written', result.notes === 'Approved in 010B');
  assert('applyReview approved: updated_at is set', typeof result.updated_at === 'string' && result.updated_at.length > 0);
  assert('applyReview approved: updated_at changed from fixture', result.updated_at !== pendingUnprotected.updated_at);
}

{
  const result = applyReview(approvedProtected, { status: 'rejected', note: 'Failed rubric' });
  assert('applyReview rejected: status is rejected', result.status === 'rejected');
  assert('applyReview rejected: asset_protected is false', result.asset_protected === false);
  assert('applyReview rejected: note written', result.notes === 'Failed rubric');
}

{
  // applyReview with no note: preserves existing notes
  const result = applyReview(approvedProtected, { status: 'approved' });
  assert('applyReview no-note: existing notes preserved', result.notes === approvedProtected.notes);
}

{
  // applyReview with explicit undefined note: preserves existing notes
  const result = applyReview(approvedProtected, { status: 'approved', note: undefined });
  assert('applyReview undefined-note: existing notes preserved', result.notes === approvedProtected.notes);
}

// ─── isOverwriteEligible regression tests ─────────────────────────────────────

console.log('\n── isOverwriteEligible (regression) ──');

assert('isOverwriteEligible: undefined asset returns true', isOverwriteEligible(undefined));
assert('isOverwriteEligible: protected asset returns false', !isOverwriteEligible(approvedProtected));
assert('isOverwriteEligible: unprotected pending returns true', isOverwriteEligible(pendingUnprotected));
assert('isOverwriteEligible: unprotected rejected returns true', isOverwriteEligible(rejectedUnprotected));

// ─── Interaction tests ────────────────────────────────────────────────────────

console.log('\n── Interaction: reject → re-approve ──');

{
  // Simulates the full remediation flow: reject protected → re-approve new candidate
  const step1 = applyReview(approvedProtected, { status: 'rejected', note: 'Rejected in ARCHON-010B: failed rubric.' });
  assert('reject step: status is rejected', step1.status === 'rejected');
  assert('reject step: asset_protected is false (unblocked for regen)', step1.asset_protected === false);
  assert('reject step: isOverwriteEligible now true', isOverwriteEligible(step1));

  const step2 = applyReview(step1, { status: 'approved', note: 'New candidate approved after regen.' });
  assert('re-approve step: status is approved', step2.status === 'approved');
  assert('re-approve step: asset_protected is true (restored)', step2.asset_protected === true);
  assert('re-approve step: isOverwriteEligible now false', !isOverwriteEligible(step2));
  assert('re-approve step: new note written', step2.notes === 'New candidate approved after regen.');
}

console.log('\n── Interaction: updateNote after applyReview ──');

{
  // Simulates: approve first, then correct the note without status change
  const approved = applyReview(pendingUnprotected, { status: 'approved', note: 'Rejected during curation pass' });
  assert('pre-updateNote: status is approved', approved.status === 'approved');
  assert('pre-updateNote: asset_protected is true', approved.asset_protected === true);

  const corrected = updateNote(approved, 'Approved after ARCHON-010A visual inspection; previous rejected note was metadata inconsistency only.');
  assert('post-updateNote: status still approved', corrected.status === 'approved');
  assert('post-updateNote: asset_protected still true', corrected.asset_protected === true);
  assert('post-updateNote: note corrected', corrected.notes.includes('ARCHON-010A'));
  assert('post-updateNote: updated_at not changed by updateNote', corrected.updated_at === approved.updated_at);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────────`);
if (failed === 0) {
  console.log(`✅ All ${passed} assertions passed.`);
} else {
  console.error(`❌ ${failed} assertion(s) FAILED. ${passed} passed.`);
  process.exit(1);
}
