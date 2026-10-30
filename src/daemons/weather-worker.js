/**
 * GOD'S EYE — WEATHER & ATMOSPHERIC INGESTION DAEMON
 * Periodically ingests RainViewer radar timestamps, NASA GIBS basemap metadata,
 * real active tropical cyclones from NOAA NHC / JTWC, and NASA FIRMS active fire telemetry.
 */

import { providerRegistry } from '../supervisor/registry.js';

let cachedRadarData = null;
let lastRadarFetch = 0;

let cachedCyclones = [];
let lastCyclonesFetch = 0;

let cachedFires = [];
let lastFiresFetch = 0;

const RADAR_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const CYCLONES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const FIRES_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Poll RainViewer API for live Doppler radar and satellite infrared timestamps
 */
export async function fetchRainViewerData() {
  const now = Date.now();
  if (cachedRadarData && (now - lastRadarFetch < RADAR_CACHE_TTL)) {
    return cachedRadarData;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'GodsEye-OrbitalCommand/2.0' }
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`RainViewer HTTP ${res.status}`);
    const data = await res.json();

    cachedRadarData = {
      available: true,
      quality: 'fresh',
      provider: 'RainViewer Global Doppler Radar Mosaic',
      version: data.version || '2.0',
      host: data.host || 'https://tilecache.rainviewer.com',
      generated: data.generated || Math.floor(now / 1000),
      radar: {
        past: (data.radar && Array.isArray(data.radar.past)) ? data.radar.past : [],
        nowcast: (data.radar && Array.isArray(data.radar.nowcast)) ? data.radar.nowcast : []
      },
      satellite: {
        infrared: (data.satellite && Array.isArray(data.satellite.infrared)) ? data.satellite.infrared : []
      },
      updatedAt: new Date().toISOString()
    };
    lastRadarFetch = now;
    providerRegistry.recordSuccess('rainviewer', Date.now() - now);
    return cachedRadarData;
  } catch (err) {
    providerRegistry.recordFailure('rainviewer', err.message);
    if (cachedRadarData) {
      cachedRadarData.quality = 'stale';
      return cachedRadarData;
    }
    return {
      available: false,
      quality: 'unavailable',
      error: `RainViewer radar stream unavailable: ${err.message}`,
      provider: 'RainViewer',
      host: 'https://tilecache.rainviewer.com',
      generated: Math.floor(now / 1000),
      radar: { past: [], nowcast: [] },
      satellite: { infrared: [] },
      updatedAt: new Date().toISOString()
    };
  }
}

/**
 * Helper to categorize tropical cyclone intensity
 */
function classifyCyclone(kts, classification) {
  const k = Number(kts) || 0;
  if (k >= 137) return { catName: 'Category 5 Major Hurricane / Super Typhoon', catNumber: 5, color: '#ef4444' };
  if (k >= 113) return { catName: 'Category 4 Major Hurricane / Super Typhoon', catNumber: 4, color: '#f97316' };
  if (k >= 96) return { catName: 'Category 3 Major Hurricane', catNumber: 3, color: '#fb923c' };
  if (k >= 83) return { catName: 'Category 2 Hurricane / Severe Cyclonic Storm', catNumber: 2, color: '#facc15' };
  if (k >= 64) return { catName: 'Category 1 Hurricane / Cyclonic Storm', catNumber: 1, color: '#eab308' };
  if (k >= 34 || classification === 'TS') return { catName: 'Tropical Storm', catNumber: 0, color: '#38bdf8' };
  return { catName: 'Tropical Depression / Low', catNumber: 0, color: '#94a3b8' };
}

/**
 * Ingest live active tropical cyclones from official NOAA National Hurricane Center (NHC)
 */
