/**
 * build-ingest-zip.mjs
 * Packages all approved Workshop assets into archon-external-pack-v1.zip
 * at C:\Dev\ingest\archon-external-pack-v1.zip
 *
 * ZIP structure (matches import-pack-from-path contract):
 *   combat-pack-manifest.json
 *   assets/<filename>
 *
 * Also writes external-manifest-seed.json with full asset metadata.
 * Run from: C:\Dev\archon-workshop
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSHOP_ROOT = __dirname;
const GENERATED_DIR = path.join(WORKSHOP_ROOT, 'public', 'generated');
const MANIFEST_PATH = path.join(GENERATED_DIR, 'manifests', 'asset-manifest.json');
const OUT_DIR = 'C:\\Dev\\ingest';
const ZIP_OUT = path.join(OUT_DIR, 'archon-external-pack-v1.zip');
const SEED_OUT = path.join(OUT_DIR, 'external-manifest-seed.json');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('ERROR: asset-manifest.json not found at', MANIFEST_PATH);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const approved = manifest.assets.filter(a => a.status === 'approved' && a.path);

console.log(`Found ${approved.length} approved assets in manifest.`);

// Write external-manifest-seed.json (full metadata for reconciliation)
const seed = {
  schema_version: '1.0',
  generated_at: new Date().toISOString(),
  source: 'archon-workshop baseline (board-combat-alpha-0.4)',
  asset_count: approved.length,
  assets: approved.map(a => ({
    id: a.id,
    name: a.name || a.id.replace(/-/g, ' '),
    description: a.description || '',
    category: a.category,
    subcategory: a.subcategory || null,
    faction: a.faction || 'neutral',
    type: a.type,
    stage: a.stage || null,
    version: a.version || 1,
    hash: a.hash,
    mime_type: a.mime_type,
    path: a.path,
    tags: a.tags || [],
  }))
};
fs.writeFileSync(SEED_OUT, JSON.stringify(seed, null, 2));
console.log(`✅ Wrote external-manifest-seed.json (${approved.length} entries) → ${SEED_OUT}`);

// Build ZIP using archiver
const archiver = (await import('archiver')).default;

const output = fs.createWriteStream(ZIP_OUT);
const archive = archiver('zip', { zlib: { level: 6 } });

archive.on('error', err => { throw err; });

await new Promise((resolve, reject) => {
  output.on('close', resolve);
  output.on('error', reject);
  archive.pipe(output);

  // Build combat-pack-manifest.json (import-pack-from-path contract format)
  const combatManifest = {
    schema_version: '1.0',
    generated_at: new Date().toISOString(),
    tags: ['archon-external-v1'],
    assets: approved.map(a => ({
      id: a.id,
      category: a.category,
      subcategory: a.subcategory || null,
      faction: a.faction || 'neutral',
      type: a.type,
      path: `/assets/${a.path.split('/').pop()}`,
      hash: a.hash,
      mime_type: a.mime_type || 'image/png',
    }))
  };

  archive.append(JSON.stringify(combatManifest, null, 2), { name: 'combat-pack-manifest.json' });

  let packaged = 0;
  let skipped = 0;

  for (const asset of approved) {
    if (!asset.path) { skipped++; continue; }
    const filePath = path.join(WORKSHOP_ROOT, 'public', asset.path);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
      console.warn(`  ⚠ Skipping ${asset.id} — file missing or zero-byte: ${filePath}`);
      skipped++;
      continue;
    }
    archive.file(filePath, { name: `assets/${asset.path.split('/').pop()}` });
    packaged++;
  }

  console.log(`Packaging ${packaged} asset files (${skipped} skipped)...`);
  archive.finalize();
});

const zipStat = fs.statSync(ZIP_OUT);
console.log(`✅ ZIP written: ${ZIP_OUT} (${(zipStat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log('');
console.log('Ingestion ready:');
console.log('  ZIP_PATH:           C:\\Dev\\ingest\\archon-external-pack-v1.zip');
console.log('  MANIFEST_SEED_PATH: C:\\Dev\\ingest\\external-manifest-seed.json');
