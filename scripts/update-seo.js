import fs from 'fs';
import path from 'path';

function updateFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of transforms) {
    if (typeof search === 'string') {
      if (!content.includes(search)) {
        console.warn(`[WARN] Search string not found in ${path.basename(filePath)}: ${search.slice(0, 40)}...`);
      } else {
        content = content.replace(search, replace);
      }
    } else if (search instanceof RegExp) {
      content = content.replace(search, replace);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[OK] Updated SEO metadata for ${path.basename(filePath)}`);
}

// 1. WEATHER.HTML
updateFile('public/weather.html', [
  [
    /<title>God's Eye — 3D Atmospheric &amp; Meteorological Command \| Live Weather Radar<\/title>/,
    '<title>Weather Radar, Atmosphere &amp; Indian District Farmer Weather | Orbital Eye</title>'
  ],
  [
    /<meta name="title" content="God's Eye — 3D Atmospheric & Meteorological Command \| Live Weather Radar" \/>/,
    '<meta name="title" content="Weather Radar, Atmosphere &amp; Indian District Farmer Weather | Orbital Eye" />'
  ],
  [
    /<meta name="description" content="Explore real-time multi-band Doppler radar mosaics, live precipitation rate analysis, 132 Google Earth cities, active tropical cyclone cones, and NASA FIRMS fire hotspots in full-daylight interactive 3D WebGL." \/>/,
    '<meta name="description" content="Live global Doppler radar mosaics, precipitation rates, active tropical cyclone cones, and 594 verified Indian district boundaries with localized kisan weather forecasts." />'
  ],
  [
    /<link rel="canonical" href="https:\/\/god-s-eye-ah3d\.onrender\.com\/weather" \/>/,
    '<link rel="canonical" href="https://orbitaleye.in/weather" />'
  ],
  [
    /<meta property="og:site_name" content="God's Eye Atmospheric Command" \/>/,
    '<meta property="og:site_name" content="Orbital Eye Weather &amp; Atmosphere" />'
  ],
  [
    /<meta property="og:url" content="https:\/\/god-s-eye-ah3d\.onrender\.com\/weather" \/>/,
    '<meta property="og:url" content="https://orbitaleye.in/weather" />'
  ],
  [
    /<meta property="og:title" content="God's Eye — 3D Atmospheric & Meteorological Command \| Live Weather Radar" \/>/,
    '<meta property="og:title" content="Weather Radar, Atmosphere &amp; Indian District Farmer Weather | Orbital Eye" />'
  ],
  [
    /<meta property="og:description" content="Real-time multi-band Doppler radar mosaics, global precipitation analysis, 132 Google Earth cities, live tropical cyclones, and NASA FIRMS active fire hotspots in full-daylight 3D WebGL." \/>/,
    '<meta property="og:description" content="Real-time multi-band Doppler radar mosaics, active cyclones, and 594 verified Indian district boundaries with localized kisan agricultural forecasts." />'
  ],
  [
    /<meta property="og:image" content="https:\/\/god-s-eye-ah3d\.onrender\.com\/favicon\.ico" \/>/,
    '<meta property="og:image" content="https://orbitaleye.in/icons/icon-512.png" />'
  ],
  [
    /<meta name="twitter:url" content="https:\/\/god-s-eye-ah3d\.onrender\.com\/weather" \/>/,
    '<meta name="twitter:url" content="https://orbitaleye.in/weather" />'
  ],
  [
    /<meta name="twitter:title" content="God's Eye — 3D Atmospheric &amp; Meteorological Command \| Live Weather Radar" \/>/,
    '<meta name="twitter:title" content="Weather Radar, Atmosphere &amp; Indian District Farmer Weather | Orbital Eye" />'
  ],
  [
    /<meta name="twitter:description" content="Global Doppler radar nowcasts, precipitation rates, live tropical storm cones, and Google Earth place names in 3D." \/>/,
    '<meta name="twitter:description" content="Global Doppler radar nowcasts and 594 verified Indian district boundaries with kisan agricultural weather." />'
  ],
  [
    /<meta name="twitter:image" content="https:\/\/god-s-eye-ah3d\.onrender\.com\/favicon\.ico" \/>/,
    '<meta name="twitter:image" content="https://orbitaleye.in/icons/icon-512.png" />'
  ],
  [
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://orbitaleye.in/weather#webapp",
        "name": "Orbital Eye Meteorological & Farmer Weather Engine",
        "url": "https://orbitaleye.in/weather",
        "description": "Interactive 3D WebGL atmosphere and Doppler radar viewer featuring 594 verified Indian district administrative boundaries, agricultural forecasts, and storm tracking.",
        "applicationCategory": "WeatherApplication",
        "operatingSystem": "All modern browsers (WebGL 2.0)",
        "inLanguage": "en"
      },
      {
        "@type": "Dataset",
        "@id": "https://orbitaleye.in/weather#dataset",
        "name": "Indian Administrative District Boundary & NWP Weather Data",
        "description": "594 verified multi-polygon district boundaries for India with Open-Meteo high-resolution NWP forecasts and meteorological alerts.",
        "creator": {
          "@type": "Organization",
          "name": "Orbital Eye Space Observatory"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://orbitaleye.in/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Atmosphere & Kisan District Weather",
            "item": "https://orbitaleye.in/weather"
          }
        ]
      }
    ]
  }
  </script>`
  ],
  [
    /<main class="sr-only">[\s\S]*?<\/main>/,
    `<main class="sr-only">
    <h1>Atmospheric Command, Doppler Radar &amp; Indian District Kisan Weather</h1>
    <p>Orbital Eye Weather Engine integrates real-time global Doppler radar precipitation mosaics, tropical cyclone storm cones, and high-resolution numerical weather prediction (NWP) models into an interactive 3D WebGL atmosphere.</p>

    <section>
      <h2>Available Meteorological Layers &amp; Satellite Feeds</h2>
      <ul>
        <li><strong>RainViewer Doppler Radar Mosaic:</strong> Multi-band radar reflectivity (dBZ) and precipitation rates updated every 10 minutes.</li>
        <li><strong>Active Tropical Cyclones:</strong> Real-time storm tracks, central pressure estimates, wind speeds, and forecast cones from NOAA National Hurricane Center (NHC) and India Meteorological Department (IMD).</li>
        <li><strong>NASA FIRMS Active Fires:</strong> Satellite-detected thermal hotspots from MODIS and VIIRS instruments.</li>
      </ul>
    </section>

    <section>
      <h2>Indian District Boundaries &amp; Farmer Weather System</h2>
      <p>Features 594 verified multi-polygon district boundaries across all 28 States and 7 Union Territories of India, based on Survey of India and Census baselines. Farmers can search any district, view its exact boundary highlight, and access localized Open-Meteo NWP forecasts (temperature, precipitation mm, humidity %, wind, and crop advisories).</p>
      <p><strong>Scientific Limitations:</strong> District forecasts are evaluated at representative district central coordinates. Local agricultural microclimates, taluk terrain variations, and localized showers may cause localized differences.</p>
    </section>

    <nav aria-label="Related Space Observatory Tools">
      <h2>Related Observatory Views</h2>
      <ul>
        <li><a href="/" title="Orbital Eye Space Observatory Home">Orbital Eye Home — Full 3D Solar System simulation</a></li>
        <li><a href="/earth" title="Live Earth Satellites">Live Earth Satellites — LEO/GEO orbits, ISS, and ISRO Cartosat tracking</a></li>
        <li><a href="/asteroids" title="Near-Earth Asteroids">Near-Earth Asteroids — 2,200+ planetary defense asteroid orbits and close approaches</a></li>
        <li><a href="/deepspace" title="Deep Space Missions">Deep Space Missions — JWST, Aditya-L1 halo orbit, and Voyager probes</a></li>
        <li><a href="/orbitalert" title="Satellite Pass Predictions">OrbitAlert — Topocentric pass predictions and NOAA space weather alerts</a></li>
      </ul>
    </nav>
  </main>`
  ]
]);

