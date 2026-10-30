/**
 * ORBITAL EYE — AIR QUALITY POLLUTANT CARDS & LIVE DATA MAPPING TEST SUITE
 * Validates:
 * 1. Both naming conventions (backend vs frontend) map correctly
 * 2. Complete 8-pollutant CPCB NAQI calculation & breakpoints
 * 3. Zero-value handling (0 is valid, not null or '--')
 * 4. Missing value handling (no fabrication of NH3, Pb, or VOC)
 * 5. VOC supplementary status (never included in CPCB AQI calculation)
 * 6. Dominant pollutant identification (only from valid measurements)
 * 7. Invalid value rejection (negative, non-finite, NaN)
 * 8. Server /api/airquality/station and fallback normalized structure parity
 */
import assert from 'assert';
import {
  calculateSubIndex,
  computeCpcbAqi,
  getCpcbCategory,
  normalizePollutants,
  CPCB_BREAKPOINTS,
  CPCB_STANDARDS
} from '../src/adapters/cpcb-naqi-adapter.js';

console.log('===============================================================');
console.log('ORBITAL EYE — AIR QUALITY POLLUTANT CARDS & PIPELINE TEST SUITE');
console.log('===============================================================\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`[PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${err.message}`);
    failed++;
  }
}

// TEST 1: Naming Convention Parity
test('Both naming conventions map to the same normalized structure', () => {
  const backendNaming = {
    pm2_5: 45.2,
    pm10: 88.0,
    nitrogen_dioxide: 52.1,
    sulphur_dioxide: 18.4,
    carbon_monoxide: 1.2,
    ozone: 35.0,
    ammonia: 120.0,
    lead: 0.4
  };

  const frontendNaming = {
    pm25: 45.2,
    pm10: 88.0,
    no2: 52.1,
    so2: 18.4,
    co: 1.2,
    o3: 35.0,
    nh3: 120.0,
    pb: 0.4
  };

  const norm1 = normalizePollutants(backendNaming);
  const norm2 = normalizePollutants(frontendNaming);

  // Check both access styles work on norm1
  assert.strictEqual(norm1.pm2_5.value, 45.2);
  assert.strictEqual(norm1.pm25.value, 45.2);
  assert.strictEqual(norm1.nitrogen_dioxide.value, 52.1);
  assert.strictEqual(norm1.no2.value, 52.1);
  assert.strictEqual(norm1.carbon_monoxide.value, 1.2);
  assert.strictEqual(norm1.co.value, 1.2);
  assert.strictEqual(norm1.ammonia.value, 120.0);
  assert.strictEqual(norm1.nh3.value, 120.0);

  // Check equality between backend and frontend inputs
  assert.deepStrictEqual(norm1.pm25, norm2.pm25);
  assert.deepStrictEqual(norm1.no2, norm2.no2);
  assert.deepStrictEqual(norm1.co, norm2.co);
  assert.deepStrictEqual(norm1.nh3, norm2.nh3);
  assert.deepStrictEqual(norm1.pb, norm2.pb);
});

// TEST 2: All 8 CPCB Pollutants Breakpoints & Calculation
test('All 8 CPCB pollutants calculate valid sub-indices per official standard', () => {
  // 1. PM2.5 (0-30 -> 0-50, 31-60 -> 51-100, 61-90 -> 101-200)
  assert.strictEqual(calculateSubIndex('pm2_5', 15), 25);
  assert.strictEqual(calculateSubIndex('pm25', 45), 75);

  // 2. PM10 (0-50 -> 0-50, 51-100 -> 51-100)
  assert.strictEqual(calculateSubIndex('pm10', 50), 50);
  assert.strictEqual(calculateSubIndex('pm10', 75), 75);

  // 3. NO2 (0-40 -> 0-50, 41-80 -> 51-100)
  assert.strictEqual(calculateSubIndex('no2', 20), 25);
  assert.strictEqual(calculateSubIndex('nitrogen_dioxide', 60), 75);

  // 4. SO2 (0-40 -> 0-50, 41-80 -> 51-100)
  assert.strictEqual(calculateSubIndex('so2', 20), 25);
  assert.strictEqual(calculateSubIndex('sulphur_dioxide', 60), 75);

  // 5. CO (0-1 -> 0-50, 1.1-2 -> 51-100, in mg/m3)
  assert.strictEqual(calculateSubIndex('co', 0.5), 25);
  assert.strictEqual(calculateSubIndex('carbon_monoxide', 1.55), 76);

  // 6. O3 (0-50 -> 0-50, 51-100 -> 51-100)
  assert.strictEqual(calculateSubIndex('o3', 25), 25);
  assert.strictEqual(calculateSubIndex('ozone', 75), 75);

  // 7. NH3 (0-200 -> 0-50, 201-400 -> 51-100)
  assert.strictEqual(calculateSubIndex('nh3', 100), 25);
  assert.strictEqual(calculateSubIndex('ammonia', 300), 75);

  // 8. Pb (0-0.5 -> 0-50, 0.6-1.0 -> 51-100)
  assert.strictEqual(calculateSubIndex('pb', 0.25), 25);
  assert.strictEqual(calculateSubIndex('lead', 0.8), 76);
});

