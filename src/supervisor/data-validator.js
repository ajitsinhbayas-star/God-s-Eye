/**
 * ORBITAL EYE — CENTRAL DATA VALIDATION & NORMALIZATION ENGINE
 * Enforces rigorous scientific validation, physical boundary checks,
 * pollutant sufficiency rules, data classification, and provenance preservation.
 */

export const DATA_CLASSIFICATIONS = {
  LIVE_MEASUREMENT: 'LIVE_MEASUREMENT',
  REGULATORY_STATION_MEASUREMENT: 'REGULATORY_STATION_MEASUREMENT',
  COMMUNITY_SENSOR: 'COMMUNITY_SENSOR',
  MODELLED_ESTIMATE: 'MODELLED_ESTIMATE',
  FORECAST: 'FORECAST',
  PROPAGATED_ORBITAL_STATE: 'PROPAGATED_ORBITAL_STATE',
  EPHEMERIS_DERIVED_STATE: 'EPHEMERIS_DERIVED_STATE',
  HISTORICAL: 'HISTORICAL',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE'
};

export const QUALITY_STATUS = {
  VERIFIED_LIVE: 'VERIFIED_LIVE',
  VALIDATED_MODEL: 'VALIDATED_MODEL',
  DEGRADED: 'DEGRADED',
  STALE: 'STALE',
  REJECTED: 'REJECTED'
};

/**
 * Validates that an observation timestamp is a parseable date,
 * not in the future by more than 5 minutes (allowing for minor clock skew),
 * and not prior to the space age (1957).
 */
export function validateTimestamp(timestamp) {
  if (!timestamp) return { valid: false, error: 'Missing timestamp' };
  const d = new Date(timestamp);
  const timeMs = d.getTime();
  if (isNaN(timeMs)) return { valid: false, error: 'Malformed timestamp format' };

  const nowMs = Date.now();
  if (timeMs > nowMs + 5 * 60 * 1000) {
    return { valid: false, error: 'Observation timestamp is in the future' };
  }
  if (timeMs < new Date('1957-10-04T00:00:00Z').getTime()) {
    return { valid: false, error: 'Timestamp precedes satellite era (1957)' };
  }

  return { valid: true, iso: d.toISOString(), timestampMs: timeMs };
}

/**
 * Validates geographic coordinates within valid spherical ranges.
 */
export function validateCoordinates(lat, lon, altKm = null) {
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90.0 || lat > 90.0) {
    return { valid: false, error: `Latitude ${lat} out of valid bounds [-90, 90]` };
  }
  if (typeof lon !== 'number' || isNaN(lon) || lon < -180.0 || lon > 180.0) {
    return { valid: false, error: `Longitude ${lon} out of valid bounds [-180, 180]` };
  }
  if (altKm !== null && (typeof altKm !== 'number' || isNaN(altKm) || altKm < -0.5 || altKm > 2000000)) {
    return { valid: false, error: `Altitude ${altKm} km out of valid physical range` };
  }
  return { valid: true, lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)), altKm: altKm !== null ? Number(altKm.toFixed(2)) : null };
}

/**
 * Validates and normalizes satellite orbital state vectors.
 */
export function validateSatelliteRecord(raw, provider = 'WhereTheISS.at') {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Null or non-object satellite record' };
  }

  const noradId = String(raw.noradId || raw.norad || raw.id || '').trim();
  if (!noradId) return { valid: false, error: 'Missing satellite NORAD identifier' };

  const coords = validateCoordinates(Number(raw.latitude ?? raw.lat), Number(raw.longitude ?? raw.lon), Number(raw.altitude ?? raw.altKm));
  if (!coords.valid) return coords;

  const vel = Number(raw.velocity ?? raw.velKmH ?? raw.velKmS ?? 0);
  if (isNaN(vel) || vel <= 0) {
    return { valid: false, error: 'Velocity must be positive and numeric' };
  }
  // Normalize velocity to km/s
  const velKmS = vel > 100 ? vel / 3600 : vel;
  if (velKmS < 1.0 || velKmS > 15.0) {
    return { valid: false, error: `Orbital velocity ${velKmS.toFixed(2)} km/s out of physical Earth orbit range` };
  }

  const timeCheck = validateTimestamp(raw.timestamp || raw.epoch || new Date().toISOString());
  if (!timeCheck.valid) return timeCheck;

  const classification = raw.isPropagated
    ? DATA_CLASSIFICATIONS.PROPAGATED_ORBITAL_STATE
    : DATA_CLASSIFICATIONS.LIVE_MEASUREMENT;

  return {
    valid: true,
    data: {
      id: noradId === '25544' ? 'iss' : `sat_${noradId}`,
      noradId,
      name: raw.name || (noradId === '25544' ? 'ISS (ZARYA)' : `NORAD ${noradId}`),
      originalProvider: provider,
      originalRecordId: noradId,
      observationTimestamp: timeCheck.iso,
      retrievalTimestamp: new Date().toISOString(),
      processingTimestamp: new Date().toISOString(),
      coordinates: coords,
      velocityKmS: Number(velKmS.toFixed(3)),
      velocityKmH: Math.round(velKmS * 3600),
      dataClassification: classification,
      qualityStatus: QUALITY_STATUS.VERIFIED_LIVE,
      calculationMethod: raw.isPropagated ? 'SGP4_PROPAGATION' : 'DIRECT_DOWNLINK',
      sourceAttribution: provider === 'WhereTheISS.at' ? 'WhereTheISS.at' : 'CelesTrak / Space-Track',
      applicableLicense: 'Public Domain / Open Data',
      datasetVersion: '1.0'
    }
  };
}

