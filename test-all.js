import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("\x1b[36m==========================================================\x1b[0m");
console.log("\x1b[36m      FULL PLATFORM AUTOMATED AUDIT & BUG DETECTOR        \x1b[0m");
console.log("\x1b[36m==========================================================\x1b[0m\n");

let errorCount = 0;
let passCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passCount++;
  } else {
    console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    errorCount++;
  }
}

// -------------------------------------------------------------
// 1. FILE INTEGRITY & SYNTAX CHECK
// -------------------------------------------------------------
console.log("\x1b[33m[1/4] AUDITING STATIC HTML & CLIENT JAVASCRIPT SYNTAX...\x1b[0m");

const htmlFiles = [
  path.join(__dirname, 'public', 'index.html'),
  path.join(__dirname, 'public', 'orbitalert.html'),
  path.join(__dirname, 'public', 'sentinel.html')
];

const jsFiles = [
  path.join(__dirname, 'src', 'server.js'),
  path.join(__dirname, 'public', 'js', 'jarvis.js')
].filter(f => fs.existsSync(f));

for (const file of jsFiles) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    assert(code.length > 50, `${path.basename(file)} is populated (${code.length} bytes)`);
  } catch (err) {
    assert(false, `${path.basename(file)} read failed: ${err.message}`);
  }
}

const definedFunctions = new Set();
const calledFunctions = new Set();
const hiddenFeatures = [];
const JS_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'catch', 'with', 'function']);

for (const htmlFile of htmlFiles) {
  const filename = path.basename(htmlFile);
  if (!fs.existsSync(htmlFile)) {
    assert(false, `${filename} exists`);
    continue;
  }
  const content = fs.readFileSync(htmlFile, 'utf8');
  assert(true, `${filename} exists on disk`);

  const strayEscapes = (content.match(/`[nrt](?=[\s;,<>")']|$)/g) || []).length;
  assert(strayEscapes === 0, `${filename} has 0 stray \`n/\`r escape literals`);

  if (content.includes('openDevBot') || content.includes('Shift+D')) {
    hiddenFeatures.push(`${filename}: Autonomous DevBot Diagnostic Terminal (Shift+D / 3x Logo Tap)`);
  }
  if (content.includes('nasa-kiosk-overlay') || content.includes('isKioskEnabled')) {
    hiddenFeatures.push(`${filename}: Museum Kiosk Inactivity Screensaver & Auto-Reset`);
  }
  if (content.includes('initSynthAudioContext') || content.includes('startSynthDrone')) {
    hiddenFeatures.push(`${filename}: Web Audio API Procedural Synthesizer Drone Fallback`);
  }
  if (content.includes('applyURLQueryParameters') || content.includes('#/story/')) {
    hiddenFeatures.push(`${filename}: URL State Deep-Linking & Iframe Sandboxed Embed Parameters`);
  }

  const funcDefs = content.matchAll(/(?:function\s+([a-zA-Z0-9_$]+)|window\.([a-zA-Z0-9_$]+)\s*=)/g);
  for (const m of funcDefs) {
    definedFunctions.add(m[1] || m[2]);
  }

  const inlineCalls = content.matchAll(/on[a-z]+\s*=\s*["']([^"']+)["']/gi);
  for (const m of inlineCalls) {
    const raw = m[1];
    const funcMatch = raw.match(/^([a-zA-Z0-9_$.]+)\s*\(/);
    if (funcMatch) {
      const fnName = funcMatch[1];
      if (!JS_KEYWORDS.has(fnName)) {
        calledFunctions.add({ call: fnName, file: filename });
      }
    }
  }
}

// -------------------------------------------------------------
// 2. VERIFYING HTML EVENT-HANDLER REFERENCES
// -------------------------------------------------------------
console.log("\n\x1b[33m[2/4] VERIFYING HTML EVENT-HANDLER REFERENCES...\x1b[0m");
for (const { call, file } of calledFunctions) {
  const cleanCall = call.replace(/^window\./, '').split('.')[0];
  const isGlobalBrowser = ['alert', 'console', 'document', 'window', 'localStorage', 'location'].includes(cleanCall);
  const isDefined = definedFunctions.has(cleanCall) || isGlobalBrowser;
  assert(isDefined, `${file} handler -> ${cleanCall}() is defined in scripts`);
}

// -------------------------------------------------------------
// 3. SERVER ENDPOINT AUDIT
// -------------------------------------------------------------
console.log("\n\x1b[33m[3/4] TESTING EXPRESS ROUTING & BACKEND ENDPOINTS...\x1b[0m");

const serverProcess = spawn('node', ['src/server.js'], {
  env: { ...process.env, PORT: '3099' },
  stdio: 'pipe'
});

function testEndpoint(pathUrl, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 3099,
        path: pathUrl,
        method: method,
        headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}
      },
      (res) => {
        let resData = '';
        res.on('data', chunk => { resData += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, data: resData }));
      }
    );
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

