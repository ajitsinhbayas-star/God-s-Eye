const fs = require('fs');
const vm = require('vm');

const targetFiles = [
  'public/index.html', 'index.html',
  'public/earth.html', 'earth.html',
  'public/deepspace.html', 'deepspace.html'
].filter(f => fs.existsSync(f));

console.log("======================================================================");
console.log("  FIXING LINE 227 SYNTAX ERROR & RUNNING ACCURATE JS COMPILER CHECK   ");
console.log("======================================================================\n");

targetFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix the mangled line 227 across all files
  content = content.replace(
    /if\s*\(\s*typeof\s+window\.switchExplicitViewMode\s*===\s*'function'\s*\)\s*\{\s*window\.switchExplicitViewMode\s*===\s*'function'\s*\)\s*switchExplicitViewMode\('solar',\s*\{\s*skipCameraTransition:\s*true\s*\}\);\s*\}/g,
    "if (typeof window.switchExplicitViewMode === 'function') {\n          window.switchExplicitViewMode('solar', { skipCameraTransition: true });\n        }"
  );

  // Catch any loose variations of that broken condition
  content = content.replace(
    /window\.switchExplicitViewMode\s*===\s*'function'\s*\)\s*switchExplicitViewMode/g,
    "window.switchExplicitViewMode"
  );

  fs.writeFileSync(file, content, 'utf8');

  // Validate ONLY real JavaScript scripts (skip type="application/ld+json")
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let jsBlockIdx = 0;
  let hasError = false;

  while ((match = scriptRegex.exec(content)) !== null) {
    const attrs = match[1] || '';
    const code = match[2];

    // Skip JSON-LD structured data and external script tags with src
    if (attrs.includes('application/ld+json') || attrs.includes('src=')) {
      continue;
    }

    jsBlockIdx++;
    try {
      new vm.Script(code);
    } catch (err) {
      hasError = true;
      console.error(`  ❌ [${file}] Real JS Script #${jsBlockIdx} Error: ${err.message}`);
      const lines = code.split('\n');
      const lineMatch = err.stack.match(/evalmachine\.<anonymous>:(\d+)/);
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1], 10);
        console.log(`     Context (around line ${lineNum}):`);
        const start = Math.max(0, lineNum - 3);
        const end = Math.min(lines.length, lineNum + 2);
        for (let i = start; i < end; i++) {
          console.log(`     ${i + 1 === lineNum ? '>>' : '  '} ${i + 1}: ${lines[i]}`);
        }
      }
    }
  }

  if (!hasError) {
    console.log(`  ✔ [${file}] All ${jsBlockIdx} JavaScript blocks compiled cleanly (0 syntax errors).`);
  }
});

console.log("\n======================================================================");
console.log("✔ DONE! Refresh your browser now.");
console.log("======================================================================\n");
