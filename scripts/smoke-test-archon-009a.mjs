/**
 * smoke-test-archon-009a.mjs
 *
 * Cross-repo consumption smoke test for ARCHON-009A.
 *
 * Verifies that `archon-game` can consume the current approved VFX assets
 * from `archon-workshop` under the modern asset IDs without schema drift,
 * stale ID contamination, or hash inconsistency.
 *
 * This test is READ-ONLY. It inspects files only — no writes, no generation,
 * no asset copying, no manifest modification, no ZIP export.
 *
 * Sections:
 *   1. Workshop modern VFX readiness (asset-manifest.json)
 *   2. Workshop stale/zombie ID absence
 *   3. Game manifest schema contract
 *   4. Modern ID presence in game manifest
 *   5. Hash consistency (workshop ↔ game manifest)
 *   6. Stale ID absence in game manifest
 *   7. CombatPackAsset shape validation (per archon-game/src/lib/types.ts)
 *   8. combat-hit-flash-dark notes inconsistency classification
 *
 * Run: node scripts/smoke-test-archon-009a.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const WORKSHOP   = path.resolve(__dirname, '..');
const GAME       = path.resolve(WORKSHOP, '..', 'archon-game');

// ─── Constants ────────────────────────────────────────────────────────────────

const MODERN_IDS = [
  'combat-hit-flash-light',
  'combat-hit-flash-dark',
  'combat-death-burst-light',
  'combat-death-burst-dark',
];

const ZOMBIE_IDS = [
  'combat-hit-flash-light-medium',
  'combat-hit-flash-dark-medium',
  'combat-impact-spark-medium',
  'combat-death-light',
  'combat-death-dark',
  'combat-nova-light',
  'combat-nova-dark',
];

// ─── Load manifests ───────────────────────────────────────────────────────────

const WORKSHOP_MANIFEST_PATH = path.join(WORKSHOP, 'public', 'generated', 'manifests', 'asset-manifest.json');
const GAME_MANIFEST_PATH     = path.join(GAME, 'src', 'combat-pack-manifest.json');

let workshopManifest;
let gameManifest;

try {
  workshopManifest = JSON.parse(fs.readFileSync(WORKSHOP_MANIFEST_PATH, 'utf8'));
} catch (e) {
  console.error(`\n❌ Failed to read workshop asset-manifest.json: ${e.message}`);
  console.error(`   Expected at: ${WORKSHOP_MANIFEST_PATH}`);
  console.error('   Ensure the dev server has been run at least once to generate the manifest.\n');
  process.exit(1);
}

try {
  gameManifest = JSON.parse(fs.readFileSync(GAME_MANIFEST_PATH, 'utf8'));
} catch (e) {
  console.error(`\n❌ Failed to read archon-game combat-pack-manifest.json: ${e.message}`);
  console.error(`   Expected at: ${GAME_MANIFEST_PATH}`);
  console.error('   Ensure archon-game is checked out at C:\\Dev\\archon-game.\n');
  process.exit(1);
}

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// ─── Section 1: Workshop modern VFX readiness ─────────────────────────────────

console.log('\n── Section 1: Workshop modern VFX readiness ──');

const workshopAssets = workshopManifest.assets ?? [];
const workshopIndex  = new Map(workshopAssets.map(a => [a.id, a]));

for (const id of MODERN_IDS) {
  const asset = workshopIndex.get(id);
  assert(`"${id}" exists in workshop manifest`,          !!asset);
  assert(`"${id}" has status === "approved"`,            asset?.status === 'approved',         `got "${asset?.status}"`);
  assert(`"${id}" has asset_protected === true`,         asset?.asset_protected === true,       `got ${asset?.asset_protected}`);
  assert(`"${id}" has non-empty path`,                   typeof asset?.path === 'string' && asset.path.length > 0, `got "${asset?.path}"`);
  if (asset?.hash !== undefined) {
    assert(`"${id}" has non-empty hash`,                 typeof asset.hash === 'string' && asset.hash.length > 0,  `got "${asset?.hash}"`);
  }
}

// ─── Section 2: Workshop stale/zombie ID absence ──────────────────────────────

console.log('\n── Section 2: Workshop stale/zombie ID absence ──');

for (const id of ZOMBIE_IDS) {
  assert(
    `zombie "${id}" absent from workshop manifest`,
    !workshopIndex.has(id),
  );
}

// ─── Section 3: Game manifest schema contract ─────────────────────────────────

console.log('\n── Section 3: Game manifest schema contract ──');

assert('game manifest has schema_version field',       typeof gameManifest.schema_version === 'string');
assert('game manifest schema_version === "1.0"',       gameManifest.schema_version === '1.0',              `got "${gameManifest.schema_version}"`);
assert('game manifest has generated_at field',         typeof gameManifest.generated_at === 'string');
assert('game manifest generated_at is a valid date',   !isNaN(Date.parse(gameManifest.generated_at)));
assert('game manifest has tags array',                 Array.isArray(gameManifest.tags));
assert('game manifest tags is non-empty',              Array.isArray(gameManifest.tags) && gameManifest.tags.length > 0);
assert('game manifest has assets array',               Array.isArray(gameManifest.assets));
assert('game manifest assets is non-empty',            Array.isArray(gameManifest.assets) && gameManifest.assets.length > 0);

// ─── Section 4: Modern ID presence in game manifest ───────────────────────────

console.log('\n── Section 4: Modern ID presence in game manifest ──');

const gameAssets = gameManifest.assets ?? [];
const gameIndex  = new Map(gameAssets.map(a => [a.id, a]));

for (const id of MODERN_IDS) {
  const asset = gameIndex.get(id);
  const expectedPath = `/assets/${id}-v1.png`;
  assert(`"${id}" present in game manifest`,            !!asset);
  assert(`"${id}" game path matches /assets/<id>-v1.png`, asset?.path === expectedPath,        `got "${asset?.path}"`);
  assert(`"${id}" game path is non-empty string`,       typeof asset?.path === 'string' && asset.path.length > 0);
  assert(`"${id}" game hash is non-empty string`,       typeof asset?.hash === 'string' && asset.hash.length > 0, `got "${asset?.hash}"`);
}

// ─── Section 5: Hash consistency (workshop ↔ game) ───────────────────────────

console.log('\n── Section 5: Hash consistency (workshop ↔ game) ──');

for (const id of MODERN_IDS) {
  const wa = workshopIndex.get(id);
  const ga = gameIndex.get(id);
  if (!wa || !ga) {
    assert(`"${id}" hash consistency — both manifests have the asset`, false,
      `workshop: ${!!wa}, game: ${!!ga}`);
    continue;
  }
  // Only compare hashes if both are present; workshop manifest may track more fields than game
  if (typeof wa.hash === 'string' && typeof ga.hash === 'string') {
    assert(
      `"${id}" workshop hash matches game manifest hash`,
      wa.hash === ga.hash,
      `workshop=${wa.hash.slice(0, 12)}…  game=${ga.hash.slice(0, 12)}…`,
    );
  } else {
    assert(`"${id}" both manifests have a hash field`, false,
      `workshop.hash="${wa.hash}" game.hash="${ga.hash}"`);
  }
}

// ─── Section 6: Stale ID absence in game manifest ────────────────────────────

console.log('\n── Section 6: Stale ID absence in game manifest ──');

for (const id of ZOMBIE_IDS) {
  assert(
    `stale "${id}" absent from game manifest`,
    !gameIndex.has(id),
  );
}

// ─── Section 7: CombatPackAsset shape validation ──────────────────────────────
//
// The game's CombatPackAsset interface (src/lib/types.ts) requires:
//   id: string
//   category: string
//   type: 'image' | 'audio'
//   path: string
//   hash: string
//   mime_type: string
//   subcategory?: string
//   faction?: 'light' | 'dark' | 'neutral'

console.log('\n── Section 7: CombatPackAsset shape validation ──');

for (const id of MODERN_IDS) {
  const asset = gameIndex.get(id);
  if (!asset) continue; // already failed in Section 4

  assert(`"${id}" has id field (string)`,              typeof asset.id === 'string');
  assert(`"${id}" has category field (string)`,        typeof asset.category === 'string' && asset.category.length > 0);
  assert(`"${id}" has type field`,                     asset.type === 'image' || asset.type === 'audio',       `got "${asset.type}"`);
  assert(`"${id}" type is "image" (VFX asset)`,        asset.type === 'image',                                 `got "${asset.type}"`);
  assert(`"${id}" has path field (string)`,            typeof asset.path === 'string' && asset.path.length > 0);
  assert(`"${id}" has hash field (string)`,            typeof asset.hash === 'string' && asset.hash.length > 0);
  assert(`"${id}" has mime_type field`,                typeof asset.mime_type === 'string' && asset.mime_type.length > 0);
  assert(`"${id}" mime_type is "image/png"`,           asset.mime_type === 'image/png',                        `got "${asset.mime_type}"`);
  // faction is optional — but for known VFX assets it should be present
  if (asset.faction !== undefined) {
    assert(
      `"${id}" faction is valid ('light' | 'dark' | 'neutral')`,
      ['light', 'dark', 'neutral'].includes(asset.faction),
      `got "${asset.faction}"`,
    );
  }
}

// Workshop manifest must NOT expose internal workshop-only fields to game consumers.
// The game only consumes: id, category, subcategory, faction, type, path, hash, mime_type.
// Verify the GAME manifest (not workshop manifest) does not carry workshop-internal fields.
const workshopOnlyFields = ['status', 'asset_protected', 'candidate_versions', 'approved_version', 'retry_count', 'notes'];
for (const id of MODERN_IDS) {
  const ga = gameIndex.get(id);
  if (!ga) continue;
  for (const field of workshopOnlyFields) {
    assert(
      `"${id}" game manifest entry does not carry workshop-internal field "${field}"`,
      !(field in ga),
    );
  }
}

// ─── Section 8: combat-hit-flash-dark notes inconsistency classification ───────
//
// Finding from cross-repo inspection:
//   - workshop manifest: status === "approved"  (export-eligible)
//   - workshop manifest: notes contains "Rejected during curation pass"
//   - game manifest: no notes field (not part of CombatPackAsset)
//
// Classification: notes are workshop-internal metadata only.
// The inconsistency does NOT affect export eligibility (which evaluates status).
// The inconsistency does NOT affect game-side consumption (notes absent from CombatPackAsset).

console.log('\n── Section 8: combat-hit-flash-dark notes inconsistency classification ──');

const darkFlashWorkshop = workshopIndex.get('combat-hit-flash-dark');
const darkFlashGame     = gameIndex.get('combat-hit-flash-dark');

assert(
  'combat-hit-flash-dark workshop status is "approved" (export-eligible)',
  darkFlashWorkshop?.status === 'approved',
  `got "${darkFlashWorkshop?.status}"`,
);

assert(
  'combat-hit-flash-dark workshop notes field exists',
  typeof darkFlashWorkshop?.notes === 'string',
);

assert(
  'combat-hit-flash-dark workshop notes contains rejected-language (inconsistency confirmed)',
  typeof darkFlashWorkshop?.notes === 'string' && darkFlashWorkshop.notes.toLowerCase().includes('reject'),
  `notes: "${darkFlashWorkshop?.notes}"`,
);

// The inconsistency classification: status drives eligibility, notes do not.
// Approved status → isExportEligible logic would return true for this asset.
assert(
  'combat-hit-flash-dark is export-eligible despite notes inconsistency (status=approved, path present)',
  darkFlashWorkshop?.status === 'approved' && typeof darkFlashWorkshop?.path === 'string' && darkFlashWorkshop.path.length > 0,
);

// Game manifest must not carry the notes field at all.
assert(
  'combat-hit-flash-dark game manifest entry has no notes field (workshop-internal only)',
  darkFlashGame !== undefined && !('notes' in darkFlashGame),
);

// Confirm game can consume the asset without seeing the inconsistency.
assert(
  'combat-hit-flash-dark game entry has valid path for consumption',
  typeof darkFlashGame?.path === 'string' && darkFlashGame.path.length > 0,
  `got "${darkFlashGame?.path}"`,
);

assert(
  'combat-hit-flash-dark game entry hash matches workshop hash',
  darkFlashWorkshop?.hash === darkFlashGame?.hash,
  `workshop=${darkFlashWorkshop?.hash?.slice(0, 12)}… game=${darkFlashGame?.hash?.slice(0, 12)}…`,
);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────────`);
console.log(`ARCHON-009A Smoke Test: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────────────\n`);
process.exit(failed > 0 ? 1 : 0);
