// Qaz Climate Lab v2 — 3D макет: Азат мектебі, күн панельдері, жел қондырғылары, Күннің тәуліктік жолы.
// Physics: sun position for φ = 52° N on 22 June / 22 December; panel output ∝ cos(incidence).
// Renders on demand only (no endless loop — interactive boards flicker); stops 12 s after the last action.
const ASSET = "/lab3d/";
const V = "?v=1";

export async function mount(host, api) {
  let T;
  try {
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") || c.getContext("webgl"))) throw new Error("no webgl");
    T = await import("./vendor/three-lab-v1.js");
  } catch (e) {
    host.innerHTML = '<div class="note" style="padding:1rem">3D көрініс бұл құрылғыда қолжетімсіз — есептеу кестесі арқылы жалғастыр.</div>';
    return null;
  }
  const PHI = (api.lat ?? 52) * Math.PI / 180;
  const W = () => host.clientWidth, H = () => host.clientHeight;

  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.outputColorSpace = T.SRGBColorSpace;
  host.innerHTML = "";
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.setAttribute("aria-label", "Азат мектебінің 3D макеті");

  const scene = new T.Scene();
  const sky = { summer: new T.Color("#cfe3ef"), winter: new T.Color("#dfe5ea"), night: new T.Color("#2a3644") };
  scene.background = sky.summer.clone();
  scene.fog = new T.Fog(scene.background, 70, 150);

  const camera = new T.PerspectiveCamera(38, W() / H(), 0.5, 400);
  camera.position.set(34, 22, 40);
  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.enablePan = false;
  controls.minDistance = 22; controls.maxDistance = 80;
  controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.38;
  controls.addEventListener("change", () => kick());

  // light
  const hemi = new T.HemisphereLight("#eef6ff", "#8a7f5a", 0.9);
  scene.add(hemi);
  const sun = new T.DirectionalLight("#fff4de", 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 160 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  const sunBall = new T.Mesh(new T.SphereGeometry(2.2, 24, 16), new T.MeshBasicMaterial({ color: "#ffd56b", fog: false }));
  scene.add(sunBall);
  const arcLine = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({ color: "#d9971b", dashSize: 1.2, gapSize: 0.8, fog: false }));
  scene.add(arcLine);

  // ground: steppe disc + compass letters
  const groundMat = new T.MeshStandardMaterial({ color: "#c7c08a", roughness: 1 });
  const ground = new T.Mesh(new T.CircleGeometry(95, 72), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const yard = new T.Mesh(new T.PlaneGeometry(30, 22), new T.MeshStandardMaterial({ color: "#b9b39b", roughness: 1 }));
  yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.02, -2); yard.receiveShadow = true; scene.add(yard);
  const label = (txt, x, z, col = "#1c2321") => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const g = cv.getContext("2d"); g.font = "bold 84px Segoe UI, Arial"; g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 64, 70);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), depthWrite: false }));
    s.position.set(x, 1.6, z); s.scale.set(3.2, 3.2, 1); scene.add(s); return s;
  };
  label("С", 0, -44); label("О", 0, 44, "#b0420f"); label("Ш", 44, 0); label("Б", -44, 0);

  // GLB props (Meshy)
  const loader = new T.GLTFLoader();
  loader.setMeshoptDecoder(T.MeshoptDecoder);
  const fit = (obj, size, axis = "x") => {
    const b = new T.Box3().setFromObject(obj), s = new T.Vector3(); b.getSize(s);
    const k = size / (axis === "y" ? s.y : Math.max(s.x, s.z)); obj.scale.multiplyScalar(k);
    const b2 = new T.Box3().setFromObject(obj), c = new T.Vector3(); b2.getCenter(c);
    obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
    const g = new T.Group(); g.add(obj); return g;
  };
  const shadowAll = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const load = (name) => new Promise((res) => loader.load(ASSET + name + ".glb" + V, (g) => res(g.scene), undefined, () => res(null)));
  const place = (src, size, axis, x, z, ry = 0) => {
    if (!src) return null; const g = fit(src.clone(true), size, axis); g.position.set(x, 0, z); g.rotation.y = ry; shadowAll(g); scene.add(g); return g;
  };
  Promise.all(["village-school", "village-house", "birch-tree", "stevenson-screen", "weather-vane"].map(load)).then(([school, house, birch, screen, vane]) => {
    if (school) place(school, 16, "x", 0, -6, 0);
    else { const b = new T.Mesh(new T.BoxGeometry(16, 6, 8), new T.MeshStandardMaterial({ color: "#e8e1cf" })); b.position.set(0, 3, -6); shadowAll(b); scene.add(b); }
    [[-30, -20, 0.4], [-20, -30, 0.1], [26, -26, -0.5], [34, -12, -1.2]].forEach(([x, z, r]) => place(house, 7, "x", x, z, r));
    [[-12, -16], [-15, -12], [12, -17], [16, -13], [-36, 4], [38, 18], [-8, 26], [24, 30]].forEach(([x, z], i) => place(birch, 6 + (i % 3), "y", x, z, i));
    place(screen, 2.2, "y", 15, 4, -0.3); place(vane, 4, "y", 17.5, 6.5, 0);
    kick();
  });

  // procedural PV array (each block = 5 kW) and 10 kW turbines
  const pvGroup = new T.Group(); scene.add(pvGroup);
  const wtGroup = new T.Group(); scene.add(wtGroup);
  const panelMat = new T.MeshStandardMaterial({ color: "#1d3557", roughness: 0.35, metalness: 0.3 });
  const frameMat = new T.MeshStandardMaterial({ color: "#c9ced3", roughness: 0.5, metalness: 0.6 });
  const TILT = 45 * Math.PI / 180; // fixed tilt, facing south (+z)
  const panelNormal = new T.Vector3(0, Math.cos(TILT), Math.sin(TILT));
  function pvBlock() {
    const g = new T.Group();
    const top = new T.Group(); top.rotation.x = TILT; top.position.y = 1.4; g.add(top);
    const p = new T.Mesh(new T.BoxGeometry(4.6, 0.08, 2.2), panelMat); top.add(p);
    for (let i = -1; i <= 1; i++) { const l = new T.Mesh(new T.BoxGeometry(0.03, 0.09, 2.2), frameMat); l.position.x = i * 1.53; top.add(l); }
    [[-2, -0.6, 2.1], [2, -0.6, 2.1], [-2, 0.6, 0.7], [2, 0.6, 0.7]].forEach(([x, z, h]) => { const leg = new T.Mesh(new T.BoxGeometry(0.1, h, 0.1), frameMat); leg.position.set(x, h / 2, z); g.add(leg); });
    shadowAll(g); return g;
  }
  const bladeGeo = new T.BoxGeometry(0.28, 4.2, 0.08); bladeGeo.translate(0, 2.1, 0);
  const white = new T.MeshStandardMaterial({ color: "#f4f5f2", roughness: 0.45 });
  const rotors = [];
  function turbine() {
    const g = new T.Group();
    const tower = new T.Mesh(new T.CylinderGeometry(0.18, 0.32, 12, 14), white); tower.position.y = 6; g.add(tower);
    const nac = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 1.8), white); nac.position.set(0, 12.2, 0); g.add(nac);
    const rotor = new T.Group(); rotor.position.set(0, 12.2, 1.0); g.add(rotor);
    const hub = new T.Mesh(new T.SphereGeometry(0.36, 14, 10), white); rotor.add(hub);
    for (let i = 0; i < 3; i++) { const b = new T.Mesh(bladeGeo, white); b.rotation.z = i * 2 * Math.PI / 3; rotor.add(b); }
    shadowAll(g); rotors.push(rotor); return g;
  }
  function rebuild() {
    const s = api.get();
    pvGroup.clear(); rotors.length = 0; wtGroup.clear();
    const blocks = Math.round(s.pv / 5);
    for (let i = 0; i < blocks; i++) { const b = pvBlock(); b.position.set(-11 + (i % 6) * 5.2, 0, 9 + Math.floor(i / 6) * 4.6); pvGroup.add(b); }
    for (let i = 0; i < s.wt; i++) { const t = turbine(); t.position.set(-30 + (i % 3) * 7, 0, 14 + Math.floor(i / 3) * 9); t.rotation.y = 0.35; wtGroup.add(t); }
    kick();
  }

  // sun path
  let season = "summer", hour = 12;
  const R = 60;
  const decl = () => (season === "summer" ? 23.44 : -23.44) * Math.PI / 180;
  function sunDir(h) {
    const d = decl(), Hh = (h - 12) * 15 * Math.PI / 180;
    const east = -Math.cos(d) * Math.sin(Hh);
    const north = Math.sin(d) * Math.cos(PHI) - Math.cos(d) * Math.cos(Hh) * Math.sin(PHI);
    const up = Math.sin(d) * Math.sin(PHI) + Math.cos(d) * Math.cos(Hh) * Math.cos(PHI);
    return new T.Vector3(east, up, -north).normalize();
  }
  const dayHalf = () => Math.acos(Math.max(-1, Math.min(1, -Math.tan(PHI) * Math.tan(decl())))) * 12 / Math.PI; // hours from noon to sunset
  function drawArc() {
    const hh = dayHalf(), pts = [];
    for (let i = 0; i <= 48; i++) { const h = 12 - hh + (2 * hh * i) / 48; pts.push(sunDir(h).multiplyScalar(R)); }
    arcLine.geometry.dispose(); arcLine.geometry = new T.BufferGeometry().setFromPoints(pts); arcLine.computeLineDistances();
  }
  function applySun() {
    const d = sunDir(hour), alt = Math.asin(d.y);
    const up = alt > 0;
    sunBall.position.copy(d).multiplyScalar(R); sunBall.visible = up;
    sun.position.copy(d).multiplyScalar(80); sun.intensity = up ? 0.6 + 2.0 * Math.min(1, Math.sin(alt) * 1.6) : 0;
    const base = season === "summer" ? sky.summer : sky.winter;
    const k = up ? Math.min(1, Math.sin(alt) * 3) : 0;
    scene.background.copy(sky.night).lerp(base, 0.25 + 0.75 * k); scene.fog.color.copy(scene.background);
    hemi.intensity = 0.35 + 0.6 * k;
    groundMat.color.set(season === "summer" ? "#c7c08a" : "#eef1f3");
    const pvNow = up ? Math.max(0, d.dot(panelNormal)) : 0;
    api.hud({
      season, hour,
      noonAlt: 90 - Math.abs(52 - (season === "summer" ? 23.44 : -23.44)),
      alt: Math.max(0, alt * 180 / Math.PI),
      dayLen: 2 * dayHalf(),
      pv: Math.round(pvNow * 100),
      rpm: Math.round(windRpm()),
    });
  }
  const windRpm = () => { const w = api.get().wind * (season === "summer" ? 0.85 : 1.15); return w < 3 ? 0 : Math.min(160, (w - 2.5) * 32); };

  // on-demand loop
  let raf = 0, lastKick = 0, playing = false, playT0 = 0, last = 0;
  function kick() { lastKick = performance.now(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (playing) {
      const hh = dayHalf(), dur = 9000, p = Math.min(1, (t - playT0) / dur);
      hour = 12 - hh - 0.4 + (2 * hh + 0.8) * p; applySun();
      if (p >= 1) { playing = false; hour = 12; applySun(); api.played && api.played(); }
    }
    const rpm = windRpm(); rotors.forEach((r) => (r.rotation.z -= (rpm / 60) * 2 * Math.PI * dt));
    controls.update();
    renderer.render(scene, camera);
    if (playing || t - lastKick < 12000) raf = requestAnimationFrame(frame); else raf = 0;
  }
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); kick(); });
  ro.observe(host);

  // intro fly-in
  const from = new T.Vector3(60, 40, 70), to = camera.position.clone(); camera.position.copy(from);
  const t0 = performance.now();
  (function fly() { const p = Math.min(1, (performance.now() - t0) / 1800), e = 1 - Math.pow(1 - p, 3); camera.position.lerpVectors(from, to, e); kick(); if (p < 1) requestAnimationFrame(fly); })();

  drawArc(); rebuild(); applySun();
  return {
    update: rebuild,
    setSeason(s) { season = s; drawArc(); if (!playing) hour = 12; applySun(); kick(); },
    play() { playing = true; playT0 = performance.now(); kick(); },
    setHour(h) { playing = false; hour = h; applySun(); kick(); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); },
  };
}
