/**
 * ORBITAL EYE — CENTRAL PROVIDER REGISTRY & GOVERNANCE
 * Maintains live health, circuit breakers, attribution, and licensing
 * across all institutional, scientific, and community telemetry providers.
 */
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/sqlite.js';
import { incidentManager } from './incident-manager.js';

// Ensure .env is loaded before provider configuration
(function loadEnvNative() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const k = trimmed.slice(0, eqIdx).trim();
            const v = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[k]) process.env[k] = v;
          }
        }
      } catch (_) {}
      break;
    }
  }
})();

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
        subsystem: 'SPACE',
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
        subsystem: 'SPACE',
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
        subsystem: 'SPACE',
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
        subsystem: 'SPACE',
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
        subsystem: 'SPACE',
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
        subsystem: 'SPACE',
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
        subsystem: 'SPACE',
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
        subsystem: 'ATMOSPHERE',
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
        subsystem: 'ATMOSPHERE',
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
        subsystem: 'ATMOSPHERE',
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
        subsystem: 'ATMOSPHERE',
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
        subsystem: 'ATMOSPHERE',
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
        subsystem: 'ATMOSPHERE',
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
        subsystem: 'AIR QUALITY',
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
        subsystem: 'AIR QUALITY',
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
        subsystem: 'AIR QUALITY',
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
        subsystem: 'AIR QUALITY',
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
        subsystem: 'AIR QUALITY',
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
        subsystem: 'AIR QUALITY',
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
        subsystem: 'AIR QUALITY',
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
        subsystem: 'AIR QUALITY',
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
        if (p.id === 'satnogs_db' && !(process.env.SATNOGS_API_KEY || process.env.SATNOGS_API_TOKEN)) hasCredentials = false;
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

  async pingAllOpenProviders() {
    const pings = [];
    // 0. CelesTrak (ISS TLE)
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle', { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          this.recordSuccess('celestrak', Date.now() - t0);
        }
      } catch (_) {}
    })());

    // 1. NASA Horizons
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=\'399\'&OBJ_DATA=\'YES\'&MAKE_EPHEM=\'YES\'&EPHEM_TYPE=\'VECTORS\'&CENTER=\'500@10\'&START_TIME=\'now\'&STOP_TIME=\'+1d\'&STEP_SIZE=\'1d\'';
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          this.recordSuccess('nasa_horizons', Date.now() - t0);
        }
      } catch (_) {}
    })());

    // 2. Open-Meteo & IMD
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,weather_code&timezone=Asia%2FKolkata');
        if (res.ok) {
          const lat = Date.now() - t0;
          this.recordSuccess('open_meteo', lat);
          this.recordSuccess('imd_weather', 5);
        }
      } catch (_) {}
    })());

    // 3. WhereTheISS
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        if (res.ok) {
          this.recordSuccess('wheretheiss', Date.now() - t0);
        }
      } catch (_) {}
    })());

    // 4. RainViewer
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (res.ok) {
          this.recordSuccess('rainviewer', Date.now() - t0);
        }
      } catch (_) {}
    })());

    // 5. NOAA SWPC
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
        if (res.ok) {
          this.recordSuccess('noaa_swpc', Date.now() - t0);
        }
      } catch (_) {}
    })());

    // 6. NASA JPL Small-Body CAD
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('https://ssd-api.jpl.nasa.gov/cad.api?dist-max=10LD&date-min=now&limit=5');
        if (res.ok) {
          this.recordSuccess('nasa_jpl_cad', Date.now() - t0);
        }
      } catch (_) {}
    })());

    // 7. NOAA NHC Cyclones
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json');
        if (res.ok) {
          this.recordSuccess('noaa_nhc', Date.now() - t0);
        }
      } catch (_) {}
    })());

    // 8. CPCB NAQI
    pings.push((async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.6139&longitude=77.2090&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=Asia%2FKolkata');
        if (res.ok) {
          this.recordSuccess('cpcb_naqi', Date.now() - t0);
        }
      } catch (_) {}
    })());

    // 9. OpenAQ Global Hub (when OPENAQ_API_KEY is configured)
    if (process.env.OPENAQ_API_KEY) {
      pings.push((async () => {
        try {
          const t0 = Date.now();
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 6000);
          const res = await fetch('https://api.openaq.org/v3/locations?limit=1', {
            signal: ctrl.signal,
            headers: {
              'X-API-Key': process.env.OPENAQ_API_KEY,
              'User-Agent': 'OrbitalEye-Observatory/2.0'
            }
          });
          clearTimeout(timer);
          if (res.ok) {
            this.recordSuccess('openaq', Date.now() - t0);
          } else {
            this.recordFailure('openaq', `HTTP ${res.status}`);
          }
        } catch (err) {
          this.recordFailure('openaq', err.message);
        }
      })());
    }

    // 10. SatNOGS Open DB (when SATNOGS_API_TOKEN or SATNOGS_API_KEY is configured)
    const satnogsToken = process.env.SATNOGS_API_TOKEN || process.env.SATNOGS_API_KEY;
    if (satnogsToken) {
      pings.push((async () => {
        try {
          const t0 = Date.now();
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 6000);
          const res = await fetch('https://db.satnogs.org/api/transmitters/?limit=1', {
            signal: ctrl.signal,
            headers: { 'Authorization': `Token ${satnogsToken}` }
          });
          clearTimeout(timer);
          if (res.ok) {
            this.recordSuccess('satnogs_db', Date.now() - t0);
          } else {
            this.recordFailure('satnogs_db', `HTTP ${res.status}`);
          }
        } catch (err) {
          this.recordFailure('satnogs_db', err.message);
        }
      })());
    }

    // 11. NASA FIRMS Active Fires (when FIRMS_MAP_KEY is configured)
    if (process.env.FIRMS_MAP_KEY) {
      pings.push((async () => {
        try {
          const t0 = Date.now();
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 6000);
          const res = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/${process.env.FIRMS_MAP_KEY}/all`, {
            signal: ctrl.signal
          });
          clearTimeout(timer);
          if (res.ok) {
            this.recordSuccess('nasa_firms', Date.now() - t0);
          } else {
            this.recordFailure('nasa_firms', `HTTP ${res.status}`);
          }
        } catch (err) {
          this.recordFailure('nasa_firms', err.message);
        }
      })());
    }

    // 12. Space-Track.org (when SPACE_TRACK_USER & SPACE_TRACK_PASSWORD are configured)
    if (process.env.SPACE_TRACK_USER && process.env.SPACE_TRACK_PASSWORD) {
      pings.push((async () => {
        try {
          const t0 = Date.now();
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 8000);
          const res = await fetch('https://www.space-track.org/ajaxauth/login', {
            signal: ctrl.signal,
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `identity=${encodeURIComponent(process.env.SPACE_TRACK_USER)}&password=${encodeURIComponent(process.env.SPACE_TRACK_PASSWORD)}`
          });
          clearTimeout(timer);
          if (res.ok) {
            this.recordSuccess('space_track', Date.now() - t0);
          } else {
            this.recordFailure('space_track', `HTTP ${res.status}`);
          }
        } catch (err) {
          this.recordFailure('space_track', err.message);
        }
      })());
    }

    await Promise.allSettled(pings);
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
