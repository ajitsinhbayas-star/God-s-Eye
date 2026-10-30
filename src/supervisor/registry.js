/**
 * ORBITAL EYE — CENTRAL PROVIDER REGISTRY & GOVERNANCE
 * Maintains live health, circuit breakers, attribution, and licensing
 * across all institutional, scientific, and community telemetry providers.
 */
import { getDatabase } from '../db/sqlite.js';
import { incidentManager } from './incident-manager.js';

export const PROVIDER_STATUS = {
  ACTIVE: 'ACTIVE',
  STALE: 'STALE',
  DEGRADED: 'DEGRADED',
  UNAVAILABLE: 'UNAVAILABLE',
  NEEDS_CREDENTIALS: 'NEEDS_CREDENTIALS',
  NEEDS_AUTHORIZATION: 'NEEDS_AUTHORIZATION',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  DISABLED: 'DISABLED'
};

export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.circuitBreakers = new Map();
    this.initRegistry();
  }

  initRegistry() {
    const list = [
      // --- SPACE & SATELLITE PROVIDERS ---
      {
        id: 'celestrak',
        name: 'CelesTrak NORAD GP',
        category: 'ORBITAL_ELEMENTS',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'Global (LEO, MEO, GEO)',
        attribution: 'Dr. T.S. Kelso / CelesTrak',
        licensing: 'Public Domain / Free for Non-Commercial Educational & Research Use'
      },
      {
        id: 'space_track',
        name: 'Space-Track.org (18th SDS)',
        category: 'ORBITAL_ELEMENTS',
        requiresCredentials: true,
        requiresAuthorization: false,
        geographicCoverage: 'Global Catalog (Space Surveillance Network)',
        attribution: '18th Space Defense Squadron (18 SDS) / US Space Force',
        licensing: 'User Agreement Required / DoD Non-Commercial Attribution'
      },
      {
        id: 'wheretheiss',
        name: 'WhereTheISS.at Downlink',
        category: 'MEASURED_TELEMETRY',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'Global (International Space Station Orbit)',
        attribution: 'Bill Shupp / WhereTheISS.at API',
        licensing: 'Free Open API (Rate-Limited to 1 req/sec)'
      },
      {
        id: 'nasa_horizons',
        name: 'NASA/JPL Horizons System',
        category: 'SCIENTIFIC_EPHEMERIS',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'Solar System (Heliocentric & Planetary)',
        attribution: 'NASA/JPL Solar System Dynamics Group',
        licensing: 'NASA Open Data Policy'
      },
      {
        id: 'nasa_jpl_cad',
        name: 'NASA/JPL Small-Body CAD',
        category: 'PLANETARY_DEFENSE',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'Near-Earth Space (CNEOS Database)',
        attribution: 'NASA/JPL Center for Near-Earth Object Studies (CNEOS)',
        licensing: 'NASA Open Data Policy'
      },
      {
        id: 'satnogs_db',
        name: 'SatNOGS Open Satellite DB',
        category: 'COMMUNITY_CATALOG',
        requiresCredentials: true,
        requiresAuthorization: false,
        geographicCoverage: 'Global Amateur & Scientific Radio Constellations',
        attribution: 'Libre Space Foundation / SatNOGS Community',
        licensing: 'Creative Commons Attribution-ShareAlike (CC BY-SA 4.0)'
      },
      {
        id: 'esa_discos',
        name: 'ESA DISCOS Database',
        category: 'SPACE_DEBRIS',
        requiresCredentials: true,
        requiresAuthorization: true,
        geographicCoverage: 'Global Spacecraft & Debris Registry',
        attribution: 'European Space Agency (ESA) Space Debris Office',
        licensing: 'Restricted Institutional Authorization Required'
      },

      // --- ATMOSPHERE & WEATHER PROVIDERS ---
      {
        id: 'open_meteo',
        name: 'Open-Meteo NWP Forecast Models',
        category: 'NWP_FORECAST',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'Global (ECMWF, GFS, ICON, DWD)',
        attribution: 'Open-Meteo Meteorological Weather Engine',
        licensing: 'Creative Commons Attribution 4.0 International (CC BY 4.0)'
      },
      {
        id: 'rainviewer',
        name: 'RainViewer Doppler Radar Mosaic',
        category: 'MEASURED_RADAR',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'Global Radar Coverage (> 1000 Radars)',
        attribution: 'RainViewer Real-Time Doppler Radar API v2',
        licensing: 'Fair Use with Attribution'
      },
      {
        id: 'noaa_swpc',
        name: 'NOAA Space Weather Prediction Center',
        category: 'SPACE_WEATHER',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'Planetary (Kp Index, Geomagnetic Storms, Solar Wind)',
        attribution: 'NOAA Space Weather Prediction Center (SWPC)',
        licensing: 'US Government Work / Public Domain'
      },
      {
        id: 'noaa_nhc',
        name: 'NOAA NHC / JTWC Cyclone Sentinel',
        category: 'TROPICAL_CYCLONES',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'Global Basins (North Indian, Bay of Bengal, Arabian Sea, Atlantic)',
        attribution: 'NOAA National Hurricane Center & Joint Typhoon Warning Center',
        licensing: 'US Government Work / Public Domain'
      },
      {
        id: 'nasa_firms',
        name: 'NASA FIRMS Active Fires',
        category: 'THERMAL_ANOMALIES',
        requiresCredentials: true,
        requiresAuthorization: false,
        geographicCoverage: 'Global (MODIS & VIIRS Satellites)',
        attribution: 'NASA Land, Atmosphere Near real-time Capability for EOS (LANCE) FIRMS',
        licensing: 'NASA Open Data Policy (MAP_KEY Required for Full Rate)'
      },
      {
        id: 'imd_weather',
        name: 'India Meteorological Department (IMD) Advisories',
        category: 'AGRO_METEOROLOGY',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'India National (35 States/UTs, 594 Districts)',
        attribution: 'Ministry of Earth Sciences (MoES), Govt of India / IMD Bulletins',
        licensing: 'National Data Sharing and Accessibility Policy (NDSAP)'
      },

      // --- AIR QUALITY PROVIDERS ---
      {
        id: 'cpcb_naqi',
        name: 'CPCB National Air Quality Index (NAQI)',
        category: 'AIR_QUALITY_OBSERVATORY',
        requiresCredentials: false,
        requiresAuthorization: false,
        geographicCoverage: 'India National (Continuous CAAQMS Regulatory Stations)',
        attribution: 'Central Pollution Control Board (CPCB) India / MoEFCC',
        licensing: 'National Data Sharing and Accessibility Policy (NDSAP)'
      },
      {
        id: 'google_air_quality',
        name: 'Google Maps Platform Air Quality API',
        category: 'AIR_QUALITY_OBSERVATORY',
        requiresCredentials: true,
        requiresAuthorization: false,
        geographicCoverage: 'Global & India (supports ind_cpcb local scale)',
        attribution: 'Google Maps Platform Air Quality API',
        licensing: 'Commercial License / API Key Required'
      },
      {
        id: 'iqair',
        name: 'IQAir AirVisual Community API',
        category: 'AIR_QUALITY_OBSERVATORY',
        requiresCredentials: true,
        requiresAuthorization: false,
        geographicCoverage: 'Global Community Sensors (US & CN AQI scales only)',
        attribution: 'IQAir AirVisual Community Network',
        licensing: 'Free Community Tier / Paid Commercial (5 calls/min limit)'
      },
      {
        id: 'aqi_in',
        name: 'AQI.in National Monitoring',
        category: 'AIR_QUALITY_OBSERVATORY',
        requiresCredentials: true,
        requiresAuthorization: true,
        geographicCoverage: 'India City Rankings and Sensor Feed',
        attribution: 'AQI.in National Monitoring Network',
        licensing: 'Official Partner Authorization Required'
      },
      {
        id: 'purpleair',
        name: 'PurpleAir Community Sensors',
        category: 'COMMUNITY_SENSOR',
        requiresCredentials: true,
        requiresAuthorization: false,
        geographicCoverage: 'Global Crowdsourced Laser Particle Counters',
        attribution: 'PurpleAir API Network',
        licensing: 'PurpleAir Points Credit API (Uncalibrated Sensors)'
      },
      {
        id: 'openaq',
        name: 'OpenAQ Global Air Quality Hub',
        category: 'AIR_QUALITY_OBSERVATORY',
        requiresCredentials: true,
        requiresAuthorization: false,
        geographicCoverage: 'Global Regulatory & Citizen Science Data',
        attribution: 'OpenAQ Community Platform',
        licensing: 'Open Data (API Key Required for v3 Access)'
      },
      {
        id: 'airnow',
        name: 'U.S. EPA AirNow API',
        category: 'AIR_QUALITY_OBSERVATORY',
        requiresCredentials: true,
        requiresAuthorization: false,
        geographicCoverage: 'North America (US, Canada, Mexico only — Not India)',
        attribution: 'U.S. Environmental Protection Agency (EPA) AirNow',
        licensing: 'US Government Work / EPA Terms of Service'
      },
      {
        id: 'waqi',
        name: 'World Air Quality Index Project (WAQI)',
        category: 'AIR_QUALITY_OBSERVATORY',
        requiresCredentials: true,
        requiresAuthorization: true,
        geographicCoverage: 'Global Station Directory (waqi.info)',
        attribution: 'World Air Quality Index Project (waqi.info)',
        licensing: 'Explicit Agreement Required for Public Commercial Display'
      }
    ];

    list.forEach(p => {
      let initialStatus = PROVIDER_STATUS.NOT_CONFIGURED;
      let hasCredentials = true;

      if (p.requiresCredentials) {
        if (p.id === 'space_track' && !process.env.SPACE_TRACK_USER) hasCredentials = false;
        if (p.id === 'satnogs_db' && !process.env.SATNOGS_API_KEY) hasCredentials = false;
        if (p.id === 'nasa_firms' && !process.env.FIRMS_MAP_KEY) hasCredentials = false;
        if (p.id === 'google_air_quality' && !(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_AIR_QUALITY_API_KEY)) hasCredentials = false;
        if (p.id === 'iqair' && !process.env.IQAIR_API_KEY) hasCredentials = false;
        if (p.id === 'purpleair' && !process.env.PURPLEAIR_API_KEY) hasCredentials = false;
        if (p.id === 'openaq' && !process.env.OPENAQ_API_KEY) hasCredentials = false;
        if (p.id === 'airnow' && !process.env.AIRNOW_API_KEY) hasCredentials = false;
        if (p.id === 'waqi' && !process.env.WAQI_API_TOKEN) hasCredentials = false;
      }

      if (p.requiresAuthorization) {
        initialStatus = PROVIDER_STATUS.NEEDS_AUTHORIZATION;
      } else if (p.requiresCredentials && !hasCredentials) {
        initialStatus = PROVIDER_STATUS.NEEDS_CREDENTIALS;
      } else {
        initialStatus = PROVIDER_STATUS.NOT_CONFIGURED;
      }

      this.providers.set(p.id, {
        ...p,
        status: initialStatus,
        enabled: true,
        configured: hasCredentials,
        lastAttempt: null,
        lastSuccess: null,
        lastRecordTimestamp: null,
        latencyMs: 0,
        lastError: null,
        recordCount: 0,
        dataFreshness: 'Not Yet Polled',
        successCount: 0,
        failureCount: 0,
        totalCalls: 0
      });

      this.circuitBreakers.set(p.id, { failures: 0, state: 'CLOSED', nextAttempt: 0 });
    });
  }

  getProvider(id) {
    return this.providers.get(id);
  }

  getAllProviders() {
    return Array.from(this.providers.values());
  }

  canExecute(id) {
    const prov = this.providers.get(id);
    if (!prov || !prov.enabled || prov.status === PROVIDER_STATUS.DISABLED) return false;
    if (prov.status === PROVIDER_STATUS.NEEDS_CREDENTIALS || prov.status === PROVIDER_STATUS.NEEDS_AUTHORIZATION) {
      return false;
    }

    const breaker = this.circuitBreakers.get(id);
    if (breaker.state === 'OPEN') {
      if (Date.now() > breaker.nextAttempt) {
        breaker.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(id, latencyMs = 0, recordCount = 1, recordTimestamp = null) {
    const prov = this.providers.get(id);
    const breaker = this.circuitBreakers.get(id);
    if (!prov) return;

    const now = new Date().toISOString();
    prov.lastAttempt = now;
    prov.lastSuccess = now;
    prov.lastRecordTimestamp = recordTimestamp || now;
    prov.lastError = null;
    prov.latencyMs = Math.round(latencyMs);
    prov.recordCount = recordCount;
    prov.status = PROVIDER_STATUS.ACTIVE;
    prov.dataFreshness = 'Real-Time In-Situ';
    prov.successCount += 1;
    prov.totalCalls += 1;

    breaker.failures = 0;
    breaker.state = 'CLOSED';

    // Auto-resolve any incident on this provider
    incidentManager.resolveIncident(id);

    // Persist health update
    this.persistProviderHealth(prov);
  }

  recordFailure(id, errorMsg = 'Unknown error') {
    const prov = this.providers.get(id);
    const breaker = this.circuitBreakers.get(id);
    if (!prov) return;

    const now = new Date().toISOString();
    prov.lastAttempt = now;
    prov.lastError = String(errorMsg);
    prov.failureCount += 1;
    prov.totalCalls += 1;

    breaker.failures += 1;
    if (breaker.failures >= 3) {
      breaker.state = 'OPEN';
      breaker.nextAttempt = Date.now() + 60000;
      prov.status = prov.lastSuccess ? PROVIDER_STATUS.DEGRADED : PROVIDER_STATUS.UNAVAILABLE;
      prov.dataFreshness = 'Stale / Degraded';
    }

    incidentManager.recordIncident(id, null, 'WARN', `Provider ${prov.name} request failed: ${errorMsg}`, { error: errorMsg, latencyMs: prov.latencyMs });

    this.persistProviderHealth(prov);
  }

  setProviderEnabled(id, enabled) {
    const prov = this.providers.get(id);
    if (!prov) return false;
    prov.enabled = Boolean(enabled);
    if (!prov.enabled) {
      prov.status = PROVIDER_STATUS.DISABLED;
    } else {
      prov.status = prov.lastSuccess ? PROVIDER_STATUS.ACTIVE : (prov.requiresCredentials && !prov.configured ? PROVIDER_STATUS.NEEDS_CREDENTIALS : PROVIDER_STATUS.NOT_CONFIGURED);
    }
    this.persistProviderHealth(prov);
    return true;
  }

  persistProviderHealth(prov) {
    try {
      const db = getDatabase();
      db.run(
        `INSERT OR REPLACE INTO source_health
        (source_id, name, status, data_class, last_success, last_error, error_count, latency_ms, attribution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prov.id,
          prov.name,
          prov.status,
          prov.category,
          prov.lastSuccess,
          prov.lastError,
          prov.failureCount,
          prov.latencyMs,
          prov.attribution
        ]
      );
    } catch (_) {}
  }
}

export const providerRegistry = new ProviderRegistry();
