// DAWNLINE — the instruments: DOM tapes and bars around the screen, and
// the lit gauge panel the cockpit camera looks over. Altitude, speed and
// heading are always on show; fuel and damage sit where a pilot glances.

import * as THREE from 'three';
import { headingDegrees } from './aircraft.js';

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

// The cockpit gauge faces, drawn on a canvas the panel wears as a texture:
// airspeed, altimeter and heading dials with needles that move with the plane.
export function makeGaugePanel() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 192;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  let frame = 0;

  function dial(cx, cy, r, value, max, label, unit) {
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = '#101418'; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#c8b98a'; g.stroke();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
      g.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      g.lineWidth = 2; g.strokeStyle = '#e8dcc0'; g.stroke();
    }
    const a = Math.PI * 0.75 + Math.min(1, Math.max(0, value / max)) * Math.PI * 1.5;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12));
    g.lineWidth = 4; g.strokeStyle = '#ffb340'; g.stroke();
    g.fillStyle = '#e8dcc0'; g.font = 'bold 15px Arial'; g.textAlign = 'center';
    g.fillText(label, cx, cy + r - 16);
    g.font = '11px Arial'; g.fillText(unit, cx, cy + r - 3);
  }

  return {
    texture,
    update(state, heightAboveGround) {
      if (frame++ % 3 !== 0) return;
      g.fillStyle = '#23211e'; g.fillRect(0, 0, 512, 192);
      dial(92, 96, 78, state.speed * 3.6, 240, 'SPEED', 'km/h');
      dial(256, 96, 78, Math.max(0, heightAboveGround), 600, 'ALTITUDE', 'metres');
      dial(420, 96, 78, headingDegrees(state), 360, 'HEADING', 'degrees');
      texture.needsUpdate = true;
    },
  };
}
