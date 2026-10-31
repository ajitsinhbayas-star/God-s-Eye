/**
 * Navigation, Cards, Buttons, and Routing Verification Suite
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function fetchEndpoint(urlPath, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, BASE_URL);
    const req = http.request(fullUrl, { method, headers }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          location: res.headers['location'],
          body
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTestSuite() {
  console.log('========================================================');
  console.log('ORBITAL EYE — NAVIGATION, BUTTONS & ROUTING AUDIT SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;
  const auditMatrix = [];

  function record(sourcePage, element, expected, actual, isPass, detail = '') {
    const status = isPass ? 'PASS' : 'FAIL';
    if (isPass) {
      console.log(`[PASS] ${sourcePage} | ${element} -> ${actual} ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${sourcePage} | ${element} -> Expected: ${expected}, Got: ${actual} ${detail}`);
      failed++;
    }
    auditMatrix.push({ sourcePage, element, expected, actual, status });
  }

  // --- 1. HOMEPAGE FEATURE CARDS AUDIT ---
  console.log('\n--- 1. Homepage Feature Cards Audit ---');
  const indexHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

  const cardTests = [
    { name: 'Solar System Explorer card', expected: '/solar-system', pattern: /<a\s+[^>]*?href=["'](\/solar-system)["'][^>]*?class=["'][^"']*card-glass[^"']*["'][\s\S]*?Solar System Explorer/ },
    { name: 'Earth & Satellite Tracking card', expected: '/earth', pattern: /<a\s+[^>]*?href=["'](\/earth)["'][^>]*?class=["'][^"']*card-glass[^"']*["'][\s\S]*?Earth &amp; Satellite Tracking/ },
    { name: 'Deep Space Explorer card', expected: '/deepspace', pattern: /<a\s+[^>]*?href=["'](\/deepspace)["'][^>]*?class=["'][^"']*card-glass[^"']*["'][\s\S]*?Deep Space Explorer/ },
    { name: 'Asteroid Tracker card', expected: '/asteroids', pattern: /<a\s+[^>]*?href=["'](\/asteroids)["'][^>]*?class=["'][^"']*card-glass[^"']*["'][\s\S]*?Asteroid Tracker/ },
    { name: 'KisanMitra & Weather card', expected: '/kisanmitra', pattern: /<a\s+[^>]*?href=["'](\/kisanmitra)["'][^>]*?class=["'][^"']*card-glass[^"']*["'][\s\S]*?KisanMitra &amp; Weather/ },
    { name: 'Air Quality Observatory card', expected: '/air-quality', pattern: /<a\s+[^>]*?href=["'](\/air-quality)["'][^>]*?class=["'][^"']*card-glass[^"']*["'][\s\S]*?Air Quality Observatory/ },
    { name: 'Alert card', expected: '/alert', pattern: /<a\s+[^>]*?href=["'](\/alert)["'][^>]*?class=["'][^"']*card-glass[^"']*["'][\s\S]*?Alert/ }
  ];

  for (const c of cardTests) {
    const match = indexHtml.match(c.pattern);
    const actual = match ? match[1] : '(not found)';
    record('Home', c.name, c.expected, actual, actual === c.expected);
  }

  // Hero Action Buttons
  const heroButtons = [
    { name: 'Hero Kisan District Weather & Radar button', expected: '/kisanmitra', match: indexHtml.includes('href="/kisanmitra" class="px-5 py-2.5 rounded-xl bg-cyan-500') },
    { name: 'Hero Launch 3D Solar System button', expected: '/solar-system', match: indexHtml.includes('href="/solar-system" class="px-5 py-2.5 rounded-xl bg-slate-900') },
    { name: 'Hero CPCB Air Quality Map button', expected: '/air-quality', match: indexHtml.includes('href="/air-quality" class="px-5 py-2.5 rounded-xl bg-slate-900') }
  ];
  for (const b of heroButtons) {
    record('Home', b.name, b.expected, b.match ? b.expected : 'FAIL', b.match);
  }

  // --- 2. GLOBAL NAVIGATION RIBBON ACROSS ALL 8 PAGES ---
  console.log('\n--- 2. Global Navigation Ribbon Destinations ---');
  const allPages = [
    'index.html', 'solar-system.html', 'earth.html', 'deep-space.html',
    'asteroids.html', 'kisanmitra.html', 'air-quality.html', 'alert.html'
  ];

  const requiredNavItems = [
    { label: 'Home', path: '/' },
    { label: 'Solar System', path: '/solar-system' },
    { label: 'Earth', path: '/earth' },
    { label: 'Deep Space', path: '/deepspace' },
    { label: 'Asteroids', path: '/asteroids' },
    { label: 'KisanMitra', path: '/kisanmitra' },
    { label: 'Air Quality', path: '/air-quality' },
    { label: 'Alert', path: '/alert' }
  ];

  for (const page of allPages) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, page), 'utf8');
    for (const nav of requiredNavItems) {
      const hasNav = html.includes(`href="${nav.path}"`) && html.includes(nav.label);
      record(page, `Nav Ribbon -> ${nav.label}`, nav.path, hasNav ? nav.path : 'MISSING', hasNav);
    }
  }

  // --- 3. CANONICAL EXPRESS ROUTING & HTML SERVING ---
  console.log('\n--- 3. Canonical Express Route Verification ---');
  const routesToTest = [
    { url: '/', fileKeyword: 'Planetary Intelligence Platform', expectedFile: 'index.html' },
    { url: '/solar-system', fileKeyword: 'Keplerian', expectedFile: 'solar-system.html' },
    { url: '/earth', fileKeyword: 'SGP4', expectedFile: 'earth.html' },
    { url: '/deepspace', fileKeyword: 'Cosmic Microwave Background', expectedFile: 'deep-space.html' },
    { url: '/asteroids', fileKeyword: 'Planetary Defense', expectedFile: 'asteroids.html' },
    { url: '/kisanmitra', fileKeyword: 'Kisan District Map', expectedFile: 'kisanmitra.html' },
    { url: '/air-quality', fileKeyword: 'CPCB NAQI', expectedFile: 'air-quality.html' },
    { url: '/alert', fileKeyword: 'TOPOCENTRIC RADAR', expectedFile: 'alert.html' }
  ];

  for (const r of routesToTest) {
    try {
      const res = await fetchEndpoint(r.url);
      const is200 = res.status === 200;
      const servesCorrectContent = res.body.includes(r.fileKeyword);
      record('Express Server', `Direct GET ${r.url}`, `200 OK (${r.expectedFile})`, `${res.status} (${servesCorrectContent ? r.expectedFile : 'WRONG FILE'})`, is200 && servesCorrectContent);
    } catch (e) {
      record('Express Server', `Direct GET ${r.url}`, `200 OK`, `Error: ${e.message}`, false);
    }
  }

  // --- 4. BACKWARD-COMPATIBLE 301 REDIRECTS ---
  console.log('\n--- 4. Backward-Compatible 301 Redirects ---');
  const redirectsToTest = [
    { url: '/index.html', expected: '/' },
    { url: '/atmosphere', expected: '/kisanmitra' },
    { url: '/atmosphere/', expected: '/kisanmitra' },
    { url: '/atmosphere.html', expected: '/kisanmitra' },
    { url: '/weather', expected: '/kisanmitra' },
    { url: '/weather.html', expected: '/kisanmitra' },
    { url: '/kisanmitra.html', expected: '/kisanmitra' },
    { url: '/orbitalert', expected: '/alert' },
    { url: '/orbitalert.html', expected: '/alert' },
    { url: '/orbital-alerts', expected: '/alert' },
    { url: '/airquality', expected: '/air-quality' },
    { url: '/airquality.html', expected: '/air-quality' },
    { url: '/deepspace.html', expected: '/deepspace' },
    { url: '/deep-space', expected: '/deepspace' },
    { url: '/solar-system.html', expected: '/solar-system' },
    { url: '/earth.html', expected: '/earth' },
    { url: '/asteroids.html', expected: '/asteroids' }
  ];

  for (const r of redirectsToTest) {
    try {
      const res = await fetchEndpoint(r.url);
      const is301 = res.status === 301;
      const targetMatches = res.location === r.expected;
      record('Express Redirects', `Redirect ${r.url}`, `301 -> ${r.expected}`, `${res.status} -> ${res.location}`, is301 && targetMatches);
    } catch (e) {
      record('Express Redirects', `Redirect ${r.url}`, `301 -> ${r.expected}`, `Error: ${e.message}`, false);
    }
  }

  // --- 5. 404 INTEGRITY & NO SILENT FALLTHROUGH ---
  console.log('\n--- 5. 404 Integrity Checks ---');
  try {
    const notFoundHtmlRes = await fetchEndpoint('/non-existent-trajectory-page', 'GET', { 'Accept': 'text/html' });
    const is404 = notFoundHtmlRes.status === 404;
    const serves404Html = notFoundHtmlRes.body.includes('Orbital Trajectory Lost') && notFoundHtmlRes.body.includes('404');
    record('Express 404', 'Unknown route GET /non-existent-trajectory-page', 'HTTP 404 with 404.html', `${notFoundHtmlRes.status} (${serves404Html ? '404.html served' : 'Fallback served'})`, is404 && serves404Html);

    const notFoundApiRes = await fetchEndpoint('/api/non-existent-endpoint', 'GET', { 'Accept': 'application/json' });
    const isApi404 = notFoundApiRes.status === 404;
    const isJson = notFoundApiRes.headers['content-type']?.includes('application/json');
    record('Express 404', 'Unknown API route GET /api/non-existent-endpoint', 'HTTP 404 JSON', `${notFoundApiRes.status} (JSON=${isJson})`, isApi404 && isJson);
  } catch (e) {
    record('Express 404', '404 Verification', 'HTTP 404', `Error: ${e.message}`, false);
  }

  // --- 6. ALERT.HTML 3D RADAR BUTTONS VERIFICATION ---
  console.log('\n--- 6. Alert.html Spacecraft & Celestial Orbit Buttons ---');
  const alertHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'alert.html'), 'utf8');
  const radarChecks = [
    { name: 'Voyager 1 radar button', target: '/solar-system#/sc_voyager_1', present: alertHtml.includes('href="/solar-system#/sc_voyager_1"') },
    { name: 'James Webb radar button', target: '/solar-system#/jwst', present: alertHtml.includes('href="/solar-system#/jwst"') },
    { name: 'Perseverance radar button', target: '/solar-system#/perseverance', present: alertHtml.includes('href="/solar-system#/perseverance"') },
    { name: 'ESA JUICE radar button', target: '/solar-system#/juice', present: alertHtml.includes('href="/solar-system#/juice"') },
    { name: 'Aditya-L1 radar button', target: '/solar-system#/aditya_l1', present: alertHtml.includes('href="/solar-system#/aditya_l1"') },
    { name: 'Europa Clipper radar button', target: '/solar-system#/europa_clipper', present: alertHtml.includes('href="/solar-system#/europa_clipper"') },
    { name: 'Bennu asteroid radar button', target: '/asteroids#/bennu', present: alertHtml.includes('href="/asteroids#/bennu"') },
    { name: 'Apophis asteroid radar button', target: '/asteroids#/apophis', present: alertHtml.includes('href="/asteroids#/apophis"') },
    { name: 'Planets table 3D orbit generator', target: '/solar-system#/', present: alertHtml.includes('/solar-system#/') }
  ];

  for (const rc of radarChecks) {
    record('Alert Page', rc.name, rc.target, rc.present ? rc.target : 'INCORRECT DESTINATION', rc.present);
  }

  // --- 7. J.A.R.V.I.S. NAVIGATION AUDIT ---
  console.log('\n--- 7. J.A.R.V.I.S. Navigation Actions Audit ---');
  const jarvisCode = fs.readFileSync(path.join(PUBLIC_DIR, 'js', 'jarvis.js'), 'utf8');

  const jarvisTests = [
    { cmd: 'Open home', matches: jarvisCode.includes("NAV_HOME") },
    { cmd: 'Open solar system', matches: jarvisCode.includes("NAV_SOLAR") },
    { cmd: 'Open Earth', matches: jarvisCode.includes("NAV_EARTH") },
    { cmd: 'Open satellite tracking', matches: jarvisCode.includes("NAV_EARTH") },
    { cmd: 'Open deep space', matches: jarvisCode.includes("NAV_DEEPSPACE") },
    { cmd: 'Open asteroids', matches: jarvisCode.includes("NAV_ASTEROIDS") },
    { cmd: 'Open kisanmitra', matches: jarvisCode.includes("NAV_KISANMITRA") },
    { cmd: 'Open atmosphere', matches: jarvisCode.includes("NAV_ATMOSPHERE") },
    { cmd: 'Open air quality', matches: jarvisCode.includes("NAV_AIRQUALITY") },
    { cmd: 'Open alerts', matches: jarvisCode.includes("NAV_ALERT") },
    { cmd: 'FOCUS_ISS navigates to /earth when on Home', matches: jarvisCode.includes("case 'FOCUS_ISS':") && jarvisCode.includes("if (!window.location.pathname.includes('earth'))") }
  ];

  for (const jt of jarvisTests) {
    record('J.A.R.V.I.S.', `Command "${jt.cmd}"`, 'Valid Handler & Target', jt.matches ? 'PASS' : 'FAIL', jt.matches);
  }

  // --- 8. FILE PROTOCOL NORMALIZER ON ALL PAGES ---
  console.log('\n--- 8. Universal Link Normalizer on All 8 Pages ---');
  for (const p of allPages) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, p), 'utf8');
    const hasUniversal = html.includes("document.querySelectorAll('a[href]').forEach(function(a)");
    record(p, 'Universal a[href] remapper', 'Remaps all anchors on file: and web', hasUniversal ? 'Active' : 'Missing', hasUniversal);
  }

  // Summary
  console.log('\n========================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  // Save audit matrix to JSON for reporting
  fs.writeFileSync(path.join(__dirname, 'navigation-audit-matrix.json'), JSON.stringify(auditMatrix, null, 2), 'utf8');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Audit suite error:', err);
  process.exit(1);
});
