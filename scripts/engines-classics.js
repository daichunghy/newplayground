/**
 * NEWPLAYGROUND CLASSIC ENGINES SUITE
 * Classic and original game engines using the shared browser runtime.
 */

(function () {
  'use strict';

  const AudioEngine = window.NP_AudioEngine || {
    playTone() {},
    coin() {},
    pop() {},
    win() {},
    explosion() {},
    alarm() {},
    laser() {},
    hit() {},
    match() {}
  };

  // Ensure NP_Engines exists
  window.NP_Engines = window.NP_Engines || {};

  // =========================================================================
  // 1. ENGINE: LỐI SÁNG (ORIGINAL MAZE CHASE)
  // =========================================================================
  function launchPacMan(container, game) {
    return window.NP_MazeChase.mount(container, window.NP_GameSession.start(), AudioEngine);
  }

  // Legacy platformer engine follows.
  function launchMario(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let score = 0;
    let coins = 0;
    let lives = 3;
    let animId = null;

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('mario');
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="font-family: Calibri, 'Segoe UI', sans-serif;">
        <div class="canvas-game-hud">
          <div class="hud-pill">Mạng: <span id="mrLives" style="color: #EF4444;">❤️❤️❤️</span></div>
          <div class="hud-pill">Xu: <span id="mrCoins" style="color: #F59E0B;">0</span></div>
          <div class="hud-pill">Điểm: <span id="mrScore" style="color: #10B981;">0</span></div>
          <div class="hud-pill">Màn: <span id="mrStage" style="color: #38BDF8;">1-1</span></div>
        </div>
        <canvas id="mrCanvas" width="480" height="320" class="canvas-main-viewport" style="background: #5c94fc; display: block; margin: 0 auto;"></canvas>
        <div class="canvas-controls-bar" style="font-family: Calibri, sans-serif;">
          <small style="color: #FFF;">🍄 [A][D] hoặc Phím mũi tên: Di chuyển • [W] / [Space] / Nút Nhảy: Nhảy đạp quái</small>
        </div>
        <div class="virtual-dpad-row" style="margin-top: 8px;">
          <button class="v-btn" id="mrLeft">◀ Trái</button>
          <button class="v-btn" id="mrRight">Phải ▶</button>
          <button class="v-btn" id="mrJump" style="background: #DC2626; color: #FFF; width: 110px; border-color: #EF4444;">⬆️ NHẢY</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#mrCanvas');
    const ctx = canvas.getContext('2d');

    let cameraX = 0;
    let screenShake = 0;
    let player = {
      x: 40,
      y: 200,
      w: 18,
      h: 26,
      vx: 0,
      vy: 0,
      grounded: false,
      facing: 1, // 1: right, -1: left
      scaleX: 1,
      scaleY: 1
    };

    // Platformer Game Feel Enhancers
    let jumpBuffer = 0;   // Frames user input is remembered before landing
    let coyoteTimer = 0;  // Frames user can jump after running off a ledge
    let isJumpHeld = false;

    // Level elements: blocks (x, y, w, h, type: 'ground'|'brick'|'question'|'pipe', hit: bool, bumpY: number)
    let blocks = [];
    let enemies = [];
    let particles = [];
    let bouncingCoins = [];
    let flagpole = { x: 1800, y: 60, h: 200 };

    function initLevel() {
      cameraX = 0;
      screenShake = 0;
      player.x = 40;
      player.y = 200;
      player.vx = 0;
      player.vy = 0;
      player.grounded = false;
      player.scaleX = 1;
      player.scaleY = 1;
      jumpBuffer = 0;
      coyoteTimer = 0;
      blocks = [];
      enemies = [];
      particles = [];
      bouncingCoins = [];

      // Ground segments
      blocks.push({ x: 0, y: 260, w: 700, h: 60, type: 'ground', bumpY: 0 });
      blocks.push({ x: 760, y: 260, w: 500, h: 60, type: 'ground', bumpY: 0 });
      blocks.push({ x: 1320, y: 260, w: 700, h: 60, type: 'ground', bumpY: 0 });

      // Pipes
      blocks.push({ x: 260, y: 220, w: 36, h: 40, type: 'pipe', bumpY: 0 });
      blocks.push({ x: 440, y: 200, w: 36, h: 60, type: 'pipe', bumpY: 0 });
      blocks.push({ x: 960, y: 210, w: 36, h: 50, type: 'pipe', bumpY: 0 });

      // Question & Brick blocks
      blocks.push({ x: 160, y: 170, w: 24, h: 24, type: 'question', coins: 1, bumpY: 0 });
      blocks.push({ x: 184, y: 170, w: 24, h: 24, type: 'brick', bumpY: 0 });
      blocks.push({ x: 208, y: 170, w: 24, h: 24, type: 'question', coins: 1, bumpY: 0 });
      blocks.push({ x: 232, y: 170, w: 24, h: 24, type: 'brick', bumpY: 0 });

      blocks.push({ x: 550, y: 170, w: 24, h: 24, type: 'brick', bumpY: 0 });
      blocks.push({ x: 574, y: 170, w: 24, h: 24, type: 'question', coins: 1, bumpY: 0 });
      blocks.push({ x: 598, y: 170, w: 24, h: 24, type: 'brick', bumpY: 0 });

      // Enemies (Goombas)
      enemies = [
        { x: 340, y: 242, w: 18, h: 18, vx: -1, alive: true, squashedTimer: 0 },
        { x: 500, y: 242, w: 18, h: 18, vx: -1, alive: true, squashedTimer: 0 },
        { x: 820, y: 242, w: 18, h: 18, vx: -1, alive: true, squashedTimer: 0 },
        { x: 1100, y: 242, w: 18, h: 18, vx: -1, alive: true, squashedTimer: 0 },
        { x: 1500, y: 242, w: 18, h: 18, vx: -1, alive: true, squashedTimer: 0 }
      ];
    }

    const keys = {};
    const keyHandlerDown = (e) => {
      keys[e.key] = true;
      if ([' ', 'Space', 'ArrowUp', 'w', 'W'].includes(e.key)) {
        jumpBuffer = 7;
        isJumpHeld = true;
        e.preventDefault();
      }
    };
    const keyHandlerUp = (e) => {
      keys[e.key] = false;
      if ([' ', 'Space', 'ArrowUp', 'w', 'W'].includes(e.key)) {
        isJumpHeld = false;
      }
    };
    listen(window, 'keydown', keyHandlerDown);
    listen(window, 'keyup', keyHandlerUp);

    // Touch Controls
    container.querySelector('#mrLeft')?.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowLeft'] = true; });
    container.querySelector('#mrLeft')?.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; });
    container.querySelector('#mrRight')?.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowRight'] = true; });
    container.querySelector('#mrRight')?.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowRight'] = false; });

    container.querySelector('#mrJump')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      jumpBuffer = 7;
      isJumpHeld = true;
    });
    container.querySelector('#mrJump')?.addEventListener('touchend', (e) => {
      e.preventDefault();
      isJumpHeld = false;
    });
    container.querySelector('#mrJump')?.addEventListener('mousedown', () => {
      jumpBuffer = 7;
      isJumpHeld = true;
    });
    listen(window, 'mouseup', () => { isJumpHeld = false; });

    function update() {
      // Horizontal Momentum
      const leftPressed = keys['ArrowLeft'] || keys['a'] || keys['A'];
      const rightPressed = keys['ArrowRight'] || keys['d'] || keys['D'];

      if (leftPressed) {
        player.vx = Math.max(-3.6, player.vx - 0.45);
        player.facing = -1;
      } else if (rightPressed) {
        player.vx = Math.min(3.6, player.vx + 0.45);
        player.facing = 1;
      } else {
        player.vx *= 0.8;
        if (Math.abs(player.vx) < 0.15) player.vx = 0;
      }

      // Coyote Time Tracker
      if (player.grounded) {
        coyoteTimer = 6;
      } else if (coyoteTimer > 0) {
        coyoteTimer--;
      }

      // Jump Execution via Buffer & Coyote Time
      if (jumpBuffer > 0) {
        jumpBuffer--;
        if (player.grounded || coyoteTimer > 0) {
          player.vy = -10.5;
          player.grounded = false;
          coyoteTimer = 0;
          jumpBuffer = 0;
          player.scaleX = 0.8;
          player.scaleY = 1.3; // Elastic stretch
          AudioEngine.pop();
        }
      }

      // Variable Jump Height
      if (!isJumpHeld && player.vy < -3.5) {
        player.vy = -3.5;
      }

      // Gravity
      player.vy += 0.52;
      if (player.vy > 10.5) player.vy = 10.5;

      // Elastic squash recovery
      player.scaleX += (1 - player.scaleX) * 0.18;
      player.scaleY += (1 - player.scaleY) * 0.18;

      // X Movement & Collision
      player.x += player.vx;
      blocks.forEach(b => {
        if (player.x < b.x + b.w && player.x + player.w > b.x &&
            player.y < b.y + b.h && player.y + player.h > b.y) {
          if (player.vx > 0) player.x = b.x - player.w;
          else if (player.vx < 0) player.x = b.x + b.w;
        }
      });

      // Y Movement & Collision
      player.y += player.vy;
      const wasGrounded = player.grounded;
      player.grounded = false;

      blocks.forEach(b => {
        // Recover bump
        if (b.bumpY) b.bumpY *= 0.65;

        if (player.x < b.x + b.w && player.x + player.w > b.x &&
            player.y < b.y + b.h && player.y + player.h > b.y) {
          if (player.vy > 0) {
            // Landing on top
            player.y = b.y - player.h;
            player.vy = 0;
            player.grounded = true;
            if (!wasGrounded) {
              // Squash on land
              player.scaleX = 1.25;
              player.scaleY = 0.8;
            }
          } else if (player.vy < 0) {
            // Hit block from below!
            player.y = b.y + b.h;
            player.vy = 0;
            b.bumpY = -8; // Block springs up

            if (b.type === 'question' && b.coins > 0) {
              b.coins--;
              b.hit = true;
              coins++;
              score += 200;
              AudioEngine.coin();

              // Bouncing spinning coin
              bouncingCoins.push({
                x: b.x + 8,
                y: b.y - 12,
                vy: -6.5,
                rot: 0
              });

              particles.push({
                x: b.x + 12,
                y: b.y - 20,
                vy: -2,
                text: '+200'
              });
            } else if (b.type === 'brick') {
              AudioEngine.hit();
              particles.push({
                x: b.x + 12,
                y: b.y - 14,
                vy: -2,
                text: '💥'
              });
            }
          }
        }
      });

      // Pit death
      if (player.y > canvas.height + 50) {
        lives--;
        screenShake = 12;
        AudioEngine.explosion();
        if (lives <= 0) {
          lives = 3;
          score = 0;
          coins = 0;
        }
        initLevel();
        return;
      }

      // Camera follows player
      cameraX = Math.max(0, player.x - 160);

      // Bouncing coins update
      for (let i = bouncingCoins.length - 1; i >= 0; i--) {
        const c = bouncingCoins[i];
        c.y += c.vy;
        c.vy += 0.4;
        c.rot += 0.25;
        if (c.vy > 3) {
          bouncingCoins.splice(i, 1);
        }
      }

      // Enemies
      enemies.forEach(e => {
        if (!e.alive) {
          if (e.squashedTimer > 0) e.squashedTimer--;
          return;
        }

        e.x += e.vx;
        blocks.forEach(b => {
          if (e.x < b.x + b.w && e.x + e.w > b.x && e.y < b.y + b.h && e.y + e.h > b.y) {
            e.vx = -e.vx;
          }
        });

        // Mario stomping enemy
        if (player.x < e.x + e.w && player.x + player.w > e.x &&
            player.y < e.y + e.h && player.y + player.h > e.y) {
          const isStomp = player.vy > 0 && (player.y + player.h - player.vy <= e.y + 14 || player.y + player.h <= e.y + e.h * 0.72);
          if (isStomp) {
            // Stomped!
            e.alive = false;
            e.squashedTimer = 15;
            player.vy = isJumpHeld ? -9.5 : -6.5; // High bounce if holding jump
            player.scaleX = 0.85;
            player.scaleY = 1.25;
            score += 100;
            screenShake = 3;
            if (window.NP_Juice) {
              window.NP_Juice.triggerHitstop(35);
              window.NP_Juice.vibrate(18);
            }
            AudioEngine.match(1);
            particles.push({ x: e.x + 9, y: e.y - 10, vy: -2, text: '+100' });
          } else {
            // Player hit!
            lives--;
            screenShake = 10;
            if (window.NP_Juice) window.NP_Juice.vibrate([30, 60]);
            AudioEngine.explosion();
            if (lives <= 0) {
              lives = 3;
              score = 0;
              coins = 0;
            }
            initLevel();
          }
        }
      });

      // Win flagpole
      if (player.x >= flagpole.x) {
        AudioEngine.win();
        score += 1000;
        particles.push({ x: flagpole.x, y: 100, vy: -2, text: 'STAGE CLEAR! +1000' });
        setTimeout(() => initLevel(), 800);
      }

      // Floating text particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].y += particles[i].vy;
        particles[i].vy += 0.08;
        if (particles[i].y < -20 || particles[i].vy > 2) particles.splice(i, 1);
      }

      // Update HUD
      const lEl = container.querySelector('#mrLives');
      const cEl = container.querySelector('#mrCoins');
      const sEl = container.querySelector('#mrScore');
      if (lEl) lEl.textContent = '❤️'.repeat(Math.max(0, lives));
      if (cEl) cEl.textContent = coins;
      if (sEl) sEl.textContent = score;
    }

    function draw() {
      ctx.fillStyle = '#5c94fc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Screen shake translation
      if (screenShake > 0) {
        const ox = (Math.random() - 0.5) * screenShake;
        const oy = (Math.random() - 0.5) * screenShake;
        ctx.translate(ox, oy);
        screenShake *= 0.85;
        if (screenShake < 0.2) screenShake = 0;
      }

      ctx.translate(-cameraX, 0);

      // Clouds & Hills
      ctx.fillStyle = '#FFFFFF';
      [100, 350, 700, 1100, 1500].forEach(cx => {
        ctx.beginPath();
        ctx.arc(cx, 70, 24, 0, Math.PI * 2);
        ctx.arc(cx + 24, 65, 30, 0, Math.PI * 2);
        ctx.arc(cx + 48, 70, 22, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#22C55E';
      [60, 480, 880, 1300].forEach(hx => {
        ctx.beginPath();
        ctx.arc(hx, 260, 80, Math.PI, 0, false);
        ctx.fill();
      });

      // Blocks
      blocks.forEach(b => {
        const by = b.y + (b.bumpY || 0);

        if (b.type === 'ground') {
          ctx.fillStyle = '#D97706';
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.fillStyle = '#16A34A';
          ctx.fillRect(b.x, by, b.w, 8);
        } else if (b.type === 'pipe') {
          ctx.fillStyle = '#22C55E';
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.strokeStyle = '#15803D';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, by, b.w, b.h);
          ctx.fillRect(b.x - 3, by, b.w + 6, 12);
          ctx.strokeRect(b.x - 3, by, b.w + 6, 12);
        } else if (b.type === 'question') {
          ctx.fillStyle = b.hit ? '#9CA3AF' : '#F59E0B';
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.strokeStyle = '#78350F';
          ctx.strokeRect(b.x, by, b.w, b.h);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 14px Calibri, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.hit ? '•' : '?', b.x + 12, by + 17);
        } else if (b.type === 'brick') {
          ctx.fillStyle = '#B45309';
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.strokeStyle = '#451A03';
          ctx.strokeRect(b.x, by, b.w, b.h);
        }
      });

      // Bouncing gold coins from question blocks
      bouncingCoins.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6 * Math.abs(Math.cos(c.rot)), 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3 * Math.abs(Math.cos(c.rot)), 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Flagpole
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(flagpole.x, flagpole.y, 6, flagpole.h);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(flagpole.x, flagpole.y + 10);
      ctx.lineTo(flagpole.x - 24, flagpole.y + 20);
      ctx.lineTo(flagpole.x, flagpole.y + 30);
      ctx.fill();

      // Enemies (Goombas)
      enemies.forEach(e => {
        if (!e.alive && e.squashedTimer <= 0) return;

        if (!e.alive && e.squashedTimer > 0) {
          // Flattened Goomba
          ctx.fillStyle = '#92400E';
          ctx.fillRect(e.x + 2, e.y + 12, 14, 6);
          return;
        }

        ctx.fillStyle = '#92400E';
        ctx.beginPath();
        ctx.arc(e.x + 9, e.y + 9, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(e.x + 3, e.y + 5, 4, 6);
        ctx.fillRect(e.x + 11, e.y + 5, 4, 6);
        // Eyeballs
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 4, e.y + 7, 2, 4);
        ctx.fillRect(e.x + 12, e.y + 7, 2, 4);
      });

      // Mario Player with Squash & Stretch
      ctx.save();
      ctx.translate(player.x + player.w / 2, player.y + player.h);
      ctx.scale(player.scaleX, player.scaleY);

      // Red overalls
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(-player.w / 2, -player.h, player.w, player.h - 8);
      // Blue shirt
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(-player.w / 2 + 2, -player.h + 8, player.w - 4, player.h - 14);
      // Face
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(player.facing < 0 ? -player.w / 2 : player.w / 2 - 8, -player.h + 2, 8, 8);
      // Hat
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(player.facing < 0 ? -player.w / 2 : player.w / 2 - 12, -player.h - 2, 12, 4);
      ctx.restore();

      // Floating text particles (Font Calibri)
      particles.forEach(p => {
        ctx.fillStyle = '#FDE047';
        ctx.font = 'bold 13px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      });

      ctx.restore();
    }

    function loop() {
      update();
      draw();
      animId = requestAnimationFrame(loop);
    }

    initLevel();
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') {
        window.NP_Audio.stopBGM();
      }
    });
  }

  // =========================================================================
  // 3. ENGINE: GIÓ NGANG (ORIGINAL COORDINATE ARTILLERY)
  // =========================================================================
  function launchGunny(container, game) {
    if (window.NP_WindDuel && window.NP_GameSession) {
      return window.NP_WindDuel.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
    }
    container.innerHTML = '<p class="np-game-sr" role="status">Gió Ngang chưa sẵn sàng.</p>';
  }

  function launchNongTrai(container, game) {
    if (window.NP_SunGarden && window.NP_GameSession) {
      return window.NP_SunGarden.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
    }
    container.innerHTML = '<p class="np-game-sr" role="status">Vườn Nắng chưa sẵn sàng.</p>';
  }

  function launchFeedingFrenzy(container, game) {
    if (window.NP_FeedingFrenzy && window.NP_GameSession) {
      return window.NP_FeedingFrenzy.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
    }
    container.innerHTML = '<p class="np-game-sr" role="status">Cá Lớn Nuốt Cá Bé chưa sẵn sàng.</p>';
  }

  function launchPvZ(container, game) {
    const engine = window.NP_BeaconShore;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Bờ Kè Sao chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start());
  }

  // =========================================================================
  // 7. ENGINE: BẮN GÀ VŨ TRỤ (CHICKEN INVADERS / GALAGA RETRO ENGINE)
  // =========================================================================
  function launchChickenInvaders(container, game) {
    if (window.NP_BanGaVuTru && window.NP_GameSession) {
      return window.NP_BanGaVuTru.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
    }
    container.innerHTML = '<p class="np-game-sr" role="status">Tuyến Sáng chưa sẵn sàng.</p>';
  }

  function launchGame2048(container, game) {
    const session = window.NP_GameSession.start();
    window.NP_2048.mount(container, session, AudioEngine);
  }

  // =========================================================================
  // 9. ENGINE: PHÁ GẠCH DX-BALL & ARKANOID (CLASSIC BRICK BREAKER)
  // =========================================================================
  function launchDXBall(container, game) {
    if (window.NP_DxBall && window.NP_GameSession) {
      return window.NP_DxBall.mount(container, window.NP_GameSession.start(), AudioEngine);
    }
    container.innerHTML = '<p class="np-game-sr" role="status">Phá Gạch chưa sẵn sàng.</p>';
  }

  function launchSokoban(container, game) {
    if (window.NP_DayThungSokoban && window.NP_GameSession) {
      return window.NP_DayThungSokoban.mount(container, { session: window.NP_GameSession.start() });
    }
    container.innerHTML = '<p class="np-game-sr" role="status">Đẩy Thùng chưa sẵn sàng.</p>';
  }

  function launchOAnQuan(container, game) {
    const engine = window.NP_OAnQuan;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Ô Ăn Quan chưa sẵn sàng.';
      return;
    }
    const session = window.NP_GameSession.start();
    return engine.mount(container, { session });
  }

  // =========================================================================
  // ENGINE: BỂ SAO (ORIGINAL AQUARIUM CARE AND DEFENSE)
  // =========================================================================
  function launchNuoiCaNemo(container, game) {
    if (window.NP_SeaGarden && window.NP_GameSession) {
      return window.NP_SeaGarden.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
    }
    container.innerHTML = '<p class="np-game-sr" role="status">Bể Sao chưa sẵn sàng.</p>';
  }

  function launchPong(container, game) {
    if (window.NP_Pong1972 && window.NP_GameSession) {
      return window.NP_Pong1972.mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
    }
    container.innerHTML = '<p class="np-game-sr" role="status">Bóng Bàn Cổ Điển chưa sẵn sàng.</p>';
  }

  // =========================================================================
  // EXPORT TO NP_ENGINES
  // =========================================================================
  window.NP_Engines.launchPacMan = launchPacMan;
  window.NP_Engines.launchMario = launchMario;
  window.NP_Engines.launchGunny = launchGunny;
  window.NP_Engines.launchNongTrai = launchNongTrai;
  window.NP_Engines.launchFeedingFrenzy = launchFeedingFrenzy;
  window.NP_Engines.launchPvZ = launchPvZ;
  window.NP_Engines.launchChickenInvaders = launchChickenInvaders;
  window.NP_Engines.launchGame2048 = launchGame2048;
  window.NP_Engines.launchDXBall = launchDXBall;
  window.NP_Engines.launchSokoban = launchSokoban;
  window.NP_Engines.launchOAnQuan = launchOAnQuan;
  window.NP_Engines.launchNuoiCaNemo = launchNuoiCaNemo;
  window.NP_Engines.launchPong = launchPong;

})();
