/* Original procedural target gallery; mount with the host's game session. */
(function () {
  'use strict';
  const NAME = 'Mục Tiêu Bay';

  function mount(container, session, options = {}) {
    const M = window.NP_BanVitBayModel;
    if (!M || !session) throw new Error('Mục Tiêu Bay is not ready');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    const seedFactory = typeof options.seedFactory === 'function'
      ? options.seedFactory
      : () => {
          const values = new Uint32Array(1);
          try {
            window.crypto?.getRandomValues?.(values);
            if (values[0]) return values[0];
          } catch (_) { /* Fall back when secure randomness is unavailable. */ }
          return ((Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0) || 1;
        };
    let lastSeed = null;
    function newModel() {
      let seed = seedFactory();
      seed = Number.isFinite(seed) ? (Math.trunc(seed) >>> 0) : (Date.now() >>> 0);
      if (!seed) seed = 1;
      if (seed === lastSeed) seed = ((seed + 1) >>> 0) || 1;
      lastSeed = seed;
      return M.create({ seed });
    }
    container.classList.add('bvb-host');
    container.innerHTML = `
      <section class="bvb-game" aria-label="${NAME}">
        <header class="bvb-head"><h2>${NAME}</h2><button class="bvb-button bvb-pause" id="bvbPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button></header>
        <div class="bvb-hud" aria-label="Kết quả lượt bắn">
          <div><span>Trúng</span><strong id="bvbHits">0</strong></div>
          <div><span>Trượt</span><strong id="bvbMisses">0</strong></div>
          <div><span>Đạn</span><strong id="bvbShots">3</strong></div>
          <div><span>Còn</span><strong id="bvbRemaining">5</strong></div>
        </div>
        <div class="bvb-timebar" role="progressbar" aria-label="Thời gian ngắm" aria-valuemin="0" aria-valuemax="3200" aria-valuenow="3200" id="bvbTimebar"><span id="bvbTimeFill"></span></div>
        <div class="bvb-stage"><canvas id="bvbCanvas" width="800" height="450" tabindex="0" role="img" aria-label="Đồng cỏ và một mục tiêu vịt bay. Chạm để bắn; dùng mũi tên hoặc WASD để ngắm, Space để bắn."></canvas></div>
        <div class="bvb-controls" role="group" aria-label="Điều khiển">
          <div class="bvb-pad" aria-label="Ngắm">
            <button class="bvb-button bvb-up" id="bvbUp" type="button" aria-label="Ngắm lên">▲</button>
            <button class="bvb-button" id="bvbLeft" type="button" aria-label="Ngắm trái">◀</button>
            <button class="bvb-button" id="bvbDown" type="button" aria-label="Ngắm xuống">▼</button>
            <button class="bvb-button" id="bvbRight" type="button" aria-label="Ngắm phải">▶</button>
          </div>
          <button class="bvb-button bvb-fire" id="bvbFire" type="button">Bắn</button>
          <span class="bvb-hint">Chạm mục tiêu · Phím mũi tên / WASD · Space</span>
        </div>
        <p class="bvb-live" id="bvbLive" role="status" aria-live="polite" aria-atomic="true">Ngắm rồi chạm hoặc nhấn Space.</p>
        <div class="bvb-overlay" id="bvbOverlay" hidden>
          <div class="bvb-card"><strong id="bvbOverlayTitle"></strong><p id="bvbOverlayText"></p><button class="bvb-button bvb-primary" id="bvbOverlayAction" type="button">Tiếp tục</button></div>
        </div>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('bvbCanvas'), ctx = canvas.getContext('2d');
    canvas.width = M.WIDTH; canvas.height = M.HEIGHT;
    let model = newModel(), alive = true, paused = false, frame = null, lastFrame = null, accumulator = 0, lastHud = '';

    function announce(text) { el('bvbLive').textContent = text; }
    function schedule() {
      if (!alive || paused || model.view().status !== 'playing' || frame !== null) return;
      frame = requestAnimationFrame(loop);
    }
    function pause(message = 'Đã tạm dừng.', moveFocus = true) {
      if (!alive || model.view().status !== 'playing' || paused) return;
      paused = true; accumulator = 0; lastFrame = null; cancelAnimationFrame(frame); frame = null;
      model.act('pause'); update(); announce(message);
      if (moveFocus) el('bvbOverlayAction').focus({ preventScroll: true });
    }
    function resume() {
      if (!alive || model.view().status !== 'paused' || document.hidden) return;
      paused = false; accumulator = 0; lastFrame = null; model.act('resume'); update(); announce('Tiếp tục.');
      el('bvbCanvas').focus({ preventScroll: true }); schedule();
    }
    function restart() {
      if (!alive) return;
      cancelAnimationFrame(frame); frame = null; model = newModel(); paused = false; accumulator = 0; lastFrame = null; lastHud = '';
      update(); announce('Ván mới.'); el('bvbCanvas').focus({ preventScroll: true }); schedule();
    }
    function act(action, value) {
      if (!alive || paused || model.view().status !== 'playing') return false;
      const ok = model.act(action, value);
      if (ok && action === 'fire') {
        const v = model.view();
        announce(v.phase === 'hit' ? 'Trúng!' : v.phase === 'miss' ? 'Trượt.' : `Còn ${v.shotsLeft} viên.`);
      }
      update();
      if (model.view().status === 'over') { cancelAnimationFrame(frame); frame = null; }
      return ok;
    }
    function pointFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / (rect.width || M.WIDTH) * M.WIDTH,
        y: (e.clientY - rect.top) / (rect.height || M.HEIGHT) * M.HEIGHT
      };
    }

    function bird(x, y, wing, fallen = false, flip = false) {
      ctx.save(); ctx.translate(x, y); if (fallen) ctx.rotate(Math.PI / 2.3); if (flip) ctx.scale(-1, 1);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // A small, invented marsh bird with a copper breast, teal crown, and striped wing.
      ctx.fillStyle = '#bd6d44'; ctx.strokeStyle = '#173c43'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 25, 17, -.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#246f71'; ctx.beginPath(); ctx.ellipse(12, -13, 12, 10, -.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d6a447'; ctx.beginPath(); ctx.moveTo(21, -11); ctx.lineTo(37, -7); ctx.lineTo(23, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4ebcc'; ctx.beginPath(); ctx.arc(16, -15, 2.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#29383d'; ctx.beginPath(); ctx.arc(17, -15, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e6b777'; ctx.strokeStyle = '#173c43'; ctx.lineWidth = 2.5;
      ctx.save(); ctx.rotate(wing); ctx.beginPath(); ctx.ellipse(-2, -3, 17, 8, -.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#805139'; ctx.lineWidth = 2;
      for (let i = -8; i <= 6; i += 7) { ctx.beginPath(); ctx.moveTo(i, -7); ctx.lineTo(i + 4, 1); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#e0a64e'; ctx.beginPath(); ctx.moveTo(-19, 0); ctx.lineTo(-31, -8); ctx.lineTo(-27, 2); ctx.lineTo(-34, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#173c43'; ctx.lineWidth = 2.5;
      for (const offset of [-5, 7]) { ctx.beginPath(); ctx.moveTo(offset, 14); ctx.lineTo(offset - 3, 24); ctx.stroke(); }
      ctx.restore();
    }

    function draw() {
      const v = model.view(), w = canvas.width, h = canvas.height;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#8dc6d7'); sky.addColorStop(.68, '#d8dcae'); sky.addColorStop(1, '#d7bd87');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      // Soft, layered countryside forms are generated from vector paths at runtime.
      ctx.fillStyle = '#8ba99b'; ctx.beginPath(); ctx.moveTo(0, 250); ctx.quadraticCurveTo(150, 178, 310, 251); ctx.quadraticCurveTo(470, 190, 630, 246); ctx.quadraticCurveTo(715, 210, 800, 236); ctx.lineTo(800, 370); ctx.lineTo(0, 370); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6b927c'; ctx.beginPath(); ctx.moveTo(0, 295); ctx.quadraticCurveTo(180, 245, 340, 298); ctx.quadraticCurveTo(545, 240, 800, 286); ctx.lineTo(800, 410); ctx.lineTo(0, 410); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e5c774'; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(684, 92, 34, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#567a64'; ctx.fillRect(0, 365, w, 85);
      for (let i = 0; i < 30; i++) {
        const x = (i * 83 + 19) % w, y = 370 + (i * 37) % 76, lean = ((i % 5) - 2) * 5;
        ctx.strokeStyle = i % 3 ? '#a5b57a' : '#d4c271'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.quadraticCurveTo(x + lean, y + 6, x + lean + 2, y - 5); ctx.stroke();
        if (i % 4 === 0) { ctx.fillStyle = '#dfd08b'; ctx.beginPath(); ctx.arc(x + lean + 2, y - 6, 3, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = '#344e4c'; ctx.font = '700 16px Calibri, Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`CHẶNG ${Math.min(v.index + 1, M.FLIGHTS)} / ${M.FLIGHTS} · ${v.target?.courseName || 'KẾT THÚC'}`, 18, 28);
      if (v.target) {
        const t = v.target, elapsed = v.elapsed;
        const flip = t.vx < 0;
        if (t.outcome === 'hit') bird(t.x, t.y + Math.min(45, v.resultMs / 7), Math.sin(elapsed / 55) * .5, true, flip);
        else if (t.outcome === 'flying') bird(t.x, t.y, Math.sin(elapsed / 65) * .55, false, flip);
        if (t.warned && !t.turned && t.outcome === 'flying') {
          ctx.strokeStyle = '#a64934'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.arc(t.x, t.y, 34, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      const a = v.aim;
      ctx.strokeStyle = '#f8f2dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#244449'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(a.x, a.y, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.x - 23, a.y); ctx.lineTo(a.x - 8, a.y); ctx.moveTo(a.x + 8, a.y); ctx.lineTo(a.x + 23, a.y); ctx.moveTo(a.x, a.y - 23); ctx.lineTo(a.x, a.y - 8); ctx.moveTo(a.x, a.y + 8); ctx.lineTo(a.x, a.y + 23); ctx.stroke();
    }
    function update() {
      if (!alive) return;
      const v = model.view(), terminal = v.status === 'over';
      const stamp = [v.index, v.hits, v.misses, v.shotsLeft, v.status, paused, v.phase].join('|');
      if (stamp !== lastHud) {
        lastHud = stamp;
        el('bvbHits').textContent = String(v.hits); el('bvbMisses').textContent = String(v.misses);
        el('bvbShots').textContent = String(v.shotsLeft); el('bvbRemaining').textContent = String(v.remaining);
        el('bvbPause').disabled = terminal; el('bvbPause').textContent = paused ? '▶' : 'Ⅱ';
        el('bvbPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
        el('bvbFire').disabled = paused || terminal || v.phase !== 'flying';
        for (const id of ['bvbUp', 'bvbDown', 'bvbLeft', 'bvbRight']) el(id).disabled = paused || terminal;
        const overlay = paused || terminal;
        el('bvbOverlay').hidden = !overlay;
        el('bvbOverlayTitle').textContent = terminal ? 'Hết lượt' : 'Tạm dừng';
        el('bvbOverlayText').textContent = terminal ? `Trúng ${v.hits} / ${M.FLIGHTS} · ${v.score} điểm` : 'Sẵn sàng tiếp tục?';
        el('bvbOverlayAction').textContent = terminal ? 'Chơi lại' : 'Tiếp tục';
        const course = v.target?.courseName || 'Kết thúc';
        canvas.setAttribute('aria-label', `Chặng ${Math.min(v.index + 1, M.FLIGHTS)} trong ${M.FLIGHTS}: ${course}. Chạm để bắn; dùng mũi tên hoặc WASD để ngắm, Space để bắn.`);
      }
      const timeLeft = v.status === 'over' || v.phase !== 'flying' ? 0 : Math.max(0, M.FLIGHT_MS - v.elapsed);
      el('bvbTimeFill').style.width = `${Math.round(timeLeft / M.FLIGHT_MS * 100)}%`;
      el('bvbTimebar').setAttribute('aria-valuenow', String(timeLeft));
      draw();
    }
    function loop(ts) {
      frame = null;
      if (!alive || paused || model.view().status !== 'playing') return;
      const dt = lastFrame === null ? 0 : ts - lastFrame; lastFrame = ts;
      if (dt > 320) { pause('Đã tạm dừng sau khi rời màn hình.', false); return; }
      accumulator += Math.max(0, dt);
      while (accumulator + 1e-7 >= M.STEP && model.view().status === 'playing') {
        accumulator -= M.STEP;
        for (const event of model.advance(M.STEP)) {
          if (event.kind === 'escape') announce('Vịt bay mất.');
          if (event.kind === 'finish') announce(`Kết thúc. Trúng ${event.hits} / ${M.FLIGHTS}.`);
          if (event.kind === 'flight') announce(`Chặng ${event.number}: ${M.COURSES[event.number - 1].name}.`);
          if (event.kind === 'turn-warning') announce('Gió sắp đổi chiều.');
          if (event.kind === 'turn') announce('Mục tiêu đổi chiều.');
        }
      }
      update(); schedule();
    }
    function move(dx, dy) { const a = model.view().aim; act('aim', { x: a.x + dx, y: a.y + dy }); }

    listen(canvas, 'pointermove', e => { if (!paused) act('aim', pointFromEvent(e)); });
    listen(canvas, 'pointerdown', e => { e.preventDefault?.(); act('fire', pointFromEvent(e)); });
    listen(el('bvbFire'), 'click', () => act('fire'));
    listen(el('bvbLeft'), 'click', () => move(-28, 0)); listen(el('bvbRight'), 'click', () => move(28, 0));
    listen(el('bvbUp'), 'click', () => move(0, -28)); listen(el('bvbDown'), 'click', () => move(0, 28));
    listen(el('bvbPause'), 'click', () => paused ? resume() : pause());
    listen(el('bvbOverlayAction'), 'click', () => model.view().status === 'over' ? restart() : resume());
    listen(container, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('button,input,textarea,select,[contenteditable]')) return;
      const key = String(e.key || '').toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'enter', 'escape', 'p', 'a', 'd', 'w', 's'].includes(key)) e.preventDefault?.();
      if (paused && (key === 'escape' || key === 'p')) { resume(); return; }
      if (key === 'escape' || key === 'p') { pause(); return; }
      if (key === 'arrowleft' || key === 'a') move(-24, 0);
      else if (key === 'arrowright' || key === 'd') move(24, 0);
      else if (key === 'arrowup' || key === 'w') move(0, -24);
      else if (key === 'arrowdown' || key === 's') move(0, 24);
      else if (key === ' ' || key === 'enter') act('fire');
    });
    listen(window, 'blur', () => pause('Đã tạm dừng khi mất tiêu điểm.', false));
    listen(document, 'visibilitychange', () => { if (document.hidden) pause('Đã tạm dừng khi chuyển tab.', false); });
    listen(window, 'pagehide', () => pause('Đã tạm dừng.', false));
    onCleanup(() => { alive = false; cancelAnimationFrame(frame); frame = null; container.classList.remove('bvb-host'); });

    update(); canvas.focus({ preventScroll: true }); schedule();
    return { getModel: () => model, isPaused: () => paused };
  }

  window.NP_BanVitBay = Object.freeze({ mount });
})();
