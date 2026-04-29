/**
 * smoke-test-archon-006c.mjs
 *
 * Unit smoke tests for ARCHON-006C — Batch VFX Generation Queue Foundation.
 * Tests the vfxQueue.ts module directly (compiled via tsx/node).
 *
 * Does NOT require a running dev server.
 *
 * Run: node --import=tsx/esm scripts/smoke-test-archon-006c.mjs
 */

import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── Load modules ─────────────────────────────────────────────────────────────

let queueMod;
let catalogMod;
try {
  queueMod   = await import(pathToFileURL(path.join(ROOT, 'src/lib/vfxQueue.ts')).href);
  catalogMod = await import(pathToFileURL(path.join(ROOT, 'src/lib/vfxCatalog.ts')).href);
} catch (e) {
  console.error('\n❌ Failed to import modules:', e.message);
  console.error('   Run with: node --import=tsx/esm scripts/smoke-test-archon-006c.mjs\n');
  process.exit(1);
}

const {
  buildQueueEntry,
  generateQueueId,
  cancelQueueEntry,
  retryQueueEntry,
  clearTerminalEntries,
  getQueueStats,
  filterQueueByStatus,
  reorderEntry,
  exportQueueBriefAsJSON,
  TERMINAL_STATUSES,
} = queueMod;

const { VFX_CATALOG } = catalogMod;

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['queued', 'generating', 'completed', 'failed', 'cancelled'];
const VALID_FAMILIES = ['hit', 'projectile', 'beam', 'barrier', 'nova', 'status', 'spawn', 'death'];
const VALID_FACTIONS = ['light', 'dark', 'neutral'];
const VALID_INTENSITY = [1, 2, 3, 4, 5];

console.log('\n── ARCHON-006C Smoke Test (lifecycle patch) ───────────────────────────────\n');

// ── S1: generateQueueId ────────────────────────────────────────────────────────

console.log('S1: generateQueueId');
const id1 = generateQueueId();
const id2 = generateQueueId();
assert('generateQueueId returns a string',          typeof id1 === 'string');
assert('generateQueueId result is non-empty',       id1.length > 0);
assert('generateQueueId result starts with vfxq-', id1.startsWith('vfxq-'));
assert('Two consecutive IDs are unique',            id1 !== id2, `both were: ${id1}`);

// ── S2: buildQueueEntry ────────────────────────────────────────────────────────

console.log('\nS2: buildQueueEntry');
const samplePreset = VFX_CATALOG[0]; // combat-hit-flash-light
const entry0 = buildQueueEntry(samplePreset, 0);

assert('buildQueueEntry returns an object',          typeof entry0 === 'object' && entry0 !== null);
assert('queueId is a non-empty string',              typeof entry0.queueId === 'string' && entry0.queueId.length > 0);
assert('queueId starts with vfxq-',                 entry0.queueId.startsWith('vfxq-'));
assert('presetId matches preset.id',                 entry0.presetId === samplePreset.id);
assert('assetSlot matches preset.asset_slot',        entry0.assetSlot === samplePreset.asset_slot);
assert('presetName matches preset.name',             entry0.presetName === samplePreset.name);
assert('family matches preset.family',               entry0.family === samplePreset.family);
assert('faction matches preset.faction',             entry0.faction === samplePreset.faction);
assert('intensity matches preset.intensity',         entry0.intensity === samplePreset.intensity);
assert('promptBrief matches preset.prompt_brief',    entry0.promptBrief === samplePreset.prompt_brief);
assert('status is queued',                           entry0.status === 'queued');
assert('retryCount is 0',                            entry0.retryCount === 0);
assert('enqueuedAt is a non-empty string',           typeof entry0.enqueuedAt === 'string' && entry0.enqueuedAt.length > 0);
assert('enqueuedAt is a valid ISO date',             !isNaN(Date.parse(entry0.enqueuedAt)));
assert('priority is 0',                              entry0.priority === 0);
assert('startedAt is undefined by default',          entry0.startedAt === undefined);
assert('completedAt is undefined by default',        entry0.completedAt === undefined);
assert('errorMessage is undefined by default',       entry0.errorMessage === undefined);

