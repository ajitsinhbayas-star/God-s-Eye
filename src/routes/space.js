import express from 'express';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';
import { INDIAN_CITIES_REGISTRY } from '../config/cities.js';
import { computeTopocentricLookAngles } from '../math/topocentric.js';
import { computeSolarAndVisibilityState } from '../math/solar-visibility.js';
import { registerSseClient } from '../realtime/sse-manager.js';

export const spaceRouter = express.Router();

function computeSatTelemetry(sat) {
  const store = getSpaceStore();
  if (sat.id === 'iss' && store.liveISS) {
    return {
      lat: Number(store.liveISS.latitude.toFixed(2)),
      lon: Number(store.liveISS.longitude.toFixed(2)),
      altKm: Math.round(store.liveISS.altitude),
      velKmH: Math.round(store.liveISS.velocity),
      velKmS: Number((store.liveISS.velocity / 3600).toFixed(2))
    };
  }
  return { lat: 28.5, lon: 77.2, altKm: sat.altKm || 550, velKmH: 27500, velKmS: 7.64 };
}

spaceRouter.get('/stream', (req, res) => {
  const store = getSpaceStore();
  registerSseClient(req, res, { syncCycles: store.syncCycles, lastUpdated: store.lastUpdated });
});

spaceRouter.get('/bootstrap', (req, res) => {
  const store = getSpaceStore();
  const enrichedCatalog = MASTER_TRACKABLE_CATALOG.map((item) => ({
    ...item,
    live: item.parent === 'earth' ? computeSatTelemetry(item) : null
  }));

  res.json({
    ok: true,
    lastUpdated: store.lastUpdated,
    syncCycles: store.syncCycles,
    liveISS: store.liveISS,
    externalIntel: store.externalIntel,
    sources: store.sources,
    catalog: enrichedCatalog,
    events: store.events,
    watchlist: store.watchlist,
    preferences: store.preferences
  });
});

spaceRouter.get('/above-me', (req, res) => {
  const store = getSpaceStore();
  const obsLat = req.query.lat ? Number(req.query.lat) : (store.preferences?.observerLat || 18.5204);
  const obsLon = req.query.lon ? Number(req.query.lon) : (store.preferences?.observerLon || 73.8567);
  const nowMs = Date.now();
  const overheadNow = [];

  MASTER_TRACKABLE_CATALOG.filter(m => m.parent === 'earth').forEach(sat => {
    const st = computeSatTelemetry(sat);
    const look = computeTopocentricLookAngles(obsLat, obsLon, st.lat, st.lon, st.altKm);
    if (look.elevationDeg >= 10.0) {
      const vis = computeSolarAndVisibilityState(obsLat, obsLon, st.lat, st.lon, st.altKm, nowMs);
      overheadNow.push({ id: sat.id, name: sat.name, elevationDeg: look.elevationDeg, azimuthDeg: look.azimuthDeg, compass: look.compass, isNakedEyeVisible: vis.isNakedEyeVisible });
    }
  });

  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    observer: { name: store.preferences?.observerName || 'Observer', lat: obsLat, lon: obsLon },
    cities: INDIAN_CITIES_REGISTRY,
    overheadNow
  });
});

spaceRouter.get('/missions', (req, res) => {
  res.json({ ok: true, count: MASTER_TRACKABLE_CATALOG.length, missions: MASTER_TRACKABLE_CATALOG });
});

spaceRouter.post('/watchlist', async (req, res) => {
  const store = getSpaceStore();
  if (Array.isArray(req.body?.watchlist)) {
    store.watchlist = req.body.watchlist.map(x => String(x).toUpperCase()).slice(0, 100);
    await saveSpaceStore();
  }
  res.json({ ok: true, watchlist: store.watchlist });
});

spaceRouter.post('/preferences', async (req, res) => {
  const store = getSpaceStore();
  if (req.body && typeof req.body === 'object') {
    Object.assign(store.preferences, req.body);
    await saveSpaceStore();
  }
  res.json({ ok: true, preferences: store.preferences });
});
