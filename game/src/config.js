// Central balance sheet for the fixed 1280 by 720 playfield.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const HEARTH = { x: FIELD.width / 2, y: FIELD.height / 2 + 40, radius: 34, flameMin: 0.08, flameMax: 1, flameStart: 0.62, frostDamage: 0.11, emberFeed: 0.035, clashFeed: 0.012 };
export const SHIELD = { radius: 132, half: 0.42, speed: 4.6, flash: 0.16, dashReach: 0.5, dashSeconds: 0.22, dashCooldown: 0.9 };
export const EMBER = { points: 12, speed: 118, speedPerWave: 6, radius: 13 };
export const FROST = { speed: 132, speedPerWave: 9, radius: 12, points: 6, clashPoints: 22 };
export const VOID = { speed: 150, speedPerWave: 8, radius: 15, flameDamage: 0.16, points: 10, fromWave: 3, dashOnly: true };
export const WAVE = { last: 10, seconds: 16, growth: 1.16, frostInterval: 1.5, emberInterval: 1.25, voidInterval: 4.2 };
export const POOL_SIZE = 128;
export const CHAIN_MAX = 8;
export const PALETTE = { night: '#0a0d16', farTrees: '#101726', trees: '#16203a', clearing: '#1d2740', ground: '#243052', hearthStone: '#3a4160', hearthHot: '#5a3a2e', ember: '#ffb347', emberCore: '#ffe9b0', flame: '#ff8b3d', flameCore: '#ffe07a', frost: '#7fd8ff', frostCore: '#d8f4ff', void: '#a06cff', voidCore: '#e0d0ff', shield: '#eaf6ff', shieldFlash: '#ffffff', panel: '#141b2e', panelEdge: '#2b3a5c', text: '#f2f5fb', muted: '#8f9bb8', good: '#8fe38f', warn: '#ff9f6b', bar: '#2a3452' };
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'emberkeeper.best';
