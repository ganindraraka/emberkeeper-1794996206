// All sound is synthesised here with WebAudio oscillators, so nothing is fetched and the game
// stays a handful of text files. The context is created on the first player action (browsers
// refuse one before that) and every call is a no-op until then or when muted.

let context = null;
let master = null;
let muted = false;

function ensure() {
  if (context !== null) return context;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.22;
    master.connect(context.destination);
  } catch {
    context = null;
  }
  return context;
}

export function unlockSound() {
  const ctx = ensure();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.22;
}

export function isMuted() {
  return muted;
}

/** One short tone: `freq` in hertz, `seconds` long, `type` a WebAudio waveform. */
function tone(freq, seconds, type, volume, endFreq) {
  if (muted) return;
  const ctx = ensure();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + seconds);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

/** A filtered noise burst, for the frost shattering. */
function noise(seconds, volume, cutoff) {
  if (muted) return;
  const ctx = ensure();
  if (!ctx) return;
  const now = ctx.currentTime;
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frames);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(now);
}

export const SOUND = {
  catchEmber() {
    tone(660, 0.16, 'sine', 0.5, 1180);
  },
  deflect() {
    tone(880, 0.1, 'triangle', 0.42, 1420);
  },
  clash() {
    tone(1040, 0.18, 'square', 0.3, 1760);
    tone(1560, 0.12, 'sine', 0.22, 2200);
  },
  frostBurn() {
    noise(0.32, 0.5, 900);
    tone(220, 0.24, 'sawtooth', 0.3, 90);
  },
  shade() {
    tone(140, 0.46, 'sawtooth', 0.34, 52);
    noise(0.4, 0.3, 300);
  },
  dash() {
    tone(300, 0.12, 'triangle', 0.24, 620);
  },
  wave() {
    tone(523, 0.14, 'sine', 0.34, 700);
    window.setTimeout(() => tone(784, 0.2, 'sine', 0.3, 900), 110);
  },
  start() {
    tone(392, 0.16, 'sine', 0.4, 523);
    window.setTimeout(() => tone(587, 0.16, 'sine', 0.36, 700), 130);
    window.setTimeout(() => tone(784, 0.24, 'sine', 0.34, 900), 260);
  },
  lost() {
    tone(330, 0.5, 'sawtooth', 0.34, 82);
    window.setTimeout(() => tone(196, 0.7, 'sawtooth', 0.3, 60), 200);
  },
  won() {
    [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => tone(f, 0.34, 'sine', 0.34, f * 1.25), i * 150));
  },
};
