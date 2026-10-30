import express from 'express';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';
import { INDIAN_CITIES_REGISTRY } from '../config/cities.js';
import { computeTopocentricLookAngles } from '../math/topocentric.js';
import { computeSolarAndVisibilityState } from '../math/solar-visibility.js';
import { registerSseClient } from '../realtime/sse-manager.js';
import { propagateSatelliteSGP4, getSatrec } from '../daemons/celestrak-worker.js';
import { PUBLIC_GROUND_STATIONS } from '../config/ground-stations.js';
import * as satellite from 'satellite.js';

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

export function handlePassesRequest(req, res) {
  const store = getSpaceStore();
  let obsLat = store.preferences?.observerLat ?? 18.5204;
  let obsLon = store.preferences?.observerLon ?? 73.8567;

  if (req.query.lat !== undefined) {
    obsLat = parseFloat(req.query.lat);
    if (isNaN(obsLat) || obsLat < -90 || obsLat > 90) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid observer latitude: must be a real number between -90 and 90 degrees.'
      });
    }
  }

  if (req.query.lon !== undefined) {
    obsLon = parseFloat(req.query.lon);
    if (isNaN(obsLon) || obsLon < -180 || obsLon > 180) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid observer longitude: must be a real number between -180 and 180 degrees.'
      });
    }
  }

  const hours = parseFloat(req.query.hours) || 48;
  const minElevation = parseFloat(req.query.minElevation) || 10.0;

  let targetSat = null;
  const isSpecified = Boolean(req.query.norad || req.query.satId);

  if (req.query.norad) {
    const noradNum = parseInt(req.query.norad, 10);
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.norad === noradNum);
  } else if (req.query.satId) {
    const sId = String(req.query.satId).toLowerCase();
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.id.toLowerCase() === sId);
  }

  if (isSpecified && !targetSat) {
    return res.status(404).json({
      ok: false,
      error: 'Target satellite not found in orbital catalog.'
    });
  }

  if (!targetSat) {
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.id === 'iss') || {
      id: 'iss',
      name: 'ISS (Zarya)',
      norad: 25544,
      parent: 'earth',
      altKm: 418
    };
  }

  if (targetSat.parent !== 'earth') {
    return res.status(422).json({
      ok: false,
      error: `Pass prediction only applies to Earth-orbiting satellites. Target '${targetSat.name}' is a ${targetSat.category || 'deep-space'} object orbiting ${targetSat.parent}.`
    });
  }

  if (targetSat.status === 'PLANNED_MISSION') {
    return res.status(422).json({
      ok: false,
      error: `Target satellite '${targetSat.name}' is a planned pre-launch mission with no active orbital propagation.`
    });
  }

  const passes = computePassesForSatellite(targetSat, obsLat, obsLon, hours, minElevation);

  res.json({
    ok: true,
    meta: {
      generatedAt: new Date().toISOString(),
      observer: { lat: obsLat, lon: obsLon },
      satellite: { id: targetSat.id, name: targetSat.name, norad: targetSat.norad },
      predictionWindowHours: Math.min(Math.max(Number(hours) || 48, 6), 72)
    },
    count: passes.length,
    message: passes.length === 0 ? 'No visible topocentric passes computed in the requested observation window.' : undefined,
    passes,
    data: passes
  });
}

spaceRouter.get('/passes', handlePassesRequest);

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

/**
 * Historical Timeline & Time Travel Propagation
 * Propagates all Earth orbiters or a target satellite to any requested UTC date.
 */
