// DAWNLINE — two cameras that never fight the pilot: a smooth chase view
// that trails behind and above, and a cockpit view over the lit panel.

import * as THREE from 'three';

const BEHIND = new THREE.Vector3();
const LOOK = new THREE.Vector3();
const HEAD = new THREE.Vector3();

export function updateCamera(camera, state, mode, orbit, dt) {
  if (mode === 'cockpit') {
    HEAD.set(0, 2.72, 1.0).applyQuaternion(state.quat).add(state.pos);
    camera.position.copy(HEAD);
    LOOK.set(0, 2.38, 30).applyQuaternion(state.quat).add(state.pos);
    camera.lookAt(LOOK);
    return;
  }
  // Chase: settle behind the tail, lifted a little, eased so turns sweep
  // instead of snapping. Mouse drag adds a look-around offset.
  BEHIND.set(Math.sin(orbit.yaw) * 17, 5.5 + orbit.pitch * 6, -Math.cos(orbit.yaw) * 17)
    .applyQuaternion(state.quat).add(state.pos);
  const ease = 1 - Math.pow(0.0015, dt);
  camera.position.lerp(BEHIND, Math.min(1, ease));
  LOOK.set(0, 1.6, 26).applyQuaternion(state.quat).add(state.pos);
  camera.lookAt(LOOK);
}
