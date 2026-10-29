import { EARTH_CONSTANTS } from '../config/constants.js';

/**
 * Computes solar coordinates, observer solar elevation, and satellite illumination state
 * using standard astronomical ephemeris and cylindrical shadow model.
 *
 * @param {number} obsLat - Observer latitude (deg)
 * @param {number} obsLon - Observer longitude (deg)
 * @param {number} satLat - Satellite sub-point latitude (deg)
 * @param {number} satLon - Satellite sub-point longitude (deg)
 * @param {number} satAltKm - Satellite altitude above sea level (km)
 * @param {number} epochMs - Epoch in unix milliseconds
 * @param {object} [satEci] - Optional {x, y, z} ECI coordinates (km)
 */
export function computeSolarAndVisibilityState(obsLat, obsLon, satLat, satLon, satAltKm, epochMs = Date.now(), satEci = null) {
  const jd = (epochMs / 86400000) + 2440587.5;
  const d = jd - 2451545.0; // Days since J2000.0
  const date = new Date(epochMs);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Mean anomaly of the Sun
  const M = ((357.529 + 0.98560028 * d) % 360) * (Math.PI / 180);
  // Mean longitude of the Sun
  const L = (280.466 + 0.9856474 * d) % 360;
  // Ecliptic longitude of the Sun
  const lambda = ((L + 1.915 * Math.sin(M) + 0.020 * Math.sin(2 * M)) % 360) * (Math.PI / 180);
  // Obliquity of the ecliptic
  const eps = 23.439 * (Math.PI / 180);

  // Solar declination & right ascension
  const decRad = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const raRad = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));

  // Subsolar longitude on Earth
  const subsolarLon = ((12.0 - utcHours) * 15.0 + 540) % 360 - 180;

  const toRad = Math.PI / 180;
  const hourAngleObs = (obsLon - subsolarLon) * toRad;
  const sinSunEl = Math.sin(obsLat * toRad) * Math.sin(decRad) +
                   Math.cos(obsLat * toRad) * Math.cos(decRad) * Math.cos(hourAngleObs);
  const sunElevationDeg = Number((Math.asin(Math.max(-1, Math.min(1, sinSunEl))) * (180 / Math.PI)).toFixed(1));

  // 1. Observer Darkness Criteria (Civil twilight ends at -6°, nautical at -12°)
  const isObserverDark = sunElevationDeg <= -6.0;

  // 2. Satellite Solar Illumination (Shadow test)
  let isSatelliteSunlit = true;
  const rE = EARTH_CONSTANTS.RADIUS_KM || 6378.137;
  const rS = rE + (satAltKm || 550);

  if (satEci && typeof satEci.x === 'number') {
    // Vector towards Sun (unit vector in ECI)
    const uSunX = Math.cos(decRad) * Math.cos(raRad);
    const uSunY = Math.cos(decRad) * Math.sin(raRad);
    const uSunZ = Math.sin(decRad);

    // Satellite position along Sun vector
    const s = satEci.x * uSunX + satEci.y * uSunY + satEci.z * uSunZ;
    if (s < 0) {
      // Satellite on night side of Earth; check if inside Earth shadow cylinder
      const satDistSq = satEci.x * satEci.x + satEci.y * satEci.y + satEci.z * satEci.z;
      const perpDistSq = satDistSq - (s * s);
      if (perpDistSq <= rE * rE) {
        isSatelliteSunlit = false; // Inside Earth Umbra
      }
    }
  } else {
    // Geocentric angular separation approximation
    const dLonSat = (satLon - subsolarLon) * toRad;
    const cosSatSun = Math.sin(satLat * toRad) * Math.sin(decRad) +
                      Math.cos(satLat * toRad) * Math.cos(decRad) * Math.cos(dLonSat);
    if (cosSatSun < 0) {
      // Check horizon grazing angle for satellite altitude
      const grazingAngle = Math.asin(Math.min(1, rE / rS));
      const satAngleFromNightApex = Math.acos(Math.max(-1, Math.min(1, -cosSatSun)));
      if (satAngleFromNightApex < (Math.PI / 2 - grazingAngle)) {
        isSatelliteSunlit = false;
      }
    }
  }

  // 3. Genuine Optical Visibility:
  // Observer must be in twilight or night (<= -6°) AND satellite must be illuminated by the Sun
  const isNakedEyeVisible = isObserverDark && isSatelliteSunlit;

  let visibilityLabel = 'Radio / Radar Track (Daylight)';
  if (isNakedEyeVisible) {
    visibilityLabel = 'Naked-Eye Visible (Sunlit Twilight/Night)';
  } else if (!isSatelliteSunlit) {
    visibilityLabel = 'Eclipsed (In Earth Shadow)';
  } else if (!isObserverDark) {
    visibilityLabel = 'Daylight Pass (Sunlit but Sky Bright)';
  }

  return {
    sunElevationDeg,
    isObserverDark,
    isSatelliteSunlit,
    isNakedEyeVisible,
    visibilityLabel
  };
}
