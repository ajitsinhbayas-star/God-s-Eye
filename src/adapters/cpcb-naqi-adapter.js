/**
 * INDIA CENTRAL POLLUTION CONTROL BOARD (CPCB)
 * National Air Quality Index (NAQI) Standard Calculator
 * Formulated per MoEFCC & CPCB Technical Guidelines (2014/2015).
 * 
 * 6 Air Quality Categories:
 * - Good (0 - 50)
 * - Satisfactory (51 - 100)
 * - Moderately Polluted (101 - 200)
 * - Poor (201 - 300)
 * - Very Poor (301 - 400)
 * - Severe (401 - 500+)
 */

// CPCB Sub-Index Concentration Breakpoints
const CPCB_BREAKPOINTS = {
  pm2_5: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 250.1, cHigh: 500, iLow: 401, iHigh: 500 }
  ],
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 430.1, cHigh: 800, iLow: 401, iHigh: 500 }
  ],
  nitrogen_dioxide: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 400.1, cHigh: 800, iLow: 401, iHigh: 500 }
  ],
  sulphur_dioxide: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1600.1, cHigh: 3000, iLow: 401, iHigh: 500 }
  ],
  carbon_monoxide: [
    { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 60.0, iLow: 401, iHigh: 500 }
  ],
  ozone: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 748.1, cHigh: 1200, iLow: 401, iHigh: 500 }
  ]
};

/**
 * Calculates a single pollutant's sub-index using linear interpolation:
 * Ip = [ (I_Hi - I_Lo) / (B_Hi - B_Lo) ] * (Cp - B_Lo) + I_Lo
 */
export function calculateSubIndex(arg1, arg2) {
  let pollutantKey = typeof arg1 === 'string' ? arg1 : arg2;
  let concentration = typeof arg1 === 'number' ? arg1 : arg2;

  // Key aliases
  if (pollutantKey === 'pm25') pollutantKey = 'pm2_5';
  if (pollutantKey === 'no2') pollutantKey = 'nitrogen_dioxide';
  if (pollutantKey === 'so2') pollutantKey = 'sulphur_dioxide';
  if (pollutantKey === 'co') pollutantKey = 'carbon_monoxide';
  if (pollutantKey === 'o3') pollutantKey = 'ozone';
  if (concentration === undefined || concentration === null || isNaN(concentration) || concentration < 0) {
    return null;
  }
  const c = Number(concentration);
  const table = CPCB_BREAKPOINTS[pollutantKey];
  if (!table) return null;

  for (const b of table) {
    if (c >= b.cLow && c <= b.cHigh) {
      const idx = ((b.iHigh - b.iLow) / (b.cHigh - b.cLow)) * (c - b.cLow) + b.iLow;
      return Math.round(idx);
    }
  }

  // Value exceeds highest breakpoint: clamp to severe upper range
  if (c > table[table.length - 1].cHigh) {
    return 500;
  }
  return 0;
}

/**
 * Maps an AQI numeric score to the official CPCB 6-tier classification, colors, and health impacts.
 */
export function getCpcbCategory(aqiValue) {
  const a = Math.round(Number(aqiValue) || 0);

  if (a <= 50) {
    return {
      index: a,
      category: 'Good',
      categoryHi: 'अच्छा',
      color: '#10b981',       // Emerald green
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
      tagColor: 'emerald',
      severity: 'Low',
      healthStatement: 'Minimal impact. Clean fresh air ideal for all outdoor activities.',
      advisory: {
        general: 'Enjoy regular outdoor activities, jogging, and walking.',
        sensitive: 'No special precautions required. Healthy air quality.',
        children: 'Safe for outdoor sports, school play, and field activities.',
        maskRecommended: false,
        airPurifierRecommended: false,
        ventilation: 'Open windows and allow natural fresh air ventilation.'
      }
    };
  } else if (a <= 100) {
    return {
      index: a,
      category: 'Satisfactory',
      categoryHi: 'संतोषजनक',
      color: '#84cc16',       // Lime green
      badgeClass: 'bg-lime-950/80 text-lime-300 border-lime-500/60',
      tagColor: 'lime',
      severity: 'Moderate',
      healthStatement: 'Minor breathing discomfort to sensitive people with existing asthma or lung conditions.',
      advisory: {
        general: 'Air quality is acceptable for most people.',
        sensitive: 'Very sensitive individuals should monitor for unusual cough or throat irritation.',
        children: 'Safe for normal outdoor recreation.',
        maskRecommended: false,
        airPurifierRecommended: false,
        ventilation: 'Adequate for normal cross-ventilation.'
      }
    };
  } else if (a <= 200) {
    return {
      index: a,
      category: 'Moderate',
      categoryHi: 'मध्यम',
      color: '#eab308',       // Amber / Yellow
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/60',
      tagColor: 'amber',
      severity: 'Elevated',
      healthStatement: 'Breathing discomfort to people with lung, asthma, and heart diseases.',
      advisory: {
        general: 'Noticeable haze. Limit prolonged heavy outdoor exertion.',
        sensitive: 'People with asthma or heart conditions should take frequent breaks during outdoor work.',
        children: 'Limit intense physical sports during peak traffic hours.',
        maskRecommended: false,
        airPurifierRecommended: false,
        ventilation: 'Ventilate during afternoon when solar heating disperses particulate accumulation.'
      }
    };
  } else if (a <= 300) {
    return {
      index: a,
      category: 'Poor',
      categoryHi: 'खराब',
      color: '#f97316',       // Orange
      badgeClass: 'bg-orange-950/80 text-orange-300 border-orange-500/60',
      tagColor: 'orange',
      severity: 'Unhealthy',
      healthStatement: 'Breathing discomfort to most people on prolonged exposure. Triggers asthma attacks.',
      advisory: {
        general: 'Reduce prolonged intense outdoor physical exertion. Wear a dust mask near roadways.',
        sensitive: 'Asthma patients must carry rescue inhalers. Avoid strenuous outdoor activities.',
        children: 'Schools should restrict prolonged outdoor sports and field training.',
        maskRecommended: true,
        airPurifierRecommended: true,
        ventilation: 'Keep windows closed during early morning and late night inversions.'
      }
    };
  } else if (a <= 400) {
    return {
      index: a,
      category: 'Very Poor',
      categoryHi: 'बहुत खराब',
      color: '#ef4444',       // Red
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/60',
      tagColor: 'rose',
      severity: 'Very Unhealthy',
      healthStatement: 'Respiratory illness on prolonged exposure. Significant health hazard for sensitive groups.',
      advisory: {
        general: 'Avoid heavy outdoor activities. Wear certified N95 / FFP2 masks outdoors.',
        sensitive: 'Stay indoors in rooms with filtered air. Avoid outdoor exposure completely.',
        children: 'Keep children, pregnant women, and the elderly indoors.',
        maskRecommended: true,
        airPurifierRecommended: true,
        ventilation: 'Keep doors and windows sealed. Operate indoor air purifiers.'
      }
    };
  } else {
    return {
      index: a,
      category: 'Severe',
      categoryHi: 'गंभीर (आपातकाल)',
      color: '#991b1b',       // Deep Crimson / Maroon
      badgeClass: 'bg-red-950 text-red-200 border-red-500 animate-pulse',
      tagColor: 'red',
      severity: 'Emergency / Hazardous',
      healthStatement: 'Affects healthy people and seriously impacts those with existing diseases. Emergency air pollution levels.',
      advisory: {
        general: 'Health warning of emergency conditions. Entire population is likely affected. Stop all outdoor exercise.',
        sensitive: 'Strict indoor confinement. Keep emergency medications accessible.',
        children: 'Children, seniors, and heart patients must avoid all outdoor physical exposure.',
        maskRecommended: true,
        airPurifierRecommended: true,
        ventilation: 'Do not open windows. Seal drafts and run HEPA air filtration.'
      }
    };
  }
}

