export function computeSolarAndVisibilityState(obsLat, obsLon, satLat, satLon, satAltKm, epochMs = Date.now()) {
  const jd = (epochMs / 86400000) + 2440587.5;
  const d = jd - 2451545.0;
  const date = new Date(epochMs);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  const M = ((357.529 + 0.98560028 * d) % 360) * (Math.PI / 180);
  const L = (280.466 + 0.9856474 * d) % 360;
  const lambda = ((L + 1.915 * Math.sin(M) + 0.020 * Math.sin(2 * M)) % 360) * (Math.PI / 180);
  const eps = 23.439 * (Math.PI / 180);
  const decRad = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const subsolarLon = ((12.0 - utcHours) * 15.0 + 540) % 360 - 180;

  const toRad = Math.PI / 180;
  const hourAngleObs = (obsLon - subsolarLon) * toRad;
  const sinSunEl = Math.sin(obsLat * toRad) * Math.sin(decRad) +
                   Math.cos(obsLat * toRad) * Math.cos(decRad) * Math.cos(hourAngleObs);
  const sunElevationDeg = Number((Math.asin(Math.max(-1, Math.min(1, sinSunEl))) * (180 / Math.PI)).toFixed(1));

  const isObserverDark = sunElevationDeg <= -6.0;
  const isNakedEyeVisible = isObserverDark;
  const visibilityLabel = isNakedEyeVisible ? 'Visible now (Twilight/Night)' : 'Daylight pass (Radio/Radar track)';

  return { sunElevationDeg, isNakedEyeVisible, visibilityLabel };
}
