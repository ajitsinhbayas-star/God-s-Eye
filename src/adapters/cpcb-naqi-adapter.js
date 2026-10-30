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
export const CPCB_BREAKPOINTS = {
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
  ],
  ammonia: [
    { cLow: 0, cHigh: 200, iLow: 0, iHigh: 50 },
    { cLow: 201, cHigh: 400, iLow: 51, iHigh: 100 },
    { cLow: 401, cHigh: 800, iLow: 101, iHigh: 200 },
    { cLow: 801, cHigh: 1200, iLow: 201, iHigh: 300 },
    { cLow: 1201, cHigh: 1800, iLow: 301, iHigh: 400 },
    { cLow: 1800.1, cHigh: 2500, iLow: 401, iHigh: 500 }
  ],
  lead: [
    { cLow: 0, cHigh: 0.5, iLow: 0, iHigh: 50 },
    { cLow: 0.6, cHigh: 1.0, iLow: 51, iHigh: 100 },
    { cLow: 1.1, cHigh: 2.0, iLow: 101, iHigh: 200 },
    { cLow: 2.1, cHigh: 3.0, iLow: 201, iHigh: 300 },
    { cLow: 3.1, cHigh: 3.5, iLow: 301, iHigh: 400 },
    { cLow: 3.51, cHigh: 5.0, iLow: 401, iHigh: 500 }
  ]
};

