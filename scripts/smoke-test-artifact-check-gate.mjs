/**
 * smoke-test-artifact-check-gate.mjs
 * ARCHON-OPS-001 — Smoke test for artifact-check-gate.mjs
 *
 * Pure logic test — no git required, no file mutation.
 * Tests matchesGlob, classifyFile, classifyFiles, and getGateVerdict
 * against known patterns and expected outcomes.
 *
 * Run: node scripts/smoke-test-artifact-check-gate.mjs
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  matchesGlob,
  loadPolicy,
  classifyFile,
  classifyFiles,
  getGateVerdict,
} from './artifact-check-gate.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..');
const POLICY_DIR = path.join(REPO_ROOT, 'ci', 'policy');

// ─── Harness ──────────────────────────────────────────────────────────────────

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

// ─── Section 1: Policy file loading ──────────────────────────────────────────

console.log('\n── Section 1: Policy file loading ──');

const policy = loadPolicy(POLICY_DIR);

assert('blocked-globs.txt loaded — array',     Array.isArray(policy.blocked));
assert('risky-globs.txt loaded — array',       Array.isArray(policy.risky));
assert('safe-globs.txt loaded — array',        Array.isArray(policy.safe));
assert('blocked has entries',                  policy.blocked.length > 0, `got ${policy.blocked.length}`);
assert('risky has entries',                    policy.risky.length > 0,   `got ${policy.risky.length}`);
assert('safe has entries',                     policy.safe.length > 0,    `got ${policy.safe.length}`);
assert('blocked contains assetManifest.ts',    policy.blocked.includes('src/lib/assetManifest.ts'));
assert('blocked contains versionGuard.ts',     policy.blocked.includes('src/lib/versionGuard.ts'));
assert('risky contains server.ts',             policy.risky.includes('server.ts'));
assert('risky contains package.json',          policy.risky.includes('package.json'));
assert('risky contains scripts/**',            policy.risky.includes('scripts/**'));
assert('risky contains ci/**',                 policy.risky.includes('ci/**'));
assert('risky contains .agents/**',            policy.risky.includes('.agents/**'));
assert('risky contains docs/walkthrough-*.md', policy.risky.includes('docs/walkthrough-*.md'));
assert('safe contains docs/**',                policy.safe.includes('docs/**'));
assert('safe does NOT contain scripts/**',     !policy.safe.includes('scripts/**'));

// ─── Section 2: matchesGlob — exact matches ───────────────────────────────────

console.log('\n── Section 2: matchesGlob — exact matches ──');

assert('exact: src/lib/assetManifest.ts matches itself',
  matchesGlob('src/lib/assetManifest.ts', 'src/lib/assetManifest.ts'));
assert('exact: server.ts matches itself',
  matchesGlob('server.ts', 'server.ts'));
assert('exact: package.json matches itself',
  matchesGlob('package.json', 'package.json'));
assert('exact: src/lib/assetManifest.ts does NOT match src/lib/versionGuard.ts',
  !matchesGlob('src/lib/assetManifest.ts', 'src/lib/versionGuard.ts'));
assert('exact: server.ts does NOT match src/server.ts',
  !matchesGlob('server.ts', 'src/server.ts'));

// ─── Section 3: matchesGlob — wildcard patterns ───────────────────────────────

console.log('\n── Section 3: matchesGlob — wildcard patterns ──');

assert('public/generated/** matches generated image',
  matchesGlob('public/generated/**', 'public/generated/images/combat-hit-flash-light-v1.png'));
assert('public/generated/** matches generated manifest',
  matchesGlob('public/generated/**', 'public/generated/manifests/asset-manifest.json'));
assert('public/exports/** matches export zip',
  matchesGlob('public/exports/**', 'public/exports/archon-pack-123.zip'));
assert('src/**/*.ts matches src/lib/exportEligibility.ts',
  matchesGlob('src/**/*.ts', 'src/lib/exportEligibility.ts'));
assert('src/**/*.ts matches deep path src/features/export/helpers.ts',
  matchesGlob('src/**/*.ts', 'src/features/export/helpers.ts'));
assert('src/**/*.tsx matches src/features/export/ExportPanel.tsx',
  matchesGlob('src/**/*.tsx', 'src/features/export/ExportPanel.tsx'));
