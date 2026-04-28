import React, { useRef } from 'react';
import type { Asset } from '../../lib/assetManifest';
import { assertPackVersion, validatePackAssets } from '../../lib/versionGuard';
import type { CombatPackManifest } from '../../lib/assetManifest';
import { COMBAT_PACK_SCHEMA_VERSION, COMBAT_SLICE_REQUIRED_IDS } from '../../lib/assetManifest';
import JSZip from 'jszip';
import { toast } from 'sonner';
import type { WorkshopUIState } from '../../lib/workshopPersistence';
import { validateWorkshopState, downloadWorkshopState, parseWorkshopStateFile } from '../../lib/workshopPersistence';

interface Props {
  assets: Asset[];
  setAssets: (updater: (prev: Asset[]) => Asset[]) => void;
  saveManifest: (assets: Asset[]) => Promise<void>;
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  // Workshop State persistence (separate from asset pack export)
  onExportWorkshopState: () => WorkshopUIState;
  onImportWorkshopState: (state: WorkshopUIState) => void;
}

// ─── Export Pack ──────────────────────────────────────────────────────────────

async function materializeAssets(addLog: Props['addLog'], setAssets: Props['setAssets']) {
  addLog('Starting asset materialization...', 'info');
  const res = await fetch('/api/materialize-assets', { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    addLog(`Materialization: ${data.results.verified} verified, ${data.results.repaired} repaired.`, 'success');
    const rehydrated = await fetch('/api/rehydrate-manifest');
    const reData = await rehydrated.json();
    setAssets(() => reData.assets);
    return reData.assets as Asset[];
  }
  throw new Error(data.error || 'Materialization failed');
}

export async function exportFullPack(addLog: Props['addLog'], setAssets: Props['setAssets']) {
  addLog('Preparing full export pack...');
  const latestAssets = await materializeAssets(addLog, setAssets);

  const zip = new JSZip();
  zip.file('asset-manifest.json', JSON.stringify({ assets: latestAssets }, null, 2));
  const assetFolder = zip.folder('assets')!;
  let count = 0;

  for (const asset of latestAssets) {
    if (asset.path && ((asset.status as string) === 'approved' || (asset.status as string) === 'success')) {
      try {
        const response = await fetch(asset.path);
        if (!response.ok) continue;
        const blob = await response.blob();
        if (blob.size === 0) continue;
        assetFolder.file(asset.path.split('/').pop() || `${asset.id}.png`, blob);
        count++;
      } catch (e) {
        console.error(`Failed to include ${asset.id}`, e);
      }
    }
  }

  addLog(`Included ${count} assets in ZIP.`);
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `archon-asset-pack-${Date.now()}.zip`;
  link.click();
}

export async function exportCombatPack(
  tags: string[],
  addLog: Props['addLog'],
  setAssets: Props['setAssets']
): Promise<{ manifest: CombatPackManifest; missing: string[] }> {
  addLog(`Requesting combat pack for tags: ${tags.join(', ')}...`);

  const res = await fetch('/api/export-combat-pack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Combat pack export failed');
  }

  const blob = await res.blob();
  const zip = new JSZip();
  await zip.loadAsync(blob);

  const manifestFile = zip.file('combat-pack-manifest.json');
  if (!manifestFile) throw new Error('No combat-pack-manifest.json in export');

  const manifest: CombatPackManifest = JSON.parse(await manifestFile.async('string'));

  // Version guard
  assertPackVersion(manifest, COMBAT_PACK_SCHEMA_VERSION);

  // Completeness check
  const missing = validatePackAssets(manifest, COMBAT_SLICE_REQUIRED_IDS);
  if (missing.length > 0) {
    addLog(`⚠️ Combat pack missing required assets: ${missing.join(', ')}`, 'warning');
  } else {
    addLog('Combat pack is complete. All required slice assets present.', 'success');
  }

  // Download zip
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `archon-combat-pack-${Date.now()}.zip`;
  link.click();

  return { manifest, missing };
}

