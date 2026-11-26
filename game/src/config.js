// DAWNLINE — every tunable in one place: world size, flight constants,
// strip and ring placement, and the four sorties' scoring.

export const WORLD = {
  size: 4200,            // metres, square
  grid: 150,             // heightfield resolution
  seed: 20261126,        // the canyon is the same on every load
  canyonDepth: 90,
  mesaHeight: 130,
};

export const FLIGHT = {
  maxSpeed: 62,          // m/s at full throttle, level
  stallSpeed: 17,        // below this the wing stops holding the plane up
  rotateSpeed: 21,       // ground speed where pulling up lifts off
  throttleRate: 0.55,    // throttle lever travel per second
  pitchRate: 0.85,       // rad/s at full deflection
  rollRate: 1.9,
  turnFromBank: 0.85,    // heading change per radian of bank, per second
  fuelBurn: 0.55,        // fuel units per second at full throttle
  fuelCapacity: 100,
  gearHeight: 1.1,       // fuselage origin above the wheels
};

export const TOUCHDOWN = {
  smooth: 1.6,           // m/s descent: a greaser
  firm: 3.2,             // thump, no damage
  hard: 5.2,             // damage above this
  crash: 8.0,            // airframe gives up
};

// Two dirt strips: Dawn Strip on the canyon floor, Mesa Strip on the plateau.
export const STRIPS = {
  dawn: { name: 'Dawn Strip', x: -1250, z: 1150, heading: 0.6, length: 340, width: 26 },
  mesa: { name: 'Mesa Strip', x: 1050, z: -950, heading: -0.9, length: 260, width: 24 },
};

// Eight rings threaded down the canyon, in flying order.
export const RINGS = [
  { x: -900, z: 820, y: 150 },
  { x: -560, z: 520, y: 120 },
  { x: -240, z: 210, y: 105 },
  { x: 60, z: -80, y: 95 },
  { x: 330, z: -340, y: 110 },
  { x: 560, z: -560, y: 130 },
  { x: 760, z: -760, y: 165 },
  { x: 920, z: -900, y: 205 },
];

// The stranded hiker's beacon, on a bench above the canyon floor.
export const BEACON = { x: -60, z: 640 };

export const SCORE = {
  ring: 120,
  ringTimeBonus: 400,    // scaled by time left under par
  ringParSeconds: 150,
  delivery: 500,
  rescue: 650,
  precision: 550,
  smoothLanding: 150,
  firmLanding: 60,
  damagePenalty: 4,      // per damage point, per sortie
  fuelBonus: 2,          // per fuel unit left at the end
};

export const SORTIES = {
  rings: { title: 'RING RUN', brief: 'Thread the eight rings in order.' },
  mail: { title: 'MAIL DELIVERY', brief: 'Dawn Strip to Mesa Strip and back with the reply.' },
  rescue: { title: 'RESCUE', brief: 'Land at the beacon, pick up the hiker, bring them home.' },
  precision: { title: 'PRECISION', brief: 'Touch down in the marked zone on Mesa Strip.' },
};
