export class GameAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    try { this.muted = localStorage.getItem('neon-strikers-muted') === '1'; } catch { /* ignore */ }
    this.engineOn = false;
    this.lastBoost = false;
  }

  init() {
    if (this.ready) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.82;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.22;
    this.master.connect(this.compressor);
    this.compressor.connect(ctx.destination);

    this.noiseBuffer = this.makeNoise(2.2);

    // Engine
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 330;
    this.engineFilter.Q.value = 4;
    this.engineGain.connect(this.engineFilter);
    this.engineFilter.connect(this.master);

    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 48;
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 24;
    const o2gain = ctx.createGain();
    o2gain.gain.value = 0.35;
    this.engineOsc1.connect(this.engineGain);
    this.engineOsc2.connect(o2gain);
    o2gain.connect(this.engineGain);
    this.engineOsc1.start();
    this.engineOsc2.start();

    // Boost noise
    this.boostGain = ctx.createGain();
    this.boostGain.gain.value = 0;
    this.boostFilter = ctx.createBiquadFilter();
    this.boostFilter.type = 'bandpass';
    this.boostFilter.frequency.value = 1100;
    this.boostFilter.Q.value = 0.8;
    const boostSrc = ctx.createBufferSource();
    boostSrc.buffer = this.noiseBuffer;
    boostSrc.loop = true;
    boostSrc.connect(this.boostFilter);
    this.boostFilter.connect(this.boostGain);
    this.boostGain.connect(this.master);
    boostSrc.start();

    this.ready = true;
  }

  makeNoise(seconds) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setMuted(muted) {
    this.muted = muted;
    try { localStorage.setItem('neon-strikers-muted', muted ? '1' : '0'); } catch { /* ignore */ }
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.82, this.ctx.currentTime, 0.05);
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setEngine(speed, boosting, active = true) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(active ? 0.026 + Math.min(0.035, speed * 0.0012) : 0, t, 0.08);
    this.engineOsc1.frequency.setTargetAtTime(42 + Math.min(80, speed * 2.1) + (boosting ? 16 : 0), t, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(21 + Math.min(40, speed * 1.05), t, 0.06);
    this.engineFilter.frequency.setTargetAtTime(280 + Math.min(900, speed * 22) + (boosting ? 500 : 0), t, 0.08);
    this.boostGain.gain.setTargetAtTime(boosting && active ? 0.09 : 0, t, 0.05);
    this.boostFilter.frequency.setTargetAtTime(900 + Math.min(900, speed * 16), t, 0.1);
    this.lastBoost = boosting;
  }

  noiseBurst({ duration = 0.18, volume = 0.2, freq = 700, q = 1.2, type = 'bandpass', decay = 0.15 }) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  tone({ freq = 440, endFreq = null, duration = 0.2, volume = 0.1, type = 'sine', delay = 0, attack = 0.005 }) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  hit(power = 1) {
    if (!this.ready) return;
    const v = Math.min(0.5, 0.1 + power * 0.014);
    this.noiseBurst({ volume: v, freq: 560, q: 0.9, decay: 0.16, duration: 0.2 });
    this.tone({ freq: 120, endFreq: 42, duration: 0.18, volume: v * 0.9, type: 'sine' });
  }

  bounce(power = 1) {
    this.tone({ freq: 90, endFreq: 48, duration: 0.15, volume: Math.min(0.2, 0.03 + power * 0.004), type: 'triangle' });
    this.noiseBurst({ volume: 0.04, freq: 320, decay: 0.08, duration: 0.12 });
  }

  jump() {
    this.tone({ freq: 180, endFreq: 420, duration: 0.16, volume: 0.06, type: 'triangle' });
    this.noiseBurst({ volume: 0.035, freq: 1400, decay: 0.07, duration: 0.1 });
  }

  flip() {
    this.tone({ freq: 280, endFreq: 620, duration: 0.2, volume: 0.055, type: 'sawtooth' });
  }

  land(power = 1) {
    this.tone({ freq: 75, endFreq: 38, duration: 0.16, volume: Math.min(0.16, 0.04 + power * 0.003), type: 'sine' });
  }

  pad(big = false) {
    this.tone({ freq: big ? 340 : 520, endFreq: big ? 760 : 880, duration: 0.18, volume: big ? 0.075 : 0.045, type: 'sine' });
    if (big) this.tone({ freq: 170, endFreq: 340, duration: 0.2, volume: 0.05, type: 'triangle' });
  }

  beep(high = false) {
    this.tone({ freq: high ? 880 : 520, duration: high ? 0.5 : 0.18, volume: high ? 0.11 : 0.08, type: 'square' });
  }

  goal(team = 'blue') {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const base = team === 'blue' ? 220 : 196;
    [1, 1.25, 1.5, 2].forEach((ratio, i) => {
      this.tone({ freq: base * ratio, endFreq: base * ratio * 2, duration: 1.5, volume: 0.055, type: 'sawtooth', delay: i * 0.06 });
    });
    this.tone({ freq: 70, endFreq: 32, duration: 0.9, volume: 0.18, type: 'sine' });
    this.noiseBurst({ volume: 0.2, freq: 900, q: 0.5, decay: 0.9, duration: 1.1 });
    this.noiseBurst({ volume: 0.14, freq: 2600, q: 0.7, decay: 0.5, duration: 0.7 });
  }

  countdown(final = false) {
    if (final) {
      this.tone({ freq: 660, endFreq: 1320, duration: 0.55, volume: 0.12, type: 'square' });
      this.tone({ freq: 330, endFreq: 660, duration: 0.55, volume: 0.1, type: 'sawtooth' });
    } else {
      this.tone({ freq: 440, duration: 0.16, volume: 0.08, type: 'square' });
    }
  }

  whistle() {
    this.tone({ freq: 1200, endFreq: 1500, duration: 0.22, volume: 0.07, type: 'sine' });
    this.tone({ freq: 1180, endFreq: 1480, duration: 0.22, volume: 0.06, type: 'sine', delay: 0.04 });
  }

  ui() {
    this.tone({ freq: 720, endFreq: 980, duration: 0.08, volume: 0.035, type: 'triangle' });
  }

  select() {
    this.tone({ freq: 460, endFreq: 620, duration: 0.09, volume: 0.04, type: 'square' });
  }

  win() {
    [0, 0.12, 0.26, 0.42].forEach((delay, i) => {
      this.tone({ freq: [392, 523, 659, 784][i], duration: 0.5, volume: 0.08, type: 'triangle', delay });
    });
  }

  lose() {
    [0, 0.15, 0.32].forEach((delay, i) => {
      this.tone({ freq: [330, 262, 196][i], duration: 0.55, volume: 0.07, type: 'triangle', delay });
    });
  }
}
