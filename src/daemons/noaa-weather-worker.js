import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';

export async function syncNoaaSpaceWeather() {
  const spaceStore = getSpaceStore();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 1) {
        const latest = rows[rows.length - 1];
        const kp = parseFloat(latest[1]) || 2.0;
        spaceStore.externalIntel.spaceWeather = {
          kpIndex: kp,
          stormLevel: kp >= 5 ? 'G1 (Active)' : 'G0 (Quiet)',
          updatedAt: new Date().toISOString()
        };
        await saveSpaceStore();
      }
    }
  } catch {}
}

export function startNoaaDaemon() {
  syncNoaaSpaceWeather();
  setInterval(syncNoaaSpaceWeather, 10 * 60 * 1000);
}