// ── S3: Field validity on entry built from every catalog preset ────────────────

console.log('\nS3: buildQueueEntry validates against all 12 catalog presets');
for (let i = 0; i < VFX_CATALOG.length; i++) {
  const preset = VFX_CATALOG[i];
  const entry  = buildQueueEntry(preset, i);

  assert(`[${preset.asset_slot}] queueId is unique string`,       typeof entry.queueId === 'string' && entry.queueId.length > 0);
  assert(`[${preset.asset_slot}] family is valid`,                 VALID_FAMILIES.includes(entry.family), `got "${entry.family}"`);
  assert(`[${preset.asset_slot}] faction is valid`,                VALID_FACTIONS.includes(entry.faction), `got "${entry.faction}"`);
  assert(`[${preset.asset_slot}] intensity is valid`,              VALID_INTENSITY.includes(entry.intensity), `got "${entry.intensity}"`);
  assert(`[${preset.asset_slot}] status is queued`,                entry.status === 'queued');
  assert(`[${preset.asset_slot}] retryCount is 0`,                 entry.retryCount === 0);
  assert(`[${preset.asset_slot}] promptBrief is non-empty`,        typeof entry.promptBrief === 'string' && entry.promptBrief.length > 0);
  assert(`[${preset.asset_slot}] priority === ${i}`,               entry.priority === i);
}

// ── S4: Duplicate enqueue produces distinct queueIds ──────────────────────────

console.log('\nS4: Duplicate enqueue — distinct queueIds');
const entryA = buildQueueEntry(samplePreset, 0);
const entryB = buildQueueEntry(samplePreset, 1);
assert('Same preset enqueued twice produces distinct queueIds', entryA.queueId !== entryB.queueId,
  `both: ${entryA.queueId}`);
assert('Both entries share the same presetId',   entryA.presetId === entryB.presetId);
assert('Both entries share the same assetSlot',  entryA.assetSlot === entryB.assetSlot);
assert('Priorities differ',                      entryA.priority !== entryB.priority);

// ── S5: TERMINAL_STATUSES constant ────────────────────────────────────────────

console.log('\nS5: TERMINAL_STATUSES constant');
assert('TERMINAL_STATUSES is an array',                Array.isArray(TERMINAL_STATUSES));
assert('TERMINAL_STATUSES includes completed',         TERMINAL_STATUSES.includes('completed'));
assert('TERMINAL_STATUSES includes failed',            TERMINAL_STATUSES.includes('failed'));
assert('TERMINAL_STATUSES includes cancelled',         TERMINAL_STATUSES.includes('cancelled'));
assert('TERMINAL_STATUSES does not include queued',    !TERMINAL_STATUSES.includes('queued'));
assert('TERMINAL_STATUSES does not include generating',!TERMINAL_STATUSES.includes('generating'));

// ── S6: cancelQueueEntry ──────────────────────────────────────────────────────

console.log('\nS6: cancelQueueEntry');
const queueForCancel = [
  buildQueueEntry(VFX_CATALOG[0], 0),
  buildQueueEntry(VFX_CATALOG[1], 1),
  buildQueueEntry(VFX_CATALOG[2], 2),
];
const targetId = queueForCancel[1].queueId;

const afterCancel = cancelQueueEntry(queueForCancel, targetId);

assert('cancelQueueEntry returns a new array',           afterCancel !== queueForCancel);
assert('Input array is NOT mutated',                     queueForCancel[1].status === 'queued');
assert('Target entry status is now cancelled',           afterCancel[1].status === 'cancelled', `got ${afterCancel[1].status}`);
assert('Target completedAt is set',                      typeof afterCancel[1].completedAt === 'string');
assert('Other entries unchanged (index 0)',              afterCancel[0].status === 'queued');
assert('Other entries unchanged (index 2)',              afterCancel[2].status === 'queued');

