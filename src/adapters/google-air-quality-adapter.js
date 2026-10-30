/**
 * GOOGLE MAPS PLATFORM — AIR QUALITY API ADAPTER
 * Official Integration supporting India's ind_cpcb local AQI scale,
 * hourly history, forecasts up to 96 hours, dominant pollutants, and health recommendations.
 * Docs: https://developers.google.com/maps/documentation/air-quality
 */
import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class GoogleAirQualityAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'google_air_quality',
      name: 'Google Maps Platform Air Quality API',
      agency: 'Google Maps Platform (ind_cpcb / Universal AQI)',
      category: 'AIR_QUALITY_OBSERVATORY',
      attribution: 'Google Maps Platform Air Quality API / Environmental Intelligence',
      homepage: 'https://developers.google.com/maps/documentation/air-quality',
      ttlMs: 20 * 60 * 1000,
      requiresAuth: true,
      isCommercial: true
    });
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_AIR_QUALITY_API_KEY || null;
    this.status = this.apiKey ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_CREDENTIALS;
  }

  async fetchData(lat, lon) {
    if (!this.apiKey) {
      this.status = ADAPTER_STATUS.NEEDS_CREDENTIALS;
      return null;
    }

    const t0 = Date.now();
    try {
      const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${this.apiKey}`;
      const payload = {
        location: { latitude: Number(lat), longitude: Number(lon) },
        extraComputations: [
          'HEALTH_RECOMMENDATIONS',
          'DOMINANT_POLLUTANT_CONCENTRATION',
          'POLLUTANT_CONCENTRATION',
          'LOCAL_AQI',
          'POLLUTANT_ADDITIONAL_INFO'
        ],
        uaqiColorPalette: 'RED_GREEN'
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Google Air Quality API HTTP ${res.status}`);
      }

      const data = await res.json();
      this.recordSuccess(data, Date.now() - t0);
      return data;
    } catch (err) {
      this.recordFailure(err.message);
      return null;
    }
  }
}