// TEST 3: Zero-value Handling
test('Zero measurements display as 0 and calculate valid zero sub-indices (not null or --)', () => {
  assert.strictEqual(calculateSubIndex('pm25', 0), 0);
  assert.strictEqual(calculateSubIndex('co', 0), 0);
  assert.strictEqual(calculateSubIndex('no2', 0), 0);

  const norm = normalizePollutants({
    pm2_5: 0,
    carbon_monoxide: 0,
    pm10: 0
  });

  assert.strictEqual(norm.pm25.value, 0);
  assert.strictEqual(norm.pm25.available, true);
  assert.strictEqual(norm.pm25.subIndex, 0);

  assert.strictEqual(norm.co.value, 0);
  assert.strictEqual(norm.co.available, true);
  assert.strictEqual(norm.co.subIndex, 0);

  const aqiObj = computeCpcbAqi({ pm2_5: 0, pm10: 0 });
  assert.strictEqual(aqiObj.aqi, 0);
  assert.strictEqual(aqiObj.categoryInfo.category, 'Good');
});

// TEST 4: Missing and Unprovided Pollutants (No Fabrication)
test('Missing pollutants (NH3, Pb) are not fabricated and return null value with status not_provided', () => {
  const partial = {
    pm2_5: 55,
    pm10: 95
  };

  const norm = normalizePollutants(partial);

  assert.strictEqual(norm.pm25.value, 55);
  assert.strictEqual(norm.pm25.available, true);

  assert.strictEqual(norm.nh3.value, null);
  assert.strictEqual(norm.nh3.available, false);
  assert.strictEqual(norm.nh3.subIndex, null);
  assert.strictEqual(norm.nh3.status, 'not_provided');

  assert.strictEqual(norm.pb.value, null);
  assert.strictEqual(norm.pb.available, false);
  assert.strictEqual(norm.pb.subIndex, null);
  assert.strictEqual(norm.pb.status, 'not_provided');
});

// TEST 5: VOC Supplementary Status
test('VOC is treated as supplementary and never included in CPCB NAQI calculation', () => {
  const withVoc = {
    pm2_5: 30, // sub-index 50
    voc: 450.0  // Very high VOC reading
  };

  const computed = computeCpcbAqi(withVoc);
  assert.strictEqual(computed.aqi, 50);
  assert.strictEqual(computed.dominantPollutantKey, 'pm2_5');

  const norm = normalizePollutants(withVoc);
  assert.strictEqual(norm.voc.value, 450.0);
  assert.strictEqual(norm.voc.isSupplementary, true);
  assert.strictEqual(norm.voc.cpcbIncluded, false);
  assert.strictEqual(norm.voc.subIndex, null);
});

