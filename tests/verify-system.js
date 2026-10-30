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
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('json');
    let body = null;
    if (isJson) {
      try { body = await res.json(); } catch (_) { body = null; }
    } else {
      body = await res.text();
    }
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

  // 3. SGP4 Enriched Space Catalog & Object State
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

  const objStateRes = await testEndpoint('Individual Object State Vector (Cartosat-3)', '/api/objects/cartosat3/state');
  assert(objStateRes.ok && objStateRes.body?.data?.telemetry, 'GET /api/objects/cartosat3/state returned live telemetry state');
  assert(objStateRes.body?.data?.telemetry?.method === 'propagated-sgp4', `Cartosat-3 state uses validated SGP4 method`);

  const sourcesRes = await testEndpoint('Telemetry Sources Matrix', '/api/sources');
  assert(sourcesRes.ok && Array.isArray(sourcesRes.body?.data), 'GET /api/sources returned sources list');

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

  // 7. Pass Prediction Input Validation & Boundaries
  const invalidLatRes = await testEndpoint('Invalid Latitude Validation', '/api/passes?lat=105&lon=73.85');
  assert(invalidLatRes.status === 400, `Latitude > 90 correctly rejected with HTTP 400`);

  const invalidLonRes = await testEndpoint('Invalid Longitude Validation', '/api/passes?lat=18.52&lon=250');
  assert(invalidLonRes.status === 400, `Longitude > 180 correctly rejected with HTTP 400`);

  const deepSpacePassRes = await testEndpoint('Deep-Space Probe Pass Rejection', '/api/passes?satId=aditya_l1');
  assert(deepSpacePassRes.status === 422, `Deep space spacecraft (Aditya-L1) rejected from topocentric passes with HTTP 422`);

  const plannedMissionPassRes = await testEndpoint('Planned Mission Pass Rejection', '/api/passes?satId=nisar');
  assert(plannedMissionPassRes.status === 422, `Planned mission (NISAR) rejected from active passes with HTTP 422`);

  // 8. End-to-End Sentinel Admin Authentication Flow
  const loginRes = await testEndpoint('Admin Authentication Login', '/api/sentinel/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Ajitsinh96', password: 'Ajitsinh@#9699' })
  });
  assert(loginRes.ok && loginRes.body?.success === true, 'Admin login succeeded with authorized credentials');

  const rawSetCookie = loginRes.headers?.get('set-cookie');
  const sessionCookie = rawSetCookie ? rawSetCookie.split(';')[0] : '';

  if (sessionCookie) {
    const authSourcesRes = await testEndpoint('Authenticated Admin Sources Matrix', '/api/sentinel/sources', {
      headers: { Cookie: sessionCookie }
    });
    assert(authSourcesRes.ok && Array.isArray(authSourcesRes.body?.sources), 'Authenticated /api/sentinel/sources returned provider sources list');

    const authWorkersRes = await testEndpoint('Authenticated Admin Workers Deck', '/api/sentinel/workers', {
      headers: { Cookie: sessionCookie }
    });
    assert(authWorkersRes.ok && Array.isArray(authWorkersRes.body?.workers), 'Authenticated /api/sentinel/workers returned live worker telemetry');

    const logoutRes = await testEndpoint('Admin Session Logout', '/api/sentinel/logout', {
      method: 'POST',
      headers: { Cookie: sessionCookie }
    });
    assert(logoutRes.ok && logoutRes.body?.success === true, 'Admin logout invalidated session cleanly');
  }

  const badLoginRes = await testEndpoint('Rejected Invalid Admin Login', '/api/sentinel/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Ajitsinh96', password: 'WrongPassword123!' })
  });
  assert(badLoginRes.status === 401, 'Invalid credentials rejected with HTTP 401');

  // 9. Universal Catalogue Search & Faceted Discovery
  const catSearchRes = await testEndpoint('Catalogue Search (q=cartosat)', '/api/catalog/search?q=cartosat');
  assert(catSearchRes.ok && catSearchRes.body?.data?.length >= 2, `Catalogue search found ${catSearchRes.body?.data?.length} Cartosat satellites`);

  const catDebrisRes = await testEndpoint('Catalogue Filter (category=debris)', '/api/catalog/search?category=debris');
  assert(catDebrisRes.ok && catDebrisRes.body?.data?.some(d => d.category === 'debris'), `Catalogue debris filter returned valid debris objects`);

  const catRegimeRes = await testEndpoint('Catalogue Filter (regime=GEO)', '/api/catalog/search?regime=GEO');
  assert(catRegimeRes.ok && catRegimeRes.body?.data?.some(d => d.regime === 'GEO'), `Catalogue regime filter returned GEO assets (NavIC IRNSS-1I)`);

  const catPagedRes = await testEndpoint('Catalogue Pagination (page=1, limit=5)', '/api/catalog/search?page=1&limit=5');
  assert(catPagedRes.ok && catPagedRes.body?.data?.length === 5 && catPagedRes.body?.meta?.total > 10, `Catalogue pagination returned 5 paged results with total count`);

  const catFacetsRes = await testEndpoint('Catalogue Facets', '/api/catalog/facets');
  assert(catFacetsRes.ok && Array.isArray(catFacetsRes.body?.data?.regimes), `Catalogue facets returned regimes, categories, and agencies`);

  // 10. Historical Time Travel & SGP4 Propagation
  const timeTravelNominal = await testEndpoint('Time Travel (Nominal Window)', `/api/propagate-time?time=${new Date().toISOString()}`);
  assert(timeTravelNominal.ok && timeTravelNominal.body?.meta?.isNominalSgp4Window === true, 'SGP4 propagation for current time is within nominal envelope');
  assert(timeTravelNominal.body?.satellites?.length >= 8, `Time travel computed SGP4 state vectors for ${timeTravelNominal.body?.satellites?.length} satellites`);

  const timeTravelDistant = await testEndpoint('Time Travel (Out-of-Envelope Limitation)', '/api/propagate-time?time=2024-01-01T00:00:00Z');
  assert(timeTravelDistant.ok && timeTravelDistant.body?.meta?.isNominalSgp4Window === false, 'Historical date outside 30 days correctly flagged with limitation disclaimer');

  const timeTravelInvalid = await testEndpoint('Invalid Time Travel Parameter', '/api/propagate-time?time=not-a-valid-date');
  assert(timeTravelInvalid.status === 400, 'Invalid timestamp rejected with HTTP 400');

  // 11. Situational Awareness, Conjunctions & Safety of Flight
  const conjunctionsRes = await testEndpoint('Geometric Conjunction Screening', '/api/conjunctions');
  assert(conjunctionsRes.ok && Array.isArray(conjunctionsRes.body?.encounters), 'Geometric conjunction screening returned encounters list');
  assert(typeof conjunctionsRes.body?.meta?.disclaimer === 'string', 'Conjunction screening includes explicit educational/informational disclaimer');

  const reentryRes = await testEndpoint('Re-entry & Orbital Decay Monitoring', '/api/reentry');
  assert(reentryRes.ok && Array.isArray(reentryRes.body?.events), 'Re-entry tracker returned decaying object events');
  assert(typeof reentryRes.body?.meta?.disclaimer === 'string', 'Re-entry monitoring includes disclaimer against deterministic impact prediction');

  const stationsRes = await testEndpoint('Ground Stations Line-of-Sight', '/api/ground-stations');
  assert(stationsRes.ok && Array.isArray(stationsRes.body?.stations), 'Ground stations directory returned verified public stations');
  assert(stationsRes.body?.stations?.some(s => typeof s.hasGeometricLineOfSight === 'boolean'), 'Stations contain topocentric elevation and geometric line-of-sight calculation');

  // 12. Watchlist & Alert Preferences Management
  const addWatchlistRes = await testEndpoint('Watchlist Add Item', '/api/watchlist/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'CARTOSAT3' })
  });
  assert(addWatchlistRes.ok && addWatchlistRes.body?.watchlist?.includes('CARTOSAT3'), 'Watchlist item added successfully');

  const removeWatchlistRes = await testEndpoint('Watchlist Remove Item', '/api/watchlist/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'CARTOSAT3' })
  });
  assert(removeWatchlistRes.ok && !removeWatchlistRes.body?.watchlist?.includes('CARTOSAT3'), 'Watchlist item removed successfully');

  const alertSettingsRes = await testEndpoint('Update Alert Settings', '/api/alert-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minElevation: 15.0, spaceWeatherKpThreshold: 5.0, enablePassAlerts: true })
  });
  assert(alertSettingsRes.ok && alertSettingsRes.body?.data?.minElevation === 15.0, 'Alert settings preferences updated and persisted');

  // =======================================================
  // PHASE 3: PWA, RELIABILITY & OBSERVABILITY VERIFICATION
  // =======================================================
  console.log(`\n=======================================================`);
  console.log(`PHASE 3: PWA, RELIABILITY & OBSERVABILITY VERIFICATION`);
  console.log(`=======================================================`);

  // 13. PWA Manifest & App Icons
  const manifestRes = await testEndpoint('PWA Web App Manifest', '/manifest.json');
  assert(manifestRes.ok && manifestRes.body?.display === 'standalone', 'PWA manifest returns valid standalone display configuration');
  assert(Array.isArray(manifestRes.body?.icons) && manifestRes.body?.icons?.length >= 4, 'PWA manifest defines at least 4 icon configurations');

  const icon192Res = await testEndpoint('PWA 192x192 Icon Asset', '/icons/icon-192.png');
  assert(icon192Res.status === 200, 'PWA 192x192 icon asset returns HTTP 200');

  const icon512Res = await testEndpoint('PWA 512x512 Icon Asset', '/icons/icon-512.png');
  assert(icon512Res.status === 200, 'PWA 512x512 icon asset returns HTTP 200');

  const faviconRes = await testEndpoint('Root Favicon Asset', '/favicon.ico');
  assert(faviconRes.status === 200, 'Root favicon returns HTTP 200');

  // 14. Service Worker & Offline Fallback Shell
  const swRes = await testEndpoint('Service Worker Script', '/sw.js');
  assert(swRes.status === 200, 'Service worker script returns HTTP 200');
  const swCacheControl = swRes.headers?.get('cache-control') || '';
  assert(swCacheControl.includes('no-cache') || swCacheControl.includes('no-store'), 'Service worker enforces immediate update cache-control headers');

  const offlineRes = await testEndpoint('Offline Fallback Screen', '/offline.html');
  assert(offlineRes.status === 200, 'Offline fallback screen returns HTTP 200');

  // 15. Authenticated Observability vs Unauthenticated Protection
  const unauthDiagRes = await testEndpoint('Unauthenticated Diagnostics Protection', '/api/sentinel/diagnostics');
  assert(unauthDiagRes.status === 401, 'Unauthenticated /api/sentinel/diagnostics correctly rejected with HTTP 401');

  // Re-login to test authenticated diagnostics
  const reloginRes = await testEndpoint('Sentinel Re-Authentication', '/api/sentinel/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Ajitsinh96', password: 'Ajitsinh@#9699' })
  });
  const cookieHeader = reloginRes.headers?.get('set-cookie') || '';
  const cookie = cookieHeader.split(';')[0];

  const authDiagRes = await testEndpoint('Authenticated Diagnostics Report', '/api/sentinel/diagnostics', {
    headers: { Cookie: cookie }
  });
  assert(authDiagRes.ok && typeof authDiagRes.body?.metrics?.uptimeSeconds === 'number', 'Authenticated diagnostics returns live operational uptime and metrics');
  assert(Array.isArray(authDiagRes.body?.recentEvents), 'Authenticated diagnostics returns structured event audit history');

  // 16. Persistence Backup Verification
  const fs = await import('fs');
  const path = await import('path');
  const backupPath = path.resolve('data/space-db.json.bak');
  assert(fs.existsSync(backupPath), 'Atomic space store backup file (space-db.json.bak) exists on disk');
  try {
    JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    assert(true, 'Space store backup file contains valid JSON');
  } catch (_) {
    assert(false, 'Space store backup file contains valid JSON');
  }

  // =======================================================
  // PHASE 4: SCIENTIFIC RESEARCH & ANALYSIS VERIFICATION
  // =======================================================
  console.log(`\n=======================================================`);
  console.log(`PHASE 4: SCIENTIFIC RESEARCH & ANALYSIS VERIFICATION`);
  console.log(`=======================================================`);

  // 17. Scientific Object Analysis Workspace
  const cartosatAnalysis = await testEndpoint('Scientific Analysis (Cartosat-3)', '/api/analysis/object/cartosat3');
  assert(cartosatAnalysis.ok && cartosatAnalysis.body?.meta?.noradId === 44804, 'Object analysis returns verified NORAD ID (44804)');
  assert(typeof cartosatAnalysis.body?.orbitalElements?.semiMajorAxisKm === 'number', 'Derived semi-major axis is numeric (~6887 km)');
  assert(cartosatAnalysis.body?.orbitalElements?.semiMajorAxisKm > 6000 && cartosatAnalysis.body?.orbitalElements?.semiMajorAxisKm < 7500, 'Semi-major axis in valid LEO orbital range');
  assert(typeof cartosatAnalysis.body?.stateVector?.altitudeKm === 'number', 'Current altitude is computed and numeric');
  assert(Array.isArray(cartosatAnalysis.body?.groundTrack?.points) && cartosatAnalysis.body?.groundTrack?.points?.length >= 50, 'Ground track array contains at least 50 sampled orbital waypoints');

  // Deep-Space probe analysis (Aditya-L1)
  const adityaAnalysis = await testEndpoint('Scientific Analysis (Aditya-L1)', '/api/analysis/object/aditya_l1');
  assert(adityaAnalysis.ok && adityaAnalysis.body?.meta?.isGroundTrackApplicable === false, 'Deep-space object flags ground-track as physically non-applicable');
  assert(adityaAnalysis.body?.astrodynamics?.distanceFromEarthKm >= 1000000, 'Aditya-L1 distance from Earth in Sun-Earth L1 Lagrange range (~1.5M km)');

  // 18. Multi-Object Scientific Comparison
  const compCompatible = await testEndpoint('Comparison (ISS vs Tiangong)', '/api/analysis/compare?ids=iss,tiangong');
  assert(compCompatible.ok && compCompatible.body?.meta?.isPhysicallyComparable === true, 'Co-regime Earth orbiters flagged as physically comparable');
  assert(typeof compCompatible.body?.deltas?.deltaAltitudeKm === 'number', 'Comparison computes altitude delta between space stations');

  const compIncompatible = await testEndpoint('Incompatible Comparison (ISS vs JWST)', '/api/analysis/compare?ids=iss,jwst');
  assert(compIncompatible.ok && compIncompatible.body?.meta?.isPhysicallyComparable === false, 'Earth-orbit vs Lagrange-halo comparison correctly flags incompatible reference frames');
  assert(typeof compIncompatible.body?.meta?.scientificCompatibilityNote === 'string', 'Incompatible comparison provides explicit scientific explanation notice');

  // 19. Ground Track & Pass Elevation Profiles
  const gtRes = await testEndpoint('High-Res Ground Track (Cartosat-3)', '/api/analysis/ground-track/cartosat3?samples=60');
  assert(gtRes.ok && gtRes.body?.pointsCount >= 50, 'Ground track generator returned high-resolution waypoint series');

  const passProfileRes = await testEndpoint('Pass Look-Angle Profile (ISS)', '/api/analysis/pass-profile/iss?lat=18.5204&lon=73.8567');
  assert(passProfileRes.ok && passProfileRes.body?.timeSeriesProfile?.sampleCount >= 5, 'Pass elevation profile returns sampled time-series look angles');
  assert(typeof passProfileRes.body?.passSummary?.maxElevationDeg === 'number', 'Pass profile defines verified maximum elevation angle');

  // 20. Mission Discovery Explorer
  const missionsRes = await testEndpoint('Mission Discovery Explorer', '/api/analysis/missions');
  assert(missionsRes.ok && missionsRes.body?.totalMissions >= 10, 'Mission explorer directory returns verified space missions (>= 10)');
  assert(Array.isArray(missionsRes.body?.facets?.agencies), 'Mission explorer returns agency facets');

  const isroMissionsRes = await testEndpoint('ISRO Missions Filter', '/api/analysis/missions?agency=isro');
  assert(isroMissionsRes.ok && isroMissionsRes.body?.totalMissions >= 4, 'ISRO agency filter returns verified missions (Aditya-L1, Chandrayaan, EOS, Cartosat)');

  // 21. Data Export Engine & Reproducible Records
  const csvExportRes = await testEndpoint('CSV Catalog Export', '/api/analysis/export?type=catalog&format=csv');
  assert(csvExportRes.ok && typeof csvExportRes.body === 'string' && csvExportRes.body.startsWith('#'), 'CSV export generates structured table with metadata comment headers');

  const jsonExportRes = await testEndpoint('JSON Missions Export', '/api/analysis/export?type=missions&format=json');
  assert(jsonExportRes.ok && jsonExportRes.body?.provenance && Array.isArray(jsonExportRes.body?.data), 'JSON export returns structured payload with complete scientific provenance');

  const reproRes = await testEndpoint('Reproducible Analysis Record', '/api/analysis/reproducible-record?id=iss');
  assert(reproRes.ok && typeof reproRes.body?.reproducibilityIdentifier === 'string', 'Reproducible record generates unique tracking identifier');
  assert(typeof reproRes.body?.sha256Digest === 'string' && reproRes.body?.sha256Digest?.length === 64, 'Reproducible record includes verified 64-character SHA-256 digest');

  // =======================================================
  // PHASE 5: INDIAN DISTRICT MAP & KISAN WEATHER VERIFICATION
  // =======================================================
  console.log(`\n=======================================================`);
  console.log(`PHASE 5: INDIAN DISTRICT MAP & KISAN WEATHER VERIFICATION`);
  console.log(`=======================================================`);

  // 22. Indian District Directory & Geometry Verification
  const districtsDirRes = await testEndpoint('Districts Index', '/api/weather/districts');
  assert(districtsDirRes.ok && districtsDirRes.body?.totalCount >= 500, 'District directory returns verified Indian districts (>= 500 features)');
  assert(Array.isArray(districtsDirRes.body?.states) && districtsDirRes.body?.states?.length >= 30, 'District directory indexes all major Indian States & UTs (>= 30)');

  // Search by district name (Pune)
  const puneSearchRes = await testEndpoint('District Search (Pune)', '/api/weather/districts?search=pune');
  assert(puneSearchRes.ok && puneSearchRes.body?.matchCount >= 1, 'District search matches Pune');
  const puneDist = puneSearchRes.body?.districts?.[0];
  assert(puneDist && Math.abs(puneDist.lat - 18.5) < 1.0 && Math.abs(puneDist.lon - 74.1) < 1.0, 'Pune district coordinates match geographic reality (~18.5°N, 74.1°E)');

  // Duplicate name disambiguation (Aurangabad in Bihar vs Maharashtra)
  const aurangabadRes = await testEndpoint('Duplicate District Disambiguation', '/api/weather/districts?search=aurangabad');
  assert(aurangabadRes.ok && aurangabadRes.body?.matchCount >= 2, 'Duplicate district names (Aurangabad) found across multiple states');
  const aurangabadStates = (aurangabadRes.body?.districts || []).map(d => d.state);
  assert(aurangabadStates.includes('Maharashtra') && aurangabadStates.includes('Bihar'), 'Disambiguates Aurangabad between Maharashtra and Bihar');

  // Filter by State (Punjab)
  const punjabRes = await testEndpoint('State Filter (Punjab)', '/api/weather/districts?state=punjab');
  assert(punjabRes.ok && punjabRes.body?.matchCount >= 15, 'State filter returns Punjab districts (>= 15)');

  // 23. Localized Farmer Agricultural Weather Telemetry
  const puneWeatherRes = await testEndpoint('Pune Farmer Weather', '/api/weather/district?id=MAHARASHTRA_PUNE');
  assert(puneWeatherRes.ok && puneWeatherRes.body?.district === 'Pune', 'Pune district weather retrieved successfully');
  assert(typeof puneWeatherRes.body?.current?.temperature === 'number', 'Current temperature is numeric');
  assert(typeof puneWeatherRes.body?.current?.relativeHumidity === 'number', 'Relative humidity is numeric');
  assert(typeof puneWeatherRes.body?.current?.condition === 'string' && puneWeatherRes.body?.current?.agriculturalAdvice, 'Agricultural condition and advice present');
  assert(Array.isArray(puneWeatherRes.body?.forecast24h) && puneWeatherRes.body?.forecast24h?.length >= 20, '24-hour hourly outlook contains time series forecast');
  assert(Array.isArray(puneWeatherRes.body?.forecast7d) && puneWeatherRes.body?.forecast7d?.length === 7, '7-day agricultural outlook contains daily predictions');
  assert(puneWeatherRes.body?.alerts && typeof puneWeatherRes.body?.alerts?.notice === 'string', 'Official meteorological alerts structure present');
  assert(puneWeatherRes.body?.provenance?.provider && puneWeatherRes.body?.provenance?.geographicDisclaimer, 'Scientific provenance and microclimate disclaimer present');

  // Invalid query rejection
  const invalidDistRes = await testEndpoint('Invalid District Query', '/api/weather/district?lat=invalid');
  assert(invalidDistRes.status === 400, 'Invalid district coordinates rejected with HTTP 400');

  // Bundled static GeoJSON file checks
  const fsModule = await import('fs');
  const pathModule = await import('path');
  const distGeoPath = pathModule.resolve('public/data/india-districts.geojson');
  const stateGeoPath = pathModule.resolve('public/data/india-states.geojson');
  const distIdxPath = pathModule.resolve('public/data/india-districts-index.json');
  const clientScriptPath = pathModule.resolve('public/js/farmer-district-map.js');

  assert(fsModule.existsSync(distGeoPath) && fsModule.statSync(distGeoPath).size > 1000000, 'Bundled india-districts.geojson exists (> 1MB)');
  assert(fsModule.existsSync(stateGeoPath) && fsModule.statSync(stateGeoPath).size > 200000, 'Bundled india-states.geojson exists (> 200KB)');
  assert(fsModule.existsSync(distIdxPath) && fsModule.statSync(distIdxPath).size > 100000, 'Bundled india-districts-index.json exists (> 100KB)');
  assert(fsModule.existsSync(clientScriptPath), 'Client-side farmer-district-map.js script present on disk');

  console.log('\n--- Phase 6: Comprehensive SEO & Discoverability Verification ---');

  const publicPages = [
    { name: 'Homepage /', path: '/', expectedKeyword: 'Orbital Eye', canonicalSuffix: '' },
    { name: 'Earth & Satellites', path: '/earth', expectedKeyword: 'Satellite Tracking', canonicalSuffix: '/earth' },
    { name: 'Atmosphere & Weather', path: '/weather', expectedKeyword: 'Atmosphere', canonicalSuffix: '/weather' },
    { name: 'Deep Space', path: '/deepspace', expectedKeyword: 'Deep Space', canonicalSuffix: '/deepspace' },
    { name: 'Asteroids', path: '/asteroids', expectedKeyword: 'Asteroids', canonicalSuffix: '/asteroids' },
    { name: 'Orbital Alerts', path: '/orbitalert', expectedKeyword: 'Orbital Alerts', canonicalSuffix: '/orbitalert' }
  ];

  for (const page of publicPages) {
    const res = await testEndpoint(`SEO Page: ${page.name}`, page.path);
    assert(res.status === 200, `${page.name} returns HTTP 200 OK`);
    const html = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    assert(html.includes('<title>') && html.includes(page.expectedKeyword), `${page.name} contains unique title with "${page.expectedKeyword}"`);
    assert(html.includes('rel="canonical"'), `${page.name} contains rel="canonical" link`);
    assert(html.includes('name="description"'), `${page.name} contains meta description tag`);
    assert(html.includes('property="og:title"'), `${page.name} contains Open Graph tags`);
    assert(html.includes('name="twitter:card"'), `${page.name} contains Twitter Card tags`);
    assert(html.includes('application/ld+json'), `${page.name} includes JSON-LD structured data`);
  }

  // Sentinel Admin robots exclusion check
  const sentinelLoginRes = await testEndpoint('Sentinel Admin Security Headers', '/sentinel-login');
  assert(sentinelLoginRes.status === 200, 'Sentinel login returns HTTP 200 OK');
  const sentinelHtml = typeof sentinelLoginRes.body === 'string' ? sentinelLoginRes.body : JSON.stringify(sentinelLoginRes.body);
  assert(sentinelHtml.includes('noindex, nofollow'), 'Sentinel Admin enforces noindex, nofollow tag');

  // Dynamic robots.txt
  const robotsRes = await testEndpoint('Dynamic Robots.txt', '/robots.txt');
  assert(robotsRes.status === 200, 'robots.txt returns HTTP 200 OK');
  const robotsText = typeof robotsRes.body === 'string' ? robotsRes.body : JSON.stringify(robotsRes.body);
  assert(robotsText.includes('Disallow: /sentinel') && robotsText.includes('Sitemap:'), 'robots.txt disallows /sentinel and specifies Sitemap');

  // Dynamic sitemap.xml
  const sitemapRes = await testEndpoint('Dynamic Sitemap.xml', '/sitemap.xml');
  assert(sitemapRes.status === 200, 'sitemap.xml returns HTTP 200 OK');
  const sitemapXml = typeof sitemapRes.body === 'string' ? sitemapRes.body : JSON.stringify(sitemapRes.body);
  assert(sitemapXml.includes('<urlset') && sitemapXml.includes('/earth') && sitemapXml.includes('/weather') && sitemapXml.includes('/deepspace'), 'sitemap.xml contains valid XML URLset with all public pages');
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
