// DUSKPORT — Neon Getaway: synthesized sound.
// Every sound is made with the Web Audio API — engine hum, police sirens,
// gunshots, pickups and a dusk bassline — so the game ships no audio files
// and makes no network request. Nothing here runs until the player first
// presses a key or clicks (browsers require a gesture); headless runs stay
// silent and never crash.

'use strict';

const AudioSys = {
  ctx: null, master: null, muted: false, engineOsc: null, engineGain: null,
  musicTimer: 0, musicStep: 0,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch (e) { this.ctx = null; }
  },

  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.35; return this.muted; },

  setEngine(speedNorm, driving) {
    if (!this.ctx || !this.engineOsc) return;
    const target = driving ? 0.05 + 0.11 * Math.abs(speedNorm) : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    this.engineOsc.frequency.setTargetAtTime(46 + Math.abs(speedNorm) * 130, this.ctx.currentTime, 0.08);
  },

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.18, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (dur || 0.12));
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + (dur || 0.12));
    } catch (e) {}
  },

  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = vol || 0.3;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
    } catch (e) {}
  },

  gunshot() { this.noise(0.16, 0.4, 900); this.blip(160, 0.08, 'square', 0.12); },
  pickup() { this.blip(660, 0.09, 'sine', 0.2); setTimeout(() => this.blip(990, 0.14, 'sine', 0.2), 90); },
  crash() { this.noise(0.25, 0.35, 400); },
  cash() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.12, 'triangle', 0.2), i * 80)); },
  busted() { this.blip(220, 0.5, 'sawtooth', 0.2); setTimeout(() => this.blip(165, 0.7, 'sawtooth', 0.2), 300); },

  // Two-tone police siren while any cruiser is near the player.
  siren(t) {
    if (!this.ctx || this.muted) return;
    const f = (Math.floor(t * 2) % 2 === 0) ? 720 : 540;
    this.blip(f, 0.22, 'sine', 0.045);
  },

  // A slow dusk bassline: Am – F – C – G roots under the city.
  music(dt) {
    if (!this.ctx || this.muted) return;
    this.musicTimer += dt;
    if (this.musicTimer < 0.42) return;
    this.musicTimer = 0;
    const roots = [110, 87.3, 130.8, 98];
    const bar = Math.floor(this.musicStep / 4) % 4;
    const step = this.musicStep % 4;
    this.musicStep++;
    const freq = roots[bar] * (step === 3 ? 1.5 : 1);
    this.blip(freq, 0.38, 'triangle', 0.11);
    if (step === 0) this.blip(freq * 2, 0.2, 'sine', 0.06);
  },
};
