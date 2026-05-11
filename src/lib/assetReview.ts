import type { Asset } from './assetManifest';

export interface ReviewDecision {
  status: 'approved' | 'rejected';
  note?: string;
}

/**
 * Applies a review decision to an asset. Returns a new Asset object.
 */
export function applyReview(asset: Asset, decision: ReviewDecision): Asset {
  return {
    ...asset,
    status: decision.status,
    notes: decision.note !== undefined ? decision.note : asset.notes,
    asset_protected: decision.status === 'approved' ? true : false,
    updated_at: new Date().toISOString()
  };
}

/**
 * Corrects the review note on an approved asset without changing its status,
 * asset_protected flag, or any other field.
 *
 * Use this ONLY for metadata-only note corrections (e.g. ARCHON-010B remediation
 * of a stale rejected-language note on an approved asset).
 *
 * Does NOT change status. Does NOT change asset_protected. Does NOT alter path or
 * version fields. Safe to call on a protected approved asset.
 */
export function updateNote(asset: Asset, note: string): Asset {
  return {
    ...asset,
    notes: note,
  };
}

/**
 * Checks if an asset is eligible to be overwritten during generation.
 */
export function isOverwriteEligible(asset: Asset | undefined): boolean {
  if (!asset) return true;
  return !asset.asset_protected;
}
