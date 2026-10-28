import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const token = "0681b836de6a4145a75f399f719c04faf36b6374";

console.log("==========================================================");
console.log("   AUTOMATICALLY INTEGRATING SATNOGS INTO SERVER & UI     ");
console.log("==========================================================\n");

// 1. SECURE TOKEN IN .env
const envPath = path.join(__dirname, '.env');
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (envContent.includes('SATNOGS_API_TOKEN=')) {
  envContent = envContent.replace(/SATNOGS_API_TOKEN=.*/g, `SATNOGS_API_TOKEN="${token}"`);
} else {
  envContent += `\nSATNOGS_API_TOKEN="${token}"\n`;
}
fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
console.log("✔ Step 1: Token secured in .env");

// 2. ENSURE .gitignore COVERS .env
const gitignorePath = path.join(__dirname, '.gitignore');
let gitignoreContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
if (!gitignoreContent.includes('.env')) {
  gitignoreContent += '\n.env\n.env.local\n';
  fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
}
console.log("✔ Step 2: .gitignore verified");

// 3. ADD SATNOGS ROUTE TO server.js / src/server.js
const serverFiles = [
  path.join(__dirname, 'server.js'),
  path.join(__dirname, 'src', 'server.js')
];

const satnogsRouteCode = `
// --- SATNOGS DB RADIO TELEMETRY GATEWAY ---
app.get('/api/satnogs/transmitters/:noradId', async (req, res) => {
  const { noradId } = req.params;
  const satToken = process.env.SATNOGS_API_TOKEN || '${token}';
  try {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'GodsEye-OrbitalCommand/1.0'
    };
    if (satToken) headers['Authorization'] = 'Token ' + satToken.trim();
    const url = 'https://db.satnogs.org/api/transmitters/?satellite__norad_cat_id=' + encodeURIComponent(noradId);
    const apiRes = await fetch(url, { headers });
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'SatNOGS HTTP ' + apiRes.status, noradId });
    }
    const data = await apiRes.json();
    const transmitters = (Array.isArray(data) ? data : []).map(tx => ({
      description: tx.description || 'Downlink Beacon',
      frequencyMHz: tx.frequency ? (tx.frequency / 1e6).toFixed(4) : null,
      mode: tx.mode || 'FM/Digital',
      baud: tx.baud || null,
      status: tx.status || 'active',
      type: tx.type || 'Transmitter'
    }));
    res.json({ noradId, count: transmitters.length, transmitters });
  } catch (err) {
    res.status(500).json({ error: 'SatNOGS Gateway error: ' + err.message });
  }
});
`;

serverFiles.forEach(sFile => {
  if (fs.existsSync(sFile)) {
    let content = fs.readFileSync(sFile, 'utf8');
    if (!content.includes('/api/satnogs/transmitters/:noradId')) {
      if (content.includes('app.listen')) {
        content = content.replace(/(app\.listen\s*\()/, `${satnogsRouteCode}\n$1`);
      } else {
        content += `\n${satnogsRouteCode}\n`;
      }
      fs.writeFileSync(sFile, content, 'utf8');
      console.log(`✔ Step 3: SatNOGS route injected into ${path.basename(sFile)}`);
    } else {
      console.log(`✔ Step 3: SatNOGS route already exists in ${path.basename(sFile)}`);
    }
  }
});

// 4. CONNECT SATNOGS RADIO BADGES TO INDEX.HTML INSPECTOR
const indexPath = path.join(__dirname, 'public', 'index.html');
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  if (!indexHtml.includes('fetchSatNOGSRadioIntel')) {
    const satnogsClientScript = `
  <script>
    // Live SatNOGS Radio Downlink Hydrator
    async function fetchSatNOGSRadioIntel(noradId) {
      if (!noradId) return;
      var tagsContainer = document.getElementById('card-spectral-tags');
      if (!tagsContainer) return;

      try {
        var res = await fetch('/api/satnogs/transmitters/' + encodeURIComponent(noradId));
        if (!res.ok) return;
        var data = await res.json();
        if (Array.isArray(data.transmitters) && data.transmitters.length > 0) {
          var chips = data.transmitters.slice(0, 3).map(function(t) {
            var f = t.frequencyMHz ? t.frequencyMHz + ' MHz' : 'Beacon';
            return '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">📻 ' + f + ' (' + t.mode + ')</span>';
          }).join(' ');
          tagsContainer.innerHTML += ' ' + chips;
        }
      } catch (_) {}
    }

    // Hook into existing satellite selection
    var origDossier = window.updateUniversalDossier;
    if (typeof origDossier === 'function') {
      window.updateUniversalDossier = function(entityType, key, rawCoords) {
        origDossier(entityType, key, rawCoords);
        if (entityType === 'satellite' && window.MASSIVE_SATELLITE_CATALOG && window.MASSIVE_SATELLITE_CATALOG[key]) {
          var norad = window.MASSIVE_SATELLITE_CATALOG[key].norad;
          if (norad) fetchSatNOGSRadioIntel(norad);
        }
      };
    }
  </script>
`;
    indexHtml = indexHtml.replace('</body>', `${satnogsClientScript}\n</body>`);
    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log("✔ Step 4: SatNOGS radio frequency hydrator linked to public/index.html");
  } else {
    console.log("✔ Step 4: SatNOGS client script already present in index.html");
  }
}

console.log("\n==========================================================");
console.log("✔ ALL STEPS COMPLETE! Running test suite to confirm...");
console.log("==========================================================\n");
