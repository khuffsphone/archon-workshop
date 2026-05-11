import React, { useState, useMemo } from 'react';
import type { Asset } from '../../lib/assetManifest';
import type { ValidTab } from '../../lib/workshopPersistence';
import {
  getReviewStats,
  filterAssetsByReviewStatus,
  identifyActionableAssets,
} from '../../lib/reviewQueue';
import type { ReviewFilterState } from '../../lib/reviewQueue';

interface Props {
  assets: Asset[];
  progress: number;
  logs: string[];
  reviewNotes: Record<string, string>;
  onReviewNotesChange: (notes: Record<string, string>) => void;
  onApprove: (id: string, note?: string) => void;
  onReject: (id: string, note?: string) => void;
  /** Updates only the note field on an approved/protected asset — does NOT change status. */
  onUpdateNote: (id: string, note: string) => void;
  onNavigate: (tab: ValidTab) => void;
}

export function DashboardPanel({
  assets,
  progress,
  logs,
  reviewNotes,
  onReviewNotesChange,
  onApprove,
  onReject,
  onUpdateNote,
  onNavigate,
}: Props) {
  const [filter, setFilter] = useState<ReviewFilterState>('pending');
  // Track which approved cards have the remediation panel expanded
  const [remediationOpen, setRemediationOpen] = useState<Record<string, boolean>>({});
  // Track confirm-reject state per asset
  const [rejectConfirm, setRejectConfirm] = useState<Record<string, boolean>>({});

  const stats = useMemo(() => getReviewStats(assets), [assets]);

  // To avoid duplicates or confusion, the queue will show "actionable" assets by default
  // when 'pending' is selected (meaning they actually have a file to review).
  const visibleAssets = useMemo(() => {
    if (filter === 'pending') {
      // Just show the actionable pending items (generated)
      return identifyActionableAssets(assets);
    }
    return filterAssetsByReviewStatus(assets, filter);
  }, [assets, filter]);

  const updateNote = (id: string, note: string) => {
    onReviewNotesChange({ ...reviewNotes, [id]: note });
  };

  const toggleRemediation = (id: string) => {
    setRemediationOpen(prev => ({ ...prev, [id]: !prev[id] }));
    // Reset confirm state when closing
    setRejectConfirm(prev => ({ ...prev, [id]: false }));
  };

  const handleSaveNote = (asset: Asset) => {
    const note = reviewNotes[asset.id] ?? asset.notes ?? '';
    onUpdateNote(asset.id, note);
    setRemediationOpen(prev => ({ ...prev, [asset.id]: false }));
  };

  const handleRemediationReject = (asset: Asset) => {
    if (!rejectConfirm[asset.id]) {
      // First click: ask for confirmation
      setRejectConfirm(prev => ({ ...prev, [asset.id]: true }));
      return;
    }
    // Second click: confirmed — proceed with rejection
    const note = reviewNotes[asset.id] ?? asset.notes ?? '';
    onReject(asset.id, note || undefined);
    setRejectConfirm(prev => ({ ...prev, [asset.id]: false }));
    setRemediationOpen(prev => ({ ...prev, [asset.id]: false }));
  };

  return (
    <div className="dashboard">
      <div className="dashboard-cards">
        <div className="stat-card">
          <div className="stat-num approved">{stats.approved}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-num pending">{stats.pending}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-num failed">{stats.rejected}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">Total Assets</div>
        </div>
      </div>

      <div className="progress-row">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-label">{progress}% complete</span>
      </div>

      {/* ── Approval Dashboard / Review Queue ── */}
      <div className="dashboard-review-section">
        <div className="dashboard-review-header">
          <h3>Approval Dashboard</h3>
          <div className="vfx-filter-bar" style={{ marginBottom: 0 }}>
            <span className="vfx-filter-label">Filter:</span>
            {(['pending', 'approved', 'rejected', 'protected', 'all'] as ReviewFilterState[]).map(f => (
              <button
                key={f}
                id={`filter-${f}`}
                className={`vfx-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button
              className="btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => onNavigate('scenelab')}
              title="Go to Scene Lab for detailed combat context review"
            >
              Detailed Review (Scene Lab) →
            </button>
          </div>
        </div>

        {visibleAssets.length === 0 ? (
          <div className="vfx-queue-empty" style={{ margin: '1rem 0' }}>
            <p>All caught up! No assets matching this filter.</p>
          </div>
        ) : (
          <div className="vfx-grid" style={{ marginTop: '1rem' }}>
            {visibleAssets.map(asset => (
              <div key={asset.id} className="vfx-card-wrapper">
                <div className="vfx-card" id={`dashboard-card-${asset.id}`}>
                  {/* Status Indicator */}
                  <div className="vfx-status-dot" style={{
                    background: asset.status === 'approved' ? '#4ade80' :
                                asset.status === 'rejected' ? '#f87171' :
                                asset.status === 'generating' ? '#facc15' : '#888'
                  }} />

                  <div className="vfx-info">
                    <span className="vfx-name mono" style={{ fontSize: '0.85rem' }}>{asset.id}</span>
                    <span className="vfx-sub">
                      {asset.status.toUpperCase()}
                      {asset.asset_protected ? ' 🔒' : ''}
                    </span>
                  </div>

                  {/* Preview */}
                  {asset.thumbnail_256 || asset.path ? (
                    <img
                      src={asset.thumbnail_256 || asset.path}
                      alt={asset.id}
                      className="vfx-thumb"
                      style={{ height: '80px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="scenelab-placeholder" style={{ height: '80px', fontSize: '0.7rem' }}>
                      No Preview
                    </div>
                  )}

                  {/* Last Review Note / Meta */}
                  {asset.notes && (
                    <div className="vfx-desc" style={{ marginTop: '4px', fontStyle: 'italic', color: '#aaa' }}>
                      Last note: {asset.notes}
                    </div>
                  )}

                  {/* Actions for pending actionable assets */}
                  {asset.status === 'pending' && !!asset.path && (
                    <div className="vfx-approve-row" style={{ marginTop: 'auto', paddingTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Review note…"
                        value={reviewNotes[asset.id] ?? asset.notes ?? ''}
                        onChange={e => updateNote(asset.id, e.target.value)}
                        className="review-note-input"
                        style={{ width: '100%', marginBottom: '4px' }}
                      />
                      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                        <button
                          id={`btn-dash-approve-${asset.id}`}
                          className="btn-approve btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => onApprove(asset.id, reviewNotes[asset.id] ?? asset.notes)}
                        >Approve</button>
                        <button
                          id={`btn-dash-reject-${asset.id}`}
                          className="btn-reject btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => onReject(asset.id, reviewNotes[asset.id] ?? asset.notes)}
                        >Reject</button>
                      </div>
                    </div>
                  )}

                  {/* ── Remediation controls for approved assets ── */}
                  {asset.status === 'approved' && (
                    <div style={{ marginTop: 'auto', paddingTop: '8px', width: '100%' }}>
                      <button
                        id={`btn-dash-remediate-toggle-${asset.id}`}
                        className="btn-sm"
                        style={{
                          width: '100%',
                          background: remediationOpen[asset.id] ? '#374151' : 'transparent',
                          border: '1px solid #4b5563',
                          color: '#9ca3af',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleRemediation(asset.id)}
                        title="Open remediation controls to correct note or reject this approved asset"
                      >
                        {remediationOpen[asset.id] ? '▲ Close Remediation' : '⚙ Remediate'}
                      </button>

                      {remediationOpen[asset.id] && (
                        <div
                          id={`dash-remediation-panel-${asset.id}`}
                          style={{
                            marginTop: '6px',
                            padding: '8px',
                            background: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '4px',
                          }}
                        >
                          {/* Note-only update */}
                          <div style={{ marginBottom: '6px', fontSize: '0.72rem', color: '#6b7280' }}>
                            Note correction (status unchanged):
                          </div>
                          <input
                            id={`input-dash-remediate-note-${asset.id}`}
                            type="text"
                            placeholder="Corrected review note…"
                            value={reviewNotes[asset.id] ?? asset.notes ?? ''}
                            onChange={e => updateNote(asset.id, e.target.value)}
                            className="review-note-input"
                            style={{ width: '100%', marginBottom: '4px', fontSize: '0.8rem' }}
                          />
                          <button
                            id={`btn-dash-save-note-${asset.id}`}
                            className="btn-sm"
                            style={{
                              width: '100%',
                              background: '#1d4ed8',
                              color: '#fff',
                              border: 'none',
                              marginBottom: '8px',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleSaveNote(asset)}
                          >
                            Save Note (keep approved)
                          </button>

                          {/* Divider */}
                          <div style={{ borderTop: '1px solid #374151', margin: '6px 0' }} />

                          {/* Reject with confirmation guard */}
                          <div style={{ marginBottom: '4px', fontSize: '0.72rem', color: '#6b7280' }}>
                            Reject &amp; unprotect (enables regeneration):
                          </div>
                          {rejectConfirm[asset.id] ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                id={`btn-dash-remediate-reject-confirm-${asset.id}`}
                                className="btn-reject btn-sm"
                                style={{ flex: 1, fontSize: '0.75rem' }}
                                onClick={() => handleRemediationReject(asset)}
                              >
                                Confirm Reject
                              </button>
                              <button
                                id={`btn-dash-remediate-reject-cancel-${asset.id}`}
                                className="btn-sm"
                                style={{ flex: 1, fontSize: '0.75rem', background: '#374151', border: 'none', color: '#d1d5db', cursor: 'pointer' }}
                                onClick={() => setRejectConfirm(prev => ({ ...prev, [asset.id]: false }))}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`btn-dash-remediate-reject-${asset.id}`}
                              className="btn-reject btn-sm"
                              style={{ width: '100%', fontSize: '0.75rem', opacity: 0.8 }}
                              onClick={() => handleRemediationReject(asset)}
                            >
                              Reject (Remediation)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── System Logs ── */}
      <div className="log-panel" style={{ marginTop: '2rem' }}>
        <h3>System Logs</h3>
        {logs.length === 0 && <span style={{ color: '#888' }}>No logs yet...</span>}
        {logs.map((l, i) => <div key={i} className="log-line">{l}</div>)}
      </div>
    </div>
  );
}