export async function fetchActiveCyclones() {
  const now = Date.now();
  if (cachedCyclones.length && (now - lastCyclonesFetch < CYCLONES_CACHE_TTL)) {
    return cachedCyclones;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'GodsEye-OrbitalCommand/2.0' }
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const rawStorms = Array.isArray(data.activeStorms) ? data.activeStorms : [];
      
      const parsed = rawStorms.map(storm => {
        const kts = parseFloat(storm.intensity) || 35;
        const speedKts = parseFloat(storm.movementSpeed) || 10;
        const headingDeg = parseFloat(storm.movementDir) || 0;
        const lat = parseFloat(storm.latitudeNumeric) || 0;
        const lon = parseFloat(storm.longitudeNumeric) || 0;
        const classification = classifyCyclone(kts, storm.classification);

        // Compute estimated track history and 24h-48h projection based on current movement vector
        const toRad = Math.PI / 180;
        const dLat = (speedKts * 1.852 / 111.0) * Math.cos(headingDeg * toRad);
        const dLon = (speedKts * 1.852 / (111.0 * Math.cos(lat * toRad || 1))) * Math.sin(headingDeg * toRad);

        return {
          id: storm.id || `TC-${Date.now()}`,
          name: storm.name ? `Cyclone ${storm.name}` : 'Unnamed System',
          basin: storm.binNumber?.startsWith('EP') ? 'Eastern North Pacific' :
                 storm.binNumber?.startsWith('AL') ? 'North Atlantic' :
                 storm.binNumber?.startsWith('CP') ? 'Central Pacific' : 'Global Ocean',
          agency: 'NOAA National Hurricane Center (NHC)',
          category: classification.catName,
          catNumber: classification.catNumber,
          lat: Number(lat.toFixed(2)),
          lon: Number(lon.toFixed(2)),
          windSpeedKmh: Math.round(kts * 1.852),
          windSpeedKts: Math.round(kts),
          windGustsKmh: Math.round(kts * 2.2),
          centralPressureHpa: parseFloat(storm.pressure) || 1000,
          movementHeadingDeg: Math.round(headingDeg),
          movementSpeedKmh: Math.round(speedKts * 1.852),
          landfallWarning: storm.publicAdvisory?.url ? `Advisory #${storm.publicAdvisory.advNum || 'Active'}: ${storm.publicAdvisory.url}` : 'Official advisory active',
          isDemoSimulation: false,
          lastUpdatedUTC: storm.lastUpdate || new Date().toISOString(),
          history: [
            { lat: Number((lat - dLat * 12).toFixed(2)), lon: Number((lon - dLon * 12).toFixed(2)), time: now - 43200000 },
            { lat: Number((lat - dLat * 6).toFixed(2)), lon: Number((lon - dLon * 6).toFixed(2)), time: now - 21600000 },
            { lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)), time: now }
          ],
          forecastCone: [
            { lat: Number((lat + dLat * 12).toFixed(2)), lon: Number((lon + dLon * 12).toFixed(2)), radiusKm: 75, time: now + 43200000 },
            { lat: Number((lat + dLat * 24).toFixed(2)), lon: Number((lon + dLon * 24).toFixed(2)), radiusKm: 140, time: now + 86400000 },
            { lat: Number((lat + dLat * 48).toFixed(2)), lon: Number((lon + dLon * 48).toFixed(2)), radiusKm: 240, time: now + 172800000 }
          ]
        };
      });

      cachedCyclones = parsed;
      lastCyclonesFetch = now;
      providerRegistry.recordSuccess('noaa_nhc', Date.now() - now);
      return cachedCyclones;
    }
    providerRegistry.recordFailure('noaa_nhc', `HTTP ${res.status}`);
  } catch (err) {
    providerRegistry.recordFailure('noaa_nhc', err.message);
    console.warn('[WeatherWorker] NOAA NHC fetch error:', err.message);
  }

  // If live NOAA fetch returned 0 storms or failed, do NOT return fake live data.
  // Only inject synthetic data if demo simulation is explicitly requested.
  if (process.env.DEMO_WEATHER_DATA === 'true') {
    return [
      {
        id: 'DEMO-SIM-01',
        name: 'Simulation Cyclone Aegis',
        basin: 'Demonstration Test Basin',
        agency: 'Synthetic Telemetry Engine (Demo Mode)',
        category: 'Category 3 Major Hurricane',
        catNumber: 3,
        lat: 18.5,
        lon: 68.2,
        windSpeedKmh: 160,
        windSpeedKts: 86,
        windGustsKmh: 195,
        centralPressureHpa: 965,
        movementHeadingDeg: 315,
        movementSpeedKmh: 18,
        landfallWarning: 'DEMO SIMULATION: Not for operational navigation.',
        isDemoSimulation: true,
        lastUpdatedUTC: new Date().toISOString(),
        history: [],
        forecastCone: []
      }
    ];
  }

  // Honest report: empty array when no storms are tracked
  cachedCyclones = [];
  lastCyclonesFetch = now;
  return cachedCyclones;
}

/**
 * Ingest live NASA FIRMS thermal anomaly / active fire hotspots
 */
export async function fetchFireHotspots() {
  const now = Date.now();
  if (cachedFires.length && (now - lastFiresFetch < FIRES_CACHE_TTL)) {
    return cachedFires;
  }

  const mapKey = process.env.FIRMS_MAP_KEY;
  if (mapKey) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      // Fetch VIIRS global 24h active fires CSV from NASA FIRMS API
      const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${mapKey}/VIIRS_SNPP_NRT/USA/1`;
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);

      if (res.ok) {
        const csv = await res.text();
        const lines = csv.trim().split(/\r?\n/);
        const hotspots = [];
        for (let i = 1; i < Math.min(lines.length, 50); i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 8) {
            hotspots.push({
              id: `FIRMS-${i}`,
              lat: parseFloat(parts[1]),
              lon: parseFloat(parts[2]),
              brightnessK: parseFloat(parts[3]) || 330,
              confidence: parts[8] || 'nominal',
              frpMw: parseFloat(parts[7]) || 150,
              provider: 'NASA FIRMS VIIRS NRT',
              isDemoSimulation: false
            });
          }
        }
        cachedFires = hotspots;
        lastFiresFetch = now;
        return cachedFires;
      }
    } catch (err) {
      console.warn('[WeatherWorker] NASA FIRMS fetch error:', err.message);
    }
  }

  // If FIRMS_MAP_KEY is not set or fetch failed:
  // Only inject synthetic data if demo simulation is explicitly requested.
  if (process.env.DEMO_WEATHER_DATA === 'true') {
    return [
      {
        id: 'DEMO-FR-01',
        lat: -14.23,
        lon: -51.92,
        region: 'Amazon Basin (Simulated Demo)',
        frpMw: 340,
        confidence: 90,
        brightnessK: 350,
        isDemoSimulation: true,
        provider: 'Demonstration Telemetry Engine'
      }
    ];
  }

  // Honest report: empty when live provider key is not configured
  cachedFires = [];
  lastFiresFetch = now;
  return cachedFires;
}

/**
 * Start background ingestion loop
 */
export function startWeatherDaemon() {
  console.log('[Daemon] Starting Real-Time Weather & Atmospheric Ingestion Daemon...');
  fetchRainViewerData().catch(() => {});
  fetchActiveCyclones().catch(() => {});
  fetchFireHotspots().catch(() => {});

  setInterval(() => {
    fetchRainViewerData().catch(() => {});
  }, RADAR_CACHE_TTL);

  setInterval(() => {
    fetchActiveCyclones().catch(() => {});
  }, CYCLONES_CACHE_TTL);

  setInterval(() => {
    fetchFireHotspots().catch(() => {});
  }, FIRES_CACHE_TTL);
}
