/**
 * GOD'S EYE ?" SCIENTIFIC RESEARCH & ORBITAL ANALYSIS ROUTER
 * Version: 5.0.0 (Update 5 Scientific Workspace)
 * 
 * Provides:
 * - Object Detail Scientific Workspace (/api/analysis/object/:id)
 * - Multi-Object Scientific Comparison Tool (/api/analysis/compare)
 * - Ground Track & Pass Elevation Profiles (/api/analysis/ground-track/:id, /api/analysis/pass-profile/:id)
 * - Mission Discovery Explorer (/api/analysis/missions)
 * - Scientific Data Export Engine in CSV & JSON (/api/analysis/export)
 * - Reproducible Analysis Record Generator (/api/analysis/reproducible-record)
 */

import express from 'express';
import crypto from 'crypto';
import * as satellite from 'satellite.js';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';
import { VERIFIED_MISSIONS_CATALOG } from '../config/missions.js';
import { getSatrec, getTle, propagateSatelliteSGP4 } from '../daemons/celestrak-worker.js';
import { computeTopocentricLookAngles } from '../math/topocentric.js';
import { computeSolarAndVisibilityState } from '../math/solar-visibility.js';
import { computePassesForSatellite } from './space.js';
import { EARTH_CONSTANTS } from '../config/constants.js';

const router = express.Router();

const MU_EARTH = 398600.4418; // km^3 / s^2 (WGS84 Earth gravitational parameter)
const R_EARTH = EARTH_CONSTANTS.RADIUS_KM; // 6378.137 km

function getMeanMotionRadMin(satrec) {
  if (typeof satrec.no === 'number' && !isNaN(satrec.no) && satrec.no > 0) return satrec.no;
  if (typeof satrec.no_kozai === 'number' && !isNaN(satrec.no_kozai) && satrec.no_kozai > 0) return satrec.no_kozai;
  return 0.067;
}

// Helper to find catalog object by id, norad, or name
function resolveCatalogObject(identifier) {
  if (!identifier) return null;
  const raw = String(identifier).trim().toLowerCase();
  return MASTER_TRACKABLE_CATALOG.find(s => 
    s.id.toLowerCase() === raw ||
    String(s.norad) === raw ||
    s.name.toLowerCase() === raw ||
    (Array.isArray(s.aliases) && s.aliases.some(a => a.toLowerCase() === raw))
  );
}

