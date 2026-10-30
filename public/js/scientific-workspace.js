/**
 * GOD'S EYE ?" SCIENTIFIC RESEARCH & ORBITAL ANALYSIS WORKSPACE
 * Version: 5.0.0 (Update 5 Scientific Workspace)
 * 
 * Provides interactive client-side research tools:
 * - Comprehensive Object Scientific Workspace
 * - Side-by-side Multi-Object Comparison Tool
 * - Interactive Mission Explorer
 * - Ground Track & Pass Elevation Profiles
 * - Scientific Data Export & Reproducible Records
 */

class ScientificWorkspace {
  constructor() {
    this.currentObjectId = null;
    this.comparisonIds = ['iss', 'tiangong'];
    this.initModals();
  }

  initModals() {
    if (typeof document === 'undefined') return;

    // 1. Object Scientific Analysis Workspace Modal
    if (!document.getElementById('scientific-analysis-modal')) {
      const modal = document.createElement('div');
      modal.id = 'scientific-analysis-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md hidden transition-opacity';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'sci-workspace-title');
      modal.innerHTML = `
        <div class="relative w-full max-w-5xl max-h-[92vh] bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono text-slate-200">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-cyan-500/30 bg-slate-900/80">
            <div class="flex items-center gap-3">
              <span class="text-2xl text-cyan-400">🔬</span>
              <div>
                <h2 id="sci-workspace-title" class="text-sm sm:text-base font-bold text-white tracking-wider uppercase">SCIENTIFIC ANALYSIS WORKSPACE</h2>
                <p id="sci-workspace-subtitle" class="text-[10px] text-cyan-400 font-sans">High-Precision Astrodynamics & Provenance Review</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="window.scientificWorkspace.openComparisonWithCurrent()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer">
                <span>⇄ Compare</span>
              </button>
              <button onclick="window.scientificWorkspace.exportCurrentObjectJson()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer">
                <span>⤓ Export JSON</span>
              </button>
              <button onclick="window.scientificWorkspace.closeAnalysis()" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition" aria-label="Close Analysis Workspace">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
          </div>

          <!-- Tab Bar -->
          <div class="flex border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider overflow-x-auto">
            <button onclick="window.scientificWorkspace.switchTab('overview')" id="sci-tab-overview" class="px-4 py-2.5 border-b-2 border-cyan-400 text-cyan-300 bg-cyan-950/20 transition whitespace-nowrap">Overview & Identity</button>
            <button onclick="window.scientificWorkspace.switchTab('orbit')" id="sci-tab-orbit" class="px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">Orbital Elements & Vectors</button>
            <button onclick="window.scientificWorkspace.switchTab('groundtrack')" id="sci-tab-groundtrack" class="px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">Ground Track & Sub-Points</button>
            <button onclick="window.scientificWorkspace.switchTab('pass')" id="sci-tab-pass" class="px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">Observer Pass Profile</button>
            <button onclick="window.scientificWorkspace.switchTab('provenance')" id="sci-tab-provenance" class="px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">Provenance & Reproducibility</button>
          </div>

          <!-- Content Body -->
          <div id="sci-workspace-body" class="flex-1 overflow-y-auto p-5 space-y-4">
            <div class="flex items-center justify-center p-12 text-cyan-400 gap-2">
              <i class="fa-solid fa-circle-notch fa-spin text-xl"></i>
              <span>Evaluating astrodynamic state vectors...</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // 2. Object Comparison Modal
    if (!document.getElementById('scientific-comparison-modal')) {
      const compModal = document.createElement('div');
      compModal.id = 'scientific-comparison-modal';
      compModal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md hidden transition-opacity';
      compModal.setAttribute('role', 'dialog');
      compModal.setAttribute('aria-modal', 'true');
      compModal.innerHTML = `
        <div class="relative w-full max-w-4xl max-h-[90vh] bg-slate-950/95 border border-emerald-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono text-slate-200">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-emerald-500/30 bg-slate-900/80">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl text-emerald-400">⇄</span>
              <div>
                <h2 class="text-sm sm:text-base font-bold text-white tracking-wider uppercase">OBJECT ASTRODYNAMIC COMPARISON</h2>
                <p class="text-[10px] text-emerald-400 font-sans">Multi-Object Trajectory & Regime Analysis</p>
              </div>
            </div>
            <button onclick="document.getElementById('scientific-comparison-modal').classList.add('hidden')" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <!-- Object Selectors -->
          <div class="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-center gap-3 text-xs">
            <span class="text-slate-400 font-bold uppercase text-[10px]">Select Target Objects:</span>
            <select id="comp-select-1" onchange="window.scientificWorkspace.handleCompSelectChange()" class="bg-slate-800 border border-slate-700 text-cyan-300 rounded px-2.5 py-1 focus:border-cyan-400 outline-none"></select>
            <span class="text-slate-500 font-bold">vs</span>
            <select id="comp-select-2" onchange="window.scientificWorkspace.handleCompSelectChange()" class="bg-slate-800 border border-slate-700 text-emerald-300 rounded px-2.5 py-1 focus:border-emerald-400 outline-none"></select>
            <button onclick="window.scientificWorkspace.runComparison()" class="ml-auto px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase text-[10px] transition cursor-pointer">
              Recalculate ➔
            </button>
          </div>

          <!-- Comparison Body -->
          <div id="sci-comparison-body" class="flex-1 overflow-y-auto p-5 space-y-4"></div>
        </div>
      `;
      document.body.appendChild(compModal);
    }

    // 3. Mission Explorer Modal
    if (!document.getElementById('scientific-mission-modal')) {
      const missModal = document.createElement('div');
      missModal.id = 'scientific-mission-modal';
      missModal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md hidden transition-opacity';
      missModal.setAttribute('role', 'dialog');
      missModal.setAttribute('aria-modal', 'true');
      missModal.innerHTML = `
        <div class="relative w-full max-w-5xl max-h-[92vh] bg-slate-950/95 border border-indigo-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono text-slate-200">
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-indigo-500/30 bg-slate-900/80">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl text-indigo-400">🚀</span>
              <div>
                <h2 class="text-sm sm:text-base font-bold text-white tracking-wider uppercase">MISSION DISCOVERY EXPLORER</h2>
                <p class="text-[10px] text-indigo-300 font-sans">Authoritative Space Agency Exploration Directory</p>
              </div>
            </div>
            <button onclick="document.getElementById('scientific-mission-modal').classList.add('hidden')" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <!-- Agency Filters & Search -->
          <div class="p-3.5 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex flex-wrap gap-1.5" id="mission-agency-filters">
              <button onclick="window.scientificWorkspace.filterMissions('all')" class="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold text-[10px] uppercase">All Agencies</button>
              <button onclick="window.scientificWorkspace.filterMissions('isro')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] uppercase">ISRO</button>
              <button onclick="window.scientificWorkspace.filterMissions('nasa')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] uppercase">NASA</button>
              <button onclick="window.scientificWorkspace.filterMissions('esa')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] uppercase">ESA</button>
              <button onclick="window.scientificWorkspace.filterMissions('cnsa')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] uppercase">CNSA</button>
            </div>
            <input type="text" id="mission-search-box" oninput="window.scientificWorkspace.searchMissions(this.value)" placeholder="Search missions, targets, or science..." class="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 w-64" />
          </div>

          <div id="sci-missions-grid" class="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4"></div>
        </div>
      `;
      document.body.appendChild(missModal);
    }
  }

  async openAnalysis(objectId) {
    this.currentObjectId = objectId || 'iss';
    const modal = document.getElementById('scientific-analysis-modal');
    if (modal) modal.classList.remove('hidden');

    const body = document.getElementById('sci-workspace-body');
    if (body) {
      body.innerHTML = `
        <div class="flex items-center justify-center p-12 text-cyan-400 gap-2">
          <i class="fa-solid fa-circle-notch fa-spin text-xl"></i>
          <span>Evaluating SGP4 ephemeris & astrodynamic matrices...</span>
        </div>
      `;
    }

    try {
      // Get observer location from preferences
      const obs = (window.userPreferences && window.userPreferences.get('observer')) || { lat: 18.5204, lon: 73.8567, name: 'Pune Sector' };
      const res = await fetch(`/api/analysis/object/${encodeURIComponent(this.currentObjectId)}?lat=${obs.lat}&lon=${obs.lon}`);
      if (!res.ok) {
        const err = await res.json();
        body.innerHTML = `<div class="p-6 text-rose-400 bg-rose-950/50 rounded-xl border border-rose-500/50">⚠️ ${err.error || 'Failed to evaluate object.'}</div>`;
        return;
      }
      this.currentData = await res.json();
      document.getElementById('sci-workspace-title').innerText = `${this.currentData.meta.name} // SCIENTIFIC ANALYSIS`;
      this.switchTab('overview');
    } catch (e) {
      body.innerHTML = `<div class="p-6 text-rose-400 bg-rose-950/50 rounded-xl border border-rose-500/50">Network error fetching astrodynamics: ${e.message}</div>`;
    }
  }

  closeAnalysis() {
    const modal = document.getElementById('scientific-analysis-modal');
    if (modal) modal.classList.add('hidden');
  }

  switchTab(tabId) {
    ['overview', 'orbit', 'groundtrack', 'pass', 'provenance'].forEach(t => {
      const btn = document.getElementById(`sci-tab-${t}`);
      if (btn) {
        if (t === tabId) {
          btn.className = 'px-4 py-2.5 border-b-2 border-cyan-400 text-cyan-300 bg-cyan-950/20 transition whitespace-nowrap';
        } else {
          btn.className = 'px-4 py-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap';
        }
      }
    });

    const body = document.getElementById('sci-workspace-body');
    if (!body || !this.currentData) return;
    const d = this.currentData;

    if (tabId === 'overview') {
      const m = d.meta;
      const astro = d.astrodynamics || {};
      const orb = d.orbitalElements || {};
      const sv = d.stateVector || {};

      body.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Designation & Catalog</div>
            <div class="text-base text-white font-bold">${m.name}</div>
            <div class="text-xs text-cyan-400">NORAD: ${m.noradId || 'N/A'} | COSPAR: ${m.cosparId || 'N/A'}</div>
            <div class="text-[11px] text-slate-300 pt-1">Agency: <span class="text-white font-bold">${m.agency || astro.agency || 'N/A'}</span></div>
            <div class="text-[11px] text-slate-300">Regime: <span class="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10px]">${m.regime}</span></div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Instantaneous State Vector</div>
            <div class="flex justify-between text-xs py-0.5 border-b border-slate-800">
              <span class="text-slate-400">Altitude:</span>
              <span class="text-emerald-400 font-bold">${sv.altitudeKm ? sv.altitudeKm + ' km' : (astro.distanceFromEarthKm ? astro.distanceFromEarthKm.toLocaleString() + ' km (Earth Dist)' : 'N/A')}</span>
            </div>
            <div class="flex justify-between text-xs py-0.5 border-b border-slate-800">
              <span class="text-slate-400">Velocity:</span>
              <span class="text-cyan-400 font-bold">${sv.velocityKms ? sv.velocityKms + ' km/s' : 'N/A'}</span>
            </div>
            <div class="flex justify-between text-xs py-0.5 border-b border-slate-800">
              <span class="text-slate-400">Illumination:</span>
              <span class="text-amber-300 font-bold">${sv.illumination || 'Calculated'}</span>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Orbital Geometry</div>
            <div class="flex justify-between text-xs py-0.5 border-b border-slate-800">
              <span class="text-slate-400">Period:</span>
              <span class="text-white font-bold">${orb.orbitalPeriodMinutes ? orb.orbitalPeriodMinutes + ' min' : 'N/A'}</span>
            </div>
            <div class="flex justify-between text-xs py-0.5 border-b border-slate-800">
              <span class="text-slate-400">Inclination:</span>
              <span class="text-white font-bold">${orb.inclinationDeg !== undefined ? orb.inclinationDeg + '°' : 'N/A'}</span>
            </div>
            <div class="flex justify-between text-xs py-0.5 border-b border-slate-800">
              <span class="text-slate-400">Perigee / Apogee:</span>
              <span class="text-slate-200">${orb.perigeeAltitudeKm ? orb.perigeeAltitudeKm + ' / ' + orb.apogeeAltitudeKm + ' km' : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div class="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Operational Overview & Scientific Role</div>
          <p class="text-xs text-slate-300 leading-relaxed font-sans">${astro.role || m.role || 'Active orbital operations and telemetry synchronization under international space situational awareness guidelines.'}</p>
        </div>
      `;
    } else if (tabId === 'orbit') {
      const orb = d.orbitalElements || {};
      const sv = d.stateVector || {};

      body.innerHTML = `
        <div class="space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Semi-Major Axis (a)</div>
              <div class="text-sm font-bold text-cyan-300">${orb.semiMajorAxisKm ? orb.semiMajorAxisKm.toLocaleString() + ' km' : 'N/A'}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Eccentricity (e)</div>
              <div class="text-sm font-bold text-emerald-300">${orb.eccentricity !== undefined ? orb.eccentricity : 'N/A'}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Inclination (i)</div>
              <div class="text-sm font-bold text-white">${orb.inclinationDeg !== undefined ? orb.inclinationDeg + '°' : 'N/A'}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">RAAN (Ω)</div>
              <div class="text-sm font-bold text-white">${orb.rightAscensionAscendingNodeDeg !== undefined ? orb.rightAscensionAscendingNodeDeg + '°' : 'N/A'}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Arg of Perigee (ω)</div>
              <div class="text-sm font-bold text-white">${orb.argumentOfPerigeeDeg !== undefined ? orb.argumentOfPerigeeDeg + '°' : 'N/A'}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Mean Anomaly (M)</div>
              <div class="text-sm font-bold text-white">${orb.meanAnomalyDeg !== undefined ? orb.meanAnomalyDeg + '°' : 'N/A'}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Mean Motion (n)</div>
              <div class="text-sm font-bold text-amber-300">${orb.meanMotionRevPerDay ? orb.meanMotionRevPerDay + ' rev/day' : 'N/A'}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">BSTAR Drag Term</div>
              <div class="text-sm font-bold text-slate-300">${orb.bstarDragTerm || '0.0'}</div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div class="text-xs font-bold text-cyan-400 uppercase">Cartesian ECI / TEME Reference State</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="space-y-1">
                <div class="text-slate-400 text-[10px]">Geodetic Sub-Satellite Coordinates:</div>
                <div class="text-slate-200">Latitude: <span class="font-bold text-white">${sv.latitudeDeg}°</span> | Longitude: <span class="font-bold text-white">${sv.longitudeDeg}°</span></div>
                <div class="text-slate-200">Altitude: <span class="font-bold text-emerald-400">${sv.altitudeKm} km</span> | Radial Distance: <span class="font-bold text-white">${sv.geocentricDistanceKm} km</span></div>
              </div>
              <div class="space-y-1">
                <div class="text-slate-400 text-[10px]">Gravitational Model & Frame:</div>
                <div class="text-slate-300">${d.meta.gravitationalModel || 'WGS84 Ellipsoid'}</div>
                <div class="text-slate-400 text-[10px] pt-1">Evaluation Epoch: ${d.meta.evaluationTimeUTC}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (tabId === 'groundtrack') {
      const gt = d.groundTrack || {};
      const points = gt.points || [];

      if (!points.length) {
        body.innerHTML = `
          <div class="p-8 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 space-y-2">
            <div class="text-xl">🌐</div>
            <div class="text-xs font-bold text-slate-300">Ground Track Not Applicable</div>
            <div class="text-[11px] leading-relaxed max-w-md mx-auto">${d.meta.groundTrackNote || 'Ground track projections only apply to geocentric Earth-orbiting spacecraft.'}</div>
          </div>
        `;
        return;
      }

      body.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-300">1 Full Orbital Period Projection: <span class="text-cyan-300 font-bold">${gt.orbitPeriodMinutes} min</span> (${points.length} sampled points)</span>
            <button onclick="window.scientificWorkspace.copyGroundTrackData()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold">Copy Coordinates</button>
          </div>

          <div class="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
            <table class="w-full text-left text-[11px] font-mono">
              <thead class="bg-slate-900 text-slate-400 text-[10px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th class="p-2">TIME (UTC)</th>
                  <th class="p-2">LATITUDE</th>
                  <th class="p-2">LONGITUDE</th>
                  <th class="p-2">ALTITUDE</th>
                  <th class="p-2">VELOCITY</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-900">
                ${points.slice(0, 30).map(p => `
                  <tr class="hover:bg-slate-900/40">
                    <td class="p-2 text-slate-400">${p.time.substring(11, 19)}</td>
                    <td class="p-2 ${p.lat >= 0 ? 'text-cyan-300' : 'text-blue-300'}">${p.lat}°</td>
                    <td class="p-2 ${p.lon >= 0 ? 'text-emerald-300' : 'text-amber-300'}">${p.lon}°</td>
                    <td class="p-2 text-slate-200">${p.altKm} km</td>
                    <td class="p-2 text-slate-300">${p.velocityKms} km/s</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="text-[10px] text-slate-500">Showing first 30 trajectory steps. Use Export tools to download full 60-step orbital array.</div>
        </div>
      `;
    } else if (tabId === 'pass') {
      const look = d.observerLookAngles || {};
      const obs = look.observerLocation || {};

      body.innerHTML = `
        <div class="space-y-4">
          <div class="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap justify-between items-center gap-3">
            <div>
              <div class="text-[10px] text-slate-400 font-bold uppercase">Observer Baseline Horizon</div>
              <div class="text-sm font-bold text-white">Lat: ${obs.lat}° | Lon: ${obs.lon}° | Elevation: ${obs.altKm ? (obs.altKm * 1000) + 'm MSL' : '0m'}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded ${look.hasGeometricLineOfSight ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'} text-xs font-bold">
                ${look.hasGeometricLineOfSight ? '● In Line of Sight' : '○ Below Horizon'}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Current Elevation</div>
              <div class="text-base font-bold ${look.elevationDeg > 0 ? 'text-emerald-400' : 'text-slate-500'}">${look.elevationDeg}°</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Azimuth / Compass</div>
              <div class="text-base font-bold text-white">${look.azimuthDeg}° (${look.compassHeading || 'N'})</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Slant Range</div>
              <div class="text-base font-bold text-cyan-300">${look.slantRangeKm ? look.slantRangeKm.toLocaleString() + ' km' : 'N/A'}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Optical Visibility</div>
              <div class="text-[11px] font-bold text-amber-300">${look.opticalVisibilityClass || 'Radio Track'}</div>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 font-sans space-y-1">
            <div class="font-bold text-slate-300 uppercase text-[10px]">Observing Criteria Definitions:</div>
            <div>• <strong class="text-slate-200">Geometric Line-of-Sight:</strong> Spacecraft is geometrically above the observer local horizontal plane ($El > 0^\circ$).</div>
            <div>• <strong class="text-slate-200">Optical Naked-Eye Visibility:</strong> Spacecraft is directly illuminated by sunlight while the observer sky is in astronomical or nautical twilight ($Sun El \le -6^\circ$).</div>
            <div>• <strong class="text-slate-200">Radio Pass:</strong> Spacecraft is elevated sufficiently ($El > 5^\circ$) for unobstructed RF antenna azimuth/elevation tracking.</div>
          </div>
        </div>
      `;
    } else if (tabId === 'provenance') {
      const p = d.provenance || {};
      const orb = d.orbitalElements || {};

      body.innerHTML = `
        <div class="space-y-4">
          <div class="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div class="text-[10px] text-cyan-400 uppercase font-bold">Authoritative Provenance & Source Record</div>
            <div class="text-xs text-white">Source Feed: <span class="font-bold text-cyan-300">${p.sourceProvider || 'Official Space Catalog'}</span></div>
            <div class="text-xs text-slate-300">Ephemeris Epoch: <span class="font-bold">${orb.epochUTC || 'Verified'}</span> (${orb.epochAgeDays || 0} days old)</div>
          </div>

          ${p.tleLine1 ? `
            <div class="p-3.5 rounded-xl bg-black/90 border border-slate-800 space-y-1">
              <div class="text-[10px] text-slate-500 font-bold uppercase">Raw Two-Line Element (TLE) Format:</div>
              <pre class="text-[11px] text-emerald-400 font-mono select-all overflow-x-auto">${p.tleLine1}\n${p.tleLine2}</pre>
            </div>
          ` : ''}

          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div class="text-[10px] text-amber-400 uppercase font-bold">Mathematical Model & Limitations</div>
            <p class="text-slate-300 font-sans leading-relaxed text-[11px]">${p.modelLimitations || 'SGP4 analytical propagation applies mean Keplerian motion with gravitational and atmospheric drag perturbation terms. SGP4 accuracy is nominal within ±30 days of epoch.'}</p>
          </div>

          <div class="pt-2 flex items-center justify-between">
            <button onclick="window.scientificWorkspace.fetchReproducibleRecord('${d.meta.objectId}')" class="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer">
              <span>Generate Reproducible Analysis Record (SHA-256)</span>
            </button>
          </div>
        </div>
      `;
    }
  }

  // Multi-Object Comparison Tool
  async openComparisonModal() {
    const modal = document.getElementById('scientific-comparison-modal');
    if (modal) modal.classList.remove('hidden');

    // Populate selectors
    const s1 = document.getElementById('comp-select-1');
    const s2 = document.getElementById('comp-select-2');
    if (s1 && s2 && s1.children.length === 0) {
      const opts = MASTER_TRACKABLE_CATALOG.map(s => `<option value="${s.id}">${s.name} (${s.regime})</option>`).join('');
      s1.innerHTML = opts;
      s2.innerHTML = opts;
      s1.value = this.comparisonIds[0] || 'iss';
      s2.value = this.comparisonIds[1] || 'tiangong';
    }

    this.runComparison();
  }

  openComparisonWithCurrent() {
    this.comparisonIds[0] = this.currentObjectId || 'iss';
    this.closeAnalysis();
    this.openComparisonModal();
  }

  handleCompSelectChange() {
    const s1 = document.getElementById('comp-select-1');
    const s2 = document.getElementById('comp-select-2');
    if (s1 && s2) {
      this.comparisonIds = [s1.value, s2.value];
    }
  }

  async runComparison() {
    const body = document.getElementById('sci-comparison-body');
    if (!body) return;

    body.innerHTML = `
      <div class="flex items-center justify-center p-12 text-emerald-400 gap-2">
        <i class="fa-solid fa-circle-notch fa-spin text-xl"></i>
        <span>Calculating synchronized orbital states...</span>
      </div>
    `;

    try {
      const res = await fetch(`/api/analysis/compare?ids=${this.comparisonIds.join(',')}`);
      const data = await res.json();

      if (!res.ok || !data.objects) {
        body.innerHTML = `<div class="p-6 text-rose-400 bg-rose-950/50 rounded-xl border border-rose-500/50">⚠️ ${data.error || 'Failed to compare objects.'}</div>`;
        return;
      }

      const isComp = data.meta.isPhysicallyComparable;
      const objs = data.objects;
      const deltas = data.deltas;

      body.innerHTML = `
        ${!isComp ? `
          <div class="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs space-y-1">
            <div class="font-bold flex items-center gap-1.5 text-amber-300">
              <span>⚠️</span> <span>Incompatible Reference Frames</span>
            </div>
            <p class="text-[11px] leading-relaxed font-sans">${data.meta.scientificCompatibilityNote}</p>
          </div>
        ` : ''}

        ${deltas ? `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Δ Altitude</div>
              <div class="text-base font-bold text-cyan-300">${deltas.deltaAltitudeKm} km</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Δ Orbital Speed</div>
              <div class="text-base font-bold text-emerald-300">${deltas.deltaVelocityKms} km/s</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Δ Period</div>
              <div class="text-base font-bold text-white">${deltas.deltaPeriodMinutes} min</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div class="text-[10px] text-slate-400">Δ Inclination</div>
              <div class="text-base font-bold text-amber-300">${deltas.deltaInclinationDeg}°</div>
            </div>
          </div>
        ` : ''}

        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table class="w-full text-left text-xs font-mono">
            <thead class="bg-slate-900 text-slate-400 text-[10px] border-b border-slate-800">
              <tr>
                <th class="p-3">METRIC</th>
                ${objs.map(o => `<th class="p-3 text-white">${o.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-900 text-[11px]">
              <tr>
                <td class="p-3 text-slate-400 font-bold">Orbital Regime</td>
                ${objs.map(o => `<td class="p-3 text-cyan-300">${o.regime}</td>`).join('')}
              </tr>
              <tr>
                <td class="p-3 text-slate-400 font-bold">Agency</td>
                ${objs.map(o => `<td class="p-3 text-slate-200">${o.agency || 'N/A'}</td>`).join('')}
              </tr>
              <tr>
                <td class="p-3 text-slate-400 font-bold">Altitude</td>
                ${objs.map(o => `<td class="p-3 font-bold text-emerald-400">${o.altitudeKm !== null ? o.altitudeKm + ' km' : (o.distanceFromEarthKm ? o.distanceFromEarthKm.toLocaleString() + ' km (Sun-Earth)' : 'N/A')}</td>`).join('')}
              </tr>
              <tr>
                <td class="p-3 text-slate-400 font-bold">Orbital Velocity</td>
                ${objs.map(o => `<td class="p-3 text-cyan-300">${o.velocityKms !== null ? o.velocityKms + ' km/s' : 'N/A'}</td>`).join('')}
              </tr>
              <tr>
                <td class="p-3 text-slate-400 font-bold">Orbital Period</td>
                ${objs.map(o => `<td class="p-3 text-white">${o.periodMinutes !== null ? o.periodMinutes + ' min' : 'N/A'}</td>`).join('')}
              </tr>
              <tr>
                <td class="p-3 text-slate-400 font-bold">Inclination</td>
                ${objs.map(o => `<td class="p-3 text-white">${o.inclinationDeg !== null ? o.inclinationDeg + '°' : 'N/A'}</td>`).join('')}
              </tr>
              <tr>
                <td class="p-3 text-slate-400 font-bold">Operational Status</td>
                ${objs.map(o => `<td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-emerald-400">${o.status}</span></td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      body.innerHTML = `<div class="p-6 text-rose-400">Error: ${e.message}</div>`;
    }
  }

  // Mission Discovery Explorer
  async openMissionExplorer() {
    const modal = document.getElementById('scientific-mission-modal');
    if (modal) modal.classList.remove('hidden');

    try {
      const res = await fetch('/api/analysis/missions');
      const data = await res.json();
      this.missionsData = data.missions || [];
      this.renderMissions(this.missionsData);
    } catch (e) {
      console.warn('[Missions] Load failed:', e);
    }
  }

  renderMissions(list) {
    const grid = document.getElementById('sci-missions-grid');
    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = '<div class="col-span-2 text-center text-slate-500 p-8">No missions matched the filter.</div>';
      return;
    }

    grid.innerHTML = list.map(m => `
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition space-y-2 flex flex-col justify-between">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-bold">${m.code}</span>
            <span class="px-2 py-0.5 rounded text-[10px] ${m.operationalStatus === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'} uppercase font-bold">${m.operationalStatus}</span>
          </div>
          <h3 class="text-sm font-bold text-white tracking-wide">${m.name}</h3>
          <div class="text-[11px] text-indigo-400">Agency: ${m.agency} | Target: ${m.targetBody}</div>
          <p class="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-3">${m.overview}</p>
        </div>

        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span class="text-[10px] text-slate-500">Launch: ${m.launchYear}</span>
          ${m.relatedCatalogObjects && m.relatedCatalogObjects.length ? `
            <button onclick="window.scientificWorkspace.openAnalysis('${m.relatedCatalogObjects[0]}')" class="px-2.5 py-1 rounded bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
              <span>Inspect Craft ➔</span>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  filterMissions(agencyCat) {
    if (!this.missionsData) return;
    const filtered = agencyCat === 'all' 
      ? this.missionsData 
      : this.missionsData.filter(m => m.agencyCat === agencyCat || m.agency.toLowerCase().includes(agencyCat));
    this.renderMissions(filtered);
  }

  searchMissions(query) {
    if (!this.missionsData) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) return this.renderMissions(this.missionsData);
    const filtered = this.missionsData.filter(m => 
      m.name.toLowerCase().includes(q) ||
      m.overview.toLowerCase().includes(q) ||
      m.targetBody.toLowerCase().includes(q) ||
      m.agency.toLowerCase().includes(q)
    );
    this.renderMissions(filtered);
  }

  // Reproducible Analysis Record
  async fetchReproducibleRecord(id) {
    try {
      const res = await fetch(`/api/analysis/reproducible-record?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reproducible_record_${id}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (window.statusManager) {
        window.statusManager.notify({
          severity: 'SUCCESS',
          title: 'Reproducible Record Exported',
          message: `Record ${data.reproducibilityIdentifier} downloaded with SHA-256 verification digest.`,
          durationMs: 4000
        });
      }
    } catch (e) {
      alert('Failed to generate reproducible record: ' + e.message);
    }
  }

  exportCurrentObjectJson() {
    if (!this.currentData) return;
    const blob = new Blob([JSON.stringify(this.currentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gods_eye_analysis_${this.currentObjectId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyGroundTrackData() {
    if (!this.currentData || !this.currentData.groundTrack) return;
    const jsonStr = JSON.stringify(this.currentData.groundTrack.points, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      if (window.statusManager) {
        window.statusManager.notify({
          severity: 'SUCCESS',
          title: 'Coordinates Copied',
          message: 'Ground track coordinate array copied to clipboard.',
          durationMs: 3000
        });
      }
    });
  }
}

export const scientificWorkspace = new ScientificWorkspace();

if (typeof window !== 'undefined') {
  window.scientificWorkspace = scientificWorkspace;
  window.openObjectAnalysisWorkspace = (id) => scientificWorkspace.openAnalysis(id);
  window.openObjectComparisonModal = (id) => scientificWorkspace.openComparisonModal(id);
  window.openMissionExplorerModal = () => scientificWorkspace.openMissionExplorer();
}
