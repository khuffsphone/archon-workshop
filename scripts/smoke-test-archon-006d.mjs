import { buildQueueEntry } from '../src/lib/vfxQueue.ts';
import { pathToFileURL } from 'url';

const modulePath = pathToFileURL('src/lib/vfxQueue.ts').href;
const vfxQueue = await import(modulePath);

let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ ${label}${detail ? `: ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n── ARCHON-006D Smoke Test ──────────────────────────────────');

// S1: Queue Generation Transition Helpers
console.log('\nS1: Queue Generation Transition Helpers');

try {
  const dummyPreset = {
    id: 'preset-dummy', name: 'Dummy', family: 'hit', faction: 'neutral',
    description: 'test', use_case: 'test', asset_slot: 'dummy-slot',
    prompt_brief: 'test', visual_tags: [], timing_ms: 100, intensity: 1,
    layering: 'front', approved_for_generation: true
  };

  const initialQueue = [
    buildQueueEntry(dummyPreset, 0),
    buildQueueEntry(dummyPreset, 1) // Another to ensure we don't mutate everything
  ];
  const targetId = initialQueue[0].queueId;

  // markEntryGenerating
  const genQueue = vfxQueue.markEntryGenerating(initialQueue, targetId);
  assert(genQueue !== initialQueue, 'markEntryGenerating returns new array');
  assert(genQueue[0].status === 'generating', 'target entry status is generating');
  assert(genQueue[1].status === 'queued', 'other entry remains untouched');

  // markEntryCompleted
  const compQueue = vfxQueue.markEntryCompleted(genQueue, targetId);
  assert(compQueue !== genQueue, 'markEntryCompleted returns new array');
  assert(compQueue[0].status === 'completed', 'target entry status is completed');
  assert(compQueue[0].errorMessage === undefined, 'errorMessage is cleared');
  assert(typeof compQueue[0].completedAt === 'string', 'completedAt is set');

  // markEntryFailed
  const failQueue = vfxQueue.markEntryFailed(genQueue, targetId, 'API Error 500');
  assert(failQueue !== genQueue, 'markEntryFailed returns new array');
  assert(failQueue[0].status === 'failed', 'target entry status is failed');
  assert(failQueue[0].errorMessage === 'API Error 500', 'errorMessage is set');

} catch (e) {
  assert(false, 'Helpers exist and execute without throwing', e.message);
}

// S2: Slot Alignment Validation
console.log('\nS2: Slot Alignment Validation');

try {
  const manifestPath = pathToFileURL('src/lib/assetManifest.ts').href;
  const catalogPath = pathToFileURL('src/lib/vfxCatalog.ts').href;
  
  const manifest = await import(manifestPath);
  const catalog = await import(catalogPath);

  const initialAssetIds = manifest.INITIAL_ASSETS.map(a => a.id);
  let allSlotsFound = true;
  let missingSlots = [];

  for (const preset of catalog.VFX_CATALOG) {
    if (!initialAssetIds.includes(preset.asset_slot)) {
      allSlotsFound = false;
      missingSlots.push(preset.asset_slot);
    }
  }

  assert(allSlotsFound, 'All VFX catalog asset slots exist in INITIAL_ASSETS', missingSlots.length > 0 ? `Missing: ${missingSlots.join(', ')}` : '');

} catch (e) {
  assert(false, 'Manifest and Catalog imported successfully', e.message);
}

console.log(`\nARCHON-006D smoke test complete — ${11 - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
