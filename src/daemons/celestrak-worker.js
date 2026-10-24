import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';

export async function syncCelesTrakElements() {
  const earthSats = MASTER_TRACKABLE_CATALOG.filter((m) => m.parent === 'earth' && m.norad);
  const spaceStore = getSpaceStore();
  let updatedCount = 0;

  await Promise.allSettled(
    earthSats.map(async (sat) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${sat.norad}&FORMAT=json`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return;
        const gpArray = await res.json();
        if (gpArray && gpArray[0]) {
          const gp = gpArray[0];
          if (typeof gp.INCLINATION === 'number') sat.incDeg = gp.INCLINATION;
          sat.epoch = gp.EPOCH || new Date().toISOString();
          updatedCount++;
        }
      } catch {
        clearTimeout(timeout);
      }
    })
  );

  const celestrakSrc = spaceStore.sources.find((s) => s.id === 'SRC-CELESTRAK');
  if (celestrakSrc) {
    celestrakSrc.label = `Synced (${updatedCount} NORAD vectors)`;
    celestrakSrc.lastFetch = new Date().toISOString();
  }
  await saveSpaceStore();
}

export function startCelesTrakDaemon() {
  syncCelesTrakElements();
  setInterval(syncCelesTrakElements, 15 * 60 * 1000);
}