// Official CPCB 24-hr/8-hr Standards (NAAQS India)
export const CPCB_STANDARDS = {
  pm2_5: { standard: 60, unit: 'µg/m³', label: 'PM2.5 (Fine Respirable Particulates)', shortLabel: 'PM2.5' },
  pm10: { standard: 100, unit: 'µg/m³', label: 'PM10 (Coarse Inhalable Dust)', shortLabel: 'PM10' },
  nitrogen_dioxide: { standard: 80, unit: 'µg/m³', label: 'NO₂ (Nitrogen Dioxide)', shortLabel: 'NO₂' },
  sulphur_dioxide: { standard: 80, unit: 'µg/m³', label: 'SO₂ (Sulphur Dioxide)', shortLabel: 'SO₂' },
  carbon_monoxide: { standard: 2.0, unit: 'mg/m³', label: 'CO (Carbon Monoxide)', shortLabel: 'CO' },
  ozone: { standard: 100, unit: 'µg/m³', label: 'O₃ (Surface Ozone)', shortLabel: 'O₃' },
  ammonia: { standard: 400, unit: 'µg/m³', label: 'NH₃ (Ammonia)', shortLabel: 'NH₃' },
  lead: { standard: 1.0, unit: 'µg/m³', label: 'Pb (Lead Particulate)', shortLabel: 'Pb' }
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
  if (pollutantKey === 'nh3') pollutantKey = 'ammonia';
  if (pollutantKey === 'pb') pollutantKey = 'lead';

  if (concentration === undefined || concentration === null || concentration === '' || isNaN(concentration) || !isFinite(concentration) || Number(concentration) < 0) {
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

function isValidReading(v) {
  return v !== undefined && v !== null && v !== '' && !isNaN(v) && isFinite(v) && Number(v) >= 0;
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
    carbon_monoxide: raw.carbon_monoxide !== undefined ? raw.carbon_monoxide : raw.co,
    ozone: raw.ozone !== undefined ? raw.ozone : raw.o3,
    ammonia: raw.ammonia !== undefined ? raw.ammonia : raw.nh3,
    lead: raw.lead !== undefined ? raw.lead : raw.pb
  };
  const subIndices = {};

  // Standardize keys and compute sub-indices for valid numeric readings
  if (isValidReading(m.pm2_5)) subIndices.pm2_5 = calculateSubIndex('pm2_5', Number(m.pm2_5));
  if (isValidReading(m.pm10)) subIndices.pm10 = calculateSubIndex('pm10', Number(m.pm10));
  if (isValidReading(m.nitrogen_dioxide)) subIndices.nitrogen_dioxide = calculateSubIndex('nitrogen_dioxide', Number(m.nitrogen_dioxide));
  if (isValidReading(m.sulphur_dioxide)) subIndices.sulphur_dioxide = calculateSubIndex('sulphur_dioxide', Number(m.sulphur_dioxide));
  if (isValidReading(m.ozone)) subIndices.ozone = calculateSubIndex('ozone', Number(m.ozone));
  if (isValidReading(m.ammonia)) subIndices.ammonia = calculateSubIndex('ammonia', Number(m.ammonia));
  if (isValidReading(m.lead)) subIndices.lead = calculateSubIndex('lead', Number(m.lead));

  // For CO: if provided in µg/m³, convert to mg/m³ (divide by 1000)
  if (isValidReading(m.carbon_monoxide)) {
    const rawCo = Number(m.carbon_monoxide);
    const coVal = rawCo > 50 ? rawCo / 1000 : rawCo;
    subIndices.carbon_monoxide = calculateSubIndex('carbon_monoxide', coVal);
  }

  // Filter valid numeric sub-indices
  const validEntries = Object.entries(subIndices).filter(([_, val]) => typeof val === 'number' && !isNaN(val));

  if (validEntries.length === 0) {
    return {
      aqi: null,
      dominantPollutant: null,
      dominantPollutantKey: null,
      primaryPollutant: 'Not determined',
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
    ozone: 'O₃ (Surface Ozone)',
    ammonia: 'NH₃ (Ammonia)',
    lead: 'Pb (Lead)'
  };

  const primaryCodes = {
    pm2_5: 'PM2.5',
    pm10: 'PM10',
    nitrogen_dioxide: 'NO₂',
    sulphur_dioxide: 'SO₂',
    carbon_monoxide: 'CO',
    ozone: 'O₃',
    ammonia: 'NH₃',
    lead: 'Pb'
  };

  return {
    aqi: maxIndex,
    dominantPollutantKey: dominantKey,
    dominantPollutant: pollutantLabels[dominantKey] || dominantKey,
    primaryPollutant: primaryCodes[dominantKey] || dominantKey.toUpperCase(),
    categoryInfo: getCpcbCategory(maxIndex),
    subIndices
  };
}

/**
 * Universal Pollutant Normalizer
 * Accepts flat or nested pollutant objects in either naming convention
 * Returns complete, standardized 8 CPCB pollutants + supplementary VOC with aliases.
 */
export function normalizePollutants(rawInput = {}, subIndices = {}, options = {}) {
  const raw = rawInput || {};
  const subs = subIndices || {};
  const defaultSourceType = options.sourceType || 'live';

  function extractValue(keys) {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null) {
        if (typeof raw[k] === 'object' && raw[k] !== null && 'value' in raw[k]) {
          const v = raw[k].value;
          if (v !== undefined && v !== null && v !== '' && !isNaN(v) && isFinite(v) && Number(v) >= 0) {
            return Number(v);
          }
        } else {
          const v = raw[k];
          if (v !== undefined && v !== null && v !== '' && !isNaN(v) && isFinite(v) && Number(v) >= 0) {
            return Number(v);
          }
        }
      }
    }
    return null;
  }

  function extractSubIndex(keys) {
    for (const k of keys) {
      if (subs[k] !== undefined && subs[k] !== null && typeof subs[k] === 'number' && !isNaN(subs[k])) {
        return subs[k];
      }
      if (raw[k] && typeof raw[k] === 'object' && raw[k].subIndex !== undefined && raw[k].subIndex !== null) {
        const s = raw[k].subIndex;
        if (typeof s === 'number' && !isNaN(s)) return s;
      }
    }
    return null;
  }

  // 1. PM2.5
  const pm25Val = extractValue(['pm2_5', 'pm25']);
  const pm25Sub = extractSubIndex(['pm2_5', 'pm25']) ?? (pm25Val !== null ? calculateSubIndex('pm2_5', pm25Val) : null);
  const pm25Obj = {
    value: pm25Val,
    unit: 'µg/m³',
    label: 'PM2.5 (Fine Respirable Particulates)',
    shortLabel: 'PM2.5',
    nationalStandard: 60,
    whoStandard: 15,
    subIndex: pm25Sub,
    available: pm25Val !== null,
    status: pm25Val !== null ? defaultSourceType : 'not_provided'
  };

  // 2. PM10
  const pm10Val = extractValue(['pm10']);
  const pm10Sub = extractSubIndex(['pm10']) ?? (pm10Val !== null ? calculateSubIndex('pm10', pm10Val) : null);
  const pm10Obj = {
    value: pm10Val,
    unit: 'µg/m³',
    label: 'PM10 (Coarse Inhalable Dust)',
    shortLabel: 'PM10',
    nationalStandard: 100,
    whoStandard: 45,
    subIndex: pm10Sub,
    available: pm10Val !== null,
    status: pm10Val !== null ? defaultSourceType : 'not_provided'
  };

  // 3. NO2
  const no2Val = extractValue(['nitrogen_dioxide', 'no2']);
  const no2Sub = extractSubIndex(['nitrogen_dioxide', 'no2']) ?? (no2Val !== null ? calculateSubIndex('nitrogen_dioxide', no2Val) : null);
  const no2Obj = {
    value: no2Val,
    unit: 'µg/m³',
    label: 'NO₂ (Nitrogen Dioxide)',
    shortLabel: 'NO₂',
    nationalStandard: 80,
    whoStandard: 25,
    subIndex: no2Sub,
    available: no2Val !== null,
    status: no2Val !== null ? defaultSourceType : 'not_provided'
  };

  // 4. SO2
  const so2Val = extractValue(['sulphur_dioxide', 'so2']);
  const so2Sub = extractSubIndex(['sulphur_dioxide', 'so2']) ?? (so2Val !== null ? calculateSubIndex('sulphur_dioxide', so2Val) : null);
  const so2Obj = {
    value: so2Val,
    unit: 'µg/m³',
    label: 'SO₂ (Sulphur Dioxide)',
    shortLabel: 'SO₂',
    nationalStandard: 80,
    whoStandard: 40,
    subIndex: so2Sub,
    available: so2Val !== null,
    status: so2Val !== null ? defaultSourceType : 'not_provided'
  };

  // 5. CO
  let coValRaw = extractValue(['carbon_monoxide', 'co']);
  let coVal = coValRaw;
  if (coVal !== null && coVal > 50) {
    coVal = Math.round((coVal / 1000) * 100) / 100;
  } else if (coVal !== null) {
    coVal = Math.round(coVal * 100) / 100;
  }
  const coSub = extractSubIndex(['carbon_monoxide', 'co']) ?? (coVal !== null ? calculateSubIndex('carbon_monoxide', coVal) : null);
  const coObj = {
    value: coVal,
    unit: 'mg/m³',
    label: 'CO (Carbon Monoxide)',
    shortLabel: 'CO',
    nationalStandard: 2.0,
    whoStandard: 4.0,
    subIndex: coSub,
    available: coVal !== null,
    status: coVal !== null ? defaultSourceType : 'not_provided'
  };

  // 6. O3
  const o3Val = extractValue(['ozone', 'o3']);
  const o3Sub = extractSubIndex(['ozone', 'o3']) ?? (o3Val !== null ? calculateSubIndex('ozone', o3Val) : null);
  const o3Obj = {
    value: o3Val,
    unit: 'µg/m³',
    label: 'O₃ (Surface Ozone)',
    shortLabel: 'O₃',
    nationalStandard: 100,
    whoStandard: 100,
    subIndex: o3Sub,
    available: o3Val !== null,
    status: o3Val !== null ? defaultSourceType : 'not_provided'
  };

  // 7. NH3 (Ammonia)
  const nh3Val = extractValue(['ammonia', 'nh3']);
  const nh3Sub = extractSubIndex(['ammonia', 'nh3']) ?? (nh3Val !== null ? calculateSubIndex('ammonia', nh3Val) : null);
  const nh3Obj = {
    value: nh3Val,
    unit: 'µg/m³',
    label: 'NH₃ (Ammonia)',
    shortLabel: 'NH₃',
    nationalStandard: 400,
    subIndex: nh3Sub,
    available: nh3Val !== null,
    status: nh3Val !== null ? defaultSourceType : 'not_provided'
  };

  // 8. Pb (Lead)
  const pbVal = extractValue(['lead', 'pb']);
  const pbSub = extractSubIndex(['lead', 'pb']) ?? (pbVal !== null ? calculateSubIndex('lead', pbVal) : null);
  const pbObj = {
    value: pbVal,
    unit: 'µg/m³',
    label: 'Pb (Lead Particulate)',
    shortLabel: 'Pb',
    nationalStandard: 1.0,
    subIndex: pbSub,
    available: pbVal !== null,
    status: pbVal !== null ? defaultSourceType : 'not_provided'
  };

  // 9. Supplementary VOC (Volatile Organic Compounds) — Non-NAQI
  const vocVal = extractValue(['voc', 'volatile_organic_compounds', 'nmvoc']);
  const vocObj = {
    value: vocVal,
    unit: 'µg/m³',
    label: 'VOC (Volatile Organic Compounds)',
    shortLabel: 'VOC',
    isSupplementary: true,
    cpcbIncluded: false,
    subIndex: null, // VOC has no CPCB sub-index
    available: vocVal !== null,
    status: vocVal !== null ? defaultSourceType : 'not_provided'
  };

  return {
    // Canonical full names
    pm2_5: pm25Obj,
    pm10: pm10Obj,
    nitrogen_dioxide: no2Obj,
    sulphur_dioxide: so2Obj,
    carbon_monoxide: coObj,
    ozone: o3Obj,
    ammonia: nh3Obj,
    lead: pbObj,
    voc: vocObj,

    // Frontend shortcut aliases
    pm25: pm25Obj,
    no2: no2Obj,
    so2: so2Obj,
    co: coObj,
    o3: o3Obj,
    nh3: nh3Obj,
    pb: pbObj
  };
}
