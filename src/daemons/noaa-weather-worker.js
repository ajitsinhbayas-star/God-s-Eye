import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { providerRegistry } from '../supervisor/registry.js';

/**
 * Maps NOAA Planetary Kp Index to official NOAA Geomagnetic Storm Scale (G-Scale).
 * https://www.swpc.noaa.gov/noaa-scales-explanation
 */
export function mapKpToNoaaGScale(kp) {
  if (typeof kp !== 'number' || isNaN(kp) || kp < 0) {
    return { code: 'G0', label: 'G0 (Quiet / Below Threshold)', severity: 'nominal' };
  }
  if (kp >= 9.0) return { code: 'G5', label: 'G5 (Extreme Geomagnetic Storm)', severity: 'critical' };
  if (kp >= 8.0) return { code: 'G4', label: 'G4 (Severe Geomagnetic Storm)', severity: 'high' };
  if (kp >= 7.0) return { code: 'G3', label: 'G3 (Strong Geomagnetic Storm)', severity: 'elevated' };
  if (kp >= 6.0) return { code: 'G2', label: 'G2 (Moderate Geomagnetic Storm)', severity: 'moderate' };
  if (kp >= 5.0) return { code: 'G1', label: 'G1 (Minor Geomagnetic Storm)', severity: 'minor' };
  if (kp >= 4.0) return { code: 'G0', label: 'G0 (Unsettled / Active)', severity: 'nominal' };
  return { code: 'G0', label: 'G0 (Quiet / Nominal)', severity: 'nominal' };
}

export async function syncNoaaSpaceWeather() {
  const spaceStore = getSpaceStore();
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'GodsEye-OrbitalCommand/2.0' }
    });
    clearTimeout(timer);

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 1) {
        // Find latest valid row [time_tag, kp_index, a_running, station_count]
        const latest = rows[rows.length - 1];
        const rawKp = parseFloat(latest[1]);
        const kp = !isNaN(rawKp) ? rawKp : 0.0;
        const gScale = mapKpToNoaaGScale(kp);

        spaceStore.externalIntel.spaceWeather = {
          kpIndex: Number(kp.toFixed(2)),
          stormLevel: gScale.label,
          gScaleCode: gScale.code,
          severity: gScale.severity,
          observationTimeUTC: latest[0] || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          quality: 'fresh',
          provider: 'NOAA Space Weather Prediction Center (SWPC)'
        };
        await saveSpaceStore();
        providerRegistry.recordSuccess('noaa_swpc', Date.now() - t0);
        return spaceStore.externalIntel.spaceWeather;
      }
    }
    providerRegistry.recordFailure('noaa_swpc', `HTTP ${res.status}`);
  } catch (err) {
    providerRegistry.recordFailure('noaa_swpc', err.message);
    if (spaceStore.externalIntel?.spaceWeather) {
      spaceStore.externalIntel.spaceWeather.quality = 'stale';
    }
  }
}

export function startNoaaDaemon() {
  syncNoaaSpaceWeather().catch(() => {});
  setInterval(syncNoaaSpaceWeather, 10 * 60 * 1000);
}
