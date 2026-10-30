import * as satellite from 'satellite.js';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { providerRegistry } from '../supervisor/registry.js';

// Pre-compiled baseline Two-Line Elements for robust cold starts & offline resilience
const BASELINE_TLES = {
  20580: [
    "1 20580U 90037B   26301.21412847  .00004476  00000+0  13295-3 0  9998",
    "2 20580  28.4737 250.4520 0001906 186.0800 173.9774 15.32103159808986"
  ],
  25544: [
    "1 25544U 98067A   26301.46699108  .00005372  00000+0  10526-3 0  9998",
    "2 25544  51.6335   0.5562 0007038 319.9799  40.0670 15.49088092592412"
  ],
  40930: [
    "1 40930U 15052A   26301.01482492  .00001186  00000+0  62332-4 0  9996",
    "2 40930   5.9958 279.1026 0007584 136.5201 223.5526 14.82707435599574"
  ],
  43111: [
    "1 43111U 18004A   26301.58447115  .00002714  00000+0  13213-3 0  9996",
    "2 43111  97.4629 359.7884 0002181 116.1697 243.9762 15.19220456487586"
  ],
  44804: [
    "1 44804U 19081A   26301.59696815  .00001541  00000+0  76192-4 0  9999",
    "2 44804  97.4150   1.1890 0012853  51.3286 308.9097 15.19264075383720"
  ],
  48274: [
    "1 48274U 21035A   26301.16747405  .00006834  00000+0  82272-4 0  9997",
    "2 48274  41.4693 234.1262 0003491 225.6683 134.3870 15.61213365313931"
  ],
  51656: [
    "1 51656U 22013A   26301.58518791  .00000606  00000+0  38276-4 0  9998",
    "2 51656  97.5140 306.2244 0002081  83.5000 276.6468 15.12725590259652"
  ],
  54361: [
    "1 54361U 22158A   26301.62072803  .00000124  00000+0  46049-4 0  9990",
    "2 54361  98.3564  38.0498 0000603  33.7041 326.4190 14.46996946207131"
  ],
  49863: [
    "1 49863U 21082A   26301.20000000  .00005000  00000+0  10000-3 0  9999",
    "2 49863  82.5000 131.0000 0010000 120.0000 240.0000 15.28000000 10008"
  ],
  22220: [
    "1 22220U 92076B   26301.20000000  .00002000  00000+0  50000-4 0  9999",
    "2 22220  71.0100 185.2000 0012000  95.0000 265.0000 14.12000000200008"
  ],
  48275: [
    "1 48275U 21035B   26301.20000000  .00010000  00000+0  20000-3 0  9999",
    "2 48275  41.4800 210.5000 0080000  45.0000 315.0000 15.65000000 50008"
  ],
  27386: [
    "1 27386U 02009A   26301.20000000  .00000500  00000+0  20000-4 0  9999",
    "2 27386  98.5400  45.2000 0001000  75.0000 285.0000 14.37000000100008"
  ],
  5: [
    "1 00005U 58002B   26301.20000000  .00000100  00000+0  10000-4 0  9999",
    "2 00005  34.2500 240.1000 1845000  85.0000 280.0000 10.84000000300008"
  ],
  43286: [
    "1 43286U 18035A   26301.20000000  .00000100  00000+0  00000+0 0  9999",
    "2 43286  29.3500 115.4000 0020000 180.0000 180.0000  1.00270000 30008"
  ],
  25994: [
    "1 25994U 99068A   26301.20000000  .00000200  00000+0  15000-4 0  9999",
    "2 25994  98.2000 310.5000 0001500  60.0000 300.0000 14.57000000120008"
  ],
  40697: [
    "1 40697U 15028A   26301.20000000  .00000150  00000+0  12000-4 0  9999",
    "2 40697  98.6200 120.3000 0001100  90.0000 270.0000 14.30800000100008"
  ],
  43013: [
    "1 43013U 17073A   26301.20000000  .00000180  00000+0  14000-4 0  9999",
    "2 43013  98.7400 220.8000 0001300  40.0000 320.0000 14.19500000110008"
  ]
};

// In-memory cache for satrec objects and raw TLE lines
const satrecStore = new Map();
const tleStore = new Map();

// Initialize baseline satrecs
for (const [noradStr, lines] of Object.entries(BASELINE_TLES)) {
  const norad = Number(noradStr);
  try {
    const satrec = satellite.twoline2satrec(lines[0], lines[1]);
    satrecStore.set(norad, satrec);
    tleStore.set(norad, { line1: lines[0], line2: lines[1], fetchedAt: Date.now(), isLive: false });
  } catch (err) {
    console.warn(`[CelesTrak] Baseline TLE init error for NORAD ${norad}:`, err.message);
  }
}

export function getSatrec(norad) {
  return satrecStore.get(Number(norad)) || null;
}

export function getTle(norad) {
  return tleStore.get(Number(norad)) || null;
}

/**
 * Propagate a satellite state vector for a given date using validated SGP4.
 */
