/**
 * ORBITAL COMMAND & SENTINEL BOT SYSTEM HEALTH VERIFIER
 * Runs an automated smoke test across all routes, contracts, and APIs.
 */

const BASE_URL = process.env.TEST_HOST || 'http://localhost:3000';

async function testEndpoint(name, path, options = {}) {
  const startTime = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const latency = Date.now() - startTime;
    const ok = res.status >= 200 && res.status < 300;
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await res.json() : await res.text();

    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} (${path}) — HTTP ${res.status} [${latency}ms]`);
    if (!ok) {
      console.error(`       Error:`, body);
    }
    return { ok, status: res.status, latency, body };
  } catch (err) {
    console.error(`[FAIL] ${name} (${path}) — Network Error: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function runSystemDiagnostics() {
  console.log(`=======================================================`);
  console.log(`ORBITAL COMMAND & SENTINEL BOT SYSTEM AUDIT`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`=======================================================\n`);

  const results = [];

  // 1. Static HTML Pages & Dashboards
  results.push(await testEndpoint('3D HUD Landing Page', '/'));
  results.push(await testEndpoint('OrbitAlert Center', '/orbitalert'));
  results.push(await testEndpoint('Sentinel Bot Dashboard', '/sentinel'));

  // 2. Health & System State
  results.push(await testEndpoint('Service Health', '/api/health'));
  results.push(await testEndpoint('Telemetry Sources', '/api/sources'));

  // 3. Normalized Object Catalogue & Provenance
  results.push(await testEndpoint('Catalogue Query', '/api/objects?limit=5'));
  results.push(await testEndpoint('Target Object Provenance (ISS)', '/api/objects/iss'));
  results.push(await testEndpoint('Target Object Telemetry State (ISS)', '/api/objects/iss/state'));

  // 4. Conjunction & Pass Predictions
  results.push(await testEndpoint('Live Event Stream', '/api/events'));
  results.push(await testEndpoint('Observer Passes (Pune)', '/api/passes?lat=18.5204&lon=73.8567'));

  // 5. Watchlist & Alert Settings Persistence
  results.push(await testEndpoint('Get Watchlist', '/api/watchlist'));
  results.push(await testEndpoint('Get Alert Rules', '/api/alert-settings'));

  // 6. Sentinel Supervisor APIs
  results.push(await testEndpoint('Sentinel Worker Supervisors', '/api/sentinel/workers'));
  results.push(await testEndpoint('Sentinel Provider Matrix', '/api/sentinel/sources'));
  results.push(await testEndpoint('Sentinel Incident Logs', '/api/sentinel/logs?limit=5'));

  // 7. Security & Route Protection
  const securityCheck = await testEndpoint('Blocked Config Access (.env)', '/.env');
  const isProtected = securityCheck.status === 404;
  console.log(`[${isProtected ? 'PASS' : 'FAIL'}] Security Boundary Check (Blocked .env) — HTTP ${securityCheck.status}`);

  console.log(`\n=======================================================`);
  const passed = results.filter(r => r.ok).length;
  console.log(`SUMMARY: ${passed}/${results.length} tests passed successfully.`);
  console.log(`=======================================================`);

  if (passed !== results.length) {
    process.exit(1);
  }
}

runSystemDiagnostics();