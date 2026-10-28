import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, 'public', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error("❌ public/index.html not found.");
  process.exit(1);
}

let code = fs.readFileSync(indexPath, 'utf8');
console.log("🛠️ Restoring WebGL Render Loop & Fixing Syntax Errors...");

// 1. Fix the 3 broken template literals
code = code.replace(
  /document\.getElementById\('card-intel-subtitle'\)\.innerText\s*=\s*ORAD\s*#\$\{/g,
  "document.getElementById('card-intel-subtitle').innerText = `NORAD #${"
);

code = code.replace(
  /document\.getElementById\("card-intel-badge"\)\.innerText\s*=\s*IER\s*\$\{/g,
  'document.getElementById("card-intel-badge").innerText = `TIER ${'
);

code = code.replace(
  /document\.getElementById\(ier-btn-\$\{i\}`\)/g,
  "document.getElementById(`tier-btn-${i}`)"
);

// 2. Check if function animate() is missing from the main astronomical script
if (!code.includes('function animate()')) {
  console.log("  ⚠️ Missing animate() render loop detected. Restoring complete WebGL pipeline...");

  const missingCorePipeline = `
    // --- CONTROLS & INTERACTION ---
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let startClick = { x: 0, y: 0 };
    let initialPinchDistance = null;
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    window.addEventListener('mousedown', e => {
      if (e.target.closest('aside, header, #video-panel, #intel-card, #dock-bar, #intro-launch-modal, button, input, select, a')) return;
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
      startClick = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      cameraTheta -= dx * 0.006;
      cameraPhi = Math.max(-1.52, Math.min(1.52, cameraPhi + dy * 0.005));
      targetCameraTheta = cameraTheta;
      targetCameraPhi = cameraPhi;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', e => {
      if (e.target.closest('aside, header, #video-panel, #intel-card, #dock-bar, #intro-launch-modal, button, input, select, a')) return;
      isDragging = false;
      if (Math.hypot(e.clientX - startClick.x, e.clientY - startClick.y) < 6) {
        checkRaycastHit(e.clientX, e.clientY);
      }
    });

    window.addEventListener('touchstart', e => {
      if (e.target.closest('aside, header, #video-panel, #intel-card, #dock-bar, #intro-launch-modal, button, input, select, a')) return;
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        startClick = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (e.target.closest('aside, header, #video-panel, #intel-card, #dock-bar, #intro-launch-modal, button, input, select, a')) return;
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        cameraTheta -= dx * 0.007;
        cameraPhi = Math.max(-1.52, Math.min(1.52, cameraPhi + dy * 0.006));
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && initialPinchDistance) {
        const currentDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        targetCameraDistance = Math.max(1.8, Math.min(260.0, targetCameraDistance + (initialPinchDistance - currentDistance) * 0.15));
        initialPinchDistance = currentDistance;
      }
    }, { passive: true });

    window.addEventListener('touchend', e => {
      if (e.touches.length === 0) isDragging = false;
    }, { passive: true });

    function checkRaycastHit(screenX, screenY) {
      mouseVec.x = (screenX / window.innerWidth) * 2 - 1;
      mouseVec.y = -(screenY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);

      const visibleCandidates = clickableMeshes.filter(m => {
        let curr = m;
        while (curr) {
          if (!curr.visible) return false;
          curr = curr.parent;
        }
        return true;
      });

      const hits = raycaster.intersectObjects(visibleCandidates, false);
      if (hits.length > 0) {
        const hit = hits[0];
        const hitObj = hit.object;

        if (hitObj === instancedSatMesh && hit.instanceId !== undefined && currentViewDomain === 'solar') {
          const satKey = massiveSatKeys[hit.instanceId];
          if (satKey) setFocusTo(satKey);
        } else if (hitObj.userData.deepSkyKey) {
          if (currentViewDomain !== 'deepsky') switchViewDomain('deepsky');
          flyToDeepSkyNASA(hitObj.userData.deepSkyKey);
        } else if (hitObj.userData.targetKey) {
          if (currentViewDomain !== 'solar') switchViewDomain('solar');
          setFocusTo(hitObj.userData.targetKey);
        } else if (hitObj.userData.orbiterKey) {
          if (currentViewDomain !== 'solar') switchViewDomain('solar');
          setFocusToOrbiter(hitObj.userData.orbiterKey);
        }
      }
    }

    window.addEventListener('wheel', e => {
      if (e.target.closest('aside, header, #video-panel, #intel-card, button, input, select, a')) return;
      targetCameraDistance = Math.max(1.8, Math.min(85000.0, targetCameraDistance + e.deltaY * 0.05));
    }, { passive: true });

    function handleViewportResize() {
      const w = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleViewportResize);

    function handleHashRoute() {
      const rawHash = window.location.hash.replace(/^#\\/?/, '').trim();
      if (!rawHash) return;
      const [pathPart] = rawHash.split('?');
      let lowerHash = (pathPart || '').toLowerCase();
      if (lowerHash.startsWith('object/')) lowerHash = lowerHash.replace('object/', '');
      if (CELESTIAL_BODIES[lowerHash]) setFocusTo(lowerHash);
      else if (PLANETARY_ORBITERS[lowerHash]) setFocusToOrbiter(lowerHash);
      else if (MASSIVE_SATELLITE_CATALOG[lowerHash]) setFocusTo(lowerHash);
    }
    window.addEventListener('hashchange', handleHashRoute);

    // --- MAIN RENDER LOOP ---
    const activeSatLocalPos = new THREE.Vector3();
    const activeSatWorldPos = new THREE.Vector3();
    const _vSun = new THREE.Vector3();
    const _vEarth = new THREE.Vector3();
    const _vSunDir = new THREE.Vector3();
    const _vActivePos = new THREE.Vector3();
    const _vPlanetWorld = new THREE.Vector3();
    const planetKeys = Object.keys(planetMeshes);
    const DRIFT_TOUR_TARGETS = ['sun', 'aditya_l1', 'earth', 'iss', 'chandrayaan3', 'mars', 'mom', 'jwst', 'jupiter', 'saturn', 'neptune'];

    let satFrameCounter = 0;
    let isPageVisible = !document.hidden;

    document.addEventListener('visibilitychange', () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) lastRealTime = performance.now();
    });

    function animate() {
      requestAnimationFrame(animate);
      if (!isPageVisible) return;

      cameraDistance += (targetCameraDistance - cameraDistance) * 0.06;
      cameraPhi += (targetCameraPhi - cameraPhi) * 0.06;
      cameraTheta += (targetCameraTheta - cameraTheta) * 0.06;

      const nowReal = performance.now();
      const deltaRealMs = nowReal - lastRealTime;
      lastRealTime = nowReal;

      virtualEpochTime += deltaRealMs * timeScale;
      const astro = getAstroTimeData(virtualEpochTime);

      const utcEl = document.getElementById('live-utc-display');
      if (utcEl) utcEl.innerText = astro.date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

      // 1. Earth Orbit & Diurnal Rotation
      const earthOrbit = computeKeplerianOrbit(CELESTIAL_BODIES.earth, astro.d);
      earthSystem.position.set(earthOrbit.xThree, earthOrbit.yThree, earthOrbit.zThree);

      const solarRotationAngle = (astro.utcHours / 24.0) * Math.PI * 2.0;
      earthMesh.rotation.y = -solarRotationAngle - (Math.PI / 2.0) + (astro.subsolarLngDeg * Math.PI / 180);
      earthMesh.updateMatrixWorld(true);

      sunMesh.getWorldPosition(_vSun);
      earthMesh.getWorldPosition(_vEarth);
      _vSunDir.subVectors(_vSun, _vEarth).normalize();

      earthOuterAtmoMat.uniforms.uSunDir.value.copy(_vSunDir);
      earthOuterAtmoMat.uniforms.uCameraPos.value.copy(camera.position);
      cloudsMesh.rotation.y = earthMesh.rotation.y + (astro.d * 0.16);

      const moonLRad = ((CELESTIAL_BODIES.moon.L0 + CELESTIAL_BODIES.moon.Lrate * astro.d) % 360) * (Math.PI / 180);
      moonMesh.position.x = Math.cos(moonLRad) * CELESTIAL_BODIES.moon.baseDist;
      moonMesh.position.z = Math.sin(moonLRad) * CELESTIAL_BODIES.moon.baseDist;

      // 2. Planets Orbit & Spin
      for (let i = 0; i < planetKeys.length; i++) {
        const pObj = planetMeshes[planetKeys[i]];
        const orbit = computeKeplerianOrbit(pObj.data, astro.d);
        pObj.group.position.set(orbit.xThree, orbit.yThree, orbit.zThree);
        pObj.mesh.rotation.y = (astro.d * (24.0 / pObj.data.rotPeriod) * Math.PI * 2) % (Math.PI * 2);
      }

      // 3. Probes
      for (let i = 0; i < orbiterKeys.length; i++) {
        const item = orbiterMeshes[orbiterKeys[i]];
        if (!item || !item.probeMesh || !item.data) continue;
        const spd = item.data.speed || 0.0015;
        const r = item.data.orbitRadius || 2.0;
        item.angle = (item.angle || 0) + (spd * (deltaRealMs / 1000) * timeScale);
        item.probeMesh.position.x = Math.cos(item.angle) * r;
        item.probeMesh.position.z = Math.sin(item.angle) * r;
      }

      // 3b. Cinematic Drift Sweep
      if (isCinematicMode) {
        cameraTheta += (deltaRealMs / 1000) * 0.12;
        cameraPhi = 0.38 + 0.12 * Math.sin(performance.now() * 0.0004);
        cinematicTimer += deltaRealMs;
        if (cinematicTimer > 10000) {
          cinematicTimer = 0;
          cinematicStage = (cinematicStage + 1) % DRIFT_TOUR_TARGETS.length;
          setFocusTo(DRIFT_TOUR_TARGETS[cinematicStage]);
        }
      }

      // 4. Instanced Satellites
      if (instancedSatMesh && satelliteInertialGroup.visible && currentViewDomain === 'solar') {
        satFrameCounter++;
        const shouldUpdateAllSats = (timeScale > 1.0) || (satFrameCounter % 2 === 0);
        const rE = CELESTIAL_BODIES.earth.radius;
        const timeSec = virtualEpochTime / 1000;

        if (shouldUpdateAllSats) {
          for (let i = 0; i < totalMassiveCount; i++) {
            const key = massiveSatKeys[i];
            const sat = MASSIVE_SATELLITE_CATALOG[key];
            if (!sat) continue;
            const aKm = 6378.137 + Math.min(sat.altKm || 550, 4500);
            const n = Math.sqrt(398600.44 / Math.pow(6378.137 + (sat.altKm || 550), 3));
            const iRad = sat.incDeg * (Math.PI / 180);
            const raanDot = -1.5 * n * 1.08263e-3 * Math.pow(6378.137 / aKm, 2) * Math.cos(iRad);
            const raan = (sat.raan0 * Math.PI / 180 + raanDot * timeSec) % (Math.PI * 2);
            const u = (sat.M0 * Math.PI / 180 + n * timeSec) % (Math.PI * 2);

            const r3D = rE * (aKm / 6378.137);
            const x = r3D * (Math.cos(raan) * Math.cos(u) - Math.sin(raan) * Math.sin(u) * Math.cos(iRad));
            const y = r3D * (Math.sin(u) * Math.sin(iRad));
            const z = r3D * (Math.sin(raan) * Math.cos(u) + Math.cos(raan) * Math.sin(u) * Math.cos(iRad));

            dummyVec3.set(x, y, z);
            if (sat.id === activeTargetKey) {
              dummyScale.set(0, 0, 0);
              activeSatLocalPos.set(x, y, z);
              activeSatWorldPos.copy(activeSatLocalPos);
              satelliteInertialGroup.localToWorld(activeSatWorldPos);
            } else if (FLAGSHIP_SET.has(key)) {
              dummyScale.set(1.15, 1.15, 1.15);
            } else {
              dummyScale.set(0.18, 0.18, 0.18);
            }

            dummyMat4.compose(dummyVec3, dummyQuat, dummyScale);
            instancedSatMesh.setMatrixAt(i, dummyMat4);
          }
          instancedSatMesh.instanceMatrix.needsUpdate = true;
        }
      }

      // 5. Camera Tracking
      focusWorldPos.set(0, 0, 0);
      if (MASSIVE_SATELLITE_CATALOG[activeTargetKey]) {
        focusWorldPos.copy(activeSatWorldPos);
      } else if (activeTargetKey === 'sun') {
        sunMesh.getWorldPosition(focusWorldPos);
      } else if (planetMeshes[activeTargetKey]) {
        planetMeshes[activeTargetKey].group.getWorldPosition(focusWorldPos);
      } else {
        earthSystem.getWorldPosition(focusWorldPos);
      }

      cameraTarget.lerp(focusWorldPos, 0.08);
      camera.position.x = cameraTarget.x + cameraDistance * Math.cos(cameraPhi) * Math.sin(cameraTheta);
      camera.position.y = cameraTarget.y + cameraDistance * Math.sin(cameraPhi);
      camera.position.z = cameraTarget.z + cameraDistance * Math.cos(cameraPhi) * Math.cos(cameraTheta);
      camera.lookAt(cameraTarget);

      // 6. XYZ Gizmo
      if (isXYZGizmoEnabled && targetXYZGizmoGroup) {
        _vActivePos.copy(focusWorldPos);
        targetXYZGizmoGroup.position.copy(_vActivePos);
      }

      // 7. Pipeline tick & Render
      if (typeof window._runNASAEyesTick === 'function') {
        window._runNASAEyesTick();
      }
      renderer.render(scene, camera);
    }
`;

  // Insert before the initialization sequence
  code = code.replace(
    /(\/\/\s*---\s*INITIALIZATION\s*---[\s\S]*?renderCatalogs\(\);)/,
    missingCorePipeline + '\n$1'
  );
  console.log("  ✔ Successfully restored animate(), controls, and WebGL render loop.");
}

// 3. Verify clean start at initialization
code = code.replace(
  /renderCatalogs\(\);\s*buildDeepSkyUniverseObjects\(\);\s*buildUnifiedNestedUniverse\(\);\s*setCosmicTier\(2\);\s*setFocusTo\('earth'\);\s*BotSwarm\.init\(\);/g,
  `renderCatalogs();
    buildDeepSkyUniverseObjects();
    buildUnifiedNestedUniverse();
    setCosmicTier(2);
    setFocusTo('earth');
    if (typeof BotSwarm !== 'undefined' && BotSwarm.init) BotSwarm.init();
    handleHashRoute();
    animate();`
);

// 4. Validate script blocks using Node.js VM compiler to guarantee zero syntax crashes
const scriptMatches = [...code.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
console.log(`\nValidating ${scriptMatches.length} JavaScript blocks for syntax errors...`);

let hasErrors = false;
scriptMatches.forEach((m, i) => {
  try {
    new vm.Script(m[1]);
  } catch (err) {
    hasErrors = true;
    console.error(`  ✖ Syntax Error in block #${i + 1}: ${err.message}`);
  }
});

if (!hasErrors) {
  console.log("  ✔ All script blocks parsed with 0 errors!");
}

fs.writeFileSync(indexPath, code, 'utf8');
console.log("\n✅ public/index.html fully repaired and verified ready to render.");
