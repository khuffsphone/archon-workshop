/**
 * smoke-test-archon-011a.mjs
 *
 * Deterministic tests for ARCHON-011A: Projectile VFX Manifest Seeding Fix.
 *
 * Tests:
 *  1.  combat-projectile-light exists in INITIAL_ASSETS
 *  2.  combat-projectile-dark exists in INITIAL_ASSETS
 *  3.  combat-projectile-light exists in EXPANSION_ASSETS
 *  4.  combat-projectile-dark exists in EXPANSION_ASSETS
 *  5.  IDs match exactly between INITIAL_ASSETS and EXPANSION_ASSETS
 *  6.  combat-projectile-light-v99 is NOT treated as a canonical ID
 *  7.  combat-projectile-dark-v99 is NOT treated as a canonical ID
 *  8.  EXPANSION_ASSETS IDs are unique (no duplicates introduced)
 *  9.  combat-projectile-light exists in VFX_CATALOG
 *  10. combat-projectile-dark exists in VFX_CATALOG
 *  11. Importing EXPANSION_ASSETS does not mutate the exported array
 *  12. Runtime manifest contains combat-projectile-light after Expand Library
 *  13. Runtime manifest contains combat-projectile-dark after Expand Library
 *  14. combat-projectile-light has status field present in manifest
 *  15. combat-projectile-light is approved and asset_protected: true (post-ARCHON-011B)
 *  16. combat-projectile-light has a generated path (post-ARCHON-011B)
 *  17. combat-projectile-light has at least one candidate version (post-ARCHON-011B)
 *  18. combat-projectile-dark has status field present in manifest
 *  19. combat-projectile-dark is approved and asset_protected: true (post-ARCHON-011B)
 *  20. combat-projectile-dark has a generated path (post-ARCHON-011B)
 *  21. combat-projectile-dark has at least one candidate version (post-ARCHON-011B)
 *
 * NOTE: Suite 8 assertions 15-17 and 19-21 were updated in ARCHON-011B to reflect
 * the post-generation approved state. Originally they asserted pending/ungenerated state.
 *
 * Run: node --import=tsx/esm scripts/smoke-test-archon-011a.mjs
 * No server required. Reads manifest from disk.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_ASSETS } from '../src/lib/assetManifest.ts';
import { EXPANSION_ASSETS } from '../src/lib/expansionAssets.ts';
import { VFX_CATALOG } from '../src/lib/vfxCatalog.ts';

// ── Constants ────────────────────────────────────────────────────────────────

const LIGHT_ID  = 'combat-projectile-light';
const DARK_ID   = 'combat-projectile-dark';
const LIGHT_V99 = 'combat-projectile-light-v99';
const DARK_V99  = 'combat-projectile-dark-v99';

const MANIFEST_PATH = join(
  fileURLToPath(import.meta.url),
  '../../public/generated/manifests/asset-manifest.json',
);

// ── Test harness ─────────────────────────────────────────────────────────────

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

// ── Suite 1: INITIAL_ASSETS ───────────────────────────────────────────────────

console.log('\n── Suite 1: INITIAL_ASSETS ──');

assert(
  'combat-projectile-light exists in INITIAL_ASSETS',
  INITIAL_ASSETS.some(a => a.id === LIGHT_ID),
);

assert(
  'combat-projectile-dark exists in INITIAL_ASSETS',
  INITIAL_ASSETS.some(a => a.id === DARK_ID),
);

// ── Suite 2: EXPANSION_ASSETS ─────────────────────────────────────────────────

console.log('\n── Suite 2: EXPANSION_ASSETS ──');

assert(
  'combat-projectile-light exists in EXPANSION_ASSETS',
  EXPANSION_ASSETS.some(a => a.id === LIGHT_ID),
);

assert(
  'combat-projectile-dark exists in EXPANSION_ASSETS',
  EXPANSION_ASSETS.some(a => a.id === DARK_ID),
);

// ── Suite 3: ID Matching ──────────────────────────────────────────────────────

console.log('\n── Suite 3: ID matching between INITIAL_ASSETS and EXPANSION_ASSETS ──');

const initialHasLight    = INITIAL_ASSETS.some(a => a.id === LIGHT_ID);
const expansionHasLight  = EXPANSION_ASSETS.some(a => a.id === LIGHT_ID);
const initialHasDark     = INITIAL_ASSETS.some(a => a.id === DARK_ID);
const expansionHasDark   = EXPANSION_ASSETS.some(a => a.id === DARK_ID);

assert(
  'combat-projectile-light ID matches exactly in both INITIAL_ASSETS and EXPANSION_ASSETS',
  initialHasLight && expansionHasLight,
);

assert(
  'combat-projectile-dark ID matches exactly in both INITIAL_ASSETS and EXPANSION_ASSETS',
  initialHasDark && expansionHasDark,
);

// ── Suite 4: Non-Canonical IDs Absent ────────────────────────────────────────

console.log('\n── Suite 4: Non-canonical v99 IDs not treated as canonical ──');

assert(
  'combat-projectile-light-v99 is NOT in INITIAL_ASSETS (not canonical)',
  !INITIAL_ASSETS.some(a => a.id === LIGHT_V99),
);

assert(
  'combat-projectile-dark-v99 is NOT in INITIAL_ASSETS (not canonical)',
  !INITIAL_ASSETS.some(a => a.id === DARK_V99),
);

assert(
  'combat-projectile-light-v99 is NOT in EXPANSION_ASSETS (not canonical)',
  !EXPANSION_ASSETS.some(a => a.id === LIGHT_V99),
);

assert(
  'combat-projectile-dark-v99 is NOT in EXPANSION_ASSETS (not canonical)',
  !EXPANSION_ASSETS.some(a => a.id === DARK_V99),
);

// ── Suite 5: EXPANSION_ASSETS uniqueness ─────────────────────────────────────

console.log('\n── Suite 5: EXPANSION_ASSETS ID uniqueness ──');

const expansionIds = EXPANSION_ASSETS.map(a => a.id);
const uniqueIds    = new Set(expansionIds);

assert(
  'all EXPANSION_ASSETS IDs are unique (no duplicates introduced)',
  expansionIds.length === uniqueIds.size,
);

// ── Suite 6: VFX_CATALOG ─────────────────────────────────────────────────────

console.log('\n── Suite 6: VFX_CATALOG ──');

assert(
  'combat-projectile-light exists in VFX_CATALOG (asset_slot)',
  VFX_CATALOG.some(p => p.asset_slot === LIGHT_ID),
);

assert(
  'combat-projectile-dark exists in VFX_CATALOG (asset_slot)',
  VFX_CATALOG.some(p => p.asset_slot === DARK_ID),
);

// ── Suite 7: Immutability ─────────────────────────────────────────────────────

console.log('\n── Suite 7: Import immutability (no array mutation) ──');

const lengthBefore = EXPANSION_ASSETS.length;
// Simulate what expandLibrary does — read the IDs without mutation
const ids = new Set(EXPANSION_ASSETS.map(a => a.id));
const lengthAfter  = EXPANSION_ASSETS.length;

assert(
  'EXPANSION_ASSETS length unchanged after reading IDs (no mutation)',
  lengthBefore === lengthAfter,
);

assert(
  'EXPANSION_ASSETS contains combat-projectile-light after ID read (not removed)',
  EXPANSION_ASSETS.some(a => a.id === LIGHT_ID),
);

assert(
  'EXPANSION_ASSETS contains combat-projectile-dark after ID read (not removed)',
  EXPANSION_ASSETS.some(a => a.id === DARK_ID),
);

// ── Suite 8: Runtime Manifest State (post-ARCHON-011B) ───────────────────────
// NOTE: These assertions were updated in ARCHON-011B. Originally they validated
// the seeded-but-ungenerated state. Now they validate the post-generation
// approved state after both projectile VFX assets were generated.

console.log('\n── Suite 8: Runtime manifest state (post-generation) ──');

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
} catch (e) {
  console.error('  ❌ Could not read asset-manifest.json:', e.message);
  failed++;
  manifest = { assets: [] };
}

const lightRecord = manifest.assets.find(a => a.id === LIGHT_ID);
const darkRecord  = manifest.assets.find(a => a.id === DARK_ID);

assert(
  'runtime manifest contains combat-projectile-light',
  lightRecord !== undefined,
);

assert(
  'runtime manifest contains combat-projectile-dark',
  darkRecord !== undefined,
);

// Per-field assertions for light (post-ARCHON-011B: approved, protected, path present)
assert(
  'combat-projectile-light has status field present in manifest',
  lightRecord !== undefined && typeof lightRecord.status === 'string',
);

assert(
  'combat-projectile-light is approved and asset_protected: true (post-ARCHON-011B)',
  lightRecord !== undefined && lightRecord.status === 'approved' && lightRecord.asset_protected === true,
);

assert(
  'combat-projectile-light has a generated path (post-ARCHON-011B)',
  lightRecord !== undefined && typeof lightRecord.path === 'string' && lightRecord.path.length > 0,
);

assert(
  'combat-projectile-light has at least one candidate version (post-ARCHON-011B)',
  lightRecord !== undefined &&
  Array.isArray(lightRecord.candidate_versions) &&
  lightRecord.candidate_versions.length >= 1,
);

// Per-field assertions for dark (post-ARCHON-011B: approved, protected, path present)
assert(
  'combat-projectile-dark has status field present in manifest',
  darkRecord !== undefined && typeof darkRecord.status === 'string',
);

assert(
  'combat-projectile-dark is approved and asset_protected: true (post-ARCHON-011B)',
  darkRecord !== undefined && darkRecord.status === 'approved' && darkRecord.asset_protected === true,
);

assert(
  'combat-projectile-dark has a generated path (post-ARCHON-011B)',
  darkRecord !== undefined && typeof darkRecord.path === 'string' && darkRecord.path.length > 0,
);

assert(
  'combat-projectile-dark has at least one candidate version (post-ARCHON-011B)',
  darkRecord !== undefined &&
  Array.isArray(darkRecord.candidate_versions) &&
  darkRecord.candidate_versions.length >= 1,
);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────────────');
if (failed === 0) {
  console.log(`✅ All ${passed} assertions passed.`);
} else {
  console.error(`❌ ${failed} assertion(s) FAILED. ${passed} passed.`);
  process.exit(1);
}
