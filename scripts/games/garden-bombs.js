/* Original, lightweight Bom Vườn presentation. No commercial characters or art. */
(function () {
  'use strict';

  const STORAGE = 'np_garden_bombs_v1';
  const RECOVERY = STORAGE + '_recovery';
  const TILE = 32;
  const BOARD = 11 * TILE;
  const DIRS = Object.freeze({
    ArrowUp: 'up', w: 'up', ArrowRight: 'right', d: 'right',
    ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left'
  });

  function mount(container, session, audio) {
    const M = window.NP_GardenBombsModel;
    if (!M || !session) throw new Error('Garden Bombs rules are not ready');
    const { listen, requestAnimationFrame, cancelAnimationFrame, setTimeout, onCleanup } = session;
    let raw = null, saved = null, storageOK = true, notice = '';
    try { raw = localStorage.getItem(STORAGE); }
    catch (_) { storageOK = false; notice = 'Ván này vẫn chơi được.'; }
    if (raw) { try { saved = JSON.parse(raw); } catch (_) { saved = null; } }

    const future = Number.isInteger(saved?.version) && saved.version > 1 ||
      Number.isInteger(saved?.game?.version) && saved.game.version > 1;
    let model = !future && saved?.version === 1 && Number.isSafeInteger(saved.best) && saved.best >= 0
      ? M.restore(saved.game) : null;
    if (raw && !model && !future) {
      try {
        const prior = localStorage.getItem(RECOVERY);
        if (prior && prior !== raw) storageOK = false;
        else localStorage.setItem(RECOVERY, raw);
      } catch (_) { storageOK = false; }
      notice = 'Bản lưu lỗi được giữ riêng.';
    }
    if (future) {
      storageOK = false;
      notice = 'Bản lưu mới hơn được giữ nguyên.';
    }
    const restored = Boolean(model);
    model ||= M.create();
    let best = restored ? saved.best : 0;
    let alive = true;
    let paused = restored && model.view().status === 'playing';
    let confirm = false, pausedBeforeConfirm = false;
    let frame = null, lastFrame = null, accumulator = 0, saveAccumulator = 0, tapSerial = 0;
    let lastHUD = '', userGesture = false;
    const held = new Map();
    const pointers = new Map();
    const suppressedClicks = new Set();

    container.classList.add('gb-host');
    container.innerHTML = `
      <section class="gb-game" aria-label="Bom Vườn">
        <header class="gb-header">
          <div><span class="gb-kicker">BOM VƯỜN</span><h3>Bom Vườn</h3></div>
          <div class="gb-toolbar">
            <button class="gb-button" id="gbNew" type="button" aria-label="Ván mới" title="Ván mới">↻</button>
            <button class="gb-button" id="gbPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
          </div>
        </header>
        <div class="gb-hud" aria-label="Trạng thái ván">
          <div><span>Màn</span><strong id="gbStage">1 / 5</strong></div>
          <div><span>Sâu bọ</span><strong id="gbPests">0</strong></div>
          <div><span>Điểm</span><strong id="gbScore">0</strong></div>
        </div>
        <div class="gb-board-wrap">
          <canvas id="gbCanvas" width="352" height="352" tabindex="0" role="img"
            aria-label="Bàn Bom Vườn. Dùng phím mũi tên hoặc WASD để di chuyển; Space đặt bom."
            aria-describedby="gbInstructions">Bàn chơi Bom Vườn.</canvas>
          <div class="gb-overlay" id="gbOverlay" hidden>
            <div class="gb-card">
              <strong id="gbOverlayTitle">Tạm dừng</strong>
              <p id="gbOverlayText" hidden></p>
              <button class="gb-button gb-primary" id="gbContinue" type="button">▶</button>
            </div>
          </div>
        </div>
        <div class="gb-controls" role="group" aria-label="Điều khiển Bom Vườn">
          <div class="gb-pad">
            <button class="gb-button gb-dir gb-up" id="gbUp" data-dir="up" type="button" aria-label="Lên">↑</button>
            <button class="gb-button gb-dir gb-left" id="gbLeft" data-dir="left" type="button" aria-label="Trái">←</button>
            <button class="gb-button gb-dir gb-down" id="gbDown" data-dir="down" type="button" aria-label="Xuống">↓</button>
            <button class="gb-button gb-dir gb-right" id="gbRight" data-dir="right" type="button" aria-label="Phải">→</button>
          </div>
          <button class="gb-button gb-place" id="gbPlace" type="button" aria-label="Đặt bom">Đặt<br>bom</button>
        </div>
        <p class="np-game-sr gb-sr" id="gbInstructions">Đi quanh thùng, đặt bom rồi tránh luồng nổ. Dọn sạch sâu bọ để mở cổng. Mũi tên hoặc WASD để đi; Space đặt bom; P tạm dừng.</p>
        <p class="np-game-sr gb-sr" id="gbStatus" role="status" aria-live="polite" aria-atomic="true">Dọn sâu bọ, rồi đi tới cổng.</p>
        <p class="gb-storage" id="gbStorage" hidden role="status"></p>
        <details class="gb-help"><summary aria-label="Cách chơi">?</summary><p>Đặt bom, tránh lửa, mở cổng.</p></details>
        <div class="gb-confirm" id="gbConfirm" hidden role="group" aria-label="Xác nhận ván mới">
          <span>Ván mới?</span><button class="gb-button gb-primary" id="gbConfirmYes" type="button">Bắt đầu</button><button class="gb-button" id="gbConfirmNo" type="button">Ở lại</button>
        </div>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('gbCanvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      el('gbOverlay').hidden = false;
      el('gbOverlayTitle').textContent = 'Không mở được bàn chơi';
      el('gbContinue').hidden = true;
      onCleanup(() => container.classList.remove('gb-host'));
      return null;
    }

    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    function sizeCanvas() {
      const dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
      canvas.width = Math.round(BOARD * dpr);
      canvas.height = Math.round(BOARD * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeCanvas();

    function setNotice(text) {
      if (!text) return;
      notice = text;
      el('gbStorage').hidden = false;
      el('gbStorage').textContent = text;
    }
    function save() {
      saveAccumulator = 0;
      if (!alive || !storageOK) { if (notice) setNotice(notice); return; }
      const v = model.view();
      best = Math.max(best, v.score);
      try {
        if (localStorage.getItem(STORAGE) !== raw) {
          storageOK = false;
          setNotice('Bản lưu đã đổi ở tab khác; ván này không ghi đè.');
          return;
        }
        raw = JSON.stringify({ version: 1, best, game: model.serialize() });
        localStorage.setItem(STORAGE, raw);
      } catch (_) {
        storageOK = false;
        setNotice('Không lưu được; ván này vẫn chơi được.');
      }
    }
    function announce(text) { el('gbStatus').textContent = text; }
    function unlockAudio() {
      userGesture = true;
      if (window.NEWPLAYGROUND_MUTED === true || window.NP_Audio?.isMuted) return;
      try {
        audio?.init?.();
        if (audio?.ctx?.state === 'suspended') audio.ctx.resume()?.catch?.(() => {});
      } catch (_) { /* Audio is optional. */ }
    }
    function sound(kind) {
      if (!userGesture || window.NEWPLAYGROUND_MUTED === true || window.NP_Audio?.isMuted) return;
      const pitch = { place: 275, blast: 145, enemy: 520, item: 740, cleared: 660, won: 820, lost: 120 }[kind];
      if (!pitch) return;
      try { audio?.playTone?.(pitch, kind === 'blast' ? 'triangle' : 'sine', kind === 'blast' ? .12 : .07, .03); } catch (_) { /* Sound never blocks play. */ }
    }
    function drain(events) {
      for (const event of events || []) sound(event.kind);
      if (events?.some(event => event.kind === 'item')) announce('Đã nhặt nâng cấp.');
      if (events?.some(event => event.kind === 'lost')) announce('Bị trúng lửa. Thử lại màn này.');
      if (events?.some(event => event.kind === 'cleared')) announce('Đã dọn sạch. Cổng đã mở.');
      if (events?.some(event => event.kind === 'won')) announce('Đã dọn sạch cả khu vườn!');
      if (events?.length) { update(); save(); }
    }

    function clearInput() {
      for (const [id, pointer] of pointers) {
        suppressedClicks.add(pointer.buttonId);
        try { pointer.button.releasePointerCapture?.(id); } catch (_) { /* Capture may already be gone. */ }
      }
      pointers.clear(); held.clear();
      if (model.view().status === 'playing') model.steer(null);
    }
    function setHeld(owner, dir) {
      if (paused || confirm || model.view().status !== 'playing') return;
      held.delete(owner); held.set(owner, dir);
      model.steer(dir); drain(model.drain()); update(); save();
      canvas.focus({ preventScroll: true });
      if (frame === null) { lastFrame = null; frame = requestAnimationFrame(loop); }
    }
    function releaseHeld(owner) {
      if (!held.has(owner)) return;
      const wasCurrent = [...held.keys()].at(-1) === owner;
      held.delete(owner);
      if (wasCurrent && model.view().status === 'playing') {
        const next = [...held.values()].at(-1) || null;
        model.steer(next);
        drain(model.drain()); update(); save();
      }
    }
    function releasePointer(event) {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      pointers.delete(event.pointerId);
      suppressedClicks.add(pointer.buttonId);
      try { pointer.button.releasePointerCapture?.(event.pointerId); } catch (_) { /* Capture may already be gone. */ }
      releaseHeld(pointer.owner);
    }
    function pause(message = 'Đã tạm dừng.') {
      if (model.view().status !== 'playing') return;
      paused = true; accumulator = 0; lastFrame = null;
      cancelAnimationFrame(frame); frame = null; clearInput();
      update(); save(); announce(message); el('gbContinue').focus();
    }
    function resume() {
      if (!alive || confirm || model.view().status !== 'playing' || document.hidden) return;
      unlockAudio(); paused = false; accumulator = 0; lastFrame = null;
      update(); save(); canvas.focus({ preventScroll: true });
      if (frame === null) frame = requestAnimationFrame(loop);
      announce('Chơi tiếp.');
    }
    function startNew() {
      cancelAnimationFrame(frame); frame = null; clearInput();
      model = M.create(); paused = false; confirm = false; accumulator = 0; lastFrame = null;
      el('gbConfirm').hidden = true; update(); draw(); save(); announce('Ván mới. Dọn sâu bọ, rồi đi tới cổng.');
      canvas.focus({ preventScroll: true }); frame = requestAnimationFrame(loop);
    }
    function retryStage() {
      const next = model.retry();
      if (!next) return startNew();
      cancelAnimationFrame(frame); frame = null; clearInput();
      model = next; paused = false; confirm = false; accumulator = 0; lastFrame = null;
      update(); draw(); save(); announce('Thử lại màn này.');
      canvas.focus({ preventScroll: true }); frame = requestAnimationFrame(loop);
    }
    function nextStage() {
      const next = model.next();
      if (!next) return;
      model = next; paused = false; confirm = false; accumulator = 0; lastFrame = null;
      update(); draw(); save(); announce(`Màn ${model.view().stage + 1}.`);
      canvas.focus({ preventScroll: true }); frame = requestAnimationFrame(loop);
    }
    function requestNew() {
      const v = model.view();
      const progressed = v.ticks > 0 || v.score > v.bank || v.stage > 0 || v.bombs.length > 0 || v.flames.length > 0 ||
        Object.keys(v.items).length > 0 || v.player.r !== M.arena(v.stage).spawn.r || v.player.c !== M.arena(v.stage).spawn.c;
      if (v.status === 'playing' && progressed) {
        pausedBeforeConfirm = paused; confirm = true; paused = true; cancelAnimationFrame(frame); frame = null; clearInput();
        el('gbConfirm').hidden = false; update(); save(); el('gbConfirmYes').focus();
      } else startNew();
    }
    function actPlace() {
      if (!alive || paused || confirm || model.view().status !== 'playing') return;
      unlockAudio();
      if (model.place()) { drain(model.drain()); update(); save(); canvas.focus({ preventScroll: true }); }
      else announce(model.view().bombs.length >= model.view().capacity ? 'Đã hết chỗ đặt bom.' : 'Không thể đặt bom ở đây.');
    }

    function actorPoint(actor, terminal, state) {
      let progress = terminal ? 1 : clamp((state.ticks - actor.movedAt + state.remainder / M.STEP) / M.MOVE, 0, 1);
      progress = progress * progress * (3 - 2 * progress);
      return {
        x: (actor.fromC + (actor.c - actor.fromC) * progress + .5) * TILE,
        y: (actor.fromR + (actor.r - actor.fromR) * progress + .5) * TILE
      };
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    function drawWall(r, c) {
      const x = c * TILE, y = r * TILE;
      ctx.fillStyle = '#526d58'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#718b68'; roundRect(x + 3, y + 3, TILE - 6, TILE - 7, 5); ctx.fill();
      ctx.fillStyle = '#9caf78'; ctx.fillRect(x + 7, y + 7, TILE - 14, 3);
      ctx.fillStyle = '#415c4b'; ctx.fillRect(x + 6, y + 24, TILE - 12, 2);
    }
    function drawCrate(r, c) {
      const x = c * TILE, y = r * TILE;
      ctx.fillStyle = '#a56a3e'; roundRect(x + 3, y + 3, TILE - 6, TILE - 6, 4); ctx.fill();
      ctx.strokeStyle = '#70472d'; ctx.lineWidth = 2; ctx.strokeRect(x + 7, y + 7, TILE - 14, TILE - 14);
      ctx.beginPath(); ctx.moveTo(x + 7, y + 7); ctx.lineTo(x + 25, y + 25); ctx.moveTo(x + 25, y + 7); ctx.lineTo(x + 7, y + 25); ctx.stroke();
      ctx.fillStyle = '#d29b60'; ctx.fillRect(x + 2, y + 5, 3, 22);
    }
    function drawGate(r, c, open) {
      const x = c * TILE, y = r * TILE;
      ctx.fillStyle = open ? '#a9d87e' : '#a5a48c'; roundRect(x + 4, y + 3, TILE - 8, TILE - 6, 5); ctx.fill();
      ctx.strokeStyle = open ? '#3d7044' : '#697165'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 11, y + 27); ctx.lineTo(x + 11, y + 12); ctx.quadraticCurveTo(x + 16, y + 4, x + 21, y + 12); ctx.lineTo(x + 21, y + 27); ctx.stroke();
      if (!open) { ctx.fillStyle = '#555d50'; ctx.fillRect(x + 14, y + 16, 5, 6); }
    }
    function drawUpgrade(r, c, type) {
      const x = (c + .5) * TILE, y = (r + .5) * TILE;
      ctx.fillStyle = '#fff4c7'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = type === 'capacity' ? '#ba7241' : '#4f8194';
      if (type === 'capacity') {
        roundRect(x - 5, y - 6, 10, 12, 3); ctx.fill();
        ctx.fillStyle = '#fff4c7'; ctx.fillRect(x - 2, y - 11, 4, 4); ctx.fillRect(x - 2, y + 7, 4, 4);
      } else {
        ctx.lineWidth = 2; ctx.strokeStyle = '#4f8194';
        [4, 8].forEach(radius => { ctx.beginPath(); ctx.arc(x, y, radius, -.72, .72); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, radius, Math.PI - .72, Math.PI + .72); ctx.stroke(); });
      }
    }
    function drawBomb(bomb, t) {
      const x = (bomb.c + .5) * TILE, y = (bomb.r + .5) * TILE;
      const pulse = 1 + Math.sin((M.FUSE - bomb.fuse) * .18) * .05;
      ctx.fillStyle = '#243834'; ctx.beginPath(); ctx.arc(x, y + 2, 10 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d8c18e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 2, y - 9); ctx.quadraticCurveTo(x + 8, y - 16, x + 11, y - 12); ctx.stroke();
      ctx.fillStyle = t % 4 < 2 ? '#ffd54f' : '#f28a3b'; ctx.beginPath(); ctx.arc(x + 12, y - 12, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5e7c2'; ctx.fillRect(x - 8, y + 12, 16, 2);
      ctx.fillStyle = '#d7643c'; ctx.fillRect(x - 8, y + 12, 16 * clamp(bomb.fuse / M.FUSE, 0, 1), 2);
    }
    function drawActor(actor, kind, terminal, state) {
      const { x, y } = actorPoint(actor, terminal, state);
      if (kind === 'player') {
        ctx.fillStyle = 'rgba(35,54,39,.16)'; ctx.beginPath(); ctx.ellipse(x, y + 10, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8f0cf'; roundRect(x - 9, y - 9, 18, 19, 6); ctx.fill();
        ctx.fillStyle = '#49835b'; roundRect(x - 8, y + 2, 16, 8, 4); ctx.fill();
        ctx.fillStyle = '#213c35'; ctx.beginPath(); ctx.arc(x - 3, y - 2, 1.6, 0, Math.PI * 2); ctx.arc(x + 3, y - 2, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6ca86b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.quadraticCurveTo(x - 3, y - 16, x + 1, y - 16); ctx.stroke();
        ctx.fillStyle = '#91c869'; ctx.beginPath(); ctx.ellipse(x + 3, y - 16, 4, 2.5, -.55, 0, Math.PI * 2); ctx.fill();
      } else {
        const hunter = actor.kind === 'hunter';
        const color = hunter ? '#bc5b52' : '#5c7d9e';
        ctx.fillStyle = 'rgba(35,54,39,.16)'; ctx.beginPath(); ctx.ellipse(x, y + 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, 9, 8, 0, Math.PI, Math.PI * 2); ctx.lineTo(x + 9, y + 6); ctx.quadraticCurveTo(x, y + 12, x - 9, y + 6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hunter ? '#812f3c' : '#36566e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 4, y - 5); ctx.lineTo(x - 7, y - 11); ctx.moveTo(x + 4, y - 5); ctx.lineTo(x + 7, y - 11); ctx.stroke();
        ctx.fillStyle = '#fff5d8'; ctx.beginPath(); ctx.arc(x - 3, y, 1.6, 0, Math.PI * 2); ctx.arc(x + 3, y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    function draw() {
      if (!ctx) return;
      const v = model.view(), terminal = v.status !== 'playing';
      ctx.clearRect(0, 0, BOARD, BOARD);
      ctx.fillStyle = '#d5c9a9'; ctx.fillRect(0, 0, BOARD, BOARD);
      for (let r = 0; r < M.SIZE; r++) for (let c = 0; c < M.SIZE; c++) {
        const x = c * TILE, y = r * TILE, cell = v.grid[r][c];
        ctx.fillStyle = (r + c) % 2 ? '#dfd4b6' : '#e9dfc4'; ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(81,111,70,.25)';
        if ((r * 7 + c * 11) % 5 === 0) { ctx.beginPath(); ctx.arc(x + 8 + c % 11, y + 22, 1.4, 0, Math.PI * 2); ctx.fill(); }
        if (cell === 1) drawWall(r, c);
        else if (cell === 2) drawCrate(r, c);
        if (r === v.exit.r && c === v.exit.c) drawGate(r, c, v.remaining === 0);
      }
      for (const [rawKey, type] of Object.entries(v.items)) { const k = Number(rawKey); drawUpgrade(Math.floor(k / M.SIZE), k % M.SIZE, type); }
      for (const flame of v.flames) {
        const x = flame.c * TILE + 3, y = flame.r * TILE + 3;
        const alpha = .28 + .38 * flame.ttl / M.FLAME;
        ctx.fillStyle = `rgba(239,107,44,${alpha})`; roundRect(x, y, TILE - 6, TILE - 6, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,219,115,${Math.min(.9, alpha + .25)})`; roundRect(x + 8, y + 8, TILE - 22, TILE - 22, 6); ctx.fill();
      }
      for (const bomb of v.bombs) drawBomb(bomb, v.ticks);
      v.enemies.forEach(enemy => { if (enemy.alive) drawActor(enemy, 'enemy', terminal, v); });
      if (v.status !== 'lost') drawActor(v.player, 'player', terminal, v);
      if (paused && v.status === 'playing') {
        ctx.fillStyle = 'rgba(26,44,36,.22)'; ctx.fillRect(0, 0, BOARD, BOARD);
      }
    }
    function update() {
      const v = model.view(), status = v.status;
      const stamp = `${v.stage}/${v.remaining}/${v.score}/${status}/${paused}/${confirm}/${v.capacity}/${v.range}`;
      if (stamp !== lastHUD) {
        lastHUD = stamp;
        el('gbStage').textContent = `${v.stage + 1} / ${M.MAPS.length}`;
        el('gbPests').textContent = String(v.remaining);
        el('gbScore').textContent = v.score.toLocaleString('vi-VN');
        el('gbPests').setAttribute('aria-label', `${v.remaining} sâu bọ còn lại`);
        el('gbScore').setAttribute('aria-label', `${v.score} điểm; kỷ lục ${best}`);
        const terminal = status !== 'playing';
        const overlay = paused || terminal || confirm;
        el('gbOverlay').hidden = !overlay;
        el('gbConfirm').hidden = !confirm;
        el('gbContinue').hidden = confirm;
        el('gbPause').disabled = terminal || confirm;
        el('gbPause').textContent = paused && !terminal ? '▶' : 'Ⅱ';
        el('gbPause').setAttribute('aria-label', paused && !terminal ? 'Chơi tiếp' : 'Tạm dừng');
        el('gbOverlayTitle').textContent = confirm ? 'Ván mới?' : status === 'cleared' ? 'Mở cổng!' : status === 'won' ? 'Khu vườn yên bình!' : status === 'lost' ? 'Thử lại màn này?' : 'Tạm dừng';
        el('gbOverlayText').hidden = status !== 'cleared' && status !== 'won' && status !== 'lost';
        el('gbOverlayText').textContent = status === 'cleared' ? `Màn ${v.stage + 1} đã sạch.` : status === 'won' ? `${v.score.toLocaleString('vi-VN')} điểm` : status === 'lost' ? 'Tiến độ màn này sẽ không được tính.' : '';
        el('gbContinue').textContent = status === 'cleared' ? 'Màn tiếp' : status === 'lost' ? 'Thử lại' : status === 'won' ? 'Ván mới' : '▶';
        el('gbContinue').setAttribute('aria-label', status === 'cleared' ? 'Sang màn tiếp theo' : status === 'lost' ? 'Thử lại màn này' : status === 'won' ? 'Bắt đầu khu vườn mới' : 'Chơi tiếp');
        for (const button of container.querySelectorAll('.gb-dir')) button.disabled = paused || confirm || terminal;
        el('gbPlace').disabled = paused || confirm || terminal || v.bombs.length >= v.capacity;
        canvas.tabIndex = paused || confirm || terminal ? -1 : 0;
        canvas.setAttribute('aria-label', `Bom Vườn, màn ${v.stage + 1} trên ${M.MAPS.length}. Còn ${v.remaining} sâu bọ. ${v.status === 'playing' && v.remaining === 0 ? 'Cổng đã mở.' : 'Dọn sâu bọ để mở cổng.'}`);
      }
      draw();
    }
    function loop(timestamp) {
      frame = null;
      if (!alive || paused || confirm || model.view().status !== 'playing') return;
      const elapsed = lastFrame === null ? 0 : timestamp - lastFrame;
      lastFrame = timestamp;
      if (elapsed > 250) { pause('Đã tạm dừng sau khi rời màn chơi.'); return; }
      const dt = Math.max(0, elapsed);
      accumulator += dt; saveAccumulator += dt;
      while (accumulator + 1e-7 >= M.STEP && model.view().status === 'playing') {
        accumulator -= M.STEP;
        const events = model.advance(M.STEP);
        if (events.length) drain(events);
      }
      update();
      if (!paused && !confirm && model.view().status === 'playing') frame = requestAnimationFrame(loop);
      if (saveAccumulator >= 750) save();
    }

    listen(el('gbNew'), 'click', requestNew);
    listen(el('gbPause'), 'click', () => paused ? resume() : pause());
    listen(el('gbContinue'), 'click', () => {
      const status = model.view().status;
      if (confirm) return;
      if (status === 'cleared') nextStage();
      else if (status === 'lost') retryStage();
      else if (status === 'won') startNew();
      else resume();
    });
    listen(el('gbConfirmYes'), 'click', startNew);
    listen(el('gbConfirmNo'), 'click', () => {
      confirm = false; paused = pausedBeforeConfirm; el('gbConfirm').hidden = true; update(); save();
      if (paused) el('gbContinue').focus();
      else { canvas.focus({ preventScroll: true }); frame = requestAnimationFrame(loop); }
    });
    listen(el('gbPlace'), 'click', actPlace);
    for (const button of container.querySelectorAll('.gb-dir')) {
      listen(button, 'pointerdown', event => {
        if (button.disabled || event.button > 0) return;
        event.preventDefault(); const id = event.pointerId;
        const owner = `pointer:${id}`, dir = button.dataset.dir;
        pointers.set(id, { owner, buttonId: button.id, button });
        suppressedClicks.add(button.id);
        setHeld(owner, dir);
        try { button.setPointerCapture?.(id); } catch (_) { /* Pointer capture is optional. */ }
      });
      listen(button, 'click', event => {
        if (suppressedClicks.has(button.id) && (event.detail > 0 || event.pointerType)) { suppressedClicks.delete(button.id); return; }
        if (!event.detail && !event.pointerType && !button.disabled) {
          const owner = `tap:${button.id}:${++tapSerial}`;
          unlockAudio(); setHeld(owner, button.dataset.dir);
          setTimeout(() => releaseHeld(owner), M.MOVE * M.STEP + 1);
        }
      });
      listen(button, 'lostpointercapture', releasePointer);
    }
    listen(window, 'pointerup', releasePointer);
    listen(window, 'pointercancel', releasePointer);
    listen(container, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target.closest?.('input,textarea,select,[contenteditable]')) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === 'p') { event.preventDefault(); if (paused) resume(); else pause(); return; }
      if (key === ' ' || key === 'Enter') {
        if (event.target.tagName === 'BUTTON' || paused || confirm) return;
        event.preventDefault(); actPlace(); return;
      }
      const dir = DIRS[key];
      if (!dir || paused || confirm) return;
      event.preventDefault(); unlockAudio(); setHeld(`key:${event.code || key}`, dir);
    });
    listen(window, 'keyup', event => releaseHeld(`key:${event.code || String(event.key).toLowerCase()}`));
    listen(window, 'blur', () => pause('Đã tạm dừng khi mất tiêu điểm.'));
    listen(document, 'visibilitychange', () => { if (document.hidden) pause('Đã tạm dừng khi rời màn chơi.'); });
    listen(window, 'pagehide', () => pause('Đã lưu ván đang chơi.'));
    onCleanup(() => {
      cancelAnimationFrame(frame); frame = null;
      clearInput(); save(); container.classList.remove('gb-host');
      alive = false;
    });

    if (paused) { model.steer(null); announce('Ván đã lưu. Bấm Chơi tiếp để tiếp tục.'); }
    if (notice) setNotice(notice);
    update(); save();
    if (!paused && model.view().status === 'playing') frame = requestAnimationFrame(loop);
    setTimeout(() => { if (alive) el(paused ? 'gbContinue' : 'gbCanvas').focus({ preventScroll: true }); }, 0);
    return { getModel: () => model, isPaused: () => paused };
  }

  window.NP_GardenBombs = Object.freeze({ mount });
  if (window.NP_Engines && typeof window.NP_Engines.launchDatBom === 'function') {
    window.NP_Engines.launchDatBom = function (container) {
      return mount(container, window.NP_GameSession.start(), window.NP_AudioEngine);
    };
  }
})();
