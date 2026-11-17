// Emberkeeper bootstrap: input, fixed-step simulation, audio events, and canvas frames.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BURN, EVENT_CLASH, EVENT_EMBER, EVENT_FROST, EVENT_OVER, EVENT_SHADE, EVENT_WAVE, EVENT_WON } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';
import { SOUND, isMuted, setMuted, unlockSound } from './sound.js';

/** Maximum elapsed time consumed by one displayed frame. */
const MAX_FRAME = 0.25;
const query = new URLSearchParams(window.location.search);
const shot = query.get('shot');
const parsedSeed = Number.parseInt(query.get('seed') ?? '', 10);
const seed = Number.isInteger(parsedSeed) ? parsedSeed : Math.floor(Math.random() * 4294967296);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(score) {
  try { window.localStorage.setItem(BEST_KEY, String(score)); } catch { /* best is visit-local when storage is unavailable */ }
}
function runShot(name) {
  const scene = stageShot(name, world);
  let frames = 0;
  const paint = () => {
    renderer.draw(world.state, scene.screen, scene.best, false);
    frames += 1;
    if (frames < 2) requestAnimationFrame(paint); else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
}
function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let startedThisRun = false;
  const announce = (message) => { status.textContent = message; };
  const startGame = () => {
    world.reset(); accumulator = 0; startedThisRun = true; screen = SCREEN_PLAY;
    unlockSound(); SOUND.start();
    announce('The fire is lit. Ten waves to dawn. Swing the shield with the arrow keys or the mouse, dash with Space.');
  };
  const finish = (nextScreen) => {
    screen = nextScreen;
    const score = Math.round(world.state.score);
    if (score > best) { best = score; saveBest(best); }
    if (nextScreen === SCREEN_WON) { SOUND.won(); announce(`Survived to dawn. Score ${score}. Best ${best}.`); }
    else { SOUND.lost(); announce(`The fire went out at wave ${world.state.wave}. Score ${score}. Best ${best}.`); }
  };
  const handleActions = () => {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WON)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
  };
  const step = () => {
    if (screen === SCREEN_TITLE) { world.step(STEP, 0, false, true); return; }
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
    if (events & EVENT_WON) finish(SCREEN_WON); else if (events & EVENT_OVER) finish(SCREEN_OVER);
  };
  const frame = (now) => {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME); last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) { step(); accumulator -= STEP; }
    } else accumulator = 0;
    renderer.draw(world.state, screen, best, startedThisRun);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat) { setMuted(!isMuted()); announce(isMuted() ? 'Sound off.' : 'Sound on.'); }
  });
  announce('Emberkeeper. Press Space or click to light the fire.');
  requestAnimationFrame(frame);
}
if (shot) runShot(shot); else runGame();
