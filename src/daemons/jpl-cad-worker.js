import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { providerRegistry } from '../supervisor/registry.js';

export async function syncJplAsteroids() {
  const spaceStore = getSpaceStore();
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.05&date-min=now&limit=3', { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        spaceStore.externalIntel.neoApproaches = data.data.map(r => ({
          des: String(r[0]),
          distKm: Math.round(parseFloat(r[4] || 0.02) * 149597870.7)
        }));
        await saveSpaceStore();
        providerRegistry.recordSuccess('nasa_jpl_cad', Date.now() - t0);
        return;
      }
    }
    providerRegistry.recordFailure('nasa_jpl_cad', `HTTP ${res.status}`);
  } catch (err) {
    providerRegistry.recordFailure('nasa_jpl_cad', err.message);
  }
}

export function startJplCadDaemon() {
  syncJplAsteroids();
  setInterval(syncJplAsteroids, 10 * 60 * 1000);
}
