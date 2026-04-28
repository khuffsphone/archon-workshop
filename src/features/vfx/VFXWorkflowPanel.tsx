import React, { useState } from 'react';
import type { Asset } from '../../lib/assetManifest';
import { toast } from 'sonner';
import {
  VFX_CATALOG,
  VFX_FAMILIES,
  VFX_FACTIONS,
  COMBAT_SLICE_VFX_IDS,
  buildGenerationBrief,
  exportCatalogAsJSON,
  filterCatalog,
} from '../../lib/vfxCatalog';
import type { VFXPreset, VFXFamily, VFXFaction } from '../../lib/vfxCatalog';

// Re-export for backward compatibility (SceneLabPanel imports from here)
export { COMBAT_SLICE_VFX_IDS };

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  assets: Asset[];
  onGenerateSelected: (ids: string[]) => Promise<void>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export function VFXWorkflowPanel({ assets, onGenerateSelected, onApprove, onReject, addLog }: Props) {
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterFamily, setFilterFamily] = useState<VFXFamily | null>(null);
  const [filterFaction, setFilterFaction] = useState<VFXFaction | null>(null);
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const visiblePresets = filterCatalog({ family: filterFamily, faction: filterFaction });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(VFX_CATALOG.map(v => v.asset_slot)));
  const clearAll  = () => setSelected(new Set());

  const handleGenerate = async () => {
    if (selected.size === 0) { toast.warning('No VFX selected'); return; }
    setIsGenerating(true);
    addLog(`Generating ${selected.size} VFX sprites...`);
    try {
      await onGenerateSelected([...selected]);
      toast.success(`${selected.size} VFX queued for generation`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCatalog = () => {
    const json = exportCatalogAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vfx-catalog-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('VFX catalog exported');
    addLog('VFX catalog exported as JSON');
  };

  const handleCopyBrief = (preset: VFXPreset) => {
    const brief = buildGenerationBrief(preset);
    navigator.clipboard.writeText(brief).then(() => {
      toast.success(`Brief copied: ${preset.name}`);
    }).catch(() => {
      toast.error('Clipboard access denied');
    });
  };

  const toggleDrawer = (id: string) => {
    setOpenDrawerId(prev => prev === id ? null : id);
  };

  const getAsset = (assetSlot: string) => assets.find(a => a.id === assetSlot);

  const statusColor = (status: Asset['status'] | undefined) => {
    if (!status || status === 'pending') return '#888';
    if (status === 'approved')   return '#4ade80';
    if (status === 'generating') return '#facc15';
    if (status === 'failed')     return '#f87171';
    return '#888';
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="vfx-panel">
      <h2>VFX Workflow — Combat Slice</h2>
      <p className="vfx-subtitle">
        {VFX_CATALOG.length} VFX presets · {visiblePresets.length} shown ·{' '}
        Knight vs Sorceress combat slice. Generate → Review in Scene Lab → Approve before export.
      </p>

      {/* ── Primary toolbar ── */}
      <div className="vfx-toolbar">
        <button id="btn-vfx-select-all" onClick={selectAll} className="btn-sm">Select All</button>
        <button id="btn-vfx-clear" onClick={clearAll} className="btn-sm">Clear</button>
        <button
          id="btn-vfx-generate"
          onClick={handleGenerate}
          disabled={isGenerating || selected.size === 0}
          className="btn-primary btn-sm"
        >
          {isGenerating ? 'Generating…' : `Generate Selected (${selected.size})`}
        </button>
        <button
          id="btn-vfx-export-catalog"
          onClick={handleExportCatalog}
          className="btn-sm vfx-export-btn"
          title="Download full VFX catalog as JSON"
        >
          Export Catalog JSON
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="vfx-filter-bar">
        <span className="vfx-filter-label">Family:</span>
        <button
          className={`vfx-chip${filterFamily === null ? ' active' : ''}`}
          onClick={() => setFilterFamily(null)}
        >All</button>
        {VFX_FAMILIES.map(f => (
          <button
            key={f}
            className={`vfx-chip${filterFamily === f ? ' active' : ''}`}
            onClick={() => setFilterFamily(prev => prev === f ? null : f)}
          >
            {f}
          </button>
        ))}

        <span className="vfx-filter-sep" />

        <span className="vfx-filter-label">Faction:</span>
        <button
          className={`vfx-chip${filterFaction === null ? ' active' : ''}`}
          onClick={() => setFilterFaction(null)}
        >All</button>
        {VFX_FACTIONS.map(f => (
          <button
            key={f}
            className={`vfx-chip vfx-chip--${f}${filterFaction === f ? ' active' : ''}`}
            onClick={() => setFilterFaction(prev => prev === f ? null : f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Card grid ── */}
      {visiblePresets.length === 0 ? (
        <p className="vfx-empty">No presets match the current filter.</p>
      ) : (
        <div className="vfx-grid">
          {visiblePresets.map(preset => {
            const asset   = getAsset(preset.asset_slot);
            const status  = asset?.status;
            const isOpen  = openDrawerId === preset.id;

            return (
              <div key={preset.id} className="vfx-card-wrapper">
                {/* Card header row */}
                <div
                  className={`vfx-card ${selected.has(preset.asset_slot) ? 'selected' : ''}`}
                  onClick={() => toggle(preset.asset_slot)}
                  id={`vfx-card-${preset.asset_slot}`}
                >
                  <div className="vfx-status-dot" style={{ background: statusColor(status) }} />

                  {/* Intensity pip strip */}
                  <div className="vfx-intensity-pips">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`vfx-pip${n <= preset.intensity ? ' lit' : ''}`} />
                    ))}
                  </div>

                  <div className="vfx-info">
                    <span className="vfx-name">{preset.name}</span>
                    <span className="vfx-sub">{preset.family} · {preset.faction}</span>
                    <span className="vfx-desc">{preset.description}</span>
                  </div>

                  {asset?.thumbnail_256 && (
                    <img src={asset.thumbnail_256} alt={preset.name} className="vfx-thumb" />
                  )}

                  {status === 'generating' && <span className="vfx-badge generating">Generating…</span>}
                  {status === 'approved'   && <span className="vfx-badge approved">✓ Approved</span>}
                  {preset.approved_for_generation && (
                    <span className="vfx-badge approved-flag" title="Approved for generation">✓ Gen</span>
                  )}

                  {status === 'pending' && asset?.path && (
                    <div className="vfx-approve-row" onClick={e => e.stopPropagation()}>
                      <button
                        id={`btn-approve-${preset.asset_slot}`}
                        className="btn-approve"
                        onClick={() => { onApprove(preset.asset_slot); toast.success(`${preset.name} approved`); }}
                      >Approve</button>
                      <button
                        id={`btn-reject-${preset.asset_slot}`}
                        className="btn-reject"
                        onClick={() => { onReject(preset.asset_slot); toast.info(`${preset.name} rejected`); }}
                      >Reject</button>
                    </div>
                  )}

                  {/* Drawer toggle */}
                  <button
                    className="vfx-drawer-toggle"
                    id={`btn-drawer-${preset.asset_slot}`}
                    onClick={e => { e.stopPropagation(); toggleDrawer(preset.id); }}
                    title={isOpen ? 'Close brief' : 'View brief'}
                  >
                    {isOpen ? '▲ Brief' : '▼ Brief'}
                  </button>
                </div>

                {/* Inline detail drawer */}
                {isOpen && (
                  <div className="vfx-drawer" id={`drawer-${preset.asset_slot}`}>
                    <div className="vfx-drawer-meta">
                      <div className="vfx-drawer-field">
                        <span className="vfx-drawer-label">Asset Slot</span>
                        <span className="vfx-drawer-value mono">{preset.asset_slot}</span>
                      </div>
                      <div className="vfx-drawer-field">
                        <span className="vfx-drawer-label">Use Case</span>
                        <span className="vfx-drawer-value">{preset.use_case}</span>
                      </div>
                      <div className="vfx-drawer-field">
                        <span className="vfx-drawer-label">Timing</span>
                        <span className="vfx-drawer-value">
                          {preset.timing_ms === 0 ? 'Looping' : `${preset.timing_ms}ms`}
                        </span>
                      </div>
                      <div className="vfx-drawer-field">
                        <span className="vfx-drawer-label">Layering</span>
                        <span className="vfx-drawer-value">{preset.layering}</span>
                      </div>
                      <div className="vfx-drawer-field">
                        <span className="vfx-drawer-label">Intensity</span>
                        <span className="vfx-drawer-value">{preset.intensity}/5</span>
                      </div>
                      <div className="vfx-drawer-field vfx-drawer-tags">
                        <span className="vfx-drawer-label">Tags</span>
                        <span className="vfx-drawer-value">
                          {preset.visual_tags.map(t => (
                            <span key={t} className="vfx-tag">{t}</span>
                          ))}
                        </span>
                      </div>
                    </div>

                    <div className="vfx-drawer-brief-section">
                      <span className="vfx-drawer-label">Prompt Brief</span>
                      <div className="vfx-brief-block">{preset.prompt_brief}</div>
                      {preset.negative_prompt && (
                        <>
                          <span className="vfx-drawer-label" style={{ marginTop: '0.5rem' }}>Negative Prompt</span>
                          <div className="vfx-brief-block vfx-brief-block--negative">{preset.negative_prompt}</div>
                        </>
                      )}
                    </div>

                    <div className="vfx-drawer-actions">
                      <button
                        id={`btn-copy-brief-${preset.asset_slot}`}
                        className="btn-sm"
                        onClick={() => handleCopyBrief(preset)}
                      >
                        Copy Brief
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
