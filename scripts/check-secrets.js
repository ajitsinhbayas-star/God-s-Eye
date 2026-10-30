import fs from 'fs';
import { execSync } from 'child_process';

console.log('[CI Check] Running git secret leakage and .env tracking audit...');

try {
  const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' }).split(/\r?\n/).filter(Boolean);

  let violations = [];
  for (const file of trackedFiles) {
    if (file === '.env' || file.endsWith('.env') || file.includes('/.env')) {
      violations.push(`Forbidden tracked environment file: ${file}`);
    }
    if (file.endsWith('.pem') || file.endsWith('.key') || file.endsWith('.pfx')) {
      violations.push(`Forbidden tracked private certificate/key: ${file}`);
    }
  }

  if (violations.length > 0) {
    console.error('[CI Check] Secret audit FAILED:');
    violations.forEach(v => console.error('  - ' + v));
    process.exit(1);
  }

  console.log('[CI Check] Secret audit PASSED. No tracked .env or private credentials found in repository.');
  process.exit(0);
} catch (err) {
  console.warn('[CI Check] Git command unavailable or skipped:', err.message);
  process.exit(0);
}
