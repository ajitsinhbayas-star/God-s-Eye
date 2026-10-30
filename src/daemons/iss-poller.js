import { providerRegistry } from '../supervisor/registry.js';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { getDatabase } from '../db/sqlite.js';
import { broadcastWs } from '../realtime/ws-server.js';
import { dataDistributionService, CHANNELS, EVENT_TYPES } from '../realtime/data-distribution.js';
import { validateSatelliteRecord } from '../supervisor/data-validator.js';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';

export async function pollIssOnce({ signal } = {}) {
  if (!providerRegistry.canExecute('wheretheiss')) {
    return { recordsFetched: 0, recordsAccepted: 0, recordsRejected: 0, skipped: true };
  }

  const t0 = Date.now();
  const db = getDatabase();
  const spaceStore = getSpaceStore();

  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { signal });
    if (!res.ok) throw new Error(`WhereTheISS.at HTTP ${res.status}`);

    const d = await res.json();
    const latency = Date.now() - t0;

    // Validate incoming telemetry
    const validation = validateSatelliteRecord({
      noradId: '25544',
      name: 'ISS (ZARYA)',
      latitude: d.latitude,
      longitude: d.longitude,
      altitude: d.altitude,
      velocity: d.velocity,
      timestamp: d.timestamp ? d.timestamp * 1000 : Date.now(),
      isPropagated: false
    }, 'WhereTheISS.at');

    if (!validation.valid) {
      providerRegistry.recordFailure('wheretheiss', validation.error);
      return { recordsFetched: 1, recordsAccepted: 0, recordsRejected: 1, error: validation.error };
    }

    const satData = validation.data;
    providerRegistry.recordSuccess('wheretheiss', latency, 1, satData.observationTimestamp);

    spaceStore.liveISS = {
      latitude: satData.coordinates.lat,
      longitude: satData.coordinates.lon,
      altitude: satData.coordinates.altKm,
      velocity: Math.round(satData.velocityKmH),
      visibility: d.visibility || 'daylight',
      timestamp: Date.now()
    };

    const issItem = MASTER_TRACKABLE_CATALOG.find((m) => m.id === 'iss');
    if (issItem) issItem.altKm = Math.round(satData.coordinates.altKm);

    try {
      db.run(
        `INSERT OR REPLACE INTO normalized_objects
        (id, name, norad_id, intl_desig, data_class, source_provider, source_record_id, agency, lat, lng, alt_km, velocity_kms, reference_frame, quality_status, epoch, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          satData.id, satData.name, satData.noradId, '1998-067A', satData.dataClassification,
          satData.originalProvider, satData.originalRecordId, 'NASA/Roscosmos',
          satData.coordinates.lat, satData.coordinates.lon, satData.coordinates.altKm, satData.velocityKmS,
          'Geocentric ECI (WGS84)', satData.qualityStatus,
          satData.observationTimestamp, satData.retrievalTimestamp
        ]
      );
    } catch (_) {}

    // Selective data distribution
    dataDistributionService.broadcast(
      [CHANNELS.EARTH, CHANNELS.HOME, CHANNELS.ALERT],
      EVENT_TYPES.SATELLITE_STATE_UPDATED,
      {
        id: 'iss',
        name: 'ISS (ZARYA)',
        lat: satData.coordinates.lat,
        lon: satData.coordinates.lon,
        altKm: satData.coordinates.altKm,
        velKmS: satData.velocityKmS,
        timestamp: satData.observationTimestamp
      }
    );

    broadcastWs({ type: 'ORBITAL_TICK', id: 'iss', lat: satData.coordinates.lat, lon: satData.coordinates.lon, alt: satData.coordinates.altKm });
    await saveSpaceStore();

    return { recordsFetched: 1, recordsAccepted: 1, recordsRejected: 0 };
  } catch (err) {
    providerRegistry.recordFailure('wheretheiss', err.message);
    throw err;
  }
}

export function startIssPoller() {
  setInterval(() => {
    pollIssOnce().catch(() => {});
  }, 5000);
}
