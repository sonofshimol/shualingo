/**
 * Sound effects and vibration. Sounds are synthesized with the Web Audio API (no audio files),
 * so they work offline and add nothing to download. Both respect the settings toggles.
 * Note: iPhones do not support vibration from web apps; there it is silently skipped.
 */
import { getSave } from '../store';

export type Sfx = 'correct' | 'wrong' | 'tap' | 'harvest' | 'cast' | 'fizzle' | 'build' | 'rank' | 'complete' | 'crackle';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.05);
}

function noise(ac: AudioContext, start: number, dur: number, gain = 0.08) {
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.08 ? 1 : 0.15);
  const src = ac.createBufferSource();
  const g = ac.createGain();
  src.buffer = buffer;
  g.gain.value = gain;
  src.connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}

const SOUNDS: Record<Sfx, (ac: AudioContext) => void> = {
  correct: (ac) => { tone(ac, 660, 0, 0.12, 'triangle'); tone(ac, 880, 0.09, 0.2, 'triangle'); },
  wrong: (ac) => { tone(ac, 220, 0, 0.18, 'sine', 0.1); tone(ac, 185, 0.12, 0.25, 'sine', 0.08); },
  tap: (ac) => tone(ac, 520, 0, 0.05, 'triangle', 0.05),
  harvest: (ac) => { tone(ac, 784, 0, 0.08, 'square', 0.04); tone(ac, 1175, 0.06, 0.15, 'triangle', 0.08); },
  cast: (ac) => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ac, f, i * 0.07, 0.35, 'sine', 0.07)),
  fizzle: (ac) => { noise(ac, 0, 0.3, 0.06); tone(ac, 300, 0, 0.3, 'sawtooth', 0.03); },
  build: (ac) => { tone(ac, 110, 0, 0.2, 'square', 0.08); tone(ac, 147, 0.18, 0.2, 'square', 0.07); [523, 784].forEach((f, i) => tone(ac, f, 0.4 + i * 0.1, 0.4, 'triangle', 0.07)); },
  rank: (ac) => [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(ac, f, i * 0.09, 0.6, 'sine', 0.06)),
  complete: (ac) => [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, i * 0.1, 0.3, 'triangle', 0.08)),
  crackle: (ac) => { noise(ac, 0, 0.25, 0.1); noise(ac, 0.15, 0.2, 0.07); },
};

const VIBRATION: Partial<Record<Sfx, number | number[]>> = {
  correct: 30,
  wrong: [60, 40, 60],
  harvest: 20,
  cast: [30, 30, 30, 30, 80],
  fizzle: [80, 50, 80],
  build: [40, 60, 120],
  rank: [50, 50, 50, 50, 200],
  complete: [40, 40, 120],
  crackle: 15,
};

export function play(effect: Sfx): void {
  let settings = { sound: true, vibration: true };
  try {
    settings = getSave().settings;
  } catch {
    /* store not ready */
  }
  if (settings.sound) {
    const ac = audio();
    if (ac) SOUNDS[effect](ac);
  }
  const pattern = VIBRATION[effect];
  if (settings.vibration && pattern && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* not allowed */
    }
  }
}
