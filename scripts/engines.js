/**
 * NewPlayground - Advanced Retro Game Engines
 * 1. Hàng Rong Full (5 Stages, Wholesale Market, Cooking Meters, Street Events, Equipment Shop)
 * 2. Vực Ngọc (original deep-sea tether retrieval arcade)
 * 3. Line 98 Cổ Điển (9x9 Grid, BFS Pathfinding, 3-Ball Next Preview, 5-in-a-row scoring, Undo)
 * 4. Mảnh Sao (original star-fragment cluster shooter)
 * 5. Arcade Retro Emulator (Responsive D-Pad, 3 Lives, Levels 1-5, Universal Gameplay for all other games)
 */

(function () {
  'use strict';

  // Keep the legacy shared synthesizer's delayed notes in the active game session.
  function setTimeout(callback, delay, ...args) {
    const session = window.NP_GameSession && window.NP_GameSession.getCurrent();
    return session ? session.setTimeout(callback, delay, ...args) : window.setTimeout(callback, delay, ...args);
  }

  // --- AUDIO SYNTHESIS HELPER ---
  const AudioEngine = {
    ctx: null,
    init() {
      if (window.NEWPLAYGROUND_MUTED || (window.NP_Audio && window.NP_Audio.isMuted)) return;
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },
    playTone(freq, type, duration, vol = 0.1) {
      try {
        if (window.NEWPLAYGROUND_MUTED || (window.NP_Audio && window.NP_Audio.isMuted)) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const owner = window.NP_GameSession && window.NP_GameSession.getCurrent();
        let ended = false;
        const detach = () => {
          if (ended) return;
          ended = true;
          try { osc.stop(); } catch (_) {}
          try { osc.disconnect(); gain.disconnect(); } catch (_) {}
        };
        const unregister = owner ? owner.onCleanup(detach) : () => {};
        osc.onended = () => { unregister(); detach(); };
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    },
    coin() {
      this.playTone(987.77, 'sine', 0.12, 0.15);
      setTimeout(() => this.playTone(1318.51, 'sine', 0.25, 0.15), 80);
    },
    pop() {
      this.playTone(440, 'triangle', 0.08, 0.1);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'sine', 0.18, 0.15), i * 90);
      });
    },
    explosion() {
      this.playTone(110, 'sawtooth', 0.35, 0.2);
    },
    alarm() {
      this.playTone(880, 'square', 0.1, 0.15);
      setTimeout(() => this.playTone(660, 'square', 0.1, 0.15), 100);
    },
    laser() {
      this.playTone(880, 'sawtooth', 0.07, 0.1);
      setTimeout(() => this.playTone(440, 'sawtooth', 0.07, 0.1), 30);
    },
    gemSwap() {
      this.playTone(520, 'sine', 0.06, 0.1);
    },
    match(combo = 1) {
      const pitches = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      const p = pitches[Math.min(pitches.length - 1, Math.max(0, combo - 1))];
      this.playTone(p, 'sine', 0.14, 0.15);
      setTimeout(() => this.playTone(p * 1.25, 'sine', 0.18, 0.12), 50);
    },
    powerup() {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'sine', 0.1, 0.15), i * 50);
      });
    },
    hit() {
      this.playTone(150, 'square', 0.12, 0.15);
    }
  };
  window.NP_AudioEngine = AudioEngine;

  // =========================================================================
  // 1. ENGINE: HÀNG RONG (FULL WEB-GAME REMAKE)
  // =========================================================================
  function launchHangRong(container, game) {
    const session = window.NP_GameSession.start();
    window.NP_HangRong.mount(container, session, AudioEngine);
  }

  // ========================================================================
  // 2. ENGINE: VỰC NGỌC (ORIGINAL DEEP-SEA TETHER ARCADE)
  // ========================================================================
  function launchDaoVang(container, game) {
    const engine = window.NP_AbyssRetrieval;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Vực Ngọc chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start(), AudioEngine);
  }

  // =========================================================================
  // 3. ENGINE: LINE 98 CỔ ĐIỂN (9x9 BFS PATHFINDING & UNDO ENGINE)
  // =========================================================================
  function launchLine98(container, game) {
    const session = window.NP_GameSession.start();
    window.NP_Line98.mount(container, session, AudioEngine);
  }

  // =========================================================================
  // 4. ENGINE: MẢNH SAO (ORIGINAL STAR-FRAGMENT SHOOTER)
  // =========================================================================
  function launchBanTrung(container, game) {
    const engine = window.NP_StarlightMatch;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Mảnh Sao chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start(), AudioEngine);
  }

function launchKimCuong(container, game) {
  const engine = window.NP_MosaicMatch;
  if (!engine || typeof engine.mount !== 'function') {
    container.textContent = 'Kính Khảm chưa sẵn sàng.';
    return;
  }
  return engine.mount(container, window.NP_GameSession.start(), AudioEngine);
}

