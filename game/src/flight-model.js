// DAWNLINE — the flight model: throttle, lift, stall, banked turns,
// ground effect, ground handling, and how the ground grades an arrival.
// Arcade physics with discipline — the numbers live in config.js.

import * as THREE from 'three';
import { FLIGHT, TOUCHDOWN } from './config.js';

export function newFlightState(start) {
  return {
    pos: new THREE.Vector3(start.x, start.y, start.z),
    quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, start.heading, 0)),
    speed: 0, vspeed: 0, throttle: 0,
    fuel: FLIGHT.fuelCapacity, damage: 0,
    onGround: true, crashed: false, airborneTime: 0, stalled: false,
  };
}

const FORWARD = new THREE.Vector3();
const EULER = new THREE.Euler();

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
  const groundHere = heightAt(state.pos.x, state.pos.z) + FLIGHT.gearHeight;
  const sink = state.onGround ? 0 : Math.max(0, FLIGHT.stallSpeed - state.speed) * 0.55;
  // Ground effect: inside a wingspan of the dirt the wing floats on its
  // own cushion — arrivals stretch, departures lift a touch early.
  const cushion = state.onGround ? 0
    : THREE.MathUtils.clamp((9 - (state.pos.y - groundHere)) / 9, 0, 1) * 2.4 * Math.min(1, state.speed / 25);
  state.stalled = !state.onGround && state.speed < FLIGHT.stallSpeed;
  const vy = FORWARD.y * state.speed - sink + cushion;
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
