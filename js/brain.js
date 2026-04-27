/* =========================================================================
   brain.js — embeddable "neural brain" visual
   Usage:
     import { initBrain } from './js/brain.js';
     initBrain(document.getElementById('brainCanvas'));
   ========================================================================= */

import * as THREE from 'three';

const DEFAULT_CFG = {
  interiorNodes: 130,
  interiorK: 3,
  bridgeCount: 1,
  surfaceNodes: 240,
  surfaceK: 2,
  pulses: 12,
  pulseSpeed: 1.0,
  rotateSpeed: 0.2,
  subdiv: 6,
  // camera
  fov: 36,
  camZ: 6.2,
};

const COL = {
  shellCream:    0xF7EFE5,
  shellAmber:    0xC99A68,
  neuronA:       0xFFF3DB, // cream-white
  neuronB:       0xE6C37F, // gold
  neuronC:       0xD6A58A, // soft terracotta
  pulseHead:     0xFFF2D0,
  pulseTrailHot: [1.0, 0.86, 0.56],
  pulseTrailMid: [0.78, 0.48, 0.30],
};

// ---------- noise & brain shape ----------
function noise3(x, y, z) {
  return (
    Math.sin(x * 1.7 + y * 2.3 + 1.1) +
    Math.sin(y * 2.1 + z * 1.9 + 2.7) +
    Math.sin(z * 2.5 + x * 1.3 + 4.4) +
    Math.sin((x + y + z) * 3.3 + 0.6) * 0.5
  ) / 3.5;
}

function shellPosition(dir) {
  // Brain-like proportions: wider (X) and longer (Z) than tall (Y).
  // Slight forward bulge for the frontal lobe; gentle squash on the bottom.
  const baseX = 1.30;
  const baseY = 0.84;
  const baseZ = 1.46;
  const p = new THREE.Vector3(dir.x * baseX, dir.y * baseY, dir.z * baseZ);

  // Frontal lobe: round out front (positive Z) slightly more
  const frontal = Math.max(0, p.z) * 0.06;
  p.z += frontal;

  // Smooth, low-frequency surface folds. High-frequency layers are kept
  // very small so the icosphere doesn't sprout spiky vertex peaks.
  const n1 = noise3(p.x * 2.0, p.y * 2.0, p.z * 2.0) * 0.055;
  const n2 = noise3(p.x * 4.6 + 10, p.y * 4.6, p.z * 4.6 - 3) * 0.014;
  const n3 = noise3(p.x * 8.5 - 2, p.y * 8.5 + 5, p.z * 8.5) * 0.004;

  // Attenuate folds near the top so the crown stays smooth and dome-like.
  // (this is what was causing the pyramidal peaks)
  const topAtten = 1 - Math.max(0, Math.min(1, (p.y - 0.30) / 0.55)) * 0.95;
  const folds = (n1 + n2 + n3) * topAtten;

  // Central longitudinal fissure between the two hemispheres
  const topWeight = Math.max(0, (p.y + 0.05) * 1.15);
  const fissure = Math.exp(-Math.pow(p.x / 0.07, 2)) * topWeight * 0.10;

  // Subtle lateral depression along the temporal sides
  const latSide = Math.abs(p.x) > 0.6 ? 1 : 0;
  const lateral = Math.exp(-Math.pow((p.y - 0.0) / 0.14, 2)) * latSide * 0.035;

  // Cerebellum-like bulge at the lower-back
  const dxC = p.x, dyC = p.y + 0.42, dzC = p.z + 0.55;
  const cer = 0.10 * Math.exp(-(dxC * dxC * 5.0 + dyC * dyC * 7 + dzC * dzC * 7));

  // Tuck under the brain at the lower-front (orbital plane)
  const bottomFront = Math.max(0, -p.y - 0.38) * Math.max(0, p.z - 0.35) * 0.10;

  const disp = folds - fissure - lateral + cer - bottomFront;
  p.addScaledVector(dir, disp);
  return p;
}

