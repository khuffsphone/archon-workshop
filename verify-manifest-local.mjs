/**
 * verify-manifest-local.mjs
 * Runs verify-manifest and materialize logic locally without needing the HTTP server.
 * Mirrors the logic in server.ts exactly.
 * Run from: C:\Dev\archon-workshop
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, 'public', 'generated', 'manifests', 'asset-manifest.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const COMBAT_READY_REQUIRED = [
  'unit-light-knight-token', 'unit-light-knight-portrait',
  'unit-dark-sorceress-token', 'unit-dark-sorceress-portrait',
  'arena-light', 'arena-dark',
  'music-battle-loop', 'sfx-melee-hit',
  'sfx-death-light', 'sfx-death-dark',
  'voice-light-turn', 'voice-dark-turn',
];

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('Manifest not found:', MANIFEST_PATH); process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const assets = manifest.assets;

console.log(`Total assets in manifest: ${assets.length}`);
console.log(`  Approved: ${assets.filter(a => a.status === 'approved').length}`);
console.log(`  Baseline (no source_pack): ${assets.filter(a => !a.source_pack).length}`);
console.log(`  External (source_pack set): ${assets.filter(a => a.source_pack).length}`);
console.log('');

// ── Verify ────────────────────────────────────────────────────────────────────
const errors = [];
let thumbnailsGenerated = 0;

for (const asset of assets) {
  if (asset.status !== 'approved') continue;
  if (!asset.path) { errors.push(`${asset.id}: Missing path`); continue; }

  const fullPath = path.join(PUBLIC_DIR, asset.path);
  if (!fs.existsSync(fullPath)) { errors.push(`${asset.id}: File missing at ${asset.path}`); continue; }
  if (fs.statSync(fullPath).size === 0) { errors.push(`${asset.id}: Zero-byte`); continue; }

  if (!asset.hash) errors.push(`${asset.id}: Missing hash`);
  if (!asset.mime_type) errors.push(`${asset.id}: Missing mime_type`);

  if (asset.type === 'image') {
    const thumb64Dir  = path.join(__dirname, 'public', 'generated', 'thumbnails', '64');
    const thumb256Dir = path.join(__dirname, 'public', 'generated', 'thumbnails', '256');
    const thumb64Path  = path.join(thumb64Dir,  `${asset.id}.png`);
    const thumb256Path = path.join(thumb256Dir, `${asset.id}.png`);
    fs.mkdirSync(thumb64Dir,  { recursive: true });
    fs.mkdirSync(thumb256Dir, { recursive: true });

    if (!asset.thumbnail_64 || !fs.existsSync(path.join(PUBLIC_DIR, asset.thumbnail_64))) {
      try {
        const img = await Jimp.read(fullPath);
        await img.clone().resize({ w: 64  }).write(thumb64Path);
        asset.thumbnail_64  = `/generated/thumbnails/64/${asset.id}.png`;
        thumbnailsGenerated++;
      } catch (e) { errors.push(`${asset.id}: thumbnail_64 generation failed`); }
    }
    if (!asset.thumbnail_256 || !fs.existsSync(path.join(PUBLIC_DIR, asset.thumbnail_256))) {
      try {
        const img = await Jimp.read(fullPath);
        await img.clone().resize({ w: 256 }).write(thumb256Path);
        asset.thumbnail_256 = `/generated/thumbnails/256/${asset.id}.png`;
        thumbnailsGenerated++;
      } catch (e) { errors.push(`${asset.id}: thumbnail_256 generation failed`); }
    }
  }
}

// ── Combat ready check ────────────────────────────────────────────────────────
const approvedIds = new Set(assets.filter(a => a.status === 'approved' && a.path).map(a => a.id));
const combatReady = COMBAT_READY_REQUIRED.every(id => approvedIds.has(id));
const missingCombat = COMBAT_READY_REQUIRED.filter(id => !approvedIds.has(id));

// Save updated manifest if thumbnails were generated
if (thumbnailsGenerated > 0) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ assets }, null, 2));
  console.log(`Thumbnails generated: ${thumbnailsGenerated}`);
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════');
console.log('VERIFY-MANIFEST RESULTS');
console.log(`  valid:         ${errors.length === 0}`);
console.log(`  combat_ready:  ${combatReady}`);
console.log(`  error_count:   ${errors.length}`);
if (!combatReady) { console.log('  missing combat required:', missingCombat); }
if (errors.length > 0) {
  console.log('  Errors (first 20):');
  errors.slice(0, 20).forEach(e => console.log('    ', e));
}
console.log('═══════════════════════════════════════════════');

// ── External assets detail ────────────────────────────────────────────────────
const external = assets.filter(a => a.source_pack);
console.log('');
console.log(`External assets (${external.length}):`);
external.forEach(a => {
  console.log(`  ${a.id} | ${a.type} | ${a.category} | ${a.faction} | ${a.path} | hash:${(a.hash||'').slice(0,12)}`);
});
