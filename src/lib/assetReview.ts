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
 * Checks if an asset is eligible to be overwritten during generation.
 */
export function isOverwriteEligible(asset: Asset | undefined): boolean {
  if (!asset) return true;
  return !asset.asset_protected;
}