// Cancelling a non-queued entry is a no-op
const alreadyCancelled = cancelQueueEntry(afterCancel, targetId);
assert('Cancelling an already-cancelled entry is a no-op', alreadyCancelled[1].status === 'cancelled');

// Cancelling with an unknown queueId is a no-op
const unknownCancel = cancelQueueEntry(queueForCancel, 'vfxq-does-not-exist');
assert('Cancelling unknown queueId returns unchanged array', unknownCancel.every((e, i) => e.status === queueForCancel[i].status));

// ── S7: retryQueueEntry ───────────────────────────────────────────────────────

console.log('\nS7: retryQueueEntry');
// Build a cancelled entry to retry
const cancelledEntry = { ...buildQueueEntry(VFX_CATALOG[0], 0), status: 'cancelled', retryCount: 0 };
const failedEntry    = { ...buildQueueEntry(VFX_CATALOG[1], 1), status: 'failed',    retryCount: 1, errorMessage: 'timed out' };
const queuedEntry    = { ...buildQueueEntry(VFX_CATALOG[2], 2), status: 'queued',    retryCount: 0 };
const mixedQueue     = [cancelledEntry, failedEntry, queuedEntry];

// Retry the cancelled entry
const afterRetryCancelled = retryQueueEntry(mixedQueue, cancelledEntry.queueId);
assert('retryQueueEntry returns a new array',                         afterRetryCancelled !== mixedQueue);
assert('Input array is NOT mutated after retry',                      mixedQueue[0].status === 'cancelled');
assert('Retried cancelled entry status is now queued',                afterRetryCancelled[0].status === 'queued', `got ${afterRetryCancelled[0].status}`);
assert('Retried cancelled entry retryCount incremented to 1',         afterRetryCancelled[0].retryCount === 1,   `got ${afterRetryCancelled[0].retryCount}`);
assert('Retried cancelled entry completedAt cleared',                 afterRetryCancelled[0].completedAt === undefined);
assert('Other entries unchanged after cancel retry (index 1)',        afterRetryCancelled[1].status === 'failed');
assert('Other entries unchanged after cancel retry (index 2)',        afterRetryCancelled[2].status === 'queued');

// Retry the failed entry
const afterRetryFailed = retryQueueEntry(mixedQueue, failedEntry.queueId);
assert('Retried failed entry status is now queued',                   afterRetryFailed[1].status === 'queued',   `got ${afterRetryFailed[1].status}`);
assert('Retried failed entry retryCount incremented to 2',            afterRetryFailed[1].retryCount === 2,      `got ${afterRetryFailed[1].retryCount}`);
assert('Retried failed entry errorMessage cleared',                   afterRetryFailed[1].errorMessage === undefined);

// Retrying a queued entry is a no-op (only cancelled/failed can be retried)
const noOpRetry = retryQueueEntry(mixedQueue, queuedEntry.queueId);
assert('Retrying a queued entry is a no-op',                          noOpRetry[2].status === 'queued' && noOpRetry[2].retryCount === 0);

// Retrying unknown queueId is a no-op
const unknownRetry = retryQueueEntry(mixedQueue, 'vfxq-does-not-exist');
assert('Retrying unknown queueId returns unchanged array',            unknownRetry.every((e, i) => e.status === mixedQueue[i].status));

// ── S8: clearTerminalEntries ──────────────────────────────────────────────────

console.log('\nS8: clearTerminalEntries');
const mixedForClear = [
  { ...buildQueueEntry(VFX_CATALOG[0], 0), status: 'queued' },
  { ...buildQueueEntry(VFX_CATALOG[1], 1), status: 'cancelled' },
  { ...buildQueueEntry(VFX_CATALOG[2], 2), status: 'generating' },
  { ...buildQueueEntry(VFX_CATALOG[3], 3), status: 'completed' },
  { ...buildQueueEntry(VFX_CATALOG[4], 4), status: 'failed' },
];

