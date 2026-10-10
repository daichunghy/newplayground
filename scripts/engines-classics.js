/**
 * NEWPLAYGROUND CLASSIC ENGINES SUITE
 * Authentic Retro Remakes: Pac-Man, Mario, Contra, Gunny, Nông Trại Vui Vẻ,
 * Nuôi Cá Nemo, Feeding Frenzy, Plants vs Zombies, Chicken Invaders, DX-Ball,
 * Zuma, 2048, Sokoban, Ô Ăn Quan, Cờ Tướng, Diner Dash, Bắn Bi Ve, Pong.
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
  // 1. ENGINE: PAC-MAN ĂN ĐẬU (NAMCO 1980 AUTHENTIC MAZE)
  // =========================================================================
  function launchPacMan(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let score = 0;
    let lives = 3;
    let level = 1;
    let pelletsLeft = 0;
    let animId = null;
    let frightenedTimer = 0;
    let mouthAngle = 0.2;
    let mouthDir = 0.03;

    // Maze grid: 0=empty, 1=wall, 2=dot, 3=power pellet, 4=ghost house
    const rawMaze = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
      [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
      [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
      [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
      [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
      [0,0,0,1,2,1,0,0,0,4,0,0,0,1,2,1,0,0,0],
      [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
      [0,0,0,0,2,0,0,1,4,4,4,1,0,0,2,0,0,0,0],
      [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
      [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
      [1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
      [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
      [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
      [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    let maze = [];
    const rows = rawMaze.length;
    const cols = rawMaze[0].length;
    const tileSize = 20;

    // Entities
    let pacman = { x: 9, y: 14, px: 9 * tileSize + 10, py: 14 * tileSize + 10, dirX: 0, dirY: 0, nextDirX: 0, nextDirY: 0, speed: 2 };
    let ghosts = [];

    function initMaze() {
      maze = JSON.parse(JSON.stringify(rawMaze));
      pelletsLeft = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (maze[r][c] === 2 || maze[r][c] === 3) pelletsLeft++;
        }
      }
      resetPositions();
    }

    function resetPositions() {
      pacman = { x: 9, y: 14, px: 9 * tileSize + 10, py: 14 * tileSize + 10, dirX: -1, dirY: 0, nextDirX: -1, nextDirY: 0, speed: 2 };
      ghosts = [
        { name: 'Blinky', color: '#EF4444', x: 9, y: 7, px: 9 * tileSize + 10, py: 7 * tileSize + 10, dirX: 1, dirY: 0, speed: 1.6 + level * 0.15 },
        { name: 'Pinky', color: '#F472B6', x: 8, y: 10, px: 8 * tileSize + 10, py: 10 * tileSize + 10, dirX: 0, dirY: -1, speed: 1.5 + level * 0.15 },
        { name: 'Inky', color: '#38BDF8', x: 9, y: 10, px: 9 * tileSize + 10, py: 10 * tileSize + 10, dirX: 0, dirY: -1, speed: 1.4 + level * 0.15 },
        { name: 'Clyde', color: '#FB923C', x: 10, y: 10, px: 10 * tileSize + 10, py: 10 * tileSize + 10, dirX: 0, dirY: -1, speed: 1.3 + level * 0.15 }
      ];
    }

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill">Mạng: <span id="pmLives" style="color: #EF4444;">❤️❤️❤️</span></div>
          <div class="hud-pill">Điểm: <span id="pmScore" style="color: #FBBF24;">0</span></div>
          <div class="hud-pill">Màn: <span id="pmLevel" style="color: #38BDF8;">1</span></div>
          <div class="hud-pill">Đậu còn: <span id="pmPellets" style="color: #10B981;">0</span></div>
        </div>
        <canvas id="pmCanvas" width="${cols * tileSize}" height="${rows * tileSize}" class="canvas-main-viewport" style="background: #000; display: block; margin: 0 auto;"></canvas>
        <div class="canvas-controls-bar">
          <small style="color: #FFF;">Dùng phím Mũi tên / WASD hoặc phím ảo dưới để di chuyển</small>
        </div>
        <div class="virtual-dpad-row" style="display: flex; justify-content: center; gap: 8px; margin-top: 8px;">
          <button class="v-btn" id="pmUp">▲</button>
        </div>
        <div class="virtual-dpad-row" style="display: flex; justify-content: center; gap: 8px; margin-top: 4px;">
          <button class="v-btn" id="pmLeft">◀</button>
          <button class="v-btn" id="pmDown">▼</button>
          <button class="v-btn" id="pmRight">▶</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#pmCanvas');
    const ctx = canvas.getContext('2d');

    function updateHUD() {
      const lEl = container.querySelector('#pmLives');
      const sEl = container.querySelector('#pmScore');
      const lvlEl = container.querySelector('#pmLevel');
      const pEl = container.querySelector('#pmPellets');
      if (lEl) lEl.textContent = '❤️'.repeat(Math.max(0, lives));
      if (sEl) sEl.textContent = score;
      if (lvlEl) lvlEl.textContent = level;
      if (pEl) pEl.textContent = pelletsLeft;
    }

    let floatingScores = [];

    function setDir(dx, dy) {
      pacman.nextDirX = dx;
      pacman.nextDirY = dy;
      if (window.NP_Juice) NP_Juice.vibrate.light();
    }

    const keyHandler = (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) { setDir(0, -1); e.preventDefault(); }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { setDir(0, 1); e.preventDefault(); }
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { setDir(-1, 0); e.preventDefault(); }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { setDir(1, 0); e.preventDefault(); }
    };
    listen(window, 'keydown', keyHandler);

    // Touch Swipe Controls for mobile smoothness
    let pmTouchStartX = 0, pmTouchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      pmTouchStartX = t.clientX;
      pmTouchStartY = t.clientY;
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const dx = t.clientX - pmTouchStartX;
      const dy = t.clientY - pmTouchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > 18) {
        if (absX > absY) {
          setDir(dx > 0 ? 1 : -1, 0);
        } else {
          setDir(0, dy > 0 ? 1 : -1);
        }
      }
    }, { passive: false });

    container.querySelector('#pmUp')?.addEventListener('click', () => setDir(0, -1));
    container.querySelector('#pmDown')?.addEventListener('click', () => setDir(0, 1));
    container.querySelector('#pmLeft')?.addEventListener('click', () => setDir(-1, 0));
    container.querySelector('#pmRight')?.addEventListener('click', () => setDir(1, 0));

    function canMove(gx, gy, dx, dy) {
      const tx = gx + dx;
      const ty = gy + dy;
      if (tx < 0 || tx >= cols) return true; // wrap tunnel
      if (ty < 0 || ty >= rows) return false;
      return maze[ty][tx] !== 1;
    }

    function update() {
      // Check hitstop freeze
      if (window.NP_Juice && NP_Juice.isFrozen()) return;

      // Mouth animation
      mouthAngle += mouthDir;
      if (mouthAngle > 0.35 || mouthAngle < 0.05) mouthDir = -mouthDir;

      if (frightenedTimer > 0) frightenedTimer--;

      // 1. Immediate 180-degree turn reversal (no need to be at center)
      if (pacman.nextDirX === -pacman.dirX && pacman.nextDirY === -pacman.dirY && (pacman.nextDirX !== 0 || pacman.nextDirY !== 0)) {
        pacman.dirX = pacman.nextDirX;
        pacman.dirY = pacman.nextDirY;
      }

      // Current grid cell center
      const curGX = Math.floor(pacman.px / tileSize);
      const curGY = Math.floor(pacman.py / tileSize);
      const cellCenterX = curGX * tileSize + tileSize / 2;
      const cellCenterY = curGY * tileSize + tileSize / 2;
      const diffX = Math.abs(pacman.px - cellCenterX);
      const diffY = Math.abs(pacman.py - cellCenterY);

      // Corner buffering & auto-alignment within 6px threshold
      const isCornerNear = diffX <= 6 && diffY <= 6;

      if (isCornerNear) {
        if (canMove(curGX, curGY, pacman.nextDirX, pacman.nextDirY)) {
          if (pacman.nextDirX !== 0 && pacman.dirY !== 0) {
            // Turning horizontal from vertical: align Y to center
            pacman.py = cellCenterY;
            pacman.dirX = pacman.nextDirX;
            pacman.dirY = 0;
          } else if (pacman.nextDirY !== 0 && pacman.dirX !== 0) {
            // Turning vertical from horizontal: align X to center
            pacman.px = cellCenterX;
            pacman.dirX = 0;
            pacman.dirY = pacman.nextDirY;
          } else {
            pacman.dirX = pacman.nextDirX;
            pacman.dirY = pacman.nextDirY;
          }
        }
      }

      // Check wall collision ahead
      if (!canMove(curGX, curGY, pacman.dirX, pacman.dirY)) {
        if (pacman.dirX > 0 && pacman.px >= cellCenterX) { pacman.px = cellCenterX; pacman.dirX = 0; }
        else if (pacman.dirX < 0 && pacman.px <= cellCenterX) { pacman.px = cellCenterX; pacman.dirX = 0; }
        else if (pacman.dirY > 0 && pacman.py >= cellCenterY) { pacman.py = cellCenterY; pacman.dirY = 0; }
        else if (pacman.dirY < 0 && pacman.py <= cellCenterY) { pacman.py = cellCenterY; pacman.dirY = 0; }
      }

      pacman.px += pacman.dirX * pacman.speed;
      pacman.py += pacman.dirY * pacman.speed;

      // Tunnel wrap
      if (pacman.px < 0) pacman.px = cols * tileSize;
      if (pacman.px > cols * tileSize) pacman.px = 0;

      // Eat pellets with gentle rhythmic haptics
      const pGX = Math.floor(pacman.px / tileSize);
      const pGY = Math.floor(pacman.py / tileSize);
      if (pGX >= 0 && pGX < cols && pGY >= 0 && pGY < rows) {
        if (maze[pGY][pGX] === 2) {
          maze[pGY][pGX] = 0;
          score += 10;
          pelletsLeft--;
          AudioEngine.pop();
          if (window.NP_Juice) NP_Juice.vibrate(8);
          updateHUD();
        } else if (maze[pGY][pGX] === 3) {
          maze[pGY][pGX] = 0;
          score += 50;
          pelletsLeft--;
          frightenedTimer = 360; // ~6 seconds
          if (window.NP_Juice) NP_Juice.vibrate.medium();
          AudioEngine.powerup();
          updateHUD();
        }
      }

      // Check win
      if (pelletsLeft <= 0) {
        AudioEngine.win();
        level++;
        initMaze();
        updateHUD();
        return;
      }

      // Move ghosts with 4 distinct personalities
      const pacGX = Math.floor(pacman.px / tileSize);
      const pacGY = Math.floor(pacman.py / tileSize);

      ghosts.forEach((g, idx) => {
        const gx = Math.floor(g.px / tileSize);
        const gy = Math.floor(g.py / tileSize);
        const gAtCenter = Math.abs((g.px % tileSize) - (tileSize / 2)) < g.speed &&
                          Math.abs((g.py % tileSize) - (tileSize / 2)) < g.speed;

        if (gAtCenter) {
          const dirs = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
          ].filter(d => !(d.x === -g.dirX && d.y === -g.dirY) && canMove(gx, gy, d.x, d.y));

          if (dirs.length > 0) {
            if (frightenedTimer > 0) {
              // Frightened: Random scatter
              const chosen = dirs[Math.floor(Math.random() * dirs.length)];
              g.dirX = chosen.x;
              g.dirY = chosen.y;
            } else {
              // Authentic Pacman Ghost Targeting AI:
              let targetX = pacGX;
              let targetY = pacGY;

              if (g.name === 'Pinky') {
                // Ambush: 4 tiles ahead of Pac-man
                targetX = pacGX + pacman.dirX * 4;
                targetY = pacGY + pacman.dirY * 4;
              } else if (g.name === 'Inky') {
                // Flanker: Symmetric reflection across Blinky and Pacman
                const blinky = ghosts[0];
                const bGX = Math.floor(blinky.px / tileSize);
                const bGY = Math.floor(blinky.py / tileSize);
                targetX = pacGX * 2 - bGX;
                targetY = pacGY * 2 - bGY;
              } else if (g.name === 'Clyde') {
                // Shy/Coward: If distance < 8 tiles, retreat to bottom corner
                const distToPac = Math.hypot(gx - pacGX, gy - pacGY);
                if (distToPac < 7) {
                  targetX = 1;
                  targetY = rows - 2;
                }
              }

              dirs.sort((a, b) => {
                const distA = Math.hypot((gx + a.x) - targetX, (gy + a.y) - targetY);
                const distB = Math.hypot((gx + b.x) - targetX, (gy + b.y) - targetY);
                return distA - distB;
              });
              g.dirX = dirs[0].x;
              g.dirY = dirs[0].y;
            }
          }
        }

        const spd = frightenedTimer > 0 ? g.speed * 0.58 : g.speed;
        g.px += g.dirX * spd;
        g.py += g.dirY * spd;

        // Collision with Pac-man
        if (Math.hypot(g.px - pacman.px, g.py - pacman.py) < 14) {
          if (frightenedTimer > 0) {
            // Eat ghost!
            score += 200;
            if (window.NP_Juice) {
              NP_Juice.triggerHitstop(45);
              NP_Juice.vibrate.combo();
            }
            AudioEngine.coin();

            floatingScores.push({
              x: g.px,
              y: g.py - 10,
              vy: -2,
              text: '+200'
            });

            // Respawn to ghost house
            g.px = 9 * tileSize + 10;
            g.py = 10 * tileSize + 10;
            updateHUD();
          } else {
            // Pac-man dies
            lives--;
            if (window.NP_Juice) NP_Juice.vibrate.heavy();
            AudioEngine.explosion();
            updateHUD();
            if (lives <= 0) {
              lives = 3;
              score = 0;
              level = 1;
              initMaze();
            } else {
              resetPositions();
            }
          }
        }
      });

      // Update floating scores
      for (let i = floatingScores.length - 1; i >= 0; i--) {
        const fs = floatingScores[i];
        fs.y += fs.vy;
        fs.vy *= 0.94;
        if (fs.vy > -0.3) floatingScores.splice(i, 1);
      }
    }

    function draw() {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Maze
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = maze[r][c];
          const x = c * tileSize;
          const y = r * tileSize;

          if (val === 1) {
            ctx.fillStyle = '#1E3A8A';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          } else if (val === 2) {
            ctx.fillStyle = '#FDE047';
            ctx.beginPath();
            ctx.arc(x + tileSize / 2, y + tileSize / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (val === 3) {
            // Pulsing Power Pellet
            const pPulse = 5 + Math.sin(Date.now() / 150) * 1.5;
            ctx.fillStyle = '#FDE047';
            ctx.beginPath();
            ctx.arc(x + tileSize / 2, y + tileSize / 2, pPulse, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Pac-man
      let angle = 0;
      if (pacman.dirX === 1) angle = 0;
      else if (pacman.dirX === -1) angle = Math.PI;
      else if (pacman.dirY === 1) angle = Math.PI * 0.5;
      else if (pacman.dirY === -1) angle = Math.PI * 1.5;

      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(pacman.px, pacman.py, 9.5, angle + mouthAngle, angle + Math.PI * 2 - mouthAngle);
      ctx.lineTo(pacman.px, pacman.py);
      ctx.fill();

      // Draw Ghosts with Wavy Skirts & Expressive Eyes
      const wave = Math.sin(Date.now() / 100) * 2;

      ghosts.forEach((g, idx) => {
        const isFrightened = frightenedTimer > 0;
        const isFlashing = frightenedTimer < 100 && Math.floor(frightenedTimer / 10) % 2 === 0;
        ctx.fillStyle = isFrightened ? (isFlashing ? '#FFFFFF' : '#2563EB') : g.color;

        ctx.beginPath();
        ctx.arc(g.px, g.py - 2, 8.5, Math.PI, 0, false);
        // Animated skirt bottom
        ctx.lineTo(g.px + 8.5, g.py + 7 + wave);
        ctx.lineTo(g.px + 4.25, g.py + 4 - wave);
        ctx.lineTo(g.px, g.py + 7 + wave);
        ctx.lineTo(g.px - 4.25, g.py + 4 - wave);
        ctx.lineTo(g.px - 8.5, g.py + 7 + wave);
        ctx.closePath();
        ctx.fill();

        // Eyes looking towards move direction
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(g.px - 3, g.py - 3, 2.8, 0, Math.PI * 2);
        ctx.arc(g.px + 3, g.py - 3, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isFrightened ? '#EF4444' : '#0F172A';
        ctx.beginPath();
        ctx.arc(g.px - 3 + g.dirX * 1.2, g.py - 3 + g.dirY * 1.2, 1.4, 0, Math.PI * 2);
        ctx.arc(g.px + 3 + g.dirX * 1.2, g.py - 3 + g.dirY * 1.2, 1.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Floating Score Popups (Font Calibri)
      floatingScores.forEach(fs => {
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 14px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(fs.text, fs.x, fs.y);
      });
    }

    function loop() {
      update();
      draw();
      animId = requestAnimationFrame(loop);
    }

    initMaze();
    updateHUD();
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 2. ENGINE: SUPER MARIO CỔ ĐIỂN (NES PLATFORMER ENGINE)
  // =========================================================================
  function launchMario(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let score = 0;
    let coins = 0;
    let lives = 3;
    let stage = 1;
    let transitioning = false;
    let gameOver = false;
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
          <div class="hud-pill">Màn: <span id="mrStage" style="color: #38BDF8;">1</span></div>
          <button id="mrRestart" class="btn-canvas-action">Chơi lại từ màn 1</button>
        </div>
        <canvas id="mrCanvas" width="480" height="320" class="canvas-main-viewport" style="background: #5c94fc; display: block; margin: 0 auto;"></canvas>
        <div class="canvas-controls-bar" style="font-family: Calibri, sans-serif;">
          <small style="color: #FFF;">[A][D] hoặc Mũi tên để đi • [W], Space hoặc nút Nhảy để nhảy. Tới cột cờ để sang màn khó hơn.</small>
          <small id="mrStatus" role="status" aria-live="polite" style="color:#FBBF24"></small>
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
      transitioning = false;
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
      blocks.push({ x: 1320, y: 260, w: 700 + (stage - 1) * 110, h: 60, type: 'ground', bumpY: 0 });
      flagpole.x = 1800 + (stage - 1) * 100;

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
      // Later stages feature faster opponents and extra patrols near the finish.
      for (const enemy of enemies) enemy.vx *= 1 + Math.min(10, stage - 1) * 0.075;
      for (let i = 0; i < Math.min(8, stage - 1); i++) {
        enemies.push({ x: 1575 + i * 85, y: 242, w: 18, h: 18,
          vx: -1.1 - stage * 0.08, alive: true, squashedTimer: 0 });
      }
      refreshHUD();
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

    // Unified pointer handling prevents duplicate mouse/touch activations.
    [['#mrLeft', 'ArrowLeft'], ['#mrRight', 'ArrowRight'], ['#mrJump', 'Jump']].forEach(([selector, code]) => {
      const button = container.querySelector(selector);
      if (!button) return;
      listen(button, 'pointerdown', e => {
        e.preventDefault();
        if (button.setPointerCapture && e.pointerId !== undefined) {
          try { button.setPointerCapture(e.pointerId); } catch (error) {}
        }
        if (code === 'Jump') {
          jumpBuffer = 7;
          isJumpHeld = true;
        } else keys[code] = true;
      });
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen(button, eventName, () => {
          if (code === 'Jump') isJumpHeld = false;
          else keys[code] = false;
        });
      }
    });
    listen(window, 'blur', () => {
      keys.ArrowLeft = false; keys.ArrowRight = false; isJumpHeld = false;
    });
    listen(window, 'pointerup', () => {
      keys.ArrowLeft = false; keys.ArrowRight = false; isJumpHeld = false;
    });
    container.querySelector('#mrRestart')?.addEventListener('click', () => {
      lives = 3; coins = 0; score = 0; stage = 1; gameOver = false;
      initLevel();
      const status = container.querySelector('#mrStatus');
      if (status) status.textContent = 'Đã bắt đầu ván mới.';
    });
    function refreshHUD() {
      const lEl = container.querySelector('#mrLives');
      const cEl = container.querySelector('#mrCoins');
      const sEl = container.querySelector('#mrScore');
      const stEl = container.querySelector('#mrStage');
      if (lEl) lEl.textContent = '❤️'.repeat(Math.max(0, lives));
      if (cEl) cEl.textContent = coins;
      if (sEl) sEl.textContent = score;
      if (stEl) stEl.textContent = stage;
    }

    function update() {
      if (gameOver || transitioning) return;
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
          gameOver = true;
          const status = container.querySelector('#mrStatus');
          if (status) status.textContent = 'Hết mạng. Bấm Chơi lại từ màn 1 để thử lại.';
        } else {
          initLevel();
        }
        refreshHUD();
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
      let respawnPending = false;
      enemies.forEach(e => {
        if (respawnPending) return;
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
              gameOver = true;
              const status = container.querySelector('#mrStatus');
              if (status) status.textContent = 'Hết mạng. Bấm Chơi lại để thử lại.';
            } else {
              initLevel();
            }
            refreshHUD();
            respawnPending = true;
          }
        }
      });
      if (respawnPending) return;

      // Win flagpole
      if (player.x >= flagpole.x && !transitioning) {
        transitioning = true; // Prevent one victory and +1000 points per animation frame.
        AudioEngine.win();
        score += 1000;
        particles.push({ x: flagpole.x, y: 100, vy: -2, text: 'STAGE CLEAR! +1000' });
        const status = container.querySelector('#mrStatus');
        if (status) status.textContent = 'Hoàn thành màn ' + stage + '! Màn tiếp theo khó hơn.';
        refreshHUD();
        setTimeout(() => { stage++; initLevel(); }, 800);
        return;
      }

      // Floating text particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].y += particles[i].vy;
        particles[i].vy += 0.08;
        if (particles[i].y < -20 || particles[i].vy > 2) particles.splice(i, 1);
      }

      refreshHUD();
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
      if (gameOver) {
        ctx.fillStyle = 'rgba(15,23,42,0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Calibri, sans-serif';
        ctx.fillText('HẾT MẠNG', canvas.width / 2, 148);
        ctx.font = '16px Calibri, sans-serif';
        ctx.fillText('Bấm Chơi lại để bắt đầu lại', canvas.width / 2, 180);
      }
    }

    // Fixed 60 Hz simulation keeps gameplay speed consistent on 60/90/120 Hz screens.
    let lastFrameTime = 0;
    let elapsedAccumulator = 0;
    function loop(timestamp) {
      if (lastFrameTime) elapsedAccumulator += Math.min(100, Math.max(0, timestamp - lastFrameTime));
      lastFrameTime = timestamp || 0;
      let steps = 0;
      while (elapsedAccumulator >= 1000 / 60 && steps < 4) {
        update();
        elapsedAccumulator -= 1000 / 60;
        steps++;
      }
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
  // 3. ENGINE: GUNNY 2D TỌA ĐỘ (ARTILLERY BALLISTICS BATTLE)
  // =========================================================================
  function launchGunny(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let wind = (Math.random() * 4 - 2).toFixed(1);
    let playerAngle = 45;
    let power = 0;
    let charging = false;
    let bullets = [];
    let turn = 'player'; // 'player' | 'bot'
    let playerHP = 100;
    let botHP = 100;
    let stamina = 100;
    let rage = 0; // 0 to 100%
    let activeBuffs = { triple: false, double: false, dmg50: false, pow: false };
    let animId = null;

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('gunny');
    }

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud" style="font-family: Calibri, sans-serif;">
          <div class="hud-pill">Gà bạn: <span id="gnPlayerHP" style="color: #10B981; font-weight: bold;">100 HP</span></div>
          <div class="hud-pill" id="gnWindHud">💨 Gió: <span id="gnWindArrow" style="color: #38BDF8; font-weight: 900;">➡</span> <span id="gnWind" style="color: #38BDF8; font-weight: bold;">0.0</span> m/s</div>
          <div class="hud-pill">Góc: <span id="gnAngle" style="color: #F59E0B; font-weight: bold;">45°</span></div>
          <div class="hud-pill">Nộ: <span id="gnRage" style="color: #EF4444; font-weight: bold;">0%</span></div>
          <div class="hud-pill">Đối thủ: <span id="gnBotHP" style="color: #EF4444; font-weight: bold;">100 HP</span></div>
        </div>
        <canvas id="gnCanvas" width="500" height="300" class="canvas-main-viewport" style="background: #E0F2FE; display: block; margin: 0 auto;"></canvas>
        
        <!-- Authentic Gunny Item Bar -->
        <div style="display: flex; gap: 6px; justify-content: center; align-items: center; margin: 6px 0; flex-wrap: wrap;">
          <button class="v-btn gn-buff" id="gnBuffTriple" style="font-size: 0.8rem; padding: 4px 8px; font-weight: 700; border-radius: 6px;" title="Phím [1]: Bắn chùm 3 tia">🔱 +2 Tia [1]</button>
          <button class="v-btn gn-buff" id="gnBuffDouble" style="font-size: 0.8rem; padding: 4px 8px; font-weight: 700; border-radius: 6px;" title="Phím [2]: Bắn 2 lượt liên tiếp">⏩ +1 Lượt [2]</button>
          <button class="v-btn gn-buff" id="gnBuffDmg" style="font-size: 0.8rem; padding: 4px 8px; font-weight: 700; border-radius: 6px;" title="Phím [3]: Tăng 50% dame">💥 +50% Dame [3]</button>
          <button class="v-btn gn-buff" id="gnBuffPOW" style="font-size: 0.82rem; padding: 4px 12px; font-weight: 900; background: #DC2626; color: #FFF; border-radius: 6px;" title="Phím [B]: Bộc phá Super">⚡ POW! [B]</button>
        </div>

        <div class="canvas-controls-bar" style="gap: 8px; flex-wrap: wrap; justify-content: center; touch-action: none;">
          <button class="v-btn" id="gnLeftBtn" style="padding: 6px 12px; font-weight: 700;">◀ Bò [A]</button>
          <button class="v-btn" id="gnRightBtn" style="padding: 6px 12px; font-weight: 700;">Bò [D] ▶</button>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button class="v-btn" id="gnAngleDownBtn" style="padding: 6px 10px; font-weight: 900;">▼ Góc</button>
            <button class="v-btn" id="gnAngleUpBtn" style="padding: 6px 10px; font-weight: 900;">▲ Góc</button>
            <input type="range" id="gnAngleSlider" min="10" max="85" value="45" style="width: 70px; vertical-align: middle;">
          </div>
          <button class="btn-canvas-action" id="gnFireBtn" style="background: #DC2626; padding: 7px 20px; font-weight: 900; box-shadow: 0 0 12px rgba(220, 38, 38, 0.6); font-size: 0.95rem;">🔥 GIỮ BẮN [SPACE]</button>
        </div>
        <div style="text-align: center; color: #94A3B8; font-size: 0.75rem; margin-top: 4px; font-family: Calibri, sans-serif;">
          💡 [↑]/[↓]: Chỉnh góc • [←]/[→] hoặc [A]/[D]: Di chuyển • Giữ [Space]: Lấy lực bắn chuẩn xác • [B]: POW
        </div>
      </div>
    `;

    const canvas = container.querySelector('#gnCanvas');
    const ctx = canvas.getContext('2d');

    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;
    let tick = 0;
    let playerRecoil = 0;
    let botRecoil = 0;

    // Terrain generation
    const terrain = [];
    for (let x = 0; x <= canvas.width; x++) {
      terrain[x] = 200 + Math.sin(x * 0.015) * 35 + Math.cos(x * 0.03) * 15;
    }

    const playerPos = { x: 70, y: terrain[70] - 14 };
    const botPos = { x: 420, y: terrain[420] - 14 };

    function updateAngleUI() {
      const aEl = container.querySelector('#gnAngle');
      const aSlider = container.querySelector('#gnAngleSlider');
      if (aEl) aEl.textContent = `${playerAngle}°`;
      if (aSlider) aSlider.value = playerAngle;
    }

    const angleSlider = container.querySelector('#gnAngleSlider');
    angleSlider.addEventListener('input', (e) => {
      playerAngle = parseInt(e.target.value);
      updateAngleUI();
    });

    container.querySelector('#gnAngleUpBtn')?.addEventListener('click', () => {
      playerAngle = Math.min(85, playerAngle + 1);
      updateAngleUI();
      if (window.NP_Juice) window.NP_Juice.vibrate(6);
    });
    container.querySelector('#gnAngleDownBtn')?.addEventListener('click', () => {
      playerAngle = Math.max(10, playerAngle - 1);
      updateAngleUI();
      if (window.NP_Juice) window.NP_Juice.vibrate(6);
    });

    // Item Buff Toggles
    const btnTriple = container.querySelector('#gnBuffTriple');
    const btnDouble = container.querySelector('#gnBuffDouble');
    const btnDmg = container.querySelector('#gnBuffDmg');
    const btnPOW = container.querySelector('#gnBuffPOW');

    function toggleBuff(type) {
      if (turn !== 'player' || bullets.length > 0) return;
      if (type === 'pow') {
        activeBuffs.pow = !activeBuffs.pow;
        if (activeBuffs.pow && window.NP_Audio) window.NP_Audio.powerup();
      } else if (type === 'triple') {
        if (stamina >= 30) {
          activeBuffs.triple = !activeBuffs.triple;
          if (activeBuffs.triple) stamina -= 30; else stamina += 30;
          if (window.NP_Audio) window.NP_Audio.pop();
        }
      } else if (type === 'double') {
        if (stamina >= 35) {
          activeBuffs.double = !activeBuffs.double;
          if (activeBuffs.double) stamina -= 35; else stamina += 35;
          if (window.NP_Audio) window.NP_Audio.pop();
        }
      } else if (type === 'dmg50') {
        if (stamina >= 25) {
          activeBuffs.dmg50 = !activeBuffs.dmg50;
          if (activeBuffs.dmg50) stamina -= 25; else stamina += 25;
          if (window.NP_Audio) window.NP_Audio.pop();
        }
      }
      updateBuffUI();
    }

    function updateBuffUI() {
      if (btnTriple) btnTriple.style.background = activeBuffs.triple ? '#22C55E' : '';
      if (btnDouble) btnDouble.style.background = activeBuffs.double ? '#22C55E' : '';
      if (btnDmg) btnDmg.style.background = activeBuffs.dmg50 ? '#22C55E' : '';
      if (btnPOW) {
        btnPOW.style.background = activeBuffs.pow ? '#F59E0B' : '#DC2626';
        btnPOW.style.boxShadow = activeBuffs.pow ? '0 0 12px #F59E0B' : '';
      }
    }

    btnTriple.addEventListener('click', () => toggleBuff('triple'));
    btnDouble.addEventListener('click', () => toggleBuff('double'));
    btnDmg.addEventListener('click', () => toggleBuff('dmg50'));
    btnPOW.addEventListener('click', () => toggleBuff('pow'));

    // Move player
    function movePlayer(dx) {
      if (turn !== 'player' || bullets.length > 0 || stamina < 4) return;
      const newX = Math.max(30, Math.min(220, playerPos.x + dx));
      if (newX !== playerPos.x) {
        playerPos.x = newX;
        playerPos.y = terrain[Math.floor(playerPos.x)] - 14;
        stamina = Math.max(0, stamina - 3);
        if (window.NP_Audio && tick % 4 === 0) window.NP_Audio.thud(80);
      }
    }

    container.querySelector('#gnLeftBtn').addEventListener('click', () => movePlayer(-10));
    container.querySelector('#gnRightBtn').addEventListener('click', () => movePlayer(10));

    // Fire mechanics
    function triggerFire() {
      if (turn === 'player' && bullets.length === 0 && !charging) {
        charging = true;
      }
    }

    function releaseFire() {
      if (charging) {
        charging = false;
        executePlayerShot(power);
        power = 0;
      }
    }

    const fireBtn = container.querySelector('#gnFireBtn');
    fireBtn.addEventListener('mousedown', triggerFire);
    listen(window, 'mouseup', releaseFire);
    fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerFire(); });
    listen(window, 'touchend', releaseFire);

    // Keyboard controls
    const keyState = {};
    const onKeyDown = (e) => {
      keyState[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        triggerFire();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        playerAngle = Math.min(85, playerAngle + 1);
        updateAngleUI();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        playerAngle = Math.max(10, playerAngle - 1);
        updateAngleUI();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        movePlayer(-5);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        movePlayer(5);
      } else if (e.code === 'Digit1') {
        toggleBuff('triple');
      } else if (e.code === 'Digit2') {
        toggleBuff('double');
      } else if (e.code === 'Digit3') {
        toggleBuff('dmg50');
      } else if (e.code === 'KeyB') {
        toggleBuff('pow');
      }
    };

    const onKeyUp = (e) => {
      keyState[e.code] = false;
      if (e.code === 'Space') {
        releaseFire();
      }
    };

    listen(window, 'keydown', onKeyDown);
    listen(window, 'keyup', onKeyUp);

    function updateHUD() {
      const pEl = container.querySelector('#gnPlayerHP');
      const bEl = container.querySelector('#gnBotHP');
      const wEl = container.querySelector('#gnWind');
      const wArr = container.querySelector('#gnWindArrow');
      const rEl = container.querySelector('#gnRage');
      if (pEl) pEl.textContent = `${Math.max(0, playerHP)} HP`;
      if (bEl) bEl.textContent = `${Math.max(0, botHP)} HP`;
      const wVal = parseFloat(wind);
      if (wEl) wEl.textContent = `${Math.abs(wVal).toFixed(1)}`;
      if (wArr) {
        wArr.textContent = wVal >= 0 ? '➡' : '⬅';
        wArr.style.color = wVal >= 0 ? '#10B981' : '#EF4444';
      }
      if (rEl) {
        rEl.textContent = `${Math.min(100, Math.floor(rage))}%`;
        if (rage >= 100) rEl.style.color = '#F59E0B';
      }
    }

    function createBullet(startX, startY, angleDeg, pwr, dir, isPow, dmgMult) {
      const rad = (angleDeg * Math.PI) / 180;
      const speed = 4.5 + (pwr / 100) * 14.5;
      return {
        x: startX + dir * 14,
        y: startY,
        vx: Math.cos(rad) * speed * dir,
        vy: -Math.sin(rad) * speed,
        shooter: dir === 1 ? 'player' : 'bot',
        isPow: isPow,
        dmgMult: dmgMult
      };
    }

    function executePlayerShot(pwr) {
      playerRecoil = 8;
      const isPow = activeBuffs.pow;
      const dmgMult = (activeBuffs.dmg50 ? 1.5 : 1.0) * (isPow ? 1.6 : 1.0);

      if (isPow && popups) {
        popups.add('⚡ POW! BỘC PHÁ! ⚡', playerPos.x, playerPos.y - 30, '#F59E0B', 24);
      }

      if (window.NP_Audio && typeof window.NP_Audio.cannonFire === 'function') {
        window.NP_Audio.cannonFire();
      }
      if (window.NP_Juice) {
        window.NP_Juice.vibrate(isPow ? [30, 60] : 20);
      }

      if (particles) {
        particles.spawn(playerPos.x + 18, playerPos.y - 6, isPow ? 25 : 12, {
          colors: isPow ? ['#F59E0B', '#EF4444', '#DC2626', '#FEF08A'] : ['#F97316', '#FBBF24', '#94A3B8'],
          speed: isPow ? 5 : 3
        });
      }

      // 1 or 3 bullets
      const angles = activeBuffs.triple ? [playerAngle - 4, playerAngle, playerAngle + 4] : [playerAngle];
      angles.forEach(ang => {
        bullets.push(createBullet(playerPos.x, playerPos.y - 6, ang, pwr, 1, isPow, dmgMult));
      });

      // If Double shot buff (+1 lượt), spawn second wave slightly delayed
      if (activeBuffs.double) {
        setTimeout(() => {
          if (window.NP_Audio) window.NP_Audio.cannonFire();
          if (window.NP_Juice) window.NP_Juice.vibrate(isPow ? [25, 50] : 16);
          angles.forEach(ang => {
            bullets.push(createBullet(playerPos.x, playerPos.y - 6, ang, pwr, 1, isPow, dmgMult));
          });
        }, 220);
      }

      // Reset turn buffs
      activeBuffs = { triple: false, double: false, dmg50: false, pow: false };
      updateBuffUI();
    }

    function craterTerrain(cx, radius) {
      for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(canvas.width, Math.floor(cx + radius)); x++) {
        const dist = Math.abs(x - cx);
        const depth = Math.sqrt(radius * radius - dist * dist);
        terrain[x] = Math.min(canvas.height - 10, terrain[x] + depth * 0.7);
      }
      playerPos.y = terrain[Math.floor(playerPos.x)] - 14;
      botPos.y = terrain[Math.floor(botPos.x)] - 14;
    }

    function botTakeTurn() {
      setTimeout(() => {
        if (botHP <= 0 || playerHP <= 0) return;
        const dx = botPos.x - playerPos.x;
        const bAngle = 48 + Math.floor(Math.random() * 12);
        const bPower = Math.min(95, Math.max(35, (dx / 4.7) + (Math.random() * 10 - 5) - parseFloat(wind) * 4));
        botRecoil = 7;
        if (window.NP_Audio) window.NP_Audio.cannonFire();
        bullets.push(createBullet(botPos.x, botPos.y - 6, bAngle, bPower, -1, false, 1.0));
      }, 1000);
    }

    function finishTurn() {
      wind = (Math.random() * 4 - 2).toFixed(1);
      if (window.NP_Audio && typeof window.NP_Audio.whoosh === 'function') {
        window.NP_Audio.whoosh();
      }
      if (turn === 'player') {
        turn = 'bot';
        updateHUD();
        botTakeTurn();
      } else {
        turn = 'player';
        stamina = 100; // Reset stamina
        updateHUD();
      }
    }

    function loop() {
      tick++;

      if (playerRecoil > 0) playerRecoil -= 0.3;
      if (botRecoil > 0) botRecoil -= 0.3;

      if (charging) {
        const prevN = Math.floor(power / 20);
        power = Math.min(100, power + 1.85);
        const nextN = Math.floor(power / 20);
        if (nextN > prevN && window.NP_Juice) {
          window.NP_Juice.vibrate(8);
        }
        if (tick % 6 === 0 && window.NP_Audio) window.NP_Audio.clack();
      }

      // Bullets physics
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.vx += parseFloat(wind) * 0.015;
        b.vy += 0.28; // Gravity
        b.x += b.vx;
        b.y += b.vy;

        // Smoke / Fire Trail
        if (particles && tick % 2 === 0) {
          particles.spawn(b.x, b.y, b.isPow ? 3 : 1, {
            colors: b.isPow ? ['#EF4444', '#F59E0B', '#FEF08A'] : ['rgba(226, 232, 240, 0.7)'],
            speed: b.isPow ? 1.5 : 0.5,
            gravity: -0.02,
            size: b.isPow ? 4 : 3
          });
        }

        // Check Terrain hit
        const bx = Math.floor(b.x);
        let hitTerrain = (bx >= 0 && bx <= canvas.width && b.y >= terrain[bx]);
        let outOfBounds = (b.x < -80 || b.x > canvas.width + 80 || b.y > canvas.height + 60);

        if (hitTerrain) {
          const craterR = b.isPow ? 46 : 28;
          if (window.NP_Audio) window.NP_Audio.explosion(true);
          if (window.NP_Juice) {
            window.NP_Juice.screenShake(canvas, b.isPow ? 18 : 10, b.isPow ? 500 : 300);
            window.NP_Juice.triggerHitstop(b.isPow ? 55 : 40);
            window.NP_Juice.vibrate(b.isPow ? [35, 60] : 28);
          }

          if (particles) {
            particles.spawn(b.x, b.y, b.isPow ? 35 : 20, {
              colors: b.isPow ? ['#EF4444', '#F59E0B', '#FEF08A', '#78350F'] : ['#F59E0B', '#EF4444', '#78350F', '#15803D'],
              speed: b.isPow ? 7 : 5,
              size: b.isPow ? 5 : 4
            });
          }

          craterTerrain(bx, craterR);

          // Damage check
          const distToPlayer = Math.hypot(b.x - playerPos.x, b.y - playerPos.y);
          const distToBot = Math.hypot(b.x - botPos.x, b.y - botPos.y);

          if (distToPlayer < craterR + 12) {
            const rawDmg = Math.round(((craterR + 12) - distToPlayer) * 1.8 * b.dmgMult);
            playerHP -= rawDmg;
            rage = Math.min(100, rage + 28);
            if (popups) popups.add(`-${rawDmg} HP`, playerPos.x, playerPos.y - 20, '#EF4444', 22);
            if (window.NP_Audio) window.NP_Audio.thud();
          }

          if (distToBot < craterR + 12) {
            const rawDmg = Math.round(((craterR + 12) - distToBot) * 1.8 * b.dmgMult);
            botHP -= rawDmg;
            rage = Math.min(100, rage + 15);
            if (popups) popups.add(b.isPow ? `💥 CRITICAL POW! -${rawDmg}` : `TRÚNG ĐÍCH! -${rawDmg}`, botPos.x, botPos.y - 20, '#F59E0B', b.isPow ? 26 : 22);
            if (window.NP_Audio) window.NP_Audio.win();
          }

          bullets.splice(i, 1);
        } else if (outOfBounds) {
          bullets.splice(i, 1);
        }
      }

      // If all bullets resolved, end turn
      if (bullets.length === 0 && (playerRecoil > 0 || botRecoil > 0 || turn === 'bot')) {
        if (!charging) {
          finishTurn();
        }
      }

      // Check win/lose
      if (botHP <= 0 && window.showToastNotification) {
        window.showToastNotification('🏆 CHIẾN THẮNG! Bạn đã hạ gục Gà đối thủ!');
      }

      // --- DRAW SCENE ---
      // Sunny Sky
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      [80, 260, 420].forEach((cx) => {
        ctx.beginPath();
        ctx.arc(cx, 40, 18, 0, Math.PI * 2);
        ctx.arc(cx + 20, 36, 24, 0, Math.PI * 2);
        ctx.arc(cx + 42, 40, 16, 0, Math.PI * 2);
        ctx.fill();
      });

      // Wind blowing particle streaks
      const wSpeed = parseFloat(wind);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      for (let wi = 0; wi < 4; wi++) {
        const wx = (tick * wSpeed * 2 + wi * 120) % canvas.width;
        const wy = 50 + wi * 22;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + wSpeed * 8, wy);
        ctx.stroke();
      }

      // Destructible Hills (Grass & Dirt)
      ctx.fillStyle = '#16A34A';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let x = 0; x <= canvas.width; x++) {
        ctx.lineTo(x, terrain[x]);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Dirt sub-layer
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let x = 0; x <= canvas.width; x++) {
        ctx.lineTo(x, terrain[x] + 8);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Draw Player Gunner (Chibi Blue Hero)
      ctx.save();
      ctx.translate(playerPos.x - playerRecoil, playerPos.y);

      // Stamina Bar above head
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-16, -26, 32, 4);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(-16, -26, (stamina / 100) * 32, 4);

      // POW Aura flame if POW active
      if (activeBuffs.pow) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + Math.sin(tick * 0.2) * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, 20 + Math.sin(tick * 0.3) * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Body & Armor
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.arc(0, 4, 8, 0, Math.PI * 2);
      ctx.fill();

      // Chibi Head
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(0, -6, 10, 0, Math.PI * 2);
      ctx.fill();

      // Blue Helmet with Golden Visor
      ctx.fillStyle = '#1D4ED8';
      ctx.beginPath();
      ctx.arc(0, -9, 11, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-6, -8, 12, 3);

      // Bazooka Cannon
      const pRad = (playerAngle * Math.PI) / 180;
      ctx.save();
      ctx.translate(4, -4);
      ctx.rotate(-pRad);
      ctx.fillStyle = activeBuffs.pow ? '#DC2626' : '#334155';
      ctx.fillRect(-4, -5, 24, 10);
      ctx.fillStyle = activeBuffs.pow ? '#F59E0B' : '#64748B';
      ctx.fillRect(18, -6, 4, 12); // muzzle
      ctx.restore();

      ctx.restore();

      // Draw Bot Gunner (Chibi Red Opponent)
      ctx.save();
      ctx.translate(botPos.x + botRecoil, botPos.y);

      // Body
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(0, 4, 8, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(0, -6, 10, 0, Math.PI * 2);
      ctx.fill();

      // Red Horned Helmet
      ctx.fillStyle = '#991B1B';
      ctx.beginPath();
      ctx.arc(0, -9, 11, Math.PI, 0);
      ctx.fill();

      // Bot Bazooka Cannon
      ctx.save();
      ctx.translate(-4, -4);
      ctx.rotate(0.7);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-20, -5, 24, 10);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(-24, -6, 4, 12);
      ctx.restore();

      ctx.restore();

      // Laser Guide Dots from Cannon Muzzle
      if (turn === 'player' && bullets.length === 0) {
        const pRad = (playerAngle * Math.PI) / 180;
        const startX = playerPos.x + 14;
        const startY = playerPos.y - 6;
        for (let dot = 1; dot <= 6; dot++) {
          const dDist = dot * 14;
          const dX = startX + Math.cos(pRad) * dDist;
          const dY = startY - Math.sin(pRad) * dDist;
          ctx.fillStyle = `rgba(239, 68, 68, ${0.85 - dot * 0.12})`;
          ctx.beginPath();
          ctx.arc(dX, dY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Power Charging Meter (Tactile Gauge with calibration ticks)
      const gaugeW = 200;
      const gaugeH = 22;
      const gaugeX = canvas.width / 2 - gaugeW / 2;
      const gaugeY = 16;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

      // Calibration Ticks (0, 20, 40, 60, 80, 100)
      for (let tk = 0; tk <= 10; tk++) {
        const tx = gaugeX + (tk / 10) * gaugeW;
        ctx.strokeStyle = tk % 2 === 0 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = tk % 2 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(tx, gaugeY);
        ctx.lineTo(tx, gaugeY + (tk % 2 === 0 ? 6 : 4));
        ctx.stroke();
      }

      if (power > 0) {
        const pGrad = ctx.createLinearGradient(gaugeX + 2, 0, gaugeX + gaugeW - 2, 0);
        pGrad.addColorStop(0, '#10B981');
        pGrad.addColorStop(0.5, '#F59E0B');
        pGrad.addColorStop(1, '#EF4444');
        ctx.fillStyle = pGrad;
        ctx.fillRect(gaugeX + 2, gaugeY + 2, (power / 100) * (gaugeW - 4), gaugeH - 4);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(charging ? `LỰC: ${Math.round(power)}%` : `THƯỚC ĐO LỰC [SPACE]`, canvas.width / 2, gaugeY + 16);

      // Flying Cannonballs
      bullets.forEach(b => {
        if (b.isPow) {
          // Massive meteor bullet
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(b.x - 2, b.y - 2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(b.x - 1, b.y - 1, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Particles & Popups
      if (particles) particles.updateAndDraw(ctx);
      if (popups) popups.updateAndDraw(ctx);

      animId = requestAnimationFrame(loop);
    }

    updateHUD();
    updateBuffUI();
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') {
        window.NP_Audio.stopBGM();
      }
    });
  }

  // =========================================================================
  // 4. ENGINE: NÔNG TRẠI VUI VẺ (HAPPY FARM ZING ME ENGINE)
  // =========================================================================
  function launchNongTrai(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let coins = 150;
    let exp = 0;
    let level = 1;
    let bones = 1; // Dog bone treats to distract neighbor guard dogs
    let selectedTool = 'plow'; // 'plow'|'seed'|'water'|'pest'|'weed'|'fertilizer'
    let selectedSeed = 'radish';
    let currentTab = 'myFarm'; // 'myFarm' | 'neighbors'
    let selectedNeighborIdx = 0;
    let toastTimer = null;

    // Start rustic farm BGM
    if (window.NP_Audio?.startBGM) {
      NP_Audio.startBGM('nongtrai');
    }

    const CROPS = {
      radish: { name: 'Củ Cải Trắng', icon: '🥕', time: 10, cost: 5, sell: 14, xp: 8 },
      corn: { name: 'Bắp Ngô Vàng', icon: '🌽', time: 18, cost: 12, sell: 30, xp: 18 },
      tomato: { name: 'Cà Chua Bi', icon: '🍅', time: 30, cost: 20, sell: 55, xp: 32 },
      watermelon: { name: 'Dưa Hấu Khủng', icon: '🍉', time: 45, cost: 35, sell: 100, xp: 58 },
      sunflower: { name: 'Hoa Hướng Dương', icon: '🌻', time: 60, cost: 50, sell: 150, xp: 90 }
    };

    // My 9 plots (initial 6 open, 3 unlocked at level 3)
    let myPlots = Array(9).fill(null).map((_, i) => ({
      id: i,
      locked: i >= 6, // plots 6,7,8 unlocked at lvl 3
      state: 'grass', // 'grass' | 'plowed' | 'growing' | 'ripe'
      crop: null,
      plantTime: 0,
      growTime: 0,
      watered: false,
      hasPest: false,
      hasWeed: false
    }));

    // Zing Me Neighbors list
    let neighbors = [
      {
        name: 'Tuấn Còi (Zing Me)',
        avatar: '👦',
        level: 3,
        dog: { name: 'Chó Vàng Cỏ', awake: false, icon: '🐕' },
        plots: [
          { crop: 'tomato', state: 'ripe', stolen: false, canWater: false, hasPest: false },
          { crop: 'corn', state: 'growing', stolen: false, canWater: true, hasPest: false },
          { crop: 'watermelon', state: 'ripe', stolen: false, canWater: false, hasPest: false }
        ]
      },
      {
        name: 'Hotgirl Bích Thảo',
        avatar: '👧',
        level: 5,
        dog: { name: 'Husky Dữ Dằn', awake: true, icon: '🐺' },
        plots: [
          { crop: 'watermelon', state: 'ripe', stolen: false, canWater: false, hasPest: false },
          { crop: 'sunflower', state: 'ripe', stolen: false, canWater: false, hasPest: false },
          { crop: 'tomato', state: 'growing', stolen: false, canWater: false, hasPest: true }
        ]
      },
      {
        name: 'Anh Ba Phì Lũ',
        avatar: '👨',
        level: 4,
        dog: { name: 'Chó Đốm Mập', awake: false, icon: '🐶' },
        plots: [
          { crop: 'corn', state: 'ripe', stolen: false, canWater: false, hasPest: false },
          { crop: 'tomato', state: 'ripe', stolen: false, canWater: false, hasPest: false },
          { crop: 'radish', state: 'growing', stolen: false, canWater: true, hasPest: true }
        ]
      },
      {
        name: 'Bé Bắp Lém Lỉnh',
        avatar: '🧒',
        level: 2,
        dog: { name: 'Chó Con Nhỏ', awake: false, icon: '🐩' },
        plots: [
          { crop: 'radish', state: 'ripe', stolen: false, canWater: false, hasPest: false },
          { crop: 'corn', state: 'growing', stolen: false, canWater: true, hasPest: false },
          { crop: 'radish', state: 'ripe', stolen: false, canWater: false, hasPest: false }
        ]
      }
    ];


    const art = (type,id,cls='') => window.NP_GameArt?.svg(type,id,cls) || '';
    const CROP_SHORT = { radish:'Củ cải',corn:'Ngô',tomato:'Cà chua',watermelon:'Dưa hấu',sunflower:'Hướng dương' };
    container.innerHTML = `
      <div class="canvas-game-box np-farm-game">
        <header class="np-farm-header">
          <div class="np-farm-brand"><strong>NÔNG TRẠI</strong><small>Một ngày bình yên</small></div>
          <div class="np-farm-stats">
            <span><small>Cấp</small><b id="nfLevel">1</b></span>
            <span><small>Xu</small><b id="nfCoins">150</b></span>
            <span><small>Tiến độ</small><b id="nfExp">0/60</b></span>
            <button id="nfBuyBoneBtn" class="np-farm-bone" type="button" title="Mua xương, giá 30 xu">Xương <b id="nfBones">1</b></button>
          </div>
        </header>
        <nav class="np-farm-tabs" aria-label="Khu vườn">
          <button id="nfTabMyFarm" type="button" class="np-farm-tab active" aria-pressed="true">Vườn của tôi</button>
          <button id="nfTabNeighbors" type="button" class="np-farm-tab" aria-pressed="false">Hàng xóm</button>
        </nav>
        <div id="nfToast" class="np-farm-message" role="status" aria-live="polite" style="display:none"></div>
        <section id="nfMyFarmView" class="np-farm-view">
          <div class="np-farm-landscape" aria-hidden="true">
            <span class="np-farm-sun"></span><span class="np-farm-hill"></span>
            <span class="np-farm-barn"></span><span class="np-farm-fence"></span>
          </div>
          <div class="np-farm-workspace">
            <div class="np-farm-tools" role="group" aria-label="Dụng cụ">
              ${[['plow','Xới'],['seed','Gieo'],['water','Tưới'],['care','Chăm'],['fertilizer','Bón'],['harvest','Gặt']].map(([id,label])=>`
                <button type="button" class="tool-btn np-farm-tool ${selectedTool===id?'active':''}" data-tool="${id}"
                  aria-label="${label}" aria-pressed="${selectedTool===id}">
                  ${art('tool',id,'np-farm-tool-art')}<span>${label}</span>
                </button>`).join('')}
            </div>
            <div class="np-farm-seeds" role="group" aria-label="Hạt giống">
              ${Object.entries(CROPS).map(([id,crop])=>`
                <button type="button" class="seed-btn np-farm-seed ${selectedSeed===id?'active':''}" data-seed="${id}"
                  aria-pressed="${selectedSeed===id}" title="${crop.name}, giá ${crop.cost} xu">
                  ${art('crop',id,'np-farm-seed-art')}<span>${CROP_SHORT[id]}</span><small>${crop.cost} xu</small>
                </button>`).join('')}
            </div>
            <div id="nfPlotsGrid" class="np-farm-grid" aria-label="Chín luống đất"></div>
          </div>
        </section>
        <section id="nfNeighborsView" class="np-farm-view np-farm-neighbors" style="display:none">
          <div id="nfNeighborList" class="np-farm-neighbor-tabs"></div>
          <div id="nfNeighborFarmBox"></div>
        </section>
        <footer class="np-farm-footer"><span>Chọn dụng cụ rồi chạm luống đất. Cây chín có thể thu hoạch.</span>
          <button type="button" id="nfRestartBtn" class="btn-canvas-action">Chơi lại</button>
        </footer>
      </div>
    `;

    function showToast(msg, isAlert = false) {
      const t = container.querySelector('#nfToast');
      if (!t) return;
      t.textContent = msg;
      t.style.background = isAlert ? '#7F1D1D' : '#064E3B';
      t.style.borderColor = isAlert ? '#EF4444' : '#10B981';
      t.style.display = 'block';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        if (t) t.style.display = 'none';
      }, 2400);
    }

    function updateHUD() {
      const lEl = container.querySelector('#nfLevel');
      const cEl = container.querySelector('#nfCoins');
      const eEl = container.querySelector('#nfExp');
      const bEl = container.querySelector('#nfBones');
      const reqExp = level * 60;
      if (lEl) lEl.textContent = level;
      if (cEl) cEl.textContent = coins;
      if (eEl) eEl.textContent = `${exp}/${reqExp}`;
      if (bEl) bEl.textContent = bones;
    }


    function renderPlots() {
      const grid = container.querySelector('#nfPlotsGrid');
      if (!grid) return;
      const focused = document.activeElement?.getAttribute?.('data-plot-id');
      grid.innerHTML = myPlots.map(plot => {
        if (plot.locked) return `
          <button type="button" class="np-farm-plot locked" data-plot-id="${plot.id}"
            title="Đạt cấp 3 để mở luống đất" aria-label="Luống ${plot.id+1} bị khóa, cần cấp 3">
            <span class="np-farm-plot-lock" aria-hidden="true"></span>
            <small class="np-farm-plot-caption">Cấp 3</small>
          </button>`;
        const growing = plot.state==='growing';
        const ripe = plot.state==='ripe';
        const progress = growing ? Math.max(0,Math.min(100,Math.floor((Date.now()-plot.plantTime)/1000/plot.growTime*100))) : 0;
        const title = plot.state==='grass'?'Đất trống':plot.state==='plowed'?'Đã xới':CROP_SHORT[plot.crop];
        const label = `Luống ${plot.id+1}, ${title}`+(growing?`, ${progress}% phát triển`:ripe?', đã chín':'')+
          (plot.hasPest?', bị sâu':'')+(plot.hasWeed?', có cỏ dại':'');
        const drawing = plot.state==='grass'?'<span class="np-farm-grass"></span>':
          plot.state==='plowed'?'<span class="np-farm-tilled"></span>':
          `<span class="np-farm-plant ${growing?'young':'ready'}" aria-hidden="true">${art('crop',plot.crop,'np-farm-crop-art')}</span>`;
        return `
          <button type="button" class="np-farm-plot ${plot.state} ${plot.watered?'watered':''}"
            data-plot-id="${plot.id}" title="${label}" aria-label="${label}">
            <span class="np-farm-soil" aria-hidden="true"></span>
            ${drawing}
            ${plot.hasPest || plot.hasWeed ? '<span class="np-farm-trouble" aria-label="Cần chăm sóc">!</span>':''}
            ${growing ? `<span class="np-farm-grow-track" aria-hidden="true"><span style="width:${progress}%"></span></span>`:''}
            ${ripe?'<span class="np-farm-ready">Thu hoạch</span>':''}
            <small class="np-farm-plot-caption">${title}</small>
          </button>`;
      }).join('');
      grid.querySelectorAll('.np-farm-plot').forEach(button => button.addEventListener('click', () =>
        handlePlotClick(Number(button.getAttribute('data-plot-id')))
      ));
      if (focused !== null && focused !== undefined) {
        grid.querySelector('[data-plot-id="'+focused+'"]')?.focus?.({preventScroll:true});
      }
    }

    function handlePlotClick(pid) {
      const p = myPlots[pid];
      if (p.locked) {
        showToast('Ô đất này cần đạt Cấp 3 để mở khóa khai hoang!', true);
        return;
      }

      if (selectedTool === 'plow' && p.state === 'grass') {
        p.state = 'plowed';
        if (window.NP_Audio?.thud) NP_Audio.thud();
        else AudioEngine.pop();
        renderPlots();
      } else if (selectedTool === 'seed' && p.state === 'plowed') {
        const crop = CROPS[selectedSeed];
        if (coins >= crop.cost) {
          coins -= crop.cost;
          p.state = 'growing';
          p.crop = selectedSeed;
          p.plantTime = Date.now();
          p.growTime = crop.time;
          p.watered = false;
          p.hasPest = false;
          p.hasWeed = false;
          if (window.NP_Audio?.coin) NP_Audio.coin();
          else AudioEngine.coin();
          updateHUD();
          renderPlots();
          showToast(`Đã gieo ${crop.name}!`);
        } else {
          if (window.NP_Audio?.alarm) NP_Audio.alarm();
          showToast('Không đủ xu mua hạt giống!', true);
        }
      } else if (selectedTool === 'water' && p.state === 'growing' && !p.watered) {
        p.watered = true;
        p.growTime = Math.max(3, p.growTime * 0.75); // 25% faster
        if (window.NP_Audio?.pop) NP_Audio.pop();
        else AudioEngine.pop();
        renderPlots();
        showToast('Đã tưới nước mát cho cây trồng!');
      } else if (selectedTool === 'care' && p.state === 'growing' && (p.hasPest || p.hasWeed)) {
        p.hasPest = false;
        p.hasWeed = false;
        exp += 10;
        coins += 5;
        if (window.NP_Audio?.win) NP_Audio.win();
        else AudioEngine.win();
        checkLevelUp();
        updateHUD();
        renderPlots();
        showToast('Đã bắt sạch sâu bọ và nhổ cỏ! (+10 EXP, +5 xu)');
      } else if (selectedTool === 'fertilizer' && p.state === 'growing') {
        if (coins >= 20) {
          coins -= 20;
          p.plantTime -= 15000; // -15s
          if (window.NP_Audio?.powerup) NP_Audio.powerup();
          else AudioEngine.powerup();
          updateHUD();
          renderPlots();
          showToast('Đã bón phân siêu tốc (-15s)!');
        } else {
          showToast('Không đủ 20 xu mua phân bón!', true);
        }
      } else if (selectedTool === 'harvest' && p.state === 'ripe') {
        const crop = CROPS[p.crop];
        coins += crop.sell;
        exp += crop.xp;
        p.state = 'grass';
        p.crop = null;
        p.hasPest = false;
        p.hasWeed = false;
        if (window.NP_Audio?.coin) NP_Audio.coin();
        else AudioEngine.coin();
        checkLevelUp();
        updateHUD();
        renderPlots();
        showToast(`Thu hoạch ${crop.name} thành công! (+${crop.sell} xu, +${crop.xp} EXP)`);
      }
    }

    function checkLevelUp() {
      const req = level * 60;
      if (exp >= req) {
        level++;
        exp -= req;
        if (level >= 3) {
          // Unlock plots 6, 7, 8
          myPlots[6].locked = false;
          myPlots[7].locked = false;
          myPlots[8].locked = false;
        }
        if (window.NP_Audio?.win) NP_Audio.win();
        else AudioEngine.win();
        showToast(`Đạt cấp ${level}! Đã mở thêm luống đất.`);
      }
    }

    function renderNeighbors() {
      const listEl = container.querySelector('#nfNeighborList');
      const farmBox = container.querySelector('#nfNeighborFarmBox');
      if (!listEl || !farmBox) return;

      listEl.innerHTML = neighbors.map((nb, idx) => `
        <button class="btn ${idx === selectedNeighborIdx ? 'btn-primary' : 'btn-secondary'}" data-nb-idx="${idx}" style="font-size: 0.78rem; padding: 4px 10px; white-space: nowrap; font-family: Calibri, sans-serif;">
          <span class="np-farm-neighbor-avatar" aria-hidden="true">${nb.name.charAt(0)}</span> ${nb.name.replace(' (Zing Me)','')}
        </button>
      `).join('');

      listEl.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedNeighborIdx = parseInt(btn.getAttribute('data-nb-idx'));
          renderNeighbors();
        });
      });

      const nb = neighbors[selectedNeighborIdx];
      farmBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
          <div>
            <h4 style="margin: 0; color: #38BDF8; font-size: 0.95rem;">${nb.name.replace(' (Zing Me)','')}</h4>
            <small style="color: #94A3B8;">Cấp ${nb.level}</small>
          </div>
          <div style="text-align: right;">
            <span style="background: ${nb.dog.awake ? '#EF4444' : '#10B981'}; color: #FFF; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: bold;">
              Chó canh ${nb.dog.awake ? 'đang thức' : 'đang ngủ'}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          ${nb.plots.map((p, pIdx) => {
            const crop = CROPS[p.crop];
            let statusText = p.stolen ? 'Đã thu hoạch' : p.state === 'ripe' ? 'Đã chín' : 'Đang lớn';
            let bg = p.stolen ? '#374151' : p.state === 'ripe' ? '#CA8A04' : '#166534';

            return `
              <div style="background: ${bg}; padding: 8px; border-radius: 6px; text-align: center; border: 1.5px solid #FEF08A; color: #FFF; font-weight: bold;">
                <div class="np-farm-neighbor-crop">${art('crop',p.crop,'np-farm-crop-art')}</div>
                <div style="font-size: 0.8rem; margin: 2px 0;">${crop.name}</div>
                <div style="font-size: 0.7rem; color: #FEF08A;">${statusText}</div>

                <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                  ${p.state === 'ripe' && !p.stolen ? `
                    <button class="btn btn-primary nb-steal-btn" data-pidx="${pIdx}" style="background: #E11D48; border: none; font-size: 0.72rem; padding: 3px 6px; font-family: Calibri, sans-serif;">
                      Thu hoạch
                    </button>
                  ` : ''}

                  ${p.canWater ? `
                    <button class="btn btn-secondary nb-water-btn" data-pidx="${pIdx}" style="font-size: 0.7rem; padding: 2px 4px; font-family: Calibri, sans-serif;">
                      Tưới hộ
                    </button>
                  ` : ''}

                  ${p.hasPest ? `
                    <button class="btn btn-secondary nb-pest-btn" data-pidx="${pIdx}" style="font-size: 0.7rem; padding: 2px 4px; font-family: Calibri, sans-serif;">
                      Bắt sâu
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Steal button event
      farmBox.querySelectorAll('.nb-steal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pIdx = parseInt(btn.getAttribute('data-pidx'));
          handleSteal(selectedNeighborIdx, pIdx);
        });
      });

      // Help water
      farmBox.querySelectorAll('.nb-water-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pIdx = parseInt(btn.getAttribute('data-pidx'));
          nb.plots[pIdx].canWater = false;
          exp += 15;
          coins += 10;
          if (window.NP_Audio?.coin) NP_Audio.coin();
          checkLevelUp();
          updateHUD();
          renderNeighbors();
          showToast(`Đã tưới nước hộ bạn ${nb.name}! (+15 XP, +10 xu thưởng)`);
        });
      });

      // Help pest
      farmBox.querySelectorAll('.nb-pest-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pIdx = parseInt(btn.getAttribute('data-pidx'));
          nb.plots[pIdx].hasPest = false;
          exp += 20;
          coins += 15;
          if (window.NP_Audio?.win) NP_Audio.win();
          checkLevelUp();
          updateHUD();
          renderNeighbors();
          showToast(`Đã bắt sâu hộ bạn ${nb.name}! Nhận danh hiệu Hàng Xóm Tốt Bụng!`);
        });
      });
    }

    function handleSteal(nbIdx, pIdx) {
      const nb = neighbors[nbIdx];
      const plot = nb.plots[pIdx];
      const crop = CROPS[plot.crop];

      // Dog guard check!
      if (nb.dog.awake) {
        if (bones > 0) {
          bones--;
          nb.dog.awake = false;
          showToast(`🦴 Đã quăng khúc xương dụ ${nb.dog.name} no bụng ngủ khì!`);
          if (window.NP_Audio?.pop) NP_Audio.pop();
        } else {
          // Bitten by guard dog!
          coins = Math.max(0, coins - 25);
          if (window.NP_Audio?.alarm) NP_Audio.alarm();
          else if (window.NP_Audio?.hit) NP_Audio.hit();
          else AudioEngine.hit();
          showToast(`🐕 GÂU GÂU! ${nb.dog.name} lao ra cắn bạn té khói! Bị phạt -25 xu!`, true);
          updateHUD();
          renderNeighbors();
          return;
        }
      }

      // Successful heist!
      plot.stolen = true;
      const stolenVal = Math.floor(crop.sell * 0.5);
      const stolenXp = Math.floor(crop.xp * 0.6);
      coins += stolenVal;
      exp += stolenXp;
      if (window.NP_Audio?.coin) NP_Audio.coin();
      else AudioEngine.coin();
      checkLevelUp();
      updateHUD();
      renderNeighbors();
      showToast(`🥷 Trộm thành công ${crop.name} nhà ${nb.name}! (+${stolenVal} xu, +${stolenXp} EXP)`);
    }

    // Buy Dog Bone
    container.querySelector('#nfBuyBoneBtn')?.addEventListener('click', () => {
      if (coins >= 30) {
        coins -= 30;
        bones++;
        if (window.NP_Audio?.coin) NP_Audio.coin();
        else AudioEngine.coin();
        updateHUD();
        showToast('Đã mua một khúc xương để đánh lạc hướng chó canh.');
      } else {
        showToast('Không đủ 30 xu mua khúc xương!', true);
      }
    });

    // Tab buttons
    const tabMyFarm = container.querySelector('#nfTabMyFarm');
    const tabNeighbors = container.querySelector('#nfTabNeighbors');
    const viewMyFarm = container.querySelector('#nfMyFarmView');
    const viewNeighbors = container.querySelector('#nfNeighborsView');

    tabMyFarm?.addEventListener('click', () => {
      currentTab = 'myFarm';
      tabMyFarm.className = 'np-farm-tab active';
      tabNeighbors.className = 'np-farm-tab';
      tabMyFarm.setAttribute('aria-pressed','true');
      tabNeighbors.setAttribute('aria-pressed','false');
      viewMyFarm.style.display = 'block';
      viewNeighbors.style.display = 'none';
      renderPlots();
    });

    tabNeighbors?.addEventListener('click', () => {
      currentTab = 'neighbors';
      tabMyFarm.className = 'np-farm-tab';
      tabNeighbors.className = 'np-farm-tab active';
      tabMyFarm.setAttribute('aria-pressed','false');
      tabNeighbors.setAttribute('aria-pressed','true');
      viewMyFarm.style.display = 'none';
      viewNeighbors.style.display = 'block';
      renderNeighbors();
    });

    // Tool buttons
    container.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tool-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
        btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
        selectedTool = btn.getAttribute('data-tool');
      });
    });

    // Seed buttons
    container.querySelectorAll('.seed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.seed-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
        btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
        selectedSeed = btn.getAttribute('data-seed');
      });
    });

    // Restart button
    container.querySelector('#nfRestartBtn')?.addEventListener('click', () => {
      coins = 150;
      exp = 0;
      level = 1;
      bones = 1;
      myPlots.forEach((p, idx) => {
        p.locked = idx >= 6;
        p.state = 'grass';
        p.crop = null;
        p.hasPest = false;
        p.hasWeed = false;
      });
      updateHUD();
      renderPlots();
      if (window.NP_Audio?.startBGM) NP_Audio.startBGM('nongtrai');
    });

    // Main farm tick loop (1 sec)
    const farmInterval = setInterval(() => {
      let changed = false;
      myPlots.forEach(p => {
        if (p.state === 'growing') {
          // Random pests or weeds appear (5% chance)
          if (!p.hasPest && !p.hasWeed && Math.random() < 0.05) {
            if (Math.random() > 0.5) p.hasPest = true;
            else p.hasWeed = true;
            changed = true;
          }

          const penalty = (p.hasPest || p.hasWeed) ? 0.3 : 1.0;
          const elapsed = (Date.now() - p.plantTime) / 1000 * penalty;
          if (elapsed >= p.growTime) {
            p.state = 'ripe';
            changed = true;
          }
        }
      });

      // Randomize neighbor dog awake states periodically
      if (Math.random() < 0.08) {
        neighbors.forEach(nb => {
          if (Math.random() < 0.25) nb.dog.awake = !nb.dog.awake;
        });
        if (currentTab === 'neighbors') renderNeighbors();
      }

      if (currentTab === 'myFarm') {
        renderPlots();
      }
    }, 1000);

    updateHUD();
    renderPlots();

    onCleanup(() => {
      clearInterval(farmInterval);
      clearTimeout(toastTimer);
      if (window.NP_Audio?.stopBGM) NP_Audio.stopBGM();
    });
  }

  // =========================================================================
  // 5. ENGINE: CÁ LỚN NUỐT CÁ BÉ (FEEDING FRENZY POPCAP ENGINE)
  // =========================================================================
  function launchFeedingFrenzy(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let score = 0;
    let fishSize = 1; // 1: Cá bột, 2: Cá hề vừa, 3: Vua biển sâu
    let frenzy = 0;
    let animId = null;
    let dashCooldown = 0; // frames
    let isDashing = false;
    let dashTimer = 0;

    // Clam with pearl at seabed
    const clam = {
      x: 380,
      y: 295,
      w: 44,
      h: 24,
      state: 'closed', // 'closed' | 'opening' | 'open' | 'snapping'
      timer: 0,
      hasPearl: true
    };

    let starfish = null; // { x, y, vy, rot }

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('feeding');
    }

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud" style="font-family: Calibri, sans-serif;">
          <div class="hud-pill">Cỡ cá: <span id="ffSize" style="color: #F59E0B; font-weight: bold;">Cá bột (Nhỏ)</span></div>
          <div class="hud-pill">Điểm: <span id="ffScore" style="color: #10B981; font-weight: bold;">0</span></div>
          <div class="hud-pill">Lướt: <span id="ffDash" style="color: #38BDF8; font-weight: bold;">SẴN SÀNG</span></div>
          <div class="hud-pill">Frenzy: <span id="ffFrenzy" style="color: #EF4444; font-weight: bold;">0%</span></div>
        </div>
        <canvas id="ffCanvas" width="500" height="320" class="canvas-main-viewport" style="background: #0284C7; display: block; margin: 0 auto; cursor: crosshair;"></canvas>
        <div class="canvas-controls-bar" style="gap: 8px; justify-content: center;">
          <button class="v-btn" id="ffDashBtn" style="background: #0284C7; color: #FFF; font-weight: 900; padding: 4px 14px;">⚡ LƯỚT NHANH [SPACE]</button>
          <small style="color: #94A3B8; font-family: Calibri, sans-serif;">Rê chuột: Bơi • Space / Phải chuột: Lướt nhanh • Đớp ngọc trai trong vỏ sò 🐚</small>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#ffCanvas');
    const ctx = canvas.getContext('2d');

    let player = { x: 250, y: 160, r: 14, targetX: 250, targetY: 160, facing: 1, mouthOpen: 0 };
    let fishes = [];
    let tick = 0;
    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

    function updatePlayerTarget(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      player.targetX = (clientX - rect.left) * scaleX;
      player.targetY = (clientY - rect.top) * scaleY;
    }

    canvas.addEventListener('mousemove', (e) => updatePlayerTarget(e.clientX, e.clientY));
    canvas.addEventListener('mousedown', (e) => updatePlayerTarget(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches[0]) updatePlayerTarget(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches[0]) updatePlayerTarget(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    function triggerDash() {
      if (dashCooldown <= 0 && !isDashing) {
        isDashing = true;
        dashTimer = 18; // ~300ms dash
        dashCooldown = 120; // 2s cooldown
        if (window.NP_Audio && typeof window.NP_Audio.whoosh === 'function') {
          window.NP_Audio.whoosh();
        }
        if (window.NP_Juice) {
          window.NP_Juice.vibrate(22);
        }
        if (particles) {
          particles.spawn(player.x - player.facing * 15, player.y, 14, {
            colors: ['#BAE6FD', '#7DD3FC', '#FFF'],
            speed: 4,
            gravity: -0.05
          });
        }
      }
    }

    container.querySelector('#ffDashBtn').addEventListener('click', triggerDash);
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); triggerDash(); });

    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        triggerDash();
      }
    };
    listen(window, 'keydown', onKeyDown);

    function spawnFish() {
      if (fishes.length > 20) return;
      const fromLeft = Math.random() < 0.5;
      const types = [
        { r: 8, speed: 2.2, color: '#FDE047', points: 10, name: 'Cá Bột' },
        { r: 14, speed: 1.6, color: '#FB923C', points: 30, name: 'Cá Hề' },
        { r: 22, speed: 1.2, color: '#C084FC', points: 70, name: 'Cá Thiên Thần' },
        { r: 38, speed: 2.0, color: '#334155', points: 200, isShark: true, name: 'Cá Mập Sát Thủ' }
      ];
      const t = types[Math.floor(Math.random() * (fishSize >= 2 ? 4 : 3))];

      fishes.push({
        x: fromLeft ? -50 : canvas.width + 50,
        y: 30 + Math.random() * (canvas.height - 85),
        r: t.r,
        speed: fromLeft ? t.speed : -t.speed,
        color: t.color,
        points: t.points,
        isShark: t.isShark,
        tailPhase: Math.random() * Math.PI * 2
      });
    }

    function drawFishSprite(cx, cy, radius, color, dir, isPlayer = false, mouthAngle = 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dir, 1);

      const tailWiggle = Math.sin(tick * 0.25) * 4;

      // Tail Fin
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.8, 0);
      ctx.lineTo(-radius * 1.8, -radius * 0.75 + tailWiggle);
      ctx.lineTo(-radius * 1.4, 0);
      ctx.lineTo(-radius * 1.8, radius * 0.75 + tailWiggle);
      ctx.closePath();
      ctx.fill();

      // Dorsal Fin
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.3, -radius * 0.8);
      ctx.quadraticCurveTo(0, -radius * 1.4, radius * 0.3, -radius * 0.7);
      ctx.lineTo(radius * 0.1, -radius * 0.6);
      ctx.closePath();
      ctx.fill();

      // Main Fish Body
      ctx.fillStyle = color;
      ctx.beginPath();
      if (mouthAngle > 0.05) {
        ctx.arc(0, 0, radius * 1.25, mouthAngle, Math.PI * 2 - mouthAngle, false);
        ctx.lineTo(0, 0);
      } else {
        ctx.ellipse(0, 0, radius * 1.25, radius * 0.9, 0, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();

      // White stripes if clownfish player
      if (isPlayer) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.ellipse(-radius * 0.1, 0, radius * 0.25, radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-radius * 0.6, 0, radius * 0.18, radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eye
      const eyeX = radius * 0.65;
      const eyeY = -radius * 0.25;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, Math.max(2.5, radius * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(eyeX + 1, eyeY, Math.max(1.2, radius * 0.15), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eyeX + 2, eyeY - 1, Math.max(0.8, radius * 0.08), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function loop() {
      tick++;

      if (window.NP_Juice && window.NP_Juice.isFrozen()) {
        animId = requestAnimationFrame(loop);
        return;
      }

      // Dash cooldown & effect
      if (dashCooldown > 0) dashCooldown--;
      if (isDashing) {
        dashTimer--;
        player.x += player.facing * 7;
        player.targetX = player.x;
        if (dashTimer <= 0) isDashing = false;
      } else {
        const prevX = player.x;
        player.x += (player.targetX - player.x) * 0.14;
        player.y += (player.targetY - player.y) * 0.14;
        if (Math.abs(player.x - prevX) > 0.5) {
          player.facing = player.x > prevX ? 1 : -1;
        }
      }

      // Constrain player to bounds
      player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
      player.y = Math.max(player.r, Math.min(canvas.height - 24 - player.r, player.y));

      // Spawn fish
      if (Math.random() < 0.04) spawnFish();

      // Spawn Starfish
      if (!starfish && Math.random() < 0.003) {
        starfish = {
          x: 60 + Math.random() * (canvas.width - 120),
          y: -15,
          vy: 0.8,
          rot: 0
        };
      }

      // Update Starfish
      if (starfish) {
        starfish.y += starfish.vy;
        starfish.rot += 0.03;
        // Collision with player
        if (Math.hypot(starfish.x - player.x, starfish.y - player.y) < player.r + 16) {
          score += 100;
          frenzy = 100;
          if (window.NP_Audio) window.NP_Audio.win();
          if (popups) popups.add('⭐️ SAO BIỂN! FULL FRENZY!', player.x, player.y - 20, '#FBBF24', 22);
          starfish = null;
        } else if (starfish.y > canvas.height - 24) {
          starfish = null;
        }
      }

      // Giant Clam cycle
      clam.timer++;
      if (clam.state === 'closed' && clam.timer > 300) {
        clam.state = 'opening';
        clam.timer = 0;
        clam.hasPearl = true;
      } else if (clam.state === 'opening' && clam.timer > 60) {
        clam.state = 'open';
        clam.timer = 0;
      } else if (clam.state === 'open' && clam.timer > 180) {
        clam.state = 'snapping';
        clam.timer = 0;
      } else if (clam.state === 'snapping' && clam.timer > 20) {
        clam.state = 'closed';
        clam.timer = 0;
      }

      // Clam Pearl Collision & Snap
      if (clam.state === 'open' && clam.hasPearl) {
        if (Math.hypot(player.x - clam.x, player.y - (clam.y - 6)) < player.r + 14) {
          clam.hasPearl = false;
          score += 400;
          if (window.NP_Audio) window.NP_Audio.coin();
          if (popups) popups.add('+400 💎 NGỌC TRAI!', clam.x, clam.y - 30, '#FDE047', 24);
        }
      } else if (clam.state === 'snapping') {
        if (Math.hypot(player.x - clam.x, player.y - clam.y) < player.r + 16) {
          score = Math.max(0, score - 80);
          if (window.NP_Audio) window.NP_Audio.thud(180);
          if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 10, 300);
          if (popups) popups.add('BỊ SÒ KẸP! -80', player.x, player.y - 20, '#EF4444', 22);
        }
      }

      // Mouth opening check
      let nearPrey = false;
      fishes.forEach(f => {
        if (!f.isShark && f.r < player.r && Math.hypot(f.x - player.x, f.y - player.y) < player.r * 2.8) {
          nearPrey = true;
        }
      });
      player.mouthOpen = nearPrey ? 0.38 : 0;

      // Update Fishes
      for (let i = fishes.length - 1; i >= 0; i--) {
        const f = fishes[i];
        f.x += f.speed;

        const dist = Math.hypot(f.x - player.x, f.y - player.y);
        if (dist < player.r + f.r) {
          if (player.r >= f.r && !f.isShark) {
            fishes.splice(i, 1);
            const pts = frenzy > 80 ? f.points * 2 : f.points;
            score += pts;
            frenzy = Math.min(100, frenzy + 16);

            if (window.NP_Audio && typeof window.NP_Audio.chomp === 'function') {
              window.NP_Audio.chomp();
            }
            if (window.NP_Juice) {
              window.NP_Juice.vibrate(frenzy > 80 ? 16 : 10);
            }
            if (window.NP_Juice && typeof window.NP_Juice.triggerHitstop === 'function') {
              window.NP_Juice.triggerHitstop(35);
            }
            if (particles) {
              particles.spawn(player.x, player.y, 10, {
                shape: 'bubble',
                colors: ['#FFF', '#BAE6FD', '#7DD3FC'],
                speed: 3,
                gravity: -0.05
              });
            }
            if (popups) {
              popups.add(`+${pts}`, player.x, player.y - 12, frenzy > 80 ? '#EF4444' : '#FDE047', 18);
            }

            // Progression
            if (score > 1200 && fishSize < 3) {
              fishSize = 3;
              player.r = 28;
              if (window.NP_Audio) window.NP_Audio.win();
              if (window.NP_Juice) window.NP_Juice.vibrate([25, 45, 60]);
              if (popups) popups.add('TIẾN HÓA THÀNH CÁ KHỦNG!', canvas.width / 2, 80, '#38BDF8', 24);
            } else if (score > 400 && fishSize < 2) {
              fishSize = 2;
              player.r = 20;
              if (window.NP_Audio) window.NP_Audio.win();
              if (window.NP_Juice) window.NP_Juice.vibrate([20, 35]);
              if (popups) popups.add('LỚN THÀNH CÁ TRUNG!', canvas.width / 2, 80, '#4ADE80', 22);
            }
          } else if (f.isShark || f.r > player.r) {
            if (window.NP_Audio) window.NP_Audio.explosion(true);
            if (window.NP_Juice) {
              window.NP_Juice.screenShake(canvas, 10, 300);
              window.NP_Juice.vibrate([45, 80]);
            }
            score = Math.max(0, score - 150);
            fishSize = 1;
            player.r = 14;
            fishes.splice(i, 1);
            if (popups) popups.add('BỊ CẮN! -150 ĐIỂM', player.x, player.y, '#EF4444', 22);
          }
        } else if (f.x < -70 || f.x > canvas.width + 70) {
          fishes.splice(i, 1);
        }
      }

      // Frenzy decay
      if (frenzy > 0) frenzy -= 0.12;

      // HUD Update
      const sEl = container.querySelector('#ffScore');
      const szEl = container.querySelector('#ffSize');
      const fzEl = container.querySelector('#ffFrenzy');
      const dEl = container.querySelector('#ffDash');
      if (sEl) sEl.textContent = score;
      if (szEl) szEl.textContent = fishSize === 1 ? 'Cá bột (Nhỏ)' : fishSize === 2 ? 'Cá trung (Vừa)' : 'Vua Biển Sâu (Khủng)';
      if (fzEl) fzEl.textContent = `${Math.floor(frenzy)}%`;
      if (dEl) {
        dEl.textContent = dashCooldown <= 0 ? 'SẴN SÀNG' : `${(dashCooldown / 60).toFixed(1)}s`;
        dEl.style.color = dashCooldown <= 0 ? '#10B981' : '#94A3B8';
      }

      // --- DRAW DEEP OCEAN ---
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      oceanGrad.addColorStop(0, '#0284C7');
      oceanGrad.addColorStop(1, '#0C4A6E');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sunlight caustics
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let s = 0; s < 5; s++) {
        ctx.beginPath();
        const sx = s * 110 + Math.sin(tick * 0.02 + s) * 20;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + 50, canvas.height);
        ctx.lineTo(sx + 20, canvas.height);
        ctx.lineTo(sx - 20, 0);
        ctx.fill();
      }

      // Seabed sand
      ctx.fillStyle = '#CA8A04';
      ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
      ctx.fillStyle = '#A16207';
      ctx.fillRect(0, canvas.height - 6, canvas.width, 6);

      // Waving green seaweed
      ctx.fillStyle = '#15803D';
      [30, 80, 160, 240, 320, 440, 480].forEach((wx, wi) => {
        const sway = Math.sin(tick * 0.04 + wi) * 12;
        ctx.beginPath();
        ctx.moveTo(wx, canvas.height - 20);
        ctx.quadraticCurveTo(wx + sway, canvas.height - 60, wx + sway * 1.5, canvas.height - 90);
        ctx.quadraticCurveTo(wx + sway * 0.5, canvas.height - 55, wx + 6, canvas.height - 20);
        ctx.fill();
      });

      // Ambient rising bubbles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let b = 0; b < 6; b++) {
        const bx = (b * 90 + Math.sin(tick * 0.03 + b) * 15) % canvas.width;
        const by = (canvas.height - (tick * 1.5 + b * 60) % canvas.height);
        ctx.beginPath();
        ctx.arc(bx, by, 3 + (b % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Giant Clam at seabed
      ctx.save();
      ctx.translate(clam.x, clam.y);

      // Clam Shell base
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(0, 8, clam.w / 2, clam.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top shell hinge angle based on state
      let openAngle = 0;
      if (clam.state === 'opening') openAngle = -0.5 * (clam.timer / 60);
      else if (clam.state === 'open') openAngle = -0.55;
      else if (clam.state === 'snapping') openAngle = -0.55 + (clam.timer / 20) * 0.55;

      // Pearl inside if open
      if ((clam.state === 'open' || clam.state === 'opening') && clam.hasPearl) {
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper Shell
      ctx.save();
      ctx.translate(-clam.w / 2, 4);
      ctx.rotate(openAngle);
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.ellipse(clam.w / 2, -4, clam.w / 2, clam.h / 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // Draw Starfish
      if (starfish) {
        ctx.save();
        ctx.translate(starfish.x, starfish.y);
        ctx.rotate(starfish.rot);
        ctx.fillStyle = '#F59E0B';
        for (let a = 0; a < 5; a++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const ang = (a * Math.PI * 2) / 5;
          ctx.lineTo(Math.cos(ang) * 14, Math.sin(ang) * 14);
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#F59E0B';
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Other Fishes
      fishes.forEach(f => {
        const dir = f.speed > 0 ? 1 : -1;
        drawFishSprite(f.x, f.y, f.r, f.color, dir, false, 0);
      });

      // Draw Player Fish
      drawFishSprite(player.x, player.y, player.r, '#EA580C', player.facing, true, player.mouthOpen);

      // Dash aura particles when dashing
      if (isDashing) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Particles & Popups
      if (particles) particles.updateAndDraw(ctx);
      if (popups) popups.updateAndDraw(ctx);

      // Frenzy Banner if active
      if (frenzy > 80) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.font = '900 24px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 FRENZY! NHÂN ĐÔI ĐIỂM SỐ! 🔥', canvas.width / 2, 45);
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') {
        window.NP_Audio.stopBGM();
      }
    });
  }

  // =========================================================================
  // 6. ENGINE: PLANTS VS ZOMBIES 2D (POPCAP LAWN DEFENSE ENGINE)
  // =========================================================================
  function launchPvZ(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let sun = 150;
    let score = 0;
    let wave = 1;
    const maxWaves = 5;
    let animId = null;
    let selectedTool = 'peashooter'; // 'peashooter' | 'sunflower' | 'wallnut' | 'cherrybomb' | 'shovel'
    let waveAlert = null; // { text: string, timer: number }
    let scorchMarks = []; // { x, y, radius, alpha }

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('pvz');
    }

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud" style="font-family: Calibri, sans-serif;">
          <div class="hud-pill">Mặt trời: <span id="pvzSun" style="color: #FBBF24; font-weight: bold;">150</span></div>
          <div class="hud-pill">Đợt tấn công: <span id="pvzWave" style="color: #EF4444; font-weight: bold;">1/5</span></div>
          <div class="hud-pill">Điểm: <span id="pvzScore" style="color: #10B981; font-weight: bold;">0</span></div>
        </div>
        <div style="display: flex; gap: 6px; justify-content: center; margin: 6px 0; flex-wrap: wrap;">
          <button class="v-btn pvz-card active" data-plant="peashooter" style="padding: 4px 8px; font-weight: 700;">🟢 Đậu (100☀️)</button>
          <button class="v-btn pvz-card" data-plant="sunflower" style="padding: 4px 8px; font-weight: 700;">🌻 Hướng Dương (50☀️)</button>
          <button class="v-btn pvz-card" data-plant="wallnut" style="padding: 4px 8px; font-weight: 700;">🥔 Óc Chó (50☀️)</button>
          <button class="v-btn pvz-card" data-plant="cherrybomb" style="padding: 4px 8px; font-weight: 700; background: #DC2626; color: #FFF;" title="Nổ 3x3 diện rộng">🍒 Cherry Bùm (150☀️)</button>
          <button class="v-btn pvz-card" data-plant="shovel" style="padding: 4px 8px; font-weight: 700; background: #475569; color: #FFF;" title="Đào bỏ cây">🪓 Xẻng</button>
        </div>
        <canvas id="pvzCanvas" width="480" height="260" class="canvas-main-viewport" style="background: #15803D; display: block; margin: 0 auto; cursor: crosshair;"></canvas>
      </div>
    `;

    const canvas = container.querySelector('#pvzCanvas');
    const ctx = canvas.getContext('2d');

    const lanes = 5;
    const laneH = canvas.height / lanes;
    const cols = 8;
    const colW = (canvas.width - 70) / cols;

    let plants = [];
    let zombies = [];
    let peas = [];
    let suns = [];
    let mowers = [true, true, true, true, true];
    let activeMowers = [];
    let tick = 0;
    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

    let hoverTile = { col: -1, lane: -1 };

    container.querySelectorAll('.pvz-card').forEach(b => {
      b.addEventListener('click', () => {
        container.querySelectorAll('.pvz-card').forEach(c => c.classList.remove('active'));
        b.classList.add('active');
        selectedTool = b.getAttribute('data-plant');
        if (window.NP_Juice) window.NP_Juice.vibrate(8);
      });
    });

    function handlePointerMove(cx, cy) {
      // 1. Magnet Auto-Collection for Suns (within 36px)
      for (let i = suns.length - 1; i >= 0; i--) {
        if (Math.hypot(cx - suns[i].x, cy - suns[i].y) < 36) {
          sun += 25;
          if (window.NP_Audio) window.NP_Audio.coin();
          if (window.NP_Juice) window.NP_Juice.vibrate(12);
          if (popups) popups.add('+25☀️', suns[i].x, suns[i].y - 10, '#FBBF24', 18);
          suns.splice(i, 1);
          updateHUD();
          break;
        }
      }

      // 2. Hover tile calculation for Ghost Plant preview
      const col = Math.floor((cx - 45) / colW);
      const lane = Math.floor(cy / laneH);
      if (col >= 0 && col < cols && lane >= 0 && lane < lanes) {
        hoverTile = { col, lane };
      } else {
        hoverTile = { col: -1, lane: -1 };
      }
    }

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      handlePointerMove((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      handlePointerMove((e.touches[0].clientX - rect.left) * scaleX, (e.touches[0].clientY - rect.top) * scaleY);
    }, { passive: false });

    canvas.addEventListener('mouseleave', () => { hoverTile = { col: -1, lane: -1 }; });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      // Click sun manual check
      for (let i = suns.length - 1; i >= 0; i--) {
        if (Math.hypot(cx - suns[i].x, cy - suns[i].y) < 28) {
          sun += 25;
          if (window.NP_Audio) window.NP_Audio.coin();
          if (window.NP_Juice) window.NP_Juice.vibrate(12);
          if (popups) popups.add('+25☀️', suns[i].x, suns[i].y - 10, '#FBBF24', 18);
          suns.splice(i, 1);
          updateHUD();
          return;
        }
      }

      // Grid position
      const col = Math.floor((cx - 45) / colW);
      const lane = Math.floor(cy / laneH);

      if (col >= 0 && col < cols && lane >= 0 && lane < lanes) {
        const existingPlantIdx = plants.findIndex(p => p.col === col && p.lane === lane);

        // Shovel tool: dig up plant
        if (selectedTool === 'shovel') {
          if (existingPlantIdx !== -1) {
            const p = plants[existingPlantIdx];
            plants.splice(existingPlantIdx, 1);
            if (window.NP_Audio) window.NP_Audio.pop();
            if (window.NP_Juice) window.NP_Juice.vibrate(15);
            if (particles) {
              particles.spawn(p.col * colW + 55, p.lane * laneH + laneH / 2, 8, {
                colors: ['#78350F', '#15803D', '#A16207'],
                speed: 2
              });
            }
          }
          return;
        }

        // Planting
        if (existingPlantIdx === -1) {
          if (selectedTool === 'peashooter' && sun >= 100) {
            sun -= 100;
            plants.push({ col, lane, type: 'peashooter', hp: 100, maxHp: 100, lastShot: Date.now(), shootRecoil: 0 });
            if (window.NP_Audio) window.NP_Audio.pop();
            if (window.NP_Juice) window.NP_Juice.vibrate(20);
          } else if (selectedTool === 'sunflower' && sun >= 50) {
            sun -= 50;
            plants.push({ col, lane, type: 'sunflower', hp: 100, maxHp: 100, lastSun: Date.now() });
            if (window.NP_Audio) window.NP_Audio.pop();
            if (window.NP_Juice) window.NP_Juice.vibrate(20);
          } else if (selectedTool === 'wallnut' && sun >= 50) {
            sun -= 50;
            plants.push({ col, lane, type: 'wallnut', hp: 400, maxHp: 400 });
            if (window.NP_Audio) window.NP_Audio.pop();
            if (window.NP_Juice) window.NP_Juice.vibrate(20);
          } else if (selectedTool === 'cherrybomb' && sun >= 150) {
            sun -= 150;
            plants.push({
              col, lane,
              type: 'cherrybomb',
              hp: 100,
              maxHp: 100,
              plantTime: Date.now(),
              exploded: false
            });
            if (window.NP_Audio) window.NP_Audio.pop();
            if (window.NP_Juice) window.NP_Juice.vibrate(25);
          }
          updateHUD();
        }
      }
    });

    function updateHUD() {
      const sEl = container.querySelector('#pvzSun');
      const wEl = container.querySelector('#pvzWave');
      const scEl = container.querySelector('#pvzScore');
      if (sEl) sEl.textContent = sun;
      if (wEl) wEl.textContent = `${wave}/${maxWaves}`;
      if (scEl) scEl.textContent = score;
    }

    function triggerWaveAlert(text) {
      waveAlert = { text, timer: 140 };
      if (window.NP_Audio && typeof window.NP_Audio.alarm === 'function') {
        window.NP_Audio.alarm();
      }
      if (window.NP_Juice) {
        window.NP_Juice.screenShake(canvas, 12, 600);
      }
    }

    // Spawn zombie variants
    function spawnZombie(forceType = null) {
      const zTypes = ['normal', 'conehead', 'buckethead'];
      const r = Math.random();
      let type = forceType || (r < 0.45 ? 'normal' : r < 0.8 ? 'conehead' : 'buckethead');
      
      let hp = 100;
      if (type === 'conehead') hp = 260;
      else if (type === 'buckethead') hp = 450;
      else if (type === 'flag') hp = 120;

      zombies.push({
        x: canvas.width + 15,
        lane: Math.floor(Math.random() * lanes),
        type: type,
        hp: hp,
        maxHp: hp,
        speed: (type === 'flag' ? 0.46 : 0.32) + wave * 0.03,
        walkPhase: Math.random() * Math.PI * 2,
        isEating: false
      });
    }

    let zombieSpawnTimer = 0;
    let zombiesSpawnedInWave = 0;
    const zombiesPerWave = [6, 10, 14, 18, 24];

    function loop() {
      tick++;

      // Wave alert banner countdown
      if (waveAlert) {
        waveAlert.timer--;
        if (waveAlert.timer <= 0) waveAlert = null;
      }

      // Sky sun spawning
      if (Math.random() < 0.009) {
        suns.push({
          x: 60 + Math.random() * (canvas.width - 120),
          y: -10,
          targetY: 40 + Math.random() * (canvas.height - 80),
          rot: 0
        });
      }

      suns.forEach(s => {
        if (s.y < s.targetY) s.y += 1.2;
        s.rot += 0.03;
      });

      // Wave Spawning Controller
      zombieSpawnTimer++;
      const quota = zombiesPerWave[Math.min(maxWaves - 1, wave - 1)];
      if (zombiesSpawnedInWave < quota) {
        if (zombieSpawnTimer > Math.max(90, 240 - wave * 30)) {
          zombieSpawnTimer = 0;
          zombiesSpawnedInWave++;
          // Lead flag zombie on huge wave announcement
          if (zombiesSpawnedInWave === quota - 4 && (wave === 3 || wave === 5)) {
            triggerWaveAlert(wave === 5 ? '⚠️ ĐỢT TẤN CÔNG CUỐI CÙNG! ⚠️' : '⚠️ ĐỢT ZOMBIE KHỔNG LỒ TIẾP CẬN! ⚠️');
            spawnZombie('flag');
          } else {
            spawnZombie();
          }
        }
      } else if (zombies.length === 0 && wave < maxWaves) {
        // Advance wave
        wave++;
        zombiesSpawnedInWave = 0;
        zombieSpawnTimer = -100;
        if (window.NP_Audio) window.NP_Audio.win();
        if (popups) popups.add(`TIẾN VÀO ĐỢT ${wave}!`, canvas.width / 2, 70, '#38BDF8', 22);
        updateHUD();
      } else if (zombies.length === 0 && wave >= maxWaves) {
        // VICTORY!
        if (window.showToastNotification) {
          window.showToastNotification('🎉 CHIẾN THẮNG! Bạn đã bảo vệ an toàn cho khu vườn!');
        }
      }

      // Plants action
      const now = Date.now();
      for (let pi = plants.length - 1; pi >= 0; pi--) {
        const p = plants[pi];
        if (p.shootRecoil > 0) p.shootRecoil -= 0.15;

        if (p.type === 'peashooter') {
          const targetZombie = zombies.find(z => z.lane === p.lane && z.x > (p.col * colW + 65));
          if (targetZombie && now - p.lastShot > 1400) {
            peas.push({ x: p.col * colW + 65, y: p.lane * laneH + laneH / 2, lane: p.lane });
            p.lastShot = now;
            p.shootRecoil = 1.0;
            if (window.NP_Audio) window.NP_Audio.pop();
          }
        } else if (p.type === 'sunflower' && now - p.lastSun > 7500) {
          suns.push({
            x: p.col * colW + 55,
            y: p.lane * laneH + 15,
            targetY: p.lane * laneH + 20,
            rot: 0
          });
          p.lastSun = now;
          if (window.NP_Audio) window.NP_Audio.pop();
        } else if (p.type === 'cherrybomb') {
          const elapsed = now - p.plantTime;
          // Explode after 1200ms
          if (elapsed > 1200 && !p.exploded) {
            p.exploded = true;
            const cx = p.col * colW + 55;
            const cy = p.lane * laneH + laneH / 2;

            if (window.NP_Audio) window.NP_Audio.explosion(true);
            if (window.NP_Juice) {
              window.NP_Juice.screenShake(canvas, 18, 500);
              window.NP_Juice.triggerHitstop(45);
            }
            if (popups) popups.add('💥 BÙM! 🍒', cx, cy - 20, '#EF4444', 26);

            // Scorch mark
            scorchMarks.push({ x: cx, y: cy, radius: 45, alpha: 0.8 });

            // Explosion particles
            if (particles) {
              particles.spawn(cx, cy, 35, {
                colors: ['#EF4444', '#F59E0B', '#1E293B', '#78350F'],
                speed: 6,
                size: 5
              });
            }

            // Wipe zombies in 3x3 tiles
            zombies.forEach(z => {
              const inLane = Math.abs(z.lane - p.lane) <= 1;
              const inColDist = Math.abs(z.x - cx) < colW * 1.5;
              if (inLane && inColDist) {
                z.hp -= 1800; // instant ash kill
              }
            });

            plants.splice(pi, 1);
            continue;
          }
        }
      }

      // Update Scorch Marks
      scorchMarks.forEach(sm => {
        if (sm.alpha > 0.005) sm.alpha -= 0.002;
      });

      // Peas movement & collision
      for (let i = peas.length - 1; i >= 0; i--) {
        const pea = peas[i];
        pea.x += 4.5;
        let hit = false;
        for (let zi = zombies.length - 1; zi >= 0; zi--) {
          const z = zombies[zi];
          if (z.lane === pea.lane && Math.abs(z.x - pea.x) < 16) {
            z.hp -= 20;
            hit = true;

            // Audio feedback based on armor
            if (z.type === 'buckethead' && z.hp > 100) {
              if (window.NP_Audio && typeof window.NP_Audio.metalClank === 'function') {
                window.NP_Audio.metalClank();
              }
              if (particles) {
                particles.spawn(pea.x, pea.y, 6, {
                  shape: 'circle',
                  colors: ['#CBD5E1', '#F8FAFC', '#F59E0B'],
                  speed: 3,
                  size: 2
                });
              }
            } else {
              if (window.NP_Audio && typeof window.NP_Audio.splat === 'function') {
                window.NP_Audio.splat();
              }
              if (particles) {
                particles.spawn(pea.x, pea.y, 6, {
                  shape: 'circle',
                  colors: ['#86EFAC', '#4ADE80', '#22C55E'],
                  speed: 2,
                  size: 2.5
                });
              }
            }
            break;
          }
        }
        if (hit || pea.x > canvas.width) peas.splice(i, 1);
      }

      // Update active lawnmowers
      for (let mi = activeMowers.length - 1; mi >= 0; mi--) {
        const am = activeMowers[mi];
        am.x += 7;
        for (let zi = zombies.length - 1; zi >= 0; zi--) {
          const z = zombies[zi];
          if (z.lane === am.lane && Math.abs(z.x - am.x) < 25) {
            z.hp = 0;
            if (window.NP_Audio) window.NP_Audio.explosion(false);
          }
        }
        if (am.x > canvas.width + 40) {
          activeMowers.splice(mi, 1);
        }
      }

      // Zombies movement & eat plants
      for (let i = zombies.length - 1; i >= 0; i--) {
        const z = zombies[i];
        if (z.hp <= 0) {
          score += 100;
          if (window.NP_Audio) window.NP_Audio.thud(120);
          if (particles) {
            particles.spawn(z.x, z.lane * laneH + laneH / 2, 14, {
              shape: 'circle',
              colors: ['#475569', '#334155', '#64748B', '#15803D'],
              speed: 3
            });
          }
          if (popups) popups.add('+100', z.x, z.lane * laneH + 15, '#F59E0B', 18);
          zombies.splice(i, 1);
          updateHUD();
          continue;
        }

        const plantAhead = plants.find(p => p.lane === z.lane && Math.abs((p.col * colW + 55) - z.x) < 18);
        if (plantAhead) {
          z.isEating = true;
          plantAhead.hp -= 0.6;
          if (tick % 24 === 0) {
            if (window.NP_Audio && typeof window.NP_Audio.chomp === 'function') {
              window.NP_Audio.chomp();
            }
          }
          if (plantAhead.hp <= 0) {
            plants = plants.filter(p => p !== plantAhead);
            z.isEating = false;
          }
        } else {
          z.isEating = false;
          z.x -= z.speed;
        }

        // Zombie reached house
        if (z.x < 35) {
          if (mowers[z.lane]) {
            mowers[z.lane] = false;
            activeMowers.push({ x: 20, lane: z.lane });
            if (window.NP_Audio) window.NP_Audio.explosion(true);
            if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 10, 300);
            if (popups) popups.add('MÁY CẮT CỎ KÍCH HOẠT!', canvas.width / 2, z.lane * laneH + 20, '#EF4444', 20);
          } else {
            if (window.NP_Audio) window.NP_Audio.explosion(true);
            zombies = [];
            plants = [];
            sun = 150;
            wave = 1;
            zombiesSpawnedInWave = 0;
            mowers = [true, true, true, true, true];
            if (window.showToastNotification) window.showToastNotification('🧟 Zombie đã tràn vào nhà! Bắt đầu lại ván mới.');
            updateHUD();
            break;
          }
        }
      }

      // --- DRAW LAWN SCENE ---
      for (let l = 0; l < lanes; l++) {
        ctx.fillStyle = l % 2 === 0 ? '#15803D' : '#166534';
        ctx.fillRect(0, l * laneH, canvas.width, laneH);
      }

      // Grid line guides
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= cols; c++) {
        const gx = 45 + c * colW;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }

      // Ghost Plant Preview Tile
      if (hoverTile.col >= 0 && hoverTile.lane >= 0) {
        const hx = 45 + hoverTile.col * colW;
        const hy = hoverTile.lane * laneH;
        const existingP = plants.find(p => p.col === hoverTile.col && p.lane === hoverTile.lane);

        const costMap = { peashooter: 100, sunflower: 50, wallnut: 50, cherrybomb: 150, shovel: 0 };
        const cost = costMap[selectedTool] || 0;
        const canPlant = selectedTool === 'shovel' ? !!existingP : (!existingP && sun >= cost);

        ctx.strokeStyle = canPlant ? '#22C55E' : '#EF4444';
        ctx.lineWidth = 2;
        ctx.fillStyle = canPlant ? 'rgba(34, 197, 94, 0.22)' : 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(hx + 2, hy + 2, colW - 4, laneH - 4);
        ctx.strokeRect(hx + 2, hy + 2, colW - 4, laneH - 4);

        if (canPlant && selectedTool !== 'shovel') {
          ctx.save();
          ctx.globalAlpha = 0.55;
          const px = hx + colW / 2;
          const py = hy + laneH / 2;
          if (selectedTool === 'peashooter') {
            ctx.fillStyle = '#22C55E';
            ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(px + 4, py - 4, 12, 8);
          } else if (selectedTool === 'sunflower') {
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#78350F';
            ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
          } else if (selectedTool === 'wallnut') {
            ctx.fillStyle = '#D97706';
            ctx.beginPath(); ctx.ellipse(px, py, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
          } else if (selectedTool === 'cherrybomb') {
            ctx.fillStyle = '#DC2626';
            ctx.beginPath(); ctx.arc(px - 5, py + 3, 9, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px + 5, py + 1, 9, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
      }

      // Scorch Marks from Cherry Bomb
      scorchMarks.forEach(sm => {
        ctx.fillStyle = `rgba(30, 41, 59, ${sm.alpha})`;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Lawnmowers
      for (let l = 0; l < lanes; l++) {
        if (mowers[l]) {
          const my = l * laneH + laneH / 2;
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(10, my - 10, 24, 20);
          ctx.fillStyle = '#1F2937';
          ctx.beginPath();
          ctx.arc(14, my + 10, 4, 0, Math.PI * 2);
          ctx.arc(30, my + 10, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      activeMowers.forEach(am => {
        const my = am.lane * laneH + laneH / 2;
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(am.x, my - 12, 28, 24);
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(am.x + 28, my, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Plants
      plants.forEach(p => {
        const px = p.col * colW + 55;
        const py = p.lane * laneH + laneH / 2;
        const sway = Math.sin(tick * 0.08 + p.col) * 2;

        if (p.type === 'peashooter') {
          // Leaf base
          ctx.fillStyle = '#15803D';
          ctx.beginPath();
          ctx.ellipse(px, py + 14, 12, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Green Stem
          ctx.fillStyle = '#16A34A';
          ctx.beginPath();
          ctx.moveTo(px - 2, py + 14);
          ctx.quadraticCurveTo(px + sway, py, px - 2, py - 4);
          ctx.lineTo(px + 2, py - 4);
          ctx.quadraticCurveTo(px + sway, py, px + 2, py + 14);
          ctx.fill();

          // Head with animated Snout
          const recoilX = p.shootRecoil * 5;
          ctx.fillStyle = '#22C55E';
          ctx.beginPath();
          ctx.arc(px - recoilX, py - 6, 12, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#16A34A';
          ctx.beginPath();
          ctx.arc(px + 10 - recoilX, py - 6, 7 + p.shootRecoil * 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(px - 2 - recoilX, py - 10, 2.5, 0, Math.PI * 2);
          ctx.fill();

        } else if (p.type === 'sunflower') {
          ctx.fillStyle = '#FBBF24';
          for (let a = 0; a < 8; a++) {
            const angle = (a * Math.PI) / 4 + Math.sin(tick * 0.04) * 0.1;
            const petX = px + Math.cos(angle) * 14;
            const petY = (py - 4) + Math.sin(angle) * 14;
            ctx.beginPath();
            ctx.arc(petX, petY, 6, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#78350F';
          ctx.beginPath();
          ctx.arc(px, py - 4, 11, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(px - 4, py - 6, 1.8, 0, Math.PI * 2);
          ctx.arc(px + 4, py - 6, 1.8, 0, Math.PI * 2);
          ctx.arc(px, py - 2, 3, 0, Math.PI);
          ctx.fill();

        } else if (p.type === 'wallnut') {
          ctx.fillStyle = '#92400E';
          ctx.beginPath();
          ctx.ellipse(px, py, 14, 18, 0, 0, Math.PI * 2);
          ctx.fill();

          if (p.hp < p.maxHp * 0.6) {
            ctx.strokeStyle = '#451A03';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px - 8, py - 8);
            ctx.lineTo(px + 2, py);
            ctx.lineTo(px - 4, py + 10);
            ctx.stroke();
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(px - 4, py - 6, 4, 0, Math.PI * 2);
          ctx.arc(px + 4, py - 6, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(px - 3, py - 6, 2, 0, Math.PI * 2);
          ctx.arc(px + 5, py - 6, 2, 0, Math.PI * 2);
          ctx.fill();

        } else if (p.type === 'cherrybomb') {
          // Double cherries with fuse and vibrating swelling animation
          const elapsed = Date.now() - p.plantTime;
          const vib = Math.sin(elapsed * 0.05) * (elapsed / 300);
          const swell = 1 + (elapsed / 1200) * 0.35;

          ctx.save();
          ctx.translate(px + vib, py);
          ctx.scale(swell, swell);

          // Green stems joined together
          ctx.strokeStyle = '#15803D';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-6, -16);
          ctx.quadraticCurveTo(0, -22, 6, -16);
          ctx.moveTo(0, -20);
          ctx.lineTo(0, -25);
          ctx.stroke();

          // Left Cherry
          ctx.fillStyle = '#DC2626';
          ctx.beginPath();
          ctx.arc(-8, -4, 10, 0, Math.PI * 2);
          ctx.fill();
          // Right Cherry
          ctx.beginPath();
          ctx.arc(8, -2, 10, 0, Math.PI * 2);
          ctx.fill();

          // Angry Eyes
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(-8, -6, 3, 0, Math.PI * 2);
          ctx.arc(8, -4, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(-7, -6, 1.5, 0, Math.PI * 2);
          ctx.arc(9, -4, 1.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });

      // Draw Green Peas
      peas.forEach(pea => {
        ctx.fillStyle = '#4ADE80';
        ctx.beginPath();
        ctx.arc(pea.x, pea.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#BBF7D0';
        ctx.beginPath();
        ctx.arc(pea.x - 1.5, pea.y - 1.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Zombies
      zombies.forEach(z => {
        const zy = z.lane * laneH + laneH / 2;
        const limpTilt = Math.sin(tick * 0.12 + z.walkPhase) * 0.15;

        ctx.save();
        ctx.translate(z.x, zy);
        ctx.rotate(limpTilt);

        // Brown Ragged Coat
        ctx.fillStyle = '#78350F';
        ctx.fillRect(-8, -10, 16, 22);

        // Red Tie
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-2, -8, 4, 12);

        // Blue Pants & Dragging Legs
        ctx.fillStyle = '#1E3A8A';
        ctx.fillRect(-7, 12, 5, 12);
        ctx.fillRect(2, 12, 5, 12);

        // Pale Undead Green Head
        ctx.fillStyle = '#84CC16';
        ctx.beginPath();
        ctx.arc(0, -18, 10, 0, Math.PI * 2);
        ctx.fill();

        // Wild Yellow Eyes
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(-4, -20, 3, 0, Math.PI * 2);
        ctx.arc(3, -20, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(-5, -20, 1.5, 0, Math.PI * 2);
        ctx.arc(2, -20, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Ragged Open Mouth
        ctx.fillStyle = '#451A03';
        ctx.beginPath();
        ctx.arc(0, -14, 4, 0, Math.PI);
        ctx.fill();

        // CONEHEAD ZOMBIE HAT
        if (z.type === 'conehead' && z.hp > 100) {
          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.moveTo(0, -40);
          ctx.lineTo(-8, -24);
          ctx.lineTo(8, -24);
          ctx.closePath();
          ctx.fill();
          // White reflective band
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-5, -31, 10, 3);
        }

        // BUCKETHEAD ZOMBIE HAT
        if (z.type === 'buckethead' && z.hp > 100) {
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(-9, -34, 18, 14);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-9, -34, 18, 14);
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(-8, -32, 16, 3);
        }

        // FLAG ZOMBIE
        if (z.type === 'flag') {
          // Pole in hand
          ctx.strokeStyle = '#78350F';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(8, 6);
          ctx.lineTo(8, -36);
          ctx.stroke();
          // Red flag with skull
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(8, -36, 16, 12);
        }

        ctx.restore();
      });

      // Draw Golden Suns
      suns.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);

        ctx.fillStyle = '#FBBF24';
        for (let r = 0; r < 8; r++) {
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-14, -4, 28, 8);
        }

        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Wave Alert Overlay Banner
      if (waveAlert) {
        ctx.fillStyle = `rgba(220, 38, 38, ${0.7 + Math.sin(tick * 0.25) * 0.25})`;
        ctx.fillRect(0, canvas.height / 2 - 25, canvas.width, 50);
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, canvas.height / 2 - 25, canvas.width, 50);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(waveAlert.text, canvas.width / 2, canvas.height / 2 + 6);
      }

      // Particles & Popups
      if (particles) particles.updateAndDraw(ctx);
      if (popups) popups.updateAndDraw(ctx);

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') {
        window.NP_Audio.stopBGM();
      }
    });
  }

  // =========================================================================
  // 7. ENGINE: BẮN GÀ VŨ TRỤ (CHICKEN INVADERS / GALAGA RETRO ENGINE)
  // =========================================================================
  function launchChickenInvaders(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let score = 0;
    let wave = 1;
    let lives = 3;
    let weaponLevel = 1; // 1 to 4
    let missiles = 1; // Space Nuke missiles
    let drumstickCount = 0;
    let animId = null;
    let boss = null;

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('chicken');
    }

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud" style="font-family: Calibri, sans-serif;">
          <div class="hud-pill">Mạng: <span id="ciLives" style="color: #EF4444; font-weight: bold;">❤️❤️❤️</span></div>
          <div class="hud-pill">Đợt: <span id="ciWave" style="color: #F59E0B; font-weight: bold;">Đợt 1</span></div>
          <div class="hud-pill">Súng: <span id="ciGun" style="color: #38BDF8; font-weight: bold;">Cấp 1</span></div>
          <div class="hud-pill">Nuke: <span id="ciMissiles" style="color: #F43F5E; font-weight: bold;">x1 [Shift]</span></div>
          <div class="hud-pill">Điểm: <span id="ciScore" style="color: #10B981; font-weight: bold;">0</span></div>
        </div>
        <canvas id="ciCanvas" width="460" height="340" class="canvas-main-viewport" style="background: #030712; display: block; margin: 0 auto; cursor: crosshair;"></canvas>
        <div class="canvas-controls-bar" style="gap: 8px; justify-content: center;">
          <button class="v-btn" id="ciNukeBtn" style="background: #E11D48; color: #FFF; font-weight: 900; padding: 4px 14px;">🚀 PHÓNG NUKE [SHIFT]</button>
          <small style="color: #94A3B8; font-family: Calibri, sans-serif;">Rê chuột / Mũi tên: Bay • Chuột trái / Space: Bắn • Shift: Nuke hủy diệt</small>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#ciCanvas');
    const ctx = canvas.getContext('2d');

    let ship = { x: 230, y: 300, recoil: 0, invuln: 0 };
    let lasers = [];
    let chickens = [];
    let eggs = [];
    let drumsticks = [];
    let gifts = []; // { x, y, vy, rot }
    let tick = 0;
    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

    function initWave(w) {
      wave = w;
      chickens = [];
      eggs = [];
      boss = null;

      if (w % 5 === 0) {
        // GIANT BOSS CHICKEN WAVE
        if (window.NP_Audio && typeof window.NP_Audio.alarm === 'function') {
          window.NP_Audio.alarm();
        }
        if (popups) popups.add('⚠️ BOSS GÀ KHỔNG LỒ XUẤT HIỆN! ⚠️', canvas.width / 2, 70, '#EF4444', 24);
        boss = {
          x: canvas.width / 2,
          y: 65,
          vx: 2.2,
          hp: 600,
          maxHp: 600,
          shootTimer: 0,
          wingPhase: 0
        };
      } else {
        // Standard chicken formation
        const rows = Math.min(4, 2 + Math.floor(w / 2));
        const cols = 8;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            chickens.push({
              x: 45 + c * 48,
              y: 40 + r * 38,
              vx: 1.2 + w * 0.15,
              wingPhase: (c + r) * 0.5,
              hp: 1,
              isSpecial: Math.random() < 0.12 // Chance to drop gift
            });
          }
        }
      }
      updateHUD();
    }

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      ship.x = Math.max(18, Math.min(canvas.width - 18, (e.clientX - rect.left) * scaleX));
      ship.y = Math.max(80, Math.min(canvas.height - 20, (e.clientY - rect.top) * scaleY));
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        ship.x = Math.max(18, Math.min(canvas.width - 18, (e.touches[0].clientX - rect.left) * scaleX));
        ship.y = Math.max(80, Math.min(canvas.height - 20, (e.touches[0].clientY - rect.top) * scaleY));
      }
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        ship.x = Math.max(18, Math.min(canvas.width - 18, (e.touches[0].clientX - rect.left) * scaleX));
        ship.y = Math.max(80, Math.min(canvas.height - 20, (e.touches[0].clientY - rect.top) * scaleY));
        fire();
      }
    }, { passive: false });

    const fire = () => {
      if (ship.recoil > 0) return;
      ship.recoil = 5;

      if (weaponLevel === 1) {
        // Dual laser
        lasers.push({ x: ship.x - 8, y: ship.y - 14, vx: 0, vy: -9, color: '#38BDF8', size: 3, dmg: 1 });
        lasers.push({ x: ship.x + 8, y: ship.y - 14, vx: 0, vy: -9, color: '#38BDF8', size: 3, dmg: 1 });
      } else if (weaponLevel === 2) {
        // Triple spread green lasers
        lasers.push({ x: ship.x, y: ship.y - 14, vx: 0, vy: -9.5, color: '#4ADE80', size: 3.5, dmg: 1.2 });
        lasers.push({ x: ship.x - 10, y: ship.y - 12, vx: -1.8, vy: -9.2, color: '#4ADE80', size: 3, dmg: 1.2 });
        lasers.push({ x: ship.x + 10, y: ship.y - 12, vx: 1.8, vy: -9.2, color: '#4ADE80', size: 3, dmg: 1.2 });
      } else if (weaponLevel === 3) {
        // Quad red plasma bolts
        [-12, -4, 4, 12].forEach(ox => {
          lasers.push({ x: ship.x + ox, y: ship.y - 14, vx: 0, vy: -10, color: '#F43F5E', size: 4, dmg: 1.6 });
        });
      } else {
        // Level 4: Lightning Photon Storm
        [-14, -7, 0, 7, 14].forEach((ox, idx) => {
          const vx = (idx - 2) * 1.5;
          lasers.push({ x: ship.x + ox, y: ship.y - 14, vx: vx, vy: -11, color: '#FBBF24', size: 4.5, dmg: 2.2 });
        });
      }

      if (window.NP_Audio && typeof window.NP_Audio.laser === 'function') {
        window.NP_Audio.laser();
      }
    };

    function triggerNuke() {
      if (missiles <= 0) return;
      missiles--;
      updateHUD();

      if (window.NP_Audio) window.NP_Audio.explosion(true);
      if (window.NP_Juice) {
        window.NP_Juice.screenShake(canvas, 24, 700);
        window.NP_Juice.triggerHitstop(60);
      }
      if (popups) popups.add('💥 NUKE BÙM TOÀN MÀN HÌNH! 🚀', canvas.width / 2, canvas.height / 2, '#F43F5E', 28);

      // Wipe all eggs
      eggs = [];

      // Vaporize normal chickens
      chickens.forEach(c => {
        score += 50;
        drumsticks.push({ x: c.x, y: c.y, vy: 2.2, rot: 0 });
      });
      chickens = [];

      // Damage boss heavily
      if (boss) {
        boss.hp -= 250;
        if (popups) popups.add('-250 HP BOSS!', boss.x, boss.y - 20, '#FBBF24', 24);
      }

      if (particles) {
        particles.spawn(canvas.width / 2, canvas.height / 2, 60, {
          colors: ['#EF4444', '#F59E0B', '#FDE047', '#FFF'],
          speed: 8,
          size: 6
        });
      }
    }

    container.querySelector('#ciNukeBtn').addEventListener('click', triggerNuke);
    canvas.addEventListener('click', fire);

    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        fire();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        triggerNuke();
      }
    };
    listen(window, 'keydown', onKeyDown);

    function updateHUD() {
      const sEl = container.querySelector('#ciScore');
      const wEl = container.querySelector('#ciWave');
      const lEl = container.querySelector('#ciLives');
      const gEl = container.querySelector('#ciGun');
      const mEl = container.querySelector('#ciMissiles');
      if (sEl) sEl.textContent = score;
      if (wEl) wEl.textContent = `Đợt ${wave}`;
      if (lEl) lEl.textContent = '❤️'.repeat(Math.max(0, lives));
      if (gEl) gEl.textContent = `Cấp ${weaponLevel}`;
      if (mEl) mEl.textContent = `x${missiles} [Shift]`;
    }

    function loop() {
      tick++;

      if (window.NP_Juice && window.NP_Juice.isFrozen()) {
        animId = requestAnimationFrame(loop);
        return;
      }

      if (ship.recoil > 0) ship.recoil--;
      if (ship.invuln > 0) ship.invuln--;

      // Lasers movement
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.x += l.vx;
        l.y += l.vy;
        if (l.y < -15 || l.x < -10 || l.x > canvas.width + 10) {
          lasers.splice(i, 1);
        }
      }

      // Standard Chickens movement
      let reverse = false;
      chickens.forEach(c => {
        c.x += c.vx;
        if (c.x > canvas.width - 28 || c.x < 28) reverse = true;

        if (Math.random() < 0.005 + wave * 0.002 && eggs.length < 8) {
          eggs.push({ x: c.x, y: c.y + 12, vy: 2.2 + Math.random() * 0.8, wobble: Math.random() * 5 });
        }
      });
      if (reverse) {
        chickens.forEach(c => {
          c.vx = -c.vx;
          c.y += 12;
        });
      }

      // Boss Chicken movement & attacks
      if (boss) {
        boss.x += boss.vx;
        if (boss.x > canvas.width - 60 || boss.x < 60) boss.vx = -boss.vx;
        boss.wingPhase += 0.2;
        boss.shootTimer++;

        // Boss drops cluster of eggs
        if (boss.shootTimer % 45 === 0) {
          [-20, 0, 20].forEach(ox => {
            eggs.push({ x: boss.x + ox, y: boss.y + 24, vy: 2.6, wobble: Math.random() * 5 });
          });
          if (window.NP_Audio) window.NP_Audio.chickenCluck();
        }

        // Lasers hit Boss
        for (let li = lasers.length - 1; li >= 0; li--) {
          const l = lasers[li];
          if (Math.hypot(l.x - boss.x, l.y - boss.y) < 45) {
            boss.hp -= l.dmg * 8;
            lasers.splice(li, 1);
            if (window.NP_Audio && tick % 4 === 0) window.NP_Audio.hit();
            if (particles) {
              particles.spawn(l.x, l.y, 4, {
                colors: ['#F59E0B', '#EF4444', '#FEF08A'],
                speed: 3
              });
            }

            if (boss.hp <= 0) {
              // Boss Defeated!
              score += 2000;
              if (window.NP_Audio) window.NP_Audio.win();
              if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 20, 600);
              if (popups) popups.add('🏆 HẠ GỤC BOSS GÀ! +2000', boss.x, boss.y, '#FBBF24', 28);
              // Drop tons of drumsticks & gifts
              for (let k = 0; k < 6; k++) {
                drumsticks.push({ x: boss.x + (k - 2.5) * 18, y: boss.y, vy: 2.0, rot: 0 });
              }
              gifts.push({ x: boss.x, y: boss.y, vy: 1.8, rot: 0 });
              boss = null;
              initWave(wave + 1);
              break;
            }
          }
        }
      }

      // Update Gifts
      for (let gi = gifts.length - 1; gi >= 0; gi--) {
        const g = gifts[gi];
        g.y += g.vy;
        g.rot += 0.05;

        // Catch gift
        if (Math.hypot(g.x - ship.x, g.y - ship.y) < 26) {
          weaponLevel = Math.min(4, weaponLevel + 1);
          if (window.NP_Audio) window.NP_Audio.powerup();
          if (popups) popups.add(`NÂNG CẤP VŨ KHÍ CẤP ${weaponLevel}!`, ship.x, ship.y - 20, '#38BDF8', 22, '🎁');
          gifts.splice(gi, 1);
          updateHUD();
        } else if (g.y > canvas.height + 20) {
          gifts.splice(gi, 1);
        }
      }

      // Update Eggs
      for (let ei = eggs.length - 1; ei >= 0; ei--) {
        const egg = eggs[ei];
        egg.y += egg.vy;
        egg.wobble += 0.15;

        if (ship.invuln <= 0 && Math.hypot(egg.x - ship.x, egg.y - ship.y) < 18) {
          lives--;
          ship.invuln = 60;
          weaponLevel = Math.max(1, weaponLevel - 1); // Downgrade weapon slightly on death
          eggs.splice(ei, 1);
          if (window.NP_Audio) window.NP_Audio.explosion(true);
          if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 14, 350);
          if (popups) popups.add('TRÚNG TRỨNG! -1 MẠNG', ship.x, ship.y - 20, '#EF4444', 20);
          updateHUD();
          if (lives <= 0) {
            lives = 3;
            score = 0;
            weaponLevel = 1;
            missiles = 1;
            initWave(1);
          }
          continue;
        }

        if (egg.y >= canvas.height - 10) {
          if (window.NP_Audio && typeof window.NP_Audio.splat === 'function') {
            window.NP_Audio.splat();
          }
          if (particles) {
            particles.spawn(egg.x, canvas.height - 5, 8, {
              shape: 'circle',
              colors: ['#FEF08A', '#FDE047', '#CA8A04'],
              speed: 2,
              gravity: 0.1
            });
          }
          eggs.splice(ei, 1);
        }
      }

      // Lasers hit chickens
      for (let li = lasers.length - 1; li >= 0; li--) {
        const l = lasers[li];
        for (let ci = chickens.length - 1; ci >= 0; ci--) {
          const c = chickens[ci];
          if (Math.hypot(l.x - c.x, l.y - c.y) < 22) {
            score += 50;
            if (window.NP_Audio && typeof window.NP_Audio.chickenCluck === 'function') {
              window.NP_Audio.chickenCluck();
            }
            if (window.NP_Juice && typeof window.NP_Juice.triggerHitstop === 'function') {
              window.NP_Juice.triggerHitstop(35);
            }

            if (particles) {
              particles.spawn(c.x, c.y, 14, {
                shape: 'feather',
                colors: ['#FFFFFF', '#EF4444', '#F3F4F6', '#F59E0B'],
                speed: 4,
                gravity: 0.08
              });
            }

            drumsticks.push({ x: c.x, y: c.y, vy: 2.2, rot: 0 });

            // Drop gift box if special
            if (c.isSpecial) {
              gifts.push({ x: c.x, y: c.y, vy: 1.8, rot: 0 });
            }

            if (popups) popups.add('+50', c.x, c.y - 10, '#38BDF8', 18);

            chickens.splice(ci, 1);
            lasers.splice(li, 1);
            break;
          }
        }
      }

      // Drumsticks falling
      for (let di = drumsticks.length - 1; di >= 0; di--) {
        const d = drumsticks[di];
        d.y += d.vy;
        d.rot += 0.08;

        if (Math.hypot(d.x - ship.x, d.y - ship.y) < 24) {
          score += 100;
          drumstickCount++;
          if (drumstickCount >= 15) {
            drumstickCount = 0;
            missiles = Math.min(3, missiles + 1);
            if (window.NP_Audio) window.NP_Audio.powerup();
            if (popups) popups.add('THƯỞNG +1 NUKE! 🚀', ship.x, ship.y - 30, '#F43F5E', 22);
          }
          if (window.NP_Audio && typeof window.NP_Audio.chomp === 'function') {
            window.NP_Audio.chomp();
          }
          if (popups) popups.add('+100 NHOÀM!', ship.x, ship.y - 20, '#F59E0B', 20, '🍗');
          drumsticks.splice(di, 1);
          updateHUD();
        } else if (d.y > canvas.height + 25) {
          drumsticks.splice(di, 1);
        }
      }

      // Next wave check
      if (chickens.length === 0 && !boss) {
        if (window.NP_Audio) window.NP_Audio.win();
        initWave(wave + 1);
      }

      // --- DRAW SCENE ---
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Deep space starfield
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 35; i++) {
        const sy = (tick * 0.8 + i * 29) % canvas.height;
        const sx = (i * 47) % canvas.width;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Lasers
      lasers.forEach(l => {
        ctx.fillStyle = l.color || '#38BDF8';
        ctx.fillRect(l.x - l.size / 2, l.y, l.size, 12);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(l.x - 1, l.y + 2, 2, 8);
      });

      // Eggs
      eggs.forEach(egg => {
        ctx.save();
        ctx.translate(egg.x, egg.y);
        ctx.rotate(Math.sin(egg.wobble) * 0.2);
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Gifts (Hộp quà tiếp tế 🎁)
      gifts.forEach(g => {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(-10, -3, 20, 6);
        ctx.fillRect(-3, -10, 6, 20);
        ctx.restore();
      });

      // Standard Chickens
      chickens.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);

        const wingFlap = Math.sin(tick * 0.3 + c.wingPhase) * 10;

        ctx.fillStyle = c.isSpecial ? '#FDE047' : '#E5E7EB';
        ctx.beginPath();
        ctx.ellipse(-14, wingFlap, 8, 4, -0.4, 0, Math.PI * 2);
        ctx.ellipse(14, wingFlap, 8, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = c.isSpecial ? '#FEF08A' : '#F8FAFC';
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Comb & Beak
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(-3, -12, 3.5, 0, Math.PI * 2);
        ctx.arc(3, -13, 4, 0, Math.PI * 2);
        ctx.arc(8, -11, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-4, 5);
        ctx.lineTo(4, 5);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-5, -3, 3.5, 0, Math.PI * 2);
        ctx.arc(5, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(-5, -3, 1.8, 0, Math.PI * 2);
        ctx.arc(5, -3, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // GIANT BOSS CHICKEN
      if (boss) {
        ctx.save();
        ctx.translate(boss.x, boss.y);

        const bWing = Math.sin(boss.wingPhase) * 18;

        // Giant Wings
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.ellipse(-38, bWing, 24, 12, -0.4, 0, Math.PI * 2);
        ctx.ellipse(38, bWing, 24, 12, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Giant Body
        ctx.fillStyle = '#F1F5F9';
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crown Comb
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(-10, -28, 9, 0, Math.PI * 2);
        ctx.arc(6, -32, 11, 0, Math.PI * 2);
        ctx.arc(22, -26, 8, 0, Math.PI * 2);
        ctx.fill();

        // Giant Beak
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(-10, 16);
        ctx.lineTo(10, 16);
        ctx.closePath();
        ctx.fill();

        // Angry Glowing Eyes
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(-14, -6, 7, 0, Math.PI * 2);
        ctx.arc(14, -6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(-14, -6, 3.5, 0, Math.PI * 2);
        ctx.arc(14, -6, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Boss HP Bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width / 2 - 100, 14, 200, 12);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(canvas.width / 2 - 100, 14, 200, 12);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(canvas.width / 2 - 98, 16, (boss.hp / boss.maxHp) * 196, 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`BOSS GÀ: ${Math.max(0, Math.floor(boss.hp))} / ${boss.maxHp}`, canvas.width / 2, 23);
      }

      // Drumsticks
      drumsticks.forEach(d => {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.ellipse(0, -2, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(-2, 4, 4, 8);
        ctx.beginPath();
        ctx.arc(-2, 12, 2.5, 0, Math.PI * 2);
        ctx.arc(2, 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Spaceship
      ctx.save();
      ctx.translate(ship.x, ship.y + ship.recoil);

      // Flickering Engine Flame
      const flameH = 8 + Math.sin(tick * 0.5) * 4;
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(-6, 12);
      ctx.lineTo(0, 12 + flameH);
      ctx.lineTo(6, 12);
      ctx.closePath();
      ctx.fill();

      // Fuselage
      ctx.fillStyle = ship.invuln % 6 < 3 ? '#2563EB' : 'rgba(37, 99, 235, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(-14, 12);
      ctx.lineTo(-6, 8);
      ctx.lineTo(6, 8);
      ctx.lineTo(14, 12);
      ctx.closePath();
      ctx.fill();

      // Wing Cannons
      ctx.fillStyle = weaponLevel >= 3 ? '#EF4444' : '#60A5FA';
      ctx.fillRect(-10, -8, 3, 16);
      ctx.fillRect(7, -8, 3, 16);

      // Cockpit Glass
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.ellipse(0, -4, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Particles & Popups
      if (particles) particles.updateAndDraw(ctx);
      if (popups) popups.updateAndDraw(ctx);

      animId = requestAnimationFrame(loop);
    }

    initWave(1);
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') {
        window.NP_Audio.stopBGM();
      }
    });
  }

  // =========================================================================
  // 8. ENGINE: 2048 SỐ TRƯỢT (CLASSIC 2048 PUZZLE ENGINE)
  // =========================================================================
  function launchGame2048(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    let score = 0;
    let mergedPositions = [];

    container.innerHTML = `
      <div class="canvas-game-box" style="max-width: 380px; margin: 0 auto; padding-bottom: 12px;">
        <div class="canvas-game-hud" style="width: 100%;">
          <div class="hud-pill">Điểm: <span id="g2048Score" style="color: #F59E0B; font-size: 1.1rem;">0</span></div>
          <button class="btn-canvas-action" id="g2048NewBtn" style="padding: 4px 12px; font-size: 0.85rem;">🔄 Ván Mới</button>
        </div>
        <div style="padding: 12px; display: flex; justify-content: center; width: 100%;">
          <div id="g2048Grid" style="background: #BBADA0; width: 320px; height: 320px; padding: 10px; border-radius: 10px; display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: 10px; box-sizing: border-box; touch-action: none; user-select: none;">
            <!-- 16 tiles -->
          </div>
        </div>
        <div class="canvas-controls-bar" style="width: 100%;">
          <small style="color: #FFF;">⌨️ Dùng 4 phím Mũi tên hoặc <strong>Vuốt trên màn hình</strong> để gộp số</small>
        </div>
      </div>
    `;

    const COLORS = {
      0: { bg: 'rgba(238, 228, 218, 0.35)', color: 'transparent' },
      2: { bg: '#EEE4DA', color: '#776E65', shadow: '#D6CDC4' },
      4: { bg: '#EDE0C8', color: '#776E65', shadow: '#D5C9B1' },
      8: { bg: '#F2B179', color: '#F9F6F2', shadow: '#DA9961' },
      16: { bg: '#F59563', color: '#F9F6F2', shadow: '#DC7C4B' },
      32: { bg: '#F67C5F', color: '#F9F6F2', shadow: '#DE6346' },
      64: { bg: '#F65E3B', color: '#F9F6F2', shadow: '#DE4522' },
      128: { bg: '#EDCF72', color: '#F9F6F2', shadow: '#D5B75A' },
      256: { bg: '#EDCC61', color: '#F9F6F2', shadow: '#D4B349' },
      512: { bg: '#EDC850', color: '#F9F6F2', shadow: '#D5B038' },
      1024: { bg: '#EDC53F', color: '#F9F6F2', shadow: '#D5AD27' },
      2048: { bg: '#EDC22E', color: '#F9F6F2', shadow: '#D5AA16' }
    };

    function spawnTile() {
      const empties = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (board[r][c] === 0) empties.push({ r, c });
        }
      }
      if (empties.length > 0) {
        const spot = empties[Math.floor(Math.random() * empties.length)];
        board[spot.r][spot.c] = Math.random() < 0.9 ? 2 : 4;
      }
    }

    function render() {
      const grid = container.querySelector('#g2048Grid');
      if (!grid) return;
      grid.innerHTML = board.flatMap((row, r) => row.map((val, c) => {
        const style = COLORS[val] || { bg: '#3C3A32', color: '#F9F6F2' };
        const isMerged = mergedPositions.some(p => p.r === r && p.c === c);
        const anim = isMerged ? 'animation: npPop 0.18s ease-out;' : '';
        return `
          <div style="background: ${style.bg}; color: ${style.color}; width: 100%; height: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: ${val > 512 ? '1.25rem' : '1.5rem'}; font-weight: 900; box-shadow: inset 0 -3px 0 ${style.shadow || 'transparent'}; ${anim}">
            ${val > 0 ? val : ''}
          </div>
        `;
      })).join('');

      mergedPositions = [];
      const sEl = container.querySelector('#g2048Score');
      if (sEl) sEl.textContent = score;
    }

    let highScore = parseInt(localStorage.getItem('np_2048_high') || '0') || 0;
    let hasWon = false;
    let gameOver = false;

    function slide(row, rIdx, isHorizontal) {
      let arr = row.filter(x => x > 0);
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
          arr[i] *= 2;
          score += arr[i];
          if (score > highScore) {
            highScore = score;
            try { localStorage.setItem('np_2048_high', String(highScore)); } catch (e) {}
          }
          const tier = Math.min(8, Math.round(Math.log2(arr[i])));
          if (window.NP_Audio && typeof window.NP_Audio.combo === 'function') {
            window.NP_Audio.combo(tier);
          }
          if (window.NP_Juice && typeof window.NP_Juice.screenShake === 'function') {
            window.NP_Juice.screenShake(container.querySelector('#g2048Grid'), arr[i] >= 256 ? 6 : 3, 120);
          }
          if (window.NP_Juice) {
            if (arr[i] >= 1024) NP_Juice.vibrate.heavy();
            else if (arr[i] >= 128) NP_Juice.vibrate.combo();
            else NP_Juice.vibrate.medium();
          }
          // Fix: Record merged position for tactile pop animation
          mergedPositions.push({
            r: isHorizontal ? rIdx : i,
            c: isHorizontal ? i : rIdx
          });
          arr.splice(i + 1, 1);
        }
      }
      while (arr.length < 4) arr.push(0);
      return arr;
    }

    function checkGameOver() {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (board[r][c] === 0) return false;
          if (r < 3 && board[r][c] === board[r + 1][c]) return false;
          if (c < 3 && board[r][c] === board[r][c + 1]) return false;
        }
      }
      return true;
    }

    function move(dir) {
      if (gameOver) return;
      const old = JSON.stringify(board);

      if (dir === 'left') {
        for (let r = 0; r < 4; r++) board[r] = slide(board[r], r, true);
      } else if (dir === 'right') {
        for (let r = 0; r < 4; r++) board[r] = slide(board[r].reverse(), r, true).reverse();
      } else if (dir === 'up') {
        for (let c = 0; c < 4; c++) {
          let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
          col = slide(col, c, false);
          for (let r = 0; r < 4; r++) board[r][c] = col[r];
        }
      } else if (dir === 'down') {
        for (let c = 0; c < 4; c++) {
          let col = [board[3][c], board[2][c], board[1][c], board[0][c]];
          col = slide(col, c, false);
          for (let r = 0; r < 4; r++) board[3 - r][c] = col[r];
        }
      }

      if (old !== JSON.stringify(board)) {
        if (window.NP_Audio && typeof window.NP_Audio.pop === 'function') window.NP_Audio.pop();
        if (window.NP_Juice) NP_Juice.vibrate.light();
        spawnTile();
        render();
        if (!hasWon && board.some(row => row.some(value => value >= 2048))) {
          hasWon = true;
          if (typeof window.showToastNotification === 'function') {
            window.showToastNotification('Đạt 2048! Bạn có thể tiếp tục để lập kỷ lục mới.');
          }
        }

        if (checkGameOver()) {
          gameOver = true;
          setTimeout(() => {
            if (window.NP_Audio) window.NP_Audio.alarm();
            const grid = container.querySelector('#g2048Grid');
            if (grid) {
              const overEl = document.createElement('div');
              overEl.style.cssText = 'position:absolute; inset:0; background:rgba(238,228,218,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:10px; font-weight:900; color:#776E65; z-index:10;';
              overEl.innerHTML = `<h2 style="font-size:2rem; margin:0 0 8px;">Hết nước đi!</h2><p style="margin:0 0 14px;">Điểm: <strong>${score}</strong> | Kỷ lục: <strong>${highScore}</strong></p><button id="g2048OverReset" style="background:#8F7A66; color:#FFF; border:none; padding:8px 18px; border-radius:6px; font-weight:900; font-family:Calibri,sans-serif; cursor:pointer;">Chơi lại</button>`;
              grid.style.position = 'relative';
              grid.appendChild(overEl);
              overEl.querySelector('#g2048OverReset')?.addEventListener('click', () => {
                board = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
                score = 0;
                gameOver = false;
                hasWon = false;
                spawnTile(); spawnTile();
                render();
              });
            }
          }, 350);
        }
      }
    }

    const keyHandler = (e) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { move('left'); e.preventDefault(); }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { move('right'); e.preventDefault(); }
      if (['ArrowUp', 'w', 'W'].includes(e.key)) { move('up'); e.preventDefault(); }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { move('down'); e.preventDefault(); }
    };
    listen(window, 'keydown', keyHandler);

    // Touch Swipe Gestures
    const gridEl = container.querySelector('#g2048Grid');
    let touchStartX = 0;
    let touchStartY = 0;

    const touchStartHandler = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const touchEndHandler = (e) => {
      if (!touchStartX || !touchStartY) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > 25) {
        if (absDx > absDy) {
          move(dx > 0 ? 'right' : 'left');
        } else {
          move(dy > 0 ? 'down' : 'up');
        }
      }
    };

    if (gridEl) {
      gridEl.addEventListener('touchstart', touchStartHandler, { passive: true });
      gridEl.addEventListener('touchend', touchEndHandler, { passive: true });
    }

    container.querySelector('#g2048NewBtn')?.addEventListener('click', () => {
      board = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      score = 0;
      gameOver = false;
      hasWon = false;
      spawnTile();
      spawnTile();
      render();
    });

    spawnTile();
    spawnTile();
    render();

    onCleanup(() => {
      if (gridEl) {
        gridEl.removeEventListener('touchstart', touchStartHandler);
        gridEl.removeEventListener('touchend', touchEndHandler);
      }
    });
  }

  // =========================================================================
  // 9. ENGINE: PHÁ GẠCH DX-BALL & ARKANOID (CLASSIC BRICK BREAKER)
  // =========================================================================
  function launchDXBall(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let score = 0;
    let lives = 3;
    let level = 1;
    let animId = null;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill">Mạng: <span id="dxLives" style="color: #EF4444;">❤️❤️❤️</span></div>
          <div class="hud-pill">Điểm: <span id="dxScore" style="color: #10B981;">0</span></div>
          <div class="hud-pill">Màn: <span id="dxLevel" style="color: #38BDF8;">1</span></div>
        </div>
        <canvas id="dxCanvas" width="460" height="340" class="canvas-main-viewport" style="background: #0F172A; display: block; margin: 0 auto;"></canvas>
        <div class="canvas-controls-bar">
          <small style="color: #FFF;">Rê chuột hoặc Phím Mũi tên để di chuyển thanh đỡ bóng</small>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#dxCanvas');
    const ctx = canvas.getContext('2d');

    let paddle = { x: 190, y: 315, w: 80, h: 12, speed: 6 };
    let balls = [{ x: 230, y: 300, vx: 3, vy: -3, r: 6 }];
    let bricks = [];
    let powerups = [];
    let debris = [];
    let isFireball = false;
    let laserTimer = 0;
    const dxKeys = {};

    const BRICK_ROWS = 5;
    const BRICK_COLS = 8;
    const BRICK_W = 50;
    const BRICK_H = 16;
    const BRICK_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

    const onDxKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) {
        dxKeys[e.key] = true;
        e.preventDefault();
      }
    };
    const onDxKeyUp = (e) => { dxKeys[e.key] = false; };
    listen(window, 'keydown', onDxKeyDown);
    listen(window, 'keyup', onDxKeyUp);

    function initBricks() {
      bricks = [];
      powerups = [];
      debris = [];
      isFireball = false;
      paddle.w = 80;
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          bricks.push({
            x: 25 + c * (BRICK_W + 5),
            y: 35 + r * (BRICK_H + 5),
            w: BRICK_W,
            h: BRICK_H,
            color: BRICK_COLORS[r],
            alive: true
          });
        }
      }
      balls = [{
        x: paddle.x + paddle.w / 2,
        y: paddle.y - 10,
        vx: (Math.random() > 0.5 ? 1 : -1) * 3,
        vy: -3.5,
        r: 6
      }];
    }

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      paddle.x = Math.max(10, Math.min(canvas.width - paddle.w - 10, (e.clientX - rect.left) * scaleX - paddle.w / 2));
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        paddle.x = Math.max(10, Math.min(canvas.width - paddle.w - 10, (e.touches[0].clientX - rect.left) * scaleX - paddle.w / 2));
      }
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        paddle.x = Math.max(10, Math.min(canvas.width - paddle.w - 10, (e.touches[0].clientX - rect.left) * scaleX - paddle.w / 2));
      }
    }, { passive: false });

    function updateHUD() {
      const lEl = container.querySelector('#dxLives');
      const sEl = container.querySelector('#dxScore');
      const lvlEl = container.querySelector('#dxLevel');
      if (lEl) lEl.textContent = '❤️'.repeat(Math.max(0, lives));
      if (sEl) sEl.textContent = score;
      if (lvlEl) lvlEl.textContent = level;
    }

    function loop() {
      // Keyboard input
      if (dxKeys['ArrowLeft'] || dxKeys['a'] || dxKeys['A']) {
        paddle.x = Math.max(10, paddle.x - 6);
      }
      if (dxKeys['ArrowRight'] || dxKeys['d'] || dxKeys['D']) {
        paddle.x = Math.min(canvas.width - paddle.w - 10, paddle.x + 6);
      }

      // Update Powerup Capsules
      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.y += p.vy;

        // Catch powerup
        if (p.y + 8 >= paddle.y && p.y - 8 <= paddle.y + paddle.h &&
            p.x >= paddle.x && p.x <= paddle.x + paddle.w) {
          AudioEngine.powerup();
          if (p.type === 'expand') {
            paddle.w = 120;
            setTimeout(() => { paddle.w = 80; }, 10000);
          } else if (p.type === 'fireball') {
            isFireball = true;
            setTimeout(() => { isFireball = false; }, 8000);
          } else if (p.type === 'triball') {
            const b = balls[0] || { x: paddle.x + paddle.w / 2, y: paddle.y - 10 };
            balls.push({ x: b.x, y: b.y, vx: -3, vy: -3, r: 6 });
            balls.push({ x: b.x, y: b.y, vx: 3, vy: -3.5, r: 6 });
          }
          powerups.splice(i, 1);
          continue;
        }

        if (p.y > canvas.height + 20) {
          powerups.splice(i, 1);
        }
      }

      // Update Debris Particles
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.15;
        d.life -= 0.03;
        if (d.life <= 0) debris.splice(i, 1);
      }

      // Update Balls
      for (let bi = balls.length - 1; bi >= 0; bi--) {
        const ball = balls[bi];
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall bounce
        if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) {
          ball.vx = -ball.vx;
          AudioEngine.pop();
        }
        if (ball.y - ball.r < 0) {
          ball.vy = -ball.vy;
          AudioEngine.pop();
        }

        // Paddle hit
        if (ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
            ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
          ball.vy = -Math.abs(ball.vy);
          const hitOffset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          ball.vx = hitOffset * 4.6;
          AudioEngine.hit();
        }

        // Brick collision
        bricks.forEach(b => {
          if (!b.alive) return;
          if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
              ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
            b.alive = false;
            if (!isFireball) ball.vy = -ball.vy;
            score += 25;
            AudioEngine.match(1);
            updateHUD();

            // Spawn brick debris particles
            for (let k = 0; k < 6; k++) {
              debris.push({
                x: b.x + b.w / 2,
                y: b.y + b.h / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 1,
                color: b.color,
                life: 1.0
              });
            }

            // 30% chance to drop a powerup capsule
            if (Math.random() < 0.3) {
              const types = ['expand', 'triball', 'fireball'];
              powerups.push({
                x: b.x + b.w / 2,
                y: b.y + b.h / 2,
                type: types[Math.floor(Math.random() * types.length)],
                vy: 2.0
              });
            }
          }
        });

        // Ball fell down
        if (ball.y > canvas.height + 20) {
          balls.splice(bi, 1);
        }
      }

      // Check if all balls lost
      if (balls.length === 0) {
        lives--;
        AudioEngine.explosion();
        updateHUD();
        if (lives <= 0) {
          lives = 3;
          score = 0;
          level = 1;
        }
        initBricks();
      }

      // Clear level if all bricks dead
      const activeCount = bricks.filter(b => b.alive).length;
      if (activeCount === 0) {
        AudioEngine.win();
        level++;
        initBricks();
        updateHUD();
      }

      // --- RENDER ---
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw Beveled Bricks
      bricks.forEach(b => {
        if (!b.alive) return;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // 3D Bevel highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.w, b.y);
        ctx.lineTo(b.x + b.w - 3, b.y + 3); ctx.lineTo(b.x + 3, b.y + 3);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h);
        ctx.lineTo(b.x + b.w - 3, b.y + b.h - 3); ctx.lineTo(b.x + 3, b.y + b.h - 3);
        ctx.fill();
      });

      // Draw Debris Particles
      debris.forEach(d => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, d.life);
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x - 2, d.y - 2, 4, 4);
        ctx.restore();
      });

      // Draw Powerup Capsules
      powerups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        const col = p.type === 'expand' ? '#38BDF8' : (p.type === 'fireball' ? '#EF4444' : '#10B981');
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.roundRect(-12, -7, 24, 14, 7); ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 9px Calibri, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.type === 'expand' ? '↔' : (p.type === 'fireball' ? '🔥' : '3X'), 0, 0);
        ctx.restore();
      });

      // Draw Paddle
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
      ctx.fill();
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(paddle.x + 6, paddle.y + 2, paddle.w - 12, 3);

      // Draw Balls
      balls.forEach(ball => {
        ctx.fillStyle = isFireball ? '#EF4444' : '#FEF08A';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        if (isFireball) {
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(loop);
    }

    initBricks();
    updateHUD();
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
  }

  // =========================================================================
  // 10. ENGINE: ĐẨY THÙNG SOKOBAN (CLASSIC WAREHOUSE PUZZLE)
  // =========================================================================
  function launchSokoban(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let currentLevel = 0;
    let moves = 0;
    let history = []; // Undo stack

    // 6 Classic Warehouse Levels of increasing complexity
    const LEVELS = [
      {
        name: "Màn 1: Nhập môn",
        map: [
          "  ##### ",
          "###   # ",
          "# $ # ##",
          "# #  . #",
          "#    . #",
          "###### #"
        ],
        px: 1, py: 2
      },
      {
        name: "Màn 2: Kho đôi",
        map: [
          "######",
          "# .. #",
          "# $$ #",
          "#    #",
          "######"
        ],
        px: 2, py: 3
      },
      {
        name: "Màn 3: Góc chữ L",
        map: [
          "#######",
          "#  .  #",
          "# $#$ #",
          "#  .  #",
          "#  @  #",
          "#######"
        ],
        px: 3, py: 4
      },
      {
        name: "Màn 4: Hành lang hẹp",
        map: [
          "########",
          "#  #   #",
          "# $ $  #",
          "## # ###",
          "#  . . #",
          "#      #",
          "########"
        ],
        px: 1, py: 1
      },
      {
        name: "Màn 5: Thập tự hoa",
        map: [
          "  #####  ",
          "###   ###",
          "#  $$$  #",
          "#  ...  #",
          "#   @   #",
          "#########"
        ],
        px: 4, py: 4
      },
      {
        name: "Màn 6: Bậc thầy thủ kho",
        map: [
          "#######",
          "#  .  #",
          "# $.$ #",
          "#.$.$.#",
          "# $.$ #",
          "#  .  #",
          "#######"
        ],
        px: 1, py: 1
      }
    ];

    let grid = [];
    let player = { x: 0, y: 0 };
    let playerDir = 'down'; // 'up'|'down'|'left'|'right'

    function initLevel(lvlIdx) {
      currentLevel = lvlIdx % LEVELS.length;
      moves = 0;
      history = [];
      const lvl = LEVELS[currentLevel];
      grid = lvl.map.map(row => row.split(''));
      player = { x: lvl.px, y: lvl.py };
      playerDir = 'down';
      render();
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="max-width: 460px; margin: 0 auto; font-family: Calibri, 'Segoe UI', sans-serif;">
        <div class="canvas-game-hud">
          <div class="hud-pill">Màn: <span id="skLevel" style="color: #38BDF8;">1</span>/${LEVELS.length}</div>
          <div class="hud-pill">Bước đi: <span id="skMoves" style="color: #F59E0B;">0</span></div>
          <button class="btn-canvas-action" id="skUndoBtn" style="padding: 2px 10px; font-size: 0.8rem; background: #64748B; color: #FFF; font-family: Calibri, sans-serif;">
            ↩ Hoàn tác [Z]
          </button>
          <button class="btn-canvas-action" id="skResetBtn" style="padding: 2px 10px; font-size: 0.8rem; font-family: Calibri, sans-serif;">
            Chơi lại
          </button>
        </div>
        <div style="text-align: center; margin-bottom: 6px;">
          <small id="skLevelTitle" style="color: #94A3B8; font-weight: 600; font-family: Calibri, sans-serif;">Màn 1: Nhập môn</small>
        </div>
        <div id="skBoard" style="background: #0F172A; padding: 14px; border-radius: 10px; display: inline-block; margin: 0 auto; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5); border: 2px solid #334155;"></div>
        <div class="canvas-controls-bar" style="font-family: Calibri, sans-serif;">
          <small style="color: #E2E8F0;">📦 Mũi tên / WASD: Di chuyển • [Z]: Hoàn tác • Đẩy thùng vào ô chấm đỏ (•)</small>
        </div>
        <div class="virtual-dpad-row" style="display: flex; justify-content: center; gap: 8px; margin-top: 8px;">
          <button class="v-btn" id="skUp">▲</button>
        </div>
        <div class="virtual-dpad-row" style="display: flex; justify-content: center; gap: 8px; margin-top: 4px;">
          <button class="v-btn" id="skLeft">◀</button>
          <button class="v-btn" id="skDown">▼</button>
          <button class="v-btn" id="skRight">▶</button>
        </div>
      </div>
    `;

    function render() {
      const boardEl = container.querySelector('#skBoard');
      if (!boardEl) return;
      let html = '';
      for (let r = 0; r < grid.length; r++) {
        html += '<div style="display: flex;">';
        for (let c = 0; c < grid[r].length; c++) {
          const char = grid[r][c];
          let icon = '&nbsp;';
          let bg = '#1E293B';
          let border = '0.5px solid rgba(255,255,255,0.04)';
          let extraStyle = '';

          if (r === player.y && c === player.x) {
            icon = playerDir === 'left' ? '👷' : (playerDir === 'right' ? '👷' : '👷‍♂️');
            bg = '#334155';
            extraStyle = 'filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));';
          } else if (char === '#') {
            icon = '🧱';
            bg = '#475569';
            border = '1px solid #334155';
          } else if (char === '$') {
            icon = '📦';
            bg = '#78350F';
            border = '1px solid #B45309';
            extraStyle = 'box-shadow: inset 0 1px 2px #FCD34D, 0 2px 4px rgba(0,0,0,0.4);';
          } else if (char === '.') {
            icon = '🎯';
            bg = '#1E293B';
          } else if (char === '*') {
            icon = '💎'; // Crate on target - glowing emerald
            bg = '#065F46';
            border = '1px solid #10B981';
            extraStyle = 'box-shadow: 0 0 10px #10B981; animation: pulse 1.5s infinite;';
          }

          html += `<div style="width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; background: ${bg}; border: ${border}; border-radius: 4px; margin: 1px; ${extraStyle}">${icon}</div>`;
        }
        html += '</div>';
      }
      boardEl.innerHTML = html;

      const lEl = container.querySelector('#skLevel');
      const mEl = container.querySelector('#skMoves');
      const tEl = container.querySelector('#skLevelTitle');
      if (lEl) lEl.textContent = currentLevel + 1;
      if (mEl) mEl.textContent = moves;
      if (tEl) tEl.textContent = LEVELS[currentLevel].name;
    }

    function pushHistory() {
      history.push({
        grid: grid.map(row => [...row]),
        player: { ...player },
        playerDir,
        moves
      });
      if (history.length > 50) history.shift();
    }

    function undo() {
      if (history.length === 0) return;
      const prev = history.pop();
      grid = prev.grid;
      player = prev.player;
      playerDir = prev.playerDir;
      moves = prev.moves;
      AudioEngine.pop();
      render();
    }

    function tryMove(dx, dy, dirName) {
      if (dirName) playerDir = dirName;
      const nx = player.x + dx;
      const ny = player.y + dy;

      if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[ny].length) return;
      if (grid[ny][nx] === '#') return;

      // Push crate
      if (grid[ny][nx] === '$' || grid[ny][nx] === '*') {
        const nnx = nx + dx;
        const nny = ny + dy;
        if (nny < 0 || nny >= grid.length || nnx < 0 || nnx >= grid[nny].length) return;

        if (grid[nny][nnx] === ' ' || grid[nny][nnx] === '.' || grid[nny][nnx] === undefined) {
          pushHistory();
          const targetCell = grid[nny][nnx];
          grid[nny][nnx] = targetCell === '.' ? '*' : '$';
          grid[ny][nx] = grid[ny][nx] === '*' ? '.' : ' ';
          player.x = nx;
          player.y = ny;
          moves++;
          if (grid[nny][nnx] === '*') {
            AudioEngine.coin(); // Rewarding sound when crate hits target
            if (window.NP_Juice) window.NP_Juice.vibrate(22);
          } else {
            AudioEngine.pop();
            if (window.NP_Juice) window.NP_Juice.vibrate(12);
          }
        }
      } else if (grid[ny][nx] === ' ' || grid[ny][nx] === '.') {
        pushHistory();
        player.x = nx;
        player.y = ny;
        moves++;
        if (window.NP_Juice) window.NP_Juice.vibrate(6);
      }

      render();

      // Check win
      let won = true;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === '.' || grid[r][c] === '$') {
            // Still dots left or unplaced crates
            if (grid[r][c] === '.') won = false;
          }
        }
      }

      if (won) {
        AudioEngine.win();
        setTimeout(() => {
          if (currentLevel + 1 < LEVELS.length) {
            initLevel(currentLevel + 1);
          } else {
            alert('🎉 CHÚC MỪNG BẠN ĐÃ PHÁ ĐẢO TOÀN BỘ 6 MÀN SOKOBAN!');
            initLevel(0);
          }
        }, 500);
      }
    }

    const keyHandler = (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) { tryMove(0, -1, 'up'); e.preventDefault(); }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { tryMove(0, 1, 'down'); e.preventDefault(); }
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { tryMove(-1, 0, 'left'); e.preventDefault(); }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { tryMove(1, 0, 'right'); e.preventDefault(); }
      if (['z', 'Z', 'Backspace'].includes(e.key)) { undo(); e.preventDefault(); }
    };
    listen(window, 'keydown', keyHandler);

    // Touch Swipe directly on board for natural mobile movement
    let skTouchX = 0, skTouchY = 0;
    const boardEl = container.querySelector('#skBoard');
    if (boardEl) {
      boardEl.addEventListener('touchstart', (e) => {
        if (e.touches[0]) {
          skTouchX = e.touches[0].clientX;
          skTouchY = e.touches[0].clientY;
        }
      }, { passive: true });

      boardEl.addEventListener('touchend', (e) => {
        if (e.changedTouches[0]) {
          const dx = e.changedTouches[0].clientX - skTouchX;
          const dy = e.changedTouches[0].clientY - skTouchY;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);
          if (Math.max(absX, absY) > 20) {
            e.preventDefault();
            if (absX > absY) {
              tryMove(dx > 0 ? 1 : -1, 0, dx > 0 ? 'right' : 'left');
            } else {
              tryMove(0, dy > 0 ? 1 : -1, dy > 0 ? 'down' : 'up');
            }
          }
        }
      }, { passive: false });
    }

    container.querySelector('#skResetBtn')?.addEventListener('click', () => initLevel(currentLevel));
    container.querySelector('#skUndoBtn')?.addEventListener('click', undo);
    container.querySelector('#skUp')?.addEventListener('click', () => tryMove(0, -1, 'up'));
    container.querySelector('#skDown')?.addEventListener('click', () => tryMove(0, 1, 'down'));
    container.querySelector('#skLeft')?.addEventListener('click', () => tryMove(-1, 0, 'left'));
    container.querySelector('#skRight')?.addEventListener('click', () => tryMove(1, 0, 'right'));

    initLevel(0);

  }

  // =========================================================================
  // 11. ENGINE: Ô ĂN QUAN DÂN GIAN VIỆT NAM (TRADITIONAL MANCALA ENGINE)
  // =========================================================================
  function launchOAnQuan(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let board = [
      10, // Quan Trái (index 0)
      5, 5, 5, 5, 5, // Dân dưới - Bạn (index 1 to 5)
      10, // Quan Phải (index 6)
      5, 5, 5, 5, 5  // Dân trên - Máy (index 7 to 11)
    ];
    let playerPoints = 0;
    let botPoints = 0;
    let turn = 'player'; // 'player' | 'bot'
    let selectedPit = null;
    let isAnimating = false;
    let statusMessage = 'Chọn 1 ô dân (1-5) rồi chọn hướng rải sỏi!';

    container.innerHTML = `
      <div class="canvas-game-box" style="max-width: 540px; margin: 0 auto; font-family: Calibri, 'Segoe UI', sans-serif;">
        <div class="canvas-game-hud">
          <div class="hud-pill">Điểm Bạn: <span id="oaqPlayer" style="color: #10B981; font-weight: bold;">0</span></div>
          <div class="hud-pill">Lượt: <span id="oaqTurn" style="color: #F59E0B; font-weight: bold;">Bạn (Hàng dưới)</span></div>
          <div class="hud-pill">Điểm Máy: <span id="oaqBot" style="color: #EF4444; font-weight: bold;">0</span></div>
        </div>
        <div style="text-align: center; margin: 4px 0;">
          <small id="oaqStatus" style="color: #FEF08A; font-weight: 600; font-family: Calibri, sans-serif;">${statusMessage}</small>
        </div>
        <div id="oaqBoard" style="background: #92400E; padding: 16px; border-radius: 16px; margin: 8px auto; border: 4px solid #78350F; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
          <!-- Mancala board -->
        </div>

        <!-- Direction Picker Controls -->
        <div id="oaqDirectionControls" style="display: none; justify-content: center; gap: 12px; margin: 10px 0;">
          <button id="oaqDirLeft" class="btn-canvas-action" style="background: #0284C7; color: #FFF; font-family: Calibri, sans-serif; padding: 6px 14px;">
            ◀ Rải sang Trái (Ngược chiều)
          </button>
          <button id="oaqDirRight" class="btn-canvas-action" style="background: #16A34A; color: #FFF; font-family: Calibri, sans-serif; padding: 6px 14px;">
            Rải sang Phải (Thuận chiều) ▶
          </button>
        </div>

        <div class="canvas-controls-bar" style="font-family: Calibri, sans-serif;">
          <small style="color: #FFF;">🎋 Bấm vào một ô dân hàng dưới để rải sỏi • Ăn quân khi ô kề trống • Hết ván khi ăn hết 2 Quan!</small>
        </div>
      </div>
    `;

    function render() {
      const bEl = container.querySelector('#oaqBoard');
      if (!bEl) return;

      bEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
          <!-- Quan Trai (index 0) -->
          <div style="width: 70px; height: 130px; background: #D97706; border-radius: 40px 0 0 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; color: #FFF; border: 3px solid #FEF08A; box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);">
            <span style="font-size: 0.85rem; letter-spacing: 1px; color: #FEF08A;">QUAN TÂY</span>
            <span style="font-size: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">${board[0]}</span>
            <span style="font-size: 0.75rem; color: #FDE68A;">💎 sỏi</span>
          </div>

          <!-- Dan Grid (10 pits) -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Top row: Bot (11 downto 7) -->
            <div style="display: flex; gap: 8px;">
              ${[11, 10, 9, 8, 7].map(idx => `
                <div style="width: 56px; height: 56px; background: #78350F; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFF; font-weight: bold; border: 2px solid #D97706; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);">
                  <span style="font-size: 1.15rem;">${board[idx]}</span>
                  <span style="font-size: 0.65rem; color: #FCD34D;">ô ${idx}</span>
                </div>
              `).join('')}
            </div>

            <!-- Bottom row: Player (1 to 5) -->
            <div style="display: flex; gap: 8px;">
              ${[1, 2, 3, 4, 5].map(idx => {
                const isSel = selectedPit === idx;
                const canPick = turn === 'player' && board[idx] > 0 && !isAnimating;
                const bg = isSel ? '#059669' : (canPick ? '#15803D' : '#334155');
                const border = isSel ? '3px solid #FDE047' : (canPick ? '2px solid #86EFAC' : '1px solid #475569');
                const cursor = canPick ? 'pointer' : 'default';
                const shadow = isSel ? '0 0 12px #FDE047' : 'inset 0 2px 6px rgba(0,0,0,0.4)';
                return `
                  <div class="oaq-player-pit" data-idx="${idx}" style="width: 56px; height: 56px; background: ${bg}; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFF; font-weight: bold; border: ${border}; box-shadow: ${shadow}; cursor: ${cursor}; transition: all 0.2s;">
                    <span style="font-size: 1.25rem;">${board[idx]}</span>
                    <span style="font-size: 0.65rem; color: #BBF7D0;">ô ${idx}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Quan Phai (index 6) -->
          <div style="width: 70px; height: 130px; background: #D97706; border-radius: 0 40px 40px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; color: #FFF; border: 3px solid #FEF08A; box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);">
            <span style="font-size: 0.85rem; letter-spacing: 1px; color: #FEF08A;">QUAN ĐÔNG</span>
            <span style="font-size: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">${board[6]}</span>
            <span style="font-size: 0.75rem; color: #FDE68A;">💎 sỏi</span>
          </div>
        </div>
      `;

      bEl.querySelectorAll('.oaq-player-pit').forEach(el => {
        el.addEventListener('click', () => {
          if (turn !== 'player' || isAnimating) return;
          const idx = parseInt(el.getAttribute('data-idx'));
          if (board[idx] > 0) {
            selectedPit = idx;
            const dirControls = container.querySelector('#oaqDirectionControls');
            if (dirControls) dirControls.style.display = 'flex';
            statusMessage = `Đã chọn ô ${idx} (${board[idx]} sỏi). Hãy chọn chiều rải sỏi:`;
            updateHUD();
            render();
          }
        });
      });

      updateHUD();
    }

    function updateHUD() {
      const pEl = container.querySelector('#oaqPlayer');
      const btEl = container.querySelector('#oaqBot');
      const tEl = container.querySelector('#oaqTurn');
      const stEl = container.querySelector('#oaqStatus');
      if (pEl) pEl.textContent = playerPoints;
      if (btEl) btEl.textContent = botPoints;
      if (tEl) tEl.textContent = turn === 'player' ? 'Bạn (Hàng dưới)' : 'Máy đang tính...';
      if (stEl) stEl.textContent = statusMessage;
    }

    // Direction buttons
    container.querySelector('#oaqDirLeft')?.addEventListener('click', () => {
      if (selectedPit !== null && turn === 'player' && !isAnimating) {
        const pit = selectedPit;
        selectedPit = null;
        container.querySelector('#oaqDirectionControls').style.display = 'none';
        executeTurn(pit, -1);
      }
    });

    container.querySelector('#oaqDirRight')?.addEventListener('click', () => {
      if (selectedPit !== null && turn === 'player' && !isAnimating) {
        const pit = selectedPit;
        selectedPit = null;
        container.querySelector('#oaqDirectionControls').style.display = 'none';
        executeTurn(pit, 1);
      }
    });

    function executeTurn(pitIdx, direction) {
      isAnimating = true;
      let hand = board[pitIdx];
      board[pitIdx] = 0;
      let cur = pitIdx;
      AudioEngine.pop();
      render();

      function stepSow() {
        if (hand > 0) {
          cur = (cur + direction + 12) % 12;
          board[cur]++;
          hand--;
          AudioEngine.pop();
          render();
          setTimeout(stepSow, 180);
          return;
        }

        // When hand is empty, check next cell
        const nextCell = (cur + direction + 12) % 12;

        // Rule 1: Continuous sowing if next cell is a non-empty peasant pit
        if (nextCell !== 0 && nextCell !== 6 && board[nextCell] > 0) {
          hand = board[nextCell];
          board[nextCell] = 0;
          cur = nextCell;
          statusMessage = `${turn === 'player' ? 'Bạn' : 'Máy'} bốc tiếp ô ${nextCell} để rải!`;
          updateHUD();
          render();
          setTimeout(stepSow, 250);
          return;
        }

        // Rule 2: Capture if next cell is empty
        if (board[nextCell] === 0) {
          let afterNext = (nextCell + direction + 12) % 12;
          let totalCaptured = 0;

          while (board[nextCell] === 0 && board[afterNext] > 0) {
            const captured = board[afterNext];
            board[afterNext] = 0;
            totalCaptured += captured;
            AudioEngine.win();

            // Next check for continuous capture (ăn luồn)
            cur = afterNext;
            const stepNext = (cur + direction + 12) % 12;
            const stepAfter = (stepNext + direction + 12) % 12;
            if (board[stepNext] === 0 && board[stepAfter] > 0) {
              afterNext = stepAfter;
            } else {
              break;
            }
          }

          if (totalCaptured > 0) {
            if (turn === 'player') playerPoints += totalCaptured;
            else botPoints += totalCaptured;
            statusMessage = `🎉 ${turn === 'player' ? 'Bạn' : 'Máy'} đã ăn được ${totalCaptured} viên sỏi!`;
            render();
          } else {
            statusMessage = 'Hết lượt (Không ăn được sỏi).';
            render();
          }
        }

        isAnimating = false;
        checkGameStatus();
      }

      stepSow();
    }

    function checkGameStatus() {
      // Check if both Quan are empty
      if (board[0] === 0 && board[6] === 0) {
        // Collect remaining stones
        for (let i = 1; i <= 5; i++) {
          playerPoints += board[i];
          board[i] = 0;
        }
        for (let i = 7; i <= 11; i++) {
          botPoints += board[i];
          board[i] = 0;
        }
        render();
        AudioEngine.win();
        const winner = playerPoints > botPoints ? 'BẠN THẮNG CUỘC! 🏆' : (playerPoints < botPoints ? 'MÁY THẮNG!' : 'HÒA NHAU!');
        statusMessage = `KẾT THÚC VÁN! ${winner} (Bạn: ${playerPoints} - Máy: ${botPoints})`;
        updateHUD();
        return;
      }

      // Switch turn
      if (turn === 'player') {
        turn = 'bot';
        statusMessage = 'Lượt Máy: Máy đang tính toán nước đi...';
        render();

        // Check if bot has stones to play, if not must replenish
        const botHasStones = [7, 8, 9, 10, 11].some(i => board[i] > 0);
        if (!botHasStones) {
          if (botPoints >= 5) {
            botPoints -= 5;
            for (let i = 7; i <= 11; i++) board[i] = 1;
            statusMessage = 'Máy đã rải 5 viên từ túi điểm để tiếp tục ván!';
            render();
          } else {
            // Bot loses if can't replenish
            statusMessage = 'Máy không còn sỏi để rải! Bạn thắng ván này!';
            turn = 'player';
            render();
            return;
          }
        }

        setTimeout(botTurn, 1000);
      } else {
        turn = 'player';
        // Check if player has stones to play
        const playerHasStones = [1, 2, 3, 4, 5].some(i => board[i] > 0);
        if (!playerHasStones) {
          if (playerPoints >= 5) {
            playerPoints -= 5;
            for (let i = 1; i <= 5; i++) board[i] = 1;
            statusMessage = 'Bạn đã rải 5 viên từ túi điểm để tiếp tục ván!';
            render();
          } else {
            statusMessage = 'Bạn hết sỏi để rải! Máy thắng ván này!';
            render();
            return;
          }
        }

        statusMessage = 'Lượt Bạn: Hãy chọn 1 ô dân (1-5) để rải sỏi!';
        render();
      }
    }

    function botTurn() {
      const valid = [7, 8, 9, 10, 11].filter(i => board[i] > 0);
      if (valid.length > 0) {
        // Smart bot: pick the pit with the most stones or best capture potential
        const choice = valid[Math.floor(Math.random() * valid.length)];
        const dir = Math.random() < 0.5 ? 1 : -1;
        executeTurn(choice, dir);
      } else {
        turn = 'player';
        render();
      }
    }

    render();

  }

  // =========================================================================
  // 12. ENGINE: NUÔI CÁ NEMO (INSANIQUARIUM DELUXE POPCAP FULL VIRTUAL AQUARIUM)
  // =========================================================================
  function launchNuoiCaNemo(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let coins = 200;
    let animId = null;
    let foodLevel = 1; // 1: Brown flake, 2: Green mega pellet
    let maxFoods = 3;
    let laserPower = 1; // 1: Standard, 2: Ultra laser
    let eggPieces = 0; // 3 pieces to win
    let gameWon = false;
    let gameOver = false;
    let nextAlienTimer = 35 * 60; // ~35 seconds
    let alienAlertTimer = 0;
    let alien = null;
    let screenShake = 0;
    let particles = [];
    let bubbles = [];

    // Background music
    if (window.NP_Audio?.startBGM) {
      NP_Audio.startBGM('insaniquarium');
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="max-width: 620px; font-family: Calibri, 'Segoe UI', sans-serif;">
        <div class="canvas-game-hud" style="flex-wrap: wrap; gap: 6px; padding: 6px 10px;">
          <div class="hud-pill">Xu: <span id="ncCoins" style="color: #FBBF24; font-weight: bold;">200</span></div>
          <div class="hud-pill">🥚 Mảnh trứng: <span id="ncEgg" style="color: #38BDF8;">0/3</span></div>
          <button class="btn btn-secondary" id="ncBuyFish" style="padding: 2px 8px; font-size: 0.78rem; font-family: Calibri, sans-serif;">🐟 Cá con (100 xu)</button>
          <button class="btn btn-secondary" id="ncUpgradeFood" style="padding: 2px 8px; font-size: 0.78rem; font-family: Calibri, sans-serif;">🥫 Đổi mồi (200 xu)</button>
          <button class="btn btn-secondary" id="ncMaxFood" style="padding: 2px 8px; font-size: 0.78rem; font-family: Calibri, sans-serif;">🍲 +1 Mồi (150 xu)</button>
          <button class="btn btn-secondary" id="ncUpgradeLaser" style="padding: 2px 8px; font-size: 0.78rem; font-family: Calibri, sans-serif;">🔫 Laser II (300 xu)</button>
          <button class="btn btn-primary" id="ncBuyEgg" style="padding: 2px 10px; font-size: 0.78rem; background: #E11D48; color: #FFF; font-family: Calibri, sans-serif;">🥚 Trứng (500 xu)</button>
        </div>

        <div style="position: relative; width: 100%; max-width: 600px; margin: 4px auto;">
          <canvas id="ncCanvas" width="560" height="340" class="canvas-main-viewport" style="background: #0284C7; display: block; margin: 0 auto; cursor: crosshair; border-radius: 8px; border: 2px solid #0369A1; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"></canvas>
          <div id="ncAlertBanner" style="display: none; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); background: rgba(225, 29, 72, 0.9); color: #FFF; padding: 6px 16px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; border: 1px solid #FECDD3; pointer-events: none; z-index: 10; animation: pulse 0.5s infinite alternate; font-family: Calibri, sans-serif;">
            ⚠️ BÁO ĐỘNG: QUÁI VẬT XÂM LĂNG! BẤM LASER BẢO VỆ ĐÀN CÁ!
          </div>
        </div>

        <div class="canvas-controls-bar" style="font-family: Calibri, sans-serif;">
          <small style="color: #E2E8F0; font-size: 0.78rem;">💡 Thả mồi nuôi cá lớn • Gom xu vàng/kim cương • Bấm chuột bắn Laser khi quái vật xuất hiện • Thu thập đủ 3 mảnh trứng để thắng!</small>
          <button class="btn-canvas-action" id="ncRestartBtn" style="font-family: Calibri, sans-serif;">Chơi lại</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#ncCanvas');
    const ctx = canvas.getContext('2d');
    const alertBanner = container.querySelector('#ncAlertBanner');

    // Initial fishes
    let fishes = [
      { id: 1, x: 120, y: 150, vx: 1.4, vy: 0.1, hunger: 90, tier: 1, bites: 0, coinTimer: 300, faceRight: true },
      { id: 2, x: 280, y: 110, vx: -1.2, vy: -0.2, hunger: 90, tier: 1, bites: 0, coinTimer: 450, faceRight: false }
    ];

    let foods = [];
    let droppedTreasures = []; // { x, y, vy, type: 'silver'|'gold'|'diamond', val: 15|35|100 }
    let snail = { x: 200, y: canvas.height - 18, vx: 1.2, faceRight: true };

    // Initial bubbles
    for (let i = 0; i < 25; i++) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vy: 0.5 + Math.random() * 1.2,
        r: 1.5 + Math.random() * 2.5
      });
    }

    function updateHUD() {
      const cEl = container.querySelector('#ncCoins');
      const eEl = container.querySelector('#ncEgg');
      const bEgg = container.querySelector('#ncBuyEgg');
      const bFood = container.querySelector('#ncUpgradeFood');
      const bLaser = container.querySelector('#ncUpgradeLaser');

      if (cEl) cEl.textContent = coins;
      if (eEl) eEl.textContent = `${eggPieces}/3`;
      if (bEgg) {
        const nextPrice = [500, 1000, 1500][eggPieces] || 1500;
        bEgg.textContent = eggPieces >= 3 ? '🏆 Đã ấp trứng!' : `🥚 Trứng (${nextPrice} xu)`;
      }
      if (bFood && foodLevel >= 2) {
        bFood.textContent = '🌟 Mồi Cao Cấp (Tối đa)';
        bFood.disabled = true;
      }
      if (bLaser && laserPower >= 2) {
        bLaser.textContent = '⚡ Laser II (Tối đa)';
        bLaser.disabled = true;
      }
    }

    function handleCanvasAction(cx, cy) {
      if (gameOver || gameWon) return;

      // 1. Attack Alien if active
      if (alien) {
        const dist = Math.hypot(cx - alien.x, cy - alien.y);
        if (dist < 55) {
          const dmg = laserPower === 1 ? 1 : 2.5;
          alien.hp -= dmg;
          alien.hitFlash = 8;
          alien.vx += (alien.x - cx) * 0.15;
          alien.vy += (alien.y - cy) * 0.15;

          // Spawn laser beam effect
          particles.push({
            type: 'laser',
            x1: cx,
            y1: 0,
            x2: alien.x,
            y2: alien.y,
            life: 6,
            color: laserPower === 1 ? '#38BDF8' : '#F43F5E'
          });

          // Laser sparks
          for (let i = 0; i < 6; i++) {
            particles.push({
              type: 'spark',
              x: alien.x,
              y: alien.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              life: 15,
              color: '#FBBF24'
            });
          }

          if (window.NP_Audio?.laser) NP_Audio.laser();
          else if (window.NP_Audio?.hit) NP_Audio.hit();
          else AudioEngine.hit();
          if (window.NP_Juice) window.NP_Juice.vibrate(10);

          if (alien.hp <= 0) {
            // Alien defeated!
            screenShake = 12;
            if (window.NP_Juice) {
              window.NP_Juice.screenShake(canvas, 12, 280);
              window.NP_Juice.vibrate([25, 50]);
            }
            if (window.NP_Audio?.explosion) NP_Audio.explosion();
            else AudioEngine.explosion();

            // Burst rewards: 3 Diamonds + 4 Gold coins
            for (let i = 0; i < 3; i++) {
              droppedTreasures.push({
                x: alien.x + (Math.random() - 0.5) * 40,
                y: alien.y + (Math.random() - 0.5) * 20,
                vy: 0.8,
                type: 'diamond',
                val: 100
              });
            }
            for (let i = 0; i < 4; i++) {
              droppedTreasures.push({
                x: alien.x + (Math.random() - 0.5) * 40,
                y: alien.y + (Math.random() - 0.5) * 20,
                vy: 0.9,
                type: 'gold',
                val: 35
              });
            }

            alien = null;
            if (alertBanner) alertBanner.style.display = 'none';
          }
          return;
        }
      }

      // 2. Click Treasure (Coin / Diamond)
      for (let i = droppedTreasures.length - 1; i >= 0; i--) {
        const tr = droppedTreasures[i];
        if (Math.hypot(cx - tr.x, cy - tr.y) < 32) {
          coins += tr.val;
          if (window.NP_Audio?.coin) NP_Audio.coin();
          else AudioEngine.coin();
          if (window.NP_Juice) window.NP_Juice.vibrate(8);
          droppedTreasures.splice(i, 1);
          updateHUD();
          return;
        }
      }

      // 3. Drop Food
      if (foods.length < maxFoods) {
        foods.push({
          x: cx,
          y: cy,
          vy: foodLevel === 1 ? 1.0 : 0.8,
          nutri: foodLevel === 1 ? 40 : 80,
          isSuper: foodLevel === 2
        });
        if (window.NP_Audio?.pop) NP_Audio.pop();
        else AudioEngine.pop();
        if (window.NP_Juice) window.NP_Juice.vibrate(6);
      }
    }

    function magnetCollect(cx, cy) {
      for (let i = droppedTreasures.length - 1; i >= 0; i--) {
        const tr = droppedTreasures[i];
        if (Math.hypot(cx - tr.x, cy - tr.y) < 36) {
          coins += tr.val;
          if (window.NP_Audio?.coin) NP_Audio.coin();
          else AudioEngine.coin();
          if (window.NP_Juice) window.NP_Juice.vibrate(8);
          droppedTreasures.splice(i, 1);
          updateHUD();
        }
      }
    }

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
      handleCanvasAction(cx, cy);
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        const cy = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
        handleCanvasAction(cx, cy);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        const cy = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
        magnetCollect(cx, cy);
      }
    }, { passive: false });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
      magnetCollect(cx, cy);
    });

    // Buttons bindings
    container.querySelector('#ncBuyFish')?.addEventListener('click', () => {
      if (coins >= 100) {
        coins -= 100;
        fishes.push({
          id: Date.now() + Math.random(),
          x: 60 + Math.random() * (canvas.width - 120),
          y: 60 + Math.random() * 120,
          vx: (Math.random() - 0.5) * 2.5,
          vy: (Math.random() - 0.5) * 0.5,
          hunger: 90,
          tier: 1,
          bites: 0,
          coinTimer: 350,
          faceRight: Math.random() > 0.5
        });
        if (window.NP_Audio?.powerup) NP_Audio.powerup();
        else AudioEngine.powerup();
        updateHUD();
      } else {
        if (window.NP_Audio?.alarm) NP_Audio.alarm();
        else AudioEngine.hit();
      }
    });

    container.querySelector('#ncUpgradeFood')?.addEventListener('click', () => {
      if (foodLevel < 2 && coins >= 200) {
        coins -= 200;
        foodLevel = 2;
        if (window.NP_Audio?.powerup) NP_Audio.powerup();
        else AudioEngine.powerup();
        updateHUD();
      }
    });

    container.querySelector('#ncMaxFood')?.addEventListener('click', () => {
      if (maxFoods < 6 && coins >= 150) {
        coins -= 150;
        maxFoods += 1;
        if (window.NP_Audio?.powerup) NP_Audio.powerup();
        else AudioEngine.powerup();
        updateHUD();
      }
    });

    container.querySelector('#ncUpgradeLaser')?.addEventListener('click', () => {
      if (laserPower < 2 && coins >= 300) {
        coins -= 300;
        laserPower = 2;
        if (window.NP_Audio?.powerup) NP_Audio.powerup();
        else AudioEngine.powerup();
        updateHUD();
      }
    });

    container.querySelector('#ncBuyEgg')?.addEventListener('click', () => {
      const price = [500, 1000, 1500][eggPieces] || 1500;
      if (eggPieces < 3 && coins >= price) {
        coins -= price;
        eggPieces++;
        if (window.NP_Audio?.win) NP_Audio.win();
        else AudioEngine.win();
        updateHUD();

        if (eggPieces >= 3) {
          gameWon = true;
          screenShake = 15;
        }
      } else {
        if (window.NP_Audio?.alarm) NP_Audio.alarm();
      }
    });

    container.querySelector('#ncRestartBtn')?.addEventListener('click', () => {
      coins = 200;
      foodLevel = 1;
      maxFoods = 3;
      laserPower = 1;
      eggPieces = 0;
      gameWon = false;
      gameOver = false;
      alien = null;
      if (alertBanner) alertBanner.style.display = 'none';
      fishes = [
        { id: 1, x: 120, y: 150, vx: 1.4, vy: 0.1, hunger: 90, tier: 1, bites: 0, coinTimer: 300, faceRight: true },
        { id: 2, x: 280, y: 110, vx: -1.2, vy: -0.2, hunger: 90, tier: 1, bites: 0, coinTimer: 450, faceRight: false }
      ];
      foods = [];
      droppedTreasures = [];
      updateHUD();
      if (window.NP_Audio?.startBGM) NP_Audio.startBGM('insaniquarium');
    });

    function spawnAlien() {
      alien = {
        x: Math.random() > 0.5 ? 40 : canvas.width - 40,
        y: 80,
        vx: 1.0,
        vy: 0.3,
        hp: 20,
        maxHp: 20,
        hitFlash: 0
      };
      if (window.NP_Audio?.alarm) NP_Audio.alarm();
      else AudioEngine.hit();
      if (alertBanner) alertBanner.style.display = 'block';
    }

    function loop() {
      // 1. Bubbles rising
      bubbles.forEach(b => {
        b.y -= b.vy;
        if (b.y < -5) {
          b.y = canvas.height + 5;
          b.x = Math.random() * canvas.width;
        }
      });

      // 2. Food physics
      for (let i = foods.length - 1; i >= 0; i--) {
        foods[i].y += foods[i].vy;
        if (foods[i].y > canvas.height - 18) {
          foods.splice(i, 1);
        }
      }

      // 3. Treasures physics (Coins / Diamonds)
      for (let i = droppedTreasures.length - 1; i >= 0; i--) {
        const tr = droppedTreasures[i];
        if (tr.y < canvas.height - 22) {
          tr.y += tr.vy;
        }
      }

      // 4. Stinky the Snail helper
      if (droppedTreasures.length > 0) {
        // Find closest bottom treasure
        let closest = null;
        let minDist = Infinity;
        droppedTreasures.forEach(tr => {
          if (tr.y > canvas.height - 50) {
            const dist = Math.abs(tr.x - snail.x);
            if (dist < minDist) {
              minDist = dist;
              closest = tr;
            }
          }
        });

        if (closest) {
          if (closest.x > snail.x + 3) {
            snail.x += snail.vx;
            snail.faceRight = true;
          } else if (closest.x < snail.x - 3) {
            snail.x -= snail.vx;
            snail.faceRight = false;
          }

          // Snail eats treasure
          for (let i = droppedTreasures.length - 1; i >= 0; i--) {
            const tr = droppedTreasures[i];
            if (Math.hypot(tr.x - snail.x, tr.y - snail.y) < 20) {
              coins += tr.val;
              if (window.NP_Audio?.coin) NP_Audio.coin();
              else AudioEngine.coin();
              droppedTreasures.splice(i, 1);
              updateHUD();
            }
          }
        }
      }

      // 5. Alien AI
      if (alien) {
        if (alien.hitFlash > 0) alien.hitFlash--;

        // Seek nearest fish to devour
        let targetFish = null;
        let minFDist = Infinity;
        fishes.forEach(f => {
          const d = Math.hypot(f.x - alien.x, f.y - alien.y);
          if (d < minFDist) {
            minFDist = d;
            targetFish = f;
          }
        });

        if (targetFish) {
          const angle = Math.atan2(targetFish.y - alien.y, targetFish.x - alien.x);
          alien.x += Math.cos(angle) * 1.3;
          alien.y += Math.sin(angle) * 1.3;

          // Eat fish
          for (let i = fishes.length - 1; i >= 0; i--) {
            if (Math.hypot(fishes[i].x - alien.x, fishes[i].y - alien.y) < 24) {
              fishes.splice(i, 1);
              if (window.NP_Audio?.bite) NP_Audio.bite();
              else if (window.NP_Audio?.hit) NP_Audio.hit();
              else AudioEngine.hit();
              screenShake = 6;
            }
          }
        } else {
          // Wander
          alien.x += alien.vx;
          alien.y += alien.vy;
          if (alien.x < 40 || alien.x > canvas.width - 40) alien.vx = -alien.vx;
          if (alien.y < 40 || alien.y > canvas.height - 50) alien.vy = -alien.vy;
        }
      } else {
        // Alien spawn countdown
        nextAlienTimer--;
        if (nextAlienTimer <= 0) {
          spawnAlien();
          nextAlienTimer = (35 + Math.random() * 20) * 60;
        }
      }

      // 6. Fish AI & Life Cycle
      for (let i = fishes.length - 1; i >= 0; i--) {
        const f = fishes[i];
        f.x += f.vx;
        f.y += f.vy;

        // Turn around on edges
        if (f.x < 35) { f.vx = Math.abs(f.vx); f.faceRight = true; }
        if (f.x > canvas.width - 35) { f.vx = -Math.abs(f.vx); f.faceRight = false; }
        if (f.y < 35) f.vy = Math.abs(f.vy);
        if (f.y > canvas.height - 40) f.vy = -Math.abs(f.vy);

        // Hunger decay
        f.hunger -= 0.055;

        // Flee from alien if nearby
        if (alien) {
          const ad = Math.hypot(alien.x - f.x, alien.y - f.y);
          if (ad < 90) {
            f.vx += (f.x - alien.x) * 0.04;
            f.vy += (f.y - alien.y) * 0.04;
          }
        }

        // Seek food when hungry (< 65)
        if (f.hunger < 65 && foods.length > 0) {
          // Find closest food
          let closestFood = foods[0];
          let cDist = Infinity;
          foods.forEach(fd => {
            const d = Math.hypot(fd.x - f.x, fd.y - f.y);
            if (d < cDist) { cDist = d; closestFood = fd; }
          });

          if (closestFood) {
            f.vx += (closestFood.x - f.x) * 0.035;
            f.vy += (closestFood.y - f.y) * 0.035;
            f.faceRight = f.vx > 0;

            // Bite food
            for (let fi = foods.length - 1; fi >= 0; fi--) {
              if (Math.hypot(f.x - foods[fi].x, f.y - foods[fi].y) < 18) {
                const fd = foods.splice(fi, 1)[0];
                f.hunger = Math.min(100, f.hunger + fd.nutri);
                f.bites += fd.isSuper ? 2 : 1;
                if (window.NP_Audio?.bite) NP_Audio.bite();
                else if (window.NP_Audio?.pop) NP_Audio.pop();
                else AudioEngine.pop();

                // Growth stages
                if (f.tier === 1 && f.bites >= 4) {
                  f.tier = 2; // Medium guppy
                  if (window.NP_Audio?.powerup) NP_Audio.powerup();
                } else if (f.tier === 2 && f.bites >= 9) {
                  f.tier = 3; // King guppy
                  if (window.NP_Audio?.win) NP_Audio.win();
                } else if (f.tier === 3 && f.bites >= 15) {
                  f.tier = 4; // Star guppy
                  if (window.NP_Audio?.win) NP_Audio.win();
                }
                break;
              }
            }
          }
        }

        // Drop Coins based on tier
        if (f.tier >= 2) {
          f.coinTimer--;
          if (f.coinTimer <= 0) {
            if (f.tier === 2) {
              // Silver coin ($15)
              droppedTreasures.push({ x: f.x, y: f.y, vy: 0.9, type: 'silver', val: 15 });
              f.coinTimer = 450 + Math.random() * 100;
            } else if (f.tier === 3) {
              // Gold coin ($35)
              droppedTreasures.push({ x: f.x, y: f.y, vy: 1.0, type: 'gold', val: 35 });
              f.coinTimer = 380 + Math.random() * 80;
            } else if (f.tier === 4) {
              // Diamond ($100)
              droppedTreasures.push({ x: f.x, y: f.y, vy: 0.8, type: 'diamond', val: 100 });
              f.coinTimer = 480 + Math.random() * 100;
            }
            if (window.NP_Audio?.coin) NP_Audio.coin();
          }
        }

        // Starvation check
        if (f.hunger <= 0) {
          fishes.splice(i, 1);
          if (fishes.length === 0 && coins < 100) {
            gameOver = true;
          }
        }
      }

      // --- RENDER PASS ---
      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.86;
        if (screenShake < 0.3) screenShake = 0;
      }

      // 1. Water Caustics Background
      const waterGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      waterGrad.addColorStop(0, '#0284C7');
      waterGrad.addColorStop(0.6, '#0369A1');
      waterGrad.addColorStop(1, '#075985');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sun rays
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(80, 0); ctx.lineTo(160, canvas.height); ctx.lineTo(120, canvas.height); ctx.lineTo(50, 0); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(280, 0); ctx.lineTo(380, canvas.height); ctx.lineTo(330, canvas.height); ctx.lineTo(240, 0); ctx.fill();

      // 2. Bubbles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Sand Floor
      ctx.fillStyle = '#D97706';
      ctx.fillRect(0, canvas.height - 18, canvas.width, 18);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(0, canvas.height - 14, canvas.width, 14);

      // 4. Stinky the Snail
      ctx.fillStyle = '#B45309';
      // Snail Shell
      ctx.beginPath();
      ctx.arc(snail.x + (snail.faceRight ? -5 : 5), snail.y - 4, 8, 0, Math.PI * 2);
      ctx.fill();
      // Snail Body
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.ellipse(snail.x, snail.y, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Snail Eye stalks
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(snail.x + (snail.faceRight ? 7 : -9), snail.y - 7, 2, 5);

      // 5. Foods
      foods.forEach(fd => {
        ctx.fillStyle = fd.isSuper ? '#10B981' : '#92400E';
        ctx.beginPath();
        ctx.arc(fd.x, fd.y, fd.isSuper ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (fd.isSuper) {
          ctx.strokeStyle = '#6EE7B7';
          ctx.stroke();
        }
      });

      // 6. Dropped Treasures (Silver, Gold, Diamond)
      droppedTreasures.forEach(tr => {
        if (tr.type === 'diamond') {
          // Diamond polygon
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.moveTo(tr.x, tr.y - 8);
          ctx.lineTo(tr.x + 7, tr.y);
          ctx.lineTo(tr.x, tr.y + 9);
          ctx.lineTo(tr.x - 7, tr.y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(tr.x, tr.y - 6);
          ctx.lineTo(tr.x + 3, tr.y);
          ctx.lineTo(tr.x, tr.y + 4);
          ctx.closePath();
          ctx.fill();
        } else {
          // Coin circle
          ctx.fillStyle = tr.type === 'silver' ? '#CBD5E1' : '#F59E0B';
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = tr.type === 'silver' ? '#94A3B8' : '#D97706';
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 9px Calibri, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('$', tr.x, tr.y + 3);
        }
      });

      // 7. Fishes
      fishes.forEach(f => {
        const dir = f.faceRight ? 1 : -1;
        const hungryColor = f.hunger < 45;

        // Size & Colors by tier
        let bodyR = 14;
        let color = '#F97316';
        let finColor = '#FB923C';

        if (f.tier === 1) {
          bodyR = 10;
          color = hungryColor ? '#10B981' : '#FBBF24';
          finColor = '#FDE047';
        } else if (f.tier === 2) {
          bodyR = 15;
          color = hungryColor ? '#059669' : '#EA580C';
          finColor = '#F97316';
        } else if (f.tier === 3) {
          bodyR = 19;
          color = hungryColor ? '#047857' : '#F59E0B';
          finColor = '#FDE047';
        } else if (f.tier === 4) {
          bodyR = 21;
          color = hungryColor ? '#065F46' : '#C026D3';
          finColor = '#F472B6';
        }

        // Tail
        ctx.fillStyle = finColor;
        ctx.beginPath();
        ctx.moveTo(f.x - dir * (bodyR * 0.8), f.y);
        ctx.lineTo(f.x - dir * (bodyR * 1.7), f.y - bodyR * 0.6);
        ctx.lineTo(f.x - dir * (bodyR * 1.7), f.y + bodyR * 0.6);
        ctx.closePath();
        ctx.fill();

        // Body ellipse
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, bodyR * 1.2, bodyR * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crown for King Guppy (Tier 3)
        if (f.tier >= 3) {
          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.moveTo(f.x - 5, f.y - bodyR * 0.8);
          ctx.lineTo(f.x, f.y - bodyR * 1.3);
          ctx.lineTo(f.x + 5, f.y - bodyR * 0.8);
          ctx.closePath();
          ctx.fill();
        }

        // Eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(f.x + dir * (bodyR * 0.6), f.y - bodyR * 0.25, bodyR * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(f.x + dir * (bodyR * 0.7), f.y - bodyR * 0.25, bodyR * 0.12, 0, Math.PI * 2);
        ctx.fill();
      });

      // 8. Alien Sylvester (Predator)
      if (alien) {
        ctx.fillStyle = alien.hitFlash > 0 ? '#FFFFFF' : '#7C3AED';
        // Alien head/body
        ctx.beginPath();
        ctx.ellipse(alien.x, alien.y, 24, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spikes / Claws
        ctx.fillStyle = '#4C1D95';
        ctx.beginPath();
        ctx.moveTo(alien.x - 18, alien.y - 12);
        ctx.lineTo(alien.x - 26, alien.y - 20);
        ctx.lineTo(alien.x - 12, alien.y - 16);
        ctx.fill();

        // Alien Red Eyes
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(alien.x - 6, alien.y - 4, 4, 0, Math.PI * 2);
        ctx.arc(alien.x + 6, alien.y - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Sharp Teeth Mouth
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(alien.x - 10, alien.y + 6, 20, 4);

        // Alien HP Bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(alien.x - 20, alien.y - 26, 40, 5);
        ctx.fillStyle = '#EF4444';
        const hpWidth = Math.max(0, (alien.hp / alien.maxHp) * 38);
        ctx.fillRect(alien.x - 19, alien.y - 25, hpWidth, 3);
      }

      // 9. Particle effects (Lasers, Sparks)
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life--;
        if (pt.type === 'laser') {
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = laserPower === 1 ? 2.5 : 4.5;
          ctx.beginPath();
          ctx.moveTo(pt.x1, pt.y1);
          ctx.lineTo(pt.x2, pt.y2);
          ctx.stroke();
        } else if (pt.type === 'spark') {
          pt.x += pt.vx;
          pt.y += pt.vy;
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x, pt.y, 3, 3);
        }
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // Victory / Game Over Overlay
      if (gameWon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 24px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 CHÚC MỪNG BẠN ĐÃ CHIẾN THẮNG!', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#FFF';
        ctx.font = '15px Calibri, sans-serif';
        ctx.fillText('Bạn đã hoàn thành ấp nở Trứng thần Insaniquarium!', canvas.width / 2, canvas.height / 2 + 16);
      } else if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 24px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#FFF';
        ctx.font = '14px Calibri, sans-serif';
        ctx.fillText('Tất cả cá đã chết và bạn không còn đủ xu để mua cá mới!', canvas.width / 2, canvas.height / 2 + 16);
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    }

    updateHUD();
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
      if (alertBanner) alertBanner.style.display = 'none';
      if (window.NP_Audio?.stopBGM) NP_Audio.stopBGM();
    });
  }

  // =========================================================================
  // 13. ENGINE: PONG 1972 (CLASSIC TABLE TENNIS ENGINE)
  // =========================================================================
  function launchPong(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    let pScore = 0;
    let aiScore = 0;
    let animId = null;

    container.innerHTML = `
      <div class="canvas-game-box">
        <div class="canvas-game-hud">
          <div class="hud-pill">Bạn: <span id="pongPlayer" style="color: #10B981;">0</span></div>
          <div class="hud-pill">Máy: <span id="pongAI" style="color: #EF4444;">0</span></div>
        </div>
        <canvas id="pongCanvas" width="460" height="280" class="canvas-main-viewport" style="background: #000; display: block; margin: 0 auto;"></canvas>
        <div class="canvas-controls-bar">
          <small style="color: #FFF;">🏓 Rê chuột hoặc Phím [W][S] / Mũi tên để điều khiển vợt</small>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#pongCanvas');
    const ctx = canvas.getContext('2d');

    let pY = 110;
    let aiY = 110;
    let ball = { x: 230, y: 140, vx: 4, vy: 3 };
    const pongKeys = {};

    const onPongKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(e.key)) {
        pongKeys[e.key] = true;
        e.preventDefault();
      }
    };
    const onPongKeyUp = (e) => {
      pongKeys[e.key] = false;
    };
    listen(window, 'keydown', onPongKeyDown);
    listen(window, 'keyup', onPongKeyUp);

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleY = canvas.height / rect.height;
      pY = Math.max(10, Math.min(canvas.height - 60, (e.clientY - rect.top) * scaleY - 25));
    });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        pY = Math.max(10, Math.min(canvas.height - 60, (e.touches[0].clientY - rect.top) * scaleY - 25));
      }
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        pY = Math.max(10, Math.min(canvas.height - 60, (e.touches[0].clientY - rect.top) * scaleY - 25));
      }
    }, { passive: false });

    function loop() {
      // Keyboard input
      if (pongKeys['ArrowUp'] || pongKeys['w'] || pongKeys['W']) {
        pY = Math.max(10, pY - 5.5);
      }
      if (pongKeys['ArrowDown'] || pongKeys['s'] || pongKeys['S']) {
        pY = Math.min(canvas.height - 60, pY + 5.5);
      }

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Top/bottom bounce
      if (ball.y < 5 || ball.y > canvas.height - 5) {
        ball.vy = -ball.vy;
        AudioEngine.pop();
      }

      // Player paddle hit with dynamic angle deflection & rally acceleration
      if (ball.x < 30 && ball.x > 15 && ball.y > pY - 4 && ball.y < pY + 54) {
        const offset = (ball.y - (pY + 25)) / 25; // -1 to 1
        ball.vy = offset * 4.8;
        ball.vx = Math.min(9.5, Math.abs(ball.vx) * 1.05); // Accelerate
        AudioEngine.hit();
        if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 3, 100);
      }

      // AI paddle hit
      if (ball.x > canvas.width - 30 && ball.x < canvas.width - 15 && ball.y > aiY - 4 && ball.y < aiY + 54) {
        const offset = (ball.y - (aiY + 25)) / 25;
        ball.vy = offset * 4.8;
        ball.vx = -Math.min(9.5, Math.abs(ball.vx) * 1.05);
        AudioEngine.hit();
        if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 3, 100);
      }

      // AI follow with human-like lag
      aiY += (ball.y - (aiY + 25)) * 0.075;

      // Score
      if (ball.x < 0) {
        aiScore++;
        AudioEngine.alarm();
        ball = { x: 230, y: 140, vx: 4, vy: (Math.random() - 0.5) * 5 };
      } else if (ball.x > canvas.width) {
        pScore++;
        AudioEngine.win();
        ball = { x: 230, y: 140, vx: -4, vy: (Math.random() - 0.5) * 5 };
      }

      const pEl = container.querySelector('#pongPlayer');
      const aEl = container.querySelector('#pongAI');
      if (pEl) pEl.textContent = pScore;
      if (aEl) aEl.textContent = aiScore;

      // Draw
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // CRT Phosphor subtle scanlines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let y = 0; y < canvas.height; y += 3) {
        ctx.fillRect(0, y, canvas.width, 1);
      }

      // Net
      ctx.fillStyle = '#374151';
      for (let y = 0; y < canvas.height; y += 15) {
        ctx.fillRect(canvas.width / 2 - 1, y, 2, 8);
      }

      // Paddles
      ctx.fillStyle = '#10B981';
      ctx.fillRect(15, pY, 8, 50);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(canvas.width - 23, aiY, 8, 50);

      // Ball with glow
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ball.x - 4, ball.y - 4, 8, 8);

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      cancelAnimationFrame(animId);
    });
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
