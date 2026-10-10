/**
 * NewPlayground - Advanced Retro Game Engines
 * 1. Hàng Rong Full (5 Stages, Wholesale Market, Cooking Meters, Street Events, Equipment Shop)
 * 2. Đào Vàng (Gold Miner Canvas Physics, Claw, Dynamite, Stages 1-10, Inter-stage Shop)
 * 3. Line 98 Cổ Điển (9x9 Grid, BFS Pathfinding, 3-Ball Next Preview, 5-in-a-row scoring, Undo)
 * 4. Bắn Trứng Khủng Long (Dynomite Canvas Shooter, Egg Matching, Lowering Ceiling)
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
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    const art = (type,id,cls='') => window.NP_GameArt?.svg(type,id,cls) || '';
    const shortDish = id => ({
      banhmi_trung:'Bánh mì trứng', tra_da:'Trà đá',keo_lac:'Kẹo lạc',
      cavien_chien:'Cá viên chiên', nuoc_mia:'Nước mía',
      banhtrang_nuong:'Bánh tráng nướng',nemchua_ran:'Nem rán',
      tra_chanh:'Trà chanh',trasua_topping:'Trà sữa',lau_ly:'Lẩu ly'
    })[id] || id;
    // Persistent State
    const STORAGE_KEY = 'np_hangrong_save_v2';
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {}

    // Start Hanoi Street Atmosphere BGM
    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('hangrong');
    }

    const state = saved || {
      level: 1,
      exp: 0,
      expNeeded: 100,
      coins: 100,
      reputation: 10,
      stageIndex: 0, // 0 to 4
      inventory: {
        bread: 10,
        egg_pate: 10,
        skewer: 8,
        sugarcane: 8,
        ricepaper: 0,
        tea_milk: 0,
        sausage: 0
      },
      upgrades: {
        extraChair: false, // 2 -> 4 customers
        fastStove: false,  // 40% faster cooking
        umbrella: false,   // Immune to rain
        speaker: false,    // Customers arrive faster
        cooler: false      // Spoilage protection
      },
      bargainedDiscounts: {}
    };
    if (!state.bargainedDiscounts) state.bargainedDiscounts = {};

    // Stage Definitions (5 Giai đoạn tăng tiến)
    const STAGES = [
      {
        id: 'ganh-tre',
        name: 'Giai đoạn 1: Gánh Tre Vỉa Hè (Cấp 1 - 3)',
        location: 'Góc ngõ hẻm phố nhỏ',
        targetLevel: 4,
        recipes: ['banhmi_trung', 'tra_da', 'keo_lac'],
        desc: 'Bắt đầu từ gánh tre mộc mạc và 2 chiếc ghế nhựa con.'
      },
      {
        id: 'xe-day-inox',
        name: 'Giai đoạn 2: Xe Đẩy Inox Vỉa Hè (Cấp 4 - 7)',
        location: 'Cổng trường cấp 3 rộn rã',
        targetLevel: 8,
        recipes: ['banhmi_trung', 'tra_da', 'cavien_chien', 'nuoc_mia', 'banhtrang_nuong'],
        desc: 'Nâng cấp xe đẩy có tủ kính sáng loáng, mở rộng các món chiên nướng.'
      },
      {
        id: 'quan-coc',
        name: 'Giai đoạn 3: Quán Cóc Phố Cổ (Cấp 8 - 14)',
        location: 'Vỉa hè Nhà Thờ Lớn',
        targetLevel: 15,
        recipes: ['banhmi_trung', 'cavien_chien', 'nuoc_mia', 'banhtrang_nuong', 'nemchua_ran', 'tra_chanh'],
        desc: 'Bàn ghế nhựa cao, bạt dù che nắng, điểm hẹn giới trẻ chém gió.'
      },
      {
        id: 'thien-duong',
        name: 'Giai đoạn 4: Thiên Đường Ẩm Thực (Cấp 15 - 24)',
        location: 'Khu ẩm thực sầm uất',
        targetLevel: 25,
        recipes: ['banhmi_trung', 'cavien_chien', 'nuoc_mia', 'banhtrang_nuong', 'nemchua_ran', 'tra_chanh', 'trasua_topping', 'lau_ly'],
        desc: 'Thuê phụ bếp, dàn bếp công nghiệp đôi, menu phong phú nức tiếng.'
      },
      {
        id: 'vua-hang-rong',
        name: 'Giai đoạn 5: Vua Hàng Rong Phố Đi Bộ (Cấp 25+)',
        location: 'Mặt tiền Phố Đi Bộ trung tâm',
        targetLevel: 99,
        recipes: ['banhmi_trung', 'cavien_chien', 'nuoc_mia', 'banhtrang_nuong', 'nemchua_ran', 'tra_chanh', 'trasua_topping', 'lau_ly'],
        desc: 'Thương hiệu vỉa hè huyền thoại, khách xếp hàng dài từ sáng đến tối!'
      }
    ];

    // Master Recipes Catalog
    const ALL_RECIPES = {
      banhmi_trung: {
        id: 'banhmi_trung',
        name: 'Bánh Mì Trứng Pate',
        icon: '🥖',
        cookTime: 4.5,
        sellPrice: 15,
        costPrice: 5,
        expReward: 12,
        requires: { bread: 1, egg_pate: 1 }
      },
      tra_da: {
        id: 'tra_da',
        name: 'Trà Đá Vỉa Hè',
        icon: '🧊',
        cookTime: 2.8,
        sellPrice: 6,
        costPrice: 1,
        expReward: 5,
        requires: { tea_milk: 1 }
      },
      keo_lac: {
        id: 'keo_lac',
        name: 'Kẹo Lạc Giòn Tan',
        icon: '🥜',
        cookTime: 3.2,
        sellPrice: 8,
        costPrice: 2,
        expReward: 7,
        requires: {}
      },
      cavien_chien: {
        id: 'cavien_chien',
        name: 'Cá Viên Chiên',
        icon: '🍢',
        cookTime: 5.0,
        sellPrice: 25,
        costPrice: 9,
        expReward: 20,
        requires: { skewer: 1 }
      },
      nuoc_mia: {
        id: 'nuoc_mia',
        name: 'Nước Mía Siêu Sạch',
        icon: '🥤',
        cookTime: 4.0,
        sellPrice: 18,
        costPrice: 6,
        expReward: 15,
        requires: { sugarcane: 1 }
      },
      banhtrang_nuong: {
        id: 'banhtrang_nuong',
        name: 'Bánh Tráng Nướng Đà Lạt',
        icon: '🍕',
        cookTime: 5.5,
        sellPrice: 28,
        costPrice: 10,
        expReward: 24,
        requires: { ricepaper: 1, egg_pate: 1 }
      },
      nemchua_ran: {
        id: 'nemchua_ran',
        name: 'Nem Chua Rán Phố Cổ',
        icon: '🥓',
        cookTime: 5.0,
        sellPrice: 32,
        costPrice: 12,
        expReward: 26,
        requires: { sausage: 1 }
      },
      tra_chanh: {
        id: 'tra_chanh',
        name: 'Trà Chanh Chém Gió',
        icon: '🍋',
        cookTime: 3.5,
        sellPrice: 20,
        costPrice: 6,
        expReward: 16,
        requires: { tea_milk: 1 }
      },
      trasua_topping: {
        id: 'trasua_topping',
        name: 'Trà Sữa Trân Châu Full',
        icon: '🧋',
        cookTime: 5.0,
        sellPrice: 42,
        costPrice: 16,
        expReward: 35,
        requires: { tea_milk: 1 }
      },
      lau_ly: {
        id: 'lau_ly',
        name: 'Lẩu Ly Tokbokki Khổng Lồ',
        icon: '🍲',
        cookTime: 6.5,
        sellPrice: 65,
        costPrice: 28,
        expReward: 55,
        requires: { skewer: 1, sausage: 1 }
      }
    };

    // Market Catalog (Chợ Đầu Mối)
    const MARKET_ITEMS = [
      { id: 'bread', name: 'Bánh Mì Nóng Giòn', icon: '🥖', basePrice: 4, desc: 'Nguyên liệu cho bánh mì' },
      { id: 'egg_pate', name: 'Trứng Gà & Pate Gan', icon: '🍳', basePrice: 3, desc: 'Làm bánh mì, bánh tráng' },
      { id: 'skewer', name: 'Xiên Cá & Tôm Viên', icon: '🍢', basePrice: 7, desc: 'Làm cá viên chiên, lẩu ly' },
      { id: 'sugarcane', name: 'Mía Tươi Khúc Dài', icon: '🎋', basePrice: 5, desc: 'Làm nước mía siêu sạch' },
      { id: 'ricepaper', name: 'Bánh Tráng Tây Ninh', icon: '🫓', basePrice: 6, desc: 'Làm bánh tráng nướng' },
      { id: 'tea_milk', name: 'Trà Thái & Sữa Đặc', icon: '🫖', basePrice: 4, desc: 'Pha trà chanh, trà sữa' },
      { id: 'sausage', name: 'Nem Chua & Xúc Xích', icon: '🌭', basePrice: 9, desc: 'Làm nem rán, lẩu ly' }
    ];

    // Upgrades Catalog
    const UPGRADES_LIST = [
      {
        id: 'extraChair',
        name: 'Thêm Bàn Ghế Nhựa',
        icon: '🪑',
        cost: 150,
        desc: 'Tăng sức chứa khách chờ từ 2 lên tối đa 4 khách cùng lúc.'
      },
      {
        id: 'fastStove',
        name: 'Bếp Ga Đôi Siêu Tốc',
        icon: '🔥',
        cost: 250,
        desc: 'Tăng tốc độ nấu chín thức ăn lên nhanh hơn 40%.'
      },
      {
        id: 'umbrella',
        name: 'Bạt Dù Che Mưa Bão',
        icon: '⛱️',
        cost: 350,
        desc: 'Bảo vệ khách khi trời mưa giông bất chợt, không bị bỏ chạy.'
      },
      {
        id: 'speaker',
        name: 'Loa Rao Hàng Kẹo Kéo',
        icon: '📢',
        cost: 480,
        desc: 'Rao vang cả con phố! Khách hàng kéo đến nhanh gấp đôi.'
      },
      {
        id: 'cooler',
        name: 'Tủ Mát Bảo Quản',
        icon: '🧊',
        cost: 600,
        desc: 'Bảo quản nguyên liệu tươi lâu, không lo hao hụt hay hư hỏng.'
      }
    ];

    // Runtime state variables
    let currentTab = 'stall'; // 'stall', 'market', 'upgrades', 'handbook'
    let customers = [];
    let cookingSlots = [
      { id: 1, status: 'empty', recipe: null, progress: 0, timer: null },
      { id: 2, status: 'empty', recipe: null, progress: 0, timer: null },
      { id: 3, status: 'empty', recipe: null, progress: 0, timer: null }
    ];
    let tray = []; // Max 4 finished items
    let emergencyAlert = null; // { type: 'police' | 'rain', timer: number, timeRemaining: number }
    let mainLoopInterval = null;

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    }

    function addExp(amount) {
      state.exp += amount;
      while (state.exp >= state.expNeeded) {
        state.exp -= state.expNeeded;
        state.level++;
        state.expNeeded = Math.round(state.expNeeded * 1.4);
        AudioEngine.win();
        showFeedback(`🎉 Chúc mừng bạn đã LÊN CẤP ${state.level}! Nhận thưởng 50 xu!`);
        state.coins += 50;

        // Check stage progression
        if (state.stageIndex < STAGES.length - 1 && state.level >= STAGES[state.stageIndex + 1].targetLevel) {
          state.stageIndex++;
          showFeedback(`🏆 Bạn đã mở khóa: ${STAGES[state.stageIndex].name}!`);
        }
      }
      saveState();
    }

    function showFeedback(msg) {
      if (typeof window.showToastNotification === 'function') {
        window.showToastNotification(msg);
      }
    }

    // Render Base HTML
    container.innerHTML = `
      <div class="hangrong-full-engine np-stall-game">
        <!-- TOP TABS -->
        <div class="engine-tab-nav">
          <button class="engine-tab-btn active" data-tab="stall">Quầy bán hàng</button>
          <button class="engine-tab-btn" data-tab="market">Chợ nguyên liệu</button>
          <button class="engine-tab-btn" data-tab="upgrades">Nâng cấp</button>
          <button class="engine-tab-btn" data-tab="handbook">Tiến trình</button>
        </div>

        <!-- PROGRESSION HEADER -->
        <div class="stage-progress-card">
          <div>
            <div class="stage-info-title">
              <span>⭐ Cấp ${state.level}</span> • <span id="hrStageName">${STAGES[state.stageIndex].name}</span>
            </div>
            <div class="stage-subtext">${STAGES[state.stageIndex].location} · Danh vọng ${state.reputation}</div>
          </div>
          <div class="stage-xp-bar-wrap">
            <div class="stage-xp-label">
              <span>Kinh nghiệm</span>
              <span id="hrExpText">${state.exp}/${state.expNeeded} XP</span>
            </div>
            <div class="stage-xp-track">
              <div class="stage-xp-fill" id="hrExpFill" style="width: ${(state.exp / state.expNeeded) * 100}%;"></div>
            </div>
          </div>
          <div style="font-size: 1.15rem; font-weight: 900; color: #F59E0B; display: flex; align-items: center; gap: 4px;">
            🪙 <span id="hrCoinsText">${state.coins}</span> xu
          </div>
        </div>

        <!-- EMERGENCY ALERT BANNER (HIDDEN INITIALLY) -->
        <div id="hrEmergencyBanner" style="display: none;" class="street-alert-banner">
          <span class="street-alert-text" id="hrAlertText">Có người tuần tra, dọn gánh!</span>
          <button class="btn-emergency-flee" id="hrFleeBtn">Dọn gánh ngay! (<span id="hrAlertTimer">4</span>s)</button>
        </div>

        <!-- TAB CONTENT VIEWPORT -->
        <div id="hrTabViewport" style="min-height: 380px;">
          <!-- Injected via switchTab -->
        </div>
      </div>
    `;

    // Tab Switching
    const tabBtns = container.querySelectorAll('.engine-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.getAttribute('data-tab');
        renderCurrentTab();
      });
    });


    function drawStreetScene() {
      const c = container.querySelector('#hrStreetCanvas');
      if (!c) return;
      const ctx = c.getContext('2d');
      const w = c.width;
      const h = c.height;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      skyGrad.addColorStop(0, '#93C5FD');
      skyGrad.addColorStop(1, '#FED7AA');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant Trees
      ctx.fillStyle = '#15803D';
      ctx.beginPath();
      ctx.arc(60, 50, 40, 0, Math.PI * 2);
      ctx.arc(140, 45, 45, 0, Math.PI * 2);
      ctx.arc(520, 50, 40, 0, Math.PI * 2);
      ctx.fill();

      // Shophouse
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(200, 15, 240, 95);
      ctx.strokeStyle = '#D97706';
      ctx.strokeRect(200, 15, 240, 95);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(195, 12, 250, 6);
      ctx.fillStyle = '#166534';
      ctx.fillRect(225, 30, 28, 42);
      ctx.fillRect(285, 30, 28, 42);
      ctx.fillRect(345, 30, 28, 42);
      ctx.fillRect(405, 30, 28, 42);

      // Telegraph wires with lanterns
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 25);
      ctx.quadraticCurveTo(w / 2, 45, w, 25);
      ctx.stroke();
      [120, 260, 380, 490].forEach(lx => {
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(lx, 34, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(lx - 2, 32, 4, 4);
      });

      // Sidewalk
      ctx.fillStyle = '#D1D5DB';
      ctx.fillRect(0, 110, w, 45);
      for (let tx = 0; tx < w; tx += 20) {
        ctx.strokeStyle = '#9CA3AF';
        ctx.strokeRect(tx, 110, 20, 45);
      }
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(0, 155, w, 8);
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 163, w, h - 163);

      // Stall
      const stallX = 90;
      const stallY = 135;
      const awningY = 70;
      for (let s = 0; s < 7; s++) {
        ctx.fillStyle = s % 2 === 0 ? '#DC2626' : '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(stallX - 45 + s * 14, awningY);
        ctx.lineTo(stallX - 45 + (s + 1) * 14, awningY);
        ctx.lineTo(stallX - 52 + (s + 1) * 16, awningY + 22);
        ctx.lineTo(stallX - 52 + s * 16, awningY + 22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(stallX - 48, awningY + 22);
      ctx.lineTo(stallX - 48, stallY);
      ctx.moveTo(stallX + 54, awningY + 22);
      ctx.lineTo(stallX + 54, stallY);
      ctx.stroke();

      ctx.fillStyle = state.stageIndex >= 1 ? '#94A3B8' : '#854D0E';
      ctx.fillRect(stallX - 45, stallY - 26, 95, 30);
      ctx.strokeStyle = '#1F2937';
      ctx.strokeRect(stallX - 45, stallY - 26, 95, 30);

      // Vendor Head
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(stallX + 6, stallY - 40, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.fillRect(stallX + 3, stallY - 42, 2, 2);
      ctx.fillRect(stallX + 8, stallY - 42, 2, 2);
      ctx.beginPath();
      ctx.arc(stallX + 6, stallY - 37, 3, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.moveTo(stallX + 6, stallY - 56);
      ctx.lineTo(stallX - 14, stallY - 44);
      ctx.lineTo(stallX + 26, stallY - 44);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#CA8A04';
      ctx.stroke();

      // Steam & Cooking Sizzle Sparks
      const isCooking = cookingSlots.some(s => s.status === 'cooking');
      const steamOffset = (Date.now() * 0.05) % 25;
      ctx.fillStyle = isCooking ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(stallX - 25, stallY - 32 - steamOffset, isCooking ? 6 : 4, 0, Math.PI * 2);
      ctx.arc(stallX - 20, stallY - 44 - steamOffset, isCooking ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();

      if (isCooking) {
        const now = Date.now();
        for (let sp = 0; sp < 4; sp++) {
          const spX = stallX - 32 + ((now * (0.04 + sp * 0.02) + sp * 24) % 32);
          const spY = stallY - 26 - ((now * 0.06 + sp * 16) % 22);
          ctx.fillStyle = sp % 2 === 0 ? '#F59E0B' : '#EF4444';
          ctx.beginPath();
          ctx.arc(spX, spY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Customers and Stools
      const chairPositions = [
        { x: 230, y: 135 },
        { x: 320, y: 135 },
        { x: 410, y: 135 },
        { x: 500, y: 135 }
      ];
      const maxChairs = state.upgrades.extraChair ? 4 : 2;

      for (let ci = 0; ci < maxChairs; ci++) {
        const cp = chairPositions[ci];
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(cp.x - 12, cp.y - 12, 24, 14);
        ctx.fillRect(cp.x - 10, cp.y + 2, 3, 10);
        ctx.fillRect(cp.x + 7, cp.y + 2, 3, 10);

        if (customers[ci]) {
          const cust = customers[ci];
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(cp.x - 8, cp.y - 28, 16, 20);
          ctx.fillStyle = '#FBBF24';
          ctx.beginPath();
          ctx.arc(cp.x, cp.y - 36, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#332c27';
          ctx.beginPath(); ctx.arc(cp.x, cp.y-42, 10, Math.PI, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#22302a';
          ctx.fillRect(cp.x-4, cp.y-37, 2, 2);
          ctx.fillRect(cp.x+4, cp.y-37, 2, 2);

          // Bubble
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(cp.x - 30, cp.y - 82, 60, 32, 8);
          ctx.fill();
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cp.x - 4, cp.y - 50);
          ctx.lineTo(cp.x, cp.y - 42);
          ctx.lineTo(cp.x + 4, cp.y - 50);
          ctx.fill();

          ctx.fillStyle='#cf965f';
          ctx.beginPath();ctx.ellipse(cp.x-13,cp.y-65,11,7,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#f7ddb0';
          ctx.beginPath();ctx.ellipse(cp.x-13,cp.y-66,7,4,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#71a270';ctx.fillRect(cp.x-17,cp.y-67,7,2);

          const pPct = cust.patience / cust.maxPatience;
          ctx.fillStyle = pPct > 0.3 ? '#10B981' : '#EF4444';
          ctx.fillRect(cp.x + 4, cp.y - 70, 20 * pPct, 5);
          ctx.strokeStyle = '#64748B';
          ctx.strokeRect(cp.x + 4, cp.y - 70, 20, 5);
        }
      }

      // Emergency Police Siren Lights flashing
      if (emergencyAlert && emergencyAlert.type === 'police') {
        const isRed = Math.floor(Date.now() / 180) % 2 === 0;
        ctx.save();
        ctx.fillStyle = isRed ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }

    function renderCurrentTab() {
      const viewport = container.querySelector('#hrTabViewport');
      if (!viewport) return;

      if (currentTab === 'stall') {
        renderStallTab(viewport);
      } else if (currentTab === 'market') {
        renderMarketTab(viewport);
      } else if (currentTab === 'upgrades') {
        renderUpgradesTab(viewport);
      } else if (currentTab === 'handbook') {
        renderHandbookTab(viewport);
      }
      updateTopHUD();
    }

    function updateTopHUD() {
      const coinsEl = container.querySelector('#hrCoinsText');
      const expTextEl = container.querySelector('#hrExpText');
      const expFillEl = container.querySelector('#hrExpFill');
      const stageNameEl = container.querySelector('#hrStageName');
      if (coinsEl) coinsEl.textContent = state.coins;
      if (expTextEl) expTextEl.textContent = `${state.exp}/${state.expNeeded} XP`;
      if (expFillEl) expFillEl.style.width = `${(state.exp / state.expNeeded) * 100}%`;
      if (stageNameEl) stageNameEl.textContent = STAGES[state.stageIndex].name;
    }

    // --- TAB 1: QUẦY BÁN HÀNG (STALL TAB) ---
    function renderStallTab(viewport) {
      const currentStage = STAGES[state.stageIndex];
      const availableRecipeKeys = currentStage.recipes;

      viewport.innerHTML = `
        <!-- ANIMATED STREET STALL CANVAS -->
        <div style="background-color: #0F172A; border: 2px solid var(--border-dark); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 12px; position: relative; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
          <canvas id="hrStreetCanvas" width="600" height="190" style="width: 100%; height: auto; display: block;"></canvas>
          <div style="position: absolute; bottom: 6px; right: 8px; font-size: 0.72rem; color: #FFF; background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 4px; pointer-events: none;">
            ${currentStage.location}
          </div>
        </div>

        <!-- CUSTOMER QUEUE -->
        <div style="background-color: var(--bg-surface); border: 1.5px solid var(--border-dark); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 800; margin-bottom: 8px;">
            <span>👥 Khách chờ ${customers.length}/${state.upgrades.extraChair ? 4 : 2}</span>
            <small style="color: var(--text-muted);">Chạm khách để giao món</small>
          </div>
          <div id="hrCustomerRow" style="display: flex; gap: 12px; overflow-x: auto; min-height: 80px;">
            <!-- Customer slots -->
          </div>
        </div>

        <!-- COOKING WORKBENCH -->
        <div style="background-color: var(--bg-surface); border: 1.5px solid var(--border-dark); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
          <div style="font-size: 0.88rem; font-weight: 900; margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>Bếp nấu</span>
            <span style="font-size: 0.78rem; color: var(--text-muted);">Canh vùng xanh để món chín ngon</span>
          </div>
          <div class="cooking-station-grid" id="hrCookingSlots">
            <!-- 3 cooking slots -->
          </div>
        </div>

        <!-- FINISHED DISHES TRAY & RECIPE SELECTOR -->
        <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 14px; flex-wrap: wrap;">
          <!-- Tray -->
          <div style="background-color: var(--bg-surface-soft); border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); padding: 12px;">
            <div style="font-size: 0.82rem; font-weight: 800; margin-bottom: 8px;">Khay món ${tray.length}/4</div>
            <div id="hrTraySlots" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
              <!-- Tray boxes -->
            </div>
            <small style="display: block; margin-top: 8px; font-size: 0.72rem; color: var(--text-muted); text-align: center;">Chạm món để bỏ khỏi khay</small>
          </div>

          <!-- Recipe Cooking Trigger Buttons -->
          <div style="background-color: var(--bg-surface); border: 1.5px solid var(--border-dark); border-radius: var(--radius-md); padding: 12px;">
            <div style="font-size: 0.82rem; font-weight: 800; margin-bottom: 8px;">Thực đơn</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px;" id="hrRecipeBtns">
              ${availableRecipeKeys.map(key => {
                const r = ALL_RECIPES[key];
                return `
                  <button class="btn-cook-action" data-recipe="${r.id}" style="display: flex; flex-direction: column; align-items: center; padding: 6px 4px; gap: 2px;">
                    <span style="font-size: 1.2rem;">${art('dish',r.id,'np-stall-dish-art')}</span>
                    <span class="np-stall-recipe-name">${shortDish(r.id)}</span>
                    <span class="np-stall-recipe-price">${r.sellPrice} xu</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      renderCustomersList();
      renderCookingSlotsUI();
      renderTrayUI();

      // Bind Recipe Cook Buttons
      viewport.querySelectorAll('#hrRecipeBtns .btn-cook-action').forEach(btn => {
        btn.addEventListener('click', () => {
          const rKey = btn.getAttribute('data-recipe');
          startCookingDish(rKey);
        });
      });
    }

    function renderCustomersList() {
      const row = container.querySelector('#hrCustomerRow');
      if (!row) return;

      if (customers.length === 0) {
        row.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 20px; text-align: center; width: 100%;">Đang vắng khách... Một lát nữa khách sẽ ghé quán! 🚶‍♂️</div>`;
        return;
      }

      row.innerHTML = customers.map(c => `
        <div class="customer-slot" data-cust-id="${c.id}" style="min-width: 130px; cursor: pointer; border: 1.5px solid var(--border-dark); padding: 8px; border-radius: var(--radius-sm); background: var(--bg-primary); text-align: center;">
          <div class="np-stall-portrait"><span class="np-stall-avatar" aria-hidden="true"></span></div>
          <div style="font-weight: 900; font-size: 0.82rem; margin: 2px 0;">${c.name}</div>
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); padding: 3px 6px; border-radius: 4px; font-size: 0.76rem; font-weight: 800; color: #B45309; margin-bottom: 4px;">
            ${art('dish',c.order.id,'np-stall-order-art')}<span>${shortDish(c.order.id)}</span>
          </div>
          <div class="cook-progress-track" style="height: 6px; margin: 0;">
            <div style="width: ${(c.patience / c.maxPatience) * 100}%; height: 100%; background: ${c.patience < 30 ? '#EF4444' : '#10B981'}; transition: width 0.2s linear;"></div>
          </div>
        </div>
      `).join('');

      row.querySelectorAll('.customer-slot').forEach(slot => {
        slot.addEventListener('click', () => {
          const custId = parseInt(slot.getAttribute('data-cust-id'));
          serveCustomerDirect(custId);
        });
      });
    }


    // Cooking updates only mutate the progress and text of existing DOM.
    // Rebuilding every 100ms used to replace buttons under the player's finger.
    function cookingQuality(progress) {
      if (progress > 102) return { name:'burnt', text:'Cháy món', action:'Bỏ món', color:'#b95c4d' };
      if (progress > 92) return { name:'late', text:'Sắp cháy', action:'Nhấc ngay', color:'#c98146' };
      if (progress >= 65) return { name:'perfect', text:'Chín ngon', action:'Nhấc món', color:'#3e936f' };
      return { name:'cooking', text:'Đang nấu', action:'Nhấc sớm', color:'#ba874a' };
    }
    function paintCookingSlot(slot) {
      const card = container.querySelector('#hrCookingSlot' + slot.id);
      if (!card || slot.status !== 'cooking') return;
      const progress = Math.max(0, Math.min(120, slot.progress));
      const quality = cookingQuality(progress);
      const track = card.querySelector('.np-stall-cook-track');
      if (track) track.setAttribute('aria-valuenow', String(Math.round(progress)));
      const fill = card.querySelector('.cook-progress-bar');
      if (fill) {
        fill.style.width = Math.min(100,progress) + '%';
        fill.style.backgroundColor = quality.color;
      }
      const status = card.querySelector('.cook-status-text');
      if (status) status.textContent = quality.text;
      const pct = card.querySelector('.np-stall-cook-percent');
      if (pct) pct.textContent = Math.round(progress) + '%';
      const button = card.querySelector('.btn-pickup-stove');
      if (button) {
        button.textContent = quality.action;
        button.style.backgroundColor = quality.color;
      }
      if (card.getAttribute('data-cook-phase') !== quality.name) {
        card.setAttribute('data-cook-phase',quality.name);
      }
    }
    function renderCookingSlotsUI() {
      const el = container.querySelector('#hrCookingSlots');
      if (!el) return;
      el.innerHTML = cookingSlots.map(slot => {
        if (slot.status === 'empty') return `
          <div class="cooking-slot-card np-stall-burner empty" id="hrCookingSlot${slot.id}">
            <span class="np-stall-empty-burner" aria-hidden="true"></span>
            <small>Bếp ${slot.id} · Trống</small>
          </div>`;
        return `
          <div class="cooking-slot-card np-stall-burner" id="hrCookingSlot${slot.id}">
            <div class="np-stall-burner-top">
              ${art('dish',slot.recipe.id,'np-stall-dish-art')}
              <div><strong>${shortDish(slot.recipe.id)}</strong><small class="cook-status-text">Đang nấu</small></div>
            </div>
            <div class="np-stall-cook-meta"><span class="np-stall-cook-percent">0%</span><small>Vùng xanh = chín ngon</small></div>
            <div class="cook-progress-track np-stall-cook-track" role="progressbar" aria-label="Độ chín món ăn" aria-valuemin="0" aria-valuemax="120">
              <span class="np-stall-sweet-spot" aria-hidden="true"></span>
              <span class="cook-progress-bar"></span>
            </div>
            <button type="button" class="btn-cook-action btn-pickup-stove" data-slot="${slot.id}">Nhấc món</button>
          </div>`;
      }).join('');
      for (const slot of cookingSlots) paintCookingSlot(slot);
      el.querySelectorAll('.btn-pickup-stove').forEach(button => {
        button.addEventListener('click', () => {
          pickupFromStove(Number(button.getAttribute('data-slot')));
        });
      });
    }

    function renderTrayUI() {
      const el = container.querySelector('#hrTraySlots');
      if (!el) return;

      let html = '';
      for (let i = 0; i < 4; i++) {
        const item = tray[i];
        html += `
          <div class="tray-box" data-tray-idx="${i}" style="aspect-ratio: 1/1; border: 1.5px solid ${item && item.isPerfect ? '#10B981' : 'var(--border-dark)'}; border-radius: var(--radius-sm); background: var(--bg-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; position: relative;">
            ${item ? `
              <div>${art('dish',item.id,'np-stall-tray-art')}</div>
              ${item.isPerfect ? '<span style="position: absolute; top: 2px; right: 2px; font-size: 0.65rem; background: #10B981; color: #FFF; border-radius: 4px; padding: 1px 3px; font-weight: 800;">⭐</span>' : ''}
              ${item.isUnderCooked ? '<span style="position: absolute; top: 2px; right: 2px; font-size: 0.65rem; background: #F59E0B; color: #FFF; border-radius: 4px; padding: 1px 3px; font-weight: 800;">⚠️</span>' : ''}
            ` : ''}
          </div>
        `;
      }
      el.innerHTML = html;

      el.querySelectorAll('.tray-box').forEach(box => {
        box.addEventListener('click', () => {
          const idx = parseInt(box.getAttribute('data-tray-idx'));
          if (tray[idx]) {
            if (window.NP_Audio) window.NP_Audio.pop();
            else AudioEngine.pop();
            showFeedback(`Đã bỏ ${tray[idx].name} khỏi khay.`);
            tray.splice(idx, 1);
            renderTrayUI();
          }
        });
      });
    }

    function startCookingDish(recipeKey) {
      const recipe = ALL_RECIPES[recipeKey];
      if (!recipe) return;

      // Check ingredients
      if (recipe.requires) {
        for (const [ingId, reqQty] of Object.entries(recipe.requires)) {
          if ((state.inventory[ingId] || 0) < reqQty) {
            if (window.NP_Audio) window.NP_Audio.alarm();
            else AudioEngine.alarm();
            showFeedback(`Thiếu nguyên liệu! Hãy sang "Chợ Đầu Mối" mua thêm.`);
            return;
          }
        }
      }

      // Check available cooking slot
      const emptySlot = cookingSlots.find(s => s.status === 'empty');
      if (!emptySlot) {
        if (window.NP_Audio) window.NP_Audio.alarm();
        else AudioEngine.alarm();
        showFeedback('Cả 3 bếp đều đang nấu! Hãy đợi bếp chín rồi nhấc ra.');
        return;
      }

      // Deduct ingredients
      if (recipe.requires) {
        for (const [ingId, reqQty] of Object.entries(recipe.requires)) {
          state.inventory[ingId] -= reqQty;
        }
      }

      // Start cooking with authentic sizzling sound
      emptySlot.status = 'cooking';
      emptySlot.recipe = recipe;
      emptySlot.progress = 0;
      if (window.NP_Audio) window.NP_Audio.sizzle();
      else AudioEngine.pop();

      const speedMultiplier = state.upgrades.fastStove ? 1.4 : 1.0;
      const intervalMs = 100;
      const stepPct = (100 / (recipe.cookTime / speedMultiplier)) * (intervalMs / 1000);

      emptySlot.timer = setInterval(() => {
        emptySlot.progress += stepPct;
        if (currentTab === 'stall') {
          paintCookingSlot(emptySlot);
        }
        if (emptySlot.progress >= 120) {
          // Completely burnt
          clearInterval(emptySlot.timer);
        }
      }, intervalMs);

      renderCookingSlotsUI();
    }

    function pickupFromStove(slotId) {
      const slot = cookingSlots.find(s => s.id === slotId);
      if (!slot || slot.status === 'empty') return;

      clearInterval(slot.timer);

      if (slot.progress > 102) {
        // Burnt!
        if (window.NP_Audio) window.NP_Audio.explosion(false);
        else AudioEngine.explosion();
        if (window.NP_Juice) window.NP_Juice.screenShake(container, 6, 250);
        if (navigator.vibrate) navigator.vibrate([35, 70]);

        showFeedback(`🔥 Món ${slot.recipe.name} đã bị cháy khét! Phải đổ bỏ.`);
        slot.status = 'empty';
        slot.recipe = null;
        slot.progress = 0;
        renderCookingSlotsUI();
        return;
      }

      if (tray.length >= 4) {
        if (window.NP_Audio) window.NP_Audio.alarm();
        else AudioEngine.alarm();
        if (navigator.vibrate) navigator.vibrate(20);
        showFeedback('Khay đã đầy (4/4 món)! Hãy phục vụ khách trước.');
        return;
      }

      const isPerfect = slot.progress >= 65 && slot.progress <= 92;
      const isUnderCooked = slot.progress < 65;

      tray.push({
        ...slot.recipe,
        isPerfect,
        isUnderCooked
      });

      if (isPerfect) {
        if (window.NP_Audio) {
          window.NP_Audio.coin();
          setTimeout(() => window.NP_Audio.coin(), 100);
        } else {
          AudioEngine.coin();
        }
        if (navigator.vibrate) navigator.vibrate([15, 30, 45]);
        showFeedback(`✨ ${slot.recipe.name} VÀNG GIÒN HOÀN HẢO! Đã lên khay (+50% tip!).`);
      } else if (isUnderCooked) {
        if (window.NP_Audio) window.NP_Audio.pop();
        else AudioEngine.pop();
        if (navigator.vibrate) navigator.vibrate(18);
        showFeedback(`⚠️ ${slot.recipe.name} chưa chín tới! Khách sẽ trừ bớt tiền.`);
      } else {
        if (window.NP_Audio) window.NP_Audio.coin();
        else AudioEngine.coin();
        if (navigator.vibrate) navigator.vibrate(10);
        showFeedback(`Đã nhấc ${slot.recipe.name} lên khay.`);
      }

      slot.status = 'empty';
      slot.recipe = null;
      slot.progress = 0;

      renderCookingSlotsUI();
      renderTrayUI();
    }

    function serveCustomerDirect(custId) {
      const cIdx = customers.findIndex(c => c.id === custId);
      if (cIdx === -1) return;
      const cust = customers[cIdx];

      const trayIdx = tray.findIndex(item => item.id === cust.order.id);
      if (trayIdx === -1) {
        if (window.NP_Audio) window.NP_Audio.alarm();
        else AudioEngine.alarm();
        showFeedback(`Khách cần món ${cust.order.name}, trên khay chưa có!`);
        return;
      }

      const servedItem = tray[trayIdx];
      tray.splice(trayIdx, 1);

      let earnedCoins = cust.order.sellPrice;
      let tip = 0;
      if (servedItem.isPerfect) {
        tip = Math.round(earnedCoins * 0.5); // 50% extra tip!
        earnedCoins += tip;
        state.reputation += 2;
      } else if (servedItem.isUnderCooked) {
        earnedCoins = Math.max(1, Math.round(earnedCoins * 0.8)); // 20% discount
      }

      state.coins += earnedCoins;
      addExp(cust.order.expReward + (servedItem.isPerfect ? 15 : 0));
      customers.splice(cIdx, 1);

      if (window.NP_Audio) window.NP_Audio.coin();
      else AudioEngine.coin();

      showFeedback(`🎉 Phục vụ ${cust.name} thành công! +${earnedCoins} xu ${tip > 0 ? `(Đã gồm ${tip} xu TIP HOÀN HẢO!)` : ''}`);

      renderCustomersList();
      renderTrayUI();
      updateTopHUD();
    }

    // --- TAB 2: CHỢ ĐẦU MỐI (MARKET TAB) ---
    let bargainModalActive = false;
    let bargainAnimId = null;

    function renderMarketTab(viewport) {
      viewport.innerHTML = `
        <div style="background-color: var(--bg-surface); border: 1.5px solid var(--border-dark); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 900; font-family: Calibri, sans-serif;">🛒 Chợ Đầu Mối Vỉa Hè</h3>
              <p style="font-size: 0.78rem; color: var(--text-muted); font-family: Calibri, sans-serif;">Nhập nguồn nguyên liệu giá sỉ để chế biến các món ăn thơm ngon.</p>
            </div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #B45309; font-family: Calibri, sans-serif;">
              🪙 Vốn khả dụng: <strong>${state.coins} xu</strong>
            </div>
          </div>

          <!-- SWEET SPOT BARGAIN MODAL -->
          <div id="hrBargainModal" style="display: none; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.94); border-radius: var(--radius-md); z-index: 20; flex-direction: column; align-items: center; justify-content: center; padding: 18px; text-align: center;">
            <div style="font-size: 1.8rem; margin-bottom: 4px;" id="hrBargainIcon">🤝</div>
            <h4 style="font-size: 1.1rem; color: #FEF08A; font-weight: 900; margin-bottom: 4px; font-family: Calibri, sans-serif;" id="hrBargainTitle">MẶC CẢ GIÁ SỈ</h4>
            <p style="font-size: 0.8rem; color: #CBD5E1; margin-bottom: 14px; max-width: 380px; font-family: Calibri, sans-serif;">Bấm dừng đúng <strong>vùng màu XANH LÁ</strong> để thuyết phục tiểu thương giảm 30% giá vốn vĩnh viễn!</p>
            
            <div style="width: 100%; max-width: 360px; height: 26px; background: #1E293B; border: 2px solid #64748B; border-radius: 13px; position: relative; overflow: hidden; margin-bottom: 16px;">
              <!-- Target Sweet Spot Zone (40% -> 65%) -->
              <div style="position: absolute; left: 40%; width: 25%; height: 100%; background: #10B981; opacity: 0.85;"></div>
              <!-- Moving Pointer -->
              <div id="hrBargainPointer" style="position: absolute; top: 0; bottom: 0; width: 6px; background: #EF4444; border-radius: 3px; box-shadow: 0 0 8px #EF4444; left: 0%; transform: translateX(-50%);"></div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button id="hrBargainStopBtn" style="padding: 8px 24px; font-size: 0.95rem; font-weight: 900; background: linear-gradient(135deg, #10B981, #059669); color: #FFF; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); font-family: Calibri, sans-serif;">🎯 CHỐT GIÁ NGAY! (Space)</button>
              <button id="hrBargainCancelBtn" style="padding: 8px 14px; font-size: 0.85rem; font-weight: 700; background: #475569; color: #FFF; border: none; border-radius: 8px; cursor: pointer; font-family: Calibri, sans-serif;">Hủy</button>
            </div>
          </div>

          <div class="market-grid">
            ${MARKET_ITEMS.map(item => {
              const currentStock = state.inventory[item.id] || 0;
              const isDiscounted = !!state.bargainedDiscounts[item.id];
              const effectivePrice = isDiscounted ? Math.max(1, Math.round(item.basePrice * 0.7)) : item.basePrice;

              return `
                <div class="market-item-card">
                  <div class="market-item-header">
                    <div class="market-item-icon">${art('ingredient',item.id,'np-stall-ingredient-art')}</div>
                    <div>
                      <div class="market-item-title" style="font-family: Calibri, sans-serif;">${item.name}</div>
                      <div class="market-item-stock" style="font-family: Calibri, sans-serif;">Tồn kho: <strong>${currentStock}</strong> cái/phần</div>
                    </div>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-family: Calibri, sans-serif;">${item.desc}</div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; flex-wrap: wrap; gap: 4px;">
                    <div>
                      ${isDiscounted ? `
                        <span class="market-item-price" style="color: #10B981; font-weight: 900; font-family: Calibri, sans-serif;">${effectivePrice} xu <span style="font-size: 0.65rem; background: #10B981; color: #FFF; padding: 1px 4px; border-radius: 3px;">-30%</span></span>
                      ` : `
                        <span class="market-item-price" style="font-family: Calibri, sans-serif;">${item.basePrice} xu / cái</span>
                      `}
                    </div>
                    <div class="market-buy-controls" style="display: flex; align-items: center; gap: 4px;">
                      ${!isDiscounted ? `
                        <button class="btn-market-bargain" data-bargain-item="${item.id}" style="padding: 3px 8px; font-size: 0.74rem; background: #8B5CF6; color: #FFF; border: none; border-radius: 4px; font-weight: 800; cursor: pointer; font-family: Calibri, sans-serif;">🤝 Mặc cả</button>
                      ` : ''}
                      <button class="btn-market-buy" data-buy-item="${item.id}" data-qty="1">+1</button>
                      <button class="btn-market-buy" data-buy-item="${item.id}" data-qty="5">+5</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Interactive Sweet Spot Bargain Handlers
      const bModal = viewport.querySelector('#hrBargainModal');
      const bPointer = viewport.querySelector('#hrBargainPointer');
      const bStopBtn = viewport.querySelector('#hrBargainStopBtn');
      const bCancelBtn = viewport.querySelector('#hrBargainCancelBtn');
      const bTitle = viewport.querySelector('#hrBargainTitle');
      const bIcon = viewport.querySelector('#hrBargainIcon');

      let currentBargainItem = null;
      let pointerPos = 0;
      let pointerDir = 1;
      let pointerSpeed = 1.6;

      function updateBargainLoop() {
        if (!bargainModalActive) return;
        pointerPos += pointerDir * pointerSpeed;
        if (pointerPos >= 100) {
          pointerPos = 100;
          pointerDir = -1;
        } else if (pointerPos <= 0) {
          pointerPos = 0;
          pointerDir = 1;
        }
        if (bPointer) bPointer.style.left = `${pointerPos}%`;
        bargainAnimId = requestAnimationFrame(updateBargainLoop);
      }

      function stopBargainAttempt() {
        if (!bargainModalActive || !currentBargainItem) return;
        bargainModalActive = false;
        cancelAnimationFrame(bargainAnimId);
        if (bModal) bModal.style.display = 'none';

        // Sweet spot zone: 40% to 65%
        const isSweetSpot = pointerPos >= 40 && pointerPos <= 65;
        if (isSweetSpot) {
          state.bargainedDiscounts[currentBargainItem.id] = true;
          if (window.NP_Audio) window.NP_Audio.win();
          else AudioEngine.coin();
          if (navigator.vibrate) navigator.vibrate([20, 40, 80]);
          showFeedback(`🎉 TUYỆT VỜI! Mặc cả thành công! ${currentBargainItem.name} được giảm 30% giá vốn vĩnh viễn!`);
        } else {
          if (window.NP_Audio) window.NP_Audio.thud(110);
          else AudioEngine.alarm();
          if (navigator.vibrate) navigator.vibrate(25);
          showFeedback(`😅 Trượt vùng xanh! Tiểu thương lắc đầu: "Bán thế lỗ vốn cháu ơi, kịch sàn rồi!"`);
        }
        saveState();
        renderMarketTab(viewport);
      }

      if (bStopBtn) bStopBtn.addEventListener('click', stopBargainAttempt);
      if (bCancelBtn) {
        bCancelBtn.addEventListener('click', () => {
          bargainModalActive = false;
          cancelAnimationFrame(bargainAnimId);
          if (bModal) bModal.style.display = 'none';
        });
      }

      viewport.querySelectorAll('.btn-market-bargain').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.getAttribute('data-bargain-item');
          const item = MARKET_ITEMS.find(m => m.id === itemId);
          if (!item || state.bargainedDiscounts[itemId]) return;

          currentBargainItem = item;
          bargainModalActive = true;
          pointerPos = 0;
          pointerDir = 1;
          if (bTitle) bTitle.textContent = `MẶC CẢ: ${item.name.toUpperCase()}`;
          if (bIcon) bIcon.textContent = item.icon;
          if (bModal) bModal.style.display = 'flex';
          bargainAnimId = requestAnimationFrame(updateBargainLoop);
        });
      });

      // Buy Buttons
      viewport.querySelectorAll('.btn-market-buy').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.getAttribute('data-buy-item');
          const qty = parseInt(btn.getAttribute('data-qty'));
          const item = MARKET_ITEMS.find(m => m.id === itemId);
          if (!item) return;

          const isDiscounted = !!state.bargainedDiscounts[itemId];
          const unitPrice = isDiscounted ? Math.max(1, Math.round(item.basePrice * 0.7)) : item.basePrice;
          const totalCost = unitPrice * qty;

          if (state.coins < totalCost) {
            AudioEngine.alarm();
            if (navigator.vibrate) navigator.vibrate(20);
            showFeedback('Không đủ tiền vốn để nhập số lượng này!');
            return;
          }

          state.coins -= totalCost;
          state.inventory[itemId] = (state.inventory[itemId] || 0) + qty;
          AudioEngine.coin();
          if (navigator.vibrate) navigator.vibrate(8);
          showFeedback(`Đã nhập +${qty} ${item.name} (-${totalCost} xu)!`);
          saveState();
          renderMarketTab(viewport);
          updateTopHUD();
        });
      });
    }

    // --- TAB 3: TIỆM NÂNG CẤP (UPGRADES TAB) ---
    function renderUpgradesTab(viewport) {
      viewport.innerHTML = `
        <div style="background-color: var(--bg-surface); border: 1.5px solid var(--border-dark); border-radius: var(--radius-md); padding: 14px;">
          <h3 style="font-size: 1.05rem; font-weight: 900; margin-bottom: 4px;">🛠️ Tiệm Dụng Cụ & Trang Bị Vỉa Hè</h3>
          <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 14px;">Đầu tư trang bị giúp quầy hàng bán nhanh hơn, phục vụ đông khách và né rủi ro đường phố.</p>

          <div class="upgrades-list-grid">
            ${UPGRADES_LIST.map(up => {
              const isPurchased = !!state.upgrades[up.id];
              return `
                <div class="upgrade-card" style="${isPurchased ? 'opacity: 0.85; border-color: #10B981;' : ''}">
                  <div class="upgrade-header">
                    <span class="upgrade-icon">${art('upgrade',up.id,'np-stall-upgrade-art')}</span>
                    <div class="upgrade-info">
                      <h4>${up.name}</h4>
                      <p>${up.desc}</p>
                    </div>
                  </div>
                  <div class="upgrade-footer">
                    <span class="upgrade-cost">${isPurchased ? '✅ Đã sở hữu' : `${up.cost} xu`}</span>
                    <button class="btn btn-primary btn-buy-upgrade" data-up-id="${up.id}" ${isPurchased ? 'disabled' : ''} style="padding: 6px 12px; font-size: 0.82rem;">
                      ${isPurchased ? 'Đã lắp đặt' : 'Mua ngay'}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      viewport.querySelectorAll('.btn-buy-upgrade').forEach(btn => {
        btn.addEventListener('click', () => {
          const upId = btn.getAttribute('data-up-id');
          const up = UPGRADES_LIST.find(u => u.id === upId);
          if (!up || state.upgrades[upId]) return;

          if (state.coins < up.cost) {
            AudioEngine.alarm();
            showFeedback('Bạn chưa tích đủ xu để mua trang bị này!');
            return;
          }

          state.coins -= up.cost;
          state.upgrades[upId] = true;
          AudioEngine.win();
          showFeedback(`✨ Chúc mừng bạn đã sở hữu ${up.name}!`);
          saveState();
          renderUpgradesTab(viewport);
          updateTopHUD();
        });
      });
    }

    // --- TAB 4: CẨM NANG & CẤP ĐỘ (HANDBOOK TAB) ---
    function renderHandbookTab(viewport) {
      viewport.innerHTML = `
        <div style="background-color: var(--bg-surface); border: 1.5px solid var(--border-dark); border-radius: var(--radius-md); padding: 16px;">
          <h3 style="font-size: 1.05rem; font-weight: 900; margin-bottom: 6px;">📜 Lộ Trình Tăng Tiến Hàng Rong</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">Theo dõi cột mốc phát triển sự nghiệp kinh doanh vỉa hè của bạn.</p>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${STAGES.map((s, idx) => {
              const isCurrent = idx === state.stageIndex;
              const isUnlocked = idx <= state.stageIndex;
              return `
                <div style="padding: 12px; border-radius: var(--radius-sm); border: 1.5px solid ${isCurrent ? 'var(--accent-lime)' : 'var(--border-medium)'}; background: ${isCurrent ? '#F7FEE7' : (isUnlocked ? 'var(--bg-surface)' : 'var(--bg-surface-soft)')}; opacity: ${isUnlocked ? 1 : 0.6};">
                  <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 0.9rem;">
                    <span>${isUnlocked ? '🔓' : '🔒'} ${s.name}</span>
                    <span style="font-size: 0.78rem; color: #78350F;">${s.location}</span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">${s.desc}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--border-medium); display: flex; justify-content: space-between; align-items: center;">
            <button class="btn btn-secondary" id="hrResetSaveBtn" style="font-size: 0.78rem; color: #EF4444;">
              Đặt lại tiến trình mới
            </button>
            <span style="font-size: 0.78rem; color: var(--text-muted);">Tự động lưu dữ liệu an toàn vào máy của bạn</span>
          </div>
        </div>
      `;

      const resetBtn = viewport.querySelector('#hrResetSaveBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          localStorage.removeItem(STORAGE_KEY);
          clearInterval(mainLoopInterval);
          showFeedback('Đã đặt lại tiến trình Hàng Rong về Cấp 1!');
          launchHangRong(container, game);
        });
      }
    }

    // --- GAME ENGINE HEARTBEAT & STREET EVENTS ---
    const customerAvatars = [
      { name: 'Cậu Học Sinh', avatar: '🎒' },
      { name: 'Cô Công Sở', avatar: '👩‍💼' },
      { name: 'Bác Xe Ôm', avatar: '🛵' },
      { name: 'Chị Đi Chợ', avatar: '🧺' },
      { name: 'Food Reviewer VIP', avatar: '🕶️' }
    ];

    mainLoopInterval = setInterval(() => {
      // 1. Customer arrival
      const maxCust = state.upgrades.extraChair ? 4 : 2;
      const arrivalRate = state.upgrades.speaker ? 0.45 : 0.25;

      if (customers.length < maxCust && Math.random() < arrivalRate) {
        const availableRecipes = STAGES[state.stageIndex].recipes;
        const rKey = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
        const avatar = customerAvatars[Math.floor(Math.random() * customerAvatars.length)];

        customers.push({
          id: Date.now() + Math.random(),
          name: avatar.name,
          avatar: avatar.avatar,
          order: ALL_RECIPES[rKey],
          patience: 100,
          maxPatience: 100
        });

        if (currentTab === 'stall') { renderCustomersList(); drawStreetScene(); }
      }

      // 2. Customer patience decay
      for (let i = customers.length - 1; i >= 0; i--) {
        customers[i].patience -= 1.8;
        if (customers[i].patience <= 0) {
          showFeedback(`😢 ${customers[i].name} chờ quá lâu nên đã bỏ đi!`);
          state.reputation = Math.max(0, state.reputation - 1);
          customers.splice(i, 1);
          if (currentTab === 'stall') { renderCustomersList(); drawStreetScene(); }
        }
      }
      if (currentTab === 'stall') { renderCustomersList(); drawStreetScene(); }

      // 3. Random Street Events (Đô thị đi tuần, Trời mưa)
      if (!emergencyAlert && Math.random() < 0.03) {
        triggerStreetEvent();
      }

      // 4. Emergency Alert countdown
      if (emergencyAlert) {
        emergencyAlert.timeRemaining -= 1;
        const timerEl = container.querySelector('#hrAlertTimer');
        if (timerEl) timerEl.textContent = emergencyAlert.timeRemaining;

        if (emergencyAlert.timeRemaining <= 0) {
          // Failed to flee in time!
          if (emergencyAlert.type === 'police') {
            const fine = Math.round(state.coins * 0.25);
            state.coins = Math.max(0, state.coins - fine);
            state.reputation = Math.max(0, state.reputation - 3);

            if (window.NP_Audio) window.NP_Audio.explosion(true);
            else AudioEngine.alarm();
            if (window.NP_Juice) window.NP_Juice.screenShake(container, 14, 400);

            showFeedback(`🚨 Không kịp dọn gánh! Bị Đội Trật Tự lập biên bản phạt ${fine} xu (-3 Danh vọng)!`);
          } else if (emergencyAlert.type === 'bully') {
            const stolen = Math.min(state.coins, 15);
            state.coins -= stolen;
            state.reputation = Math.max(0, state.reputation - 2);
            if (window.NP_Audio) window.NP_Audio.thud(120);
            showFeedback(`🏃 Kẻ ăn quỵt đã thó mất ${stolen} xu rồi biến mất vào dòng người!`);
          }
          dismissStreetEvent();
        }
      }
    }, 1000);

    function triggerStreetEvent() {
      // 45% Police patrol, 30% Bully thief, 25% Rain
      const roll = Math.random();
      if (roll < 0.45) {
        emergencyAlert = { type: 'police', timeRemaining: 4 };
        if (window.NP_Audio) {
          window.NP_Audio.alarm();
          setTimeout(() => window.NP_Audio.alarm(), 180);
        } else {
          AudioEngine.alarm();
        }
        if (window.NP_Juice) window.NP_Juice.screenShake(container, 8, 300);

        const banner = container.querySelector('#hrEmergencyBanner');
        const text = container.querySelector('#hrAlertText');
        const fBtn = container.querySelector('#hrFleeBtn');
        if (banner && text && fBtn) {
          text.textContent = '🚨 CẢNH BÁO ĐÔ THỊ ĐI TUẦN! DỌN ĐỒ NGAY!';
          fBtn.innerHTML = '🏃 DỌN GÁNH TẨU THOÁT! (<span id="hrAlertTimer">4</span>s)';
          banner.style.display = 'flex';
        }
      } else if (roll < 0.75) {
        // Street Bully / Ăn quỵt reflex event
        emergencyAlert = { type: 'bully', timeRemaining: 4 };
        if (window.NP_Audio) window.NP_Audio.alarm();
        if (window.NP_Juice) window.NP_Juice.screenShake(container, 8, 300);

        const banner = container.querySelector('#hrEmergencyBanner');
        const text = container.querySelector('#hrAlertText');
        const fBtn = container.querySelector('#hrFleeBtn');
        if (banner && text && fBtn) {
          text.textContent = '🩴 KẺ ĂN QUỴT ĐỊNH THÓ ĐỒ CHẠY! NÉM DÉP CHẶN LẠI!';
          fBtn.innerHTML = '🩴 NÉM DÉP TỔ ONG! (<span id="hrAlertTimer">4</span>s)';
          banner.style.display = 'flex';
        }
      } else if (!state.upgrades.umbrella) {
        // Rain without umbrella
        if (window.NP_Audio) window.NP_Audio.thud(60);
        else AudioEngine.alarm();
        showFeedback('🌧️ Trời đổ mưa rào bất chợt! Toàn bộ khách bỏ chạy ướt áo!');
        customers = [];
        if (currentTab === 'stall') { renderCustomersList(); drawStreetScene(); }
      } else {
        // Rain protected by umbrella
        if (window.NP_Audio) window.NP_Audio.clack();
        showFeedback('⛱️ Mưa rào trút xuống nhưng Bạt Dù đã bung ra! Khách vẫn ngồi nhâm nhi ấm cúng!');
      }
    }

    function dismissStreetEvent() {
      emergencyAlert = null;
      const banner = container.querySelector('#hrEmergencyBanner');
      if (banner) banner.style.display = 'none';
      updateTopHUD();
    }

    function handleFleeAction() {
      if (!emergencyAlert) return;
      if (emergencyAlert.type === 'bully') {
        state.coins += 20;
        state.reputation += 3;
        if (window.NP_Audio) {
          window.NP_Audio.splat();
          setTimeout(() => window.NP_Audio.win(), 120);
        } else {
          AudioEngine.win();
        }
        if (navigator.vibrate) navigator.vibrate([20, 50, 80]);
        showFeedback('🩴 BỐP! Ném chiếc dép tổ ong trúng phóc! Kẻ quậy phá ôm đầu xin lỗi và trả lại 20 xu (+3 Danh vọng)!');
      } else {
        state.reputation += 2;
        if (window.NP_Audio) window.NP_Audio.win();
        else AudioEngine.win();
        if (navigator.vibrate) navigator.vibrate([20, 40]);
        showFeedback('🏃 Nhanh như chớp! Đã dọn đồ tẩu thoát an toàn vào trong ngõ (+2 Danh vọng)!');
      }
      dismissStreetEvent();
    }

    const fleeBtn = container.querySelector('#hrFleeBtn');
    if (fleeBtn) fleeBtn.addEventListener('click', handleFleeAction);

    // Global Key Listener for Spacebar Fleeing
    const onHangRongKey = (e) => {
      if (e.code === 'Space') {
        if (emergencyAlert) {
          e.preventDefault();
          handleFleeAction();
        }
      }
    };
    listen(window, 'keydown', onHangRongKey);

    // Initial render
    renderCurrentTab();

    // 60FPS Dynamic Render Loop for Street Canvas
    let hrAnimId = null;
    function hrRenderLoop() {
      if (currentTab === 'stall') {
        drawStreetScene();
      }
      hrAnimId = requestAnimationFrame(hrRenderLoop);
    }
    hrAnimId = requestAnimationFrame(hrRenderLoop);

    // Preserve progress when this game session ends
    onCleanup(() => {
      if (hrAnimId) cancelAnimationFrame(hrAnimId);
      if (bargainAnimId) cancelAnimationFrame(bargainAnimId);
      clearInterval(mainLoopInterval);
      cookingSlots.forEach(s => clearInterval(s.timer));
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') {
        window.NP_Audio.stopBGM();
      }
      saveState();
    });
  }

  // =========================================================================
  // 2. ENGINE: ĐÀO VÀNG (GOLD MINER CANVAS 2D PHYSICS ENGINE)
  // =========================================================================
  function launchDaoVang(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    const HIGH_SCORE_KEY = 'np_daovang_high_score';
    let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0');

    let stage = 1;
    let score = 0;
    let targetScore = 650;
    let timeLeft = 60;
    let dynamites = 2;
    let powerDrinkActive = false;
    let cloverActive = false;
    let diamondBookActive = false;
    let rockBookActive = false;
    let gameState = 'intro'; // 'intro', 'playing', 'shop', 'gameover'
    let animId = null;
    let lastTime = performance.now();

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('daovang');
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="font-family: 'Calibri', -apple-system, sans-serif;">
        <div class="canvas-game-hud">
          <div class="hud-pill">Mục tiêu: <span id="dvTarget" style="color: #F59E0B; font-weight: 900;">$${targetScore}</span></div>
          <div class="hud-pill">Tiền: <span id="dvScore" style="color: #10B981; font-weight: 900;">$${score}</span></div>
          <div class="hud-pill">Thời gian: <span id="dvTime" style="font-weight: 900;">${timeLeft}</span>s</div>
          <div class="hud-pill">Dynamite: <span id="dvDynamite" style="color: #EF4444; font-weight: 900;">${dynamites}</span></div>
          <div class="hud-pill">Màn: <span id="dvStage" style="font-weight: 900;">${stage}</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="dvCanvas" width="640" height="420" class="canvas-main-viewport" style="background: #1E293B; border-radius: 8px;"></canvas>

          <!-- 1. INTRO OVERLAY -->
          <div class="game-stage-overlay" id="dvIntroOverlay">
            <div class="intro-modal-card">
              <div class="intro-hero-wrapper">
                <img src="assets/daovang_intro.jpg" alt="Đào Vàng Cổ Điển" class="intro-hero-img">
                <div class="intro-hero-overlay">
                  <span class="intro-badge">Châu Á 2003</span>
                  <h3 class="intro-title">Đào Vàng Cổ Điển - Gold Miner</h3>
                </div>
              </div>
              <div class="intro-content">
                <p class="intro-desc">Bác thợ mỏ già trên vách núi đá hoang sơ, quay cỗ máy ròng rọc tời cáp. Thả ngàm chuẩn xác gắp các khối vàng ròng lấp lánh, túi quà may mắn và kim cương trước khi đồng hồ điểm 0!</p>
                <div class="intro-controls-box">
                  <div class="intro-control-row">
                    <span class="intro-key">Phím [↓] / Chạm</span>
                    <span>Thả mỏ neo gắp vàng ròng, túi quà bí mật và kim cương</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Phím [↑] / Nút Bom</span>
                    <span>Ném nổ thỏi Dynamite phá hủy ngay đá tảng nặng nề</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Cửa Hàng Tạp Hóa</span>
                    <span>Mua Nước Tăng Lực (kéo siêu tốc), Cỏ 4 Lá (túi quà xịn), Sách Kim Cương</span>
                  </div>
                </div>
                <div class="intro-actions">
                  <button class="btn-intro-start" id="dvStartGameBtn">Bắt đầu đào vàng (Màn 1)</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. SHOP OVERLAY -->
          <div id="dvShopOverlay" style="display: none; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.95); border-radius: 8px; z-index: 10; padding: 18px; color: #FFF; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="text-align: center; margin-bottom: 12px;">
                <h3 style="font-size: 1.3rem; color: #FBBF24; font-weight: 900; margin: 0;">HOÀN THÀNH MÀN!</h3>
                <p style="font-size: 0.85rem; color: #94A3B8; margin: 4px 0 0 0;" id="dvShopSubtitle">Vào tiệm tạp hóa mua trang bị hỗ trợ cho màn tiếp theo:</p>
                <div style="font-size: 1rem; color: #10B981; font-weight: 800; margin-top: 4px;">Số tiền hiện có: $<span id="dvShopCurrentMoney">0</span></div>
              </div>
              <div id="dvShopItemsGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; max-height: 240px; overflow-y: auto;">
                <!-- Rendered dynamically -->
              </div>
            </div>
            <div style="text-align: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
              <button class="btn btn-primary" id="dvNextStageBtn" style="padding: 10px 24px; font-size: 0.95rem; font-weight: 900; background: #F59E0B; border: none; cursor: pointer; border-radius: 6px;">
                Tiếp tục sang Màn kế tiếp ➔
              </button>
            </div>
          </div>
        </div>

        <div class="canvas-controls-bar">
          <div style="font-size: 0.8rem; color: #FFF;">
            Điều khiển: Phím <strong>[↓]</strong> hoặc <strong>Chạm màn hình</strong> để gắp | Phím <strong>[↑]</strong> để nổ Dynamite
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-canvas-action" id="dvFireClawBtn">Thả ngàm</button>
            <button class="btn-canvas-action" id="dvUseBombBtn" style="background-color: #EF4444; color: #FFF;">Ném bom</button>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#dvCanvas');
    const ctx = canvas.getContext('2d');
    const shopOverlay = container.querySelector('#dvShopOverlay');
    const introOverlay = container.querySelector('#dvIntroOverlay');
    const startBtn = container.querySelector('#dvStartGameBtn');
    const fireBtn = container.querySelector('#dvFireClawBtn');
    const bombBtn = container.querySelector('#dvUseBombBtn');

    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

    // Claw Physics
    const origin = { x: 320, y: 50 };
    let angle = 0;
    let angleDir = 1;
    const baseAngleSpeed = 0.024; // calibrated for 60fps classic cadence
    const maxAngle = Math.PI * 0.42;

    let clawState = 'swinging'; // 'swinging', 'shooting', 'rewinding'
    let clawLength = 40;
    const minClawLength = 40;
    const baseShootSpeed = 5.5; // calibrated 60fps
    let rewindSpeed = 5.0;
    let caughtItem = null;
    let slidingDynamite = null; // { progress: 0 }
    let winchFrame = 0;

    let minerals = [];
    let mice = [];

    function generateMineralsForStage(stg) {
      minerals = [];
      mice = [];
      targetScore = 600 + stg * 480;
      timeLeft = 60;
      clawState = 'swinging';
      clawLength = minClawLength;
      caughtItem = null;
      slidingDynamite = null;
      gameState = 'playing';
      if (shopOverlay) shopOverlay.style.display = 'none';
      updateHUD();

      // Big Gold
      for (let i = 0; i < 2; i++) {
        minerals.push({
          type: 'big_gold',
          x: 70 + Math.random() * 500,
          y: 160 + Math.random() * 190,
          radius: 28,
          value: 500,
          weight: 4.8,
          color: '#F59E0B'
        });
      }

      // Medium Gold
      for (let i = 0; i < 3; i++) {
        minerals.push({
          type: 'med_gold',
          x: 50 + Math.random() * 540,
          y: 140 + Math.random() * 210,
          radius: 19,
          value: 250,
          weight: 2.8,
          color: '#FBBF24'
        });
      }

      // Small Gold
      for (let i = 0; i < 4; i++) {
        minerals.push({
          type: 'small_gold',
          x: 40 + Math.random() * 560,
          y: 120 + Math.random() * 240,
          radius: 12,
          value: 100,
          weight: 1.4,
          color: '#FDE047'
        });
      }

      // Heavy Rocks
      for (let i = 0; i < 3 + Math.min(4, stg); i++) {
        const isBigRock = Math.random() < 0.4;
        minerals.push({
          type: isBigRock ? 'big_rock' : 'small_rock',
          x: 40 + Math.random() * 560,
          y: 150 + Math.random() * 220,
          radius: isBigRock ? 26 : 16,
          value: rockBookActive ? 150 : (isBigRock ? 20 : 10),
          weight: isBigRock ? 6.5 : 4.0,
          color: '#64748B'
        });
      }

      // Diamonds
      const diaCount = Math.random() < 0.7 ? 2 : 1;
      for (let i = 0; i < diaCount; i++) {
        minerals.push({
          type: 'diamond',
          x: 80 + Math.random() * 480,
          y: 200 + Math.random() * 180,
          radius: 10,
          value: diamondBookActive ? 900 : 600,
          weight: 1.0,
          color: '#38BDF8'
        });
      }

      // Mystery Grab Bags
      for (let i = 0; i < 2; i++) {
        const bagVal = cloverActive ? (400 + Math.floor(Math.random() * 400)) : (50 + Math.floor(Math.random() * 750));
        const bagWeight = 1.0 + Math.random() * 4.0;
        minerals.push({
          type: 'bag',
          x: 60 + Math.random() * 520,
          y: 170 + Math.random() * 200,
          radius: 16,
          value: bagVal,
          weight: bagWeight,
          color: '#D97706'
        });
      }

      // Running Diamond Mice
      if (stg >= 2) {
        mice.push({
          x: 40,
          y: 350,
          vx: 1.4,
          hasDiamond: true,
          radius: 12,
          value: diamondBookActive ? 950 : 650,
          weight: 1.2
        });
      }
    }

    function updateHUD() {
      const tEl = container.querySelector('#dvTarget');
      const sEl = container.querySelector('#dvScore');
      const timeEl = container.querySelector('#dvTime');
      const dEl = container.querySelector('#dvDynamite');
      const stEl = container.querySelector('#dvStage');
      if (tEl) tEl.textContent = `$${targetScore}`;
      if (sEl) sEl.textContent = `$${score}`;
      if (timeEl) timeEl.textContent = `${timeLeft}`;
      if (dEl) dEl.textContent = `${dynamites}`;
      if (stEl) stEl.textContent = `${stage}`;
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        introOverlay.style.display = 'none';
        gameState = 'playing';
        generateMineralsForStage(1);
      });
    }

    function fireClaw() {
      if (gameState !== 'playing') return;
      if (clawState === 'swinging') {
        clawState = 'shooting';
        if (window.NP_Juice) NP_Juice.vibrate.light();
        if (window.NP_Audio) window.NP_Audio.pop();
      }
    }

    function useDynamite() {
      if (gameState !== 'playing') return;
      if (clawState === 'rewinding' && caughtItem && dynamites > 0 && !slidingDynamite) {
        dynamites--;
        slidingDynamite = { progress: 0 };
        if (window.NP_Juice) NP_Juice.vibrate.medium();
        updateHUD();
      }
    }

    if (fireBtn) fireBtn.addEventListener('click', fireClaw);
    if (bombBtn) bombBtn.addEventListener('click', useDynamite);

    const keyHandler = (e) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowDown' || e.key === 's') fireClaw();
      if (e.key === 'ArrowUp' || e.key === 'w') useDynamite();
    };
    listen(window, 'keydown', keyHandler);

    canvas.addEventListener('click', (e) => {
      if (gameState === 'playing' && clawState === 'swinging') {
        fireClaw();
      }
    });

    canvas.addEventListener('touchstart', (e) => {
      if (gameState === 'playing' && clawState === 'swinging') {
        e.preventDefault();
        fireClaw();
      }
    }, { passive: false });

    // Second Timer Interval
    const timerInterval = setInterval(() => {
      if (gameState === 'playing') {
        timeLeft--;
        updateHUD();
        if (timeLeft <= 0) {
          if (score >= targetScore) {
            stage++;
            powerDrinkActive = false;
            cloverActive = false;
            diamondBookActive = false;
            rockBookActive = false;
            openShop();
          } else {
            gameOverScreen();
          }
        }
      }
    }, 1000);

    function openShop() {
      gameState = 'shop';
      if (window.NP_Audio) window.NP_Audio.win();
      const shopGrid = container.querySelector('#dvShopItemsGrid');
      const currentMoneyEl = container.querySelector('#dvShopCurrentMoney');
      const nextBtn = container.querySelector('#dvNextStageBtn');
      if (currentMoneyEl) currentMoneyEl.textContent = score;

      const shopItems = [
        { id: 'dynamite', name: '🧨 Thuốc nổ Dynamite', desc: 'Thêm 1 quả phá đá nhanh', price: 150, buy: () => { dynamites++; } },
        { id: 'power', name: '🥤 Nước tăng lực', desc: 'Kéo vật thể nhanh gấp đôi', price: 200, buy: () => { powerDrinkActive = true; } },
        { id: 'clover', name: '🍀 Cỏ 4 lá', desc: 'Túi bí mật toàn tiền khủng', price: 100, buy: () => { cloverActive = true; } },
        { id: 'diabook', name: '💎 Sách kim cương', desc: 'Kim cương tăng giá $900', price: 250, buy: () => { diamondBookActive = true; } },
        { id: 'rockbook', name: '🪨 Sách thẩm định đá', desc: 'Đá vụn bán được $150', price: 50, buy: () => { rockBookActive = true; } }
      ];

      function renderShopCards() {
        if (!shopGrid) return;
        shopGrid.innerHTML = shopItems.map(item => `
          <div style="background: rgba(30, 41, 59, 0.85); border: 1.5px solid #334155; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; text-align: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.9rem; color: #FFF;">${item.name}</div>
              <div style="font-size: 0.74rem; color: #94A3B8; margin: 4px 0;">${item.desc}</div>
              <div style="font-size: 0.88rem; font-weight: 900; color: #F59E0B;">$${item.price}</div>
            </div>
            <button class="btn-buy-shop-item" data-id="${item.id}" style="margin-top: 8px; padding: 5px 10px; font-size: 0.78rem; font-weight: 800; background: ${score >= item.price ? '#10B981' : '#475569'}; color: #FFF; border: none; border-radius: 4px; cursor: ${score >= item.price ? 'pointer' : 'not-allowed'};" ${score >= item.price ? '' : 'disabled'}>
              ${score >= item.price ? 'Mua ngay' : 'Không đủ $'}
            </button>
          </div>
        `).join('');

        shopGrid.querySelectorAll('.btn-buy-shop-item').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.getAttribute('data-id');
            const targetItem = shopItems.find(it => it.id === id);
            if (targetItem && score >= targetItem.price) {
              score -= targetItem.price;
              targetItem.buy();
              if (window.NP_Audio) window.NP_Audio.coin();
              if (currentMoneyEl) currentMoneyEl.textContent = score;
              updateHUD();
              renderShopCards();
            }
          });
        });
      }

      renderShopCards();
      if (shopOverlay) shopOverlay.style.display = 'flex';

      if (nextBtn) {
        nextBtn.onclick = () => {
          generateMineralsForStage(stage);
        };
      }
    }

    function gameOverScreen() {
      gameState = 'gameover';
      if (window.NP_Audio) window.NP_Audio.explosion();
      if (score > highScore) {
        highScore = score;
        localStorage.setItem(HIGH_SCORE_KEY, highScore.toString());
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 28px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER - CHƯA ĐẠT MỤC TIÊU!', canvas.width / 2, 160);

      ctx.fillStyle = '#FFF';
      ctx.font = '18px Calibri, sans-serif';
      ctx.fillText(`Tổng điểm kiếm được: $${score} (Kỷ lục: $${highScore})`, canvas.width / 2, 210);
      ctx.fillText('Bấm vào màn hình để chơi lại từ Màn 1!', canvas.width / 2, 250);

      const restartHandler = () => {
        canvas.removeEventListener('click', restartHandler);
        stage = 1;
        score = 0;
        dynamites = 2;
        powerDrinkActive = false;
        cloverActive = false;
        diamondBookActive = false;
        rockBookActive = false;
        generateMineralsForStage(1);
        gameState = 'playing';
      };
      setTimeout(() => canvas.addEventListener('click', restartHandler), 500);
    }

    // Main Game Render Loop with 60 FPS Delta-Time
    function render(now) {
      if (!now) now = performance.now();
      const dtMs = Math.min(64, now - lastTime);
      lastTime = now;
      const dtRatio = Math.min(2.5, dtMs / 16.67);

      if (gameState === 'playing') {
        // 1. Update Claw with Delta-Time
        if (clawState === 'swinging') {
          angle += baseAngleSpeed * angleDir * dtRatio;
          if (angle > maxAngle) {
            angle = maxAngle;
            angleDir = -1;
          } else if (angle < -maxAngle) {
            angle = -maxAngle;
            angleDir = 1;
          }
        } else if (clawState === 'shooting') {
          clawLength += baseShootSpeed * dtRatio;
          const tipX = origin.x + Math.sin(angle) * clawLength;
          const tipY = origin.y + Math.cos(angle) * clawLength;

          // Check Bounds
          if (tipX < 15 || tipX > canvas.width - 15 || tipY > canvas.height - 15) {
            clawState = 'rewinding';
            caughtItem = null;
            rewindSpeed = 7.0;
          } else {
            // Collision with minerals
            for (let i = minerals.length - 1; i >= 0; i--) {
              const m = minerals[i];
              if (Math.hypot(tipX - m.x, tipY - m.y) < m.radius + 10) {
                caughtItem = m;
                minerals.splice(i, 1);
                clawState = 'rewinding';
                rewindSpeed = Math.max(1.4, (8.5 / m.weight)) * (powerDrinkActive ? 2.0 : 1.0);
                if (window.NP_Audio) window.NP_Audio.hit();
                if (window.NP_Juice) {
                  if (m.weight >= 3.5) {
                    NP_Juice.vibrate.heavy();
                    NP_Juice.screenShake(canvas, 5, 120);
                  } else {
                    NP_Juice.vibrate.light();
                  }
                }
                break;
              }
            }

            // Collision with running mice
            if (!caughtItem) {
              for (let i = mice.length - 1; i >= 0; i--) {
                const mouse = mice[i];
                if (Math.hypot(tipX - mouse.x, tipY - mouse.y) < mouse.radius + 10) {
                  caughtItem = mouse;
                  mice.splice(i, 1);
                  clawState = 'rewinding';
                  rewindSpeed = 7.0 * (powerDrinkActive ? 1.6 : 1.0);
                  if (window.NP_Audio) window.NP_Audio.hit();
                  if (window.NP_Juice) NP_Juice.vibrate.light();
                  break;
                }
              }
            }
          }
        } else if (clawState === 'rewinding') {
          // Dynamite sliding
          if (slidingDynamite) {
            slidingDynamite.progress += 0.08 * dtRatio;
            if (slidingDynamite.progress >= 1.0) {
              if (window.NP_Audio) window.NP_Audio.explosion(true);
              if (window.NP_Juice) {
                window.NP_Juice.screenShake(canvas, 12, 280);
                window.NP_Juice.triggerHitstop(50);
              }
              const tipX = origin.x + Math.sin(angle) * clawLength;
              const tipY = origin.y + Math.cos(angle) * clawLength;
              if (particles) particles.burst(tipX, tipY, 20, '#EF4444', 350, 4);
              if (popups) popups.add('💥 PHÁ ĐÁ!', tipX, tipY - 20, '#EF4444', 20);
              caughtItem = null;
              slidingDynamite = null;
              rewindSpeed = 8.5;
            }
          }

          clawLength -= rewindSpeed * dtRatio;
          if (clawLength <= minClawLength) {
            clawLength = minClawLength;
            clawState = 'swinging';

            if (caughtItem) {
              score += caughtItem.value;
              if (window.NP_Audio) window.NP_Audio.coin();
              if (popups) popups.add(`+$${caughtItem.value}`, origin.x, origin.y + 20, '#10B981', 22);
              if (particles) particles.burst(origin.x, origin.y + 10, 10, '#F59E0B', 200, 3);
              caughtItem = null;
              updateHUD();
            }
          }
        }

        // Update Mice
        mice.forEach(m => {
          m.x += m.vx * dtRatio;
          if (m.x > canvas.width - 30) {
            m.x = canvas.width - 30;
            m.vx *= -1;
          } else if (m.x < 30) {
            m.x = 30;
            m.vx *= -1;
          }
        });
      }

      // 2. Render Scene
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Underground Dirt Gradient
      const dirtGrad = ctx.createLinearGradient(0, 65, 0, canvas.height);
      dirtGrad.addColorStop(0, '#78350F');
      dirtGrad.addColorStop(0.3, '#451A03');
      dirtGrad.addColorStop(1, '#1C1917');
      ctx.fillStyle = dirtGrad;
      ctx.fillRect(0, 65, canvas.width, canvas.height - 65);

      // Surface Wood Platform
      ctx.fillStyle = '#92400E';
      ctx.fillRect(0, 55, canvas.width, 14);
      ctx.fillStyle = '#451A03';
      ctx.fillRect(0, 67, canvas.width, 3);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 55);
      skyGrad.addColorStop(0, '#0284C7');
      skyGrad.addColorStop(1, '#38BDF8');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 55);

      // Miner & Mechanical Winch
      const tipX = origin.x + Math.sin(angle) * clawLength;
      const tipY = origin.y + Math.cos(angle) * clawLength;

      // Miner Body & Hat
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.arc(origin.x - 30, 42, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F59E0B'; // Miner yellow hard hat
      ctx.beginPath();
      ctx.ellipse(origin.x - 30, 34, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Winch Spool
      winchFrame += 0.05 * dtRatio;
      ctx.fillStyle = '#334155';
      ctx.fillRect(origin.x - 12, origin.y - 10, 24, 20);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.strokeRect(origin.x - 12, origin.y - 10, 24, 20);

      // Cable Line
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Sliding Dynamite along cable
      if (slidingDynamite) {
        const dynX = origin.x + (tipX - origin.x) * slidingDynamite.progress;
        const dynY = origin.y + (tipY - origin.y) * slidingDynamite.progress;
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(dynX - 6, dynY - 4, 12, 8);
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(dynX + 7, dynY - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Minerals
      minerals.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);

        if (m.type.includes('gold')) {
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 2;
          ctx.stroke();
          // Shiny sparkle highlight
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(-m.radius * 0.35, -m.radius * 0.35, m.radius * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else if (m.type.includes('rock')) {
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.moveTo(-m.radius, 0);
          ctx.lineTo(-m.radius * 0.5, -m.radius);
          ctx.lineTo(m.radius * 0.7, -m.radius * 0.8);
          ctx.lineTo(m.radius, m.radius * 0.3);
          ctx.lineTo(0, m.radius);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (m.type === 'diamond') {
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.moveTo(0, -m.radius);
          ctx.lineTo(m.radius, 0);
          ctx.lineTo(0, m.radius);
          ctx.lineTo(-m.radius, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 2;
          ctx.stroke();
          // Facet inner lines
          ctx.fillStyle = '#BAE6FD';
          ctx.beginPath();
          ctx.moveTo(0, -m.radius);
          ctx.lineTo(m.radius * 0.4, 0);
          ctx.lineTo(0, m.radius);
          ctx.closePath();
          ctx.fill();
        } else if (m.type === 'bag') {
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(0, 3, m.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#92400E';
          ctx.fillRect(-m.radius * 0.5, -m.radius * 0.8, m.radius, 5);
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 14px Calibri, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('?', 0, 7);
        }

        ctx.restore();
      });

      // Mice
      mice.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.ellipse(0, 0, m.radius * 1.3, m.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        if (m.hasDiamond) {
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.arc(0, -8, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Caught Item under claw
      if (caughtItem) {
        ctx.save();
        ctx.translate(tipX, tipY + caughtItem.radius);
        ctx.fillStyle = caughtItem.color || '#F59E0B';
        ctx.beginPath();
        ctx.arc(0, 0, caughtItem.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Mechanical Metal Claw
      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(angle);

      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;

      // Base Pivot Ring
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dual Pincers
      const openOffset = (clawState === 'shooting') ? 14 : 7;
      // Left Prong
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(-openOffset, 12);
      ctx.lineTo(-openOffset + 5, 18);
      ctx.stroke();
      // Right Prong
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(openOffset, 12);
      ctx.lineTo(openOffset - 5, 18);
      ctx.stroke();

      ctx.restore();

      // Juice Popups & Particles
      if (particles) {
        particles.update(16);
        particles.draw(ctx);
      }
      if (popups) {
        popups.update(16);
        popups.draw(ctx);
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    onCleanup(() => {
      cancelAnimationFrame(animId);
      clearInterval(timerInterval);
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') {
        window.NP_Audio.stopBGM();
      }
    });
  }

  // =========================================================================
  // 3. ENGINE: LINE 98 CỔ ĐIỂN (9x9 BFS PATHFINDING & UNDO ENGINE)
  // =========================================================================
  function launchLine98(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    const HIGH_SCORE_KEY = 'np_line98_high_score';
    let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0');

    let score = 0;
    let board = Array(9).fill(null).map(() => Array(9).fill(0));
    let nextColors = [];
    let selectedCell = null;
    let previousState = null; // For Undo

    const COLORS = [
      '#EF4444', // Red
      '#10B981', // Green
      '#3B82F6', // Blue
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4'  // Cyan
    ];

    container.innerHTML = `
      <div class="line98-board-wrapper">
        <div style="display: flex; justify-content: space-between; width: 100%; max-width: 450px; align-items: center;">
          <div style="font-size: 1rem; font-weight: 900;">
            Điểm: <span id="l98Score" style="color: #10B981;">0</span>
          </div>
          <div class="line98-next-balls-bar">
            <span>Sắp ra:</span>
            <div class="line98-next-balls-list" id="l98NextBalls"></div>
          </div>
          <button class="btn btn-secondary" id="l98UndoBtn" style="padding: 4px 10px; font-size: 0.8rem;">
            ↩️ Đi lại
          </button>
        </div>

        <div class="line98-grid-table" id="l98Grid">
          <!-- 81 Cells -->
        </div>

        <div style="font-size: 0.82rem; color: var(--text-muted); text-align: center; max-width: 420px;">
          💡 Luật chơi: Xếp từ 5 quả bóng cùng màu thành hàng ngang, dọc hoặc chéo để ăn điểm và được đi tiếp mà không sinh bóng mới!
        </div>
      </div>
    `;

    function rollNextColors() {
      nextColors = [
        Math.floor(Math.random() * COLORS.length) + 1,
        Math.floor(Math.random() * COLORS.length) + 1,
        Math.floor(Math.random() * COLORS.length) + 1
      ];
      renderNextBalls();
    }

    function renderNextBalls() {
      const el = container.querySelector('#l98NextBalls');
      if (!el) return;
      el.innerHTML = nextColors.map(c => `
        <div class="line98-ball-sample" style="background-color: ${COLORS[c - 1]};"></div>
      `).join('');
    }

    function spawnInitialBalls() {
      rollNextColors();
      spawnBalls(5);
    }

    function getEmptyCells() {
      const empty = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) empty.push({ r, c });
        }
      }
      return empty;
    }

    function spawnBalls(count) {
      const empty = getEmptyCells();
      if (empty.length === 0) return;

      const num = Math.min(count, empty.length);
      for (let i = 0; i < num; i++) {
        const randIdx = Math.floor(Math.random() * empty.length);
        const cell = empty.splice(randIdx, 1)[0];
        const color = nextColors.length > 0 ? nextColors.shift() : (Math.floor(Math.random() * COLORS.length) + 1);
        board[cell.r][cell.c] = color;
      }
      rollNextColors();
      checkAndClearLines();
    }

    // BFS Pathfinding
    function hasPath(startR, startC, targetR, targetC) {
      if (board[targetR][targetC] !== 0) return false;
      const visited = Array(9).fill(false).map(() => Array(9).fill(false));
      const queue = [{ r: startR, c: startC }];
      visited[startR][startC] = true;

      const dr = [-1, 1, 0, 0];
      const dc = [0, 0, -1, 1];

      while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.r === targetR && curr.c === targetC) return true;

        for (let i = 0; i < 4; i++) {
          const nr = curr.r + dr[i];
          const nc = curr.c + dc[i];
          if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && !visited[nr][nc] && board[nr][nc] === 0) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
      return false;
    }

    // Line Matching (5 in a row)
    function checkAndClearLines() {
      const toClear = [];

      // Check horizontal, vertical, diag1, diag2
      const directions = [
        { dr: 0, dc: 1 },  // Horizontal
        { dr: 1, dc: 0 },  // Vertical
        { dr: 1, dc: 1 },  // Diag down-right
        { dr: 1, dc: -1 }  // Diag down-left
      ];

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const color = board[r][c];
          if (color === 0) continue;

          for (const d of directions) {
            const streak = [{ r, c }];
            let nr = r + d.dr;
            let nc = c + d.dc;

            while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && board[nr][nc] === color) {
              streak.push({ r: nr, c: nc });
              nr += d.dr;
              nc += d.dc;
            }

            if (streak.length >= 5) {
              streak.forEach(pt => toClear.push(pt));
            }
          }
        }
      }

      if (toClear.length > 0) {
        // Unique cells
        const uniqueSet = new Set();
        let clearedCount = 0;
        toClear.forEach(pt => {
          const k = `${pt.r},${pt.c}`;
          if (!uniqueSet.has(k)) {
            uniqueSet.add(k);
            board[pt.r][pt.c] = 0;
            clearedCount++;
          }
        });

        // Score formula
        const points = clearedCount === 5 ? 10 : (clearedCount * 3 + 5);
        score += points;
        AudioEngine.win();
        updateScoreUI();
        renderGrid();
        return true; // Line was cleared!
      }

      return false;
    }

    function updateScoreUI() {
      const el = container.querySelector('#l98Score');
      if (el) el.textContent = score;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem(HIGH_SCORE_KEY, highScore.toString());
      }
    }

    function renderGrid() {
      const grid = container.querySelector('#l98Grid');
      if (!grid) return;

      grid.innerHTML = '';
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cellVal = board[r][c];
          const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;

          const cellEl = document.createElement('div');
          cellEl.className = `line98-cell ${isSelected ? 'selected' : ''}`;
          cellEl.setAttribute('data-r', r);
          cellEl.setAttribute('data-c', c);

          if (cellVal > 0) {
            const ballEl = document.createElement('div');
            ballEl.className = `line98-ball ${isSelected ? 'selected-ball' : ''}`;
            ballEl.style.backgroundColor = COLORS[cellVal - 1];
            cellEl.appendChild(ballEl);
          }

          cellEl.addEventListener('click', () => onCellClick(r, c));
          cellEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            onCellClick(r, c);
          }, { passive: false });
          grid.appendChild(cellEl);
        }
      }
    }

    function onCellClick(r, c) {
      const cellVal = board[r][c];

      if (cellVal > 0) {
        // Select ball
        selectedCell = { r, c };
        AudioEngine.pop();
        if (window.NP_Juice) window.NP_Juice.vibrate(8);
        renderGrid();
      } else if (selectedCell) {
        // Try move
        if (hasPath(selectedCell.r, selectedCell.c, r, c)) {
          // Save for Undo
          previousState = {
            board: board.map(row => [...row]),
            score: score,
            nextColors: [...nextColors]
          };

          // Move
          board[r][c] = board[selectedCell.r][selectedCell.c];
          board[selectedCell.r][selectedCell.c] = 0;
          selectedCell = null;
          AudioEngine.pop();
          if (window.NP_Juice) window.NP_Juice.vibrate(14);

          // Check if lines are made
          const cleared = checkAndClearLines();
          if (cleared) {
            if (window.NP_Juice) window.NP_Juice.vibrate([20, 40]);
          } else {
            // Spawn 3 balls
            spawnBalls(3);
          }

          renderGrid();
        } else {
          // Blocked path
          AudioEngine.alarm();
          if (window.NP_Juice) window.NP_Juice.vibrate(22);
          if (typeof window.showToastNotification === 'function') {
            window.showToastNotification('Đường đi bị chặn! Không thể di chuyển tới ô này.');
          }
        }
      }
    }

    const undoBtn = container.querySelector('#l98UndoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (previousState) {
          board = previousState.board;
          score = previousState.score;
          nextColors = previousState.nextColors;
          previousState = null;
          AudioEngine.pop();
          updateScoreUI();
          renderNextBalls();
          renderGrid();
        }
      });
    }

    spawnInitialBalls();
    renderGrid();
  }

  // =========================================================================
  // 4. ENGINE: BẮN TRỨNG KHỦNG LONG (DYNOMITE CANVAS ENGINE FULL)
  // =========================================================================
  function launchBanTrung(container, game) {
    const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
    const HIGH_SCORE_KEY = 'np_bantrung_high_score';
    let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0');

    let score = 0;
    let stage = 1;
    let cannonAngle = 0;
    let currentEggColor = 1;
    let nextEggColor = 2;
    let flyingEgg = null;
    let ceilingOffset = 0;
    let shotCounter = 0;
    const SHOTS_PER_CEILING = 5;
    let animId = null;
    let gameState = 'intro'; // 'intro', 'playing', 'stageclear', 'gameover'
    let stompEffectTimer = 0;
    let lastTime = performance.now();

    // Flying Pterodactyl Dinosaur & Time-Freeze
    let pterodactyl = null;
    let pterodactylTimer = 0;
    let freezeTimer = 0;

    if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
      window.NP_Audio.startBGM('bantrung');
    }

    const EGG_DEFS = [
      { id: 1, base: '#EF4444', speckle: '#991B1B', name: 'Đỏ' },
      { id: 2, base: '#10B981', speckle: '#065F46', name: 'Xanh Lá' },
      { id: 3, base: '#3B82F6', speckle: '#1E40AF', name: 'Xanh Dương' },
      { id: 4, base: '#F59E0B', speckle: '#B45309', name: 'Vàng' },
      { id: 5, base: '#8B5CF6', speckle: '#5B21B6', name: 'Tím' },
      { id: 6, base: '#EC4899', speckle: '#9D174D', name: 'Hồng' },
      { id: 7, base: '#06B6D4', speckle: '#0E7490', name: 'Băng' }
    ];

    const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
    const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

    const cols = 8;
    const rows = 12;
    let grid = [];

    function getRandomEggColor() {
      if (stage >= 2 && Math.random() < 0.08) {
        return Math.random() < 0.5 ? 99 : 98; // 99=bomb, 98=rainbow
      }
      const numColors = Math.min(EGG_DEFS.length, 3 + stage);
      return Math.floor(Math.random() * numColors) + 1;
    }

    function initStage(stg) {
      stage = stg;
      ceilingOffset = 0;
      shotCounter = 0;
      flyingEgg = null;
      stompEffectTimer = 0;
      pterodactyl = null;
      pterodactylTimer = 0;
      freezeTimer = 0;
      const numColors = Math.min(EGG_DEFS.length, 3 + stg);

      grid = Array(rows).fill(null).map((_, r) => {
        if (r < 4 + Math.min(2, stg - 1)) {
          return Array(cols).fill(null).map(() => Math.floor(Math.random() * numColors) + 1);
        }
        return Array(cols).fill(0);
      });

      currentEggColor = getRandomEggColor();
      nextEggColor = getRandomEggColor();
      updateHUD();
    }

    container.innerHTML = `
      <div class="canvas-game-box" style="font-family: 'Calibri', -apple-system, sans-serif;">
        <div class="canvas-game-hud">
          <div class="hud-pill">Màn: <span id="btStage" style="color: #F59E0B; font-weight: 900;">${stage}</span></div>
          <div class="hud-pill">Điểm: <span id="btScore" style="color: #10B981; font-weight: 900;">${score}</span></div>
          <div class="hud-pill">Kỷ lục: <span id="btHighScore" style="color: #FBBF24; font-weight: 900;">${highScore}</span></div>
          <div class="hud-pill">Kế tiếp: <span id="btNextColor" style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; vertical-align: middle; border: 1px solid #FFF; margin-left: 4px;"></span></div>
          <div class="hud-pill">Mama Dậm Chân: <span id="btShotsLeft" style="color: #EF4444; font-weight: 900;">5 phát</span></div>
        </div>

        <div style="position: relative; display: flex; justify-content: center;">
          <canvas id="btCanvas" width="500" height="450" class="canvas-main-viewport" style="background: #14181E; border-radius: 8px; touch-action: none; cursor: crosshair;"></canvas>

          <!-- 1. INTRO OVERLAY -->
          <div class="game-stage-overlay" id="btIntroOverlay">
            <div class="intro-modal-card">
              <div class="intro-hero-wrapper">
                <img src="assets/bantrung_intro.jpg" alt="Bắn Trứng Khủng Long" class="intro-hero-img">
                <div class="intro-hero-overlay">
                  <span class="intro-badge">PopCap / Sprout 2002</span>
                  <h3 class="intro-title">Bắn Trứng Khủng Long - Dynomite</h3>
                </div>
              </div>
              <div class="intro-content">
                <p class="intro-desc">Điều khiển ná cao su tiền sử của chú Khủng Long Xanh, bắn các quả trứng cùng màu thành nhóm từ 3 quả trở lên để làm nổ tung trước khi Khủng Long Mẹ (Mama Dino) dậm chân đè nát tổ trứng!</p>
                <div class="intro-controls-box">
                  <div class="intro-control-row">
                    <span class="intro-key">Rê Chuột / Vuốt Chạm</span>
                    <span>Ngắm hướng bắn với tia định hướng dội tường chuẩn xác</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Nhấp Chuột / Thả Tay</span>
                    <span>Bắn quả trứng vào chùm trứng treo trên trần hang đá</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Phím [Space] / Đổi Trứng</span>
                    <span>Hoán đổi quả trứng đang chuẩn bị với quả trứng kế tiếp</span>
                  </div>
                  <div class="intro-control-row">
                    <span class="intro-key">Khủng Long Bay Pterodactyl</span>
                    <span>Bắn hạ để nhận hiệu ứng Đóng Băng Mama Dino hoặc Trứng Bom</span>
                  </div>
                </div>
                <div class="intro-actions">
                  <button class="btn-intro-start" id="btStartGameBtn">Bắt đầu bắn trứng (Màn 1)</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. STAGE CLEAR OVERLAY -->
          <div id="btClearOverlay" style="display: none; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.92); border-radius: 8px; z-index: 10; padding: 24px; color: #FFF; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
            
            <h3 style="font-size: 1.4rem; color: #10B981; font-weight: 900; margin: 0 0 8px 0;">HOÀN THÀNH MÀN XUẤT SẮC!</h3>
            <p style="font-size: 0.95rem; color: #CBD5E1; margin: 0 0 16px 0;" id="btClearMsg">Bạn đã dọn sạch toàn bộ tổ trứng và nhận thêm +1000 điểm thưởng!</p>
            <div style="font-size: 1.1rem; color: #FBBF24; font-weight: 800; margin-bottom: 20px;">Tổng điểm hiện tại: <span id="btClearScore">0</span></div>
            <button class="btn btn-primary" id="btNextStageBtn" style="padding: 10px 28px; font-size: 1rem; font-weight: 900; background: #10B981; border: none; cursor: pointer; border-radius: 6px;">
              Tiếp tục Màn Kế Tiếp ➔
            </button>
          </div>

          <!-- 3. GAME OVER OVERLAY -->
          <div id="btGameOverOverlay" style="display: none; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.94); border-radius: 8px; z-index: 10; padding: 24px; color: #FFF; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
            
            <h3 style="font-size: 1.4rem; color: #EF4444; font-weight: 900; margin: 0 0 8px 0;">TỔ TRỨNG ĐÃ BỊ ĐÈ NÁT!</h3>
            <p style="font-size: 0.95rem; color: #CBD5E1; margin: 0 0 16px 0;">Trứng đã chạm tới vạch đỏ giới hạn an toàn của hang động.</p>
            <div style="font-size: 1.2rem; color: #FBBF24; font-weight: 800; margin-bottom: 20px;">Điểm số chung cuộc: <span id="btFinalScore">0</span></div>
            <button class="btn btn-primary" id="btRetryBtn" style="padding: 10px 28px; font-size: 1rem; font-weight: 900; background: #EF4444; border: none; cursor: pointer; border-radius: 6px;">
              Chơi lại Từ Đầu
            </button>
          </div>
        </div>

        <div class="canvas-controls-bar">
          <div style="font-size: 0.8rem; color: #FFF;">
            Rê chuột / Chạm để ngắm • Nhấp chuột để bắn • Phím <strong>[Space]</strong> đổi trứng
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-canvas-action" id="btSwapEggBtn" style="background: #3B82F6; color: #FFF; font-weight: 900;">Đổi trứng (Space)</button>
            <button class="btn-canvas-action" id="btRestartInGameBtn" style="padding: 4px 12px; font-size: 0.8rem;">Chơi lại</button>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#btCanvas');
    const ctx = canvas.getContext('2d');
    const introOverlay = container.querySelector('#btIntroOverlay');
    const clearOverlay = container.querySelector('#btClearOverlay');
    const gameOverOverlay = container.querySelector('#btGameOverOverlay');

    function updateHUD() {
      const sEl = container.querySelector('#btScore');
      const stEl = container.querySelector('#btStage');
      const hsEl = container.querySelector('#btHighScore');
      const nEl = container.querySelector('#btNextColor');
      const shotsEl = container.querySelector('#btShotsLeft');
      if (sEl) sEl.textContent = score;
      if (stEl) stEl.textContent = stage;
      if (hsEl) hsEl.textContent = highScore;

      if (nEl) {
        if (nextEggColor === 99) {
          nEl.textContent = '💣';
          nEl.style.backgroundColor = 'transparent';
        } else if (nextEggColor === 98) {
          nEl.textContent = '🌈';
          nEl.style.backgroundColor = 'transparent';
        } else {
          nEl.textContent = '';
          const def = EGG_DEFS.find(d => d.id === nextEggColor);
          nEl.style.backgroundColor = def ? def.base : '#FFF';
        }
      }

      if (shotsEl) {
        if (freezeTimer > 0) {
          shotsEl.textContent = `⌛ ĐÓNG BĂNG (${freezeTimer})`;
          shotsEl.style.color = '#38BDF8';
        } else {
          const left = SHOTS_PER_CEILING - (shotCounter % SHOTS_PER_CEILING);
          shotsEl.textContent = `${left} phát`;
          shotsEl.style.color = left === 1 ? '#EF4444' : '#F59E0B';
        }
      }
    }

    function swapCurrentAndNext() {
      if (flyingEgg || gameState !== 'playing') return;
      const tmp = currentEggColor;
      currentEggColor = nextEggColor;
      nextEggColor = tmp;
      if (window.NP_Audio) window.NP_Audio.pop();
      if (popups) popups.add('🔄 ĐÃ ĐỔI TRỨNG', canvas.width / 2, canvas.height - 70, '#38BDF8', 16);
      updateHUD();
    }

    function getEggPos(r, c) {
      const x = 38 + c * 54 + (r % 2 === 1 ? 27 : 0);
      const y = 32 + r * 30 + ceilingOffset;
      return { x, y };
    }

    function drawSpeckledEgg(x, y, colorIdx, radiusX = 16, radiusY = 20) {
      ctx.save();
      ctx.translate(x, y);

      if (colorIdx === 99) {
        // Bomb Egg
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 14px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💣', 0, 5);
        ctx.restore();
        return;
      }

      if (colorIdx === 98) {
        // Rainbow Egg
        const rGrad = ctx.createLinearGradient(-radiusX, -radiusY, radiusX, radiusY);
        rGrad.addColorStop(0, '#EF4444');
        rGrad.addColorStop(0.3, '#F59E0B');
        rGrad.addColorStop(0.6, '#10B981');
        rGrad.addColorStop(1, '#3B82F6');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 13px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', 0, 4);
        ctx.restore();
        return;
      }

      const def = EGG_DEFS.find(d => d.id === colorIdx) || EGG_DEFS[0];

      // Smooth egg shape
      const grad = ctx.createRadialGradient(-radiusX * 0.3, -radiusY * 0.3, 2, 0, 0, radiusY);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.25, def.base);
      grad.addColorStop(1, def.speckle);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dinosaur Egg Speckles
      ctx.fillStyle = def.speckle;
      const speckleOffsets = [
        { dx: -6, dy: -6, r: 2.5 },
        { dx: 5, dy: -4, r: 2.0 },
        { dx: -4, dy: 7, r: 2.2 },
        { dx: 6, dy: 6, r: 2.8 },
        { dx: 0, dy: 1, r: 1.8 }
      ];
      speckleOffsets.forEach(sp => {
        ctx.beginPath();
        ctx.arc(sp.dx, sp.dy, sp.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Glossy reflection arc
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-radiusX * 0.35, -radiusY * 0.35, radiusX * 0.3, radiusY * 0.45, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function getScaledCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }

    function updateCannonAngle(targetX, targetY) {
      const dx = targetX - canvas.width / 2;
      const dy = targetY - (canvas.height - 35);
      cannonAngle = Math.atan2(dx, -dy);
      cannonAngle = Math.max(-Math.PI * 0.43, Math.min(Math.PI * 0.43, cannonAngle));
    }

    function fireEgg() {
      if (gameState !== 'playing' || flyingEgg) return;
      flyingEgg = {
        x: canvas.width / 2,
        y: canvas.height - 35,
        vx: Math.sin(cannonAngle) * 9.8,
        vy: -Math.cos(cannonAngle) * 9.8,
        color: currentEggColor
      };
      currentEggColor = nextEggColor;
      nextEggColor = getRandomEggColor();
      if (window.NP_Juice) NP_Juice.vibrate.light();
      if (window.NP_Audio) window.NP_Audio.pop();
      updateHUD();
    }

    // Mouse Listeners
    canvas.addEventListener('mousemove', (e) => {
      if (gameState !== 'playing') return;
      const pos = getScaledCoords(e);
      updateCannonAngle(pos.x, pos.y);
    });

    canvas.addEventListener('click', (e) => {
      if (gameState !== 'playing') return;
      const pos = getScaledCoords(e);
      updateCannonAngle(pos.x, pos.y);
      fireEgg();
    });

    // Touch Listeners
    canvas.addEventListener('touchstart', (e) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const pos = getScaledCoords(touch);
        updateCannonAngle(pos.x, pos.y);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const pos = getScaledCoords(touch);
        updateCannonAngle(pos.x, pos.y);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      fireEgg();
    }, { passive: false });

    // Buttons & Keys
    const startBtn = container.querySelector('#btStartGameBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        introOverlay.style.display = 'none';
        gameState = 'playing';
        initStage(1);
      });
    }

    const swapBtn = container.querySelector('#btSwapEggBtn');
    if (swapBtn) swapBtn.addEventListener('click', swapCurrentAndNext);

    const restartInGameBtn = container.querySelector('#btRestartInGameBtn');
    if (restartInGameBtn) {
      restartInGameBtn.addEventListener('click', () => {
        clearOverlay.style.display = 'none';
        gameOverOverlay.style.display = 'none';
        gameState = 'playing';
        score = 0;
        initStage(1);
      });
    }

    const nextStageBtn = container.querySelector('#btNextStageBtn');
    if (nextStageBtn) {
      nextStageBtn.addEventListener('click', () => {
        clearOverlay.style.display = 'none';
        gameState = 'playing';
        initStage(stage + 1);
      });
    }

    const retryBtn = container.querySelector('#btRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        gameOverOverlay.style.display = 'none';
        gameState = 'playing';
        score = 0;
        initStage(1);
      });
    }

    const onKey = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        swapCurrentAndNext();
      }
    };
    listen(window, 'keydown', onKey);

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      swapCurrentAndNext();
    });

    function getNeighbors(r, c) {
      const isOdd = r % 2 === 1;
      const candidates = isOdd ? [
        { r: r - 1, c: c }, { r: r - 1, c: c + 1 },
        { r: r, c: c - 1 }, { r: r, c: c + 1 },
        { r: r + 1, c: c }, { r: r + 1, c: c + 1 }
      ] : [
        { r: r - 1, c: c - 1 }, { r: r - 1, c: c },
        { r: r, c: c - 1 }, { r: r, c: c + 1 },
        { r: r + 1, c: c - 1 }, { r: r + 1, c: c }
      ];

      return candidates.filter(n => n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols);
    }

    function snapEggToGrid(egg) {
      // Step back slightly along velocity to accurately find entry empty tile
      const testX = egg.x - (egg.vx ? egg.vx * 0.45 : 0);
      const testY = egg.y - (egg.vy ? egg.vy * 0.45 : 0);
      let bestR = -1;
      let bestC = -1;
      let minDist = Infinity;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === 0) {
            const pos = getEggPos(r, c);
            const d = Math.hypot(testX - pos.x, testY - pos.y);
            const neighbors = getNeighbors(r, c);
            const hasNeighbor = r === 0 || neighbors.some(n => grid[n.r][n.c] > 0);
            if (hasNeighbor && d < minDist) {
              minDist = d;
              bestR = r;
              bestC = c;
            }
          }
        }
      }

      if (bestR === -1 || bestC === -1) {
        bestR = 0;
        bestC = Math.max(0, Math.min(cols - 1, Math.round((egg.x - 38) / 54)));
      }

      grid[bestR][bestC] = egg.color;
      if (window.NP_Juice) window.NP_Juice.vibrate(12);
      handleEggMatch(bestR, bestC, egg.color);
    }

    function handleEggMatch(startR, startC, targetColor) {
      // Special Bomb Egg (99)
      if (targetColor === 99) {
        if (window.NP_Audio) window.NP_Audio.explosion(true);
        if (window.NP_Juice) {
          window.NP_Juice.screenShake(canvas, 14, 300);
          window.NP_Juice.triggerHitstop(40);
        }
        const neighbors = getNeighbors(startR, startC);
        neighbors.push({ r: startR, c: startC });
        neighbors.forEach(n => {
          if (grid[n.r][n.c] > 0) {
            const pos = getEggPos(n.r, n.c);
            if (particles) particles.burst(pos.x, pos.y, 14, '#EF4444', 300, 3);
            grid[n.r][n.c] = 0;
          }
        });
        score += 500;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }
        if (popups) popups.add('💥 BÙM TRỨNG! +500', canvas.width / 2, 100, '#EF4444', 22);
        dropFloatingEggs();
        advanceShotCounter();
        return;
      }

      // BFS to find matching cluster
      const matched = [];
      const queue = [{ r: startR, c: startC }];
      const visited = Array(rows).fill(false).map(() => Array(cols).fill(false));
      visited[startR][startC] = true;

      let matchColor = targetColor;
      if (targetColor === 98) {
        const nb = getNeighbors(startR, startC);
        const coloredNb = nb.find(n => grid[n.r][n.c] > 0 && grid[n.r][n.c] !== 98);
        if (coloredNb) matchColor = grid[coloredNb.r][coloredNb.c];
      }

      while (queue.length > 0) {
        const curr = queue.shift();
        matched.push(curr);

        const neighbors = getNeighbors(curr.r, curr.c);
        for (const n of neighbors) {
          const neighborColor = grid[n.r][n.c];
          if (!visited[n.r][n.c] && (neighborColor === matchColor || neighborColor === 98)) {
            visited[n.r][n.c] = true;
            queue.push(n);
          }
        }
      }

      // If 3 or more matched, clear them!
      if (matched.length >= 3) {
        const def = EGG_DEFS.find(d => d.id === matchColor) || EGG_DEFS[0];
        matched.forEach(cell => {
          const pos = getEggPos(cell.r, cell.c);
          if (particles) particles.burst(pos.x, pos.y, 10, def.base, 250, 3);
          grid[cell.r][cell.c] = 0;
        });

        const points = matched.length * 30 * stage;
        score += points;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }
        if (window.NP_Audio) window.NP_Audio.match(matched.length);
        if (window.NP_Juice) {
          if (matched.length >= 5) {
            NP_Juice.triggerHitstop(40);
            NP_Juice.vibrate.combo();
          } else {
            NP_Juice.vibrate.medium();
          }
        }

        if (popups) {
          const centerCell = matched[Math.floor(matched.length / 2)];
          const cPos = getEggPos(centerCell.r, centerCell.c);
          popups.add(matched.length >= 5 ? `🔥 SIÊU COMBO! +${points}` : `+${points}`, cPos.x, cPos.y - 15, '#10B981', 20);
        }

        dropFloatingEggs();
      } else {
        if (window.NP_Audio) window.NP_Audio.thud();
      }

      advanceShotCounter();
    }

    function advanceShotCounter() {
      shotCounter++;

      // Mama Dino Stomp & Ceiling Descent
      if (freezeTimer > 0) {
        freezeTimer--;
        if (popups) popups.add('⌛ ĐANG ĐÓNG BĂNG MAMA DINO!', canvas.width / 2, 70 + ceilingOffset, '#38BDF8', 18);
      } else if (shotCounter % SHOTS_PER_CEILING === 0) {
        ceilingOffset += 24;
        stompEffectTimer = 25;
        if (window.NP_Audio) window.NP_Audio.thud();
        if (window.NP_Juice) {
          window.NP_Juice.screenShake(canvas, 12, 350);
          NP_Juice.vibrate.heavy();
        }
        if (popups) popups.add('🦖 MAMA DẬM CHÂN!', canvas.width / 2, 60 + ceilingOffset, '#EF4444', 22);
      } else if ((shotCounter % SHOTS_PER_CEILING) === (SHOTS_PER_CEILING - 1)) {
        if (window.NP_Audio) window.NP_Audio.thud(60);
        if (window.NP_Juice) {
          window.NP_Juice.screenShake(canvas, 5, 200);
          NP_Juice.vibrate.light();
        }
        if (popups) popups.add('⚠️ MAMA SẮP DẬM CHÂN!', canvas.width / 2, 60 + ceilingOffset, '#F59E0B', 20);
      }

      // Check Win
      let remaining = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] > 0) remaining++;
        }
      }

      if (remaining === 0) {
        if (window.NP_Audio) window.NP_Audio.win();
        score += 1000 * stage;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }
        updateHUD();
        gameState = 'stageclear';
        const msgEl = container.querySelector('#btClearMsg');
        const scoreEl = container.querySelector('#btClearScore');
        if (msgEl) msgEl.textContent = `Bạn đã dọn sạch toàn bộ tổ trứng Màn ${stage}! Thưởng thêm +${1000 * stage} điểm.`;
        if (scoreEl) scoreEl.textContent = score;
        clearOverlay.style.display = 'flex';
        return;
      }

      // Check Game Over
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] > 0) {
            const pos = getEggPos(r, c);
            if (pos.y >= canvas.height - 75) {
              gameState = 'gameover';
              if (window.NP_Audio) window.NP_Audio.explosion();
              const finalScoreEl = container.querySelector('#btFinalScore');
              if (finalScoreEl) finalScoreEl.textContent = score;
              gameOverOverlay.style.display = 'flex';
              break;
            }
          }
        }
        if (gameState === 'gameover') break;
      }

      updateHUD();
    }

    function dropFloatingEggs() {
      const connected = Array(rows).fill(false).map(() => Array(cols).fill(false));
      const queue = [];

      for (let c = 0; c < cols; c++) {
        if (grid[0][c] > 0) {
          connected[0][c] = true;
          queue.push({ r: 0, c });
        }
      }

      while (queue.length > 0) {
        const curr = queue.shift();
        const neighbors = getNeighbors(curr.r, curr.c);
        for (const n of neighbors) {
          if (grid[n.r][n.c] > 0 && !connected[n.r][n.c]) {
            connected[n.r][n.c] = true;
            queue.push(n);
          }
        }
      }

      let droppedCount = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] > 0 && !connected[r][c]) {
            const pos = getEggPos(r, c);
            const col = grid[r][c];
            const def = EGG_DEFS.find(d => d.id === col) || EGG_DEFS[0];
            if (particles) particles.burst(pos.x, pos.y, 8, def.base, 200, 2);
            grid[r][c] = 0;
            droppedCount++;
          }
        }
      }

      if (droppedCount > 0) {
        const bonus = droppedCount * 50 * stage;
        score += bonus;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }
        if (popups) popups.add(`🌟 RƠI TỰ DO: +${bonus}!`, canvas.width / 2, 80, '#F59E0B', 22);
      }
    }

    function drawAimingTrajectory() {
      if (flyingEgg || gameState !== 'playing') return;

      const originX = canvas.width / 2;
      const originY = canvas.height - 35;
      let currX = originX;
      let currY = originY;
      let dirX = Math.sin(cannonAngle);
      let dirY = -Math.cos(cannonAngle);

      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currX, currY);

      const step = 8;
      for (let i = 0; i < 45; i++) {
        currX += dirX * step;
        currY += dirY * step;

        if (currX <= 24) {
          currX = 24;
          dirX *= -1;
          ctx.lineTo(currX, currY);
        } else if (currX >= canvas.width - 24) {
          currX = canvas.width - 24;
          dirX *= -1;
          ctx.lineTo(currX, currY);
        }

        if (currY <= 20 + ceilingOffset) break;
      }
      ctx.lineTo(currX, currY);
      ctx.stroke();

      // Guide target marker dot
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(currX, currY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function loop() {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;
      const dtRatio = Math.min(2.5, dt / 16.67);

      // 1. Prehistoric Cave Background
      ctx.fillStyle = '#14181E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cave wall texture lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Mama Dino Crushing Stone Ceiling
      const ceilingY = 20 + ceilingOffset;
      const stoneGrad = ctx.createLinearGradient(0, 0, 0, ceilingY);
      stoneGrad.addColorStop(0, '#1E293B');
      stoneGrad.addColorStop(0.85, '#334155');
      stoneGrad.addColorStop(1, '#475569');
      ctx.fillStyle = stoneGrad;
      ctx.fillRect(0, 0, canvas.width, ceilingY);

      // Stone relief cracks & teeth
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, ceilingY);
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.lineTo(x + 15, ceilingY + 5);
        ctx.lineTo(x + 30, ceilingY);
      }
      ctx.stroke();

      // Mama Dino stomp screen flash
      if (stompEffectTimer > 0) {
        stompEffectTimer -= dtRatio;
        ctx.save();
        ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.3, stompEffectTimer / 30)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // 3. Danger Threshold Line
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 75);
      ctx.lineTo(canvas.width, canvas.height - 75);
      ctx.stroke();
      ctx.restore();

      // 4. Draw Aiming Guide
      drawAimingTrajectory();

      // 5. Draw Grid Eggs
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const colVal = grid[r][c];
          if (colVal > 0) {
            const pos = getEggPos(r, c);
            drawSpeckledEgg(pos.x, pos.y, colVal);
          }
        }
      }

      // 6. Update Flying Egg (60 FPS Delta-Time)
      if (flyingEgg) {
        flyingEgg.x += flyingEgg.vx * dtRatio;
        flyingEgg.y += flyingEgg.vy * dtRatio;

        // Bounce left / right walls
        if (flyingEgg.x < 24) {
          flyingEgg.x = 24;
          flyingEgg.vx *= -1;
          if (window.NP_Audio) window.NP_Audio.clack();
        } else if (flyingEgg.x > canvas.width - 24) {
          flyingEgg.x = canvas.width - 24;
          flyingEgg.vx *= -1;
          if (window.NP_Audio) window.NP_Audio.clack();
        }

        // Check collision with flying Pterodactyl dinosaur!
        if (pterodactyl && Math.hypot(flyingEgg.x - pterodactyl.x, flyingEgg.y - pterodactyl.y) < 32) {
          if (window.NP_Audio) {
            window.NP_Audio.chickenCluck();
            setTimeout(() => window.NP_Audio.powerup(), 60);
          }
          if (window.NP_Juice) window.NP_Juice.screenShake(canvas, 12, 300);
          if (particles) particles.burst(pterodactyl.x, pterodactyl.y, 22, '#F59E0B', 280, 3.5);
          score += 1000;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
          }

          if (pterodactyl.bonusType === 'freeze') {
            freezeTimer = 5;
            if (popups) popups.add('⌛ BẮN HẠ KHỦNG LONG! ĐÓNG BĂNG MAMA! +1000', canvas.width / 2, 90, '#38BDF8', 22);
          } else {
            nextEggColor = 99;
            if (popups) popups.add('💣 BẮN HẠ KHỦNG LONG! NHẬN TRỨNG BÙM! +1000', canvas.width / 2, 90, '#EF4444', 22);
          }

          pterodactyl = null;
        }

        // Check collision with ceiling
        if (flyingEgg.y <= 20 + ceilingOffset + 14) {
          snapEggToGrid(flyingEgg);
          flyingEgg = null;
        } else {
          // Check collision with existing eggs
          let hit = false;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (grid[r][c] > 0) {
                const pos = getEggPos(r, c);
                if (Math.hypot(flyingEgg.x - pos.x, flyingEgg.y - pos.y) < 32) {
                  snapEggToGrid(flyingEgg);
                  flyingEgg = null;
                  hit = true;
                  break;
                }
              }
            }
            if (hit) break;
          }
        }

        if (flyingEgg) {
          drawSpeckledEgg(flyingEgg.x, flyingEgg.y, flyingEgg.color);
        }
      }

      // 7. Update Flying Pterodactyl Dinosaur
      pterodactylTimer += dtRatio;
      if (!pterodactyl && pterodactylTimer > 500 && Math.random() < 0.008) {
        pterodactylTimer = 0;
        const fromLeft = Math.random() < 0.5;
        pterodactyl = {
          x: fromLeft ? -40 : canvas.width + 40,
          y: 70 + Math.random() * 80 + ceilingOffset * 0.5,
          vx: (fromLeft ? 2.2 : -2.2),
          bonusType: Math.random() < 0.5 ? 'freeze' : 'bomb',
          wingAngle: 0
        };
      }

      if (pterodactyl) {
        pterodactyl.x += pterodactyl.vx * dtRatio;
        pterodactyl.wingAngle += 0.15 * dtRatio;

        // Render Animated Pterodactyl
        ctx.save();
        ctx.translate(pterodactyl.x, pterodactyl.y);
        if (pterodactyl.vx < 0) ctx.scale(-1, 1);

        // Body
        ctx.fillStyle = pterodactyl.bonusType === 'freeze' ? '#06B6D4' : '#F59E0B';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flapping Wings
        const wingFlap = Math.sin(pterodactyl.wingAngle) * 14;
        ctx.fillStyle = pterodactyl.bonusType === 'freeze' ? '#0891B2' : '#D97706';
        ctx.beginPath();
        ctx.moveTo(-4, -2);
        ctx.lineTo(-8, -18 + wingFlap);
        ctx.lineTo(8, -2);
        ctx.fill();

        // Beak & Head
        ctx.beginPath();
        ctx.moveTo(12, -2);
        ctx.lineTo(26, 0);
        ctx.lineTo(12, 3);
        ctx.fill();

        // Little carrying crate
        ctx.fillStyle = pterodactyl.bonusType === 'freeze' ? '#38BDF8' : '#EF4444';
        ctx.fillRect(-6, 6, 12, 10);
        ctx.strokeStyle = '#FFF';
        ctx.strokeRect(-6, 6, 12, 10);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 8px Calibri, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pterodactyl.bonusType === 'freeze' ? '⌛' : '💣', 0, 14);

        ctx.restore();

        // Despawn when flies out of screen
        if (pterodactyl.x < -60 || pterodactyl.x > canvas.width + 60) {
          pterodactyl = null;
        }
      }

      // 8. Slingshot Cannon Base & Cute Gunner Dino
      ctx.save();
      const gunnerX = canvas.width / 2;
      const gunnerY = canvas.height - 35;

      // Dino Tail wiggling
      const tailWiggle = Math.sin(Date.now() * 0.005) * 4;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.moveTo(gunnerX - 34, gunnerY + 12);
      ctx.quadraticCurveTo(gunnerX - 48, gunnerY + 16 + tailWiggle, gunnerX - 52, gunnerY + 8 + tailWiggle);
      ctx.quadraticCurveTo(gunnerX - 42, gunnerY + 6, gunnerX - 30, gunnerY + 4);
      ctx.fill();

      // Dino Body
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.ellipse(gunnerX - 24, gunnerY + 12, 14, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dino Yellow Belly
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.ellipse(gunnerX - 18, gunnerY + 14, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dino Head & Cute Snout
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(gunnerX - 22, gunnerY - 4, 11, 0, Math.PI * 2);
      ctx.fill();

      // Dino Big Cartoon Eye
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(gunnerX - 18, gunnerY - 6, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(gunnerX - 17, gunnerY - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Wooden Slingshot Fork
      ctx.fillStyle = '#92400E';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2;

      // Base pole
      ctx.beginPath();
      ctx.rect(gunnerX - 4, gunnerY + 6, 8, 22);
      ctx.fill();
      ctx.stroke();

      // Left prong
      ctx.beginPath();
      ctx.moveTo(gunnerX - 2, gunnerY + 8);
      ctx.lineTo(gunnerX - 20, gunnerY - 14);
      ctx.lineTo(gunnerX - 14, gunnerY - 16);
      ctx.lineTo(gunnerX + 2, gunnerY + 8);
      ctx.fill();
      ctx.stroke();

      // Right prong
      ctx.beginPath();
      ctx.moveTo(gunnerX + 2, gunnerY + 8);
      ctx.lineTo(gunnerX + 20, gunnerY - 14);
      ctx.lineTo(gunnerX + 14, gunnerY - 16);
      ctx.lineTo(gunnerX - 2, gunnerY + 8);
      ctx.fill();
      ctx.stroke();

      // Stretchy Elastic Bands to Egg Cradle
      if (!flyingEgg && gameState === 'playing') {
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gunnerX - 17, gunnerY - 15);
        ctx.lineTo(gunnerX - 6, gunnerY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(gunnerX + 17, gunnerY - 15);
        ctx.lineTo(gunnerX + 6, gunnerY);
        ctx.stroke();

        // Draw Ready Egg in Cradle
        drawSpeckledEgg(gunnerX, gunnerY, currentEggColor);
      }

      ctx.restore();

      // 9. Juice Particles & Popups
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
// 5. ENGINE: KIM CƯƠNG (BEJEWELED CỔ ĐIỂN FULL ENGINE)
// =========================================================================
function launchKimCuong(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  const HIGH_SCORE_KEY = 'np_kimcuong_high_score';
  let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0');

  let level = 1;
  let score = 0;
  let targetScore = 1000;
  let selectedCell = null; // { r, c }
  let isProcessing = false;

  const ROWS = 8;
  const COLS = 8;
  const GEMS = [
    { id: 1, name: 'Kim Cương Lam', icon: '💎', color: '#3B82F6', border: '#1D4ED8' },
    { id: 2, name: 'Hồng Ngọc Đỏ', icon: '🔴', color: '#EF4444', border: '#B91C1C' },
    { id: 3, name: 'Ngọc Lục Bảo', icon: '🟢', color: '#10B981', border: '#047857' },
    { id: 4, name: 'Thạch Anh Vàng', icon: '🟡', color: '#F59E0B', border: '#B45309' },
    { id: 5, name: 'Tử Đinh Hương', icon: '🟣', color: '#8B5CF6', border: '#6D28D9' },
    { id: 6, name: 'Mã Não Cam', icon: '🟠', color: '#F97316', border: '#C2410C' },
    { id: 7, name: 'Bạch Ngọc Sáng', icon: '⚪', color: '#F8FAFC', border: '#94A3B8' }
  ];

  let board = [];

  function randomGem() {
    return Math.floor(Math.random() * GEMS.length) + 1;
  }

  function initBoard() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let g;
        do {
          g = randomGem();
        } while (
          (c >= 2 && board[r][c - 1] === g && board[r][c - 2] === g) ||
          (r >= 2 && board[r - 1][c] === g && board[r - 2][c] === g)
        );
        board[r][c] = g;
      }
    }
  }

  container.innerHTML = `
    <div class="line98-board-wrapper" style="max-width: 460px;">
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <div class="hud-pill" style="font-size: 0.85rem;">Cấp: <span id="kcLevel" style="color: #F59E0B;">1</span></div>
        <div class="hud-pill" style="font-size: 0.85rem;">Điểm: <span id="kcScore" style="color: #10B981;">0</span> / <span id="kcTarget">1000</span></div>
        <button class="btn btn-secondary" id="kcHintBtn" style="padding: 4px 10px; font-size: 0.8rem;">Gợi ý</button>
      </div>

      <div style="width: 100%; background: #334155; border-radius: 999px; height: 8px; overflow: hidden; margin: 4px 0;">
        <div id="kcProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #10B981, #F59E0B); transition: width 0.3s ease;"></div>
      </div>

      <div class="gem-grid-table" id="kcGrid"></div>

      <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">
        💡 Chạm chọn 1 viên kim cương và chạm viên liền kề để hoán đổi tạo hàng 3, 4 hoặc 5!
      </div>
    </div>
  `;

  const gridEl = container.querySelector('#kcGrid');
  const hintBtn = container.querySelector('#kcHintBtn');

  function renderBoard() {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = board[r][c];
        const gem = GEMS[val - 1] || GEMS[0];
        const isSel = selectedCell && selectedCell.r === r && selectedCell.c === c;

        const cell = document.createElement('div');
        cell.className = `gem-cell ${isSel ? 'selected' : ''}`;
        cell.dataset.r = r;
        cell.dataset.c = c;

        const inner = document.createElement('div');
        inner.className = `gem-item ${isSel ? 'pulse' : ''}`;
        inner.style.backgroundColor = gem.color;
        inner.style.borderColor = gem.border;
        inner.textContent = gem.icon;

        cell.appendChild(inner);
        cell.addEventListener('click', () => handleCellClick(r, c));

        let touchStartX = 0, touchStartY = 0;
        cell.addEventListener('touchstart', (e) => {
          if (e.touches[0]) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        }, { passive: true });

        cell.addEventListener('touchend', (e) => {
          if (e.changedTouches[0]) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            if (Math.max(absX, absY) > 20) {
              e.preventDefault();
              let targetR = r;
              let targetC = c;
              if (absX > absY) {
                targetC = c + (dx > 0 ? 1 : -1);
              } else {
                targetR = r + (dy > 0 ? 1 : -1);
              }
              if (targetR >= 0 && targetR < ROWS && targetC >= 0 && targetC < COLS) {
                trySwap(r, c, targetR, targetC);
              }
            }
          }
        }, { passive: false });

        gridEl.appendChild(cell);
      }
    }
  }

  function updateHUD() {
    const lEl = container.querySelector('#kcLevel');
    const sEl = container.querySelector('#kcScore');
    const tEl = container.querySelector('#kcTarget');
    const pEl = container.querySelector('#kcProgressBar');
    if (lEl) lEl.textContent = level;
    if (sEl) sEl.textContent = score;
    if (tEl) tEl.textContent = targetScore;
    if (pEl) {
      const pct = Math.min(100, Math.round((score / targetScore) * 100));
      pEl.style.width = `${pct}%`;
    }
  }

  function findMatches() {
    const matches = [];
    const matched = Array(ROWS).fill(false).map(() => Array(COLS).fill(false));

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const val = board[r][c];
        if (val > 0 && val === board[r][c + 1] && val === board[r][c + 2]) {
          let matchLen = 3;
          while (c + matchLen < COLS && board[r][c + matchLen] === val) {
            matchLen++;
          }
          for (let i = 0; i < matchLen; i++) {
            matched[r][c + i] = true;
          }
        }
      }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const val = board[r][c];
        if (val > 0 && val === board[r + 1][c] && val === board[r + 2][c]) {
          let matchLen = 3;
          while (r + matchLen < ROWS && board[r + matchLen][c] === val) {
            matchLen++;
          }
          for (let i = 0; i < matchLen; i++) {
            matched[r + i][c] = true;
          }
        }
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (matched[r][c]) matches.push({ r, c });
      }
    }

    return matches;
  }

  async function trySwap(r1, c1, r2, c2) {
    if (isProcessing) return;
    const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
    if (dist !== 1) return;

    isProcessing = true;
    selectedCell = null;

    // Swap
    const temp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = temp;
    AudioEngine.gemSwap();
    if (window.NP_Juice) window.NP_Juice.vibrate(12);
    renderBoard();

    const matches = findMatches();
    if (matches.length > 0) {
      await processCascade(1);
    } else {
      // Revert if no match
      await new Promise(res => setTimeout(res, 220));
      const t = board[r1][c1];
      board[r1][c1] = board[r2][c2];
      board[r2][c2] = t;
      AudioEngine.hit();
      if (window.NP_Juice) window.NP_Juice.vibrate(18);
      renderBoard();
    }
    isProcessing = false;
  }

  function handleCellClick(r, c) {
    if (isProcessing) return;

    if (!selectedCell) {
      selectedCell = { r, c };
      AudioEngine.gemSwap();
      if (window.NP_Juice) window.NP_Juice.vibrate(8);
      renderBoard();
      return;
    }

    const dist = Math.abs(selectedCell.r - r) + Math.abs(selectedCell.c - c);
    if (dist === 1) {
      trySwap(selectedCell.r, selectedCell.c, r, c);
    } else {
      selectedCell = { r, c };
      AudioEngine.gemSwap();
      if (window.NP_Juice) window.NP_Juice.vibrate(8);
      renderBoard();
    }
  }

  async function processCascade(combo) {
    const matches = findMatches();
    if (matches.length === 0) return;

    AudioEngine.match(combo);
    score += matches.length * 30 * combo * level;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(HIGH_SCORE_KEY, highScore);
    }
    updateHUD();

    // Clear matched
    matches.forEach(m => {
      board[m.r][m.c] = 0;
    });
    renderBoard();
    await new Promise(res => setTimeout(res, 200));

    // Gravity drop
    for (let c = 0; c < COLS; c++) {
      let emptyRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c] !== 0) {
          if (emptyRow !== r) {
            board[emptyRow][c] = board[r][c];
            board[r][c] = 0;
          }
          emptyRow--;
        }
      }
      for (let r = emptyRow; r >= 0; r--) {
        board[r][c] = randomGem();
      }
    }

    renderBoard();
    await new Promise(res => setTimeout(res, 200));

    // Check level up
    if (score >= targetScore) {
      level++;
      targetScore = Math.round(targetScore * 1.8);
      AudioEngine.win();
      window.showToastNotification ? window.showToastNotification(`🎉 Lên cấp ${level}! Xuất sắc!`) : null;
      updateHUD();
    }

    // Cascade
    await processCascade(combo + 1);
  }

  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const directions = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }];
          for (const d of directions) {
            const nr = r + d.dr;
            const nc = c + d.dc;
            if (nr < ROWS && nc < COLS) {
              const t = board[r][c];
              board[r][c] = board[nr][nc];
              board[nr][nc] = t;
              const matches = findMatches();
              board[nr][nc] = board[r][c];
              board[r][c] = t;

              if (matches.length > 0) {
                AudioEngine.coin();
                const c1 = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"] .gem-item`);
                const c2 = gridEl.querySelector(`[data-r="${nr}"][data-c="${nc}"] .gem-item`);
                if (c1) c1.style.transform = 'scale(1.25)';
                if (c2) c2.style.transform = 'scale(1.25)';
                setTimeout(() => {
                  if (c1) c1.style.transform = 'scale(1)';
                  if (c2) c2.style.transform = 'scale(1)';
                }, 800);
                return;
              }
            }
          }
        }
      }
      initBoard();
      renderBoard();
    });
  }

  initBoard();
  renderBoard();
  updateHUD();

}


// =========================================================================
// 6. ENGINE: ĐẶT BOM (BOMBERMAN CỔ ĐIỂN FULL ENGINE)
// =========================================================================
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
// 7. ENGINE: BẮN XE TĂNG 1990 (BATTLE CITY NES FULL ENGINE)
// =========================================================================
function launchXeTang1990(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  let stage = 1;
  let score = 0;
  let lives = 3;
  let animId = null;
  let baseAlive = true;

  const COLS = 13;
  const ROWS = 13;
  const TILE = 36;

  // Map:
  // 0: Empty, 1: Brick, 2: Steel, 3: Water, 4: Eagle Base
  let map = [];
  let bullets = [];
  let enemyTanks = [];
  let powerups = []; // { x, y, type: 'star'|'helmet'|'bomb'|'clock'|'shovel', timer: number }
  let remainingWave = 14;
  let enemyFrozenTimer = 0;
  let shovelTimer = 0;
  let tick = 0;

  const popups = window.NP_Juice ? window.NP_Juice.createPopupManager() : null;
  const particles = window.NP_Juice ? window.NP_Juice.createParticleSystem() : null;

  if (window.NP_Audio && typeof window.NP_Audio.startBGM === 'function') {
    window.NP_Audio.startBGM('battlecity');
  }

  // Player Tank
  let player = {
    x: 4 * TILE + TILE / 2,
    y: 12 * TILE + TILE / 2,
    dir: 0, // 0: Up, 1: Right, 2: Down, 3: Left
    speed: 2.4,
    cooldown: 0,
    invincibleTimer: 120,
    starLevel: 0, // 0: Normal, 1: Fast bullet, 2: Double shot, 3: Pierce steel!
    treadPhase: 0,
    recoilX: 0,
    recoilY: 0
  };

  function initStage(stg) {
    stage = stg;
    baseAlive = true;
    bullets = [];
    enemyTanks = [];
    powerups = [];
    enemyFrozenTimer = 0;
    shovelTimer = 0;
    remainingWave = 12 + stg * 4;

    player.x = 4 * TILE + TILE / 2;
    player.y = 12 * TILE + TILE / 2;
    player.dir = 0;
    player.recoilX = 0;
    player.recoilY = 0;
    player.invincibleTimer = 120;

    // Create Map
    map = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

    // Eagle Base at (12, 6)
    map[12][6] = 4;
    // Brick fort protecting eagle
    setBaseFort(1);

    // Battle City brick maze
    for (let r = 1; r < 10; r += 2) {
      for (let c = 1; c < 12; c += 2) {
        if (Math.random() < 0.72) {
          map[r][c] = 1;
          map[r + 1][c] = 1;
        }
      }
    }

    // Steel blocks
    map[5][3] = 2; map[5][9] = 2;
    map[6][6] = 2;

    updateHUD();
  }

  function setBaseFort(tileType) {
    map[11][5] = tileType; map[11][6] = tileType; map[11][7] = tileType;
    map[12][5] = tileType; map[12][7] = tileType;
  }

  container.innerHTML = `
    <div class="canvas-game-box">
      <div class="canvas-game-hud" style="font-family: Calibri, sans-serif;">
        <div class="hud-pill">Mạng: <span id="xtLives" style="color: #EF4444; font-weight: bold;">❤️❤️❤️</span></div>
        <div class="hud-pill">Màn: <span id="xtStage" style="color: #F59E0B; font-weight: bold;">1</span></div>
        <div class="hud-pill">Hỏa lực: <span id="xtPower" style="color: #38BDF8; font-weight: bold;">⭐ 0</span></div>
        <div class="hud-pill">Còn lại: <span id="xtWave" style="color: #10B981; font-weight: bold;">14 xe</span></div>
        <div class="hud-pill">Điểm: <span id="xtScore" style="color: #FBBF24; font-weight: bold;">0</span></div>
      </div>

      <canvas id="xtCanvas" width="${COLS * TILE}" height="${ROWS * TILE}" class="canvas-main-viewport" style="background: #030712; display: block; margin: 0 auto; touch-action: none;"></canvas>

      <div class="canvas-controls-bar" style="gap: 8px; justify-content: center; touch-action: none;">
        <div style="display: flex; gap: 4px;">
          <button class="v-btn" id="xtUp" style="padding: 6px 14px; font-size: 1rem;">▲</button>
          <button class="v-btn" id="xtDown" style="padding: 6px 14px; font-size: 1rem;">▼</button>
          <button class="v-btn" id="xtLeft" style="padding: 6px 14px; font-size: 1rem;">◀</button>
          <button class="v-btn" id="xtRight" style="padding: 6px 14px; font-size: 1rem;">▶</button>
        </div>
        <button class="btn-canvas-action" id="xtFireBtn" style="background: #DC2626; color: #FFF; font-weight: 900; padding: 6px 18px; font-size: 0.95rem;">
          💥 BẮN (SPACE)
        </button>
        <button class="v-btn" id="xtRestartBtn" style="padding: 6px 10px;">Chơi lại</button>
      </div>
      <div style="text-align: center; color: #94A3B8; font-size: 0.75rem; margin-top: 4px; font-family: Calibri, sans-serif;">
        💡 Phím [W][A][S][D] hoặc Mũi tên: Di chuyển mượt mà • [Space]: Bắn đạn • Bo góc tự động chống kẹt tường!
      </div>
    </div>
  `;

  const canvas = container.querySelector('#xtCanvas');
  const ctx = canvas.getContext('2d');

  const keys = {};
  const onKeyDown = (e) => {
    keys[e.key] = true;
    keys[e.code] = true;
    if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      firePlayerBullet();
    }
  };
  const onKeyUp = (e) => {
    keys[e.key] = false;
    keys[e.code] = false;
  };

  listen(window, 'keydown', onKeyDown);
  listen(window, 'keyup', onKeyUp);

  function bindBtn(id, key) {
    const btn = container.querySelector(id);
    if (!btn) return;
    const press = (e) => { e.preventDefault(); keys[key] = true; if (window.NP_Juice) window.NP_Juice.vibrate(8); };
    const release = (e) => { e.preventDefault(); keys[key] = false; };
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
  }
  bindBtn('#xtUp', 'ArrowUp');
  bindBtn('#xtDown', 'ArrowDown');
  bindBtn('#xtLeft', 'ArrowLeft');
  bindBtn('#xtRight', 'ArrowRight');

  container.querySelector('#xtFireBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    firePlayerBullet();
  });
  container.querySelector('#xtFireBtn')?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    firePlayerBullet();
  }, { passive: false });

  container.querySelector('#xtRestartBtn')?.addEventListener('click', () => {
    lives = 3;
    score = 0;
    player.starLevel = 0;
    initStage(1);
  });

  function updateHUD() {
    const lEl = container.querySelector('#xtLives');
    const stEl = container.querySelector('#xtStage');
    const wEl = container.querySelector('#xtWave');
    const sEl = container.querySelector('#xtScore');
    const pEl = container.querySelector('#xtPower');
    if (lEl) lEl.textContent = '❤️'.repeat(Math.max(0, lives));
    if (stEl) stEl.textContent = stage;
    if (wEl) wEl.textContent = `${remainingWave + enemyTanks.length} xe`;
    if (sEl) sEl.textContent = score;
    if (pEl) {
      pEl.textContent = player.starLevel >= 3 ? '⚡ SIÊU TĂNG' : `⭐ ${player.starLevel}`;
      pEl.style.color = player.starLevel >= 3 ? '#F59E0B' : '#38BDF8';
    }
  }

  function firePlayerBullet() {
    if (player.cooldown > 0 || !baseAlive) return;
    const v = [
      { vx: 0, vy: -1 },
      { vx: 1, vy: 0 },
      { vx: 0, vy: 1 },
      { vx: -1, vy: 0 }
    ][player.dir];

    const bulletSpeed = player.starLevel >= 1 ? 7.0 : 5.2;
    const canPierceSteel = (player.starLevel >= 3);

    bullets.push({
      x: player.x + v.vx * 14,
      y: player.y + v.vy * 14,
      vx: v.vx * bulletSpeed,
      vy: v.vy * bulletSpeed,
      isPlayer: true,
      canPierceSteel: canPierceSteel
    });

    // Muzzle Recoil Kickback
    const recoilDist = 3.5;
    player.recoilX = -v.vx * recoilDist;
    player.recoilY = -v.vy * recoilDist;

    // Muzzle Flash Sparkles
    if (particles) {
      particles.spawn(player.x + v.vx * 16, player.y + v.vy * 16, 6, {
        colors: ['#FBBF24', '#EF4444', '#FFF'],
        speed: 2.2
      });
    }

    if (window.NP_Juice) {
      window.NP_Juice.vibrate(12);
    }

    // Cooldown
    if (player.starLevel >= 2) {
      player.cooldown = 11;
    } else {
      player.cooldown = 19;
    }

    if (window.NP_Audio && typeof window.NP_Audio.laser === 'function') {
      window.NP_Audio.laser();
    }
  }

  function canTankMove(x, y, radius) {
    const left = Math.floor((x - radius) / TILE);
    const right = Math.floor((x + radius) / TILE);
    const top = Math.floor((y - radius) / TILE);
    const bottom = Math.floor((y + radius) / TILE);

    if (x - radius < 0 || x + radius > canvas.width || y - radius < 0 || y + radius > canvas.height) {
      return false;
    }

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          if (map[r][c] === 1 || map[r][c] === 2 || map[r][c] === 3 || map[r][c] === 4) {
            return false;
          }
        }
      }
    }
    return true;
  }

  function dropPowerup(x, y) {
    const pTypes = ['star', 'helmet', 'bomb', 'clock', 'shovel'];
    const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
    powerups.push({
      x: x,
      y: y,
      type: pType,
      timer: 600 // 10s before disappearing
    });
    if (window.NP_Audio) window.NP_Audio.pop();
  }

  function triggerBombPowerup() {
    if (window.NP_Audio) window.NP_Audio.explosion(true);
    if (window.NP_Juice) {
      window.NP_Juice.screenShake(canvas, 16, 500);
      window.NP_Juice.vibrate([30, 50, 70]);
    }
    if (popups) popups.add('💣 BÙM! DIỆT GỌN TANK ĐỊCH!', canvas.width / 2, canvas.height / 2, '#EF4444', 24);

    enemyTanks.forEach(en => {
      score += 200;
      if (particles) {
        particles.spawn(en.x, en.y, 16, { colors: ['#F59E0B', '#EF4444', '#FFF'], speed: 5 });
      }
    });
    enemyTanks = [];
    updateHUD();
  }

  function loop() {
    tick++;

    if (!baseAlive) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 22px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏴‍☠️ CĂN CỨ ĐẠI BÀNG ĐÃ BỊ PHÁ HỦY!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '16px Calibri, sans-serif';
      ctx.fillText('Nhấp "Chơi lại" để phục thù.', canvas.width / 2, canvas.height / 2 + 25);
      animId = requestAnimationFrame(loop);
      return;
    }

    // Timers
    if (enemyFrozenTimer > 0) enemyFrozenTimer--;
    if (shovelTimer > 0) {
      shovelTimer--;
      if (shovelTimer === 0) setBaseFort(1); // revert fort back to brick
    }

    // Smoothly restore tank recoil kickback
    player.recoilX *= 0.7;
    player.recoilY *= 0.7;
    if (Math.abs(player.recoilX) < 0.1) player.recoilX = 0;
    if (Math.abs(player.recoilY) < 0.1) player.recoilY = 0;

    // 1. Player Controls with CORNER ASSIST (NES Battle City Smooth Cornering)
    if (player.cooldown > 0) player.cooldown--;
    if (player.invincibleTimer > 0) player.invincibleTimer--;

    let moved = false;
    const upPressed = keys['ArrowUp'] || keys['w'] || keys['W'];
    const downPressed = keys['ArrowDown'] || keys['s'] || keys['S'];
    const leftPressed = keys['ArrowLeft'] || keys['a'] || keys['A'];
    const rightPressed = keys['ArrowRight'] || keys['d'] || keys['D'];

    if (upPressed) {
      player.dir = 0;
      // Corner Assist on X
      const centerColX = Math.floor(player.x / TILE) * TILE + TILE / 2;
      const diffX = centerColX - player.x;
      if (Math.abs(diffX) > 1 && Math.abs(diffX) <= 12) {
        player.x += Math.sign(diffX) * Math.min(Math.abs(diffX), 1.6);
      }
      if (canTankMove(player.x, player.y - player.speed, 11)) {
        player.y -= player.speed;
        moved = true;
      }
    } else if (downPressed) {
      player.dir = 2;
      // Corner Assist on X
      const centerColX = Math.floor(player.x / TILE) * TILE + TILE / 2;
      const diffX = centerColX - player.x;
      if (Math.abs(diffX) > 1 && Math.abs(diffX) <= 12) {
        player.x += Math.sign(diffX) * Math.min(Math.abs(diffX), 1.6);
      }
      if (canTankMove(player.x, player.y + player.speed, 11)) {
        player.y += player.speed;
        moved = true;
      }
    } else if (leftPressed) {
      player.dir = 3;
      // Corner Assist on Y
      const centerRowY = Math.floor(player.y / TILE) * TILE + TILE / 2;
      const diffY = centerRowY - player.y;
      if (Math.abs(diffY) > 1 && Math.abs(diffY) <= 12) {
        player.y += Math.sign(diffY) * Math.min(Math.abs(diffY), 1.6);
      }
      if (canTankMove(player.x - player.speed, player.y, 11)) {
        player.x -= player.speed;
        moved = true;
      }
    } else if (rightPressed) {
      player.dir = 1;
      // Corner Assist on Y
      const centerRowY = Math.floor(player.y / TILE) * TILE + TILE / 2;
      const diffY = centerRowY - player.y;
      if (Math.abs(diffY) > 1 && Math.abs(diffY) <= 12) {
        player.y += Math.sign(diffY) * Math.min(Math.abs(diffY), 1.6);
      }
      if (canTankMove(player.x + player.speed, player.y, 11)) {
        player.x += player.speed;
        moved = true;
      }
    }

    if (moved) {
      player.treadPhase += 0.3;
      if (tick % 16 === 0 && window.NP_Audio) window.NP_Audio.thud(70);
    }

    // Collect Powerups
    for (let pi = powerups.length - 1; pi >= 0; pi--) {
      const pu = powerups[pi];
      pu.timer--;
      if (Math.hypot(pu.x - player.x, pu.y - player.y) < 22) {
        if (window.NP_Audio) window.NP_Audio.powerup();
        if (window.NP_Juice) window.NP_Juice.vibrate(22);

        if (pu.type === 'star') {
          player.starLevel = Math.min(3, player.starLevel + 1);
          if (popups) popups.add(`⭐ SAO NÂNG CẤP! (CẤP ${player.starLevel})`, player.x, player.y - 20, '#FBBF24', 20);
        } else if (pu.type === 'helmet') {
          player.invincibleTimer = 600; // 10s shield
          if (popups) popups.add('🛡️ KHIÊN BẤT TỬ 10S!', player.x, player.y - 20, '#38BDF8', 20);
        } else if (pu.type === 'bomb') {
          triggerBombPowerup();
        } else if (pu.type === 'clock') {
          enemyFrozenTimer = 480; // 8s freeze
          if (popups) popups.add('⏱️ ĐÓNG BĂNG ĐỊCH 8S!', player.x, player.y - 20, '#A78BFA', 20);
        } else if (pu.type === 'shovel') {
          shovelTimer = 900; // 15s steel fort
          setBaseFort(2);
          if (popups) popups.add('🪓 THÀNH THÉP BẢO VỆ ĐẠI BÀNG!', canvas.width / 2, 11 * TILE, '#CBD5E1', 20);
        }

        powerups.splice(pi, 1);
        updateHUD();
        continue;
      }
      if (pu.timer <= 0) powerups.splice(pi, 1);
    }

    // 2. Spawn Enemies
    if (remainingWave > 0 && enemyTanks.length < 4 && Math.random() < 0.02) {
      const spawns = [
        { c: 0, r: 0 },
        { c: 6, r: 0 },
        { c: 12, r: 0 }
      ];
      const sp = spawns[Math.floor(Math.random() * spawns.length)];

      const roll = Math.random();
      let type = 'basic';
      let hp = 1;
      let spd = 1.3;
      if (roll < 0.3) {
        type = 'scout';
        spd = 2.1;
      } else if (roll < 0.55) {
        type = 'rapid';
        spd = 1.6;
      } else if (roll < 0.8) {
        type = 'heavy';
        hp = 4;
        spd = 1.1;
      }

      enemyTanks.push({
        x: sp.c * TILE + TILE / 2,
        y: sp.r * TILE + TILE / 2,
        dir: 2,
        speed: spd,
        type: type,
        hp: hp,
        maxHp: hp,
        shootTimer: 40 + Math.floor(Math.random() * 50),
        hasItem: Math.random() < 0.25
      });
      remainingWave--;
      updateHUD();
    }

    // 3. Update Enemies (unless frozen)
    if (enemyFrozenTimer <= 0) {
      enemyTanks.forEach(en => {
        en.shootTimer--;
        if (en.shootTimer <= 0) {
          en.shootTimer = en.type === 'rapid' ? 40 : 70 + Math.floor(Math.random() * 50);
          const v = [
            { vx: 0, vy: -4 },
            { vx: 4, vy: 0 },
            { vx: 0, vy: 4 },
            { vx: -4, vy: 0 }
          ][en.dir];
          bullets.push({
            x: en.x,
            y: en.y,
            vx: v.vx,
            vy: v.vy,
            isPlayer: false
          });
        }

        const dx = [0, en.speed, 0, -en.speed][en.dir];
        const dy = [-en.speed, 0, en.speed, 0][en.dir];
        if (canTankMove(en.x + dx, en.y + dy, 11)) {
          en.x += dx;
          en.y += dy;
        } else {
          en.dir = Math.floor(Math.random() * 4);
        }
      });
    }

    // 4. Update Bullets & Bullet-vs-Bullet Collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b) continue;
      b.x += b.vx;
      b.y += b.vy;

      // Bullet vs Bullet collision cancellation!
      let bulletCancelled = false;
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (i !== j && bullets[j] && b.isPlayer !== bullets[j].isPlayer) {
          if (Math.hypot(b.x - bullets[j].x, b.y - bullets[j].y) < 14) {
            if (particles) particles.spawn(b.x, b.y, 8, { colors: ['#FBBF24', '#EF4444'], speed: 2.5 });
            if (window.NP_Audio) window.NP_Audio.pop();
            bullets.splice(Math.max(i, j), 1);
            bullets.splice(Math.min(i, j), 1);
            bulletCancelled = true;
            break;
          }
        }
      }
      if (bulletCancelled) continue;

      const br = Math.floor(b.y / TILE);
      const bc = Math.floor(b.x / TILE);
      if (br < 0 || br >= ROWS || bc < 0 || bc >= COLS) {
        bullets.splice(i, 1);
        continue;
      }

      // Hit brick
      if (map[br][bc] === 1) {
        map[br][bc] = 0;
        if (window.NP_Audio) window.NP_Audio.pop();
        if (window.NP_Juice && b.isPlayer) window.NP_Juice.vibrate(14);
        if (particles) {
          particles.spawn(b.x, b.y, 8, { colors: ['#B45309', '#78350F'], speed: 2 });
        }
        bullets.splice(i, 1);
        continue;
      }

      // Hit steel
      if (map[br][bc] === 2) {
        if (b.isPlayer && b.canPierceSteel) {
          map[br][bc] = 0; // Pierce steel!
          if (window.NP_Audio) window.NP_Audio.metalClank();
          if (window.NP_Juice) window.NP_Juice.vibrate(22);
          if (particles) {
            particles.spawn(b.x, b.y, 12, { colors: ['#CBD5E1', '#F59E0B'], speed: 3 });
          }
        } else {
          if (window.NP_Audio) window.NP_Audio.metalClank();
          if (window.NP_Juice && b.isPlayer) window.NP_Juice.vibrate(10);
        }
        bullets.splice(i, 1);
        continue;
      }

      // Hit Eagle Base
      if (map[br][bc] === 4) {
        baseAlive = false;
        if (window.NP_Audio) window.NP_Audio.explosion(true);
        if (window.NP_Juice) {
          window.NP_Juice.screenShake(canvas, 20, 600);
          window.NP_Juice.vibrate([40, 80, 100]);
        }
        bullets.splice(i, 1);
        continue;
      }

      // Hit tanks
      if (b.isPlayer) {
        for (let eIdx = enemyTanks.length - 1; eIdx >= 0; eIdx--) {
          const en = enemyTanks[eIdx];
          if (Math.hypot(b.x - en.x, b.y - en.y) < 16) {
            en.hp--;
            if (en.hp <= 0) {
              if (en.hasItem) dropPowerup(en.x, en.y);
              enemyTanks.splice(eIdx, 1);
              score += en.maxHp * 100;
              if (window.NP_Audio) window.NP_Audio.explosion(false);
              if (window.NP_Juice) {
                window.NP_Juice.vibrate([20, 45]);
                window.NP_Juice.triggerHitstop(35);
                window.NP_Juice.screenShake(canvas, 8, 200);
              }
              if (particles) {
                particles.spawn(en.x, en.y, 14, { colors: ['#F59E0B', '#EF4444', '#CBD5E1'], speed: 4 });
              }
              updateHUD();

              if (remainingWave === 0 && enemyTanks.length === 0) {
                if (window.NP_Audio) window.NP_Audio.win();
                if (window.NP_Juice) window.NP_Juice.vibrate([30, 50, 80]);
                score += 1000 * stage;
                initStage(stage + 1);
                return;
              }
            } else {
              if (window.NP_Audio) window.NP_Audio.hit();
              if (window.NP_Juice) window.NP_Juice.vibrate(15);
            }
            bullets.splice(i, 1);
            break;
          }
        }
      } else {
        // Enemy bullet hits player
        if (player.invincibleTimer <= 0) {
          if (Math.hypot(b.x - player.x, b.y - player.y) < 16) {
            lives--;
            player.starLevel = Math.max(0, player.starLevel - 1);
            if (window.NP_Audio) window.NP_Audio.explosion(true);
            if (window.NP_Juice) {
              window.NP_Juice.screenShake(canvas, 14, 400);
              window.NP_Juice.vibrate([45, 80]);
            }

            player.x = 4 * TILE + TILE / 2;
            player.y = 12 * TILE + TILE / 2;
            player.invincibleTimer = 120;
            updateHUD();
            bullets.splice(i, 1);

            if (lives <= 0) {
              score = 0;
              lives = 3;
              initStage(1);
              return;
            }
            break;
          }
        }
      }
    }

    // --- RENDER ---
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Map Tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE;
        const y = r * TILE;
        if (map[r][c] === 1) {
          // Brick Wall
          ctx.fillStyle = '#B45309';
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = '#78350F';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
          // Brick mortar lines
          ctx.fillStyle = '#78350F';
          ctx.fillRect(x + 1, y + TILE / 2, TILE - 2, 2);
          ctx.fillRect(x + TILE / 2, y + 1, 2, TILE / 2);
        } else if (map[r][c] === 2) {
          // Steel Wall
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
          // Rivets
          ctx.fillStyle = '#475569';
          ctx.fillRect(x + 5, y + 5, 3, 3);
          ctx.fillRect(x + TILE - 8, y + 5, 3, 3);
          ctx.fillRect(x + 5, y + TILE - 8, 3, 3);
          ctx.fillRect(x + TILE - 8, y + TILE - 8, 3, 3);
        } else if (map[r][c] === 4) {
          // Eagle Base
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.font = '22px Calibri, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🦅', x + TILE / 2, y + TILE / 2 + 7);
        }
      }
    }

    // Draw Powerups
    powerups.forEach(pu => {
      ctx.save();
      ctx.translate(pu.x, pu.y);
      const bob = Math.sin(tick * 0.1) * 3;
      ctx.font = '20px Calibri, sans-serif';
      ctx.textAlign = 'center';
      const icons = { star: '⭐', helmet: '🛡️', bomb: '💣', clock: '⏱️', shovel: '🪓' };
      ctx.fillText(icons[pu.type] || '🎁', 0, 7 + bob);
      ctx.restore();
    });

    // Draw Bullets
    bullets.forEach(b => {
      ctx.fillStyle = b.isPlayer ? (b.canPierceSteel ? '#EF4444' : '#FBBF24') : '#F8FAFC';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.canPierceSteel ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Enemy Tanks
    enemyTanks.forEach(en => {
      ctx.save();
      ctx.translate(en.x, en.y);
      ctx.rotate((en.dir * Math.PI) / 2);

      const isFlash = en.hasItem && (Math.floor(tick / 6) % 2 === 0);

      let bodyColor = '#94A3B8';
      if (isFlash) bodyColor = '#EF4444';
      else if (en.type === 'scout') bodyColor = '#E2E8F0';
      else if (en.type === 'rapid') bodyColor = '#38BDF8';
      else if (en.type === 'heavy') {
        bodyColor = en.hp === 4 ? '#10B981' : en.hp === 3 ? '#F59E0B' : en.hp === 2 ? '#EF4444' : '#F8FAFC';
      }

      // Tank Body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-11, -11, 22, 22);

      // Treads
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-14, -13, 4, 26);
      ctx.fillRect(10, -13, 4, 26);

      // Turret & Cannon
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-2, -18, 4, 12);

      ctx.restore();
    });

    // Draw Player Tank with Recoil Kickback
    ctx.save();
    ctx.translate(player.x + player.recoilX, player.y + player.recoilY);
    ctx.rotate((player.dir * Math.PI) / 2);

    // Invincible Shield Glow
    if (player.invincibleTimer > 0) {
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.sin(tick * 0.2) * 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player Gold Armor
    ctx.fillStyle = player.starLevel >= 3 ? '#F59E0B' : player.starLevel >= 1 ? '#FBBF24' : '#EAB308';
    ctx.fillRect(-11, -11, 22, 22);

    // Treads
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-14, -13, 4, 26);
    ctx.fillRect(10, -13, 4, 26);

    // Turret & Cannon
    ctx.fillStyle = player.starLevel >= 3 ? '#DC2626' : '#92400E';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3, -20, 6, 14);

    ctx.restore();

    // Particles & Popups
    if (particles) particles.updateAndDraw(ctx);
    if (popups) popups.updateAndDraw(ctx);

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
// 8. ENGINE: CỜ CARO VIỆT NAM (15x15 CỔ ĐIỂN FULL AI ENGINE)
// =========================================================================
function launchCaro(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  const SIZE = 15;
  let board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)); // 0: empty, 1: X (Player), 2: O (AI)
  let moveHistory = [];
  let gameOver = false;
  let winningLine = null;
  let lastMove = null;
  let wins = 0;
  let losses = 0;

  container.innerHTML = `
    <div class="line98-board-wrapper" style="max-width: 520px; font-family: Calibri, sans-serif;">
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <div class="hud-pill" style="font-size: 0.85rem; font-family: Calibri, sans-serif;">Bạn: <strong style="color: #2563EB;">X (Xanh)</strong> | Máy: <strong style="color: #DC2626;">O (Đỏ)</strong></div>
        <div class="hud-pill" style="font-size: 0.85rem; font-family: Calibri, sans-serif;">Tỷ số: <span id="caroScore" style="color: #10B981; font-weight: 900;">0 - 0</span></div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary" id="caroUndoBtn" style="padding: 4px 10px; font-size: 0.8rem; font-family: Calibri, sans-serif;">↩️ Đi lại</button>
          <button class="btn btn-secondary" id="caroResetBtn" style="padding: 4px 10px; font-size: 0.8rem; font-family: Calibri, sans-serif;">🔄 Bàn mới</button>
        </div>
      </div>

      <div class="caro-grid-table" id="caroGrid" style="touch-action: manipulation;"></div>

      <div id="caroStatusText" style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); text-align: center; font-family: Calibri, sans-serif;">
        Lượt của bạn (Đánh quân X)
      </div>
    </div>
  `;

  const gridEl = container.querySelector('#caroGrid');
  const statusEl = container.querySelector('#caroStatusText');
  const scoreEl = container.querySelector('#caroScore');
  const undoBtn = container.querySelector('#caroUndoBtn');
  const resetBtn = container.querySelector('#caroResetBtn');

  function renderGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'caro-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const val = board[r][c];
        if (val === 1) {
          cell.innerHTML = '<span class="caro-piece piece-x" style="font-family: Calibri, sans-serif; font-weight: 900;">✕</span>';
        } else if (val === 2) {
          cell.innerHTML = '<span class="caro-piece piece-o" style="font-family: Calibri, sans-serif; font-weight: 900;">◯</span>';
        }

        // Highlight last move indicator
        if (lastMove && lastMove.r === r && lastMove.c === c) {
          cell.style.boxShadow = 'inset 0 0 0 2px #F59E0B, 0 0 8px rgba(245, 158, 11, 0.6)';
          cell.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
        }

        // Highlight winning line
        if (winningLine && winningLine.some(p => p.r === r && p.c === c)) {
          cell.classList.add('winning-cell');
          cell.style.animation = 'pulse 1s infinite alternate';
        }

        const onAction = (e) => {
          e.preventDefault();
          handlePlayerMove(r, c);
        };
        cell.addEventListener('click', onAction);
        cell.addEventListener('touchstart', onAction, { passive: false });

        gridEl.appendChild(cell);
      }
    }
  }

  function checkWin(b, playerVal) {
    const directions = [
      { dr: 0, dc: 1 },  // Horizontal
      { dr: 1, dc: 0 },  // Vertical
      { dr: 1, dc: 1 },  // Diagonal \
      { dr: 1, dc: -1 }  // Diagonal /
    ];

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] !== playerVal) continue;

        for (const d of directions) {
          let line = [{ r, c }];
          for (let step = 1; step < 5; step++) {
            const nr = r + d.dr * step;
            const nc = c + d.dc * step;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr][nc] === playerVal) {
              line.push({ r: nr, c: nc });
            } else {
              break;
            }
          }
          if (line.length === 5) {
            return line;
          }
        }
      }
    }
    return null;
  }

  // Master Heuristic AI for Gomoku / Caro (High Danger Detection)
  function evaluateCell(r, c, playerVal) {
    let score = 0;
    const directions = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: -1 }
    ];

    for (const d of directions) {
      let count = 1;
      let openEnds = 0;

      // Check positive direction
      let step = 1;
      while (step < 5) {
        const nr = r + d.dr * step;
        const nc = c + d.dc * step;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (board[nr][nc] === playerVal) {
          count++;
        } else if (board[nr][nc] === 0) {
          openEnds++;
          break;
        } else {
          break;
        }
        step++;
      }

      // Check negative direction
      step = 1;
      while (step < 5) {
        const nr = r - d.dr * step;
        const nc = c - d.dc * step;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (board[nr][nc] === playerVal) {
          count++;
        } else if (board[nr][nc] === 0) {
          openEnds++;
          break;
        } else {
          break;
        }
        step++;
      }

      if (count >= 5) score += 10000000;
      else if (count === 4 && openEnds === 2) score += 4000000;
      else if (count === 4 && openEnds === 1) score += 800000;
      else if (count === 3 && openEnds === 2) score += 300000;
      else if (count === 3 && openEnds === 1) score += 15000;
      else if (count === 2 && openEnds === 2) score += 3500;
      else if (count === 2 && openEnds === 1) score += 300;
    }

    // Proximity to center bias (encourage active central control)
    score += (7 - Math.abs(r - 7)) * 2 + (7 - Math.abs(c - 7)) * 2;
    return score;
  }

  function getAIMove() {
    let bestScore = -Infinity;
    let candidates = [];

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) {
          // AI offense score
          const attack = evaluateCell(r, c, 2);
          // AI defense score (blocking player's critical threats)
          const defense = evaluateCell(r, c, 1);

          // If player has lethal threat (4 in a row or open-ended 3), defense priority skyrockets
          const defWeight = defense >= 300000 ? 1.75 : 1.3;
          const total = attack + defense * defWeight;

          if (total > bestScore) {
            bestScore = total;
            candidates = [{ r, c }];
          } else if (Math.abs(total - bestScore) < 10) {
            candidates.push({ r, c });
          }
        }
      }
    }

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return { r: 7, c: 7 };
  }

  async function handlePlayerMove(r, c) {
    if (gameOver || board[r][c] !== 0) return;

    // Player Move
    board[r][c] = 1;
    lastMove = { r, c, val: 1 };
    moveHistory.push({ r, c, val: 1 });

    if (window.NP_Audio && typeof window.NP_Audio.woodThud === 'function') {
      window.NP_Audio.woodThud();
    } else {
      AudioEngine.pop();
    }
    if (navigator.vibrate) navigator.vibrate(8);

    renderGrid();

    // Check Player Win
    const pWin = checkWin(board, 1);
    if (pWin) {
      gameOver = true;
      winningLine = pWin;
      wins++;
      if (scoreEl) scoreEl.textContent = `${wins} - ${losses}`;
      if (statusEl) statusEl.innerHTML = '<span style="color: #10B981; font-weight: 900;">🎉 BẠN ĐÃ THẮNG! 5 QUÂN THẲNG HÀNG!</span>';
      if (window.NP_Audio) window.NP_Audio.win();
      else AudioEngine.win();
      if (navigator.vibrate) navigator.vibrate([25, 50, 100]);
      renderGrid();
      return;
    }

    // AI Move
    if (statusEl) statusEl.textContent = 'Máy đang tính toán nước cờ... 🤔';
    await new Promise(res => setTimeout(res, 240));

    const aiMove = getAIMove();
    board[aiMove.r][aiMove.c] = 2;
    lastMove = { r: aiMove.r, c: aiMove.c, val: 2 };
    moveHistory.push({ r: aiMove.r, c: aiMove.c, val: 2 });

    if (window.NP_Audio && typeof window.NP_Audio.clack === 'function') {
      window.NP_Audio.clack();
    } else {
      AudioEngine.pop();
    }
    if (navigator.vibrate) navigator.vibrate(6);

    renderGrid();

    // Check AI Win
    const aiWin = checkWin(board, 2);
    if (aiWin) {
      gameOver = true;
      winningLine = aiWin;
      losses++;
      if (scoreEl) scoreEl.textContent = `${wins} - ${losses}`;
      if (statusEl) statusEl.innerHTML = '<span style="color: #EF4444; font-weight: 900;">😢 Máy đã tạo thành 5 quân! Thử lại bàn khác!</span>';
      if (window.NP_Audio) window.NP_Audio.explosion(false);
      else AudioEngine.explosion();
      if (navigator.vibrate) navigator.vibrate([30, 60]);
      renderGrid();
      return;
    }

    if (statusEl) statusEl.textContent = 'Lượt của bạn (Đánh quân X)';
  }

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (gameOver || moveHistory.length < 2) return;
      // Undo AI move
      const m2 = moveHistory.pop();
      board[m2.r][m2.c] = 0;
      // Undo Player move
      const m1 = moveHistory.pop();
      board[m1.r][m1.c] = 0;
      lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

      if (window.NP_Audio && typeof window.NP_Audio.hit === 'function') {
        window.NP_Audio.hit();
      } else {
        AudioEngine.hit();
      }
      if (navigator.vibrate) navigator.vibrate(12);

      renderGrid();
      if (statusEl) statusEl.textContent = 'Đã hoàn tác lượt đi!';
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
      moveHistory = [];
      gameOver = false;
      winningLine = null;
      lastMove = null;
      if (window.NP_Audio) window.NP_Audio.coin();
      else AudioEngine.coin();
      if (navigator.vibrate) navigator.vibrate(10);
      renderGrid();
      if (statusEl) statusEl.textContent = 'Bàn cờ mới bắt đầu! Lượt của bạn (X)';
    });
  }

  renderGrid();

}


// =========================================================================
// 9. ENGINE: RẮN SĂN MỒI (NOKIA 3310 RETRO SNAKE FULL ENGINE)
// =========================================================================
function launchSnake(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  const HIGH_SCORE_KEY = 'np_snake_high_score';
  let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0');

  const COLS = 24;
  const ROWS = 16;
  const CELL = 20;

  let snake = [
    { x: 10, y: 8 },
    { x: 9, y: 8 },
    { x: 8, y: 8 }
  ];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 16, y: 8 };
  let score = 0;
  let speedLevel = 1;
  let foodEaten = 0;
  let gameOver = false;
  let animId = null;
  let lastTick = 0;

  function spawnFood() {
    let fx, fy;
    do {
      fx = Math.floor(Math.random() * COLS);
      fy = Math.floor(Math.random() * ROWS);
    } while (snake.some(s => s.x === fx && s.y === fy));
    food = { x: fx, y: fy };
  }

  container.innerHTML = `
    <div class="canvas-game-box" style="background: #1E293B; font-family: Calibri, 'Segoe UI', sans-serif;">
      <div class="canvas-game-hud" style="background: #0F172A; color: #F8FAFC;">
        <div class="hud-pill" style="background: #1E293B; color: #F59E0B;">Tốc độ: <span id="snkSpeed">1</span></div>
        <div class="hud-pill" style="background: #1E293B; color: #10B981;">Điểm: <span id="snkScore">0</span></div>
        <div class="hud-pill" style="background: #1E293B; color: #38BDF8;">Kỷ lục: <span id="snkHigh">${highScore}</span></div>
      </div>

      <canvas id="snkCanvas" width="${COLS * CELL}" height="${ROWS * CELL}" class="canvas-main-viewport" style="background: #0B0F19; border: 2px solid #334155; border-radius: 8px;"></canvas>

      <div class="canvas-controls-bar" style="background: #0F172A; font-family: Calibri, sans-serif;">
        <small style="color: #94A3B8;">📱 Vuốt ngón tay trên màn hình hoặc dùng phím Mũi tên / Phím ảo để điều khiển rắn</small>
        <button class="btn-canvas-action" id="snkRestartBtn" style="background: #10B981; color: #FFF; font-family: Calibri, sans-serif;">
          Chơi lại
        </button>
      </div>
      <div class="virtual-dpad-row" style="margin-top: 6px;">
        <button class="v-btn" id="snkUp">▲</button>
      </div>
      <div class="virtual-dpad-row" style="margin-top: 4px;">
        <button class="v-btn" id="snkLeft">◀</button>
        <button class="v-btn" id="snkDown">▼</button>
        <button class="v-btn" id="snkRight">▶</button>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#snkCanvas');
  const ctx = canvas.getContext('2d');
  let screenShake = 0;
  let particles = [];
  let isBonusFood = false;

  function spawnFood() {
    const available = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!snake.some(segment => segment.x === x && segment.y === y)) available.push({ x, y });
      }
    }
    if (!available.length) {
      gameOver = true;
      return;
    }
    food = available[Math.floor(Math.random() * available.length)];
    isBonusFood = Math.random() < 0.25; // 25% chance of Golden Apple
  }

  let inputQueue = [];

  function changeDir(dx, dy) {
    if (gameOver) return;
    const last = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : dir;
    // Prevent 180-degree suicide reversal
    if (last.x === -dx && last.y === -dy) return;
    // Don't queue identical direction
    if (last.x === dx && last.y === dy) return;
    // Buffer up to 2 queued turns for flawless cornering
    if (inputQueue.length < 2) {
      inputQueue.push({ x: dx, y: dy });
      if (window.NP_Juice) NP_Juice.vibrate.light();
    }
  }

  function bindBtn(id, dx, dy) {
    const btn = container.querySelector(id);
    if (!btn) return;
    const handler = (e) => {
      e.preventDefault();
      changeDir(dx, dy);
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchstart', handler);
  }
  bindBtn('#snkUp', 0, -1);
  bindBtn('#snkDown', 0, 1);
  bindBtn('#snkLeft', -1, 0);
  bindBtn('#snkRight', 1, 0);

  // Touch Swipe Gesture Detection for ultimate tactile feel
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 20) {
      if (absX > absY) {
        changeDir(dx > 0 ? 1 : -1, 0);
      } else {
        changeDir(0, dy > 0 ? 1 : -1);
      }
    }
  }, { passive: false });

  const keyHandler = (e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) { changeDir(0, -1); e.preventDefault(); }
    else if (['ArrowDown', 's', 'S'].includes(e.key)) { changeDir(0, 1); e.preventDefault(); }
    else if (['ArrowLeft', 'a', 'A'].includes(e.key)) { changeDir(-1, 0); e.preventDefault(); }
    else if (['ArrowRight', 'd', 'D'].includes(e.key)) { changeDir(1, 0); e.preventDefault(); }
  };
  listen(window, 'keydown', keyHandler);

  container.querySelector('#snkRestartBtn')?.addEventListener('click', () => {
    resetGame();
  });

  function resetGame() {
    snake = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    inputQueue = [];
    score = 0;
    foodEaten = 0;
    speedLevel = 1;
    gameOver = false;
    particles = [];
    screenShake = 0;
    spawnFood();
    updateHUD();
  }

  function updateHUD() {
    const sEl = container.querySelector('#snkScore');
    const spEl = container.querySelector('#snkSpeed');
    const hEl = container.querySelector('#snkHigh');
    if (sEl) sEl.textContent = score;
    if (spEl) spEl.textContent = speedLevel;
    if (hEl) hEl.textContent = highScore;
  }

  function tick() {
    if (inputQueue.length > 0) {
      dir = inputQueue.shift();
    }
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      gameOver = true;
      screenShake = 12;
      if (window.NP_Juice) NP_Juice.vibrate.heavy();
      AudioEngine.explosion();
      return;
    }

    // Self collision
    const eating = head.x === food.x && head.y === food.y;
    // Moving into the tail's old square is legal unless the snake is growing.
    const occupied = eating ? snake : snake.slice(0, -1);
    if (occupied.some(s => s.x === head.x && s.y === head.y)) {
      gameOver = true;
      screenShake = 12;
      if (window.NP_Juice) NP_Juice.vibrate.heavy();
      AudioEngine.explosion();
      return;
    }

    snake.unshift(head);

    // Food collision
    if (eating) {
      const pts = (isBonusFood ? 100 : 50) * speedLevel;
      score += pts;
      foodEaten++;
      screenShake = 4;
      if (window.NP_Juice) NP_Juice.vibrate.medium();

      if (score > highScore) {
        highScore = score;
        localStorage.setItem(HIGH_SCORE_KEY, highScore);
      }
      AudioEngine.coin();

      // Spawn particles
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4 + 1;
        particles.push({
          x: food.x * CELL + CELL / 2,
          y: food.y * CELL + CELL / 2,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color: isBonusFood ? '#FBBF24' : '#EF4444',
          life: 1.0
        });
      }

      if (foodEaten % 4 === 0 && speedLevel < 9) {
        speedLevel++;
        AudioEngine.powerup();
      }
      spawnFood();
      updateHUD();
    } else {
      snake.pop();
    }
  }

  function loop(timestamp) {
    const interval = Math.max(65, 190 - speedLevel * 14);
    if (!lastTick) lastTick = timestamp;

    if (timestamp - lastTick >= interval) {
      lastTick = timestamp;
      if (!gameOver) {
        tick();
      }
    }

    // --- RENDER ---
    ctx.save();
    if (screenShake > 0) {
      const ox = (Math.random() - 0.5) * screenShake;
      const oy = (Math.random() - 0.5) * screenShake;
      ctx.translate(ox, oy);
      screenShake *= 0.85;
      if (screenShake < 0.2) screenShake = 0;
    }

    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid matrix dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillRect(c * CELL + CELL / 2 - 0.5, r * CELL + CELL / 2 - 0.5, 1, 1);
      }
    }

    // Food (Appealing Apple with Leaf & Stem)
    const foodCX = food.x * CELL + CELL / 2;
    const foodCY = food.y * CELL + CELL / 2;
    const pulse = 1 + Math.sin(Date.now() / 180) * 0.1;

    ctx.save();
    ctx.translate(foodCX, foodCY);
    ctx.scale(pulse, pulse);

    if (isBonusFood) {
      // Golden Star Apple
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = '#FBBF24';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 1, CELL / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Juicy Red Apple
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, 1, CELL / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      // Stem & Leaf
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-1, -CELL / 2 + 1, 2, 4);
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.ellipse(3, -CELL / 2 + 2, 3, 1.5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Snake Body with Rounded Segments
    snake.forEach((seg, idx) => {
      const isHead = idx === 0;
      const x = seg.x * CELL + 1.5;
      const y = seg.y * CELL + 1.5;
      const size = CELL - 3;
      const rad = isHead ? 6 : 4;

      if (isHead) {
        ctx.fillStyle = '#10B981';
        ctx.shadowColor = '#059669';
        ctx.shadowBlur = 6;
      } else {
        const ratio = idx / snake.length;
        ctx.fillStyle = ratio < 0.5 ? '#059669' : '#047857';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, size, size, rad);
      } else {
        ctx.rect(x, y, size, size);
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Dynamic Eyes on Head looking towards movement direction
      if (isHead) {
        const eyeOffX = dir.x * 2;
        const eyeOffY = dir.y * 2;

        let leftEyeX = seg.x * CELL + 5 + eyeOffX;
        let leftEyeY = seg.y * CELL + 5 + eyeOffY;
        let rightEyeX = seg.x * CELL + 12 + eyeOffX;
        let rightEyeY = seg.y * CELL + 5 + eyeOffY;

        if (dir.x !== 0) {
          leftEyeX = seg.x * CELL + (dir.x > 0 ? 12 : 5);
          leftEyeY = seg.y * CELL + 5;
          rightEyeX = leftEyeX;
          rightEyeY = seg.y * CELL + 12;
        }

        // Eye sclera
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, 2.5, 0, Math.PI * 2);
        ctx.arc(rightEyeX, rightEyeY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupils
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(leftEyeX + dir.x * 0.8, leftEyeY + dir.y * 0.8, 1.2, 0, Math.PI * 2);
        ctx.arc(rightEyeX + dir.x * 0.8, rightEyeY + dir.y * 0.8, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= 0.04;
      if (p.life <= 0) {
        particles.splice(i, 1);
      } else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    if (gameOver) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 24px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2 - 12);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '15px Calibri, sans-serif';
      ctx.fillText(`Điểm số: ${score} - Nhấn "Chơi lại"`, canvas.width / 2, canvas.height / 2 + 16);
    }

    ctx.restore();
    animId = requestAnimationFrame(loop);
  }

  spawnFood();
  animId = requestAnimationFrame(loop);

  onCleanup(() => {
    cancelAnimationFrame(animId);
  });
}


// =========================================================================
// 10. ENGINE: XẾP GẠCH (TETRIS CỔ ĐIỂN FULL ENGINE)
// =========================================================================
function launchTetris(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  const HIGH_SCORE_KEY = 'np_tetris_high_score';
  let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0');

  const COLS = 10;
  const ROWS = 20;
  const CELL = 22;

  let grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
  let score = 0;
  let linesCleared = 0;
  let level = 1;
  let gameOver = false;
  let animId = null;
  let lastDrop = 0;
  let canHold = true;
  let holdPiece = null;
  let screenShake = 0;
  let bannerText = '';
  let bannerTimer = 0;
  let lineClearParticles = [];

  // Tetrominoes
  const SHAPES = {
    I: { shape: [[1, 1, 1, 1]], color: '#06B6D4', light: '#67E8F9', dark: '#0891B2' },
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3B82F6', light: '#93C5FD', dark: '#1D4ED8' },
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#F97316', light: '#FDBA74', dark: '#C2410C' },
    O: { shape: [[1, 1], [1, 1]], color: '#FBBF24', light: '#FDE68A', dark: '#D97706' },
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#10B981', light: '#6EE7B7', dark: '#047857' },
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#8B5CF6', light: '#C4B5FD', dark: '#6D28D9' },
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#EF4444', light: '#FCA5A5', dark: '#B91C1C' }
  };
  const PIECE_KEYS = Object.keys(SHAPES);

  function randomPiece() {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    const def = SHAPES[key];
    return {
      type: key,
      matrix: JSON.parse(JSON.stringify(def.shape)),
      color: def.color,
      light: def.light,
      dark: def.dark,
      x: Math.floor(COLS / 2) - Math.floor(def.shape[0].length / 2),
      y: 0
    };
  }

  let currentPiece = randomPiece();
  let nextPiece = randomPiece();

  // Start authentic Tetris Korobeiniki BGM
  if (window.NP_Audio?.startBGM) {
    NP_Audio.startBGM('tetris');
  }

  container.innerHTML = `
    <div class="canvas-game-box" style="max-width: 520px; font-family: Calibri, 'Segoe UI', sans-serif;">
      <div class="canvas-game-hud">
        <div class="hud-pill">Cấp: <span id="tetLevel" style="color: #F59E0B;">1</span></div>
        <div class="hud-pill">Hàng: <span id="tetLines" style="color: #38BDF8;">0</span></div>
        <div class="hud-pill">Điểm: <span id="tetScore" style="color: #10B981;">0</span></div>
        <div class="hud-pill">Kỷ lục: <span id="tetHigh">${highScore}</span></div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: center; align-items: flex-start; margin: 8px 0;">
        <!-- Left Side: HOLD Piece -->
        <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
          <div class="hud-pill" style="font-size: 0.72rem; padding: 2px 8px;">Dự trữ (Hold):</div>
          <canvas id="tetHoldCanvas" width="70" height="70" style="background: #111827; border: 1.5px solid #4B5563; border-radius: 4px;"></canvas>
          <button class="btn-canvas-action" id="tetHoldBtn" style="font-size: 0.72rem; padding: 4px 8px; width: 100%; background: #4B5563; color: #FFF; font-family: Calibri, sans-serif;">
            📥 Cất [C]
          </button>
        </div>

        <!-- Main Board -->
        <div style="position: relative;">
          <canvas id="tetCanvas" width="${COLS * CELL}" height="${ROWS * CELL}" style="background: #0B0F19; border: 3px solid #374151; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.6);"></canvas>
        </div>

        <!-- Right Side: NEXT Piece -->
        <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
          <div class="hud-pill" style="font-size: 0.72rem; padding: 2px 8px;">Kế tiếp:</div>
          <canvas id="tetNextCanvas" width="70" height="70" style="background: #111827; border: 1.5px solid #4B5563; border-radius: 4px;"></canvas>
          <button class="btn-canvas-action" id="tetHardDropBtn" style="background: var(--accent-terracotta); color: #FFF; font-size: 0.72rem; padding: 4px 8px; width: 100%; font-family: Calibri, sans-serif;">
            Thả (Space)
          </button>
        </div>
      </div>

      <div class="canvas-controls-bar" style="font-family: Calibri, sans-serif;">
        <div style="display: flex; gap: 5px; flex-wrap: wrap; justify-content: center;">
          <button class="btn-canvas-action" id="tetLeft">◀ Trái</button>
          <button class="btn-canvas-action" id="tetRight">Phải ▶</button>
          <button class="btn-canvas-action" id="tetDown">▼ Rơi</button>
          <button class="btn-canvas-action" id="tetRotate">Xoay</button>
        </div>
        <button class="btn-canvas-action" id="tetRestartBtn" style="font-family: Calibri, sans-serif;">Chơi lại</button>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#tetCanvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = container.querySelector('#tetNextCanvas');
  const nextCtx = nextCanvas.getContext('2d');
  const holdCanvas = container.querySelector('#tetHoldCanvas');
  const holdCtx = holdCanvas.getContext('2d');

  function updateHUD() {
    const lEl = container.querySelector('#tetLevel');
    const liEl = container.querySelector('#tetLines');
    const sEl = container.querySelector('#tetScore');
    const hEl = container.querySelector('#tetHigh');
    if (lEl) lEl.textContent = level;
    if (liEl) liEl.textContent = linesCleared;
    if (sEl) sEl.textContent = score;
    if (hEl) hEl.textContent = highScore;
    drawNextPiece();
    drawHoldPiece();
  }

  function drawMiniPiece(context, piece) {
    context.fillStyle = '#111827';
    context.fillRect(0, 0, 70, 70);
    if (!piece) return;

    const m = piece.matrix || SHAPES[piece.type].shape;
    const color = piece.color || SHAPES[piece.type].color;
    const light = piece.light || SHAPES[piece.type].light;
    const dark = piece.dark || SHAPES[piece.type].dark;

    const size = 13;
    const offX = Math.floor((70 - m[0].length * size) / 2);
    const offY = Math.floor((70 - m.length * size) / 2);

    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c]) {
          drawBevelBlock(context, offX + c * size, offY + r * size, size, color, light, dark);
        }
      }
    }
  }

  function drawNextPiece() {
    drawMiniPiece(nextCtx, nextPiece);
  }

  function drawHoldPiece() {
    drawMiniPiece(holdCtx, holdPiece);
  }

  function drawBevelBlock(context, x, y, size, color, light, dark) {
    // Base fill
    context.fillStyle = color;
    context.fillRect(x, y, size, size);

    // Bevel Top & Left (Light)
    context.fillStyle = light || 'rgba(255, 255, 255, 0.4)';
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + size, y);
    context.lineTo(x + size - 2, y + 2);
    context.lineTo(x + 2, y + 2);
    context.lineTo(x + 2, y + size - 2);
    context.lineTo(x, y + size);
    context.closePath();
    context.fill();

    // Bevel Bottom & Right (Dark)
    context.fillStyle = dark || 'rgba(0, 0, 0, 0.4)';
    context.beginPath();
    context.moveTo(x + size, y);
    context.lineTo(x + size, y + size);
    context.lineTo(x, y + size);
    context.lineTo(x + 2, y + size - 2);
    context.lineTo(x + size - 2, y + size - 2);
    context.lineTo(x + size - 2, y + 2);
    context.closePath();
    context.fill();
  }

  function collides(p, offX = 0, offY = 0, mat = p.matrix) {
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c]) {
          const nx = p.x + c + offX;
          const ny = p.y + r + offY;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && grid[ny][nx]) return true;
        }
      }
    }
    return false;
  }

  function rotateMatrix(m) {
    const res = [];
    for (let c = 0; c < m[0].length; c++) {
      const row = [];
      for (let r = m.length - 1; r >= 0; r--) {
        row.push(m[r][c]);
      }
      res.push(row);
    }
    return res;
  }

  function rotatePiece() {
    const rotated = rotateMatrix(currentPiece.matrix);
    let success = false;
    if (!collides(currentPiece, 0, 0, rotated)) {
      currentPiece.matrix = rotated;
      success = true;
    } else if (!collides(currentPiece, -1, 0, rotated)) {
      currentPiece.x -= 1;
      currentPiece.matrix = rotated;
      success = true;
    } else if (!collides(currentPiece, 1, 0, rotated)) {
      currentPiece.x += 1;
      currentPiece.matrix = rotated;
      success = true;
    }
    if (success) {
      if (window.NP_Audio?.pop) NP_Audio.pop();
      else AudioEngine.pop();
      if (window.NP_Juice) window.NP_Juice.vibrate(8);
    }
  }

  function hold() {
    if (!canHold || gameOver) return;
    canHold = false;

    if (holdPiece === null) {
      holdPiece = {
        type: currentPiece.type,
        color: currentPiece.color,
        light: currentPiece.light,
        dark: currentPiece.dark,
        matrix: JSON.parse(JSON.stringify(SHAPES[currentPiece.type].shape))
      };
      currentPiece = nextPiece;
      nextPiece = randomPiece();
    } else {
      const tempType = holdPiece.type;
      holdPiece = {
        type: currentPiece.type,
        color: currentPiece.color,
        light: currentPiece.light,
        dark: currentPiece.dark,
        matrix: JSON.parse(JSON.stringify(SHAPES[currentPiece.type].shape))
      };
      const def = SHAPES[tempType];
      currentPiece = {
        type: tempType,
        matrix: JSON.parse(JSON.stringify(def.shape)),
        color: def.color,
        light: def.light,
        dark: def.dark,
        x: Math.floor(COLS / 2) - Math.floor(def.shape[0].length / 2),
        y: 0
      };
    }

    if (window.NP_Audio?.pop) NP_Audio.pop();
    else AudioEngine.pop();
    if (window.NP_Juice) window.NP_Juice.vibrate(10);
    updateHUD();
  }

  function lockPiece() {
    for (let r = 0; r < currentPiece.matrix.length; r++) {
      for (let c = 0; c < currentPiece.matrix[r].length; c++) {
        if (currentPiece.matrix[r][c]) {
          const gy = currentPiece.y + r;
          const gx = currentPiece.x + c;
          if (gy < 0) {
            gameOver = true;
            if (window.NP_Audio?.explosion) NP_Audio.explosion();
            else AudioEngine.explosion();
            if (window.NP_Juice) window.NP_Juice.vibrate([40, 80]);
            return;
          }
          grid[gy][gx] = {
            color: currentPiece.color,
            light: currentPiece.light,
            dark: currentPiece.dark
          };
        }
      }
    }

    if (window.NP_Audio?.thud) NP_Audio.thud();
    else AudioEngine.pop();

    canHold = true;

    // Clear completed lines
    let lines = 0;
    const clearedRows = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(c => c !== 0)) {
        clearedRows.push(r);
        grid.splice(r, 1);
        grid.unshift(Array(COLS).fill(0));
        lines++;
        r++; // check same row index again
      }
    }

    if (lines > 0) {
      linesCleared += lines;
      const pts = [0, 100, 300, 500, 1200][lines] * level;
      score += pts;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem(HIGH_SCORE_KEY, highScore);
      }

      // Fanfare & particle burst & Haptics
      if (lines === 4) {
        bannerText = '⚡ TETRIS! +1200 ⚡';
        bannerTimer = 60;
        screenShake = 12;
        if (window.NP_Audio?.win) NP_Audio.win();
        else AudioEngine.win();
        if (window.NP_Juice) window.NP_Juice.vibrate([25, 45, 75]);
      } else if (lines === 3) {
        bannerText = 'TRIPLE! +500';
        bannerTimer = 45;
        screenShake = 6;
        if (window.NP_Audio?.coin) NP_Audio.coin();
        else AudioEngine.coin();
        if (window.NP_Juice) window.NP_Juice.vibrate([20, 40]);
      } else if (lines === 2) {
        bannerText = 'DOUBLE! +300';
        bannerTimer = 35;
        screenShake = 3;
        if (window.NP_Audio?.coin) NP_Audio.coin();
        else AudioEngine.coin();
        if (window.NP_Juice) window.NP_Juice.vibrate(25);
      } else {
        if (window.NP_Audio?.coin) NP_Audio.coin();
        else AudioEngine.coin();
        if (window.NP_Juice) window.NP_Juice.vibrate(18);
      }

      // Spawn line clear particles
      clearedRows.forEach(rowY => {
        for (let i = 0; i < 20; i++) {
          lineClearParticles.push({
            x: Math.random() * (COLS * CELL),
            y: rowY * CELL + CELL / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 4,
            life: 25,
            color: ['#FBBF24', '#38BDF8', '#F43F5E', '#10B981'][Math.floor(Math.random() * 4)]
          });
        }
      });

      if (Math.floor(linesCleared / 10) + 1 > level) {
        level++;
        if (window.NP_Audio?.powerup) NP_Audio.powerup();
        else AudioEngine.powerup();
      }
    }

    currentPiece = nextPiece;
    nextPiece = randomPiece();
    updateHUD();

    if (collides(currentPiece)) {
      gameOver = true;
      if (window.NP_Audio?.explosion) NP_Audio.explosion();
      else AudioEngine.explosion();
    }
  }

  function hardDrop() {
    let dropped = 0;
    while (!collides(currentPiece, 0, 1)) {
      currentPiece.y++;
      dropped++;
      score += 2;
    }
    screenShake = Math.min(8, dropped);
    if (window.NP_Juice) window.NP_Juice.vibrate(22);
    lockPiece();
    updateHUD();
  }

  // Keyboard controls
  function handleKeyDown(e) {
    if (gameOver) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      if (!collides(currentPiece, -1, 0)) {
        currentPiece.x--;
        if (window.NP_Juice) window.NP_Juice.vibrate(5);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      if (!collides(currentPiece, 1, 0)) {
        currentPiece.x++;
        if (window.NP_Juice) window.NP_Juice.vibrate(5);
      }
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      if (!collides(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 1;
        if (window.NP_Juice) window.NP_Juice.vibrate(5);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      rotatePiece();
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      hardDrop();
    } else if (e.key === 'c' || e.key === 'C' || e.key === 'Shift') {
      e.preventDefault();
      hold();
    }
  }

  listen(window, 'keydown', handleKeyDown);

  // Mobile Touch Gestures (Swipe left/right, pull down, tap rotate)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;

  canvas.addEventListener('touchstart', (e) => {
    if (gameOver || !e.touches[0]) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved = false;
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (gameOver || !e.touches[0]) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    // Horizontal Swipe
    if (Math.abs(dx) > CELL) {
      const step = Math.sign(dx);
      if (!collides(currentPiece, step, 0)) {
        currentPiece.x += step;
        touchStartX = e.touches[0].clientX;
        touchMoved = true;
        if (window.NP_Juice) window.NP_Juice.vibrate(6);
      }
    }

    // Soft Drop Swipe Down
    if (dy > CELL * 1.5) {
      if (!collides(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 1;
        touchStartY = e.touches[0].clientY;
        touchMoved = true;
        if (window.NP_Juice) window.NP_Juice.vibrate(6);
      }
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    if (gameOver) return;
    if (!touchMoved) {
      rotatePiece();
    }
  });

  container.querySelector('#tetLeft')?.addEventListener('click', () => {
    if (!collides(currentPiece, -1, 0)) {
      currentPiece.x--;
      if (window.NP_Juice) window.NP_Juice.vibrate(5);
    }
  });
  container.querySelector('#tetRight')?.addEventListener('click', () => {
    if (!collides(currentPiece, 1, 0)) {
      currentPiece.x++;
      if (window.NP_Juice) window.NP_Juice.vibrate(5);
    }
  });
  container.querySelector('#tetDown')?.addEventListener('click', () => {
    if (!collides(currentPiece, 0, 1)) {
      currentPiece.y++;
      if (window.NP_Juice) window.NP_Juice.vibrate(5);
    }
  });
  container.querySelector('#tetRotate')?.addEventListener('click', rotatePiece);
  container.querySelector('#tetHardDropBtn')?.addEventListener('click', hardDrop);
  container.querySelector('#tetHoldBtn')?.addEventListener('click', hold);
  container.querySelector('#tetRestartBtn')?.addEventListener('click', () => {
    grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    score = 0;
    linesCleared = 0;
    level = 1;
    gameOver = false;
    canHold = true;
    holdPiece = null;
    currentPiece = randomPiece();
    nextPiece = randomPiece();
    updateHUD();
    if (window.NP_Audio?.startBGM) NP_Audio.startBGM('tetris');
  });

  function getGhostY() {
    let gy = currentPiece.y;
    while (!collides(currentPiece, 0, gy - currentPiece.y + 1)) {
      gy++;
    }
    return gy;
  }

  function loop(timestamp) {
    const dropInterval = Math.max(80, 750 - (level - 1) * 65);
    if (!lastDrop) lastDrop = timestamp;

    if (timestamp - lastDrop >= dropInterval) {
      lastDrop = timestamp;
      if (!gameOver) {
        if (!collides(currentPiece, 0, 1)) {
          currentPiece.y++;
        } else {
          lockPiece();
        }
      }
    }

    // --- RENDER WITH SCREEN SHAKE ---
    ctx.save();
    if (screenShake > 0) {
      const ox = (Math.random() - 0.5) * screenShake;
      const oy = (Math.random() - 0.5) * screenShake;
      ctx.translate(ox, oy);
      screenShake *= 0.85;
      if (screenShake < 0.3) screenShake = 0;
    }

    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle Grid Matrix Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(COLS * CELL, r * CELL);
      ctx.stroke();
    }

    // Draw Locked Grid Blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          const blk = grid[r][c];
          drawBevelBlock(ctx, c * CELL + 1, r * CELL + 1, CELL - 2, blk.color, blk.light, blk.dark);
        }
      }
    }

    // Draw Ghost Piece (Soft translucent outline)
    if (!gameOver) {
      const gy = getGhostY();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = currentPiece.color;
      ctx.lineWidth = 1.5;
      for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
          if (currentPiece.matrix[r][c]) {
            const bx = (currentPiece.x + c) * CELL + 1;
            const by = (gy + r) * CELL + 1;
            ctx.fillRect(bx, by, CELL - 2, CELL - 2);
            ctx.strokeRect(bx, by, CELL - 2, CELL - 2);
          }
        }
      }
    }

    // Draw Current Falling Piece
    if (!gameOver) {
      for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
          if (currentPiece.matrix[r][c]) {
            drawBevelBlock(
              ctx,
              (currentPiece.x + c) * CELL + 1,
              (currentPiece.y + r) * CELL + 1,
              CELL - 2,
              currentPiece.color,
              currentPiece.light,
              currentPiece.dark
            );
          }
        }
      }
    }

    // Update & Draw Particles
    for (let i = lineClearParticles.length - 1; i >= 0; i--) {
      const p = lineClearParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
      if (p.life <= 0) lineClearParticles.splice(i, 1);
    }

    // Banner Alert (TETRIS! / TRIPLE!)
    if (bannerTimer > 0) {
      bannerTimer--;
      ctx.fillStyle = '#FBBF24';
      ctx.font = 'bold 18px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 8;
      ctx.fillText(bannerText, canvas.width / 2, canvas.height / 2 - 20);
      ctx.shadowBlur = 0;
    }

    // Game Over Overlay
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 22px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2 - 15);
      ctx.fillStyle = '#FFF';
      ctx.font = '15px Calibri, sans-serif';
      ctx.fillText(`Điểm số: ${score}`, canvas.width / 2, canvas.height / 2 + 12);
      ctx.font = '12px Calibri, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Nhấn [Chơi lại] để thử lại', canvas.width / 2, canvas.height / 2 + 34);
    }

    ctx.restore();
    animId = requestAnimationFrame(loop);
  }

  updateHUD();
  animId = requestAnimationFrame(loop);

  onCleanup(() => {
    cancelAnimationFrame(animId);
    if (window.NP_Audio?.stopBGM) NP_Audio.stopBGM();
  });
}


  // =========================================================================
  // 11. ENGINE: ARCADE RETRO EMULATOR (UNIVERSAL FOR OTHER 95 GAMES)
  // =========================================================================
// =========================================================================
// 12. ENGINE: FLAPPY BIRD (HUYỀN THOẠI NGUYỄN HÀ ĐÔNG 2013)
// =========================================================================
function launchFlappyBird(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  let score = 0;
  let highScore = parseInt(localStorage.getItem('np_flappy_high') || '0');
  let bird = { y: 200, vy: 0 };
  let pipes = [];
  let frame = 0;
  let gameOver = false;
  let started = false;
  let animId = null;

    container.innerHTML = `
    <div class="canvas-game-box" style="max-width: 420px; font-family: Calibri, sans-serif;">
      <div class="canvas-game-hud">
        <div class="hud-pill">Điểm: <span id="fbScore" style="color: #10B981; font-weight: bold;">0</span></div>
        <div class="hud-pill">Kỷ lục: <span id="fbHigh" style="font-weight: bold;">${highScore}</span></div>
      </div>
      <canvas id="fbCanvas" width="360" height="480" class="canvas-main-viewport" style="touch-action: none; display: block; margin: 0 auto;"></canvas>
      <div class="canvas-controls-bar" style="touch-action: none;">
        <button class="btn-canvas-action" id="fbFlapBtn" style="background: var(--accent-terracotta); color: #FFF; width: 100%; font-size: 1rem; font-weight: 900; padding: 10px;">
          🕊️ VỖ CÁNH (SPACE / CHẠM)
        </button>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#fbCanvas');
  const ctx = canvas.getContext('2d');

  function flap() {
    if (gameOver) {
      score = 0;
      bird.y = 200;
      bird.vy = 0;
      pipes = [];
      gameOver = false;
      started = true;
      updateHUD();
      if (window.NP_Juice) window.NP_Juice.vibrate(15);
      return;
    }
    started = true;
    bird.vy = -6.2;
    AudioEngine.pop();
    if (window.NP_Juice) window.NP_Juice.vibrate(12);
  }

  const onKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.code === 'Space') {
      e.preventDefault();
      flap();
    }
  };
  listen(window, 'keydown', onKeyDown);
  canvas.addEventListener('click', flap);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flap();
  }, { passive: false });

  container.querySelector('#fbFlapBtn')?.addEventListener('click', flap);
  container.querySelector('#fbFlapBtn')?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flap();
  }, { passive: false });

  function updateHUD() {
    const sEl = container.querySelector('#fbScore');
    const hEl = container.querySelector('#fbHigh');
    if (sEl) sEl.textContent = score;
    if (hEl) hEl.textContent = highScore;
  }

  function loop() {
    frame++;

    if (started && !gameOver) {
      bird.vy += 0.36; // Gravity
      bird.y += bird.vy;

      // Spawn pipes
      if (frame % 85 === 0) {
        const topH = 60 + Math.random() * 200;
        pipes.push({ x: canvas.width, top: topH, passed: false });
      }

      // Update pipes
      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= 2.6;

        // Score
        if (!p.passed && p.x + 52 < 90) {
          p.passed = true;
          score++;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem('np_flappy_high', highScore);
          }
          AudioEngine.coin();
          if (window.NP_Juice) window.NP_Juice.vibrate(15);
          updateHUD();
        }

        // Collision
        const birdX = 90;
        const birdR = 14;
        const gap = 125;
        if (birdX + birdR > p.x && birdX - birdR < p.x + 52) {
          if (bird.y - birdR < p.top || bird.y + birdR > p.top + gap) {
            gameOver = true;
            AudioEngine.explosion();
            if (window.NP_Juice) {
              window.NP_Juice.vibrate([35, 60]);
              window.NP_Juice.screenShake(canvas, 10, 300);
            }
          }
        }

        if (p.x < -60) pipes.splice(i, 1);
      }

      // Ground / Ceiling collision
      if (bird.y > canvas.height - 45 || bird.y < 0) {
        gameOver = true;
        AudioEngine.explosion();
        if (window.NP_Juice) {
          window.NP_Juice.vibrate([35, 60]);
          window.NP_Juice.screenShake(canvas, 10, 300);
        }
      }
    }

    // --- RENDER ---
    // Sky
    ctx.fillStyle = '#70C5CE';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // City Skyline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let c = 0; c < 5; c++) {
      ctx.fillRect(c * 80 + 10, canvas.height - 130, 60, 90);
    }

    // Pipes
    pipes.forEach(p => {
      ctx.fillStyle = '#73BF2E';
      const gap = 125;
      ctx.fillRect(p.x, 0, 52, p.top);
      ctx.fillStyle = '#558022';
      ctx.fillRect(p.x - 3, p.top - 20, 58, 20);

      ctx.fillStyle = '#73BF2E';
      ctx.fillRect(p.x, p.top + gap, 52, canvas.height - (p.top + gap));
      ctx.fillStyle = '#558022';
      ctx.fillRect(p.x - 3, p.top + gap, 58, 20);
    });

    // Ground
    ctx.fillStyle = '#DED895';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = '#73BF2E';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 10);

    // Bird
    ctx.save();
    ctx.translate(90, bird.y);
    const rot = Math.min(Math.PI / 3, Math.max(-Math.PI / 4, bird.vy * 0.08));
    ctx.rotate(rot);

    // Body
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wing
    const wingY = Math.sin(frame * 0.3) * 4;
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(-5, wingY, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(6, -6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(8, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 4);
    ctx.lineTo(12, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (!started) {
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 20px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CHẠM ĐỂ BẮT ĐẦU VỖ CÁNH!', canvas.width / 2, canvas.height / 2 - 20);
    } else if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 26px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RƠI RỒI! GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#FFF';
      ctx.font = '16px Calibri, sans-serif';
      ctx.fillText(`Điểm: ${score} (Kỷ lục: ${highScore})`, canvas.width / 2, canvas.height / 2 + 15);
      ctx.fillText('Chạm để chơi lại', canvas.width / 2, canvas.height / 2 + 45);
    }

    animId = requestAnimationFrame(loop);
  }

  animId = requestAnimationFrame(loop);

  onCleanup(() => {
    cancelAnimationFrame(animId);
  });
}


// =========================================================================
// 13. ENGINE: CHÉM HOA QUẢ (FRUIT NINJA CỔ ĐIỂN FULL ENGINE)
// =========================================================================
function launchFruitNinja(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  let score = 0;
  let combo = 0;
  let lives = 3;
  let fruits = [];
  let trail = [];
  let splatters = [];
  let gameOver = false;
  let animId = null;

  const FRUIT_TYPES = [
    { name: 'Watermelon', icon: '🍉', radius: 26, color: '#10B981', innerColor: '#EF4444' },
    { name: 'Apple', icon: '🍎', radius: 22, color: '#EF4444', innerColor: '#FEF08A' },
    { name: 'Orange', icon: '🍊', radius: 22, color: '#F97316', innerColor: '#FED7AA' },
    { name: 'Banana', icon: '🍌', radius: 20, color: '#FBBF24', innerColor: '#FEF08A' },
    { name: 'Strawberry', icon: '🍓', radius: 18, color: '#F43F5E', innerColor: '#FECDD3' }
  ];

  container.innerHTML = `
    <div class="canvas-game-box" style="max-width: 520px;">
      <div class="canvas-game-hud">
        <div class="hud-pill">Mạng: <span id="fnLives" style="color: #EF4444;">❤️❤️❤️</span></div>
        <div class="hud-pill">Điểm: <span id="fnScore" style="color: #10B981;">0</span></div>
        <div class="hud-pill">Combo: <span id="fnCombo" style="color: #F59E0B;">0</span></div>
      </div>
      <canvas id="fnCanvas" width="520" height="400" class="canvas-main-viewport"></canvas>
      <div class="canvas-controls-bar">
        <small style="color: #FFF;">⚔️ Giữ chuột hoặc Quẹt ngón tay để chém đứt hoa quả! Tránh bom đen 💣!</small>
        <button class="btn-canvas-action" id="fnRestartBtn">Chơi lại</button>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#fnCanvas');
  const ctx = canvas.getContext('2d');
  let isSwiping = false;

  canvas.addEventListener('mousedown', (e) => {
    isSwiping = true;
    addTrailPoint(e);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (isSwiping) addTrailPoint(e);
  });
  listen(window, 'mouseup', () => { isSwiping = false; });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isSwiping = true;
    addTrailPoint(e.touches[0]);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isSwiping) addTrailPoint(e.touches[0]);
  });
  listen(window, 'touchend', () => { isSwiping = false; });

  let floatingScores = [];
  let screenShake = 0;

  function addTrailPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    trail.push({ x, y, life: 14 });
    checkSlash(x, y);
  }

  function checkSlash(x, y) {
    if (gameOver) return;
    let cutInThisSwipe = 0;

    // Determine current slash direction vector
    let slashDirX = 1, slashDirY = 0;
    if (trail.length >= 2) {
      const p1 = trail[trail.length - 2];
      const p2 = trail[trail.length - 1];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (len > 0) {
        slashDirX = (p2.x - p1.x) / len;
        slashDirY = (p2.y - p1.y) / len;
      }
    }

    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      if (!f.sliced && Math.hypot(x - f.x, y - f.y) < f.radius + 18) {
        if (f.isBomb) {
          gameOver = true;
          screenShake = 16;
          if (window.NP_Juice) NP_Juice.vibrate.heavy();
          AudioEngine.explosion();
          return;
        }

        // Tactile hitstop: micro-freeze frame for slice impact feel
        if (window.NP_Juice) {
          NP_Juice.triggerHitstop(35);
          NP_Juice.vibrate.medium();
        }

        f.sliced = true;
        cutInThisSwipe++;
        score += 10;
        AudioEngine.pop();

        // Calculate perpendicular split velocity based on slash angle
        f.perpX = -slashDirY * 4.5;
        f.perpY = slashDirX * 4.5;
        f.half1X = 0; f.half1Y = 0;
        f.half2X = 0; f.half2Y = 0;

        floatingScores.push({
          x: f.x,
          y: f.y - 10,
          vy: -2.5,
          text: '+10',
          color: '#FEF08A'
        });

        // Juice splatter burst
        for (let s = 0; s < 18; s++) {
          splatters.push({
            x: f.x,
            y: f.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            color: f.type.innerColor,
            radius: 3 + Math.random() * 6,
            alpha: 1
          });
        }
      }
    }

    if (cutInThisSwipe > 1) {
      const bonus = cutInThisSwipe * 15;
      score += bonus;
      combo += cutInThisSwipe;
      screenShake = 6;
      if (window.NP_Juice) NP_Juice.vibrate.combo();
      AudioEngine.powerup();

      floatingScores.push({
        x: x,
        y: y - 25,
        vy: -3,
        text: `⚡ COMBO x${cutInThisSwipe}! +${bonus}`,
        color: '#F59E0B'
      });
    }
    updateHUD();
  }

  container.querySelector('#fnRestartBtn')?.addEventListener('click', () => {
    score = 0;
    lives = 3;
    combo = 0;
    fruits = [];
    splatters = [];
    trail = [];
    floatingScores = [];
    screenShake = 0;
    gameOver = false;
    updateHUD();
  });

  function updateHUD() {
    const lEl = container.querySelector('#fnLives');
    const sEl = container.querySelector('#fnScore');
    const cEl = container.querySelector('#fnCombo');
    if (lEl) lEl.textContent = '❤️'.repeat(Math.max(0, lives));
    if (sEl) sEl.textContent = score;
    if (cEl) cEl.textContent = combo;
  }

  function spawnFruit() {
    const isBomb = Math.random() < 0.22;
    const t = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
    fruits.push({
      type: t,
      isBomb,
      x: 70 + Math.random() * (canvas.width - 140),
      y: canvas.height + 25,
      vx: (Math.random() - 0.5) * 4.5,
      vy: -12 - Math.random() * 4,
      radius: t.radius,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.12,
      sliced: false,
      perpX: 0,
      perpY: 0,
      half1X: 0, half1Y: 0,
      half2X: 0, half2Y: 0
    });
  }

  function loop() {
    // Check hitstop freeze
    if (window.NP_Juice && NP_Juice.isFrozen()) {
      animId = requestAnimationFrame(loop);
      return;
    }

    if (!gameOver && Math.random() < 0.038) {
      spawnFruit();
    }

    ctx.save();
    // Screen shake
    if (screenShake > 0) {
      const ox = (Math.random() - 0.5) * screenShake;
      const oy = (Math.random() - 0.5) * screenShake;
      ctx.translate(ox, oy);
      screenShake *= 0.82;
      if (screenShake < 0.3) screenShake = 0;
    }

    // Dojo wooden wall background
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4E342E';
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.fillRect(0, y, canvas.width, 38);
    }

    // Splatters on wall
    for (let i = splatters.length - 1; i >= 0; i--) {
      const sp = splatters[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vx *= 0.95;
      sp.vy += 0.15;
      sp.alpha -= 0.015;
      if (sp.alpha <= 0) {
        splatters.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = sp.alpha;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Fruits & Bomb rendering
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.28;
      f.rotation += f.rotSpeed;

      if (!f.sliced) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);

        if (f.isBomb) {
          // Bomb body
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(0, 0, 19, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Fuse & Spark
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(-3, -24, 6, 8);
          ctx.fillStyle = Math.random() < 0.5 ? '#EF4444' : '#FDE047';
          ctx.beginPath();
          ctx.arc(0, -26, 5 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.font = `${f.radius * 2}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(f.type.icon, 0, 0);
        }
        ctx.restore();
      } else {
        // Sliced fruit: separate halves flying apart!
        f.half1X -= f.perpX || 3;
        f.half1Y -= f.perpY || 1;
        f.half2X += f.perpX || 3;
        f.half2Y += f.perpY || 1;

        ctx.save();
        ctx.translate(f.x + f.half1X, f.y + f.half1Y);
        ctx.rotate(f.rotation - 0.4);
        ctx.font = `${f.radius * 1.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.type.icon, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(f.x + f.half2X, f.y + f.half2Y);
        ctx.rotate(f.rotation + 0.4);
        ctx.font = `${f.radius * 1.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.type.icon, 0, 0);
        ctx.restore();
      }

      // Check drop out of screen
      if (f.y > canvas.height + 40) {
        if (!f.sliced && !f.isBomb && !gameOver) {
          lives--;
          screenShake = 6;
          AudioEngine.hit();
          updateHUD();
          if (lives <= 0) {
            gameOver = true;
            AudioEngine.explosion();
          }
        }
        fruits.splice(i, 1);
      }
    }

    // Katana Blade Trail (Tapered, Glowing, Sharp)
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life--;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }

    if (trail.length > 2) {
      // 1. Glowing outer blade aura
      ctx.save();
      ctx.strokeStyle = '#38BDF8';
      ctx.shadowColor = '#00F5FF';
      ctx.shadowBlur = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < trail.length; i++) {
        const ratio = i / trail.length;
        ctx.lineWidth = 2 + ratio * 7; // Tapered from tail to blade tip
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }

      // 2. Bright white sharp katana core
      ctx.strokeStyle = '#FFFFFF';
      ctx.shadowBlur = 0;
      for (let i = 1; i < trail.length; i++) {
        const ratio = i / trail.length;
        ctx.lineWidth = 1 + ratio * 3;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Floating Score Popups (Font Calibri)
    for (let i = floatingScores.length - 1; i >= 0; i--) {
      const fs = floatingScores[i];
      fs.y += fs.vy;
      fs.vy *= 0.94;
      ctx.fillStyle = fs.color;
      ctx.font = 'bold 15px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fs.text, fs.x, fs.y);
      if (fs.vy > -0.3) floatingScores.splice(i, 1);
    }

    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 26px Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HẾT MẠNG! GAME OVER', canvas.width / 2, canvas.height / 2 - 15);
      ctx.fillStyle = '#FFF';
      ctx.font = '16px Calibri, sans-serif';
      ctx.fillText(`Điểm đạt được: ${score} - Nhấn Chơi Lại`, canvas.width / 2, canvas.height / 2 + 25);
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
// 14. ENGINE: DÒ MÌN (MINESWEEPER WINDOWS 98 CỔ ĐIỂN)
// =========================================================================
function launchDoMin(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  const ROWS = 9;
  const COLS = 9;
  let MINES = 10;
  let stage = 1;

  let grid = [];
  let flags = [];
  let revealed = [];
  let gameOver = false;
  let gameWon = false;
  let timer = 0;
  let timerInterval = null;
  let firstClick = true;
  let flagMode = false;
  let isMouseDepressed = false;

  function initBoard() {
    clearInterval(timerInterval);
    timer = 0;
    firstClick = true;
    gameOver = false;
    gameWon = false;
    isMouseDepressed = false;
    grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    flags = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    revealed = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    const nextBtn = container.querySelector('#dmNextBtn');
    if (nextBtn) nextBtn.style.display = 'none';
    updateHUD();
    renderBoard();
  }

  container.innerHTML = `
    <div style="background: #C0C0C0; padding: 14px; border: 3px solid #FFF; border-right-color: #808080; border-bottom-color: #808080; border-radius: 4px; max-width: 400px; margin: 0 auto; user-select: none; font-family: Calibri, 'Segoe UI', sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; background: #C0C0C0; border: 2px solid #808080; border-right-color: #FFF; border-bottom-color: #FFF; padding: 6px 14px; margin-bottom: 10px;">
        <div id="dmMineCount" style="background: #000; color: #EF4444; font-family: monospace; font-size: 1.6rem; font-weight: 900; padding: 2px 8px; border-radius: 2px; letter-spacing: 2px;">010</div>
        <button id="dmFaceBtn" aria-label="Chơi lại màn hiện tại" style="font-size: 1.7rem; background: #C0C0C0; border: 2.5px solid #FFF; border-right-color: #808080; border-bottom-color: #808080; cursor: pointer; padding: 0 6px; border-radius: 4px; touch-action: manipulation;">🙂</button>
        <div id="dmTimer" style="background: #000; color: #EF4444; font-family: monospace; font-size: 1.6rem; font-weight: 900; padding: 2px 8px; border-radius: 2px; letter-spacing: 2px;">000</div>
      </div>

      <div style="font-weight:700;color:#1E293B;margin:0 0 8px;text-align:center">Màn <span id="dmStage">1</span> • Số mìn tăng sau mỗi lần thắng</div>
      <div id="dmGrid" style="display: grid; grid-template-columns: repeat(9, 1fr); gap: 1px; background: #808080; border: 3px solid #808080; border-right-color: #FFF; border-bottom-color: #FFF; padding: 1px;"></div>

      <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
        <button id="dmFlagToggleBtn" class="btn-canvas-action" style="font-size: 0.85rem; padding: 6px 12px; background: #64748B; color: #FFF; font-family: Calibri, sans-serif;">
          🚩 Chế độ cắm cờ: <span id="dmFlagStatus">TẮT</span>
        </button>
        <small style="color: #1E293B; font-weight: 600;">Chuột phải / Bấm cờ • Bấm ô số để mở nhanh (Chord)</small>
        <button id="dmNextBtn" class="btn-canvas-action" style="display:none;background:#047857;color:white">Sang màn tiếp theo →</button>
      </div>
    </div>
  `;

  const gridEl = container.querySelector('#dmGrid');
  const faceBtn = container.querySelector('#dmFaceBtn');
  const mineCountEl = container.querySelector('#dmMineCount');
  const timerEl = container.querySelector('#dmTimer');
  const flagToggleBtn = container.querySelector('#dmFlagToggleBtn');
  const flagStatusEl = container.querySelector('#dmFlagStatus');
  const nextBtn = container.querySelector('#dmNextBtn');
  nextBtn?.addEventListener('click', () => {
    if (!gameWon) return;
    stage++;
    MINES = Math.min(25, 10 + (stage - 1) * 2);
    initBoard();
  });

  flagToggleBtn?.addEventListener('click', () => {
    flagMode = !flagMode;
    if (flagStatusEl) flagStatusEl.textContent = flagMode ? 'BẬT' : 'TẮT';
    flagToggleBtn.style.backgroundColor = flagMode ? '#F59E0B' : '#64748B';
    if (window.NP_Juice) NP_Juice.vibrate.light();
  });

  faceBtn?.addEventListener('click', () => {
    if (window.NP_Juice) NP_Juice.vibrate.light();
    initBoard();
  });

  function placeMines(firstR, firstC) {
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (grid[r][c] !== 9 && !(Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1)) {
        grid[r][c] = 9;
        placed++;
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 9) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === 9) {
              count++;
            }
          }
        }
        grid[r][c] = count;
      }
    }
  }

  function revealCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || revealed[r][c] || flags[r][c]) return;
    revealed[r][c] = true;
    if (grid[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          revealCell(r + dr, c + dc);
        }
      }
    }
  }

  // Chording: If cell is revealed and neighboring flags match number, reveal all remaining neighbors
  function chordCell(r, c) {
    if (!revealed[r][c] || grid[r][c] <= 0 || grid[r][c] === 9) return;
    let neighborFlags = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && flags[nr][nc]) {
          neighborFlags++;
        }
      }
    }

    if (neighborFlags === grid[r][c]) {
      let hitMine = false;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !revealed[nr][nc] && !flags[nr][nc]) {
            if (grid[nr][nc] === 9) {
              hitMine = true;
            }
            revealCell(nr, nc);
          }
        }
      }

      if (hitMine) {
        gameOver = true;
        clearInterval(timerInterval);
        if (window.NP_Juice) NP_Juice.vibrate.heavy();
        AudioEngine.explosion();
        for (let i = 0; i < ROWS; i++) {
          for (let j = 0; j < COLS; j++) {
            if (grid[i][j] === 9) revealed[i][j] = true;
          }
        }
      } else {
        if (window.NP_Juice) NP_Juice.vibrate.medium();
        AudioEngine.pop();
        checkWin();
      }
      updateHUD();
      renderBoard();
    }
  }

  function checkWin() {
    let unrevealedSafe = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!revealed[r][c] && grid[r][c] !== 9) unrevealedSafe++;
      }
    }
    if (unrevealedSafe === 0) {
      gameWon = true;
      clearInterval(timerInterval);
      if (nextBtn) nextBtn.style.display = 'inline-flex';
      if (window.NP_Juice) NP_Juice.vibrate.success();
      AudioEngine.win();
      updateHUD();
    }
  }

  function updateHUD() {
    let flagsCount = 0;
    flags.forEach(row => row.forEach(f => { if (f) flagsCount++; }));
    if (mineCountEl) mineCountEl.textContent = String(Math.max(0, MINES - flagsCount)).padStart(3, '0');
    if (timerEl) timerEl.textContent = String(Math.min(999, timer)).padStart(3, '0');
    const stageEl = container.querySelector('#dmStage');
    if (stageEl) stageEl.textContent = stage;
    if (faceBtn) {
      if (gameWon) faceBtn.textContent = '😎';
      else if (gameOver) faceBtn.textContent = '😵';
      else if (isMouseDepressed) faceBtn.textContent = '😮';
      else faceBtn.textContent = '🙂';
    }
  }

  function renderBoard() {
    gridEl.innerHTML = '';
    const COLORS = ['', '#0000FF', '#008000', '#EF4444', '#000080', '#800000', '#008080', '#000000', '#808080'];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.setAttribute('aria-label', revealed[r][c]
          ? (grid[r][c] === 9 ? 'Mìn' : 'Ô ' + grid[r][c])
          : (flags[r][c] ? 'Ô đã cắm cờ' : 'Ô chưa mở'));
        cell.style.padding = '0';
        cell.style.aspectRatio = '1/1';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.fontFamily = 'Calibri, monospace';
        cell.style.fontWeight = 'bold';
        cell.style.fontSize = '1.15rem';
        cell.style.cursor = 'pointer';
        cell.style.userSelect = 'none';

        if (revealed[r][c]) {
          cell.style.background = '#C0C0C0';
          cell.style.border = '1px solid #808080';
          if (grid[r][c] === 9) {
            cell.textContent = '💣';
            cell.style.background = '#EF4444';
          } else if (grid[r][c] > 0) {
            cell.textContent = grid[r][c];
            cell.style.color = COLORS[grid[r][c]];
          }
        } else {
          cell.style.background = '#C0C0C0';
          cell.style.border = '2.5px solid #FFF';
          cell.style.borderRightColor = '#808080';
          cell.style.borderBottomColor = '#808080';
          if (flags[r][c]) {
            cell.textContent = '🚩';
          }
        }

        // Mouse Down tension: Face turns 😮
        cell.addEventListener('mousedown', () => {
          if (!gameOver && !gameWon) {
            isMouseDepressed = true;
            updateHUD();
          }
        });

        // Click handler
        cell.addEventListener('click', () => {
          if (gameOver || gameWon) return;

          // Revealed cells cannot be flagged, including cells with value zero.
          if (revealed[r][c]) {
            if (!flagMode && grid[r][c] > 0) chordCell(r, c);
            return;
          }

          if (flagMode) {
            flags[r][c] = !flags[r][c];
            if (window.NP_Juice) NP_Juice.vibrate.light();
            AudioEngine.pop();
            updateHUD();
            renderBoard();
            return;
          }

          if (flags[r][c]) return;

          if (firstClick) {
            firstClick = false;
            placeMines(r, c);
            timerInterval = setInterval(() => {
              timer++;
              updateHUD();
            }, 1000);
          }

          if (grid[r][c] === 9) {
            gameOver = true;
            clearInterval(timerInterval);
            if (window.NP_Juice) NP_Juice.vibrate.heavy();
            AudioEngine.explosion();
            for (let i = 0; i < ROWS; i++) {
              for (let j = 0; j < COLS; j++) {
                if (grid[i][j] === 9) revealed[i][j] = true;
              }
            }
          } else {
            revealCell(r, c);
            if (window.NP_Juice) NP_Juice.vibrate.light();
            AudioEngine.coin();
            checkWin();
          }
          updateHUD();
          renderBoard();
        });

        // Right-click flag toggle
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (gameOver || gameWon || revealed[r][c]) return;
          flags[r][c] = !flags[r][c];
          if (window.NP_Juice) NP_Juice.vibrate.light();
          AudioEngine.pop();
          updateHUD();
          renderBoard();
        });

        gridEl.appendChild(cell);
      }
    }
  }

  const globalMouseUp = () => {
    if (isMouseDepressed) {
      isMouseDepressed = false;
      updateHUD();
    }
  };
  listen(window, 'mouseup', globalMouseUp);
  listen(window, 'touchend', globalMouseUp);

  initBoard();

  onCleanup(() => {
    clearInterval(timerInterval);
  });
}


// =========================================================================
// 15. ENGINE: PIKACHU NỐI HÌNH CỔ ĐIỂN (KAWAII 2003 FULL ENGINE)
// =========================================================================
function launchPikachu(container, game) {
  const { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, onCleanup } = window.NP_GameSession.start();
  const ROWS = 8;
  const COLS = 12;
  let board = [];
  let selected = null;
  let timeLeft = 240;
  let timerInterval = null;
  let score = 0;
  let level = 1;
  let shufflesLeft = 10;
  let hintsLeft = 5;
  let gameOver = false;
  let isShuffling = false;

  // 16 Authentic Pokémon Tokens with custom badges and retro colors
  const POKEMON = [
    { id: 'pikachu', name: 'Pikachu', color: '#FEF08A', border: '#EAB308', icon: '⚡', label: 'Pika' },
    { id: 'bulbasaur', name: 'Bulbasaur', color: '#A7F3D0', border: '#059669', icon: '🍃', label: 'Ech' },
    { id: 'charmander', name: 'Charmander', color: '#FED7AA', border: '#EA580C', icon: '🔥', label: 'Lua' },
    { id: 'squirtle', name: 'Squirtle', color: '#BAE6FD', border: '#0284C7', icon: '💧', label: 'Rua' },
    { id: 'jigglypuff', name: 'Jigglypuff', color: '#FBCFE8', border: '#DB2777', icon: '🎵', label: 'Hat' },
    { id: 'psyduck', name: 'Psyduck', color: '#FDE68A', border: '#D97706', icon: '💫', label: 'Vit' },
    { id: 'snorlax', name: 'Snorlax', color: '#99F6E4', border: '#0D9488', icon: '💤', label: 'Beo' },
    { id: 'gengar', name: 'Gengar', color: '#DDD6FE', border: '#7C3AED', icon: '👻', label: 'Ma' },
    { id: 'meowth', name: 'Meowth', color: '#FEF9C3', border: '#CA8A04', icon: '🪙', label: 'Meo' },
    { id: 'togepi', name: 'Togepi', color: '#FEE2E2', border: '#E11D48', icon: '🥚', label: 'Trung' },
    { id: 'eevee', name: 'Eevee', color: '#FED7AA', border: '#9A3412', icon: '🦊', label: 'Cao' },
    { id: 'clefairy', name: 'Clefairy', color: '#FCE7F3', border: '#BE185D', icon: '⭐', label: 'Tien' },
    { id: 'poliwag', name: 'Poliwag', color: '#CFFAFE', border: '#0891B2', icon: '🌀', label: 'Nong' },
    { id: 'diglett', name: 'Diglett', color: '#E2E8F0', border: '#64748B', icon: '⛰️', label: 'Dat' },
    { id: 'geodude', name: 'Geodude', color: '#E0E7FF', border: '#4F46E5', icon: '🪨', label: 'Da' },
    { id: 'mew', name: 'Mew', color: '#F5D0FE', border: '#C026D3', icon: '✨', label: 'Mew' }
  ];

  const GRAVITY_NAMES = [
    'Không dịch chuyển',
    'Dồn xuống',
    'Dồn lên',
    'Dồn trái',
    'Dồn phải',
    'Ép vào giữa',
    'Tách ra hai bên'
  ];

  function getGravityMode(lvl) {
    return ((lvl - 1) % 7) + 1;
  }

  function applyGravity(mode) {
    if (mode === 1) return; // Static

    if (mode === 2) {
      // Down: each column compresses downward
      for (let c = 0; c < COLS; c++) {
        const nonNull = [];
        for (let r = 0; r < ROWS; r++) {
          if (board[r][c] !== null) nonNull.push(board[r][c]);
        }
        const nullCount = ROWS - nonNull.length;
        for (let r = 0; r < nullCount; r++) board[r][c] = null;
        for (let r = 0; r < nonNull.length; r++) board[nullCount + r][c] = nonNull[r];
      }
    } else if (mode === 3) {
      // Up: each column compresses upward
      for (let c = 0; c < COLS; c++) {
        const nonNull = [];
        for (let r = 0; r < ROWS; r++) {
          if (board[r][c] !== null) nonNull.push(board[r][c]);
        }
        for (let r = 0; r < nonNull.length; r++) board[r][c] = nonNull[r];
        for (let r = nonNull.length; r < ROWS; r++) board[r][c] = null;
      }
    } else if (mode === 4) {
      // Left: each row compresses leftward
      for (let r = 0; r < ROWS; r++) {
        const nonNull = [];
        for (let c = 0; c < COLS; c++) {
          if (board[r][c] !== null) nonNull.push(board[r][c]);
        }
        for (let c = 0; c < nonNull.length; c++) board[r][c] = nonNull[c];
        for (let c = nonNull.length; c < COLS; c++) board[r][c] = null;
      }
    } else if (mode === 5) {
      // Right: each row compresses rightward
      for (let r = 0; r < ROWS; r++) {
        const nonNull = [];
        for (let c = 0; c < COLS; c++) {
          if (board[r][c] !== null) nonNull.push(board[r][c]);
        }
        const nullCount = COLS - nonNull.length;
        for (let c = 0; c < nullCount; c++) board[r][c] = null;
        for (let c = 0; c < nonNull.length; c++) board[r][nullCount + c] = nonNull[c];
      }
    } else if (mode === 6) {
      // Inward to center (upper half drops down, lower half floats up)
      const mid = Math.floor(ROWS / 2);
      for (let c = 0; c < COLS; c++) {
        // Upper half (0 to mid-1) falls down toward mid-1
        const upper = [];
        for (let r = 0; r < mid; r++) {
          if (board[r][c] !== null) upper.push(board[r][c]);
        }
        const nullU = mid - upper.length;
        for (let r = 0; r < nullU; r++) board[r][c] = null;
        for (let r = 0; r < upper.length; r++) board[nullU + r][c] = upper[r];

        // Lower half (mid to ROWS-1) floats up toward mid
        const lower = [];
        for (let r = mid; r < ROWS; r++) {
          if (board[r][c] !== null) lower.push(board[r][c]);
        }
        for (let r = 0; r < lower.length; r++) board[mid + r][c] = lower[r];
        for (let r = lower.length; r < ROWS - mid; r++) board[mid + r][c] = null;
      }
    } else if (mode === 7) {
      // Outward (upper half floats up to top, lower half falls to bottom)
      const mid = Math.floor(ROWS / 2);
      for (let c = 0; c < COLS; c++) {
        // Upper half floats up to row 0
        const upper = [];
        for (let r = 0; r < mid; r++) {
          if (board[r][c] !== null) upper.push(board[r][c]);
        }
        for (let r = 0; r < upper.length; r++) board[r][c] = upper[r];
        for (let r = upper.length; r < mid; r++) board[r][c] = null;

        // Lower half falls down to row ROWS-1
        const lower = [];
        for (let r = mid; r < ROWS; r++) {
          if (board[r][c] !== null) lower.push(board[r][c]);
        }
        const nullL = (ROWS - mid) - lower.length;
        for (let r = 0; r < nullL; r++) board[mid + r][c] = null;
        for (let r = 0; r < lower.length; r++) board[mid + nullL + r][c] = lower[r];
      }
    }
  }

  function initBoard() {
    const totalCells = ROWS * COLS;
    const pairsNeeded = totalCells / 2;
    const pool = [];
    for (let i = 0; i < pairsNeeded; i++) {
      const pkm = POKEMON[i % POKEMON.length];
      pool.push(pkm.id, pkm.id);
    }
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    board = Array(ROWS).fill(null).map((_, r) => {
      return Array(COLS).fill(null).map((_, c) => pool[r * COLS + c]);
    });

    selected = null;
    timeLeft = Math.max(90, 240 - (level - 1) * 15);
    updateHUD();
    renderBoard();

    // Verify initial board has valid moves
    ensureValidMoves();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (gameOver) return;
      timeLeft--;
      updateHUD();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        gameOver = true;
        if (window.NP_Audio?.explosion) NP_Audio.explosion();
        else AudioEngine.explosion();
        renderBoard();
        showNotification('⏰ HẾT GIỜ! Game Over!', '#EF4444');
      }
    }, 1000);
  }

  container.innerHTML = `
    <div class="canvas-game-box np-link-game">
      <div class="np-link-top">
        <div class="np-link-label"><strong>NỐI HÌNH</strong><small>Tìm cặp giống nhau</small></div>
        <div class="np-link-stats">
          <span><small>Màn</small><b id="pkLevel">1</b></span>
          <span><small>Thời gian</small><b id="pkTime">240</b></span>
          <span><small>Điểm</small><b id="pkScore">0</b></span>
        </div>
      </div>
      <div class="np-link-toolbar">
        <span id="pkGravityBadge" class="np-link-rule">Không dịch chuyển</span>
        <div class="np-link-tools">
          <button id="pkHintBtn" class="np-link-secondary" type="button" title="Hiện gợi ý một cặp có thể nối">Gợi ý <b id="pkHints">5</b></button>
          <button id="pkShuffleBtn" class="np-link-secondary" type="button" title="Đảo vị trí ô khi chưa có nước đi">Đổi chỗ <b id="pkShuffles">10</b></button>
          <button id="pkZoomBtn" class="np-link-secondary" type="button" aria-pressed="false" title="Phóng to bàn để dễ chạm trên điện thoại">Phóng to</button>
          <button id="pkRestartBtn" class="np-link-secondary" type="button">Chơi lại</button>
        </div>
      </div>
      <div class="np-link-viewport">
      <div class="np-link-board-wrap">
        <div id="pkGrid" class="np-link-grid" aria-label="Bàn nối hình 8 hàng, 12 cột"></div>
        <canvas id="pkCanvas" width="600" height="400" aria-hidden="true" class="np-link-lightning"></canvas>
        <div id="pkBanner" class="np-link-banner" role="status" aria-live="polite" style="display:none"></div>
      </div>
      </div>
      <p class="np-link-instruction">Chọn hai hình giống nhau, nối bằng đường gấp tối đa hai góc.</p>
    </div>
  `;

  const gridEl = container.querySelector('#pkGrid');
  const canvas = container.querySelector('#pkCanvas');
  const ctx = canvas.getContext('2d');
  const bannerEl = container.querySelector('#pkBanner');
  const zoomBtn = container.querySelector('#pkZoomBtn');
  zoomBtn?.addEventListener('click', () => {
    const boardSurface = container.querySelector('.np-link-board-wrap');
    const zoomed = boardSurface?.classList.toggle('zoomed') || false;
    zoomBtn.setAttribute('aria-pressed', String(zoomed));
    zoomBtn.textContent = zoomed ? 'Thu nhỏ' : 'Phóng to';
    zoomBtn.title = zoomed ? 'Hiển thị toàn bộ bàn' : 'Phóng to bàn để dễ chạm trên điện thoại';
  });

  function showNotification(text, borderColor = '#F59E0B') {
    if (!bannerEl) return;
    bannerEl.textContent = text;
    bannerEl.style.borderColor = borderColor;
    bannerEl.style.display = 'block';
    setTimeout(() => {
      if (bannerEl) bannerEl.style.display = 'none';
    }, 1500);
  }

  function updateHUD() {
    const lEl = container.querySelector('#pkLevel');
    const tEl = container.querySelector('#pkTime');
    const sEl = container.querySelector('#pkScore');
    const shEl = container.querySelector('#pkShuffles');
    const hEl = container.querySelector('#pkHints');
    const gEl = container.querySelector('#pkGravityBadge');
    if (lEl) lEl.textContent = level;
    if (tEl) tEl.textContent = timeLeft;
    if (sEl) sEl.textContent = score;
    if (shEl) shEl.textContent = shufflesLeft;
    if (hEl) hEl.textContent = hintsLeft;
    if (gEl) {
      const mode = getGravityMode(level);
      gEl.textContent = GRAVITY_NAMES[mode - 1] || `Màn ${level}`;
    }
  }

  function canConnect(p1, p2) {
    if (board[p1.r][p1.c] !== board[p2.r][p2.c]) return false;
    if (p1.r === p2.r && p1.c === p2.c) return false;

    const queue = [];
    // visited[r][c][dir]: minimum turns to reach cell (r, c) facing dir
    const visited = Array(ROWS + 2).fill(null).map(() =>
      Array(COLS + 2).fill(null).map(() => Array(4).fill(Infinity))
    );

    const startR = p1.r + 1;
    const startC = p1.c + 1;
    const targetR = p2.r + 1;
    const targetC = p2.c + 1;

    const dirs = [
      { dr: -1, dc: 0, d: 0 },
      { dr: 0, dc: 1, d: 1 },
      { dr: 1, dc: 0, d: 2 },
      { dr: 0, dc: -1, d: 3 }
    ];

    dirs.forEach(d => {
      queue.push({ r: startR, c: startC, dir: d.d, turns: 0, path: [{ r: startR, c: startC }] });
      visited[startR][startC][d.d] = 0;
    });

    let bestPath = null;

    while (queue.length > 0) {
      const curr = queue.shift();

      if (curr.r === targetR && curr.c === targetC) {
        bestPath = curr.path;
        break;
      }

      dirs.forEach(d => {
        const nr = curr.r + d.dr;
        const nc = curr.c + d.dc;
        const turns = curr.dir === d.d ? curr.turns : curr.turns + 1;

        if (turns <= 2 && nr >= 0 && nr <= ROWS + 1 && nc >= 0 && nc <= COLS + 1) {
          const origR = nr - 1;
          const origC = nc - 1;
          const isTarget = nr === targetR && nc === targetC;
          const isOpen = nr === 0 || nr === ROWS + 1 || nc === 0 || nc === COLS + 1 || board[origR][origC] === null;

          if ((isOpen || isTarget) && turns < visited[nr][nc][d.d]) {
            visited[nr][nc][d.d] = turns;
            queue.push({
              r: nr,
              c: nc,
              dir: d.d,
              turns,
              path: [...curr.path, { r: nr, c: nc }]
            });
          }
        }
      });
    }

    return bestPath;
  }

  function findAnyValidMove() {
    for (let r1 = 0; r1 < ROWS; r1++) {
      for (let c1 = 0; c1 < COLS; c1++) {
        if (!board[r1][c1]) continue;
        for (let r2 = 0; r2 < ROWS; r2++) {
          for (let c2 = 0; c2 < COLS; c2++) {
            if (!board[r2][c2] || (r1 === r2 && c1 === c2)) continue;
            if (board[r1][c1] === board[r2][c2]) {
              const path = canConnect({ r: r1, c: c1 }, { r: r2, c: c2 });
              if (path) {
                return { p1: { r: r1, c: c1 }, p2: { r: r2, c: c2 }, path };
              }
            }
          }
        }
      }
    }
    return null;
  }

  function shuffleBoard(manual = false) {
    if (isShuffling) return;
    isShuffling = true;

    const items = [];
    board.forEach(row => row.forEach(val => { if (val) items.push(val); }));
    if (items.length === 0) {
      isShuffling = false;
      return;
    }

    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    board.forEach((row, r) => row.forEach((val, c) => {
      if (val) board[r][c] = items.pop();
    }));

    if (window.NP_Audio?.pop) NP_Audio.pop();
    else AudioEngine.pop();
    renderBoard();

    // Verify if shuffled board has valid moves
    const move = findAnyValidMove();
    if (!move && board.some(row => row.some(value => value !== null))) {
      setTimeout(() => {
        isShuffling = false;
        shuffleBoard(false);
      }, 150);
      return;
    }

    isShuffling = false;
  }

  function ensureValidMoves() {
    let remaining = 0;
    board.forEach(row => row.forEach(cell => { if (cell !== null) remaining++; }));
    if (remaining === 0) return;

    const move = findAnyValidMove();
    if (!move) {
      if (shufflesLeft > 0) {
        shufflesLeft--;
        updateHUD();
        showNotification('⚡ HẾT NƯỚC ĐI! Đang tự đảo bài...', '#F43F5E');
        setTimeout(() => {
          shuffleBoard(false);
          renderBoard();
        }, 600);
      } else {
        gameOver = true;
        showNotification('💀 HẾT NƯỚC ĐI & HẾT LƯỢT ĐỔI! Game Over!', '#EF4444');
        if (window.NP_Audio?.explosion) NP_Audio.explosion();
        else AudioEngine.explosion();
      }
    }
  }

  function drawLightning(path) {
    if (!path || path.length < 2) return;
    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#67E8F9';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    path.forEach((pt, idx) => {
      const x = (pt.c - 1 + 0.5) * cellW;
      const y = (pt.r - 1 + 0.5) * cellH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Inner bright spark line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    path.forEach((pt, idx) => {
      const x = (pt.c - 1 + 0.5) * cellW;
      const y = (pt.r - 1 + 0.5) * cellH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sfx
    if (window.NP_Audio?.laser) NP_Audio.laser();
    else if (window.NP_Audio?.coin) NP_Audio.coin();
    else AudioEngine.coin();

    setTimeout(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 280);
  }

  function handleCellClick(r, c) {
    if (gameOver || isShuffling || board[r][c] === null) return;

    if (!selected) {
      selected = { r, c };
      if (window.NP_Audio?.pop) NP_Audio.pop();
      else AudioEngine.pop();
      if (window.NP_Juice) window.NP_Juice.vibrate(8);
      renderBoard();
      return;
    }

    if (selected.r === r && selected.c === c) {
      selected = null;
      if (window.NP_Juice) window.NP_Juice.vibrate(6);
      renderBoard();
      return;
    }

    const path = canConnect(selected, { r, c });
    if (path) {
      drawLightning(path);
      const selR = selected.r;
      const selC = selected.c;
      board[selR][selC] = null;
      board[r][c] = null;
      selected = null;
      score += 20 * level;
      timeLeft = Math.min(300, timeLeft + 2); // Bonus 2s per match
      if (window.NP_Juice) window.NP_Juice.vibrate([16, 32]);

      // Apply authentic gravity shift based on stage!
      const grav = getGravityMode(level);
      applyGravity(grav);

      updateHUD();
      renderBoard();

      let remaining = 0;
      board.forEach(row => row.forEach(cell => { if (cell !== null) remaining++; }));

      if (remaining === 0) {
        level++;
        shufflesLeft = Math.min(15, shufflesLeft + 2);
        hintsLeft = Math.min(10, hintsLeft + 2);
        score += 500;
        showNotification(`🎉 QUA MÀN ${level - 1}! CHUẨN BỊ MÀN ${level}!`, '#10B981');
        if (window.NP_Audio?.win) NP_Audio.win();
        else AudioEngine.win();
        setTimeout(() => {
          initBoard();
        }, 1200);
      } else {
        // Check if remaining pieces can be matched
        setTimeout(ensureValidMoves, 200);
      }
    } else {
      selected = { r, c };
      if (window.NP_Audio?.hit) NP_Audio.hit();
      else AudioEngine.hit();
      if (window.NP_Juice) window.NP_Juice.vibrate(12);
      renderBoard();
    }
  }

  function getPokemonDef(id) {
    return POKEMON.find(p => p.id === id) || POKEMON[0];
  }

  function renderBoard() {
    // Use one consistent set of illustrated creatures, not platform-dependent
    // emoji/font glyphs. Keep one click handler per tile (touch creates a click).
    const focused = document.activeElement?.getAttribute?.('data-cell');
    gridEl.innerHTML = '';
    const fragment = document.createDocumentFragment?.() || gridEl;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = board[r][c];
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'np-link-tile';
        tile.setAttribute('data-cell', r + '-' + c);
        const selectedNow = selected && selected.r === r && selected.c === c;
        if (val) {
          const def = getPokemonDef(val);
          tile.classList.add(selectedNow ? 'selected' : 'active');
          tile.setAttribute('aria-label', def.name + ', hàng ' + (r + 1) + ', cột ' + (c + 1));
          tile.setAttribute('aria-pressed', selectedNow ? 'true' : 'false');
          tile.style.backgroundColor = def.color;
          tile.innerHTML = window.NP_GameArt
            ? window.NP_GameArt.svg('creature', val, 'np-link-creature')
            : def.label;
          tile.addEventListener('click', () => handleCellClick(r, c));
        } else {
          tile.classList.add('empty');
          tile.disabled = true;
          tile.setAttribute('aria-label', 'Ô trống');
        }
        fragment.appendChild(tile);
      }
    }
    if (fragment !== gridEl) gridEl.appendChild(fragment);
    if (focused) gridEl.querySelector('[data-cell="' + focused + '"]')?.focus?.({ preventScroll: true });
  }

  container.querySelector('#pkHintBtn')?.addEventListener('click', () => {
    if (gameOver || isShuffling) return;
    if (hintsLeft <= 0) {
      showNotification('Hết lượt gợi ý!', '#EF4444');
      return;
    }
    const move = findAnyValidMove();
    if (move) {
      hintsLeft--;
      updateHUD();
      drawLightning(move.path);
      // Highlight the two cells briefly
      selected = move.p1;
      renderBoard();
      setTimeout(() => {
        if (selected === move.p1) {
          selected = null;
          renderBoard();
        }
      }, 1000);
    } else {
      showNotification('Không tìm thấy cặp khả dụng! Đang đảo bài...', '#F43F5E');
      shuffleBoard(false);
    }
  });

  container.querySelector('#pkShuffleBtn')?.addEventListener('click', () => {
    if (gameOver || isShuffling) return;
    if (shufflesLeft <= 0) {
      showNotification('Hết lượt đổi bài!', '#EF4444');
      return;
    }
    shufflesLeft--;
    updateHUD();
    shuffleBoard(true);
  });

  container.querySelector('#pkRestartBtn')?.addEventListener('click', () => {
    score = 0;
    level = 1;
    shufflesLeft = 10;
    hintsLeft = 5;
    gameOver = false;
    isShuffling = false;
    initBoard();
  });

  initBoard();

  onCleanup(() => {
    clearInterval(timerInterval);
    if (bannerEl) bannerEl.style.display = 'none';
  });
}


  function launchRetroArcade(container, game) {
    // The fallback catalog should not collapse unrelated genres into one shooter.
    if (window.NP_Archetypes && typeof window.NP_Archetypes.launch === 'function') {
      window.NP_Archetypes.launch(container, game);
      return;
    }
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
    launchPikachu,
    launchRetroArcade
  };
})();
