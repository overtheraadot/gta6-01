// DUSKPORT audio: fully synthesized WebAudio — engine, sirens, gunshots, music. No audio files.
export class GameAudio {
  constructor() {
    this.ctx = null; this.master = null; this.muted = false;
    this.engineOsc = null; this.engineGain = null; this.engineFilter = null;
    this.sirenOsc = null; this.sirenGain = null; this.sirenTimer = 0;
    this.musicTimer = null; this.musicStep = 0;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.startEngineLoop();
    this.startMusic();
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }
  setEngine(speed01, on) {
    if (!this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.075 : 0.0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(300 + speed01 * 900, t, 0.1);
  }
  startEngineLoop() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 320;
    this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }
  setSiren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle'; this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0.045;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.sirenTimer = 0;
    } else if (!on && this.sirenOsc) {
      try { this.sirenOsc.stop(); } catch (e) { /* already stopped */ }
      this.sirenOsc.disconnect(); this.sirenOsc = null;
    }
  }
  update(dt) {
    if (this.sirenOsc) {
      this.sirenTimer += dt;
      const hi = Math.floor(this.sirenTimer / 0.45) % 2 === 0;
      this.sirenOsc.frequency.setTargetAtTime(hi ? 720 : 540, this.ctx.currentTime, 0.05);
    }
  }
  blip(freq = 880, dur = 0.09, type = 'sine', vol = 0.12) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  gunshot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = 0.18, buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
    this.blip(120, 0.12, 'square', 0.18);
  }
  knifeSwing() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = 0.12, buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (i / d.length) * 0.5;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }
  crash() { this.blip(70, 0.25, 'square', 0.3); this.blip(48, 0.3, 'sawtooth', 0.2); }
  pickup() { this.blip(660, 0.08); setTimeout(() => this.blip(990, 0.12), 70); }
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.16), i * 110)); }
  // Dusk synthwave loop: Am – F – C – G pad + bass, scheduled in 8th-note steps.
  startMusic() {
    const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 220, 246.9]];
    const bass = [55, 43.65, 65.4, 49];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) { this.musicStep++; return; }
      const bar = Math.floor(this.musicStep / 8) % 4;
      const step = this.musicStep % 8;
      if (step === 0) {
        const t = this.ctx.currentTime;
        chords[bar].forEach((f) => {
          const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
          const o2 = this.ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 1.005;
          const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 750;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.028, t + 0.4);
          g.gain.linearRampToValueAtTime(0.0001, t + 1.9);
          o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(this.master);
          o.start(t); o2.start(t); o.stop(t + 2); o2.stop(t + 2);
        });
      }
      if (step % 2 === 0) {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = bass[bar] * (step === 6 ? 1.5 : 1);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.25);
      }
      if (step === 4) this.blip(1318, 0.05, 'sine', 0.02);
      this.musicStep++;
    }, 235);
  }
}
