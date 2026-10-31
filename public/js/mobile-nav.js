/**
 * ORBITAL EYE — UNIVERSAL APP-LIKE MOBILE BOTTOM NAVIGATION & MORE SHEET
 * Provides consistent 5-item navigation across all 8 public pages:
 * 1. Home  2. Solar System  3. Earth  4. Explore  5. More
 * Hidden on desktop (>= 768px). Touch-optimized with safe-area support.
 */
(function() {
  'use strict';

  function initMobileBottomNav() {
    if (document.getElementById('mobile-bottom-nav')) return;

    const pathname = window.location.pathname.toLowerCase();
    const href = window.location.href.toLowerCase();

    // Determine current active page
    let activeKey = 'home';
    if (pathname.includes('solar') || href.includes('solar')) activeKey = 'solar';
    else if (pathname.includes('earth') || href.includes('earth')) activeKey = 'earth';
    else if (pathname.includes('deepspace') || href.includes('deepspace') || pathname.includes('deep-space') || href.includes('deep-space')) activeKey = 'deepspace';
    else if (pathname.includes('asteroid') || href.includes('asteroid')) activeKey = 'asteroids';
    else if (pathname.includes('kisanmitra') || href.includes('kisanmitra') || pathname.includes('atmosphere') || href.includes('atmosphere') || pathname.includes('weather') || href.includes('weather')) activeKey = 'kisanmitra';
    else if (pathname.includes('air-quality') || href.includes('air-quality') || pathname.includes('airquality') || href.includes('airquality')) activeKey = 'airquality';
    else if (pathname.includes('alert') || href.includes('alert') || pathname.includes('orbitalert') || href.includes('orbitalert')) activeKey = 'alert';
    else if (pathname.includes('sentinel') || href.includes('sentinel')) activeKey = 'sentinel';

    const isFile = window.location.protocol === 'file:';
    const link = (web, file) => isFile ? file : web;

    // Build Bottom Nav Container
    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Mobile App Bottom Navigation');
    nav.className = 'fixed bottom-0 inset-x-0 z-50 md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 text-[10px] font-mono select-none pointer-events-auto pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_30px_rgba(0,0,0,0.8)]';

    const getBtnClass = (key) => {
      const isActive = activeKey === key;
      return `flex-1 flex flex-col items-center justify-center py-2 px-1 transition min-h-[48px] touch-manipulation ${
        isActive ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
      }`;
    };

    nav.innerHTML = `
      <div class="flex items-center justify-around h-13 max-w-lg mx-auto">
        <!-- 1. Home -->
        <a href="${link('/', 'index.html')}" class="${getBtnClass('home')}" title="Orbital Eye Home">
          <i class="fa-solid fa-house text-sm mb-0.5"></i>
          <span>Home</span>
        </a>

        <!-- 2. Solar System -->
        <a href="${link('/solar-system', 'solar-system.html')}" class="${getBtnClass('solar')}" title="3D Solar System">
          <i class="fa-solid fa-sun text-sm mb-0.5"></i>
          <span>Solar</span>
        </a>

        <!-- 3. Earth -->
        <a href="${link('/earth', 'earth.html')}" class="${getBtnClass('earth')}" title="3D Earth & Satellites">
          <i class="fa-solid fa-earth-americas text-sm mb-0.5"></i>
          <span>Earth</span>
        </a>

        <!-- 4. Explore -->
        <button type="button" id="mobile-nav-btn-explore" onclick="window.handleMobileExploreTap()" class="flex-1 flex flex-col items-center justify-center py-2 px-1 text-amber-300 hover:text-amber-200 transition min-h-[48px] touch-manipulation" title="Explore Objects / Catalogue">
          <i class="fa-solid fa-compass text-sm mb-0.5"></i>
          <span>Explore</span>
        </button>

        <!-- 5. More -->
        <button type="button" id="mobile-nav-btn-more" onclick="window.toggleMobileMoreSheet()" aria-expanded="false" aria-controls="mobile-more-sheet" class="flex-1 flex flex-col items-center justify-center py-2 px-1 text-slate-400 hover:text-cyan-300 transition min-h-[48px] touch-manipulation" title="More Observatories">
          <i class="fa-solid fa-ellipsis text-sm mb-0.5"></i>
          <span>More</span>
        </button>
      </div>
    `;

    // Build "More" Bottom Sheet Modal
    const sheet = document.createElement('div');
    sheet.id = 'mobile-more-sheet';
    sheet.className = 'hidden fixed inset-0 z-[60] md:hidden';
    sheet.innerHTML = `
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" onclick="window.toggleMobileMoreSheet(false)"></div>
      <div class="absolute bottom-0 inset-x-0 bg-slate-950/98 border-t border-cyan-500/40 rounded-t-3xl p-4 space-y-3 font-mono max-h-[80vh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span class="text-xs font-bold text-white uppercase tracking-wider">All Observatory Destinations</span>
          </div>
          <button type="button" onclick="window.toggleMobileMoreSheet(false)" class="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs" aria-label="Close destinations menu">
            ✕
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <a href="${link('/deepspace', 'deep-space.html')}" class="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border ${activeKey === 'deepspace' ? 'border-cyan-400 text-cyan-300' : 'border-slate-800 text-slate-200'} flex items-center gap-2.5 transition">
            <span class="text-lg">🌌</span>
            <div>
              <div class="font-bold">Deep Space</div>
              <div class="text-[9px] text-slate-400 font-sans">JWST, Aditya-L1</div>
            </div>
          </a>

          <a href="${link('/asteroids', 'asteroids.html')}" class="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border ${activeKey === 'asteroids' ? 'border-cyan-400 text-cyan-300' : 'border-slate-800 text-slate-200'} flex items-center gap-2.5 transition">
            <span class="text-lg">☄️</span>
            <div>
              <div class="font-bold">Asteroids</div>
              <div class="text-[9px] text-slate-400 font-sans">CNEOS Defense</div>
            </div>
          </a>

          <a href="${link('/kisanmitra', 'kisanmitra.html')}" class="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border ${activeKey === 'kisanmitra' ? 'border-cyan-400 text-cyan-300' : 'border-slate-800 text-slate-200'} flex items-center gap-2.5 transition">
            <span class="text-lg">🌾</span>
            <div>
              <div class="font-bold">KisanMitra</div>
              <div class="text-[9px] text-slate-400 font-sans">Kisan Weather & Radar</div>
            </div>
          </a>

          <a href="${link('/air-quality', 'air-quality.html')}" class="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border ${activeKey === 'airquality' ? 'border-cyan-400 text-cyan-300' : 'border-slate-800 text-slate-200'} flex items-center gap-2.5 transition">
            <span class="text-lg">🍃</span>
            <div>
              <div class="font-bold">Air Quality</div>
              <div class="text-[9px] text-slate-400 font-sans">CPCB NAQI Feed</div>
            </div>
          </a>

          <a href="${link('/alert', 'alert.html')}" class="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border ${activeKey === 'alert' ? 'border-cyan-400 text-cyan-300' : 'border-slate-800 text-slate-200'} flex items-center gap-2.5 transition">
            <span class="text-lg">🚨</span>
            <div>
              <div class="font-bold">OrbitAlert</div>
              <div class="text-[9px] text-slate-400 font-sans">Satellite Passes & DSN</div>
            </div>
          </a>

          <a href="${link('/sentinel-login', 'sentinel-login.html')}" class="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border ${activeKey === 'sentinel' ? 'border-amber-400 text-amber-300' : 'border-slate-800 text-slate-200'} flex items-center gap-2.5 transition">
            <span class="text-lg">🛡️</span>
            <div>
              <div class="font-bold">Sentinel</div>
              <div class="text-[9px] text-slate-400 font-sans">Admin Console</div>
            </div>
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(nav);
    document.body.appendChild(sheet);
  }

  // Explore button behavior per page
  window.handleMobileExploreTap = function() {
    if (typeof window.toggleMobileNavMenu === 'function') {
      window.toggleMobileNavMenu(false);
    }
    // 1. Solar System / Earth / Deep Space / Asteroids catalogue expand button
    const expandCatBtn = document.getElementById('btn-expand-catalog');
    if (expandCatBtn) {
      expandCatBtn.click();
      return;
    }

    // 2. Air Quality Desk Panel
    const aqiDeskBtn = document.getElementById('btn-toggle-desk-panel');
    if (aqiDeskBtn) {
      if (typeof window.toggleDeskPanel === 'function') window.toggleDeskPanel();
      else aqiDeskBtn.click();
      return;
    }

    // 3. Atmosphere District Desk Panel
    const distPanelBtn = document.getElementById('btn-toggle-district-panel');
    if (distPanelBtn) {
      distPanelBtn.click();
      return;
    }

    // 4. Alert City Selection Modal
    const cityModalBtn = document.getElementById('hud-location-selector-btn');
    if (cityModalBtn) {
      if (typeof window.openCityModal === 'function') window.openCityModal();
      else cityModalBtn.click();
      return;
    }

    // Fallback: If on homepage, scroll to feature cards or navigate to Solar System
    const featSection = document.getElementById('features-section') || document.querySelector('section');
    if (featSection) {
      featSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = window.location.protocol === 'file:' ? 'solar-system.html' : '/solar-system';
    }
  };

  // Toggle More Sheet
  window.toggleMobileMoreSheet = function(forceState) {
    const sheet = document.getElementById('mobile-more-sheet');
    const btn = document.getElementById('mobile-nav-btn-more');
    if (!sheet) return;

    const isCurrentlyOpen = !sheet.classList.contains('hidden');
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      if (typeof window.toggleMobileNavMenu === 'function') {
        window.toggleMobileNavMenu(false);
      }
      sheet.classList.remove('hidden');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    } else {
      sheet.classList.add('hidden');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileBottomNav);
  } else {
    initMobileBottomNav();
  }
})();