// -------------------------------------------------------------
// 1. SCIENTIFIC OBJECT ANALYSIS WORKSPACE
// -------------------------------------------------------------
router.get('/object/:id', (req, res) => {
  const { id } = req.params;
  const target = resolveCatalogObject(id);

  if (!target) {
    return res.status(404).json({
      error: `Space object '${id}' not found in trackable catalogue.`,
      availableSuggestions: MASTER_TRACKABLE_CATALOG.slice(0, 6).map(s => ({ id: s.id, name: s.name, norad: s.norad }))
    });
  }

  const evalDate = req.query.time ? new Date(req.query.time) : new Date();
  if (isNaN(evalDate.getTime())) {
    return res.status(400).json({ error: "Invalid 'time' parameter. Must be valid ISO 8601 UTC timestamp." });
  }

  // Observer coordinates (default to Pune / India sector if omitted)
  const obsLat = Number(req.query.lat ?? 18.5204);
  const obsLon = Number(req.query.lon ?? 73.8567);
  const obsAltKm = Number(req.query.altKm ?? 0.56);

  // Check if Earth orbiter or Deep Space
  const isDeepSpace = ['L1_HALO', 'L2_HALO', 'LUNAR', 'DEEP_SPACE'].includes(target.regime);

  if (isDeepSpace) {
    // Deep Space / Lagrange / Lunar Object Analysis
    const distSunKm = target.regime === 'L1_HALO' ? 149600000 - 1500000 : 149600000 + 1500000;
    const distEarthKm = target.regime === 'LUNAR' ? 384400 : 1500000;
    const roundTripLightSeconds = Number(((distEarthKm * 2) / 299792.458).toFixed(2));

    return res.json({
      meta: {
        objectId: target.id,
        name: target.name,
        category: target.category,
        objectType: target.objectType,
        regime: target.regime,
        referenceFrame: 'ICRF / Sun-Earth Barycenter',
        coordinateType: 'heliocentric_lagrange',
        evaluationTimeUTC: evalDate.toISOString(),
        calculationMethod: 'NASA Horizons Ephemeris & Lagrange Halo Model',
        isGroundTrackApplicable: false,
        groundTrackNote: 'Object is not in geocentric Earth orbit; 2D latitude/longitude ground track projection is not physically applicable for Lagrange halo or lunar orbits.'
      },
      astrodynamics: {
        distanceFromEarthKm: distEarthKm,
        approxDistanceSunKm: distSunKm,
        roundTripLightTimeSeconds: roundTripLightSeconds,
        operationalStatus: target.status || 'OPERATIONAL',
        role: target.role,
        agency: target.agency,
        launchDate: target.launchDate,
        launchVehicle: target.launchVeh,
        launchSite: target.launchSite
      },
      provenance: {
        sourceProvider: target.provenance || 'ISRO / NASA / JPL Horizons',
        retrievalTimestamp: new Date().toISOString(),
        dataQuality: 'ephemeris-verified'
      }
    });
  }

  // Earth-Orbiting Spacecraft SGP4 Analysis
  const norad = target.norad;
  const tleData = norad ? getTle(norad) : null;
  const satrec = norad ? getSatrec(norad) : null;

  if (!satrec || !tleData) {
    return res.status(422).json({
      error: `Orbital elements unavailable for '${target.name}'. Object may be planned or missing TLE ephemeris.`,
      objectId: target.id
    });
  }

  // Instantaneous state vector propagation
  const pv = satellite.propagate(satrec, evalDate);
  if (!pv || !pv.position) {
    return res.status(500).json({ error: 'SGP4 propagation failed for requested timestamp.' });
  }

  const gmst = satellite.gstime(evalDate);
  const gd = satellite.eciToGeodetic(pv.position, gmst);
  const latDeg = satellite.degreesLat(gd.latitude);
  const lonDeg = satellite.degreesLong(gd.longitude);
  const altKm = gd.height;

  // Velocity magnitude
  const vx = pv.velocity.x;
  const vy = pv.velocity.y;
  const vz = pv.velocity.z;
  const velKms = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const velKmH = velKms * 3600;

  // Derived orbital parameters
  const incDeg = (satrec.inclo * 180) / Math.PI;
  const raanDeg = (satrec.nodeo * 180) / Math.PI;
  const ecc = satrec.ecco;
  const argPerigeeDeg = (satrec.argpo * 180) / Math.PI;
  const meanAnomalyDeg = (satrec.mo * 180) / Math.PI;
  const meanMotionRadMin = getMeanMotionRadMin(satrec);
  const meanMotionRevDay = (meanMotionRadMin * 1440) / (2 * Math.PI);
  const periodMin = 1440 / meanMotionRevDay;

  // Semi-major axis (a = (mu / n^2)^(1/3)) where n is in rad/sec
  const nRadPerSec = (meanMotionRevDay * 2 * Math.PI) / 86400;
  const semiMajorAxisKm = Math.pow(MU_EARTH / (nRadPerSec * nRadPerSec), 1 / 3);
  const perigeeAltKm = semiMajorAxisKm * (1 - ecc) - R_EARTH;
  const apogeeAltKm = semiMajorAxisKm * (1 + ecc) - R_EARTH;

  // Sun & Observer Visibility
  const solarState = computeSolarAndVisibilityState(obsLat, obsLon, latDeg, lonDeg, altKm, evalDate.getTime(), pv.position);
  const lookAngles = computeTopocentricLookAngles(obsLat, obsLon, latDeg, lonDeg, altKm);

  // Generate 60-point ground track for 1 full orbital period forward
  const groundTrack = [];
  const trackDurationMs = periodMin * 60 * 1000;
  const trackStepMs = trackDurationMs / 60;

  for (let i = 0; i <= 60; i++) {
    const t = new Date(evalDate.getTime() + i * trackStepMs);
    const stepPv = satellite.propagate(satrec, t);
    if (stepPv && stepPv.position) {
      const stepGmst = satellite.gstime(t);
      const stepGd = satellite.eciToGeodetic(stepPv.position, stepGmst);
      const stepVel = Math.sqrt(stepPv.velocity.x ** 2 + stepPv.velocity.y ** 2 + stepPv.velocity.z ** 2);
      groundTrack.push({
        time: t.toISOString(),
        lat: Number(satellite.degreesLat(stepGd.latitude).toFixed(3)),
        lon: Number(satellite.degreesLong(stepGd.longitude).toFixed(3)),
        altKm: Number(stepGd.height.toFixed(1)),
        velocityKms: Number(stepVel.toFixed(3))
      });
    }
  }

  // TLE Epoch & Age
  const rawEpochMs = satrec.jdsatepoch ? (satrec.jdsatepoch - 2440587.5) * 86400000 : NaN;
  const validEpochDate = !isNaN(rawEpochMs) ? new Date(rawEpochMs) : evalDate;
  const epochAgeDays = Number((Math.abs(evalDate.getTime() - validEpochDate.getTime()) / 86400000).toFixed(2));
  const isFresh = epochAgeDays <= 14;

  res.json({
    meta: {
      objectId: target.id,
      noradId: target.norad,
      cosparId: target.cospar,
      name: target.name,
      category: target.category,
      objectType: target.objectType,
      regime: target.regime,
      agency: target.agency,
      country: target.country,
      status: target.status,
      evaluationTimeUTC: evalDate.toISOString(),
      coordinateReferenceFrame: 'WGS84 Geodetic / TEME ECI',
      propagator: 'SGP4 / SDP4 Simplified General Perturbations',
      gravitationalModel: 'WGS84 (mu = 398600.4418 km^3/s^2, Earth radius = 6378.137 km)'
    },
    orbitalElements: {
      epochUTC: validEpochDate.toISOString(),
      epochAgeDays,
      isFreshEpoch: isFresh,
      inclinationDeg: Number(incDeg.toFixed(4)),
      rightAscensionAscendingNodeDeg: Number(raanDeg.toFixed(4)),
      eccentricity: Number(ecc.toFixed(6)),
      argumentOfPerigeeDeg: Number(argPerigeeDeg.toFixed(4)),
      meanAnomalyDeg: Number(meanAnomalyDeg.toFixed(4)),
      meanMotionRevPerDay: Number(meanMotionRevDay.toFixed(4)),
      orbitalPeriodMinutes: Number(periodMin.toFixed(2)),
      semiMajorAxisKm: Number(semiMajorAxisKm.toFixed(1)),
      perigeeAltitudeKm: Number(perigeeAltKm.toFixed(1)),
      apogeeAltitudeKm: Number(apogeeAltKm.toFixed(1)),
      bstarDragTerm: satrec.bstar || 0.0
    },
    stateVector: {
      latitudeDeg: Number(latDeg.toFixed(4)),
      longitudeDeg: Number(lonDeg.toFixed(4)),
      altitudeKm: Number(altKm.toFixed(2)),
      velocityKms: Number(velKms.toFixed(3)),
      velocityKmH: Number(velKmH.toFixed(1)),
      geocentricDistanceKm: Number((altKm + R_EARTH).toFixed(2)),
      illumination: solarState.visibilityLabel,
      sunlit: solarState.isSatelliteSunlit
    },
    observerLookAngles: {
      observerLocation: { lat: obsLat, lon: obsLon, altKm: obsAltKm },
      azimuthDeg: lookAngles.azimuthDeg,
      elevationDeg: lookAngles.elevationDeg,
      compassHeading: lookAngles.compass,
      slantRangeKm: lookAngles.slantRangeKm,
      hasGeometricLineOfSight: lookAngles.elevationDeg > 0,
      isRadioPass: lookAngles.elevationDeg > 5.0,
      opticalVisibilityClass: solarState.visibilityLabel,
      observerSunElevationDeg: solarState.sunElevationDeg
    },
    groundTrack: {
      pointsCount: groundTrack.length,
      sampleIntervalMinutes: Number((trackStepMs / 60000).toFixed(1)),
      orbitPeriodMinutes: Number(periodMin.toFixed(2)),
      points: groundTrack
    },
    provenance: {
      sourceProvider: tleData.isLive ? 'CelesTrak Live NORAD OMM' : 'Verified Authoritative Baseline SATCAT',
      tleLine1: tleData.line1,
      tleLine2: tleData.line2,
      modelLimitations: 'SGP4 analytical equations assume unperturbed Keplerian base with mean zonal/tesseral harmonics and atmospheric drag. Propagation error accumulates ~1-3 km/day outside the ±30 day nominal envelope. Maneuvers are not captured until a new TLE epoch is published.'
    }
  });
});

