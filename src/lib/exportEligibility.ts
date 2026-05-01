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

// ─── Per-Asset Exclusion Reason ───────────────────────────────────────────────
// ARCHON-008B: Row-level helpers for the Export Eligibility Preview UI.
// All functions are pure, deterministic, and non-mutating.

/**
 * Typed reason why an asset is excluded from (or included in) a combat pack export.
 * 'eligible'         — asset will be included in the next export (approved + has path)
 * 'rejected'         — operator explicitly rejected this asset
 * 'pending'          — asset has not yet been reviewed
 * 'generating'       — asset generation is currently in progress
 * 'failed'           — generation failed; no file present
 * 'approved_no_path' — approved by operator but no file has been generated yet
 */
export type ExportExclusionReason =
  | 'eligible'
  | 'rejected'
  | 'pending'
  | 'generating'
  | 'failed'
  | 'approved_no_path';

/**
 * Returns the deterministic exclusion reason for a single asset.
 * Does not mutate the asset.
 */
export function getExportExclusionReason(asset: Asset): ExportExclusionReason {
  if (isExportEligible(asset)) return 'eligible';
  if (asset.status === 'rejected') return 'rejected';
  if (asset.status === 'pending') return 'pending';
  if (asset.status === 'generating') return 'generating';
  if (asset.status === 'approved' && !asset.path) return 'approved_no_path';
  // Covers 'failed' and 'recoverable_failed'
  return 'failed';
}

// ─── Export Eligibility Row ───────────────────────────────────────────────────

/**
 * A single row in the Export Eligibility Preview table.
 * Intentionally excludes the raw `path` value — only `hasPath` (boolean) is
 * surfaced to avoid exposing local filesystem paths in the UI.
 */
export interface ExportEligibilityRow {
  id: string;
  name: string;
  category: Asset['category'];
  faction?: Asset['faction'];
  status: Asset['status'];
  isProtected: boolean;
  hasPath: boolean;
  eligible: boolean;
  exclusionReason: ExportExclusionReason;
  notes?: string;
}

/**
 * Derives a display-safe row for every asset in the roster.
 * Input array is not mutated. Safe to call on every render.
 */
export function getExportEligibilityRows(assets: Asset[]): ExportEligibilityRow[] {
  return assets.map(asset => ({
    id: asset.id,
    name: asset.name,
    category: asset.category,
    faction: asset.faction,
    status: asset.status,
    isProtected: asset.asset_protected,
    hasPath: !!asset.path,
    eligible: isExportEligible(asset),
    exclusionReason: getExportExclusionReason(asset),
    notes: asset.notes,
  }));
}

