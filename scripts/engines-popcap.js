/**
 * NEWPLAYGROUND - POPCAP, BOARD & RETRO CLASSICS ENGINE SUITE
 * Implements 100% authentic childhood original gameplay with tactile feel & complete stage progression:
 * 1. Zuma Deluxe (PopCap Ếch Bắn Ngọc 2003) - Frog turret, recoil kick, intro screen, stage 1-3, pull-back combos
 * 2. Diner Dash (PlayFirst Phục Vụ Bàn 2004) - Color matching booths, Flo dual-carry, shift clear screens, calm pacing
 * 3. Cờ Tướng Tàn Cuộc (Xiangqi Endgame Tactics) - Intro art, 5 endgame puzzles, carved wooden board, move validation
 * 4. Bắn Bi Ve Tuổi Thơ (Vietnamese Childhood Marbles) - Intro art, sand friction, slingshot aim, round 1-3 progression
 * 5. Đánh Bài Đổi Màu (Uno Classic) - Intro art, action cards, turn rotation, HÔ UNO! button, 3 AI opponents
 *
 * Strict Calibri typography and 100% synthesized Web Audio API (Muted during work as instructed).
 */

(function () {
  'use strict';

  if (!window.NP_Engines) window.NP_Engines = {};

  const FONT_BASE = 'Calibri, -apple-system, sans-serif';

  // =========================================================================
  // 1. ZUMA DELUXE (POPCAP ẾCH BẮN NGỌC 2003)
  // =========================================================================
  function launchZuma(container, game) {
    let score = 0;
    let coins = 0;
    let stage = 1;
    let maxStages = 3;
    let zumaProgress = 0;
    let zumaMax = 100;
    let isZumaFull = false;
    let gameState = 'INTRO'; // 'INTRO', 'PLAYING', 'STAGE_CLEAR', 'GAMEOVER'
    let animId = null;
    let lastFrameTime = performance.now();

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('zuma');
    }

    const COLORS = [
      { id: 0, hex: '#EF4444', name: 'Đỏ', dark: '#991B1B' },
      { id: 1, hex: '#F59E0B', name: 'Vàng', dark: '#B45309' },
      { id: 2, hex: '#10B981', name: 'Xanh Lá', dark: '#047857' },
      { id: 3, hex: '#3B82F6', name: 'Xanh Dương', dark: '#1D4ED8' },
      { id: 4, hex: '#8B5CF6', name: 'Tím', dark: '#5B21B6' }
    ];

    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

    // Track path: generate winding stone track around the 640x480 canvas
    const trackPoints = [];
    const totalSteps = 600;
    const centerX = 320;
    const centerY = 240;

    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const angle = t * Math.PI * 4.2;
      const r = 220 * (1 - t * 0.75);
      const px = centerX + Math.cos(angle) * r;
      const py = centerY + Math.sin(angle) * (r * 0.85);
      trackPoints.push({ x: px, y: py, angle: angle });
    }

    const skullPos = trackPoints[trackPoints.length - 1];

    function getRandomColorId() {
      const numColors = stage === 1 ? 3 : (stage === 2 ? 4 : 5);
      return Math.floor(Math.random() * numColors);
    }

    // Frog Shooter state with tactile recoil
    const frog = {
      x: centerX,
      y: centerY + 18,
      angle: 0,
      radius: 34,
      currentColor: getRandomColorId(),
      nextColor: getRandomColorId(),
      recoil: 0
    };

    // Ball train along the track
    let train = [];
    let ballIdCounter = 1;
    const BALL_RADIUS = 13;
    const BALL_SPACING = BALL_RADIUS * 2;
    let baseSpeed = 0.28;
    let isReversing = false;
    let reverseTimer = 0;

    // Flying bullet ball
    let bullet = null;

    // Bonus golden coin
    let bonusCoin = null;
    let coinTimer = 0;

    function initTrainForStage(stg) {
      stage = stg;
      train = [];
      ballIdCounter = 1;
      bullet = null;
      bonusCoin = null;
      isReversing = false;
      reverseTimer = 0;
      zumaProgress = 0;
      isZumaFull = false;
      baseSpeed = 0.26 + (stage - 1) * 0.06; // Calm, tactile speed

      const numInitial = 24 + stage * 8;
      for (let i = 0; i < numInitial; i++) {
        train.push({
          id: ballIdCounter++,
          colorId: getRandomColorId(),
          dist: -i * BALL_SPACING
        });
      }
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="font-family: ${FONT_BASE};">
        <div class="canvas-game-hud">
          <div class="hud-pill">Màn: <span id="zmStage" style="color: #F59E0B; font-weight: 900;">${stage}</span>/3</div>
          <div class="hud-pill">Điểm: <span id="zmScore" style="color: #10B981; font-weight: 900;">${score}</span></div>
          <div class="hud-pill">Zuma: <span id="zmPercent" style="color: #60A5FA; font-weight: 900;">0%</span></div>
          <div class="hud-pill">Đổi ngọc: <span style="color: #FCD34D;">[Space / Click Phải]</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="zmCanvas" width="640" height="480" class="canvas-main-viewport" style="background: #1C1917; cursor: crosshair; border-radius: 8px;"></canvas>

          <!-- 1. MÀN HÌNH MỞ ĐẦU (INTRO OVERLAY) -->
          <div class="game-stage-overlay" id="zmIntroOverlay">
            <div class="intro-modal-card">
              <div class="intro-hero-wrapper">
                <img src="assets/zuma_intro.jpg" alt="Zuma Deluxe" class="intro-hero-img">
                <div class="intro-hero-overlay">
                  <span class="intro-badge">PopCap Games 2003</span>
                  <h3 class="intro-title">Zuma Deluxe - Đền Thờ Cổ</h3>
                </div>
              </div>
              <div class="intro-content">
                <p class="intro-desc">Ngôi đền cổ đại Aztec đang bị xâm chiếm bởi chuỗi ngọc ma thuật trườn về hố Đầu Lâu Vàng. Hãy điều khiển Ếch Thần xoay 360°, ngắm bắn phá hủy các viên ngọc thần trước khi chạm đích!</p>
                <div class="intro-controls-box">
                  <div class="intro-control-row">
                    <span class="intro-key">Rê Chuột / Chạm</span>
                    <span>Xoay Ếch Thần ngắm hướng bắn 360 độ</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Chuột Trái / Tap</span>
                    <span>Bắn ngọc vào đoàn tàu • Bắn nổ cụm 3 viên cùng màu</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Phím Space / Click Phải</span>
                    <span>Hoán đổi nhanh màu ngọc dự phòng trên lưng</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Lực Hút Giật Lùi</span>
                    <span>Bắn đứt đoạn tạo 2 đầu cùng màu để hút lùi và kích hoạt Combo x2, x3</span>
                  </div>
                </div>
                <div class="intro-actions">
                  <button class="btn-intro-start" id="zmStartGameBtn">Bắt đầu phiêu lưu (Màn 1)</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. MÀN HÌNH QUA MÀN (STAGE CLEAR OVERLAY) -->
          <div class="game-stage-overlay" id="zmClearOverlay" style="display: none;">
            <div class="intro-modal-card stage-clear-card">
              <div class="stage-clear-stars">⭐⭐⭐</div>
              <h3 class="intro-title" style="color: #10B981; font-size: 1.5rem;">HOÀN THÀNH MÀN XUẤT SẮC!</h3>
              <p class="intro-desc" id="zmClearDesc">Bạn đã dọn sạch chuỗi ngọc ma thuật và bảo vệ ngôi đền cổ!</p>
              <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 8px; margin: 12px 0;">
                <div style="font-size: 1.15rem; color: #F59E0B; font-weight: 900;">Tổng điểm hiện tại: $<span id="zmClearScore">0</span></div>
                <div style="font-size: 0.9rem; color: #9CA3AF; margin-top: 4px;" id="zmNextStageTip">Chuẩn bị bước sang Màn kế tiếp với thử thách mới!</div>
              </div>
              <div class="intro-actions">
                <button class="btn-intro-start" id="zmNextStageBtn">➔ TIẾP TỤC SANG MÀN KẾ TIẾP</button>
              </div>
            </div>
          </div>

          <!-- 3. MÀN HÌNH THUA CUỘC (GAME OVER OVERLAY) -->
          <div class="game-stage-overlay" id="zmGameOverOverlay" style="display: none;">
            <div class="intro-modal-card stage-clear-card">
              <div style="font-size: 2.5rem; margin-bottom: 6px;">💀</div>
              <h3 class="intro-title" style="color: #EF4444; font-size: 1.5rem;">ĐẦU LÂU NUỐT CHỬNG!</h3>
              <p class="intro-desc">Chuỗi ngọc đã rơi vào miệng hố cổ đại. Lời nguyền đền thờ thức giấc!</p>
              <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin: 12px 0;">
                <div style="font-size: 1.1rem; color: #F3F4F6; font-weight: 800;">Điểm số đạt được: <span id="zmFinalScore">0</span></div>
              </div>
              <div class="intro-actions">
                <button class="btn-intro-start" id="zmRetryBtn" style="background: linear-gradient(135deg, #EF4444, #B91C1C); color: #FFF;">Chơi lại từ Màn 1</button>
              </div>
            </div>
          </div>
        </div>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn-canvas-action" id="zmSwapBtn" style="background: #D97706; color: #FFF; font-weight: 700;">Đổi ngọc (Space)</button>
            <small style="color: #E2E8F0;">Rê chuột ngắm • Chuột trái bắn • Bắn nổ cụm 3 cùng màu • Kéo giật lùi tạo combo liên hoàn!</small>
          </div>
          <button class="btn-canvas-action" id="zmRestartBtn">Chơi lại</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#zmCanvas');
    const ctx = canvas.getContext('2d');
    const stageEl = container.querySelector('#zmStage');
    const scoreEl = container.querySelector('#zmScore');
    const percentEl = container.querySelector('#zmPercent');
    const swapBtn = container.querySelector('#zmSwapBtn');
    const restartBtn = container.querySelector('#zmRestartBtn');

    const introOverlay = container.querySelector('#zmIntroOverlay');
    const startBtn = container.querySelector('#zmStartGameBtn');
    const clearOverlay = container.querySelector('#zmClearOverlay');
    const nextStageBtn = container.querySelector('#zmNextStageBtn');
    const gameOverOverlay = container.querySelector('#zmGameOverOverlay');
    const retryBtn = container.querySelector('#zmRetryBtn');
    const clearScoreEl = container.querySelector('#zmClearScore');
    const nextStageTipEl = container.querySelector('#zmNextStageTip');
    const finalScoreEl = container.querySelector('#zmFinalScore');

    function updateHUD() {
      if (stageEl) stageEl.textContent = `${stage}`;
      if (scoreEl) scoreEl.textContent = `${score}`;
      if (percentEl) percentEl.textContent = `${Math.floor((zumaProgress / zumaMax) * 100)}%`;
    }

    function swapFrogBall() {
      const temp = frog.currentColor;
      frog.currentColor = frog.nextColor;
      frog.nextColor = temp;
      if (window.NP_Audio) window.NP_Audio.clack();
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        introOverlay.style.display = 'none';
        gameState = 'PLAYING';
        initTrainForStage(1);
        updateHUD();
      });
    }

    if (nextStageBtn) {
      nextStageBtn.addEventListener('click', () => {
        clearOverlay.style.display = 'none';
        if (stage < maxStages) {
          stage++;
        }
        gameState = 'PLAYING';
        initTrainForStage(stage);
        updateHUD();
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        gameOverOverlay.style.display = 'none';
        score = 0;
        stage = 1;
        gameState = 'PLAYING';
        initTrainForStage(1);
        updateHUD();
      });
    }

    if (swapBtn) swapBtn.addEventListener('click', swapFrogBall);
    if (restartBtn) restartBtn.addEventListener('click', () => {
      score = 0;
      stage = 1;
      gameState = 'PLAYING';
      initTrainForStage(1);
      updateHUD();
    });

    // Calibrated mouse & touch aiming
    function handleAim(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left) * (canvas.width / rect.width);
      const my = (clientY - rect.top) * (canvas.height / rect.height);
      frog.angle = Math.atan2(my - frog.y, mx - frog.x);
    }

    canvas.addEventListener('mousemove', (e) => handleAim(e.clientX, e.clientY));
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        handleAim(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    function handleShoot() {
      if (gameState !== 'PLAYING' || bullet) return;
      const speed = 9.2; // Calibrated tactile speed
      bullet = {
        x: frog.x + Math.cos(frog.angle) * 32,
        y: frog.y + Math.sin(frog.angle) * 32,
        vx: Math.cos(frog.angle) * speed,
        vy: Math.sin(frog.angle) * speed,
        colorId: frog.currentColor,
        radius: BALL_RADIUS
      };
      frog.recoil = 8; // Tactile recoil kick!
      frog.currentColor = frog.nextColor;
      frog.nextColor = getRandomColorId();
      if (window.NP_Audio) window.NP_Audio.whoosh();
      if (window.NP_Juice) window.NP_Juice.vibrate(10);
    }

    canvas.addEventListener('mousedown', (e) => {
      if (gameState !== 'PLAYING') return;
      if (e.button === 2) {
        e.preventDefault();
        swapFrogBall();
        return;
      }
      if (e.button === 0) handleShoot();
    });

    let touchAimed = false;
    canvas.addEventListener('touchstart', (e) => {
      if (gameState !== 'PLAYING') return;
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
        // Tap on frog to swap ball
        if (Math.hypot(mx - frog.x, my - frog.y) < 38) {
          swapFrogBall();
          touchAimed = false;
          return;
        }
        handleAim(e.touches[0].clientX, e.touches[0].clientY);
        touchAimed = true;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (gameState !== 'PLAYING') return;
      if (touchAimed) {
        e.preventDefault();
        touchAimed = false;
        handleShoot();
      }
    }, { passive: false });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        swapFrogBall();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    function getTrackPos(dist) {
      if (dist < 0) return { x: -999, y: -999, valid: false };
      const step = Math.min(totalSteps - 1, Math.floor(dist * 0.8));
      return { ...trackPoints[step], valid: true, step };
    }

    function checkMatchesAt(idx, comboCount = 1) {
      if (idx < 0 || idx >= train.length) return false;
      const targetColor = train[idx].colorId;
      let left = idx;
      let right = idx;

      while (left > 0 && train[left - 1].colorId === targetColor) left--;
      while (right < train.length - 1 && train[right + 1].colorId === targetColor) right++;

      const count = right - left + 1;
      if (count >= 3) {
        const removedBalls = train.splice(left, count);
        const pts = count * 100 * comboCount;
        score += pts;
        zumaProgress = Math.min(zumaMax, zumaProgress + count * 3);
        if (zumaProgress >= zumaMax) isZumaFull = true;
        updateHUD();

        const midPos = getTrackPos(removedBalls[0].dist);
        if (particles) {
          particles.burst(midPos.x, midPos.y, count * 8, COLORS[targetColor].hex, 160, 4);
        }
        if (window.NP_Audio) {
          window.NP_Audio.pop();
          window.NP_Audio.combo(comboCount);
        }
        if (window.NP_Juice) {
          window.NP_Juice.screenShake(container, Math.min(14, 5 * comboCount), 240);
          window.NP_Juice.triggerHitstop(35);
        }
        if (popups) {
          popups.spawn(midPos.x, midPos.y, `+${pts} COMBO x${comboCount}!`, '#FBBF24', 22);
        }

        // Lực hút giật lùi (Magnetic reverse combo)
        if (left > 0 && left < train.length) {
          const prevBall = train[left - 1];
          const nextBall = train[left];
          if (prevBall.colorId === nextBall.colorId) {
            isReversing = true;
            reverseTimer = 35;
            if (window.NP_Audio) window.NP_Audio.whoosh();
            setTimeout(() => {
              checkMatchesAt(left, comboCount + 1);
            }, 300);
          }
        }

        // Check level win
        if (isZumaFull && train.length === 0) {
          gameState = 'STAGE_CLEAR';
          if (clearScoreEl) clearScoreEl.textContent = `${score}`;
          if (nextStageTipEl) {
            nextStageTipEl.textContent = stage < maxStages ?
              `Chuẩn bị bước sang Màn ${stage + 1} với tốc độ và thử thách mới!` :
              `Chúc mừng bạn đã chinh phục toàn bộ ${maxStages} Màn của Đền Thờ Zuma!`;
          }
          if (clearOverlay) clearOverlay.style.display = 'flex';
          if (window.NP_Audio) window.NP_Audio.win();
        }
        return true;
      }
      return false;
    }

    // Main Game Loop with 60 FPS Fixed Delta-Time
    function loop(now) {
      animId = requestAnimationFrame(loop);
      if (!lastFrameTime) lastFrameTime = now;
      let dtMs = now - lastFrameTime;
      if (dtMs > 100) dtMs = 100;
      lastFrameTime = now;
      const dtRatio = dtMs / 16.67; // 1.0 at 60fps, 0.5 at 120fps

      // 1. Advance or Reverse Train
      if (gameState === 'PLAYING') {
        if (isReversing && reverseTimer > 0) {
          reverseTimer -= dtRatio;
          for (let i = 0; i < train.length; i++) {
            train[i].dist = Math.max(0, train[i].dist - baseSpeed * 3.0 * dtRatio);
          }
          if (reverseTimer <= 0) isReversing = false;
        } else {
          for (let i = 0; i < train.length; i++) {
            train[i].dist += baseSpeed * dtRatio;
          }
        }

        const leadDist = train.length > 0 ? train[0].dist : 0;
        const skullDist = (totalSteps - 1) / 0.8;

        if (leadDist >= skullDist) {
          gameState = 'GAMEOVER';
          if (finalScoreEl) finalScoreEl.textContent = `${score}`;
          if (gameOverOverlay) gameOverOverlay.style.display = 'flex';
          if (window.NP_Audio) window.NP_Audio.explosion(true);
          if (window.NP_Juice) window.NP_Juice.screenShake(container, 15, 600);
        }
      }

      // 2. Flying Bullet Update
      if (bullet) {
        bullet.x += bullet.vx * dtRatio;
        bullet.y += bullet.vy * dtRatio;

        if (bonusCoin) {
          const cdx = bullet.x - bonusCoin.x;
          const cdy = bullet.y - bonusCoin.y;
          if (Math.hypot(cdx, cdy) < 26) {
            score += 500;
            coins++;
            updateHUD();
            if (window.NP_Audio) window.NP_Audio.coin();
            if (popups) popups.spawn(bonusCoin.x, bonusCoin.y, '+500 TIỀN VÀNG!', '#F59E0B', 22);
            bonusCoin = null;
          }
        }

        let hitIdx = -1;
        for (let i = 0; i < train.length; i++) {
          const tPos = getTrackPos(train[i].dist);
          if (!tPos.valid) continue;
          const distToBall = Math.hypot(bullet.x - tPos.x, bullet.y - tPos.y);
          if (distToBall < BALL_RADIUS * 1.85) {
            hitIdx = i;
            break;
          }
        }

        if (hitIdx !== -1) {
          const insertedDist = train[hitIdx].dist - BALL_SPACING * 0.5;
          train.splice(hitIdx, 0, {
            id: ballIdCounter++,
            colorId: bullet.colorId,
            dist: insertedDist
          });

          for (let j = 0; j < hitIdx; j++) {
            train[j].dist += BALL_SPACING;
          }

          if (window.NP_Audio) window.NP_Audio.pop();
          checkMatchesAt(hitIdx, 1);
          bullet = null;
        } else if (bullet.x < -20 || bullet.x > canvas.width + 20 || bullet.y < -20 || bullet.y > canvas.height + 20) {
          bullet = null;
        }
      }

      // 3. Periodic Bonus Coin
      if (gameState === 'PLAYING') {
        coinTimer += dtRatio;
        if (coinTimer > 600) {
          coinTimer = 0;
          if (!bonusCoin && Math.random() < 0.6) {
            const coinSlots = [
              { x: 120, y: 120 }, { x: 520, y: 120 }, { x: 120, y: 380 }, { x: 520, y: 380 }
            ];
            bonusCoin = coinSlots[Math.floor(Math.random() * coinSlots.length)];
          }
        }
      }

      // Frog recoil decay
      if (frog.recoil > 0) {
        frog.recoil = Math.max(0, frog.recoil - 0.5 * dtRatio);
      }

      // --- RENDERING ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background Stone Temple Grid
      ctx.fillStyle = '#1C1917';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw Winding Stone Track
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < trackPoints.length; i++) {
        if (i === 0) ctx.moveTo(trackPoints[i].x, trackPoints[i].y);
        else ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
      }
      ctx.lineWidth = BALL_RADIUS * 2.5;
      ctx.strokeStyle = '#292524';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.lineWidth = BALL_RADIUS * 2.2;
      ctx.strokeStyle = '#44403C';
      ctx.stroke();
      ctx.restore();

      // Aiming laser trajectory prediction dots
      if (gameState === 'PLAYING') {
        ctx.save();
        const curDef = COLORS[frog.currentColor] || COLORS[0];
        ctx.fillStyle = curDef.hex;
        ctx.shadowColor = curDef.hex;
        ctx.shadowBlur = 6;
        for (let d = 42; d <= 260; d += 22) {
          const dotX = frog.x + Math.cos(frog.angle) * d;
          const dotY = frog.y + Math.sin(frog.angle) * d;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Golden Skull Pit at center-end with Danger Alert
      const leadDist = train.length > 0 ? train[0].dist : 0;
      const isDanger = leadDist > totalTrackLength * 0.72;
      ctx.save();
      ctx.translate(skullPos.x, skullPos.y);
      ctx.fillStyle = isDanger ? '#EF4444' : '#D97706';
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#78350F';
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      // Eye sockets glow red fire if danger
      ctx.fillStyle = isDanger ? ((Math.floor(Date.now() / 150) % 2 === 0) ? '#FEE2E2' : '#EF4444') : '#FEF08A';
      ctx.beginPath(); ctx.arc(-7, -4, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -4, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Bonus Coin
      if (bonusCoin) {
        ctx.save();
        ctx.translate(bonusCoin.x, bonusCoin.y);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#B45309';
        ctx.font = `bold 12px ${FONT_BASE}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        ctx.restore();
      }

      // Draw Train Balls
      for (let i = train.length - 1; i >= 0; i--) {
        const ball = train[i];
        const tPos = getTrackPos(ball.dist);
        if (!tPos.valid) continue;

        const cDef = COLORS[ball.colorId] || COLORS[0];
        ctx.save();
        ctx.translate(tPos.x, tPos.y);

        const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, BALL_RADIUS);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, cDef.hex);
        grad.addColorStop(1, cDef.dark);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // Draw Flying Bullet
      if (bullet) {
        const cDef = COLORS[bullet.colorId] || COLORS[0];
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, BALL_RADIUS);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, cDef.hex);
        grad.addColorStop(1, cDef.dark);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Draw Frog Turret Idol with Recoil Kick
      ctx.save();
      const recoilDist = frog.recoil || 0;
      const rx = frog.x - Math.cos(frog.angle) * recoilDist;
      const ry = frog.y - Math.sin(frog.angle) * recoilDist;
      ctx.translate(rx, ry);
      ctx.rotate(frog.angle);

      // Frog Body
      ctx.fillStyle = '#065F46';
      ctx.beginPath();
      ctx.ellipse(0, 0, frog.radius, frog.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath(); ctx.arc(-14, -22, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -22, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-14, -22, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -22, 4, 0, Math.PI * 2); ctx.fill();

      // Next ball on frog back
      const nextDef = COLORS[frog.nextColor] || COLORS[0];
      ctx.fillStyle = nextDef.hex;
      ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1; ctx.stroke();

      // Current ball in frog mouth
      const curDef = COLORS[frog.currentColor] || COLORS[0];
      const curGrad = ctx.createRadialGradient(20, -3, 2, 22, 0, 11);
      curGrad.addColorStop(0, '#FFFFFF');
      curGrad.addColorStop(0.3, curDef.hex);
      curGrad.addColorStop(1, curDef.dark);
      ctx.fillStyle = curGrad;
      ctx.beginPath(); ctx.arc(22, 0, 11, 0, Math.PI * 2); ctx.fill();

      ctx.restore();

      // Particles and Popups
      if (particles) particles.updateAndDraw(ctx);
      if (popups) popups.updateAndDraw(ctx);
    }

    animId = requestAnimationFrame(loop);

    window.__currentZumaCleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') window.NP_Audio.stopBGM();
    };
  }

  // =========================================================================
  // 2. DINER DASH (PHỤC VỤ BÀN - PLAYFIRST FLO'S DINER 2004)
  // =========================================================================
  function launchDinerDash(container, game) {
    let score = 0;
    let stage = 1;
    let targetScore = 600;
    let shiftTime = 120; // in seconds
    let gameState = 'INTRO'; // 'INTRO', 'PLAYING', 'STAGE_CLEAR', 'GAMEOVER'
    let animId = null;
    let lastFrameTime = performance.now();
    let secondTimer = null;

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('diner');
    }

    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

    const tables = [
      { id: 1, x: 190, y: 150, color: '#EF4444', chairName: 'Đỏ', state: 'EMPTY', timer: 0, hearts: 5, guestColor: null, orderFood: null },
      { id: 2, x: 450, y: 150, color: '#3B82F6', chairName: 'Xanh', state: 'EMPTY', timer: 0, hearts: 5, guestColor: null, orderFood: null },
      { id: 3, x: 190, y: 320, color: '#10B981', chairName: 'Lá', state: 'EMPTY', timer: 0, hearts: 5, guestColor: null, orderFood: null },
      { id: 4, x: 450, y: 320, color: '#F59E0B', chairName: 'Vàng', state: 'EMPTY', timer: 0, hearts: 5, guestColor: null, orderFood: null }
    ];

    const hostStation = { x: 70, y: 220 };
    const kitchenCounter = { x: 320, y: 80 };
    const dishBusBin = { x: 570, y: 230 };
    const coffeeMachine = { x: 70, y: 380 };

    let waitingQueue = [];
    let queueSpawnTimer = 0;
    let kitchenOrders = [];
    let readyFoodPlates = [];

    const flo = {
      x: 320,
      y: 240,
      targetX: 320,
      targetY: 240,
      speed: 4.8,
      hands: [],
      coffeeBoostTimer: 0
    };

    function spawnCustomerGroup() {
      if (waitingQueue.length >= 4) return;
      const GUEST_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B'];
      const color = GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
      waitingQueue.push({
        id: Date.now() + Math.random(),
        color: color,
        hearts: 5,
        patienceTimer: 0
      });
      if (window.NP_Audio) window.NP_Audio.pop();
    }

    function initShift(stg) {
      stage = stg;
      targetScore = 600 + (stg - 1) * 450;
      shiftTime = 120;
      waitingQueue = [];
      kitchenOrders = [];
      readyFoodPlates = [];
      flo.hands = [];
      flo.coffeeBoostTimer = 0;
      tables.forEach(t => {
        t.state = 'EMPTY';
        t.timer = 0;
        t.hearts = 5;
        t.guestColor = null;
        t.orderFood = null;
      });

      spawnCustomerGroup();
      spawnCustomerGroup();
      updateHandsHUD();
      updateHUD();
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="font-family: ${FONT_BASE};">
        <div class="canvas-game-hud">
          <div class="hud-pill">Cà phê Flo: <span id="ddShift">Ca 1</span>/3</div>
          <div class="hud-pill">Tiền tip: <span id="ddScore" style="color: #10B981; font-weight: 900;">$0</span> / $<span id="ddTarget">600</span></div>
          <div class="hud-pill">Thời gian: <span id="ddTimer" style="color: #F59E0B; font-weight: 900;">120s</span></div>
          <div class="hud-pill">Tay Flo: <span id="ddHands" style="color: #60A5FA; font-weight: 700;">(Trống)</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="ddCanvas" width="640" height="460" class="canvas-main-viewport" style="background: #FFFBEB; cursor: pointer; border-radius: 8px;"></canvas>

          <!-- 1. INTRO OVERLAY -->
          <div class="game-stage-overlay" id="ddIntroOverlay">
            <div class="intro-modal-card">
              <div class="intro-hero-wrapper">
                <img src="assets/diner_intro.jpg" alt="Diner Dash" class="intro-hero-img">
                <div class="intro-hero-overlay">
                  <span class="intro-badge">PlayFirst 2004</span>
                  <h3 class="intro-title">Diner Dash - Tiệm Ăn Của Flo</h3>
                </div>
              </div>
              <div class="intro-content">
                <p class="intro-desc">Chào mừng bạn đến với nhà hàng phong cách retro của Flo! Hãy phục vụ thực khách nhanh nhẹn, khéo léo xếp trùng màu ghế để nhận thêm tiền tip kỷ lục và hoàn thành ca làm việc!</p>
                <div class="intro-controls-box">
                  <div class="intro-control-row">
                    <span class="intro-key">1. Xếp Bàn</span>
                    <span>Bấm khách ở cửa -> Bấm bàn trống (Trùng màu ghế = +$100 TIP!)</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">2. Lấy Order</span>
                    <span>Khách nghĩ xong hiện [!] -> Bấm lấy order đưa ra bếp nấu</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">3. Bưng Món</span>
                    <span>Bếp nấu xong kêu DING! -> Bấm nhận đĩa mang ra cho khách</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">4. Dọn Đĩa</span>
                    <span>Khách ăn xong hiện [$] -> Nhấp tính tiền & bưng đĩa bẩn về bồn rửa</span>
                  </div>
                </div>
                <div class="intro-actions">
                  <button class="btn-intro-start" id="ddStartGameBtn">Bắt đầu ca làm việc (Ca 1)</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. STAGE CLEAR OVERLAY -->
          <div class="game-stage-overlay" id="ddClearOverlay" style="display: none;">
            <div class="intro-modal-card stage-clear-card">
              <div class="stage-clear-stars">⭐⭐⭐</div>
              <h3 class="intro-title" style="color: #10B981; font-size: 1.5rem;">HOÀN THÀNH CA LÀM XUẤT SẮC!</h3>
              <p class="intro-desc">Flo đã phục vụ chu đáo tất cả thực khách và kiếm đủ tiền tip mục tiêu!</p>
              <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 8px; margin: 12px 0;">
                <div style="font-size: 1.15rem; color: #10B981; font-weight: 900;">Tổng tiền tip kiếm được: $<span id="ddClearScore">0</span></div>
                <div style="font-size: 0.9rem; color: #9CA3AF; margin-top: 4px;" id="ddNextShiftTip">Chuẩn bị bước sang Ca tiếp theo với lượng khách đông hơn!</div>
              </div>
              <div class="intro-actions">
                <button class="btn-intro-start" id="ddNextShiftBtn">➔ BẮT ĐẦU CA KẾ TIẾP</button>
              </div>
            </div>
          </div>

          <!-- 3. GAMEOVER OVERLAY -->
          <div class="game-stage-overlay" id="ddGameOverOverlay" style="display: none;">
            <div class="intro-modal-card stage-clear-card">
              <div style="font-size: 2.5rem; margin-bottom: 6px;">⏱️</div>
              <h3 class="intro-title" style="color: #EF4444; font-size: 1.5rem;">HẾT GIỜ LÀM VIỆC!</h3>
              <p class="intro-desc">Bạn chưa đạt chỉ tiêu tiền tip trong ca này. Hãy thử lại để đạt kết quả tốt hơn!</p>
              <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin: 12px 0;">
                <div style="font-size: 1.1rem; color: #F3F4F6; font-weight: 800;">Tiền tip đạt được: $<span id="ddFinalScore">0</span></div>
              </div>
              <div class="intro-actions">
                <button class="btn-intro-start" id="ddRetryBtn" style="background: linear-gradient(135deg, #EF4444, #B91C1C); color: #FFF;">Thử lại ca này</button>
              </div>
            </div>
          </div>
        </div>

        <div class="canvas-controls-bar">
          <small style="color: #E2E8F0;">Nhấp khách ở cửa để xếp bàn (Xếp trùng màu ghế nhận thêm +100 tip) • Lấy order • Đưa bếp nấu • Bưng món • Dọn dẹp đĩa!</small>
          <button class="btn-canvas-action" id="ddCoffeeBtn" style="background: #92400E; color: #FFF; font-weight: 700;">Uống cà phê (Tăng tốc)</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#ddCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = container.querySelector('#ddScore');
    const targetEl = container.querySelector('#ddTarget');
    const timerEl = container.querySelector('#ddTimer');
    const shiftEl = container.querySelector('#ddShift');
    const handsEl = container.querySelector('#ddHands');
    const coffeeBtn = container.querySelector('#ddCoffeeBtn');

    const introOverlay = container.querySelector('#ddIntroOverlay');
    const startBtn = container.querySelector('#ddStartGameBtn');
    const clearOverlay = container.querySelector('#ddClearOverlay');
    const nextShiftBtn = container.querySelector('#ddNextShiftBtn');
    const gameOverOverlay = container.querySelector('#ddGameOverOverlay');
    const retryBtn = container.querySelector('#ddRetryBtn');
    const clearScoreEl = container.querySelector('#ddClearScore');
    const nextShiftTipEl = container.querySelector('#ddNextShiftTip');
    const finalScoreEl = container.querySelector('#ddFinalScore');

    function updateHUD() {
      if (scoreEl) scoreEl.textContent = `$${score}`;
      if (targetEl) targetEl.textContent = `${targetScore}`;
      if (timerEl) timerEl.textContent = `${shiftTime}s`;
      if (shiftEl) shiftEl.textContent = `Ca ${stage}`;
    }

    function updateHandsHUD() {
      if (!handsEl) return;
      if (flo.hands.length === 0) handsEl.textContent = '(Trống)';
      else {
        handsEl.textContent = flo.hands.map(h => {
          if (h.type === 'ORDER') return `📝 Bàn ${h.tableId}`;
          if (h.type === 'FOOD') return `🍔 Bàn ${h.tableId}`;
          if (h.type === 'DISHES') return `🍽️ Bàn ${h.tableId}`;
          return '';
        }).join(' + ');
      }
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        introOverlay.style.display = 'none';
        gameState = 'PLAYING';
        initShift(1);
      });
    }

    if (nextShiftBtn) {
      nextShiftBtn.addEventListener('click', () => {
        clearOverlay.style.display = 'none';
        stage = Math.min(3, stage + 1);
        gameState = 'PLAYING';
        initShift(stage);
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        gameOverOverlay.style.display = 'none';
        score = 0;
        stage = 1;
        gameState = 'PLAYING';
        initShift(1);
      });
    }

    if (coffeeBtn) {
      coffeeBtn.addEventListener('click', () => {
        flo.coffeeBoostTimer = 180;
        if (window.NP_Audio) window.NP_Audio.powerup();
        if (popups) popups.spawn(flo.x, flo.y - 30, '⚡ CÀ PHÊ TĂNG TỐC! ⚡', '#F59E0B', 20);
      });
    }

    // Second interval for shift countdown
    secondTimer = setInterval(() => {
      if (gameState !== 'PLAYING') return;
      shiftTime--;
      if (timerEl) timerEl.textContent = `${shiftTime}s`;

      if (shiftTime <= 0) {
        if (score >= targetScore) {
          gameState = 'STAGE_CLEAR';
          if (clearScoreEl) clearScoreEl.textContent = `${score}`;
          if (nextShiftTipEl) {
            nextShiftTipEl.textContent = stage < 3 ?
              `Chuẩn bị bước sang Ca ${stage + 1} với giờ cao điểm đông đúc!` :
              `Chúc mừng bạn đã hoàn thành xuất sắc tất cả ca làm việc tại Flo's Diner!`;
          }
          if (clearOverlay) clearOverlay.style.display = 'flex';
          if (window.NP_Audio) window.NP_Audio.win();
        } else {
          gameState = 'GAMEOVER';
          if (finalScoreEl) finalScoreEl.textContent = `${score}`;
          if (gameOverOverlay) gameOverOverlay.style.display = 'flex';
          if (window.NP_Audio) window.NP_Audio.alarm();
        }
      }
    }, 1000);

    let selectedQueueGuest = null;

    function handleDinerClick(clientX, clientY) {
      if (gameState !== 'PLAYING') return;
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left) * (canvas.width / rect.width);
      const my = (clientY - rect.top) * (canvas.height / rect.height);

      // 1. Click Waiting Host Podium
      if (Math.hypot(mx - hostStation.x, my - hostStation.y) < 65) {
        if (waitingQueue.length > 0) {
          selectedQueueGuest = waitingQueue[0];
          if (window.NP_Audio) window.NP_Audio.pop();
          if (popups) popups.spawn(hostStation.x, hostStation.y - 20, 'Đã chọn khách! Bấm bàn trống', '#3B82F6', 16);
        }
        return;
      }

      // 2. Click Coffee Machine
      if (Math.hypot(mx - coffeeMachine.x, my - coffeeMachine.y) < 45) {
        flo.targetX = coffeeMachine.x;
        flo.targetY = coffeeMachine.y;
        flo.coffeeBoostTimer = 220;
        if (window.NP_Audio) window.NP_Audio.powerup();
        return;
      }

      // 3. Click Kitchen Counter
      if (Math.hypot(mx - kitchenCounter.x, my - kitchenCounter.y) < 70) {
        flo.targetX = kitchenCounter.x;
        flo.targetY = kitchenCounter.y + 45;

        const orderIdx = flo.hands.findIndex(h => h.type === 'ORDER');
        if (orderIdx !== -1) {
          const ord = flo.hands.splice(orderIdx, 1)[0];
          kitchenOrders.push({ tableId: ord.tableId, cookTime: 140 });
          if (window.NP_Audio) window.NP_Audio.sizzle();
          if (window.NP_Juice) window.NP_Juice.vibrate(10);
          if (popups) popups.spawn(kitchenCounter.x, kitchenCounter.y - 20, '🔥 Đang nấu món!', '#F59E0B', 16);
          updateHandsHUD();
        }

        if (readyFoodPlates.length > 0 && flo.hands.length < 2) {
          const food = readyFoodPlates.shift();
          flo.hands.push({ type: 'FOOD', tableId: food.tableId });
          if (window.NP_Audio) window.NP_Audio.dinerBell();
          if (window.NP_Juice) window.NP_Juice.vibrate(10);
          if (popups) popups.spawn(flo.x, flo.y - 20, '🍔 Đã lấy đĩa thức ăn!', '#10B981', 16);
          updateHandsHUD();
        }
        return;
      }

      // 4. Click Dish Bus Bin
      if (Math.hypot(mx - dishBusBin.x, my - dishBusBin.y) < 55) {
        flo.targetX = dishBusBin.x - 40;
        flo.targetY = dishBusBin.y;

        const dishIndices = [];
        flo.hands.forEach((h, idx) => { if (h.type === 'DISHES') dishIndices.push(idx); });

        if (dishIndices.length > 0) {
          const dishCount = dishIndices.length;
          flo.hands = flo.hands.filter(h => h.type !== 'DISHES');
          score += dishCount * 40;
          updateHUD();
          updateHandsHUD();
          if (window.NP_Audio) window.NP_Audio.dishClatter();
          if (window.NP_Juice) window.NP_Juice.vibrate(16);
          if (popups) popups.spawn(dishBusBin.x, dishBusBin.y - 20, `+${dishCount * 40} Dọn bàn!`, '#10B981', 18);
        }
        return;
      }

      // 5. Click Tables (Comfortable 60px tap radius)
      for (const tbl of tables) {
        if (Math.hypot(mx - tbl.x, my - tbl.y) < 60) {
          flo.targetX = tbl.x;
          flo.targetY = tbl.y + 35;

          // Seat guest
          if (tbl.state === 'EMPTY') {
            if (selectedQueueGuest) {
              const guest = waitingQueue.shift();
              selectedQueueGuest = null;
              tbl.state = 'SEATED_THINKING';
              tbl.timer = 120;
              tbl.hearts = guest.hearts;
              tbl.guestColor = guest.color;

              let matchBonus = 0;
              if (tbl.guestColor === tbl.color) {
                matchBonus = 100;
                score += matchBonus;
                updateHUD();
                if (window.NP_Audio) window.NP_Audio.coin();
                if (window.NP_Juice) window.NP_Juice.vibrate(14);
                if (popups) popups.spawn(tbl.x, tbl.y - 40, '⭐ MATCH MÀU GHẾ +$100! ⭐', '#F59E0B', 20);
              } else {
                if (window.NP_Audio) window.NP_Audio.pop();
                if (window.NP_Juice) window.NP_Juice.vibrate(8);
              }
            }
            return;
          }

          // Take order
          if (tbl.state === 'READY_TO_ORDER' && flo.hands.length < 2) {
            flo.hands.push({ type: 'ORDER', tableId: tbl.id });
            tbl.state = 'WAITING_FOOD';
            tbl.timer = 240;
            updateHandsHUD();
            if (window.NP_Audio) window.NP_Audio.pencil();
            if (window.NP_Juice) window.NP_Juice.vibrate(10);
            if (popups) popups.spawn(tbl.x, tbl.y - 30, '📝 Lấy order!', '#3B82F6', 16);
            return;
          }

          // Serve food
          if (tbl.state === 'WAITING_FOOD') {
            const foodIdx = flo.hands.findIndex(h => h.type === 'FOOD' && h.tableId === tbl.id);
            if (foodIdx !== -1) {
              flo.hands.splice(foodIdx, 1);
              tbl.state = 'EATING';
              tbl.timer = 160;
              tbl.hearts = Math.min(5, tbl.hearts + 2);
              score += 80;
              updateHUD();
              updateHandsHUD();
              if (window.NP_Audio) window.NP_Audio.dinerBell();
              if (window.NP_Juice) window.NP_Juice.vibrate(14);
              if (popups) popups.spawn(tbl.x, tbl.y - 30, '🍔 Phục vụ ngon lành! +$80', '#10B981', 18);
              return;
            }
          }

          // Clear bill & dishes
          if (tbl.state === 'READY_TO_PAY') {
            const tip = tbl.hearts * 30;
            score += tip;
            tbl.state = 'DIRTY_DISHES';
            updateHUD();
            if (window.NP_Audio) window.NP_Audio.coin();
            if (window.NP_Juice) window.NP_Juice.vibrate([12, 25]);
            if (popups) popups.spawn(tbl.x, tbl.y - 30, `💰 Tiền tip +$${tip}!`, '#F59E0B', 20);
            return;
          }

          // Bus dirty dishes
          if (tbl.state === 'DIRTY_DISHES' && flo.hands.length < 2) {
            flo.hands.push({ type: 'DISHES', tableId: tbl.id });
            tbl.state = 'EMPTY';
            tbl.guestColor = null;
            updateHandsHUD();
            if (window.NP_Audio) window.NP_Audio.dishClatter();
            if (window.NP_Juice) window.NP_Juice.vibrate(12);
            if (popups) popups.spawn(tbl.x, tbl.y - 30, '🍽️ Bưng đĩa bẩn!', '#6B7280', 16);
            return;
          }
        }
      }
    }

    canvas.addEventListener('click', (e) => handleDinerClick(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        handleDinerClick(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    // Main Game Loop with 60 FPS Fixed Delta-Time
    function loop(now) {
      animId = requestAnimationFrame(loop);
      if (!lastFrameTime) lastFrameTime = now;
      let dtMs = now - lastFrameTime;
      if (dtMs > 100) dtMs = 100;
      lastFrameTime = now;
      const dtRatio = dtMs / 16.67;

      if (gameState === 'PLAYING') {
        // Move Flo smoothly
        const fdx = flo.targetX - flo.x;
        const fdy = flo.targetY - flo.y;
        const dist = Math.hypot(fdx, fdy);
        const curSpeed = (flo.coffeeBoostTimer > 0 ? flo.speed * 1.8 : flo.speed) * dtRatio;
        if (flo.coffeeBoostTimer > 0) flo.coffeeBoostTimer -= dtRatio;

        if (dist > 4) {
          flo.x += (fdx / dist) * Math.min(dist, curSpeed);
          flo.y += (fdy / dist) * Math.min(dist, curSpeed);
        }

        // Spawn Customers periodically
        queueSpawnTimer += dtRatio;
        if (queueSpawnTimer > 420 && waitingQueue.length < 4) {
          queueSpawnTimer = 0;
          spawnCustomerGroup();
        }

        // Waiting Queue patience decay
        for (let i = waitingQueue.length - 1; i >= 0; i--) {
          waitingQueue[i].patienceTimer += dtRatio;
          if (waitingQueue[i].patienceTimer > 240) {
            waitingQueue[i].patienceTimer = 0;
            waitingQueue[i].hearts--;
            if (waitingQueue[i].hearts <= 0) {
              waitingQueue.splice(i, 1);
              score = Math.max(0, score - 80);
              updateHUD();
              if (window.NP_Audio) window.NP_Audio.alarm();
              if (popups) popups.spawn(hostStation.x, hostStation.y, 'Khách bỏ về tức giận! -$80', '#EF4444', 18);
            }
          }
        }

        // Update Kitchen Orders cooking
        for (let i = kitchenOrders.length - 1; i >= 0; i--) {
          kitchenOrders[i].cookTime -= dtRatio;
          if (kitchenOrders[i].cookTime <= 0) {
            const ready = kitchenOrders.splice(i, 1)[0];
            readyFoodPlates.push(ready);
            if (window.NP_Audio) window.NP_Audio.dinerBell();
            if (popups) popups.spawn(kitchenCounter.x, kitchenCounter.y - 10, '🔔 XONG MÓN! DING!', '#F59E0B', 18);
          }
        }

        // Update Table States
        for (const tbl of tables) {
          if (tbl.state === 'SEATED_THINKING') {
            tbl.timer -= dtRatio;
            if (tbl.timer <= 0) {
              tbl.state = 'READY_TO_ORDER';
              if (window.NP_Audio) window.NP_Audio.pop();
            }
          } else if (tbl.state === 'WAITING_FOOD') {
            tbl.timer -= dtRatio;
            if (tbl.timer <= 0 && tbl.hearts > 1) {
              tbl.hearts--;
              tbl.timer = 180;
            }
          } else if (tbl.state === 'EATING') {
            tbl.timer -= dtRatio;
            if (tbl.timer <= 0) {
              tbl.state = 'READY_TO_PAY';
              if (window.NP_Audio) window.NP_Audio.coin();
            }
          }
        }
      }

      // --- RENDERING ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Floor Tiles (Checkerboard Retro Diner)
      const tileSize = 32;
      for (let y = 0; y < canvas.height; y += tileSize) {
        for (let x = 0; x < canvas.width; x += tileSize) {
          const isCheck = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
          ctx.fillStyle = isCheck ? '#FEF3C7' : '#FDE68A';
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }

      // 1. Kitchen Counter at Top
      ctx.fillStyle = '#78350F';
      ctx.fillRect(180, 20, 280, 50);
      ctx.strokeStyle = '#92400E'; ctx.lineWidth = 3;
      ctx.strokeRect(180, 20, 280, 50);
      ctx.fillStyle = '#FFF';
      ctx.font = `bold 14px ${FONT_BASE}`;
      ctx.textAlign = 'center';
      ctx.fillText('👨‍🍳 BẾP NẤU (KITCHEN PASS)', 320, 42);

      readyFoodPlates.forEach((fp, idx) => {
        ctx.fillStyle = '#EF4444';
        ctx.beginPath(); ctx.arc(220 + idx * 45, 55, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = `bold 10px ${FONT_BASE}`;
        ctx.fillText(`B${fp.tableId}`, 220 + idx * 45, 59);
      });

      // 2. Doorway & Host Queue at Left
      ctx.fillStyle = '#78350F';
      ctx.fillRect(20, 160, 70, 100);
      ctx.fillStyle = '#FEF08A';
      ctx.font = `bold 12px ${FONT_BASE}`;
      ctx.fillText('🚪 CỬA VÀO', 55, 180);

      waitingQueue.forEach((g, idx) => {
        const qy = 210 + idx * 24;
        ctx.fillStyle = g.color;
        ctx.beginPath(); ctx.arc(55, qy, 8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#EF4444';
        ctx.font = '8px sans-serif';
        ctx.fillText('❤️'.repeat(g.hearts), 55, qy - 9);
      });

      // 3. Coffee Machine
      ctx.fillStyle = '#451A03';
      ctx.fillRect(30, 340, 60, 70);
      ctx.fillStyle = '#FDE68A';
      ctx.font = `bold 11px ${FONT_BASE}`;
      ctx.fillText('☕ CÀ PHÊ', 60, 380);

      // 4. Dirty Dish Bus Bin at Right
      ctx.fillStyle = '#334155';
      ctx.fillRect(550, 190, 70, 80);
      ctx.fillStyle = '#94A3B8';
      ctx.font = `bold 11px ${FONT_BASE}`;
      ctx.fillText('🍽️ BỒN ĐĨA', 585, 235);

      // 5. Dining Tables & Booth Chairs
      tables.forEach(tbl => {
        // Chair backings
        ctx.fillStyle = tbl.color;
        ctx.beginPath(); ctx.roundRect(tbl.x - 45, tbl.y - 28, 90, 14, 4); ctx.fill();
        ctx.beginPath(); ctx.roundRect(tbl.x - 45, tbl.y + 14, 90, 14, 4); ctx.fill();

        // Table Top
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath(); ctx.roundRect(tbl.x - 36, tbl.y - 20, 72, 40, 6); ctx.fill();
        ctx.strokeStyle = '#D97706'; ctx.lineWidth = 2; ctx.stroke();

        ctx.fillStyle = '#78350F';
        ctx.font = `bold 12px ${FONT_BASE}`;
        ctx.fillText(`Bàn ${tbl.id}`, tbl.x, tbl.y + 4);

        if (tbl.state !== 'EMPTY' && tbl.guestColor) {
          ctx.fillStyle = tbl.guestColor;
          ctx.beginPath(); ctx.arc(tbl.x, tbl.y - 12, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.font = '8px sans-serif';
          ctx.fillText('❤️'.repeat(tbl.hearts), tbl.x, tbl.y - 26);
        }

        // Status bubble
        if (tbl.state === 'SEATED_THINKING') {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(tbl.x + 26, tbl.y - 18, 11, 0, Math.PI * 2); ctx.fill();
          ctx.fillText('📖', tbl.x + 26, tbl.y - 14);
        } else if (tbl.state === 'READY_TO_ORDER') {
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath(); ctx.arc(tbl.x + 26, tbl.y - 18, 11, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#B45309';
          ctx.fillText('!', tbl.x + 26, tbl.y - 14);
        } else if (tbl.state === 'EATING') {
          ctx.fillText('🍔', tbl.x + 26, tbl.y - 14);
        } else if (tbl.state === 'READY_TO_PAY') {
          ctx.fillText('💰', tbl.x + 26, tbl.y - 14);
        } else if (tbl.state === 'DIRTY_DISHES') {
          ctx.fillText('🍽️', tbl.x, tbl.y + 4);
        }
      });

      // 6. Draw Flo Waitress
      ctx.save();
      ctx.translate(flo.x, flo.y);
      if (flo.coffeeBoostTimer > 0) {
        ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = '#92400E';
      ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#DC2626';
      ctx.beginPath(); ctx.roundRect(-10, -2, 20, 26, 4); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(-7, 4, 14, 14, 2); ctx.fill();
      ctx.restore();

      if (particles) particles.updateAndDraw(ctx);
      if (popups) popups.updateAndDraw(ctx);
    }

    animId = requestAnimationFrame(loop);

    window.__currentDinerCleanup = () => {
      cancelAnimationFrame(animId);
      clearInterval(secondTimer);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') window.NP_Audio.stopBGM();
    };
  }

  // =========================================================================
  // 3. CỜ TƯỚNG TÀN CUỘC (XIANGQI ENDGAME TACTICS)
  // =========================================================================
  function launchCoTuong(container, game) {
    let currentPuzzleIdx = 0;
    let selectedCell = null;
    let validMoves = [];
    let isPlayerTurn = true;
    let moveHistory = [];
    let puzzleSolved = false;

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('cotuong');
    }

    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;

    const PUZZLES = [
      {
        id: 1,
        title: 'Thế 1: Mã Điếu Ngư (Điếu Ngư Mã Chiếu Bí)',
        desc: 'Mã đỏ khống chế góc cửu cung, Xe đỏ thọc đáy phối hợp chiếu bí!',
        hint: 'Nước 1: Xe đỏ thọc chiếu đáy ép Tướng đen lên -> Nước 2: Mã đỏ phi góc chiếu bí!',
        board: [
          { r: 0, c: 4, type: 'k', side: 'black' },
          { r: 0, c: 3, type: 'a', side: 'black' },
          { r: 0, c: 5, type: 'a', side: 'black' },
          { r: 9, c: 4, type: 'K', side: 'red' },
          { r: 9, c: 3, type: 'A', side: 'red' },
          { r: 9, c: 5, type: 'A', side: 'red' },
          { r: 6, c: 4, type: 'N', side: 'red' },
          { r: 8, c: 1, type: 'R', side: 'red' }
        ],
        solution: [
          { from: { r: 8, c: 1 }, to: { r: 0, c: 1 } },
          { from: { r: 0, c: 1 }, to: { r: 0, c: 4 } }
        ]
      },
      {
        id: 2,
        title: 'Thế 2: Pháo Đầu Mã Đội',
        desc: 'Pháo trấn trung lộ, Mã đỏ xông pha bẻ gãy phòng tuyến Cửu Cung.',
        hint: 'Chiếu pháo ép Sĩ lên, sau đó dùng Mã khóa chân Tướng!',
        board: [
          { r: 0, c: 4, type: 'k', side: 'black' },
          { r: 0, c: 3, type: 'a', side: 'black' },
          { r: 0, c: 5, type: 'a', side: 'black' },
          { r: 9, c: 4, type: 'K', side: 'red' },
          { r: 2, c: 4, type: 'C', side: 'red' },
          { r: 5, c: 4, type: 'N', side: 'red' }
        ],
        solution: [
          { from: { r: 5, c: 4 }, to: { r: 3, c: 3 } }
        ]
      },
      {
        id: 3,
        title: 'Thế 3: Đơn Xa Phá Song Sĩ',
        desc: 'Xe đỏ đơn thương độc mã vận dụng nguyên lý kẹt cung phá tan đôi Sĩ.',
        hint: 'Dùng Xe ép Tướng lệch cung, cắt đứt đường phòng thủ của Sĩ!',
        board: [
          { r: 0, c: 4, type: 'k', side: 'black' },
          { r: 1, c: 4, type: 'a', side: 'black' },
          { r: 2, c: 5, type: 'a', side: 'black' },
          { r: 9, c: 4, type: 'K', side: 'red' },
          { r: 4, c: 4, type: 'R', side: 'red' }
        ],
        solution: [
          { from: { r: 4, c: 4 }, to: { r: 1, c: 4 } }
        ]
      },
      {
        id: 4,
        title: 'Thế 4: Thiết Môn Thuyên (Bát Diện Mai Phục)',
        desc: 'Pháo khống chế cửa cung, Xe đỏ thọc thẳng chiếu bí nghẹt thở.',
        hint: 'Xe tấn thẳng đáy chiếu rút hiểm hóc!',
        board: [
          { r: 0, c: 4, type: 'k', side: 'black' },
          { r: 0, c: 3, type: 'a', side: 'black' },
          { r: 0, c: 5, type: 'a', side: 'black' },
          { r: 9, c: 4, type: 'K', side: 'red' },
          { r: 1, c: 4, type: 'C', side: 'red' },
          { r: 7, c: 1, type: 'R', side: 'red' }
        ],
        solution: [
          { from: { r: 7, c: 1 }, to: { r: 0, c: 1 } }
        ]
      },
      {
        id: 5,
        title: 'Thế 5: Song Pháo Trùng Chiếu Bí',
        desc: 'Hai pháo giăng hàng thẳng tắp, pháo trước ngòi pháo sau chiếu bí.',
        hint: 'Tấn pháo trước chiếu, pháo sau tiếp ứng không thể cản phá!',
        board: [
          { r: 0, c: 4, type: 'k', side: 'black' },
          { r: 0, c: 3, type: 'a', side: 'black' },
          { r: 0, c: 5, type: 'a', side: 'black' },
          { r: 9, c: 4, type: 'K', side: 'red' },
          { r: 2, c: 4, type: 'C', side: 'red' },
          { r: 3, c: 4, type: 'C', side: 'red' }
        ],
        solution: [
          { from: { r: 2, c: 4 }, to: { r: 0, c: 4 } }
        ]
      }
    ];

    const PIECE_NAMES = {
      'K': '帥', 'A': '仕', 'E': '相', 'R': '俥', 'N': '傌', 'C': '炮', 'P': '兵',
      'k': '將', 'a': '士', 'e': '象', 'r': '車', 'n': '馬', 'c': '砲', 'p': '卒'
    };

    let boardState = Array(10).fill(null).map(() => Array(9).fill(null));

    function loadPuzzle(idx) {
      currentPuzzleIdx = idx;
      selectedCell = null;
      validMoves = [];
      isPlayerTurn = true;
      moveHistory = [];
      puzzleSolved = false;
      solutionStep = 0;
      lastMove = null;

      boardState = Array(10).fill(null).map(() => Array(9).fill(null));
      const p = PUZZLES[idx];
      p.board.forEach(item => {
        boardState[item.r][item.c] = {
          type: item.type,
          side: item.side,
          name: PIECE_NAMES[item.type]
        };
      });

      renderBoard();
      const statusEl = container.querySelector('#ctStatus');
      const descEl = container.querySelector('#ctDesc');
      if (statusEl) statusEl.textContent = 'Đang giải thế';
      if (descEl) descEl.textContent = p.desc;
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="font-family: ${FONT_BASE};">
        <div class="canvas-game-hud">
          <div class="hud-pill">Cờ tướng: <span id="ctTitle" style="color: #F59E0B; font-weight: 900;">Thế 1</span></div>
          <div class="hud-pill">Lượt: <span style="color: #EF4444; font-weight: 900;">QUÂN ĐỎ ĐI</span></div>
          <div class="hud-pill">Trạng thái: <span id="ctStatus" style="color: #10B981; font-weight: 700;">Đang giải thế</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="ctCanvas" width="560" height="620" class="canvas-main-viewport" style="background: #D97706; cursor: pointer; border-radius: 8px;"></canvas>

          <!-- 1. INTRO OVERLAY -->
          <div class="game-stage-overlay" id="ctIntroOverlay">
            <div class="intro-modal-card">
              <div class="intro-hero-wrapper">
                <img src="assets/cotuong_intro.jpg" alt="Cờ Tướng Tàn Cuộc" class="intro-hero-img">
                <div class="intro-hero-overlay">
                  <span class="intro-badge">Chiến Thuật Cổ Điển</span>
                  <h3 class="intro-title">Cờ Tướng Tàn Cuộc - Đỉnh Cao Chiến Thuật</h3>
                </div>
              </div>
              <div class="intro-content">
                <p class="intro-desc">Nghệ thuật tàn cuộc cờ tướng phương Đông. Giải mã 5 thế cờ sát pháp kinh điển: Mã Điếu Ngư, Pháo Đầu Mã Đội, Đơn Xa Phá Song Sĩ, Thiết Môn Thuyên, Song Pháo Trùng!</p>
                <div class="intro-controls-box">
                  <div class="intro-control-row">
                    <span class="intro-key">Nhấp Quân Đỏ</span>
                    <span>Hiện chấm xanh hiển thị các nước đi hợp lệ</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Nhấp Ô Đích</span>
                    <span>Di chuyển quân cờ và nghe tiếng CỐP vang dội bàn gỗ</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Nút Gợi Ý</span>
                    <span>Nhận chỉ điểm nước đi cốt lõi của danh thủ</span>
                  </div>
                </div>
                <div class="intro-actions">
                  <button class="btn-intro-start" id="ctStartGameBtn">Bước vào kỳ đài</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. PUZZLE CLEAR OVERLAY -->
          <div class="game-stage-overlay" id="ctClearOverlay" style="display: none;">
            <div class="intro-modal-card stage-clear-card">
              <div class="stage-clear-stars">🏆</div>
              <h3 class="intro-title" style="color: #10B981; font-size: 1.5rem;">CHIẾU BÍ THÀNH CÔNG!</h3>
              <p class="intro-desc">Bạn đã giải mã xuất sắc thế cờ sát pháp danh tiếng!</p>
              <div class="intro-actions" style="margin-top: 14px;">
                <button class="btn-intro-start" id="ctNextPuzzleBtn">➔ SANG THẾ CỜ TIẾP THEO</button>
              </div>
            </div>
          </div>
        </div>

        <div class="canvas-controls-bar" style="flex-wrap: wrap;">
          <select id="ctPuzzleSelect" style="padding: 6px 12px; font-weight: 800; border-radius: 6px; background: #78350F; color: #FFF; border: 1px solid #F59E0B; font-family: ${FONT_BASE};">
            ${PUZZLES.map((p, idx) => `<option value="${idx}">${p.title}</option>`).join('')}
          </select>
          <button class="btn-canvas-action" id="ctHintBtn" style="background: #D97706; color: #FFF; font-weight: 700;">Gợi ý</button>
          <button class="btn-canvas-action" id="ctResetBtn">Làm lại</button>
          <div id="ctDesc" style="font-size: 0.85rem; color: #FEF3C7; width: 100%; margin-top: 6px;"></div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#ctCanvas');
    const ctx = canvas.getContext('2d');
    const selectEl = container.querySelector('#ctPuzzleSelect');
    const hintBtn = container.querySelector('#ctHintBtn');
    const resetBtn = container.querySelector('#ctResetBtn');
    const titleEl = container.querySelector('#ctTitle');
    const statusEl = container.querySelector('#ctStatus');

    const introOverlay = container.querySelector('#ctIntroOverlay');
    const startBtn = container.querySelector('#ctStartGameBtn');
    const clearOverlay = container.querySelector('#ctClearOverlay');
    const nextPuzzleBtn = container.querySelector('#ctNextPuzzleBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        introOverlay.style.display = 'none';
        loadPuzzle(0);
      });
    }

    if (nextPuzzleBtn) {
      nextPuzzleBtn.addEventListener('click', () => {
        clearOverlay.style.display = 'none';
        const nextIdx = (currentPuzzleIdx + 1) % PUZZLES.length;
        if (selectEl) selectEl.value = nextIdx;
        loadPuzzle(nextIdx);
      });
    }

    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        loadPuzzle(parseInt(e.target.value));
        if (titleEl) titleEl.textContent = `Thế ${parseInt(e.target.value) + 1}`;
      });
    }

    if (resetBtn) resetBtn.addEventListener('click', () => loadPuzzle(currentPuzzleIdx));
    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        const p = PUZZLES[currentPuzzleIdx];
        if (popups) popups.spawn(canvas.width / 2, canvas.height / 2, p.hint, '#F59E0B', 18);
      });
    }

    const padX = 40;
    const padY = 40;
    const cellW = (canvas.width - padX * 2) / 8;
    const cellH = (canvas.height - padY * 2) / 9;
    let solutionStep = 0;
    let lastMove = null;

    function renderBoard() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Wood Board Surface with warm gradient
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, '#FED7AA');
      bgGrad.addColorStop(1, '#FDBA74');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#9A3412';
      ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

      // Grid Lines
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#7C2D12';

      for (let r = 0; r < 10; r++) {
        ctx.beginPath();
        ctx.moveTo(padX, padY + r * cellH);
        ctx.lineTo(padX + 8 * cellW, padY + r * cellH);
        ctx.stroke();
      }

      for (let c = 0; c < 9; c++) {
        ctx.beginPath();
        ctx.moveTo(padX + c * cellW, padY);
        ctx.lineTo(padX + c * cellW, padY + 4 * cellH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padX + c * cellW, padY + 5 * cellH);
        ctx.lineTo(padX + c * cellW, padY + 9 * cellH);
        ctx.stroke();
      }

      ctx.beginPath(); ctx.moveTo(padX, padY); ctx.lineTo(padX, padY + 9 * cellH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padX + 8 * cellW, padY); ctx.lineTo(padX + 8 * cellW, padY + 9 * cellH); ctx.stroke();

      // Cửu Cung Diagonals
      ctx.beginPath();
      ctx.moveTo(padX + 3 * cellW, padY); ctx.lineTo(padX + 5 * cellW, padY + 2 * cellH);
      ctx.moveTo(padX + 5 * cellW, padY); ctx.lineTo(padX + 3 * cellW, padY + 2 * cellH);
      ctx.moveTo(padX + 3 * cellW, padY + 7 * cellH); ctx.lineTo(padX + 5 * cellW, padY + 9 * cellH);
      ctx.moveTo(padX + 5 * cellW, padY + 7 * cellH); ctx.lineTo(padX + 3 * cellW, padY + 9 * cellH);
      ctx.stroke();

      // Sông Sở Hà - Hán Giới
      ctx.fillStyle = '#7C2D12';
      ctx.font = `bold 16px ${FONT_BASE}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('楚  河  (SỞ HÀ)        漢  界  (HÁN GIỚI)', canvas.width / 2, padY + 4.5 * cellH);

      // Highlight Last Move
      if (lastMove) {
        [lastMove.from, lastMove.to].forEach((pt, i) => {
          if (!pt) return;
          const px = padX + pt.c * cellW;
          const py = padY + pt.r * cellH;
          ctx.save();
          ctx.strokeStyle = i === 1 ? '#EF4444' : '#F59E0B';
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(px, py, 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
      }

      // Valid Move Dots
      validMoves.forEach(m => {
        const cx = padX + m.c * cellW;
        const cy = padY + m.r * cellH;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
      });

      // Render Wooden Chess Pieces
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const piece = boardState[r][c];
          if (piece) {
            const px = padX + c * cellW;
            const py = padY + r * cellH;
            const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
            drawPiece(px, py, piece, isSelected);
          }
        }
      }

      if (popups) popups.updateAndDraw(ctx);
    }

    function drawPiece(x, y, piece, isSelected) {
      const radius = 23;
      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(2, 3, radius, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#FDE68A';
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isSelected ? '#10B981' : (piece.side === 'red' ? '#DC2626' : '#1F2937');
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, radius - 4, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = piece.side === 'red' ? '#DC2626' : '#111827';
      ctx.font = `900 24px ${FONT_BASE}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(piece.name, 0, -1);

      ctx.restore();
    }

    function getValidMovesFor(r, c) {
      const piece = boardState[r][c];
      if (!piece || piece.side !== 'red') return [];
      const moves = [];

      // Xe (Rook)
      if (piece.type === 'R') {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        dirs.forEach(([dr, dc]) => {
          let nr = r + dr;
          let nc = c + dc;
          while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            if (!boardState[nr][nc]) {
              moves.push({ r: nr, c: nc });
            } else {
              if (boardState[nr][nc].side === 'black') moves.push({ r: nr, c: nc });
              break;
            }
            nr += dr;
            nc += dc;
          }
        });
      }

      // Mã (Knight) with Mã Cản rule
      if (piece.type === 'N') {
        const knightJumps = [
          { dr: -2, dc: -1, br: -1, bc: 0 }, { dr: -2, dc: 1, br: -1, bc: 0 },
          { dr: 2, dc: -1, br: 1, bc: 0 }, { dr: 2, dc: 1, br: 1, bc: 0 },
          { dr: -1, dc: -2, br: 0, bc: -1 }, { dr: 1, dc: -2, br: 0, bc: -1 },
          { dr: -1, dc: 2, br: 0, bc: 1 }, { dr: 1, dc: 2, br: 0, bc: 1 }
        ];
        knightJumps.forEach(j => {
          const nr = r + j.dr;
          const nc = c + j.dc;
          const br = r + j.br;
          const bc = c + j.bc;
          if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            if (!boardState[br][bc]) {
              if (!boardState[nr][nc] || boardState[nr][nc].side === 'black') {
                moves.push({ r: nr, c: nc });
              }
            }
          }
        });
      }

      // Pháo (Cannon)
      if (piece.type === 'C') {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        dirs.forEach(([dr, dc]) => {
          let nr = r + dr;
          let nc = c + dc;
          let hasPlatform = false;
          while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            if (!hasPlatform) {
              if (!boardState[nr][nc]) {
                moves.push({ r: nr, c: nc });
              } else {
                hasPlatform = true;
              }
            } else {
              if (boardState[nr][nc]) {
                if (boardState[nr][nc].side === 'black') moves.push({ r: nr, c: nc });
                break;
              }
            }
            nr += dr;
            nc += dc;
          }
        });
      }

      return moves;
    }

    function handleBoardClick(clientX, clientY) {
      if (puzzleSolved) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left) * (canvas.width / rect.width);
      const my = (clientY - rect.top) * (canvas.height / rect.height);

      const c = Math.round((mx - padX) / cellW);
      const r = Math.round((my - padY) / cellH);

      if (r < 0 || r >= 10 || c < 0 || c >= 9) return;

      if (selectedCell) {
        const canMove = validMoves.some(m => m.r === r && m.c === c);
        if (canMove) {
          const fromPt = { r: selectedCell.r, c: selectedCell.c };
          const toPt = { r, c };
          const currentP = PUZZLES[currentPuzzleIdx];
          const expectedMove = currentP.solution && currentP.solution[solutionStep];

          boardState[r][c] = boardState[selectedCell.r][selectedCell.c];
          boardState[selectedCell.r][selectedCell.c] = null;
          lastMove = { from: fromPt, to: toPt };
          selectedCell = null;
          validMoves = [];

          if (window.NP_Audio) window.NP_Audio.woodThud();
          if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 10, 250);

          const isCorrect = expectedMove &&
            expectedMove.from.r === fromPt.r && expectedMove.from.c === fromPt.c &&
            expectedMove.to.r === toPt.r && expectedMove.to.c === toPt.c;

          if (isCorrect) {
            solutionStep++;
            if (solutionStep >= currentP.solution.length) {
              puzzleSolved = true;
              if (statusEl) statusEl.textContent = '⚡ CHIẾU BÍ THÀNH CÔNG!';
              if (popups) popups.spawn(canvas.width / 2, canvas.height / 2, '⚡ CHIẾU BÍ THÀNH CÔNG! ⚡', '#10B981', 26);
              if (clearOverlay) clearOverlay.style.display = 'flex';
              if (window.NP_Audio) window.NP_Audio.win();
            } else {
              if (statusEl) statusEl.textContent = 'Đúng nước! Hãy tung đòn kết liễu!';
              if (popups) popups.spawn(canvas.width / 2, canvas.height / 2, '⚡ NƯỚC ĐI XUẤT SẮC! ⚡', '#F59E0B', 22);
            }
          } else {
            if (statusEl) statusEl.textContent = '⚠️ Chưa đúng nước sát pháp! Nhấn [Làm lại] để thử lại';
            if (popups) popups.spawn(canvas.width / 2, canvas.height / 2, '⚠️ CHƯA ĐÚNG NƯỚC SÁT PHÁP!', '#EF4444', 20);
          }

          renderBoard();
          return;
        }
      }

      if (boardState[r][c] && boardState[r][c].side === 'red') {
        selectedCell = { r, c };
        validMoves = getValidMovesFor(r, c);
        if (window.NP_Audio) window.NP_Audio.pop();
        renderBoard();
      } else {
        selectedCell = null;
        validMoves = [];
        renderBoard();
      }
    }

    canvas.addEventListener('click', (e) => handleBoardClick(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        handleBoardClick(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    loadPuzzle(0);

    window.__currentCoTuongCleanup = () => {
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') window.NP_Audio.stopBGM();
    };
  }

  // =========================================================================
  // 4. BẮN BI VE TUỔI THƠ (VIETNAMESE CHILDHOOD MARBLES)
  // =========================================================================
  function launchBanBiVe(container, game) {
    let score = 0;
    let round = 1;
    let maxRounds = 3;
    let shotsLeft = 8;
    let gameState = 'INTRO'; // 'INTRO', 'PLAYING', 'STAGE_CLEAR', 'GAMEOVER'
    let animId = null;
    let lastFrameTime = performance.now();

    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

    const canvasWidth = 600;
    const canvasHeight = 460;
    const ringCenter = { x: 300, y: 230 };
    const ringRadius = 140;

    let marbles = [];

    const shooter = {
      x: 100,
      y: 370,
      vx: 0,
      vy: 0,
      radius: 14,
      isMoving: false,
      color: '#3B82F6',
      swirl: '#93C5FD'
    };

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragCurrent = { x: 0, y: 0 };

    function initRound(rnd) {
      round = rnd;
      shotsLeft = 7 + rnd;
      shooter.x = 100;
      shooter.y = 370;
      shooter.vx = 0;
      shooter.vy = 0;
      shooter.isMoving = false;

      marbles = [];
      const numMarbles = 6 + rnd * 2;
      for (let i = 0; i < numMarbles; i++) {
        const ang = (i / numMarbles) * Math.PI * 2;
        const dist = 28 + (i % 3) * 36;
        const isBoss = i === 0;
        marbles.push({
          id: i + 1,
          x: ringCenter.x + Math.cos(ang) * dist,
          y: ringCenter.y + Math.sin(ang) * dist,
          vx: 0,
          vy: 0,
          radius: isBoss ? 15 : 12,
          color: isBoss ? '#F59E0B' : (i % 2 === 0 ? '#10B981' : '#EC4899'),
          swirl: isBoss ? '#FEF08A' : '#FFFFFF',
          pts: isBoss ? 500 : 200,
          inRing: true
        });
      }
      updateHUD();
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="font-family: ${FONT_BASE};">
        <div class="canvas-game-hud">
          <div class="hud-pill">Vòng: <span id="bvRound">1</span>/3</div>
          <div class="hud-pill">Điểm: <span id="bvScore" style="color: #10B981; font-weight: 900;">0</span></div>
          <div class="hud-pill">Lượt búng: <span id="bvShots" style="color: #EF4444; font-weight: 900;">8 lượt</span></div>
          <div class="hud-pill">Lực búng: <span id="bvPower" style="color: #F59E0B; font-weight: 700;">0%</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="bvCanvas" width="${canvasWidth}" height="${canvasHeight}" class="canvas-main-viewport" style="background: #78350F; cursor: crosshair; border-radius: 8px;"></canvas>

          <!-- 1. INTRO OVERLAY -->
          <div class="game-stage-overlay" id="bvIntroOverlay">
            <div class="intro-modal-card">
              <div class="intro-hero-wrapper">
                <img src="assets/banbi_intro.jpg" alt="Bắn Bi Ve Tuổi Thơ" class="intro-hero-img">
                <div class="intro-hero-overlay">
                  <span class="intro-badge">Dân Gian Tuổi Thơ</span>
                  <h3 class="intro-title">Bắn Bi Ve Tuổi Thơ - Sân Trường Trưa Hè</h3>
                </div>
              </div>
              <div class="intro-content">
                <p class="intro-desc">Ký ức trưa hè rực rỡ bên gốc bàng sân trường. Hãy so tài búng bi ve trong vòng phấn cùng lũ bạn xóm nhỏ!</p>
                <div class="intro-controls-box">
                  <div class="intro-control-row">
                    <span class="intro-key">Nhấp Giữ Bi Cái</span>
                    <span>Kéo ngược về sau để lấy lực và hướng ngắm chuẩn</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Thả Tay / Chuột</span>
                    <span>Búng bi cái lao vào vòng phấn và nghe tiếng lách cách ròn rã</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Đẩy Văng Khỏi Vòng</span>
                    <span>Đưa các viên bi mắt mèo ra khỏi vòng phấn để gom điểm</span>
                  </div>
                </div>
                <div class="intro-actions">
                  <button class="btn-intro-start" id="bvStartGameBtn">Bắt đầu búng bi (Vòng 1)</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. STAGE CLEAR OVERLAY -->
          <div class="game-stage-overlay" id="bvClearOverlay" style="display: none;">
            <div class="intro-modal-card stage-clear-card">
              <div class="stage-clear-stars">⭐⭐⭐</div>
              <h3 class="intro-title" style="color: #10B981; font-size: 1.5rem;">SẠCH VÒNG BI XUẤT SẮC!</h3>
              <p class="intro-desc">Bạn đã gom trọn vẹn dàn bi ve trong sân trường!</p>
              <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 8px; margin: 12px 0;">
                <div style="font-size: 1.15rem; color: #10B981; font-weight: 900;">Tổng điểm: $<span id="bvClearScore">0</span></div>
              </div>
              <div class="intro-actions">
                <button class="btn-intro-start" id="bvNextRoundBtn">➔ TIẾP TỤC SANG VÒNG TIẾP THEO</button>
              </div>
            </div>
          </div>

          <!-- 3. GAMEOVER OVERLAY -->
          <div class="game-stage-overlay" id="bvGameOverOverlay" style="display: none;">
            <div class="intro-modal-card stage-clear-card">
              <div style="font-size: 2.5rem; margin-bottom: 6px;">⚪</div>
              <h3 class="intro-title" style="color: #EF4444; font-size: 1.5rem;">HẾT LƯỢT BÚNG BI!</h3>
              <p class="intro-desc">Vẫn còn bi ve nằm lại trong vòng phấn. Thử lại để búng chuẩn xác hơn nhé!</p>
              <div class="intro-actions" style="margin-top: 14px;">
                <button class="btn-intro-start" id="bvRetryBtn" style="background: linear-gradient(135deg, #EF4444, #B91C1C); color: #FFF;">Chơi lại từ Vòng 1</button>
              </div>
            </div>
          </div>
        </div>

        <div class="canvas-controls-bar">
          <small style="color: #FDE68A;">Nhấp giữ Bi Cái (Xanh Dương) kéo ngược lấy lực rồi thả để búng • Đẩy văng bi ve ra khỏi vòng phấn để gom điểm!</small>
          <button class="btn-canvas-action" id="bvResetBtn">Chơi lại</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#bvCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = container.querySelector('#bvScore');
    const shotsEl = container.querySelector('#bvShots');
    const powerEl = container.querySelector('#bvPower');
    const roundEl = container.querySelector('#bvRound');
    const resetBtn = container.querySelector('#bvResetBtn');

    const introOverlay = container.querySelector('#bvIntroOverlay');
    const startBtn = container.querySelector('#bvStartGameBtn');
    const clearOverlay = container.querySelector('#bvClearOverlay');
    const nextRoundBtn = container.querySelector('#bvNextRoundBtn');
    const gameOverOverlay = container.querySelector('#bvGameOverOverlay');
    const retryBtn = container.querySelector('#bvRetryBtn');
    const clearScoreEl = container.querySelector('#bvClearScore');

    function updateHUD() {
      if (scoreEl) scoreEl.textContent = `${score}`;
      if (shotsEl) shotsEl.textContent = `${shotsLeft} lượt`;
      if (roundEl) roundEl.textContent = `${round}`;
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        introOverlay.style.display = 'none';
        gameState = 'PLAYING';
        initRound(1);
      });
    }

    if (nextRoundBtn) {
      nextRoundBtn.addEventListener('click', () => {
        clearOverlay.style.display = 'none';
        round = Math.min(maxRounds, round + 1);
        gameState = 'PLAYING';
        initRound(round);
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        gameOverOverlay.style.display = 'none';
        score = 0;
        round = 1;
        gameState = 'PLAYING';
        initRound(1);
      });
    }

    if (resetBtn) resetBtn.addEventListener('click', () => {
      score = 0;
      round = 1;
      gameState = 'PLAYING';
      initRound(1);
    });

    let lastPullBracket = 0;

    function handleDragStart(clientX, clientY) {
      if (shooter.isMoving || gameState !== 'PLAYING') return;
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left) * (canvas.width / rect.width);
      const my = (clientY - rect.top) * (canvas.height / rect.height);

      // Generous initiation touch area (near shooter or below shooter in drag zone)
      if (Math.hypot(mx - shooter.x, my - shooter.y) < shooter.radius * 4.8 || my > shooter.y - 15) {
        isDragging = true;
        dragStart = { x: shooter.x, y: shooter.y };
        dragCurrent = { x: mx, y: my };
        lastPullBracket = 0;
        if (window.NP_Juice) window.NP_Juice.vibrate(8);
      }
    }

    function handleDragMove(clientX, clientY) {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left) * (canvas.width / rect.width);
      const my = (clientY - rect.top) * (canvas.height / rect.height);
      dragCurrent = { x: mx, y: my };

      const pullDist = Math.min(130, Math.hypot(mx - dragStart.x, my - dragStart.y));
      const pct = Math.floor((pullDist / 130) * 100);
      if (powerEl) powerEl.textContent = `${pct}%`;

      // Tactile tension haptic feedback at 25%, 50%, 75%, 100%
      const currentBracket = Math.floor(pct / 25);
      if (currentBracket > lastPullBracket) {
        lastPullBracket = currentBracket;
        if (window.NP_Juice) window.NP_Juice.vibrate(8);
      }
    }

    function handleDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const pullDist = Math.hypot(dx, dy);

      if (pullDist > 12) {
        const power = Math.min(13.5, pullDist * 0.13);
        const ang = Math.atan2(dy, dx);
        shooter.vx = Math.cos(ang) * power;
        shooter.vy = Math.sin(ang) * power;
        shooter.isMoving = true;
        shotsLeft--;
        updateHUD();
        if (powerEl) powerEl.textContent = '0%';
        if (window.NP_Audio) window.NP_Audio.marbleClack(1.1);
        if (window.NP_Juice) window.NP_Juice.vibrate(18);
      }
    }

    canvas.addEventListener('mousedown', (e) => handleDragStart(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => handleDragMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleDragEnd);

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', handleDragEnd);

    function resolveCollision(c1, c2) {
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = c1.radius + c2.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        const overlap = (minDist - dist) / 2;
        c1.x -= nx * overlap;
        c1.y -= ny * overlap;
        c2.x += nx * overlap;
        c2.y += ny * overlap;

        const kx = c1.vx - c2.vx;
        const ky = c1.vy - c2.vy;
        const p = 2 * (nx * kx + ny * ky) / 2;

        c1.vx -= p * nx * 0.92;
        c1.vy -= p * ny * 0.92;
        c2.vx += p * nx * 0.92;
        c2.vy += p * ny * 0.92;

        const impactSpeed = Math.hypot(kx, ky);
        if (impactSpeed > 0.6) {
          if (window.NP_Audio) window.NP_Audio.marbleClack(Math.min(1.8, impactSpeed / 4));
          if (window.NP_Juice) window.NP_Juice.vibrate(Math.min(20, Math.floor(impactSpeed * 3)));
          if (particles) {
            particles.burst((c1.x + c2.x) / 2, (c1.y + c2.y) / 2, 6, '#FEF08A', 80, 2);
          }
        }
      }
    }

    // Main Game Loop with 60 FPS Fixed Delta-Time
    function loop(now) {
      animId = requestAnimationFrame(loop);
      if (!lastFrameTime) lastFrameTime = now;
      let dtMs = now - lastFrameTime;
      if (dtMs > 100) dtMs = 100;
      lastFrameTime = now;
      const dtRatio = dtMs / 16.67;

      if (gameState === 'PLAYING') {
        // Sandy soil friction
        const groundFriction = Math.pow(0.968, dtRatio);

        if (shooter.isMoving) {
          shooter.x += shooter.vx * dtRatio;
          shooter.y += shooter.vy * dtRatio;
          shooter.vx *= groundFriction;
          shooter.vy *= groundFriction;

          if (shooter.x < shooter.radius) { shooter.x = shooter.radius; shooter.vx *= -0.7; }
          if (shooter.x > canvasWidth - shooter.radius) { shooter.x = canvasWidth - shooter.radius; shooter.vx *= -0.7; }
          if (shooter.y < shooter.radius) { shooter.y = shooter.radius; shooter.vy *= -0.7; }
          if (shooter.y > canvasHeight - shooter.radius) { shooter.y = canvasHeight - shooter.radius; shooter.vy *= -0.7; }

          if (Math.hypot(shooter.vx, shooter.vy) < 0.1) {
            shooter.vx = 0;
            shooter.vy = 0;
            shooter.isMoving = false;

            const remaining = marbles.filter(m => m.inRing).length;
            if (remaining === 0) {
              gameState = 'STAGE_CLEAR';
              if (clearScoreEl) clearScoreEl.textContent = `${score}`;
              if (clearOverlay) clearOverlay.style.display = 'flex';
              if (window.NP_Audio) window.NP_Audio.win();
            } else if (shotsLeft <= 0) {
              gameState = 'GAMEOVER';
              if (gameOverOverlay) gameOverOverlay.style.display = 'flex';
              if (window.NP_Audio) window.NP_Audio.alarm();
            }
          }
        }

        // Target Marbles physics
        marbles.forEach(m => {
          m.x += m.vx * dtRatio;
          m.y += m.vy * dtRatio;
          m.vx *= groundFriction;
          m.vy *= groundFriction;

          if (Math.hypot(m.vx, m.vy) < 0.08) {
            m.vx = 0; m.vy = 0;
          }

          if (m.inRing) {
            const distFromCenter = Math.hypot(m.x - ringCenter.x, m.y - ringCenter.y);
            if (distFromCenter > ringRadius + m.radius) {
              m.inRing = false;
              score += m.pts;
              updateHUD();
              if (window.NP_Audio) window.NP_Audio.coin();
              if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 8, 200);
              if (popups) popups.spawn(m.x, m.y, `+${m.pts} RA KHỎI VÒNG!`, '#F59E0B', 20);
            }
          }
        });

        // Collisions: Shooter vs Marbles
        marbles.forEach(m => resolveCollision(shooter, m));

        // Collisions: Marble vs Marble
        for (let i = 0; i < marbles.length; i++) {
          for (let j = i + 1; j < marbles.length; j++) {
            resolveCollision(marbles[i], marbles[j]);
          }
        }
      }

      // --- RENDERING ---
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Sandy Yard Background
      ctx.fillStyle = '#92400E';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Soil texture dots
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 37) % canvasWidth;
        const sy = (i * 59) % canvasHeight;
        ctx.fillRect(sx, sy, 3, 2);
      }

      // Chalk Circle on Ground
      ctx.save();
      ctx.beginPath();
      ctx.arc(ringCenter.x, ringCenter.y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = `900 13px ${FONT_BASE}`;
      ctx.textAlign = 'center';
      ctx.fillText('VÒNG PHẤN', ringCenter.x, ringCenter.y + 4);
      ctx.restore();

      // Slingshot Aim Line
      if (isDragging && !shooter.isMoving) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(shooter.x, shooter.y);
        ctx.lineTo(dragCurrent.x, dragCurrent.y);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.stroke();

        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        ctx.beginPath();
        ctx.moveTo(shooter.x, shooter.y);
        ctx.lineTo(shooter.x + dx * 1.8, shooter.y + dy * 1.8);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      function drawMarble(m) {
        ctx.save();
        ctx.translate(m.x, m.y);

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(2, 3, m.radius, 0, Math.PI * 2); ctx.fill();

        const grad = ctx.createRadialGradient(-m.radius * 0.3, -m.radius * 0.3, 1, 0, 0, m.radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, m.color);
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, m.radius, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = m.swirl;
        ctx.beginPath();
        ctx.ellipse(-2, -2, m.radius * 0.5, m.radius * 0.25, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      marbles.forEach(drawMarble);
      drawMarble(shooter);

      if (particles) particles.updateAndDraw(ctx);
      if (popups) popups.updateAndDraw(ctx);
    }

    animId = requestAnimationFrame(loop);

    window.__currentBanBiCleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }

  // =========================================================================
  // 5. ĐÁNH BÀI ĐỔI MÀU (UNO CLASSIC)
  // =========================================================================
  function launchDanhBaiUno(container, game) {
    let animId = null;
    let turn = 0;
    let direction = 1;
    let activeColor = 'RED';
    let activeCard = null;
    let drawPile = [];
    let discardPile = [];
    let unoShouted = false;
    let gameState = 'INTRO'; // 'INTRO', 'PLAYING', 'GAMEOVER'

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('uno');
    }

    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;

    const COLORS = {
      RED: { name: 'Đỏ', hex: '#EF4444' },
      BLUE: { name: 'Xanh Dương', hex: '#3B82F6' },
      GREEN: { name: 'Xanh Lá', hex: '#10B981' },
      YELLOW: { name: 'Vàng', hex: '#F59E0B' },
      WILD: { name: 'Đổi Màu', hex: '#1F2937' }
    };

    const PLAYERS = [
      { id: 0, name: 'Bạn', isHuman: true, hand: [] },
      { id: 1, name: 'Bé Heo', isHuman: false, hand: [] },
      { id: 2, name: 'Tuấn Còi', isHuman: false, hand: [] },
      { id: 3, name: 'Bích Thảo', isHuman: false, hand: [] }
    ];

    function createDeck() {
      const deck = [];
      const colKeys = ['RED', 'BLUE', 'GREEN', 'YELLOW'];

      colKeys.forEach(col => {
        deck.push({ color: col, val: 0, type: 'NUM' });
        for (let i = 1; i <= 9; i++) {
          deck.push({ color: col, val: i, type: 'NUM' });
          deck.push({ color: col, val: i, type: 'NUM' });
        }
        for (let i = 0; i < 2; i++) {
          deck.push({ color: col, val: '🚫', type: 'SKIP' });
          deck.push({ color: col, val: '🔁', type: 'REVERSE' });
          deck.push({ color: col, val: '+2', type: 'DRAW2' });
        }
      });

      for (let i = 0; i < 4; i++) {
        deck.push({ color: 'WILD', val: '🌈', type: 'WILD' });
        deck.push({ color: 'WILD', val: '💥+4', type: 'WILD4' });
      }

      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    function initGame() {
      drawPile = createDeck();
      discardPile = [];
      turn = 0;
      direction = 1;
      unoShouted = false;

      PLAYERS.forEach(p => {
        p.hand = [];
        for (let i = 0; i < 7; i++) {
          p.hand.push(drawPile.pop());
        }
      });

      let top = drawPile.pop();
      while (top.color === 'WILD') {
        drawPile.unshift(top);
        top = drawPile.pop();
      }
      activeCard = top;
      activeColor = top.color;
      discardPile.push(top);

      updateHUD();
      render();
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="font-family: ${FONT_BASE};">
        <div class="canvas-game-hud">
          <div class="hud-pill">Bài Uno: <span id="unoTurn" style="color: #F59E0B; font-weight: 900;">Lượt của bạn</span></div>
          <div class="hud-pill">Màu đang đánh: <span id="unoActiveColor" style="color: #EF4444; font-weight: 900;">ĐỎ</span></div>
          <div class="hud-pill">Chiều: <span id="unoDir">Thuận ↶</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="unoCanvas" width="640" height="460" class="canvas-main-viewport" style="background: #064E3B; cursor: pointer; border-radius: 8px;"></canvas>

          <!-- 1. INTRO OVERLAY -->
          <div class="game-stage-overlay" id="unoIntroOverlay">
            <div class="intro-modal-card">
              <div class="intro-hero-wrapper">
                <img src="assets/uno_intro.jpg" alt="Đánh Bài Đổi Màu Uno" class="intro-hero-img">
                <div class="intro-hero-overlay">
                  <span class="intro-badge">Board Game Party</span>
                  <h3 class="intro-title">Đánh Bài Đổi Màu - Uno Party</h3>
                </div>
              </div>
              <div class="intro-content">
                <p class="intro-desc">Bàn tiệc rộn ràng cùng 3 người bạn: Bé Heo, Tuấn Còi, Bích Thảo. Hãy đánh bài cùng màu hoặc cùng số, chặn lượt, đổi chiều và nhớ bấm HÔ UNO khi chỉ còn 1 lá!</p>
                <div class="intro-controls-box">
                  <div class="intro-control-row">
                    <span class="intro-key">Đánh Bài</span>
                    <span>Bấm vào lá bài sáng viền trắng dưới tay để đánh</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Rút 1 Lá</span>
                    <span>Bấm nút Rút Bài nếu không có lá nào hợp lệ</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Hô UNO!</span>
                    <span>Bấm nút HÔ UNO khi trên tay còn đúng 2 lá trước khi đánh!</span>
                  </div>
                </div>
                <div class="intro-actions">
                  <button class="btn-intro-start" id="unoStartGameBtn">Bắt đầu ván bài</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="canvas-controls-bar">
          <div style="display: flex; gap: 8px;">
            <button class="btn-canvas-action" id="unoShoutBtn" style="background: #EF4444; color: #FFF; font-weight: 900;">Hô Uno!</button>
            <button class="btn-canvas-action" id="unoDrawBtn" style="background: #3B82F6; color: #FFF; font-weight: 700;">Rút 1 lá</button>
          </div>
          <small style="color: #E2E8F0;">Bấm bài hợp lệ dưới tay để đánh • Hô UNO khi còn 2 lá đánh 1!</small>
          <button class="btn-canvas-action" id="unoNewGameBtn">Ván mới</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#unoCanvas');
    const ctx = canvas.getContext('2d');
    const turnEl = container.querySelector('#unoTurn');
    const colorEl = container.querySelector('#unoActiveColor');
    const dirEl = container.querySelector('#unoDir');
    const shoutBtn = container.querySelector('#unoShoutBtn');
    const drawBtn = container.querySelector('#unoDrawBtn');
    const newGameBtn = container.querySelector('#unoNewGameBtn');
    const introOverlay = container.querySelector('#unoIntroOverlay');
    const startBtn = container.querySelector('#unoStartGameBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        introOverlay.style.display = 'none';
        gameState = 'PLAYING';
        initGame();
      });
    }

    function updateHUD() {
      if (colorEl) {
        colorEl.textContent = COLORS[activeColor].name;
        colorEl.style.color = COLORS[activeColor].hex;
      }
      if (turnEl) {
        turnEl.textContent = turn === 0 ? 'Lượt của bạn' : `Lượt của ${PLAYERS[turn].name}`;
      }
      if (dirEl) {
        dirEl.textContent = direction === 1 ? 'Thuận ↶' : 'Nghịch ↷';
      }
    }

    function checkCanPlay(card) {
      if (!card || !activeCard) return false;
      if (card.color === 'WILD') return true;
      if (card.color === activeColor) return true;
      if (card.val === activeCard.val) return true;
      return false;
    }

    if (shoutBtn) {
      shoutBtn.addEventListener('click', () => {
        unoShouted = true;
        if (window.NP_Audio) window.NP_Audio.win();
        if (popups) popups.spawn(320, 240, '⚡ BẠN ĐÃ HÔ UNO! ⚡', '#EF4444', 28);
      });
    }

    if (drawBtn) {
      drawBtn.addEventListener('click', () => {
        if (turn !== 0 || gameState !== 'PLAYING') return;
        if (drawPile.length === 0) drawPile = createDeck();
        PLAYERS[0].hand.push(drawPile.pop());
        if (window.NP_Audio) window.NP_Audio.cardSlide();
        if (popups) popups.spawn(320, 380, 'Bạn đã rút 1 lá', '#3B82F6', 16);
        advanceTurn();
      });
    }

    if (newGameBtn) newGameBtn.addEventListener('click', initGame);

    function advanceTurn() {
      if (gameState !== 'PLAYING') return;
      turn = (turn + direction + 4) % 4;
      updateHUD();
      render();

      if (turn !== 0) {
        setTimeout(playAITurn, 1100);
      }
    }

    function playAITurn() {
      if (gameState !== 'PLAYING' || turn === 0) return;
      const ai = PLAYERS[turn];
      const playable = ai.hand.filter(c => checkCanPlay(c));

      if (playable.length > 0) {
        const chosen = playable[Math.floor(Math.random() * playable.length)];
        const idx = ai.hand.indexOf(chosen);
        ai.hand.splice(idx, 1);
        applyCardEffect(chosen, ai);
      } else {
        if (drawPile.length === 0) drawPile = createDeck();
        ai.hand.push(drawPile.pop());
        if (window.NP_Audio) window.NP_Audio.cardSlide();
        if (popups) popups.spawn(320, 200, `${ai.name} rút 1 lá!`, '#9CA3AF', 16);
        advanceTurn();
      }
    }

    function applyCardEffect(card, player) {
      activeCard = card;
      if (card.color !== 'WILD') {
        activeColor = card.color;
      } else {
        const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
        activeColor = colors[Math.floor(Math.random() * colors.length)];
      }

      if (window.NP_Audio) window.NP_Audio.cardSlide();

      if (card.type === 'SKIP') {
        turn = (turn + direction + 4) % 4;
        if (popups) popups.spawn(320, 240, '🚫 CẤM LƯỢT!', '#EF4444', 22);
      } else if (card.type === 'REVERSE') {
        direction *= -1;
        if (popups) popups.spawn(320, 240, '🔁 ĐỔI CHIỀU BÀN CHƠI!', '#3B82F6', 22);
      } else if (card.type === 'DRAW2') {
        const target = (turn + direction + 4) % 4;
        for (let i = 0; i < 2; i++) {
          if (drawPile.length === 0) drawPile = createDeck();
          PLAYERS[target].hand.push(drawPile.pop());
        }
        turn = target;
        if (popups) popups.spawn(320, 240, `➕2️⃣ ${PLAYERS[target].name} bị phạt rút 2 lá!`, '#F59E0B', 20);
      } else if (card.type === 'WILD4') {
        const target = (turn + direction + 4) % 4;
        for (let i = 0; i < 4; i++) {
          if (drawPile.length === 0) drawPile = createDeck();
          PLAYERS[target].hand.push(drawPile.pop());
        }
        turn = target;
        if (popups) popups.spawn(320, 240, `💥+4! ${PLAYERS[target].name} bị phạt rút 4 lá!`, '#EF4444', 22);
      }

      if (player.hand.length === 0) {
        gameState = 'GAMEOVER';
        if (player.id === 0) {
          if (popups) popups.spawn(320, 240, '🏆 BẠN ĐÃ THẮNG CUỘC! 🏆', '#10B981', 28);
          if (window.NP_Audio) window.NP_Audio.win();
        } else {
          if (popups) popups.spawn(320, 240, `${player.name} ĐÃ HẾT BÀI! BẠN THUA!`, '#EF4444', 24);
          if (window.NP_Audio) window.NP_Audio.alarm();
        }
        render();
        return;
      }

      advanceTurn();
    }

    canvas.addEventListener('click', (e) => {
      if (turn !== 0 || gameState !== 'PLAYING') return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      const humanHand = PLAYERS[0].hand;
      const startX = 320 - (humanHand.length * 48) / 2;

      for (let i = humanHand.length - 1; i >= 0; i--) {
        const cx = startX + i * 48;
        const cy = 390;
        if (Math.abs(mx - cx) < 24 && Math.abs(my - cy) < 35) {
          const card = humanHand[i];
          if (checkCanPlay(card)) {
            humanHand.splice(i, 1);
            applyCardEffect(card, PLAYERS[0]);
            return;
          } else {
            if (popups) popups.spawn(mx, my - 20, 'Không cùng màu hoặc số!', '#EF4444', 16);
            if (window.NP_Audio) window.NP_Audio.alarm();
            return;
          }
        }
      }
    });

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Felt Green Table
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Discard Aura Glow matching current active color
      ctx.save();
      const auraColor = COLORS[activeColor]?.hex || '#EF4444';
      ctx.fillStyle = auraColor;
      ctx.beginPath();
      ctx.arc(320, 210, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Discard Pile Top Card
      if (activeCard) {
        drawCard(320, 210, activeCard, false, true);
      }

      // Draw Pile Deck
      drawCard(250, 210, { color: 'RED', val: 'UNO', type: 'BACK' }, true, true);

      // AI Opponents
      renderAIPlayer(100, 210, PLAYERS[1]); // Bé Heo
      renderAIPlayer(320, 70, PLAYERS[2]);  // Tuấn Còi
      renderAIPlayer(540, 210, PLAYERS[3]); // Bích Thảo

      // Human Hand Cards
      const humanHand = PLAYERS[0].hand;
      const startX = 320 - (humanHand.length * 48) / 2;
      humanHand.forEach((c, idx) => {
        const cx = startX + idx * 48;
        const cy = 390;
        drawCard(cx, cy, c, false, checkCanPlay(c));
      });

      if (popups) popups.updateAndDraw(ctx);
    }

    function renderAIPlayer(x, y, player) {
      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = turn === player.id ? '#F59E0B' : '#022C22';
      ctx.beginPath(); ctx.roundRect(-45, -24, 90, 48, 6); ctx.fill();
      ctx.strokeStyle = '#34D399'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = '#FFF';
      ctx.font = `bold 12px ${FONT_BASE}`;
      ctx.textAlign = 'center';
      ctx.fillText(player.name, 0, -4);
      ctx.fillStyle = '#FBBF24';
      ctx.fillText(`${player.hand.length} lá`, 0, 14);

      ctx.restore();
    }

    function drawCard(x, y, card, isBack = false, isPlayable = true) {
      const W = 46;
      const H = 68;

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.roundRect(-W / 2 + 2, -H / 2 + 3, W, H, 6); ctx.fill();

      const cDef = COLORS[card.color] || { hex: '#1F2937' };
      ctx.fillStyle = isBack ? '#111827' : cDef.hex;
      ctx.beginPath(); ctx.roundRect(-W / 2, -H / 2, W, H, 6); ctx.fill();

      ctx.strokeStyle = isPlayable ? '#FFFFFF' : '#6B7280';
      ctx.lineWidth = isPlayable ? 2.5 : 1;
      ctx.stroke();

      ctx.fillStyle = isBack ? '#DC2626' : '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, 0, W * 0.4, H * 0.42, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isBack ? '#FFFFFF' : (card.color === 'YELLOW' ? '#92400E' : cDef.hex);
      ctx.font = `900 17px ${FONT_BASE}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(card.val), 0, 0);

      ctx.restore();
    }

    render();

    window.__currentUnoCleanup = () => {
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') window.NP_Audio.stopBGM();
    };
  }

  // Expose to window.NP_Engines
  window.NP_Engines.launchZuma = launchZuma;
  window.NP_Engines.launchDinerDash = launchDinerDash;
  window.NP_Engines.launchCoTuong = launchCoTuong;
  window.NP_Engines.launchBanBiVe = launchBanBiVe;
  window.NP_Engines.launchDanhBaiUno = launchDanhBaiUno;

})();
