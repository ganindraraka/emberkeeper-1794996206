// Canvas layers for the forest, moving objects, readouts and screen overlays.
import { CHAIN_MAX, FIELD, FONT, HEARTH, PALETTE, SHIELD, WAVE } from './config.js';
import { KIND_EMBER, KIND_FROST } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WON = 'won';

const FULL_TURN = Math.PI * 2;
const OVERLAY = { width: 720, top: 150, line: 36, bottom: 82 };
const FUEL = { x: FIELD.width / 2 - 220, y: 78, width: 440, height: 22 };

function memoText(prefix) {
  const cache = { argument: -1, display: '' };
  return (argument) => {
    if (argument !== cache.argument) {
      cache.argument = argument;
      cache.display = prefix + argument;
    }
    return cache.display;
  };
}

function forestLayout() {
  const forest = [];
  for (let index = 0; index < 34; index += 1) {
    const t = index / 34;
    const jitter = ((index * 2654435761) % 1000) / 1000;
    const x = -40 + t * (FIELD.width + 80) + (jitter - 0.5) * 90;
    const height = 120 + ((index * 40503) % 100) / 100 * 150;
    const baseY = index % 3 === 0 ? 214 : 176;
    forest.push({ x, y: baseY + (jitter - 0.5) * 40, height, width: height * 0.46, back: index % 2 === 0 });
  }
  return forest;
}

