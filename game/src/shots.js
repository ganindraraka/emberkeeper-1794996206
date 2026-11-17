// The screenshot scenes behind ?shot=start|play|end|win. A scene is built directly — the world
// is set to a believable mid-run moment (a healthy hearth, a wave in progress, items caught
// mid-flight) instead of being simulated, so the frame is exactly what the maker wants the
// judge to see and the same seed always gives the same frame.
import { HEARTH, STEP, WAVE } from './config.js';
import { KIND_EMBER, KIND_FROST, KIND_VOID } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

const START_SECONDS = 3;

/** Put one item of `kind` at `angle`/`distance` on its way in, ready to be drawn. */
function place(world, kind, angle, distance, speed) {
  const slot = world.spawn(kind);
  if (slot === null) return;
  slot.angle = angle;
  slot.distance = distance;
  slot.speed = speed;
  slot.deflected = false;
  slot.spin = 0;
}

/** A believable mid-run moment: the hearth well fed, a wave in, threats and embers in flight. */
function stagePlay(world) {
  const state = world.state;
  state.flame = HEARTH.flameMax * 0.72;
  state.score = 4280;
  state.chain = 3;
  state.wave = 5;
  state.waveTimer = WAVE.seconds * 0.45;
  state.shieldAngle = -0.5;
  place(world, KIND_FROST, -1.9, 300, 0.30);
  place(world, KIND_FROST, 0.35, 260, 0.28);
  place(world, KIND_FROST, 2.5, 340, 0.33);
  place(world, KIND_VOID, -0.7, 380, 0.20);
  place(world, KIND_VOID, 1.7, 330, 0.22);
  place(world, KIND_EMBER, -2.6, 210, 0.34);
  place(world, KIND_EMBER, 0.9, 190, 0.36);
  place(world, KIND_EMBER, 2.9, 240, 0.32);
}

/** The dawn: the last wave held, the hearth still lit. */
function stageWin(world) {
  const state = world.state;
  state.flame = HEARTH.flameMax * 0.58;
  state.score = 29140;
  state.chain = 1;
  state.wave = WAVE.last;
  state.waveTimer = 0;
  state.shieldAngle = 0.2;
  place(world, KIND_EMBER, -1.2, 180, 0.34);
  place(world, KIND_EMBER, 2.2, 220, 0.32);
}

/** The dark: the fire has gone out, a run ended at wave 7. */
function stageOver(world) {
  const state = world.state;
  state.flame = 0;
  state.score = 12680;
  state.chain = 1;
  state.wave = 7;
  state.waveTimer = WAVE.seconds * 0.5;
  state.shieldAngle = 2.4;
  place(world, KIND_FROST, -1.4, 280, 0.30);
  place(world, KIND_VOID, 0.8, 320, 0.22);
}

/**
 * Set `world` to the named scene (start, play, end or win; any other name is start) and return
 * the screen to draw over it and the best score to show. `best` is a fixed, believable high score.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    stagePlay(world);
    return { screen: SCREEN_PLAY, best: 7640 };
  }
  if (name === 'win') {
    stageWin(world);
    return { screen: SCREEN_WON, best: 29140 };
  }
  if (name === 'end') {
    stageOver(world);
    return { screen: SCREEN_OVER, best: 12680 };
  }
  // The title backdrop: a little harmless drift so the scene is alive behind the panel.
  for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, false, true);
  return { screen: SCREEN_TITLE, best: 15120 };
}

/** Names used by the screenshot manifest; exported so the kit's shots.json can be validated. */
export const SHOT_NAMES = ['start', 'play', 'end', 'win'];
