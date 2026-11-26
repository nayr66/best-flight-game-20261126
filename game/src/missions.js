// DAWNLINE — the four sorties. Each is a small state machine over the same
// canyon: rings to thread, mail to carry, a hiker to fetch, a zone to hit.
// Landing gently pays; bending the airframe costs; fuel left over counts.

import * as THREE from 'three';
import { SCORE, STRIPS, BEACON } from './config.js';

function stripFrame(strip) {
  // The strip group is rotated by -heading, so its length runs along
  // (-sin h, 0, cos h) in world space.
  const along = new THREE.Vector3(-Math.sin(strip.heading), 0, Math.cos(strip.heading));
  const across = new THREE.Vector3(along.z, 0, -along.x);
  return { along, across, centre: new THREE.Vector3(strip.x, 0, strip.z) };
}

function stripLocal(strip, pos) {
  const f = stripFrame(strip);
  const rel = new THREE.Vector3(pos.x - strip.x, 0, pos.z - strip.z);
  return { along: rel.dot(f.along), across: rel.dot(f.across) };
}

function onStrip(strip, pos, margin = 1.4) {
  const l = stripLocal(strip, pos);
  return Math.abs(l.along) < strip.length / 2 * margin && Math.abs(l.across) < strip.width * margin;
}

function stoppedAt(state, test) {
  return state.onGround && state.speed < 1.2 && test(state.pos);
}

export function makeMission(kind, world) {
  const m = {
    kind, phase: 0, time: 0, score: 0, done: false, failed: false,
    objective: '', target: null, banner: null, landedOnce: false,
  };
  const rings = world.rings;
  for (const r of rings) { r.passed = false; r.mesh.material.color.set(0xffb340); }

  function landingBonus(events) {
    for (const e of events) {
      if (e.type === 'touchdown') {
        if (e.quality === 'smooth') { m.score += SCORE.smoothLanding; m.banner = ['SMOOTH LANDING', `+${SCORE.smoothLanding}`]; }
        if (e.quality === 'firm') { m.score += SCORE.firmLanding; m.banner = ['FIRM LANDING', `+${SCORE.firmLanding}`]; }
        if (e.quality === 'hard') m.banner = ['HARD LANDING', 'the airframe felt that'];
      }
      if (e.type === 'crash') { m.failed = true; m.banner = ['CRASHED', 'sortie over — press R to fly it again']; }
    }
  }

  function finish(base) {
    m.done = true;
    m.score += base + Math.round(world.lastFuel * SCORE.fuelBonus);
    m.banner = ['SORTIE COMPLETE', `score ${m.score}`];
  }

  m.update = function update(state, events, dt) {
    if (m.done || m.failed) return m;
    m.time += dt;
    world.lastFuel = state.fuel;
    landingBonus(events);
    if (m.failed) return m;
    if (state.fuel <= 0 && state.onGround && state.speed < 0.5 && state.airborneTime > 0) {
      m.failed = true;
      m.banner = ['OUT OF FUEL', 'stranded — press R to fly it again'];
      return m;
    }

    if (kind === 'rings') {
      const next = rings.find((r) => !r.passed);
      if (!next) {
        const bonus = Math.max(0, Math.round(SCORE.ringTimeBonus * (1 - m.time / SCORE.ringParSeconds)));
        finish(bonus);
        m.objective = 'All rings threaded.';
        return m;
      }
      next.mesh.material.color.set(0x7fd08a);
      m.target = next.centre;
      const idx = rings.indexOf(next) + 1;
      m.objective = `Ring ${idx} of ${rings.length} — ${Math.round(state.pos.distanceTo(next.centre))} m`;
      if (state.pos.distanceTo(next.centre) < next.radius) {
        next.passed = true;
        next.mesh.material.color.set(0x555555);
        m.score += SCORE.ring;
        m.banner = [`RING ${idx}`, `+${SCORE.ring}`];
        m.justPassedRing = true;
      }
    }

    if (kind === 'mail') {
      const dest = m.phase === 0 ? STRIPS.mesa : STRIPS.dawn;
      m.target = new THREE.Vector3(dest.x, world.heightAt(dest.x, dest.z), dest.z);
      m.objective = m.phase === 0
        ? `Deliver the mail to ${dest.name} — land and stop`
        : `Bring the reply home to ${dest.name} — land and stop`;
      if (stoppedAt(state, (p) => onStrip(dest, p))) {
        if (m.phase === 0) { m.phase = 1; m.banner = ['MAIL DELIVERED', 'reply aboard — head home']; }
        else finish(SCORE.delivery);
      }
    }

    if (kind === 'rescue') {
      if (m.phase === 0) {
        m.target = new THREE.Vector3(BEACON.x, world.beacon.y, BEACON.z);
        m.objective = 'Land beside the beacon and stop to pick up the hiker';
        if (stoppedAt(state, (p) => Math.hypot(p.x - BEACON.x, p.z - BEACON.z) < 75)) {
          m.phase = 1;
          m.banner = ['HIKER ABOARD', 'fly them home to Dawn Strip'];
        }
      } else {
        m.target = new THREE.Vector3(STRIPS.dawn.x, world.heightAt(STRIPS.dawn.x, STRIPS.dawn.z), STRIPS.dawn.z);
        m.objective = 'Bring the hiker home to Dawn Strip — land and stop';
        if (stoppedAt(state, (p) => onStrip(STRIPS.dawn, p))) finish(SCORE.rescue);
      }
    }

    if (kind === 'precision') {
      const s = STRIPS.mesa;
      m.target = new THREE.Vector3(s.x, world.heightAt(s.x, s.z), s.z);
      m.objective = 'Touch down inside the orange zone on Mesa Strip';
      for (const e of events) {
        if (e.type === 'touchdown') {
          const l = stripLocal(s, state.pos);
          const inZone = Math.abs(l.along + s.length / 6) < 24 && Math.abs(l.across) < s.width / 2;
          m.touchdownInZone = inZone;
          if (!inZone) m.banner = ['OUTSIDE THE ZONE', 'go around and try the approach again'];
        }
      }
      if (m.touchdownInZone && stoppedAt(state, (p) => onStrip(s, p, 1.05))) {
        const l = stripLocal(s, state.pos);
        const closeness = Math.max(0, 1 - Math.abs(l.along + s.length / 6) / (s.length / 2));
        finish(Math.round(SCORE.precision * (0.6 + 0.4 * closeness)));
      }
    }

    return m;
  };

  return m;
}