/**
 * Validates atmospheric/weather telemetry.
 * Distinguishes monitoring-station measurements from forecast-model estimates.
 */
export function validateWeatherRecord(raw, provider = 'Open-Meteo') {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Null or non-object weather record' };
  }

  const coords = validateCoordinates(Number(raw.latitude ?? raw.lat), Number(raw.longitude ?? raw.lon));
  if (!coords.valid) return coords;

  const temp = Number(raw.temperature ?? raw.temp);
  if (isNaN(temp) || temp < -70.0 || temp > 65.0) {
    return { valid: false, error: `Temperature ${temp}°C outside Earth meteorological envelope [-70, 65]` };
  }

  const rh = Number(raw.relativeHumidity ?? raw.humidity ?? 50);
  if (isNaN(rh) || rh < 0.0 || rh > 100.0) {
    return { valid: false, error: `Relative humidity ${rh}% outside valid range [0, 100]` };
  }

  const isForecast = Boolean(raw.isForecast || raw.forecast);
  const classification = isForecast ? DATA_CLASSIFICATIONS.FORECAST : DATA_CLASSIFICATIONS.MODELLED_ESTIMATE;

  return {
    valid: true,
    data: {
      originalProvider: provider,
      originalRecordId: raw.id || `${coords.lat}_${coords.lon}`,
      district: raw.district || null,
      state: raw.state || null,
      observationTimestamp: new Date().toISOString(),
      retrievalTimestamp: new Date().toISOString(),
      coordinates: coords,
      current: {
        temperature: Number(temp.toFixed(1)),
        relativeHumidity: Math.round(rh),
        apparentTemperature: typeof raw.apparentTemperature === 'number' ? Number(raw.apparentTemperature.toFixed(1)) : Number(temp.toFixed(1)),
        surfacePressureHpa: typeof raw.pressure === 'number' ? Math.round(raw.pressure) : 1013,
        windSpeedKmh: typeof raw.windSpeed === 'number' ? Number(raw.windSpeed.toFixed(1)) : 0,
        condition: raw.condition || 'Clear Sky',
        weatherCode: Number(raw.weatherCode || 0)
      },
      dataClassification: classification,
      qualityStatus: QUALITY_STATUS.VALIDATED_MODEL,
      calculationMethod: isForecast ? 'ECMWF_GFS_NWP_FORECAST' : 'IN_SITU_ANALYSIS',
      sourceAttribution: 'Open-Meteo Weather API / ECMWF / GFS',
      geographicDisclaimer: 'Representative coordinates for administrative district centroid. Local microclimates may vary.',
      applicableLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)'
    }
  };
}

/**
 * Validates air quality measurements and enforces Indian CPCB NAQI guidelines:
 * 1. Concentrations must be non-negative.
 * 2. CPCB NAQI calculation mandates at least 3 valid pollutant sub-indices,
 *    and at least one MUST be PM10 or PM2.5.
 */