// ─── Import Pack ──────────────────────────────────────────────────────────────

export async function importPack(
  file: File,
  assets: Asset[],
  setAssets: Props['setAssets'],
  saveManifest: Props['saveManifest'],
  addLog: Props['addLog']
) {
  addLog(`Importing pack: ${file.name}...`);
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);

  let manifestFile = contents.file('asset-manifest.json');
  let isProjectSnapshot = false;
  if (!manifestFile) {
    manifestFile = contents.file('public/generated/manifests/asset-manifest.json');
    isProjectSnapshot = !!manifestFile;
  }
  if (!manifestFile) {
    addLog('No asset-manifest.json found in ZIP.', 'error');
    return;
  }

  const manifestData = JSON.parse(await manifestFile.async('string'));
  const importedAssets = (manifestData.assets || []) as any[];
  addLog(`Found ${importedAssets.length} assets in manifest.`);

  const results = { imported: 0, merged: 0, rejected: 0 };
  const newAssets = [...assets];

  for (const asset of importedAssets) {
    // Skip non-approved assets — only import approved content
    const isApproved = (asset.status as string) === 'approved' || (asset.status as string) === 'success';
    if (!isApproved) { results.rejected++; continue; }

    let zipPath = isProjectSnapshot
      ? `public${asset.path}`
      : `assets/${asset.id}${asset.type === 'image' ? '.png' : '.wav'}`;

    if (!contents.file(zipPath)) {
      const exts = asset.type === 'image' ? ['.png', '.jpg', '.jpeg', '.webp'] : ['.wav', '.mp3'];
      for (const ext of exts) {
        const alt = isProjectSnapshot
          ? `public${asset.path?.replace(/\.[^/.]+$/, ext)}`
          : `assets/${asset.id}${ext}`;
        if (contents.file(alt)) { zipPath = alt; break; }
      }
    }

    const zipFile = contents.file(zipPath);
    if (!zipFile) { addLog(`File missing for ${asset.id}`, 'warning'); results.rejected++; continue; }

    const buffer = await zipFile.async('base64');
    const filename = zipPath.split('/').pop() || '';

    try {
      const saveRes = await fetch('/api/import-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: asset.id, data: buffer, type: asset.type, filename }),
      });
      const saveData = await saveRes.json();

      if (saveData.success) {
        const updatedAsset: Asset = {
          ...asset,
          path: saveData.path,
          thumbnail_64: saveData.thumbnail_64,
          thumbnail_256: saveData.thumbnail_256,
          hash: saveData.hash,
          status: 'approved',
          asset_protected: true,
        };

        const existingIdx = newAssets.findIndex(a => a.id === asset.id);
        if (existingIdx >= 0) {
          // Preserve protection − never overwrite approved+protected
          if (newAssets[existingIdx].asset_protected && newAssets[existingIdx].status === 'approved') {
            results.rejected++;
            continue;
          }
          newAssets[existingIdx] = updatedAsset;
          results.merged++;
        } else {
          newAssets.push(updatedAsset);
          results.imported++;
        }
      }
    } catch (err) {
      console.error(`Failed to import ${asset.id}:`, err);
      results.rejected++;
    }
  }

  setAssets(() => newAssets);
  await saveManifest(newAssets);
  addLog(`Import: ${results.imported} imported, ${results.merged} merged, ${results.rejected} rejected.`, 'success');
  toast.success('Pack imported successfully');
}

// ─── Panel UI ─────────────────────────────────────────────────────────────────

