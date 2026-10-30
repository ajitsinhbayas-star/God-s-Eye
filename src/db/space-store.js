import fs from 'fs';
import path from 'path';
import { SPACE_DB_FILE, DATA_DIR } from '../config/constants.js';

let dbCache = null;
let dbWriteQueue = Promise.resolve();
const BACKUP_DB_FILE = `${SPACE_DB_FILE}.bak`;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getSpaceStore() {
  if (dbCache) return dbCache;

  ensureDataDir();

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
    try {
      fs.writeFileSync(SPACE_DB_FILE, JSON.stringify(defaultStore, null, 2), 'utf-8');
      fs.writeFileSync(BACKUP_DB_FILE, JSON.stringify(defaultStore, null, 2), 'utf-8');
    } catch (_) {}
    dbCache = defaultStore;
    return dbCache;
  }

  // Attempt reading primary store
  try {
    const raw = JSON.parse(fs.readFileSync(SPACE_DB_FILE, 'utf-8'));
    dbCache = { ...defaultStore, ...raw };
    return dbCache;
  } catch (primaryErr) {
    console.warn('[SpaceDB] Primary store read failed. Attempting recovery from backup...', primaryErr.message);
    // Attempt fallback to .bak
    if (fs.existsSync(BACKUP_DB_FILE)) {
      try {
        const backupRaw = JSON.parse(fs.readFileSync(BACKUP_DB_FILE, 'utf-8'));
        console.log('[SpaceDB] Successfully recovered space-db from backup snapshot.');
        dbCache = { ...defaultStore, ...backupRaw };
        // Restore corrupted primary from backup
        fs.writeFileSync(SPACE_DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
        return dbCache;
      } catch (_) {}
    }

    console.error('[SpaceDB] Both primary and backup corrupted. Re-initializing default store.');
    dbCache = defaultStore;
    return dbCache;
  }
}

export function saveSpaceStore() {
  if (!dbCache) return Promise.resolve();
  ensureDataDir();

  dbWriteQueue = dbWriteQueue.then(async () => {
    const tempFile = `${SPACE_DB_FILE}.tmp.${process.pid}.${Date.now()}`;
    const serialized = JSON.stringify(dbCache, null, 2);

    try {
      // 1. Write to isolated temporary file
      await fs.promises.writeFile(tempFile, serialized, 'utf-8');

      // 2. Atomic rename / replace primary file
      try {
        await fs.promises.rename(tempFile, SPACE_DB_FILE);
      } catch (renameErr) {
        // Fallback for Windows if destination file lock temporarily denies rename
        await fs.promises.copyFile(tempFile, SPACE_DB_FILE);
        await fs.promises.unlink(tempFile).catch(() => {});
      }

      // 3. Keep verified snapshot backup
      await fs.promises.copyFile(SPACE_DB_FILE, BACKUP_DB_FILE).catch(() => {});
    } catch (e) {
      console.error('[SpaceDB Atomic Write Error]', e.message);
      // Clean up orphaned temp file if exists
      if (fs.existsSync(tempFile)) {
        await fs.promises.unlink(tempFile).catch(() => {});
      }
    }
  });

  return dbWriteQueue;
}

export async function flushSpaceStore() {
  await dbWriteQueue;
}