const afterClear = clearTerminalEntries(mixedForClear);
assert('clearTerminalEntries returns a new array',        afterClear !== mixedForClear);
assert('Input array is NOT mutated after clear',          mixedForClear.length === 5);
assert('Cleared array has 2 entries (queued + generating)', afterClear.length === 2, `got ${afterClear.length}`);
assert('Remaining entry 0 status is queued',              afterClear[0].status === 'queued');
assert('Remaining entry 1 status is generating',          afterClear[1].status === 'generating');
assert('Priorities recalculated after clear [0,1]',       afterClear[0].priority === 0 && afterClear[1].priority === 1);

// Empty queue clears to empty
const emptyCleared = clearTerminalEntries([]);
assert('clearTerminalEntries([]) returns empty array',    emptyCleared.length === 0);

// All-terminal queue clears to empty
const allTerminal = [
  { ...buildQueueEntry(VFX_CATALOG[0], 0), status: 'completed' },
  { ...buildQueueEntry(VFX_CATALOG[1], 1), status: 'cancelled' },
];
const allCleared = clearTerminalEntries(allTerminal);
assert('All-terminal queue clears to empty',              allCleared.length === 0);

// ── S9: getQueueStats ─────────────────────────────────────────────────────────

console.log('\nS9: getQueueStats');
const mockEntries = [
  { ...buildQueueEntry(VFX_CATALOG[0], 0), status: 'queued' },
  { ...buildQueueEntry(VFX_CATALOG[1], 1), status: 'queued' },
  { ...buildQueueEntry(VFX_CATALOG[2], 2), status: 'generating' },
  { ...buildQueueEntry(VFX_CATALOG[3], 3), status: 'completed' },
  { ...buildQueueEntry(VFX_CATALOG[4], 4), status: 'failed' },
  { ...buildQueueEntry(VFX_CATALOG[5], 5), status: 'cancelled' },
];

const stats = getQueueStats(mockEntries);
assert('stats.total === 6',       stats.total === 6,       `got ${stats.total}`);
assert('stats.queued === 2',      stats.queued === 2,      `got ${stats.queued}`);
assert('stats.generating === 1',  stats.generating === 1,  `got ${stats.generating}`);
assert('stats.completed === 1',   stats.completed === 1,   `got ${stats.completed}`);
assert('stats.failed === 1',      stats.failed === 1,      `got ${stats.failed}`);
assert('stats.cancelled === 1',   stats.cancelled === 1,   `got ${stats.cancelled}`);

const emptyStats = getQueueStats([]);
assert('Empty queue: total === 0',       emptyStats.total === 0);
assert('Empty queue: queued === 0',      emptyStats.queued === 0);
assert('Empty queue: generating === 0',  emptyStats.generating === 0);
assert('Empty queue: cancelled === 0',   emptyStats.cancelled === 0);

// ── S10: filterQueueByStatus ─────────────────────────────────────────────────

console.log('\nS10: filterQueueByStatus');
const allEntries = filterQueueByStatus(mockEntries, null);
assert('filterQueueByStatus(null) returns all 6',       allEntries.length === 6, `got ${allEntries.length}`);

const queuedOnly = filterQueueByStatus(mockEntries, 'queued');
assert('filterQueueByStatus(queued) returns 2',         queuedOnly.length === 2, `got ${queuedOnly.length}`);
assert('filterQueueByStatus(queued) all are queued',    queuedOnly.every(e => e.status === 'queued'));

const cancelledOnly = filterQueueByStatus(mockEntries, 'cancelled');
assert('filterQueueByStatus(cancelled) returns 1',      cancelledOnly.length === 1, `got ${cancelledOnly.length}`);
assert('filterQueueByStatus(cancelled) status correct', cancelledOnly[0].status === 'cancelled');

const completedOnly = filterQueueByStatus(mockEntries, 'completed');
assert('filterQueueByStatus(completed) returns 1',      completedOnly.length === 1, `got ${completedOnly.length}`);

const emptyFilter = filterQueueByStatus([], 'queued');
assert('filterQueueByStatus on empty array returns 0',  emptyFilter.length === 0);

