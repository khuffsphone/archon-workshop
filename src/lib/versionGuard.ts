import type { CombatPackManifest } from './assetManifest';
import { COMBAT_PACK_SCHEMA_VERSION } from './assetManifest';

/**
 * Throws if the combat pack manifest's schema_version doesn't match the
 * version this workshop/game build expects.
 *
 * Call this at pack load time in both archon-workshop (on export validation)
 * and archon-game (on pack consumption).
 */
export function assertPackVersion(
  pack: CombatPackManifest,
  expected: string = COMBAT_PACK_SCHEMA_VERSION
): void {
  if (pack.schema_version !== expected) {
    throw new Error(
      `Combat pack schema version mismatch: expected "${expected}", got "${pack.schema_version}". ` +
      `Re-export the pack from archon-workshop before running the game.`
    );
  }
}

/**
 * Validates that every required asset ID is present in the pack and has a path.
 * Returns an array of missing IDs (empty = all good).
 */
export function validatePackAssets(
  pack: CombatPackManifest,
  requiredIds: string[]
): string[] {
  const indexed = new Set(pack.assets.map(a => a.id));
  return requiredIds.filter(id => !indexed.has(id));
}
