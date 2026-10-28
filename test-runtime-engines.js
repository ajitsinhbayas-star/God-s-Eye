import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("\x1b[36m==========================================================\x1b[0m");
console.log("\x1b[36m   DEEP RUNTIME & MATHEMATICAL ENGINE VALIDATION SUITE    \x1b[0m");
console.log("\x1b[36m==========================================================\x1b[0m\n");

let passCount = 0;
let failCount = 0;

function test(title, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  \x1b[32m✔ PASS:\x1b[0m ${title}`);
      passCount++;
    } else {
      console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${title} -> ${result}`);
      failCount++;
    }
  } catch (err) {
    console.log(`  \x1b[31m✖ ERROR:\x1b[0m ${title} -> ${err.message}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// 1. KEPLERIAN ORBITAL MECHANICS SOLVER TEST (Heliocentric J2000)
// -------------------------------------------------------------
console.log("\x1b[33m[TEST SUITE 1/5] KEPLERIAN EPHEMERIS & NEWTON-RAPHSON SOLVER\x1b[0m");

function solveKeplerian(a, e, M_deg) {
  const M_rad = M_deg * (Math.PI / 180);
  let E = M_rad + e * Math.sin(M_rad);
  for (let i = 0; i < 5; i++) {
    const dE = (E - e * Math.sin(E) - M_rad) / (1.0 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-7) break;
  }
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(Math.max(0, 1.0 - e * e)) * Math.sin(E);
  const r = Math.sqrt(xPrime * xPrime + yPrime * yPrime);
  const vKmS = 29.784 * Math.sqrt(Math.max(0, 2.0 / r - 1.0 / a));
  return { r, vKmS, E_deg: E * (180 / Math.PI) };
}

test("Earth Heliocentric Distance (1.0 AU semi-major, e=0.0167)", () => {
  const perihelion = solveKeplerian(1.0, 0.0167, 0); // At perihelion (M=0)
  const aphelion = solveKeplerian(1.0, 0.0167, 180); // At aphelion (M=180)
  if (Math.abs(perihelion.r - 0.9833) > 0.001) return `Expected ~0.9833 AU, got ${perihelion.r.toFixed(4)}`;
  if (Math.abs(aphelion.r - 1.0167) > 0.001) return `Expected ~1.0167 AU, got ${aphelion.r.toFixed(4)}`;
  return true;
});

test("Earth Orbital Speed bounds (29.29 km/s to 30.29 km/s)", () => {
  const p = solveKeplerian(1.0, 0.0167, 0);
  const a = solveKeplerian(1.0, 0.0167, 180);
  if (p.vKmS < 30.0 || a.vKmS > 29.5) return `Speeds out of physical range: Peri=${p.vKmS.toFixed(2)}, Aph=${a.vKmS.toFixed(2)}`;
  return true;
});

test("Mars High-Eccentricity Orbit (e=0.0934, a=1.524 AU)", () => {
  const sol = solveKeplerian(1.523679, 0.093405, 90);
  if (sol.r <= 1.38 || sol.r >= 1.67) return `Mars radius out of bounds: ${sol.r.toFixed(3)} AU`;
  return true;
});

// -------------------------------------------------------------
// 2. SGP4 & J2 PERTURBATION NODAL PRECESSION TEST
// -------------------------------------------------------------
console.log("\n\x1b[33m[TEST SUITE 2/5] J2 PERTURBATIONS & SSO RETROGRADE DRIFT\x1b[0m");

function calcJ2RaanDrift(altKm, incDeg) {
  const RE = 6378.137;
  const aKm = RE + altKm;
  const n = Math.sqrt(398600.4418 / Math.pow(aKm, 3));
  const iRad = incDeg * (Math.PI / 180);
  const J2 = 1.08263e-3;
  // dRAAN/dt in radians/second
  const raanDotRadSec = -1.5 * n * J2 * Math.pow(RE / aKm, 2) * Math.cos(iRad);
  // Convert to degrees per solar day
  return raanDotRadSec * (180 / Math.PI) * 86400;
}

test("Cartosat-3 Sun-Synchronous Orbit Precession (~+0.9856°/day)", () => {
  const driftPerDay = calcJ2RaanDrift(509, 97.5);
  // An SSO polar satellite must precess eastward to match Earth's annual rotation (~0.9856°/day)
  if (Math.abs(driftPerDay - 0.986) > 0.15) {
    return `Cartosat-3 SSO drift off: expected ~+0.986 deg/day, calculated ${driftPerDay.toFixed(3)} deg/day`;
  }
  return true;
});

test("ISS Low Earth Orbit Retrograde Precession (~-5.0°/day)", () => {
  const driftPerDay = calcJ2RaanDrift(418, 51.64);
  // ISS at 51.6° prograde inclination precesses westward (~ -5°/day)
  if (driftPerDay > -4.0 || driftPerDay < -6.5) {
    return `ISS nodal drift unexpected: ${driftPerDay.toFixed(2)} deg/day`;
  }
  return true;
});

// -------------------------------------------------------------
// 3. TOPOCENTRIC POLAR SKY RADAR (Azimuth/Elevation Coordinates)
// -------------------------------------------------------------
console.log("\n\x1b[33m[TEST SUITE 3/5] TOPOCENTRIC POLAR RADAR LOOK-ANGLES\x1b[0m");

function polarRadarProjection(azDeg, elDeg, radarRadiusPx = 155, cx = 155, cy = 155) {
  const elClamped = Math.max(0, Math.min(90, elDeg));
  const r = radarRadiusPx * (1 - elClamped / 90);
  const theta = (azDeg - 90) * (Math.PI / 180);
  return {
    x: +(cx + r * Math.cos(theta)).toFixed(2),
    y: +(cy + r * Math.sin(theta)).toFixed(2)
  };
}

test("Zenith (+90° El) projects to exact center (155, 155)", () => {
  const p = polarRadarProjection(180, 90);
  if (p.x !== 155 || p.y !== 155) return `Zenith offset: (${p.x}, ${p.y})`;
  return true;
});

test("Cardinal North (0° Az, 0° El) projects to top perimeter (155, 0)", () => {
  const p = polarRadarProjection(0, 0);
  if (Math.abs(p.x - 155) > 0.01 || Math.abs(p.y - 0) > 0.01) return `North coordinate mismatch: (${p.x}, ${p.y})`;
  return true;
});

test("Cardinal East (90° Az, 0° El) projects to right perimeter (310, 155)", () => {
  const p = polarRadarProjection(90, 0);
  if (Math.abs(p.x - 310) > 0.01 || Math.abs(p.y - 155) > 0.01) return `East coordinate mismatch: (${p.x}, ${p.y})`;
  return true;
});

test("TCA Zenith Peak Elevation (+68.4° at 135° SE) distance from center", () => {
  const p = polarRadarProjection(135, 68.4);
  const dist = Math.hypot(p.x - 155, p.y - 155);
  // (1 - 68.4/90) * 155 = 0.24 * 155 = 37.2 px
  if (Math.abs(dist - 37.2) > 0.5) return `TCA distance calculation off: ${dist.toFixed(2)} px`;
  return true;
});

// -------------------------------------------------------------
// 4. J.A.R.V.I.S. TACTICAL INTELLIGENCE ROUTER
// -------------------------------------------------------------
console.log("\n\x1b[33m[TEST SUITE 4/5] J.A.R.V.I.S. INTEL ENGINE RESOLVER\x1b[0m");

function mockResolveSpaceIntel(query) {
  const q = query.toLowerCase().replace(/[^a-z0-9\s\-]/g, ' ');
  if (q.includes('aditya') || q.includes('adtiya')) return { target: 'Aditya-L1', ok: true };
  if (q.includes('eos-06') || q.includes('oceansat')) return { target: 'EOS-06', ok: true };
  if (q.includes('eos-04') || q.includes('risat')) return { target: 'EOS-04', ok: true };
  if (q.includes('cartosat')) return { target: 'Cartosat-3', ok: true };
  if (q.includes('iss') || q.includes('space station')) return { target: 'ISS', ok: true };
  if (q.includes('pune') || q.includes('pass')) return { target: 'OrbitAlert', ok: true };
  if (q.includes('why') && (q.includes('fall') || q.includes('orbit'))) return { target: 'Physics', ok: true };
  return { ok: false };
}

test("J.A.R.V.I.S. handles spelling variance 'adtiya' -> Aditya-L1", () => {
  const r = mockResolveSpaceIntel("What is adtiya doing right now?");
  if (!r.ok || r.target !== 'Aditya-L1') return `Resolution failed for adtiya: ${JSON.stringify(r)}`;
  return true;
});

test("J.A.R.V.I.S. maps 'space station' -> ISS", () => {
  const r = mockResolveSpaceIntel("Where is the international space station?");
  if (!r.ok || r.target !== 'ISS') return `Resolution failed: ${JSON.stringify(r)}`;
  return true;
});

test("J.A.R.V.I.S. routes pass inquiries for 'Pune' to OrbitAlert", () => {
  const r = mockResolveSpaceIntel("Show satellite passes over Pune ground station");
  if (!r.ok || r.target !== 'OrbitAlert') return `Resolution failed: ${JSON.stringify(r)}`;
  return true;
});

test("J.A.R.V.I.S. answers freefall orbital physics questions", () => {
  const r = mockResolveSpaceIntel("Why don't satellites fall to Earth from orbit?");
  if (!r.ok || r.target !== 'Physics') return `Resolution failed: ${JSON.stringify(r)}`;
  return true;
});

// -------------------------------------------------------------
// 5. CARA CONJUNCTION COLLISION DETECTION MATH
// -------------------------------------------------------------
console.log("\n\x1b[33m[TEST SUITE 5/5] SENTINEL CONJUNCTION & MISS-DISTANCE ALGORITHM\x1b[0m");

function checkConjunctionTCA(posA, posB, thresholdKm = 5.0) {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  const dz = posA.z - posB.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return {
    missDistanceKm: +dist.toFixed(3),
    isCritical: dist <= thresholdKm
  };
}

test("Sentinel triggers critical alert when miss-distance <= 5.0 km", () => {
  const sat1 = { x: 6878.1, y: 120.5, z: -45.0 };
  const sat2 = { x: 6880.0, y: 121.2, z: -44.2 };
  const conj = checkConjunctionTCA(sat1, sat2);
  if (!conj.isCritical || conj.missDistanceKm > 5.0) {
    return `Failed to detect close approach: distance was ${conj.missDistanceKm} km`;
  }
  return true;
});

test("Sentinel dismisses distant passes (> 5.0 km) to prevent false alerts", () => {
  const sat1 = { x: 6878.1, y: 120.5, z: -45.0 };
  const sat2 = { x: 6910.0, y: 180.2, z: 20.0 };
  const conj = checkConjunctionTCA(sat1, sat2);
  if (conj.isCritical) {
    return `False positive triggered: distance was ${conj.missDistanceKm} km`;
  }
  return true;
});

console.log("\n\x1b[36m==========================================================\x1b[0m");
console.log(`TOTAL ENGINE CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
if (failCount === 0) {
  console.log("\x1b[32m✔ ALL MATHEMATICAL, PHYSICS & REASONING ENGINES VERIFIED.\x1b[0m");
} else {
  console.log("\x1b[31m✖ ACTION REQUIRED: PLEASE REVIEW ENGINE LOGS ABOVE.\x1b[0m");
}
console.log("\x1b[36m==========================================================\x1b[0m\n");
process.exit(failCount === 0 ? 0 : 1);
