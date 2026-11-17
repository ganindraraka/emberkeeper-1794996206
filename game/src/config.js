// Every tuning number and colour in one place, so balance can be read at a glance.
// The clearing is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule here depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The hearth sits at the centre of the clearing; its fire is the player's life. */
export const HEARTH = {
  x: FIELD.width / 2,
  y: FIELD.height / 2 + 40,
  radius: 34,
  /** The flame's reach, in pixels of radius: burnt out below `min`, roaring at `max`. */
  flameMin: 0.08,
  flameMax: 1,
  /** The flame as it starts a run. */
  flameStart: 0.62,
  /** Flame lost to one frost shard, and gained from one caught ember. */
  frostDamage: 0.11,
  emberFeed: 0.035,
  /** Extra flame a clashing deflection is worth. */
  clashFeed: 0.012,
};

/**
 * The arc shield the player steers around the hearth. `radius` is how far out it
 * sits, `half` how wide it is each way in radians (0.42 rad is a ~48-degree bite).
 */
export const SHIELD = {
  radius: 132,
  half: 0.42,
  /** Radians a second the shield swings while a steer key is held. */
  speed: 4.6,
  /** After a deflect the shield flashes for this long; it never stops blocking. */
  flash: 0.16,
  /** Extra reach added to a deflection while dashing (Space), which also costs kindling. */
  dashReach: 0.5,
  dashSeconds: 0.22,
  dashCooldown: 0.9,
};

/** The three things that drift in from the dark. */
export const EMBER = {
  points: 12,
  speed: 118,
  speedPerWave: 6,
  radius: 13,
  /** Embers are caught, not blocked: they must reach the hearth. */
};

export const FROST = {
  speed: 132,
  speedPerWave: 9,
  radius: 12,
  /** Frost turned away by the shield scores this; a clash (frost into frost) scores more. */
  points: 6,
  clashPoints: 22,
};

export const VOID = {
  speed: 150,
  speedPerWave: 8,
  radius: 15,
  /** A void shade cannot be deflected: it must be dodged, and it eats flame if it lands. */
  flameDamage: 0.16,
  points: 10,
  /** It only appears from this wave on. */
  fromWave: 3,
  /** How long the shield's dash can turn one away anyway: a small opening. */
  dashOnly: true,
};

/** A run is won at dawn, after surviving this many waves. */
export const WAVE = {
  last: 10,
  seconds: 16,
  /** Each wave adds this share of spawn pressure. */
  growth: 1.16,
  /** Base seconds between frost shards, embers and (later) shades, at wave 1. */
  frostInterval: 1.5,
  emberInterval: 1.25,
  voidInterval: 4.2,
};

/** Spawned things live in one pool, allocated once at boot. */
export const POOL_SIZE = 128;

/** The longest a run's chain multiplier can climb. */
export const CHAIN_MAX = 8;

export const PALETTE = {
  night: '#0a0d16',
  farTrees: '#101726',
  trees: '#16203a',
  clearing: '#1d2740',
  ground: '#243052',
  hearthStone: '#3a4160',
  hearthHot: '#5a3a2e',
  ember: '#ffb347',
  emberCore: '#ffe9b0',
  flame: '#ff8b3d',
  flameCore: '#ffe07a',
  frost: '#7fd8ff',
  frostCore: '#d8f4ff',
  void: '#a06cff',
  voidCore: '#e0d0ff',
  shield: '#eaf6ff',
  shieldFlash: '#ffffff',
  panel: '#141b2e',
  panelEdge: '#2b3a5c',
  text: '#f2f5fb',
  muted: '#8f9bb8',
  good: '#8fe38f',
  warn: '#ff9f6b',
  bar: '#2a3452',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberkeeper.best';
