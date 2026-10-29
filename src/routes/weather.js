/**
 * GOD'S EYE — WEATHER & ATMOSPHERE API ROUTES
 * Serves Doppler radar timestamps, active cyclones with forecast cones,
 * thermal fire hotspots, and on-demand station telemetry via Open-Meteo.
 */
import express from 'express';
import {
  fetchRainViewerData,
  fetchActiveCyclones,
  fetchFireHotspots
} from '../daemons/weather-worker.js';

export const weatherRouter = express.Router();

// GET /api/weather/radar — Returns RainViewer Doppler radar timestamps and tile endpoints
weatherRouter.get('/radar', async (req, res) => {
  try {
    const data = await fetchRainViewerData();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/weather/cyclones — Returns active tropical cyclones, historical tracks & forecast cones
weatherRouter.get('/cyclones', async (req, res) => {
  try {
    const cyclones = await fetchActiveCyclones();
    res.json({ ok: true, count: cyclones.length, data: cyclones });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/weather/fires — Returns NASA FIRMS active fire hotspots
weatherRouter.get('/fires', async (req, res) => {
  try {
    const fires = await fetchFireHotspots();
    res.json({ ok: true, count: fires.length, data: fires });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/weather/station — Proxies Open-Meteo for localized station weather readings
weatherRouter.get('/station', async (req, res) => {
  const lat = parseFloat(req.query.lat) || 18.5204;
  const lon = parseFloat(req.query.lon) || 73.8567;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'GodsEye-WeatherProxy/2.0' } });
    if (!resp.ok) throw new Error(`Open-Meteo HTTP ${resp.status}`);
    const data = await resp.json();
    res.json({ ok: true, lat, lon, current: data.current });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: 'Upstream weather service unavailable',
      fallback: {
        temperature_2m: 28.5,
        relative_humidity_2m: 55,
        apparent_temperature: 30.2,
        surface_pressure: 1012.0,
        wind_speed_10m: 12.0,
        wind_direction_10m: 240,
        wind_gusts_10m: 18.0
      }
    });
  }
});
