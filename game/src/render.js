// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 clearing
// is scaled to fit the window and centred. The scene is a dark forest clearing at night: a ring
// of pines, a stone hearth with a breathing flame, the arc shield, the drifting embers, frost
// and shades, and a HUD along the top and bottom. Text that holds a number is rebuilt only when
// the number changes, so a frame allocates nothing.
import { CHAIN_MAX, FIELD, FONT, HEARTH, PALETTE, SHIELD, WAVE } from './config.js';
import { KIND_EMBER, KIND_FROST } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WON = 'won';

const TAU = Math.PI * 2;
const PANEL = { width: 720, top: 150, line: 36, bottom: 82 };
const BAR = { x: FIELD.width / 2 - 220, y: 78, width: 440, height: 22 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

/** A deterministic scatter of pine trees around the clearing, computed once. */
function buildPines() {
  const pines = [];
  for (let index = 0; index < 34; index += 1) {
    const t = index / 34;
    const jitter = ((index * 2654435761) % 1000) / 1000;
    const x = -40 + t * (FIELD.width + 80) + (jitter - 0.5) * 90;
    const height = 120 + ((index * 40503) % 100) / 100 * 150;
    const baseY = index % 3 === 0 ? 214 : 176;
    pines.push({ x, y: baseY + (jitter - 0.5) * 40, height, width: height * 0.46, back: index % 2 === 0 });
  }
  return pines;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, centerX: FIELD.width / 2, centerY: HEARTH.y };
  const scoreLabel = cachedLabel('');
  const waveLabel = cachedLabel('Wave ');
  const chainLabel = cachedLabel('x');
  const finalLabel = cachedLabel('');
  const bestLabel = (t) => t;
  const pines = buildPines();
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    // The input module reads this to turn pointer pixels into clearing coordinates.
    canvas.__view = { x: view.x, y: view.y, scale: view.scale, centerX: HEARTH.x, centerY: HEARTH.y };
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}|${weight ?? ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.fillText(value, x, y);
  }

  function drawSky(state, bright) {
    const glow = context.createRadialGradient(HEARTH.x, HEARTH.y, 20, HEARTH.x, HEARTH.y, 620);
    glow.addColorStop(0, bright ? '#3a2a1e' : '#1a2136');
    glow.addColorStop(0.5, '#141a2b');
    glow.addColorStop(1, PALETTE.night);
    context.fillStyle = glow;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Stars, fixed in place, dimmed as the flame shrinks.
    context.fillStyle = `rgba(200,214,255,${0.18 + bright * 0.25})`;
    for (let index = 0; index < 90; index += 1) {
      const x = ((index * 7919) % FIELD.width) + 0.5;
      const y = ((index * 104729) % 240) + 8.5;
      const size = index % 5 === 0 ? 2 : 1;
      context.fillRect(x, y, size, size);
    }

    context.fillStyle = PALETTE.farTrees;
    for (const pine of pines) if (pine.back) drawPine(pine, 0.8);
    context.fillStyle = PALETTE.trees;
    for (const pine of pines) if (!pine.back) drawPine(pine, 1);
  }

  function drawPine(pine, depth) {
    context.beginPath();
    context.moveTo(pine.x, pine.y - pine.height);
    context.lineTo(pine.x - pine.width / 2, pine.y);
    context.lineTo(pine.x + pine.width / 2, pine.y);
    context.closePath();
    context.fill();
    if (depth === 1) {
      context.fillStyle = '#1d2a47';
      context.fillRect(pine.x - 3, pine.y - 6, 6, 18);
      context.fillStyle = PALETTE.trees;
    }
  }

  function drawClearing(state) {
    context.fillStyle = PALETTE.clearing;
    context.beginPath();
    context.ellipse(HEARTH.x, HEARTH.y + 120, FIELD.width * 0.72, 300, 0, 0, TAU);
    context.fill();
    context.fillStyle = PALETTE.ground;
    context.beginPath();
    context.ellipse(HEARTH.x, HEARTH.y + 150, FIELD.width * 0.6, 220, 0, 0, TAU);
    context.fill();

    // The shield's ring, faint, so the reach reads even when the arc is elsewhere.
    context.strokeStyle = 'rgba(120,150,200,0.22)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(HEARTH.x, HEARTH.y, SHIELD.radius, 0, TAU);
    context.stroke();
  }

  function drawHearth(state) {
    const flame = state.flame;
    // stone base
    context.fillStyle = PALETTE.hearthStone;
    context.beginPath();
    context.ellipse(HEARTH.x, HEARTH.y + 26, HEARTH.radius * 1.7, HEARTH.radius * 0.7, 0, 0, TAU);
    context.fill();
    context.fillStyle = PALETTE.hearthHot;
    context.beginPath();
    context.ellipse(HEARTH.x, HEARTH.y + 14, HEARTH.radius * 1.2, HEARTH.radius * 0.45, 0, 0, TAU);
    context.fill();

    // the light it throws
    const lightRadius = 190 + flame * 420;
    const light = context.createRadialGradient(HEARTH.x, HEARTH.y, 8, HEARTH.x, HEARTH.y, lightRadius);
    light.addColorStop(0, `rgba(255,190,110,${0.36 + flame * 0.5})`);
    light.addColorStop(0.5, `rgba(255,140,70,${0.10 + flame * 0.2})`);
    light.addColorStop(1, 'rgba(255,120,60,0)');
    context.fillStyle = light;
    context.beginPath();
    context.arc(HEARTH.x, HEARTH.y, lightRadius, 0, TAU);
    context.fill();

    // the fire itself: two rounded tongues, sized by the flame level
    const flicker = 0.86 + Math.sin(state.elapsed * 11) * 0.06 + Math.sin(state.elapsed * 23.3) * 0.05;
    const height = 26 + flame * 96 * flicker;
    const width = 18 + flame * 30;
    flameTongue(HEARTH.x, HEARTH.y + 16, width, height, '#ff7a2f', '#ffb347', state.elapsed);
    flameTongue(HEARTH.x, HEARTH.y + 18, width * 0.55, height * 0.66, '#ffb347', '#ffe9b0', state.elapsed * 1.7);

    // embers rising off the fire
    context.fillStyle = PALETTE.ember;
    for (let index = 0; index < 6; index += 1) {
      const t = (state.elapsed * (0.6 + index * 0.13) + index * 0.37) % 1;
      const x = HEARTH.x + Math.sin(state.elapsed * 3 + index * 2.1) * (10 + index * 4);
      const y = HEARTH.y + 10 - t * (70 + flame * 90);
      context.globalAlpha = (1 - t) * 0.8;
      context.beginPath();
      context.arc(x, y, 2.4 - t * 1.4, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function flameTongue(x, baseY, width, height, outer, inner, t) {
    context.beginPath();
    context.moveTo(x - width, baseY);
    context.quadraticCurveTo(x - width * 0.9, baseY - height * 0.5, x + Math.sin(t * 5) * width * 0.3, baseY - height);
    context.quadraticCurveTo(x + width * 0.9, baseY - height * 0.5, x + width, baseY);
    context.closePath();
    context.fillStyle = outer;
    context.fill();
    context.beginPath();
    context.ellipse(x, baseY - height * 0.28, width * 0.42, height * 0.3, 0, 0, TAU);
    context.fillStyle = inner;
    context.fill();
  }

  function drawShield(state) {
    const flashing = state.shieldFlash > 0;
    const dashing = state.dashTimer > 0;
    context.lineCap = 'round';
    context.lineWidth = dashing ? 20 : 15;
    context.strokeStyle = flashing ? PALETTE.shieldFlash : dashing ? '#bff0ff' : PALETTE.shield;
    context.beginPath();
    context.arc(HEARTH.x, HEARTH.y, SHIELD.radius, state.shieldAngle - SHIELD.half, state.shieldAngle + SHIELD.half);
    context.stroke();
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(120,180,240,0.5)';
    context.beginPath();
    context.arc(HEARTH.x, HEARTH.y, SHIELD.radius + 11 + (flashing ? 5 : 0), state.shieldAngle - SHIELD.half, state.shieldAngle + SHIELD.half);
    context.stroke();
    // the boss at the shield's middle, so its aim reads at a glance
    const bx = HEARTH.x + Math.cos(state.shieldAngle) * SHIELD.radius;
    const by = HEARTH.y + Math.sin(state.shieldAngle) * SHIELD.radius;
    context.fillStyle = flashing ? PALETTE.shieldFlash : '#9fd0f0';
    context.beginPath();
    context.arc(bx, by, dashing ? 13 : 9, 0, TAU);
    context.fill();
  }

  function drawItems(state) {
    const items = state.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      const x = HEARTH.x + Math.cos(item.angle) * item.distance;
      const y = HEARTH.y + Math.sin(item.angle) * item.distance;
      if (item.kind === KIND_EMBER) {
        context.fillStyle = 'rgba(255,179,71,0.25)';
        context.beginPath();
        context.arc(x, y, item.radius * 2.1, 0, TAU);
        context.fill();
        context.fillStyle = PALETTE.ember;
        context.beginPath();
        context.arc(x, y, item.radius, 0, TAU);
        context.fill();
        context.fillStyle = PALETTE.emberCore;
        context.beginPath();
        context.arc(x - item.radius * 0.25, y - item.radius * 0.25, item.radius * 0.45, 0, TAU);
        context.fill();
      } else if (item.kind === KIND_FROST) {
        context.globalAlpha = item.deflected ? 0.55 : 1;
        context.save();
        context.translate(x, y);
        context.rotate(item.spin);
        context.fillStyle = PALETTE.frost;
        context.beginPath();
        for (let point = 0; point < 6; point += 1) {
          const angle = (point / 6) * TAU;
          const outer = item.radius * 1.25;
          const inner = item.radius * 0.5;
          const a1 = angle - 0.28;
          const a2 = angle + 0.28;
          if (point === 0) context.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
          else context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
          context.lineTo(Math.cos(a1) * inner, Math.sin(a1) * inner);
          context.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
        }
        context.closePath();
        context.fill();
        context.fillStyle = PALETTE.frostCore;
        context.beginPath();
        context.arc(0, 0, item.radius * 0.4, 0, TAU);
        context.fill();
        context.restore();
        context.globalAlpha = 1;
      } else {
        context.fillStyle = 'rgba(160,108,255,0.22)';
        context.beginPath();
        context.arc(x, y, item.radius * 2.4, 0, TAU);
        context.fill();
        context.save();
        context.translate(x, y);
        context.rotate(item.spin * 0.6);
        context.fillStyle = PALETTE.void;
        context.beginPath();
        for (let point = 0; point < 5; point += 1) {
          const angle = (point / 5) * TAU;
          const outer = item.radius * (point % 2 === 0 ? 1.3 : 1.05);
          if (point === 0) context.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
          else context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        }
        context.closePath();
        context.fill();
        context.fillStyle = PALETTE.voidCore;
        context.beginPath();
        context.arc(0, 0, item.radius * 0.34, 0, TAU);
        context.fill();
        context.restore();
      }
    }
  }

  function drawSparks(state) {
    const sparks = state.sparks;
    for (let index = 0; index < sparks.length; index += 1) {
      const p = sparks[index];
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.max);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawFlameBar(state) {
    // The hearth's flame, top centre: the run's life, with a notch at the burnout line.
    const pct = Math.max(0, Math.min(1, state.flame / HEARTH.flameMax));
    context.fillStyle = PALETTE.bar;
    roundRect(BAR.x, BAR.y, BAR.width, BAR.height, 11);
    context.fill();
    const color = pct > 0.55 ? PALETTE.flame : pct > 0.28 ? PALETTE.ember : PALETTE.warn;
    context.fillStyle = color;
    roundRect(BAR.x + 3, BAR.y + 3, Math.max(0, (BAR.width - 6) * pct), BAR.height - 6, 8);
    context.fill();
    context.strokeStyle = '#4a5880';
    context.lineWidth = 2;
    roundRect(BAR.x, BAR.y, BAR.width, BAR.height, 11);
    context.stroke();
    text('HEARTH FLAME', FIELD.width / 2, BAR.y - 10, 17, PALETTE.muted, 'center', '600');
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function drawHud(state) {
    context.textBaseline = 'alphabetic';
    drawFlameBar(state);
    text(scoreLabel(Math.round(state.score)), 28, 118, 40, PALETTE.text, 'left', '700');
    text('SCORE', 28, 142, 16, PALETTE.muted, 'left', '600');

    // wave pips, so the run's length is visible
    const pipY = 108;
    const pipGap = 22;
    const pipStart = FIELD.width - 40 - (WAVE.last - 1) * pipGap;
    for (let wave = 1; wave <= WAVE.last; wave += 1) {
      const done = wave < state.wave;
      const here = wave === state.wave;
      context.fillStyle = done ? PALETTE.flame : here ? PALETTE.ember : '#38436a';
      context.beginPath();
      const radius = here ? 9 : 7;
      context.arc(pipStart + (wave - 1) * pipGap, pipY, radius, 0, TAU);
      context.fill();
    }
    text('WAVES', FIELD.width - 40, 142, 16, PALETTE.muted, 'right', '600');
    text(waveLabel(`${state.wave} of ${WAVE.last}`), FIELD.width - 40 - (WAVE.last - 1) * pipGap - 16, pipY + 6, 18, PALETTE.text, 'right', '600');

    // chain multiplier bottom left, when it is more than one
    if (state.chain > 1) {
      text(chainLabel(`${state.chain}`), 28, FIELD.height - 30, 34, PALETTE.ember, 'left', '700');
      text(`CHAIN  ${CHAIN_MAX} max`, 28 + 60, FIELD.height - 30, 16, PALETTE.muted, 'left', '600');
      const width = 150 * ((state.chainTimer ?? 0) / 2.4);
      context.fillStyle = PALETTE.ember;
      roundRect(28, FIELD.height - 20, Math.max(0, width), 6, 3);
      context.fill();
    }

    // controls reminder, bottom right
    text('A D or \u2190 \u2192  swing the shield   \u00b7   SPACE  dash   \u00b7   P  pause   \u00b7   M  mute', FIELD.width - 28, FIELD.height - 24, 17, PALETTE.muted, 'right', '500');
  }

  function drawPanel(title, titleColor, lines, lineColors, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(8,11,20,0.82)';
    roundRect(x - 10, y - 10, PANEL.width + 20, height + 20, 22);
    context.fill();
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, PANEL.width, height, 18);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(x, y, PANEL.width, height, 18);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 86, 52, titleColor, 'center', '800');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 23, lineColors?.[index] ?? PALETTE.muted, 'center', '500');
    }
    const pulse = 0.72 + Math.sin((Date.now() % 1600) / 1600 * TAU) * 0.28;
    context.globalAlpha = pulse;
    text(prompt, FIELD.width / 2, y + height - 34, 27, PALETTE.ember, 'center', '700');
    context.globalAlpha = 1;
  }

  const TITLE_LINES = [
    'Feed the hearth. Turn the frost away. Survive to dawn.',
    'A dark forest, one fire, ten waves of night.',
    'Swing the arc shield with the mouse, or A D.',
    'Catch embers to feed the flame \u00b7 deflect frost to strike sparks.',
    'Shades slip past the shield \u2014 only a dash turns them.',
  ];
  const PAUSED_LINES = ['The fire waits. Nothing drifts while you rest.'];
  const OVER_LINES = ['', '', 'The frost is quick, and the dark is patient.', ''];
  const WON_LINES = ['You kept the fire through the last wave.', 'Dawn breaks over the clearing.', '', ''];

  /** Paint one frame: the scene, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, startedThisRun) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.night;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const bright = screen === SCREEN_TITLE ? 0.85 : state.flame;
    drawSky(state, bright);
    drawClearing(state);
    drawHearth(state);
    drawShield(state);
    drawItems(state);
    drawSparks(state);

    if (screen === SCREEN_TITLE) {
      // A quiet demonstration: the title, the rules, the best score, and how to start.
      TITLE_LINES[0] = 'Feed the hearth. Turn the frost away. Survive to dawn.';
      drawPanel('EMBERKEEPER', PALETTE.ember, TITLE_LINES, undefined, 'Press SPACE or click to light the fire');
      text(bestLabel(`Best ${best}`), FIELD.width / 2, FIELD.height - 128, 21, PALETTE.text, 'center', '600');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', PALETTE.text, PAUSED_LINES, undefined, 'Press P to keep the fire');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(`Score ${Math.round(state.score)}`);
      OVER_LINES[1] = bestLabel(`Best ${best}`);
      OVER_LINES[2] = 'The frost is quick, and the dark is patient.';
      OVER_LINES[3] = `You held to wave ${state.wave} of ${WAVE.last}.`;
      drawPanel('THE FIRE WENT OUT', PALETTE.warn, OVER_LINES, [PALETTE.text, PALETTE.ember, PALETTE.muted, PALETTE.text], 'Press SPACE or click to light it again');
    } else if (screen === SCREEN_WON) {
      WON_LINES[0] = finalLabel(`Score ${Math.round(state.score)}`);
      WON_LINES[1] = bestLabel(`Best ${best}`);
      WON_LINES[2] = 'You kept the fire through the last wave.';
      WON_LINES[3] = 'Dawn breaks over the clearing.';
      drawPanel('SURVIVED TO DAWN', PALETTE.good, WON_LINES, [PALETTE.text, PALETTE.ember, PALETTE.good, PALETTE.muted], 'Press SPACE or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
