/**
 * ORBITAL COMMAND & SENTINEL BOT SYSTEM HEALTH & ACCURACY VERIFIER
 * Comprehensive automated test suite verifying SGP4 orbital propagation,
 * topocentric pass predictions, NOAA SWPC Kp scale mapping, weather endpoints,
 * J.A.R.V.I.S. aerospace intelligence, and admin authentication boundaries.
 */

import { mapKpToNoaaGScale } from '../src/daemons/noaa-weather-worker.js';
import { computeSolarAndVisibilityState } from '../src/math/solar-visibility.js';
import { propagateSatelliteSGP4, getSatrec } from '../src/daemons/celestrak-worker.js';
import { computeTopocentricLookAngles } from '../src/math/topocentric.js';

const BASE_URL = process.env.TEST_HOST || 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

async function testEndpoint(name, path, options = {}) {
  const startTime = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const latency = Date.now() - startTime;
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await res.json() : await res.text();
    return { ok: res.ok, status: res.status, latency, body, headers: res.headers };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function runUnitAndMathematicalTests() {
  console.log(`=======================================================`);
  console.log(`PHASE 1: UNIT & ASTRODYNAMICS VERIFICATION`);
  console.log(`=======================================================\n`);

  // 1. NOAA Kp to G-Scale Mapping
  const g0 = mapKpToNoaaGScale(2.33);
  assert(g0.code === 'G0', `Kp 2.33 maps to G0 (Quiet)`);
  const g0Zero = mapKpToNoaaGScale(0.0);
  assert(g0Zero.code === 'G0', `Kp 0.0 maps to G0 (Nominal)`);
  const g1 = mapKpToNoaaGScale(5.0);
  assert(g1.code === 'G1', `Kp 5.0 maps to G1 (Minor)`);
  const g2 = mapKpToNoaaGScale(6.33);
  assert(g2.code === 'G2', `Kp 6.33 maps to G2 (Moderate)`);
  const g3 = mapKpToNoaaGScale(7.0);
  assert(g3.code === 'G3', `Kp 7.0 maps to G3 (Strong)`);
  const g4 = mapKpToNoaaGScale(8.0);
  assert(g4.code === 'G4', `Kp 8.0 maps to G4 (Severe)`);
  const g5 = mapKpToNoaaGScale(9.0);
  assert(g5.code === 'G5', `Kp 9.0 maps to G5 (Extreme)`);

  // 2. Solar Visibility & Umbra Shadow Cylinder Calculation
  const midnightMs = new Date('2026-06-21T00:00:00Z').getTime();
  const visNight = computeSolarAndVisibilityState(18.52, 73.85, 18.52, 73.85, 418, midnightMs);
  assert(typeof visNight.sunElevationDeg === 'number', `Sun elevation is numeric (${visNight.sunElevationDeg}°)`);
  assert(typeof visNight.isSatelliteSunlit === 'boolean', `Satellite illumination state calculated (${visNight.isSatelliteSunlit})`);

  // 3. SGP4 Orbital Propagation
  const issSat = { norad: 25544, id: 'iss', name: 'ISS (Zarya)', altKm: 418 };
  const propagated = propagateSatelliteSGP4(issSat, new Date());
  assert(propagated.method === 'propagated-sgp4', `Propagator method is 'propagated-sgp4'`);
  assert(typeof propagated.lat === 'number' && Math.abs(propagated.lat) <= 90, `Propagated latitude is valid: ${propagated.lat}°`);
  assert(typeof propagated.lon === 'number' && Math.abs(propagated.lon) <= 180, `Propagated longitude is valid: ${propagated.lon}°`);
  assert(propagated.altKm > 300 && propagated.altKm < 600, `Propagated altitude in LEO range: ${propagated.altKm} km`);
  assert(propagated.velKmS > 6.0 && propagated.velKmS < 9.0, `Propagated velocity realistic: ${propagated.velKmS} km/s`);
  assert(propagated.quality === 'fresh' || propagated.quality === 'stale', `Orbital quality flag present: ${propagated.quality}`);

  // 4. Topocentric Look Angles
  const look = computeTopocentricLookAngles(18.52, 73.85, 18.52, 73.85, 400);
  assert(look.elevationDeg >= 85.0, `Zenith look angle computes ~90° elevation (got ${look.elevationDeg}°)`);
}

async function runLiveServerDiagnostics() {
  console.log(`\n=======================================================`);
  console.log(`PHASE 2: LIVE API & INTEGRATION VERIFICATION`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`=======================================================\n`);

  // 1. Health & Core Static
  const health = await testEndpoint('Service Health', '/api/health');
  assert(health.ok && health.body?.ok === true, 'GET /api/health returned 200 OK');

  const home = await testEndpoint('Landing Page', '/');
  assert(home.ok && home.status === 200, 'GET / returned 200 OK');

  const weatherPage = await testEndpoint('Atmosphere Page', '/weather');
  assert(weatherPage.ok && weatherPage.status === 200, 'GET /weather returned 200 OK');

  // 2. Real Orbital Passes Endpoint
  const passesRes = await testEndpoint('Real Pass Predictions', '/api/passes?lat=18.5204&lon=73.8567&hours=48');
  assert(passesRes.ok && passesRes.body?.ok === true, 'GET /api/passes returned 200 OK');
  assert(Array.isArray(passesRes.body?.data) && passesRes.body.data.length > 0, `Passes predicted successfully (${passesRes.body?.data?.length || 0} passes calculated over 48h)`);
  if (passesRes.body?.data?.[0]) {
    const firstPass = passesRes.body.data[0];
    assert(firstPass.aos && firstPass.tca && firstPass.los, 'Pass contains full AOS / TCA / LOS look angles');
    assert(typeof firstPass.maxElevationDeg === 'number', `Max elevation defined: ${firstPass.maxElevationDeg}°`);
    assert(typeof firstPass.isNakedEyeVisible === 'boolean', `Optical visibility computed: ${firstPass.visibility}`);
  }

  // 3. SGP4 Enriched Space Catalog
  const bootstrapRes = await testEndpoint('Space Bootstrap Catalog', '/api/space/bootstrap');
  assert(bootstrapRes.ok && bootstrapRes.body?.ok === true, 'GET /api/space/bootstrap returned 200 OK');
  const catalog = bootstrapRes.body?.catalog || [];
  const earthSats = catalog.filter(c => c.parent === 'earth' && c.live);
  assert(earthSats.length > 0, `Catalog contains ${earthSats.length} satellites with live telemetry`);
  const nonIss = earthSats.find(s => s.id !== 'iss');
  if (nonIss) {
    const isFixedFallback = nonIss.live.lat === 28.5 && nonIss.live.lon === 77.2;
    assert(!isFixedFallback, `Non-ISS satellite (${nonIss.name}) is NOT using fixed 28.5, 77.2 fallback coordinates (lat: ${nonIss.live.lat}, lon: ${nonIss.live.lon})`);
  }

  // 4. Weather & Atmosphere Feeds
  const radarRes = await testEndpoint('RainViewer Radar Feed', '/api/weather/radar');
  assert(radarRes.ok && radarRes.body?.ok === true, 'GET /api/weather/radar returned 200 OK');

  const cycloneRes = await testEndpoint('Live Active Cyclones', '/api/weather/cyclones');
  assert(cycloneRes.ok && cycloneRes.body?.ok === true, 'GET /api/weather/cyclones returned 200 OK');
  assert(Array.isArray(cycloneRes.body?.data), 'Active cyclones returns valid array');

  const stationRes = await testEndpoint('Open-Meteo Weather Station', '/api/weather/station?lat=18.52&lon=73.85');
  assert(stationRes.ok && stationRes.body?.ok === true, 'GET /api/weather/station returned 200 OK');

  // 5. J.A.R.V.I.S. AI Chat Endpoint
  const jarvisRes = await testEndpoint('J.A.R.V.I.S. AI Chat', '/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What is the current status of the International Space Station?' })
  });
  assert(jarvisRes.ok && typeof jarvisRes.body?.reply === 'string', `J.A.R.V.I.S. responded: "${jarvisRes.body?.reply?.slice(0, 60)}..."`);

  // 6. Security Boundaries & Admin Authentication Enforcement
  const unauthWorkers = await testEndpoint('Unauthenticated Admin Workers Access', '/api/sentinel/workers');
  assert(unauthWorkers.status === 401, `Unauthenticated /api/sentinel/workers correctly rejected with HTTP 401`);

  const unauthSentinelPage = await testEndpoint('Unauthenticated Sentinel Page Access', '/sentinel', {
    redirect: 'manual'
  });
  assert(unauthSentinelPage.status === 302 || unauthSentinelPage.status === 401, `Unauthenticated /sentinel redirected or blocked with HTTP ${unauthSentinelPage.status}`);

  const blockedDotEnv = await testEndpoint('Blocked .env Access', '/.env');
  assert(blockedDotEnv.status === 404, `Direct access to /.env blocked with HTTP 404`);

  const unknownApi = await testEndpoint('Unknown API Endpoint', '/api/nonexistent-endpoint-test');
  assert(unknownApi.status === 404 && unknownApi.body?.ok === false, `Unknown API route returned JSON 404 (not HTML index fallback)`);
}

async function main() {
  await runUnitAndMathematicalTests();
  try {
    await runLiveServerDiagnostics();
  } catch (err) {
    console.warn(`[NOTE] Live server diagnostics skipped or partially failed (server might be offline): ${err.message}`);
  }

  console.log(`\n=======================================================`);
  console.log(`FINAL RESULT: ${passedTests}/${totalTests} checks passed successfully.`);
  console.log(`=======================================================`);

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
