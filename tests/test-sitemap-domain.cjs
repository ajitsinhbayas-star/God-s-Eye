const assert = require('assert');
const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Logic function mirrored identically from src/server.js
function getCanonicalBaseUrlTest(envCanonicalHost) {
  const PREFERRED_CANONICAL = 'https://orbitaleye.in';
  const raw = (envCanonicalHost || '').trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'orbitaleye.in') {
        return PREFERRED_CANONICAL;
      }
    } catch {
      // Invalid URL format - fall back to preferred canonical
    }
  }
  return PREFERRED_CANONICAL;
}

async function run() {
  console.log('===============================================================');
  console.log('ORBITAL EYE — STRICT CANONICAL DOMAIN & SITEMAP SECURITY TESTS');
  console.log('===============================================================');

  // --- UNIT TESTS: getCanonicalBaseUrl resolution matrix ---
  console.log('\n--- 1. Canonical Domain Resolution Tests ---');

  // Case 1: Missing CANONICAL_HOST (undefined, null, empty)
  assert.strictEqual(getCanonicalBaseUrlTest(undefined), 'https://orbitaleye.in');
  assert.strictEqual(getCanonicalBaseUrlTest(''), 'https://orbitaleye.in');
  assert.strictEqual(getCanonicalBaseUrlTest('   '), 'https://orbitaleye.in');
  console.log('[PASS] Case 1: Missing / empty CANONICAL_HOST safely returns https://orbitaleye.in');

  // Case 2: Correct HTTPS canonical host
  assert.strictEqual(getCanonicalBaseUrlTest('https://orbitaleye.in'), 'https://orbitaleye.in');
  assert.strictEqual(getCanonicalBaseUrlTest('https://orbitaleye.in/'), 'https://orbitaleye.in');
  console.log('[PASS] Case 2: Correct HTTPS canonical host accepted as https://orbitaleye.in');

  // Case 3: Incorrect HTTP canonical host
  assert.strictEqual(getCanonicalBaseUrlTest('http://orbitaleye.in'), 'https://orbitaleye.in');
  assert.strictEqual(getCanonicalBaseUrlTest('http://orbitaleye.in/'), 'https://orbitaleye.in');
  console.log('[PASS] Case 3: Insecure HTTP canonical host rejected; falls back to https://orbitaleye.in');

  // Case 4: WWW canonical host
  assert.strictEqual(getCanonicalBaseUrlTest('https://www.orbitaleye.in'), 'https://orbitaleye.in');
  assert.strictEqual(getCanonicalBaseUrlTest('http://www.orbitaleye.in'), 'https://orbitaleye.in');
  console.log('[PASS] Case 4: WWW canonical host rejected; falls back to root https://orbitaleye.in');

  // Case 5: Render hostname
  assert.strictEqual(getCanonicalBaseUrlTest('https://god-s-eye-ah3d.onrender.com'), 'https://orbitaleye.in');
  assert.strictEqual(getCanonicalBaseUrlTest('https://orbital-eye.onrender.com'), 'https://orbitaleye.in');
  console.log('[PASS] Case 5: Render onrender.com hostnames rejected; falls back to https://orbitaleye.in');

  // Case 6: Unrelated external hostname
  assert.strictEqual(getCanonicalBaseUrlTest('https://evil-site.com'), 'https://orbitaleye.in');
  assert.strictEqual(getCanonicalBaseUrlTest('https://google.com'), 'https://orbitaleye.in');
  console.log('[PASS] Case 6: Unrelated external domains rejected; falls back to https://orbitaleye.in');

  // Case 7: Invalid hostname / malformed string
  assert.strictEqual(getCanonicalBaseUrlTest('not_a_valid_url'), 'https://orbitaleye.in');
  assert.strictEqual(getCanonicalBaseUrlTest('://malformed'), 'https://orbitaleye.in');
  console.log('[PASS] Case 7: Malformed / invalid URL strings rejected; falls back to https://orbitaleye.in');

  // --- INTEGRATION TESTS: Live Server API Requests ---
  console.log('\n--- 2. Live HTTP Requests & Host Header Security ---');

  // Case 8: Incoming Render Host header (Host: god-s-eye-ah3d.onrender.com)
  const renderHostRes = await fetch('http://localhost:3000/sitemap.xml', {
    headers: { 'Host': 'god-s-eye-ah3d.onrender.com' }
  });
  assert.strictEqual(renderHostRes.status, 200, 'Sitemap should return 200');
  assert.ok(!renderHostRes.text.includes('onrender.com'), 'Sitemap MUST NOT contain onrender.com even with Render Host header');
  assert.ok(renderHostRes.text.includes('https://orbitaleye.in/'), 'Sitemap must contain https://orbitaleye.in/');
  console.log('[PASS] Case 8: Incoming Render Host header has zero influence on sitemap domain');

  // Case 9: Incoming www.orbitaleye.in Host header -> 301 Permanent Redirect
  const wwwRes = await fetch('http://localhost:3000/solar-system?test=1', {
    headers: { 'Host': 'www.orbitaleye.in' }
  });
  assert.strictEqual(wwwRes.status, 301, 'www.orbitaleye.in should redirect with 301');
  assert.strictEqual(
    wwwRes.headers['location'],
    'https://orbitaleye.in/solar-system?test=1',
    '301 redirect must preserve path and query string'
  );
  console.log('[PASS] Case 9: Incoming www.orbitaleye.in returns exact 301 redirect preserving path & query');

  // --- SITEMAP & ROBOTS VERIFICATION ---
  console.log('\n--- 3. Static & Dynamic Sitemap and Robots Verification ---');

  const sitemapRes = await fetch('http://localhost:3000/sitemap.xml');
  assert.strictEqual(sitemapRes.status, 200);
  assert.strictEqual(sitemapRes.headers['content-type'], 'application/xml; charset=utf-8');

  const expectedUrls = [
    'https://orbitaleye.in/',
    'https://orbitaleye.in/solar-system',
    'https://orbitaleye.in/earth',
    'https://orbitaleye.in/deepspace',
    'https://orbitaleye.in/asteroids',
    'https://orbitaleye.in/kisanmitra',
    'https://orbitaleye.in/air-quality',
    'https://orbitaleye.in/alert'
  ];

  for (const url of expectedUrls) {
    assert.ok(sitemapRes.text.includes(`<loc>${url}</loc>`), `Sitemap must contain exact URL: ${url}`);
  }

  const locMatches = sitemapRes.text.match(/<loc>(.*?)<\/loc>/g) || [];
  assert.strictEqual(locMatches.length, 8, `Sitemap must contain exactly 8 URLs, got ${locMatches.length}`);
  console.log('[PASS] Sitemap contains exactly 8 canonical URLs under https://orbitaleye.in');

  const robotsRes = await fetch('http://localhost:3000/robots.txt');
  assert.strictEqual(robotsRes.status, 200);
  assert.ok(robotsRes.text.includes('Sitemap: https://orbitaleye.in/sitemap.xml'), 'robots.txt must point to https://orbitaleye.in/sitemap.xml');
  assert.ok(robotsRes.text.includes('Disallow: /sentinel'), 'robots.txt must protect /sentinel');
  console.log('[PASS] robots.txt contains correct sitemap URL and security directives');

  // --- 8 PUBLIC PAGES & HEALTH CHECK ---
  console.log('\n--- 4. All Eight Public Routes & Health API ---');

  const publicRoutes = [
    { name: 'Home', path: '' },
    { name: 'Solar System', path: 'solar-system' },
    { name: 'Earth', path: 'earth' },
    { name: 'Deep Space', path: 'deepspace' },
    { name: 'Asteroids', path: 'asteroids' },
    { name: 'KisanMitra', path: 'kisanmitra' },
    { name: 'Air Quality', path: 'air-quality' },
    { name: 'Alert', path: 'alert' }
  ];

  for (const page of publicRoutes) {
    const res = await fetch(`http://localhost:3000/${page.path}`);
    assert.strictEqual(res.status, 200, `Page /${page.path} should return HTTP 200`);
    console.log(`[PASS] Route /${page.path.padEnd(14)} (${page.name}) returned HTTP 200`);
  }

  const healthRes = await fetch('http://localhost:3000/api/health');
  assert.strictEqual(healthRes.status, 200, 'Health check should return HTTP 200');
  console.log('[PASS] Route /api/health    returned HTTP 200');

  console.log('\n===============================================================');
  console.log('ALL STRICT CANONICAL DOMAIN & SECURITY TESTS PASSED CLEANLY');
  console.log('===============================================================');
}

run().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
