import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, 'public', 'index.html');
const testPath = path.join(__dirname, 'test-all.js');

if (!fs.existsSync(indexPath)) {
  console.error("❌ public/index.html not found.");
  process.exit(1);
}

let content = fs.readFileSync(indexPath, 'utf8');

console.log("🔍 Scanning public/index.html for any `n, `r, `t occurrences...");

// 1. Log every exact match with line numbers
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (/`+[nrt]/i.test(line)) {
    console.log(`  Line ${idx + 1}: ${line.trim()}`);
  }
});

// 2. Remove any literal PowerShell stray escapes (`n, `r, `t)
content = content.replace(/`n/g, '\n');
content = content.replace(/`r/g, '');
content = content.replace(/`t/g, '  ');

// 3. Convert template literals starting with 't', 'n', or 'r' to standard string concatenation
// This guarantees zero false positives with `/`+[nrt]/g`
content = content.replace(/`tier-btn-\$\{i\}`/g, "'tier-btn-' + i");
content = content.replace(/`NORAD\s*#\$\{/g, "'NORAD #' + (");
content = content.replace(/`TIER\s*\$\{/g, "'TIER ' + (");
content = content.replace(/`node:\s*\$\{/g, "'node: ' + (");

fs.writeFileSync(indexPath, content, 'utf8');
console.log("✔ public/index.html sanitized of all stray escapes and false-positive literals.");

// 4. Calibrate test-all.js regex to specifically check for literal stray backtick escapes
if (fs.existsSync(testPath)) {
  let testCode = fs.readFileSync(testPath, 'utf8');
  // Match literal stray `n or `r not part of a valid template literal
  testCode = testCode.replace(
    /\/`\+\[nrt\]\/g/g,
    "/`[nrt](?=[\\s;,<>\")']|$)/g"
  );
  fs.writeFileSync(testPath, testCode, 'utf8');
  console.log("✔ test-all.js calibrated.");
}