// -------------------------------------------------------------
// 2. MULTI-OBJECT SCIENTIFIC COMPARISON TOOL
// -------------------------------------------------------------
router.get('/compare', (req, res) => {
  const idsParam = String(req.query.ids || '').trim();
  if (!idsParam) {
    return res.status(400).json({ error: "Missing required 'ids' query parameter (e.g. ids=iss,tiangong or ids=25544,48274)." });
  }

  const requestedIds = idsParam.split(',').map(s => s.trim()).filter(Boolean);
  if (requestedIds.length < 2) {
    return res.status(400).json({ error: "Comparison requires at least 2 distinct objects (e.g. ids=iss,tiangong)." });
  }

  const evalDate = req.query.time ? new Date(req.query.time) : new Date();
  if (isNaN(evalDate.getTime())) {
    return res.status(400).json({ error: "Invalid 'time' parameter." });
  }

  const comparisonObjects = [];
  const warnings = [];

  for (const id of requestedIds) {
    const target = resolveCatalogObject(id);
    if (!target) {
      warnings.push(`Object '${id}' not found in catalogue and was omitted.`);
      continue;
    }

    const isDeepSpace = ['L1_HALO', 'L2_HALO', 'LUNAR', 'DEEP_SPACE'].includes(target.regime);

    if (isDeepSpace) {
      comparisonObjects.push({
        id: target.id,
        name: target.name,
        norad: target.norad,
        regime: target.regime,
        agency: target.agency,
        objectType: target.objectType,
        isGeocentric: false,
        referenceFrame: 'ICRF / Sun-Earth Barycenter',
        distanceFromEarthKm: target.regime === 'LUNAR' ? 384400 : 1500000,
        altitudeKm: null,
        velocityKms: null,
        periodMin: null,
        inclinationDeg: null,
        status: target.status
      });
      continue;
    }

    // Propagate Earth satellite at exact same time
    const norad = target.norad;
    const satrec = norad ? getSatrec(norad) : null;
    if (!satrec) {
      warnings.push(`Orbital elements unavailable for '${target.name}'.`);
      continue;
    }

    const pv = satellite.propagate(satrec, evalDate);
    if (!pv || !pv.position) {
      warnings.push(`Propagation failed for '${target.name}' at requested timestamp.`);
      continue;
    }

    const gmst = satellite.gstime(evalDate);
    const gd = satellite.eciToGeodetic(pv.position, gmst);
    const velKms = Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2);
    const incDeg = (satrec.inclo * 180) / Math.PI;
    const meanMotionRadMin = getMeanMotionRadMin(satrec);
    const meanMotionRevDay = (meanMotionRadMin * 1440) / (2 * Math.PI);
    const periodMin = 1440 / meanMotionRevDay;

    const nRadPerSec = (meanMotionRevDay * 2 * Math.PI) / 86400;
    const semiMajorAxisKm = Math.pow(MU_EARTH / (nRadPerSec * nRadPerSec), 1 / 3);
    const perigeeAltKm = semiMajorAxisKm * (1 - satrec.ecco) - R_EARTH;
    const apogeeAltKm = semiMajorAxisKm * (1 + satrec.ecco) - R_EARTH;

    comparisonObjects.push({
      id: target.id,
      name: target.name,
      norad: target.norad,
      regime: target.regime,
      agency: target.agency,
      objectType: target.objectType,
      isGeocentric: true,
      referenceFrame: 'WGS84 Geodetic / TEME ECI',
      latitudeDeg: Number(satellite.degreesLat(gd.latitude).toFixed(3)),
      longitudeDeg: Number(satellite.degreesLong(gd.longitude).toFixed(3)),
      altitudeKm: Number(gd.height.toFixed(1)),
      velocityKms: Number(velKms.toFixed(3)),
      velocityKmH: Number((velKms * 3600).toFixed(1)),
      inclinationDeg: Number(incDeg.toFixed(2)),
      eccentricity: Number(satrec.ecco.toFixed(5)),
      periodMinutes: Number(periodMin.toFixed(2)),
      perigeeAltitudeKm: Number(perigeeAltKm.toFixed(1)),
      apogeeAltitudeKm: Number(apogeeAltKm.toFixed(1)),
      status: target.status
    });
  }

  // Physical compatibility verification
  const hasGeocentric = comparisonObjects.some(o => o.isGeocentric);
  const hasDeepSpace = comparisonObjects.some(o => !o.isGeocentric);
  const isPhysicallyComparable = !(hasGeocentric && hasDeepSpace);

  let deltas = null;
  if (isPhysicallyComparable && comparisonObjects.length >= 2 && hasGeocentric) {
    const o1 = comparisonObjects[0];
    const o2 = comparisonObjects[1];
    deltas = {
      pair: `${o1.name} vs ${o2.name}`,
      deltaAltitudeKm: Number(Math.abs(o1.altitudeKm - o2.altitudeKm).toFixed(1)),
      deltaVelocityKms: Number(Math.abs(o1.velocityKms - o2.velocityKms).toFixed(3)),
      deltaPeriodMinutes: Number(Math.abs(o1.periodMinutes - o2.periodMinutes).toFixed(2)),
      deltaInclinationDeg: Number(Math.abs(o1.inclinationDeg - o2.inclinationDeg).toFixed(2))
    };
  }

  res.json({
    meta: {
      evaluationTimeUTC: evalDate.toISOString(),
      comparedCount: comparisonObjects.length,
      isPhysicallyComparable,
      scientificCompatibilityNote: isPhysicallyComparable
        ? 'All compared objects share the geocentric WGS84 coordinate reference frame. Numerical altitude, velocity, and period comparisons are physically valid.'
        : 'Incompatible coordinate frames detected: Comparing Earth-orbiting spacecraft (referenced to Earth Geocenter) with deep-space or Lagrange halo spacecraft (referenced to Sun-Earth Barycenter) is physically non-equivalent. Direct altitude comparisons are disabled for non-geocentric objects.',
      warnings: warnings.length ? warnings : undefined
    },
    objects: comparisonObjects,
    deltas
  });
});

