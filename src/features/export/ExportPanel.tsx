import React, { useRef, useMemo } from 'react';
import type { Asset } from '../../lib/assetManifest';
import { assertPackVersion, validatePackAssets } from '../../lib/versionGuard';
import type { CombatPackManifest } from '../../lib/assetManifest';
import { COMBAT_PACK_SCHEMA_VERSION, COMBAT_SLICE_REQUIRED_IDS } from '../../lib/assetManifest';
import JSZip from 'jszip';
import { toast } from 'sonner';
import type { WorkshopUIState } from '../../lib/workshopPersistence';
import { validateWorkshopState, downloadWorkshopState, parseWorkshopStateFile } from '../../lib/workshopPersistence';
import {
  getExportReadinessReport,
  getExportEligibilityRows,
  type ExportEligibilityRow,
} from '../../lib/exportEligibility';

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

// ─── Export Eligibility Preview ───────────────────────────────────────────────
// ARCHON-008B: Read-only derived view from exportEligibility helpers.
// Does NOT trigger any export, generation, or mutation.
// NOTE: eligibility here uses isExportEligible (approved+path). The actual
// combat pack server export also applies tag filtering — this preview is a
// readiness estimate, not a server simulation.

const REASON_LABELS: Record<ExportEligibilityRow['exclusionReason'], string> = {
  eligible:         '—',
  rejected:         'Rejected by operator',
  pending:          'Pending review',
  generating:       'Generation in progress',
  failed:           'Generation failed',
  approved_no_path: 'Approved — no file generated yet',
};

const STATUS_COLORS: Record<string, string> = {
  approved:           '#4ade80',
  rejected:           '#f87171',
  pending:            '#94a3b8',
  generating:         '#facc15',
  failed:             '#f87171',
  recoverable_failed: '#fb923c',
};

function ExportEligibilityPreview({ assets }: { assets: Asset[] }) {
  const rows = useMemo(() => getExportEligibilityRows(assets), [assets]);
  const report = useMemo(() => getExportReadinessReport(assets, COMBAT_SLICE_REQUIRED_IDS), [assets]);

  const ineligible = report.total - report.eligible;
  const other = ineligible - report.rejected - report.pending;

  return (
    <div className="panel-section" id="export-eligibility-preview">
      <h3 className="panel-section-label">Export Eligibility Preview</h3>
      <p className="panel-section-desc">
        Shows which assets will ship in a combat pack export and why others are excluded.
        Eligibility is based on approval status and file presence.
        <em> Note: actual server export also applies tag filtering — this is a readiness estimate.</em>
      </p>

      {/* ── Summary banner ── */}
      <div style={{
        display: 'flex', gap: '1rem', flexWrap: 'wrap',
        marginBottom: '1rem', padding: '0.75rem 1rem',
        background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
        border: `1px solid ${report.combatReady ? '#4ade8033' : '#f8717133'}`,
      }}>
        <span id="eligibility-badge" style={{
          fontWeight: 700, fontSize: '1rem',
          color: report.combatReady ? '#4ade80' : '#fb923c',
        }}>
          {report.combatReady ? '✅ Combat Ready' : '⚠️ Not Ready'}
        </span>
        <span className="eligibility-stat">Total: <strong>{report.total}</strong></span>
        <span className="eligibility-stat" style={{ color: '#4ade80' }}>Eligible: <strong>{report.eligible}</strong></span>
        <span className="eligibility-stat" style={{ color: '#f87171' }}>Excluded: <strong>{ineligible}</strong></span>
        <span className="eligibility-stat">Rejected: <strong>{report.rejected}</strong></span>
        <span className="eligibility-stat">Pending: <strong>{report.pending}</strong></span>
        {other > 0 && <span className="eligibility-stat">Other: <strong>{other}</strong></span>}
      </div>

      {/* ── Missing required IDs ── */}
      {report.missingRequired.length > 0 && (
        <div style={{
          marginBottom: '1rem', padding: '0.5rem 0.75rem',
          background: 'rgba(251,146,60,0.08)', border: '1px solid #fb923c55',
          borderRadius: '6px', fontSize: '0.8rem', color: '#fb923c',
        }}>
          <strong>⚠️ Missing required IDs ({report.missingRequired.length}):</strong>{' '}
          {report.missingRequired.join(', ')}
        </div>
      )}

      {/* ── Per-asset table ── */}
      {rows.length === 0 ? (
        <div style={{ color: '#888', fontSize: '0.85rem' }}>No assets in manifest yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table id="eligibility-table" style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: '0.78rem', tableLayout: 'fixed',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ width: '26%', padding: '6px 4px' }}>Asset ID</th>
                <th style={{ width: '16%', padding: '6px 4px' }}>Category</th>
                <th style={{ width: '10%', padding: '6px 4px' }}>Status</th>
                <th style={{ width: '6%',  padding: '6px 4px', textAlign: 'center' }}>🔒</th>
                <th style={{ width: '6%',  padding: '6px 4px', textAlign: 'center' }}>File</th>
                <th style={{ width: '12%', padding: '6px 4px', textAlign: 'center' }}>Eligible</th>
                <th style={{ width: '24%', padding: '6px 4px' }}>Exclusion Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  id={`eligibility-row-${row.id}`}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '5px 4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{row.id}</td>
                  <td style={{ padding: '5px 4px', color: '#94a3b8' }}>
                    {row.category}{row.faction ? ` · ${row.faction}` : ''}
                  </td>
                  <td style={{ padding: '5px 4px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem',
                      background: `${STATUS_COLORS[row.status] ?? '#888'}22`,
                      color: STATUS_COLORS[row.status] ?? '#888',
                      fontWeight: 600,
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>{row.isProtected ? '🔒' : ''}</td>
                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>{row.hasPath ? '✅' : '❌'}</td>
                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                    <span style={{ color: row.eligible ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                      {row.eligible ? '✅ Ships' : '❌ Excluded'}
                    </span>
                  </td>
                  <td style={{ padding: '5px 4px', color: row.eligible ? '#94a3b8' : '#fb923c', fontStyle: row.eligible ? 'normal' : 'italic' }}>
                    {REASON_LABELS[row.exclusionReason]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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

      {/* ── Export Eligibility Preview (ARCHON-008B — read-only, derived) ── */}
      <ExportEligibilityPreview assets={assets} />

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
