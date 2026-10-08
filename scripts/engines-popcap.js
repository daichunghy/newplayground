/** Legacy engine wrappers and arcade modules. Rights and reference parity are tracked per game dossier. */

(function () {
  'use strict';

  if (!window.NP_Engines) window.NP_Engines = {};

  const FONT_BASE = 'Calibri, -apple-system, sans-serif';

  // =========================================================================
  // 1. ZUMA DELUXE (POPCAP ẾCH BẮN NGỌC 2003)
  // =========================================================================
  function launchZuma(container, game) {
    const session = window.NP_GameSession.start();
    return window.NP_MarbleTrail.mount(container, session, window.NP_Audio);
  }

  // =========================================================================
  // 2. DINER DASH (PHỤC VỤ BÀN - PLAYFIRST FLO'S DINER 2004)
  // =========================================================================
  function launchDinerDash(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
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

    onCleanup(() => {
      cancelAnimationFrame(animId);
      clearInterval(secondTimer);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') window.NP_Audio.stopBGM();
    });
  }

  // =========================================================================
  // 3. CỜ TƯỚNG (ORIGINAL LOCAL HOT-SEAT RULES)
  // =========================================================================
  function launchCoTuong(container, game) {
    const engine = window.NP_Xiangqi;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Cờ Tướng chưa sẵn sàng.';
      return;
    }
    const session = window.NP_GameSession.start();
    return engine.mount(container, { session });
  }

  // =========================================================================
  // 4. BẮN BI VE (ORIGINAL LOCAL MARBLE-FLICK MODULE)
  // =========================================================================
  function launchBanBiVe(container, game) {
    const engine = window.NP_BanBiVe;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Bắn Bi Ve chưa sẵn sàng.';
      return;
    }
    const session = window.NP_GameSession.start();
    return engine.mount(container, session);
  }

  // =========================================================================
  // 5. ENGINE: SẮC CHUYỀN (ORIGINAL SEASONAL CARD DUEL)
  // ========================================================================
  function launchDanhBaiUno(container, game) {
    const engine = window.NP_SeasonShed;
    if (!engine || typeof engine.mount !== 'function') {
      container.textContent = 'Sắc Chuyền chưa sẵn sàng.';
      return;
    }
    return engine.mount(container, window.NP_GameSession.start());
  }

  // Expose to window.NP_Engines
  window.NP_Engines.launchZuma = launchZuma;
  window.NP_Engines.launchDinerDash = launchDinerDash;
  window.NP_Engines.launchCoTuong = launchCoTuong;
  window.NP_Engines.launchBanBiVe = launchBanBiVe;
  window.NP_Engines.launchDanhBaiUno = launchDanhBaiUno;

})();
