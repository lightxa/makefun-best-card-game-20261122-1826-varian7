// audio.js — tiny synthesised sounds (WebAudio, no audio files).
// Every sound is an oscillator blip made at run time, so the game loads
// nothing over the network. The context is created on the first user gesture.

let context = null;
let muted = false;

export function ensureAudio() {
  if (!context) {
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      context = null;
    }
  }
  if (context && context.state === 'suspended') context.resume();
  return context;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function blip(freq, dur, type, vol, when = 0) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playDeal() { blip(520, 0.09, 'triangle', 0.12); blip(660, 0.09, 'triangle', 0.1, 0.07); }
export function playFlip() { blip(740, 0.07, 'sine', 0.12); }
export function playWinRound() { blip(523, 0.1, 'triangle', 0.14); blip(659, 0.1, 'triangle', 0.14, 0.09); blip(784, 0.16, 'triangle', 0.14, 0.18); }
export function playLoseRound() { blip(392, 0.12, 'sine', 0.12); blip(311, 0.18, 'sine', 0.12, 0.1); }
export function playGameWin() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.15, i * 0.13)); }
export function playGameLose() { [392, 349, 311, 262].forEach((f, i) => blip(f, 0.25, 'sine', 0.13, i * 0.15)); }
