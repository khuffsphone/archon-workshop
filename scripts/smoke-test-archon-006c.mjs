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
  getQueueStats,
  filterQueueByStatus,
  reorderEntry,
  exportQueueBriefAsJSON,
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

const VALID_STATUSES = ['queued', 'generating', 'done', 'failed', 'skipped'];
const VALID_FAMILIES = ['hit', 'projectile', 'beam', 'barrier', 'nova', 'status', 'spawn', 'death'];
const VALID_FACTIONS = ['light', 'dark', 'neutral'];
const VALID_INTENSITY = [1, 2, 3, 4, 5];

console.log('\n── ARCHON-006C Smoke Test ─────────────────────────────────────────────────\n');

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

// ── S5: getQueueStats ─────────────────────────────────────────────────────────

console.log('\nS5: getQueueStats');
const mockEntries = [
  { ...buildQueueEntry(VFX_CATALOG[0], 0), status: 'queued' },
  { ...buildQueueEntry(VFX_CATALOG[1], 1), status: 'queued' },
  { ...buildQueueEntry(VFX_CATALOG[2], 2), status: 'generating' },
  { ...buildQueueEntry(VFX_CATALOG[3], 3), status: 'done' },
  { ...buildQueueEntry(VFX_CATALOG[4], 4), status: 'failed' },
  { ...buildQueueEntry(VFX_CATALOG[5], 5), status: 'skipped' },
];

const stats = getQueueStats(mockEntries);
assert('stats.total === 6',      stats.total === 6,      `got ${stats.total}`);
assert('stats.queued === 2',     stats.queued === 2,     `got ${stats.queued}`);
assert('stats.generating === 1', stats.generating === 1, `got ${stats.generating}`);
assert('stats.done === 1',       stats.done === 1,       `got ${stats.done}`);
assert('stats.failed === 1',     stats.failed === 1,     `got ${stats.failed}`);
assert('stats.skipped === 1',    stats.skipped === 1,    `got ${stats.skipped}`);

const emptyStats = getQueueStats([]);
assert('Empty queue: total === 0',      emptyStats.total === 0);
assert('Empty queue: queued === 0',     emptyStats.queued === 0);
assert('Empty queue: generating === 0', emptyStats.generating === 0);

// ── S6: filterQueueByStatus ───────────────────────────────────────────────────

console.log('\nS6: filterQueueByStatus');
const allEntries = filterQueueByStatus(mockEntries, null);
assert('filterQueueByStatus(null) returns all 6',     allEntries.length === 6, `got ${allEntries.length}`);

const queuedOnly = filterQueueByStatus(mockEntries, 'queued');
assert('filterQueueByStatus(queued) returns 2',       queuedOnly.length === 2, `got ${queuedOnly.length}`);
assert('filterQueueByStatus(queued) all are queued',  queuedOnly.every(e => e.status === 'queued'));

const doneOnly = filterQueueByStatus(mockEntries, 'done');
assert('filterQueueByStatus(done) returns 1',         doneOnly.length === 1, `got ${doneOnly.length}`);

const noneResult = filterQueueByStatus(mockEntries, 'generating');
// Exactly 1 generating in mockEntries
assert('filterQueueByStatus(generating) returns 1',   noneResult.length === 1, `got ${noneResult.length}`);

const emptyFilter = filterQueueByStatus([], 'queued');
assert('filterQueueByStatus on empty array returns 0', emptyFilter.length === 0);

// ── S7: reorderEntry ─────────────────────────────────────────────────────────

console.log('\nS7: reorderEntry');
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

// ── S8: exportQueueBriefAsJSON ────────────────────────────────────────────────

console.log('\nS8: exportQueueBriefAsJSON');
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
  assert('exported JSON has exported_at field',      typeof parsed.exported_at === 'string');
  assert('exported JSON has queue_version field',    parsed.queue_version === 1);
  assert('exported JSON has entry_count === 6',      parsed.entry_count === 6,     `got ${parsed.entry_count}`);
  assert('exported JSON has entries array',          Array.isArray(parsed.entries));
  assert('exported JSON entries length === 6',       parsed.entries.length === 6,  `got ${parsed.entries.length}`);
  assert('exported JSON has stats object',           typeof parsed.stats === 'object' && parsed.stats !== null);
  assert('exported JSON stats.total === 6',          parsed.stats.total === 6,     `got ${parsed.stats?.total}`);
  assert('exported JSON stats counts are correct',
    parsed.stats.queued === 2 && parsed.stats.done === 1 && parsed.stats.failed === 1);
}

const emptyJson = exportQueueBriefAsJSON([]);
let parsedEmpty;
try { parsedEmpty = JSON.parse(emptyJson); } catch {}
assert('exportQueueBriefAsJSON([]) entry_count === 0', parsedEmpty?.entry_count === 0);
assert('exportQueueBriefAsJSON([]) entries is empty array', Array.isArray(parsedEmpty?.entries) && parsedEmpty.entries.length === 0);

// ── S9: promptBrief snapshot integrity ────────────────────────────────────────

console.log('\nS9: promptBrief snapshot integrity');
// Verify that buildQueueEntry snapshots the promptBrief, not a reference that could drift
const presetRef = VFX_CATALOG[0];
const snapshot  = buildQueueEntry(presetRef, 0);
assert('Snapshot promptBrief equals source prompt_brief', snapshot.promptBrief === presetRef.prompt_brief);
assert('Snapshot promptBrief is a string copy (non-empty)', typeof snapshot.promptBrief === 'string' && snapshot.promptBrief.length > 0);
assert('Snapshot contains Style Bible prefix',
  snapshot.promptBrief.includes('Luminous Stained-Glass Fantasy'));

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\nARCHON-006C smoke test complete — ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
