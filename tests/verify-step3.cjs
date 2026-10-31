/**
 * Step 3 Verification Suite
 * Tests Security, Privacy, Sentinel, Mobile Readiness, Navigation Ribbon,
 * Back to Top button, and Created by Mr. Singh footer credit across all 8 pages.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const REQUIRED_PAGES = [
  'index.html',
  'solar-system.html',
  'earth.html',
  'deep-space.html',
  'asteroids.html',
  'kisanmitra.html',
  'air-quality.html',
  'alert.html'
];

function fetchEndpoint(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, BASE_URL);
    const req = http.request(fullUrl, { method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function postEndpoint(urlPath, payload = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, BASE_URL);
    const bodyStr = JSON.stringify(payload);
    const req = http.request(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function runStep3Checks() {
  console.log('========================================================');
  console.log('ORBITAL EYE — STEP 3 VALIDATION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // --- SECTION 1: PUBLIC PAGES, FOOTERS & BACK TO TOP ---
  console.log('\n--- Section 1: HTML Architecture, Footer & Back to Top ---');
  for (const pageName of REQUIRED_PAGES) {
    const filePath = path.join(PUBLIC_DIR, pageName);
    assert(fs.existsSync(filePath), `File exists on disk: public/${pageName}`);

    const html = fs.readFileSync(filePath, 'utf8');

    // 1. Navigation ribbon
    assert(html.includes('id="orbital-nav-ribbon"'), `${pageName} has #orbital-nav-ribbon navigation`);
    assert(html.includes('data-nav="home"'), `${pageName} nav ribbon includes Home`);
    assert(html.includes('data-nav="solar-system"'), `${pageName} nav ribbon includes Solar System`);
    assert(html.includes('data-nav="earth"'), `${pageName} nav ribbon includes Earth`);
    assert(html.includes('data-nav="deepspace"'), `${pageName} nav ribbon includes Deep Space`);
    assert(html.includes('data-nav="asteroids"'), `${pageName} nav ribbon includes Asteroids`);
    assert(html.includes('data-nav="kisanmitra"'), `${pageName} nav ribbon includes KisanMitra`);
    assert(html.includes('data-nav="air-quality"'), `${pageName} nav ribbon includes Air Quality`);
    assert(html.includes('data-nav="alert"'), `${pageName} nav ribbon includes Alert`);

    // 2. Viewport meta tag for mobile responsiveness
    assert(
      html.includes('name="viewport"') && html.includes('width=device-width'),
      `${pageName} contains responsive viewport meta tag`
    );

    // 3. Back to Top button
    const hasBackToTop = html.includes('Back to Top') || html.includes('btn-back-to-top') || html.includes('scrollToOrbitalTop');
    assert(hasBackToTop, `${pageName} includes Back to Top button`);

    // 4. Exact Created by Mr. Singh footer credit
    const matchesSingh = (html.match(/Created by Mr\. Singh/g) || []).length;
    assert(matchesSingh >= 1, `${pageName} has 'Created by Mr. Singh' footer credit (found ${matchesSingh})`);

    // 5. File protocol link translator
    assert(
      html.includes("window.location.protocol==='file:'") || html.includes("protocol === 'file:'"),
      `${pageName} includes client-side file:/// protocol link translation`
    );
  }

  // --- SECTION 2: SECURITY HEADERS & ACCESS CONTROLS ---
  console.log('\n--- Section 2: Security Headers & Access Controls ---');
  try {
    const rootRes = await fetchEndpoint('/');
    assert(rootRes.status === 200, 'GET / returns 200 OK');

    const headers = rootRes.headers;
    assert(!!headers['content-security-policy'], 'Content-Security-Policy header is present');
    assert(
      headers['content-security-policy']?.includes("default-src 'self'"),
      'CSP enforces default-src \'self\''
    );
    assert(
      headers['x-frame-options'] === 'DENY' || headers['x-frame-options'] === 'SAMEORIGIN',
      `X-Frame-Options is properly configured: ${headers['x-frame-options']}`
    );
    assert(
      headers['x-content-type-options'] === 'nosniff',
      'X-Content-Type-Options is nosniff'
    );
    const httpsRes = await fetchEndpoint('/', { 'x-forwarded-proto': 'https' });
    assert(
      httpsRes.headers['strict-transport-security']?.includes('max-age'),
      'Strict-Transport-Security (HSTS) is active when HTTPS / forwarded proto is present'
    );
    assert(
      !!headers['permissions-policy'],
      'Permissions-Policy header is present'
    );

    // Test secret leakage protection (.env)
    const envRes = await fetchEndpoint('/.env');
    assert(envRes.status === 404, 'Direct request to /.env returns HTTP 404');

    // Test unauthenticated Sentinel route protection
    const unauthSentinel = await fetchEndpoint('/sentinel');
    assert(
      unauthSentinel.status === 302 || unauthSentinel.status === 401,
      `Unauthenticated /sentinel redirected or challenged (${unauthSentinel.status})`
    );

    const unauthWorkers = await fetchEndpoint('/api/sentinel/workers');
    assert(unauthWorkers.status === 401, 'Unauthenticated /api/sentinel/workers returns 401');

  } catch (err) {
    assert(false, `Security endpoints verification failed: ${err.message}`);
  }

  // --- SECTION 3: SENTINEL ADMIN CONSOLE REDESIGN ---
  console.log('\n--- Section 3: Sentinel Admin Console & Endpoints ---');
  try {
    const sentinelHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'sentinel.html'), 'utf8');
    assert(sentinelHtml.includes('SENTINEL'), 'sentinel.html contains Sentinel branding');
    assert(sentinelHtml.includes('Created by Mr. Singh'), 'sentinel.html includes Created by Mr. Singh footer');
    assert(sentinelHtml.includes('id="tab-btn-overview"'), 'sentinel.html includes Operations Overview tab');
    assert(sentinelHtml.includes('id="tab-btn-workers"'), 'sentinel.html includes Automated Workers tab');
    assert(sentinelHtml.includes('id="tab-btn-providers"'), 'sentinel.html includes Data Providers tab');
    assert(sentinelHtml.includes('id="tab-btn-quality"'), 'sentinel.html includes Data Quality tab');
    assert(sentinelHtml.includes('id="tab-btn-incidents"'), 'sentinel.html includes Incident Ledger tab');
    assert(sentinelHtml.includes('id="tab-btn-config"'), 'sentinel.html includes System Config tab');

    // Test Admin Login and Sentinel APIs
    const loginRes = await postEndpoint('/api/sentinel/login', {
      username: 'Ajitsinh96',
      password: 'Ajitsinh@#9699'
    });

    assert(loginRes.status === 200, 'POST /api/sentinel/login returns 200 OK');
    const setCookie = loginRes.headers['set-cookie'] || [];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : String(setCookie).split(';')[0];

    const authHeaders = { Cookie: cookieHeader };

    const sourcesRes = await fetchEndpoint('/api/sentinel/sources', authHeaders);
    assert(sourcesRes.status === 200, 'Authenticated GET /api/sentinel/sources returns 200 OK');
    const sourcesData = JSON.parse(sourcesRes.body);
    assert(Array.isArray(sourcesData.sources) && sourcesData.sources.length >= 10, `Sentinel registry reports ${sourcesData.sources?.length} data sources`);

    const workersRes = await fetchEndpoint('/api/sentinel/workers', authHeaders);
    assert(workersRes.status === 200, 'Authenticated GET /api/sentinel/workers returns 200 OK');
    const workersData = JSON.parse(workersRes.body);
    assert(Array.isArray(workersData.workers) && workersData.workers.length >= 5, `Sentinel reports ${workersData.workers?.length} cadence workers`);

    const healthRes = await fetchEndpoint('/api/sentinel/health', authHeaders);
    assert(healthRes.status === 200, 'Authenticated GET /api/sentinel/health returns 200 OK');

    const qualityRes = await fetchEndpoint('/api/sentinel/quality', authHeaders);
    assert(qualityRes.status === 200, 'Authenticated GET /api/sentinel/quality returns 200 OK');

    const incidentsRes = await fetchEndpoint('/api/sentinel/incidents', authHeaders);
    assert(incidentsRes.status === 200, 'Authenticated GET /api/sentinel/incidents returns 200 OK');

  } catch (err) {
    assert(false, `Sentinel verification failed: ${err.message}`);
  }

  // --- SECTION 4: BACKWARD COMPATIBLE REDIRECTS ---
  console.log('\n--- Section 4: Backward-Compatible Legacy Redirects ---');
  try {
    const weatherRedirect = await fetchEndpoint('/weather');
    assert(weatherRedirect.status === 301, 'Legacy /weather issues 301 redirect');

    const weatherHtmlRedirect = await fetchEndpoint('/weather.html');
    assert(weatherHtmlRedirect.status === 301, 'Legacy /weather.html issues 301 redirect');

    const orbitalertRedirect = await fetchEndpoint('/orbitalert');
    assert(orbitalertRedirect.status === 301, 'Legacy /orbitalert issues 301 redirect');

    const airqualityRedirect = await fetchEndpoint('/airquality');
    assert(airqualityRedirect.status === 301, 'Legacy /airquality issues 301 redirect');

    const deepspaceRedirect = await fetchEndpoint('/deepspace.html');
    assert(deepspaceRedirect.status === 301, 'Legacy /deepspace.html issues 301 redirect');

  } catch (err) {
    assert(false, `Redirects check failed: ${err.message}`);
  }

  // --- SUMMARY ---
  console.log('\n========================================================');
  console.log(`STEP 3 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep3Checks().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
