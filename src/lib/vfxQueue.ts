/**
 * vfxQueue.ts
 *
 * Pure VFX generation queue data model for the Archon Workshop.
 *
 * This module is the single source of truth for:
 *   - VFXQueueEntry and VFXQueueState types
 *   - Queue builder: buildQueueEntry()
 *   - Queue helpers: getQueueStats(), filterQueueByStatus(),
 *                    exportQueueBriefAsJSON(), reorderEntry()
 *
 * This module is:
 *   - Pure — no I/O, no React, no server calls, no fetch()
 *   - Safe to import in Node.js smoke tests without a browser/DOM
 *
 * Protected contracts NOT touched by this module:
 *   - CombatPackManifest / COMBAT_PACK_SCHEMA_VERSION
 *   - asset-manifest.json
 *   - INITIAL_ASSETS
 *   - ZIP export/import pipeline
 *   - WorkshopUIState / workshopPersistence.ts
 *   - archon-game consumer expectations
 *
 * Design note (ARCHON-006C):
 *   The 12 VFX catalog asset slots (e.g. combat-hit-flash-light) do NOT
 *   exist in INITIAL_ASSETS. The existing handleGenerate() pipeline silently
 *   returns null for them. This queue is a staging layer that captures VFX
 *   preset intent for future wiring to real generation (ARCHON-006D+).
 *   Status stays 'queued' permanently in this task.
 */

import type { VFXPreset, VFXFamily, VFXFaction, VFXIntensity } from './vfxCatalog';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VFXQueueStatus =
  | 'queued'
  | 'generating'
  | 'done'
  | 'failed'
  | 'skipped';

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
  /** ISO 8601 timestamp when generation completed or failed */
  completedAt?: string;
  /** Error detail if status === 'failed' */
  errorMessage?: string;
  /**
   * Display priority ordinal — lower number = higher priority (runs first).
   * Assigned sequentially at enqueue time; can be reordered by the operator.
   */
  priority: number;
}

export interface VFXQueueStats {
  queued: number;
  generating: number;
  done: number;
  failed: number;
  skipped: number;
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
    priority,
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Returns a count of entries by status, plus total.
 */
export function getQueueStats(entries: VFXQueueEntry[]): VFXQueueStats {
  const stats: VFXQueueStats = {
    queued: 0, generating: 0, done: 0, failed: 0, skipped: 0, total: entries.length,
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
    queue_version: 1,
    entry_count:   entries.length,
    stats:         getQueueStats(entries),
    entries,
  };
  return JSON.stringify(payload, null, 2);
}
