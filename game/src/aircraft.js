// DAWNLINE — the bush plane and its flight model.
// Arcade physics with discipline: lift needs speed, a banked wing turns
// and sinks, the throttle burns fuel, and the ground grades every arrival.

import * as THREE from 'three';
import { FLIGHT, TOUCHDOWN } from './config.js';

export function buildAircraft() {
  const plane = new THREE.Group();
  const cream = new THREE.MeshLambertMaterial({ color: 0xf0e3c8 });
  const rust = new THREE.MeshLambertMaterial({ color: 0xc2502e });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2b2b30 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1d2f3a });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.42, 7.6, 10), cream);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 1.5, 0);
  plane.add(fuselage);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.34, 5.4), rust);
  stripe.position.set(0, 1.42, 0.4);
  plane.add(stripe);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.16, 1.7), cream);
  wing.position.set(0, 2.32, 0.9);
  plane.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 1.7), rust);
    tip.position.set(side * 5.4, 2.32, 0.9);
    plane.add(tip);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), dark);
    strut.position.set(side * 1.7, 1.6, 0.9);
    strut.rotation.z = side * 0.9;
    plane.add(strut);
  }

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.1), cream);
  tailWing.position.set(0, 1.85, -3.55);
  plane.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 1.3), rust);
  fin.position.set(0, 2.35, -3.55);
  plane.add(fin);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.72, 2.1), glass);
  canopy.position.set(0, 2.18, 0.55);
  plane.add(canopy);

  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.8, 1.1, 10), rust);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.5, 4.15);
  plane.add(nose);

  const prop = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.06), dark);
  prop.add(blade);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.28, 24),
    new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
  );
  prop.add(disc);
  prop.position.set(0, 1.5, 4.78);
  plane.add(prop);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15, 6), dark);
    leg.position.set(side * 0.95, 0.55, 1.5);
    plane.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.95, 0.34, 1.5);
    plane.add(wheel);
  }
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.11, 10), dark);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, 0.62, -3.25);
  plane.add(tailWheel);

  const light = (colour, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: colour }));
    m.position.set(x, y, z); plane.add(m);
  };
  light(0x34e07a, -5.75, 2.32, 0.9);   // starboard green (pilot faces +Z, right is -X)
  light(0xff3b30, 5.75, 2.32, 0.9);    // port red
  light(0xffffff, 0, 2.0, -4.05);

  return { group: plane, prop, disc, canopy };
}

// The lit instrument panel the cockpit camera looks over. The gauges are a
// canvas texture drawn by hud.js; the frame is built here with the plane.
export function buildCockpitPanel(gaugeTexture) {
  const panel = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.62, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x23211e }),
  );
  panel.add(frame);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 0.54),
    new THREE.MeshBasicMaterial({ map: gaugeTexture }),
  );
  face.position.z = -0.06;
  face.rotation.y = Math.PI;
  panel.add(face);
  const glareshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.05, 0.22),
    new THREE.MeshLambertMaterial({ color: 0x191714 }),
  );
  glareshield.position.set(0, 0.33, -0.08);
  panel.add(glareshield);
  panel.position.set(0, 2.18, 2.35);
  panel.rotation.x = 0.45;
  return panel;
}

export function newFlightState(start) {
  return {
    pos: new THREE.Vector3(start.x, start.y, start.z),
    quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, start.heading, 0)),
    speed: 0, vspeed: 0, throttle: 0,
    fuel: FLIGHT.fuelCapacity, damage: 0,
    onGround: true, crashed: false, airborneTime: 0,
  };
}

const FORWARD = new THREE.Vector3();
const EULER = new THREE.Euler();
const Q = new THREE.Quaternion();

