import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_DIRS = ['src', 'scripts', 'tests'];
let errorCount = 0;

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      try {
        execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
      } catch (err) {
        console.error(`[Syntax Error] in ${fullPath}:`, err.message);
        errorCount++;
      }
    }
  }
}

console.log('[CI Check] Running JavaScript syntax validation...');
for (const d of TARGET_DIRS) {
  checkDir(d);
}

if (errorCount === 0) {
  console.log('[CI Check] All JavaScript source files passed syntax check cleanly.');
  process.exit(0);
} else {
  console.error(`[CI Check] FAILED: ${errorCount} syntax errors detected.`);
  process.exit(1);
}
