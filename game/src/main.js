// Boot and the one loop. Input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between five screens: title, play, paused, the fire went out (over) and survived to dawn.
//
// ?seed=N fixes the drift of everything. ?shot=start|play|end|win (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BURN, EVENT_CLASH, EVENT_EMBER, EVENT_FROST, EVENT_OVER, EVENT_SHADE, EVENT_WAVE, EVENT_WON } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';
import { SOUND, isMuted, setMuted, unlockSound } from './sound.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let startedThisRun = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each event.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    startedThisRun = true;
    screen = SCREEN_PLAY;
    unlockSound();
    SOUND.start();
    announce('The fire is lit. Ten waves to dawn. Swing the shield with the arrow keys or the mouse, dash with Space.');
  }

  function finish(nextScreen) {
    screen = nextScreen;
    const score = Math.round(world.state.score);
    if (score > best) {
      best = score;
      saveBest(best);
    }
    if (nextScreen === SCREEN_WON) {
      SOUND.won();
      announce(`Survived to dawn. Score ${score}. Best ${best}.`);
    } else {
      SOUND.lost();
      announce(`The fire went out at wave ${world.state.wave}. Score ${score}. Best ${best}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WON)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, false, true);
      return;
    }
    const dashing = input.dashing();
    const wasDashing = world.state.dashTimer > 0;
    const events = world.step(STEP, input.steer(world.state.shieldAngle), dashing, false);
    if (world.state.dashTimer > 0 && !wasDashing) SOUND.dash();
    if (events & EVENT_WAVE) SOUND.wave();
    if (events & EVENT_EMBER) SOUND.catchEmber();
    if (events & EVENT_FROST) SOUND.deflect();
    if (events & EVENT_CLASH) SOUND.clash();
    if (events & EVENT_BURN) SOUND.frostBurn();
    if (events & EVENT_SHADE) SOUND.shade();
    if (events & EVENT_WON) finish(SCREEN_WON);
    else if (events & EVENT_OVER) finish(SCREEN_OVER);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, startedThisRun);
  }

  // Leaving the tab pauses a running game rather than letting the fire burn unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat) {
      setMuted(!isMuted());
      announce(isMuted() ? 'Sound off.' : 'Sound on.');
    }
  });

  announce('Emberkeeper. Press Space or click to light the fire.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
