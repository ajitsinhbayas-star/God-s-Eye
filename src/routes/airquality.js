/**
 * GOD'S EYE — AIR QUALITY & CPCB OBSERVATORY API ROUTER
 * Endpoints for live Indian National AQI (CPCB 6-tier NAQI), pollutant metrics,
 * CAAQMS stations network, city rankings, hourly forecasts, and health advisories.
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchAirQualityCoordinates,
  getAllStationReadings,
  getAirQualityRankings,
  CAAQMS_STATIONS
} from '../daemons/airquality-worker.js';
import { providerRegistry } from '../supervisor/registry.js';
import { adapterRegistry } from '../adapters/index.js';

export const airQualityRouter = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy district index loader
let districtsIndexCache = null;
function getDistrictsIndex() {
  if (districtsIndexCache) return districtsIndexCache;
  const candidates = [
    path.resolve(process.cwd(), 'public/data/india-districts-index.json'),
    path.resolve(__dirname, '../../public/data/india-districts-index.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        districtsIndexCache = JSON.parse(fs.readFileSync(p, 'utf8'));
        return districtsIndexCache;
      } catch (_) {}
    }
  }
  return { districts: [] };
}

// GET /api/airquality/station — Live coordinates AQI, pollutants & forecasts
airQualityRouter.get('/station', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const name = String(req.query.name || req.query.district || 'Location').trim();
  const state = String(req.query.state || 'India').trim();

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid request: specify numeric latitude and longitude coordinates.'
    });
  }

  try {
    const data = await fetchAirQualityCoordinates(lat, lon, name, state);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: 'Air Quality upstream service temporarily unavailable: ' + err.message
    });
  }
});

// GET /api/airquality/stations — All CAAQMS stations with live status
airQualityRouter.get('/stations', (req, res) => {
  const stations = getAllStationReadings();
  res.json({
    ok: true,
    count: stations.length,
    stations
  });
});

// GET /api/airquality/rankings — Most polluted and cleanest regions
airQualityRouter.get('/rankings', (req, res) => {
  const rankings = getAirQualityRankings();
  res.json({
    ok: true,
    ...rankings
  });
});

// GET /api/airquality/district — Look up by District ID (from 594-district index)
airQualityRouter.get('/district', async (req, res) => {
  const distId = String(req.query.id || '').trim();
  let lat = parseFloat(req.query.lat);
  let lon = parseFloat(req.query.lon);
  let distName = String(req.query.district || '').trim();
  let stateName = String(req.query.state || '').trim();

  const idx = getDistrictsIndex();
  let matched = null;

  if (distId) {
    matched = idx.districts.find(d => d.id === distId);
  }
  if (!matched && distName) {
    matched = idx.districts.find(d => d.district.toLowerCase() === distName.toLowerCase());
  }

  if (matched) {
    lat = matched.lat;
    lon = matched.lon;
    distName = matched.district;
    stateName = matched.state;
  }

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid request: specify a valid district ID, name, or coordinates.'
    });
  }

  try {
    const data = await fetchAirQualityCoordinates(lat, lon, distName, stateName);
    res.json({
      ok: true,
      districtId: matched?.id || distId || null,
      district: distName,
      state: stateName,
      ...data
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: 'Failed to retrieve district air quality telemetry: ' + err.message
    });
  }
});

// GET /api/airquality/providers — Status of all 6 integrated providers
airQualityRouter.get('/providers', (req, res) => {
  const providers = [
    providerRegistry.getProvider('cpcb_naqi'),
    providerRegistry.getProvider('google_air_quality'),
    providerRegistry.getProvider('iqair'),
    providerRegistry.getProvider('waqi'),
    providerRegistry.getProvider('airnow'),
    providerRegistry.getProvider('aqi_in')
  ].filter(Boolean);

  res.json({
    ok: true,
    count: providers.length,
    providers
  });
});
