import React from 'react';
import type { Asset } from '../../lib/assetManifest';
import type { ScenePresetKey } from '../../lib/workshopPersistence';

// ─── Scene Preset ─────────────────────────────────────────────────────────────

const SCENE_PRESETS = {
  combat_knight_vs_sorceress: {
    label: 'Knight vs Sorceress',
    arena: 'arena-light',
    lightUnit: 'unit-light-knight-token',
    darkUnit: 'unit-dark-sorceress-token',
    vfxIds: [
      'combat-hit-flash-light-medium',
      'combat-hit-flash-dark-medium',
      'combat-death-light',
      'combat-death-dark',
    ],
  },
  board_overview: {
    label: 'Board Overview',
    arena: 'board-master',
    lightUnit: 'unit-light-valkyrie-token',
    darkUnit: 'unit-dark-manticore-token',
    vfxIds: [],
  },
} as const;

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  assets: Asset[];
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  // Lifted state — owned by App.tsx for persistence
  preset: ScenePresetKey;
  onPresetChange: (p: ScenePresetKey) => void;
  reviewNotes: Record<string, string>;
  onReviewNotesChange: (notes: Record<string, string>) => void;
  onApprove: (id: string, note?: string) => void;
  onReject: (id: string, note?: string) => void;
}

export function SceneLabPanel({
  assets,
  addLog: _addLog,
  preset,
  onPresetChange,
  reviewNotes,
  onReviewNotesChange,
  onApprove,
  onReject,
}: Props) {
  const scene = SCENE_PRESETS[preset];

  const getAsset = (id: string) => assets.find(a => a.id === id);

  const arenaAsset = getAsset(scene.arena);
  const lightUnit = getAsset(scene.lightUnit);
  const darkUnit = getAsset(scene.darkUnit);

  const updateNote = (id: string, note: string) =>
    onReviewNotesChange({ ...reviewNotes, [id]: note });

  const allApproved = [scene.arena, scene.lightUnit, scene.darkUnit, ...scene.vfxIds]
    .every(id => getAsset(id)?.status === 'approved');

  return (
    <div className="scenelab-panel">
      <h2>Scene Lab</h2>

      <div className="scenelab-preset-bar">
        {(Object.keys(SCENE_PRESETS) as ScenePresetKey[]).map(key => (
          <button
            key={key}
            id={`preset-${key}`}
            className={`btn-preset ${preset === key ? 'active' : ''}`}
            onClick={() => onPresetChange(key)}
          >
            {SCENE_PRESETS[key].label}
          </button>
        ))}
      </div>

      {/* Preview canvas */}
      <div
        className="scenelab-canvas"
        id="scenelab-preview"
        style={{
          backgroundImage: arenaAsset?.path ? `url(${arenaAsset.path})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Light unit */}
        <div className="scenelab-unit scenelab-unit-left" id="scenelab-unit-light">
          {lightUnit?.thumbnail_256 ? (
            <img src={lightUnit.thumbnail_256} alt={lightUnit.name} />
          ) : (
            <div className="scenelab-placeholder">Light Unit<br />{scene.lightUnit}</div>
          )}
          <span className="scenelab-status-badge" style={{ color: lightUnit?.status === 'approved' ? '#4ade80' : '#facc15' }}>
            {lightUnit?.status ?? 'missing'}
          </span>
        </div>

        {/* Center VS */}
        <div className="scenelab-vs">VS</div>

        {/* Dark unit */}
        <div className="scenelab-unit scenelab-unit-right" id="scenelab-unit-dark">
          {darkUnit?.thumbnail_256 ? (
            <img src={darkUnit.thumbnail_256} alt={darkUnit.name} />
          ) : (
            <div className="scenelab-placeholder">Dark Unit<br />{scene.darkUnit}</div>
          )}
          <span className="scenelab-status-badge" style={{ color: darkUnit?.status === 'approved' ? '#4ade80' : '#facc15' }}>
            {darkUnit?.status ?? 'missing'}
          </span>
        </div>
      </div>

      {/* Combat readiness indicator */}
      <div className={`combat-ready-banner ${allApproved ? 'ready' : 'not-ready'}`} id="combat-ready-indicator">
        {allApproved ? '✅ Combat Slice Assets: All Approved' : '⚠️ Combat Slice Assets: Pending Approval'}
      </div>

      {/* Asset Review Checklist */}
      <div className="scenelab-vfx-list">
        <h3>Asset Review</h3>
        {[scene.arena, scene.lightUnit, scene.darkUnit, ...scene.vfxIds].filter(Boolean).map(id => {
          const a = getAsset(id);
          return (
            <div key={id} className="scenelab-vfx-row" id={`scenelab-vfx-${id}`}>
              <span className="dot" style={{ background: a?.status === 'approved' ? '#4ade80' : '#888' }} />
              <span className="vfx-id" title={id}>{id.length > 25 ? id.substring(0,22)+'...' : id}</span>
              <span className="vfx-status" style={{ minWidth: '100px' }}>
                {a?.status ?? 'missing'}
                {a?.asset_protected && ' 🔒'}
              </span>
              <input
                type="text"
                placeholder="Review note…"
                value={reviewNotes[id] ?? a?.notes ?? ''}
                onChange={e => updateNote(id, e.target.value)}
                className="review-note-input"
              />
              <button
                className="btn-approve btn-sm"
                onClick={() => onApprove(id, reviewNotes[id] ?? a?.notes)}
                disabled={a?.status === 'approved' || !a}
                style={{ marginLeft: '4px' }}
              >Approve</button>
              <button
                className="btn-reject btn-sm"
                onClick={() => onReject(id, reviewNotes[id] ?? a?.notes)}
                disabled={a?.status === 'rejected' || !a}
                style={{ marginLeft: '4px' }}
              >Reject</button>
            </div>
          );
        })}
      </div>

      <div className="scenelab-note">
        <strong>Reminder:</strong> All VFX must be reviewed here and approved before running "Export Combat Pack".
        No asset auto-approves from generation.
      </div>
    </div>
  );
}
