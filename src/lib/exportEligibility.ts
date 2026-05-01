import type { Asset } from './assetManifest';
import { COMBAT_SLICE_REQUIRED_IDS } from './assetManifest';

// ─── Export Eligibility Helpers ───────────────────────────────────────────────
// Pure, non-mutating helpers for determining which workshop assets are eligible
// for inclusion in a game-facing combat pack export.
//
// These helpers formalise the rule already implemented in server.ts:assetMatchesTags().
// They do NOT change actual export behavior — the server remains the source of
// truth for runtime export. These helpers exist to:
//   1. Provide a deterministic, testable surface for export eligibility logic.
//   2. Enable operator-visible readiness reports before export is triggered.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An asset is export-eligible if it is approved AND has a resolved file path.
 * Rejected, pending, generating, failed, or pathless assets are never eligible.
 */
export function isExportEligible(asset: Asset): boolean {
  return asset.status === 'approved' && !!asset.path;
}

/**
 * Filters a roster down to only export-eligible assets.
 */
export function filterForCombatExport(assets: Asset[]): Asset[] {
  return assets.filter(isExportEligible);
}

// ─── Readiness Report ─────────────────────────────────────────────────────────

export interface ExportReadinessReport {
  /** Total assets in manifest */
  total: number;
  /** Assets that are export-eligible (approved + have path) */
  eligible: number;
  /** Assets that are explicitly rejected (excluded from export) */
  rejected: number;
  /** Assets that are pending review (not yet reviewed) */
  pending: number;
  /** Required IDs that are missing from the eligible set */
  missingRequired: string[];
  /** Whether all required IDs are present and eligible */
  combatReady: boolean;
}

/**
 * Produces a non-mutating readiness report for a given asset roster and
 * required ID list. Surfaces which required assets are missing from the
 * eligible set so operators can act before running the actual export.
 */
export function getExportReadinessReport(
  assets: Asset[],
  requiredIds: string[] = COMBAT_SLICE_REQUIRED_IDS
): ExportReadinessReport {
  const eligible = filterForCombatExport(assets);
  const eligibleIds = new Set(eligible.map(a => a.id));

  const missingRequired = requiredIds.filter(id => !eligibleIds.has(id));

  return {
    total: assets.length,
    eligible: eligible.length,
    rejected: assets.filter(a => a.status === 'rejected').length,
    pending: assets.filter(a => a.status === 'pending').length,
    missingRequired,
    combatReady: missingRequired.length === 0,
  };
}
