import { COMPASS_16 } from '../config/cities.js';
import { EARTH_CONSTANTS } from '../config/constants.js';

export function degToCompass(azDeg) {
  const norm = ((azDeg % 360) + 360) % 360;
  return COMPASS_16[Math.round(norm / 22.5) % 16];
}

export function computeTopocentricLookAngles(obsLat, obsLon, satLat, satLon, satAltKm) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const rE = EARTH_CONSTANTS.RADIUS_KM;
  const rS = rE + (satAltKm || 550);

  const dLon = (satLon - obsLon) * toRad;
  const lat1 = obsLat * toRad;
  const lat2 = satLat * toRad;

  const cosGamma = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const gamma = Math.acos(Math.max(-1, Math.min(1, cosGamma)));
  const slantRangeKm = Math.sqrt(rE * rE + rS * rS - 2 * rE * rS * cosGamma);

  const sinEl = (rS * cosGamma - rE) / Math.max(1, slantRangeKm);
  const elevationDeg = Number((Math.asin(Math.max(-1, Math.min(1, sinEl))) * toDeg).toFixed(1));

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const azimuthDeg = Number((((Math.atan2(y, x) * toDeg) % 360) + 360) % 360);
  const compass = degToCompass(azimuthDeg);

  return { elevationDeg, azimuthDeg: Math.round(azimuthDeg), compass, slantRangeKm: Math.round(slantRangeKm) };
}