export function stepFlight(state, input, heightAt, dt) {
  const events = [];
  if (state.crashed) return events;

  // Throttle lever, and an engine that stops when the tanks are dry.
  state.throttle = THREE.MathUtils.clamp(
    state.throttle + input.throttle * FLIGHT.throttleRate * dt, 0, 1);
  const power = state.fuel > 0 ? state.throttle : 0;
  state.fuel = Math.max(0, state.fuel - power * FLIGHT.fuelBurn * dt);

  EULER.setFromQuaternion(state.quat, 'YXZ');
  const bank = EULER.z;

  if (state.onGround) {
    const target = power * FLIGHT.maxSpeed;
    state.speed += (target - state.speed) * Math.min(1, dt * (input.brake ? 2.2 : 0.55));
    if (input.brake) state.speed = Math.max(0, state.speed - 9 * dt);
    EULER.y -= input.roll * dt * Math.min(1, state.speed / 18) * 0.7;
    // Near flying speed the stick can rotate the nose up while still rolling;
    // the wing takes over once the nose is up and the speed is there.
    if (state.speed > FLIGHT.rotateSpeed * 0.75) {
      EULER.x = THREE.MathUtils.clamp(EULER.x - input.pitch * 0.55 * dt, -0.22, 0.06);
    } else {
      EULER.x = THREE.MathUtils.lerp(EULER.x, 0, dt * 4);
    }
    EULER.z = THREE.MathUtils.lerp(EULER.z, 0, dt * 4);
    if (state.speed > FLIGHT.rotateSpeed && EULER.x < -0.05) {
      state.onGround = false;
      state.airborneTime = 0;
      events.push({ type: 'liftoff' });
    }
  } else {
    state.airborneTime += dt;
    EULER.x = THREE.MathUtils.clamp(EULER.x + input.pitch * FLIGHT.pitchRate * dt * -1, -0.6, 0.6);
    EULER.z = THREE.MathUtils.clamp(EULER.z + input.roll * FLIGHT.rollRate * dt, -1.25, 1.25);
    // A centred stick lets the nose settle back toward the horizon.
    if (Math.abs(input.pitch) < 0.05) EULER.x = THREE.MathUtils.lerp(EULER.x, 0, dt * 0.55);
    // A banked wing turns the nose and costs lift. Positive z banks right
    // (starboard down); turning right swings the nose toward -X.
    EULER.y -= Math.sin(bank) * FLIGHT.turnFromBank * dt * Math.min(1.6, state.speed / 30);
    // Speed: throttle pushes, climbs bleed, dives feed.
    const climb = Math.sin(-EULER.x);
    state.speed += (power * 9.5 - 2.2 - climb * 11) * dt;
    state.speed = THREE.MathUtils.clamp(state.speed, 0, FLIGHT.maxSpeed * 1.25);
    // Ease the bank back toward level when the stick is centred.
    if (Math.abs(input.roll) < 0.05) EULER.z = THREE.MathUtils.lerp(EULER.z, 0, dt * 0.7);
  }
  state.quat.setFromEuler(EULER);

  FORWARD.set(0, 0, 1).applyQuaternion(state.quat);
  const sink = state.onGround ? 0 : Math.max(0, FLIGHT.stallSpeed - state.speed) * 0.55;
  const vy = FORWARD.y * state.speed - sink;
  state.vspeed = vy;
  state.pos.addScaledVector(FORWARD, state.speed * dt);
  state.pos.y += (vy - FORWARD.y * state.speed) * dt;

  const groundY = heightAt(state.pos.x, state.pos.z) + FLIGHT.gearHeight;
  if (state.pos.y <= groundY) {
    const descent = -vy;
    state.pos.y = groundY;
    if (!state.onGround && state.airborneTime > 0.4) {
      state.onGround = true;
      const noseDown = EULER.x > 0.35;
      if (descent >= TOUCHDOWN.crash || noseDown || Math.abs(bank) > 1.0) {
        state.crashed = true;
        state.damage = 100;
        events.push({ type: 'crash', descent });
      } else {
        let quality = 'smooth';
        if (descent >= TOUCHDOWN.hard) { quality = 'hard'; state.damage = Math.min(100, state.damage + 18 + descent * 2); }
        else if (descent >= TOUCHDOWN.firm) quality = 'firm';
        if (state.damage >= 100) { state.crashed = true; events.push({ type: 'crash', descent }); }
        else events.push({ type: 'touchdown', quality, descent });
      }
    }
  } else if (state.onGround && state.pos.y > groundY + 0.5) {
    state.onGround = false;
  }

  return events;
}

export function headingDegrees(state) {
  FORWARD.set(0, 0, 1).applyQuaternion(state.quat);
  const deg = Math.atan2(FORWARD.x, FORWARD.z) * 180 / Math.PI;
  return (deg + 360) % 360;
}
