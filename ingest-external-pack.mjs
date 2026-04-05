/**
 * ingest-external-pack.mjs
 * Narrow adapter for ingesting the real external pack archon-external-pack-v1.zip
 * 
 * The real ZIP uses:
 *   - external-manifest-seed.json  (not combat-pack-manifest.json)
 *   - audio/<filename>             (not assets/<filename>)
 *   - images/<filename>            (not assets/<filename>)
 *
 * The import-pack-from-path endpoint expects:
 *   - combat-pack-manifest.json at ZIP root
 *   - assets/<filename>
 *
 * This adapter:
 *   1. Reads the real ZIP directly (no re-archive)
 *   2. Extracts assets to the correct Workshop generated dirs
 *   3. Builds manifest entries from external-manifest-seed.json
 *   4. Appends ONLY the new external entries to the live manifest
 *   5. Preserves all 235 existing baseline assets untouched
 *
 * Run from: C:\Dev\archon-workshop
 * node ingest-external-pack.mjs
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ZIP_PATH  = 'C:\\Dev\\ingest\\archon-external-pack-v1.zip';
const SEED_PATH = 'C:\\Dev\\ingest\\external-manifest-seed.json';
const MANIFEST_PATH = path.join(__dirname, 'public', 'generated', 'manifests', 'asset-manifest.json');
const GENERATED_DIR = path.join(__dirname, 'public', 'generated');

// ── 0. Pre-flight checks ────────────────────────────────────────────────────
if (!fs.existsSync(ZIP_PATH))  { console.error('ERROR: ZIP not found:', ZIP_PATH);  process.exit(1); }
if (!fs.existsSync(SEED_PATH)) { console.error('ERROR: Seed not found:', SEED_PATH); process.exit(1); }
if (!fs.existsSync(MANIFEST_PATH)) { console.error('ERROR: Live manifest not found:', MANIFEST_PATH); process.exit(1); }

const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
console.log(`📦 External pack: ${seed.pack_name} | target milestone: ${seed.target_milestone}`);
console.log(`📋 Seed assets declared: ${seed.assets.length}`);

// ── 1. Load existing manifest (baseline preservation) ───────────────────────
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const baselineCount = manifest.assets.length;
const existingIds = new Set(manifest.assets.map(a => a.id));
console.log(`📚 Baseline assets in manifest: ${baselineCount}`);

// ── 2. Extract ZIP contents ──────────────────────────────────────────────────
const JSZip = (await import('jszip')).default;
const zipBuf = fs.readFileSync(ZIP_PATH);
const zip = await JSZip.loadAsync(zipBuf);

const imported = [];
const skipped  = [];
const failed   = [];

for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir) continue;
  if (name === 'external-manifest-seed.json') continue; // metadata only

  const filename = path.basename(name);
  const ext = path.extname(filename).toLowerCase();
  const isAudio = ['.wav', '.mp3'].includes(ext);
  const subDir = isAudio ? 'audio' : 'images';
  const destPath = path.join(GENERATED_DIR, subDir, filename);

  // Derive asset ID from filename (strip extension)
  const assetId = path.parse(filename).name;

  // Check if this asset ID already exists in the manifest (versioned duplicate check)
  // The endpoint strips -v1 etc. when checking for canonical conflicts
  const canonical = assetId.replace(/-v\d+$/, '');
  if (existingIds.has(assetId)) {
    console.log(`  ⏭  Skipping ${assetId} — already in manifest`);
    skipped.push(assetId);
    continue;
  }

  try {
    const buf = await entry.async('nodebuffer');
    if (buf.length === 0) { failed.push({ id: assetId, reason: 'zero-byte' }); continue; }
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);

    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const servePath = `/generated/${subDir}/${filename}`;
    const mimeMap = { '.wav':'audio/wav', '.mp3':'audio/mpeg', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' };
    const mime_type = mimeMap[ext] || 'application/octet-stream';

    // Find seed metadata for this asset
    const seedEntry = seed.assets.find(a => a.id === assetId);
    const category  = seedEntry?.category || (isAudio ? 'audio' : 'image');
    const faction   = seedEntry?.faction  || 'neutral';
    const subcategory = seedEntry?.subcategory || null;
    const name_     = seedEntry?.name || assetId.replace(/-/g, ' ');

    imported.push({
      id: assetId,
      name: name_,
      description: `Imported from archon-external-pack-v1 (external vendor, milestone 0.5)`,
      category,
      subcategory,
      faction,
      status: 'approved',
      type: isAudio ? 'audio' : 'image',
      stage: 'external',
      version: 1,
      approved_version: 1,
      current_display_version: 1,
      asset_protected: true,
      // Mark origin so it's traceable in the manifest
      source_pack: 'archon-external-pack-v1',
      source_milestone: '0.5',
      path: servePath,
      hash,
      mime_type,
      candidate_versions: [{ version: 1, path: servePath, hash, created_at: new Date().toISOString() }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      retry_count: 0,
    });

    console.log(`  ✅ ${assetId} → ${servePath} (${buf.length} bytes)`);
  } catch (e) {
    console.error(`  ❌ ${assetId}: ${e.message}`);
    failed.push({ id: assetId, reason: e.message });
  }
}

// ── 3. Append new external entries to the manifest ───────────────────────────
// ONLY append — never modify existing baseline entries
const updatedAssets = [...manifest.assets, ...imported];
fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ assets: updatedAssets }, null, 2));

// ── 4. Summary ───────────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════');
console.log('INGESTION COMPLETE');
console.log(`  Baseline assets (preserved):  ${baselineCount}`);
console.log(`  External assets imported:     ${imported.length}`);
console.log(`  Skipped (already in manifest): ${skipped.length}`);
console.log(`  Failed:                        ${failed.length}`);
console.log(`  New manifest total:            ${updatedAssets.length}`);
if (failed.length > 0) { console.log('  Failed IDs:', failed); }
console.log('═══════════════════════════════════════════════');
