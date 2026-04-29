/**
 * vfxQueue.ts
 *
 * Pure VFX generation queue data model for the Archon Workshop.
 *
 * This module is the single source of truth for:
 *   - VFXQueueEntry and VFXQueueState types
 *   - Queue builder: buildQueueEntry()
 *   - Lifecycle helpers: cancelQueueEntry(), retryQueueEntry()
 *   - Batch helpers: clearTerminalEntries(), reorderEntry()
 *   - Stats / filter / export: getQueueStats(), filterQueueByStatus(),
 *                               exportQueueBriefAsJSON()
 *
 * This module is:
 *   - Pure — no I/O, no React, no server calls, no fetch()
 *   - Non-mutating — every helper returns a new array or object; inputs are never modified
 *   - Safe to import in Node.js smoke tests without a browser/DOM
 *
 * Protected contracts NOT touched by this module:
 *   - CombatPackManifest / COMBAT_PACK_SCHEMA_VERSION
 *   - asset-manifest.json / INITIAL_ASSETS
 *   - ZIP export/import pipeline
 *   - WorkshopUIState / workshopPersistence.ts
 *   - archon-game consumer expectations
 *
 * Design note (ARCHON-006C):
 *   This is a STAGING / PLANNING queue. The 12 VFX catalog slots do NOT exist
 *   in INITIAL_ASSETS so no real generation is triggered here.
 *   Entries begin as 'queued' and can be cancelled, retried, or cleared.
 *   Real generation wiring is ARCHON-006D+ scope.
 *
 * Lifecycle state machine:
 *   queued ──cancel──▶ cancelled ──retry──▶ queued
 *   queued ──(future wiring)──▶ generating ──▶ completed | failed
 *   failed  ──retry──▶ queued
 *   completed / cancelled / failed ──clearTerminalEntries──▶ (removed)
 */

import type { VFXPreset, VFXFamily, VFXFaction, VFXIntensity } from './vfxCatalog';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VFXQueueStatus =
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Statuses that represent a finished (terminal) lifecycle state */
export const TERMINAL_STATUSES: VFXQueueStatus[] = ['completed', 'failed', 'cancelled'];

export interface VFXQueueEntry {
  /** Unique per enqueue operation — allows the same preset to be enqueued multiple times */
  queueId: string;
  /** VFXPreset.id of the source preset */
  presetId: string;
  /** VFXPreset.asset_slot — matches manifest slot when registered */
  assetSlot: string;
  /** Human-readable display name (snapshot at enqueue time) */
  presetName: string;
  /** VFX animation family (snapshot) */
  family: VFXFamily;
  /** Faction palette alignment (snapshot) */
  faction: VFXFaction;
  /** Visual intensity 1–5 (snapshot) */
  intensity: VFXIntensity;
  /** Full generation prompt brief (snapshot at enqueue time) */
  promptBrief: string;
  /** Current queue lifecycle status */
  status: VFXQueueStatus;
  /** ISO 8601 timestamp when this entry was added to the queue */
  enqueuedAt: string;
  /** ISO 8601 timestamp when generation started (set by generation wiring — ARCHON-006D+) */
  startedAt?: string;
  /** ISO 8601 timestamp when entry reached a terminal state */
  completedAt?: string;
  /** Error detail if status === 'failed' */
  errorMessage?: string;
  /** Number of times this entry has been retried */
  retryCount: number;
  /**
   * Display priority ordinal — lower number = higher priority (runs first).
   * Assigned sequentially at enqueue time; can be reordered by the operator.
   */
  priority: number;
}

export interface VFXQueueStats {
  queued: number;
  generating: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}

export interface VFXQueueBriefExport {
  exported_at: string;
  queue_version: number;
  entry_count: number;
  stats: VFXQueueStats;
  entries: VFXQueueEntry[];
}

// ─── ID generator ─────────────────────────────────────────────────────────────

/** Generates a short unique queue entry ID. Pure — no crypto dependency. */
export function generateQueueId(): string {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 7);
  return `vfxq-${ts}-${rnd}`;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Builds a new VFXQueueEntry from a VFXPreset.
 * Snapshots all display/prompt fields so the entry is self-contained even if
 * the catalog is later updated.
 */
export function buildQueueEntry(preset: VFXPreset, priority: number): VFXQueueEntry {
  return {
    queueId:     generateQueueId(),
    presetId:    preset.id,
    assetSlot:   preset.asset_slot,
    presetName:  preset.name,
    family:      preset.family,
    faction:     preset.faction,
    intensity:   preset.intensity,
    promptBrief: preset.prompt_brief,
    status:      'queued',
    enqueuedAt:  new Date().toISOString(),
    retryCount:  0,
    priority,
  };
}

// ─── Lifecycle transitions ────────────────────────────────────────────────────

/**
 * Cancels a queued entry by queueId.
 * Only transitions entries with status === 'queued'; all others are unchanged.
 * Returns a new array — does NOT mutate the input.
 */
export function cancelQueueEntry(
  entries: VFXQueueEntry[],
  queueId: string,
): VFXQueueEntry[] {
  return entries.map(e => {
    if (e.queueId !== queueId) return e;
    if (e.status !== 'queued') return e; // only queued entries can be cancelled
    return { ...e, status: 'cancelled' as VFXQueueStatus, completedAt: new Date().toISOString() };
  });
}

