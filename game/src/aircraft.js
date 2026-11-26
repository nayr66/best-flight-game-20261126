// DAWNLINE — the bush plane itself: fuselage, wing, tail, spinning prop,
// gear, nav lights, and the lit instrument panel frame. How it flies is
// flight-model.js; what the gauges show is cockpit-instruments.js.

import * as THREE from 'three';

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
    new THREE.BoxGeometry(1.78, 0.58, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x23211e }),
  );
  panel.add(frame);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.51),
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