// ── S11: reorderEntry ────────────────────────────────────────────────────────

console.log('\nS11: reorderEntry');
const ordered = [
  buildQueueEntry(VFX_CATALOG[0], 0),
  buildQueueEntry(VFX_CATALOG[1], 1),
  buildQueueEntry(VFX_CATALOG[2], 2),
];
const slotA = ordered[0].assetSlot;
const slotB = ordered[1].assetSlot;
const slotC = ordered[2].assetSlot;

// Move index 2 to index 0 (move C to top)
const reordered = reorderEntry(ordered, 2, 0);
assert('reorderEntry returns a new array',           reordered !== ordered);
assert('Original array is not mutated',              ordered[0].assetSlot === slotA);
assert('C moved to position 0',                      reordered[0].assetSlot === slotC, `got ${reordered[0].assetSlot}`);
assert('A moved to position 1',                      reordered[1].assetSlot === slotA, `got ${reordered[1].assetSlot}`);
assert('B stays at position 2',                      reordered[2].assetSlot === slotB, `got ${reordered[2].assetSlot}`);
assert('Priorities recalculated: [0,1,2]',
  reordered[0].priority === 0 && reordered[1].priority === 1 && reordered[2].priority === 2);

// No-op: fromIndex === toIndex
const noOp = reorderEntry(ordered, 1, 1);
assert('reorderEntry(x,x) returns same order',       noOp[0].assetSlot === slotA);

// Out-of-bounds
const oob = reorderEntry(ordered, 0, 99);
assert('reorderEntry out-of-bounds returns original', oob[0].assetSlot === slotA);

// ── S12: exportQueueBriefAsJSON ──────────────────────────────────────────────

console.log('\nS12: exportQueueBriefAsJSON');
const jsonStr = exportQueueBriefAsJSON(mockEntries);
assert('exportQueueBriefAsJSON returns a string',    typeof jsonStr === 'string');
assert('Result is non-empty',                        jsonStr.length > 0);

let parsed;
try {
  parsed = JSON.parse(jsonStr);
  assert('JSON round-trips without error',           true);
} catch (e) {
  assert('JSON round-trips without error',           false, e.message);
}

if (parsed) {
  assert('exported JSON has exported_at field',       typeof parsed.exported_at === 'string');
  assert('exported JSON has queue_version === 2',     parsed.queue_version === 2,   `got ${parsed.queue_version}`);
  assert('exported JSON has entry_count === 6',       parsed.entry_count === 6,     `got ${parsed.entry_count}`);
  assert('exported JSON has entries array',           Array.isArray(parsed.entries));
  assert('exported JSON entries length === 6',        parsed.entries.length === 6,  `got ${parsed.entries.length}`);
  assert('exported JSON has stats object',            typeof parsed.stats === 'object' && parsed.stats !== null);
  assert('exported JSON stats.total === 6',           parsed.stats.total === 6,     `got ${parsed.stats?.total}`);
  assert('exported JSON stats.queued === 2',          parsed.stats.queued === 2,    `got ${parsed.stats?.queued}`);
  assert('exported JSON stats.completed === 1',       parsed.stats.completed === 1, `got ${parsed.stats?.completed}`);
  assert('exported JSON stats.cancelled === 1',       parsed.stats.cancelled === 1, `got ${parsed.stats?.cancelled}`);
  assert('exported JSON stats.failed === 1',          parsed.stats.failed === 1,    `got ${parsed.stats?.failed}`);
  // Verify retryCount field present in entries
  assert('each entry has retryCount field',           parsed.entries.every(e => typeof e.retryCount === 'number'));
  // Verify status values are all valid
  assert('each entry has a valid status',             parsed.entries.every(e => VALID_STATUSES.includes(e.status)));
}

