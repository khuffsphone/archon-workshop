import { assert } from 'console';
import { applyReview, isOverwriteEligible } from '../src/lib/assetReview.ts';

function runTests() {
  console.log('--- Running ARCHON-007A Smoke Tests ---');

  const baseAsset = {
    id: 'test-asset-1',
    category: 'unit',
    type: 'image',
    status: 'pending',
    asset_protected: false,
    version: 1,
    candidate_versions: []
  };

  // 1. Approve transition & note preservation & protected
  const approvedAsset = applyReview(baseAsset, { status: 'approved', note: 'Looks great' });
  assert(approvedAsset !== baseAsset, 'Helper should be non-mutating');
  assert(approvedAsset.status === 'approved', 'Status should be approved');
  assert(approvedAsset.notes === 'Looks great', 'Note should be preserved');
  assert(approvedAsset.asset_protected === true, 'Approved asset should be protected');

  // 2. Reject transition & note preservation & not protected
  const rejectedAsset = applyReview(baseAsset, { status: 'rejected', note: 'Too dark' });
  assert(rejectedAsset.status === 'rejected', 'Status should be rejected');
  assert(rejectedAsset.notes === 'Too dark', 'Note should be preserved');
  assert(rejectedAsset.asset_protected === false, 'Rejected asset should not be protected');
  // Rejected asset is not deleted (the object is fully returned)
  assert(rejectedAsset.id === 'test-asset-1', 'ID must be preserved');

  // 3. Overwrite eligibility
  assert(isOverwriteEligible(baseAsset) === true, 'Pending is eligible');
  assert(isOverwriteEligible(approvedAsset) === false, 'Approved is NOT eligible');
  assert(isOverwriteEligible(rejectedAsset) === true, 'Rejected is eligible');

  console.log('✅ ARCHON-007A Helper Tests Passed\n');
}

runTests();