export function createRenderer(canvas) {
  const ink = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, centerX: FIELD.width / 2, centerY: HEARTH.y };
  const scoreLabel = memoText('');
  const waveLabel = memoText('Wave ');
  const chainLabel = memoText('x');
  const finalLabel = memoText('');
  const bestLabel = (t) => t;
  const forest = forestLayout();
  const fonts = new Map();

  // These primitives deliberately leave fill style and alpha with the caller.
  function fillCircle(...geometry) {
    ink.beginPath();
    ink.arc(...geometry);
    ink.fill();
  }

  function fillEllipse(...geometry) {
    ink.beginPath();
    ink.ellipse(...geometry);
    ink.fill();
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;

    canvas.__view = { x: view.x, y: view.y, scale: view.scale, centerX: HEARTH.x, centerY: HEARTH.y };
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}|${weight ?? ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    ink.font = fonts.get(key);
    ink.fillStyle = color;
    ink.textAlign = align ?? 'left';
    ink.fillText(value, x, y);
  }

  function paintNight(bright) {
    const glow = ink.createRadialGradient(HEARTH.x, HEARTH.y, 20, HEARTH.x, HEARTH.y, 620);
    glow.addColorStop(0, bright ? '#3a2a1e' : '#1a2136');
    glow.addColorStop(0.5, '#141a2b');
    glow.addColorStop(1, PALETTE.night);
    ink.fillStyle = glow;
    ink.fillRect(0, 0, FIELD.width, FIELD.height);

    ink.fillStyle = `rgba(200,214,255,${0.18 + bright * 0.25})`;
    for (let index = 0; index < 90; index += 1) {
      const x = ((index * 7919) % FIELD.width) + 0.5;
      const y = ((index * 104729) % 240) + 8.5;
      const size = index % 5 === 0 ? 2 : 1;
      ink.fillRect(x, y, size, size);
    }

    ink.fillStyle = PALETTE.farTrees;
    for (const tree of forest) if (tree.back) paintTree(tree, 0.8);
    ink.fillStyle = PALETTE.trees;
    for (const tree of forest) if (!tree.back) paintTree(tree, 1);
  }

  function paintTree(tree, depth) {
    ink.beginPath();
    ink.moveTo(tree.x, tree.y - tree.height);
    ink.lineTo(tree.x - tree.width / 2, tree.y);
    ink.lineTo(tree.x + tree.width / 2, tree.y);
    ink.closePath();
    ink.fill();
    if (depth === 1) {
      ink.fillStyle = '#1d2a47';
      ink.fillRect(tree.x - 3, tree.y - 6, 6, 18);
      ink.fillStyle = PALETTE.trees;
    }
  }

  function paintGround() {
    ink.fillStyle = PALETTE.clearing;
    fillEllipse(HEARTH.x, HEARTH.y + 120, FIELD.width * 0.72, 300, 0, 0, FULL_TURN);
    ink.fillStyle = PALETTE.ground;
    fillEllipse(HEARTH.x, HEARTH.y + 150, FIELD.width * 0.6, 220, 0, 0, FULL_TURN);

    ink.strokeStyle = 'rgba(120,150,200,0.22)';
    ink.lineWidth = 2;
    ink.beginPath();
    ink.arc(HEARTH.x, HEARTH.y, SHIELD.radius, 0, FULL_TURN);
    ink.stroke();
  }

  function paintFire(state) {
    const flame = state.flame;

    ink.fillStyle = PALETTE.hearthStone;
    fillEllipse(HEARTH.x, HEARTH.y + 26, HEARTH.radius * 1.7, HEARTH.radius * 0.7, 0, 0, FULL_TURN);
    ink.fillStyle = PALETTE.hearthHot;
    fillEllipse(HEARTH.x, HEARTH.y + 14, HEARTH.radius * 1.2, HEARTH.radius * 0.45, 0, 0, FULL_TURN);

    const lightRadius = 190 + flame * 420;
    const light = ink.createRadialGradient(HEARTH.x, HEARTH.y, 8, HEARTH.x, HEARTH.y, lightRadius);
    light.addColorStop(0, `rgba(255,190,110,${0.36 + flame * 0.5})`);
    light.addColorStop(0.5, `rgba(255,140,70,${0.10 + flame * 0.2})`);
    light.addColorStop(1, 'rgba(255,120,60,0)');
    ink.fillStyle = light;
    fillCircle(HEARTH.x, HEARTH.y, lightRadius, 0, FULL_TURN);

    const flicker = 0.86 + Math.sin(state.elapsed * 11) * 0.06 + Math.sin(state.elapsed * 23.3) * 0.05;
    const height = 26 + flame * 96 * flicker;
    const width = 18 + flame * 30;
    paintTongue(HEARTH.x, HEARTH.y + 16, width, height, '#ff7a2f', '#ffb347', state.elapsed);
    paintTongue(HEARTH.x, HEARTH.y + 18, width * 0.55, height * 0.66, '#ffb347', '#ffe9b0', state.elapsed * 1.7);

    ink.fillStyle = PALETTE.ember;
    for (let index = 0; index < 6; index += 1) {
      const t = (state.elapsed * (0.6 + index * 0.13) + index * 0.37) % 1;
      const x = HEARTH.x + Math.sin(state.elapsed * 3 + index * 2.1) * (10 + index * 4);
      const y = HEARTH.y + 10 - t * (70 + flame * 90);
      ink.globalAlpha = (1 - t) * 0.8;
      fillCircle(x, y, 2.4 - t * 1.4, 0, FULL_TURN);
    }
    ink.globalAlpha = 1;
  }

  function paintTongue(x, baseY, width, height, outer, inner, t) {
    ink.beginPath();
    ink.moveTo(x - width, baseY);
    ink.quadraticCurveTo(x - width * 0.9, baseY - height * 0.5, x + Math.sin(t * 5) * width * 0.3, baseY - height);
    ink.quadraticCurveTo(x + width * 0.9, baseY - height * 0.5, x + width, baseY);
    ink.closePath();
    ink.fillStyle = outer;
    ink.fill();
    ink.beginPath();
    ink.ellipse(x, baseY - height * 0.28, width * 0.42, height * 0.3, 0, 0, FULL_TURN);
    ink.fillStyle = inner;
    ink.fill();
  }

  function paintGuard(state) {
    const flashing = state.shieldFlash > 0;
    const dashing = state.dashTimer > 0;
    ink.lineCap = 'round';
    ink.lineWidth = dashing ? 20 : 15;
    ink.strokeStyle = flashing ? PALETTE.shieldFlash : dashing ? '#bff0ff' : PALETTE.shield;
    ink.beginPath();
    ink.arc(HEARTH.x, HEARTH.y, SHIELD.radius, state.shieldAngle - SHIELD.half, state.shieldAngle + SHIELD.half);
    ink.stroke();
    ink.lineWidth = 3;
    ink.strokeStyle = 'rgba(120,180,240,0.5)';
    ink.beginPath();
    ink.arc(HEARTH.x, HEARTH.y, SHIELD.radius + 11 + (flashing ? 5 : 0), state.shieldAngle - SHIELD.half, state.shieldAngle + SHIELD.half);
    ink.stroke();

    const bx = HEARTH.x + Math.cos(state.shieldAngle) * SHIELD.radius;
    const by = HEARTH.y + Math.sin(state.shieldAngle) * SHIELD.radius;
    ink.fillStyle = flashing ? PALETTE.shieldFlash : '#9fd0f0';
    fillCircle(bx, by, dashing ? 13 : 9, 0, FULL_TURN);
  }

  function paintEmber(item, x, y) {
    ink.fillStyle = 'rgba(255,179,71,0.25)';
    fillCircle(x, y, item.radius * 2.1, 0, FULL_TURN);
    ink.fillStyle = PALETTE.ember;
    fillCircle(x, y, item.radius, 0, FULL_TURN);
    ink.fillStyle = PALETTE.emberCore;
    fillCircle(x - item.radius * 0.25, y - item.radius * 0.25, item.radius * 0.45, 0, FULL_TURN);
  }

  function paintFrost(item, x, y) {
    ink.globalAlpha = item.deflected ? 0.55 : 1;
    ink.save();
    ink.translate(x, y);
    ink.rotate(item.spin);
    ink.fillStyle = PALETTE.frost;
    ink.beginPath();
    for (let point = 0; point < 6; point += 1) {
      const angle = (point / 6) * FULL_TURN;
      const outer = item.radius * 1.25;
      const inner = item.radius * 0.5;
      const a1 = angle - 0.28;
      const a2 = angle + 0.28;
      if (point === 0) ink.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      else ink.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ink.lineTo(Math.cos(a1) * inner, Math.sin(a1) * inner);
      ink.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
    }
    ink.closePath();
    ink.fill();
    ink.fillStyle = PALETTE.frostCore;
    fillCircle(0, 0, item.radius * 0.4, 0, FULL_TURN);
    ink.restore();
    ink.globalAlpha = 1;
  }

  function paintShade(item, x, y) {
    ink.fillStyle = 'rgba(160,108,255,0.22)';
    fillCircle(x, y, item.radius * 2.4, 0, FULL_TURN);
    ink.save();
    ink.translate(x, y);
    ink.rotate(item.spin * 0.6);
    ink.fillStyle = PALETTE.void;
    ink.beginPath();
    for (let point = 0; point < 5; point += 1) {
      const angle = (point / 5) * FULL_TURN;
      const outer = item.radius * (point % 2 === 0 ? 1.3 : 1.05);
      if (point === 0) ink.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      else ink.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    ink.closePath();
    ink.fill();
    ink.fillStyle = PALETTE.voidCore;
    fillCircle(0, 0, item.radius * 0.34, 0, FULL_TURN);
    ink.restore();
  }

  function paintDrifters(state) {
    for (const item of state.items) {
      if (!item.active) continue;
      const x = HEARTH.x + Math.cos(item.angle) * item.distance;
      const y = HEARTH.y + Math.sin(item.angle) * item.distance;
      const paint = item.kind === KIND_EMBER ? paintEmber : item.kind === KIND_FROST ? paintFrost : paintShade;
      paint(item, x, y);
    }
  }

  function paintParticles(state) {
    for (const p of state.sparks) {
      if (!p.active) continue;
      ink.globalAlpha = Math.max(0, p.life / p.max);
      ink.fillStyle = p.color;
      fillCircle(p.x, p.y, p.size, 0, FULL_TURN);
    }
    ink.globalAlpha = 1;
  }

  function paintFuel(state) {

    const pct = Math.max(0, Math.min(1, state.flame / HEARTH.flameMax));
    ink.fillStyle = PALETTE.bar;
    roundedPath(FUEL.x, FUEL.y, FUEL.width, FUEL.height, 11);
    ink.fill();
    const color = pct > 0.55 ? PALETTE.flame : pct > 0.28 ? PALETTE.ember : PALETTE.warn;
    ink.fillStyle = color;
    roundedPath(FUEL.x + 3, FUEL.y + 3, Math.max(0, (FUEL.width - 6) * pct), FUEL.height - 6, 8);
    ink.fill();
    ink.strokeStyle = '#4a5880';
    ink.lineWidth = 2;
    roundedPath(FUEL.x, FUEL.y, FUEL.width, FUEL.height, 11);
    ink.stroke();
    text('HEARTH FLAME', FIELD.width / 2, FUEL.y - 10, 17, PALETTE.muted, 'center', '600');
  }

  function roundedPath(x, y, width, height, radius) {
    ink.beginPath();
    ink.moveTo(x + radius, y);
    ink.arcTo(x + width, y, x + width, y + height, radius);
    ink.arcTo(x + width, y + height, x, y + height, radius);
    ink.arcTo(x, y + height, x, y, radius);
    ink.arcTo(x, y, x + width, y, radius);
    ink.closePath();
  }

  function paintPoints(state) {

    text(scoreLabel(Math.round(state.score)), 28, 118, 40, PALETTE.text, 'left', '700');
    text('SCORE', 28, 142, 16, PALETTE.muted, 'left', '600');
  }

  function paintProgress(state) {

    const pipY = 108;
    const pipGap = 22;
    const pipStart = FIELD.width - 40 - (WAVE.last - 1) * pipGap;
    for (let wave = 1; wave <= WAVE.last; wave += 1) {
      const done = wave < state.wave;
      const here = wave === state.wave;
      ink.fillStyle = done ? PALETTE.flame : here ? PALETTE.ember : '#38436a';
      ink.beginPath();
      const radius = here ? 9 : 7;
      ink.arc(pipStart + (wave - 1) * pipGap, pipY, radius, 0, FULL_TURN);
      ink.fill();
    }
    text('WAVES', FIELD.width - 40, 142, 16, PALETTE.muted, 'right', '600');
    text(waveLabel(`${state.wave} of ${WAVE.last}`), FIELD.width - 40 - (WAVE.last - 1) * pipGap - 16, pipY + 6, 18, PALETTE.text, 'right', '600');
  }

  function paintCombo(state) {

    if (state.chain > 1) {
      text(chainLabel(`${state.chain}`), 28, FIELD.height - 30, 34, PALETTE.ember, 'left', '700');
      text(`CHAIN  ${CHAIN_MAX} max`, 28 + 60, FIELD.height - 30, 16, PALETTE.muted, 'left', '600');
      const width = 150 * ((state.chainTimer ?? 0) / 2.4);
      ink.fillStyle = PALETTE.ember;
      roundedPath(28, FIELD.height - 20, Math.max(0, width), 6, 3);
      ink.fill();
    }
  }

  function paintKeys() {

    text('A D or \u2190 \u2192  swing the shield   \u00b7   SPACE  dash   \u00b7   P  pause   \u00b7   M  mute', FIELD.width - 28, FIELD.height - 24, 17, PALETTE.muted, 'right', '500');
  }

  function paintReadouts(state) {

    ink.textBaseline = 'alphabetic';
    paintFuel(state);
    paintPoints(state);
    paintProgress(state);
    paintCombo(state);
    paintKeys();
  }

  function paintOverlay(title, titleColor, lines, lineColors, prompt) {

    const height = OVERLAY.top + lines.length * OVERLAY.line + OVERLAY.bottom;
    const x = (FIELD.width - OVERLAY.width) / 2;
    const y = (FIELD.height - height) / 2;
    ink.fillStyle = 'rgba(8,11,20,0.82)';
    roundedPath(x - 10, y - 10, OVERLAY.width + 20, height + 20, 22);
    ink.fill();
    ink.fillStyle = PALETTE.panel;
    roundedPath(x, y, OVERLAY.width, height, 18);
    ink.fill();
    ink.strokeStyle = PALETTE.panelEdge;
    ink.lineWidth = 3;
    roundedPath(x, y, OVERLAY.width, height, 18);
    ink.stroke();
    ink.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 86, 52, titleColor, 'center', '800');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + OVERLAY.top + index * OVERLAY.line, 23, lineColors?.[index] ?? PALETTE.muted, 'center', '500');
    }
    const pulse = 0.72 + Math.sin((Date.now() % 1600) / 1600 * FULL_TURN) * 0.28;
    ink.globalAlpha = pulse;
    text(prompt, FIELD.width / 2, y + height - 34, 27, PALETTE.ember, 'center', '700');
    ink.globalAlpha = 1;
  }

  const welcome = [
    'Feed the hearth. Turn the frost away. Survive to dawn.',
    'A dark forest, one fire, ten waves of night.',
    'Swing the arc shield with the mouse, or A D.',
    'Catch embers to feed the flame \u00b7 deflect frost to strike sparks.',
    'Shades slip past the shield \u2014 only a dash turns them.',
  ];
  const resting = ['The fire waits. Nothing drifts while you rest.'];
  const defeat = ['', '', 'The frost is quick, and the dark is patient.', ''];
  const victory = ['You kept the fire through the last wave.', 'Dawn breaks over the clearing.', '', ''];

  const sceneLayers = [paintGround, paintFire, paintGuard, paintDrifters, paintParticles];

  function draw(state, screen, best, startedThisRun) {
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.fillStyle = PALETTE.night;
    ink.fillRect(0, 0, canvas.width, canvas.height);
    ink.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const bright = screen === SCREEN_TITLE ? 0.85 : state.flame;
    paintNight(bright);
    for (const layer of sceneLayers) layer(state);

    if (screen === SCREEN_TITLE) {

      welcome[0] = 'Feed the hearth. Turn the frost away. Survive to dawn.';
      paintOverlay('EMBERKEEPER', PALETTE.ember, welcome, undefined, 'Press SPACE or click to light the fire');
      text(bestLabel(`Best ${best}`), FIELD.width / 2, FIELD.height - 128, 21, PALETTE.text, 'center', '600');
      return;
    }
    paintReadouts(state);
    if (screen === SCREEN_PAUSED) {
      paintOverlay('PAUSED', PALETTE.text, resting, undefined, 'Press P to keep the fire');
    } else if (screen === SCREEN_OVER) {
      defeat[0] = finalLabel(`Score ${Math.round(state.score)}`);
      defeat[1] = bestLabel(`Best ${best}`);
      defeat[2] = 'The frost is quick, and the dark is patient.';
      defeat[3] = `You held to wave ${state.wave} of ${WAVE.last}.`;
      paintOverlay('THE FIRE WENT OUT', PALETTE.warn, defeat, [PALETTE.text, PALETTE.ember, PALETTE.muted, PALETTE.text], 'Press SPACE or click to light it again');
    } else if (screen === SCREEN_WON) {
      victory[0] = finalLabel(`Score ${Math.round(state.score)}`);
      victory[1] = bestLabel(`Best ${best}`);
      victory[2] = 'You kept the fire through the last wave.';
      victory[3] = 'Dawn breaks over the clearing.';
      paintOverlay('SURVIVED TO DAWN', PALETTE.good, victory, [PALETTE.text, PALETTE.ember, PALETTE.good, PALETTE.muted], 'Press SPACE or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
