/**
 * God's Eye Space Observatory Service Worker
 * Version: 4.0.0 (Update 4 Hardened PWA)
 * 
 * Rules:
 * 1. Cache application shell and static visualizers for offline access.
 * 2. NEVER cache protected administrative routes (/sentinel, /sentinel-login, /api/sentinel/*).
 * 3. NEVER represent stale or offline cached orbital telemetry as current live data.
 * 4. Gracefully fall back to offline.html when network is unreachable.
 */

const CACHE_NAME = 'godseye-core-v5.1.0';
const DATA_CACHE_NAME = 'godseye-data-v5.1.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/earth',
  '/earth.html',
  '/weather',
  '/weather.html',
  '/airquality',
  '/airquality.html',
  '/deepspace',
  '/deepspace.html',
  '/asteroids',
  '/asteroids.html',
  '/orbitalert',
  '/orbitalert.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
  '/js/resilient-client.js',
  '/js/user-preferences.js',
  '/js/status-manager.js',
  '/js/pwa-manager.js',
  '/js/scientific-workspace.js',
  '/js/farmer-district-map.js',
  '/js/jarvis.js',
  '/js/universal_location_alerts.js',
  '/data/india-districts-index.json',
  '/data/india-states.geojson'
];

// Admin and sensitive paths that MUST NEVER be cached
const PROTECTED_PATHS = [
  '/sentinel',
  '/sentinel.html',
  '/sentinel-login',
  '/sentinel-login.html',
  '/api/sentinel'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW Precache Warning]', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[SW Activate] Purging obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never intercept or cache non-GET requests
  if (req.method !== 'GET') return;

  // 2. Never intercept protected administrator or auth routes
  if (PROTECTED_PATHS.some(p => url.pathname.startsWith(p))) {
    return;
  }

  // 3. Never intercept real-time streaming connections (SSE / WebSocket)
  if (url.pathname.includes('/stream') || req.headers.get('accept') === 'text/event-stream') {
    return;
  }

  // 4. Handle Navigation Requests (HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          // If valid response, update cache
          if (networkRes.ok) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Offline fallback
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;
          const offlineFallback = await caches.match('/offline.html');
          return offlineFallback || new Response('Offline. Telemetry stream disconnected.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // 5. Handle Read-Only API Requests with Honest Cache Annotations
  if (url.pathname.startsWith('/api/')) {
    // Only attempt cache for safe idempotent endpoints
    const cacheableEndpoints = ['/api/catalog/search', '/api/catalog/facets', '/api/sources', '/api/space/ground-stations'];
    const isCacheableApi = cacheableEndpoints.some(p => url.pathname.startsWith(p));

    if (!isCacheableApi) {
      // Dynamic live telemetry: Network only. NEVER present stale telemetry as live.
      return;
    }

    event.respondWith(
      fetch(req)
        .then(async (res) => {
          if (res.ok) {
            const cache = await caches.open(DATA_CACHE_NAME);
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) {
            // Annotate cached response with explicit offline notice headers
            const body = await cached.text();
            try {
              const parsed = JSON.parse(body);
              parsed._isOfflineCached = true;
              parsed._cachedAt = new Date().toISOString();
              parsed._offlineWarning = 'Offline cached record: not verified against live constellation ephemeris.';
              return new Response(JSON.stringify(parsed), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'X-GodsEye-Cache-State': 'STALE_OFFLINE'
                }
              });
            } catch (_) {
              return cached;
            }
          }
          return new Response(JSON.stringify({ error: 'Endpoint unreachable while offline.', offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 6. Handle Static Assets (Stale-While-Revalidate)
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cachedRes);

      return cachedRes || fetchPromise;
    })
  );
});
