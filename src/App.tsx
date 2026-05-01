import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INITIAL_ASSETS, Asset } from './lib/assetManifest';
import { Toaster, toast } from 'sonner';
import { GenerationPanel, useGeneration } from './features/generation/GenerationPanel';
import type { GenerationResult } from './features/generation/GenerationPanel';
import { ExportPanel } from './features/export/ExportPanel';
import { VFXWorkflowPanel } from './features/vfx/VFXWorkflowPanel';
import { SceneLabPanel } from './features/scenelab/SceneLabPanel';
import { DashboardPanel } from './features/dashboard/DashboardPanel';
import {
  buildWorkshopState,
  validateWorkshopState,
  WORKSHOP_STATE_SCHEMA_VERSION,
} from './lib/workshopPersistence';
import type { WorkshopUIState, ValidTab, GenerationPreset, ScenePresetKey } from './lib/workshopPersistence';
import { applyReview } from './lib/assetReview';

// ─── Worker Queue ─────────────────────────────────────────────────────────────

class WorkerQueue {
  lanes: Record<string, { concurrency: number; active: number; queue: (() => Promise<any>)[] }> = {
    pro_image:   { concurrency: 1, active: 0, queue: [] },
    flash_image: { concurrency: 3, active: 0, queue: [] },
    music:       { concurrency: 1, active: 0, queue: [] },
    processing:  { concurrency: 4, active: 0, queue: [] },
  };

  public paused = false;
  private onProgress: (p: number) => void;
  public totalTasks = 0;
  public completedTasks = 0;
  public failedTasks = 0;
  public activeJobs: any[] = [];
  public pendingJobs: any[] = [];
  private retryCounts = new Map<string, number>();
  public activeStage: string | null = null;

  constructor(onProgress: (p: number) => void) { this.onProgress = onProgress; }

  async resetProgress() {
    this.totalTasks = 0; this.completedTasks = 0;
    this.failedTasks = 0; this.activeJobs = []; this.pendingJobs = [];
    this.saveState();
  }

  private async saveState() {
    try {
      await fetch('/api/save-queue-state', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: {
          activeStage: this.activeStage, completedTasks: this.completedTasks,
          failedTasks: this.failedTasks, totalTasks: this.totalTasks, paused: this.paused,
          retryCounts: Array.from(this.retryCounts.entries()),
        }}),
      });
    } catch (e) { console.error('Failed to persist queue state', e); }
  }

  async loadState() {
    try {
      const res = await fetch('/api/get-queue-state');
      const state = await res.json();
      if (state) {
        this.activeStage = state.activeStage; this.completedTasks = state.completedTasks;
        this.failedTasks = state.failedTasks; this.totalTasks = state.totalTasks;
        this.paused = state.paused || false;
        this.retryCounts = new Map(state.retryCounts);
      }
    } catch (e) { console.error('Failed to load queue state', e); }
  }

  async add(lane: string, task: () => Promise<any>): Promise<any> {
    this.totalTasks++;
    this.saveState();
    return new Promise((resolve, reject) => {
      this.pendingJobs.push({ lane, task, resolve, reject });
      this.processNext(lane);
    });
  }

  private async processNext(lane: string) {
    if (this.paused) return;
    const l = this.lanes[lane];
    if (l.active >= l.concurrency) return;
    const job = this.pendingJobs.find(j => j.lane === lane);
    if (!job) return;
    this.pendingJobs = this.pendingJobs.filter(j => j !== job);
    this.activeJobs.push(job);
    l.active++;
    this.saveState();
    try {
      const result = await job.task();
      this.completedTasks++;
      this.onProgress(Math.round((this.completedTasks / this.totalTasks) * 100));
      job.resolve(result);
    } catch (error) {
      this.failedTasks++;
      job.reject(error);
    } finally {
      l.active--;
      this.activeJobs = this.activeJobs.filter(j => j !== job);
      this.saveState();
      this.processNext(lane);
    }
  }

  pause()  { this.paused = true;  this.saveState(); }
  resume() {
    this.paused = false; this.saveState();
    Object.keys(this.lanes).forEach(lane => this.processNext(lane));
  }
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type Tab = ValidTab;

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard',  label: '📊 Dashboard'   },
  { id: 'generation', label: '⚡ Generation'  },
  { id: 'vfx',        label: '✨ VFX'         },
  { id: 'scenelab',   label: '🎬 Scene Lab'  },
  { id: 'export',     label: '📦 Export'      },
];