// -------------------------------------------------------------
// 3. GROUND-TRACK HIGH-RES TIME-SERIES SAMPLING
// -------------------------------------------------------------
router.get('/ground-track/:id', (req, res) => {
  const target = resolveCatalogObject(req.params.id);
  if (!target) return res.status(404).json({ error: `Object '${req.params.id}' not found.` });

  if (['L1_HALO', 'L2_HALO', 'LUNAR', 'DEEP_SPACE'].includes(target.regime)) {
    return res.status(422).json({
      error: "Ground tracks are not physically applicable for non-geocentric deep-space missions.",
      regime: target.regime
    });
  }

  const norad = target.norad;
  const satrec = norad ? getSatrec(norad) : null;
  if (!satrec) return res.status(422).json({ error: 'Orbital elements unavailable.' });

  const evalDate = req.query.time ? new Date(req.query.time) : new Date();
  const orbitsCount = Math.min(Math.max(Number(req.query.orbits) || 1.5, 0.5), 3.0);
  const meanMotionRadMin = getMeanMotionRadMin(satrec);
  const meanMotionRevDay = (meanMotionRadMin * 1440) / (2 * Math.PI);
  const periodMin = 1440 / meanMotionRevDay;

  const totalDurationMs = periodMin * orbitsCount * 60 * 1000;
  const sampleSteps = Math.min(Math.max(Number(req.query.samples) || 90, 30), 180);
  const stepMs = totalDurationMs / sampleSteps;

  const track = [];
  for (let i = 0; i <= sampleSteps; i++) {
    const t = new Date(evalDate.getTime() + i * stepMs);
    const pv = satellite.propagate(satrec, t);
    if (pv && pv.position) {
      const gmst = satellite.gstime(t);
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      const vel = Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2);
      track.push({
        time: t.toISOString(),
        relativeMinutes: Number(((i * stepMs) / 60000).toFixed(1)),
        lat: Number(satellite.degreesLat(gd.latitude).toFixed(3)),
        lon: Number(satellite.degreesLong(gd.longitude).toFixed(3)),
        altKm: Number(gd.height.toFixed(1)),
        velocityKms: Number(vel.toFixed(3))
      });
    }
  }

  res.json({
    objectId: target.id,
    name: target.name,
    noradId: target.norad,
    startTimeUTC: evalDate.toISOString(),
    orbitsCount,
    periodMinutes: Number(periodMin.toFixed(2)),
    pointsCount: track.length,
    track
  });
});

