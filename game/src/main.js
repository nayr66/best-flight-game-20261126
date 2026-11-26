// DAWNLINE — boot and the frame loop. Builds the canyon and the plane,
// wires the sortie menu, steps the flight model, and keeps the cameras,
// instruments and sound following the same state.

import * as THREE from 'three';
import { STRIPS, RINGS } from './config.js';
import { buildWorld } from './world.js';
import { buildAircraft, buildCockpitPanel, newFlightState, stepFlight } from './aircraft.js';
import { updateCamera } from './camera.js';
import { makeHud, makeGaugePanel } from './hud.js';
import { makeMission } from './missions.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 9000);

const world = buildWorld(scene);
const { group: plane, prop, disc, canopy } = buildAircraft();
scene.add(plane);
const gauges = makeGaugePanel();
plane.add(buildCockpitPanel(gauges.texture));

const hud = makeHud();
const input = makeInput(canvas);
const audio = makeAudio();
const menu = document.getElementById('hud-menu');

let state = null;
let mission = null;
let cameraMode = 'chase';
let campaignScore = 0;
let sortiesDone = 0;
const shotMode = new URLSearchParams(location.search).get('shot');

function stripAlong(s) {
  return new THREE.Vector3(-Math.sin(s.heading), 0, Math.cos(s.heading));
}

function startPose() {
  const s = STRIPS.dawn;
  const along = stripAlong(s);
  const x = s.x - along.x * (s.length / 2 - 30);
  const z = s.z - along.z * (s.length / 2 - 30);
  return { x, y: world.heightAt(x, z) + 1.1, z, heading: -s.heading };
}

function startSortie(kind) {
  state = newFlightState(startPose());
  mission = makeMission(kind, world);
  menu.classList.add('hidden');
  hud.setMission(kind.toUpperCase(), mission.objective || 'Fly the sortie.');
  hud.showBanner(kind.toUpperCase(), 'throttle up with W, pull up past 75 km/h');
}

for (const btn of menu.querySelectorAll('.sortie')) {
  btn.addEventListener('click', () => { audio.start(); startSortie(btn.dataset.sortie); });
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') menu.classList.remove('hidden');
});

function poseForShot(name) {
  const aim = (from, to, bank = 0) => {
    const obj = new THREE.Object3D();
    obj.position.copy(from);
    obj.lookAt(to);
    obj.rotateZ(bank);
    return obj.quaternion.clone();
  };
  if (name === 'cover') {
    mission = makeMission('rings', world);
    state = newFlightState({ x: -760, y: 158, z: 700, heading: 0 });
    state.quat = aim(state.pos, new THREE.Vector3(RINGS[1].x, RINGS[1].y, RINGS[1].z));
    state.speed = 34; state.throttle = 0.8; state.onGround = false; state.fuel = 86;
    cameraMode = 'chase';
  } else if (name === 'cockpit') {
    mission = makeMission('precision', world);
    const s = STRIPS.mesa;
    const along = stripAlong(s);
    const y = world.heightAt(s.x, s.z);
    state = newFlightState({ x: s.x - along.x * 300, y: y + 36, z: s.z - along.z * 300, heading: 0 });
    state.quat = aim(state.pos, new THREE.Vector3(s.x, y + 2, s.z));
    state.speed = 26; state.throttle = 0.42; state.onGround = false; state.fuel = 64;
    cameraMode = 'cockpit';
  } else if (name === 'rings') {
    mission = makeMission('rings', world);
    mission.phase = 0;
    for (let i = 0; i < 3; i++) { world.rings[i].passed = true; world.rings[i].mesh.material.color.set(0x555555); }
    mission.score = 360;
    state = newFlightState({ x: -40, y: 118, z: 90, heading: 0 });
    state.quat = aim(state.pos, new THREE.Vector3(RINGS[3].x, RINGS[3].y, RINGS[3].z), 0.55);
    state.speed = 39; state.throttle = 0.85; state.onGround = false; state.fuel = 71;
    cameraMode = 'chase';
  } else if (name === 'landing') {
    mission = makeMission('mail', world);
    mission.phase = 1;
    const s = STRIPS.dawn;
    const along = stripAlong(s);
    const x = s.x + along.x * 30, z = s.z + along.z * 30;
    state = newFlightState({ x, y: world.heightAt(x, z) + 1.1, z, heading: -s.heading });
    state.speed = 13; state.throttle = 0.18; state.fuel = 38;
    hud.showBanner('SMOOTH LANDING', '+150', 99);
    cameraMode = 'chase';
  }
  menu.classList.add('hidden');
  hud.setMission(mission.kind.toUpperCase(), '');
}

if (shotMode) poseForShot(shotMode);
else state = newFlightState(startPose());

let last = performance.now();
let lowFuelWarned = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const controls = input.read(dt);
  if (controls.events.any) audio.start();
  if (controls.events.camera) cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  if (controls.events.reset && mission) startSortie(mission.kind);

  let events = [];
  if (!shotMode) {
    const steps = 2;
    for (let i = 0; i < steps; i++) {
      events = events.concat(stepFlight(state, controls, world.heightAt, dt / steps));
    }
  }

  if (mission) {
    const before = mission.done;
    mission.update(state, shotMode ? [] : events, shotMode ? 0 : dt);
    if (mission.justPassedRing) { audio.ring(); mission.justPassedRing = false; }
    if (mission.banner) { hud.showBanner(mission.banner[0], mission.banner[1]); mission.banner = null; }
    if (mission.done && !before) {
      campaignScore += mission.score;
      sortiesDone += 1;
      audio.complete();
      menu.classList.remove('hidden');
    }
    hud.setMission(mission.kind.toUpperCase(), mission.objective);
    hud.setScore([
      `SORTIE SCORE ${mission.score}`,
      `CAMPAIGN ${campaignScore} · ${sortiesDone}/4 FLOWN`,
      `TIME ${Math.floor(mission.time / 60)}:${String(Math.floor(mission.time % 60)).padStart(2, '0')}`,
    ]);
  }

  for (const e of events) {
    if (e.type === 'touchdown') audio.touchdown(e.quality === 'hard');
    if (e.type === 'crash') audio.crash();
  }
  if (state.fuel < 20 && state.fuel > 0 && now - lowFuelWarned > 4000) {
    lowFuelWarned = now;
    audio.warning();
  }

  plane.position.copy(state.pos);
  plane.quaternion.copy(state.quat);
  canopy.visible = cameraMode !== 'cockpit';
  prop.rotation.z += (2 + state.throttle * 46) * dt;
  disc.material.opacity = 0.05 + state.throttle * 0.2;
  world.beacon.pillar.material.opacity = 0.28 + 0.16 * Math.sin(now / 380);

  const heightAboveGround = state.pos.y - world.heightAt(state.pos.x, state.pos.z);
  updateCamera(camera, state, cameraMode, input.orbit, dt);
  hud.update(state, heightAboveGround, dt);
  gauges.update(state, heightAboveGround);
  audio.update(state);

  const targetLine = mission && mission.target
    ? `TARGET ${Math.round(state.pos.distanceTo(mission.target))} m`
    : '';
  hud.setRight([
    cameraMode === 'chase' ? 'CHASE CAMERA' : 'COCKPIT',
    targetLine,
    state.onGround ? 'ON GROUND' : 'AIRBORNE',
  ]);

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