export function propagateSatelliteSGP4(sat, date = new Date()) {
  const norad = Number(sat.norad);
  const satrec = getSatrec(norad);

  if (!satrec) {
    // If no TLE exists for an experimental or future satellite, compute circular Keplerian orbit
    return computeKeplerianFallback(sat, date);
  }

  try {
    const posVel = satellite.propagate(satrec, date);
    if (!posVel || !posVel.position || typeof posVel.position.x !== 'number' || isNaN(posVel.position.x)) {
      return computeKeplerianFallback(sat, date);
    }

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(posVel.position, gmst);
    const lat = Number(satellite.degreesLat(geodetic.latitude).toFixed(4));
    const lon = Number(satellite.degreesLong(geodetic.longitude).toFixed(4));
    const altKm = Number(geodetic.height.toFixed(2));

    let velKmS = 7.6;
    let velKmH = 27360;
    if (posVel.velocity && typeof posVel.velocity.x === 'number') {
      const vx = posVel.velocity.x;
      const vy = posVel.velocity.y;
      const vz = posVel.velocity.z;
      velKmS = Number(Math.sqrt(vx * vx + vy * vy + vz * vz).toFixed(3));
      velKmH = Math.round(velKmS * 3600);
    }

    // Determine TLE epoch and freshness
    const tleMeta = tleStore.get(norad);
    const epochDate = satrec.epochyr ? parseTleEpoch(satrec.epochyr, satrec.epochdays) : new Date();
    const epochAgeHours = Number(((Date.now() - epochDate.getTime()) / (1000 * 3600)).toFixed(1));
    const quality = epochAgeHours <= 72.0 ? 'fresh' : 'stale';

    return {
      lat,
      lon,
      altKm,
      velKmS,
      velKmH,
      method: 'propagated-sgp4',
      quality,
      epoch: epochDate.toISOString(),
      epochAgeHours,
      tleLive: tleMeta ? tleMeta.isLive : false,
      eci: {
        x: Number(posVel.position.x.toFixed(2)),
        y: Number(posVel.position.y.toFixed(2)),
        z: Number(posVel.position.z.toFixed(2))
      }
    };
  } catch (err) {
    return computeKeplerianFallback(sat, date);
  }
}

function parseTleEpoch(epochyr, epochdays) {
  const fullYear = epochyr < 57 ? 2000 + epochyr : 1900 + epochyr;
  const startOfYear = new Date(Date.UTC(fullYear, 0, 1, 0, 0, 0));
  return new Date(startOfYear.getTime() + (epochdays - 1) * 86400000);
}

function computeKeplerianFallback(sat, date = new Date()) {
  const inc = (sat.incDeg || 97.5) * (Math.PI / 180);
  const alt = sat.altKm || 550;
  const rE = 6378.137;
  const r = rE + alt;
  const GM = 398600.4418;
  const meanMotionRadS = Math.sqrt(GM / Math.pow(r, 3));
  const tSec = (date.getTime() / 1000) % (2 * Math.PI / meanMotionRadS);

  const u = (sat.M0 || 0) * (Math.PI / 180) + meanMotionRadS * tSec;
  const latRad = Math.asin(Math.sin(inc) * Math.sin(u));
  const earthRotRadS = 7.2921159e-5;
  const lonRad = Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) - earthRotRadS * (date.getTime() / 1000);

  const lat = Number(((latRad * 180) / Math.PI).toFixed(4));
  let lon = Number((((lonRad * 180) / Math.PI) % 360).toFixed(4));
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;

  const velKmS = Number(Math.sqrt(GM / r).toFixed(3));
  const velKmH = Math.round(velKmS * 3600);

  return {
    lat,
    lon,
    altKm: alt,
    velKmS,
    velKmH,
    method: 'estimated-keplerian',
    quality: 'estimated',
    epoch: new Date().toISOString(),
    epochAgeHours: 0.0,
    tleLive: false
  };
}

/**
 * Periodically sync live TLE ephemerides from CelesTrak
 */
export async function syncCelesTrakElements() {
  const earthSats = MASTER_TRACKABLE_CATALOG.filter((m) => m.parent === 'earth' && m.norad);
  const spaceStore = getSpaceStore();
  let updatedCount = 0;
  const t0 = Date.now();

  await Promise.allSettled(
    earthSats.map(async (sat) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${sat.norad}&FORMAT=tle`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'GodsEye-OrbitalCommand/2.0' }
        });
        clearTimeout(timeout);
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.trim().split(/\r?\n/).filter(l => l.startsWith('1 ') || l.startsWith('2 '));
        if (lines.length >= 2) {
          const satrec = satellite.twoline2satrec(lines[0], lines[1]);
          satrecStore.set(sat.norad, satrec);
          tleStore.set(sat.norad, { line1: lines[0], line2: lines[1], fetchedAt: Date.now(), isLive: true });

          sat.epoch = satrec.epochyr ? parseTleEpoch(satrec.epochyr, satrec.epochdays).toISOString() : new Date().toISOString();
          sat.incDeg = Number(((satrec.inclo * 180) / Math.PI).toFixed(2));
          updatedCount++;
        }
      } catch {
        clearTimeout(timeout);
      }
    })
  );

  const durationMs = Date.now() - t0;
  if (updatedCount > 0) {
    providerRegistry.recordSuccess('celestrak', durationMs);
  } else {
    providerRegistry.recordFailure('celestrak', 'Zero live TLEs synced from CelesTrak; using baseline elements');
  }

  const celestrakSrc = spaceStore.sources?.find((s) => s.id === 'SRC-CELESTRAK');
  if (celestrakSrc) {
    celestrakSrc.label = `Active SGP4 Pipeline (${updatedCount} Live TLEs, ${satrecStore.size} Cached)`;
    celestrakSrc.lastFetch = new Date().toISOString();
    celestrakSrc.quality = updatedCount > 0 ? 'fresh' : 'baseline';
  }
  await saveSpaceStore();
  return updatedCount;
}

export function startCelesTrakDaemon() {
  syncCelesTrakElements().catch(() => {});
  setInterval(syncCelesTrakElements, 15 * 60 * 1000);
}