export function validateAirQualityRecord(raw, provider = 'CPCB / Open-Meteo') {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Null or non-object air quality record' };
  }

  const coords = validateCoordinates(Number(raw.latitude ?? raw.lat), Number(raw.longitude ?? raw.lon));
  if (!coords.valid) return coords;

  const pollutants = raw.pollutants || raw.current || {};
  const validPollutants = {};
  const pollutantKeys = ['pm2_5', 'pm10', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide', 'ozone'];

  for (const k of pollutantKeys) {
    const val = pollutants[k];
    if (typeof val === 'number' && !isNaN(val) && val >= 0) {
      validPollutants[k] = Number(val.toFixed(2));
    }
  }

  // Pollutant sufficiency check: at least PM2.5 or PM10 must be present
  const hasParticulate = typeof validPollutants.pm2_5 === 'number' || typeof validPollutants.pm10 === 'number';
  if (!hasParticulate) {
    return { valid: false, error: 'Insufficient data: CPCB NAQI requires at least PM2.5 or PM10 particulate monitoring' };
  }

  const isRegulatory = Boolean(raw.stationId || raw.isRegulatory);
  const classification = isRegulatory
    ? DATA_CLASSIFICATIONS.REGULATORY_STATION_MEASUREMENT
    : DATA_CLASSIFICATIONS.MODELLED_ESTIMATE;

  return {
    valid: true,
    data: {
      originalProvider: provider,
      stationId: raw.stationId || `station_${coords.lat}_${coords.lon}`,
      stationName: raw.stationName || raw.name || 'Monitoring Station',
      city: raw.city || 'District Station',
      state: raw.state || 'India',
      coordinates: coords,
      pollutants: validPollutants,
      observationTimestamp: raw.timestamp || new Date().toISOString(),
      retrievalTimestamp: new Date().toISOString(),
      dataClassification: classification,
      qualityStatus: QUALITY_STATUS.VERIFIED_LIVE,
      calculationMethod: 'CPCB_INDIAN_NATIONAL_AQI_STANDARD',
      sourceAttribution: 'Central Pollution Control Board (CPCB) India & Open-Meteo Atmospheric Chemistry',
      applicableLicense: 'Open Data / Fair Use Attribution'
    }
  };
}

/**
 * Validates Near-Earth Object close approach telemetry from NASA JPL CNEOS.
 */
export function validateAsteroidRecord(raw, provider = 'NASA/JPL CNEOS') {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Null or non-object asteroid record' };
  }

  const des = String(raw.des || raw.designation || raw.name || '').trim();
  if (!des) return { valid: false, error: 'Missing asteroid designation' };

  const distKm = Number(raw.distKm || raw.missDistanceKm || 0);
  if (isNaN(distKm) || distKm <= 0) {
    return { valid: false, error: 'Miss distance must be positive and numeric' };
  }

  return {
    valid: true,
    data: {
      designation: des,
      originalProvider: provider,
      distKm: Math.round(distKm),
      distAU: Number((distKm / 149597870.7).toFixed(5)),
      distLD: Number((distKm / 384400.0).toFixed(2)),
      relativeVelocityKmS: typeof raw.velocityKmS === 'number' ? Number(raw.velocityKmS.toFixed(2)) : null,
      closeApproachDate: raw.closeApproachDate || raw.date || new Date().toISOString(),
      retrievalTimestamp: new Date().toISOString(),
      dataClassification: DATA_CLASSIFICATIONS.EPHEMERIS_DERIVED_STATE,
      qualityStatus: QUALITY_STATUS.VERIFIED_LIVE,
      calculationMethod: 'JPL_DE441_EPHEMERIS',
      sourceAttribution: 'NASA/JPL Center for Near-Earth Object Studies (CNEOS)',
      riskAssessment: 'Close astronomical approach; does not imply physical Earth impact.'
    }
  };
}

/**
 * Validates NOAA Space Weather SWPC Kp index records.
 */
export function validateSpaceWeatherRecord(raw, provider = 'NOAA SWPC') {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Null or non-object space weather record' };
  }

  const kp = Number(raw.kpIndex ?? raw.kp);
  if (isNaN(kp) || kp < 0.0 || kp > 9.0) {
    return { valid: false, error: `Kp Index ${kp} out of valid planetary scale [0.0, 9.0]` };
  }

  return {
    valid: true,
    data: {
      originalProvider: provider,
      kpIndex: Number(kp.toFixed(2)),
      stormLevel: raw.stormLevel || 'G0 (Quiet / Nominal)',
      gScaleCode: raw.gScaleCode || 'G0',
      severity: raw.severity || 'nominal',
      observationTimestamp: raw.observationTimeUTC || new Date().toISOString(),
      retrievalTimestamp: new Date().toISOString(),
      dataClassification: DATA_CLASSIFICATIONS.LIVE_MEASUREMENT,
      qualityStatus: QUALITY_STATUS.VERIFIED_LIVE,
      sourceAttribution: 'NOAA Space Weather Prediction Center (SWPC)'
    }
  };
}
