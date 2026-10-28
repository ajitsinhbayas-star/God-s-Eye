import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sentinelPath = path.join(__dirname, 'public', 'sentinel.html');

if (!fs.existsSync(sentinelPath)) {
  console.error("❌ public/sentinel.html not found.");
  process.exit(1);
}

let html = fs.readFileSync(sentinelPath, 'utf8');
console.log("🔍 Polishing public/sentinel.html to remove murky vignette & blurry text shadows...");

// 1. Remove the old blurry bloom / heavy shadow overlay styles
html = html.replace(/<style id="hybrid-core-theme-sentinel">[\s\S]*?<\/style>/gi, '');

// 2. Inject clean, high-contrast, razor-sharp Cold War Vector Scope styles
const sharpTheme = `
  <style id="sharp-vector-sentinel-theme">
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');

    /* Crisp Bunker Dark Background — No Dark Vignette Covering Content */
    body {
      background-color: #030d07 !important;
      color: #00ff66 !important;
      font-family: 'JetBrains Mono', 'Courier New', monospace !important;
      font-variant-numeric: tabular-nums !important;
    }

    /* Subtle Scanlines strictly BEHIND content (z-index: -1) */
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background: linear-gradient(180deg, rgba(0, 255, 102, 0.02) 50%, rgba(0, 0, 0, 0.4) 50%),
                  radial-gradient(circle at center, rgba(0, 255, 102, 0.04) 0%, rgba(2, 10, 4, 0.8) 100%);
      background-size: 100% 4px, 100% 100%;
      pointer-events: none;
      z-index: -1 !important;
    }

    /* Zero Blurry Bloom on Text — 100% Sharp Contrast & Readability */
    h1, h2, h3, h4, span, p, div, td, th, label, strong, b {
      text-shadow: none !important;
      filter: none !important;
    }

    /* Left & Right Info Cards: Crisp, High-Contrast Glass Panels */
    .bg-slate-900,
    .bg-slate-900\\/80,
    .bg-slate-900\\/90,
    .bg-slate-950,
    .bg-slate-950\\/80,
    .bg-slate-950\\/90,
    .bg-slate-950\\/95,
    [class*="card"] {
      background: rgba(4, 18, 10, 0.92) !important;
      border: 1px solid rgba(0, 255, 102, 0.4) !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(0, 255, 102, 0.15) !important;
      backdrop-filter: blur(8px) !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Right Normalized Vectors List: Bright, Clear, High-Visibility Text */
    #right-vector-panel,
    .vector-list-container,
    .sat-vector-row,
    [id*="vector-list"] {
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Primary Headings & Labels in Info Panels */
    .text-cyan-300, .text-cyan-400, .text-emerald-300, .text-emerald-400 {
      color: #00ff66 !important;
      font-weight: 700 !important;
    }

    /* Secondary / Subtitle text: Bright Sage Green (Not Murky or Faded) */
    .text-slate-400, .text-slate-500, .text-gray-400, .text-gray-500 {
      color: #7ee7a6 !important;
      font-weight: 500 !important;
    }

    /* Main Values & Satellite Names: Pure High-Contrast Signal White */
    .text-white, .text-slate-100, .text-slate-200 {
      color: #ffffff !important;
      font-weight: 700 !important;
    }

    /* Header Nav & Command Bar */
    header, nav, .hud-glass {
      background: rgba(3, 14, 8, 0.95) !important;
      border-bottom: 1px solid rgba(0, 255, 102, 0.35) !important;
      box-shadow: 0 2px 15px rgba(0, 0, 0, 0.7) !important;
    }

    /* Active Nav Buttons */
    .nav-btn, .tab-btn {
      color: #00ff66 !important;
      border: 1px solid rgba(0, 255, 102, 0.35) !important;
      background: rgba(0, 255, 102, 0.08) !important;
    }
    .nav-btn:hover, .tab-btn:hover, .nav-btn.active, .tab-btn.active {
      background: rgba(0, 255, 102, 0.22) !important;
      border-color: #00ff66 !important;
      box-shadow: 0 0 10px rgba(0, 255, 102, 0.3) !important;
    }

    /* Critical Collision Alerts */
    .text-rose-400, .text-rose-500, .text-red-400, .border-rose-500 {
      color: #ff4444 !important;
      border-color: #ff4444 !important;
    }
  </style>
`;

html = html.replace('</head>', `${sharpTheme}\n</head>`);

// 3. Make sure any opacity styles on the right panel containers are set to 1
html = html.replace(/opacity:\s*0\.\d+/g, 'opacity: 1');

fs.writeFileSync(sentinelPath, html, 'utf8');
console.log("✔ public/sentinel.html updated: Murky shadow removed, crisp high-contrast green restored.");
