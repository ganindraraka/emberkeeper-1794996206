// The rules and state of Emberkeeper, with no drawing and no browser in it. The hearth burns
// at the centre, the arc shield swings around it, and three kinds of thing drift in from the
// dark: embers to catch, frost to turn away, and void shades that slip past the shield and
// must be dodged. step() advances one fixed step and returns what happened as bit flags, so
// the caller can react without the world knowing about screens or sound. Nothing here
// allocates after createWorld returns.
import { CHAIN_MAX, EMBER, FIELD, FROST, HEARTH, POOL_SIZE, SHIELD, VOID, WAVE } from './config.js';

export const KIND_EMBER = 0;
export const KIND_FROST = 1;
export const KIND_VOID = 2;

export const EVENT_EMBER = 1;
export const EVENT_FROST = 2;
export const EVENT_CLASH = 4;
export const EVENT_BURN = 8;
export const EVENT_SHADE = 16;
export const EVENT_OVER = 32;
export const EVENT_WON = 64;
export const EVENT_WAVE = 128;

const TAU = Math.PI * 2;

function randomBetween(random, low, high) {
  return low + random() * (high - low);
}

export function createWorld(random) {
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_EMBER, angle: 0, distance: 0, radius: 0, speed: 0, spin: 0, deflected: false });
  }
  const state = {
    shieldAngle: -Math.PI / 2,
    shieldFlash: 0,
    dashTimer: 0,
    dashCooldown: 0,
    flame: HEARTH.flameStart,
    score: 0,
    chain: 1,
    chainTimer: 0,
    wave: 1,
    waveTimer: WAVE.seconds,
    elapsed: 0,
    frostTimer: 1.1,
    emberTimer: 0.5,
    voidTimer: WAVE.voidInterval,
    items,
    sparks: [],
    status: 'playing',
  };

  // A small ring of one-shot particles for feedback; allocated once, reused forever.
  for (let index = 0; index < 96; index += 1) {
    state.sparks.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff' });
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spark(x, y, vx, vy, life, size, color) {
    for (let index = 0; index < state.sparks.length; index += 1) {
      const p = state.sparks[index];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.max = life;
      p.size = size;
      p.color = color;
      return;
    }
  }

  function burst(x, y, count, speed, color, size) {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * TAU + random() * 0.6;
      const pace = speed * (0.5 + random() * 0.8);
      spark(x, y, Math.cos(angle) * pace, Math.sin(angle) * pace, 0.35 + random() * 0.4, size, color);
    }
  }

  function reset() {
    for (const item of items) item.active = false;
    for (const p of state.sparks) p.active = false;
    state.shieldAngle = -Math.PI / 2;
    state.shieldFlash = 0;
    state.dashTimer = 0;
    state.dashCooldown = 0;
    state.flame = HEARTH.flameStart;
    state.score = 0;
    state.chain = 1;
    state.chainTimer = 0;
    state.wave = 1;
    state.waveTimer = WAVE.seconds;
    state.elapsed = 0;
    state.frostTimer = 1.1;
    state.emberTimer = 0.5;
    state.voidTimer = WAVE.voidInterval;
    state.status = 'playing';
  }

  /** Everything is placed on a ring outside the clearing and drifts toward the hearth. */
  function spawn(kind) {
    const item = freeItem();
    if (item === null) return null;
    item.active = true;
    item.kind = kind;
    item.angle = random() * TAU;
    item.distance = 520 + random() * 200;
    item.deflected = false;
    const boost = (state.wave - 1) * (kind === KIND_EMBER ? EMBER.speedPerWave : kind === KIND_FROST ? FROST.speedPerWave : VOID.speedPerWave);
    if (kind === KIND_EMBER) {
      item.radius = EMBER.radius;
      item.speed = EMBER.speed + boost;
      item.spin = random() * TAU;
    } else if (kind === KIND_FROST) {
      item.radius = FROST.radius;
      item.speed = FROST.speed + boost;
      item.spin = random() * TAU;
    } else {
      item.radius = VOID.radius;
      item.speed = VOID.speed + boost;
      item.spin = random() * TAU;
    }
    return item;
  }

  function itemAt(item) {
    return { x: HEARTH.x + Math.cos(item.angle) * item.distance, y: HEARTH.y + Math.sin(item.angle) * item.distance };
  }

  /** The item's distance from the hearth is judged on angle; a deflection reflects it. */
  function deflect(item, events) {
    item.deflected = true;
    item.speed = -Math.abs(item.speed) * 0.9;
    state.shieldFlash = SHIELD.flash;
    burst(HEARTH.x + Math.cos(item.angle) * item.distance, HEARTH.y + Math.sin(item.angle) * item.distance, 9, 190, '#eaf6ff', 2.4);
    return events;
  }

  /** One fixed step. `steer` is -1, 0 or 1 (anticlockwise, still, clockwise); `dashing` is a
   *  held Space. With `harmless` set (the title backdrop) things drift but nothing scores. */
  function step(dt, steer, dashing, harmless) {
    let events = 0;

    // --- the shield -------------------------------------------------------------
    state.shieldAngle = (state.shieldAngle + steer * SHIELD.speed * dt) % TAU;
    if (state.shieldFlash > 0) state.shieldFlash = Math.max(0, state.shieldFlash - dt);
    if (state.dashCooldown > 0) state.dashCooldown = Math.max(0, state.dashCooldown - dt);
    if (dashing && state.dashCooldown === 0 && state.dashTimer === 0 && state.flame > HEARTH.flameMin) {
      state.dashTimer = SHIELD.dashSeconds;
      state.dashCooldown = SHIELD.dashCooldown;
      burst(HEARTH.x + Math.cos(state.shieldAngle) * SHIELD.radius, HEARTH.y + Math.sin(state.shieldAngle) * SHIELD.radius, 7, 120, '#eaf6ff', 2);
    }
    if (state.dashTimer > 0) state.dashTimer = Math.max(0, state.dashTimer - dt);

    if (harmless) {
      // Title backdrop: drift everything toward the hearth and vanish it; no rules fire.
      for (const item of items) {
        if (!item.active) continue;
        item.distance -= item.speed * dt;
        item.spin += dt;
        if (item.distance < 30) item.active = false;
      }
      state.emberTimer -= dt;
      if (state.emberTimer <= 0) {
        spawn(KIND_EMBER);
        state.emberTimer = randomBetween(random, 0.3, 0.7);
      }
      return events;
    }

    state.elapsed += dt;

    // --- the clock, the waves, the chain ---------------------------------------
    state.waveTimer -= dt;
    if (state.waveTimer <= 0 && state.wave < WAVE.last) {
      state.wave += 1;
      state.waveTimer += WAVE.seconds;
      events |= EVENT_WAVE;
    }
    if (state.chainTimer > 0) {
      state.chainTimer = Math.max(0, state.chainTimer - dt);
      if (state.chainTimer === 0 && state.chain > 1) state.chain = 1;
    }

    // --- the flame breathes down on its own, harder with each wave -------------
    state.flame = Math.max(0, state.flame - (0.012 + (state.wave - 1) * 0.0016) * dt);
    if (state.flame <= HEARTH.flameMin) {
      state.flame = 0;
      state.status = 'burntout';
      events |= EVENT_OVER;
      burst(HEARTH.x, HEARTH.y, 22, 220, '#ff8b3d', 3);
      return events;
    }

    // --- spawning --------------------------------------------------------------
    const pressure = WAVE.growth ** (state.wave - 1);
    state.frostTimer -= dt;
    if (state.frostTimer <= 0) {
      spawn(KIND_FROST);
      state.frostTimer += Math.max(0.42, WAVE.frostInterval / pressure) + random() * 0.3;
    }
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawn(KIND_EMBER);
      state.emberTimer += Math.max(0.5, WAVE.emberInterval / pressure) * randomBetween(random, 0.7, 1.3);
    }
    if (state.wave >= VOID.fromWave) {
      state.voidTimer -= dt;
      if (state.voidTimer <= 0) {
        spawn(KIND_VOID);
        state.voidTimer += Math.max(1.6, WAVE.voidInterval / pressure) + random() * 1.2;
      }
    }

    // --- the drifting things ----------------------------------------------------
    const reach = SHIELD.radius + (state.dashTimer > 0 ? SHIELD.dashReach * 30 : 0);
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.distance -= item.speed * dt;
      item.spin += dt * (item.deflected ? 5 : 1.4);

      const x = HEARTH.x + Math.cos(item.angle) * item.distance;
      const y = HEARTH.y + Math.sin(item.angle) * item.distance;

      if (item.deflected) {
        if (item.distance > FIELD.width * 0.85 || item.distance < -FIELD.width * 0.4) item.active = false;
        continue;
      }

      // The shield's arc: does the drifting thing cross it inside the block?
      const shieldArc = Math.abs(shortestTurn(item.angle, state.shieldAngle)) <= SHIELD.half;
      const canBlock = item.kind !== KIND_VOID || state.dashTimer > 0;
      if (shieldArc && item.distance <= reach + item.radius && item.distance >= SHIELD.radius - 34 && canBlock) {
        if (item.kind === KIND_FROST) {
          // Frost turned away: score it, and pay a clash bonus if frost meets frost.
          const reflected = reflectFrost(item, reach);
          if (reflected) {
            state.score += FROST.clashPoints * state.chain;
            state.chain = Math.min(CHAIN_MAX, state.chain + 1);
            state.chainTimer = 2.4;
            state.flame = Math.min(HEARTH.flameMax, state.flame + HEARTH.clashFeed);
            events |= EVENT_CLASH;
          } else {
            state.score += FROST.points * state.chain;
            state.chain = Math.min(CHAIN_MAX, state.chain + 1);
            state.chainTimer = 2.4;
            events |= EVENT_FROST;
          }
        } else if (item.kind === KIND_VOID) {
          // Only a dashing shield turns a shade; a slow one goes straight through.
          state.score += VOID.points * state.chain;
          deflect(item, events);
          events |= EVENT_FROST;
        }
        continue;
      }

      // Anything that falls past the ring and reaches the hearth lands.
      if (item.distance <= HEARTH.radius + item.radius) {
        item.active = false;
        if (item.kind === KIND_EMBER) {
          state.flame = Math.min(HEARTH.flameMax, state.flame + HEARTH.emberFeed + Math.min(0.02, state.chain * 0.002));
          state.score += EMBER.points * state.chain;
          state.chain = Math.min(CHAIN_MAX, state.chain + 1);
          state.chainTimer = 2.4;
          burst(HEARTH.x, HEARTH.y, 6, 110, '#ffb347', 2.2);
          events |= EVENT_EMBER;
        } else if (item.kind === KIND_FROST) {
          state.flame = Math.max(0, state.flame - HEARTH.frostDamage);
          state.chain = 1;
          state.chainTimer = 0;
          burst(x, y, 12, 160, '#7fd8ff', 2.6);
          events |= EVENT_BURN;
        } else {
          state.flame = Math.max(0, state.flame - VOID.flameDamage);
          state.chain = 1;
          state.chainTimer = 0;
          burst(x, y, 16, 200, '#a06cff', 3);
          events |= EVENT_SHADE;
        }
        if (state.flame <= HEARTH.flameMin) {
          state.flame = 0;
          state.status = 'burntout';
          events |= EVENT_OVER;
          burst(HEARTH.x, HEARTH.y, 22, 220, '#ff8b3d', 3);
          return events;
        }
      }
    }

    // --- particles --------------------------------------------------------------
    for (let index = 0; index < state.sparks.length; index += 1) {
      const p = state.sparks[index];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

    // --- dawn -------------------------------------------------------------------
    if (state.wave >= WAVE.last && state.waveTimer <= 0) {
      state.status = 'dawn';
      events |= EVENT_WON;
      for (let index = 0; index < 40; index += 1) {
        spark(HEARTH.x, HEARTH.y, Math.cos(index) * 240, Math.sin(index * 1.7) * 240, 0.9, 3, '#ffe07a');
      }
    }

    return events;
  }

  /** Turn one frost shard into a deflected shard that will clash with the next frost it meets. */
  function reflectFrost(item, reach) {
    item.deflected = false;
    let clash = false;
    for (let index = 0; index < items.length; index += 1) {
      const other = items[index];
      if (other === item || !other.active || other.kind !== KIND_FROST) continue;
      if (Math.abs(shortestTurn(other.angle, item.angle)) < 0.5 && Math.abs(other.distance - item.distance) < 70) clash = true;
    }
    item.speed = -Math.abs(item.speed) * 1.05;
    item.deflected = true;
    state.shieldFlash = SHIELD.flash;
    const x = HEARTH.x + Math.cos(item.angle) * item.distance;
    const y = HEARTH.y + Math.sin(item.angle) * item.distance;
    burst(x, y, clash ? 16 : 9, clash ? 260 : 190, clash ? '#d8f4ff' : '#7fd8ff', clash ? 3 : 2.4);
    return clash;
  }

  reset();
  return { state, reset, step, spawn };
}

/** The signed turn from one angle to another, always in (-PI, PI]. */
export function shortestTurn(from, to) {
  let turn = (to - from) % (Math.PI * 2);
  if (turn > Math.PI) turn -= Math.PI * 2;
  if (turn < -Math.PI) turn += Math.PI * 2;
  return turn;
}
