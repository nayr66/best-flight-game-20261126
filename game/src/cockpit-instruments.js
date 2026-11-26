// DAWNLINE — the lit cockpit instruments: airspeed, altimeter, artificial
// horizon and heading dials drawn on one canvas the panel wears as a
// texture. Needles move with the plane; the faces carry a little wear, so
// they look flown rather than printed.

import * as THREE from 'three';
import { headingDegrees } from './flight-model.js';

const EULER = new THREE.Euler();

export function makeGaugePanel() {
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 192;
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
    g.fillStyle = '#e8dcc0'; g.font = 'bold 14px Arial'; g.textAlign = 'center';
    g.fillText(label, cx, cy + r - 16);
    g.font = '10px Arial'; g.fillText(unit, cx, cy + r - 4);
  }

  function horizon(cx, cy, r, pitch, roll) {
    g.save();
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    g.translate(cx, cy);
    g.rotate(roll);
    const drop = THREE.MathUtils.clamp(pitch, -0.6, 0.6) * r * 1.1;
    g.fillStyle = '#3a6ea8'; g.fillRect(-r * 1.6, -r * 1.6 + drop, r * 3.2, r * 1.6);
    g.fillStyle = '#8a5a3b'; g.fillRect(-r * 1.6, drop, r * 3.2, r * 1.6);
    g.fillStyle = '#e8dcc0'; g.fillRect(-r * 1.6, drop - 1, r * 3.2, 2);
    g.restore();
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
    g.lineWidth = 3; g.strokeStyle = '#c8b98a'; g.stroke();
    // The fixed aircraft symbol the horizon moves behind.
    g.strokeStyle = '#ffb340'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - r * 0.55, cy); g.lineTo(cx - r * 0.18, cy);
    g.moveTo(cx + r * 0.18, cy); g.lineTo(cx + r * 0.55, cy);
    g.moveTo(cx, cy - 4); g.lineTo(cx, cy + 4);
    g.stroke();
    g.fillStyle = '#e8dcc0'; g.font = 'bold 14px Arial'; g.textAlign = 'center';
    g.fillText('HORIZON', cx, cy + r - 16);
    g.font = '10px Arial'; g.fillText('pitch / bank', cx, cy + r - 4);
  }

  function wear() {
    // Fixed scuffs: the same worn panel on every load.
    g.strokeStyle = 'rgba(232,220,192,0.10)'; g.lineWidth = 1;
    const scuffs = [[40, 30, 120, 44], [210, 160, 300, 148], [430, 26, 520, 40], [90, 170, 170, 158], [560, 150, 620, 138]];
    for (const [x1, y1, x2, y2] of scuffs) {
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
    const fade = g.createLinearGradient(0, 0, 640, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0.16)');
    fade.addColorStop(0.5, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0.16)');
    g.fillStyle = fade; g.fillRect(0, 0, 640, 192);
  }

  return {
    texture,
    update(state, heightAboveGround) {
      if (frame++ % 3 !== 0) return;
      EULER.setFromQuaternion(state.quat, 'YXZ');
      g.fillStyle = '#23211e'; g.fillRect(0, 0, 640, 192);
      dial(84, 96, 74, state.speed * 3.6, 240, 'SPEED', 'km/h');
      dial(240, 96, 74, Math.max(0, heightAboveGround), 600, 'ALTITUDE', 'metres');
      horizon(396, 96, 74, -EULER.x, EULER.z);
      dial(552, 96, 74, headingDegrees(state), 360, 'HEADING', 'degrees');
      wear();
      texture.needsUpdate = true;
    },
  };
}
