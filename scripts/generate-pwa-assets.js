import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const PUBLIC_DIR = path.resolve('public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generatePng(w, h, renderFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const raw = Buffer.alloc(h * (w * 4 + 1));
  let pos = 0;
  for (let y = 0; y < h; y++) {
    raw[pos++] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = renderFn(x, y, w, h);
      raw[pos++] = r;
      raw[pos++] = g;
      raw[pos++] = b;
      raw[pos++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Icon rendering mathematics: Earth globe + neon cyan orbital ring + satellite beacon
function renderSpaceIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  const rGlobe = w * 0.28;

  // Background deep cosmic gradient
  const bgDist = dist / (w * 0.7);
  let r = 5, g = 8, b = 17, a = 255;

  if (!isMaskable) {
    // Soft vignette/corner transparency for non-maskable if outside rounded rect
    const cornerR = w * 0.22;
    const ax = Math.abs(dx) - (w / 2 - cornerR);
    const ay = Math.abs(dy) - (h / 2 - cornerR);
    if (ax > 0 && ay > 0 && Math.hypot(ax, ay) > cornerR) {
      return [0, 0, 0, 0];
    }
  }

  // Nebula ambient glow
  if (bgDist < 1.0) {
    const glow = (1 - bgDist) * 35;
    b += glow * 1.5;
    g += glow * 0.6;
  }

  // Elliptical orbital ring calculation
  const cosA = Math.cos(Math.PI / 6);
  const sinA = Math.sin(Math.PI / 6);
  const rx = dx * cosA - dy * sinA;
  const ry = (dx * sinA + dy * cosA) * 2.6; // tilted ellipse
  const orbitDist = Math.abs(Math.hypot(rx, ry) - w * 0.42);

  if (orbitDist < w * 0.025) {
    const ringIntensity = 1 - (orbitDist / (w * 0.025));
    // Bright cyan/emerald neon ring
    r = Math.min(255, r + 0 * ringIntensity);
    g = Math.min(255, g + 255 * ringIntensity);
    b = Math.min(255, b + 230 * ringIntensity);
  }

  // Earth globe sphere
  if (dist < rGlobe) {
    const sphereZ = Math.sqrt(rGlobe * rGlobe - dist * dist);
    const normX = dx / rGlobe;
    const normY = dy / rGlobe;
    const normZ = sphereZ / rGlobe;

    // Sun light vector from top-left [-0.5, -0.6, 0.6]
    const dot = Math.max(0, -normX * 0.5 - normY * 0.6 + normZ * 0.62);
    
    // Earth blue ocean base
    let er = 10 * dot;
    let eg = (50 + 40 * dot);
    let eb = (120 + 130 * dot);

    // Continent / green land patches using deterministic noise
    const landPattern = Math.sin(normX * 5.2 + 0.4) * Math.cos(normY * 4.8 + 0.2) + Math.sin(normX * 9.1 - normY * 7.3) * 0.4;
    if (landPattern > 0.1) {
      er = 20 * dot;
      eg = (90 + 120 * dot);
      eb = (50 + 60 * dot);
    }

    // Atmospheric limb glow
    const limb = Math.pow(dist / rGlobe, 3.5);
    er = er * (1 - limb) + 30 * limb;
    eg = eg * (1 - limb) + 180 * limb;
    eb = eb * (1 - limb) + 255 * limb;

    r = Math.round(er);
    g = Math.round(eg);
    b = Math.round(eb);
  } else if (dist < rGlobe + w * 0.035) {
    // Outer atmospheric halo
    const haloIntensity = 1 - ((dist - rGlobe) / (w * 0.035));
    r = Math.min(255, Math.round(r + 10 * haloIntensity));
    g = Math.min(255, Math.round(g + 160 * haloIntensity));
    b = Math.min(255, Math.round(b + 255 * haloIntensity));
  }

  // Satellite beacon on the orbit
  const satX = cx + w * 0.32;
  const satY = cy - h * 0.18;
  const satDist = Math.hypot(x - satX, y - satY);
  if (satDist < w * 0.03) {
    // Golden-cyan core
    r = 255;
    g = 230;
    b = 100;
  } else if (satDist < w * 0.07) {
    const pulse = 1 - (satDist / (w * 0.07));
    r = Math.min(255, r + 240 * pulse);
    g = Math.min(255, g + 200 * pulse);
    b = Math.min(255, b + 50 * pulse);
  }

  return [Math.round(r), Math.round(g), Math.round(b), a];
}

// Generate PNGs
console.log('[Assets] Generating PWA icons...');
const png192 = generatePng(192, 192, (x, y, w, h) => renderSpaceIcon(x, y, w, h, false));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.png'), png192);

const png512 = generatePng(512, 512, (x, y, w, h) => renderSpaceIcon(x, y, w, h, false));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.png'), png512);

const maskable192 = generatePng(192, 192, (x, y, w, h) => renderSpaceIcon(x, y, w, h, true));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-192.png'), maskable192);

const maskable512 = generatePng(512, 512, (x, y, w, h) => renderSpaceIcon(x, y, w, h, true));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-512.png'), maskable512);

// Generate crisp 32x32 for favicon.ico
const png32 = generatePng(32, 32, (x, y, w, h) => renderSpaceIcon(x, y, w, h, false));

// Wrap 32x32 PNG inside standard ICO container format
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 Image

const icoDir = Buffer.alloc(16);
icoDir.writeUInt8(32, 0); // width
icoDir.writeUInt8(32, 1); // height
icoDir.writeUInt8(0, 2);  // color palette (0 = no palette)
icoDir.writeUInt8(0, 3);  // reserved
icoDir.writeUInt16LE(1, 4);  // color planes
icoDir.writeUInt16LE(32, 6); // bpp
icoDir.writeUInt32LE(png32.length, 8); // size
icoDir.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

const icoFile = Buffer.concat([icoHeader, icoDir, png32]);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoFile);

// Scalable vector SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="spaceBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#081426"/>
      <stop offset="100%" stop-color="#020612"/>
    </radialGradient>
    <radialGradient id="earthGlobe" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="45%" stop-color="#0284c7"/>
      <stop offset="85%" stop-color="#0f172a"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#spaceBg)"/>
  <!-- Atmosphere Outer Ring -->
  <circle cx="256" cy="256" r="148" fill="none" stroke="#00f0ff" stroke-width="4" stroke-opacity="0.35" filter="url(#glow)"/>
  <!-- Earth Globe -->
  <circle cx="256" cy="256" r="140" fill="url(#earthGlobe)"/>
  <!-- Continents hint -->
  <path d="M 210,180 Q 240,160 270,180 T 290,220 Q 260,250 230,220 Z" fill="#10b981" fill-opacity="0.45"/>
  <path d="M 230,260 Q 270,270 280,310 T 250,340 Q 220,320 220,280 Z" fill="#10b981" fill-opacity="0.4"/>
  <!-- Orbital Trajectory Ellipse -->
  <ellipse cx="256" cy="256" rx="215" ry="85" transform="rotate(-30 256 256)" fill="none" stroke="#00ffcc" stroke-width="5" stroke-dasharray="16 8" filter="url(#glow)"/>
  <!-- Satellite Node -->
  <g transform="translate(380, 155)">
    <circle cx="0" cy="0" r="14" fill="#fbbf24" filter="url(#glow)"/>
    <circle cx="0" cy="0" r="6" fill="#ffffff"/>
    <line x1="-24" y1="0" x2="-14" y2="0" stroke="#38bdf8" stroke-width="4"/>
    <line x1="14" y1="0" x2="24" y2="0" stroke="#38bdf8" stroke-width="4"/>
    <rect x="-28" y="-7" width="5" height="14" fill="#0284c7" rx="1"/>
    <rect x="23" y="-7" width="5" height="14" fill="#0284c7" rx="1"/>
  </g>
</svg>`;
fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), svgIcon, 'utf-8');

console.log('[Assets] PWA icons and favicon generated successfully.');