export function ExportPanel({ assets, setAssets, saveManifest, addLog, onExportWorkshopState, onImportWorkshopState }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);

  const handleExportFull = async () => {
    try { await exportFullPack(addLog, setAssets); }
    catch (e: any) { addLog(e.message, 'error'); toast.error('Export failed'); }
  };

  const handleExportCombat = async () => {
    try {
      const { missing } = await exportCombatPack(['knight', 'sorceress', 'arena', 'battle', 'sfx'], addLog, setAssets);
      if (missing.length > 0) toast.warning(`Combat pack missing ${missing.length} assets`);
      else toast.success('Combat pack exported!');
    } catch (e: any) { addLog(e.message, 'error'); toast.error('Combat pack export failed'); }
  };

  const handleVerify = async () => {
    const res = await fetch('/api/verify-manifest');
    const data = await res.json();
    if (data.valid) {
      addLog(`Manifest valid. Combat ready: ${data.combat_ready ? 'YES ✅' : 'NO ❌'}`, 'success');
      toast.success(`Manifest valid${data.combat_ready ? ' — combat ready' : ''}`);
    } else {
      addLog(`Manifest issues: ${data.errors.join(', ')}`, 'error');
      toast.error('Manifest integrity issues found');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importPack(file, assets, setAssets, saveManifest, addLog);
    e.target.value = '';
  };

  // ── Workshop State export ───────────────────────────────────────────────────
  // Downloads a JSON snapshot of the current UI configuration.
  // Does NOT touch the asset pack, manifests, or ZIP pipeline.

  const handleExportWorkshopState = () => {
    const state = onExportWorkshopState();
    downloadWorkshopState(state);
    toast.success('Workshop state exported');
  };

  // ── Workshop State import ───────────────────────────────────────────────────
  // Reads a JSON file, validates it fully, then atomically applies it.
  // If validation fails, state is not mutated.

  const handleImportWorkshopState = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    let raw: unknown;
    try {
      raw = await parseWorkshopStateFile(file);
    } catch {
      toast.error('Invalid file — could not parse JSON.');
      return;
    }

    // Validate the entire payload BEFORE mutating any state (Amendment 5 — atomic restore)
    const result = validateWorkshopState(raw);
    if ('errors' in result) {
      const summary = result.errors.map(err => `[${err.field}] ${err.message}`).join(' • ');
      toast.error(`Workshop state rejected: ${summary}`);
      addLog(`Workshop state import failed: ${summary}`, 'error');
      return;
    }

    // Validation passed — apply atomically
    onImportWorkshopState(result.state);
    toast.success('Workshop state restored successfully');
    addLog('Workshop state imported from file.', 'success');
  };

  return (
    <div className="export-panel">
      <h2>Export &amp; Import</h2>

      {/* ── Asset Pack Operations (existing — contract frozen) ── */}
      <div className="panel-section">
        <h3 className="panel-section-label">Asset Packs</h3>
        <div className="panel-actions">
          <button id="btn-export-full" onClick={handleExportFull} className="btn-primary">Export Full Pack</button>
          <button id="btn-export-combat" onClick={handleExportCombat} className="btn-accent">Export Combat Pack</button>
          <button id="btn-verify-manifest" onClick={handleVerify} className="btn-secondary">Verify Manifest</button>
          <button id="btn-import-pack" onClick={() => fileInputRef.current?.click()} className="btn-secondary">Import Pack</button>
          <input ref={fileInputRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {/* ── Workshop State (new — JSON only, separate from asset packs) ── */}
      <div className="panel-section">
        <h3 className="panel-section-label">Workshop State</h3>
        <p className="panel-section-desc">
          Save and restore your UI configuration (active tab, style lock, scene preset, review notes).
          This does not affect generated assets or manifests.
        </p>
        <div className="panel-actions">
          <button id="btn-export-workshop-state" onClick={handleExportWorkshopState} className="btn-secondary">
            Export Workshop State
          </button>
          <button id="btn-import-workshop-state" onClick={() => stateInputRef.current?.click()} className="btn-secondary">
            Import Workshop State
          </button>
          <input ref={stateInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportWorkshopState} />
        </div>
      </div>
    </div>
  );
}