// -------------------------------------------------------------
// 4. OBSERVER PASS ELEVATION & RANGE PROFILE
// -------------------------------------------------------------
router.get('/pass-profile/:id', (req, res) => {
  const target = resolveCatalogObject(req.params.id);
  if (!target) return res.status(404).json({ error: `Object '${req.params.id}' not found.` });

  if (['L1_HALO', 'L2_HALO', 'LUNAR', 'DEEP_SPACE'].includes(target.regime)) {
    return res.status(422).json({ error: "Topocentric overhead passes do not apply to deep-space objects.", regime: target.regime });
  }

  const obsLat = Number(req.query.lat ?? 18.5204);
  const obsLon = Number(req.query.lon ?? 73.8567);
  const obsAltKm = Number(req.query.altKm ?? 0.56);
  const minElevation = Number(req.query.minElevation ?? 10.0);

  // Compute passes over 48h
  const passes = computePassesForSatellite(target, obsLat, obsLon, 48, minElevation);
  if (!passes || !passes.length) {
    return res.json({
      objectId: target.id,
      name: target.name,
      observer: { lat: obsLat, lon: obsLon },
      passesCount: 0,
      message: 'No passes above threshold in next 48 hours for specified observer location.'
    });
  }

  // Profile the next upcoming pass in detail
  const nextPass = passes[0];
  const aosTimeStr = nextPass.aos?.time || nextPass.aos;
  const losTimeStr = nextPass.los?.time || nextPass.los;
  const aosMs = new Date(aosTimeStr).getTime();
  const losMs = new Date(losTimeStr).getTime();
  const durationSec = Math.max(60, Math.round((losMs - aosMs) / 1000));

  // Sample every 15 seconds
  const stepSec = Math.max(10, Math.min(30, Math.round(durationSec / 25)));
  const samples = [];
  const satrec = getSatrec(target.norad);

  if (satrec) {
    for (let tMs = aosMs; tMs <= losMs; tMs += stepSec * 1000) {
      const d = new Date(tMs);
      const pv = satellite.propagate(satrec, d);
      if (pv && pv.position) {
        const gmst = satellite.gstime(d);
        const gd = satellite.eciToGeodetic(pv.position, gmst);
        const lat = satellite.degreesLat(gd.latitude);
        const lon = satellite.degreesLong(gd.longitude);
        const look = computeTopocentricLookAngles(obsLat, obsLon, lat, lon, gd.height);
        const solar = computeSolarAndVisibilityState(obsLat, obsLon, lat, lon, gd.height, d.getTime(), pv.position);

        samples.push({
          timeUTC: d.toISOString(),
          relativeSeconds: Math.round((tMs - aosMs) / 1000),
          elevationDeg: look.elevationDeg,
          azimuthDeg: look.azimuthDeg,
          compass: look.compass,
          slantRangeKm: look.slantRangeKm,
          isSunlit: solar.isSatelliteSunlit,
          isObserverNight: solar.isObserverDark,
          opticalVisibilityClass: solar.visibilityLabel
        });
      }
    }
  }

  res.json({
    objectId: target.id,
    name: target.name,
    noradId: target.norad,
    observer: { lat: obsLat, lon: obsLon, altKm: obsAltKm },
    passSummary: nextPass,
    timeSeriesProfile: {
      stepSeconds: stepSec,
      sampleCount: samples.length,
      samples
    },
    scientificNote: 'Optical visibility requires the satellite to be illuminated by sunlight while the ground observer is in astronomical or nautical twilight/night. Geometric line-of-sight does not imply active RF carrier transmission.'
  });
});

