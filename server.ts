import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import { Jimp } from 'jimp';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Deterministic SFX Synthesis ─────────────────────────────────────────────

function generateDeterministicSFX(id: string, recipe: string): Buffer {
  let seed = 0;
  for (let i = 0; i < id.length; i++) { seed = (seed << 5) - seed + id.charCodeAt(i); seed |= 0; }
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const sampleRate = 44100;
  let duration = 0.2;
  if (recipe === 'music' || recipe === 'ambient') duration = 2.0;
  if (recipe === 'impact' || recipe === 'death') duration = 0.5;
  const length = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + length * 2, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sample = 0;
    switch (recipe) {
      case 'click':        sample = Math.sin(2*Math.PI*880*t)*Math.exp(-t*50); break;
      case 'confirm':      sample = Math.sin(2*Math.PI*(440+t*440)*t)*Math.exp(-t*20); break;
      case 'invalid':      sample = (random()*2-1)*Math.exp(-t*30)*0.5+Math.sin(2*Math.PI*110*t)*Math.exp(-t*10); break;
      case 'move_ground':  sample = (random()*2-1)*Math.exp(-t*40)*0.3; break;
      case 'healing_pulse':sample = Math.sin(2*Math.PI*660*t)*Math.sin(2*Math.PI*5*t)*Math.exp(-t*5); break;
      case 'melee_hit':    sample = (random()*2-1)*Math.exp(-t*60)+Math.sin(2*Math.PI*100*t)*Math.exp(-t*15); break;
      case 'death_light':  sample = Math.sin(2*Math.PI*(880-t*440)*t)*Math.exp(-t*4); break;
      case 'death_dark':   sample = Math.sin(2*Math.PI*(220-t*110)*t)*Math.exp(-t*2); break;
      default:             sample = Math.sin(2*Math.PI*440*t)*Math.exp(-t*10);
    }
    buffer.writeInt16LE(Math.floor(Math.max(-1,Math.min(1,sample))*0x7FFF), 44+i*2);
  }
  return buffer;
}

function getFileHash(filePath: string): string {
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fs.readFileSync(filePath));
  return hashSum.digest('hex');
}

async function generateThumbnails(filePath: string, id: string, subDir: string) {
  try {
    const image = await Jimp.read(filePath);
    const thumb64Path  = path.join(process.cwd(), `public/generated/thumbnails/64/${id}.png`);
    const thumb256Path = path.join(process.cwd(), `public/generated/thumbnails/256/${id}.png`);
    fs.mkdirSync(path.dirname(thumb64Path),  { recursive: true });
    fs.mkdirSync(path.dirname(thumb256Path), { recursive: true });
    await image.clone().resize({ w: 64  }).write(thumb64Path  as any);
    await image.clone().resize({ w: 256 }).write(thumb256Path as any);
    return { thumbnail_64: `/generated/thumbnails/64/${id}.png`, thumbnail_256: `/generated/thumbnails/256/${id}.png` };
  } catch (err) { console.error(`Thumbnail generation failed for ${id}:`, err); return {}; }
}

function scanRecursive(dir: string): any[] {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) return [];
  let results: any[] = [];
  for (const file of fs.readdirSync(fullPath)) {
    const filePath = path.join(fullPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) results = results.concat(scanRecursive(path.join(dir, file)));
    else if (!file.startsWith('.')) {
      const relativePath = path.join(dir, file).replace(/\\/g, '/');
      results.push({
        filename: file, id: path.parse(file).name,
        path: `/${relativePath.replace('public/', '')}`,
        fullPath: filePath, type: /\.(png|jpg|jpeg|webp)$/i.test(file) ? 'image' : 'audio',
        mtime: stat.mtime,
      });
    }
  }
  return results;
}

// ─── Combat-pack tag matcher ──────────────────────────────────────────────────
// An asset matches if its id contains any of the provided tags, OR it's in an
// explicitly required category (arena, music-battle, sfx-*, voice-*).

function assetMatchesTags(asset: any, tags: string[]): boolean {
  if (!asset.path || asset.status !== 'approved') return false;
  const id = asset.id.toLowerCase();
  // Always include audio that's battle/combat relevant
  if (id.startsWith('music-battle')) return true;
  if (id.startsWith('sfx-')) return true;
  if (id.startsWith('voice-')) return true;
  if (id.startsWith('arena-')) return true;
  return tags.some(tag => id.includes(tag.toLowerCase()));
}