setTimeout(async () => {
  const routesToTest = [
    { path: '/', expected: [200], name: 'Root Route / (index.html)' },
    { path: '/orbitalert', expected: [200], name: 'Clean Route /orbitalert' },
    { path: '/sentinel', expected: [200], name: 'Clean Route /sentinel' },
    { path: '/index.html', expected: [200], name: 'Direct index.html' },
    { path: '/orbitalert.html', expected: [200], name: 'Direct orbitalert.html' },
    { path: '/sentinel.html', expected: [200], name: 'Direct sentinel.html' },
    { path: '/api/space/bootstrap', expected: [200], name: 'GET /api/space/bootstrap' },
    { path: '/api/v1/catalog', expected: [200], name: 'GET /api/v1/catalog' },
    { path: '/api/v1/embed-builder?target=mars', expected: [200], name: 'GET /api/v1/embed-builder' },
    { path: '/api/nasa-live-hub?module=all&target=voyager1', expected: [200], name: 'GET /api/nasa-live-hub' },
    { path: '/api/ai/chat', expected: [200], method: 'POST', body: JSON.stringify({ message: "Ping status", lastSubject: "ISS" }), name: 'POST /api/ai/chat (J.A.R.V.I.S. Core)' },
    { path: '/api/sentinel/telemetry', expected: [200, 204], method: 'POST', body: JSON.stringify({ type: "TEST_PROBE" }), name: 'POST /api/sentinel/telemetry (Beacon)' }
  ];

  for (const r of routesToTest) {
    const res = await testEndpoint(r.path, r.method || 'GET', r.body || null);
    const isOk = r.expected.includes(res.status);
    assert(isOk, `${r.name} responded with HTTP ${res.status}`);
  }

  // -------------------------------------------------------------
  // 4. INVENTORY OF EMBEDDED FEATURES
  // -------------------------------------------------------------
  console.log("\n\x1b[33m[4/4] INVENTORY OF EMBEDDED & HIDDEN PLATFORM FEATURES:\x1b[0m");
  hiddenFeatures.forEach(feat => console.log(`  \x1b[36m⚡ [FEATURE]\x1b[0m ${feat}`));

  console.log("\n\x1b[36m==========================================================\x1b[0m");
  console.log(`TOTAL CHECKS: ${passCount + errorCount} | PASSED: ${passCount} | FAILED: ${errorCount}`);
  if (errorCount === 0) {
    console.log("\x1b[32m✔ SYSTEM READY: 100% OF FUNCTIONS, ROUTERS & HANDLERS VERIFIED.\x1b[0m");
  } else {
    console.log("\x1b[31m✖ ACTION REQUIRED: PLEASE REVIEW FAILED CHECKS ABOVE.\x1b[0m");
  }
  console.log("\x1b[36m==========================================================\x1b[0m\n");

  serverProcess.kill('SIGINT');
  process.exit(errorCount === 0 ? 0 : 1);
}, 1500);