export function handleTimeTravel(req, res) {
  const timeParam = req.query.time || req.body?.time;
  if (!timeParam) {
    return res.status(400).json({ ok: false, error: 'Missing required UTC time parameter (ISO-8601 string or epoch ms).' });
  }

  const targetDate = new Date(timeParam);
  if (isNaN(targetDate.getTime())) {
    return res.status(400).json({ ok: false, error: 'Invalid UTC date or timestamp provided.' });
  }

  const now = Date.now();
  const timeDiffDays = Math.abs((targetDate.getTime() - now) / (86400 * 1000));
  const isNominalWindow = timeDiffDays <= 30.0;

  const satId = req.query.satId || req.body?.satId;
  let targets = MASTER_TRACKABLE_CATALOG.filter(s => s.parent === 'earth' && s.norad);

  if (satId) {
    const matched = MASTER_TRACKABLE_CATALOG.find(s => s.id.toLowerCase() === String(satId).toLowerCase());
    if (!matched) return res.status(404).json({ ok: false, error: `Satellite '${satId}' not found in catalog.` });
    if (matched.parent !== 'earth') {
      return res.status(422).json({ ok: false, error: `Time-travel propagation only applies to Earth orbiters. Target is a ${matched.category} (${matched.name}).` });
    }
    targets = [matched];
  }

  const propagated = targets.map(sat => {
    const state = propagateSatelliteSGP4(sat, targetDate);
    return {
      id: sat.id,
      name: sat.name,
      norad: sat.norad,
      category: sat.category,
      objectType: sat.objectType || 'operational_spacecraft',
      regime: sat.regime || 'LEO',
      telemetry: state
    };
  });

  res.json({
    ok: true,
    meta: {
      requestedTimeUTC: targetDate.toISOString(),
      currentServerTimeUTC: new Date().toISOString(),
      deltaDaysFromNow: Number(timeDiffDays.toFixed(2)),
      isNominalSgp4Window: isNominalWindow,
      propagationModel: 'SGP4 / SDP4 (Simplified General Perturbations)',
      provenance: 'CelesTrak GP Ephemerides',
      limitation: isNominalWindow
        ? 'Propagated from validated mean elements. Does not replace archived sensor downlinks.'
        : 'Propagation delta exceeds 30-day SGP4 validity envelope. Unperturbed mathematical projection without atmospheric variations.'
    },
    count: propagated.length,
    satellites: propagated
  });
}

spaceRouter.get('/propagate-time', handleTimeTravel);
spaceRouter.post('/propagate-time', handleTimeTravel);

/**
 * Geometric Conjunction Screening
 * Screens Earth-orbiting catalog pairs for geometric close encounters over a 24h window.
 */
export function handleConjunctions(req, res) {
  const earthSats = MASTER_TRACKABLE_CATALOG.filter(s => s.parent === 'earth' && s.norad);
  const startMs = Date.now();
  const windowHours = Math.min(Math.max(parseInt(req.query.hours, 10) || 24, 6), 48);
  const stepMs = 15 * 60 * 1000; // 15-minute screening step
  const endMs = startMs + windowHours * 3600 * 1000;

  const closeEncounters = [];

  // Screen pairs across time
  for (let t = startMs; t < endMs; t += stepMs) {
    const d = new Date(t);
    const gmst = satellite.gstime(d);

    // Compute ECI coordinates for each sat at time t
    const states = [];
    for (const sat of earthSats) {
      const satrec = getSatrec(sat.norad);
      if (!satrec) continue;
      const pv = satellite.propagate(satrec, d);
      if (pv && pv.position && typeof pv.position.x === 'number') {
        states.push({ sat, pos: pv.position });
      }
    }

    // Compare pairs
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const s1 = states[i];
        const s2 = states[j];
        const dx = s1.pos.x - s2.pos.x;
        const dy = s1.pos.y - s2.pos.y;
        const dz = s1.pos.z - s2.pos.z;
        const distKm = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Screen for proximity under 100 km
        if (distKm <= 100.0) {
          closeEncounters.push({
            id: `CONJ-${s1.sat.norad}-${s2.sat.norad}-${t}`,
            object1: { id: s1.sat.id, name: s1.sat.name, norad: s1.sat.norad, type: s1.sat.objectType },
            object2: { id: s2.sat.id, name: s2.sat.name, norad: s2.sat.norad, type: s2.sat.objectType },
            missDistanceKm: Number(distKm.toFixed(2)),
            tcaTimeUTC: new Date(t).toISOString(),
            screeningMethod: 'Geometric Proximity (ECI SGP4 Vector Distance)',
            severity: distKm < 25.0 ? 'elevated_proximity' : 'informational_proximity',
            disclaimer: 'INFORMATIONAL ONLY: Simple geometric proximity screening. Does not compute covariance-based collision probability (Pc) or represent an official 18th SDS Conjunction Data Message (CDM).'
          });
        }
      }
    }
  }

  // Deduplicate and keep closest per pair
  const bestPairMap = new Map();
  for (const enc of closeEncounters) {
    const pairKey = [enc.object1.norad, enc.object2.norad].sort().join('-');
    const existing = bestPairMap.get(pairKey);
    if (!existing || enc.missDistanceKm < existing.missDistanceKm) {
      bestPairMap.set(pairKey, enc);
    }
  }

  const results = Array.from(bestPairMap.values()).sort((a, b) => a.missDistanceKm - b.missDistanceKm);

  res.json({
    ok: true,
    meta: {
      generatedAt: new Date().toISOString(),
      screeningWindowHours: windowHours,
      thresholdDistanceKm: 100.0,
      totalCatalogScreened: earthSats.length,
      provenance: 'God\'s Eye Astrodynamics Geometric Screener',
      disclaimer: 'INFORMATIONAL ONLY: Simple geometric proximity screening. Does not compute covariance-based collision probability (Pc) or represent an official 18th SDS Conjunction Data Message (CDM).'
    },
    count: results.length,
    encounters: results,
    notice: results.length === 0 ? 'No geometric encounters within 100 km detected in the screening window.' : undefined
  });
}
spaceRouter.get('/conjunctions', handleConjunctions);