assert('src/**/*.tsx matches top-level src/App.tsx',
  matchesGlob('src/**/*.tsx', 'src/App.tsx'));
assert('scripts/** matches scripts/smoke-test-archon-009a.mjs',
  matchesGlob('scripts/**', 'scripts/smoke-test-archon-009a.mjs'));
assert('scripts/** matches scripts/artifact-check-gate.mjs',
  matchesGlob('scripts/**', 'scripts/artifact-check-gate.mjs'));
assert('ci/** matches ci/policy/blocked-globs.txt',
  matchesGlob('ci/**', 'ci/policy/blocked-globs.txt'));
assert('.agents/** matches .agents/rules/10-operating-discipline.md',
  matchesGlob('.agents/**', '.agents/rules/10-operating-discipline.md'));
assert('**/*.zip matches root-level zip',
  matchesGlob('**/*.zip', 'archon-combat-pack-123.zip'));
assert('**/*.zip matches nested zip',
  matchesGlob('**/*.zip', 'exports/archon-pack-456.zip'));
assert('tsconfig*.json matches tsconfig.json',
  matchesGlob('tsconfig*.json', 'tsconfig.json'));
assert('tsconfig*.json matches tsconfig.node.json',
  matchesGlob('tsconfig*.json', 'tsconfig.node.json'));
assert('vite.config.* matches vite.config.ts',
  matchesGlob('vite.config.*', 'vite.config.ts'));
assert('docs/walkthrough-*.md matches docs/walkthrough-archon-009a.md',
  matchesGlob('docs/walkthrough-*.md', 'docs/walkthrough-archon-009a.md'));
assert('docs/walkthrough-*.md matches docs/walkthrough-archon-ops-001.md',
  matchesGlob('docs/walkthrough-*.md', 'docs/walkthrough-archon-ops-001.md'));
assert('docs/walkthrough-*.md does NOT match docs/artifact-check-gate.md',
  !matchesGlob('docs/walkthrough-*.md', 'docs/artifact-check-gate.md'));
assert('docs/** matches docs/artifact-check-gate.md',
  matchesGlob('docs/**', 'docs/artifact-check-gate.md'));
assert('docs/** matches docs/current-state.md',
  matchesGlob('docs/**', 'docs/current-state.md'));

// ─── Section 4: BLOCKED classification ───────────────────────────────────────

console.log('\n── Section 4: BLOCKED classification ──');

assert('src/lib/assetManifest.ts → BLOCKED',
  classifyFile('src/lib/assetManifest.ts', policy) === 'BLOCKED');
assert('src/lib/versionGuard.ts → BLOCKED',
  classifyFile('src/lib/versionGuard.ts', policy) === 'BLOCKED');
assert('public/generated/images/combat-hit-flash-light-v1.png → BLOCKED',
  classifyFile('public/generated/images/combat-hit-flash-light-v1.png', policy) === 'BLOCKED');
assert('public/generated/manifests/asset-manifest.json → BLOCKED',
  classifyFile('public/generated/manifests/asset-manifest.json', policy) === 'BLOCKED');
assert('public/exports/archon-pack-123.zip → BLOCKED',
  classifyFile('public/exports/archon-pack-123.zip', policy) === 'BLOCKED');
assert('archon-combat-pack-456.zip → BLOCKED',
  classifyFile('archon-combat-pack-456.zip', policy) === 'BLOCKED');

// ─── Section 5: RISKY classification ─────────────────────────────────────────

console.log('\n── Section 5: RISKY classification ──');

// Source and config files
assert('src/features/export/ExportPanel.tsx → RISKY',
  classifyFile('src/features/export/ExportPanel.tsx', policy) === 'RISKY');
assert('src/lib/exportEligibility.ts → RISKY',
  classifyFile('src/lib/exportEligibility.ts', policy) === 'RISKY');
assert('server.ts → RISKY',
  classifyFile('server.ts', policy) === 'RISKY');
assert('package.json → RISKY',
  classifyFile('package.json', policy) === 'RISKY');
assert('.gitignore → RISKY',
  classifyFile('.gitignore', policy) === 'RISKY');
assert('vite.config.ts → RISKY',
  classifyFile('vite.config.ts', policy) === 'RISKY');
