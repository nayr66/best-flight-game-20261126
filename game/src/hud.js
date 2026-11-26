// DAWNLINE — the head-up instruments: DOM tapes and bars around the screen
// plus the canyon minimap. Altitude, speed and heading are always on show;
// fuel and damage sit where a pilot glances. The lit panel gauges live in
// cockpit-instruments.js.

import * as THREE from 'three';
import { headingDegrees } from './flight-model.js';
import { WORLD, STRIPS, BEACON } from './config.js';

export function makeHud() {
  const el = (id) => document.getElementById(id);
  const mission = el('hud-mission'), objective = el('hud-objective');
  const speedValue = el('hud-speed-value'), altValue = el('hud-alt-value');
  const strip = el('hud-heading-strip');
  const fuelBar = el('bar-fuel').firstElementChild, fuelValue = el('hud-fuel-value');
  const damageBar = el('bar-damage').firstElementChild, damageValue = el('hud-damage-value');
  const throttleBar = el('bar-throttle').firstElementChild, throttleValue = el('hud-throttle-value');
  const scoreBox = el('hud-score'), rightBox = el('hud-right'), banner = el('hud-banner');

  // Heading tape: one tick every 10 degrees, cardinals named.
  let tape = '';
  for (let rep = 0; rep < 3; rep++) {
    for (let d = 0; d < 360; d += 10) {
      const label = d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : d === 270 ? 'W' : String(d / 10).padStart(2, '0');
      tape += `<span style="display:inline-block;width:34px;text-align:center">${label}</span>`;
    }
  }
  strip.innerHTML = tape;

  let bannerTimer = 0;

  return {
    setMission(title, text) {
      mission.textContent = title;
      objective.textContent = text;
    },
    setScore(lines) { scoreBox.innerHTML = lines.join('<br>'); },
    setRight(lines) { rightBox.innerHTML = lines.join('<br>'); },
    showBanner(text, sub = '', seconds = 2.6) {
      banner.innerHTML = sub ? `${text}<small>${sub}</small>` : text;
      banner.style.opacity = '1';
      bannerTimer = seconds;
    },
    update(state, heightAboveGround, dt) {
      speedValue.textContent = Math.round(state.speed * 3.6);
      altValue.textContent = Math.max(0, Math.round(heightAboveGround));
      const hdg = headingDegrees(state);
      strip.style.transform = `translateX(${170 - 17 - (hdg / 10) * 34 - 36 * 34}px)`;
      fuelBar.style.width = `${state.fuel}%`;
      fuelValue.textContent = Math.round(state.fuel);
      damageBar.style.width = `${state.damage}%`;
      damageValue.textContent = Math.round(state.damage);
      throttleBar.style.width = `${state.throttle * 100}%`;
      throttleValue.textContent = Math.round(state.throttle * 100);
      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0) banner.style.opacity = '0';
      }
    },
  };
}

// The canyon minimap: terrain shading baked once, then strips, rings,
// the beacon and the plane drawn over it each refresh. North (-Z) is up.

export function makeMinimap(heightAt) {
  const canvas = document.getElementById('hud-map');
  const g = canvas.getContext('2d');
  const SIZE = canvas.width;
  const half = WORLD.size / 2;
  const toPx = (x) => ((x + half) / WORLD.size) * SIZE;
  const toPy = (z) => ((z + half) / WORLD.size) * SIZE;

  const baked = document.createElement('canvas');
  baked.width = SIZE; baked.height = SIZE;
  const bg = baked.getContext('2d');
  const cells = 56;
  const cell = SIZE / cells;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const x = -half + ((i + 0.5) / cells) * WORLD.size;
      const z = -half + ((j + 0.5) / cells) * WORLD.size;
      const h = heightAt(x, z);
      const t = Math.min(1, Math.max(0, (h + 40) / 220));
      bg.fillStyle = `rgb(${Math.round(120 + t * 90)},${Math.round(82 + t * 52)},${Math.round(48 + t * 30)})`;
      bg.fillRect(i * cell, j * cell, cell + 1, cell + 1);
    }
  }

  let frame = 0;
  return {
    draw(state, rings) {
      if (frame++ % 4 !== 0) return;
      g.drawImage(baked, 0, 0);
      g.strokeStyle = 'rgba(245,233,213,0.5)';
      g.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);

      for (const s of Object.values(STRIPS)) {
        g.save();
        g.translate(toPx(s.x), toPy(s.z));
        g.rotate(-s.heading + Math.PI / 2);
        g.fillStyle = '#f3e6cf';
        g.fillRect(-(s.length / WORLD.size) * SIZE / 2, -1.2, (s.length / WORLD.size) * SIZE, 2.4);
        g.restore();
      }

      for (const r of rings) {
        const next = !r.passed && rings.find((q) => !q.passed) === r;
        g.beginPath();
        g.arc(toPx(r.centre.x), toPy(r.centre.z), next ? 4.5 : 3, 0, Math.PI * 2);
        g.fillStyle = r.passed ? 'rgba(200,200,200,0.55)' : next ? '#7fd08a' : '#ffb340';
        g.fill();
      }

      g.beginPath();
      g.arc(toPx(BEACON.x), toPy(BEACON.z), 3.5, 0, Math.PI * 2);
      g.fillStyle = '#ff5a3c';
      g.fill();

      const hdg = headingDegrees(state) * Math.PI / 180;
      g.save();
      g.translate(toPx(state.pos.x), toPy(state.pos.z));
      g.rotate(Math.PI - hdg);
      g.beginPath();
      g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(0, 2.6); g.lineTo(-4, 5);
      g.closePath();
      g.fillStyle = '#ffffff';
      g.fill();
      g.restore();
    },
  };
}