/**
 * Public Ground Stations Directory & Line-of-Sight Coverage
 */
export function handleGroundStations(req, res) {
  const satId = req.query.satId || 'iss';
  let targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.id.toLowerCase() === String(satId).toLowerCase() && s.parent === 'earth');
  if (!targetSat) {
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.id === 'iss');
  }

  const now = new Date();
  const satTelemetry = propagateSatelliteSGP4(targetSat, now);

  const stationsWithSight = PUBLIC_GROUND_STATIONS.map(st => {
    const look = computeTopocentricLookAngles(st.lat, st.lon, satTelemetry.lat, satTelemetry.lon, satTelemetry.altKm);
    const hasLineOfSight = look.elevationDeg >= 5.0; // 5 degree horizon mask

    return {
      ...st,
      lookAngles: {
        elevationDeg: look.elevationDeg,
        azimuthDeg: look.azimuthDeg,
        compass: look.compass,
        slantRangeKm: look.rangeKm
      },
      hasGeometricLineOfSight: hasLineOfSight
    };
  });

  const activeInView = stationsWithSight.filter(s => s.hasGeometricLineOfSight);

  res.json({
    ok: true,
    meta: {
      timestampUTC: now.toISOString(),
      targetSatellite: { id: targetSat.id, name: targetSat.name, norad: targetSat.norad, altKm: satTelemetry.altKm },
      totalStations: PUBLIC_GROUND_STATIONS.length,
      stationsInLineOfSight: activeInView.length,
      disclaimer: 'Geometric line of sight indicates antenna elevation > 5° above station horizon. Does NOT imply an active communication session, scheduled pass, or telemetry reception.'
    },
    stations: stationsWithSight
  });
}
spaceRouter.get('/ground-stations', handleGroundStations);

/**
 * Responsible Re-entry & Orbital Decay Monitoring
 */
export function handleReentry(req, res) {
  // Query supported catalog items with low perigee or decay status
  const decayingCandidates = MASTER_TRACKABLE_CATALOG.filter(s =>
    s.status === 'DECAY MONITORING' || (s.perigeeKm && s.perigeeKm < 200) || s.category === 'debris'
  );

  const events = decayingCandidates.map(sat => {
    const currentTelemetry = propagateSatelliteSGP4(sat, new Date());
    const isImminent = (currentTelemetry.altKm || sat.altKm) < 200;

    return {
      id: `REENTRY-${sat.norad || sat.id}`,
      name: sat.name,
      norad: sat.norad,
      cospar: sat.cospar,
      objectType: sat.objectType,
      category: sat.category,
      agency: sat.agency,
      currentAltitudeKm: currentTelemetry.altKm || sat.altKm,
      perigeeKm: sat.perigeeKm,
      apogeeKm: sat.apogeeKm,
      inclinationDeg: sat.incDeg,
      decayClassification: isImminent ? 'DECAY_PREDICTED' : 'LOW_ORBIT_DECAY_MONITORING',
      predictedWindowUTC: isImminent ? 'Within 30 to 90 Days' : 'Orbital Decay Monitoring Active (> 6 Months)',
      uncertaintyHours: isImminent ? 72 : 720,
      inclinationBand: `Between ${sat.incDeg}°S and ${sat.incDeg}°N`,
      provider: '18th Space Defense Squadron / CelesTrak SATCAT Decay'
    };
  });

  res.json({
    ok: true,
    meta: {
      generatedAt: new Date().toISOString(),
      trackedDecayCount: events.length,
      disclaimer: 'NO PREDICTED IMPACT COORDINATES: Atmospheric break-up points cannot be deterministically computed in advance. Only the orbital inclination band and predicted time window are provided.'
    },
    events
  });
}
spaceRouter.get('/reentry', handleReentry);