assert('tsconfig.json → RISKY',
  classifyFile('tsconfig.json', policy) === 'RISKY');

// Control-plane: scripts/
assert('scripts/smoke-test-archon-009a.mjs → RISKY',
  classifyFile('scripts/smoke-test-archon-009a.mjs', policy) === 'RISKY');
assert('scripts/artifact-check-gate.mjs → RISKY',
  classifyFile('scripts/artifact-check-gate.mjs', policy) === 'RISKY');
assert('scripts/check-evidence-receipt.mjs → RISKY',
  classifyFile('scripts/check-evidence-receipt.mjs', policy) === 'RISKY');
assert('scripts/smoke-test-artifact-check-gate.mjs → RISKY',
  classifyFile('scripts/smoke-test-artifact-check-gate.mjs', policy) === 'RISKY');

// Control-plane: ci/policy/
assert('ci/policy/blocked-globs.txt → RISKY',
  classifyFile('ci/policy/blocked-globs.txt', policy) === 'RISKY');
assert('ci/policy/risky-globs.txt → RISKY',
  classifyFile('ci/policy/risky-globs.txt', policy) === 'RISKY');
assert('ci/policy/safe-globs.txt → RISKY',
  classifyFile('ci/policy/safe-globs.txt', policy) === 'RISKY');

// Control-plane: .agents/
assert('.agents/rules/10-operating-discipline.md → RISKY',
  classifyFile('.agents/rules/10-operating-discipline.md', policy) === 'RISKY');
assert('.agents/workflows/evidence-receipt.md → RISKY',
  classifyFile('.agents/workflows/evidence-receipt.md', policy) === 'RISKY');

// Operational evidence docs
assert('docs/walkthrough-archon-009a.md → RISKY',
  classifyFile('docs/walkthrough-archon-009a.md', policy) === 'RISKY');
assert('docs/walkthrough-archon-ops-001.md → RISKY',
  classifyFile('docs/walkthrough-archon-ops-001.md', policy) === 'RISKY');

// ─── Section 6: SAFE classification ──────────────────────────────────────────

console.log('\n── Section 6: SAFE classification ──');

assert('docs/artifact-check-gate.md → SAFE',
  classifyFile('docs/artifact-check-gate.md', policy) === 'SAFE');
assert('docs/current-state.md → SAFE',
  classifyFile('docs/current-state.md', policy) === 'SAFE');
assert('docs/archon-009b-game-asset-sync-runbook.md → SAFE',
  classifyFile('docs/archon-009b-game-asset-sync-runbook.md', policy) === 'SAFE');
assert('docs/changelog.md → SAFE',
  classifyFile('docs/changelog.md', policy) === 'SAFE');

// ─── Section 7: NOOP classification ──────────────────────────────────────────

console.log('\n── Section 7: NOOP classification ──');

assert('README.md → NOOP',
  classifyFile('README.md', policy) === 'NOOP');
assert('.editorconfig → NOOP',
  classifyFile('.editorconfig', policy) === 'NOOP');
assert('some-random-file.xyz → NOOP',
  classifyFile('some-random-file.xyz', policy) === 'NOOP');

// ─── Section 8: Precedence ────────────────────────────────────────────────────

console.log('\n── Section 8: Precedence ──');

// BLOCKED overrides RISKY (assetManifest.ts matches both BLOCKED exact + RISKY src/**/*.ts)
assert('src/lib/assetManifest.ts → BLOCKED despite also matching RISKY src/**/*.ts',
  classifyFile('src/lib/assetManifest.ts', policy) === 'BLOCKED');
assert('src/lib/versionGuard.ts → BLOCKED despite also matching RISKY',
  classifyFile('src/lib/versionGuard.ts', policy) === 'BLOCKED');
assert('public/generated/images/foo.png → BLOCKED not NOOP',
  classifyFile('public/generated/images/foo.png', policy) !== 'NOOP');

// RISKY overrides SAFE (docs/walkthrough-*.md matches both RISKY + docs/** SAFE)
assert('docs/walkthrough-archon-009a.md → RISKY not SAFE (operational evidence overrides docs/**)',
  classifyFile('docs/walkthrough-archon-009a.md', policy) === 'RISKY');
