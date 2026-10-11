/**
 * Multi-genre fallback for catalog entries without dedicated engines.
 * A shared game loop is NOT evidence that an individual retro game has been
 * reproduced. Each fallback has real input, failure, restart and stage loops.
 */
(function () {
  'use strict';

  var W = 640;
  var H = 400;
  var clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  var random = (lo, hi) => lo + Math.random() * (hi - lo);
  var pick = items => items[Math.floor(Math.random() * items.length)];

  function kindFor(game) {
    const id = String(game.id || '').toLowerCase();
    const category = String(game.category || '').toLowerCase();
    if (/lemonade|pizza|pizzeria|banh-ngot|tiem-sach|tycoon|restaurant/.test(id) || category === 'quản lý') return 'management';
    if (/trieu-phu|doan-chu|impossible-quiz|typer-shark|duo-hinh|bookworm|skribbl|among-us/.test(id) || category === 'trí tuệ') return 'quiz';
    if (/khoang-cach|no[ih]-ong|rubik|solitaire|freecell|spider|atomix|cut-the-rope|bridge-builder|boulder-dash|khac-biet|hop-chu|xep-bai|lua-va-nuoc/.test(id) || category === 'giải đố' || category === 'chill') return 'puzzle';
    if (/street-fighter|dau-vat|kung-fu|electric-man|mortal|rong-den|double-dragon|golden-axe|cadillacs|gun-mayhem|stick-war|worms|co-ty-phu|co-ca-ngua|tam-cuc|tien-len|keo-co|lac-bau|yie-ar/.test(id) || category === 'đối kháng' || category === 'chiến thuật' || category === 'party') return 'duel';
    if (/crossy|frogger|excitebike|dua-xe|truc-thang|chay|sonic|adventure-island|prince-of-persia|donkey-kong|fancy-pants|icy-tower|hamsterball|chip-dale|tiny-toon|circus-charlie|ice-climber|mappy|line-rider|xe-dap|xe-dung|qua-duong|elevator-action/.test(id)) return 'runner';
    if (/dap-chuot|dap-ruoi|phi-tieu|nem-vong|piano-tiles|thoi-bong|tap-lon|tat-lon|nem-lon|moorhuhn|pooyan|reflex|bong-bong-nuoc/.test(id) || category === 'kéo thả') return 'reflex';
    return 'shooter';
  }

  const descriptions = {
    shooter: 'A/D hoặc phím trái/phải để di chuyển, giữ Space để bắn. Chạm hoặc kéo tàu trên điện thoại.',
    runner: 'Trái/phải đổi làn, Space kích hoạt khiên. Né vật cản, vượt chướng ngại để qua màn.',
    reflex: 'Chạm đúng mục tiêu trước khi hết giờ. Di chuyển tâm ngắm, Space để bắn.',
    puzzle: 'Lật hai ô cùng hình để ghép cặp. Dùng phím trái/phải và Space hoặc chạm thẻ.',
    management: 'Chọn món bằng trái/phải, nhấn Space để phục vụ đúng yêu cầu trước khi khách bỏ đi.',
    quiz: 'Chọn đáp án bằng trái/phải, nhấn Space xác nhận hoặc chạm trực tiếp.',
    duel: 'Chọn Tấn công, Phòng thủ hoặc Hồi phục rồi nhấn Space. Thắng đối thủ để sang vòng tiếp.'
  };

  // Frogger is a lane-crossing game, not the shared three-lane runner below.
  // Keep its rules in a small deterministic model so the renderer stays thin
  // and the arcade loop can be checked without a browser.
  const FROGGER = Object.freeze({
    cols: 11, rows: 11, cellW: 60, cellH: 50,
    width: 660, height: 550, homes: [1, 3, 5, 7, 9],
    timeLimit: 28, maxLives: 5
  });

  function froggerWrap(value, span) {
    return ((value % span) + span) % span;
  }

  function froggerRandom(state) {
    state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
    return state.rng / 0x100000000;
  }

  function froggerLane(state, row) {
    return state.lanes.find(lane => lane.row === row) || null;
  }

  function froggerTimeLimit(stage) {
    return Math.max(18, FROGGER.timeLimit - (stage - 1) * 0.6);
  }

  function froggerContains(items, x, padding = 0) {
    for (const item of items) {
      for (const shift of [-FROGGER.width, 0, FROGGER.width]) {
        if (x >= item.x + shift - padding && x <= item.x + shift + item.width + padding) return item;
      }
    }
    return null;
  }

  function createFroggerState(seed = 0x4f1bbcdc) {
    const state = {
      rng: (Number(seed) >>> 0) || 1,
      stage: 1, score: 0, lives: 3, phase: 'playing',
      homes: Array(FROGGER.homes.length).fill(false),
      frog: { x: FROGGER.cellW * 5.5, row: FROGGER.rows - 1 },
      highestRow: FROGGER.rows - 1,
      remaining: FROGGER.timeLimit, hopCooldown: 0, invulnerable: 1.45,
      transitionRemaining: 0, lastClearedStage: 0, lastEvent: null,
      nextExtraLife: 10000, elapsed: 0, lanes: []
    };

    const logSpeeds = [-34, 39, -46, 52];
    for (let i = 0; i < 4; i++) {
      const row = i + 1;
      const width = FROGGER.cellW * [2.35, 2.05, 2.55, 2.2][i];
      const count = 3;
      const gap = FROGGER.width / count;
      const items = Array.from({ length: count }, (_, index) => ({
        x: index * gap + (index % 2 ? 14 : -width * 0.35),
        width,
        color: ['#9b6746', '#bb8452', '#a86d47'][index]
      }));
      state.lanes.push({ kind: 'river', row, speed: logSpeeds[i], wrap: FROGGER.width + width, items });
    }

    const roadSpecs = [
      { speed: 72, widths: [76, 104, 82] },
      { speed: -91, widths: [92, 70, 112] },
      { speed: 108, widths: [106, 74, 92] },
      { speed: -78, widths: [78, 116, 86] }
    ];
    for (let i = 0; i < roadSpecs.length; i++) {
      const row = i + 6;
      const spec = roadSpecs[i];
      const gap = FROGGER.width / spec.widths.length;
      const items = spec.widths.map((width, index) => ({
        x: index * gap + (index % 2 ? 16 : -width * 0.4),
        width,
        color: ['#f17663', '#f4cb62', '#60c8bd', '#c68bd7', '#e6eee1'][(row + index) % 5],
        cabin: index % 2 === 0
      }));
      state.lanes.push({ kind: 'road', row, speed: spec.speed, wrap: FROGGER.width + Math.max(...spec.widths), items });
    }
    return state;
  }

  function froggerResetFrog(state) {
    state.frog.x = FROGGER.cellW * 5.5;
    state.frog.row = FROGGER.rows - 1;
    state.highestRow = FROGGER.rows - 1;
    state.remaining = froggerTimeLimit(state.stage);
    state.hopCooldown = 0;
    state.invulnerable = 0.9;
  }

  function froggerLoseLife(state, reason) {
    if (state.phase !== 'playing') return false;
    state.lives = Math.max(0, state.lives - 1);
    state.lastEvent = { type: 'lost-life', reason, lives: state.lives };
    if (state.lives === 0) {
      state.phase = 'over';
      return true;
    }
    froggerResetFrog(state);
    return true;
  }

  function froggerAward(state, points) {
    state.score += Math.max(0, Math.floor(points));
    let extraLives = 0;
    while (state.score >= state.nextExtraLife) {
      if (state.lives < FROGGER.maxLives) {
        state.lives++;
        extraLives++;
      }
      state.nextExtraLife += 10000;
    }
    return extraLives;
  }

  function froggerHomeAt(x) {
    const column = Math.round(x / FROGGER.cellW - 0.5);
    const index = FROGGER.homes.indexOf(column);
    if (index < 0 || Math.abs(x - FROGGER.cellW * (column + 0.5)) > 17) return -1;
    return index;
  }

  function froggerHop(state, dx, dy) {
    if (state.phase !== 'playing' || state.hopCooldown > 0) return false;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const nextX = state.frog.x + dx * FROGGER.cellW;
    const nextRow = state.frog.row + dy;
    if (nextX < FROGGER.cellW * 0.5 || nextX > FROGGER.width - FROGGER.cellW * 0.5 ||
        nextRow < 0 || nextRow >= FROGGER.rows) return false;

    state.hopCooldown = 0.105;
    state.frog.x = nextX;
    state.frog.row = nextRow;

    if (nextRow === 0) {
      const home = froggerHomeAt(nextX);
      if (home < 0 || state.homes[home]) {
        froggerLoseLife(state, home < 0 ? 'Sai ổ' : 'Ổ đã kín');
        return true;
      }
      state.homes[home] = true;
      const extraLives = froggerAward(state, 50 + Math.floor(state.remaining * 5));
      state.lastEvent = { type: 'home', home: home + 1, filled: state.homes.filter(Boolean).length, extraLives };
      if (state.homes.every(Boolean)) {
        state.lastClearedStage = state.stage;
        state.phase = 'stage-clear';
        state.transitionRemaining = 1.15;
        state.lastEvent = { type: 'stage-clear', stage: state.stage, extraLives };
      } else {
        froggerResetFrog(state);
      }
      return true;
    }

    if (nextRow < state.highestRow) {
      state.highestRow = nextRow;
      const extraLives = froggerAward(state, 10);
      state.lastEvent = { type: 'hop', row: nextRow, score: state.score, extraLives };
    }

    if (nextRow >= 1 && nextRow <= 4) {
      const lane = froggerLane(state, nextRow);
      if (!lane || !froggerContains(lane.items, nextX, 12)) {
        froggerLoseLife(state, 'Rơi xuống nước');
      }
    } else if (nextRow >= 6 && nextRow <= 9 && state.invulnerable <= 0) {
      const lane = froggerLane(state, nextRow);
      if (lane && froggerContains(lane.items, nextX, 18)) froggerLoseLife(state, 'Va vào xe');
    }
    return true;
  }

  function tickFrogger(state, dt) {
    const seconds = Math.max(0, Number(dt) || 0);
    if (state.phase === 'stage-clear') {
      state.transitionRemaining -= seconds;
      if (state.transitionRemaining <= 0) {
        state.stage++;
        state.homes.fill(false);
        state.phase = 'playing';
        froggerResetFrog(state);
        state.lastEvent = { type: 'stage-start', stage: state.stage };
      }
      return;
    }
    if (state.phase !== 'playing' || !seconds) return;

    state.elapsed += seconds;
    state.hopCooldown = Math.max(0, state.hopCooldown - seconds);
    state.invulnerable = Math.max(0, state.invulnerable - seconds);
    state.remaining -= seconds;

    const speedScale = 1 + Math.min(20, state.stage - 1) * 0.075;
    for (const lane of state.lanes) {
      const wrap = lane.wrap;
      for (const item of lane.items) {
        item.x = froggerWrap(item.x + lane.speed * speedScale * seconds + item.width * 0.4, wrap) - item.width * 0.4;
      }
    }

    const row = state.frog.row;
    if (row >= 1 && row <= 4) {
      const lane = froggerLane(state, row);
      const platform = lane && froggerContains(lane.items, state.frog.x, 10);
      if (!platform) {
        froggerLoseLife(state, 'Rơi khỏi bè');
        return;
      }
      state.frog.x += lane.speed * speedScale * seconds;
      if (state.frog.x < 10 || state.frog.x > FROGGER.width - 10 ||
          !froggerContains(lane.items, state.frog.x, 8)) {
        froggerLoseLife(state, 'Trôi khỏi bè');
        return;
      }
    } else if (row >= 6 && row <= 9 && state.invulnerable <= 0) {
      const lane = froggerLane(state, row);
      if (lane && froggerContains(lane.items, state.frog.x, 17)) {
        froggerLoseLife(state, 'Va vào xe');
        return;
      }
    }

    if (state.remaining <= 0) froggerLoseLife(state, 'Hết giờ');
  }

  const QUESTIONS = [
    ['Số tiếp theo của dãy 2, 4, 8, 16 là?', ['20', '24', '32', '36'], 2],
    ['Một giờ có bao nhiêu giây?', ['600', '1800', '3600', '6000'], 2],
    ['Hình vuông có bao nhiêu cạnh?', ['3', '4', '5', '6'], 1],
    ['12 chia 3 bằng bao nhiêu?', ['3', '4', '6', '9'], 1],
    ['Trong bảng chữ cái, chữ nào đứng sau M?', ['N', 'O', 'L', 'P'], 0],
    ['Đơn vị dùng để đo nhiệt độ là gì?', ['Mét', 'Giây', 'Độ C', 'Kilôgam'], 2],
    ['Một tá tương đương bao nhiêu vật?', ['6', '10', '12', '20'], 2],
    ['Tam giác có tổng số đo ba góc bằng?', ['90 độ', '120 độ', '180 độ', '360 độ'], 2],
    ['Hành tinh nào gần Mặt Trời nhất?', ['Sao Thủy', 'Sao Mộc', 'Trái Đất', 'Sao Hải Vương'], 0],
    ['Từ nào là từ chỉ màu sắc?', ['Chiều cao', 'Xanh', 'Nhanh', 'Chạy'], 1],
    ['Số nguyên tố nhỏ nhất là?', ['0', '1', '2', '4'], 2],
    ['Một tuần có bao nhiêu ngày?', ['5', '6', '7', '8'], 2],
    ['10% của 200 bằng?', ['2', '10', '20', '40'], 2],
    ['Nước đóng băng ở bao nhiêu độ C tại áp suất chuẩn?', ['0', '10', '50', '100'], 0],
    ['Con vật nào thuộc lớp thú?', ['Cá vàng', 'Ếch', 'Cá heo', 'Chim sẻ'], 2],
    ['Vật nào dùng để xem phương hướng?', ['Nhiệt kế', 'La bàn', 'Thước kẻ', 'Đồng hồ'], 1],
    ['Một phần tư của 100 là?', ['20', '25', '40', '50'], 1],
    ['Số nào là số chẵn?', ['17', '21', '30', '35'], 2],
    ['Sắp xếp 3, 1, 2 tăng dần là?', ['3, 2, 1', '1, 2, 3', '2, 1, 3', '1, 3, 2'], 1],
    ['Việt Nam nằm ở châu lục nào?', ['Châu Á', 'Châu Âu', 'Châu Phi', 'Châu Mỹ'], 0]
  ];

  function launchFrogger(container, game) {
    const session = window.NP_GameSession.start();
    const { listen } = session;
    const model = {
      create: createFroggerState,
      hop: froggerHop,
      tick: tickFrogger,
      constants: FROGGER
    };
    const gameId = String(game.id || 'frogger-ech-bang-qua-duong');
    const storeKey = 'np_frogger_record_v1_' + gameId.replace(/[^a-z0-9_-]/gi, '');
    const state = model.create((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    let bestScore = 0;
    let bestStage = 1;
    let frameId = null;
    let lastFrame = 0;
    const pointers = new Map();
    const modal = document.getElementById('gameModal');
    const previousModalGeometry = modal ? {
      width: modal.style.width, left: modal.style.left, right: modal.style.right
    } : null;
    const viewportWidth = (document.documentElement && document.documentElement.clientWidth) || window.innerWidth || W;
    if (modal && Number(window.innerWidth) > viewportWidth + 1) {
      // The catalog header can widen the layout viewport on narrow phones.
      // Clamp this game modal to the visual content width and restore it on close.
      modal.style.width = viewportWidth + 'px';
      modal.style.left = '0px';
      modal.style.right = 'auto';
    }

    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || '{}');
      bestScore = Math.max(0, Number(saved.score) || 0);
      bestStage = Math.max(1, Number(saved.stage) || 1);
    } catch (error) { /* local storage may be disabled or contain old data */ }

    container.innerHTML = `
      <style>
        #gameModal:has(.np-frogger-shell) .modal-window { width:min(98vw,900px); max-width:900px; min-width:0; }
        #gameModal:has(.np-frogger-shell) .modal-header,
        #gameModal:has(.np-frogger-shell) .modal-title-group,
        #gameModal:has(.np-frogger-shell) .modal-body { min-width:0; }
        #gameModal:has(.np-frogger-shell) .modal-game-title { white-space:normal; overflow-wrap:anywhere; }
        @media(max-width:700px) {
          #gameModal:has(.np-frogger-shell) .modal-window { width:100vw; max-width:100vw; min-width:0; }
          #gameModal:has(.np-frogger-shell) .modal-header { gap:6px; }
          #gameModal:has(.np-frogger-shell) .modal-header-actions { flex:0 0 auto; }
          #gameModal:has(.np-frogger-shell) .modal-title-group { flex:1 1 auto; }
          #gameModal:has(.np-frogger-shell) .modal-game-title { font-size:clamp(15px,4.2vw,21px); }
        }
        .np-frogger-shell { display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; max-width:780px; min-width:0; margin:0 auto; color:#f4f6e8; font-family:Calibri,Inter,-apple-system,sans-serif; }
        .np-frogger-hud { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; width:100%; }
        .np-frogger-stat { min-width:0; padding:7px 10px; border:1px solid rgba(235,248,215,.16); border-radius:9px; background:#20392f; text-align:center; color:#b8d4b4; font-size:12px; letter-spacing:.035em; }
        .np-frogger-stat strong { display:block; color:#fff8d5; font-size:17px; line-height:1.15; font-weight:800; }
        .np-frogger-time { display:flex; align-items:center; gap:9px; width:100%; color:#d4e1c5; font-size:12px; }
        .np-frogger-time-track { flex:1; height:7px; overflow:hidden; border-radius:999px; background:#243c40; }
        .np-frogger-time-fill { width:100%; height:100%; border-radius:inherit; background:#c4dd64; transition:width .12s linear; }
        .np-frogger-board { display:block; width:min(100%,780px); max-width:100%; height:auto; aspect-ratio:6/5; border:2px solid #c7df9a; border-radius:12px; background:#24734e; box-shadow:0 12px 32px rgba(8,27,20,.24); touch-action:none; }
        .np-frogger-controls { display:grid; grid-template-columns:repeat(6,minmax(44px,1fr)); gap:6px; width:min(100%,432px); }
        .np-frogger-controls button { min-width:44px; min-height:48px; padding:4px; border:1px solid #a7c774; border-radius:12px; background:#f0f2d8; color:#234433; font:700 24px/1 Calibri,Inter,sans-serif; box-shadow:0 3px 0 #a2b96f; touch-action:manipulation; }
        .np-frogger-controls button:active { transform:translateY(2px); box-shadow:0 1px 0 #a2b96f; }
        .np-frogger-controls button:focus-visible { outline:3px solid #efa85a; outline-offset:2px; }
        .np-frogger-status { min-height:20px; margin:0; color:#476a4d; font-size:13px; text-align:center; }
        .np-frogger-sr { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important; }
        @media(max-width:520px) { .np-frogger-hud { gap:4px; } .np-frogger-stat { padding:6px 3px; font-size:11px; } .np-frogger-stat strong { font-size:15px; } .np-frogger-controls { gap:5px; } }
        @media(prefers-reduced-motion:reduce) { .np-frogger-time-fill,.np-frogger-controls button { transition:none; } }
      </style>
      <section class="np-frogger-shell" aria-label="Chú Ếch Sang Sông">
        <div class="np-frogger-hud" aria-label="Trạng thái ván chơi">
          <div class="np-frogger-stat">Màn<strong id="arcLevel">1</strong></div>
          <div class="np-frogger-stat">Điểm<strong id="arcScore">0</strong><span id="arcBest" class="np-frogger-sr"></span></div>
          <div class="np-frogger-stat">Mạng<strong id="arcLives">3</strong></div>
          <div class="np-frogger-stat">Ổ<strong id="arcProgress">0/5</strong></div>
        </div>
        <div class="np-frogger-time"><span>Giờ</span><div class="np-frogger-time-track" id="froggerTimeTrack" role="progressbar" aria-label="Thời gian còn lại" aria-valuemin="0" aria-valuemax="28" aria-valuenow="28"><div class="np-frogger-time-fill" id="froggerTimeFill"></div></div><strong id="froggerTime">28s</strong></div>
        <canvas class="np-frogger-board" id="arcCanvas" width="660" height="550" tabindex="0" aria-label="Bàn chơi Frogger: đi lên từng ô, tránh xe, cưỡi bè qua sông và đưa ếch vào năm ổ trên cùng."></canvas>
        <div class="np-frogger-controls" aria-label="Điều khiển">
          <button type="button" data-hop="left" aria-label="Nhảy sang trái">←</button>
          <button type="button" data-hop="up" aria-label="Nhảy lên">↑</button>
          <button type="button" data-hop="down" aria-label="Nhảy xuống">↓</button>
          <button type="button" data-hop="right" aria-label="Nhảy sang phải">→</button>
          <button type="button" id="arcPause" aria-label="Tạm dừng">Ⅱ</button>
          <button type="button" id="arcRestart" aria-label="Chơi lại">↻</button>
        </div>
        <p class="np-frogger-status" id="froggerStatus" role="status" aria-live="polite">Né xe, nhảy lên bè, lấp năm ổ.</p>
        <span class="np-frogger-sr" id="arcHelp">Dùng phím mũi tên hoặc W A S D để nhảy một ô. Trên màn hình cảm ứng, vuốt để đổi hướng hoặc dùng các nút điều khiển. Mỗi lượt có thời hạn; tránh xe và đứng trên bè khi qua sông.</span>
      </section>`;

    const canvas = container.querySelector('#arcCanvas');
    const ctx = canvas.getContext('2d');
    const status = container.querySelector('#froggerStatus');
    const timeTrack = container.querySelector('#froggerTimeTrack');
    const timeFill = container.querySelector('#froggerTimeFill');
    const setText = (selector, value) => {
      const element = container.querySelector(selector);
      const next = String(value);
      if (element && element.textContent !== next) element.textContent = next;
    };
    canvas.style.touchAction = 'none';

    function persist() {
      const nextScore = Math.max(bestScore, state.score);
      const nextStage = Math.max(bestStage, state.stage);
      if (nextScore === bestScore && nextStage === bestStage) return;
      bestScore = nextScore;
      bestStage = nextStage;
      try { localStorage.setItem(storeKey, JSON.stringify({ score: bestScore, stage: bestStage })); }
      catch (error) { /* score chase remains playable in private browsing */ }
    }

    function sound(name) {
      if (window.NP_Audio && typeof window.NP_Audio[name] === 'function') window.NP_Audio[name]();
    }

    function announce(event) {
      if (!event) return;
      if (event.type === 'lost-life') {
        status.textContent = event.lives ? event.reason + ' · còn ' + event.lives + ' mạng' : event.reason + ' · hết mạng';
        sound('alarm');
        if (window.NP_Juice) window.NP_Juice.vibrate([25, 35, 35]);
      } else if (event.type === 'hop') {
        sound('pop');
      } else if (event.type === 'home') {
        status.textContent = 'Về ổ ' + event.home + ' · ' + event.filled + '/5';
        sound('coin');
        if (window.NP_Juice) window.NP_Juice.vibrate(14);
      } else if (event.type === 'stage-clear') {
        status.textContent = 'Qua màn ' + event.stage + ' · xe chạy nhanh hơn';
        sound('win');
        if (window.NP_Juice) window.NP_Juice.vibrate([20, 30, 20]);
      } else if (event.type === 'stage-start') {
        status.textContent = 'Màn ' + event.stage;
      }
      if (event.extraLives > 0) {
        status.textContent = 'Thêm ' + event.extraLives + ' mạng';
        sound('powerup');
      }
    }

    function updateHud() {
      setText('#arcLevel', state.stage);
      setText('#arcScore', state.score);
      setText('#arcLives', state.lives);
      let filledHomes = 0;
      for (const filled of state.homes) if (filled) filledHomes++;
      setText('#arcProgress', filledHomes + '/5');
      setText('#froggerTime', Math.ceil(state.remaining) + 's');
      setText('#arcBest', 'Kỷ lục ' + bestScore + ' · màn ' + bestStage);
      const stageTime = froggerTimeLimit(state.stage);
      const percent = Math.max(0, Math.min(100, state.remaining / stageTime * 100));
      timeFill.style.width = percent + '%';
      timeTrack.setAttribute('aria-valuemax', String(Math.ceil(stageTime)));
      timeTrack.setAttribute('aria-valuenow', String(Math.max(0, Math.ceil(state.remaining))));
      const pause = container.querySelector('#arcPause');
      if (pause) pause.setAttribute('aria-label', state.phase === 'paused' ? 'Tiếp tục' : 'Tạm dừng');
      if (pause) pause.textContent = state.phase === 'paused' ? '▶' : 'Ⅱ';
    }

    function restart() {
      const fresh = model.create((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
      Object.assign(state, fresh);
      status.textContent = 'Né xe, nhảy lên bè, lấp năm ổ.';
      updateHud();
      canvas.focus({ preventScroll: true });
    }

    function togglePause() {
      if (state.phase === 'over') return;
      if (state.phase === 'paused') {
        state.phase = state.pauseReturnPhase || 'playing';
        state.lastEvent = { type: 'resume' };
        lastFrame = 0;
        status.textContent = 'Tiếp tục.';
      } else if (state.phase === 'playing' || state.phase === 'stage-clear') {
        state.pauseReturnPhase = state.phase;
        state.phase = 'paused';
        status.textContent = 'Đã tạm dừng.';
      }
      updateHud();
    }

    function act(dx, dy) {
      if (state.phase !== 'playing') return;
      const previous = state.lastEvent;
      const moved = model.hop(state, dx, dy);
      if (!moved) return;
      if (state.lastEvent !== previous) announce(state.lastEvent);
      else sound('pop');
      persist();
      updateHud();
      draw();
    }

    function roundRect(x, y, width, height, radius, fill, stroke) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y); ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r); ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    }

    function ellipse(x, y, rx, ry, color) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }

    function drawRoad(row) {
      const y = row * FROGGER.cellH;
      ctx.fillStyle = row % 2 ? '#34434a' : '#3b4850';
      ctx.fillRect(0, y, FROGGER.width, FROGGER.cellH);
      ctx.fillStyle = 'rgba(231,218,162,.68)';
      for (let x = 0; x < FROGGER.width; x += 94) ctx.fillRect(x + 13, y + 24, 34, 2);
      ctx.fillStyle = 'rgba(16,29,30,.35)';
      ctx.fillRect(0, y, FROGGER.width, 1);
    }

    function drawWater(row) {
      const lane = froggerLane(state, row);
      const y = row * FROGGER.cellH;
      ctx.fillStyle = row % 2 ? '#177f99' : '#16849b';
      ctx.fillRect(0, y, FROGGER.width, FROGGER.cellH);
      ctx.strokeStyle = 'rgba(158,237,224,.22)';
      ctx.lineWidth = 1.5;
      const drift = state.elapsed * 18 * (lane ? Math.sign(lane.speed) : 1);
      for (let x = -42; x < FROGGER.width + 55; x += 92) {
        const waveX = froggerWrap(x + drift, FROGGER.width + 92) - 46;
        ctx.beginPath(); ctx.moveTo(waveX, y + 13); ctx.quadraticCurveTo(waveX + 16, y + 8, waveX + 34, y + 13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(waveX + 38, y + 37); ctx.quadraticCurveTo(waveX + 54, y + 32, waveX + 73, y + 37); ctx.stroke();
      }
    }

    function drawPlatform(lane) {
      const y = lane.row * FROGGER.cellH + 8;
      for (const item of lane.items) {
        for (const shift of [-FROGGER.width, 0, FROGGER.width]) {
          const x = item.x + shift;
          if (x > FROGGER.width || x + item.width < 0) continue;
          roundRect(x, y + 4, item.width, 31, 13, item.color, '#714d39');
          ctx.strokeStyle = 'rgba(68,45,34,.52)'; ctx.lineWidth = 2;
          for (let mark = 18; mark < item.width - 12; mark += 30) {
            ctx.beginPath(); ctx.moveTo(x + mark, y + 9); ctx.lineTo(x + mark - 3, y + 31); ctx.stroke();
          }
          ellipse(x + 12, y + 20, 4, 8, '#80543c');
          ellipse(x + item.width - 12, y + 20, 4, 8, '#80543c');
        }
      }
    }

    function drawCar(lane, item) {
      const y = lane.row * FROGGER.cellH + 8;
      for (const shift of [-FROGGER.width, 0, FROGGER.width]) {
        const x = item.x + shift;
        if (x > FROGGER.width || x + item.width < 0) continue;
        roundRect(x + 2, y + 7, item.width - 4, 27, 7, item.color, 'rgba(19,39,42,.7)');
        if (item.cabin) {
          const cabinW = Math.max(22, item.width * 0.39);
          roundRect(x + item.width * 0.32, y + 10, cabinW, 16, 4, '#d8eee1', 'rgba(26,57,54,.35)');
          ctx.fillStyle = 'rgba(22,52,57,.42)';
          ctx.fillRect(x + item.width * 0.32 + cabinW * 0.52, y + 11, 2, 14);
        } else {
          ctx.fillStyle = 'rgba(255,244,204,.75)';
          ctx.fillRect(x + 8, y + 13, 5, 3);
          ctx.fillRect(x + item.width - 13, y + 13, 5, 3);
        }
        ctx.fillStyle = '#1c292d';
        ctx.fillRect(x + 11, y + 29, 13, 6);
        ctx.fillRect(x + item.width - 24, y + 29, 13, 6);
      }
    }

    function drawHome(index) {
      const x = FROGGER.cellW * (FROGGER.homes[index] + 0.5);
      const y = FROGGER.cellH * 0.5;
      ellipse(x, y + 2, 22, 15, state.homes[index] ? '#b8d55c' : '#4a9154');
      ctx.strokeStyle = state.homes[index] ? '#eef6a0' : '#9bcf72';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y + 2, 16, Math.PI * 0.12, Math.PI * 1.82); ctx.stroke();
      if (state.homes[index]) drawFrog(x, y - 2, 0.32, false);
      else {
        ctx.strokeStyle = 'rgba(232,247,177,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x + 2, y - 2); ctx.lineTo(x + 8, y + 4); ctx.stroke();
      }
    }

    function drawFrog(x, y, scale = 1, flash = false) {
      const blink = flash && state.invulnerable > 0 && Math.floor(state.elapsed * 12) % 2 === 0;
      if (blink) return;
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ellipse(0, 7, 17, 12, '#38774c');
      ellipse(0, 1, 15, 13, '#8cce62');
      ellipse(-8, -8, 6.5, 7, '#9bdb6a'); ellipse(8, -8, 6.5, 7, '#9bdb6a');
      ellipse(-8, -9, 3.2, 3.8, '#f7f5dc'); ellipse(8, -9, 3.2, 3.8, '#f7f5dc');
      ellipse(-7.5, -9, 1.5, 2.2, '#21392e'); ellipse(8.5, -9, 1.5, 2.2, '#21392e');
      ctx.strokeStyle = '#4b8a4d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-12, 9); ctx.lineTo(-19, 13); ctx.moveTo(12, 9); ctx.lineTo(19, 13); ctx.stroke();
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, FROGGER.width, FROGGER.height);
      ctx.fillStyle = '#5b9852'; ctx.fillRect(0, 0, FROGGER.width, FROGGER.cellH);
      for (let row = 1; row <= 4; row++) drawWater(row);
      ctx.fillStyle = '#75af5a'; ctx.fillRect(0, FROGGER.cellH * 5, FROGGER.width, FROGGER.cellH);
      for (let row = 6; row <= 9; row++) drawRoad(row);
      ctx.fillStyle = '#71ad5a'; ctx.fillRect(0, FROGGER.cellH * 10, FROGGER.width, FROGGER.cellH);
      ctx.fillStyle = 'rgba(242,252,178,.24)';
      for (let x = 16; x < FROGGER.width; x += 48) {
        ctx.beginPath(); ctx.arc(x, FROGGER.cellH * 5 + 12 + (x % 3) * 7, 2, 0, Math.PI * 2); ctx.fill();
      }
      for (const lane of state.lanes) {
        if (lane.kind === 'river') drawPlatform(lane);
        else for (const item of lane.items) drawCar(lane, item);
      }
      for (let i = 0; i < FROGGER.homes.length; i++) drawHome(i);
      if (state.phase !== 'stage-clear' && state.phase !== 'over') {
        drawFrog(state.frog.x, state.frog.row * FROGGER.cellH + FROGGER.cellH * 0.5, 1, true);
      }

      if (state.phase === 'paused' || state.phase === 'stage-clear' || state.phase === 'over') {
        ctx.fillStyle = 'rgba(13,31,32,.76)'; ctx.fillRect(0, 0, FROGGER.width, FROGGER.height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#f5f4dc'; ctx.font = '800 32px Calibri, sans-serif';
        const headline = state.phase === 'paused' ? 'TẠM DỪNG' : state.phase === 'over' ? 'HẾT MẠNG' : 'QUA MÀN ' + state.lastClearedStage;
        ctx.fillText(headline, FROGGER.width / 2, 262);
        ctx.fillStyle = '#d5e8bc'; ctx.font = '17px Calibri, sans-serif';
        const subline = state.phase === 'over' ? 'Nhấn ↻ để sang đường lần nữa' : state.phase === 'paused' ? 'Nhấn ▶ để tiếp tục' : 'Bè và xe sẽ chạy nhanh hơn';
        ctx.fillText(subline, FROGGER.width / 2, 296);
      }
    }

    function frame(timestamp) {
      const dt = lastFrame ? Math.min(0.05, Math.max(0, (timestamp - lastFrame) / 1000)) : 0;
      lastFrame = timestamp || 0;
      const previous = state.lastEvent;
      model.tick(state, dt);
      if (state.lastEvent !== previous) {
        announce(state.lastEvent);
        persist();
      }
      updateHud();
      draw();
      frameId = session.requestAnimationFrame(frame);
    }

    const directions = {
      left: [-1, 0], up: [0, -1], down: [0, 1], right: [1, 0]
    };
    for (const button of container.querySelectorAll('[data-hop]')) {
      const direction = directions[button.getAttribute('data-hop')];
      listen(button, 'pointerdown', event => {
        event.preventDefault();
        if (button.setPointerCapture && event.pointerId !== undefined) {
          try { button.setPointerCapture(event.pointerId); } catch (error) { /* pointer may already be canceled */ }
        }
        act(direction[0], direction[1]);
      });
      listen(button, 'click', event => {
        if (event.detail !== 0) return;
        act(direction[0], direction[1]);
      });
    }
    listen(container.querySelector('#arcPause'), 'click', togglePause);
    listen(container.querySelector('#arcRestart'), 'click', restart);
    listen(window, 'keydown', event => {
      const key = String(event.key || '');
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target && event.target.tagName)) return;
      if (key === 'p' || key === 'P') {
        if (!event.repeat) togglePause();
        return;
      }
      const direction = ({ ArrowLeft: 'left', a: 'left', A: 'left', ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down', ArrowRight: 'right', d: 'right', D: 'right' })[key];
      if (direction && !event.repeat) {
        event.preventDefault();
        const [dx, dy] = directions[direction];
        act(dx, dy);
      } else if ((key === ' ' || event.code === 'Space' || key === 'Enter') &&
                 !(event.target && event.target.tagName === 'BUTTON')) {
        event.preventDefault();
        act(0, -1);
      }
    });
    listen(document, 'visibilitychange', () => {
      if (document.hidden && state.phase !== 'paused' && state.phase !== 'over') togglePause();
    });
    listen(window, 'blur', () => {
      if (state.phase === 'playing' || state.phase === 'stage-clear') togglePause();
    });
    listen(canvas, 'pointerdown', event => {
      event.preventDefault();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (canvas.setPointerCapture && event.pointerId !== undefined) {
        try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* pointer may have left the canvas */ }
      }
    });
    listen(canvas, 'pointerup', event => {
      const start = pointers.get(event.pointerId);
      pointers.delete(event.pointerId);
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) act(0, -1);
      else if (Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? -1 : 1, 0);
      else act(0, dy < 0 ? -1 : 1);
    });
    for (const name of ['pointercancel', 'lostpointercapture']) {
      listen(canvas, name, event => pointers.delete(event.pointerId));
    }

    updateHud();
    draw();
    frameId = session.requestAnimationFrame(frame);
    session.onCleanup(() => {
      if (frameId !== null) session.cancelAnimationFrame(frameId);
      pointers.clear();
      persist();
      if (modal && previousModalGeometry) {
        modal.style.width = previousModalGeometry.width;
        modal.style.left = previousModalGeometry.left;
        modal.style.right = previousModalGeometry.right;
      }
    });
  }

  function launch(container, game) {
    if (String(game && game.id || '').toLowerCase() === 'frogger-ech-bang-qua-duong') {
      launchFrogger(container, game);
      return;
    }
    const session = window.NP_GameSession.start();
    const { listen, requestAnimationFrame, cancelAnimationFrame, setTimeout } = session;
    const kind = kindFor(game);
    const keys = Object.create(null);
    const state = {
      kind, stage: 1, points: 0, score: 0, lives: 3,
      bestStage: 1, highScore: 0, phase: 'playing',
      elapsed: 0, lastFrame: 0, banner: 1.5, cooldown: 0,
      playerX: W / 2, targetX: W / 2, lane: 1,
      bullets: [], hazards: [], gems: [], spawnIn: 0.5,
      nextShot: 0, shield: 0, shieldCooldown: 0,
      selected: 0, patience: 8, order: 0,
      cards: [], flipped: [], matched: new Set(), busy: false, cursor: 0,
      goal: 0, target: null, crossX: W / 2, crossY: H / 2,
      qIndex: 0, enemyHP: 100, enemyMax: 100,
      hp: 100, guarded: false, healCooldown: 0,
      fx: [], lastAction: ''
    };
    const key = 'np_archetype_' + String(game.id || 'unknown').replace(/[^a-z0-9-_]/gi, '');
    try {
      const previous = JSON.parse(localStorage.getItem(key) || '{}');
      if (Number.isFinite(previous.score)) state.highScore = Math.max(0, previous.score);
      if (Number.isFinite(previous.stage)) state.bestStage = Math.max(1, previous.stage);
    } catch (error) { /* disabled or corrupted storage */ }

    container.innerHTML = '<div class="canvas-game-box np-arc-box">' +
      '<div class="canvas-game-hud np-arc-hud">' +
      '<div class="hud-pill">Màn <span id="arcLevel">1</span> <small id="arcBest"></small></div>' +
      '<div class="hud-pill">Điểm <span id="arcScore">0</span></div>' +
      '<div class="hud-pill">Mạng <span id="arcLives">3</span></div>' +
      '<div class="hud-pill">Tiến độ <span id="arcProgress">0/1</span></div></div>' +
      '<canvas class="canvas-main-viewport np-arc-canvas" id="arcCanvas" width="640" height="400" aria-label="Khu vực chơi game"></canvas>' +
      '<p class="np-arc-help" id="arcHelp"></p>' +
      '<div class="canvas-controls-bar np-arc-controls">' +
      '<button class="btn-canvas-action" id="arcLeft" type="button" aria-label="Sang trái">◀ Trái</button>' +
      '<button class="btn-canvas-action np-arc-action" id="arcAction" type="button">Hành động</button>' +
      '<button class="btn-canvas-action" id="arcRight" type="button" aria-label="Sang phải">Phải ▶</button>' +
      '<button class="btn-canvas-action" id="arcPause" type="button">Tạm dừng</button>' +
      '<button class="btn-canvas-action" id="arcRestart" type="button">Chơi lại</button>' +
      '<button class="btn-canvas-action" id="arcContinue" type="button">Tiếp tục màn cao nhất</button>' +
      '</div><div class="np-arc-announcement" id="arcAnnouncement" role="status" aria-live="polite"></div></div>';

    const canvas = container.querySelector('#arcCanvas');
    const ctx = canvas.getContext('2d');
    const text = (id, value) => { const el = container.querySelector(id); if (el) el.textContent = value; };
    text('#arcHelp', descriptions[kind] + ' Đây là chế độ arcade theo thể loại, chưa mô phỏng đầy đủ luật game gốc.');
    const labels = { shooter: 'Bắn', runner: 'Khiên', reflex: 'Bắn trúng', puzzle: 'Lật thẻ', management: 'Phục vụ', quiz: 'Trả lời', duel: 'Ra đòn' };
    text('#arcAction', labels[kind]);
    canvas.style.touchAction = 'none';

    function notify(message) {
      state.lastAction = message;
      text('#arcAnnouncement', message);
    }
    function sound(name) {
      if (window.NP_Audio && typeof window.NP_Audio[name] === 'function') {
        window.NP_Audio[name]();
      }
    }
    function vibrate(pattern) {
      try {
        if (window.NP_Juice && typeof window.NP_Juice.vibrate === 'function') window.NP_Juice.vibrate(pattern);
      } catch (error) { /* hardware vibration may be unavailable */ }
    }
    function persist() {
      if (state.score <= state.highScore && state.stage <= state.bestStage) return;
      state.highScore = Math.max(state.highScore, state.score);
      state.bestStage = Math.max(state.bestStage, state.stage);
      try { localStorage.setItem(key, JSON.stringify({ score: state.highScore, stage: state.bestStage })); }
      catch (error) { /* private browsing */ }
    }
    function needed() {
      if (kind === 'puzzle' || kind === 'duel') return 1;
      return 4 + state.stage * (kind === 'runner' ? 3 : 2);
    }
    function updateHUD() {
      text('#arcLevel', state.stage);
      text('#arcBest', '(cao nhất ' + state.bestStage + ')');
      text('#arcScore', state.score);
      text('#arcLives', state.lives);
      text('#arcProgress', Math.min(state.points, needed()) + '/' + needed());
      const pause = container.querySelector('#arcPause');
      if (pause) pause.textContent = state.phase === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
      const continueBtn = container.querySelector('#arcContinue');
      if (continueBtn) continueBtn.style.display = state.bestStage > 1 ? '' : 'none';
    }
    function preparePuzzle() {
      const pairs = Math.min(12, 5 + state.stage);
      const values = Array.from({ length: pairs }, (_, i) => i % 12);
      state.cards = [...values, ...values];
      for (let i = state.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.cards[i], state.cards[j]] = [state.cards[j], state.cards[i]];
      }
      state.flipped = [];
      state.matched = new Set();
      state.busy = false;
      state.cursor = 0;
    }
    function prepareTarget() {
      state.target = { x: random(70, W - 70), y: random(85, H - 65),
        time: Math.max(0.75, 2.6 - state.stage * 0.115),
        radius: Math.max(27, 39 - state.stage * 0.65) };
    }
    function prepareOrder() {
      state.order = Math.floor(Math.random() * 3);
      state.patience = Math.max(3.5, 10 - state.stage * 0.38);
    }
    function prepareDuel() {
      state.enemyMax = 70 + state.stage * 22;
      state.enemyHP = state.enemyMax;
      state.guarded = false;
      state.cooldown = 0;
      state.hp = Math.min(100, state.hp + 25);
    }
    function resetGame() {
      state.stage = 1; state.points = 0; state.score = 0; state.lives = 3;
      state.phase = 'playing'; state.elapsed = 0; state.lastFrame = 0;
      state.banner = 1.5; state.cooldown = 0; state.shield = 0;
      state.shieldCooldown = 0; state.playerX = W / 2; state.targetX = W / 2;
      state.lane = 1; state.nextShot = 0; state.healCooldown = 0;
      state.hp = 100; state.selected = 0; state.spawnIn = 0.6;
      state.hazards = []; state.bullets = []; state.gems = []; state.fx = [];
      for (const k of Object.keys(keys)) keys[k] = false;
      if (kind === 'puzzle') preparePuzzle();
      if (kind === 'reflex') prepareTarget();
      if (kind === 'management') prepareOrder();
      if (kind === 'duel') prepareDuel();
      state.qIndex = Math.floor(Math.random() * QUESTIONS.length);
      notify('Màn 1 bắt đầu. Chúc bạn chơi vui!');
      updateHUD();
    }
    function finish() {
      if (state.phase === 'over') return;
      state.phase = 'over';
      persist();
      notify('Hết lượt! Bạn đạt ' + state.score + ' điểm, tới màn ' + state.stage + '. Nhấn Chơi lại.');
      sound('alarm');
      updateHUD();
    }
    function loseLife() {
      if (state.phase !== 'playing' || state.cooldown > 0) return;
      state.lives -= 1;
      state.cooldown = 0.75;
      vibrate([30, 50, 30]);
      if (state.lives <= 0) finish();
      else notify('Mất một mạng! Còn ' + state.lives + ' lượt.');
      updateHUD();
    }
    function nextStage() {
      state.stage++;
      state.points = 0;
      state.banner = 1.8;
      state.lives = Math.min(5, state.lives + (state.stage % 3 === 0 ? 1 : 0));
      state.bullets.length = 0;
      state.hazards.length = 0;
      state.gems.length = 0;
      state.spawnIn = 0.8;
      state.cooldown = 0.8;
      if (kind === 'puzzle') preparePuzzle();
      if (kind === 'reflex') prepareTarget();
      if (kind === 'management') prepareOrder();
      if (kind === 'duel') prepareDuel();
      persist();
      sound('win');
      vibrate([20, 35, 20]);
      notify('Qua màn! Màn ' + state.stage + ' có thử thách khó hơn.');
      updateHUD();
    }
    function reward(value, progress = 1) {
      if (state.phase !== 'playing') return;
      state.score += value;
      state.points += progress;
      if (state.points >= needed()) nextStage();
      else { persist(); updateHUD(); }
    }

    function shoot() {
      if (state.phase !== 'playing' || state.nextShot > 0) return;
      state.nextShot = Math.max(0.12, 0.29 - state.stage * 0.012);
      state.bullets.push({ x: state.playerX - 12, y: H - 67 }, { x: state.playerX + 12, y: H - 67 });
      if (state.bullets.length > 35) state.bullets.splice(0, state.bullets.length - 35);
      sound('laser');
      vibrate(8);
    }
    function moveChoice(delta) {
      if (state.phase !== 'playing') return;
      if (kind === 'runner') {
        state.lane = clamp(state.lane + delta, 0, 2);
        state.targetX = W * (0.25 + state.lane * 0.25);
      } else if (kind === 'management' || kind === 'duel') {
        state.selected = (state.selected + delta + 3) % 3;
      } else if (kind === 'quiz') {
        state.selected = (state.selected + delta + 4) % 4;
      } else if (kind === 'puzzle') {
        state.cursor = (state.cursor + delta + state.cards.length) % state.cards.length;
      } else if (kind === 'reflex') {
        state.crossX = clamp(state.crossX + 70 * delta, 25, W - 25);
      }
    }
    function openCard(index) {
      if (state.phase !== 'playing' || state.busy || index < 0 ||
          index >= state.cards.length || state.matched.has(index) ||
          state.flipped.includes(index)) return;
      state.flipped.push(index);
      sound('pop');
      vibrate(8);
      if (state.flipped.length === 2) {
        const [a, b] = state.flipped;
        if (state.cards[a] === state.cards[b]) {
          state.matched.add(a); state.matched.add(b);
          state.flipped = [];
          state.score += 20;
          if (state.matched.size === state.cards.length) nextStage();
          else { persist(); updateHUD(); }
        } else {
          state.busy = true;
          setTimeout(() => { state.flipped = []; state.busy = false; }, 380);
        }
      }
    }
    function selectQuiz(index) {
      if (state.phase !== 'playing') return;
      const q = QUESTIONS[state.qIndex % QUESTIONS.length];
      state.selected = clamp(index, 0, 3);
      if (state.selected === q[2]) {
        sound('coin');
        reward(25);
      } else {
        loseLife();
      }
      state.qIndex++;
    }
    function doAction() {
      if (state.phase !== 'playing') return;
      vibrate(8);
      if (kind === 'shooter') shoot();
      else if (kind === 'runner') {
        if (state.shieldCooldown <= 0) {
          state.shield = 1.2;
          state.shieldCooldown = 4.0;
          sound('powerup');
        }
      } else if (kind === 'reflex') hitTarget(state.crossX, state.crossY);
      else if (kind === 'puzzle') openCard(state.cursor);
      else if (kind === 'quiz') selectQuiz(state.selected);
      else if (kind === 'management') {
        if (state.selected === state.order) {
          sound('coin');
          reward(20 + Math.round(state.patience * 3));
          prepareOrder();
        } else {
          state.patience -= 2;
          sound('alarm');
          if (state.patience <= 0) { loseLife(); prepareOrder(); }
        }
      } else if (kind === 'duel') {
        if (state.cooldown > 0) return;
        if (state.selected === 0) {
          state.enemyHP -= 16 + Math.min(22, state.stage * 2);
          sound('hit');
        } else if (state.selected === 1) {
          state.guarded = true;
          sound('pop');
        } else if (state.healCooldown <= 0) {
          state.hp = Math.min(100, state.hp + 24);
          state.healCooldown = 2;
          sound('powerup');
        }
        if (state.enemyHP <= 0) {
          reward(100);
          return;
        }
        const damage = 7 + Math.min(24, state.stage * 2);
        state.hp -= state.guarded ? Math.ceil(damage * 0.15) : damage;
        state.guarded = false;
        if (state.hp <= 0) {
          state.hp = 100;
          state.cooldown = 0; // Damage must count even immediately after the enemy attacks.
          loseLife();
          if (state.phase === 'playing') prepareDuel();
        } else {
          state.cooldown = 0.45;
        }
      }
    }
    function hitTarget(x, y) {
      if (state.phase !== 'playing' || !state.target) return;
      const t = state.target;
      if (Math.hypot(x - t.x, y - t.y) <= t.radius + 7) {
        sound('coin');
        reward(20 + Math.round(t.time * 10));
        prepareTarget();
      } else {
        sound('pop');
      }
    }

    const controls = [
      ['#arcLeft', 'left', -1], ['#arcRight', 'right', 1], ['#arcAction', 'action', 0]
    ];
    controls.forEach(([selector, name, direction]) => {
      const button = container.querySelector(selector);
      if (!button) return;
      // Pointer events unify mouse, touch and stylus without synthetic duplicate clicks.
      listen(button, 'pointerdown', event => {
        event.preventDefault();
        if (button.setPointerCapture && event.pointerId !== undefined) {
          try { button.setPointerCapture(event.pointerId); } catch (error) {}
        }
        keys[name] = true;
        if (name === 'action') doAction();
        else if (kind !== 'shooter') moveChoice(direction);
      });
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen(button, eventName, () => { keys[name] = false; });
      }
      // Keyboard-generated button clicks remain accessible.
      listen(button, 'click', event => {
        if (event.detail !== 0) return;
        if (name === 'action') doAction();
        else moveChoice(direction);
      });
    });
    listen(window, 'pointerup', () => { keys.left = false; keys.right = false; keys.action = false; });
    listen(window, 'blur', () => { keys.left = false; keys.right = false; keys.action = false; if (state.phase === 'playing') togglePause(); });
    listen(document, 'visibilitychange', () => {
      if (document.hidden && state.phase === 'playing') togglePause();
    });
    listen(window, 'keydown', event => {
      const focused = event.target && event.target.tagName;
      if (focused === 'INPUT' || focused === 'TEXTAREA') return;
      const k = event.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        event.preventDefault();
        keys.left = true;
        if (!event.repeat && kind !== 'shooter') moveChoice(-1);
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        event.preventDefault();
        keys.right = true;
        if (!event.repeat && kind !== 'shooter') moveChoice(1);
      } else if (k === ' ' || event.code === 'Space' || k === 'Enter') {
        event.preventDefault();
        keys.action = true;
        if (!event.repeat) doAction();
      } else if (k === 'p' || k === 'P') {
        if (!event.repeat) togglePause();
      }
    });
    listen(window, 'keyup', event => {
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) keys.left = false;
      if (['ArrowRight', 'd', 'D'].includes(event.key)) keys.right = false;
      if (event.key === ' ' || event.code === 'Space' || event.key === 'Enter') keys.action = false;
    });
    listen(canvas, 'pointerdown', event => {
      event.preventDefault();
      const p = pointerCoords(event);
      if (kind === 'shooter') { state.playerX = clamp(p.x, 24, W - 24); shoot(); }
      else if (kind === 'reflex') { state.crossX = p.x; state.crossY = p.y; hitTarget(p.x, p.y); }
      else if (kind === 'puzzle') { const index = cardAt(p.x, p.y); if (index !== -1) openCard(index); }
      else if (kind === 'quiz') {
        const index = Math.floor((p.y - 134) / 56);
        if (index >= 0 && index < 4) selectQuiz(index);
      } else if (kind === 'runner') {
        state.lane = clamp(Math.round((p.x / W - 0.25) * 4), 0, 2);
        state.targetX = W * (0.25 + state.lane * 0.25);
      }
      else if (kind === 'management' || kind === 'duel') {
        const index = Math.floor((p.x - 70) / 170);
        if (index >= 0 && index < 3) { state.selected = index; doAction(); }
      }
    });
    listen(canvas, 'pointermove', event => {
      const p = pointerCoords(event);
      if (kind === 'shooter' && event.buttons) state.playerX = clamp(p.x, 24, W - 24);
      if (kind === 'reflex') { state.crossX = p.x; state.crossY = p.y; }
    });
    function pointerCoords(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * W / (rect.width || W),
        y: (event.clientY - rect.top) * H / (rect.height || H)
      };
    }
    function togglePause() {
      if (state.phase === 'over') return;
      state.phase = state.phase === 'paused' ? 'playing' : 'paused';
      state.lastFrame = 0; // Never catch up a hidden tab with hundreds of simulation steps.
      updateHUD();
      notify(state.phase === 'paused' ? 'Đã tạm dừng.' : 'Tiếp tục chơi.');
    }
    const pauseButton = container.querySelector('#arcPause');
    const restartButton = container.querySelector('#arcRestart');
    listen(pauseButton, 'click', togglePause);
    listen(restartButton, 'click', resetGame);
    listen(container.querySelector('#arcContinue'), 'click', () => {
      if (state.bestStage <= 1) return;
      const checkpoint = state.bestStage;
      resetGame();
      state.stage = checkpoint;
      state.points = 0;
      state.banner = 1.6;
      if (kind === 'puzzle') preparePuzzle();
      if (kind === 'reflex') prepareTarget();
      if (kind === 'management') prepareOrder();
      if (kind === 'duel') prepareDuel();
      notify('Tiếp tục từ màn ' + checkpoint + '.');
      updateHUD();
    });

    function cardBounds(index) {
      const rows = Math.ceil(state.cards.length / 4);
      const size = Math.min(60, (270 - 9 * rows) / rows);
      const gap = 9;
      const x0 = (W - 4 * (size + gap) + gap) / 2;
      return { x: x0 + (index % 4) * (size + gap),
        y: 72 + Math.floor(index / 4) * (size + gap), size };
    }
    function cardAt(x, y) {
      for (let i = 0; i < state.cards.length; i++) {
        const b = cardBounds(i);
        if (x >= b.x && x <= b.x + b.size && y >= b.y && y <= b.y + b.size) return i;
      }
      return -1;
    }
    function step(dt) {
      state.elapsed += dt / 60;
      state.cooldown = Math.max(0, state.cooldown - dt / 60);
      state.banner = Math.max(0, state.banner - dt / 60);
      state.nextShot = Math.max(0, state.nextShot - dt / 60);
      state.shield = Math.max(0, state.shield - dt / 60);
      state.shieldCooldown = Math.max(0, state.shieldCooldown - dt / 60);
      state.healCooldown = Math.max(0, state.healCooldown - dt / 60);

      if (kind === 'shooter') {
        if (keys.left) state.playerX -= 6.3 * dt;
        if (keys.right) state.playerX += 6.3 * dt;
        state.playerX = clamp(state.playerX, 24, W - 24);
        if (keys.action) shoot();
        state.spawnIn -= dt / 60;
        if (state.spawnIn <= 0) {
          if (state.hazards.length < 18) state.hazards.push({
            x: random(28, W - 28), y: -22, radius: random(13, 23),
            vy: (1.4 + Math.min(state.stage, 15) * 0.18) * random(0.9, 1.3)
          });
          state.spawnIn = Math.max(0.22, 0.92 - state.stage * 0.038);
        }
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          state.bullets[i].y -= 10 * dt;
          if (state.bullets[i].y < -20) state.bullets.splice(i, 1);
        }
        for (let i = state.hazards.length - 1; i >= 0; i--) {
          const h = state.hazards[i];
          h.y += h.vy * dt;
          let destroyed = false;
          for (let j = state.bullets.length - 1; j >= 0; j--) {
            const b = state.bullets[j];
            if (Math.hypot(h.x - b.x, h.y - b.y) < h.radius + 6) {
              state.bullets.splice(j, 1);
              state.hazards.splice(i, 1);
              sound('pop');
              reward(20);
              destroyed = true; break;
            }
          }
          if (destroyed) continue;
          if (Math.hypot(h.x - state.playerX, h.y - (H - 45)) < h.radius + 13) {
            state.hazards.splice(i, 1);
            loseLife();
          } else if (h.y > H + 30) state.hazards.splice(i, 1);
        }
      } else if (kind === 'runner') {
        state.playerX += (state.targetX - state.playerX) * Math.min(1, 0.25 * dt);
        state.spawnIn -= dt / 60;
        if (state.spawnIn <= 0) {
          state.hazards.push({ lane: Math.floor(Math.random() * 3), y: -40, passed: false,
            bonus: Math.random() < 0.23 });
          state.spawnIn = Math.max(0.48, 1.35 - state.stage * 0.065);
        }
        for (let i = state.hazards.length - 1; i >= 0; i--) {
          const o = state.hazards[i];
          o.y += (3.1 + Math.min(16, state.stage) * 0.32) * dt;
          const x = W * (0.25 + o.lane * 0.25);
          if (!o.passed && o.y >= H - 58) {
            o.passed = true;
            if (Math.abs(x - state.playerX) < 46 && !state.shield) {
              loseLife();
            } else {
              reward(o.bonus ? 30 : 10);
            }
          }
          if (o.y > H + 50) state.hazards.splice(i, 1);
        }
      } else if (kind === 'reflex') {
        if (state.target) {
          state.target.time -= dt / 60;
          if (state.target.time <= 0) {
            loseLife();
            prepareTarget();
          }
        }
      } else if (kind === 'management') {
        state.patience -= dt / 60;
        if (state.patience <= 0) {
          loseLife();
          prepareOrder();
        }
      }
    }
    function background() {
      ctx.fillStyle = '#101827';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }
    function label(t, x, y, size = 19, color = '#fff') {
      ctx.fillStyle = color; ctx.font = 'bold ' + size + 'px Calibri, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(String(t), x, y);
    }
    function bar(x, y, width, value, color) {
      ctx.fillStyle = '#334155'; ctx.fillRect(x, y, width, 9);
      ctx.fillStyle = color; ctx.fillRect(x, y, width * clamp(value, 0, 1), 9);
    }
    function draw() {
      background();
      label(String(game.title || 'NewPlayground'), W / 2, 27, 17, '#CBD5E1');
      if (kind === 'shooter') {
        for (const b of state.bullets) { ctx.fillStyle = '#38BDF8'; ctx.fillRect(b.x - 2, b.y - 10, 4, 15); }
        for (const o of state.hazards) {
          ctx.fillStyle = '#F97316'; ctx.beginPath();
          ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = state.cooldown > 0 ? '#93C5FD' : '#5EEAD4';
        ctx.beginPath(); ctx.moveTo(state.playerX, H - 70);
        ctx.lineTo(state.playerX - 18, H - 28); ctx.lineTo(state.playerX + 18, H - 28);
        ctx.closePath(); ctx.fill();
        label('Phá mục tiêu để mở màn tiếp theo', W / 2, 66, 14, '#94A3B8');
      } else if (kind === 'runner') {
        for (let i = 1; i <= 2; i++) {
          ctx.strokeStyle = '#64748B'; ctx.setLineDash([10, 14]);
          ctx.beginPath(); ctx.moveTo(W * (0.125 + i * 0.25), 64);
          ctx.lineTo(W * (0.125 + i * 0.25), H); ctx.stroke(); ctx.setLineDash([]);
        }
        for (const o of state.hazards) {
          ctx.fillStyle = o.bonus ? '#FBBF24' : '#F87171';
          ctx.fillRect(W * (0.25 + o.lane * 0.25) - 22, o.y - 18, 44, 36);
        }
        ctx.fillStyle = state.shield > 0 ? '#5EEAD4' : '#60A5FA';
        ctx.fillRect(state.playerX - 21, H - 67, 42, 42);
        label(state.shield > 0 ? 'KHIÊN' : 'Né xe và chướng ngại', W / 2, 68, 15, '#CBD5E1');
        label(state.shieldCooldown > 0 ? 'Khiên hồi: ' + state.shieldCooldown.toFixed(1) + 's' : 'Khiên sẵn sàng', W / 2, 92, 14, '#5EEAD4');
      } else if (kind === 'reflex') {
        const t = state.target;
        if (t) {
          ctx.fillStyle = '#F59E0B'; ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FDE68A'; ctx.beginPath(); ctx.arc(t.x, t.y, t.radius * 0.58, 0, Math.PI * 2); ctx.fill();
          bar(t.x - t.radius, t.y + t.radius + 12, t.radius * 2, t.time / Math.max(0.75, 2.6 - state.stage * 0.115), '#5EEAD4');
        }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(state.crossX, state.crossY, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(state.crossX - 20, state.crossY); ctx.lineTo(state.crossX + 20, state.crossY);
        ctx.moveTo(state.crossX, state.crossY - 20); ctx.lineTo(state.crossX, state.crossY + 20); ctx.stroke();
      } else if (kind === 'puzzle') {
        label('Tìm hai thẻ cùng hình', W / 2, 52, 15, '#94A3B8');
        const symbols = ['★', '◆', '●', '☀', '☂', '♥', '♣', '♠', '▲', '✿', '♫', '☯'];
        state.cards.forEach((value, i) => {
          const b = cardBounds(i);
          const open = state.flipped.includes(i);
          const found = state.matched.has(i);
          ctx.fillStyle = found ? '#065F46' : open ? '#2563EB' : '#334155';
          ctx.fillRect(b.x, b.y, b.size, b.size);
          if (state.cursor === i && !found) {
            ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 3;
            ctx.strokeRect(b.x - 2, b.y - 2, b.size + 4, b.size + 4);
          }
          label(found ? '✓' : open ? symbols[value] : '?',
            b.x + b.size / 2, b.y + b.size / 2 + 8, 24, found ? '#34D399' : '#FFFFFF');
        });
        label('Đã ghép ' + (state.matched.size / 2) + '/' + (state.cards.length / 2) + ' cặp', W / 2, H - 17, 16, '#5EEAD4');
      } else if (kind === 'management') {
        const choices = ['Nước trái cây', 'Bánh nóng', 'Món ăn nhẹ'];
        const colors = ['#38BDF8', '#FB923C', '#A78BFA'];
        label('Khách cần: ' + choices[state.order], W / 2, 100, 25, '#FDE68A');
        bar(98, 132, W - 196, state.patience / Math.max(3.5, 10 - state.stage * 0.38), '#34D399');
        choices.forEach((name, i) => {
          const x = 70 + i * 170;
          ctx.fillStyle = colors[i]; ctx.fillRect(x, 190, 140, 96);
          if (i === state.selected) {
            ctx.strokeStyle = '#FDE68A'; ctx.lineWidth = 5;
            ctx.strokeRect(x - 4, 186, 148, 104);
          }
          label(name, x + 70, 238, 16, '#0F172A');
        });
        label('Chọn món đúng rồi bấm Phục vụ', W / 2, H - 38, 17, '#CBD5E1');
      } else if (kind === 'quiz') {
        const q = QUESTIONS[state.qIndex % QUESTIONS.length];
        label(q[0], W / 2, 95, 20, '#FDE68A');
        q[1].forEach((answer, i) => {
          const y = 134 + i * 56;
          ctx.fillStyle = i === state.selected ? '#2563EB' : '#334155';
          ctx.fillRect(68, y, W - 136, 47);
          label(String.fromCharCode(65 + i) + '. ' + answer, W / 2, y + 31, 17);
        });
      } else if (kind === 'duel') {
        label('Nhân vật', 170, 105, 19, '#5EEAD4');
        label('Đối thủ màn ' + state.stage, 470, 105, 19, '#FCA5A5');
        bar(70, 120, 200, state.hp / 100, '#34D399');
        bar(370, 120, 200, state.enemyHP / state.enemyMax, '#F87171');
        ctx.fillStyle = '#5EEAD4'; ctx.fillRect(120, 170, 85, 95);
        ctx.fillStyle = '#F87171'; ctx.fillRect(430, 170, 85, 95);
        ['Tấn công', 'Phòng thủ', 'Hồi phục'].forEach((action, i) => {
          const x = 70 + i * 170;
          ctx.fillStyle = i === state.selected ? '#2563EB' : '#334155';
          ctx.fillRect(x, 306, 140, 50);
          label(action, x + 70, 338, 18);
        });
      }
      bar(18, H - 12, W - 36, state.points / needed(), '#A3E635');
      if (state.banner > 0 && state.phase === 'playing') {
        ctx.fillStyle = 'rgba(15,23,42,0.78)'; ctx.fillRect(120, 149, 400, 87);
        label('MÀN ' + state.stage, W / 2, 185, 27, '#A3E635');
        label('Độ khó tăng theo từng màn', W / 2, 214, 15, '#FFF');
      }
      if (state.phase !== 'playing') {
        ctx.fillStyle = 'rgba(8,13,22,0.81)'; ctx.fillRect(0, 0, W, H);
        label(state.phase === 'paused' ? 'TẠM DỪNG' : 'HẾT LƯỢT', W / 2, 166, 33, '#A3E635');
        label(state.phase === 'paused' ? 'Bấm Tiếp tục để chơi' : 'Bấm Chơi lại để thử lần nữa', W / 2, 204, 18, '#fff');
      }
    }

    let raf = null;
    function loop(timestamp) {
      let dt = state.lastFrame ? clamp((timestamp - state.lastFrame) / (1000 / 60), 0, 2) : 1;
      state.lastFrame = timestamp || 0;
      if (state.phase === 'playing') step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }
    resetGame();
    raf = requestAnimationFrame(loop);
    session.onCleanup(() => {
      cancelAnimationFrame(raf);
      keys.left = keys.right = keys.action = false;
    });
  }

  window.NP_Archetypes = {
    launch,
    kindFor,
    froggerModel: { create: createFroggerState, hop: froggerHop, tick: tickFrogger, constants: FROGGER }
  };
})();