/**
 * Retries a cancelled or failed entry by queueId.
 * Transitions status back to 'queued' and increments retryCount.
 * Only transitions entries with status === 'cancelled' | 'failed'; others unchanged.
 * Returns a new array — does NOT mutate the input.
 */
export function retryQueueEntry(
  entries: VFXQueueEntry[],
  queueId: string,
): VFXQueueEntry[] {
  return entries.map(e => {
    if (e.queueId !== queueId) return e;
    if (e.status !== 'cancelled' && e.status !== 'failed') return e;
    return {
      ...e,
      status:       'queued' as VFXQueueStatus,
      retryCount:   e.retryCount + 1,
      errorMessage: undefined,
      completedAt:  undefined,
    };
  });
}

/**
 * Removes all entries whose status is in TERMINAL_STATUSES
 * (completed, failed, cancelled). Does NOT remove generating or queued entries.
 * Recalculates priority on the remaining entries.
 * Returns a new array — does NOT mutate the input.
 */
export function clearTerminalEntries(queue: VFXQueueEntry[]): VFXQueueEntry[] {
  const next = queue.filter(e => !TERMINAL_STATUSES.includes(e.status));
  // Re-normalise priorities so they remain sequential
  return next.map((e, i) => ({ ...e, priority: i }));
}

// ─── Generation Integration (ARCHON-006D) ────────────────────────────────────

/** Moves a queued entry to generating status. Returns new array. */
export function markEntryGenerating(queue: VFXQueueEntry[], queueId: string): VFXQueueEntry[] {
  return queue.map(e => {
    if (e.queueId !== queueId) return e;
    // Only 'queued' entries can start generating
    if (e.status !== 'queued') return e;
    return { ...e, status: 'generating' };
  });
}

/** Moves a generating entry to completed status, clearing any old errors. Returns new array. */
export function markEntryCompleted(queue: VFXQueueEntry[], queueId: string): VFXQueueEntry[] {
  return queue.map(e => {
    if (e.queueId !== queueId) return e;
    return {
      ...e,
      status: 'completed',
      completedAt: new Date().toISOString(),
      errorMessage: undefined,
    };
  });
}

/** Moves a generating entry to failed status with an error message. Returns new array. */
export function markEntryFailed(queue: VFXQueueEntry[], queueId: string, error: string): VFXQueueEntry[] {
  return queue.map(e => {
    if (e.queueId !== queueId) return e;
    return {
      ...e,
      status: 'failed',
      errorMessage: error,
    };
  });
}

// ─── Batch Execution Helpers (ARCHON-006E) ──────────────────────────────────

/**
 * Selects the next eligible queued entry for batch processing.
 * Deterministically returns the first 'queued' entry ordered by priority.
 */
export function selectNextBatchJob(queue: VFXQueueEntry[]): VFXQueueEntry | null {
  const queued = queue.filter(e => e.status === 'queued');
  if (queued.length === 0) return null;
  // Note: priority is lower-is-better (0 is first)
  queued.sort((a, b) => a.priority - b.priority);
  return queued[0];
}

/**
 * Determines if the batch runner should proceed based on the control state.
 */
export function canRunNextJob(controlState: 'idle' | 'running' | 'paused' | 'abort'): boolean {
  return controlState === 'running';
}

/**
 * Calculates the exact delay needed before the next provider call
 * to satisfy the rate limit safely.
 */
export function calculateBatchDelay(lastProviderCallMs: number, rateLimitMs: number): number {
  if (lastProviderCallMs === 0) return 0;
  const elapsed = Date.now() - lastProviderCallMs;
  return Math.max(0, rateLimitMs - elapsed);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Returns a count of entries by status, plus total.
 */
export function getQueueStats(entries: VFXQueueEntry[]): VFXQueueStats {
  const stats: VFXQueueStats = {
    queued: 0, generating: 0, completed: 0, failed: 0, cancelled: 0,
    total: entries.length,
  };
  for (const e of entries) {
    stats[e.status]++;
  }
  return stats;
}

// ─── Filter ───────────────────────────────────────────────────────────────────

/**
 * Filters queue entries by status.
 * Pass null to return all entries.
 */
export function filterQueueByStatus(
  entries: VFXQueueEntry[],
  status: VFXQueueStatus | null,
): VFXQueueEntry[] {
  if (status === null) return entries;
  return entries.filter(e => e.status === status);
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/**
 * Moves an entry at `fromIndex` to `toIndex` in a copy of the entries array.
 * Recalculates `priority` to match display order after the move.
 * Returns the reordered array — does NOT mutate the input.
 */
export function reorderEntry(
  entries: VFXQueueEntry[],
  fromIndex: number,
  toIndex: number,
): VFXQueueEntry[] {
  if (fromIndex === toIndex) return entries;
  if (fromIndex < 0 || fromIndex >= entries.length) return entries;
  if (toIndex < 0 || toIndex >= entries.length) return entries;

  const next = [...entries];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  // Re-assign priority to match new ordinal positions
  return next.map((e, i) => ({ ...e, priority: i }));
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Serialises the current queue to a formatted JSON string suitable for
 * operator download or handoff to an external generation pipeline.
 * Caller is responsible for triggering browser download if needed.
 */
export function exportQueueBriefAsJSON(entries: VFXQueueEntry[]): string {
  const payload: VFXQueueBriefExport = {
    exported_at:   new Date().toISOString(),
    queue_version: 2,
    entry_count:   entries.length,
    stats:         getQueueStats(entries),
    entries,
  };
  return JSON.stringify(payload, null, 2);
}
