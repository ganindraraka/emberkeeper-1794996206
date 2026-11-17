// Simulation data stays independent of the canvas, keyboard and audio.
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
const CIRCLE = Math.PI * 2;

export function shortestTurn(from, to) {
  let difference = (to - from) % (Math.PI * 2);
  if (difference > Math.PI) difference -= Math.PI * 2;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
}

export function createWorld(random) {
  const items = Array.from({ length: POOL_SIZE }, () => ({ active: false, kind: KIND_EMBER, angle: 0, distance: 0, radius: 0, speed: 0, spin: 0, deflected: false }));
  const sparks = Array.from({ length: 96 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff' }));
  const state = { items, sparks };
  const between = (low, high) => low + random() * (high - low);

  function reset() {
    for (const entry of items) entry.active = false;
    for (const particle of sparks) particle.active = false;
    Object.assign(state, {
      shieldAngle: -Math.PI / 2, shieldFlash: 0, dashTimer: 0, dashCooldown: 0,
      flame: HEARTH.flameStart, score: 0, chain: 1, chainTimer: 0,
      wave: 1, waveTimer: WAVE.seconds, elapsed: 0,
      frostTimer: 1.1, emberTimer: 0.5, voidTimer: WAVE.voidInterval, status: 'playing',
    });
  }

  function particle(x, y, vx, vy, life, size, color) {
    for (const entry of sparks) {
      if (entry.active) continue;
      Object.assign(entry, { active: true, x, y, vx, vy, life, max: life, size, color });
      return;
    }
  }

  function scatter(x, y, count, speed, color, size) {
    for (let n = 0; n < count; n += 1) {
      const heading = (n / count) * CIRCLE + random() * 0.6;
      const velocity = speed * (0.5 + random() * 0.8);
      particle(x, y, Math.cos(heading) * velocity, Math.sin(heading) * velocity, 0.35 + random() * 0.4, size, color);
    }
  }

  function spawn(kind) {
    const entry = items.find((candidate) => !candidate.active);
    if (!entry) return null;
    entry.active = true;
    entry.kind = kind;
    entry.angle = random() * CIRCLE;
    entry.distance = 520 + random() * 200;
    entry.deflected = false;
    const tuning = kind === KIND_EMBER ? EMBER : kind === KIND_FROST ? FROST : VOID;
    const increment = (state.wave - 1) * tuning.speedPerWave;
    entry.radius = tuning.radius;
    entry.speed = tuning.speed + increment;
    entry.spin = random() * CIRCLE;
    return entry;
  }

  function extendChain() {
    state.chain = Math.min(CHAIN_MAX, state.chain + 1);
    state.chainTimer = 2.4;
  }

  function extinguish() {
    state.flame = 0;
    state.status = 'burntout';
    scatter(HEARTH.x, HEARTH.y, 22, 220, '#ff8b3d', 3);
    return EVENT_OVER;
  }

  function turnFrost(entry) {
    entry.deflected = false;
    let nearby = false;
    for (const neighbor of items) {
      if (neighbor === entry || !neighbor.active || neighbor.kind !== KIND_FROST) continue;
      if (Math.abs(shortestTurn(neighbor.angle, entry.angle)) < 0.5 && Math.abs(neighbor.distance - entry.distance) < 70) nearby = true;
    }
    entry.speed = -Math.abs(entry.speed) * 1.05;
    entry.deflected = true;
    state.shieldFlash = SHIELD.flash;
    scatter(HEARTH.x + Math.cos(entry.angle) * entry.distance, HEARTH.y + Math.sin(entry.angle) * entry.distance,
      nearby ? 16 : 9, nearby ? 260 : 190, nearby ? '#d8f4ff' : '#7fd8ff', nearby ? 3 : 2.4);
    return nearby;
  }

  function step(dt, steer, dashing, harmless) {
    let events = 0;
    state.shieldAngle = (state.shieldAngle + steer * SHIELD.speed * dt) % CIRCLE;
    if (state.shieldFlash > 0) state.shieldFlash = Math.max(0, state.shieldFlash - dt);
    if (state.dashCooldown > 0) state.dashCooldown = Math.max(0, state.dashCooldown - dt);
    if (dashing && state.dashCooldown === 0 && state.dashTimer === 0 && state.flame > HEARTH.flameMin) {
      state.dashTimer = SHIELD.dashSeconds;
      state.dashCooldown = SHIELD.dashCooldown;
      scatter(HEARTH.x + Math.cos(state.shieldAngle) * SHIELD.radius, HEARTH.y + Math.sin(state.shieldAngle) * SHIELD.radius, 7, 120, '#eaf6ff', 2);
    }
    if (state.dashTimer > 0) state.dashTimer = Math.max(0, state.dashTimer - dt);

    if (harmless) {
      for (const entry of items) {
        if (!entry.active) continue;
        entry.distance -= entry.speed * dt;
        entry.spin += dt;
        if (entry.distance < 30) entry.active = false;
      }
      state.emberTimer -= dt;
      if (state.emberTimer <= 0) {
        spawn(KIND_EMBER);
        state.emberTimer = between(0.3, 0.7);
      }
      return events;
    }

    state.elapsed += dt;
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
    state.flame = Math.max(0, state.flame - (0.012 + (state.wave - 1) * 0.0016) * dt);
    if (state.flame <= HEARTH.flameMin) return events | extinguish();

    const pressure = WAVE.growth ** (state.wave - 1);
    state.frostTimer -= dt;
    if (state.frostTimer <= 0) {
      spawn(KIND_FROST);
      state.frostTimer += Math.max(0.42, WAVE.frostInterval / pressure) + random() * 0.3;
    }
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawn(KIND_EMBER);
      state.emberTimer += Math.max(0.5, WAVE.emberInterval / pressure) * between(0.7, 1.3);
    }
    if (state.wave >= VOID.fromWave) {
      state.voidTimer -= dt;
      if (state.voidTimer <= 0) {
        spawn(KIND_VOID);
        state.voidTimer += Math.max(1.6, WAVE.voidInterval / pressure) + random() * 1.2;
      }
    }

    const reach = SHIELD.radius + (state.dashTimer > 0 ? SHIELD.dashReach * 30 : 0);
    for (const entry of items) {
      if (!entry.active) continue;
      entry.distance -= entry.speed * dt;
      entry.spin += dt * (entry.deflected ? 5 : 1.4);
      const x = HEARTH.x + Math.cos(entry.angle) * entry.distance;
      const y = HEARTH.y + Math.sin(entry.angle) * entry.distance;
      if (entry.deflected) {
        if (entry.distance > FIELD.width * 0.85 || entry.distance < -FIELD.width * 0.4) entry.active = false;
        continue;
      }
      const aligned = Math.abs(shortestTurn(entry.angle, state.shieldAngle)) <= SHIELD.half;
      const vulnerable = entry.kind !== KIND_VOID || state.dashTimer > 0;
      if (aligned && entry.distance <= reach + entry.radius && entry.distance >= SHIELD.radius - 34 && vulnerable) {
        if (entry.kind === KIND_FROST) {
          if (turnFrost(entry)) {
            state.score += FROST.clashPoints * state.chain;
            extendChain();
            state.flame = Math.min(HEARTH.flameMax, state.flame + HEARTH.clashFeed);
            events |= EVENT_CLASH;
          } else {
            state.score += FROST.points * state.chain;
            extendChain();
            events |= EVENT_FROST;
          }
        } else if (entry.kind === KIND_VOID) {
          state.score += VOID.points * state.chain;
          entry.deflected = true;
          entry.speed = -Math.abs(entry.speed) * 0.9;
          state.shieldFlash = SHIELD.flash;
          scatter(x, y, 9, 190, '#eaf6ff', 2.4);
          events |= EVENT_FROST;
        }
        continue;
      }
      if (entry.distance > HEARTH.radius + entry.radius) continue;
      entry.active = false;
      if (entry.kind === KIND_EMBER) {
        state.flame = Math.min(HEARTH.flameMax, state.flame + HEARTH.emberFeed + Math.min(0.02, state.chain * 0.002));
        state.score += EMBER.points * state.chain;
        extendChain();
        scatter(HEARTH.x, HEARTH.y, 6, 110, '#ffb347', 2.2);
        events |= EVENT_EMBER;
      } else {
        state.flame = Math.max(0, state.flame - (entry.kind === KIND_FROST ? HEARTH.frostDamage : VOID.flameDamage));
        state.chain = 1;
        state.chainTimer = 0;
        if (entry.kind === KIND_FROST) {
          scatter(x, y, 12, 160, '#7fd8ff', 2.6);
          events |= EVENT_BURN;
        } else {
          scatter(x, y, 16, 200, '#a06cff', 3);
          events |= EVENT_SHADE;
        }
      }
      if (state.flame <= HEARTH.flameMin) return events | extinguish();
    }
    for (const entry of sparks) {
      if (!entry.active) continue;
      entry.life -= dt;
      if (entry.life <= 0) {
        entry.active = false;
        continue;
      }
      entry.x += entry.vx * dt;
      entry.y += entry.vy * dt;
      entry.vx *= 0.96;
      entry.vy *= 0.96;
    }
    if (state.wave >= WAVE.last && state.waveTimer <= 0) {
      state.status = 'dawn';
      events |= EVENT_WON;
      for (let n = 0; n < 40; n += 1) particle(HEARTH.x, HEARTH.y, Math.cos(n) * 240, Math.sin(n * 1.7) * 240, 0.9, 3, '#ffe07a');
    }
    return events;
  }
  reset();
  return { state, reset, step, spawn };
}
