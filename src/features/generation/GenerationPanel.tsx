import React, { useCallback } from 'react';
import type { Asset, AssetVersion } from '../../lib/assetManifest';
import { getPromptForAsset } from '../../lib/promptTemplates';
import {
  generateImageAsset,
  generateMusicAsset,
  generateVoiceAsset,
  generateSFXAsset,
} from '../../lib/gemini';
import { EXPANSION_ASSETS } from '../../lib/expansionAssets';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerationResult {
  id: string;
  status: 'success' | 'failed' | 'skipped';
  update?: Partial<Asset>;
  error?: string;
}

export type GenerationPreset = 'draft' | 'production' | 'premium';

interface StyleLock {
  light: string;
  dark: string;
  ui: string;
  vfx: string;
}

interface WorkerQueue {
  add: (lane: string, task: () => Promise<any>) => Promise<any>;
  paused: boolean;
  activeStage: string | null;
}

interface Props {
  assets: Asset[];
  setAssets: (updater: (prev: Asset[]) => Asset[]) => void;
  saveManifest: (assets: Asset[]) => Promise<void>;
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  queue: WorkerQueue | null;
  styleLock: StyleLock;
  generationPreset: GenerationPreset;
  setGenerationPreset: (p: GenerationPreset) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  setCurrentStage: (s: string | null) => void;
  progress: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function useGeneration({
  assets,
  setAssets,
  saveManifest,
  addLog,
  queue,
  styleLock,
  generationPreset,
  setIsGenerating,
  setCurrentStage,
}: Props) {
  
  const handleGenerate = useCallback(
    async (assetId: string, currentAssets: Asset[]): Promise<GenerationResult | null> => {
      const asset = currentAssets.find(a => a.id === assetId);
      if (!asset || !queue) return null;

      // Never touch a protected, approved asset
      if (asset.asset_protected && asset.status === 'approved') {
        return { id: assetId, status: 'skipped' };
      }

      setAssets(prev =>
        prev.map(a =>
          a.id === assetId ? { ...a, status: 'generating', updated_at: new Date().toISOString() } : a
        )
      );

      const prompt = getPromptForAsset(asset, generationPreset);
      let data: string | null = null;
      let recipe: string | undefined;

      try {
        let lane = 'flash_image';
        if (asset.model_id?.includes('pro') || generationPreset === 'premium') lane = 'pro_image';
        if (asset.category === 'music' || asset.category === 'sfx') lane = 'music';
        if (asset.category === 'voice') lane = 'flash_image';

        const saveResult = await queue.add(lane, async () => {
          if (asset.type === 'image') {
            const locks: { data: string; mimeType: string }[] = [];
            let lockId = '';
            if (asset.faction === 'light') lockId = styleLock.light;
            else if (asset.faction === 'dark') lockId = styleLock.dark;
            else if (asset.category === 'ui') lockId = styleLock.ui;
            else if (asset.category === 'spell') lockId = styleLock.vfx;

            if (lockId) {
              const lockAsset = assets.find(a => a.id === lockId);
              if (lockAsset?.thumbnail_256) {
                locks.push({ data: lockAsset.thumbnail_256.split(',')[1], mimeType: lockAsset.mime_type || 'image/png' });
              }
            }

            data = await generateImageAsset(asset, prompt, { styleLock: locks, preset: generationPreset });
          } else if (asset.category === 'music') {
            data = await generateMusicAsset(asset, prompt);
          } else if (asset.category === 'voice') {
            data = await generateVoiceAsset(asset, prompt);
          } else if (asset.category === 'sfx') {
            data = await generateSFXAsset(asset, prompt);
            recipe = asset.id.split('-')[1] || 'click';
          }

          const saveRes = await fetch('/api/save-asset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: `${asset.id}-v${(asset.version || 0) + 1}`,
              data,
              type: asset.type,
              requiresCutout: asset.requiresCutout,
              recipe,
            }),
          });
          if (!saveRes.ok) {
            const err = await saveRes.json();
            throw new Error(err.error || 'Failed to save asset');
          }
          return await saveRes.json();
        });

        const newVersion: AssetVersion = {
          version: (asset.version || 0) + 1,
          path: saveResult.path,
          thumbnail_64: saveResult.thumbnail_64,
          thumbnail_256: saveResult.thumbnail_256,
          prompt,
          model_id: asset.model_id,
          created_at: new Date().toISOString(),
          hash: saveResult.hash,
          mime_type: saveResult.mime_type,
          codec: saveResult.codec,
        };

        const isFirst = !asset.approved_version || ['pending', 'failed', 'recoverable_failed'].includes(asset.status);

        return {
          id: assetId,
          status: 'success',
          update: {
            status: isFirst ? 'approved' : asset.status,
            path: isFirst ? saveResult.path : asset.path,
            thumbnail_64: isFirst ? saveResult.thumbnail_64 : asset.thumbnail_64,
            thumbnail_256: isFirst ? saveResult.thumbnail_256 : asset.thumbnail_256,
            source_prompt: prompt,
            version: newVersion.version,
            approved_version: isFirst ? newVersion.version : asset.approved_version,
            current_display_version: newVersion.version,
            candidate_versions: [...(asset.candidate_versions || []), newVersion],
            updated_at: new Date().toISOString(),
            hash: isFirst ? saveResult.hash : asset.hash,
            retry_count: 0,
            mime_type: isFirst ? saveResult.mime_type : asset.mime_type,
            codec: isFirst ? saveResult.codec : asset.codec,
            preferred_playback_file: isFirst ? saveResult.path : asset.preferred_playback_file,
            asset_protected: isFirst ? true : asset.asset_protected,
          },
        };
      } catch (error: any) {
        return {
          id: assetId,
          status: 'failed',
          error: error.message,
          update: {
            status: 'failed',
            retry_count: (asset.retry_count || 0) + 1,
            updated_at: new Date().toISOString(),
            error_log: {
              stage: asset.stage,
              model: asset.model_id || 'unknown',
              type: asset.type,
              retries: (asset.retry_count || 0) + 1,
              file_result: error.message,
              timestamp: new Date().toISOString(),
            },
          },
        };
      }
    },
    [assets, queue, styleLock, generationPreset, setAssets]
  );

  const batchGenerate = useCallback(
    async (initialAssets?: Asset[]) => {
      if (!queue) return;
      setIsGenerating(true);
      addLog('Starting batch generation pipeline...');

      const stages = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const currentAssets = initialAssets || assets;
      const startStageIndex = queue.activeStage ? stages.indexOf(queue.activeStage) : 0;
      const activeStages = stages.slice(Math.max(0, startStageIndex));

      for (const stage of activeStages) {
        setCurrentStage(stage);
        queue.activeStage = stage;
        addLog(`Entering Stage ${stage}...`);

        const stageAssets = currentAssets.filter(
          a => a.stage === stage && a.status !== 'approved' && !a.asset_protected
        );

        if (stageAssets.length === 0) {
          addLog(`Stage ${stage} already complete or empty. Skipping.`);
          continue;
        }

        addLog(`Queueing ${stageAssets.length} assets for Stage ${stage}...`);
        const results = await Promise.all(stageAssets.map(a => handleGenerate(a.id, currentAssets)));

        setAssets(prev => {
          const next = prev.map(a => {
            const res = results.find(r => r?.id === a.id);
            if (res?.status === 'success' && res.update) return { ...a, ...res.update };
            if (res?.status === 'failed' && res.update) return { ...a, ...res.update };
            return a;
          });
          saveManifest(next);
          return next;
        });

        addLog(`Stage ${stage} complete.`);
      }

      setIsGenerating(false);
      setCurrentStage(null);
      queue.activeStage = null;
      addLog('Batch generation pipeline finished.');
      toast.success('Asset pack generation complete!');
    },
    [assets, queue, handleGenerate, setAssets, saveManifest, addLog, setIsGenerating, setCurrentStage]
  );

  const expandLibrary = useCallback(async () => {
    addLog('Expanding asset library with missing entries...');
    const currentIds = new Set(assets.map(a => a.id));
    const newAssets: Asset[] = [...assets];
    let addedCount = 0;

    EXPANSION_ASSETS.forEach(base => {
      if (!currentIds.has(base.id!)) {
        newAssets.push({
          ...base,
          status: 'pending',
          version: 0,
          candidate_versions: [],
          asset_protected: false,
          retry_count: 0,
        } as Asset);
        addedCount++;
      }
    });

    // Unit variants
    const unitIds = [
      'valkyrie', 'archer', 'golem', 'knight', 'unicorn', 'djinni', 'wizard', 'phoenix',
      'manticore', 'banshee', 'troll', 'goblin', 'basilisk', 'shapeshifter', 'sorceress', 'dragon',
    ];
    const variants = ['bust', 'splash', 'wounded', 'defeated', 'silhouette'];
    unitIds.forEach(unit => {
      const faction = unitIds.indexOf(unit) < 8 ? 'light' : 'dark';
      variants.forEach(v => {
        const id = `unit-${faction}-${unit}-${v}`;
        if (!currentIds.has(id)) {
          newAssets.push({
            id, stage: 'C', category: 'unit', subcategory: v,
            name: `${unit.charAt(0).toUpperCase() + unit.slice(1)} ${v.charAt(0).toUpperCase() + v.slice(1)}`,
            description: `${faction} faction ${unit} ${v} variant`,
            status: 'pending', type: 'image', faction: faction as 'light' | 'dark',
            requiresCutout: v !== 'splash',
            model_id: 'gemini-3.1-flash-image-preview',
            version: 0, candidate_versions: [], asset_protected: false, retry_count: 0,
          } as Asset);
          addedCount++;
        }
      });
    });

    if (addedCount > 0) {
      setAssets(() => newAssets);
      await saveManifest(newAssets);
      addLog(`Added ${addedCount} new assets to manifest.`, 'success');
      toast.success(`Library expanded with ${addedCount} assets`);
    } else {
      addLog('Library is already fully expanded.');
      toast.info('Library already expanded');
    }
  }, [assets, setAssets, saveManifest, addLog]);

  return { handleGenerate, batchGenerate, expandLibrary };
}

// ─── Panel UI ─────────────────────────────────────────────────────────────────

export function GenerationPanel({ isGenerating, progress, currentStage, onBatchGenerate, onExpand }: {
  isGenerating: boolean;
  progress: number;
  currentStage: string | null;
  onBatchGenerate: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="generation-panel">
      <h2>Asset Generation</h2>
      <div className="progress-row">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <span>{progress}%</span>
      </div>
      {currentStage && <p className="stage-indicator">Active Stage: {currentStage}</p>}
      <div className="panel-actions">
        <button
          onClick={onBatchGenerate}
          disabled={isGenerating}
          className="btn-primary"
          id="btn-batch-generate"
        >
          {isGenerating ? 'Generating…' : 'Run Full Pipeline'}
        </button>
        <button onClick={onExpand} disabled={isGenerating} className="btn-secondary" id="btn-expand-library">
          Expand Library
        </button>
      </div>
    </div>
  );
}
