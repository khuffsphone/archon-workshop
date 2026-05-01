import type { Asset } from './assetManifest';

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  protected: number;
}

export type ReviewFilterState = 'all' | 'pending' | 'approved' | 'rejected' | 'protected';

/**
 * Derives review counts from the raw asset manifest without mutation.
 */
export function getReviewStats(assets: Asset[]): ReviewStats {
  return {
    total: assets.length,
    pending: assets.filter(a => a.status === 'pending').length,
    approved: assets.filter(a => a.status === 'approved').length,
    rejected: assets.filter(a => a.status === 'rejected').length,
    protected: assets.filter(a => a.asset_protected === true).length,
  };
}

/**
 * Filters assets by explicit review state.
 */
export function filterAssetsByReviewStatus(assets: Asset[], filter: ReviewFilterState): Asset[] {
  if (filter === 'all') return [...assets];
  if (filter === 'protected') return assets.filter(a => a.asset_protected === true);
  return assets.filter(a => a.status === filter);
}

/**
 * Actionable assets are those that are generated (have a path) AND pending review.
 * Empty or merely queued/generating assets cannot be reviewed yet.
 */
export function identifyActionableAssets(assets: Asset[]): Asset[] {
  return assets.filter(a => a.status === 'pending' && !!a.path);
}
