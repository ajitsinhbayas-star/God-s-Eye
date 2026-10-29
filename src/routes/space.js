import express from 'express';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';
import { INDIAN_CITIES_REGISTRY } from '../config/cities.js';
import { computeTopocentricLookAngles } from '../math/topocentric.js';
import { computeSolarAndVisibilityState } from '../math/solar-visibility.js';
import { registerSseClient } from '../realtime/sse-manager.js';
import { propagateSatelliteSGP4 } from '../daemons/celestrak-worker.js';

export const spaceRouter = express.Router();

/**
 * Computes live or propagated telemetry for any satellite.
 * Uses real ISS downlink coordinates when available, and validated SGP4 propagation
 * via satellite.js for all other Earth-orbiting spacecraft.
 */
export function computeSatTelemetry(sat, date = new Date()) {
  const store = getSpaceStore();
  if (sat.id === 'iss' && store.liveISS && typeof store.liveISS.latitude === 'number') {
    return {
      lat: Number(store.liveISS.latitude.toFixed(4)),
      lon: Number(store.liveISS.longitude.toFixed(4)),
      altKm: Math.round(store.liveISS.altitude),
      velKmH: Math.round(store.liveISS.velocity),
      velKmS: Number((store.liveISS.velocity / 3600).toFixed(2)),
      method: 'live-telemetry',
      quality: 'fresh',
      epoch: new Date().toISOString(),
      epochAgeHours: 0.0
    };
  }

  return propagateSatelliteSGP4(sat, date);
}

/**
 * Computes topocentric passes over the observer horizon within a specified time window.
 * Evaluates orbital propagation, maximum elevation (TCA), AOS/LOS, and solar illumination.
 */
export function computePassesForSatellite(sat, obsLat, obsLon, hours = 48, minElevation = 10.0) {
  const startMs = Date.now();
  const clampedHours = Math.min(Math.max(Number(hours) || 48, 6), 72);
  const endMs = startMs + clampedHours * 3600 * 1000;
  const stepMs = 60 * 1000; // 1-minute time step
  const minEl = Math.max(5.0, Number(minElevation) || 10.0);

  const passes = [];
  let inPass = false;
  let currentPass = null;

  for (let t = startMs; t < endMs; t += stepMs) {
    const d = new Date(t);
    const st = propagateSatelliteSGP4(sat, d);
    const look = computeTopocentricLookAngles(obsLat, obsLon, st.lat, st.lon, st.altKm);

    if (look.elevationDeg >= minEl) {
      if (!inPass) {
        inPass = true;
        currentPass = {
          aosTime: t,
          aosAz: look.azimuthDeg,
          aosCompass: look.compass,
          aosEl: look.elevationDeg,
          maxEl: look.elevationDeg,
          tcaTime: t,
          maxLook: look,
          maxSt: st
        };
      } else {
        if (look.elevationDeg > currentPass.maxEl) {
          currentPass.maxEl = look.elevationDeg;
          currentPass.tcaTime = t;
          currentPass.maxLook = look;
          currentPass.maxSt = st;
        }
      }
    } else {
      if (inPass) {
        inPass = false;
        currentPass.losTime = t;
        const vis = computeSolarAndVisibilityState(
          obsLat,
          obsLon,
          currentPass.maxSt.lat,
          currentPass.maxSt.lon,
          currentPass.maxSt.altKm,
          currentPass.tcaTime,
          currentPass.maxSt.eci
        );

        passes.push({
          satelliteId: sat.id,
          satelliteName: sat.name,
          norad: sat.norad,
          aos: {
            time: new Date(currentPass.aosTime).toISOString(),
            elevationDeg: currentPass.aosEl,
            azimuthDeg: currentPass.aosAz,
            compass: currentPass.aosCompass
          },
          tca: {
            time: new Date(currentPass.tcaTime).toISOString(),
            elevationDeg: currentPass.maxEl,
            azimuthDeg: currentPass.maxLook.azimuthDeg,
            compass: currentPass.maxLook.compass
          },
          los: {
            time: new Date(currentPass.losTime).toISOString(),
            elevationDeg: look.elevationDeg,
            azimuthDeg: look.azimuthDeg,
            compass: look.compass
          },
          durationSeconds: Math.round((currentPass.losTime - currentPass.aosTime) / 1000),
          maxElevationDeg: currentPass.maxEl,
          isNakedEyeVisible: vis.isNakedEyeVisible,
          isSatelliteSunlit: vis.isSatelliteSunlit,
          visibility: vis.visibilityLabel,
          sunElevationDeg: vis.sunElevationDeg
        });
        currentPass = null;
      }
    }
  }

  return passes;
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
      const vis = computeSolarAndVisibilityState(obsLat, obsLon, st.lat, st.lon, st.altKm, nowMs, st.eci);
      overheadNow.push({
        id: sat.id,
        name: sat.name,
        norad: sat.norad,
        elevationDeg: look.elevationDeg,
        azimuthDeg: look.azimuthDeg,
        compass: look.compass,
        isNakedEyeVisible: vis.isNakedEyeVisible,
        visibility: vis.visibilityLabel,
        quality: st.quality || 'fresh',
        method: st.method || 'propagated-sgp4'
      });
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

spaceRouter.get('/passes', (req, res) => {
  const store = getSpaceStore();
  const obsLat = req.query.lat ? parseFloat(req.query.lat) : (store.preferences?.observerLat || 18.5204);
  const obsLon = req.query.lon ? parseFloat(req.query.lon) : (store.preferences?.observerLon || 73.8567);
  const hours = parseFloat(req.query.hours) || 48;
  const minElevation = parseFloat(req.query.minElevation) || 10.0;

  let targetSat = null;
  if (req.query.norad) {
    const noradNum = parseInt(req.query.norad, 10);
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.norad === noradNum);
  } else if (req.query.satId) {
    const sId = String(req.query.satId).toLowerCase();
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.id.toLowerCase() === sId);
  }

  // Default to ISS (NORAD 25544) if unspecified or not matched
  if (!targetSat) {
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.id === 'iss') || {
      id: 'iss',
      name: 'ISS (Zarya)',
      norad: 25544,
      parent: 'earth',
      altKm: 418
    };
  }

  const passes = computePassesForSatellite(targetSat, obsLat, obsLon, hours, minElevation);

  res.json({
    ok: true,
    count: passes.length,
    observer: { lat: obsLat, lon: obsLon },
    satellite: { id: targetSat.id, name: targetSat.name, norad: targetSat.norad },
    passes
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