const emptyJson = exportQueueBriefAsJSON([]);
let parsedEmpty;
try { parsedEmpty = JSON.parse(emptyJson); } catch {}
assert('exportQueueBriefAsJSON([]) entry_count === 0',         parsedEmpty?.entry_count === 0);
assert('exportQueueBriefAsJSON([]) entries is empty array',    Array.isArray(parsedEmpty?.entries) && parsedEmpty.entries.length === 0);
assert('exportQueueBriefAsJSON([]) stats.cancelled === 0',     parsedEmpty?.stats?.cancelled === 0);

// ── S13: promptBrief snapshot integrity ───────────────────────────────────────

console.log('\nS13: promptBrief snapshot integrity');
const presetRef = VFX_CATALOG[0];
const snapshot  = buildQueueEntry(presetRef, 0);
assert('Snapshot promptBrief equals source prompt_brief', snapshot.promptBrief === presetRef.prompt_brief);
assert('Snapshot promptBrief is a string copy (non-empty)', typeof snapshot.promptBrief === 'string' && snapshot.promptBrief.length > 0);
assert('Snapshot contains Style Bible prefix',
  snapshot.promptBrief.includes('Luminous Stained-Glass Fantasy'));

// ── S14: Full lifecycle round-trip ────────────────────────────────────────────

console.log('\nS14: Full lifecycle round-trip — enqueue → cancel → retry → cancel');
const preset0 = VFX_CATALOG[0];
const preset1 = VFX_CATALOG[1];

let liveQueue = [
  buildQueueEntry(preset0, 0),
  buildQueueEntry(preset1, 1),
];
const qid0 = liveQueue[0].queueId;
const qid1 = liveQueue[1].queueId;

// Cancel entry 0
liveQueue = cancelQueueEntry(liveQueue, qid0);
assert('After cancel: entry 0 is cancelled', liveQueue[0].status === 'cancelled');
assert('After cancel: entry 1 still queued', liveQueue[1].status === 'queued');

// Retry entry 0
liveQueue = retryQueueEntry(liveQueue, qid0);
assert('After retry: entry 0 is queued again',        liveQueue[0].status === 'queued');
assert('After retry: entry 0 retryCount is 1',        liveQueue[0].retryCount === 1);
assert('After retry: entry 0 completedAt is cleared', liveQueue[0].completedAt === undefined);
assert('After retry: entry 1 still queued',           liveQueue[1].status === 'queued');

// Simulate failure on entry 1 (set status directly as generation wiring would)
liveQueue = liveQueue.map(e => e.queueId === qid1
  ? { ...e, status: 'failed', errorMessage: 'API timeout', completedAt: new Date().toISOString() }
  : e
);
assert('After simulated failure: entry 1 is failed',            liveQueue[1].status === 'failed');
assert('After simulated failure: entry 1 has errorMessage',     liveQueue[1].errorMessage === 'API timeout');

// Retry the failed entry
liveQueue = retryQueueEntry(liveQueue, qid1);
assert('After retry-failed: entry 1 is queued',                 liveQueue[1].status === 'queued');
assert('After retry-failed: entry 1 retryCount is 1',           liveQueue[1].retryCount === 1);
assert('After retry-failed: entry 1 errorMessage cleared',      liveQueue[1].errorMessage === undefined);

// Simulate completion on entry 0
liveQueue = liveQueue.map(e => e.queueId === qid0
  ? { ...e, status: 'completed', completedAt: new Date().toISOString() }
  : e
);

// Clear terminal entries — only completed/failed/cancelled removed
const cleared = clearTerminalEntries(liveQueue);
assert('After clearTerminal: completed entry 0 removed',        !cleared.some(e => e.queueId === qid0));
assert('After clearTerminal: queued entry 1 remains',           cleared.some(e => e.queueId === qid1));
assert('After clearTerminal: 1 entry remains',                  cleared.length === 1);

// Final stats check
const finalStats = getQueueStats(cleared);
assert('Final stats: total === 1',     finalStats.total === 1);
assert('Final stats: queued === 1',    finalStats.queued === 1);
assert('Final stats: cancelled === 0', finalStats.cancelled === 0);
assert('Final stats: completed === 0', finalStats.completed === 0);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\nARCHON-006C smoke test complete — ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
