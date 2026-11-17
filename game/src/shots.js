// Fixed compositions for ?shot=start|play|end|win. Set the action scenes directly so
// screenshots do not depend on steering, collisions or how long a run takes to reach them.
import { HEARTH, STEP, WAVE } from './config.js';
import { KIND_EMBER, KIND_FROST, KIND_VOID } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

const START_SECONDS = 3;

// Each item is [kind, angle, distance, speed]. Order matters: spawning consumes the
// seeded random stream and chooses the next free slot in the world's item pool.
const SCENES = [
  {
    name: 'play', screen: SCREEN_PLAY, best: 7640,
    state: {
      flame: HEARTH.flameMax * 0.72, score: 4280, chain: 3,
      wave: 5, waveTimer: WAVE.seconds * 0.45, shieldAngle: -0.5,
    },
    items: [
      [KIND_FROST, -1.9, 300, 0.30],
      [KIND_FROST, 0.35, 260, 0.28],
      [KIND_FROST, 2.5, 340, 0.33],
      [KIND_VOID, -0.7, 380, 0.20],
      [KIND_VOID, 1.7, 330, 0.22],
      [KIND_EMBER, -2.6, 210, 0.34],
      [KIND_EMBER, 0.9, 190, 0.36],
      [KIND_EMBER, 2.9, 240, 0.32],
    ],
  },
  {
    name: 'win', screen: SCREEN_WON, best: 29140,
    state: {
      flame: HEARTH.flameMax * 0.58, score: 29140, chain: 1,
      wave: WAVE.last, waveTimer: 0, shieldAngle: 0.2,
    },
    items: [
      [KIND_EMBER, -1.2, 180, 0.34],
      [KIND_EMBER, 2.2, 220, 0.32],
    ],
  },
  {
    name: 'end', screen: SCREEN_OVER, best: 12680,
    state: {
      flame: 0, score: 12680, chain: 1,
      wave: 7, waveTimer: WAVE.seconds * 0.5, shieldAngle: 2.4,
    },
    items: [
      [KIND_FROST, -1.4, 280, 0.30],
      [KIND_VOID, 0.8, 320, 0.22],
    ],
  },
];

/** Spawn normally to retain the item's radius, then fix its visible pose and motion. */
function composeItems(world, items) {
  for (const [kind, angle, distance, speed] of items) {
    const item = world.spawn(kind);
    if (item === null) continue;
    Object.assign(item, { angle, distance, speed, deflected: false, spin: 0 });
  }
}

/** Reset the world, compose the requested scene, and supply its screen and best score. */
export function stageShot(name, world) {
  world.reset();
  const scene = SCENES.find((candidate) => candidate.name === name);
  if (scene) {
    Object.assign(world.state, scene.state);
    composeItems(world, scene.items);
    return { screen: scene.screen, best: scene.best };
  }

  // Start and unknown names share the title backdrop. Only this harmless ember
  // drift is simulated; use the same fixed steps as the normal title screen.
  for (let tick = 0; tick < START_SECONDS / STEP; tick += 1) {
    world.step(STEP, 0, false, true);
  }
  return { screen: SCREEN_TITLE, best: 15120 };
}

/** Screenshot manifest names, in cover-first order. */
export const SHOT_NAMES = ['start', 'play', 'end', 'win'];
