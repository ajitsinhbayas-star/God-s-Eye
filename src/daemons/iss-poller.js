import { providerRegistry } from '../supervisor/registry.js';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { getDatabase } from '../db/sqlite.js';
import { broadcastWs } from '../realtime/ws-server.js';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';

export function startIssPoller() {
  setInterval(async () => {
    if (!providerRegistry.canExecute('wheretheiss')) return;
    const t0 = Date.now();
    const db = getDatabase();
    const spaceStore = getSpaceStore();

    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { signal: ctrl.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const d = await res.json();
        const latency = Date.now() - t0;
        providerRegistry.recordSuccess('wheretheiss', latency);

        spaceStore.liveISS = {
          latitude: d.latitude,
          longitude: d.longitude,
          altitude: d.altitude,
          velocity: d.velocity,
          visibility: d.visibility || 'daylight',
          timestamp: Date.now()
        };

        const issItem = MASTER_TRACKABLE_CATALOG.find((m) => m.id === 'iss');
        if (issItem) issItem.altKm = Math.round(d.altitude);

        db.run(
          `INSERT OR REPLACE INTO normalized_objects
          (id, name, norad_id, intl_desig, data_class, source_provider, source_record_id, agency, lat, lng, alt_km, velocity_kms, reference_frame, quality_status, epoch, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'iss', 'ISS (ZARYA)', '25544', '1998-067A', 'MEASURED',
            'WhereTheISS.at', '25544', 'NASA/Roscosmos',
            d.latitude, d.longitude, d.altitude, d.velocity / 3600,
            'Geocentric ECI (WGS84)', 'VERIFIED_LIVE',
            new Date(d.timestamp * 1000).toISOString(), new Date().toISOString()
          ]
        );

        broadcastWs({ type: 'ORBITAL_TICK', id: 'iss', lat: d.latitude, lon: d.longitude, alt: d.altitude });
        await saveSpaceStore();
      }
    } catch (err) {
      providerRegistry.recordFailure('wheretheiss', err.message);
    }
  }, 3000);
}
