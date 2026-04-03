import React, { useState } from 'react';
import type { Asset } from '../../lib/assetManifest';

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

type PresetKey = keyof typeof SCENE_PRESETS;

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  assets: Asset[];
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export function SceneLabPanel({ assets, addLog }: Props) {
  const [preset, setPreset] = useState<PresetKey>('combat_knight_vs_sorceress');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const scene = SCENE_PRESETS[preset];

  const getAsset = (id: string) => assets.find(a => a.id === id);

  const arenaAsset = getAsset(scene.arena);
  const lightUnit = getAsset(scene.lightUnit);
  const darkUnit = getAsset(scene.darkUnit);

  const updateNote = (id: string, note: string) => setReviewNotes(prev => ({ ...prev, [id]: note }));

  const allApproved = [scene.arena, scene.lightUnit, scene.darkUnit, ...scene.vfxIds]
    .every(id => getAsset(id)?.status === 'approved');

  return (
    <div className="scenelab-panel">
      <h2>Scene Lab</h2>

      <div className="scenelab-preset-bar">
        {(Object.keys(SCENE_PRESETS) as PresetKey[]).map(key => (
          <button
            key={key}
            id={`preset-${key}`}
            className={`btn-preset ${preset === key ? 'active' : ''}`}
            onClick={() => setPreset(key)}
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

      {/* VFX checklist */}
      {scene.vfxIds.length > 0 && (
        <div className="scenelab-vfx-list">
          <h3>Required VFX</h3>
          {scene.vfxIds.map(id => {
            const a = getAsset(id);
            return (
              <div key={id} className="scenelab-vfx-row" id={`scenelab-vfx-${id}`}>
                <span className="dot" style={{ background: a?.status === 'approved' ? '#4ade80' : '#888' }} />
                <span className="vfx-id">{id}</span>
                <span className="vfx-status">{a?.status ?? 'missing'}</span>
                <input
                  type="text"
                  placeholder="Review note…"
                  value={reviewNotes[id] ?? ''}
                  onChange={e => updateNote(id, e.target.value)}
                  className="review-note-input"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="scenelab-note">
        <strong>Reminder:</strong> All VFX must be reviewed here and approved before running "Export Combat Pack".
        No asset auto-approves from generation.
      </div>
    </div>
  );
}
