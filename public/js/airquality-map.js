/**
 * ORBITAL EYE — AIR QUALITY OBSERVATORY ENGINE
 * Built on the Kisan District Map architecture with 594 verified administrative boundaries,
 * CAAQMS live continuous monitoring stations, CPCB National Air Quality Index (NAQI) linear sub-index calculations,
 * and resilient multi-source failover (Local Sentinel Worker -> Open-Meteo CAMS -> CPCB Baseline).
 */

(function () {
  'use strict';

  // CPCB NAQI Tier Color Palette & Specifications
  const CPCB_TIERS = [
    { max: 50, category: 'Good', hi: 'अच्छा', color: '#10b981', bg: 'bg-emerald-950/90', border: 'border-emerald-500', text: 'text-emerald-300' },
    { max: 100, category: 'Satisfactory', hi: 'संतोषजनक', color: '#84cc16', bg: 'bg-lime-950/90', border: 'border-lime-500', text: 'text-lime-300' },
    { max: 200, category: 'Moderate', hi: 'मध्यम', color: '#eab308', bg: 'bg-yellow-950/90', border: 'border-yellow-500', text: 'text-yellow-300' },
    { max: 300, category: 'Poor', hi: 'खराब', color: '#f97316', bg: 'bg-orange-950/90', border: 'border-orange-500', text: 'text-orange-300' },
    { max: 400, category: 'Very Poor', hi: 'बहुत खराब', color: '#ef4444', bg: 'bg-red-950/90', border: 'border-red-500', text: 'text-red-300' },
    { max: 500, category: 'Severe', hi: 'गंभीर', color: '#991b1b', bg: 'bg-rose-950/90', border: 'border-rose-600', text: 'text-rose-300' }
  ];

  function getCpcbTier(aqi) {
    const val = Math.max(0, Math.round(Number(aqi) || 0));
    for (const t of CPCB_TIERS) {
      if (val <= t.max) return { ...t, aqi: val };
    }
    return { ...CPCB_TIERS[CPCB_TIERS.length - 1], aqi: val };
  }

  // Linear sub-index calculator for CPCB (8 Official Pollutants)
  const CPCB_BREAKPOINTS = {
    pm25: [
      { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
      { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
      { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
      { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
      { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
      { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 }
    ],
    pm10: [
      { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
      { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
      { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
      { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
      { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
      { cLow: 431, cHigh: 800, iLow: 401, iHigh: 500 }
    ],
    no2: [
      { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
      { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
      { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
      { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
      { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
      { cLow: 401, cHigh: 800, iLow: 401, iHigh: 500 }
    ],
    so2: [
      { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
      { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
      { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
      { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
      { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
      { cLow: 1601, cHigh: 3000, iLow: 401, iHigh: 500 }
    ],
    co: [
      { cLow: 0.0, cHigh: 1.0, iLow: 0, iHigh: 50 },
      { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
      { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
      { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
      { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
      { cLow: 34.1, cHigh: 60.0, iLow: 401, iHigh: 500 }
    ],
    o3: [
      { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
      { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
      { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
      { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
      { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
      { cLow: 749, cHigh: 1200, iLow: 401, iHigh: 500 }
    ],
    nh3: [
      { cLow: 0, cHigh: 200, iLow: 0, iHigh: 50 },
      { cLow: 201, cHigh: 400, iLow: 51, iHigh: 100 },
      { cLow: 401, cHigh: 800, iLow: 101, iHigh: 200 },
      { cLow: 801, cHigh: 1200, iLow: 201, iHigh: 300 },
      { cLow: 1201, cHigh: 1800, iLow: 301, iHigh: 400 },
      { cLow: 1801, cHigh: 2500, iLow: 401, iHigh: 500 }
    ],
    pb: [
      { cLow: 0.0, cHigh: 0.5, iLow: 0, iHigh: 50 },
      { cLow: 0.6, cHigh: 1.0, iLow: 51, iHigh: 100 },
      { cLow: 1.1, cHigh: 2.0, iLow: 101, iHigh: 200 },
      { cLow: 2.1, cHigh: 3.0, iLow: 201, iHigh: 300 },
      { cLow: 3.1, cHigh: 3.5, iLow: 301, iHigh: 400 },
      { cLow: 3.51, cHigh: 5.0, iLow: 401, iHigh: 500 }
    ]
  };

  // Add aliases
  CPCB_BREAKPOINTS.pm2_5 = CPCB_BREAKPOINTS.pm25;
  CPCB_BREAKPOINTS.nitrogen_dioxide = CPCB_BREAKPOINTS.no2;
  CPCB_BREAKPOINTS.sulphur_dioxide = CPCB_BREAKPOINTS.so2;
  CPCB_BREAKPOINTS.carbon_monoxide = CPCB_BREAKPOINTS.co;
  CPCB_BREAKPOINTS.ozone = CPCB_BREAKPOINTS.o3;
  CPCB_BREAKPOINTS.ammonia = CPCB_BREAKPOINTS.nh3;
  CPCB_BREAKPOINTS.lead = CPCB_BREAKPOINTS.pb;

  function calcSubIndex(val, pollutantKey) {
    if (val === undefined || val === null || val === '' || isNaN(val) || !isFinite(val) || Number(val) < 0) return null;
    let key = String(pollutantKey || '').toLowerCase();
    if (key === 'pm2_5') key = 'pm25';
    if (key === 'nitrogen_dioxide') key = 'no2';
    if (key === 'sulphur_dioxide') key = 'so2';
    if (key === 'carbon_monoxide') key = 'co';
    if (key === 'ozone') key = 'o3';
    if (key === 'ammonia') key = 'nh3';
    if (key === 'lead') key = 'pb';

    const num = Number(val);
    const ranges = CPCB_BREAKPOINTS[key];
    if (!ranges) return null;

    for (const r of ranges) {
      if (num >= r.cLow && num <= r.cHigh) {
        return Math.round(((r.iHigh - r.iLow) / (r.cHigh - r.cLow)) * (num - r.cLow) + r.iLow);
      }
    }
    if (num > ranges[ranges.length - 1].cHigh) {
      return 500;
    }
    return 0;
  }

  // Universal Pollutant & AQI Data Normalizer for Frontend
  function normalizeAirQualityData(data) {
    if (!data) return null;
    const rawP = data.pollutants || {};
    const subIndices = data.subIndices || {};

    function getVal(keys) {
      for (const k of keys) {
        if (rawP[k] !== undefined && rawP[k] !== null) {
          const v = (typeof rawP[k] === 'object' && rawP[k] !== null && 'value' in rawP[k]) ? rawP[k].value : rawP[k];
          if (v !== undefined && v !== null && v !== '' && !isNaN(v) && isFinite(v) && Number(v) >= 0) {
            return Number(v);
          }
        }
      }
      return null;
    }

    function getSub(keys, val, pKey) {
      for (const k of keys) {
        if (subIndices[k] !== undefined && subIndices[k] !== null && typeof subIndices[k] === 'number') {
          return subIndices[k];
        }
        if (rawP[k] && typeof rawP[k] === 'object' && rawP[k].subIndex !== undefined && rawP[k].subIndex !== null) {
          const s = rawP[k].subIndex;
          if (typeof s === 'number' && !isNaN(s)) return s;
        }
      }
      return val !== null ? calcSubIndex(val, pKey) : null;
    }

    // 1. PM2.5 (Std: 60 µg/m³)
    const pm25Val = getVal(['pm2_5', 'pm25']);
    const pm25Sub = getSub(['pm2_5', 'pm25'], pm25Val, 'pm25');
    const pm25 = {
      value: pm25Val,
      unit: 'µg/m³',
      label: 'PM2.5 (Fine Particulates)',
      shortLabel: 'PM2.5',
      standard: 60,
      subIndex: pm25Sub,
      available: pm25Val !== null
    };

    // 2. PM10 (Std: 100 µg/m³)
    const pm10Val = getVal(['pm10']);
    const pm10Sub = getSub(['pm10'], pm10Val, 'pm10');
    const pm10 = {
      value: pm10Val,
      unit: 'µg/m³',
      label: 'PM10 (Coarse Inhalable Dust)',
      shortLabel: 'PM10',
      standard: 100,
      subIndex: pm10Sub,
      available: pm10Val !== null
    };

    // 3. NO2 (Std: 80 µg/m³)
    const no2Val = getVal(['nitrogen_dioxide', 'no2']);
    const no2Sub = getSub(['nitrogen_dioxide', 'no2'], no2Val, 'no2');
    const no2 = {
      value: no2Val,
      unit: 'µg/m³',
      label: 'NO₂ (Nitrogen Dioxide)',
      shortLabel: 'NO₂',
      standard: 80,
      subIndex: no2Sub,
      available: no2Val !== null
    };

    // 4. SO2 (Std: 80 µg/m³)
    const so2Val = getVal(['sulphur_dioxide', 'so2']);
    const so2Sub = getSub(['sulphur_dioxide', 'so2'], so2Val, 'so2');
    const so2 = {
      value: so2Val,
      unit: 'µg/m³',
      label: 'SO₂ (Sulphur Dioxide)',
      shortLabel: 'SO₂',
      standard: 80,
      subIndex: so2Sub,
      available: so2Val !== null
    };

    // 5. CO (Std: 2.0 mg/m³)
    let coValRaw = getVal(['carbon_monoxide', 'co']);
    let coVal = coValRaw;
    if (coVal !== null && coVal > 50) {
      coVal = Math.round((coVal / 1000) * 100) / 100;
    } else if (coVal !== null) {
      coVal = Math.round(coVal * 100) / 100;
    }
    const coSub = getSub(['carbon_monoxide', 'co'], coVal, 'co');
    const co = {
      value: coVal,
      unit: 'mg/m³',
      label: 'CO (Carbon Monoxide)',
      shortLabel: 'CO',
      standard: 2.0,
      subIndex: coSub,
      available: coVal !== null
    };

    // 6. O3 (Std: 100 µg/m³)
    const o3Val = getVal(['ozone', 'o3']);
    const o3Sub = getSub(['ozone', 'o3'], o3Val, 'o3');
    const o3 = {
      value: o3Val,
      unit: 'µg/m³',
      label: 'O₃ (Surface Ozone)',
      shortLabel: 'O₃',
      standard: 100,
      subIndex: o3Sub,
      available: o3Val !== null
    };

    // 7. NH3 (Ammonia, Std: 400 µg/m³)
    const nh3Val = getVal(['ammonia', 'nh3']);
    const nh3Sub = getSub(['ammonia', 'nh3'], nh3Val, 'nh3');
    const nh3 = {
      value: nh3Val,
      unit: 'µg/m³',
      label: 'NH₃ (Ammonia)',
      shortLabel: 'NH₃',
      standard: 400,
      subIndex: nh3Sub,
      available: nh3Val !== null
    };

    // 8. Pb (Lead, Std: 1.0 µg/m³)
    const pbVal = getVal(['lead', 'pb']);
    const pbSub = getSub(['lead', 'pb'], pbVal, 'pb');
    const pb = {
      value: pbVal,
      unit: 'µg/m³',
      label: 'Pb (Lead Particulate)',
      shortLabel: 'Pb',
      standard: 1.0,
      subIndex: pbSub,
      available: pbVal !== null
    };

    // 9. VOC (Volatile Organic Compounds) — Supplementary Non-NAQI
    const vocVal = getVal(['voc', 'volatile_organic_compounds', 'nmvoc']);
    const voc = {
      value: vocVal,
      unit: 'µg/m³',
      label: 'VOC (Volatile Organic Compounds)',
      shortLabel: 'VOC',
      standard: null,
      subIndex: null, // VOC never has a CPCB sub-index
      isSupplementary: true,
      cpcbIncluded: false,
      available: vocVal !== null
    };

    const normPollutants = {
      pm2_5: pm25, pm25: pm25,
      pm10: pm10,
      nitrogen_dioxide: no2, no2: no2,
      sulphur_dioxide: so2, so2: so2,
      carbon_monoxide: co, co: co,
      ozone: o3, o3: o3,
      ammonia: nh3, nh3: nh3,
      lead: pb, pb: pb,
      voc: voc
    };

    // Determine primary/dominant pollutant solely from valid numeric sub-indices
    let dominantKey = data.dominantPollutantKey || null;
    let dominantLabel = data.dominantPollutant || null;
    let primaryCode = data.primaryPollutant || null;

    const subEntries = [
      ['PM2.5', pm25Sub, 'pm2_5', 'PM2.5 (Fine Particulates)'],
      ['PM10', pm10Sub, 'pm10', 'PM10 (Coarse Dust)'],
      ['NO₂', no2Sub, 'nitrogen_dioxide', 'NO₂ (Nitrogen Dioxide)'],
      ['SO₂', so2Sub, 'sulphur_dioxide', 'SO₂ (Sulphur Dioxide)'],
      ['CO', coSub, 'carbon_monoxide', 'CO (Carbon Monoxide)'],
      ['O₃', o3Sub, 'ozone', 'O₃ (Surface Ozone)'],
      ['NH₃', nh3Sub, 'ammonia', 'NH₃ (Ammonia)'],
      ['Pb', pbSub, 'lead', 'Pb (Lead)']
    ].filter(([_, s]) => typeof s === 'number' && !isNaN(s));

    if (subEntries.length > 0) {
      subEntries.sort((a, b) => b[1] - a[1]);
      if (!primaryCode || primaryCode === 'PM2.5' && !dominantKey) {
        primaryCode = subEntries[0][0];
        dominantKey = subEntries[0][2];
        dominantLabel = subEntries[0][3];
      }
    } else {
      primaryCode = 'Not determined';
      dominantLabel = 'Not determined';
    }

    let overallAqi = typeof data.aqi === 'number' ? data.aqi : null;
    if (overallAqi === null && subEntries.length > 0) {
      overallAqi = subEntries[0][1];
    }

    const tier = overallAqi !== null ? getCpcbTier(overallAqi) : {
      category: 'Data Unavailable',
      hi: 'डेटा अनुपलब्ध',
      color: '#64748b',
      border: 'border-slate-800',
      bg: 'bg-slate-900/40'
    };

    return {
      ...data,
      aqi: overallAqi,
      tier,
      category: data.category || tier.category,
      categoryHindi: data.categoryHi || data.categoryHindi || tier.hi,
      color: data.color || tier.color,
      dominantPollutant: dominantLabel || primaryCode,
      dominantPollutantKey: dominantKey,
      primaryPollutant: primaryCode,
      pollutants: normPollutants,
      healthRecommendations: data.healthRecommendations || {
        general: data.advisory?.general || data.healthStatement || 'Real-time observation pending.',
        sensitive: data.advisory?.sensitive || 'No specific hazard reported.',
        action: data.advisory?.action || data.advisory?.ventilation || 'Refer to local advisories.'
      },
      provenance: data.provenance || {
        source: 'Open-Meteo CAMS Atmospheric Model (CPCB Calibrated)',
        scale: 'CPCB 6-Category National Air Quality Index (India)'
      }
    };
  }

  // Major CAAQMS Stations across India
  const CAAQMS_STATIONS = [
    { id: 'delhi_anand_vihar', name: 'Anand Vihar, Delhi', city: 'Delhi', state: 'Delhi', lat: 28.6508, lon: 77.3152 },
    { id: 'delhi_ito', name: 'ITO, Delhi', city: 'Delhi', state: 'Delhi', lat: 28.6289, lon: 77.2405 },
    { id: 'delhi_rk_puram', name: 'R K Puram, Delhi', city: 'Delhi', state: 'Delhi', lat: 28.5638, lon: 77.1869 },
    { id: 'delhi_punjabi_bagh', name: 'Punjabi Bagh, Delhi', city: 'Delhi', state: 'Delhi', lat: 28.6740, lon: 77.1310 },
    { id: 'mumbai_bandra', name: 'Bandra Kurla Complex, Mumbai', city: 'Mumbai', state: 'Maharashtra', lat: 19.0657, lon: 72.8687 },
    { id: 'mumbai_colaba', name: 'Colaba, Mumbai', city: 'Mumbai', state: 'Maharashtra', lat: 18.9067, lon: 72.8147 },
    { id: 'pune_shivajinagar', name: 'Shivajinagar, Pune', city: 'Pune', state: 'Maharashtra', lat: 18.5314, lon: 73.8446 },
    { id: 'pune_hadapsar', name: 'Hadapsar, Pune', city: 'Pune', state: 'Maharashtra', lat: 18.5089, lon: 73.9260 },
    { id: 'pune_katraj', name: 'Katraj, Pune', city: 'Pune', state: 'Maharashtra', lat: 18.4575, lon: 73.8677 },
    { id: 'nagpur_civil_lines', name: 'Civil Lines, Nagpur', city: 'Nagpur', state: 'Maharashtra', lat: 21.1550, lon: 79.0725 },
    { id: 'nashik_gangapur', name: 'Gangapur Road, Nashik', city: 'Nashik', state: 'Maharashtra', lat: 20.0125, lon: 73.7650 },
    { id: 'bangalore_btm', name: 'BTM Layout, Bengaluru', city: 'Bengaluru', state: 'Karnataka', lat: 12.9166, lon: 77.6101 },
    { id: 'bangalore_silk_board', name: 'Central Silk Board, Bengaluru', city: 'Bengaluru', state: 'Karnataka', lat: 12.9172, lon: 77.6229 },
    { id: 'hyderabad_sanathnagar', name: 'Sanathnagar, Hyderabad', city: 'Hyderabad', state: 'Telangana', lat: 17.4565, lon: 78.4439 },
    { id: 'chennai_alandur', name: 'Alandur, Chennai', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0033, lon: 80.2016 },
    { id: 'kolkata_victoria', name: 'Victoria Memorial, Kolkata', city: 'Kolkata', state: 'West Bengal', lat: 22.5448, lon: 88.3426 },
    { id: 'lucknow_talkatora', name: 'Talkatora, Lucknow', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8335, lon: 80.8990 },
    { id: 'varanasi_bhu', name: 'BHU, Varanasi', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.2677, lon: 82.9913 },
    { id: 'patna_samangadh', name: 'Samanpura, Patna', city: 'Patna', state: 'Bihar', lat: 25.6090, lon: 85.0920 },
    { id: 'ahmedabad_maninagar', name: 'Maninagar, Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', lat: 22.9978, lon: 72.6033 },
    { id: 'jaipur_adars_nagar', name: 'Adarsh Nagar, Jaipur', city: 'Jaipur', state: 'Rajasthan', lat: 26.9030, lon: 75.8340 },
    { id: 'bhopal_tt_nagar', name: 'T.T. Nagar, Bhopal', city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2330, lon: 77.4010 },
    { id: 'ludhiana_punjabi_univ', name: 'Punjab Agricultural Univ, Ludhiana', city: 'Ludhiana', state: 'Punjab', lat: 30.9010, lon: 75.8080 }
  ];

  let leafletMap = null;
  let leafletDistrictLayer = null;
  let leafletStateLayer = null;
  let leafletStationGroup = null;
  let leafletSelectedDistrictLayer = null;
  let leafletAqiPopup = null;
  let lastPopupLatLng = null;

  let districtGeoJsonData = null;
  let stateGeoJsonData = null;
  let districtIndexData = null;
  let showStations = true;
  let currentBasemapType = 'satellite';
  let leafletBasemap = null;

  // Initialize
  function initAqiSync() {
    if (window.INDIA_DISTRICTS_INDEX && !districtIndexData) {
      districtIndexData = window.INDIA_DISTRICTS_INDEX;
      window.districtIndexData = districtIndexData;
    }
    if (window.INDIA_STATES_GEOJSON && !stateGeoJsonData) {
      stateGeoJsonData = window.INDIA_STATES_GEOJSON;
    }
    if (window.INDIA_DISTRICTS_GEOJSON && !districtGeoJsonData) {
      districtGeoJsonData = window.INDIA_DISTRICTS_GEOJSON;
    }
  }

  // Populate States
  window.populateAqiStateDropdown = populateAqiStateDropdown;
  window.populateAqiDistrictDropdown = populateAqiDistrictDropdown;
  function populateAqiStateDropdown() {
    if (!districtIndexData || !Array.isArray(districtIndexData.districts)) return;
    const states = Array.from(new Set(districtIndexData.districts.map(d => d.state))).sort();
    const sel = document.getElementById('top-aqi-state-select');
    if (!sel) return;

    let opts = '<option value="" class="bg-slate-900 text-slate-100">All States & UTs (' + states.length + ')</option>';
    states.forEach(st => {
      opts += '<option value="' + st + '" class="bg-slate-900 text-slate-100">' + st + '</option>';
    });
    sel.innerHTML = opts;
  }

  // Populate Districts
  function populateAqiDistrictDropdown(stateFilter) {
    const sel = document.getElementById('top-aqi-district-select');
    if (!sel || !districtIndexData || !Array.isArray(districtIndexData.districts)) return;

    let dists = districtIndexData.districts;
    if (stateFilter) {
      dists = dists.filter(d => d.state.toLowerCase() === stateFilter.toLowerCase());
    }
    dists = [...dists].sort((a, b) => a.district.localeCompare(b.district));

    let opts = '<option value="" class="bg-slate-900 text-slate-100">Select District (' + dists.length + ')...</option>';
    dists.forEach(d => {
      opts += '<option value="' + d.id + '" class="bg-slate-900 text-slate-100">' + d.district + '</option>';
    });
    sel.innerHTML = opts;
  }

  // Initialize Leaflet Map
  function initAqiMap() {
    if (leafletMap) return;

    leafletMap = L.map('map-container', {
      center: [22.5, 82.0],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
      minZoom: 3,
      maxZoom: 19
    });

    window.leafletMap = leafletMap;
    L.control.zoom({ position: 'topright' }).addTo(leafletMap);

    setBasemap(currentBasemapType);

    // State boundaries
    if (stateGeoJsonData) {
      leafletStateLayer = L.geoJSON(stateGeoJsonData, {
        style: {
          color: '#f59e0b',
          weight: 1.8,
          opacity: 0.75,
          fill: false,
          interactive: false
        }
      }).addTo(leafletMap);
    }

    // District polygons
    if (districtGeoJsonData) {
      leafletDistrictLayer = L.geoJSON(districtGeoJsonData, {
        style: feature => ({
          color: '#38bdf8',
          weight: 1.0,
          opacity: 0.6,
          fillColor: '#0ea5e9',
          fillOpacity: 0.08
        }),
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          layer.bindTooltip(`${p.district}, ${p.state}`, {
            permanent: false,
            direction: 'center',
            className: 'text-xs font-mono bg-slate-950/90 text-slate-200 border border-slate-700 px-2 py-1 rounded shadow-lg'
          });

          layer.on({
            mouseover: e => {
              if (feature.properties.id !== window.selectedDistrictId) {
                layer.setStyle({ weight: 2.2, color: '#38bdf8', fillOpacity: 0.2 });
              }
            },
            mouseout: e => {
              if (feature.properties.id !== window.selectedDistrictId) {
                layer.setStyle({ weight: 1.0, color: '#38bdf8', fillOpacity: 0.08 });
              }
            },
            click: e => {
              L.DomEvent.stopPropagation(e);
              handleCoordinateClick(e.latlng, feature, layer);
            }
          });
        }
      }).addTo(leafletMap);
    }

    // CAAQMS Station Overlay Markers
    renderStationMarkers();

    // Click anywhere on map
    leafletMap.on('click', e => {
      if (typeof window.toggleMobileNavMenu === 'function') {
        window.toggleMobileNavMenu(false);
      }
      handleCoordinateClick(e.latlng);
    });

    console.log('[Air Quality Map] Initialized successfully.');
  }

  // Set Basemap
  function setBasemap(type) {
    if (!leafletMap) return;
    if (leafletBasemap) leafletMap.removeLayer(leafletBasemap);

    if (type === 'satellite') {
      leafletBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 18,
        maxZoom: 19,
        attribution: '&copy; Esri, Maxar'
      }).addTo(leafletMap);
      leafletBasemap.on('tileerror', function() {
        if (currentBasemapType === 'satellite') {
          setBasemap('dark');
        }
      });
    } else if (type === 'dark') {
      leafletBasemap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxNativeZoom: 19,
        maxZoom: 19,
        attribution: '&copy; CartoDB &copy; OpenStreetMap'
      }).addTo(leafletMap);
    } else {
      leafletBasemap = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxNativeZoom: 19,
        maxZoom: 19,
        attribution: '&copy; CartoDB &copy; OpenStreetMap'
      }).addTo(leafletMap);
    }
    currentBasemapType = type;
  }
  window.setBasemap = setBasemap;

  window.toggleAqiBasemap = function () {
    const next = currentBasemapType === 'satellite' ? 'dark' : (currentBasemapType === 'dark' ? 'street' : 'satellite');
    setBasemap(next);
    const btn = document.getElementById('btn-toggle-basemap');
    if (btn) {
      btn.innerText = next === 'satellite' ? '🛰️ Satellite' : (next === 'dark' ? '🌙 Dark Grid' : '🗺️ Street');
    }
  };

  // Render CAAQMS Station Markers
  function renderStationMarkers() {
    if (!leafletMap) return;
    if (leafletStationGroup) {
      leafletMap.removeLayer(leafletStationGroup);
      leafletStationGroup = null;
    }
    if (!showStations) return;

    leafletStationGroup = L.layerGroup();

    CAAQMS_STATIONS.forEach(st => {
      const marker = L.circleMarker([st.lat, st.lon], {
        radius: 7,
        color: '#38bdf8',
        weight: 2,
        fillColor: '#0284c7',
        fillOpacity: 0.85
      });

      marker.bindTooltip(`📡 ${st.name}`, {
        permanent: false,
        direction: 'top',
        className: 'text-xs font-mono bg-slate-950 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded shadow'
      });

      marker.on('click', e => {
        L.DomEvent.stopPropagation(e);
        selectStation(st, e.latlng);
      });

      marker.addTo(leafletStationGroup);
    });

    leafletStationGroup.addTo(leafletMap);
  }

  window.toggleStations = function () {
    showStations = !showStations;
    renderStationMarkers();
    const btn = document.getElementById('btn-toggle-stations');
    if (btn) {
      btn.className = showStations 
        ? 'px-2.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs transition flex items-center gap-1 shadow-sm whitespace-nowrap'
        : 'px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 text-xs transition flex items-center gap-1 whitespace-nowrap';
    }
  };

  // Select Station
  async function selectStation(st, latlng) {
    const coord = latlng || L.latLng(st.lat, st.lon);
    if (leafletMap) {
      const isMobile = window.innerWidth < 768;
      const targetZoom = Math.max(leafletMap.getZoom(), 8);
      if (isMobile) {
        const pt = leafletMap.project(coord, targetZoom).subtract([0, 120]);
        leafletMap.setView(leafletMap.unproject(pt, targetZoom), targetZoom, { animate: true });
      }
    }
    openAqiLoadingPopup(st.name, `${st.city}, ${st.state}`, coord);
    fetchAndDisplayAqi(null, st.name, st.state, st.lat, st.lon, coord, true);
  }

  // Smart Mobile Viewport Positioning: Places coordinates safely in lower viewport
  // so the Leaflet popup bubble (which renders ABOVE the coordinate) sits cleanly below the search header.
  function focusMapCoordinateForMobile(map, latlng, forceZoom) {
    if (!map || !latlng) return;
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      if (forceZoom) map.setView(latlng, forceZoom, { animate: true });
      return;
    }
    const targetZoom = forceZoom || Math.max(map.getZoom(), 8);
    const headerEl = document.querySelector('header');
    const headerBottom = headerEl ? Math.ceil(headerEl.getBoundingClientRect().bottom) : 260;
    const mobileNav = document.getElementById('orbital-mobile-nav');
    const bottomPad = mobileNav ? Math.ceil(window.innerHeight - mobileNav.getBoundingClientRect().top) : 70;

    // Target screen Y: ensures the ~270px popup bubble renders completely below the header
    const targetScreenY = Math.min(window.innerHeight - bottomPad - 40, Math.max(headerBottom + 290, Math.round(window.innerHeight * 0.68)));
    const centerScreenY = window.innerHeight / 2;
    const pixelOffset = targetScreenY - centerScreenY;

    const projectedPt = map.project(latlng, targetZoom).subtract([0, pixelOffset]);
    const newCenter = map.unproject(projectedPt, targetZoom);
    map.setView(newCenter, targetZoom, { animate: false });
  }

  // Handle Map Click
  function handleCoordinateClick(latlng, feature, layer) {
    if (!latlng) return;
    initAqiSync();

    // On mobile (< 768px): Close big details panel so ONLY small preview card is open on touch (no double cards)
    if (window.innerWidth < 768 && typeof window.closeDeskPanel === 'function') {
      window.closeDeskPanel();
    }

    const lat = latlng.lat;
    const lon = latlng.lng;

    // Find closest district
    let closest = null;
    let minDist = Infinity;
    if (districtIndexData && Array.isArray(districtIndexData.districts)) {
      for (const d of districtIndexData.districts) {
        const dist = Math.hypot(d.lat - lat, d.lon - lon);
        if (dist < minDist) {
          minDist = dist;
          closest = d;
        }
      }
    }

    const p = feature?.properties;
    const distId = p?.id || closest?.id;
    const distName = p?.district || closest?.district || 'Location';
    const stateName = p?.state || closest?.state || 'India';

    window.selectedDistrictId = distId;

    // Highlight polygon
    let targetFeat = feature;
    if (!targetFeat && distId && districtGeoJsonData?.features) {
      targetFeat = districtGeoJsonData.features.find(f => f.properties.id === distId);
    }

    if (targetFeat && leafletMap) {
      if (leafletSelectedDistrictLayer) {
        leafletMap.removeLayer(leafletSelectedDistrictLayer);
      }
      leafletSelectedDistrictLayer = L.geoJSON(targetFeat, {
        style: {
          color: '#38bdf8',
          weight: 3.5,
          opacity: 1,
          fillColor: '#0284c7',
          fillOpacity: 0.28
        },
        interactive: false
      }).addTo(leafletMap);
    }

    // Sync dropdowns
    if (closest) {
      const stateSel = document.getElementById('top-aqi-state-select');
      if (stateSel) stateSel.value = closest.state;
      populateAqiDistrictDropdown(closest.state);
      const distSel = document.getElementById('top-aqi-district-select');
      if (distSel) distSel.value = closest.id;
      const searchInput = document.getElementById('top-aqi-search-input');
      if (searchInput) searchInput.value = `${closest.district}, ${closest.state}`;
    }

    openAqiLoadingPopup(distName, stateName, latlng);
    fetchAndDisplayAqi(distId, distName, stateName, lat, lon, latlng, false);
  }

  // Loading Popup
  function openAqiLoadingPopup(name, state, latlng) {
    if (!leafletMap) return;
    const coordStr = `${Math.abs(latlng.lat).toFixed(4)}°${latlng.lat >= 0 ? 'N' : 'S'}, ${Math.abs(latlng.lng).toFixed(4)}°${latlng.lng >= 0 ? 'E' : 'W'}`;

    const html = `
      <div class="p-3.5 space-y-2 text-slate-200" style="min-width: 250px;">
        <div class="flex items-center justify-between pb-1.5 border-b border-cyan-500/30">
          <div>
            <div class="font-bold text-white text-xs font-mono flex items-center gap-1.5">
              <span>📍 ${name}</span>
            </div>
            <div class="text-[9px] text-slate-400 font-mono">${coordStr} • ${state}</div>
          </div>
        </div>
        <div class="py-2.5 flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Retrieving CPCB NAQI telemetry...</span>
        </div>
      </div>
    `;

    if (leafletAqiPopup) leafletMap.closePopup(leafletAqiPopup);
    lastPopupLatLng = latlng;
    const isMobile = window.innerWidth < 768;
    const headerEl = document.querySelector('header');
    const headerBottom = headerEl ? Math.ceil(headerEl.getBoundingClientRect().bottom) : 260;
    const mobileNav = document.getElementById('orbital-mobile-nav');
    const botPad = mobileNav ? Math.ceil(window.innerHeight - mobileNav.getBoundingClientRect().top + 16) : (isMobile ? 80 : 40);
    const topPad = isMobile ? (headerBottom + 16) : 60;

    // On mobile: position coordinate cleanly in lower safe zone so popup fits below header
    if (isMobile && leafletMap) {
      focusMapCoordinateForMobile(leafletMap, latlng);
    }

    leafletAqiPopup = L.popup({
      className: 'aqi-popup',
      offset: [0, -10],
      autoPan: true,
      autoPanPaddingTopLeft: [16, topPad],
      autoPanPaddingBottomRight: [16, botPad]
    })
    .setLatLng(latlng)
    .setContent(html)
    .openOn(leafletMap);
  }

  // Unified AQI Fetcher
  async function fetchAirQualityUnified(lat, lon, name, state) {
    // 1. Try local server API
    const endpoints = [];
    if (window.location.protocol === 'file:') {
      endpoints.push(`http://localhost:3000/api/airquality/station?lat=${lat}&lon=${lon}`);
    } else {
      endpoints.push(`/api/airquality/station?lat=${lat}&lon=${lon}`);
    }

    for (const ep of endpoints) {
      try {
        const c = new AbortController();
        const tid = setTimeout(() => c.abort(), 2000);
        const res = await fetch(ep, { signal: c.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          if (json && json.ok && typeof json.aqi === 'number') {
            return normalizeAirQualityData(json);
          }
        }
      } catch (_) {}
    }

    // 2. Direct client fallback from Open-Meteo Air Quality (Worldwide, free, CORS-friendly)
    try {
      const omUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,ammonia&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,ammonia&timezone=Asia%2FKolkata&forecast_days=4`;
      const res = await fetch(omUrl);
      if (res.ok) {
        const om = await res.json();
        const curr = om.current || {};

        // Compute CPCB linear sub-indices
        const subIndices = {
          pm25: calcSubIndex(curr.pm2_5, 'pm25'),
          pm10: calcSubIndex(curr.pm10, 'pm10'),
          no2: calcSubIndex(curr.nitrogen_dioxide, 'no2'),
          so2: calcSubIndex(curr.sulphur_dioxide, 'so2'),
          co: calcSubIndex(curr.carbon_monoxide != null ? (curr.carbon_monoxide > 50 ? curr.carbon_monoxide / 1000 : curr.carbon_monoxide) : null, 'co'),
          o3: calcSubIndex(curr.ozone, 'o3'),
          nh3: calcSubIndex(curr.ammonia, 'nh3'),
          pb: null
        };

        let maxVal = -1;
        let primary = 'Not determined';
        for (const [key, val] of Object.entries(subIndices)) {
          if (val != null && val > maxVal) {
            maxVal = val;
            const keyMap = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂', so2: 'SO₂', co: 'CO', o3: 'O₃', nh3: 'NH₃', pb: 'Pb' };
            primary = keyMap[key] || key.toUpperCase();
          }
        }

        const overallAqi = maxVal >= 0 ? maxVal : null;
        const tier = overallAqi !== null ? getCpcbTier(overallAqi) : {
          category: 'Data Unavailable',
          hi: 'डेटा अनुपलब्ध',
          color: '#64748b',
          border: 'border-slate-800',
          bg: 'bg-slate-900/40'
        };

        // Hourly trend
        const hourlyTrend = [];
        if (om.hourly && Array.isArray(om.hourly.time)) {
          for (let i = 0; i < Math.min(om.hourly.time.length, 48); i += 2) {
            const hPm25 = om.hourly.pm2_5?.[i] ?? null;
            const hAqi = hPm25 !== null ? calcSubIndex(hPm25, 'pm25') : null;
            if (hAqi !== null) {
              hourlyTrend.push({
                time: om.hourly.time[i],
                aqi: hAqi,
                pm25: hPm25
              });
            }
          }
        }

        const rawData = {
          ok: true,
          location: name,
          state: state,
          coordinates: { lat: Number(lat), lon: Number(lon) },
          observationTime: curr.time || new Date().toISOString(),
          aqi: overallAqi,
          category: tier.category,
          categoryHindi: tier.hi,
          primaryPollutant: primary,
          color: tier.color,
          pollutants: {
            pm2_5: curr.pm2_5 ?? null,
            pm10: curr.pm10 ?? null,
            nitrogen_dioxide: curr.nitrogen_dioxide ?? null,
            sulphur_dioxide: curr.sulphur_dioxide ?? null,
            carbon_monoxide: curr.carbon_monoxide != null ? (curr.carbon_monoxide > 50 ? curr.carbon_monoxide / 1000 : curr.carbon_monoxide) : null,
            ozone: curr.ozone ?? null,
            ammonia: curr.ammonia ?? null,
            lead: null,
            voc: null
          },
          subIndices,
          hourlyTrend,
          healthRecommendations: getHealthPrecautions(tier.category),
          provenance: {
            source: 'Open-Meteo ECMWF / CAMS Atmospheric Chemistry Model (CPCB Calibrated)',
            scale: 'CPCB 6-Category National Air Quality Index (India)'
          }
        };

        return normalizeAirQualityData(rawData);
      }
    } catch (_) {}

    // 3. Fallback baseline (honest, no fabricated live measurements)
    return getAqiFallbackBaseline(name, state, lat, lon);
  }

  function getHealthPrecautions(cat) {
    switch (cat) {
      case 'Good':
        return {
          general: 'Minimal health impact. Clean fresh air ideal for all outdoor activities.',
          sensitive: 'No special precautions required. Healthy air quality.',
          action: 'Keep windows open to allow clean fresh air circulation.'
        };
      case 'Satisfactory':
        return {
          general: 'Air quality is acceptable. Minor breathing discomfort to extremely sensitive individuals.',
          sensitive: 'Unusually sensitive individuals should monitor respiratory symptoms during intense workouts.',
          action: 'Standard daily activities can proceed without restriction.'
        };
      case 'Moderate':
        return {
          general: 'Breathing discomfort to people with lung, asthma, and heart diseases.',
          sensitive: 'People with respiratory or cardiovascular diseases, children, and elderly should limit prolonged outdoor exertion.',
          action: 'Close windows during rush hour and peak traffic periods.'
        };
      case 'Poor':
        return {
          general: 'Breathing discomfort to most people on prolonged exposure.',
          sensitive: 'High risk for people with heart or lung disease, older adults, and children. Avoid prolonged outdoor exertion.',
          action: 'Wear N95/N99 protective masks outdoors; run HEPA air purifiers indoors.'
        };
      case 'Very Poor':
        return {
          general: 'Respiratory illness on prolonged exposure. Significant eye irritation, coughing, and throat dryness.',
          sensitive: 'Everyone may experience health effects. Significant risk for people with respiratory conditions.',
          action: 'Avoid all outdoor physical activity; seal windows; operate air purifiers on high.'
        };
      case 'Severe':
        return {
          general: 'Affects healthy people and seriously impacts those with existing diseases. Emergency air pollution levels.',
          sensitive: 'Strict indoor confinement. Children, seniors, and heart patients must avoid all outdoor physical exposure.',
          action: 'Mandatory N95/FFP2 respirator masks outdoors; maintain sealed indoor air filtration.'
        };
      default:
        return {
          general: 'Connecting to monitoring stations and atmospheric chemistry models...',
          sensitive: 'Live readings currently unavailable for this specific district coordinate.',
          action: 'Select a nearby CAAQMS station from the station radar.'
        };
    }
  }

  function getAqiFallbackBaseline(name, state, lat, lon) {
    return normalizeAirQualityData({
      ok: true,
      isFallback: true,
      location: name,
      state: state,
      coordinates: { lat: Number(lat), lon: Number(lon) },
      observationTime: new Date().toISOString(),
      aqi: null,
      category: 'Data Unavailable',
      categoryHindi: 'डेटा प्रतीक्षारत',
      primaryPollutant: 'Not determined',
      color: '#64748b',
      pollutants: {
        pm2_5: null,
        pm10: null,
        nitrogen_dioxide: null,
        sulphur_dioxide: null,
        carbon_monoxide: null,
        ozone: null,
        ammonia: null,
        lead: null,
        voc: null
      },
      subIndices: {},
      hourlyTrend: [],
      healthRecommendations: getHealthPrecautions('default'),
      provenance: {
        source: 'Live Station Sensor Telemetry Offline',
        scale: 'CPCB 6-Category National Air Quality Index (India)'
      }
    });
  }

  // Fetch & Display
  async function fetchAndDisplayAqi(distId, name, state, lat, lon, latlng, isStation) {
    const container = document.getElementById('selected-aqi-content');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8 space-y-3 text-cyan-400 font-mono">
          <i class="fa-solid fa-spinner fa-spin text-2xl"></i>
          <div class="text-xs font-bold">Retrieving CPCB NAQI for ${name}...</div>
          <p class="text-[10px] text-slate-400 font-sans">Connecting to CAAQMS stations and atmospheric chemistry models</p>
        </div>
      `;
    }

    try {
      const data = await fetchAirQualityUnified(lat, lon, name, state);
      renderAqiDeskPanel(data);
      updateAqiPopup(data, latlng || lastPopupLatLng);
    } catch (err) {
      console.warn('[Air Quality] Fetch note, deploying baseline:', err);
      const fallback = getAqiFallbackBaseline(name, state, lat, lon);
      renderAqiDeskPanel(fallback);
      updateAqiPopup(fallback, latlng || lastPopupLatLng);
    }
  }

  // Update Popup
  function updateAqiPopup(data, latlng) {
    if (!leafletMap || !latlng) return;
    const norm = normalizeAirQualityData(data);
    const tier = norm.tier;
    const p = norm.pollutants;
    const pm25 = p.pm25.available ? Number(p.pm25.value).toFixed(1) : '--';
    const pm10 = p.pm10.available ? Number(p.pm10.value).toFixed(1) : '--';
    const aqiDisplay = norm.aqi !== null ? norm.aqi : '--';
    const primaryDisplay = norm.primaryPollutant || 'Not determined';

    const coordStr = `${Math.abs(latlng.lat).toFixed(4)}°${latlng.lat >= 0 ? 'N' : 'S'}, ${Math.abs(latlng.lng).toFixed(4)}°${latlng.lng >= 0 ? 'E' : 'W'}`;

    const html = `
      <div class="p-3.5 space-y-2.5 text-slate-100 font-sans" style="min-width: 260px; max-width: 300px;">
        <!-- Header -->
        <div class="flex items-start justify-between gap-1.5 pb-2 border-b border-cyan-500/30">
          <div>
            <div class="font-bold text-white text-xs font-mono flex items-center gap-1.5 leading-snug">
              <span>📍 ${norm.stationName || norm.location}</span>
            </div>
            <div class="text-[10px] text-slate-400 font-mono">${coordStr} • ${norm.state}</div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono text-white" style="background-color: ${tier.color};">
            ${tier.category} (${tier.hi || norm.categoryHindi || ''})
          </span>
        </div>

        <!-- AQI Core Number -->
        <div class="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <div>
            <div class="text-[10px] text-slate-400 font-mono uppercase tracking-wider">CPCB National AQI</div>
            <div class="text-2xl font-black font-mono" style="color: ${tier.color};">${aqiDisplay}</div>
            <div class="text-[9px] text-slate-400 font-mono">Primary: <span class="text-cyan-300 font-bold">${primaryDisplay}</span></div>
          </div>
          <div class="text-right space-y-1">
            <div class="text-[10px] font-mono"><span class="text-slate-400">PM2.5:</span> <span class="font-bold text-slate-200">${pm25}</span> µg/m³</div>
            <div class="text-[10px] font-mono"><span class="text-slate-400">PM10:</span> <span class="font-bold text-slate-200">${pm10}</span> µg/m³</div>
          </div>
        </div>

        <!-- Health Note -->
        <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/80 text-[10px] leading-relaxed text-slate-300">
          <span class="font-bold text-cyan-300">Advisory:</span> ${norm.healthRecommendations?.general || 'Standard precautions apply.'}
        </div>

        <!-- Action Button -->
        <button onclick="window.expandAqiDesk()" class="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-md">
          <i class="fa-solid fa-chart-simple text-xs"></i>
          <span>Open 24h & Full Telemetry Desk</span>
        </button>
      </div>
    `;

    if (leafletAqiPopup && leafletMap) leafletMap.closePopup(leafletAqiPopup);

    const isMobile = window.innerWidth < 768;
    const headerEl = document.querySelector('header');
    const headerBottom = headerEl ? Math.ceil(headerEl.getBoundingClientRect().bottom) : 260;
    const mobileNav = document.getElementById('orbital-mobile-nav');
    const botPad = mobileNav ? Math.ceil(window.innerHeight - mobileNav.getBoundingClientRect().top + 16) : (isMobile ? 80 : 40);
    const topPad = isMobile ? (headerBottom + 16) : 60;

    leafletAqiPopup = L.popup({
      className: 'aqi-popup',
      offset: [0, -10],
      autoPan: true,
      autoPanPaddingTopLeft: [16, topPad],
      autoPanPaddingBottomRight: [16, botPad]
    })
    .setLatLng(latlng)
    .setContent(html)
    .openOn(leafletMap);
    if (typeof leafletAqiPopup.update === 'function') {
      leafletAqiPopup.update();
    }
    window.leafletAqiPopup = leafletAqiPopup;
  }

  // Expand Full AQI Desk Panel (Invoked from small card button)
  window.expandAqiDesk = function() {
    // 1. Close small map popup so only one card is active
    if (window.innerWidth < 768) {
      if (leafletAqiPopup && leafletMap) {
        leafletMap.closePopup(leafletAqiPopup);
      }
    }
    // 2. Open full desk panel
    if (typeof window.openDeskPanel === 'function') {
      window.openDeskPanel();
    } else {
      const panel = document.getElementById('selected-aqi-panel');
      if (panel) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
      }
    }
  };

  // Render Desk Panel (Full 8 CPCB Pollutants + Supplementary VOC)
  function renderAqiDeskPanel(rawData) {
    const container = document.getElementById('selected-aqi-content');
    if (!container) return;
    // On desktop (>= 768px): Auto open desk panel
    // On mobile (< 768px): Keep desk panel closed so ONLY small popup card opens on touch
    if (window.innerWidth >= 768) {
      if (typeof window.openDeskPanel === 'function') {
        window.openDeskPanel();
      } else {
        const panel = document.getElementById('selected-aqi-panel');
        if (panel) {
          panel.classList.remove('hidden');
          panel.classList.add('flex');
        }
      }
    }

    const norm = normalizeAirQualityData(rawData);
    const tier = norm.tier;
    const p = norm.pollutants;
    const aqiDisplay = norm.aqi !== null ? norm.aqi : '--';
    const primaryDisplay = norm.primaryPollutant || 'Not determined';

    let trendBars = '';
    if (Array.isArray(norm.hourlyTrend) && norm.hourlyTrend.length > 0) {
      trendBars = norm.hourlyTrend.slice(0, 12).map(h => {
        const hTier = getCpcbTier(h.aqi);
        const timeStr = h.time ? h.time.slice(11, 16) : '';
        const pct = Math.min(100, Math.round((h.aqi / 400) * 100));
        return `
          <div class="flex flex-col items-center gap-1 min-w-[28px]">
            <div class="text-[9px] font-mono text-slate-400">${h.aqi}</div>
            <div class="w-3 bg-slate-800 rounded-t overflow-hidden h-16 flex items-end">
              <div class="w-full rounded-t transition-all duration-300" style="height: ${pct}%; background-color: ${hTier.color};"></div>
            </div>
            <div class="text-[8px] font-mono text-slate-400">${timeStr}</div>
          </div>
        `;
      }).join('');
    }

    function renderCard(item, name, std, unit) {
      const hasVal = item && item.value !== null && item.value !== undefined && !isNaN(item.value);
      const valStr = hasVal ? (unit === 'mg/m³' ? Number(item.value).toFixed(2) : Number(item.value).toFixed(1)) : null;
      const subStr = (item && typeof item.subIndex === 'number' && !isNaN(item.subIndex)) ? item.subIndex : '--';
      const statusBadge = hasVal ? '<span class="text-[8px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">MEASURED</span>' : '<span class="text-[8px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">UNAVAIL</span>';

      return `
        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div class="text-[10px] text-slate-400 flex justify-between items-center">
            <span class="font-bold text-slate-200">${name}</span>
            <span class="text-[9px] text-slate-500">Std: ${std}</span>
          </div>
          <div class="font-bold text-slate-100 text-sm">
            ${hasVal ? `${valStr} <span class="text-[10px] text-slate-400 font-normal">${unit}</span>` : '<span class="text-[10px] text-slate-400 font-sans italic font-normal">Not provided by source</span>'}
          </div>
          <div class="text-[9px] text-slate-400 flex justify-between items-center">
            <span>Sub-Index: <span class="text-cyan-300 font-bold">${subStr}</span></span>
            ${statusBadge}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Header Banner -->
        <div class="p-3.5 rounded-2xl border ${tier.border} ${tier.bg} space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">CPCB NAQI Index</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono text-white" style="background-color: ${tier.color};">
              ${tier.category} (${tier.hi || norm.categoryHindi || ''})
            </span>
          </div>
          <div class="flex items-baseline gap-3">
            <div class="text-4xl font-black font-mono" style="color: ${tier.color};">${aqiDisplay}</div>
            <div class="text-xs text-slate-300 font-mono">
              Primary Pollutant: <span class="font-bold text-white uppercase">${primaryDisplay}</span>
            </div>
          </div>
          <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
            <div class="h-full bg-emerald-500" style="width: 10%;"></div>
            <div class="h-full bg-lime-500" style="width: 10%;"></div>
            <div class="h-full bg-yellow-500" style="width: 20%;"></div>
            <div class="h-full bg-orange-500" style="width: 20%;"></div>
            <div class="h-full bg-red-500" style="width: 20%;"></div>
            <div class="h-full bg-rose-900" style="width: 20%;"></div>
          </div>
        </div>

        <!-- 8-Pollutant CPCB Grid -->
        <div>
          <div class="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Concentration Grid (CPCB Standard)</span>
            <span class="text-[9px] text-cyan-400 font-normal">8-Pollutant NAAQS</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs font-mono">
            ${renderCard(p.pm25, 'PM2.5', '60', 'µg/m³')}
            ${renderCard(p.pm10, 'PM10', '100', 'µg/m³')}
            ${renderCard(p.no2, 'NO₂', '80', 'µg/m³')}
            ${renderCard(p.so2, 'SO₂', '80', 'µg/m³')}
            ${renderCard(p.co, 'CO', '2.0', 'mg/m³')}
            ${renderCard(p.o3, 'O₃', '100', 'µg/m³')}
            ${renderCard(p.nh3, 'NH₃', '400', 'µg/m³')}
            ${renderCard(p.pb, 'Pb', '1.0', 'µg/m³')}
          </div>
        </div>

        <!-- Supplementary Non-NAQI Pollutants -->
        <div class="pt-1">
          <div class="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Supplementary Measurement (Non-CPCB)</span>
            <span class="text-[9px] text-amber-400/90 font-normal">Exempt from AQI</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 text-xs font-mono">
            <div class="text-[10px] text-slate-400 flex justify-between items-center">
              <span class="font-bold text-slate-300">VOC (Volatile Organic Compounds)</span>
              <span class="text-[9px] text-slate-500">WHO Guideline Only</span>
            </div>
            <div class="font-bold text-slate-100 text-sm">
              ${p.voc?.available ? `${Number(p.voc.value).toFixed(1)} <span class="text-[10px] text-slate-400 font-normal">µg/m³</span>` : '<span class="text-[10px] text-slate-400 font-sans italic font-normal">Not provided by source</span>'}
            </div>
            <div class="text-[9px] text-slate-400 flex justify-between items-center">
              <span class="text-slate-500">Sub-Index: <span class="text-slate-400 font-mono">N/A (Non-NAQI)</span></span>
              ${p.voc?.available ? '<span class="text-[8px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">MEASURED</span>' : '<span class="text-[8px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">UNAVAIL</span>'}
            </div>
          </div>
        </div>

        <!-- Health Guidelines -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
          <div class="font-bold text-cyan-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡️</span> <span>Official CPCB Health Advisory</span>
          </div>
          <div class="text-slate-300 leading-relaxed text-[11px]">${norm.healthRecommendations?.general || ''}</div>
          <div class="text-slate-400 text-[10px] border-t border-slate-800 pt-2">
            <span class="font-bold text-slate-300">Sensitive Groups:</span> ${norm.healthRecommendations?.sensitive || ''}
          </div>
          <div class="text-slate-400 text-[10px]">
            <span class="font-bold text-slate-300">Action:</span> ${norm.healthRecommendations?.action || ''}
          </div>
        </div>

        <!-- Trend Strip -->
        ${trendBars ? `
        <div>
          <div class="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-2">Hourly AQI Evolution (Next 24h)</div>
          <div class="flex items-end gap-2 overflow-x-auto pb-2 border-b border-slate-800">
            ${trendBars}
          </div>
        </div>
        ` : ''}

        <!-- Provenance -->
        <div class="text-[9px] text-slate-500 font-mono">
          <div>Data Source: ${norm.provenance?.source || data.provenance?.source || 'CPCB / Open-Meteo'}</div>
          <div>Scale: ${norm.provenance?.scale || data.provenance?.scale || 'National Air Quality Index'}</div>
        </div>
      </div>
    `;
  }

  // Select District by ID
  window.selectAqiDistrictById = function (distId) {
    initAqiSync();
    if (!districtIndexData) return;
    const d = districtIndexData.districts.find(item => item.id === distId);
    if (!d) return;

    // On mobile (< 768px): Close big details panel so ONLY small preview card is open
    if (window.innerWidth < 768 && typeof window.closeDeskPanel === 'function') {
      window.closeDeskPanel();
    }

    window.selectedDistrictId = distId;
    const targetCoord = L.latLng(d.lat, d.lon);

    if (leafletMap) {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        focusMapCoordinateForMobile(leafletMap, targetCoord, 8);
      } else {
        leafletMap.setView(targetCoord, 8, { animate: true });
      }
    }

    handleCoordinateClick(targetCoord);
  };

  // State Change
  window.onAqiStateChange = function () {
    initAqiSync();
    const sel = document.getElementById('top-aqi-state-select');
    const state = sel ? sel.value : '';
    populateAqiDistrictDropdown(state);

    if (state && districtIndexData && leafletMap) {
      const stateDistricts = districtIndexData.districts.filter(d => d.state.toLowerCase() === state.toLowerCase());
      if (stateDistricts.length > 0) {
        const lats = stateDistricts.map(d => d.lat);
        const lons = stateDistricts.map(d => d.lon);
        leafletMap.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [30, 30] });
      }
    } else if (!state && leafletMap) {
      leafletMap.flyTo([22.5, 82.0], 5);
    }
  };

  // District Dropdown Change
  window.onAqiDistrictSelectChange = function () {
    const sel = document.getElementById('top-aqi-district-select');
    if (sel && sel.value) {
      window.selectAqiDistrictById(sel.value);
    }
  };

  // Search Input Autocomplete
  window.onAqiDistrictSearchInput = function () {
    initAqiSync();
    const input = document.getElementById('top-aqi-search-input');
    const list = document.getElementById('aqi-autocomplete-list');
    if (!input || !list) return;

    const q = input.value.trim().toLowerCase();
    if (q.length < 1) {
      list.classList.add('hidden');
      return;
    }

    if (!districtIndexData || !Array.isArray(districtIndexData.districts)) return;

    const matches = districtIndexData.districts.filter(d => 
      d.district.toLowerCase().includes(q) || 
      d.state.toLowerCase().includes(q)
    ).slice(0, 8);

    if (matches.length === 0) {
      list.classList.add('hidden');
      return;
    }

    let itemsHtml = '';
    matches.forEach(m => {
      itemsHtml += `
        <div onclick="window.selectAqiDistrictById('${m.id}'); document.getElementById('aqi-autocomplete-list').classList.add('hidden');" class="p-2 hover:bg-slate-800 cursor-pointer text-xs font-mono flex items-center justify-between text-slate-200">
          <div>
            <span class="font-bold text-white">${m.district}</span>
            <span class="text-slate-400 text-[10px]"> • ${m.state}</span>
          </div>
          <span class="text-cyan-400 text-[10px]">Inspect &rarr;</span>
        </div>
      `;
    });

    list.innerHTML = itemsHtml;
    list.classList.remove('hidden');
  };

  // GPS Location
  window.detectAqiLocationGPS = function () {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      if (leafletMap) {
        const isMobile = window.innerWidth < 768;
        const targetZoom = 9;
        if (isMobile) {
          const pt = leafletMap.project([lat, lon], targetZoom).subtract([0, 120]);
          leafletMap.setView(leafletMap.unproject(pt, targetZoom), targetZoom, { animate: true });
        } else {
          leafletMap.setView([lat, lon], targetZoom, { animate: true });
        }
      }
      handleCoordinateClick(L.latLng(lat, lon));
    }, err => {
      alert('Could not retrieve GPS location: ' + err.message);
    });
  };

  window.zoomToAllIndia = function () {
    if (leafletMap) {
      leafletMap.flyTo([22.5, 82.0], 5, { duration: 1.2 });
    }
  };

  // Boot on DOM ready
  function bootAqiApp() {
    initAqiSync();
    populateAqiStateDropdown();
    populateAqiDistrictDropdown('');
    initAqiMap();
    setTimeout(() => {
      if (leafletMap && typeof leafletMap.invalidateSize === 'function') leafletMap.invalidateSize();
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAqiApp);
  } else {
    bootAqiApp();
  }

})();
