import {
  buildQueueEntry,
  cancelQueueEntry,
  markEntryGenerating,
  markEntryCompleted,
  markEntryFailed,
  selectNextBatchJob,
  canRunNextJob,
  calculateBatchDelay
} from '../src/lib/vfxQueue.js'; // Note: Node testing pure TS/JS imports
import { VFX_CATALOG } from '../src/lib/vfxCatalog.js';

let exitCode = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("\n── ARCHON-006E Smoke Test: Batch Execution Helpers ──\n");

try {
  // 1. Setup a dummy queue
  let queue = [];
  queue.push(buildQueueEntry(VFX_CATALOG[0], 0)); // q0
  queue.push(buildQueueEntry(VFX_CATALOG[1], 1)); // q1
  queue.push(buildQueueEntry(VFX_CATALOG[2], 2)); // q2
  
  const id0 = queue[0].queueId;
  const id1 = queue[1].queueId;
  const id2 = queue[2].queueId;

  // 2. Test canRunNextJob
  assert(canRunNextJob('running') === true, "canRunNextJob allows 'running'");
  assert(canRunNextJob('idle') === false, "canRunNextJob blocks 'idle'");
  assert(canRunNextJob('paused') === false, "canRunNextJob blocks 'paused'");
  assert(canRunNextJob('abort') === false, "canRunNextJob blocks 'abort'");

  // 3. Test selectNextBatchJob (Sequential by priority)
  let nextJob = selectNextBatchJob(queue);
  assert(nextJob && nextJob.queueId === id0, "selectNextBatchJob selects highest priority queued job");

  // 4. Test selectNextBatchJob ignores non-queued jobs
  queue = markEntryGenerating(queue, id0);
  queue = markEntryCompleted(queue, id0); // id0 is completed
  queue = cancelQueueEntry(queue, id1);   // id1 is cancelled

  nextJob = selectNextBatchJob(queue);
  assert(nextJob && nextJob.queueId === id2, "selectNextBatchJob skips completed and cancelled jobs, finds id2");

  queue = markEntryFailed(queue, id2, "Error"); // id2 is failed
  nextJob = selectNextBatchJob(queue);
  assert(nextJob === null, "selectNextBatchJob returns null when no queued jobs remain");

  // 5. Test calculateBatchDelay
  // Scenario A: First run, shouldn't delay much or at all if lastRunMs is 0
  assert(calculateBatchDelay(0, 2000) === 0, "calculateBatchDelay is 0 for first run");
  
  // Scenario B: We just ran, need full delay
  const now = Date.now();
  const delay1 = calculateBatchDelay(now, 2000);
  assert(delay1 >= 1900 && delay1 <= 2000, "calculateBatchDelay enforces full rate limit when just run");
  
  // Scenario C: We ran a while ago, partial delay
  const delay2 = calculateBatchDelay(now - 1500, 2000);
  assert(delay2 > 0 && delay2 <= 500, "calculateBatchDelay calculates partial remaining delay correctly");

  // Scenario D: We ran long ago, no delay
  assert(calculateBatchDelay(now - 5000, 2000) === 0, "calculateBatchDelay returns 0 if rate limit expired");

} catch (e) {
  console.error("❌ CRITICAL FAILURE during smoke test execution:");
  console.error(e);
  exitCode = 1;
}

console.log("\n──────────────────────────────────────────────");
if (exitCode === 0) {
  console.log("✅ ARCHON-006E Smoke Test PASSED. Batch helpers are safe.");
} else {
  console.error("❌ ARCHON-006E Smoke Test FAILED.");
}

process.exit(exitCode);