/**
 * Computes official CPCB overall AQI and identifies dominant pollutant from measured concentrations.
 */
export function computeCpcbAqi(measurements) {
  const raw = measurements || {};
  const m = {
    pm2_5: raw.pm2_5 !== undefined ? raw.pm2_5 : raw.pm25,
    pm10: raw.pm10,
    nitrogen_dioxide: raw.nitrogen_dioxide !== undefined ? raw.nitrogen_dioxide : raw.no2,
    sulphur_dioxide: raw.sulphur_dioxide !== undefined ? raw.sulphur_dioxide : raw.so2,
    ozone: raw.ozone !== undefined ? raw.ozone : raw.o3,
    carbon_monoxide: raw.carbon_monoxide !== undefined ? raw.carbon_monoxide : raw.co
  };
  const subIndices = {};

  // Standardize keys and compute sub-indices
  if (m.pm2_5 !== undefined) subIndices.pm2_5 = calculateSubIndex('pm2_5', m.pm2_5);
  if (m.pm10 !== undefined) subIndices.pm10 = calculateSubIndex('pm10', m.pm10);
  if (m.nitrogen_dioxide !== undefined) subIndices.nitrogen_dioxide = calculateSubIndex('nitrogen_dioxide', m.nitrogen_dioxide);
  if (m.sulphur_dioxide !== undefined) subIndices.sulphur_dioxide = calculateSubIndex('sulphur_dioxide', m.sulphur_dioxide);
  if (m.ozone !== undefined) subIndices.ozone = calculateSubIndex('ozone', m.ozone);

  // For CO: if provided in µg/m³, convert to mg/m³ (divide by 1000)
  if (m.carbon_monoxide !== undefined) {
    const coVal = m.carbon_monoxide > 50 ? m.carbon_monoxide / 1000 : m.carbon_monoxide;
    subIndices.carbon_monoxide = calculateSubIndex('carbon_monoxide', coVal);
  }

  // Filter valid numeric sub-indices
  const validEntries = Object.entries(subIndices).filter(([_, val]) => typeof val === 'number');

  if (validEntries.length === 0) {
    return {
      aqi: null,
      dominantPollutant: null,
      categoryInfo: getCpcbCategory(0),
      subIndices: {}
    };
  }

  // Dominant pollutant is the one causing the maximum sub-index
  validEntries.sort((a, b) => b[1] - a[1]);
  const [dominantKey, maxIndex] = validEntries[0];

  const pollutantLabels = {
    pm2_5: 'PM2.5 (Fine Particulates)',
    pm10: 'PM10 (Coarse Dust)',
    nitrogen_dioxide: 'NO₂ (Nitrogen Dioxide)',
    sulphur_dioxide: 'SO₂ (Sulphur Dioxide)',
    carbon_monoxide: 'CO (Carbon Monoxide)',
    ozone: 'O₃ (Surface Ozone)'
  };

  return {
    aqi: maxIndex,
    dominantPollutantKey: dominantKey,
    dominantPollutant: pollutantLabels[dominantKey] || dominantKey,
    categoryInfo: getCpcbCategory(maxIndex),
    subIndices
  };
}
