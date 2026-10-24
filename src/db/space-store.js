import fs from 'fs';
import { SPACE_DB_FILE } from '../config/constants.js';

let dbCache = null;
let dbWriteQueue = Promise.resolve();

export function getSpaceStore() {
  if (dbCache) return dbCache;

  const defaultStore = {
    lastUpdated: new Date().toISOString(),
    syncCycles: 0,
    liveISS: { latitude: 18.52, longitude: 73.85, altitude: 418.4, velocity: 27580, visibility: 'daylight', timestamp: Date.now() },
    externalIntel: {
      spaceWeather: { kpIndex: 2.33, stormLevel: 'G0 (Quiet)', updatedAt: new Date().toISOString() },
      neoApproaches: [],
      missionNews: []
    },
    sources: [
      { id: 'SRC-ISS-LIVE', name: 'WhereTheISS Live Ephemeris API', detail: 'Real-time ISS coordinates', status: 'ok', label: 'Connected (Live)', lastFetch: new Date().toISOString(), latencyMs: 142 },
      { id: 'SRC-CELESTRAK', name: 'CelesTrak / NORAD GP Elements', detail: 'Active satellite TLE vectors', status: 'ok', label: 'Synced (3,200+ vectors)', lastFetch: new Date().toISOString(), latencyMs: 210 },
      { id: 'SRC-NOAA-SWPC', name: 'NOAA SWPC Space Weather Feed', detail: 'Planetary Kp-Index', status: 'ok', label: 'Connected (Live Kp)', lastFetch: new Date().toISOString(), latencyMs: 165 },
      { id: 'SRC-JPL-CAD', name: 'NASA JPL Close-Approach (CAD) API', detail: 'Near-Earth Asteroid flybys', status: 'ok', label: 'Connected (Live NEO)', lastFetch: new Date().toISOString(), latencyMs: 230 }
    ],
    watchlist: ['ISS', 'CARTOSAT3', 'ADITYA_L1', 'EOS04'],
    preferences: {
      prefClose: true,
      prefPass: true,
      prefReentry: true,
      prefMission: true,
      prefHealth: true,
      observerLat: 18.5204,
      observerLon: 73.8567,
      observerName: 'Pune / India Sector'
    },
    events: []
  };

  if (!fs.existsSync(SPACE_DB_FILE)) {
    fs.writeFileSync(SPACE_DB_FILE, JSON.stringify(defaultStore, null, 2), 'utf-8');
    dbCache = defaultStore;
    return dbCache;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(SPACE_DB_FILE, 'utf-8'));
    dbCache = { ...defaultStore, ...raw };
    return dbCache;
  } catch {
    dbCache = defaultStore;
    return dbCache;
  }
}

export function saveSpaceStore() {
  if (!dbCache) return Promise.resolve();
  dbWriteQueue = dbWriteQueue.then(async () => {
    try {
      await fs.promises.writeFile(SPACE_DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
    } catch (e) {
      console.error('[SpaceDB Write Error]', e.message);
    }
  });
  return dbWriteQueue;
}