// TEST 6: Dominant Pollutant Identification
test('Dominant pollutant reflects the actual maximum sub-index and does not default to PM2.5 when absent', () => {
  // Case A: PM10 is highest
  const pm10Dominant = computeCpcbAqi({
    pm2_5: 10,   // sub-index ~17
    pm10: 200,   // sub-index ~167
    nitrogen_dioxide: 20 // sub-index ~25
  });
  assert.strictEqual(pm10Dominant.dominantPollutantKey, 'pm10');
  assert.strictEqual(pm10Dominant.primaryPollutant, 'PM10');

  // Case B: NO2 is highest
  const no2Dominant = computeCpcbAqi({
    pm2_5: 10,
    nitrogen_dioxide: 250 // sub-index ~270
  });
  assert.strictEqual(no2Dominant.dominantPollutantKey, 'nitrogen_dioxide');
  assert.strictEqual(no2Dominant.primaryPollutant, 'NO₂');

  // Case C: Empty measurements -> primaryPollutant is 'Not determined', not PM2.5
  const empty = computeCpcbAqi({});
  assert.strictEqual(empty.aqi, null);
  assert.strictEqual(empty.dominantPollutantKey, null);
  assert.strictEqual(empty.primaryPollutant, 'Not determined');
});

// TEST 7: Invalid Value Rejection
test('Rejects invalid, negative, non-finite, and string measurements without crashing', () => {
  assert.strictEqual(calculateSubIndex('pm25', -10), null);
  assert.strictEqual(calculateSubIndex('pm25', NaN), null);
  assert.strictEqual(calculateSubIndex('pm25', Infinity), null);
  assert.strictEqual(calculateSubIndex('pm25', 'invalid'), null);
  assert.strictEqual(calculateSubIndex('pm25', undefined), null);
  assert.strictEqual(calculateSubIndex('pm25', null), null);

  const corrupted = computeCpcbAqi({
    pm2_5: -50,
    pm10: 'not-a-number',
    nitrogen_dioxide: null,
    carbon_monoxide: undefined
  });

  assert.strictEqual(corrupted.aqi, null);
  assert.strictEqual(corrupted.primaryPollutant, 'Not determined');
});

// TEST 8: Live /api/airquality/station Endpoint Structure Parity
test('Server endpoint /api/airquality/station returns normalized 8-pollutant structure with VOC and primaryPollutant', async () => {
  const res = await fetch('http://localhost:3000/api/airquality/station?lat=28.6508&lon=77.3152');
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.ok, true);
  assert.strictEqual(typeof data.aqi, 'number');
  assert(data.dominantPollutant, 'Dominant pollutant string present');
  assert(data.primaryPollutant, 'Primary pollutant code present');
  assert(data.pollutants, 'Pollutants object present');

  // Verify all 8 CPCB pollutants exist
  const expectedPollutants = ['pm2_5', 'pm10', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide', 'ozone', 'ammonia', 'lead'];
  for (const p of expectedPollutants) {
    assert(data.pollutants[p], `Pollutant ${p} exists in response`);
    assert('value' in data.pollutants[p], `${p} has value property`);
    assert('subIndex' in data.pollutants[p], `${p} has subIndex property`);
    assert('nationalStandard' in data.pollutants[p], `${p} has nationalStandard`);
  }

  // Verify VOC exists and is non-CPCB
  assert(data.pollutants.voc, 'VOC object exists in response');
  assert.strictEqual(data.pollutants.voc.cpcbIncluded, false, 'VOC is marked non-CPCB');
  assert.strictEqual(data.pollutants.voc.subIndex, null, 'VOC has no CPCB sub-index');

  // Verify frontend aliases exist
  assert(data.pollutants.pm25, 'Alias pm25 exists');
  assert(data.pollutants.no2, 'Alias no2 exists');
  assert(data.pollutants.so2, 'Alias so2 exists');
  assert(data.pollutants.co, 'Alias co exists');
  assert(data.pollutants.o3, 'Alias o3 exists');
  assert(data.pollutants.nh3, 'Alias nh3 exists');
  assert(data.pollutants.pb, 'Alias pb exists');

  // Verify CO unit is mg/m³
  assert.strictEqual(data.pollutants.carbon_monoxide.unit, 'mg/m³');

  // Verify health recommendations structure
  assert(data.healthRecommendations, 'Health recommendations present');
  assert(typeof data.healthRecommendations.general === 'string');
});

console.log('\n===============================================================');
console.log(`TOTAL PIPELINE TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('===============================================================');

if (failed > 0) {
  process.exit(1);
}