// ─── Logging helper ───────────────────────────────────────────────────────────

const MAX_LOGS = 50;

// ─── Workspace state persistence helpers ──────────────────────────────────────

async function serverSaveWorkshopState(state: WorkshopUIState): Promise<void> {
  try {
    await fetch('/api/save-workspace-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
  } catch (e) {
    console.error('Failed to persist workspace state', e);
  }
}

async function serverLoadWorkshopState(): Promise<WorkshopUIState | null> {
  try {
    const res = await fetch('/api/get-workspace-state');
    if (!res.ok) return null;
    const raw = await res.json();
    if (raw === null) return null;
    const result = validateWorkshopState(raw);
    if ('errors' in result) {
      console.warn('Stored workspace-state.json failed validation — using defaults.', result.errors);
      return null;
    }
    return result.state;
  } catch (e) {
    console.error('Failed to load workspace state', e);
    return null;
  }
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [queue, setQueue] = useState<WorkerQueue | null>(null);
  const [styleLock, setStyleLock] = useState({ light: '', dark: '', ui: '', vfx: '' });
  const [generationPreset, setGenerationPreset] = useState<GenerationPreset>('production');
  // Scene Lab state lifted here for persistence
  const [sceneLabPreset, setSceneLabPreset] = useState<ScenePresetKey>('combat_knight_vs_sorceress');
  const [sceneLabReviewNotes, setSceneLabReviewNotes] = useState<Record<string, string>>({});
  // Dashboard state (not persisted to WORKSHOP_STATE yet to avoid schema bump, survives tab switch)
  const [dashboardReviewNotes, setDashboardReviewNotes] = useState<Record<string, string>>({});

  const bootstrapLock = useRef(false);

  // ─── Amendment 2: hydration guard ───────────────────────────────────────────
  // This flag is false until the workspace-state restore attempt completes
  // (success or not). The debounced save effect checks this before writing,
  // preventing the initial default state from overwriting a saved state.
  const [hasHydratedWorkspaceState, setHasHydratedWorkspaceState] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track last saved value to avoid unnecessary writes
  const lastSavedStateRef = useRef<string>('');

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const icon = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' }[type];
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${icon} ${message}`].slice(-MAX_LOGS));
  };

  const saveManifest = async (newAssets: Asset[]) => {
    await fetch('/api/save-manifest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: { assets: newAssets } }),
    });
  };

  // Initialise queue once
  useEffect(() => {
    const q = new WorkerQueue(p => setProgress(p));
    setQueue(q);
  }, []);

  // Bootstrap: load / rehydrate manifest AND restore workspace state
  useEffect(() => {
    if (!queue) return;
    if (bootstrapLock.current) return;
    bootstrapLock.current = true;

    (async () => {
      // 1. Queue state
      await queue.loadState();

      // 2. Workspace UI state — restore BEFORE setting hasHydratedWorkspaceState
      const savedState = await serverLoadWorkshopState();
      if (savedState) {
        setActiveTab(savedState.active_tab);
        setStyleLock(savedState.style_lock);
        setGenerationPreset(savedState.generation_preset);
        setSceneLabPreset(savedState.scene_lab.preset);
        setSceneLabReviewNotes(savedState.scene_lab.review_notes);
        addLog('Workshop state restored.', 'success');
      }
      // Restore complete (or not found) — allow debounced saves from now on
      setHasHydratedWorkspaceState(true);

      // 3. Asset manifest
      addLog('Scanning disk for existing assets…');
      try {
        const res = await fetch('/api/rehydrate-manifest');
        const data = await res.json();
        if (data.assets?.length > 0) {
          setAssets(data.assets);
          const approved = data.assets.filter((a: Asset) => a.status === 'approved').length;
          setProgress(Math.round((approved / data.assets.length) * 100));
          addLog(`Rehydrated ${data.assets.length} assets from disk.`, 'success');
        } else {
          setAssets(INITIAL_ASSETS);
          addLog('No existing assets. Initialising manifest…');
          await saveManifest(INITIAL_ASSETS);
        }
      } catch (e) {
        console.error('Bootstrap error', e);
        setAssets(INITIAL_ASSETS);
      }
    })();
  }, [queue]);

  // ─── Debounced workspace state save ──────────────────────────────────────────
  // Only saves after hydration is complete (Amendment 2 guard).
  // Uses a content-equality check to avoid redundant writes.
  useEffect(() => {
    if (!hasHydratedWorkspaceState) return;

    const current = buildWorkshopState({
      activeTab,
      styleLock,
      generationPreset,
      sceneLabPreset,
      sceneLabReviewNotes,
    });
    const serialized = JSON.stringify(current);
    if (serialized === lastSavedStateRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await serverSaveWorkshopState(current);
      lastSavedStateRef.current = serialized;
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [hasHydratedWorkspaceState, activeTab, styleLock, generationPreset, sceneLabPreset, sceneLabReviewNotes]);

  // ─── Workshop State callbacks for ExportPanel ────────────────────────────────

  const handleExportWorkshopState = useCallback((): WorkshopUIState => {
    return buildWorkshopState({
      activeTab,
      styleLock,
      generationPreset,
      sceneLabPreset,
      sceneLabReviewNotes,
    });
  }, [activeTab, styleLock, generationPreset, sceneLabPreset, sceneLabReviewNotes]);

  const handleImportWorkshopState = useCallback((state: WorkshopUIState) => {
    // Apply atomically — all or nothing (Amendment 5)
    setActiveTab(state.active_tab);
    setStyleLock(state.style_lock);
    setGenerationPreset(state.generation_preset);
    setSceneLabPreset(state.scene_lab.preset);
    setSceneLabReviewNotes(state.scene_lab.review_notes);
    // Persist the restored state immediately (no debounce delay)
    serverSaveWorkshopState(state);
  }, []);

  // Generation hook
  const { handleGenerate, batchGenerate, expandLibrary } = useGeneration({
    assets, setAssets, saveManifest, addLog,
    queue: queue as any,
    styleLock, generationPreset,
    setGenerationPreset, isGenerating, setIsGenerating, setCurrentStage, progress,
  });

  // Approve / reject handlers (used by VFX panel and Scene Lab)
  const handleApprove = async (assetId: string, note?: string) => {
    setAssets(prev => {
      const updated = prev.map(a => {
        if (a.id !== assetId) return a;
        const versions = a.candidate_versions || [];
        const target = versions[versions.length - 1];
        let baseA = a;
        if (target) {
          baseA = {
            ...a, approved_version: target.version,
            current_display_version: target.version, path: target.path,
            thumbnail_64: target.thumbnail_64, thumbnail_256: target.thumbnail_256,
            hash: target.hash, mime_type: target.mime_type, codec: target.codec,
            preferred_playback_file: target.path,
          };
        }
        return applyReview(baseA, { status: 'approved', note });
      });
      saveManifest(updated);
      return updated;
    });
    toast.success(`Asset ${assetId} approved`);
  };

  const handleReject = (assetId: string, note?: string) => {
    setAssets(prev => {
      const updated = prev.map(a => a.id === assetId ? applyReview(a, { status: 'rejected', note }) : a);
      saveManifest(updated);
      return updated;
    });
    toast.info(`Asset ${assetId} rejected`);
  };

  type GenerationAttemptResult = {
    id: string;
    ok: boolean;
    error?: string;
  };

  const handleGenerateSelected = async (ids: string[]): Promise<GenerationAttemptResult[]> => {
    const results: GenerationAttemptResult[] = [];
    // Take a snapshot of assets so each generation call sees the same baseline.
    // (handleGenerate reads currentAssets from the second argument, not from stale closure)
    let latestAssets = assets;

    for (const id of ids) {
      const result: GenerationResult | null = await handleGenerate(id, latestAssets);

      if (!result) {
        // handleGenerate returns null when asset is not found or queue not ready
        results.push({ id, ok: false, error: 'Asset not found or queue unavailable' });
        continue;
      }

      if (result.status === 'success' && result.update) {
        // Apply the update to assets state and save the manifest
        setAssets(prev => {
          const next = prev.map(a => a.id === id ? { ...a, ...result.update } : a);
          saveManifest(next);
          latestAssets = next;  // keep snapshot fresh for next iteration
          return next;
        });
        results.push({ id, ok: true });
      } else if (result.status === 'skipped') {
        results.push({ id, ok: true });
      } else {
        // failed — update state with the failure info so the asset shows 'failed' in UI
        if (result.update) {
          setAssets(prev => {
            const next = prev.map(a => a.id === id ? { ...a, ...result.update } : a);
            latestAssets = next;
            return next;
          });
        }
        results.push({ id, ok: false, error: result.error ?? 'Generation failed' });
      }
    }

    return results;
  };

  // ─── Dashboard stats ───────────────────────────────────────────────────────

  const approved   = assets.filter(a => a.status === 'approved').length;
  const pending    = assets.filter(a => a.status === 'pending').length;
  const failed     = assets.filter(a => a.status === 'failed').length;
  const generating = assets.filter(a => a.status === 'generating').length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="app-header">
        <div className="app-logo">⚔️ Archon Workshop</div>
        <div className="app-stats">
          <span className="stat approved">✅ {approved}</span>
          <span className="stat pending">⏳ {pending}</span>
          <span className="stat failed">❌ {failed}</span>
          {generating > 0 && <span className="stat generating">⚡ {generating}</span>}
          {hasHydratedWorkspaceState && (
            <span className="stat saved" title="Workshop state is being auto-saved">💾</span>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <nav className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="app-body">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardPanel
            assets={assets}
            progress={progress}
            logs={logs}
            reviewNotes={dashboardReviewNotes}
            onReviewNotesChange={setDashboardReviewNotes}
            onApprove={handleApprove}
            onReject={handleReject}
            onNavigate={setActiveTab}
          />
        )}

        {/* Generation */}
        {activeTab === 'generation' && (
          <GenerationPanel
            isGenerating={isGenerating}
            progress={progress}
            currentStage={currentStage}
            onBatchGenerate={() => batchGenerate()}
            onExpand={expandLibrary}
          />
        )}

        {/* VFX Workflow */}
        {activeTab === 'vfx' && (
          <VFXWorkflowPanel
            assets={assets}
            onGenerateSelected={handleGenerateSelected}
            onApprove={handleApprove}
            onReject={handleReject}
            addLog={addLog}
          />
        )}

        {/* Scene Lab — preset and reviewNotes are lifted here for persistence */}
        {activeTab === 'scenelab' && (
          <SceneLabPanel
            assets={assets}
            addLog={addLog}
            preset={sceneLabPreset}
            onPresetChange={setSceneLabPreset}
            reviewNotes={sceneLabReviewNotes}
            onReviewNotesChange={setSceneLabReviewNotes}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* Export */}
        {activeTab === 'export' && (
          <ExportPanel
            assets={assets}
            setAssets={setAssets}
            saveManifest={saveManifest}
            addLog={addLog}
            onExportWorkshopState={handleExportWorkshopState}
            onImportWorkshopState={handleImportWorkshopState}
          />
        )}
      </main>
    </div>
  );
}
