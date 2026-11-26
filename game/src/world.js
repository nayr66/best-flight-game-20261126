// DAWNLINE — the seeded canyon: heightfield, sky, strips, rings, beacon.
// One seed, one world: every load builds the same terrain, so a sortie is
// always flown over the ground the screenshots show.

import * as THREE from 'three';
import { WORLD, STRIPS, RINGS, BEACON } from './config.js';

export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(rand, cells) {
  const table = new Float32Array((cells + 1) * (cells + 1));
  for (let i = 0; i < table.length; i++) table[i] = rand();
  return function noise(u, v) {
    const x = u * cells, y = v * cells;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const s = (t) => t * t * (3 - 2 * t);
    const at = (i, j) => table[Math.min(j, cells) * (cells + 1) + Math.min(i, cells)];
    const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * s(xf);
    const bot = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * s(xf);
    return top + (bot - top) * s(yf);
  };
}

// The canyon winds from the south-west corner to the north-east plateau.
function canyonDistance(x, z) {
  const t = (x + WORLD.size / 2) / WORLD.size;
  const centre = -WORLD.size / 2 + WORLD.size * (0.72 - 0.44 * t) + Math.sin(t * 5.1) * 260;
  return Math.abs(z - centre);
}

export function buildWorld(scene) {
  const rand = seededRandom(WORLD.seed);
  const coarse = makeNoise(rand, 7);
  const fine = makeNoise(rand, 26);
  const n = WORLD.grid;
  const half = WORLD.size / 2;
  const heights = new Float32Array((n + 1) * (n + 1));

  const rawHeight = (x, z) => {
    const u = (x + half) / WORLD.size, v = (z + half) / WORLD.size;
    let h = coarse(u, v) * WORLD.mesaHeight + fine(u, v) * 22;
    const d = canyonDistance(x, z);
    const carve = Math.max(0, 1 - d / 520);
    h -= carve * carve * WORLD.canyonDepth;
    const rim = Math.max(0, 1 - Math.abs(d - 560) / 220);
    h += rim * 26;
    return h;
  };

  // Flatten a pad around each strip so take-offs start on level dirt.
  const pads = [STRIPS.dawn, STRIPS.mesa, BEACON].map((s) => ({
    x: s.x, z: s.z, r: s.length ? s.length * 0.75 : 90, h: 0,
  }));
  for (const p of pads) p.h = rawHeight(p.x, p.z);

  const heightAt = (x, z) => {
    let h = rawHeight(x, z);
    for (const p of pads) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r) {
        const t = Math.max(0, (d / p.r - 0.55) / 0.45);
        h = p.h + (h - p.h) * (t * t * (3 - 2 * t));
      }
    }
    return h;
  };

  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      heights[j * (n + 1) + i] = heightAt(-half + (i / n) * WORLD.size, -half + (j / n) * WORLD.size);
    }
  }

  const geometry = new THREE.PlaneGeometry(WORLD.size, WORLD.size, n, n);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0xc98d54), rock = new THREE.Color(0x8a5a3b);
  const scrub = new THREE.Color(0x6d6b3f), pale = new THREE.Color(0xe3b877);
  const tmp = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k);
    const h = heightAt(x, z);
    pos.setY(k, h);
    const slope = Math.abs(heightAt(x + 14, z) - h) + Math.abs(heightAt(x, z + 14) - h);
    tmp.copy(sand).lerp(pale, Math.min(1, Math.max(0, h / 150)));
    // Strata bands so the canyon walls read as layered rock from the air.
    const band = 0.5 + 0.5 * Math.sin(h * 0.55);
    tmp.offsetHSL(0, 0, (band - 0.5) * 0.07);
    if (slope > 5) tmp.lerp(rock, Math.min(1, (slope - 5) / 12));
    if (h > 40 && slope <= 5) tmp.lerp(scrub, 0.35);
    colours[k * 3] = tmp.r; colours[k * 3 + 1] = tmp.g; colours[k * 3 + 2] = tmp.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(terrain);

  // Dawn sky: a gradient dome, warm at the horizon, deep blue overhead.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(6000, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x2e4a7a) }, mid: { value: new THREE.Color(0xd98a4e) }, low: { value: new THREE.Color(0xffc98a) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;
        void main(){ float h = normalize(vP).y; vec3 c = h > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, h)) : mix(low, mid, smoothstep(-0.05, 0.18, h));
        gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  scene.add(sky);

  const sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
  sun.position.set(-2600, 1400, 900);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9db8e8, 0x8a5a3b, 0.9));
  scene.fog = new THREE.Fog(0xe8a86b, 900, 5200);

  const stripMeshes = {};
  for (const [key, s] of Object.entries(STRIPS)) {
    stripMeshes[key] = buildStrip(scene, s, heightAt);
  }

  const rings = RINGS.map((r, i) => buildRing(scene, r, i));
  const beacon = buildBeacon(scene, heightAt);

  // A few dawn cloud puffs, flat sprites in the same warm palette.
  const puff = makePuffTexture();
  for (let i = 0; i < 14; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: 0.5, depthWrite: false }));
    sprite.position.set((rand() - 0.5) * 5200, 420 + rand() * 260, (rand() - 0.5) * 5200);
    sprite.scale.set(700 + rand() * 600, 150 + rand() * 90, 1);
    scene.add(sprite);
  }

  return { heightAt, rings, beacon, strips: stripMeshes, pads };
}

function makePuffTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 64, 8, 128, 64, 120);
  grad.addColorStop(0, 'rgba(255,230,205,0.85)');
  grad.addColorStop(1, 'rgba(255,230,205,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
  return new THREE.CanvasTexture(c);
}

function buildStrip(scene, s, heightAt) {
  const group = new THREE.Group();
  const y = heightAt(s.x, s.z) + 0.4;
  const dirt = new THREE.Mesh(
    new THREE.PlaneGeometry(s.width, s.length),
    new THREE.MeshLambertMaterial({ color: 0x9a7a55 }),
  );
  dirt.rotation.x = -Math.PI / 2;
  group.add(dirt);

  // Threshold bars and a centreline, painted as thin pale strips.
  const paint = new THREE.MeshLambertMaterial({ color: 0xf3e6cf });
  for (const end of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(s.width * 0.8, 3), paint);
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(0, 0.06, end * (s.length / 2 - 8));
    group.add(bar);
  }
  for (let d = -s.length / 2 + 24; d < s.length / 2 - 16; d += 26) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 12), paint);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.06, d);
    group.add(dash);
  }
  // The precision zone: two orange boards a third of the way down Mesa Strip.
  if (s.name === 'Mesa Strip') {
    const orange = new THREE.MeshLambertMaterial({ color: 0xff7a2e });
    for (const side of [-1, 1]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 46), orange);
      board.position.set(side * (s.width / 2 + 1), 1.1, -s.length / 6);
      group.add(board);
    }
  }
  group.position.set(s.x, y, s.z);
  group.rotation.y = -s.heading;
  scene.add(group);
  return { ...s, y, group };
}

function buildRing(scene, r, index) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(16, 1.1, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0xffb340 }),
  );
  ring.position.set(r.x, r.y, r.z);
  // Face back along the course so an approaching pilot sees a circle.
  const prev = index === 0
    ? new THREE.Vector3(STRIPS.dawn.x, r.y, STRIPS.dawn.z)
    : new THREE.Vector3(RINGS[index - 1].x, RINGS[index - 1].y, RINGS[index - 1].z);
  ring.lookAt(prev);
  scene.add(ring);
  return { mesh: ring, centre: new THREE.Vector3(r.x, r.y, r.z), radius: 16, passed: false };
}

function buildBeacon(scene, heightAt) {
  const y = heightAt(BEACON.x, BEACON.z);
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 220, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  pillar.position.set(BEACON.x, y + 110, BEACON.z);
  scene.add(pillar);
  const tent = new THREE.Mesh(
    new THREE.ConeGeometry(4, 3, 4),
    new THREE.MeshLambertMaterial({ color: 0xd94f30 }),
  );
  tent.position.set(BEACON.x + 6, y + 1.5, BEACON.z + 4);
  tent.rotation.y = Math.PI / 4;
  scene.add(tent);
  return { x: BEACON.x, z: BEACON.z, y, pillar };
}
