// Audio is generated locally; a missing or failing audio device is silent.
let audio = null;
let output = null;
let quiet = false;

function safely(operation) {
  try { return operation(); } catch { return null; }
}

function device() {
  if (audio !== null) return audio;
  return safely(() => {
    const Constructor = window.AudioContext ?? window.webkitAudioContext;
    if (!Constructor) return null;
    try {
      audio = new Constructor();
      output = audio.createGain();
      output.gain.value = 0.22;
      output.connect(audio.destination);
    } catch { audio = null; }
    return audio;
  });
}

export function unlockSound() {
  safely(() => {
    const engine = device();
    if (engine && engine.state === 'suspended') {
      const resumed = engine.resume();
      if (resumed?.catch) resumed.catch(() => {});
    }
  });
}
export function setMuted(value) {
  quiet = value;
  safely(() => { if (output) output.gain.value = value ? 0 : 0.22; });
}
export function isMuted() { return quiet; }

function note(frequency, duration, waveform, volume, destination) {
  if (quiet) return;
  safely(() => {
    const engine = device();
    if (!engine) return;
    const start = engine.currentTime;
    const oscillator = engine.createOscillator();
    const envelope = engine.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (destination !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, destination), start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  });
}

function hiss(duration, volume, cutoff) {
  if (quiet) return;
  safely(() => {
    const engine = device();
    if (!engine) return;
    const start = engine.currentTime;
    const length = Math.floor(engine.sampleRate * duration);
    const buffer = engine.createBuffer(1, length, engine.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let n = 0; n < length; n += 1) samples[n] = (Math.random() * 2 - 1) * (1 - n / length);
    const source = engine.createBufferSource();
    source.buffer = buffer;
    const filter = engine.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    const envelope = engine.createGain();
    envelope.gain.value = volume;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);
    source.start(start);
  });
}

const later = (delay, parameters) => safely(() => window.setTimeout(() => note(...parameters), delay));
export const SOUND = {
  catchEmber: () => note(660, 0.16, 'sine', 0.5, 1180),
  deflect: () => note(880, 0.1, 'triangle', 0.42, 1420),
  clash() {
    note(1040, 0.18, 'square', 0.3, 1760);
    note(1560, 0.12, 'sine', 0.22, 2200);
  },
  frostBurn() { hiss(0.32, 0.5, 900); note(220, 0.24, 'sawtooth', 0.3, 90); },
  shade() { note(140, 0.46, 'sawtooth', 0.34, 52); hiss(0.4, 0.3, 300); },
  dash: () => note(300, 0.12, 'triangle', 0.24, 620),
  wave() { note(523, 0.14, 'sine', 0.34, 700); later(110, [784, 0.2, 'sine', 0.3, 900]); },
  start() {
    note(392, 0.16, 'sine', 0.4, 523);
    later(130, [587, 0.16, 'sine', 0.36, 700]);
    later(260, [784, 0.24, 'sine', 0.34, 900]);
  },
  lost() { note(330, 0.5, 'sawtooth', 0.34, 82); later(200, [196, 0.7, 'sawtooth', 0.3, 60]); },
  won() {
    for (const [index, frequency] of [523, 659, 784, 1046].entries()) later(index * 150, [frequency, 0.34, 'sine', 0.34, frequency * 1.25]);
  },
};
