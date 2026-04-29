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
import {
  buildQueueEntry,
  cancelQueueEntry,
  retryQueueEntry,
  clearTerminalEntries,
  getQueueStats,
  filterQueueByStatus,
  reorderEntry,
  exportQueueBriefAsJSON,
  markEntryGenerating,
  markEntryCompleted,
  markEntryFailed,
} from '../../lib/vfxQueue';
import type { VFXQueueEntry } from '../../lib/vfxQueue';

// Re-export for backward compatibility (SceneLabPanel imports from here)
export { COMBAT_SLICE_VFX_IDS };

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  assets: Asset[];
  onGenerateSelected: (ids: string[]) => Promise<{ id: string; ok: boolean; error?: string }[]>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export function VFXWorkflowPanel({ assets, onGenerateSelected, onApprove, onReject, addLog }: Props) {
  // ─── Catalog state ──────────────────────────────────────────────────────────
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterFamily, setFilterFamily] = useState<VFXFamily | null>(null);
  const [filterFaction, setFilterFaction] = useState<VFXFaction | null>(null);
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  // ─── Queue state ────────────────────────────────────────────────────────────
  const [vfxQueue, setVfxQueue] = useState<VFXQueueEntry[]>([]);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const visiblePresets = filterCatalog({ family: filterFamily, faction: filterFaction });
  const queueStats     = getQueueStats(vfxQueue);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(VFX_CATALOG.map(v => v.asset_slot)));
  const clearAll  = () => setSelected(new Set());

  // ─── Catalog handlers ───────────────────────────────────────────────────────

  /** Enqueues all currently selected presets. Does NOT call onGenerateSelected
   *  because the VFX catalog asset slots are not registered in INITIAL_ASSETS —
   *  real generation wiring is ARCHON-006D scope. */
  const handleEnqueueSelected = () => {
    if (selected.size === 0) { toast.warning('No VFX selected'); return; }

    const startPriority = vfxQueue.length;
    const presetsToEnqueue = VFX_CATALOG.filter(p => selected.has(p.asset_slot));
    const newEntries = presetsToEnqueue.map((p, i) => buildQueueEntry(p, startPriority + i));

    setVfxQueue(prev => [...prev, ...newEntries]);
    addLog(`Enqueued ${newEntries.length} VFX preset(s) for generation.`, 'info');
    toast.success(`${newEntries.length} VFX preset${newEntries.length === 1 ? '' : 's'} enqueued`);
    clearAll();
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

  // ─── Queue handlers ─────────────────────────────────────────────────────────

  const handleCancelEntry = (queueId: string) => {
    setVfxQueue(prev => cancelQueueEntry(prev, queueId));
    addLog('VFX queue entry cancelled.', 'info');
    toast.info('Entry cancelled');
  };

  const handleRetryEntry = (queueId: string) => {
    setVfxQueue(prev => retryQueueEntry(prev, queueId));
    addLog('VFX queue entry retried.', 'info');
    toast.success('Entry re-queued for generation');
  };

  const handleRemoveEntry = (queueId: string) => {
    setVfxQueue(prev => {
      const next = prev.filter(e => e.queueId !== queueId);
      // Re-normalise priority after removal
      return next.map((e, i) => ({ ...e, priority: i }));
    });
    addLog('VFX queue entry removed.', 'info');
  };

  const handleMoveUp = (index: number) => {
    setVfxQueue(prev => reorderEntry(prev, index, index - 1));
  };

  const handleMoveDown = (index: number) => {
    setVfxQueue(prev => reorderEntry(prev, index, index + 1));
  };

  const handleClearQueue = () => {
    const terminalCount = vfxQueue.filter(e =>
      e.status === 'completed' || e.status === 'failed' || e.status === 'cancelled'
    ).length;
    if (terminalCount === 0) { toast.info('No finished entries to clear'); return; }
    setVfxQueue(prev => clearTerminalEntries(prev));
    addLog(`Cleared ${terminalCount} finished VFX queue entries.`, 'info');
    toast.success(`Cleared ${terminalCount} finished entr${terminalCount === 1 ? 'y' : 'ies'}`);
  };

  const handleExportQueueBriefs = () => {
    if (vfxQueue.length === 0) { toast.warning('Queue is empty'); return; }
    const json = exportQueueBriefAsJSON(vfxQueue);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vfx-queue-briefs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Queue briefs exported');
    addLog(`VFX queue briefs exported — ${vfxQueue.length} entries`);
  };

  const handleGenerateQueued = async () => {
    const queuedEntries = vfxQueue.filter(e => e.status === 'queued');
    if (queuedEntries.length === 0) { toast.warning('No queued entries'); return; }

    setIsGenerating(true);
    addLog(`Starting VFX generation for ${queuedEntries.length} queued entries…`, 'info');
    toast.info(`Generating ${queuedEntries.length} VFX preset${queuedEntries.length === 1 ? '' : 's'}…`);

    for (const entry of queuedEntries) {
      // Re-check live status before launching — entry may have been cancelled during the loop
      setVfxQueue(prev => {
        const live = prev.find(e => e.queueId === entry.queueId);
        if (!live || live.status === 'cancelled') return prev;
        return markEntryGenerating(prev, entry.queueId);
      });

      // Read live status synchronously from current state snapshot
      const liveBefore = vfxQueue.find(e => e.queueId === entry.queueId);
      if (liveBefore?.status === 'cancelled') {
        addLog(`Skipping cancelled entry: ${entry.presetName}`, 'info');
        continue;
      }

      addLog(`Generating: ${entry.presetName} (${entry.assetSlot})`, 'info');

      try {
        // Delegate to the existing pipeline — captures results and updates assets/manifest
        const results = await onGenerateSelected([entry.assetSlot]);
        const result = results[0];

        if (result?.ok) {
          setVfxQueue(prev => markEntryCompleted(prev, entry.queueId));
          addLog(`✅ Completed: ${entry.presetName}`, 'success');
          toast.success(`VFX generated: ${entry.presetName}`);
        } else {
          const errMsg = result?.error ?? 'Unknown error';
          setVfxQueue(prev => markEntryFailed(prev, entry.queueId, errMsg));
          addLog(`❌ Failed: ${entry.presetName} — ${errMsg}`, 'error');
          toast.error(`VFX failed: ${entry.presetName}`);
        }
      } catch (err: any) {
        const errMsg = err?.message ?? 'Unexpected error';
        setVfxQueue(prev => markEntryFailed(prev, entry.queueId, errMsg));
        addLog(`❌ Error: ${entry.presetName} — ${errMsg}`, 'error');
        toast.error(`VFX error: ${entry.presetName}`);
      }
    }

    setIsGenerating(false);
    addLog('VFX generation queue complete.', 'info');
  };

  const queueStatusColor = (status: VFXQueueEntry['status']) => {
    if (status === 'queued')     return '#888';
    if (status === 'generating') return '#facc15';
    if (status === 'completed')  return '#4ade80';
    if (status === 'failed')     return '#f87171';
    if (status === 'cancelled')  return '#a78bfa';
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
          id="btn-vfx-enqueue"
          onClick={handleEnqueueSelected}
          disabled={isGenerating || selected.size === 0}
          className="btn-primary btn-sm"
        >
          {`Enqueue Selected (${selected.size})`}
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

      {/* ── VFX Generation Queue ─────────────────────────────────────────────── */}
      <div className="vfx-queue-section" id="vfx-queue-section">
        <div className="vfx-queue-header">
          <h3 className="vfx-queue-title">
            VFX Generation Queue
            <span className="vfx-queue-count">{vfxQueue.length}</span>
          </h3>
          <div className="vfx-queue-stats">
                      {queueStats.queued > 0     && <span className="vfx-queue-stat stat-queued">⏳ {queueStats.queued} queued</span>}
            {queueStats.generating > 0 && <span className="vfx-queue-stat stat-generating">⚡ {queueStats.generating} generating</span>}
            {queueStats.completed > 0  && <span className="vfx-queue-stat stat-done">✅ {queueStats.completed} completed</span>}
            {queueStats.failed > 0     && <span className="vfx-queue-stat stat-failed">❌ {queueStats.failed} failed</span>}
            {queueStats.cancelled > 0  && <span className="vfx-queue-stat stat-cancelled">🚫 {queueStats.cancelled} cancelled</span>}
          </div>
          <div className="vfx-queue-controls">
            <button
              id="btn-vfx-queue-generate"
              className="btn-primary btn-sm"
              onClick={handleGenerateQueued}
              disabled={vfxQueue.filter(e => e.status === 'queued').length === 0}
              title="Generate all queued VFX entries"
            >
              Generate Queued
            </button>
            <button
              id="btn-vfx-queue-export"
              className="btn-sm vfx-export-btn"
              onClick={handleExportQueueBriefs}
              disabled={vfxQueue.length === 0}
              title="Export queue entries as a JSON brief package"
            >
              Export Queue Briefs
            </button>
            <button
              id="btn-vfx-queue-clear"
              className="btn-sm btn-danger-sm"
              onClick={handleClearQueue}
              disabled={vfxQueue.filter(e => e.status === 'completed' || e.status === 'failed' || e.status === 'cancelled').length === 0}
              title="Remove all completed, failed, and cancelled entries from the queue"
            >
              Clear Finished
            </button>
          </div>
        </div>

        {vfxQueue.length === 0 ? (
          <div className="vfx-queue-empty">
            <p>No presets queued. Select presets above and click <strong>Enqueue Selected</strong>.</p>
          </div>
        ) : (
          <div className="vfx-queue-list" id="vfx-queue-list">
            {vfxQueue.map((entry, index) => (
              <div
                key={entry.queueId}
                className={`vfx-queue-row vfx-queue-row--${entry.status}`}
                id={`vfx-queue-row-${entry.queueId}`}
              >
                {/* Priority badge */}
                <span className="vfx-queue-priority" title="Queue priority">{index + 1}</span>

                {/* Status dot */}
                <span
                  className="vfx-queue-status-dot"
                  style={{ background: queueStatusColor(entry.status) }}
                  title={entry.status}
                />

                {/* Entry info */}
                <div className="vfx-queue-info">
                  <span className="vfx-queue-name">{entry.presetName}</span>
                  <span className="vfx-queue-meta">
                    {entry.family} · {entry.faction} · intensity {entry.intensity}/5
                  </span>
                  <span className="vfx-queue-slot mono">{entry.assetSlot}</span>
                </div>

                                {/* Status badge */}
                <span className={`vfx-queue-badge vfx-queue-badge--${entry.status}`}>
                  {entry.status}{entry.retryCount > 0 ? ` (retry ${entry.retryCount})` : ''}
                </span>

                {/* Lifecycle action buttons */}
                <div className="vfx-queue-row-actions">
                  {entry.status === 'queued' && (
                    <button
                      id={`btn-queue-cancel-${entry.queueId}`}
                      className="btn-sm btn-action-cancel"
                      onClick={() => handleCancelEntry(entry.queueId)}
                      title="Cancel this entry"
                      aria-label={`Cancel ${entry.presetName}`}
                    >Cancel</button>
                  )}
                  {(entry.status === 'cancelled' || entry.status === 'failed') && (
                    <button
                      id={`btn-queue-retry-${entry.queueId}`}
                      className="btn-sm btn-action-retry"
                      onClick={() => handleRetryEntry(entry.queueId)}
                      title="Retry — move back to queued"
                      aria-label={`Retry ${entry.presetName}`}
                    >Retry</button>
                  )}
                </div>

                {/* Reorder + remove controls */}
                <div className="vfx-queue-row-controls">
                  <button
                    id={`btn-queue-up-${entry.queueId}`}
                    className="btn-icon"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                    aria-label={`Move ${entry.presetName} up`}
                  >▲</button>
                  <button
                    id={`btn-queue-down-${entry.queueId}`}
                    className="btn-icon"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === vfxQueue.length - 1}
                    title="Move down"
                    aria-label={`Move ${entry.presetName} down`}
                  >▼</button>
                  <button
                    id={`btn-queue-remove-${entry.queueId}`}
                    className="btn-icon btn-icon--danger"
                    onClick={() => handleRemoveEntry(entry.queueId)}
                    disabled={entry.status === 'generating'}
                    title="Remove from queue"
                    aria-label={`Remove ${entry.presetName} from queue`}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