// 2. ORBITALERT.HTML
updateFile('public/orbitalert.html', [
  [
    /<title>OrbitAlert \/\/ Topocentric Passes, Deep Space Network &amp; Sky Observer<\/title>/,
    '<title>Satellite Pass Predictions &amp; Orbital Event Alerts | Orbital Eye</title>'
  ],
  [
    /<meta name="title" content="OrbitAlert \/\/ Topocentric Satellite Pass Predictions" \/>/,
    '<meta name="title" content="Satellite Pass Predictions &amp; Orbital Event Alerts | Orbital Eye" />'
  ],
  [
    /<meta name="description" content="Calculate high-accuracy satellite visible pass predictions, ISS overhead times, Deep Space Network \(DSN\) carrier lock status, and space weather alerts for Pune, India and any global location\." \/>/,
    '<meta name="description" content="Calculate high-accuracy satellite visible pass predictions, ISS overhead transits with twilight illumination checks, and NOAA solar Kp geomagnetic storm warnings." />'
  ],
  [
    /<link rel="canonical" href="https:\/\/god-s-eye-ah3d\.onrender\.com\/orbitalert" \/>/,
    '<link rel="canonical" href="https://orbitaleye.in/orbitalert" />'
  ],
  [
    /<meta property="og:site_name" content="OrbitAlert Sky Observer" \/>/,
    '<meta property="og:site_name" content="Orbital Eye Space Observatory" />'
  ],
  [
    /<meta property="og:url" content="https:\/\/god-s-eye-ah3d\.onrender\.com\/orbitalert" \/>/,
    '<meta property="og:url" content="https://orbitaleye.in/orbitalert" />'
  ],
  [
    /<meta property="og:title" content="OrbitAlert \/\/ Topocentric Satellite Passes &amp; DSN Ground Locks" \/>/,
    '<meta property="og:title" content="Satellite Pass Predictions &amp; Orbital Event Alerts | Orbital Eye" />'
  ],
  [
    /<meta property="og:description" content="Precision topocentric pass calculations for ISS, Cartosat, Tiangong, and Starlink with Deep Space Network tracking and space weather alerts\." \/>/,
    '<meta property="og:description" content="Precision topocentric pass calculations for ISS, Cartosat, Tiangong, and Starlink with twilight visibility and NOAA space weather alerts." />'
  ],
  [
    /<meta property="og:image" content="https:\/\/god-s-eye-ah3d\.onrender\.com\/favicon\.ico" \/>/,
    '<meta property="og:image" content="https://orbitaleye.in/icons/icon-512.png" />'
  ],
  [
    /<meta name="twitter:url" content="https:\/\/god-s-eye-ah3d\.onrender\.com\/orbitalert" \/>/,
    '<meta name="twitter:url" content="https://orbitaleye.in/orbitalert" />'
  ],
  [
    /<meta name="twitter:title" content="OrbitAlert \/\/ Satellite Passes &amp; Sky Observer" \/>/,
    '<meta name="twitter:title" content="Satellite Pass Predictions &amp; Orbital Event Alerts | Orbital Eye" />'
  ],
  [
    /<meta name="twitter:description" content="Calculate satellite passes, ISS transits, and space weather alerts for any coordinate\." \/>/,
    '<meta name="twitter:description" content="Calculate satellite passes, ISS transits, and space weather alerts for any coordinate on Earth." />'
  ],
  [
    /<meta name="twitter:image" content="https:\/\/god-s-eye-ah3d\.onrender\.com\/favicon\.ico" \/>/,
    '<meta name="twitter:image" content="https://orbitaleye.in/icons/icon-512.png" />'
  ],
  [
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://orbitaleye.in/orbitalert#webapp",
        "name": "Orbital Eye Pass Predictions & Space Weather",
        "url": "https://orbitaleye.in/orbitalert",
        "description": "Astronomical topocentric satellite pass prediction calculator, ISS twilight transit estimator, and NOAA SWPC geomagnetic space weather monitor.",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "All modern browsers (WebGL 2.0)",
        "inLanguage": "en"
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://orbitaleye.in/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Orbital Alerts & Pass Predictions",
            "item": "https://orbitaleye.in/orbitalert"
          }
        ]
      }
    ]
  }
  </script>`
  ],
  [
    /<main class="sr-only">[\s\S]*?<\/main>/,
    `<main class="sr-only">
    <h1>Satellite Pass Predictions, Space Weather Alerts &amp; Sky Observer Deck</h1>
    <p>OrbitAlert calculates observer-specific topocentric satellite passes over 48-hour forward windows for any global latitude and longitude. Telemetry includes Acquisition of Signal (AOS), Time of Closest Approach (TCA), Loss of Signal (LOS), azimuth compass bearings, and maximum elevation angles.</p>

    <section>
      <h2>Optical Visibility &amp; Earth Shadow Science</h2>
      <p>True optical visibility requires two independent astronomical conditions: the ground observer must be in darkness (sun elevation &lt; -6° civil twilight) AND the spacecraft must be directly illuminated by sunlight outside the cylindrical Earth shadow (umbra). Satellites in eclipse are flagged as invisible to the naked eye.</p>
    </section>

    <section>
      <h2>Official NOAA Space Weather &amp; Re-entry Alerts</h2>
      <p>Ingests real-time solar wind velocities, planetary Kp indices, and geomagnetic storm scales (G0 Nominal through G5 Extreme) from the NOAA Space Weather Prediction Center (SWPC). Conjunction proximity screening and decaying orbit re-entry notifications are provided for educational and situational awareness purposes.</p>
    </section>

    <nav aria-label="Related Space Observatory Tools">
      <h2>Related Observatory Views</h2>
      <ul>
        <li><a href="/" title="Orbital Eye Space Observatory Home">Orbital Eye Home — Interactive 3D Solar System simulation</a></li>
        <li><a href="/earth" title="Live Earth Satellites">Live Earth Satellites — Real-time 3D SGP4 tracking of ISS and Cartosat</a></li>
        <li><a href="/weather" title="Atmosphere and Weather Radar">Atmosphere &amp; Weather — Live Doppler radar mosaics and Indian district kisan forecasts</a></li>
        <li><a href="/asteroids" title="Near-Earth Asteroids">Near-Earth Asteroids — 2,200+ planetary defense asteroid orbits</a></li>
        <li><a href="/deepspace" title="Deep Space Missions">Deep Space Missions — JWST, Aditya-L1 halo orbit, and Voyager probes</a></li>
      </ul>
    </nav>
  </main>`
  ]
]);

console.log('Finished updating SEO across public files!');