// ─── combat_ready check ───────────────────────────────────────────────────────

const COMBAT_READY_REQUIRED = [
  'unit-light-knight-token',
  'unit-light-knight-portrait',
  'unit-dark-sorceress-token',
  'unit-dark-sorceress-portrait',
  'arena-light',
  'arena-dark',
  'music-battle-loop',
  'sfx-melee-hit',
  'sfx-death-light',
  'sfx-death-dark',
  'voice-light-turn',
  'voice-dark-turn',
];

function isCombatReady(assets: any[]): boolean {
  return COMBAT_READY_REQUIRED.every(id => {
    const a = assets.find((x: any) => x.id === id);
    return a && a.status === 'approved' && a.path;
  });
}

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(bodyParser.json({ limit: '50mb' }));

  // Ensure dirs exist
  ['public/generated/images','public/generated/audio','public/generated/contact-sheets',
   'public/generated/manifests','public/generated/thumbnails/64','public/generated/thumbnails/256']
    .forEach(dir => fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true }));

  // ── Health ────────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // ── Save Asset ────────────────────────────────────────────────────────────
  app.post('/api/save-asset', async (req, res) => {
    const { id, data, type, requiresCutout, recipe } = req.body;

    // -- Overwrite Protection Guard --
    const canonicalId = id.replace(/-v\d+$/, '');
    const manifestPath = MANIFEST_PATH();
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const asset = manifest.assets.find((a: any) => a.id === canonicalId);
        if (asset && asset.asset_protected) {
          return res.status(403).json({ error: `Asset '${canonicalId}' is protected by review approval and cannot be overwritten.` });
        }
      } catch (e) {
        console.error('Failed to parse manifest during protection check:', e);
      }
    }

    let buffer: Buffer, extension = 'png', mime_type = 'image/png', codec = '';

    if (recipe) {
      buffer = generateDeterministicSFX(id, recipe);
      extension = 'wav'; mime_type = 'audio/wav';
    } else {
      if (!data) return res.status(400).json({ error: 'No data provided' });
      buffer = Buffer.from(data, 'base64');
      if (type === 'audio') {
        const isMp3 = buffer.slice(0,3).toString() === 'ID3' || (buffer[0]===0xFF && (buffer[1]&0xE0)===0xE0);
        extension = isMp3 ? 'mp3' : 'wav'; mime_type = isMp3 ? 'audio/mpeg' : 'audio/wav'; codec = isMp3 ? 'mp3' : 'pcm';
      }
    }

    if (buffer.length === 0) return res.status(500).json({ error: 'Zero-byte file' });

    const subDir = type === 'image' ? 'images' : 'audio';
    const filename = `${id}.${extension}`;
    const filePath = path.join(process.cwd(), `public/generated/${subDir}`, filename);

    try {
      if (requiresCutout && type === 'image') {
        try {
          const image = await Jimp.read(buffer);
          image.scan(0,0,image.bitmap.width,image.bitmap.height,function(x,y,idx) {
            const r=this.bitmap.data[idx], g=this.bitmap.data[idx+1], b=this.bitmap.data[idx+2];
            if (r>245&&g>245&&b>245) this.bitmap.data[idx+3]=0;
          });
          buffer = await image.getBuffer('image/png' as any);
        } catch(e) { console.error('Jimp cutout failed, saving original:', e); }
      }
      fs.writeFileSync(filePath, buffer);
      const thumbnails = type === 'image' ? await generateThumbnails(filePath, id, subDir) : {};
      res.json({ success: true, path: `/generated/${subDir}/${filename}`, mime_type, codec, ...thumbnails, hash: getFileHash(filePath) });
    } catch (e) { console.error('Save error:', e); res.status(500).json({ error: 'Failed to save file' }); }
  });

  // ── Save / Load Manifest ──────────────────────────────────────────────────
  const MANIFEST_PATH = () => path.join(process.cwd(), 'public/generated/manifests/asset-manifest.json');

  app.post('/api/save-manifest', (req, res) => {
    try { fs.writeFileSync(MANIFEST_PATH(), JSON.stringify(req.body.manifest, null, 2)); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: 'Failed to save manifest' }); }
  });

  app.get('/api/load-manifest', (req, res) => {
    const p = MANIFEST_PATH();
    res.json(fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf-8')) : { assets: [] });
  });

  // ── Rehydrate Manifest ────────────────────────────────────────────────────
  app.get('/api/rehydrate-manifest', async (req, res) => {
    const manifestPath = MANIFEST_PATH();
    let manifest = { assets: [] as any[] };
    if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath,'utf-8'));

    const existingFiles = [...scanRecursive('public/generated/images'), ...scanRecursive('public/generated/audio')];
    const updatedAssets = [...manifest.assets];

    for (let i = 0; i < updatedAssets.length; i++) {
      const asset = updatedAssets[i];
      const file = existingFiles.find(f => f.id === asset.id);
      if (file) {
        const stat = fs.statSync(file.fullPath);
        if (stat.size === 0) { updatedAssets[i] = {...asset,status:'failed'}; continue; }
        const hash = getFileHash(file.fullPath);
        let mime_type = asset.mime_type || ({'png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg'}[path.extname(file.filename).toLowerCase()??'.png'] ?? 'image/png');
        let currentPath = file.path, codec = asset.codec;
        if (asset.type === 'audio') {
          const buf = fs.readFileSync(file.fullPath);
          const isMp3 = buf.slice(0,3).toString()==='ID3'||(buf[0]===0xFF&&(buf[1]&0xE0)===0xE0);
          mime_type = isMp3 ? 'audio/mpeg' : 'audio/wav'; codec = isMp3 ? 'mp3' : 'pcm';
        }
        let thumb64 = asset.thumbnail_64, thumb256 = asset.thumbnail_256;
        if (asset.type==='image' && (!thumb64||!thumb256)) {
          const thumbs = await generateThumbnails(file.fullPath, asset.id, 'images');
          thumb64 = thumbs.thumbnail_64; thumb256 = thumbs.thumbnail_256;
        }
        let status = asset.status;
        if (status==='generating') { const upd = asset.updated_at ? new Date(asset.updated_at).getTime() : 0; if (Date.now()-upd>5*60*1000) status='recoverable_failed'; }
        updatedAssets[i] = {
          ...asset, path: currentPath, thumbnail_64: thumb64, thumbnail_256: thumb256,
          mime_type, codec, preferred_playback_file: currentPath,
          status: ['pending','failed','generating'].includes(status) ? 'approved' : status,
          hash, asset_protected: asset.status==='approved'||asset.asset_protected,
          candidate_versions: asset.candidate_versions||[], updated_at: new Date().toISOString(),
        };
      } else if (asset.path && !fs.existsSync(path.join(process.cwd(),'public',asset.path))) {
        updatedAssets[i] = {...asset, status:'failed', path:undefined, candidate_versions: asset.candidate_versions||[]};
      }
    }

    // Import orphans — skip versioned duplicates (e.g. "combat-hit-flash-light-v1")
    // when the canonical ID ("combat-hit-flash-light") already exists in the manifest.
    const existingIds = new Set(updatedAssets.map((a: any) => a.id));
    const stripVersion = (id: string) => id.replace(/-v\d+$/, '');

    for (const file of existingFiles) {
      const canonical = stripVersion(file.id);
      // Skip exact duplicate
      if (existingIds.has(file.id)) continue;
      // Skip versioned backing file whose canonical entry already exists
      if (canonical !== file.id && existingIds.has(canonical)) continue;
      // New true orphan
      {

        const stat = fs.statSync(file.fullPath);
        if (stat.size===0) continue;
        const hash = getFileHash(file.fullPath);
        let thumb64: string|undefined, thumb256: string|undefined;
        if (file.type==='image') { const t=await generateThumbnails(file.fullPath,file.id,'images'); thumb64=t.thumbnail_64; thumb256=t.thumbnail_256; }
        let category: any='unit', stage: any='H', faction: any='neutral';
        const id=file.id.toLowerCase();
        if (id.startsWith('brand-')) {category='brand';stage='A';}
        else if (id.startsWith('board-')||id.startsWith('arena-')||id.startsWith('tile-')) {category='board';stage='B';}
        else if (id.startsWith('unit-light-')) {category='unit';stage='C';faction='light';}
        else if (id.startsWith('unit-dark-')) {category='unit';stage='C';faction='dark';}
        else if (id.startsWith('spell-')||id.startsWith('status-')||id.startsWith('fx-')||id.startsWith('combat-')) {category='spell';stage='D';}
        else if (id.startsWith('ui-')) {category='ui';stage='E';}
        else if (id.startsWith('music-')) {category='music';stage='F';}
        else if (id.startsWith('sfx-')) {category='sfx';stage='G';}
        else if (id.startsWith('voice-')) {category='voice';stage='H';}
        if (id.includes('light')&&!id.startsWith('unit-dark')) faction='light';
        if (id.includes('dark')&&!id.startsWith('unit-light')) faction='dark';
        const ext=path.extname(file.filename).toLowerCase();
        const mime_type = ext==='.mp3'?'audio/mpeg':ext==='.wav'?'audio/wav':ext==='.jpg'||ext==='.jpeg'?'image/jpeg':'image/png';
        updatedAssets.push({
          id:file.id, name:file.id.replace(/-/g,' '), description:`Imported: ${file.filename}`,
          category, faction, status:'approved', type:file.type, stage, version:1, approved_version:1,
          current_display_version:1, candidate_versions:[{version:1,path:file.path,thumbnail_64:thumb64,thumbnail_256:thumb256,created_at:file.mtime.toISOString(),hash}],
          asset_protected:true, path:file.path, thumbnail_64:thumb64, thumbnail_256:thumb256, hash, mime_type,
          created_at:file.mtime.toISOString(), updated_at:file.mtime.toISOString(), retry_count:0,
        });
      }
    }

    fs.writeFileSync(manifestPath, JSON.stringify({ assets: updatedAssets }, null, 2));
    res.json({ assets: updatedAssets });
  });

  // ── Queue State ───────────────────────────────────────────────────────────
  const QUEUE_PATH = () => path.join(process.cwd(), 'public/generated/manifests/queue-state.json');
  app.post('/api/save-queue-state', (req,res) => { try { fs.writeFileSync(QUEUE_PATH(),JSON.stringify(req.body.state,null,2)); res.json({success:true}); } catch(e){res.status(500).json({error:'Failed'});} });
  app.get('/api/get-queue-state', (_req,res) => { const p=QUEUE_PATH(); res.json(fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf-8')):null); });

  // ── Workspace State ───────────────────────────────────────────────────────
  const WS_PATH = () => path.join(process.cwd(), 'public/generated/manifests/workspace-state.json');
  app.post('/api/save-workspace-state', (req,res) => { try { fs.writeFileSync(WS_PATH(),JSON.stringify(req.body.state,null,2)); res.json({success:true}); } catch(e){res.status(500).json({error:'Failed'});} });
  app.get('/api/get-workspace-state', (_req,res) => { const p=WS_PATH(); res.json(fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf-8')):null); });

  // ── Materialize Assets ────────────────────────────────────────────────────
  app.post('/api/materialize-assets', async (req, res) => {
    const manifestPath = MANIFEST_PATH();
    if (!fs.existsSync(manifestPath)) return res.status(404).json({ error: 'Manifest not found' });
    const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf-8'));
    const results = { verified:0, repaired:0, failed:0, thumbnails:0 };

    for (let i = 0; i < manifest.assets.length; i++) {
      const asset = manifest.assets[i];
      if (!['approved','success'].includes(asset.status)) continue;
      const fullPath = path.join(process.cwd(),'public',asset.path||'');
      let exists = asset.path && fs.existsSync(fullPath);
      let isZero  = exists && fs.statSync(fullPath).size === 0;
      if (!exists || isZero) {
        const vc = asset.candidate_versions?.find((v:any) => { if(!v.path) return false; const p=path.join(process.cwd(),'public',v.path); return fs.existsSync(p)&&fs.statSync(p).size>0; });
        if (vc) { asset.path=vc.path; asset.thumbnail_64=vc.thumbnail_64; asset.thumbnail_256=vc.thumbnail_256; asset.hash=vc.hash; asset.mime_type=vc.mime_type; results.repaired++; }
        else { asset.status='failed'; results.failed++; continue; }
      }
      if (!asset.mime_type && asset.path) {
        const ext=path.extname(asset.path).toLowerCase();
        asset.mime_type = ext==='.mp3'?'audio/mpeg':ext==='.wav'?'audio/wav':ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.webp'?'image/webp':'image/png';
      }
      if (asset.type==='image') {
        const cp=path.join(process.cwd(),'public',asset.path);
        if (!asset.thumbnail_64||!fs.existsSync(path.join(process.cwd(),'public',asset.thumbnail_64))) { const t=await generateThumbnails(cp,asset.id,'images'); asset.thumbnail_64=t.thumbnail_64; results.thumbnails++; }
        if (!asset.thumbnail_256||!fs.existsSync(path.join(process.cwd(),'public',asset.thumbnail_256))) { const t=await generateThumbnails(cp,asset.id,'images'); asset.thumbnail_256=t.thumbnail_256; results.thumbnails++; }
      }
      results.verified++;
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    res.json({ success: true, results });
  });

  // ── Verify Manifest ───────────────────────────────────────────────────────
  app.get('/api/verify-manifest', async (_req, res) => {
    const manifestPath = MANIFEST_PATH();
    if (!fs.existsSync(manifestPath)) return res.json({ valid: false, combat_ready: false, errors: ['Manifest missing'] });
    const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf-8'));
    const errors: string[] = [];

    manifest.assets.forEach((asset: any) => {
      if (asset.status === 'approved') {
        if (!asset.path) errors.push(`${asset.id}: Missing path`);
        else {
          const p = path.join(process.cwd(),'public',asset.path);
          if (!fs.existsSync(p)) errors.push(`${asset.id}: File missing`);
          else if (fs.statSync(p).size === 0) errors.push(`${asset.id}: Zero-byte`);
        }
        if (asset.type==='image') {
          if (!asset.thumbnail_64) errors.push(`${asset.id}: Missing thumbnail_64`);
          if (!asset.thumbnail_256) errors.push(`${asset.id}: Missing thumbnail_256`);
        }
        if (!asset.hash) errors.push(`${asset.id}: Missing hash`);
        if (!asset.mime_type) errors.push(`${asset.id}: Missing mime_type`);
      }
    });

    const combat_ready = isCombatReady(manifest.assets);
    res.json({ valid: errors.length === 0, combat_ready, errors });
  });

  // ── Import File ───────────────────────────────────────────────────────────
  app.post('/api/import-file', async (req, res) => {
    const { id, data, type, filename } = req.body;
    if (!data||!id||!type||!filename) return res.status(400).json({ error: 'Missing fields' });
    const buffer = Buffer.from(data,'base64');
    if (buffer.length===0) return res.status(400).json({ error: 'Zero-byte file' });
    const subDir = type==='image'?'images':'audio';
    const filePath = path.join(process.cwd(),`public/generated/${subDir}`,filename);
    try {
      fs.writeFileSync(filePath,buffer);
      const thumbnails = type==='image'?await generateThumbnails(filePath,id,subDir):{};
      res.json({ success:true, path:`/generated/${subDir}/${filename}`, ...thumbnails, hash:getFileHash(filePath) });
    } catch(e) { res.status(500).json({ error: 'Failed to save' }); }
  });

  // ── NEW: Export Combat Pack ───────────────────────────────────────────────
  // POST /api/export-combat-pack  { tags: string[] }
  // Returns a ZIP containing:
  //   - combat-pack-manifest.json  (CombatPackManifest schema)
  //   - assets/<filename>           (only approved assets matching tags)

  app.post('/api/export-combat-pack', async (req, res) => {
    const { tags = [] } = req.body as { tags: string[] };
    const manifestPath = MANIFEST_PATH();
    if (!fs.existsSync(manifestPath)) return res.status(404).json({ error: 'Manifest not found' });

    const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf-8'));
    const matched = manifest.assets.filter((a: any) => assetMatchesTags(a, tags));

    if (matched.length === 0) return res.status(404).json({ error: 'No approved assets match the provided tags' });

    // Build CombatPackManifest
    const combatManifest = {
      schema_version: '1.0',
      generated_at: new Date().toISOString(),
      tags,
      assets: matched.map((a: any) => ({
        id: a.id,
        category: a.category,
        subcategory: a.subcategory,
        faction: a.faction,
        type: a.type,
        path: `/assets/${a.path?.split('/').pop()}`,
        hash: a.hash,
        mime_type: a.mime_type || 'image/png',
      })),
    };

    // Stream ZIP via JSZip-compatible manual construction
    // Use archiver for streaming zip on Node side
    const archiver = (await import('archiver')).default;
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition',`attachment; filename="archon-combat-pack-${Date.now()}.zip"`);

    const archive = archiver('zip',{ zlib:{ level:6 } });
    archive.pipe(res);

    // Add manifest
    archive.append(JSON.stringify(combatManifest,null,2), { name:'combat-pack-manifest.json' });

    // Add asset files
    let count = 0;
    for (const asset of matched) {
      if (!asset.path) continue;
      const filePath = path.join(process.cwd(),'public',asset.path);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).size===0) continue;
      archive.file(filePath, { name:`assets/${asset.path.split('/').pop()}` });
      count++;
    }

    await archive.finalize();
    console.log(`Combat pack exported: ${count} assets, tags: ${tags.join(',')}`);
  });

  // ── NEW: Automation-Safe Pack Import (no file picker required) ──────────────
  // POST /api/import-pack-from-path  { zipPath: string }
  // Accepts an absolute server-side path to a combat-pack ZIP.
  // Does NOT require a browser file picker — safe for CLI and subagent use.
  app.post('/api/import-pack-from-path', async (req, res) => {
    const { zipPath } = req.body as { zipPath: string };
    if (!zipPath) return res.status(400).json({ error: 'zipPath is required' });

    const cwd = process.cwd();
    const resolved = path.resolve(zipPath);
    // Safety: only allow paths inside C:\Dev
    if (!resolved.startsWith(cwd) && !resolved.startsWith('C:\\Dev')) {
      return res.status(403).json({ error: 'zipPath must be within the workspace' });
    }
    if (!fs.existsSync(resolved)) return res.status(404).json({ error: `File not found: ${resolved}` });
    if (!resolved.endsWith('.zip')) return res.status(400).json({ error: 'Must be a .zip file' });

    try {
      const JSZip = (await import('jszip')).default;
      const zipBuf = fs.readFileSync(resolved);
      const zip = await JSZip.loadAsync(zipBuf);

      const manifestFile = zip.file('combat-pack-manifest.json');
      if (!manifestFile) return res.status(400).json({ error: 'ZIP missing combat-pack-manifest.json' });

      const manifestText = await manifestFile.async('string');
      const combatManifest = JSON.parse(manifestText);

      const imported: string[] = [];
      const failed: string[] = [];

      const assetFiles = Object.entries(zip.files).filter(
        ([name, entry]) => name.startsWith('assets/') && !entry.dir
      );

      for (const [name, entry] of assetFiles) {
        const filename = path.basename(name);
        const ext = path.extname(filename).toLowerCase();
        const subDir = ['.wav', '.mp3'].includes(ext) ? 'audio' : 'images';
        const destPath = path.join(cwd, `public/generated/${subDir}`, filename);
        try {
          const buf = await entry.async('nodebuffer');
          if (buf.length === 0) { failed.push(filename); continue; }
          fs.writeFileSync(destPath, buf);
          imported.push(filename);
        } catch { failed.push(filename); }
      }

      res.json({
        success: true,
        zipPath: resolved,
        imported: imported.length,
        failed: failed.length,
        failedFiles: failed,
        assetCount: combatManifest.assets?.length ?? 0,
        tag: combatManifest.tags?.join(',') ?? '',
      });
    } catch (e: any) {
      res.status(500).json({ error: `Import failed: ${e.message}` });
    }
  });

  // ── Vite middleware ───────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server:{ middlewareMode:true }, appType:'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(),'dist');
    app.use(express.static(distPath));
    app.get('*',(_req,res)=>res.sendFile(path.join(distPath,'index.html')));
  }

  app.listen(PORT,'0.0.0.0',() => console.log(`Archon Workshop → http://localhost:${PORT}`));
}

startServer();
