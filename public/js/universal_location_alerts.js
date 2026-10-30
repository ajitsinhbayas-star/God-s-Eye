
/**
 * UNIVERSAL OBSERVER LOCATION & SATELLITE PASS ALERT TICKER
 * Synchronized across index.html, earth.html, deepspace.html, orbitalert.html, sentinel.html
 */
(function() {
  const STORAGE_KEY = 'orbital_observer_location_v2';

  const CITIES = [
    { name: "Pune", region: "Maharashtra / IUCAA & GMRT", country: "IND", lat: 18.5204, lon: 73.8567, alt: 560 },
    { name: "Sriharikota (SDSC)", region: "ISRO Space Launch Port", country: "IND", lat: 13.7199, lon: 80.2305, alt: 5 },
    { name: "Bengaluru", region: "ISTRAC / ISRO HQ", country: "IND", lat: 12.9716, lon: 77.5946, alt: 920 },
    { name: "New Delhi", region: "National Capital", country: "IND", lat: 28.6139, lon: 77.2090, alt: 216 },
    { name: "Mumbai", region: "Maharashtra Capital", country: "IND", lat: 19.0760, lon: 72.8777, alt: 14 },
    { name: "Hyderabad", region: "NRSC Remote Sensing", country: "IND", lat: 17.3850, lon: 78.4867, alt: 542 },
    { name: "Ahmedabad", region: "Space Applications Centre", country: "IND", lat: 23.0225, lon: 72.5714, alt: 53 },
    { name: "Thiruvananthapuram", region: "VSSC Rocket Center", country: "IND", lat: 8.5241, lon: 76.9366, alt: 10 },
    { name: "Chennai", region: "Tamil Nadu", country: "IND", lat: 13.0827, lon: 80.2707, alt: 6 },
    { name: "Kolkata", region: "West Bengal", country: "IND", lat: 22.5726, lon: 88.3639, alt: 9 },
    { name: "Nagpur", region: "Zero Mile Central India", country: "IND", lat: 21.1458, lon: 79.0882, alt: 310 },
    { name: "Dehradun", region: "IIRS Satellite Sensing", country: "IND", lat: 30.3165, lon: 78.0322, alt: 640 },
    { name: "Shillong", region: "NESAC North-East Space", country: "IND", lat: 25.5788, lon: 91.8933, alt: 1525 },
    { name: "Bhopal", region: "MCF Satellite Control", country: "IND", lat: 23.2599, lon: 77.4126, alt: 527 },
    { name: "Jaipur", region: "Rajasthan", country: "IND", lat: 26.9124, lon: 75.7873, alt: 431 },
    { name: "Lucknow", region: "Uttar Pradesh", country: "IND", lat: 26.8467, lon: 80.9462, alt: 123 },
    { name: "Patna", region: "Bihar", country: "IND", lat: 25.5941, lon: 85.1376, alt: 53 },
    { name: "Chandigarh", region: "Punjab & Haryana", country: "IND", lat: 30.7333, lon: 76.7794, alt: 321 },
    { name: "Srinagar", region: "Jammu & Kashmir", country: "IND", lat: 34.0837, lon: 74.7973, alt: 1585 },
    { name: "London", region: "United Kingdom", country: "GBR", lat: 51.5074, lon: -0.1278, alt: 15 },
    { name: "Washington D.C.", region: "NASA HQ", country: "USA", lat: 38.9072, lon: -77.0369, alt: 20 },
    { name: "Cape Canaveral", region: "Kennedy Space Center", country: "USA", lat: 28.3922, lon: -80.6077, alt: 3 },
    { name: "Tokyo", region: "JAXA Aerospace", country: "JPN", lat: 35.6762, lon: 139.6503, alt: 40 },
    { name: "Paris", region: "ESA HQ", country: "FRA", lat: 48.8566, lon: 2.3522, alt: 35 }
  ];

  function getActiveLocation() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved.lat === 'number') return saved;
    } catch (_) {}
    return CITIES[0]; // Default: Pune, India
  }

  function saveActiveLocation(loc) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    updateHeaderLocationBadge();
    recalculateLocalPasses();
    if (typeof window.sync3DObserverStation === 'function') {
      window.sync3DObserverStation(loc);
    }
    window.dispatchEvent(new CustomEvent('orbital_location_changed', { detail: loc }));
  }

  window.getActiveLocation = getActiveLocation;
  window.saveActiveLocation = saveActiveLocation;

  // 1. INJECT MODAL HTML IF NOT PRESENT
  function ensureLocationModal() {
    if (document.getElementById('universal-location-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'universal-location-modal';
    modal.className = 'hidden fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 pointer-events-auto font-mono text-xs';
    modal.innerHTML = `
      <div class="max-w-md w-full rounded-2xl bg-[#030917]/95 border border-cyan-500/50 shadow-2xl p-4 space-y-3 text-slate-200">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span class="font-bold text-cyan-300 uppercase tracking-wider text-sm">Select Observation Station</span>
          </div>
          <button onclick="window.closeUniversalLocationModal()" class="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800">✕</button>
        </div>
        
        <div class="flex gap-2">
          <input id="univ-city-search-input" type="search" placeholder="Search city or spaceport (Pune, Delhi, Tokyo...)" oninput="window.filterUniversalCities(this.value)" class="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 text-xs" />
          <button onclick="window.detectUniversalGPS()" id="btn-univ-gps" class="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold whitespace-nowrap transition flex items-center gap-1">
            <span>📍 GPS</span>
          </button>
        </div>

        <div id="univ-cities-list" class="max-h-60 overflow-y-auto space-y-1.5 pr-1"></div>
        <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
          <span>Active passes recalculate automatically.</span>
          <span class="text-cyan-400 font-bold" id="univ-modal-current-lbl"></span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // 2. INJECT TOP PASS NEWS TICKER IF NOT PRESENT
  function ensurePassNewsTicker() {
    if (window.location.pathname.includes('atmosphere') || window.location.pathname.includes('alert') || window.location.pathname.includes('orbitalert') || document.getElementById('farmer-controls')) return;
    if (document.getElementById('hud-pass-news-ticker')) return;
    const ticker = document.createElement('div');
    ticker.id = 'hud-pass-news-ticker';
    ticker.className = 'fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl hud-glass border border-amber-500/40 font-mono text-[11px] text-slate-100 shadow-2xl pointer-events-auto transition-all max-w-[calc(100vw-1.5rem)] hidden';
    ticker.innerHTML = `
      <span class="flex h-2 w-2 relative shrink-0">
        <span id="ticker-ping-dot" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span id="ticker-solid-dot" class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <span id="ticker-tag" class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold tracking-wider uppercase shrink-0">PASS ALERT</span>
      <span id="hud-pass-ticker-text" onclick="window.openActivePassAction()" class="truncate font-sans text-xs text-slate-200 max-w-[190px] sm:max-w-md md:max-w-lg cursor-pointer hover:text-cyan-300 transition font-medium">Synchronizing satellite horizon look-angles...</span>
      <button onclick="window.openActivePassAction()" id="ticker-action-btn" class="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold shrink-0">TRACK 3D ↗</button>
      <button onclick="window.dismissPassNewsTicker()" class="text-slate-400 hover:text-white px-1 text-xs shrink-0" title="Dismiss Alert">✕</button>
    `;
    document.body.appendChild(ticker);
  }

  window.dismissPassNewsTicker = function() {
    try { sessionStorage.setItem('orbital_dismiss_pass_ticker', '1'); } catch (_) {}
    const t = document.getElementById('hud-pass-news-ticker');
    if (t) { t.classList.add('hidden'); t.style.display = 'none'; }
  };

  window.showPassNewsTicker = function() {
    try { sessionStorage.removeItem('orbital_dismiss_pass_ticker'); } catch (_) {}
    const t = document.getElementById('hud-pass-news-ticker');
    if (t) {
      t.classList.remove('hidden');
      t.style.display = 'flex';
      updateTickerHUD();
    }
  };

  window.openUniversalLocationModal = function() {
    ensureLocationModal();
    const modal = document.getElementById('universal-location-modal');
    modal.classList.remove('hidden');
    const input = document.getElementById('univ-city-search-input');
    if (input) { input.value = ''; input.focus(); }
    renderCitiesList(CITIES);
  };

  window.closeUniversalLocationModal = function() {
    const modal = document.getElementById('universal-location-modal');
    if (modal) modal.classList.add('hidden');
  };

  function renderCitiesList(list) {
    const cont = document.getElementById('univ-cities-list');
    const active = getActiveLocation();
    const lbl = document.getElementById('univ-modal-current-lbl');
    if (lbl) lbl.innerText = `Active: ${active.name} (${active.lat.toFixed(2)}° N)`;
    if (!cont) return;
    cont.innerHTML = list.map(c => {
      const isSel = c.name === active.name;
      return `
        <div onclick="window.selectUniversalLocation('${c.name}')" class="p-2 rounded-xl bg-slate-900/80 border ${isSel ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-800 hover:border-cyan-500/50'} cursor-pointer transition flex items-center justify-between">
          <div>
            <div class="font-bold text-white flex items-center gap-1.5">
              <span>${isSel ? '🎯' : '📍'}</span>
              <span>${c.name}</span>
              <span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono">${c.country}</span>
            </div>
            <div class="text-[10px] text-slate-400 font-sans">${c.region} • ${c.lat.toFixed(2)}°N, ${c.lon.toFixed(2)}°E</div>
          </div>
          <span class="text-[10px] ${isSel ? 'text-cyan-300 font-bold' : 'text-slate-500'} font-mono">${isSel ? 'ACTIVE' : 'SELECT →'}</span>
        </div>
      `;
    }).join('') || '<div class="text-slate-500 text-center py-4">No matching cities found.</div>';
  }

  window.filterUniversalCities = function(query) {
    const q = (query || '').toLowerCase().trim();
    const filtered = CITIES.filter(c => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));
    renderCitiesList(filtered);
  };

  window.selectUniversalLocation = function(cityName) {
    const found = CITIES.find(c => c.name === cityName);
    if (found) {
      saveActiveLocation(found);
      window.closeUniversalLocationModal();
    }
  };

  window.detectUniversalGPS = function() {
    const btn = document.getElementById('btn-univ-gps');
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    if (btn) btn.innerHTML = '<span>⏳ GPS...</span>';
    navigator.geolocation.getCurrentPosition(
      pos => {
        const customLoc = {
          name: "My GPS Location",
          region: "Current Device Position",
          country: "GPS",
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
          alt: Math.round(pos.coords.altitude || 100)
        };
        saveActiveLocation(customLoc);
        if (btn) btn.innerHTML = '<span>📍 GPS</span>';
        window.closeUniversalLocationModal();
      },
      err => {
        if (btn) btn.innerHTML = '<span>📍 GPS</span>';
        alert('GPS lookup unavailable: ' + (err.message || 'Permission denied. Using selected city.'));
      },
      { timeout: 8000 }
    );
  };

  function updateHeaderLocationBadge() {
    const loc = getActiveLocation();
    const btn = document.getElementById('hud-location-selector-btn');
    const nameEl = document.getElementById('hud-location-name');
    if (nameEl) nameEl.innerText = loc.name;
    if (btn) btn.title = `Observer Station: ${loc.name} (${loc.lat.toFixed(2)}°N, ${loc.lon.toFixed(2)}°E) — Click to Change`;

    // Also sync orbitalert.html stations if on that page
    const stName = document.getElementById('station-name-display');
    const stCoords = document.getElementById('station-coords-display');
    if (stName) stName.innerText = `${loc.name.toUpperCase()} (${loc.country})`;
    if (stCoords) stCoords.innerText = `LAT: ${loc.lat.toFixed(4)}° | LON: ${loc.lon.toFixed(4)}° | ALT: ${loc.alt || 500} m | ${loc.region.toUpperCase()}`;
  }

  // --- PASS PREDICTION & ALERT TICKER SCHEDULER ---
  let generatedPasses = [];
  let activePassObj = null;

  async function recalculateLocalPasses() {
    const loc = getActiveLocation();

    // Fetch genuine SGP4 orbital pass predictions from backend
    if (window.location.protocol !== 'file:') {
      try {
        const res = await fetch(`/api/passes?lat=${loc.lat.toFixed(4)}&lon=${loc.lon.toFixed(4)}&hours=24`);
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data) && json.data.length > 0) {
            const nowMs = Date.now();
            generatedPasses = json.data
              .map(p => {
                const aosMs = new Date(p.aos.time).getTime();
                const losMs = new Date(p.los.time).getTime();
                return {
                  targetKey: p.satelliteId || 'iss',
                  name: p.satelliteName,
                  aosMs,
                  losMs,
                  aosTimeStr: p.aos.time ? p.aos.time.slice(11, 16) + ' UTC' : '',
                  durationMin: Math.max(1, Math.round(p.durationSeconds / 60)),
                  maxEl: Math.round(p.maxElevationDeg),
                  trajectory: `${p.aos.compass} ➔ ${p.tca.compass} ➔ ${p.los.compass}`,
                  mag: p.isNakedEyeVisible ? 'Visible' : 'Radio',
                  visibility: p.visibility
                };
              })
              .filter(p => p.losMs >= nowMs) // keep only current or future passes
              .sort((a, b) => a.aosMs - b.aosMs); // soonest first

            updateTickerHUD();
            return;
          }
        }
      } catch (_) {}
    }

    // When backend unavailable or no upcoming passes, do not fabricate artificial passes
    generatedPasses = [];
    updateTickerHUD();
  }

  function formatPassCountdown(diffMs) {
    const totalMin = Math.max(0, Math.round(diffMs / 60000));
    if (totalMin <= 0) return 'Passing overhead now';
    if (totalMin < 60) return `${totalMin} min`;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }

  function updateTickerHUD() {
    const tickerEl = document.getElementById('hud-pass-news-ticker');
    if (window.location.pathname.includes('atmosphere') || document.getElementById('farmer-controls')) {
      if (tickerEl) tickerEl.classList.add('hidden');
      return;
    }
    if (sessionStorage.getItem('orbital_dismiss_pass_ticker') === '1') {
      if (tickerEl) tickerEl.classList.add('hidden');
      return;
    }
    const textEl = document.getElementById('hud-pass-ticker-text');
    const tagEl = document.getElementById('ticker-tag');
    const pingDot = document.getElementById('ticker-ping-dot');
    const solidDot = document.getElementById('ticker-solid-dot');
    const actionBtn = document.getElementById('ticker-action-btn');
    if (!tickerEl || !textEl) return;

    const nowMs = Date.now();
    // Filter out expired passes
    const activeUpcoming = generatedPasses.filter(p => p.losMs >= nowMs);

    if (!activeUpcoming.length) {
      tickerEl.classList.add('hidden');
      return;
    }

    // Always focus on the soonest relevant pass (overhead or next in line)
    activePassObj = activeUpcoming[0];
    const isOverhead = nowMs >= activePassObj.aosMs && nowMs <= activePassObj.losMs;
    const loc = getActiveLocation();

    tickerEl.classList.remove('hidden');

    if (isOverhead) {
      tickerEl.className = 'fixed top-[124px] sm:top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl hud-glass border border-rose-500/70 bg-rose-950/80 font-mono text-[11px] text-white shadow-2xl pointer-events-auto transition-all max-w-[calc(100vw-1.5rem)] animate-pulse';
      if (tagEl) {
        tagEl.innerText = 'OVERHEAD NOW';
        tagEl.className = 'px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400 font-bold text-[9px] tracking-wider uppercase shrink-0';
      }
      if (pingDot) pingDot.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80';
      if (solidDot) solidDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-rose-500';
      textEl.innerHTML = `<strong class="text-rose-300">${activePassObj.name}</strong> is passing directly over <strong>${loc.name}</strong> right now! Peak ${activePassObj.maxEl}° (${activePassObj.trajectory})`;
      if (actionBtn) actionBtn.innerText = 'LOCK 3D 🎯';
    } else {
      const countdownStr = formatPassCountdown(activePassObj.aosMs - nowMs);
      tickerEl.className = 'fixed top-[124px] sm:top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl hud-glass border border-amber-500/40 font-mono text-[11px] text-slate-100 shadow-2xl pointer-events-auto transition-all max-w-[calc(100vw-1.5rem)]';
      if (tagEl) {
        tagEl.innerText = 'NEXT PASS';
        tagEl.className = 'px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold tracking-wider uppercase shrink-0';
      }
      if (pingDot) pingDot.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
      if (solidDot) solidDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-amber-500';
      textEl.innerHTML = `Next pass over <strong>${loc.name}</strong> in <b class="text-amber-300">${countdownStr}</b> (${activePassObj.aosTimeStr}): <span class="text-cyan-300 font-bold">${activePassObj.name}</span> (Max El: +${activePassObj.maxEl}°)`;
      if (actionBtn) actionBtn.innerText = 'TRACK 3D ↗';
    }
  }

  window.openActivePassAction = function() {
    if (!activePassObj) return;
    if (typeof window.setFocusTo === 'function') {
      if (window.OrbitalCommandState && window.OrbitalCommandState.viewMode !== 'earth') {
        if (typeof window.switchExplicitViewMode === 'function') {
          window.switchExplicitViewMode('earth', { skipCameraTransition: true });
        }
      }
      window.setFocusTo(activePassObj.targetKey);
    } else {
      window.location.href = 'earth.html#' + activePassObj.targetKey;
    }
  };

  // Live countdown update every 15 seconds
  setInterval(() => {
    updateTickerHUD();
  }, 15000);

  // Initialize UI once DOM is ready
  function init() {
    ensureLocationModal();
    ensurePassNewsTicker();
    updateHeaderLocationBadge();
    recalculateLocalPasses();

    // Listen to cross-window storage events
    window.addEventListener('storage', e => {
      if (e.key === STORAGE_KEY) {
        updateHeaderLocationBadge();
        recalculateLocalPasses();
      }
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
