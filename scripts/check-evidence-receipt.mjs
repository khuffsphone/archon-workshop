import fs from 'fs';
import path from 'path';

// Usage: node scripts/check-evidence-receipt.mjs docs/walkthrough-archon-006d.md
const filePath = process.argv[2];

if (!filePath) {
  console.error("❌ Error: Missing file path argument.");
  console.error("Usage: node scripts/check-evidence-receipt.mjs <path-to-walkthrough.md>");
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), filePath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ Error: File not found at ${resolvedPath}`);
  process.exit(1);
}

const content = fs.readFileSync(resolvedPath, 'utf8');
const lowerContent = content.toLowerCase();

let failed = false;

function check(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
  } else {
    console.error(`❌ ${message}`);
    failed = true;
  }
}

console.log(`\n── Evidence Receipt Check: ${path.basename(filePath)} ──\n`);

// Core required sections
check(
  lowerContent.includes("commands run") || lowerContent.includes("commands"),
  "Contains 'Commands run' or 'Commands' section"
);
check(
  lowerContent.includes("exit code") || lowerContent.includes("exit"),
  "Contains 'Exit code' or 'Exit' indicator for commands"
);

// Conditional check: Browser verification
const mentionsBrowser = lowerContent.includes("browser");
if (mentionsBrowser) {
  check(
    lowerContent.includes("browser verification"),
    "Walkthrough mentions browser, contains 'Browser verification' section"
  );
}

// Test/Smoke files modified
check(
  lowerContent.includes("test files modified") || lowerContent.includes("test/smoke files"),
  "Contains 'Test Files Modified' or 'Test/Smoke files' section"
);

// Conditional check: Generated artifact hygiene
const mentionsGeneration = lowerContent.includes("generate") || lowerContent.includes("export") || lowerContent.includes("import");
if (mentionsGeneration) {
  check(
    lowerContent.includes("generated artifact") || lowerContent.includes("hygiene"),
    "Walkthrough mentions generation/export/import, contains 'Generated artifact' or 'Hygiene' section"
  );
}

// Git verification requirements
check(
  lowerContent.includes("git diff --stat"),
  "Contains 'git diff --stat' command"
);
check(
  lowerContent.includes("git diff --name-only") || lowerContent.includes("files modified") || lowerContent.includes("files changed"),
  "Contains 'git diff --name-only' or file modification lists"
);
check(
  lowerContent.includes("git status -sb"),
  "Contains 'git status -sb' command"
);
check(
  lowerContent.includes("commit"),
  "Contains 'Commit' section/hash"
);
check(
  lowerContent.includes("pushed") || lowerContent.includes("push"),
  "Contains 'Pushed' or 'Push' confirmation"
);

console.log("\n──────────────────────────────────────────────");
if (failed) {
  console.error("❌ Evidence Receipt Check FAILED. Missing required sections.");
  process.exit(1);
} else {
  console.log("✅ Evidence Receipt Check PASSED.");
  process.exit(0);
}
