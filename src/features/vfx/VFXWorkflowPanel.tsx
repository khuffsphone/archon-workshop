import React, { useState } from 'react';
import type { Asset } from '../../lib/assetManifest';
import { toast } from 'sonner';

// ─── Selected 10 VFX for Knight vs Sorceress Slice ────────────────────────────
// These are the only VFX that must be approved before the combat slice ships.
// All others in the combat_pack blueprint are deferred to future iterations.

export const COMBAT_SLICE_VFX_IDS = [
  'combat-hit-flash-light',
  'combat-hit-flash-dark',
  'combat-death-burst-light',
  'combat-death-burst-dark',
  'combat-spawn-light',
  'combat-spawn-dark',
  'combat-heal-pulse',
  'combat-status-poison',
  'combat-status-stun',
  'combat-ambient-arena',
] as const;

// ─── VFX Blueprint (full 154-entry list kept for future iterations) ───────────
// Imported from the BLUEPRINTS.combat_pack defined in the original App.tsx.
// For now we only surface COMBAT_SLICE_VFX_IDS in the UI.

interface VFXEntry {
  id: string;
  name: string;
  subcategory: string;
  faction: string;
  description: string;
}

// Slice subset (what we actually render and track in Part 1)
const SLICE_VFX: VFXEntry[] = [
  { id: 'combat-hit-flash-light',   name: 'Hit Flash — Light',       subcategory: 'hit_flash', faction: 'light',   description: 'Sacred golden impact burst' },
  { id: 'combat-hit-flash-dark',    name: 'Hit Flash — Dark',        subcategory: 'hit_flash', faction: 'dark',    description: 'Abyssal impact burst' },
  { id: 'combat-death-burst-light', name: 'Death Burst — Light',     subcategory: 'death',     faction: 'light',   description: 'Holy radiant death explosion' },
  { id: 'combat-death-burst-dark',  name: 'Death Burst — Dark',      subcategory: 'death',     faction: 'dark',    description: 'Void implosion death effect' },
  { id: 'combat-spawn-light',       name: 'Spawn Effect — Light',    subcategory: 'spawn',     faction: 'light',   description: 'Holy arrival aura beam' },
  { id: 'combat-spawn-dark',        name: 'Spawn Effect — Dark',     subcategory: 'spawn',     faction: 'dark',    description: 'Shadow portal emergence' },
  { id: 'combat-heal-pulse',        name: 'Heal Pulse',              subcategory: 'heal',      faction: 'neutral', description: 'Green-white healing ripple' },
  { id: 'combat-status-poison',     name: 'Status — Poison',         subcategory: 'status',    faction: 'dark',    description: 'Toxic poison status cloud' },
  { id: 'combat-status-stun',       name: 'Status — Stun',           subcategory: 'status',    faction: 'neutral', description: 'Yellow lightning stun spiral' },
  { id: 'combat-ambient-arena',     name: 'Ambient Arena Effect',    subcategory: 'ambient',   faction: 'neutral', description: 'Subtle floating dust layer' },
];

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  assets: Asset[];
  onGenerateSelected: (ids: string[]) => Promise<void>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export function VFXWorkflowPanel({ assets, onGenerateSelected, onApprove, onReject, addLog }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(SLICE_VFX.map(v => v.id)));
  const clearAll = () => setSelected(new Set());

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

  const getAsset = (id: string) => assets.find(a => a.id === id);

  const statusColor = (status: Asset['status'] | undefined) => {
    if (!status || status === 'pending') return '#888';
    if (status === 'approved') return '#4ade80';
    if (status === 'generating') return '#facc15';
    if (status === 'failed') return '#f87171';
    return '#888';
  };

  return (
    <div className="vfx-panel">
      <h2>VFX Workflow — Combat Slice</h2>
      <p className="vfx-subtitle">
        10 VFX sprites required for Knight vs Sorceress.
        Generate → Review in Scene Lab → Approve before export.
      </p>

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
      </div>

      <div className="vfx-grid">
        {SLICE_VFX.map(vfx => {
          const asset = getAsset(vfx.id);
          const status = asset?.status;
          return (
            <div
              key={vfx.id}
              className={`vfx-card ${selected.has(vfx.id) ? 'selected' : ''}`}
              onClick={() => toggle(vfx.id)}
              id={`vfx-card-${vfx.id}`}
            >
              <div className="vfx-status-dot" style={{ background: statusColor(status) }} />
              <div className="vfx-info">
                <span className="vfx-name">{vfx.name}</span>
                <span className="vfx-sub">{vfx.subcategory} · {vfx.faction}</span>
              </div>
              {asset?.thumbnail_256 && (
                <img src={asset.thumbnail_256} alt={vfx.name} className="vfx-thumb" />
              )}
              {status === 'generating' && <span className="vfx-badge generating">Generating…</span>}
              {status === 'approved' && <span className="vfx-badge approved">✓ Approved</span>}
              {(status === 'pending' || !status) && (
                <div className="vfx-actions" onClick={e => e.stopPropagation()}>
                  {/* Intentionally no auto-approve — user must review in Scene Lab first */}
                </div>
              )}
              {status === 'pending' && asset?.path && (
                <div className="vfx-approve-row" onClick={e => e.stopPropagation()}>
                  <button
                    id={`btn-approve-${vfx.id}`}
                    className="btn-approve"
                    onClick={() => { onApprove(vfx.id); toast.success(`${vfx.name} approved`); }}
                  >
                    Approve
                  </button>
                  <button
                    id={`btn-reject-${vfx.id}`}
                    className="btn-reject"
                    onClick={() => { onReject(vfx.id); toast.info(`${vfx.name} rejected`); }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
