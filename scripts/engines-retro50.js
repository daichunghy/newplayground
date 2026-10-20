/**
 * NEWPLAYGROUND - 50 RETRO CLASSICS ENGINE SUITE (STT 101 - 150)
 * Browser adaptations of ten retro games, with shared arcade fallbacks.
 * Simulations use active session time; older frame-based mechanics run at 60 ticks/s.
 * Stages, input, scoring and procedural art are implemented locally without extra runtimes.
 * Typography: Calibri first.
 */

(function () {
  'use strict';

  // --- AUDIO PROXIES ---
  const Audio = window.NP_Audio || {
    tone: () => {},
    explosion: () => {},
    hit: () => {},
    crunch: () => {},
    pop: () => {},
    coin: () => {},
    powerup: () => {},
    whoosh: () => {},
    thud: () => {},
    laser: () => {},
    alarm: () => {},
    win: () => {}
  };

  const Juice = window.NP_Juice || {
    createCameraShake: () => ({ trauma: 0, addTrauma: () => {}, getOffset: () => ({ x: 0, y: 0 }) }),
    screenShake: () => {},
    triggerHitstop: () => {},
    isFrozen: () => false,
    createPopupManager: () => ({ add: () => {}, updateAndDraw: () => {}, clear: () => {} }),
    createParticleSystem: () => ({ spawn: () => {}, updateAndDraw: () => {} })
  };

  function playSfx(type, ...args) {
    if (window.NEWPLAYGROUND_MUTED) return;
    try {
      if (typeof Audio[type] === 'function') {
        Audio[type](...args);
      } else if (typeof Audio.tone === 'function') {
        Audio.tone(440, 'triangle', 0.1);
      }
    } catch (e) {}
  }

  // Older arcade simulations use one tick as 1/60s. Rendering may run at any refresh rate.
  function fixedTicks(clock) {
    let previous = clock.now();
    let remaining = 0;
    return () => {
      const now = clock.now();
      remaining += Math.min(100, Math.max(0, now - previous));
      previous = now;
      const count = Math.floor((remaining + 0.000001) / (1000 / 60));
      remaining = Math.max(0, remaining - count * (1000 / 60));
      return count;
    };
  }

  function isTyping(event) {
    const target = event.target;
    return target && (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName) || target.isContentEditable);
  }

  function bindKeys(listen, keys) {
    listen(window, 'keydown', event => {
      if (isTyping(event)) return;
      if (/^(Arrow|Space)/.test(event.code || event.key)) event.preventDefault();
      keys[event.code] = true; keys[event.key] = true;
    });
    listen(window, 'keyup', event => { keys[event.code] = false; keys[event.key] = false; });
    listen(window, 'blur', () => { for (const key of Object.keys(keys)) keys[key] = false; });
  }

  function bindHoldControl(listen, button, onPress, onRelease) {
    if (!button) return;
    let pointerId = null;
    button.style.touchAction = 'none';
    listen(button, 'pointerdown', event => {
      if (event.button > 0 || pointerId !== null) return;
      event.preventDefault();
      pointerId = event.pointerId === undefined ? 'primary' : event.pointerId;
      if (button.setPointerCapture && event.pointerId !== undefined) {
        try { button.setPointerCapture(event.pointerId); } catch (error) {}
      }
      onPress();
    });
    const release = event => {
      if (pointerId !== (event.pointerId === undefined ? 'primary' : event.pointerId)) return;
      pointerId = null;
      onRelease(event.type === 'pointerup');
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, name, release);
    listen(window, 'pointerup', release);
    listen(window, 'blur', () => { pointerId = null; onRelease(false); });
    listen(button, 'keydown', event => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); onPress(); }
    });
    listen(button, 'keyup', event => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); onRelease(true); }
    });
    listen(button, 'blur', () => onRelease(false));
  }

  function drawResult(ctx, width, height, phase, detail) {
    if (phase === 'playing') return;
    ctx.fillStyle = 'rgba(9,18,32,0.84)'; ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = phase === 'won' ? '#BBF7D0' : '#FECACA';
    ctx.font = 'bold 30px Calibri, sans-serif';
    ctx.fillText(phase === 'won' ? 'HOÀN THÀNH!' : 'HẾT LƯỢT', width / 2, height / 2 - 28);
    ctx.fillStyle = '#F8FAFC'; ctx.font = '20px Calibri, sans-serif';
    ctx.fillText(detail, width / 2, height / 2 + 6, width - 64);
    ctx.fillStyle = '#CBD5E1'; ctx.font = '17px Calibri, sans-serif';
    ctx.fillText('Bấm Chơi lại để bắt đầu lượt mới', width / 2, height / 2 + 41);
  }

  // =========================================================================
  // 1. BOOM ONLINE (BnB / CRAZY ARCADE) - ĐẦY ĐỦ 3 MÀN, THÚ CƯỠI, TRÙM CUỐI
  // =========================================================================
  function launchBoomOnline(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    const TILE = 32;
    const COLS = 15;
    const ROWS = 13;
    const W = COLS * TILE;
    const H = ROWS * TILE;

    container.innerHTML = `
      <div class="canvas-game-box np-boom-game">
        <header class="np-boom-top">
          <div class="np-boom-identity"><strong>BOOM</strong><span id="bnbStage">1 · Thị trấn</span></div>
          <div class="np-boom-score"><small>ĐIỂM</small><strong id="bnbScore">0</strong><small>Kỷ lục <span id="bnbBest">0</span></small></div>
          <div class="np-boom-lives"><small>MẠNG</small><strong id="bnbLives">3</strong></div>
        </header>
        <div class="np-boom-gear" aria-label="Vật phẩm hiện có">
          <span>Bóng <b id="bnbBombs">1</b></span><span>Tầm nước <b id="bnbRange">1</b></span>
          <span>Kim <b id="bnbNeedles">2</b></span><span id="bnbMount">Đi bộ</span>
        </div>
        <div class="np-boom-stage">
          <canvas id="bnbCanvas" width="${W}" height="${H}" class="canvas-main-viewport np-boom-canvas"
            aria-label="Bản đồ Boom Online. Di chuyển bốn hướng và đặt bóng nước."></canvas>
          <div class="np-boom-end" id="bnbEndOverlay" role="status" aria-live="polite" style="display:none">
            <div class="np-boom-end-art" aria-hidden="true"></div>
            <h3 id="bnbEndTitle">Kết thúc</h3><p id="bnbEndText"></p>
            <button type="button" id="bnbRestart" class="np-boom-restart">Chơi lại</button>
          </div>
        </div>
        <div class="np-boom-controls">
          <div class="np-boom-dpad" role="group" aria-label="Di chuyển">
            <button type="button" id="bnbUp" aria-label="Đi lên">▲</button>
            <button type="button" id="bnbLeft" aria-label="Sang trái">◀</button>
            <span aria-hidden="true"></span>
            <button type="button" id="bnbRight" aria-label="Sang phải">▶</button>
            <button type="button" id="bnbDown" aria-label="Đi xuống">▼</button>
          </div>
          <div class="np-boom-actions">
            <button id="bnbDrop" type="button" class="np-boom-primary">Đặt bóng</button>
            <button id="bnbUseNeedle" type="button" class="np-boom-secondary">Dùng kim</button>
          </div>
        </div>
        <p class="np-boom-tip">Mũi tên hoặc WASD để đi, Space đặt bóng. Dùng kim khi bị nhốt trong bóng nước.</p>
        <div id="bnbNotice" class="np-boom-notice" role="status" aria-live="polite"></div>
      </div>
    `;
    const canvas = container.querySelector('#bnbCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    let currentStage = 1; // 1: Town, 2: Ice Village, 3: Pirate Boss
    let score = 0;
    let lives = 3;
    let needles = 2;
    let maxBombs = 1;
    let bombRange = 1;
    let speed = 3;
    let mount = 'none';
    let phase = 'playing';
    let stageBanner = 100;
    let blastSerial = 0;
    const bossHitBlasts = new Set();
    let bestScore = 0;
    let lastFrame = 0, accumulator = 0;
    const STEP_MS = 1000 / 60;
    const BEST_KEY = 'np_boom_online_best';
    try { bestScore = Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); }
    catch (error) { /* blocked storage */ }

    const player = {
      x: 1 * TILE + 4,
      y: 1 * TILE + 4,
      vx: 0,
      vy: 0,
      trapped: false,
      trapTimer: 0,
      invuln: 0
    };

    let map = [];
    let balloons = [];
    let waterWaves = [];
    let items = [];
    let bots = [];
    let pirateBoss = null;

    function buildMap(stage) {
      map = [];
      balloons = [];
      waterWaves = [];
      items = [];
      bots = [];
      pirateBoss = null;

      player.x = 1 * TILE + 4;
      player.y = 1 * TILE + 4;
      player.trapped = false;
      player.trapTimer = 0;
      player.invuln = 90;
      player.vx = 0;
      player.vy = 0;
      stageBanner = 100;
      bossHitBlasts.clear();

      for (let r = 0; r < ROWS; r++) {
        map[r] = [];
        for (let c = 0; c < COLS; c++) {
          if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
            map[r][c] = 1; // Border
          } else if (r % 2 === 0 && c % 2 === 0) {
            map[r][c] = 1; // Pillars
          } else if ((r <= 2 && c <= 2) || (r >= ROWS - 3 && c >= COLS - 3) ||
                     (r <= 2 && c >= COLS - 3) || (r >= ROWS - 3 && c <= 2) ||
                     (stage === 3 && r <= 4 && c >= 5 && c <= 9)) {
            map[r][c] = 0; // Clear spawn routes and fair boss arena
          } else {
            map[r][c] = Math.random() < 0.6 ? 2 : 0; // Soft crates
          }
        }
      }

      if (stage === 1) {
        // Town: 2 easy bots
        bots = [
          { x: (COLS - 2) * TILE + 4, y: (ROWS - 2) * TILE + 4, speed: 2, range: 1, maxBombs: 1, trapped: false, trapTimer: 0, alive: true, dir: 0, moveCounter: 0 },
          { x: (COLS - 2) * TILE + 4, y: 1 * TILE + 4, speed: 2, range: 1, maxBombs: 1, trapped: false, trapTimer: 0, alive: true, dir: 1, moveCounter: 0 }
        ];
      } else if (stage === 2) {
        // Ice Village: 3 fast bots
        bots = [
          { x: (COLS - 2) * TILE + 4, y: (ROWS - 2) * TILE + 4, speed: 2.8, range: 2, maxBombs: 2, trapped: false, trapTimer: 0, alive: true, dir: 0, moveCounter: 0 },
          { x: (COLS - 2) * TILE + 4, y: 1 * TILE + 4, speed: 2.8, range: 2, maxBombs: 2, trapped: false, trapTimer: 0, alive: true, dir: 1, moveCounter: 0 },
          { x: 1 * TILE + 4, y: (ROWS - 2) * TILE + 4, speed: 2.8, range: 2, maxBombs: 1, trapped: false, trapTimer: 0, alive: true, dir: 2, moveCounter: 0 }
        ];
      } else if (stage === 3) {
        // Pirate Boss
        pirateBoss = {
          x: Math.floor(COLS / 2) * TILE,
          y: 2 * TILE,
          w: 48,
          h: 48,
          hp: 5,
          maxHp: 5,
          shootTimer: 0,
          alive: true,
          dir: 1
        };
        bots = [
          { x: (COLS - 2) * TILE + 4, y: (ROWS - 2) * TILE + 4, speed: 3, range: 2, maxBombs: 2, trapped: false, trapTimer: 0, alive: true, dir: 0, moveCounter: 0 }
        ];
      }

      updateHUD();
    }

    buildMap(currentStage);


    const keys = Object.create(null);
    const moveCodes = {
      ArrowLeft: 'ArrowLeft', KeyA: 'ArrowLeft',
      ArrowRight: 'ArrowRight', KeyD: 'ArrowRight',
      ArrowUp: 'ArrowUp', KeyW: 'ArrowUp',
      ArrowDown: 'ArrowDown', KeyS: 'ArrowDown'
    };
    function announce(message) {
      const el = container.querySelector('#bnbNotice');
      if (el) el.textContent = message;
    }
    function persistBest() {
      if (score <= bestScore) return;
      bestScore = score;
      try { localStorage.setItem(BEST_KEY, String(bestScore)); } catch (error) {}
    }
    function showEnd(won) {
      if (phase !== 'playing') return;
      phase = won ? 'won' : 'lost';
      persistBest();
      updateHUD();
      const box = container.querySelector('#bnbEndOverlay');
      if (box) box.style.display = 'flex';
      const title = container.querySelector('#bnbEndTitle');
      const desc = container.querySelector('#bnbEndText');
      if (title) title.textContent = won ? 'Phố đã an toàn' : 'Hết lượt';
      if (desc) desc.textContent = won
        ? 'Bạn đã vượt ba màn và đánh bại thuyền trưởng. Điểm: ' + score
        : 'Bạn đạt ' + score + ' điểm. Thử lại để đi xa hơn.';
      announce(won ? 'Hoàn thành ba màn chơi.' : 'Đã hết mạng.');
      playSfx(won ? 'win' : 'alarm');
      Object.keys(keys).forEach(k => { keys[k] = false; });
    }
    function restart() {
      phase = 'playing'; currentStage = 1; score = 0; lives = 3;
      needles = 2; maxBombs = 1; bombRange = 1; speed = 3;
      mount = 'none'; blastSerial = 0; lastFrame = 0; accumulator = 0;
      Object.keys(keys).forEach(k => { keys[k] = false; });
      const box = container.querySelector('#bnbEndOverlay');
      if (box) box.style.display = 'none';
      buildMap(1);
      updateHUD();
      announce('Màn 1 bắt đầu.');
    }
    listen(window, 'keydown', e => {
      if (phase !== 'playing') return;
      const moveKey = moveCodes[e.code];
      if (moveKey) { e.preventDefault(); keys[moveKey] = true; }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) dropBalloon(player);
      } else if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !e.repeat) {
        e.preventDefault(); useNeedle();
      }
    });
    listen(window, 'keyup', e => {
      const moveKey = moveCodes[e.code];
      if (moveKey) keys[moveKey] = false;
    });
    function bindButton(selector, keyName) {
      const el = container.querySelector(selector);
      if (!el) return;
      listen(el, 'pointerdown', e => {
        e.preventDefault();
        if (phase !== 'playing') return;
        if (el.setPointerCapture && e.pointerId !== undefined) {
          try { el.setPointerCapture(e.pointerId); } catch (error) {}
        }
        if (keyName === 'Space') dropBalloon(player);
        else if (keyName === 'ControlLeft') useNeedle();
        else keys[keyName] = true;
      });
      for (const type of ['pointerup','pointercancel','lostpointercapture']) {
        listen(el, type, () => { if (keyName !== 'Space' && keyName !== 'ControlLeft') keys[keyName] = false; });
      }
      listen(el, 'click', e => {
        if (e.detail !== 0 || phase !== 'playing') return;
        if (keyName === 'Space') dropBalloon(player);
        else if (keyName === 'ControlLeft') useNeedle();
      });
    }
    bindButton('#bnbLeft','ArrowLeft'); bindButton('#bnbRight','ArrowRight');
    bindButton('#bnbUp','ArrowUp'); bindButton('#bnbDown','ArrowDown');
    bindButton('#bnbDrop','Space'); bindButton('#bnbUseNeedle','ControlLeft');
    listen(container.querySelector('#bnbRestart'), 'click', restart);
    const stopMovement = () => Object.keys(keys).forEach(k => { keys[k] = false; });
    listen(window, 'pointerup', stopMovement);
    listen(window, 'blur', stopMovement);
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { stopMovement(); lastFrame = 0; accumulator = 0; }
    });

    function dropBalloon(owner) {
      if (phase !== 'playing' || owner.trapped) return;
      const c = Math.floor((owner.x + TILE / 2) / TILE);
      const r = Math.floor((owner.y + TILE / 2) / TILE);
      if (balloons.some(b => b.c === c && b.r === r)) return;
      const ownerBalloons = balloons.filter(b => b.owner === owner).length;
      if (ownerBalloons >= (owner.maxBombs || maxBombs)) return;

      balloons.push({
        c, r,
        range: owner.range || bombRange,
        timer: 160,
        owner,
        pulse: 0
      });
      playSfx('tone', 340, 'sine', 0.08);
    }

    function useNeedle() {
      if (player.trapped && needles > 0) {
        player.trapped = false;
        needles--;
        player.invuln = 60;
        popupMgr.add('Thoát bọc nước', player.x, player.y, '#38BDF8', 18);
        particleSys.spawn(player.x + 16, player.y + 16, 25, { colors: ['#38BDF8', '#BAE6FD', '#FFF'], speed: 4 });
        playSfx('pop');
        updateHUD();
      }
    }

    function explodeBalloon(b) {
      cameraShake.addTrauma(0.4);
      playSfx('explosion');
      const blastId = ++blastSerial;
      waterWaves.push({ c: b.c, r: b.r, life: 25, blastId });

      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      dirs.forEach(([dc, dr]) => {
        for (let i = 1; i <= b.range; i++) {
          const tc = b.c + dc * i;
          const tr = b.r + dr * i;
          if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) break;
          if (map[tr][tc] === 1) break;
          if (map[tr][tc] === 2) {
            map[tr][tc] = 0;
            particleSys.spawn(tc * TILE + 16, tr * TILE + 16, 12, { colors: ['#B45309', '#FBBF24'], speed: 3 });
            if (Math.random() < 0.6) {
              const types = ['shoe', 'range', 'bomb', 'needle', 'turtle', 'owl'];
              items.push({ c: tc, r: tr, type: types[Math.floor(Math.random() * types.length)] });
            }
            waterWaves.push({ c: tc, r: tr, life: 25, blastId });
            break;
          }
          waterWaves.push({ c: tc, r: tr, life: 25, blastId });
          balloons.forEach(ob => {
            if (ob.c === tc && ob.r === tr && ob.timer > 5) ob.timer = 5;
          });
        }
      });
    }

    function canMove(nx, ny, isOwl = false) {
      // Hitbox follows the character silhouette, not the entire 32px tile.
      // Full-tile corners intersect nearby pillars at the starting position.
      const padding = 7;
      const corners = [
        [nx + padding, ny + padding],
        [nx + TILE - padding, ny + padding],
        [nx + padding, ny + TILE - padding],
        [nx + TILE - padding, ny + TILE - padding]
      ];
      return corners.every(([cx, cy]) => {
        const c = Math.floor(cx / TILE);
        const r = Math.floor(cy / TILE);
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
        if (map[r][c] === 1) return false;
        if (map[r][c] === 2 && !isOwl) return false; // Owl can fly over crates
        return true;
      });
    }

    function updateHUD() {
      const values = {
        bnbStage: ['1 · Thị trấn', '2 · Làng băng', '3 · Cảng biển'][currentStage - 1] || 'Màn đặc biệt',
        bnbLives: String(Math.max(0, lives)),
        bnbMount: ({ none: 'Đi bộ', turtle: 'Mai rùa', owl: 'Cánh cú' })[mount] || 'Đi bộ',
        bnbNeedles: String(needles),
        bnbBombs: String(maxBombs),
        bnbRange: String(bombRange),
        bnbScore: String(score),
        bnbBest: String(Math.max(bestScore, score))
      };
      Object.entries(values).forEach(([id,value]) => {
        const el = container.querySelector('#' + id);
        if (el && el.textContent !== value) el.textContent = value;
      });
    }

    function stepSimulation() {
      if (phase !== 'playing') return;
      // 1. Controls with Corner-Sliding
      if (!player.trapped) {
        let dx = 0, dy = 0;
        const curSpeed = mount === 'turtle' ? speed * 0.75 : speed;
        if (keys['ArrowLeft']) dx -= curSpeed;
        if (keys['ArrowRight']) dx += curSpeed;
        if (keys['ArrowUp']) dy -= curSpeed;
        if (keys['ArrowDown']) dy += curSpeed;
        if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

        // Ice map sliding friction
        if (currentStage === 2) {
          player.vx = player.vx * 0.8 + dx * 0.2;
          player.vy = player.vy * 0.8 + dy * 0.2;
        } else {
          player.vx = dx;
          player.vy = dy;
        }

        const isOwl = mount === 'owl';
        if (player.vx !== 0 && canMove(player.x + player.vx, player.y, isOwl)) player.x += player.vx;
        if (player.vy !== 0 && canMove(player.x, player.y + player.vy, isOwl)) player.y += player.vy;

        // Bomb and needle actions fire on key/pointer down, not a later frame.
      } else {
        player.trapTimer++;
        if (player.trapTimer > 300) {
          player.trapped = false;
          if (mount !== 'none') {
            popupMgr.add('Mất thú cưỡi', player.x, player.y, '#F59E0B', 20);
            mount = 'none';
          } else {
            lives--;
            cameraShake.addTrauma(0.8);
            Juice.triggerHitstop(60);
            playSfx('explosion');
            popupMgr.add('Mất một mạng', player.x, player.y, '#EF4444', 20);
            player.x = 1 * TILE + 4;
            player.y = 1 * TILE + 4;
            player.invuln = 120;
            if (lives <= 0) showEnd(false);
          }
          player.trapTimer = 0;
          updateHUD();
        }
        // Needle is handled immediately by its action input.
      }

      if (player.invuln > 0) player.invuln--;

      // 2. Bots AI
      bots.forEach(b => {
        if (!b.alive) return;
        if (b.trapped) {
          b.trapTimer++;
          if (b.trapTimer > 240) {
            b.alive = false;
            score += 500;
            cameraShake.addTrauma(0.5);
            popupMgr.add('+500 BOT K.O!', b.x, b.y, '#10B981', 20);
            updateHUD();
          }
          // Player kick trapped bot
          const dist = Math.hypot(player.x - b.x, player.y - b.y);
          if (dist < 26 && !player.trapped) {
            b.alive = false;
            score += 600;
            cameraShake.addTrauma(0.6);
            Juice.triggerHitstop(50);
            playSfx('hit');
            popupMgr.add('+600', b.x, b.y, '#FBBF24', 20);
            updateHUD();
          }
          return;
        }

        b.moveCounter++;
        if (b.moveCounter > 35 || Math.random() < 0.03) {
          b.dir = Math.floor(Math.random() * 4);
          b.moveCounter = 0;
          if (Math.random() < 0.3) dropBalloon(b);
        }
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const [bdx, bdy] = dirs[b.dir];
        const nx = b.x + bdx * b.speed;
        const ny = b.y + bdy * b.speed;
        if (canMove(nx, ny, false)) {
          b.x = nx;
          b.y = ny;
        } else {
          b.dir = Math.floor(Math.random() * 4);
        }
      });

      // 3. Pirate Boss AI (Stage 3)
      if (pirateBoss && pirateBoss.alive) {
        pirateBoss.x += pirateBoss.dir * 2;
        if (pirateBoss.x < 2 * TILE || pirateBoss.x > (COLS - 3) * TILE) pirateBoss.dir *= -1;

        pirateBoss.shootTimer++;
        if (pirateBoss.shootTimer > 120) {
          pirateBoss.shootTimer = 0;
          // Boss drops giant cannon water bomb
          balloons.push({
            c: Math.floor(pirateBoss.x / TILE),
            r: Math.floor(pirateBoss.y / TILE) + 1,
            range: 4,
            timer: 140,
            owner: pirateBoss,
            pulse: 0
          });
          playSfx('alarm');
          popupMgr.add('Đạn pháo!', pirateBoss.x, pirateBoss.y, '#EF4444', 18);
        }
      }

      // 4. Balloons tick
      for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.timer--;
        b.pulse = Math.sin(b.timer * 0.2) * 3;
        if (b.timer <= 0) {
          explodeBalloon(b);
          balloons.splice(i, 1);
        }
      }

      // 5. Water waves hit tests
      for (let i = waterWaves.length - 1; i >= 0; i--) {
        const w = waterWaves[i];
        w.life--;
        const wx = w.c * TILE + 16;
        const wy = w.r * TILE + 16;

        if (!player.trapped && player.invuln <= 0) {
          if (Math.hypot(player.x + 16 - wx, player.y + 16 - wy) < 22) {
            player.trapped = true;
            player.trapTimer = 0;
            cameraShake.addTrauma(0.6);
            playSfx('pop');
            popupMgr.add('Bị giữ lại!', player.x, player.y, '#38BDF8', 20);
          }
        }

        bots.forEach(b => {
          if (b.alive && !b.trapped) {
            if (Math.hypot(b.x + 16 - wx, b.y + 16 - wy) < 22) {
              b.trapped = true;
              b.trapTimer = 0;
              playSfx('pop');
            }
          }
        });

        // Boss damage from wave
        if (pirateBoss && pirateBoss.alive) {
          // A single blast can cover several tiles over many frames.
          // Only the first contact with that blast damages the boss.
          if (!bossHitBlasts.has(w.blastId) && Math.hypot(pirateBoss.x + 24 - wx, pirateBoss.y + 24 - wy) < 32) {
            bossHitBlasts.add(w.blastId);
            pirateBoss.hp = Math.max(0, pirateBoss.hp - 1);
            cameraShake.addTrauma(0.7);
            Juice.triggerHitstop(60);
            playSfx('hit');
            popupMgr.add(`TRÙM TRÚNG NƯỚC! (${pirateBoss.hp}/${pirateBoss.maxHp})`, pirateBoss.x, pirateBoss.y, '#FBBF24', 20);
            if (pirateBoss.hp <= 0) {
              pirateBoss.alive = false;
              score += 5000;
              playSfx('win');
              popupMgr.add('Hạ thuyền trưởng', W / 2, H / 2, '#FBBF24', 28);
            }
          }
        }

        if (w.life <= 0) waterWaves.splice(i, 1);
      }

      // 6. Items pickup
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const ix = it.c * TILE + 16;
        const iy = it.r * TILE + 16;
        if (Math.hypot(player.x + 16 - ix, player.y + 16 - iy) < 20) {
          playSfx('coin');
          if (it.type === 'shoe') {
            speed = Math.min(6, speed + 0.6);
            popupMgr.add('Nhanh hơn', player.x, player.y, '#F59E0B', 18);
          } else if (it.type === 'range') {
            bombRange = Math.min(5, bombRange + 1);
            popupMgr.add('Tầm xa hơn', player.x, player.y, '#06B6D4', 18);
          } else if (it.type === 'bomb') {
            maxBombs = Math.min(6, maxBombs + 1);
            popupMgr.add('Thêm bóng', player.x, player.y, '#EF4444', 18);
          } else if (it.type === 'needle') {
            needles++;
            popupMgr.add('Thêm kim', player.x, player.y, '#10B981', 18);
          } else if (it.type === 'turtle') {
            mount = 'turtle';
            popupMgr.add('Mai rùa', player.x, player.y, '#10B981', 20);
          } else if (it.type === 'owl') {
            mount = 'owl';
            popupMgr.add('Cánh cú', player.x, player.y, '#8B5CF6', 20);
          }
          score += 150;
          particleSys.spawn(ix, iy, 15, { colors: ['#FBBF24', '#FFF'], speed: 4 });
          items.splice(i, 1);
          updateHUD();
        }
      }

      // 7. Check Stage Completion / Next Stage
      const stageWon = bots.every(b => !b.alive) && (!pirateBoss || !pirateBoss.alive);
      if (stageWon && phase === 'playing') {
        if (currentStage < 3) {
          currentStage++;
          score += 1500;
          popupMgr.add('Màn ' + currentStage, W / 2, H / 2, '#FBBF24', 24);
          playSfx('win');
          buildMap(currentStage);
        } else {
          showEnd(true);
        }
      }
      if (stageBanner > 0) stageBanner--;
      persistBest();

    }


    // Shared, purpose-drawn canvas silhouettes. Gameplay never needs emoji glyphs.
    const themes = [
      { floor:'#d5e3ce', alternate:'#c7d8bf', solid:'#586d63', edge:'#84978b',
        crate:'#b68c63', crateLight:'#dcc09a', wave:'#4da6c1', ink:'#344f45' },
      { floor:'#dcebe8', alternate:'#c9dfdb', solid:'#67858a', edge:'#a8c1be',
        crate:'#92b8b8', crateLight:'#e7f3eb', wave:'#46a7ca', ink:'#395d65' },
      { floor:'#496d75', alternate:'#537980', solid:'#324852', edge:'#70868a',
        crate:'#a0795b', crateLight:'#d6ad81', wave:'#76cee0', ink:'#263f4b' }
    ];
    function rounded(x,y,w,h,r,fill) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x,y,w,h,r);
      else ctx.rect(x,y,w,h);
      ctx.fill();
    }
    function actor(x,y,tint,hat,trapped=false) {
      ctx.save(); ctx.translate(x+16,y+16);
      // Feet animate only while moving; all parts are geometric canvas art.
      const gait=Math.sin((lastFrame || 0) / 110) * 2;
      rounded(-11,10+gait,8,6,3,'#3a524f');
      rounded(3,10-gait,8,6,3,'#3a524f');
      rounded(-12,-5,24,21,9,tint);
      rounded(-12,-11,24,15,8,'#f5d6b8');
      rounded(-12,-13,24,7,5,hat);
      ctx.fillStyle='#354e51';
      ctx.beginPath(); ctx.arc(-5,-3,1.8,0,Math.PI*2);
      ctx.arc(5,-3,1.8,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#9e7770';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(0,0,3,0,Math.PI);ctx.stroke();
      if(trapped) {
        ctx.fillStyle='rgba(121,219,238,.35)';
        ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#b9f7ff';ctx.lineWidth=2.5;ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.8)';
        ctx.beginPath();ctx.ellipse(-8,-11,3,5,-.4,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    function itemIllustration(it) {
      const x=it.c*TILE+TILE/2,y=it.r*TILE+TILE/2;
      ctx.save();ctx.translate(x,y);
      rounded(-12,-12,24,24,7,'#f9f4dd');
      ctx.strokeStyle='#708e7c';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.fillStyle='#569f97';
      if(it.type==='range'){
        ctx.beginPath();ctx.moveTo(0,-8);ctx.bezierCurveTo(8,-1,9,3,0,9);
        ctx.bezierCurveTo(-9,3,-8,-1,0,-8);ctx.fill();
      }else if(it.type==='bomb'){
        ctx.beginPath();ctx.arc(0,1,7,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,-10);ctx.stroke();
      }else if(it.type==='needle'){
        ctx.beginPath();ctx.moveTo(-8,8);ctx.lineTo(6,-6);ctx.stroke();
        ctx.beginPath();ctx.moveTo(4,-8);ctx.lineTo(9,-3);ctx.stroke();
      }else if(it.type==='shoe'){
        ctx.beginPath();ctx.moveTo(-9,2);ctx.lineTo(-1,2);ctx.lineTo(5,-6);
        ctx.lineTo(8,2);ctx.lineTo(9,8);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();
      }else if(it.type==='turtle'){
        ctx.beginPath();ctx.ellipse(0,1,9,7,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#d6e5b7';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,8);
        ctx.moveTo(-7,0);ctx.lineTo(7,0);ctx.stroke();
      }else{
        ctx.beginPath();ctx.moveTo(-9,-5);ctx.quadraticCurveTo(-4,-9,0,-3);
        ctx.quadraticCurveTo(4,-9,9,-5);ctx.lineTo(7,7);
        ctx.quadraticCurveTo(0,12,-7,7);ctx.closePath();ctx.fill();
        ctx.fillStyle='#f9f4dd';ctx.beginPath();ctx.arc(-3,1,2,0,Math.PI*2);
        ctx.arc(3,1,2,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    function drawScene() {
      const theme = themes[currentStage - 1] || themes[0];
      const offset = cameraShake.getOffset(10);
      ctx.save();
      ctx.translate(offset.x,offset.y);
      ctx.fillStyle=theme.floor;ctx.fillRect(0,0,W,H);
      for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
          const x=c*TILE,y=r*TILE,type=map[r][c];
          if((r+c)%2===0){ctx.fillStyle=theme.alternate;ctx.fillRect(x,y,TILE,TILE);}
          if(type===1) {
            rounded(x+1,y+1,TILE-2,TILE-2,5,theme.solid);
            rounded(x+4,y+4,TILE-8,5,2,theme.edge);
            ctx.fillStyle='rgba(21,48,48,.24)';ctx.fillRect(x+6,y+13,TILE-12,2);
          }else if(type===2){
            rounded(x+2,y+2,TILE-4,TILE-4,6,theme.crate);
            rounded(x+5,y+5,TILE-10,TILE-10,3,theme.crateLight);
            ctx.strokeStyle=theme.crate;ctx.lineWidth=2;ctx.strokeRect(x+8,y+8,TILE-16,TILE-16);
            ctx.beginPath();ctx.moveTo(x+8,y+8);ctx.lineTo(x+24,y+24);ctx.stroke();
          }
        }
      }
      for(const it of items)itemIllustration(it);
      for(const w of waterWaves){
        const x=w.c*TILE+TILE/2,y=w.r*TILE+TILE/2;
        ctx.fillStyle='rgba(100,208,228,'+(.38+.25*w.life/25)+')';
        rounded(x-15,y-15,30,30,7,ctx.fillStyle);
        ctx.strokeStyle='rgba(234,252,255,'+(w.life/25)+')';
        ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,12-(25-w.life)*.16,0,Math.PI*2);ctx.stroke();
      }
      for(const balloon of balloons) {
        const x=balloon.c*TILE+16,y=balloon.r*TILE+16;
        const radius=12+balloon.pulse*.28;
        ctx.fillStyle='#56bbcd';ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#e5fbfb';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.72)';ctx.beginPath();ctx.ellipse(x-4,y-5,3,5,-.7,0,Math.PI*2);ctx.fill();
        // Fuse empties clockwise; players can read explosion timing without text.
        ctx.strokeStyle=balloon.timer<43?'#e3865a':'#3b747b';
        ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,radius+3,-Math.PI/2,-Math.PI/2+Math.PI*2*balloon.timer/160);ctx.stroke();
      }
      if(pirateBoss&&pirateBoss.alive){
        const x=pirateBoss.x+pirateBoss.w/2,y=pirateBoss.y+pirateBoss.h/2;
        ctx.save();ctx.translate(x,y);
        ctx.fillStyle='#773f41';ctx.beginPath();ctx.ellipse(0,9,18,18,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#f3c89e';ctx.beginPath();ctx.arc(0,-4,14,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#2a3f47';ctx.beginPath();ctx.moveTo(-22,-12);
        ctx.lineTo(0,-27);ctx.lineTo(22,-12);ctx.lineTo(14,-8);ctx.lineTo(-15,-8);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#f4d7a9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,-12);ctx.lineTo(17,-12);ctx.stroke();
        ctx.fillStyle='#364348';ctx.beginPath();ctx.arc(-5,-4,2,0,Math.PI*2);ctx.arc(5,-4,2,0,Math.PI*2);ctx.fill();
        ctx.restore();
        rounded(x-20,y-37,40,6,3,'#233f43');
        rounded(x-19,y-36,38*pirateBoss.hp/pirateBoss.maxHp,4,2,'#cde3a4');
      }
      for(const bot of bots){
        if(!bot.alive)continue;
        actor(bot.x,bot.y,bot.trapped?'#b4cbd3':'#c96d64','#704d57',bot.trapped);
      }
      if(player.invuln<=0||Math.floor(player.invuln/6)%2===0){
        if(mount!=='none'){
          ctx.fillStyle=mount==='turtle'?'rgba(100,159,101,.72)':'rgba(163,133,192,.72)';
          ctx.beginPath();ctx.arc(player.x+16,player.y+19,19,0,Math.PI*2);ctx.fill();
        }
        actor(player.x,player.y,'#5688a6','#2f5e8b',player.trapped);
      }
      // Short visual chapter card only after entry; no bouncing textual HUD in play.
      if(stageBanner>0&&phase==='playing'){
        const opacity=Math.min(.9,stageBanner/25);
        ctx.globalAlpha=opacity;
        rounded(W/2-76,H/2-28,152,56,14,'#284b4a');
        ctx.fillStyle='#f8f5df';ctx.textAlign='center';
        ctx.font='bold 23px Calibri, sans-serif';ctx.fillText('Màn '+currentStage,W/2,H/2+7);
        ctx.globalAlpha=1;
      }
      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      ctx.restore();
    }

    let animId = null;
    function loop(timestamp) {
      if (!lastFrame) lastFrame = timestamp || 0;
      accumulator += Math.min(50, Math.max(0, (timestamp || 0) - lastFrame));
      lastFrame = timestamp || 0;
      let ticks = 0;
      while (accumulator >= STEP_MS && ticks < 3) {
        stepSimulation();
        accumulator -= STEP_MS;
        ticks++;
      }
      drawScene();
      animId = requestAnimationFrame(loop);
    }

    updateHUD();
    animId = requestAnimationFrame(loop);
    onCleanup(() => { cancelAnimationFrame(animId); });
  }

  // =========================================================================
  // 2. AUDITION ONLINE (4 PHÍM SPACE RHYTHM DANCE) - 4 BÀI HÁT, CHANCE ĐỎ
  // =========================================================================
  function launchAudition(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    const W = 640;
    const H = 420;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">🎵 ${game.title || 'Audition 4 Phím Space'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Bài Hát: <span id="auSong" style="color: #38BDF8; font-weight: bold;">Please Tell Me Why (100 BPM)</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Cấp Độ: <span id="auLevel" style="color: #EC4899; font-weight: bold;">LV 1</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Combo: <span id="auCombo" style="color: #F59E0B; font-weight: bold;">0</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Điểm: <span id="auScore" style="color: #10B981; font-weight: bold;">0</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="auCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #0F172A;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 8px;">
            <button class="btn-canvas-action" id="auLeft" style="font-size: 16px;">◀ Trái</button>
            <button class="btn-canvas-action" id="auDown" style="font-size: 16px;">▼ Xuống</button>
            <button class="btn-canvas-action" id="auUp" style="font-size: 16px;">▲ Lên</button>
            <button class="btn-canvas-action" id="auRight" style="font-size: 16px;">Phải ▶</button>
          </div>
          <button class="btn-canvas-action" id="auSpace" style="background: linear-gradient(135deg, #EC4899, #8B5CF6); color: #FFF; font-weight: 900; font-size: 16px; padding: 10px 24px;">
            💥 SPACE (PERFECT BEAT)
          </button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#auCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    const TRACKS = [
      { name: 'Please Tell Me Why', bpm: 100, hasChance: false },
      { name: 'Aloha (Cool Song)', bpm: 120, hasChance: false },
      { name: 'Sweet Dream (Dance)', bpm: 140, hasChance: true },
      { name: 'Hands Up (Crazy Mode)', bpm: 160, hasChance: true }
    ];

    let trackIdx = 0;
    let BPM = TRACKS[trackIdx].bpm;
    let BEAT_DURATION = 60 / BPM;
    const BAR_BEATS = 4;
    let BAR_DURATION = BEAT_DURATION * BAR_BEATS;

    let level = 1; // 1 to 9 (Lv 9 is Finish Move!)
    let score = 0;
    let combo = 0;
    let sequence = [];
    let currentInputIdx = 0;
    let measureStart = performance.now() / 1000;
    let lastMeasure = 0;
    let measureResolved = false;

    const ARROWS = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
    const ARROW_SYMBOLS = { ArrowLeft: '◀', ArrowDown: '▼', ArrowUp: '▲', ArrowRight: '▶' };
    const OPPOSITES = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft', ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp' };

    function generateSequence(lvl) {
      const len = Math.min(9, 2 + lvl);
      const isFinish = lvl >= 9;
      const seq = [];
      const allowChance = TRACKS[trackIdx].hasChance && lvl >= 5;

      for (let i = 0; i < len; i++) {
        const isRedChance = allowChance && Math.random() < 0.35;
        seq.push({
          key: ARROWS[Math.floor(Math.random() * ARROWS.length)],
          isRed: isRedChance, // Phím đỏ: bấm ngược hướng!
          hit: false
        });
      }
      return seq;
    }

    sequence = generateSequence(level);

    function updateHUD() {
      const sTrack = container.querySelector('#auSong');
      if (sTrack) sTrack.textContent = `${TRACKS[trackIdx].name} (${BPM} BPM)`;
      const lEl = container.querySelector('#auLevel');
      if (lEl) lEl.textContent = level >= 9 ? '🔥 FINISH MOVE' : `LV ${level}`;
      const cEl = container.querySelector('#auCombo');
      if (cEl) cEl.textContent = combo;
      const sEl = container.querySelector('#auScore');
      if (sEl) sEl.textContent = score;
    }

    function handleArrow(dirKey) {
      if (measureResolved || currentInputIdx >= sequence.length) return;
      const expected = sequence[currentInputIdx];
      const correctKey = expected.isRed ? OPPOSITES[expected.key] : expected.key;

      if (dirKey === correctKey) {
        expected.hit = true;
        currentInputIdx++;
        playSfx('tone', 480 + currentInputIdx * 45, 'triangle', 0.08);
      } else {
        combo = 0;
        playSfx('tone', 180, 'sawtooth', 0.12);
        popupMgr.add('SAI NỐT!', W / 2, 280, '#EF4444', 18);
        updateHUD();
      }
    }

    function handleSpace() {
      if (measureResolved) return;
      const now = performance.now() / 1000;
      const elapsed = (now - measureStart) % BAR_DURATION;
      const progress = elapsed / BAR_DURATION;

      const targetProgress = 0.88;
      const diff = Math.abs(progress - targetProgress);
      const allArrowsDone = currentInputIdx >= sequence.length;

      if (!allArrowsDone) {
        popupMgr.add('CHƯA XONG NỐT! ❌', W / 2, 280, '#EF4444', 20);
        combo = 0;
        playSfx('tone', 150, 'square', 0.15);
        updateHUD();
        return;
      }
      measureResolved = true;

      if (diff < 0.045) {
        // PERFECT!
        combo++;
        const pts = 600 * level * (1 + combo * 0.25);
        score += Math.round(pts);
        cameraShake.addTrauma(level >= 9 ? 1.0 : 0.8);
        Juice.triggerHitstop(50);
        playSfx('win');

        if (level >= 9) {
          popupMgr.add('CRAZY FINISH MOVE! 🌟👑', W / 2, 210, '#EC4899', 28);
          particleSys.spawn(W / 2, 320, 45, { colors: ['#EC4899', '#8B5CF6', '#FBBF24', '#FFF'], speed: 8 });
          // Song Progression
          if (trackIdx < TRACKS.length - 1) {
            trackIdx++;
            BPM = TRACKS[trackIdx].bpm;
            BEAT_DURATION = 60 / BPM;
            BAR_DURATION = BEAT_DURATION * BAR_BEATS;
            measureStart = now; lastMeasure = 0;
            popupMgr.add(`MỞ KHÓA BÀI MỚI: ${TRACKS[trackIdx].name}! 🎧`, W / 2, 170, '#38BDF8', 22);
          }
          level = 1;
        } else {
          popupMgr.add(`PERFECT x${combo}! 🌟`, W / 2, 220, '#FBBF24', 26);
          particleSys.spawn(W / 2, 320, 25, { colors: ['#EC4899', '#FBBF24', '#FFF'], speed: 6 });
          level++;
        }

        sequence = generateSequence(level);
        currentInputIdx = 0;
      } else if (diff < 0.09) {
        // GREAT
        combo++;
        score += 300 * level;
        cameraShake.addTrauma(0.4);
        playSfx('coin');
        popupMgr.add('GREAT! 👍', W / 2, 220, '#10B981', 22);
        level = Math.min(9, level + 1);
        sequence = generateSequence(level);
        currentInputIdx = 0;
      } else {
        // MISS
        combo = 0;
        playSfx('tone', 120, 'sawtooth', 0.2);
        popupMgr.add('MISS! 💨', W / 2, 220, '#94A3B8', 22);
        sequence = generateSequence(level);
        currentInputIdx = 0;
      }
      updateHUD();
    }

    const onKey = e => {
      if (isTyping(e) || e.repeat) return;
      if (ARROWS.includes(e.code) || ARROWS.includes(e.key)) {
        e.preventDefault();
        handleArrow(e.code || e.key);
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleSpace();
      }
    };
    listen(window, 'keydown', onKey);

    const bindBtn = (id, fn) => {
      const el = container.querySelector(id);
      if (el) el.addEventListener('click', fn);
    };
    bindBtn('#auLeft', () => handleArrow('ArrowLeft'));
    bindBtn('#auDown', () => handleArrow('ArrowDown'));
    bindBtn('#auUp', () => handleArrow('ArrowUp'));
    bindBtn('#auRight', () => handleArrow('ArrowRight'));
    bindBtn('#auSpace', handleSpace);

    let animId = null;
    function loop() {
      const now = performance.now() / 1000;
      const elapsed = (now - measureStart) % BAR_DURATION;
      const progress = elapsed / BAR_DURATION;

      const measure = Math.floor((now - measureStart) / BAR_DURATION);
      if (measure !== lastMeasure) {
        if (!measureResolved && currentInputIdx > 0) { combo = 0; updateHUD(); }
        lastMeasure = measure; measureResolved = false;
        currentInputIdx = 0;
        sequence = generateSequence(level);
      }

      const offset = cameraShake.getOffset(10);
      ctx.save();
      ctx.translate(offset.x, offset.y);

      // Disco LED Stage
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1E1B4B');
      grad.addColorStop(0.6, '#0F172A');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Dynamic Beat Flash
      const beatProgress = (now % BEAT_DURATION) / BEAT_DURATION;
      if (beatProgress < 0.15) {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
        ctx.fillRect(0, 0, W, H);
      }

      // Dancing Chibi Avatar
      const bobY = Math.sin(now * (Math.PI * 2 / BEAT_DURATION)) * 8;
      const dx = W / 2;
      const dy = 160 + bobY;

      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.arc(dx, dy - 30, 22, 0, Math.PI * 2);
      ctx.fill();
      // Headphones
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(dx - 26, dy - 36, 6, 14);
      ctx.fillRect(dx + 20, dy - 36, 6, 14);
      // Jacket
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(dx - 16, dy - 8, 32, 28);
      // Pants
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(dx - 14, dy + 20, 10, 24);
      ctx.fillRect(dx + 4, dy + 20, 10, 24);

      // ARROW BOXES
      const boxW = 44;
      const gap = 10;
      const totalW = sequence.length * (boxW + gap) - gap;
      const startX = (W - totalW) / 2;
      const boxY = 270;

      sequence.forEach((item, i) => {
        const bx = startX + i * (boxW + gap);
        ctx.fillStyle = item.hit ? '#10B981' : item.isRed ? '#DC2626' : '#1E293B';
        ctx.strokeStyle = item.hit ? '#34D399' : item.isRed ? '#F87171' : '#475569';
        ctx.lineWidth = 2;
        ctx.fillRect(bx, boxY, boxW, boxW);
        ctx.strokeRect(bx, boxY, boxW, boxW);

        ctx.font = '900 22px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = item.hit ? '#FFF' : item.isRed ? '#FEF08A' : '#94A3B8';
        ctx.fillText(ARROW_SYMBOLS[item.key] || '•', bx + boxW / 2, boxY + boxW / 2);
      });

      // BEAT BAR
      const trackX = 60;
      const trackY = 340;
      const trackW = W - 120;
      const trackH = 14;

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(trackX, trackY, trackW, trackH);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(trackX, trackY, trackW, trackH);

      const perfX = trackX + trackW * 0.88;
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(perfX - 16, trackY - 4, 32, trackH + 8);
      ctx.strokeStyle = '#FFF';
      ctx.strokeRect(perfX - 16, trackY - 4, 32, trackH + 8);

      // Moving Orb
      const orbX = trackX + trackW * progress;
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(orbX, trackY + trackH / 2, 10, 0, Math.PI * 2);
      ctx.fill();

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      ctx.restore();

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 3. ROAD RASH - 3 CHẶNG ĐUA, VŨ KHÍ, CẢNH SÁT, NITRO BOOST
  // =========================================================================
  function launchRoadRash(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    let phase = 'playing';
    const W = 640;
    const H = 400;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">🏍️ ${game.title || 'Road Rash'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Chặng: <span id="rrStage" style="color: #38BDF8; font-weight: bold;">1/3 Bờ Biển</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Xe: <span id="rrBike" style="color: #F59E0B; font-weight: bold;">Shuriken 400cc</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Vũ Khí: <span id="rrWeapon" style="color: #EC4899; font-weight: bold;">Tay Không</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Nitro: <span id="rrNitro" style="color: #06B6D4; font-weight: bold;">100%</span> | Máu: <span id="rrHp" style="color: #EF4444; font-weight: bold;">100%</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="rrCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #000;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 8px;">
            <button class="btn-canvas-action" id="rrLeft">◀ Lách Trái</button>
            <button class="btn-canvas-action" id="rrRight">Lách Phải ▶</button>
            <button class="btn-canvas-action" id="rrGas" style="background-color: #10B981; color: #FFF;">▲ Ga (UP)</button>
            <button class="btn-canvas-action" id="rrNitroBtn" style="background-color: #06B6D4; color: #FFF; font-weight: bold;">🚀 NITRO (SHIFT)</button>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-canvas-action" id="rrPunch" style="background-color: #EA580C; color: #FFF; font-weight: bold;">🥊 ĐẤM/VŨ KHÍ (SPACE)</button>
            <button class="btn-canvas-action" id="rrKick" style="background-color: #DC2626; color: #FFF; font-weight: bold;">🦵 ĐẠP XE (J)</button>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#rrCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    let currentStage = 1; // 1: Pacific Coast, 2: Sierra Mountain, 3: City Highway
    let bike = 'Shuriken 400cc'; // 'Shuriken 400cc', 'Banshee 750cc', 'Diablo 1000cc'
    let weapon = 'Tay Không'; // 'Tay Không', 'Gậy Bóng Chày', 'Xích Sắt'
    let nitro = 100;
    let speed = 0;
    let maxSpeed = 160;
    let distance = 0;
    let goalDistance = 2000;
    let playerX = 0;
    let playerHp = 100;
    let rank = 4;
    let roadCurve = 0;

    let cop = { active: false, x: 0, z: 280, speed: 175 };

    const rivals = [
      { name: 'Biff', weapon: 'Gậy Bóng Chày', x: -0.3, z: 80, speed: 110, hp: 60, alive: true },
      { name: 'Natasha', weapon: 'Xích Sắt', x: 0.4, z: 160, speed: 125, hp: 70, alive: true },
      { name: 'Axel', weapon: 'Tay Không', x: 0.1, z: 260, speed: 135, hp: 80, alive: true }
    ];

    const keys = {};
    bindKeys(listen, keys);

    const bindBtn = (id, k) => {
      const el = container.querySelector(id);
      bindHoldControl(listen, el, () => { keys[k] = true; }, () => { keys[k] = false; });
    };
    bindBtn('#rrLeft', 'ArrowLeft');
    bindBtn('#rrRight', 'ArrowRight');
    bindBtn('#rrGas', 'ArrowUp');
    bindBtn('#rrNitroBtn', 'ShiftLeft');
    bindBtn('#rrPunch', 'Space');
    bindBtn('#rrKick', 'KeyJ');

    function attack(isKick = false) {
      if (phase !== 'playing') return;
      playSfx('whoosh');
      rivals.forEach(r => {
        if (!r.alive) return;
        if (Math.abs(r.z) < 18 && Math.abs(r.x - playerX) < 0.45) {
          const dmg = weapon === 'Xích Sắt' ? 45 : weapon === 'Gậy Bóng Chày' ? 35 : isKick ? 30 : 20;
          r.hp -= dmg;
          cameraShake.addTrauma(0.6);
          Juice.triggerHitstop(40);
          playSfx('hit');
          popupMgr.add(`ĐÒN ĐÁNH ${weapon}! 💥`, W / 2, H - 120, '#F59E0B', 20);

          if (r.hp <= 0) {
            r.alive = false;
            rank = Math.max(1, rank - 1);
            if (weapon === 'Tay Không' && r.weapon !== 'Tay Không') {
              weapon = r.weapon;
              popupMgr.add(`CƯỚP ĐƯỢC ${weapon}! 🗡️`, W / 2, H - 160, '#38BDF8', 24);
            }
            playSfx('explosion');
          }
        }
      });
      updateHUD();
    }

    function updateHUD() {
      const stEl = container.querySelector('#rrStage');
      if (stEl) {
        const names = ['1/3 Bờ Biển', '2/3 Đèo Rừng', '3/3 Thành Phố'];
        stEl.textContent = names[currentStage - 1] || 'Vô Cực';
      }
      const bEl = container.querySelector('#rrBike');
      if (bEl) bEl.textContent = bike;
      const wEl = container.querySelector('#rrWeapon');
      if (wEl) wEl.textContent = weapon;
      const nEl = container.querySelector('#rrNitro');
      if (nEl) nEl.textContent = `${Math.round(nitro)}%`;
      const hpEl = container.querySelector('#rrHp');
      if (hpEl) hpEl.textContent = `${playerHp}%`;
    }

    let punchDebounce = false;
    let animId = null;
    const ticksForFrame = fixedTicks(performance);

    function loop() {
      const ticks = ticksForFrame();
      for (let tick = 0; tick < ticks && phase === 'playing'; tick++) {
      // 1. Driving & Nitro
      const isBoosting = (keys['ShiftLeft'] || keys['ShiftRight']) && nitro > 0;
      if (isBoosting) {
        nitro = Math.max(0, nitro - 0.5);
        maxSpeed = 220;
        speed = Math.min(maxSpeed, speed + 2.5);
        cameraShake.addTrauma(0.2);
        particleSys.spawn(W / 2 + playerX * 180, H - 20, 4, { colors: ['#06B6D4', '#38BDF8', '#FFF'], speed: 5 });
      } else {
        maxSpeed = bike === 'Diablo 1000cc' ? 190 : bike === 'Banshee 750cc' ? 175 : 160;
        if (keys['ArrowUp'] || keys['KeyW']) {
          speed = Math.min(maxSpeed, speed + 1.2);
        } else {
          speed = Math.max(0, speed - 0.5);
        }
        nitro = Math.min(100, nitro + 0.1);
      }

      if (keys['ArrowLeft'] || keys['KeyA']) playerX = Math.max(-0.85, playerX - 0.025);
      if (keys['ArrowRight'] || keys['KeyD']) playerX = Math.min(0.85, playerX + 0.025);

      if (keys['Space'] && !punchDebounce) {
        punchDebounce = true;
        attack(false);
        setTimeout(() => { punchDebounce = false; }, 300);
      }
      if (keys['KeyJ'] && !punchDebounce) {
        punchDebounce = true;
        attack(true);
        setTimeout(() => { punchDebounce = false; }, 400);
      }

      distance += speed * 0.1;
      roadCurve = Math.sin(distance * 0.005) * 0.8;

      // 2. Police O'Leary Spawn
      if (distance > 600 && !cop.active) {
        cop.active = true;
        playSfx('alarm');
        popupMgr.add('CẢNH SÁT O\'LEARY RƯỢT ĐUỔI! 🚨', W / 2, 80, '#EF4444', 22);
      }
      if (cop.active) {
        cop.z += (cop.speed - speed) * 0.1;
        if (cop.z < 10 && speed < 90) {
          playerHp = Math.max(0, playerHp - 25);
          cameraShake.addTrauma(0.7);
          Juice.triggerHitstop(60);
          playSfx('crunch');
          popupMgr.add('BỊ CẢNH SÁT BẮT PHẠT! 🚔', W / 2, H - 100, '#EF4444', 22);
          cop.z = 200;
        }
      }

      // Rivals movement
      rivals.forEach(r => {
        if (!r.alive) return;
        r.z += (r.speed - speed) * 0.1;
        if (r.z < -40) r.z = 250;
      });

      // 3. Stage Progression / Finish Line
      if (distance >= goalDistance) {
        if (currentStage < 3) {
          currentStage++;
          distance = 0;
          goalDistance += 1000;
          if (currentStage === 2) bike = 'Banshee 750cc';
          if (currentStage === 3) bike = 'Diablo 1000cc';
          popupMgr.add(`CÁN ĐÍCH! NÂNG CẤP LÊN ${bike}! 🏆`, W / 2, H / 2, '#FBBF24', 26);
          playSfx('win');
          rivals.forEach(r => { r.alive = true; r.hp = 80; r.speed += 20; });
        } else {
          popupMgr.add('VÔ ĐỊCH TOÀN BỘ GIẢI ĐUA ROAD RASH! 👑', W / 2, H / 2, '#FBBF24', 28);
          phase = 'won';
          playSfx('win');
        }
      }

      if (playerHp <= 0 && phase === 'playing') { phase = 'lost'; playSfx('alarm'); }

      updateHUD();

      }
      // RENDER
      const offset = cameraShake.getOffset(12);
      ctx.save();
      ctx.translate(offset.x, offset.y);

      // Sky & Horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
      if (currentStage === 2) {
        skyGrad.addColorStop(0, '#1E293B');
        skyGrad.addColorStop(1, '#64748B');
      } else if (currentStage === 3) {
        skyGrad.addColorStop(0, '#0F172A');
        skyGrad.addColorStop(1, '#475569');
      } else {
        skyGrad.addColorStop(0, '#7C2D12');
        skyGrad.addColorStop(1, '#FDBA74');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.45);

      // Road
      const horizonY = H * 0.52;
      for (let y = horizonY; y < H; y += 4) {
        const p = (y - horizonY) / (H - horizonY);
        const roadW = 80 + p * (W - 140);
        const curveOffset = Math.pow(1 - p, 2) * roadCurve * 140;
        const roadCenter = W / 2 + curveOffset;

        ctx.fillStyle = Math.floor(y / 16) % 2 === 0 ? '#15803D' : '#166534';
        ctx.fillRect(0, y, W, 4);

        ctx.fillStyle = Math.floor(y / 16) % 2 === 0 ? '#334155' : '#1E293B';
        ctx.fillRect(roadCenter - roadW / 2, y, roadW, 4);

        if (Math.floor((y - distance) / 24) % 2 === 0) {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(roadCenter - 2, y, 4, 4);
        }
      }

      // Police Car
      if (cop.active && cop.z > 2 && cop.z < 300) {
        const p = 1 - cop.z / 300;
        const cx = W / 2 + cop.x * 200;
        const cy = horizonY + p * (H - horizonY);
        ctx.fillStyle = '#1E3A8A';
        ctx.fillRect(cx - 20 * p, cy - 30 * p, 40 * p, 30 * p);
        ctx.fillStyle = Math.floor(distance / 5) % 2 === 0 ? '#EF4444' : '#3B82F6';
        ctx.fillRect(cx - 10 * p, cy - 36 * p, 20 * p, 8 * p);
      }

      // Player Motorcycle
      const px = W / 2 + playerX * 180;
      const py = H - 30;

      ctx.fillStyle = '#111827';
      ctx.fillRect(px - 22, py - 40, 44, 40);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(px - 18, py - 60, 36, 24);
      // Visor
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(px, py - 66, 12, 0, Math.PI * 2);
      ctx.fill();

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      ctx.restore();
      drawResult(ctx, W, H, phase, 'Chặng ' + currentStage + '/3 · Hạng ' + rank);

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 4. NGƯỜI MÁY XANH (MEGA MAN) - TRƯỢT GẦM, 3 ROBOT BOSSES, E-TANK
  // =========================================================================
  function launchMegaMan(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    let phase = 'playing';
    const W = 640;
    const H = 400;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">🤖 ${game.title || 'Mega Man'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Màn: <span id="mmStage" style="color: #38BDF8; font-weight: bold;">1/3 Cutman</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Máu: <span id="mmHp" style="color: #38BDF8; font-weight: bold;">100%</span> | E-Tank: <span id="mmEtank" style="color: #F59E0B; font-weight: bold;">1</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Vũ Khí: <span id="mmWeapon" style="color: #10B981; font-weight: bold;">Mega Buster</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Điểm: <span id="mmScore" style="color: #10B981; font-weight: bold;">0</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="mmCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #020617;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 8px;">
            <button class="btn-canvas-action" id="mmLeft">◀ Trái</button>
            <button class="btn-canvas-action" id="mmRight">Phải ▶</button>
            <button class="btn-canvas-action" id="mmJump" style="background-color: #3B82F6; color: #FFF; font-weight: bold;">▲ NHẢY (SPACE)</button>
            <button class="btn-canvas-action" id="mmSlide" style="background-color: #8B5CF6; color: #FFF; font-weight: bold;">▼ TRƯỢT GẦM (S)</button>
          </div>
          <button class="btn-canvas-action" id="mmShoot" style="background-color: #0284C7; color: #FFF; font-weight: 900; font-size: 15px; padding: 10px 24px;">
            ⚡ BUSTER / TỤ LỰC (J)
          </button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#mmCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    let currentStage = 1; // 1: Cutman, 2: Gutsman, 3: Dr. Wily
    let weapon = 'Mega Buster';
    let eTanks = 1;

    const player = {
      x: 80,
      y: 280,
      vx: 0,
      vy: 0,
      w: 28,
      h: 36,
      facing: 1,
      isGrounded: false,
      isSliding: false,
      slideTimer: 0,
      charging: false,
      chargeTime: 0,
      hp: 100,
      score: 0,
      invuln: 0
    };

    let boss = null;
    let bullets = [];
    let enemies = [];
    let platforms = [
      { x: 0, y: 340, w: W, h: 60 },
      { x: 180, y: 260, w: 120, h: 16 },
      { x: 360, y: 200, w: 140, h: 16 }
    ];

    function spawnBoss(stage) {
      if (phase !== 'playing') return;
      if (stage === 1) {
        boss = { name: 'Cutman', x: 520, y: 280, w: 36, h: 44, hp: 100, maxHp: 100, timer: 0 };
      } else if (stage === 2) {
        boss = { name: 'Gutsman', x: 500, y: 270, w: 46, h: 54, hp: 150, maxHp: 150, timer: 0 };
      } else {
        boss = { name: 'Dr. Wily Machine', x: 480, y: 240, w: 64, h: 70, hp: 220, maxHp: 220, timer: 0 };
      }
      popupMgr.add(`CẢNH BÁO BOSS: ${boss.name}! ⚠️`, W / 2, 80, '#EF4444', 24);
      playSfx('alarm');
    }

    spawnBoss(currentStage);

    const keys = {};
    bindKeys(listen, keys);

    const shootBtn = container.querySelector('#mmShoot');
    const startCharge = () => { if (phase === 'playing') player.charging = true; };
    const releaseCharge = () => {
      if (!player.charging || phase !== 'playing') return;
      player.charging = false;
      const charged = player.chargeTime >= 60;
      const mega = player.chargeTime >= 120;

      bullets.push({
        x: player.facing === 1 ? player.x + player.w + 4 : player.x - 16,
        y: player.y + 14,
        vx: player.facing * (mega ? 11 : 8),
        damage: mega ? 60 : charged ? 30 : 12,
        radius: mega ? 14 : charged ? 8 : 4,
        isMega: mega,
        isEnemy: false
      });

      if (mega) {
        cameraShake.addTrauma(0.5);
        playSfx('explosion');
        popupMgr.add('MAX BUSTER! ⚡', player.x, player.y - 20, '#38BDF8', 20);
      } else {
        playSfx('laser');
      }
      player.chargeTime = 0;
    };

    bindHoldControl(listen, shootBtn, startCharge, released => {
      if (released) releaseCharge();
      else { player.charging = false; player.chargeTime = 0; }
    });

    listen(window, 'keydown', e => {
      if (!isTyping(e) && e.code === 'KeyJ' && !player.charging) startCharge();
    });
    listen(window, 'keyup', e => {
      if (e.code === 'KeyJ') releaseCharge();
    });

    function triggerSlide() {
      if (phase === 'playing' && player.isGrounded && !player.isSliding) {
        player.isSliding = true;
        player.slideTimer = 22;
        player.vx = player.facing * 7;
        player.h = 18; // Low hitbox
        playSfx('whoosh');
      }
    }

    const bindHold = (id, k) => {
      const el = container.querySelector(id);
      bindHoldControl(listen, el, () => { keys[k] = true; }, () => { keys[k] = false; });
    };
    bindHold('#mmLeft', 'ArrowLeft');
    bindHold('#mmRight', 'ArrowRight');
    bindHold('#mmJump', 'Space');
    const slBtn = container.querySelector('#mmSlide');
    if (slBtn) slBtn.addEventListener('click', triggerSlide);

    function updateHUD() {
      const stEl = container.querySelector('#mmStage');
      if (stEl) {
        const names = ['1/3 Cutman', '2/3 Gutsman', '3/3 Dr. Wily'];
        stEl.textContent = names[currentStage - 1] || 'Vô Cực';
      }
      const hpEl = container.querySelector('#mmHp');
      if (hpEl) hpEl.textContent = `${player.hp}%`;
      const etEl = container.querySelector('#mmEtank');
      if (etEl) etEl.textContent = eTanks;
      const wEl = container.querySelector('#mmWeapon');
      if (wEl) wEl.textContent = weapon;
      const sEl = container.querySelector('#mmScore');
      if (sEl) sEl.textContent = player.score;
    }

    let animId = null;
    const ticksForFrame = fixedTicks(performance);
    function loop() {
      const ticks = ticksForFrame();
      for (let tick = 0; tick < ticks && phase === 'playing'; tick++) {
      // 1. Sliding physics
      if (player.isSliding) {
        player.slideTimer--;
        player.x += player.vx;
        particleSys.spawn(player.x + 10, player.y + player.h, 2, { colors: ['#CBD5E1'], speed: 2 });
        if (player.slideTimer <= 0) {
          player.isSliding = false;
          player.h = 36;
        }
      } else {
        if (keys['ArrowLeft'] || keys['KeyA']) {
          player.vx = -4;
          player.facing = -1;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
          player.vx = 4;
          player.facing = 1;
        } else {
          player.vx = 0;
        }

        if ((keys['KeyS'] || keys['ArrowDown']) && keys['Space']) {
          triggerSlide();
        } else if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && player.isGrounded) {
          player.vy = -12;
          player.isGrounded = false;
          playSfx('whoosh');
        }
        player.x += player.vx;
      }

      player.vy += 0.65;
      player.y += player.vy;

      // Platforms
      player.isGrounded = false;
      platforms.forEach(plat => {
        if (
          player.x + player.w > plat.x &&
          player.x < plat.x + plat.w &&
          player.y + player.h >= plat.y &&
          player.y + player.h <= plat.y + 16 &&
          player.vy >= 0
        ) {
          player.y = plat.y - player.h;
          player.vy = 0;
          player.isGrounded = true;
        }
      });

      player.x = Math.max(10, Math.min(W - player.w - 10, player.x));

      // Charge Buster tick
      if (player.charging) {
        player.chargeTime++;
        if (player.chargeTime % 15 === 0) {
          particleSys.spawn(player.x + player.w / 2, player.y + player.h / 2, 4, {
            colors: ['#38BDF8', '#BAE6FD', '#FBBF24'],
            speed: 2
          });
        }
      }

      if (player.invuln > 0) player.invuln--;

      // 2. Bullets & Boss Hit Tests
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        b.x += b.vx;

        if (b.isEnemy && b.x + b.radius >= player.x && b.x - b.radius <= player.x + player.w &&
            b.y + b.radius >= player.y && b.y - b.radius <= player.y + player.h) {
          bullets.splice(bi, 1);
          if (player.invuln <= 0) {
            player.hp = Math.max(0, player.hp - b.damage);
            player.invuln = 60;
            cameraShake.addTrauma(0.45); playSfx('hit');
            if (player.hp <= 0) { phase = 'lost'; player.charging = false; }
          }
          continue;
        }
        if (!b.isEnemy && boss && boss.hp > 0) {
          if (b.x > boss.x && b.x < boss.x + boss.w && b.y > boss.y && b.y < boss.y + boss.h) {
            boss.hp -= b.damage;
            cameraShake.addTrauma(0.5);
            Juice.triggerHitstop(40);
            playSfx('hit');
            particleSys.spawn(b.x, b.y, b.isMega ? 25 : 12, { colors: ['#38BDF8', '#F59E0B'], speed: 5 });
            popupMgr.add(`-${b.damage}!`, boss.x, boss.y - 10, '#38BDF8', 18);

            if (boss.hp <= 0) {
              player.score += 5000;
              playSfx('win');
              if (currentStage === 1) {
                weapon = 'Rolling Cutter (Kéo Xoay)';
                popupMgr.add('HẠ CUTMAN! MỞ KHÓA ROLLING CUTTER! ✂️', W / 2, H / 2, '#FBBF24', 24);
              } else if (currentStage === 2) {
                weapon = 'Super Arm (Siêu Tay Cẩu)';
                popupMgr.add('HẠ GUTSMAN! MỞ KHÓA SUPER ARM! 🦾', W / 2, H / 2, '#FBBF24', 24);
              } else {
                popupMgr.add('PHÁ HỦY WILY FORTRESS! CHIẾN THẮNG! 👑', W / 2, H / 2, '#FBBF24', 28);
                phase = 'won';
              }
              if (currentStage < 3) {
                currentStage++;
                setTimeout(() => spawnBoss(currentStage), 1200);
              }
            }
            // One projectile deals its advertised damage once, including charged shots.
            bullets.splice(bi, 1);
            continue;
          }
        }
        if (b.x < 0 || b.x > W) bullets.splice(bi, 1);
      }

      // 3. Boss AI
      if (boss && boss.hp > 0) {
        boss.timer++;
        if (boss.timer > 80) {
          boss.timer = 0;
          bullets.push({ x: boss.x - 10, y: boss.y + 20, vx: -6, damage: 15, radius: 6, isMega: false, isEnemy: true });
          playSfx('laser');
        }
      }

      updateHUD();

      }
      // RENDER
      const offset = cameraShake.getOffset(10);
      ctx.save();
      ctx.translate(offset.x, offset.y);

      // Sci-fi Neon Background
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, H);

      // Platforms
      platforms.forEach(plat => {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#38BDF8';
        ctx.strokeRect(plat.x, plat.y, plat.w, 4);
      });

      // Bullets
      bullets.forEach(b => {
        ctx.fillStyle = b.isMega ? '#FBBF24' : '#38BDF8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Boss
      if (boss && boss.hp > 0) {
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 12px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${boss.name} (${boss.hp}/${boss.maxHp})`, boss.x + boss.w / 2, boss.y - 6);
      }

      // Player Mega Man
      if (player.invuln % 6 < 3) {
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(player.x + player.w / 2, player.y + 6, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      ctx.restore();
      drawResult(ctx, W, H, phase, player.score + ' điểm · Màn ' + currentStage + '/3');

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 5. BẮN VỊT CỎ 8-BIT (DUCK HUNT) - 10 VÒNG, BẮN ĐĨA BAY, CHÓ SĂN
  // =========================================================================
  function launchDuckHunt(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    const W = 640;
    const H = 400;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">🦆 ${game.title || 'Duck Hunt'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Chế Độ: <span id="dhMode" style="color: #38BDF8; font-weight: bold;">Bắn Vịt Đồng</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Vòng: <span id="dhRound" style="color: #F59E0B; font-weight: bold;">Round 1/10</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Đạn: <span id="dhBullets" style="color: #EF4444; font-weight: bold;">🔴🔴🔴</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Điểm: <span id="dhScore" style="color: #10B981; font-weight: bold;">0</span></div>
          <div class="hud-pill">Lượt trượt: <span id="dhMisses">0/3</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center; cursor: crosshair;">
          <canvas id="dhCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #38BDF8;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <button class="btn-canvas-action" id="dhSwitchMode" style="background-color: #8B5CF6; color: #FFF; font-weight: bold;">
            🎯 Chuyển Bắn Đĩa Bay (Clay Shooting)
          </button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#dhCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    let round = 1;
    let mode = 'duck'; // 'duck', 'clay'
    let bullets = 3;
    let score = 0;
    let targets = [];
    let dogState = 'none'; // 'none', 'laugh', 'score'
    let dogTimer = 0;
    let phase = 'playing';
    let misses = 0;
    let escapedThisWave = 0;
    let waveTimer = null;

    function spawnTargets() {
      if (waveTimer !== null) { clearTimeout(waveTimer); waveTimer = null; }
      if (phase !== 'playing') return;
      escapedThisWave = 0;
      targets = [];
      const count = round >= 5 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        targets.push({
          x: 120 + Math.random() * (W - 240),
          y: H - 90,
          vx: (Math.random() - 0.5) * (5 + round * 0.8),
          vy: -3 - Math.random() * (3 + round * 0.5),
          alive: true,
          falling: false,
          wing: 0
        });
      }
      bullets = 3;
      updateHUD();
    }

    spawnTargets();

    let mouseX = W / 2, mouseY = H / 2;
    canvas.style.touchAction = 'none';
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('aria-label', 'Chạm để bắn vịt. Dùng phím mũi tên để ngắm và Space để bắn.');
    function aim(e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (W / rect.width);
      mouseY = (e.clientY - rect.top) * (H / rect.height);
    }
    listen(canvas, 'pointermove', aim);
    listen(canvas, 'pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); aim(e); shoot();
    });
    const aimKeys = {};
    bindKeys(listen, aimKeys);
    listen(window, 'keydown', e => {
      if (!isTyping(e) && !e.repeat && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); shoot(); }
    });

    function shoot() {
      if (phase !== 'playing' || bullets <= 0 || targets.length === 0) return;
      bullets--;
      cameraShake.addTrauma(0.6);
      playSfx('explosion');
      particleSys.spawn(mouseX, mouseY, 8, { colors: ['#EF4444', '#FBBF24'], speed: 4 });

      let hit = false;
      targets.forEach(t => {
        if (t.alive && !t.falling) {
          const dist = Math.hypot(t.x - mouseX, t.y - mouseY);
          if (dist < 32) {
            t.alive = false;
            t.falling = true;
            hit = true;
            score += 500 * round;
            Juice.triggerHitstop(60);
            playSfx('coin');
            popupMgr.add(`+${500 * round} BẮN TRÚNG! 🎯`, t.x, t.y, '#FBBF24', 20);
            particleSys.spawn(t.x, t.y, 25, { colors: ['#16A34A', '#F59E0B', '#FFF'], speed: 5 });
          }
        }
      });

      if (!hit && bullets === 0 && targets.some(t => t.alive)) {
        dogState = 'laugh';
        dogTimer = 90;
        playSfx('tone', 220, 'square', 0.2);
        popupMgr.add('CHÓ SĂN CƯỜI NHẠO! 🐶', W / 2, H - 120, '#EF4444', 20);
      }

      updateHUD();
    }

    const swBtn = container.querySelector('#dhSwitchMode');
    if (swBtn) {
      swBtn.addEventListener('click', () => {
        mode = mode === 'duck' ? 'clay' : 'duck';
        phase = 'playing'; round = 1; score = 0; misses = 0; dogState = 'none';
        popupMgr.add(`CHUYỂN SANG: ${mode === 'duck' ? 'BẮN VỊT' : 'BẮN ĐĨA BAY'}!`, W / 2, 80, '#38BDF8', 22);
        spawnTargets();
      });
    }

    function updateHUD() {
      const mEl = container.querySelector('#dhMode');
      if (mEl) mEl.textContent = mode === 'duck' ? 'Bắn Vịt Đồng' : 'Bắn Đĩa Bay';
      const rEl = container.querySelector('#dhRound');
      if (rEl) rEl.textContent = `Round ${round}/10`;
      const bEl = container.querySelector('#dhBullets');
      if (bEl) bEl.innerHTML = '🔴'.repeat(bullets);
      const sEl = container.querySelector('#dhScore');
      if (sEl) sEl.textContent = score;
      const missEl = container.querySelector('#dhMisses');
      if (missEl) missEl.textContent = misses + '/3';
      const switchEl = container.querySelector('#dhSwitchMode');
      if (switchEl) switchEl.textContent = mode === 'duck' ? 'Chuyển sang bắn đĩa bay' : 'Chuyển sang bắn vịt';
    }

    let animId = null;
    const ticksForFrame = fixedTicks(performance);
    function loop() {
      const ticks = ticksForFrame();
      for (let tick = 0; tick < ticks && phase === 'playing'; tick++) {
      mouseX = Math.max(0, Math.min(W, mouseX + ((aimKeys.ArrowRight || aimKeys.KeyD ? 1 : 0) - (aimKeys.ArrowLeft || aimKeys.KeyA ? 1 : 0)) * 6));
      mouseY = Math.max(0, Math.min(H, mouseY + ((aimKeys.ArrowDown || aimKeys.KeyS ? 1 : 0) - (aimKeys.ArrowUp || aimKeys.KeyW ? 1 : 0)) * 6));
      if (dogTimer > 0) dogTimer--;
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        if (t.falling) {
          t.y += 6;
          if (t.y > H - 80) {
            targets.splice(i, 1);
          }
        } else if (t.alive) {
          t.x += t.vx;
          t.y += t.vy;
          t.wing = (t.wing + 0.2) % (Math.PI * 2);
          if (t.x < 30 || t.x > W - 30) t.vx *= -1;
          if (t.y < 30) {
            targets.splice(i, 1);
            escapedThisWave++;
          }
        }
      }
      if (targets.length === 0 && waveTimer === null) {
        if (escapedThisWave > 0) {
          misses++; dogState = 'laugh'; dogTimer = 90;
          if (misses >= 3) phase = 'lost';
        } else if (round === 10) phase = 'won';
        else { round++; playSfx('win'); }
        updateHUD();
        if (phase === 'playing') waveTimer = setTimeout(() => { waveTimer = null; spawnTargets(); }, 800);
        else playSfx(phase === 'won' ? 'win' : 'alarm');
      }

      }
      const offset = cameraShake.getOffset(8);
      ctx.save();
      ctx.translate(offset.x, offset.y);

      ctx.fillStyle = mode === 'clay' ? '#1E293B' : '#60A5FA';
      ctx.fillRect(0, 0, W, H);

      // Grass
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, H - 70, W, 70);

      // Targets
      targets.forEach(t => {
        if (mode === 'clay') {
          ctx.fillStyle = '#EA580C';
          ctx.beginPath();
          ctx.ellipse(t.x, t.y, 18, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#15803D';
          ctx.beginPath();
          ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Dog Laugh
      if (dogState === 'laugh' && dogTimer > 0) {
        ctx.fillStyle = '#92400E';
        ctx.beginPath();
        ctx.arc(W / 2, H - 90, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = '24px Calibri, sans-serif';
        ctx.fillText('😜', W / 2 - 12, H - 82);
      }

      // Crosshair
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 16, 0, Math.PI * 2);
      ctx.moveTo(mouseX - 22, mouseY);
      ctx.lineTo(mouseX + 22, mouseY);
      ctx.moveTo(mouseX, mouseY - 22);
      ctx.lineTo(mouseX, mouseY + 22);
      ctx.stroke();

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      ctx.restore();
      drawResult(ctx, W, H, phase, score + ' điểm · Vòng ' + round + '/10');

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 6. STREET FIGHTER II - 3 ĐỐI THỦ TOURNAMENT, SUPER SHINKU HADOUKEN
  // =========================================================================
  function launchStreetFighter(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    const W = 640;
    const H = 400;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">🥋 ${game.title || 'Street Fighter II'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Trận: <span id="sfMatch" style="color: #38BDF8; font-weight: bold;">1/3 vs KEN</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">RYU HP: <span id="sfRyuHp" style="color: #38BDF8; font-weight: bold;">100%</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">ĐỐI THỦ HP: <span id="sfEnemyHp" style="color: #EF4444; font-weight: bold;">100%</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">SUPER: <span id="sfSuper" style="color: #F59E0B; font-weight: bold;">0%</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="sfCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #1E293B;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn-canvas-action" id="sfLeft" aria-label="Di chuyển trái">◀ Trái</button>
            <button class="btn-canvas-action" id="sfRight" aria-label="Di chuyển phải">Phải ▶</button>
            <button class="btn-canvas-action" id="sfPunch" style="background-color: #0284C7; color: #FFF; font-weight: bold;">🥊 ĐẤM (J)</button>
            <button class="btn-canvas-action" id="sfKick" style="background-color: #EA580C; color: #FFF; font-weight: bold;">🦵 ĐÁ (K)</button>
            <button class="btn-canvas-action" id="sfHadouken" style="background-color: #38BDF8; color: #000; font-weight: 900;">🔥 HADOUKEN (L)</button>
            <button class="btn-canvas-action" id="sfShoryuken" style="background-color: #EF4444; color: #FFF; font-weight: 900;">⚡ SHORYUKEN (I)</button>
            <button class="btn-canvas-action" id="sfRestart">Chơi lại giải đấu</button>
          </div>
          <div id="sfStatus" role="status" aria-live="polite" style="color:var(--text-main);text-align:center;font-weight:bold;min-height:24px"></div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#sfCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    const OPPONENTS = [
      { name: 'Ken Masters', color: '#DC2626', hp: 100 },
      { name: 'Chun-Li', color: '#2563EB', hp: 120 },
      { name: 'M. Bison (Boss)', color: '#991B1B', hp: 160 }
    ];

    let matchIdx = 0;
    let superGauge = 0;
    let phase = 'playing';
    let lastFrameTime = 0;

    const ryu = { x: 140, y: 260, w: 48, h: 90, hp: 100, state: 'idle', animTimer: 0, vy: 0, isGrounded: true };
    const enemy = { x: 440, y: 260, w: 48, h: 90, hp: 100, maxHp: 100, state: 'idle', animTimer: 0, aiTimer: 0 };
    const fireballs = [];

    const keys = {};
    listen(window, 'keydown', e => {
      if (isTyping(e)) return;
      keys[e.code] = true;
      if (phase !== 'playing' || e.repeat) return;
      const actionKeys = { KeyJ: 'punch', KeyK: 'kick', KeyL: 'hadouken', KeyI: 'shoryuken' };
      if (actionKeys[e.code]) {
        e.preventDefault();
        ryuAttack(actionKeys[e.code]);
      }
    });
    listen(window, 'keyup', e => { keys[e.code] = false; });
    const movementButtons = [['#sfLeft', 'ArrowLeft'], ['#sfRight', 'ArrowRight']];
    movementButtons.forEach(([selector, code]) => {
      const button = container.querySelector(selector);
      bindHoldControl(listen, button, () => { keys[code] = true; }, () => { keys[code] = false; });
    });
    listen(window, 'pointerup', () => { keys.ArrowLeft = false; keys.ArrowRight = false; });
    listen(window, 'blur', () => { keys.ArrowLeft = false; keys.ArrowRight = false; });

    function ryuAttack(type) {
      if (phase !== 'playing' || ryu.state !== 'idle') return;
      ryu.state = type;
      ryu.animTimer = 22;
      superGauge = Math.min(100, superGauge + 15);

      if (type === 'hadouken') {
        const isSuper = superGauge >= 100;
        if (isSuper) superGauge = 0;
        playSfx('whoosh');
        fireballs.push({
          x: ryu.x + ryu.w + 6,
          y: ryu.y + 36,
          vx: isSuper ? 12 : 8,
          radius: isSuper ? 24 : 16,
          damage: isSuper ? 50 : 25,
          isSuper
        });
        popupMgr.add(isSuper ? 'SHINKU HADOUKEN! ⚡🔥' : 'HADOUKEN! 🌊', ryu.x + 30, ryu.y - 20, '#38BDF8', 24);
      } else if (type === 'shoryuken') {
        ryu.vy = -14;
        ryu.isGrounded = false;
        playSfx('whoosh');
        if (Math.abs(enemy.x - ryu.x) < 90) {
          enemy.hp = Math.max(0, enemy.hp - 35);
          cameraShake.addTrauma(0.8);
          Juice.triggerHitstop(60);
          playSfx('hit');
          popupMgr.add('SHORYUKEN! 🐉', enemy.x, enemy.y - 20, '#EF4444', 24);
          checkVictory();
        }
      } else {
        playSfx('whoosh');
        if (Math.abs(enemy.x - ryu.x) < 80) {
          enemy.hp = Math.max(0, enemy.hp - 15);
          cameraShake.addTrauma(0.5);
          Juice.triggerHitstop(40);
          playSfx('hit');
          checkVictory();
        }
      }
      updateHUD();
    }

    function checkVictory() {
      if (phase !== 'playing' || enemy.hp > 0) return;
      playSfx('win');
      fireballs.length = 0;
      if (matchIdx < OPPONENTS.length - 1) {
        matchIdx++;
        enemy.hp = OPPONENTS[matchIdx].hp;
        enemy.maxHp = enemy.hp;
        enemy.aiTimer = 0;
        ryu.hp = Math.min(100, ryu.hp + 20);
        const message = 'K.O! Tiến vào trận ' + (matchIdx + 1) + ' với ' + OPPONENTS[matchIdx].name + '!';
        const status = container.querySelector('#sfStatus');
        if (status) status.textContent = message;
        popupMgr.add(message, W / 2, H / 2, '#FBBF24', 24);
      } else {
        phase = 'won';
        const status = container.querySelector('#sfStatus');
        if (status) status.textContent = 'Vô địch! Bấm Chơi lại giải đấu để thử sức lần nữa.';
        popupMgr.add('VÔ ĐỊCH GIẢI ĐẤU STREET FIGHTER II!', W / 2, H / 2, '#FBBF24', 28);
      }
      updateHUD();
    }

    function restartTournament() {
      phase = 'playing';
      matchIdx = 0;
      superGauge = 0;
      ryu.hp = 100;
      ryu.state = 'idle';
      ryu.animTimer = 0;
      ryu.vy = 0;
      ryu.y = 260;
      enemy.hp = OPPONENTS[0].hp;
      enemy.maxHp = enemy.hp;
      enemy.aiTimer = 0;
      fireballs.length = 0;
      const status = container.querySelector('#sfStatus');
      if (status) status.textContent = 'Giải đấu mới bắt đầu.';
      updateHUD();
    }

    const bind = (id, fn) => {
      const el = container.querySelector(id);
      if (el) el.addEventListener('click', fn);
    };
    bind('#sfPunch', () => ryuAttack('punch'));
    bind('#sfKick', () => ryuAttack('kick'));
    bind('#sfHadouken', () => ryuAttack('hadouken'));
    bind('#sfShoryuken', () => ryuAttack('shoryuken'));
    bind('#sfRestart', restartTournament);

    function updateHUD() {
      const mEl = container.querySelector('#sfMatch');
      if (mEl) mEl.textContent = `${matchIdx + 1}/3 vs ${OPPONENTS[matchIdx].name}`;
      const rHp = container.querySelector('#sfRyuHp');
      if (rHp) rHp.textContent = `${ryu.hp}%`;
      const eHp = container.querySelector('#sfEnemyHp');
      if (eHp) eHp.textContent = `${enemy.hp}%`;
      const sp = container.querySelector('#sfSuper');
      if (sp) sp.textContent = `${superGauge}%`;
    }

    let animId = null;
    function loop(timestamp) {
      const dt = lastFrameTime ? Math.min(2, Math.max(0, (timestamp - lastFrameTime) / (1000 / 60))) : 1;
      lastFrameTime = timestamp || 0;
      if (phase === 'playing' && ryu.state === 'idle') {
        if (keys['ArrowLeft'] || keys['KeyA']) ryu.x = Math.max(40, ryu.x - 3.5 * dt);
        if (keys['ArrowRight'] || keys['KeyD']) ryu.x = Math.min(W - 80, ryu.x + 3.5 * dt);
      }

      if (phase === 'playing') {
      ryu.vy += 0.7 * dt;
      ryu.y += ryu.vy * dt;
      if (ryu.y >= 260) {
        ryu.y = 260;
        ryu.vy = 0;
        ryu.isGrounded = true;
      }

      if (ryu.animTimer > 0) {
        ryu.animTimer -= dt;
        if (ryu.animTimer <= 0) ryu.state = 'idle';
      }

      // Enemy AI
      enemy.aiTimer += dt;
      if (enemy.aiTimer > Math.max(35, 75 - matchIdx * 15)) {
        enemy.aiTimer = 0;
        if (Math.abs(enemy.x - ryu.x) < 80) {
          ryu.hp = Math.max(0, ryu.hp - (12 + 3 * matchIdx));
          if (ryu.hp <= 0) {
            phase = 'lost';
            const status = container.querySelector('#sfStatus');
            if (status) status.textContent = 'Bạn đã thua. Bấm Chơi lại giải đấu để thử lại.';
          }
          cameraShake.addTrauma(0.5);
          playSfx('hit');
          updateHUD();
        }
      }

      // Fireballs
      const currentMatch = matchIdx;
      for (let fi = fireballs.length - 1; fi >= 0; fi--) {
        const fb = fireballs[fi];
        fb.x += fb.vx * dt;
        if (fb.x > enemy.x && fb.x < enemy.x + enemy.w) {
          enemy.hp = Math.max(0, enemy.hp - fb.damage);
          cameraShake.addTrauma(fb.isSuper ? 1.0 : 0.6);
          Juice.triggerHitstop(50);
          playSfx('explosion');
          particleSys.spawn(fb.x, fb.y, 25, { colors: ['#38BDF8', '#FFF'], speed: 6 });
          fireballs.splice(fi, 1);
          updateHUD();

          checkVictory();
          if (matchIdx !== currentMatch || phase !== 'playing') break;
          continue;
        }
        if (fb.x > W) fireballs.splice(fi, 1);
      }

      }
      // RENDER
      const offset = cameraShake.getOffset(12);
      ctx.save();
      ctx.translate(offset.x, offset.y);

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 350, W, 50);

      // Ryu
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(ryu.x, ryu.y, ryu.w, ryu.h);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(ryu.x + 8, ryu.y - 6, ryu.w - 16, 8);

      // Enemy
      ctx.fillStyle = OPPONENTS[matchIdx].color;
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);

      // Fireballs
      fireballs.forEach(fb => {
        ctx.fillStyle = fb.isSuper ? '#FBBF24' : '#38BDF8';
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, fb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      ctx.restore();

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 7. BLOXORZ - 5 MÀN ĐỐ, GẠCH CAM GIÒN VÀ HOÀN TÁC
  // =========================================================================
  function launchBloxorz(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    const W = 640;
    const H = 400;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">🧩 ${game.title || 'Bloxorz'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Màn Đố: <span id="blxStage" style="color: #F59E0B; font-weight: bold;">Stage 1/5</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Số Bước: <span id="blxMoves" style="color: #38BDF8; font-weight: bold;">0</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="blxCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #020617;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <button class="btn-canvas-action" id="blxLeft">◀ Trái</button>
          <button class="btn-canvas-action" id="blxUp">▲ Lên</button>
          <button class="btn-canvas-action" id="blxDown">▼ Xuống</button>
          <button class="btn-canvas-action" id="blxRight">Phải ▶</button>
          <button class="btn-canvas-action" id="blxUndo">Hoàn tác</button>
        </div>
        <p style="text-align:center">Đưa khối đứng vào ô đỏ. Khối nằm chiếm hai ô; gạch cam chỉ đỡ khối nằm.</p>
      </div>
    `;

    const canvas = container.querySelector('#blxCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    const STAGES = [
      {
        grid: [
          [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
          [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
          [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [0, 0, 0, 0, 0, 1, 1, 2, 1, 1],
          [0, 0, 0, 0, 0, 0, 1, 1, 1, 0]
        ],
        start: { x: 1, y: 1 }
      },
      {
        grid: [
          [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
          [1, 1, 1, 1, 3, 3, 1, 1, 1, 1], // 3: Fragile tile supports a lying block only.
          [1, 1, 1, 1, 0, 0, 1, 1, 2, 1],
          [0, 0, 1, 1, 1, 1, 1, 1, 1, 0]
        ],
        start: { x: 1, y: 1 }
      },
      {
        grid: [
          [1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
          [1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
          [0, 1, 1, 1, 1, 1, 1, 0, 1, 1],
          [0, 0, 0, 1, 1, 1, 1, 1, 2, 1],
          [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
        ],
        start: { x: 1, y: 1 }
      },
      {
        grid: [
          [1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
          [1, 1, 1, 3, 3, 1, 1, 1, 1, 0],
          [1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
          [0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
          [0, 0, 1, 1, 1, 1, 1, 2, 1, 1],
          [0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
        ],
        start: { x: 1, y: 1 }
      },
      {
        grid: [
          [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [0, 1, 1, 1, 0, 0, 0, 1, 1, 1],
          [0, 1, 1, 1, 3, 3, 1, 1, 0, 0],
          [0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
          [0, 0, 0, 1, 1, 1, 1, 1, 2, 1]
        ],
        start: { x: 1, y: 1 }
      }
    ];

    let currentStage = 0;
    let block = { x: 1, y: 1, state: 'stand' };
    let moves = 0;
    let phase = 'playing';
    let history = [];

    function occupiedCells(value) {
      const cells = [{ x: value.x, y: value.y }];
      if (value.state === 'flatX') cells.push({ x: value.x + 1, y: value.y });
      if (value.state === 'flatY') cells.push({ x: value.x, y: value.y + 1 });
      return cells;
    }

    function roll(dir) {
      if (phase !== 'playing') return;
      history.push({ ...block });
      moves++;
      playSfx('thud');
      cameraShake.addTrauma(0.3);

      const s = block.state;
      if (dir === 'left') {
        if (s === 'stand') { block.x -= 2; block.state = 'flatX'; }
        else if (s === 'flatX') { block.x -= 1; block.state = 'stand'; }
        else if (s === 'flatY') { block.x -= 1; }
      } else if (dir === 'right') {
        if (s === 'stand') { block.x += 1; block.state = 'flatX'; }
        else if (s === 'flatX') { block.x += 2; block.state = 'stand'; }
        else if (s === 'flatY') { block.x += 1; }
      } else if (dir === 'up') {
        if (s === 'stand') { block.y -= 2; block.state = 'flatY'; }
        else if (s === 'flatY') { block.y -= 1; block.state = 'stand'; }
        else if (s === 'flatX') { block.y -= 1; }
      } else if (dir === 'down') {
        if (s === 'stand') { block.y += 1; block.state = 'flatY'; }
        else if (s === 'flatY') { block.y += 2; block.state = 'stand'; }
        else if (s === 'flatX') { block.y += 1; }
      }

      const curGrid = STAGES[currentStage].grid;
      const valid = occupiedCells(block).every(cell => curGrid[cell.y] && curGrid[cell.y][cell.x] > 0) &&
        !(block.state === 'stand' && curGrid[block.y] && curGrid[block.y][block.x] === 3);
      if (!valid) {
        block = { ...STAGES[currentStage].start, state: 'stand' };
        popupMgr.add('Rơi khỏi bàn! Bấm Hoàn tác để lấy lại bước trước.', W / 2, 70, '#FCA5A5', 18);
        playSfx('alarm');
      }
      if (block.state === 'stand' && curGrid[block.y] && curGrid[block.y][block.x] === 2) {
        playSfx('win');
        if (currentStage < STAGES.length - 1) {
          currentStage++;
          block = { ...STAGES[currentStage].start, state: 'stand' };
          history = [];
          popupMgr.add(`QUA MÀN ${currentStage + 1}! 🌟`, W / 2, H / 2, '#FBBF24', 26);
        } else {
          popupMgr.add('VƯỢT TRỌN BỘ BLOXORZ! 👑', W / 2, H / 2, '#FBBF24', 28);
          phase = 'won';
        }
      }

      const sEl = container.querySelector('#blxStage');
      if (sEl) sEl.textContent = `Stage ${currentStage + 1}/${STAGES.length}`;
      const mEl = container.querySelector('#blxMoves');
      if (mEl) mEl.textContent = moves;
    }

    const onKey = e => {
      if (isTyping(e) || e.repeat) return;
      if ((e.key || '').startsWith('Arrow')) e.preventDefault();
      if (e.key === 'ArrowLeft') roll('left');
      if (e.key === 'ArrowRight') roll('right');
      if (e.key === 'ArrowUp') roll('up');
      if (e.key === 'ArrowDown') roll('down');
    };
    listen(window, 'keydown', onKey);

    const bind = (id, d) => {
      const el = container.querySelector(id);
      if (el) el.addEventListener('click', () => roll(d));
    };
    bind('#blxLeft', 'left');
    bind('#blxRight', 'right');
    bind('#blxUp', 'up');
    bind('#blxDown', 'down');
    listen(container.querySelector('#blxUndo'), 'click', () => {
      if (!history.length) return;
      block = history.pop(); phase = 'playing'; moves = Math.max(0, moves - 1);
      const el = container.querySelector('#blxMoves'); if (el) el.textContent = moves;
    });

    let animId = null;
    function loop() {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, H);

      const curGrid = STAGES[currentStage].grid;
      const tileW = 44;
      const tileH = 24;
      const ox = W / 2 - 120;
      const oy = 100;

      for (let r = 0; r < curGrid.length; r++) {
        for (let c = 0; c < curGrid[r].length; c++) {
          const t = curGrid[r][c];
          if (t === 0) continue;
          const isoX = ox + (c - r) * (tileW / 2);
          const isoY = oy + (c + r) * (tileH / 2);

          ctx.fillStyle = t === 2 ? '#EF4444' : t === 3 ? '#F59E0B' : '#334155';
          ctx.beginPath();
          ctx.moveTo(isoX, isoY);
          ctx.lineTo(isoX + tileW / 2, isoY + tileH / 2);
          ctx.lineTo(isoX, isoY + tileH);
          ctx.lineTo(isoX - tileW / 2, isoY + tileH / 2);
          ctx.closePath();
          ctx.fill();
        }
      }

      for (const cell of occupiedCells(block)) {
        const bx = ox + (cell.x - cell.y) * (tileW / 2);
        const by = oy + (cell.x + cell.y) * (tileH / 2);
        const height = block.state === 'stand' ? 48 : 23;
        ctx.fillStyle = '#68849F';
        ctx.beginPath(); ctx.moveTo(bx - 20, by + 10 - height); ctx.lineTo(bx, by + 21 - height);
        ctx.lineTo(bx, by + 21); ctx.lineTo(bx - 20, by + 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#93B6D0';
        ctx.beginPath(); ctx.moveTo(bx, by + 21 - height); ctx.lineTo(bx + 20, by + 10 - height);
        ctx.lineTo(bx + 20, by + 10); ctx.lineTo(bx, by + 21); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#C0D8E8';
        ctx.beginPath(); ctx.moveTo(bx, by - height); ctx.lineTo(bx + 20, by + 10 - height);
        ctx.lineTo(bx, by + 21 - height); ctx.lineTo(bx - 20, by + 10 - height); ctx.closePath(); ctx.fill();
      }

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      drawResult(ctx, W, H, phase, moves + ' bước · ' + STAGES.length + ' màn');

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 8. THỜI ĐẠI CHIẾN TRANH (AGE OF WAR) - 5 KỶ NGUYÊN, TIẾN HÓA, THIÊN THẠCH
  // =========================================================================
  function launchAgeOfWar(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    let phase = 'playing';
    const W = 640;
    const H = 400;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">⚔️ ${game.title || 'Age of War'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Kỷ Nguyên: <span id="aowEra" style="color: #F59E0B; font-weight: bold;">1/5 Đồ Đá</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Vàng: <span id="aowGold" style="color: #FBBF24; font-weight: bold;">100</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">EXP: <span id="aowExp" style="color: #38BDF8; font-weight: bold;">0/400</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Thành Ta: <span id="aowBaseHp" style="color: #10B981; font-weight: bold;">500</span> | Địch: <span id="aowEnemyHp" style="color: #EF4444; font-weight: bold;">500</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="aowCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #0F172A;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn-canvas-action" id="aowUnit1" style="background-color: #0284C7; color: #FFF; font-weight: bold;">🗡️ Lính Cận Chiến (15g)</button>
            <button class="btn-canvas-action" id="aowUnit2" style="background-color: #0369A1; color: #FFF; font-weight: bold;">🏹 Lính Bắn Xa (25g)</button>
            <button class="btn-canvas-action" id="aowUnit3" style="background-color: #075985; color: #FFF; font-weight: bold;">🦕 Lính Kỵ Binh (100g)</button>
            <button class="btn-canvas-action" id="aowEvolve" style="background-color: #F59E0B; color: #000; font-weight: 900;">⚡ TIẾN HÓA (400 EXP)</button>
            <button class="btn-canvas-action" id="aowSpecial" style="background-color: #EF4444; color: #FFF; font-weight: 900;">☄️ MƯA THIÊN THẠCH</button>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#aowCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    const ERAS = [
      { name: 'Đồ Đá', u1: 'Người Dùi Cui', c1: 15, u2: 'Ném Đá', c2: 25, u3: 'Cưỡi Khủng Long', c3: 100, expNeed: 400 },
      { name: 'Lâu Đài', u1: 'Kiếm Sĩ', c1: 50, u2: 'Cung Thủ', c2: 75, u3: 'Kỵ Binh', c3: 200, expNeed: 1200 },
      { name: 'Phục Hưng', u1: 'Hỏa Mai', c1: 100, u2: 'Xạ Thủ', c2: 150, u3: 'Xe Đại Bác', c3: 350, expNeed: 2500 },
      { name: 'Hiện Đại', u1: 'Lính Thủy', c1: 200, u2: 'Bắn Tỉa', c2: 300, u3: 'Xe Tăng Abrams', c3: 600, expNeed: 5000 },
      { name: 'Tương Lai', u1: 'Cyborg Laze', c1: 400, u2: 'Robot Plasma', c2: 600, u3: 'Xe Tăng Lơ Lửng', c3: 1200, expNeed: 99999 }
    ];

    let eraIdx = 0;
    let gold = 100;
    let exp = 0;
    let baseHp = 500;
    let enemyBaseHp = 500;
    let specialCooldown = 0;

    let myUnits = [];
    let enemyUnits = [];

    function spawnUnit(type, isEnemy = false) {
      if (phase !== 'playing') return;
      const era = ERAS[eraIdx];
      const cost = type === 1 ? era.c1 : type === 2 ? era.c2 : era.c3;
      if (!isEnemy && gold < cost) {
        popupMgr.add('KHÔNG ĐỦ VÀNG!', 100, 200, '#EF4444', 16);
        return;
      }
      if (!isEnemy) gold -= cost;

      const hp = type === 1 ? 50 * (eraIdx + 1) : type === 2 ? 35 * (eraIdx + 1) : 120 * (eraIdx + 1);
      const dmg = type === 1 ? 12 * (eraIdx + 1) : type === 2 ? 18 * (eraIdx + 1) : 30 * (eraIdx + 1);
      const range = type === 2 ? 140 : 25;
      const speed = type === 3 ? 1.8 : 1.2;

      const unit = {
        x: isEnemy ? W - 70 : 70,
        y: 310,
        hp,
        maxHp: hp,
        dmg,
        range,
        speed: isEnemy ? -speed : speed,
        type,
        isEnemy,
        attackTimer: 0
      };

      if (isEnemy) enemyUnits.push(unit);
      else myUnits.push(unit);

      playSfx('whoosh');
      updateHUD();
    }

    function triggerMeteor() {
      if (phase !== 'playing' || specialCooldown > 0) return;
      specialCooldown = 900; // 15 seconds
      cameraShake.addTrauma(1.0);
      Juice.triggerHitstop(80);
      playSfx('explosion');
      popupMgr.add('MƯA THIÊN THẠCH HỦY DIỆT! ☄️💥', W / 2, 120, '#EF4444', 26);

      // Rain meteors
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (phase !== 'playing') return;
          const mx = 120 + Math.random() * (W - 200);
          particleSys.spawn(mx, 320, 30, { colors: ['#EF4444', '#F59E0B', '#FBBF24'], speed: 6 });
          cameraShake.addTrauma(0.4);
          playSfx('explosion');
        }, i * 150);
      }

      enemyUnits.forEach(u => (u.hp -= 200));
      updateHUD();
    }

    function evolve() {
      if (phase !== 'playing') return;
      if (eraIdx < ERAS.length - 1 && exp >= ERAS[eraIdx].expNeed) {
        exp -= ERAS[eraIdx].expNeed;
        eraIdx++;
        baseHp += 300;
        cameraShake.addTrauma(0.8);
        playSfx('win');
        popupMgr.add(`TIẾN HÓA KỶ NGUYÊN: ${ERAS[eraIdx].name}! 🌟`, W / 2, H / 2, '#FBBF24', 28);
        particleSys.spawn(W / 2, H / 2, 40, { colors: ['#38BDF8', '#FBBF24', '#FFF'], speed: 7 });
        updateButtons();
        updateHUD();
      } else {
        popupMgr.add('CHƯA ĐỦ EXP TIẾN HÓA!', W / 2, 200, '#EF4444', 16);
      }
    }

    function updateButtons() {
      const era = ERAS[eraIdx];
      const b1 = container.querySelector('#aowUnit1');
      if (b1) b1.textContent = `🗡️ ${era.u1} (${era.c1}g)`;
      const b2 = container.querySelector('#aowUnit2');
      if (b2) b2.textContent = `🏹 ${era.u2} (${era.c2}g)`;
      const b3 = container.querySelector('#aowUnit3');
      if (b3) b3.textContent = `🦕 ${era.u3} (${era.c3}g)`;
      const bEv = container.querySelector('#aowEvolve');
      if (bEv) bEv.textContent = `⚡ TIẾN HÓA (${era.expNeed} EXP)`;
    }

    const bind = (id, fn) => {
      const el = container.querySelector(id);
      if (el) el.addEventListener('click', fn);
    };
    bind('#aowUnit1', () => spawnUnit(1, false));
    bind('#aowUnit2', () => spawnUnit(2, false));
    bind('#aowUnit3', () => spawnUnit(3, false));
    bind('#aowEvolve', evolve);
    bind('#aowSpecial', triggerMeteor);

    function updateHUD() {
      const eEl = container.querySelector('#aowEra');
      if (eEl) eEl.textContent = `${eraIdx + 1}/5 ${ERAS[eraIdx].name}`;
      const gEl = container.querySelector('#aowGold');
      if (gEl) gEl.textContent = Math.round(gold);
      const exEl = container.querySelector('#aowExp');
      if (exEl) exEl.textContent = `${Math.round(exp)}/${ERAS[eraIdx].expNeed}`;
      const bHp = container.querySelector('#aowBaseHp');
      if (bHp) bHp.textContent = Math.max(0, Math.round(baseHp));
      const eHp = container.querySelector('#aowEnemyHp');
      if (eHp) eHp.textContent = Math.max(0, Math.round(enemyBaseHp));
    }

    let enemySpawnCounter = 0;
    let animId = null;
    const ticksForFrame = fixedTicks(performance);

    function loop() {
      const ticks = ticksForFrame();
      for (let tick = 0; tick < ticks && phase === 'playing'; tick++) {
      gold += 0.25; // Passive income
      if (specialCooldown > 0) specialCooldown--;

      // Enemy AI Spawn
      enemySpawnCounter++;
      if (enemySpawnCounter > 180) {
        enemySpawnCounter = 0;
        const rType = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
        spawnUnit(rType, true);
      }

      // Each unit attacks one nearby target per cooldown, independent of crowd size.
      function advanceUnit(unit, opponents, enemyBaseX, damageBase) {
        if (unit.hp <= 0) return;
        const direction = unit.isEnemy ? -1 : 1;
        const target = opponents.filter(other => other.hp > 0 && direction * (other.x - unit.x) >= -5 && Math.abs(other.x - unit.x) <= unit.range)
          .sort((a, b) => Math.abs(a.x - unit.x) - Math.abs(b.x - unit.x))[0];
        const atBase = direction * (enemyBaseX - unit.x) <= unit.range;
        if (target || atBase) {
          unit.attackTimer++;
          if (unit.attackTimer >= 50) {
            unit.attackTimer = 0;
            if (target) target.hp -= unit.dmg;
            else damageBase(unit.dmg);
            cameraShake.addTrauma(0.2); playSfx(target ? 'hit' : 'explosion');
          }
        } else {
          unit.x += unit.speed;
        }
      }
      myUnits.forEach(unit => advanceUnit(unit, enemyUnits, W - 80, damage => { enemyBaseHp -= damage; }));
      enemyUnits.forEach(unit => advanceUnit(unit, myUnits, 80, damage => { baseHp -= damage; }));

      // Cleanup dead units
      for (let i = enemyUnits.length - 1; i >= 0; i--) {
        if (enemyUnits[i].hp <= 0) {
          gold += 20 * (eraIdx + 1);
          exp += 30 * (eraIdx + 1);
          particleSys.spawn(enemyUnits[i].x, enemyUnits[i].y, 10, { colors: ['#FBBF24'], speed: 4 });
          enemyUnits.splice(i, 1);
        }
      }
      for (let i = myUnits.length - 1; i >= 0; i--) {
        if (myUnits[i].hp <= 0) {
          myUnits.splice(i, 1);
        }
      }

      // Check Victory / Defeat
      if (enemyBaseHp <= 0) {
        popupMgr.add('CHIẾN THẮNG KỶ NGUYÊN! PHÁ HỦY THÀNH ĐỊCH! 🏆', W / 2, H / 2, '#FBBF24', 26);
        playSfx('win');
        enemyBaseHp = 0;
        phase = 'won';
      }
      if (baseHp <= 0 && phase === 'playing') {
        popupMgr.add('THÀNH TRÌ THẤT THỦ! THẤT BẠI! 💀', W / 2, H / 2, '#EF4444', 26);
        baseHp = 0;
        phase = 'lost';
        playSfx('alarm');
      }

      updateHUD();

      }
      // RENDER
      const offset = cameraShake.getOffset(10);
      ctx.save();
      ctx.translate(offset.x, offset.y);

      // Sky & Battlefield
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1E293B');
      sky.addColorStop(0.7, '#334155');
      sky.addColorStop(1, '#0F172A');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Ground
      ctx.fillStyle = '#15803D';
      ctx.fillRect(0, 330, W, 70);

      // Bases
      ctx.fillStyle = '#0284C7'; // My Base
      ctx.fillRect(0, 200, 70, 130);
      ctx.fillStyle = '#EF4444'; // Enemy Base
      ctx.fillRect(W - 70, 200, 70, 130);

      // Units
      myUnits.forEach(u => {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(u.x - 8, u.y - 20, 16, 20);
        // HP bar
        ctx.fillStyle = '#10B981';
        ctx.fillRect(u.x - 10, u.y - 26, 20 * (u.hp / u.maxHp), 3);
      });

      enemyUnits.forEach(eu => {
        ctx.fillStyle = '#F87171';
        ctx.fillRect(eu.x - 8, eu.y - 20, 16, 20);
        // HP bar
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(eu.x - 10, eu.y - 26, 20 * (eu.hp / eu.maxHp), 3);
      });

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      ctx.restore();
      drawResult(ctx, W, H, phase, 'Kỷ nguyên ' + (eraIdx + 1) + '/5');

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 9. KHỦNG LONG NHẢ BÓNG (BUBBLE BOBBLE) - BONG BÓNG EXTEND, TRÁI CÂY
  // =========================================================================
  function launchBubbleBobble(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    let phase = 'playing';
    const W = 640;
    const H = 400;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">🫧 ${game.title || 'Bubble Bobble'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Màn: <span id="bbRound" style="color: #38BDF8; font-weight: bold;">Round 1/5</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Mạng: <span id="bbLives" style="color: #EF4444; font-weight: bold;">❤️❤️❤️</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Chữ: <span id="bbExtend" style="color: #F59E0B; font-weight: bold;">E - X - T - E - N - D</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Điểm: <span id="bbScore" style="color: #10B981; font-weight: bold;">0</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="bbCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #020617;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 8px;">
            <button class="btn-canvas-action" id="bbLeft">◀ Trái</button>
            <button class="btn-canvas-action" id="bbRight">Phải ▶</button>
            <button class="btn-canvas-action" id="bbJump" style="background-color: #3B82F6; color: #FFF; font-weight: bold;">▲ NHẢY (W)</button>
          </div>
          <button class="btn-canvas-action" id="bbShoot" style="background-color: #10B981; color: #FFF; font-weight: 900; font-size: 15px; padding: 10px 24px;">
            🫧 THỔI BONG BÓNG (SPACE)
          </button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#bbCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    let round = 1;
    let score = 0;
    let lives = 3;
    let invulnerable = 0;
    let shotCooldown = 0;

    const player = {
      x: 80,
      y: 310,
      w: 26,
      h: 28,
      vx: 0,
      vy: 0,
      facing: 1,
      isGrounded: false
    };

    let bubbles = [];
    let enemies = [];
    let fruits = [];

    const platforms = [
      { x: 0, y: 340, w: W, h: 60 },
      { x: 80, y: 260, w: 180, h: 14 },
      { x: 380, y: 260, w: 180, h: 14 },
      { x: 200, y: 180, w: 240, h: 14 },
      { x: 100, y: 100, w: 440, h: 14 }
    ];

    function spawnEnemies(rnd) {
      enemies = [];
      bubbles = [];
      fruits = [];
      const count = 3 + rnd;
      for (let i = 0; i < count; i++) {
        enemies.push({
          x: 140 + Math.random() * (W - 280),
          y: 70 + (i % 3) * 80,
          w: 24,
          h: 24,
          vx: Math.random() < 0.5 ? -2 : 2,
          vy: 0,
          trapped: false,
          alive: true
        });
      }
      updateHUD();
    }

    spawnEnemies(round);

    const keys = {};
    bindKeys(listen, keys);

    function shootBubble() {
      if (phase !== 'playing' || shotCooldown > 0 || bubbles.length >= 24) return;
      shotCooldown = 12;
      bubbles.push({
        x: player.facing === 1 ? player.x + player.w + 4 : player.x - 18,
        y: player.y + 6,
        vx: player.facing * 5,
        vy: 0,
        radius: 12,
        life: 240,
        age: 0,
        trappedEnemy: null
      });
      playSfx('pop');
    }

    const bind = (id, k) => {
      const el = container.querySelector(id);
      bindHoldControl(listen, el, () => { keys[k] = true; }, () => { keys[k] = false; });
    };
    bind('#bbLeft', 'ArrowLeft');
    bind('#bbRight', 'ArrowRight');
    bind('#bbJump', 'ArrowUp');
    const sBtn = container.querySelector('#bbShoot');
    bindHoldControl(listen, sBtn, () => { keys.fire = true; shootBubble(); }, () => { keys.fire = false; });

    listen(window, 'keydown', e => {
      if (!isTyping(e) && !e.repeat && (e.code === 'KeyJ' || e.code === 'Space')) shootBubble();
    });

    function updateHUD() {
      const rEl = container.querySelector('#bbRound');
      if (rEl) rEl.textContent = `Round ${round}/5`;
      const lEl = container.querySelector('#bbLives');
      if (lEl) lEl.innerHTML = '❤️'.repeat(lives);
      const sEl = container.querySelector('#bbScore');
      if (sEl) sEl.textContent = score;
    }

    let animId = null;
    const ticksForFrame = fixedTicks(performance);
    function loop() {
      const ticks = ticksForFrame();
      for (let tick = 0; tick < ticks && phase === 'playing'; tick++) {
      if (invulnerable > 0) invulnerable--;
      if (shotCooldown > 0) shotCooldown--;
      if (keys.fire || keys.Space || keys.KeyJ) shootBubble();
      // Player Physics
      if (keys['ArrowLeft'] || keys['KeyA']) {
        player.vx = -3.5;
        player.facing = -1;
      } else if (keys['ArrowRight'] || keys['KeyD']) {
        player.vx = 3.5;
        player.facing = 1;
      } else {
        player.vx = 0;
      }

      if ((keys['KeyW'] || keys['ArrowUp']) && player.isGrounded) {
        player.vy = -11;
        player.isGrounded = false;
        playSfx('whoosh');
      }

      player.vy += 0.6;
      player.x += player.vx;
      player.y += player.vy;

      player.isGrounded = false;
      platforms.forEach(plat => {
        if (
          player.x + player.w > plat.x &&
          player.x < plat.x + plat.w &&
          player.y + player.h >= plat.y &&
          player.y + player.h <= plat.y + 16 &&
          player.vy >= 0
        ) {
          player.y = plat.y - player.h;
          player.vy = 0;
          player.isGrounded = true;
        }
      });

      player.x = Math.max(10, Math.min(W - player.w - 10, player.x));

      // Monsters patrol and fall onto platforms. Contact costs one life per grace period.
      for (const en of enemies) {
        if (!en.alive || en.trapped) continue;
        const previousBottom = en.y + en.h;
        en.x += en.vx;
        if (en.x < 8 || en.x > W - en.w - 8) {
          en.x = Math.max(8, Math.min(W - en.w - 8, en.x)); en.vx *= -1;
        }
        en.vy += 0.5; en.y += en.vy;
        for (const plat of platforms) {
          if (en.vy >= 0 && previousBottom <= plat.y && en.y + en.h >= plat.y && en.x + en.w > plat.x && en.x < plat.x + plat.w) {
            en.y = plat.y - en.h; en.vy = 0;
          }
        }
        if (invulnerable <= 0 && player.x + player.w > en.x && player.x < en.x + en.w && player.y + player.h > en.y && player.y < en.y + en.h) {
          lives--; invulnerable = 100;
          player.x = 35; player.y = 305; player.vy = 0;
          cameraShake.addTrauma(0.6); playSfx('hit');
          if (lives <= 0) { lives = 0; phase = 'lost'; }
        }
      }

      // Bubbles Physics & Trapping
      for (let bi = bubbles.length - 1; bi >= 0; bi--) {
        const b = bubbles[bi];
        b.age++;
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.94;
        b.vy = Math.max(-1.5, b.vy - 0.05); // Float upward

        // Trap enemy
        enemies.forEach(en => {
          if (en.alive && !en.trapped && !b.trappedEnemy) {
            if (Math.hypot(b.x - en.x, b.y - en.y) < 22) {
              en.trapped = true;
              b.trappedEnemy = en;
              playSfx('pop');
              popupMgr.add('NHỐT QUÁI! 🫧', b.x, b.y, '#38BDF8', 16);
            }
          }
        });

        // Player pop bubble with horns/feet
        if ((b.age > 8 || b.trappedEnemy) && Math.hypot(player.x + 12 - b.x, player.y + 12 - b.y) < 24) {
          if (b.trappedEnemy) {
            b.trappedEnemy.alive = false;
            score += 500;
            cameraShake.addTrauma(0.4);
            Juice.triggerHitstop(40);
            playSfx('win');
            popupMgr.add('+500 CHUỐI NGỌT! 🍌', b.x, b.y, '#FBBF24', 20);
            fruits.push({ x: b.x, y: b.y, vy: 0 });
          }
          bubbles.splice(bi, 1);
          continue;
        }

        b.life--;
        if (b.life <= 0 || b.y < -24) {
          if (b.trappedEnemy && b.trappedEnemy.alive) {
            b.trappedEnemy.trapped = false;
            b.trappedEnemy.x = Math.max(8, Math.min(W - 32, b.x - 12));
            b.trappedEnemy.y = Math.max(38, b.y - 12);
            b.trappedEnemy.vy = 0;
          }
          bubbles.splice(bi, 1);
        }
      }

      for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i];
        fruit.vy += 0.4; fruit.y = Math.min(328, fruit.y + fruit.vy);
        if (Math.hypot(player.x + player.w / 2 - fruit.x, player.y + player.h / 2 - fruit.y) < 28) {
          score += 250; fruits.splice(i, 1); playSfx('coin');
        }
      }

      // Check next round
      if (phase === 'playing' && enemies.every(en => !en.alive)) {
        if (round < 5) {
          round++;
          score += 2000;
          popupMgr.add(`QUA ROUND ${round}! 🏆`, W / 2, H / 2, '#FBBF24', 26);
          playSfx('win');
          spawnEnemies(round);
        } else {
          popupMgr.add('VƯỢT TRỌN VẸN BUBBLE BOBBLE! 👑', W / 2, H / 2, '#FBBF24', 28);
          phase = 'won'; playSfx('win');
        }
      }

      updateHUD();

      }
      // RENDER
      const offset = cameraShake.getOffset(8);
      ctx.save();
      ctx.translate(offset.x, offset.y);

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, H);

      platforms.forEach(plat => {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#10B981';
        ctx.strokeRect(plat.x, plat.y, plat.w, 4);
      });

      // Bubbles
      bubbles.forEach(b => {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.stroke();
        if (b.trappedEnemy) {
          ctx.fillStyle = '#FDBA74'; ctx.fillRect(b.x - 7, b.y - 7, 14, 14);
          ctx.fillStyle = '#334155'; ctx.fillRect(b.x - 4, b.y - 3, 3, 3); ctx.fillRect(b.x + 2, b.y - 3, 3, 3);
        }
      });

      for (const en of enemies) {
        if (!en.alive || en.trapped) continue;
        ctx.fillStyle = '#F97316';
        ctx.beginPath(); ctx.ellipse(en.x + 12, en.y + 12, 13, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FEF3C7'; ctx.fillRect(en.x + 4, en.y + 5, 6, 7); ctx.fillRect(en.x + 14, en.y + 5, 6, 7);
        ctx.fillStyle = '#263345'; ctx.fillRect(en.x + 7, en.y + 7, 3, 4); ctx.fillRect(en.x + 17, en.y + 7, 3, 4);
        ctx.fillRect(en.x + 3, en.y + 21, 7, 4); ctx.fillRect(en.x + 15, en.y + 21, 7, 4);
      }
      for (const fruit of fruits) {
        ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(fruit.x, fruit.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4ADE80'; ctx.fillRect(fruit.x, fruit.y - 13, 3, 6);
      }

      // Player Bub Dragon
      ctx.globalAlpha = invulnerable > 0 && invulnerable % 12 < 6 ? 0.45 : 1;
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(player.x + 4, player.y + 6, 8, 8);
      ctx.globalAlpha = 1;

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      ctx.restore();
      drawResult(ctx, W, H, phase, score + ' điểm · Màn ' + round + '/5');

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 10. BẮN PHAO RAFT WARS - CHIẾN DỊCH 4 MÀN, QUỸ ĐẠO PARABOL, SHOP VŨ KHÍ
  // =========================================================================
  function launchRaftWars(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup, clock: performance = window.performance } = window.NP_GameSession.start();
    const W = 640;
    const H = 400;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">🎯 ${game.title || 'Raft Wars'}</div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Trận: <span id="rwBattle" style="color: #38BDF8; font-weight: bold;">1/4 Hải Tặc Nhí</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Máu Simon: <span id="rwSimonHp" style="color: #10B981; font-weight: bold;">100%</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Địch: <span id="rwEnemyHp" style="color: #EF4444; font-weight: bold;">100%</span></div>
          <div class="hud-pill" style="font-family: Calibri, sans-serif;">Vàng: <span id="rwGold" style="color: #FBBF24; font-weight: bold;">0g</span></div>
          <div class="hud-pill">Pháo: Cấp <span id="rwCannon">1</span></div>
          <button id="rwRepair" class="btn-canvas-action">Sửa thuyền 200g</button>
          <button id="rwUpgrade" class="btn-canvas-action">Nâng cấp pháo 300g</button>
          <button id="rwRestart" class="btn-canvas-action">Chơi lại từ trận 1</button>
        </div>

        <div style="position: relative; display: flex; justify-content: center; cursor: crosshair;">
          <canvas id="rwCanvas" width="${W}" height="${H}" class="canvas-main-viewport" style="background: #38BDF8;"></canvas>
        </div>

        <div class="canvas-controls-bar">
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0; font-family: Calibri, sans-serif;">
            <strong>Cách ngắm:</strong> Kéo chuột hoặc ngón tay để chỉnh góc và lực, thả để bắn.
          </p>
          <p id="rwStatus" role="status" aria-live="polite" style="font-weight:bold;color:var(--text-main);margin:0"></p>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#rwCanvas');
    const ctx = canvas.getContext('2d');
    const cameraShake = Juice.createCameraShake();
    const popupMgr = Juice.createPopupManager();
    const particleSys = Juice.createParticleSystem();

    const BATTLES = [
      { name: '1/4 Hải Tặc Nhí', enemyCount: 2, enemyHp: 60 },
      { name: '2/4 Cướp Biển Viking', enemyCount: 2, enemyHp: 100 },
      { name: '3/4 Mafia Du Thuyền', enemyCount: 3, enemyHp: 140 },
      { name: '4/4 Trùm Tàu Ngầm', enemyCount: 1, enemyHp: 250 }
    ];

    let battleIdx = 0;
    let gold = 0;
    let cannonLevel = 1;
    let simonHp = 100;
    let enemyHp = 60;
    let turn = 'player'; // player, enemy, won, lost
    let lastFrameTime = 0;

    let isAiming = false;
    let aimAngle = Math.PI / 4;
    let aimPower = 12;
    let projectile = null;
    let aimPointer = null;

    function updateAim(e) {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      const dx = mx - 100;
      const dy = 280 - my;
      aimAngle = Math.max(0.1, Math.min(Math.PI * 0.48, Math.atan2(dy, Math.max(1, dx))));
      aimPower = Math.max(7, Math.min(20, Math.hypot(dx, dy) * 0.12));
    }
    function cancelAim() { isAiming = false; aimPointer = null; }
    canvas.style.touchAction = 'none';
    listen(canvas, 'pointerdown', e => {
      if (e.button > 0 || turn !== 'player' || projectile || aimPointer !== null) return;
      e.preventDefault();
      isAiming = true;
      aimPointer = e.pointerId === undefined ? 'primary' : e.pointerId;
      updateAim(e);
      if (canvas.setPointerCapture && e.pointerId !== undefined) {
        try { canvas.setPointerCapture(e.pointerId); } catch (error) {}
      }
    });
    listen(canvas, 'pointermove', e => {
      if (!isAiming || aimPointer !== (e.pointerId === undefined ? 'primary' : e.pointerId)) return;
      e.preventDefault();
      updateAim(e);
    });
    listen(canvas, 'pointerup', e => {
      if (!isAiming || aimPointer !== (e.pointerId === undefined ? 'primary' : e.pointerId)) return;
      e.preventDefault();
      updateAim(e);
      cancelAim();
      firePlayer();
    });
    listen(canvas, 'pointercancel', cancelAim);
    listen(canvas, 'lostpointercapture', cancelAim);
    listen(window, 'blur', cancelAim);
    listen(container.querySelector('#rwRepair'), 'click', () => {
      if (turn !== 'player' || gold < 200 || simonHp >= 100) return;
      gold -= 200;
      simonHp = Math.min(100, simonHp + 40);
      playSfx('win');
      const status = container.querySelector('#rwStatus');
      if (status) status.textContent = 'Đã sửa thuyền, hồi 40 máu.';
      updateHUD();
    });
    listen(container.querySelector('#rwUpgrade'), 'click', () => {
      if (turn !== 'player' || gold < 300 || cannonLevel >= 5) return;
      gold -= 300;
      cannonLevel++;
      playSfx('win');
      const status = container.querySelector('#rwStatus');
      if (status) status.textContent = 'Nâng cấp pháo lên cấp ' + cannonLevel + '!';
      updateHUD();
    });
    listen(container.querySelector('#rwRestart'), 'click', () => {
      battleIdx = 0;
      gold = 0;
      cannonLevel = 1;
      simonHp = 100;
      enemyHp = BATTLES[0].enemyHp;
      projectile = null;
      cancelAim();
      aimAngle = Math.PI / 4;
      aimPower = 12;
      turn = 'player';
      const status = container.querySelector('#rwStatus');
      if (status) status.textContent = 'Trận mới bắt đầu. Chạm hoặc kéo để ngắm.';
      updateHUD();
    });

    function firePlayer() {
      if (turn !== 'player' || projectile) return;
      projectile = {
        x: 100,
        y: 280,
        vx: Math.cos(aimAngle) * aimPower,
        vy: -Math.sin(aimAngle) * aimPower,
        isEnemy: false
      };
      playSfx('whoosh');
    }

    function fireEnemy() {
      if (turn !== 'enemy' || projectile) return;
      const targetX = 100;
      const dist = W - 180 - targetX;
      projectile = {
        x: W - 140,
        y: 280,
        vx: -10 - Math.random() * 4,
        vy: -8 - Math.random() * 5,
        isEnemy: true
      };
      playSfx('whoosh');
    }

    function updateHUD() {
      const setText = (selector, value) => {
        const el = container.querySelector(selector);
        if (el && el.textContent !== value) el.textContent = value;
      };
      setText('#rwBattle', BATTLES[battleIdx].name);
      setText('#rwSimonHp', Math.max(0, simonHp) + '%');
      setText('#rwEnemyHp', Math.max(0, enemyHp) + '%');
      setText('#rwGold', gold + 'g');
      setText('#rwCannon', String(cannonLevel));
      const repair = container.querySelector('#rwRepair');
      if (repair) repair.disabled = gold < 200 || simonHp >= 100 || turn !== 'player';
      const upgrade = container.querySelector('#rwUpgrade');
      if (upgrade) upgrade.disabled = gold < 300 || cannonLevel >= 5 || turn !== 'player';
    }

    let animId = null;
    function loop(timestamp) {
      const dt = lastFrameTime ? Math.min(2, Math.max(0, (timestamp - lastFrameTime) / (1000 / 60))) : 1;
      lastFrameTime = timestamp || 0;
      // Projectile physics is proportional to elapsed time, not screen refresh rate.
      if (projectile && (turn === 'player' || turn === 'enemy')) {
        projectile.vy += 0.35 * dt;
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;

        // Splash into water
        if (projectile.y > 330) {
          cameraShake.addTrauma(0.3);
          playSfx('pop');
          particleSys.spawn(projectile.x, 330, 20, { colors: ['#38BDF8', '#FFF'], speed: 4 });
          projectile = null;
          turn = turn === 'player' ? 'enemy' : 'player';
          if (turn === 'enemy') setTimeout(fireEnemy, 1000);
        } else {
          // Hit checks
          if (!projectile.isEnemy && projectile.x > W - 160 && projectile.y > 250) {
            enemyHp -= 40 + (cannonLevel - 1) * 10;
            gold += 150;
            cameraShake.addTrauma(0.7);
            Juice.triggerHitstop(50);
            playSfx('hit');
            popupMgr.add('TRÚNG ĐÍCH! 🎯💥', projectile.x, projectile.y - 20, '#FBBF24', 22);
            projectile = null;

            if (enemyHp <= 0) {
              playSfx('win');
              if (battleIdx < BATTLES.length - 1) {
                battleIdx++;
                enemyHp = BATTLES[battleIdx].enemyHp;
                simonHp = Math.min(100, simonHp + 15);
                turn = 'player';
                const status = container.querySelector('#rwStatus');
                if (status) status.textContent = 'Thắng trận! Bắt đầu ' + BATTLES[battleIdx].name + '.';
                popupMgr.add('THẮNG TRẬN! TIẾN VÀO ' + BATTLES[battleIdx].name + '!', W / 2, H / 2, '#FBBF24', 24);
              } else {
                turn = 'won';
                const status = container.querySelector('#rwStatus');
                if (status) status.textContent = 'Hoàn thành cả 4 trận! Bấm Chơi lại để bắt đầu giải đấu mới.';
                popupMgr.add('CHIẾN THẮNG TRỌN BỘ RAFT WARS!', W / 2, H / 2, '#FBBF24', 28);
              }
            } else {
              turn = 'enemy';
              setTimeout(fireEnemy, 1000);
            }
          } else if (projectile.isEnemy && projectile.x < 120 && projectile.y > 250) {
            simonHp = Math.max(0, simonHp - (25 + battleIdx * 3));
            cameraShake.addTrauma(0.6);
            playSfx('hit');
            projectile = null;
            if (simonHp <= 0) {
              turn = 'lost';
              const status = container.querySelector('#rwStatus');
              if (status) status.textContent = 'Thất bại. Bấm Chơi lại từ trận 1 để thử lại.';
            } else {
              turn = 'player';
            }
          }
        }
      }

      updateHUD();

      // RENDER
      const offset = cameraShake.getOffset(8);
      ctx.save();
      ctx.translate(offset.x, offset.y);

      // Sea & Sky
      ctx.fillStyle = '#60A5FA';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(0, 320, W, 80);

      // Player Inflatable Raft
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(60, 290, 80, 24);
      ctx.fillStyle = '#FEF08A'; // Baby Simon
      ctx.beginPath();
      ctx.arc(100, 280, 12, 0, Math.PI * 2);
      ctx.fill();

      // Enemy Boat / Raft
      ctx.fillStyle = '#78350F';
      ctx.fillRect(W - 160, 290, 90, 24);
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(W - 120, 280, 12, 0, Math.PI * 2);
      ctx.fill();

      // Aim Line Arc
      if (isAiming) {
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 280);
        ctx.lineTo(100 + Math.cos(aimAngle) * aimPower * 6, 280 - Math.sin(aimAngle) * aimPower * 6);
        ctx.stroke();
      }

      // Projectile
      if (projectile) {
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      particleSys.updateAndDraw(ctx);
      popupMgr.updateAndDraw(ctx);
      if (turn === 'won' || turn === 'lost') {
        ctx.fillStyle = 'rgba(15,23,42,0.82)';
        ctx.fillRect(90, 148, 460, 95);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 26px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(turn === 'won' ? 'CHIẾN THẮNG!' : 'THẤT BẠI', W / 2, 202);
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // UNIVERSAL RETRO 50 ENGINE DISPATCHER & REGISTRY
  // =========================================================================
  const Retro50Engines = {
    hasGame(id) {
      const g = (id || '').toLowerCase();
      return (
        g.includes('boom-online') ||
        g.includes('audition') ||
        g.includes('road-rash') ||
        g.includes('rockman') || g.includes('mega-man') ||
        g.includes('duck-hunt') ||
        g.includes('street-fighter') ||
        g.includes('bloxorz') ||
        g.includes('age-of-war') ||
        g.includes('bubble-bobble') ||
        g.includes('raft-wars')
      );
    },

    launchGame(container, game) {
      const g = (game.id || '').toLowerCase();
      if (g.includes('boom-online')) launchBoomOnline(container, game);
      else if (g.includes('audition')) launchAudition(container, game);
      else if (g.includes('road-rash')) launchRoadRash(container, game);
      else if (g.includes('rockman') || g.includes('mega-man')) launchMegaMan(container, game);
      else if (g.includes('duck-hunt')) launchDuckHunt(container, game);
      else if (g.includes('street-fighter')) launchStreetFighter(container, game);
      else if (g.includes('bloxorz')) launchBloxorz(container, game);
      else if (g.includes('age-of-war')) launchAgeOfWar(container, game);
      else if (g.includes('bubble-bobble')) launchBubbleBobble(container, game);
      else if (g.includes('raft-wars')) launchRaftWars(container, game);
      else {
        if (window.NP_Engines && typeof window.NP_Engines.launchRetroArcade === 'function') {
          window.NP_Engines.launchRetroArcade(container, game);
        }
      }
    }
  };

  // Expose to window
  window.NP_Retro50Engines = Retro50Engines;
  if (!window.NP_Engines) window.NP_Engines = {};
  window.NP_Engines.launchBoomOnline = launchBoomOnline;
  window.NP_Engines.launchAudition = launchAudition;
  window.NP_Engines.launchRoadRash = launchRoadRash;
  window.NP_Engines.launchMegaMan = launchMegaMan;
  window.NP_Engines.launchDuckHunt = launchDuckHunt;
  window.NP_Engines.launchStreetFighter = launchStreetFighter;
  window.NP_Engines.launchBloxorz = launchBloxorz;
  window.NP_Engines.launchAgeOfWar = launchAgeOfWar;
  window.NP_Engines.launchBubbleBobble = launchBubbleBobble;
  window.NP_Engines.launchRaftWars = launchRaftWars;

})();

