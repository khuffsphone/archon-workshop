/**
 * artifact-check-gate.mjs
 * ARCHON-OPS-001 — Shadow-Mode Artifact Check Gate
 *
 * Classifies changed files as: NOOP | SAFE | RISKY | BLOCKED
 * based on policy glob files in ci/policy/.
 *
 * [SHADOW MODE] — read-only, no enforcement, no auto-approval, no mutation.
 *
 * Exit codes:
 *   0  — GATE CLEAR   (all files NOOP or SAFE)
 *   1  — GATE RISKY   (at least one RISKY file, no BLOCKED)
 *   2  — GATE BLOCKED (at least one BLOCKED file)
 *
 * Usage:
 *   node scripts/artifact-check-gate.mjs              # classify staged files
 *   node scripts/artifact-check-gate.mjs --unstaged   # classify unstaged changes
 *   node scripts/artifact-check-gate.mjs --all        # classify all changes vs HEAD
 *   node scripts/artifact-check-gate.mjs --files a.ts b.ts
 */

import fs   from 'fs';
import path from 'path';
import { execSync }       from 'child_process';
import { fileURLToPath }  from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..');
const POLICY_DIR = path.join(REPO_ROOT, 'ci', 'policy');

// ─── Glob matcher ─────────────────────────────────────────────────────────────
// Pure Node — no dependencies. Handles **, *, literal characters.
// Normalises backslashes to forward slashes.

export function matchesGlob(pattern, filePath) {
  const p = pattern.trim().replace(/\\/g, '/');
  const f = filePath.trim().replace(/\\/g, '/');

  // Build regex character by character
  let regexStr = '';
  let i = 0;
  while (i < p.length) {
    if (p[i] === '*' && p[i + 1] === '*') {
      i += 2;
      if (p[i] === '/') i++; // consume trailing slash after **
      if (i >= p.length) {
        // ** at end of pattern — match everything remaining
        regexStr += '.*';
      } else {
        // ** in middle — match any path segments, optionally
        regexStr += '(?:.+/)?';
      }
    } else if (p[i] === '*') {
      regexStr += '[^/]*';
      i++;
    } else if (p[i] === '?') {
      regexStr += '[^/]';
      i++;
    } else if ('.+^${}()|[]\\'.includes(p[i])) {
      regexStr += '\\' + p[i];
      i++;
    } else {
      regexStr += p[i];
      i++;
    }
  }

  return new RegExp('^' + regexStr + '$').test(f);
}

// ─── Policy loader ────────────────────────────────────────────────────────────

export function loadPolicy(policyDir = POLICY_DIR) {
  function readGlobs(filename) {
    const fullPath = path.join(policyDir, filename);
    if (!fs.existsSync(fullPath)) return [];
    return fs.readFileSync(fullPath, 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));
  }
  return {
    blocked: readGlobs('blocked-globs.txt'),
    risky:   readGlobs('risky-globs.txt'),
    safe:    readGlobs('safe-globs.txt'),
  };
}

// ─── File classifier ──────────────────────────────────────────────────────────
// Precedence: BLOCKED > RISKY > SAFE > NOOP

export function classifyFile(filePath, policy) {
  const f = filePath.replace(/\\/g, '/');
  if (policy.blocked.some(g => matchesGlob(g, f))) return 'BLOCKED';
  if (policy.risky.some(g   => matchesGlob(g, f))) return 'RISKY';
  if (policy.safe.some(g    => matchesGlob(g, f))) return 'SAFE';
  return 'NOOP';
}

export function classifyFiles(filePaths, policy) {
  return filePaths.map(f => ({ file: f, classification: classifyFile(f, policy) }));
}

// ─── Gate verdict ─────────────────────────────────────────────────────────────

export function getGateVerdict(classifications) {
  const tiers = classifications.map(c => c.classification);
  if (tiers.includes('BLOCKED')) return { verdict: 'BLOCKED', exitCode: 2 };
  if (tiers.includes('RISKY'))   return { verdict: 'RISKY',   exitCode: 1 };
  return { verdict: 'CLEAR', exitCode: 0 };
}

// ─── Git file list helpers ────────────────────────────────────────────────────

function getGitFiles(mode) {
  try {
    let cmd;
    if (mode === 'staged')   cmd = 'git diff --cached --name-only';
    else if (mode === 'all') cmd = 'git diff HEAD --name-only';
    else                     cmd = 'git diff --name-only';            // unstaged

    const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' });
    return out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('\n[SHADOW MODE — no enforcement, no auto-approval, no mutation]\n');
  console.log('── ARCHON-OPS-001 Artifact Check Gate ──\n');

  const args = process.argv.slice(2);
  let mode  = 'staged';
  let files = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--unstaged') mode = 'unstaged';
    else if (args[i] === '--all') mode = 'all';
    else if (args[i] === '--files') {
      files = args.slice(i + 1);
      break;
    }
  }

  const filePaths = files ?? getGitFiles(mode);

  if (filePaths.length === 0) {
    console.log('No changed files found.\n');
    console.log('Gate mode: ' + (files ? '--files' : mode));
    console.log('\nGATE CLEAR — no files to classify.\n');
    process.exit(0);
  }

  const policy         = loadPolicy();
  const classifications = classifyFiles(filePaths, policy);
  const { verdict, exitCode } = getGateVerdict(classifications);

  // Print per-file classifications
  const maxLen = Math.max(...classifications.map(c => c.file.length));
  for (const { file, classification } of classifications) {
    const pad = ' '.repeat(maxLen - file.length + 2);
    const icon = classification === 'BLOCKED' ? '🔴'
               : classification === 'RISKY'   ? '🟡'
               : classification === 'SAFE'    ? '🟢'
               :                                '⚪';
    console.log(`  ${icon} [${classification}]${pad}${file}`);
  }

  // Summary counts
  const counts = { NOOP: 0, SAFE: 0, RISKY: 0, BLOCKED: 0 };
  for (const { classification } of classifications) counts[classification]++;
  console.log(`\nNOOP: ${counts.NOOP}  SAFE: ${counts.SAFE}  RISKY: ${counts.RISKY}  BLOCKED: ${counts.BLOCKED}`);

  // Verdict
  console.log('\n──────────────────────────────────────────────');
  if (verdict === 'BLOCKED') {
    console.error('🔴 GATE BLOCKED — BLOCKED files detected. Do not stage without freeze-list override.');
  } else if (verdict === 'RISKY') {
    console.warn('🟡 GATE RISKY — Review recommended before staging.');
  } else {
    console.log('🟢 GATE CLEAR — all files NOOP or SAFE.');
  }
  console.log('──────────────────────────────────────────────\n');

  process.exit(exitCode);
}

// Run only when invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