function fibSphere(n) {
  const pts = [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return pts;
}

function makeGlowTexture(hex) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const r = (hex >> 16) & 0xff, gc = (hex >> 8) & 0xff, b = hex & 0xff;
  grd.addColorStop(0.0, `rgba(${r},${gc},${b},1)`);
  grd.addColorStop(0.35, `rgba(${r},${gc},${b},0.4)`);
  grd.addColorStop(1.0, `rgba(${r},${gc},${b},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Initialise the brain scene inside the given container element.
 * Returns a dispose() function.
 */
export function initBrain(container, opts = {}) {
  if (!container) throw new Error('initBrain: container required');
  const cfg = { ...DEFAULT_CFG, ...opts };

  // sizing
  const getSize = () => {
    const r = container.getBoundingClientRect();
    return { w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) };
  };

  // renderer
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    container.setAttribute('data-brain-failed', 'true');
    throw e;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const { w: initW, h: initH } = getSize();
  renderer.setSize(initW, initH);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  // scene + camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(cfg.fov, initW / initH, 0.1, 100);
  camera.position.set(0, 0.35, cfg.camZ);
  camera.lookAt(0, 0, 0);

  // root (rotates) — brain only, no head silhouette
  const root = new THREE.Group();
  scene.add(root);

  // ----- brain shell mesh -----
  const shellGeo = new THREE.IcosahedronGeometry(1, cfg.subdiv);
  {
    const pos = shellGeo.attributes.position;
    const dir = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const p = shellPosition(dir);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    shellGeo.computeVertexNormals();
  }

  root.add(new THREE.Mesh(shellGeo, new THREE.MeshBasicMaterial({
    color: COL.shellCream,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })));

  root.add(new THREE.Mesh(shellGeo, new THREE.MeshBasicMaterial({
    color: COL.shellAmber,
    wireframe: true,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  })));

  // ----- interior neurons -----
  const glowTex = makeGlowTexture(0xffffff);
  const interiorPositions = [];
  for (let i = 0; i < cfg.interiorNodes; i++) {
    const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    const shellP = shellPosition(dir);
    const t = 0.12 + Math.random() * 0.78;
    interiorPositions.push(shellP.multiplyScalar(t));
  }

  const neuronColors = [COL.neuronA, COL.neuronB, COL.neuronC];
  const neuronSprites = [];
  for (let i = 0; i < interiorPositions.length; i++) {
    const col = neuronColors[Math.floor(Math.random() * neuronColors.length)];
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: col,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const sz = 0.08 + Math.random() * 0.06;
    s.scale.set(sz, sz, sz);
    s.position.copy(interiorPositions[i]);
    root.add(s);
    neuronSprites.push(s);
  }

  // ----- surface routing nodes (invisible) -----
  const surfacePositions = [];
  {
    const base = fibSphere(cfg.surfaceNodes);
    for (const dir of base) {
      const jit = new THREE.Vector3(
        (Math.random() - 0.5) * 0.10,
        (Math.random() - 0.5) * 0.10,
        (Math.random() - 0.5) * 0.10
      );
      const d = dir.clone().add(jit).normalize();
      surfacePositions.push(shellPosition(d).multiplyScalar(0.96));
    }
  }

  // ----- unified graph -----
  const nodes = [];
  for (const p of interiorPositions) nodes.push({ pos: p, kind: 'interior', neighbors: [] });
  const interiorEnd = interiorPositions.length;
  for (const p of surfacePositions) nodes.push({ pos: p, kind: 'surface', neighbors: [] });
  const surfaceStart = interiorEnd;
  const surfaceEnd = nodes.length;
  const N = nodes.length;

  for (let i = 0; i < interiorEnd; i++) {
    const ds = [];
    for (let j = 0; j < interiorEnd; j++) {
      if (i === j) continue;
      ds.push({ j, d: nodes[i].pos.distanceToSquared(nodes[j].pos) });
    }
    ds.sort((a, b) => a.d - b.d);
    for (let n = 0; n < cfg.interiorK && n < ds.length; n++) nodes[i].neighbors.push(ds[n].j);
  }
  for (let i = surfaceStart; i < surfaceEnd; i++) {
    const ds = [];
    for (let j = surfaceStart; j < surfaceEnd; j++) {
      if (i === j) continue;
      ds.push({ j, d: nodes[i].pos.distanceToSquared(nodes[j].pos) });
    }
    ds.sort((a, b) => a.d - b.d);
    for (let n = 0; n < cfg.surfaceK && n < ds.length; n++) nodes[i].neighbors.push(ds[n].j);
  }
  for (let i = 0; i < interiorEnd; i++) {
    const ds = [];
    for (let j = surfaceStart; j < surfaceEnd; j++) {
      ds.push({ j, d: nodes[i].pos.distanceToSquared(nodes[j].pos) });
    }
    ds.sort((a, b) => a.d - b.d);
    for (let b = 0; b < cfg.bridgeCount && b < ds.length; b++) nodes[i].neighbors.push(ds[b].j);
  }
  for (let i = 0; i < N; i++) {
    for (const j of nodes[i].neighbors) {
      if (!nodes[j].neighbors.includes(i)) nodes[j].neighbors.push(i);
    }
  }

  // ----- visible filaments (interior-interior edges only) -----
  {
    const edgeSet = new Set();
    const arr = [];
    for (let i = 0; i < interiorEnd; i++) {
      for (const j of nodes[i].neighbors) {
        if (nodes[j].kind !== 'interior') continue;
        const k = i < j ? `${i},${j}` : `${j},${i}`;
        if (edgeSet.has(k)) continue;
        edgeSet.add(k);
        const a = nodes[i].pos, b = nodes[j].pos;
        arr.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: 0xB8A28A, transparent: true, opacity: 0.15,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })));
  }

  // ----- pulses -----
  const TRAIL_LEN = 34;
  const pulses = [];
  for (let p = 0; p < cfg.pulses; p++) {
    const startIdx = Math.floor(Math.random() * N);
    if (!nodes[startIdx].neighbors.length) continue;
    const neigh = nodes[startIdx].neighbors;
    const nextIdx = neigh[Math.floor(Math.random() * neigh.length)];

    const head = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: COL.pulseHead,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    head.scale.set(0.3, 0.3, 0.3);
    root.add(head);

    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xFFFFFF,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    core.scale.set(0.14, 0.14, 0.14);
    root.add(core);

    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3));
    tGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3));
    const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    root.add(trail);

    pulses.push({
      from: startIdx, to: nextIdx, prev: -1,
      t: Math.random(),
      speed: (0.4 + Math.random() * 0.6) * cfg.pulseSpeed,
      head, core, trail,
      trailPositions: new Array(TRAIL_LEN).fill(null),
      phase: Math.random() * Math.PI * 2,
    });
  }

  function stepPulses(dt) {
    const now = performance.now();
    for (const p of pulses) {
      p.t += p.speed * dt;
      while (p.t >= 1) {
        p.t -= 1;
        const oldFrom = p.from;
        p.from = p.to;
        const neigh = nodes[p.from].neighbors;
        if (!neigh.length) break;
        let pool = neigh.filter(n => n !== oldFrom);
        if (pool.length === 0) pool = neigh;
        p.prev = oldFrom;
        p.to = pool[Math.floor(Math.random() * pool.length)];
      }
      const a = nodes[p.from].pos;
      const b = nodes[p.to].pos;
      const x = a.x + (b.x - a.x) * p.t;
      const y = a.y + (b.y - a.y) * p.t;
      const z = a.z + (b.z - a.z) * p.t;
      p.head.position.set(x, y, z);
      p.core.position.set(x, y, z);

      for (let i = p.trailPositions.length - 1; i > 0; i--) {
        p.trailPositions[i] = p.trailPositions[i - 1];
      }
      p.trailPositions[0] = new THREE.Vector3(x, y, z);

      const posAttr = p.trail.geometry.attributes.position;
      const colAttr = p.trail.geometry.attributes.color;
      const [hR, hG, hB] = COL.pulseTrailHot;
      const [mR, mG, mB] = COL.pulseTrailMid;
      for (let i = 0; i < p.trailPositions.length; i++) {
        const tp = p.trailPositions[i] || p.trailPositions[0];
        posAttr.array[i * 3 + 0] = tp.x;
        posAttr.array[i * 3 + 1] = tp.y;
        posAttr.array[i * 3 + 2] = tp.z;
        const f = 1 - i / p.trailPositions.length;
        const mix = 1 - f;
        const r = hR * f + mR * mix * 0.6;
        const g = hG * f + mG * mix * 0.6;
        const bl = hB * f + mB * mix * 0.6;
        colAttr.array[i * 3 + 0] = r * f;
        colAttr.array[i * 3 + 1] = g * f;
        colAttr.array[i * 3 + 2] = bl * f;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      const flick = 0.8 + Math.sin(now * 0.012 + p.phase) * 0.2 + Math.sin(now * 0.05 + p.phase * 1.7) * 0.1;
      p.head.material.opacity = Math.min(1, Math.max(0.45, flick));
      const coreS = 0.12 + Math.sin(now * 0.02 + p.phase) * 0.05;
      p.core.scale.set(coreS, coreS, coreS);
    }
  }

  // ----- render loop -----
  const clock = new THREE.Clock();
  let running = true;
  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    root.rotation.y += cfg.rotateSpeed * dt;
    stepPulses(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // ----- container resize observer -----
  const resize = () => {
    const { w, h } = getSize();
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  let ro;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(resize);
    ro.observe(container);
  }
  window.addEventListener('resize', resize);

  // ----- dispose -----
  function dispose() {
    running = false;
    if (ro) ro.disconnect();
    window.removeEventListener('resize', resize);
    renderer.dispose();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m.dispose?.());
      }
    });
  }

  return { dispose };
}