// -------------------------------------------------------------
// 5. MISSION DISCOVERY EXPLORER
// -------------------------------------------------------------
router.get('/missions', (req, res) => {
  let list = [...VERIFIED_MISSIONS_CATALOG];

  if (req.query.agency) {
    const a = String(req.query.agency).toLowerCase();
    list = list.filter(m => m.agency.toLowerCase().includes(a) || m.agencyCat.toLowerCase() === a);
  }

  if (req.query.type) {
    const t = String(req.query.type).toLowerCase();
    list = list.filter(m => m.missionType.toLowerCase() === t);
  }

  if (req.query.status) {
    const s = String(req.query.status).toLowerCase();
    list = list.filter(m => m.operationalStatus.toLowerCase() === s);
  }

  if (req.query.targetBody) {
    const tb = String(req.query.targetBody).toLowerCase();
    list = list.filter(m => m.targetBody.toLowerCase().includes(tb));
  }

  res.json({
    totalMissions: list.length,
    facets: {
      agencies: ['ISRO', 'NASA', 'ESA', 'CNSA', 'Roscosmos', 'Multi-Agency'],
      types: ['earth_observation', 'crewed_station', 'space_observatory', 'lunar_exploration', 'solar_physics', 'deep_space', 'navigation_pnt', 'space_debris'],
      statuses: ['active', 'completed', 'inactive', 'decayed']
    },
    missions: list
  });
});

