[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/nayr66/best-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/nayr66/best-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# DAWNLINE — Canyon Mail Run

Entry for make.fun's [best-flight-game-20261126-0057](https://make.fun/bounty/best-flight-game-20261126-0057) bounty ($500 in USDC).

A complete flight game that runs offline in a desktop browser from its own
files: fly a bush plane at dawn over a seeded desert canyon, chase view or
lit cockpit, with altitude, speed and heading on the HUD. Four sorties with
different goals — a ring run through the canyon, a mail delivery between two
strips, a rescue landing at a beacon, and a precision touchdown — with fuel
that drains at throttle and damage that makes every landing a decision.

## How it plays

- W/S throttle, arrow keys or A/D to bank and pitch, Space to brake on the
  ground, C to switch chase/cockpit camera, R to reset the sortie.
- The flight model rewards discipline: lift needs speed, a banked wing turns
  and sinks, and a hard arrival bends the airframe. Fuel is finite; the
  engine stops when it runs dry.
- Missions score on completion, time and how gently you put the plane down.

## How it is built

- Static files under `game/`, no build step and no network request; three.js
  is vendored as `game/vendor/three.module.min.js`.
- The game's own source is split one job per file under `game/src/`:
  `config.js` (tunables), `terrain.js` (seeded canyon, strips, rings,
  beacon), `aircraft.js` (the plane and its panel frame),
  `flight-model.js` (lift, stall, banked turns, ground effect, arrivals),
  `cockpit-instruments.js` (the lit dials: speed, altitude, horizon,
  heading), `camera.js` (chase and cockpit), `hud.js` (tapes, bars and the
  canyon minimap), `missions.js` (the four sorties and scoring),
  `input.js` (keyboard and mouse), `sound.js` (synthesised engine, wind
  and chimes), `main.js` (boot and the frame loop).
- `main.ts` hands the entry in: it copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json` with the kit's
  `buildDossier`. Run it locally with
  `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`, and serve `game/`
  with any static file server to play.
