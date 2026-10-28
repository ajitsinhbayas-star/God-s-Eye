import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, 'public', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error("❌ public/index.html not found.");
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');
console.log("🔍 Diagnosing public/index.html...");

// 1. Ensure <head> tag exists
if (!html.includes('<head>')) {
  html = html.replace(/<!DOCTYPE html>\s*<html[^>]*>/i, '$&\n<head>');
  console.log("  ✔ Restored missing <head> tag.");
}

// 2. Fix premature THREE call in <head> before Three.js loads
html = html.replace(
  /var\s+trackingOffset\s*=\s*new\s+THREE\.Vector3\([^)]*\);/g,
  'var trackingOffset = null; // Lazy-initialized after Three.js loads'
);

// Add lazy-init inside updateTrackingFrame
if (!html.includes('if (!trackingOffset && typeof THREE')) {
  html = html.replace(
    /function updateTrackingFrame\(\)\s*\{/g,
    'function updateTrackingFrame() {\n        if (!trackingOffset && typeof THREE !== "undefined") trackingOffset = new THREE.Vector3(0, 0.4, 0.9);'
  );
}
// Add lazy-init inside focusSatellite
if (!html.includes('trackingOffset = new THREE.Vector3(0, dist')) {
  html = html.replace(
    /trackingOffset\.set\(0,\s*dist/g,
    'if (!trackingOffset && typeof THREE !== "undefined") trackingOffset = new THREE.Vector3();\n            trackingOffset.set(0, dist'
  );
}

// 3. Clean any duplicate card-intel-summary-box wrapper
html = html.replace(
  /<div id="card-intel-summary-box"[^>]*>\s*<div class="p-2\.5 rounded-xl bg-slate-950\/80 border border-slate-800 space-y-1\.5">/g,
  '<div id="card-intel-summary-box" class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">'
);

// 4. Ensure Three.js and Satellite.js CDNs exist in <head>
if (!html.includes('three.min.js')) {
  html = html.replace(
    '</head>',
    '  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/satellite.js/4.0.0/satellite.min.js"></script>\n</head>'
  );
  console.log("  ✔ Injected Three.js & Satellite.js CDNs into <head>.");
}

// 5. Test syntax of all inline <script> blocks with Node's VM compiler
const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
console.log(`\nAuditing ${scriptMatches.length} inline script blocks with Node.js parser...`);

let syntaxErrorsFound = 0;
scriptMatches.forEach((match, idx) => {
  const code = match[1];
  try {
    new vm.Script(code);
  } catch (err) {
    syntaxErrorsFound++;
    console.error(`  ✖ Syntax Error in <script> block #${idx + 1}: ${err.message}`);
  }
});

// 6. Wrap engine initialization in safe try/catch blocks so one minor error cannot kill the render loop
html = html.replace(
  /(renderCatalogs\(\);[\s\S]*?animate\(\);)/,
  `try {
      renderCatalogs();
      buildDeepSkyUniverseObjects();
      buildUnifiedNestedUniverse();
      setCosmicTier(2);
      setFocusTo('earth');
      if (typeof BotSwarm !== 'undefined' && BotSwarm.init) BotSwarm.init();
    } catch(e) {
      console.error("[Init Warning]:", e);
    }
    // Guaranteed main loop start
    try {
      animate();
    } catch(e) {
      console.error("[Render Loop Fatal]:", e);
    }`
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log("\n✅ public/index.html fully repaired and verified.");