function launchDatBom(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  const HIGH_SCORE_KEY = 'np_datbom_high_score';
  let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0');

  let stage = 1;
  let score = 0;
  let lives = 3;
  let animId = null;
  let gameState = 'intro'; // 'intro', 'playing', 'stageclear', 'gameover'
  let lastTime = performance.now();

  const COLS = 13;
  const ROWS = 11;
  const TILE = 36;

  // BnB Iconic Characters
  const CHARACTERS = [
    { id: 'kho-kho', name: 'Khò Khò (Dao)', color: '#3B82F6', hat: '#1D4ED8', speed: 2.5, bombs: 1, range: 1, desc: 'Cân bằng, dễ làm quen' },
    { id: 'nhanh-nhau', name: 'Nhanh Nhẩu (Bazzi)', color: '#EF4444', hat: '#B91C1C', speed: 3.2, bombs: 1, range: 1, desc: 'Tốc độ siêu nhanh' },
    { id: 'be-bong', name: 'Bé Bỏng (Marid)', color: '#EC4899', hat: '#BE185D', speed: 2.6, bombs: 1, range: 2, desc: 'Tầm bóng nước xa' },
    { id: 'thi-no', name: 'Thị Nở (Kephi)', color: '#10B981', hat: '#047857', speed: 2.3, bombs: 2, range: 1, desc: 'Thả được 2 bóng lúc đầu' }
  ];
  let selectedChar = CHARACTERS[0];
  let needles = 1; // Starting with 1 rescue needle!

  // Map: 0 = Empty, 1 = Concrete Wall, 2 = Wooden Crate, 3 = Exit Door
  let map = [];
  let powerups = {}; // "r,c" => 'bomb' | 'flame' | 'speed' | 'turtle' | 'needle'
  let exitDoorPos = null;
  let exitUnlocked = false;

  // Start BnB Procedural BGM
  if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
    window.NP_Audio.startBGM('boom');
  }

  // Player
  let player = {
    x: TILE * 1.5,
    y: TILE * 1.5,
    speed: selectedChar.speed,
    bombCapacity: selectedChar.bombs,
    flameRange: selectedChar.range,
    hasTurtle: false,
    isTrapped: false,
    trapTimer: 0,
    invincibleTimer: 60,
    direction: 'down',
    stepPhase: 0
  };

  // Active Water Bombs: { r, c, timer, maxTimer, flameRange, pulse, owner }
  let activeBombs = [];
  // Active Water Wave Explosions: { r, c, timer, cells: [{r,c,dir}] }
  let activeExplosions = [];
  // Enemies (Pirate Penguins): { x, y, vx, vy, radius, isTrapped, trapTimer }
  let enemies = [];

  const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
  const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

  container.innerHTML = `
    <div class="canvas-game-box" style="font-family: 'Calibri', -apple-system, sans-serif;">
      <!-- Character Selection Bar -->
      <div style="display: flex; gap: 6px; justify-content: center; align-items: center; margin-bottom: 6px; flex-wrap: wrap;" id="dbCharBar">
        <span style="font-size: 0.8rem; font-weight: 800; color: #FFF;">Nhân vật:</span>
        ${CHARACTERS.map((c, i) => `
          <button class="db-char-select-btn ${i === 0 ? 'active' : ''}" data-char-id="${c.id}" style="padding: 3px 10px; font-size: 0.76rem; font-weight: 800; border-radius: 4px; border: 1.5px solid ${c.color}; background: ${i === 0 ? c.color : 'rgba(15, 23, 42, 0.75)'}; color: #FFF; cursor: pointer; transition: all 0.15s ease;">
            ${c.name}
          </button>
        `).join('')}
      </div>

      <div class="canvas-game-hud">
        <div class="hud-pill">Màn: <span id="dbStage" style="color: #F59E0B; font-weight: 900;">${stage}</span></div>
        <div class="hud-pill">Điểm: <span id="dbScore" style="color: #10B981; font-weight: 900;">${score}</span></div>
        <div class="hud-pill">Kỷ lục: <span id="dbHighScore" style="color: #FBBF24; font-weight: 900;">${highScore}</span></div>
        <div class="hud-pill">Mạng: <span id="dbLives" style="color: #EF4444; font-weight: 900;">${lives}</span></div>
        <div class="hud-pill">Kim tiêm: <span id="dbNeedles" style="color: #EC4899; font-weight: 900;">${needles}</span></div>
        <div class="hud-pill">Bóng: <span id="dbBombs" style="font-weight: 900;">${player.bombCapacity}</span></div>
        <div class="hud-pill">Tầm nước: <span id="dbRange" style="color: #38BDF8; font-weight: 900;">${player.flameRange}</span></div>
      </div>

      <div style="position: relative; display: flex; justify-content: center;">
        <canvas id="dbCanvas" width="468" height="396" class="canvas-main-viewport" style="background: #0284C7; border-radius: 8px; touch-action: none;"></canvas>

        <!-- 1. INTRO OVERLAY -->
        <div class="game-stage-overlay" id="dbIntroOverlay">
          <div class="intro-modal-card">
            <div class="intro-hero-wrapper">
              <img src="assets/datbom_intro.jpg" alt="Boom Online Cổ Điển" class="intro-hero-img">
              <div class="intro-hero-overlay">
                <span class="intro-badge">Nexon / VinaGame 2007</span>
                <h3 class="intro-title">Boom Online - Đặt Bom Nước Cổ Điển</h3>
              </div>
            </div>
            <div class="intro-content">
              <p class="intro-desc">Huyền thoại quán net BnB Boom Online! Đặt bóng nước chặn đường đàn quái vật Cánh Cụt & Hải Cẩu, phá thùng gỗ tìm Giày Tăng Tốc, Bình Nước, Rùa Thần và Kim Tiêm thoát sặc nước thần kỳ!</p>
              <div class="intro-controls-box">
                <div class="intro-control-row">
                  <span class="intro-key">WASD / Mũi Tên / D-Pad</span>
                  <span>Di chuyển nhân vật với cơ chế trượt góc thông minh</span>
                </div>
                <div class="intro-control-row">
                  <span class="intro-key">Phím [Space] / Nút Đặt Bom</span>
                  <span>Thả bóng nước nổ lan 4 hướng phá vỡ hòm gỗ và quái vật</span>
                </div>
                <div class="intro-control-row">
                  <span class="intro-key">Phím [J] / Nút Kim Tiêm</span>
                  <span>Châm kim tiêm phá vỡ bóng nước cứu mạng khi bị sặc</span>
                </div>
              </div>
              <div class="intro-actions">
                <button class="btn-intro-start" id="dbStartGameBtn">Bắt đầu đặt bom (Màn 1)</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. STAGE CLEAR OVERLAY -->
        <div id="dbClearOverlay" style="display: none; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.92); border-radius: 8px; z-index: 10; padding: 24px; color: #FFF; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
          
          <h3 style="font-size: 1.4rem; color: #10B981; font-weight: 900; margin: 0 0 8px 0;">CHIẾN THẮNG MÀN ${stage}!</h3>
          <p style="font-size: 0.95rem; color: #CBD5E1; margin: 0 0 16px 0;" id="dbClearMsg">Bạn đã quét sạch quái vật và giải cứu làng Boom an toàn!</p>
          <div style="font-size: 1.1rem; color: #FBBF24; font-weight: 800; margin-bottom: 20px;">Điểm hiện có: <span id="dbClearScore">0</span></div>
          <button class="btn btn-primary" id="dbNextStageBtn" style="padding: 10px 28px; font-size: 1rem; font-weight: 900; background: #0284C7; border: none; cursor: pointer; border-radius: 6px;">
            Tiến Vào Màn Tiếp Theo ➔
          </button>
        </div>

        <!-- 3. GAME OVER OVERLAY -->
        <div id="dbGameOverOverlay" style="display: none; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.94); border-radius: 8px; z-index: 10; padding: 24px; color: #FFF; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
          
          <h3 style="font-size: 1.4rem; color: #EF4444; font-weight: 900; margin: 0 0 8px 0;">HẾT MẠNG - GAME OVER!</h3>
          <p style="font-size: 0.95rem; color: #CBD5E1; margin: 0 0 16px 0;">Nhân vật đã bị bóng nước cuốn trôi toàn bộ số mạng sống.</p>
          <div style="font-size: 1.2rem; color: #FBBF24; font-weight: 800; margin-bottom: 20px;">Điểm số chung cuộc: <span id="dbFinalScore">0</span></div>
          <button class="btn btn-primary" id="dbRetryBtn" style="padding: 10px 28px; font-size: 1rem; font-weight: 900; background: #EF4444; border: none; cursor: pointer; border-radius: 6px;">
            Chơi lại Từ Đầu
          </button>
        </div>
      </div>

      <!-- Controls & D-Pad Bar -->
      <div class="canvas-controls-bar" style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; flex-wrap: wrap; gap: 6px;">
          <div style="font-size: 0.8rem; color: #FFF;">
            <strong>WASD / Mũi tên</strong> di chuyển • <strong>Space</strong> thả bom • <strong>[J]</strong> dùng Kim Tiêm
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-canvas-action" id="dbPlaceBombBtn" style="background-color: #0284C7; color: #FFF; font-weight: 900; padding: 6px 14px;">
              Đặt bom (Space)
            </button>
            <button class="btn-canvas-action" id="dbUseNeedleBtn" style="background-color: #EC4899; color: #FFF; font-weight: 900; padding: 6px 14px;">
              Kim tiêm (J)
            </button>
          </div>
        </div>

        <!-- Touch D-Pad for Mobile -->
        <div style="display: flex; gap: 18px; align-items: center; justify-content: center; margin-top: 2px;">
          <div style="display: grid; grid-template-columns: repeat(3, 38px); grid-template-rows: repeat(3, 38px); gap: 4px;">
            <div></div>
            <button id="dbDpadUp" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: #FFF; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none;">▲</button>
            <div></div>
            <button id="dbDpadLeft" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: #FFF; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none;">◀</button>
            <div style="background: rgba(255,255,255,0.05); border-radius: 6px;"></div>
            <button id="dbDpadRight" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: #FFF; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none;">▶</button>
            <div></div>
            <button id="dbDpadDown" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: #FFF; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none;">▼</button>
            <div></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#dbCanvas');
  const ctx = canvas.getContext('2d');
  const introOverlay = container.querySelector('#dbIntroOverlay');
  const clearOverlay = container.querySelector('#dbClearOverlay');
  const gameOverOverlay = container.querySelector('#dbGameOverOverlay');

  function initStage(stg) {
    stage = stg;
    player.x = TILE * 1.5;
    player.y = TILE * 1.5;
    player.isTrapped = false;
    player.trapTimer = 0;
    player.invincibleTimer = 60;
    activeBombs = [];
    activeExplosions = [];
    powerups = {};
    exitUnlocked = false;

    // Build Map with border walls and pillars
    map = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    const potentialCrates = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          map[r][c] = 1; // Outer concrete
        } else if (r % 2 === 0 && c % 2 === 0) {
          map[r][c] = 1; // Concrete pillar
        } else {
          // Free space candidate for wooden crate
          // Clear player spawn (1,1), (1,2), (2,1)
          if (!((r === 1 && c === 1) || (r === 1 && c === 2) || (r === 2 && c === 1))) {
            if (Math.random() < 0.65) {
              map[r][c] = 2; // Wooden crate
              potentialCrates.push({ r, c });
            }
          }
        }
      }
    }

    // Exit Door
    if (potentialCrates.length > 0) {
      const exitIdx = Math.floor(Math.random() * potentialCrates.length);
      exitDoorPos = potentialCrates.splice(exitIdx, 1)[0];
    } else {
      exitDoorPos = { r: ROWS - 2, c: COLS - 2 };
    }

    // Powerups hidden under crates (including Revive Needles!)
    const pTypes = ['bomb', 'flame', 'speed', 'turtle', 'needle', 'needle'];
    for (let i = 0; i < Math.min(8, potentialCrates.length); i++) {
      const idx = Math.floor(Math.random() * potentialCrates.length);
      const cell = potentialCrates.splice(idx, 1)[0];
      powerups[`${cell.r},${cell.c}`] = pTypes[Math.floor(Math.random() * pTypes.length)];
    }

    // Spawn Pirate Penguins
    enemies = [];
    const numEnemies = 2 + Math.min(4, stg);
    for (let i = 0; i < numEnemies; i++) {
      let er, ec;
      do {
        er = Math.floor(Math.random() * (ROWS - 2)) + 1;
        ec = Math.floor(Math.random() * (COLS - 2)) + 1;
      } while (map[er][ec] !== 0 || (er <= 3 && ec <= 3));

      const dirs = [{ vx: 1.1, vy: 0 }, { vx: -1.1, vy: 0 }, { vx: 0, vy: 1.1 }, { vx: 0, vy: -1.1 }];
      const chosen = dirs[Math.floor(Math.random() * dirs.length)];
      enemies.push({
        x: ec * TILE + TILE / 2,
        y: er * TILE + TILE / 2,
        vx: chosen.vx,
        vy: chosen.vy,
        radius: 12,
        isTrapped: false,
        trapTimer: 0,
        waddle: Math.random() * Math.PI
      });
    }

    updateHUD();
  }

  function updateHUD() {
    const sEl = container.querySelector('#dbScore');
    const stEl = container.querySelector('#dbStage');
    const hsEl = container.querySelector('#dbHighScore');
    const lEl = container.querySelector('#dbLives');
    const nEl = container.querySelector('#dbNeedles');
    const bEl = container.querySelector('#dbBombs');
    const rEl = container.querySelector('#dbRange');
    if (sEl) sEl.textContent = score;
    if (stEl) stEl.textContent = stage;
    if (hsEl) hsEl.textContent = highScore;
    if (lEl) lEl.textContent = lives;
    if (nEl) nEl.textContent = needles;
    if (bEl) bEl.textContent = player.bombCapacity;
    if (rEl) rEl.textContent = player.flameRange;
  }

  function useReviveNeedle() {
    if (player.isTrapped && needles > 0) {
      needles--;
      player.isTrapped = false;
      player.invincibleTimer = 90;
      if (window.NP_Audio) {
        window.NP_Audio.pop();
        setTimeout(() => window.NP_Audio.powerup(), 50);
      }
      if (particles) particles.burst(player.x, player.y, 24, '#38BDF8', 280, 3.5);
      if (popups) popups.add('💉 THOÁT BÓNG CỨU MẠNG!', player.x, player.y - 20, '#EC4899', 20);
      updateHUD();
    }
  }

  // Character selection click handlers
  container.querySelectorAll('.db-char-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.db-char-select-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'rgba(15, 23, 42, 0.75)';
      });
      btn.classList.add('active');
      const cId = btn.getAttribute('data-char-id');
      selectedChar = CHARACTERS.find(c => c.id === cId) || CHARACTERS[0];
      btn.style.background = selectedChar.color;
      player.speed = selectedChar.speed;
      player.bombCapacity = Math.max(player.bombCapacity, selectedChar.bombs);
      player.flameRange = Math.max(player.flameRange, selectedChar.range);
      if (window.NP_Audio) window.NP_Audio.pop();
      if (popups) popups.add(`ĐÃ CHỌN: ${selectedChar.name}`, player.x, player.y - 20, selectedChar.color, 18);
      updateHUD();
    });
  });

  const keys = {};
  const onKeyDown = (e) => {
    keys[e.key] = true;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      placeWaterBomb();
    } else if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      useReviveNeedle();
    }
  };
  const onKeyUp = (e) => {
    keys[e.key] = false;
  };
  listen(window, 'keydown', onKeyDown);
  listen(window, 'keyup', onKeyUp);

  // Overlay Buttons
  const startBtn = container.querySelector('#dbStartGameBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      introOverlay.style.display = 'none';
      gameState = 'playing';
      initStage(1);
    });
  }

  const nextStageBtn = container.querySelector('#dbNextStageBtn');
  if (nextStageBtn) {
    nextStageBtn.addEventListener('click', () => {
      clearOverlay.style.display = 'none';
      gameState = 'playing';
      initStage(stage + 1);
    });
  }

  const retryBtn = container.querySelector('#dbRetryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      gameOverOverlay.style.display = 'none';
      gameState = 'playing';
      lives = 3;
      score = 0;
      initStage(1);
    });
  }

  const placeBtn = container.querySelector('#dbPlaceBombBtn');
  const needleBtn = container.querySelector('#dbUseNeedleBtn');
  if (placeBtn) placeBtn.addEventListener('click', placeWaterBomb);
  if (needleBtn) needleBtn.addEventListener('click', useReviveNeedle);

  // Touch D-Pad Handlers
  function bindDpad(btnId, keyName) {
    const btn = container.querySelector(btnId);
    if (!btn) return;
    const press = (e) => { e.preventDefault(); keys[keyName] = true; btn.style.background = 'rgba(255,255,255,0.4)'; };
    const release = (e) => { e.preventDefault(); keys[keyName] = false; btn.style.background = 'rgba(255,255,255,0.15)'; };
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  }
  bindDpad('#dbDpadUp', 'ArrowUp');
  bindDpad('#dbDpadDown', 'ArrowDown');
  bindDpad('#dbDpadLeft', 'ArrowLeft');
  bindDpad('#dbDpadRight', 'ArrowRight');

  function placeWaterBomb() {
    if (gameState !== 'playing' || player.isTrapped || lives <= 0) return;
    const r = Math.floor(player.y / TILE);
    const c = Math.floor(player.x / TILE);

    if (activeBombs.some(b => b.r === r && b.c === c)) return;
    if (activeBombs.filter(b => b.owner === 'player').length >= player.bombCapacity) return;

    activeBombs.push({
      r,
      c,
      timer: 160,
      maxTimer: 160,
      flameRange: player.flameRange,
      owner: 'player',
      hasLeft: false
    });

    if (window.NP_Audio) window.NP_Audio.pop();
    if (window.NP_Juice) window.NP_Juice.vibrate(10);
  }

  function explodeWaterBomb(b) {
    if (window.NP_Audio) window.NP_Audio.splash();
    if (window.NP_Juice) {
      window.NP_Juice.screenShake(canvas, 12, 240);
      window.NP_Juice.triggerHitstop(35);
      window.NP_Juice.vibrate(35);
    }

    const cells = [{ r: b.r, c: b.c, dir: 'center' }];
    const dirs = [
      { dr: -1, dc: 0, dir: 'up' },
      { dr: 1, dc: 0, dir: 'down' },
      { dr: 0, dc: -1, dir: 'left' },
      { dr: 0, dc: 1, dir: 'right' }
    ];

    dirs.forEach(d => {
      for (let step = 1; step <= b.flameRange; step++) {
        const nr = b.r + d.dr * step;
        const nc = b.c + d.dc * step;

        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
        if (map[nr][nc] === 1) break; // Concrete wall stops water wave

        if (map[nr][nc] === 2) {
          // Wooden crate shattered!
          map[nr][nc] = 0;
          score += 25;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
          }
          const px = nc * TILE + TILE / 2;
          const py = nr * TILE + TILE / 2;
          if (particles) {
            particles.burst(px, py, 12, '#B45309', 240, 3);
            particles.burst(px, py, 8, '#38BDF8', 200, 2);
          }
          if (window.NP_Audio) window.NP_Audio.thud();
          cells.push({ r: nr, c: nc, dir: d.dir });
          break;
        }

        cells.push({ r: nr, c: nc, dir: d.dir });
      }
    });

    activeExplosions.push({
      timer: 26,
      cells
    });

    const bx = b.c * TILE + TILE / 2;
    const by = b.r * TILE + TILE / 2;
    if (particles) {
      particles.burst(bx, by, 20, '#38BDF8', 300, 3);
    }

    // Chain reaction with nearby bombs
    activeBombs.forEach(other => {
      if (other !== b && cells.some(c => c.r === other.r && c.c === other.c)) {
        other.timer = Math.min(other.timer, 2);
      }
    });
  }

  function isBlocked(x, y, radius, isForPlayer = true) {
    const left = Math.floor((x - radius) / TILE);
    const right = Math.floor((x + radius) / TILE);
    const top = Math.floor((y - radius) / TILE);
    const bottom = Math.floor((y + radius) / TILE);

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
        if (map[r][c] === 1 || map[r][c] === 2) return true;

        const bomb = activeBombs.find(b => b.r === r && b.c === c);
        if (bomb) {
          if (isForPlayer && !bomb.hasLeft) {
            // Player is still overlapping with their freshly placed bomb
            continue;
          }
          return true;
        }
      }
    }
    return false;
  }

  function loop() {
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;
    const dtRatio = Math.min(2.5, dt / 16.67);

    // 1. Player Movement & State (60 FPS Delta-Time + Smooth Corner Sliding)
    if (gameState === 'playing' && !player.isTrapped) {
      let vx = 0;
      let vy = 0;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) { vy -= 1; player.direction = 'up'; }
      if (keys['ArrowDown'] || keys['s'] || keys['S']) { vy += 1; player.direction = 'down'; }
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) { vx -= 1; player.direction = 'left'; }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) { vx += 1; player.direction = 'right'; }

      const moveStep = player.speed * dtRatio;

      if (vx !== 0) {
        const nextX = player.x + vx * moveStep;
        if (!isBlocked(nextX, player.y, 11, true)) {
          player.x = nextX;
          player.stepPhase += 0.2 * dtRatio;
        } else {
          // Corner Slide Assist along Y
          const centerTileY = Math.floor(player.y / TILE) * TILE + TILE / 2;
          const diffY = centerTileY - player.y;
          if (Math.abs(diffY) > 1 && Math.abs(diffY) < 14) {
            const slideDir = Math.sign(diffY);
            if (!isBlocked(player.x, player.y + slideDir * moveStep * 0.85, 11, true)) {
              player.y += slideDir * moveStep * 0.85;
            }
          }
        }
      }

      if (vy !== 0) {
        const nextY = player.y + vy * moveStep;
        if (!isBlocked(player.x, nextY, 11, true)) {
          player.y = nextY;
          player.stepPhase += 0.2 * dtRatio;
        } else {
          // Corner Slide Assist along X
          const centerTileX = Math.floor(player.x / TILE) * TILE + TILE / 2;
          const diffX = centerTileX - player.x;
          if (Math.abs(diffX) > 1 && Math.abs(diffX) < 14) {
            const slideDir = Math.sign(diffX);
            if (!isBlocked(player.x + slideDir * moveStep * 0.85, player.y, 11, true)) {
              player.x += slideDir * moveStep * 0.85;
            }
          }
        }
      }

      // Check if player has completely stepped off their freshly placed bomb
      activeBombs.forEach(b => {
        if (b.owner === 'player' && !b.hasLeft) {
          const bombCenterX = b.c * TILE + TILE / 2;
          const bombCenterY = b.r * TILE + TILE / 2;
          const dist = Math.hypot(player.x - bombCenterX, player.y - bombCenterY);
          if (dist > TILE * 0.78) {
            b.hasLeft = true;
          }
        }
      });

      // Pick up powerups
      const pR = Math.floor(player.y / TILE);
      const pC = Math.floor(player.x / TILE);
      const pKey = `${pR},${pC}`;
      if (powerups[pKey] && map[pR][pC] === 0) {
        const pType = powerups[pKey];
        delete powerups[pKey];
        if (window.NP_Audio) window.NP_Audio.powerup();

        if (pType === 'bomb') {
          player.bombCapacity = Math.min(8, player.bombCapacity + 1);
          if (popups) popups.add('💣 THÊM BÓNG NƯỚC!', player.x, player.y - 15, '#38BDF8', 18);
        } else if (pType === 'flame') {
          player.flameRange = Math.min(6, player.flameRange + 1);
          if (popups) popups.add('💧 TĂNG TẦM NƯỚC!', player.x, player.y - 15, '#0284C7', 18);
        } else if (pType === 'speed') {
          player.speed = Math.min(4.5, player.speed + 0.35);
          if (popups) popups.add('👟 GIÀY SIÊU TỐC!', player.x, player.y - 15, '#F59E0B', 18);
        } else if (pType === 'needle') {
          needles = Math.min(5, needles + 1);
          if (popups) popups.add('💉 THÊM KIM TIÊM CỨU MẠNG!', player.x, player.y - 15, '#EC4899', 18);
        } else if (pType === 'turtle') {
          player.hasTurtle = true;
          player.speed = Math.min(4.8, player.speed + 0.6);
          if (popups) popups.add('🐢 CƯỠI RÙA THẦN!', player.x, player.y - 15, '#10B981', 18);
        }
        score += 100;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }
        updateHUD();
      }

      // Check Exit Door
      if (exitUnlocked && exitDoorPos && pR === exitDoorPos.r && pC === exitDoorPos.c) {
        if (window.NP_Audio) window.NP_Audio.win();
        score += 1500 * stage;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }
        updateHUD();
        gameState = 'stageclear';
        const msgEl = container.querySelector('#dbClearMsg');
        const scoreEl = container.querySelector('#dbClearScore');
        if (msgEl) msgEl.textContent = `Bạn đã hoàn thành Màn ${stage}! Thưởng qua màn +${1500 * stage} điểm.`;
        if (scoreEl) scoreEl.textContent = score;
        clearOverlay.style.display = 'flex';
        return;
      }
    }

    // Invincible Timer
    if (player.invincibleTimer > 0) player.invincibleTimer -= dtRatio;

    // Trapped in Water Bubble Logic
    if (player.isTrapped) {
      player.trapTimer -= dtRatio;
      if (player.trapTimer <= 0) {
        // Popped! Lose life
        player.isTrapped = false;
        lives--;
        if (window.NP_Audio) window.NP_Audio.explosion();
        if (lives <= 0) {
          gameState = 'gameover';
          const finalScoreEl = container.querySelector('#dbFinalScore');
          if (finalScoreEl) finalScoreEl.textContent = score;
          gameOverOverlay.style.display = 'flex';
        } else {
          player.x = TILE * 1.5;
          player.y = TILE * 1.5;
          player.invincibleTimer = 90;
        }
        updateHUD();
      }
    }

    // 2. Update Water Bombs (60 FPS Delta-Time)
    for (let i = activeBombs.length - 1; i >= 0; i--) {
      const b = activeBombs[i];
      b.timer -= dtRatio;
      if (b.timer <= 0) {
        activeBombs.splice(i, 1);
        explodeWaterBomb(b);
      }
    }

    // 3. Update Explosions
    for (let i = activeExplosions.length - 1; i >= 0; i--) {
      const exp = activeExplosions[i];
      exp.timer -= dtRatio;
      if (exp.timer <= 0) {
        activeExplosions.splice(i, 1);
      } else {
        // Check hits with player
        if (!player.isTrapped && player.invincibleTimer <= 0 && gameState === 'playing') {
          const pR = Math.floor(player.y / TILE);
          const pC = Math.floor(player.x / TILE);
          if (exp.cells.some(c => c.r === pR && c.c === pC)) {
            if (player.hasTurtle) {
              player.hasTurtle = false;
              player.invincibleTimer = 60;
              if (popups) popups.add('🛡️ RÙA THẦN ĐỠ ĐẠN!', player.x, player.y - 15, '#10B981', 18);
              if (window.NP_Audio) window.NP_Audio.thud();
            } else {
              player.isTrapped = true;
              player.trapTimer = 180; // ~3 seconds to pop
              if (window.NP_Audio) window.NP_Audio.splash();
              if (popups) popups.add('💦 BỊ SẶC NƯỚC! DÙNG KIM TIÊM [J]!', player.x, player.y - 20, '#EF4444', 20);
            }
          }
        }

        // Check hits with enemies
        enemies.forEach(e => {
          if (!e.isTrapped) {
            const eR = Math.floor(e.y / TILE);
            const eC = Math.floor(e.x / TILE);
            if (exp.cells.some(c => c.r === eR && c.c === eC)) {
              e.isTrapped = true;
              e.trapTimer = 160;
              if (window.NP_Audio) window.NP_Audio.splash();
              score += 200;
              if (score > highScore) {
                highScore = score;
                localStorage.setItem(HIGH_SCORE_KEY, highScore);
              }
              if (popups) popups.add('💦 BẪY ĐƯỢC QUÁI! +200', e.x, e.y - 15, '#38BDF8', 18);
              updateHUD();
            }
          }
        });
      }
    }

    // 4. Update Enemies (Pirate Penguins)
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.isTrapped) {
        e.trapTimer -= dtRatio;
        if (e.trapTimer <= 0) {
          // Popped enemy!
          if (particles) particles.burst(e.x, e.y, 16, '#0284C7', 240, 3);
          enemies.splice(i, 1);
          score += 300;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
          }
          if (window.NP_Audio) window.NP_Audio.pop();
          if (popups) popups.add('⭐ TIÊU DIỆT! +300', e.x, e.y - 15, '#F59E0B', 20);
          updateHUD();

          if (enemies.length === 0) {
            exitUnlocked = true;
            if (popups) popups.add('🚪 CỬA THOÁT ĐÃ MỞ!', canvas.width / 2, 60, '#10B981', 22);
          }
          continue;
        }

        // Player touches trapped enemy to pop it instantly!
        if (Math.hypot(player.x - e.x, player.y - e.y) < 22 && !player.isTrapped && gameState === 'playing') {
          if (particles) particles.burst(e.x, e.y, 18, '#38BDF8', 260, 3.5);
          enemies.splice(i, 1);
          score += 400;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
          }
          if (window.NP_Audio) window.NP_Audio.pop();
          if (popups) popups.add('💥 ĐẠP VỠ BÓNG! +400', e.x, e.y - 15, '#10B981', 20);
          updateHUD();

          if (enemies.length === 0) {
            exitUnlocked = true;
            if (popups) popups.add('🚪 CỬA THOÁT ĐÃ MỞ!', canvas.width / 2, 60, '#10B981', 22);
          }
          continue;
        }
      } else if (gameState === 'playing') {
        // Normal patrol
        e.waddle += 0.15 * dtRatio;
        const nextX = e.x + e.vx * dtRatio;
        const nextY = e.y + e.vy * dtRatio;

        if (isBlocked(nextX, nextY, e.radius, false)) {
          // Choose new valid direction
          const dirs = [{ vx: 1.1, vy: 0 }, { vx: -1.1, vy: 0 }, { vx: 0, vy: 1.1 }, { vx: 0, vy: -1.1 }];
          const valid = dirs.filter(d => !isBlocked(e.x + d.vx * 16, e.y + d.vy * 16, e.radius, false));
          if (valid.length > 0) {
            const chosen = valid[Math.floor(Math.random() * valid.length)];
            e.vx = chosen.vx;
            e.vy = chosen.vy;
          } else {
            e.vx *= -1;
            e.vy *= -1;
          }
        } else {
          e.x = nextX;
          e.y = nextY;
        }

        // Enemy collides with player
        if (Math.hypot(player.x - e.x, player.y - e.y) < 18 && !player.isTrapped && player.invincibleTimer <= 0) {
          if (player.hasTurtle) {
            player.hasTurtle = false;
            player.invincibleTimer = 60;
            if (popups) popups.add('🛡️ RÙA THẦN BẢO VỆ!', player.x, player.y - 15, '#10B981', 18);
            if (window.NP_Audio) window.NP_Audio.thud();
          } else {
            player.isTrapped = true;
            player.trapTimer = 180;
            if (window.NP_Audio) window.NP_Audio.splash();
            if (popups) popups.add('💦 BỊ QUÁI VẬT TÚM! DÙNG [J]!', player.x, player.y - 20, '#EF4444', 20);
          }
        }
      }
    }

    // ==========================================
    // RENDER PASS
    // ==========================================
    // 1. Water Garden Grass Tilemap
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE;
        const y = r * TILE;
        const cell = map[r][c];

        // Floor tile checkered pattern
        ctx.fillStyle = (r + c) % 2 === 0 ? '#38BDF8' : '#0284C7';
        ctx.fillRect(x, y, TILE, TILE);

        // Powerup
        const pKey = `${r},${c}`;
        if (powerups[pKey] && cell === 0) {
          const pt = powerups[pKey];
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = 'bold 12px Calibri, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#0F172A';
          const icon = pt === 'bomb' ? '💣' : pt === 'flame' ? '💧' : pt === 'speed' ? '👟' : pt === 'needle' ? '💉' : '🐢';
          ctx.fillText(icon, x + TILE / 2, y + TILE / 2 + 4);
        }

        // Exit Door
        if (exitDoorPos && r === exitDoorPos.r && c === exitDoorPos.c && cell === 0) {
          ctx.fillStyle = exitUnlocked ? '#10B981' : '#64748B';
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 12px Calibri, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(exitUnlocked ? '🚪' : '🔒', x + TILE / 2, y + TILE / 2 + 4);
        }

        if (cell === 1) {
          // Concrete block
          ctx.fillStyle = '#475569';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#64748B';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, TILE, TILE);
        } else if (cell === 2) {
          // Wooden crate
          ctx.fillStyle = '#D97706';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#B45309';
          ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
          ctx.strokeStyle = '#78350F';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + TILE - 4, y + TILE - 4);
          ctx.moveTo(x + TILE - 4, y + 4);
          ctx.lineTo(x + 4, y + TILE - 4);
          ctx.stroke();
        }
      }
    }

    // 2. Render Active Water Bombs
    activeBombs.forEach(b => {
      const bx = b.c * TILE + TILE / 2;
      const by = b.r * TILE + TILE / 2;
      const pulse = 1 + Math.sin(b.timer * 0.15) * 0.12;

      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(pulse, pulse);

      // Translucent Water Bubble
      const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.7)');
      grad.addColorStop(1, 'rgba(2, 132, 199, 0.95)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();

      // Bubble Outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glossy Reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.ellipse(-4, -5, 4, 2.5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 3. Render Water Wave Explosions
    activeExplosions.forEach(exp => {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      exp.cells.forEach(c => {
        const cx = c.c * TILE;
        const cy = c.r * TILE;
        ctx.fillRect(cx + 4, cy + 4, TILE - 8, TILE - 8);

        // Water splash splash
        ctx.fillStyle = '#E0F2FE';
        ctx.beginPath();
        ctx.arc(cx + TILE / 2, cy + TILE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      });
    });

    // 4. Render Enemies (Pirate Penguins)
    enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.isTrapped) {
        // Trapped in floating bubble!
        const bPulse = 1 + Math.sin(Date.now() * 0.01) * 0.08;
        ctx.scale(bPulse, bPulse);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#BAE6FD';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Penguin Body
      const waddle = Math.sin(e.waddle) * 2;
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // White Belly
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.ellipse(0, 2, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Orange Beak & Feet
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(0, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-6 + waddle, 10, 4, 3);
      ctx.fillRect(2 - waddle, 10, 4, 3);

      ctx.restore();
    });

    // 5. Render Player
    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.invincibleTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (player.isTrapped) {
      // Big Water Trapped Bubble
      const tPulse = 1 + Math.sin(Date.now() * 0.008) * 0.08;
      ctx.scale(tPulse, tPulse);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Turtle Mount
    if (player.hasTurtle) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.ellipse(0, 6, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.arc(0, 6, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Character Head & Hat
    ctx.fillStyle = selectedChar.hat;
    ctx.beginPath();
    ctx.arc(0, -5, 12, Math.PI, 0);
    ctx.fill();

    // Round Chibi Face
    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-3, -1, 1.8, 0, Math.PI * 2);
    ctx.arc(3, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Cute Cheeks
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.arc(-5, 2, 1.8, 0, Math.PI * 2);
    ctx.arc(5, 2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Juice Effects
    if (particles) {
      particles.update(16);
      particles.draw(ctx);
    }
    if (popups) {
      popups.update(16);
      popups.draw(ctx);
    }

    animId = requestAnimationFrame(loop);
  }

  initStage(1);
  animId = requestAnimationFrame(loop);

  onCleanup(() => {
    cancelAnimationFrame(animId);
    if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') {
      window.NP_Audio.stopBGM();
    }
  });
}

// =========================================================================
// 7. ENGINE: XE SĂN BỤI (ORIGINAL GRID ROVER)
// =========================================================================
function launchXeTang1990(container, game) {
  const engine = window.NP_ScrapRover;
  if (!engine || typeof engine.mount !== 'function') {
    container.textContent = 'Xe Săn Bụi chưa sẵn sàng.';
    return;
  }
  return engine.mount(container, window.NP_GameSession.start(), AudioEngine);
}

function launchCaro(container, game) {
  if (!window.NP_CaroCandidate || !window.NP_CaroCandidateModel || !window.NP_GameSession) {
    container.textContent = 'Cờ Caro chưa sẵn sàng.';
    return;
  }
  const session = window.NP_GameSession.start();
  const match = window.NP_CaroCandidate.mount(container, {
    model: window.NP_CaroCandidateModel.create()
  });
  session.onCleanup(match.destroy);
  return match;
}

function launchSnake(container, game) {
  if (window.NP_RanSanMoiSnake && window.NP_GameSession) {
    return window.NP_RanSanMoiSnake.mount(container, window.NP_GameSession.start());
  }
  container.innerHTML = '<p class="np-game-sr" role="status">Rắn Săn Mồi chưa sẵn sàng.</p>';
}


// =========================================================================
// 10. ENGINE: XẾP KHỐI (ORIGINAL PROJECT SCOPE)
// =========================================================================
function launchTetris(container, game) {
  const session = window.NP_GameSession.start();
  return window.NP_FallingBlocks.mount(container, session, window.NP_AudioEngine);
}

// Original falling-block implementation is isolated in scripts/games/.
// =========================================================================
// FLAPPY BIRD legacy engine
// =========================================================================
function launchFlappyBird(container, game) {
  if (window.NP_FlappyBird && window.NP_GameSession) {
    return window.NP_FlappyBird.mount(container, window.NP_GameSession.start());
  }
  container.innerHTML = '<p class="np-game-sr" role="status">Mạch Gió chưa sẵn sàng.</p>';
}


// =========================================================================
// 13. ENGINE: CHÉM HOA QUẢ (FRUIT NINJA CỔ ĐIỂN FULL ENGINE)
// =========================================================================
function launchFruitNinja(container, game) {
  if (window.NP_FruitSweep && window.NP_GameSession) {
    return window.NP_FruitSweep.mount(container, window.NP_GameSession.start());
  }
  container.innerHTML = '<p class="np-game-sr" role="status">Vườn Bật Nảy chưa sẵn sàng.</p>';
}


function launchDoMin(container, game) {
  const session = window.NP_GameSession.start();
  window.NP_Minesweeper.mount(container, session, AudioEngine);
}


  // =========================================================================
  // 15. ENGINE: NỐI HÌNH (ORIGINAL TILE-CONNECT CANDIDATE)
  // =========================================================================
  function launchNoiHinh(container, game) {
    const engine = window.NP_NoiHinh;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Nối Hình chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start(), AudioEngine);
  }

  function launchRetroArcade(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let lives = 3;
    let level = 1;
    let score = 0;
    let playerX = 240;
    let playerY = 360;
    let obstacles = [];
    let items = [];
    let animId = null;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill">${game.title}</div>
          <div class="hud-pill">Mạng: <span id="arcLives" style="color: #EF4444;">❤️❤️❤️</span></div>
          <div class="hud-pill">Cấp: <span id="arcLevel">1</span></div>
          <div class="hud-pill">Điểm: <span id="arcScore" style="color: #10B981;">0</span></div>
        </div>

        <canvas id="arcCanvas" width="480" height="400" class="canvas-main-viewport"></canvas>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 6px;">
            <button class="btn-canvas-action" id="arcLeft">◀ Trái</button>
            <button class="btn-canvas-action" id="arcRight">Phải ▶</button>
          </div>
          <button class="btn-canvas-action" id="arcAction" style="background-color: var(--accent-terracotta); color: #FFF; font-weight: 900;">⚡ BẮN (SPACE)</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#arcCanvas');
    const ctx = canvas.getContext('2d');

    const keys = {};
    listen(window, 'keydown', (e) => { keys[e.key] = true; });
    listen(window, 'keyup', (e) => { keys[e.key] = false; });

    const leftBtn = container.querySelector('#arcLeft');
    const rightBtn = container.querySelector('#arcRight');
    if (leftBtn) {
      leftBtn.addEventListener('mousedown', () => { keys['ArrowLeft'] = true; });
      leftBtn.addEventListener('mouseup', () => { keys['ArrowLeft'] = false; });
      leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowLeft'] = true; });
      leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; });
    }
    if (rightBtn) {
      rightBtn.addEventListener('mousedown', () => { keys['ArrowRight'] = true; });
      rightBtn.addEventListener('mouseup', () => { keys['ArrowRight'] = false; });
      rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowRight'] = true; });
      rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowRight'] = false; });
    }

    let lasers = [];
    const fireBtn = container.querySelector('#arcAction');
    const fireLaser = () => {
      lasers.push({ x: playerX - 8, y: playerY - 12 });
      lasers.push({ x: playerX + 8, y: playerY - 12 });
      AudioEngine.laser();
      if (window.NP_Juice) window.NP_Juice.vibrate(8);
    };
    if (fireBtn) fireBtn.addEventListener('click', fireLaser);
    listen(window, 'keydown', (e) => { if (e.code === 'Space') fireLaser(); });

    // Touch direct drag on canvas
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        playerX = Math.max(25, Math.min(canvas.width - 25, (e.touches[0].clientX - rect.left) * scaleX));
      }
    }, { passive: false });
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        playerX = Math.max(25, Math.min(canvas.width - 25, (e.touches[0].clientX - rect.left) * scaleX));
        fireLaser();
      }
    }, { passive: false });

    function loop() {
      // Controls
      if (keys['ArrowLeft'] || keys['a']) playerX = Math.max(25, playerX - 5.5);
      if (keys['ArrowRight'] || keys['d']) playerX = Math.min(canvas.width - 25, playerX + 5.5);

      // Lasers movement
      for (let li = lasers.length - 1; li >= 0; li--) {
        lasers[li].y -= 8;
        if (lasers[li].y < -10) lasers.splice(li, 1);
      }

      // Spawn asteroids & items
      if (Math.random() < 0.035 * level) {
        obstacles.push({
          x: 25 + Math.random() * (canvas.width - 50),
          y: -25,
          speed: 2.2 + level * 0.6,
          radius: 14 + Math.random() * 6,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.05
        });
      }
      if (Math.random() < 0.02) {
        items.push({
          x: 25 + Math.random() * (canvas.width - 50),
          y: -20,
          speed: 2,
          radius: 10
        });
      }

      // Draw Background Starfield
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#FFFFFF';
      for (let s = 0; s < 30; s++) {
        ctx.fillRect((s * 47) % canvas.width, (Date.now() * 0.08 + s * 53) % canvas.height, 1.5, 1.5);
      }

      // Lasers
      ctx.fillStyle = '#38BDF8';
      lasers.forEach(l => {
        ctx.fillRect(l.x - 1.5, l.y, 3, 12);
      });

      // Draw Spaceship Player
      ctx.save();
      ctx.translate(playerX, playerY);

      // Thruster flame
      ctx.fillStyle = Math.random() > 0.5 ? '#F59E0B' : '#EF4444';
      ctx.beginPath();
      ctx.moveTo(-6, 12);
      ctx.lineTo(0, 20 + Math.random() * 6);
      ctx.lineTo(6, 12);
      ctx.closePath();
      ctx.fill();

      // Ship body
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(16, 14);
      ctx.lineTo(0, 8);
      ctx.lineTo(-16, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = '#93C5FD';
      ctx.beginPath();
      ctx.ellipse(0, -2, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Asteroid Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y += obs.speed;
        obs.rot += obs.vrot;

        // Check laser collision
        let hitByLaser = false;
        for (let li = lasers.length - 1; li >= 0; li--) {
          const l = lasers[li];
          if (Math.hypot(l.x - obs.x, l.y - obs.y) < obs.radius + 4) {
            hitByLaser = true;
            lasers.splice(li, 1);
            break;
          }
        }

        if (hitByLaser) {
          AudioEngine.explosion();
          score += 30;
          obstacles.splice(i, 1);
          const sEl = container.querySelector('#arcScore');
          if (sEl) sEl.textContent = score;
          continue;
        }

        // Draw Asteroid
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.rot);
        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2;
          const r = obs.radius * (0.8 + (a % 2 === 0 ? 0.2 : -0.1));
          if (a === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94A3B8';
        ctx.stroke();
        ctx.restore();

        // Hit player
        if (Math.hypot(obs.x - playerX, obs.y - playerY) < obs.radius + 14) {
          lives--;
          AudioEngine.explosion();
          obstacles.splice(i, 1);
          const livesEl = container.querySelector('#arcLives');
          if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, lives));
          if (lives <= 0) {
            AudioEngine.explosion();
            lives = 3;
            score = 0;
            level = 1;
          }
          continue;
        }

        if (obs.y > canvas.height + 30) obstacles.splice(i, 1);
      }

      // Energy Items
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.speed;
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        if (Math.hypot(it.x - playerX, it.y - playerY) < it.radius + 14) {
          score += 50;
          AudioEngine.coin();
          items.splice(i, 1);
          const sEl = container.querySelector('#arcScore');
          if (sEl) sEl.textContent = score;
          if (score >= level * 300) {
            level++;
            AudioEngine.win();
            const lEl = container.querySelector('#arcLevel');
            if (lEl) lEl.textContent = level;
          }
          continue;
        }

        if (it.y > canvas.height + 20) items.splice(i, 1);
      }

      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // --- EXPORT TO GLOBAL SCOPE ---
  window.NP_Engines = {
    launchHangRong,
    launchDaoVang,
    launchLine98,
    launchBanTrung,
    launchKimCuong,
    launchDatBom,
    launchXeTang1990,
    launchCaro,
    launchSnake,
    launchTetris,
    launchFlappyBird,
    launchFruitNinja,
    launchDoMin,
    launchNoiHinh,
    launchRetroArcade
  };
})();