assert('docs/walkthrough-archon-ops-001.md → RISKY not SAFE',
  classifyFile('docs/walkthrough-archon-ops-001.md', policy) === 'RISKY');

// RISKY > SAFE (scripts/ is RISKY not SAFE)
assert('scripts/smoke-test-artifact-check-gate.mjs → RISKY not SAFE',
  classifyFile('scripts/smoke-test-artifact-check-gate.mjs', policy) === 'RISKY');

// ─── Section 9: Gate verdict mapping ─────────────────────────────────────────

console.log('\n── Section 9: Gate verdict mapping ──');

// Pure NOOP — only truly unclassified files
const allClear = classifyFiles([
  'README.md',
  '.editorconfig',
], policy);
const verdictClear = getGateVerdict(allClear);
assert('all NOOP → verdict CLEAR',  verdictClear.verdict === 'CLEAR');
assert('all NOOP → exit code 0',    verdictClear.exitCode === 0);

// Docs SAFE + control-plane RISKY → RISKY overall
const docsPlusCI = classifyFiles([
  'docs/artifact-check-gate.md',
  'docs/current-state.md',
  'ci/policy/blocked-globs.txt',
], policy);
const verdictDocsPlusCI = getGateVerdict(docsPlusCI);
assert('docs SAFE + ci/policy RISKY → verdict RISKY',   verdictDocsPlusCI.verdict === 'RISKY');
assert('docs SAFE + ci/policy RISKY → exit code 1',     verdictDocsPlusCI.exitCode === 1);

// RISKY only
const hasRisky = classifyFiles([
  'docs/walkthrough-archon-009a.md',
  'src/features/export/ExportPanel.tsx',
], policy);
const verdictRisky = getGateVerdict(hasRisky);
assert('RISKY present → verdict RISKY',  verdictRisky.verdict === 'RISKY');
assert('RISKY present → exit code 1',    verdictRisky.exitCode === 1);

// BLOCKED overrides all
const hasBlocked = classifyFiles([
  'src/features/export/ExportPanel.tsx',
  'src/lib/assetManifest.ts',
], policy);
const verdictBlocked = getGateVerdict(hasBlocked);
assert('BLOCKED present → verdict BLOCKED', verdictBlocked.verdict === 'BLOCKED');
assert('BLOCKED present → exit code 2',     verdictBlocked.exitCode === 2);

const mixedAll = classifyFiles([
  'README.md',
  'docs/artifact-check-gate.md',
  'scripts/check-evidence-receipt.mjs',
  'server.ts',
  'src/lib/assetManifest.ts',
], policy);
const verdictMixed = getGateVerdict(mixedAll);
assert('BLOCKED in mixed set → verdict BLOCKED (BLOCKED > RISKY > SAFE > NOOP)',
  verdictMixed.verdict === 'BLOCKED');
assert('BLOCKED in mixed set → exit code 2',
  verdictMixed.exitCode === 2);

// ─── Section 10: Edge cases ───────────────────────────────────────────────────

console.log('\n── Section 10: Edge cases ──');

const emptyResult = getGateVerdict([]);
assert('empty file list → verdict CLEAR',   emptyResult.verdict === 'CLEAR');
assert('empty file list → exit code 0',     emptyResult.exitCode === 0);

assert('unknown extension file → NOOP',
  classifyFile('some-random-file.xyz', policy) === 'NOOP');
assert('dotfile not in policy → NOOP',
  classifyFile('.editorconfig', policy) === 'NOOP');
assert('Windows backslash path normalised — generated file → BLOCKED',
  classifyFile('public\\generated\\images\\foo.png', policy) === 'BLOCKED');
assert('Windows backslash path normalised — script → RISKY (control-plane)',
  classifyFile('scripts\\smoke-test-archon-009a.mjs', policy) === 'RISKY');
assert('Windows backslash path normalised — ci policy → RISKY',
  classifyFile('ci\\policy\\blocked-globs.txt', policy) === 'RISKY');
assert('classifyFiles returns one entry per input',
  classifyFiles(['a.md', 'b.ts', 'c.tsx'], policy).length === 3);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────────`);
console.log(`ARCHON-OPS-001 Smoke Test: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────────────\n`);
process.exit(failed > 0 ? 1 : 0);