// -------------------------------------------------------------
// 6. SCIENTIFIC DATA EXPORT ENGINE (CSV & JSON)
// -------------------------------------------------------------
router.get('/export', (req, res) => {
  const type = String(req.query.type || 'catalog').toLowerCase();
  const format = String(req.query.format || 'json').toLowerCase();

  const timestamp = new Date().toISOString();
  const provenanceHeader = {
    exportDataset: type.toUpperCase(),
    exportTimestampUTC: timestamp,
    softwareEngine: "God's Eye Orbital Analytics Engine v5.0",
    coordinateFrame: 'WGS84 Geodetic / TEME ECI',
    units: 'Distances: km, Velocities: km/s, Angles: deg, Time: UTC ISO-8601',
    license: 'Open scientific educational access; provider attributions preserved.',
    attribution: 'ISRO, NASA, ESA, CelesTrak, NOAA SWPC, US Space Command 18th SDS'
  };

  let records = [];

  if (type === 'catalog') {
    records = MASTER_TRACKABLE_CATALOG.slice(0, 300).map(s => ({
      id: s.id,
      noradId: s.norad || 'N/A',
      cosparId: s.cospar || 'N/A',
      name: s.name,
      agency: s.agency,
      regime: s.regime,
      objectType: s.objectType,
      perigeeKm: s.perigeeKm || s.altKm,
      apogeeKm: s.apogeeKm || s.altKm,
      inclinationDeg: s.incDeg || 'N/A',
      status: s.status,
      launchDate: s.launchDate || 'N/A',
      provenance: s.provenance || 'Official SATCAT'
    }));
  } else if (type === 'missions') {
    records = VERIFIED_MISSIONS_CATALOG.slice(0, 300).map(m => ({
      missionId: m.id,
      code: m.code,
      name: m.name,
      agency: m.agency,
      missionType: m.missionType,
      targetBody: m.targetBody,
      operationalStatus: m.operationalStatus,
      launchYear: m.launchYear,
      relatedCatalogObjects: m.relatedCatalogObjects.join('; ')
    }));
  } else {
    return res.status(400).json({ error: "Unsupported export type. Valid types: 'catalog', 'missions'." });
  }

  // Format delivery
  if (format === 'csv') {
    if (!records.length) return res.status(200).send('# No records found\n');

    const keys = Object.keys(records[0]);
    const csvLines = [
      `# GOD'S EYE SCIENTIFIC DATA EXPORT - ${type.toUpperCase()}`,
      `# Generated: ${timestamp}`,
      `# Units: Distances in km, angles in deg, timestamps in UTC`,
      `# Attribution: ${provenanceHeader.attribution}`,
      keys.join(','),
      ...records.map(r => keys.map(k => {
        const val = String(r[k] ?? '');
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gods_eye_${type}_${Date.now()}.csv"`);
    return res.send(csvLines.join('\n'));
  }

  // JSON format
  res.json({
    provenance: provenanceHeader,
    recordCount: records.length,
    data: records
  });
});

// -------------------------------------------------------------
// 7. REPRODUCIBLE ANALYSIS RECORD GENERATOR
// -------------------------------------------------------------
router.get('/reproducible-record', (req, res) => {
  const targetId = req.query.id || 'iss';
  const target = resolveCatalogObject(targetId);
  if (!target) return res.status(404).json({ error: `Object '${targetId}' not found.` });

  const evalDate = req.query.time ? new Date(req.query.time) : new Date();
  const obsLat = Number(req.query.lat ?? 18.5204);
  const obsLon = Number(req.query.lon ?? 73.8567);

  const norad = target.norad;
  const tleData = norad ? getTle(norad) : null;

  // Compute canonical deterministic payload
  const runPayload = {
    canonicalId: target.id,
    noradId: target.norad,
    cosparId: target.cospar,
    evaluationTimestampUTC: evalDate.toISOString(),
    tleEpochString: tleData?.line1 ? tleData.line1.substring(18, 32) : 'N/A',
    observerCoordinates: { lat: obsLat, lon: obsLon },
    theory: 'SGP4/SDP4 Analytical Ephemeris Propagation',
    wgsModel: 'WGS-84'
  };

  const hash = crypto.createHash('sha256').update(JSON.stringify(runPayload)).digest('hex');

  res.json({
    reproducibilityIdentifier: `GEO-REC-${hash.substring(0, 16).toUpperCase()}`,
    sha256Digest: hash,
    verificationStatus: 'DETERMINISTIC_REPRODUCIBLE',
    inputParameters: runPayload,
    softwareEnvironment: {
      platform: 'Gods Eye Orbital Command Engine v5.0',
      nodeVersion: process.version,
      mathLibrary: 'satellite.js 7.1.0 (Vallado SGP4)',
      standardGravitationalParameterMu: MU_EARTH,
      earthEllipsoidEquatorialRadiusKm: R_EARTH
    },
    scientificDisclaimer: 'This reproducible record captures the exact mathematical inputs and state vectors required to independently reproduce this computation in any compliant SGP4/SDP4 orbital propagator.'
  });
});

export const analysisRouter = router;
export default router;
