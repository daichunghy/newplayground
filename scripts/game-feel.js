/**
 * NEWPLAYGROUND - GAME FEEL & TACTILE JUICE ENGINE (NP_Juice & NP_Audio)
 * Designed for maximum tactile feedback ("Cảm giác tay"):
 * - Heavy bass procedural audio (noise bursts, sub-bass, crunches, chomps, ratchets, splashes)
 * - Screenshake with decaying physical trauma
 * - Hitstop (micro-frame freezes on impact)
 * - Canvas floating damage/score popups (+500, CRITICAL, BÙM!, NHOÀM!)
 * - High-performance procedural particle systems (feathers, sparks, smoke, splinters, bubbles, coins)
 */

(function () {
  'use strict';

  // Shared audio effects belong to the game that scheduled them, when one is open.
  function setTimeout(callback, delay, ...args) {
    const session = window.NP_GameSession && window.NP_GameSession.getCurrent();
    return session ? session.setTimeout(callback, delay, ...args) : window.setTimeout(callback, delay, ...args);
  }
  const screenShakes = new WeakMap();

  // =========================================================================
  // 1. ADVANCED PROCEDURAL AUDIO ENGINE (ZERO ASSETS, 100% WEB AUDIO API)
  // =========================================================================
  let audioCtx = null;
  let isGlobalMuted = true; // Mặc định tắt hết âm thanh trong lúc làm / phát triển
  try {
    const saved = localStorage.getItem('np_muted');
    if (saved !== null) {
      isGlobalMuted = saved === 'true';
    } else {
      localStorage.setItem('np_muted', 'true');
    }
  } catch (e) {
    isGlobalMuted = true;
  }
  window.NEWPLAYGROUND_MUTED = isGlobalMuted;

  function getAudioCtx() {
    if (isGlobalMuted || window.NEWPLAYGROUND_MUTED) {
      if (audioCtx && audioCtx.state !== 'suspended') {
        try { audioCtx.suspend(); } catch (e) {}
      }
      return null;
    }
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Pre-generate 1-second white noise buffer for crisp noise hits
  let noiseBuffer = null;
  function getNoiseBuffer(ctx) {
    if (!noiseBuffer && ctx) {
      const bufferSize = ctx.sampleRate;
      noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return noiseBuffer;
  }

  const NP_Audio = {
    init: getAudioCtx,

    // Play pure tone with envelope
    tone(freq, type = 'sine', duration = 0.1, vol = 0.15, dest = null) {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(dest || ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    },

    // Meaty explosion with sub-bass drop and low-pass noise rumble
    explosion(heavy = true) {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const duration = heavy ? 0.45 : 0.28;

        // 1. Noise body
        const nBuf = getNoiseBuffer(ctx);
        if (nBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = nBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(heavy ? 600 : 900, now);
          filter.frequency.exponentialRampToValueAtTime(40, now + duration);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(heavy ? 0.35 : 0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + duration);
        }

        // 2. Sub-bass punch (thump)
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(heavy ? 120 : 160, now);
        subOsc.frequency.exponentialRampToValueAtTime(25, now + duration);
        subGain.gain.setValueAtTime(heavy ? 0.4 : 0.25, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + duration);
      } catch (e) {}
    },

    // Heavy physical thud for landings and falling objects.
    thud(freq = 90) {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.22);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } catch (e) {}
    },

    // Crunchy bite / stomping Goomba / chomping fish
    chomp() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        // High click + low chomp
        this.tone(180, 'sine', 0.08, 0.25);
        this.tone(90, 'triangle', 0.12, 0.3);

        const nBuf = getNoiseBuffer(ctx);
        if (nBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = nBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.Q.value = 3;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.08);
        }
      } catch (e) {}
    },

    // Mechanical winch ratchet click (Gold Miner pull)
    clack() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } catch (e) {}
    },

    // Sizzling dynamite fuse
    sizzle() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const nBuf = getNoiseBuffer(ctx);
        if (nBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = nBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(3500, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.15);
        }
      } catch (e) {}
    },

    // Water splash / bubble burst
    splash() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        this.tone(340, 'sine', 0.1, 0.2);
        this.tone(680, 'sine', 0.07, 0.15);
        const nBuf = getNoiseBuffer(ctx);
        if (nBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = nBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1800, now);
          filter.frequency.exponentialRampToValueAtTime(400, now + 0.18);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.18);
        }
      } catch (e) {}
    },

    // Wet egg / tomato splatter
    splat() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        this.tone(220, 'triangle', 0.08, 0.2);
        const nBuf = getNoiseBuffer(ctx);
        if (nBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = nBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.frequency.exponentialRampToValueAtTime(200, now + 0.12);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.12);
        }
      } catch (e) {}
    },

    // Wind gust / swift dash whoosh sound
    whoosh() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const nBuf = getNoiseBuffer(ctx);
        if (nBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = nBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2200, now);
          filter.frequency.exponentialRampToValueAtTime(320, now + 0.22);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.22);
        }
      } catch (e) {}
    },

    // Metallic bucket / armor clank sound
    metalClank() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1480, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.1);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        this.tone(1960, 'sine', 0.08, 0.15);
      } catch (e) {}
    },

    // Goofy chicken cluck / bird screech
    chickenCluck() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {}
    },

    // Punchy retro arcade laser shot with bass kick
    laser() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch (e) {}
    },

    // Bright 2-tone melodic coin pick
    coin() {
      this.tone(987.77, 'sine', 0.08, 0.2);
      setTimeout(() => this.tone(1318.51, 'sine', 0.18, 0.2), 65);
    },

    // Bubble pop / soft block hit
    pop() {
      this.tone(580, 'triangle', 0.06, 0.15);
    },

    // Ascending harmonic chord for combos & 2048 merges
    combo(level = 1) {
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 1046.50];
      const baseFreq = scale[Math.min(scale.length - 1, Math.max(0, level - 1))];
      this.tone(baseFreq, 'sine', 0.12, 0.2);
      setTimeout(() => this.tone(baseFreq * 1.25, 'sine', 0.16, 0.18), 50);
      if (level >= 3) {
        setTimeout(() => this.tone(baseFreq * 1.5, 'sine', 0.22, 0.15), 110);
      }
    },

    // Big stage win fanfare
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => this.tone(f, 'sine', 0.18, 0.2), i * 90);
      });
    },

    // Emergency siren / warning alarm
    alarm() {
      this.tone(880, 'square', 0.09, 0.2);
      setTimeout(() => this.tone(660, 'square', 0.09, 0.2), 90);
    },

    // Powerup fanfare
    powerup() {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        setTimeout(() => this.tone(f, 'sine', 0.1, 0.2), i * 50);
      });
    },

    // Match sound
    match(combo = 1) {
      this.combo(combo);
    },

    // Impact hit
    hit() {
      this.thud(140);
    },

    // Glass marble clack (Bắn Bi Ve)
    marbleClack(power = 1) {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const p = Math.max(0.2, Math.min(1.5, power));
        this.tone(1800 * (0.9 + Math.random() * 0.2), 'square', 0.03, 0.22 * p);
        this.tone(2600 * (0.9 + Math.random() * 0.2), 'sine', 0.05, 0.18 * p);
        this.tone(340, 'triangle', 0.06, 0.25 * p);
      } catch (e) {}
    },

    // Heavy wooden chess piece thud CỐP! (Cờ Tướng)
    woodThud() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        this.tone(110, 'triangle', 0.12, 0.4);
        this.tone(240, 'sine', 0.06, 0.35);
        const nBuf = getNoiseBuffer(ctx);
        if (nBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = nBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + 0.1);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.1);
        }
      } catch (e) {}
    },

    // Crisp diner service bell DING! (Diner Dash)
    dinerBell() {
      try {
        this.tone(1567.98, 'sine', 0.4, 0.3); // G6
        setTimeout(() => this.tone(2093.00, 'sine', 0.35, 0.25), 35); // C7
      } catch (e) {}
    },

    // Paper card slide / deal sound xoạt! (Uno)
    cardSlide() {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const nBuf = getNoiseBuffer(ctx);
        if (nBuf) {
          const noise = ctx.createBufferSource();
          noise.buffer = nBuf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(3200, now);
          filter.frequency.exponentialRampToValueAtTime(800, now + 0.08);
          filter.Q.value = 2;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.08);
        }
      } catch (e) {}
    },

    // =======================================================================
    // PROCEDURAL RETRO BGM SYNTHESIZER (ZERO ASSETS, 100% WEB AUDIO API)
    // =======================================================================
    currentBgmTimer: null,
    currentBgmTheme: null,
    isMuted: isGlobalMuted,

    setMuted(muted) {
      this.isMuted = !!muted;
      isGlobalMuted = this.isMuted;
      window.NEWPLAYGROUND_MUTED = this.isMuted;
      try {
        localStorage.setItem('np_muted', this.isMuted ? 'true' : 'false');
      } catch (e) {}
      if (this.isMuted) {
        this.stopBGM();
        if (audioCtx && audioCtx.state !== 'suspended') {
          try { audioCtx.suspend(); } catch (e) {}
        }
      } else {
        if (audioCtx && audioCtx.state === 'suspended') {
          try { audioCtx.resume(); } catch (e) {}
        }
      }
      this.syncSoundButtons();
      return this.isMuted;
    },

    toggleMute() {
      return this.setMuted(!this.isMuted);
    },

    syncSoundButtons() {
      const icon = this.isMuted ? '🔇' : '🔊';
      const title = this.isMuted ? 'Bật âm thanh (Hiện đang tắt)' : 'Tắt âm thanh (Hiện đang bật)';
      document.querySelectorAll('#soundToggleBtn, #modalSoundToggleBtn').forEach(btn => {
        btn.setAttribute('title', title);
        const iconEl = btn.querySelector('.sound-icon');
        if (iconEl) iconEl.textContent = icon;
        else btn.textContent = icon;
      });
    },

    stopBGM() {
      if (this.currentBgmTimer) {
        clearInterval(this.currentBgmTimer);
        this.currentBgmTimer = null;
      }
      this.currentBgmTheme = null;
    },

    startBGM(theme) {
      if (this.isMuted) return;
      if (this.currentBgmTheme === theme && this.currentBgmTimer) return;
      this.stopBGM();
      this.currentBgmTheme = theme;

      const ctx = getAudioCtx();
      if (!ctx) return;

      // Note frequency map
      const N = {
        C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
        C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
        C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
        R: 0 // Rest
      };

      // Theme Patterns: [melodyNote, bassNote, durationMs]
      const THEMES = {
        // Đào Vàng: Banjo miền Tây vui nhộn, tiếng huýt sáo đồng quê
        daovang: [
          [N.G4, N.C3, 160], [N.E4, N.G3, 160], [N.G4, N.C3, 160], [N.C5, N.G3, 240],
          [N.B4, N.C3, 160], [N.A4, N.G3, 160], [N.G4, N.C3, 240], [N.R, N.R, 80],
          [N.E4, N.C3, 160], [N.G4, N.G3, 160], [N.A4, N.C3, 160], [N.G4, N.G3, 240],
          [N.E4, N.C3, 160], [N.D4, N.G3, 160], [N.C4, N.C3, 300], [N.R, N.R, 120]
        ],
        // Boom Online: Giai điệu BnB PopKart rộn ràng, tưng bừng tuổi thơ
        boom: [
          [N.C5, N.C3, 140], [N.G4, N.G3, 140], [N.A4, N.C3, 140], [N.B4, N.G3, 140],
          [N.C5, N.C3, 140], [N.E5, N.G3, 140], [N.D5, N.C3, 200], [N.R, N.R, 60],
          [N.B4, N.G3, 140], [N.A4, N.C3, 140], [N.G4, N.G3, 140], [N.A4, N.C3, 140],
          [N.B4, N.G3, 140], [N.D5, N.C3, 140], [N.C5, N.C3, 260], [N.R, N.R, 80]
        ],
        // Hàng Rong: Nhịp ngũ cung dân dã, rộn rã phố xá vỉa hè
        hangrong: [
          [N.C4, N.C3, 180], [N.E4, N.G3, 180], [N.G4, N.C3, 180], [N.A4, N.G3, 180],
          [N.G4, N.C3, 180], [N.E4, N.G3, 180], [N.D4, N.C3, 240], [N.R, N.R, 80],
          [N.E4, N.C3, 180], [N.G4, N.G3, 180], [N.A4, N.C3, 180], [N.C5, N.G3, 240],
          [N.A4, N.C3, 180], [N.G4, N.G3, 180], [N.E4, N.C3, 260], [N.R, N.R, 100]
        ],
        // Plants vs. Zombies: Điệu bassline nhún nhảy dí dỏm "Graze the Roof"
        pvz: [
          [N.E4, N.A3, 160], [N.D4, N.E3, 160], [N.E4, N.A3, 160], [N.C4, N.E3, 160],
          [N.D4, N.A3, 160], [N.C4, N.E3, 160], [N.B3, N.A3, 240], [N.R, N.R, 80],
          [N.C4, N.A3, 160], [N.D4, N.E3, 160], [N.E4, N.A3, 160], [N.G4, N.E3, 160],
          [N.F4, N.A3, 160], [N.E4, N.E3, 160], [N.D4, N.A3, 260], [N.R, N.R, 80]
        ],
        // Chicken Invaders: Khúc quân hành vũ trụ châm biếm
        chicken: [
          [N.G4, N.C3, 160], [N.C5, N.G3, 160], [N.E5, N.C3, 160], [N.G5, N.G3, 240],
          [N.F5, N.F3, 160], [N.D5, N.G3, 160], [N.B4, N.G3, 240], [N.R, N.R, 80],
          [N.C5, N.C3, 160], [N.E5, N.G3, 160], [N.G5, N.C3, 160], [N.E5, N.G3, 200],
          [N.D5, N.G3, 160], [N.B4, N.G3, 160], [N.C5, N.C3, 280], [N.R, N.R, 90]
        ],
        // Super Mario: Giai điệu Overworld 1985 huyền thoại
        mario: [
          [N.E4, N.D3, 120], [N.E4, N.D3, 120], [N.R, N.R, 120], [N.E4, N.D3, 120],
          [N.R, N.R, 120], [N.C4, N.D3, 120], [N.E4, N.D3, 180], [N.G4, N.G3, 260],
          [N.R, N.R, 200], [N.G3, N.G2, 260], [N.R, N.R, 200], [N.C4, N.C3, 220],
          [N.R, N.R, 120], [N.G3, N.G2, 180], [N.E3, N.C3, 220], [N.R, N.R, 100]
        ],
        // Tetris (Xếp Gạch): Khúc ca Korobeiniki Type-A bất hủ
        tetris: [
          [N.E4, N.E3, 160], [N.B3, N.G3, 160], [N.C4, N.A3, 160], [N.D4, N.B3, 160],
          [N.C4, N.A3, 160], [N.B3, N.G3, 160], [N.A3, N.E3, 240], [N.R, N.R, 60],
          [N.A3, N.E3, 160], [N.C4, N.A3, 160], [N.E4, N.C3, 160], [N.D4, N.B3, 160],
          [N.C4, N.A3, 160], [N.B3, N.E3, 240], [N.C4, N.A3, 160], [N.D4, N.B3, 200]
        ],
        // Zuma Deluxe (PopCap Ếch Bắn Ngọc): Giai điệu bộ gõ thổ dân Aztec huyền bí
        zuma: [
          [N.E4, N.A3, 140], [N.G4, N.E3, 140], [N.A4, N.A3, 140], [N.B4, N.E3, 140],
          [N.D5, N.A3, 180], [N.B4, N.E3, 140], [N.A4, N.A3, 220], [N.R, N.R, 70],
          [N.G4, N.A3, 140], [N.E4, N.E3, 140], [N.G4, N.A3, 140], [N.A4, N.E3, 180],
          [N.E4, N.A3, 140], [N.D4, N.E3, 140], [N.E4, N.A3, 260], [N.R, N.R, 90]
        ],
        // Diner Dash (Flo's Diner): Nhịp swing vui tươi nhà hàng PlayFirst
        diner: [
          [N.C4, N.C3, 130], [N.E4, N.G3, 130], [N.G4, N.C3, 130], [N.A4, N.G3, 130],
          [N.C5, N.C3, 180], [N.A4, N.G3, 130], [N.G4, N.C3, 200], [N.R, N.R, 60],
          [N.F4, N.F3, 130], [N.A4, N.C3, 130], [N.C5, N.F3, 180], [N.A4, N.C3, 130],
          [N.G4, N.G3, 130], [N.D4, N.G3, 130], [N.C4, N.C3, 260], [N.R, N.R, 80]
        ],
        // Cờ Tướng Tàn Cuộc: Khúc nhạc ngũ cung tĩnh tại thâm sâu
        cotuong: [
          [N.D4, N.D3, 220], [N.E4, N.A3, 220], [N.G4, N.D3, 220], [N.A4, N.A3, 280],
          [N.G4, N.D3, 220], [N.E4, N.A3, 220], [N.D4, N.D3, 340], [N.R, N.R, 120],
          [N.A4, N.D3, 220], [N.C5, N.A3, 220], [N.D5, N.D3, 280], [N.C5, N.A3, 220],
          [N.A4, N.D3, 220], [N.G4, N.A3, 220], [N.E4, N.D3, 360], [N.R, N.R, 140]
        ],
        // Đánh Bài Đổi Màu (Uno Party): Khúc ca rộn ràng bàn tiệc
        uno: [
          [N.G4, N.C3, 140], [N.C5, N.G3, 140], [N.E5, N.C3, 140], [N.D5, N.G3, 180],
          [N.C5, N.C3, 140], [N.B4, N.G3, 140], [N.A4, N.C3, 200], [N.R, N.R, 60],
          [N.F4, N.F3, 140], [N.A4, N.C3, 140], [N.C5, N.F3, 180], [N.B4, N.G3, 140],
          [N.C5, N.C3, 260], [N.R, N.R, 80]
        ]
      };

      const track = THEMES[theme] || THEMES.daovang;
      let step = 0;

      const playNextStep = () => {
        if (this.isMuted || this.currentBgmTheme !== theme) return;
        const [mel, bas, dur] = track[step];
        const stepTime = (dur || 160) / 1000;

        if (mel && mel > 0) {
          // Melody tone (triangle/sine blend for warm retro warmth)
          this.tone(mel, 'triangle', stepTime * 0.9, 0.05);
        }
        if (bas && bas > 0) {
          // Bouncy bass pulse
          this.tone(bas, 'sine', stepTime * 0.7, 0.07);
        }

        step = (step + 1) % track.length;
        this.currentBgmTimer = setTimeout(playNextStep, dur || 160);
      };

      playNextStep();
    }
  };

  // Expose to window and alias to NP_AudioEngine for complete compatibility
  window.NP_Audio = NP_Audio;
  if (!window.NP_AudioEngine) {
    window.NP_AudioEngine = NP_Audio;
  } else {
    Object.assign(window.NP_AudioEngine, NP_Audio);
  }

  // =========================================================================
  // 2. JUICINESS & TACTILITY ENGINE (NP_Juice)
  // =========================================================================
  const NP_Juice = {
    hitstopUntil: 0,

    // Trigger micro-freeze (Celeste / Smash Bros impact feel)
    triggerHitstop(ms = 60) {
      this.hitstopUntil = Date.now() + ms;
    },

    isFrozen() {
      return Date.now() < this.hitstopUntil;
    },

    // Screenshake applied to HTML elements or canvases
    screenShake(element, intensity = 8, durationMs = 250) {
      if (!element) return;
      const previous = screenShakes.get(element);
      if (previous) previous();
      const start = performance.now();
      const origTransform = element.style.transform || '';
      const session = window.NP_GameSession && window.NP_GameSession.getCurrent();
      const scheduleFrame = session ? session.requestAnimationFrame : window.requestAnimationFrame.bind(window);
      const cancelFrame = session ? session.cancelAnimationFrame : window.cancelAnimationFrame.bind(window);
      let frameId = null;
      let unregisterCleanup = () => {};
      const reset = () => {
        cancelFrame(frameId);
        element.style.transform = origTransform;
        screenShakes.delete(element);
        unregisterCleanup();
      };
      screenShakes.set(element, reset);
      if (session) unregisterCleanup = session.onCleanup(reset);

      function step(now) {
        const elapsed = now - start;
        if (elapsed < durationMs) {
          const factor = 1 - elapsed / durationMs;
          const currentIntensity = intensity * factor;
          const dx = (Math.random() * 2 - 1) * currentIntensity;
          const dy = (Math.random() * 2 - 1) * currentIntensity;
          element.style.transform = `translate(${dx}px, ${dy}px)`;
          frameId = scheduleFrame(step);
        } else {
          reset();
        }
      }
      frameId = scheduleFrame(step);
    },

    // Camera shake offset helper for pure Canvas render loops
    createCameraShake() {
      return {
        trauma: 0, // 0 to 1
        decay: 0.05,
        addTrauma(amount = 0.5) {
          this.trauma = Math.min(1.0, this.trauma + amount);
        },
        getOffset(maxOffset = 14) {
          if (this.trauma <= 0) return { x: 0, y: 0 };
          const shake = this.trauma * this.trauma; // Non-linear decay
          const x = (Math.random() * 2 - 1) * maxOffset * shake;
          const y = (Math.random() * 2 - 1) * maxOffset * shake;
          this.trauma = Math.max(0, this.trauma - this.decay);
          return { x, y };
        }
      };
    },

    // Floating Popups Manager for Canvas (+500, CRITICAL, BÙM!, NHOÀM!)
    createPopupManager() {
      let popups = [];
      return {
        add(text, x, y, color = '#FBBF24', fontSize = 20, icon = '') {
          popups.push({
            text: icon ? `${icon} ${text}` : text,
            x,
            y,
            vy: -2.4,
            life: 1.0,
            decay: 0.022,
            color,
            fontSize,
            scale: 1.4 // Elastic squash pop
          });
        },
        spawn(arg1, arg2, arg3, color = '#FBBF24', fontSize = 20) {
          // Supports both spawn(x, y, text, color, fontSize) and spawn(text, x, y, color, fontSize)
          if (typeof arg1 === 'number' && typeof arg2 === 'number') {
            this.add(String(arg3), arg1, arg2, color, fontSize);
          } else {
            this.add(String(arg1), Number(arg2), Number(arg3), color, fontSize);
          }
        },
        updateAndDraw(ctx) {
          for (let i = popups.length - 1; i >= 0; i--) {
            const p = popups[i];
            p.y += p.vy;
            p.vy *= 0.95; // Drag
            p.life -= p.decay;
            p.scale = Math.max(1.0, p.scale - 0.06);

            if (p.life <= 0) {
              popups.splice(i, 1);
              continue;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(p.scale, p.scale);
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.font = `900 ${p.fontSize}px Calibri, sans-serif`;
            ctx.textAlign = 'center';

            // Thick dark shadow/outline for readability
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(p.text, 0, 0);

            ctx.fillStyle = p.color;
            ctx.fillText(p.text, 0, 0);
            ctx.restore();
          }
        },
        update(dt) {
          // Handled together in draw/updateAndDraw
        },
        draw(ctx) {
          this.updateAndDraw(ctx);
        },
        updateAndRender(ctx) {
          this.updateAndDraw(ctx);
        },
        clear() {
          popups = [];
        }
      };
    },

    // General purpose High-performance Particle System
    createParticleSystem() {
      let particles = [];
      return {
        burst(x, y, count = 15, color = '#F59E0B', speed = 4, size = 4) {
          const spd = typeof speed === 'number' && speed > 50 ? speed / 60 : speed;
          this.spawn(x, y, count, {
            colors: Array.isArray(color) ? color : [color],
            speed: spd,
            size: size || 4
          });
        },
        update(dt) {
          // Handled together in draw/updateAndDraw
        },
        draw(ctx) {
          this.updateAndDraw(ctx);
        },
        updateAndRender(ctx) {
          this.updateAndDraw(ctx);
        },
        spawn(x, y, count = 15, options = {}) {
          const {
            colors = ['#F59E0B', '#EF4444', '#FCD34D', '#FFF'],
            speed = 4,
            gravity = 0.15,
            drag = 0.96,
            life = 1.0,
            decay = 0.03,
            size = 4,
            shape = 'circle' // 'circle', 'square', 'feather', 'bubble', 'spark', 'coin'
          } = options;

          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (Math.random() * 0.7 + 0.3) * speed;
            const col = colors[Math.floor(Math.random() * colors.length)];
            particles.push({
              x,
              y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              gravity,
              drag,
              life,
              decay: decay * (0.8 + Math.random() * 0.4),
              size: size * (0.7 + Math.random() * 0.6),
              color: col,
              shape,
              rot: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() * 2 - 1) * 0.15
            });
          }
        },
        updateAndDraw(ctx) {
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.rot += p.rotSpeed;
            p.life -= p.decay;

            if (p.life <= 0) {
              particles.splice(i, 1);
              continue;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;

            if (p.shape === 'circle') {
              ctx.beginPath();
              ctx.arc(0, 0, p.size, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.shape === 'square') {
              ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            } else if (p.shape === 'feather') {
              // Elongated feather shape
              ctx.beginPath();
              ctx.ellipse(0, 0, p.size * 2.5, p.size * 0.8, 0, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.shape === 'bubble') {
              // Translucent bubble with shine
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(0, 0, p.size, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
              ctx.beginPath();
              ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.shape === 'coin') {
              ctx.fillStyle = '#F59E0B';
              ctx.beginPath();
              ctx.ellipse(0, 0, p.size * 1.2, p.size * 0.8, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#FEF08A';
              ctx.beginPath();
              ctx.ellipse(0, 0, p.size * 0.7, p.size * 0.4, 0, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Spark
              ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
            }

            ctx.restore();
          }
        },
        clear() {
          particles = [];
        }
      };
    },

    // =======================================================================
    // 3. TACTILE HAPTIC FEEDBACK ENGINE (WEB VIBRATION API)
    // =======================================================================
    // Callable for custom durations/patterns, with the existing named presets.
    vibrate: Object.assign(function (pattern) {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(pattern);
        }
      } catch (e) {}
    }, {
      light() {
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(12);
          }
        } catch (e) {}
      },
      medium() {
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(28);
          }
        } catch (e) {}
      },
      heavy() {
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(60);
          }
        } catch (e) {}
      },
      combo() {
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([15, 30, 25]);
          }
        } catch (e) {}
      },
      success() {
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([20, 40, 60]);
          }
        } catch (e) {}
      }
    }),

    // Attach tactile touch feedback to all interactive game controls
    initTactileControls() {
      if (typeof document === 'undefined') return;
      document.addEventListener('pointerdown', (e) => {
        const target = e.target.closest('.v-btn, .btn-canvas-action, .oaq-player-pit, #pmCanvas, #mrCanvas, #snkCanvas, #fnCanvas');
        if (target) {
          NP_Juice.vibrate.light();
        }
      }, { passive: true });
    }
  };

  // Wire haptics directly into procedural audio hooks for maximum tactile synchrony
  const originalPop = NP_Audio.pop;
  NP_Audio.pop = function () {
    NP_Juice.vibrate.light();
    return originalPop.apply(this, arguments);
  };

  const originalCoin = NP_Audio.coin;
  NP_Audio.coin = function () {
    NP_Juice.vibrate.light();
    return originalCoin.apply(this, arguments);
  };

  const originalHit = NP_Audio.hit;
  NP_Audio.hit = function () {
    NP_Juice.vibrate.medium();
    return originalHit.apply(this, arguments);
  };

  const originalExplosion = NP_Audio.explosion;
  NP_Audio.explosion = function () {
    NP_Juice.vibrate.heavy();
    return originalExplosion.apply(this, arguments);
  };

  const originalCombo = NP_Audio.combo;
  NP_Audio.combo = function () {
    NP_Juice.vibrate.combo();
    return originalCombo.apply(this, arguments);
  };

  const originalWin = NP_Audio.win;
  NP_Audio.win = function () {
    NP_Juice.vibrate.success();
    return originalWin.apply(this, arguments);
  };

  // Automatically initialize global tactile listener
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => NP_Juice.initTactileControls());
    } else {
      NP_Juice.initTactileControls();
    }
  }

  window.NP_Juice = NP_Juice;

})();
