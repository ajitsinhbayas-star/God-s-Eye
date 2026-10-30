/**
 * ORBITAL EYE — WORKER REGISTRY INITIALIZER
 * Wires real background daemons to the Central WorkerManager.
 */
import { workerManager } from './worker-manager.js';
import { syncCelesTrakElements } from '../daemons/celestrak-worker.js';
import { pollIssOnce } from '../daemons/iss-poller.js';
import { syncNoaaSpaceWeather } from '../daemons/noaa-weather-worker.js';
import { fetchRainViewerData, fetchActiveCyclones } from '../daemons/weather-worker.js';
import { syncJplAsteroids } from '../daemons/jpl-cad-worker.js';
import { syncAllBenchmarkDistricts } from '../daemons/district-weather-worker.js';
import { pollCpcbStations } from '../daemons/airquality-worker.js';
import { harvestNews } from '../daemons/news-harvester.js';

let initialized = false;

export function initWorkerRegistry() {
  if (initialized) return workerManager;
  initialized = true;

  // 1. CelesTrak SGP4 Satellite Ingestion (Cadence: 4 hours)
  workerManager.registerWorker({
    id: 'worker_sgp4_celestrak',
    name: 'SGP4 Satellite Orbit Propagator & CelesTrak Ingestion',
    subsystem: 'space',
    cadenceMs: 4 * 60 * 60 * 1000,
    timeoutMs: 30000,
    runFn: async ({ signal }) => {
      return await syncCelesTrakElements({ signal });
    }
  });

  // 2. Real-Time ISS Streamer (Cadence: 5 seconds)
  workerManager.registerWorker({
    id: 'worker_live_iss',
    name: 'Real-Time ISS Downlink Streamer',
    subsystem: 'space',
    cadenceMs: 5000,
    timeoutMs: 5000,
    runFn: async ({ signal }) => {
      return await pollIssOnce({ signal });
    }
  });

  // 3. NOAA SWPC Planetary Kp-Index Space Weather (Cadence: 10 minutes)
  workerManager.registerWorker({
    id: 'worker_space_weather',
    name: 'NOAA SWPC Planetary Kp-Index Space Weather Poller',
    subsystem: 'space',
    cadenceMs: 10 * 60 * 1000,
    timeoutMs: 10000,
    runFn: async ({ signal }) => {
      return await syncNoaaSpaceWeather({ signal });
    }
  });

  // 4. RainViewer Doppler Radar & NOAA Cyclones (Cadence: 3 minutes)
  workerManager.registerWorker({
    id: 'worker_weather_radar',
    name: 'RainViewer Doppler Radar & Cyclone Sentinel',
    subsystem: 'atmosphere',
    cadenceMs: 3 * 60 * 1000,
    timeoutMs: 15000,
    runFn: async ({ signal }) => {
      const radar = await fetchRainViewerData({ signal });
      const storms = await fetchActiveCyclones({ signal });
      return {
        recordsFetched: (radar?.recordsFetched || 1) + (storms?.recordsFetched || 0),
        recordsAccepted: (radar?.recordsAccepted || 1) + (storms?.recordsAccepted || 0),
        recordsRejected: (radar?.recordsRejected || 0) + (storms?.recordsRejected || 0)
      };
    }
  });

  // 5. NASA JPL Close-Approach NEO CAD (Cadence: 30 minutes)
  workerManager.registerWorker({
    id: 'worker_jpl_cad',
    name: 'NASA JPL Close-Approach Data (CAD) NEO Monitor',
    subsystem: 'space',
    cadenceMs: 30 * 60 * 1000,
    timeoutMs: 15000,
    runFn: async ({ signal }) => {
      return await syncJplAsteroids({ signal });
    }
  });

  // 6. Indian District Agro-Weather NWP (Cadence: 30 minutes)
  workerManager.registerWorker({
    id: 'worker_district_weather',
    name: 'Indian District High-Resolution Weather & Kisan Advisories',
    subsystem: 'atmosphere',
    cadenceMs: 30 * 60 * 1000,
    timeoutMs: 25000,
    runFn: async ({ signal }) => {
      return await syncAllBenchmarkDistricts({ signal });
    }
  });

  // 7. CPCB National Air Quality NAQI (Cadence: 15 minutes)
  workerManager.registerWorker({
    id: 'worker_airquality_cpcb',
    name: 'CPCB National Air Quality & Atmospheric Chemistry Monitor',
    subsystem: 'air_quality',
    cadenceMs: 15 * 60 * 1000,
    timeoutMs: 20000,
    runFn: async ({ signal }) => {
      return await pollCpcbStations({ signal });
    }
  });

  // 8. Space Intelligence & Observatory News Harvester (Cadence: 60 minutes)
  workerManager.registerWorker({
    id: 'worker_news',
    name: 'Orbital Situational News & Space Intelligence Harvester',
    subsystem: 'general',
    cadenceMs: 60 * 60 * 1000,
    timeoutMs: 15000,
    runFn: async ({ signal }) => {
      return await harvestNews({ signal });
    }
  });

  console.log('[Worker Registry] 8 automated workers successfully registered with cadence scheduling.');
  return workerManager;
}
