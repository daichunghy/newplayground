/* Original, local water-bubble arena. The Canvas shapes and board are project-authored. */
(function () {
  'use strict';
  const TILE = 42, BOARD_W = 13 * TILE, BOARD_H = 11 * TILE;
  const DIR_KEYS = Object.freeze({
    ArrowUp: 'up', w: 'up', W: 'up', ArrowRight: 'right', d: 'right', D: 'right',
    ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left'
  });
  const COLORS = Object.freeze({ pilot: '#5de2d1', rivet: '#ed9a62', mica: '#bf9fff', volt: '#c5e76d' });

  function mount(container, session) {
    const M = window.NP_TidegridArenaModel;
    if (!M || !session) throw new Error('Luật Đấu Trường Bọt Nước chưa sẵn sàng.');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let model = M.create(), active = true, paused = false, confirm = false, pausedBeforeConfirm = false;
    let frame = null, lastFrame = null, accumulator = 0, shown = '', statusText = 'Đặt bom nước · né tia bọt · cứu mình bằng E.';
    const held = new Map(), pointers = new Map(), suppressedClicks = new Set();
    const priorStyle = document.getElementById?.('tidegrid-arena-style');
    let style = null;
    if (!priorStyle && document.head?.appendChild) {
      style = document.createElement('link'); style.id = 'tidegrid-arena-style';
      style.rel = 'stylesheet'; style.href = 'scripts/games/tidegrid-arena.css'; document.head.appendChild(style);
    }

    container.classList.add('tg-host');
    container.innerHTML = `
      <section class="tg-game" aria-label="Đấu Trường Bọt Nước">
        <header class="tg-head">
          <div class="tg-brand"><span class="tg-kicker">SÂN NƯỚC</span><h3>Đấu Trường Bọt Nước</h3>
            <p>Né tia bọt. Cứu mình bằng E.</p></div>
          <div class="tg-toolbar">
            <button class="tg-icon" id="tgPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
            <button class="tg-icon" id="tgNew" type="button" aria-label="Ván mới" title="Ván mới">↻</button>
          </div>
        </header>
        <div class="tg-hud" aria-label="Tình trạng ván">
          <div><span>Đối thủ còn</span><strong id="tgRivals">3</strong></div>
          <div><span>Kim cứu</span><strong id="tgPins">Sẵn sàng</strong></div>
          <div class="tg-tip"><span>Phím</span><strong>Mũi tên/WASD · Space · E</strong></div>
        </div>
        <p class="tg-callout" id="tgCallout" hidden></p>
        <div class="tg-board-wrap">
          <canvas id="tgCanvas" width="${BOARD_W}" height="${BOARD_H}" tabindex="0" role="img"
            aria-label="Bàn chơi. Di chuyển bằng phím mũi tên hoặc WASD; Space thả bom nước; E dùng kim cứu."
            aria-describedby="tgInstructions">Bàn chơi Đấu Trường Bọt Nước.</canvas>
          <div class="tg-overlay" id="tgOverlay" hidden>
            <div class="tg-card">
              <span class="tg-kicker" id="tgOverlayKicker">TẠM DỪNG</span>
              <strong id="tgOverlayTitle">Nghỉ một nhịp</strong>
              <p id="tgOverlayText">Ván chơi đang chờ.</p>
              <div class="tg-overlay-actions">
                <button class="tg-button tg-primary" id="tgContinue" type="button">Tiếp tục</button>
                <button class="tg-button" id="tgConfirmYes" type="button" hidden>Ván mới</button>
                <button class="tg-button" id="tgConfirmNo" type="button" hidden>Ở lại</button>
              </div>
            </div>
          </div>
        </div>
        <div class="tg-controls" role="group" aria-label="Điều khiển Đấu Trường Bọt Nước">
          <div class="tg-pad">
            <button class="tg-button tg-dir tg-up" id="tgUp" data-dir="up" type="button" aria-label="Đi lên">↑</button>
            <button class="tg-button tg-dir tg-left" id="tgLeft" data-dir="left" type="button" aria-label="Đi sang trái">←</button>
            <button class="tg-button tg-dir tg-down" id="tgDown" data-dir="down" type="button" aria-label="Đi xuống">↓</button>
            <button class="tg-button tg-dir tg-right" id="tgRight" data-dir="right" type="button" aria-label="Đi sang phải">→</button>
          </div>
          <div class="tg-actions">
            <button class="tg-button tg-bomb" id="tgBomb" type="button" aria-label="Thả bom nước">◉ <span>Thả<br>bom</span></button>
            <button class="tg-button tg-rescue" id="tgRescue" type="button" aria-label="Dùng kim cứu một lần">⌁ <span>Kim cứu<br>· E</span></button>
          </div>
        </div>
        <p class="tg-sr" id="tgInstructions">Dùng phím mũi tên hoặc WASD để di chuyển. Space thả bom nước có hẹn giờ; E dùng chiếc kim cứu duy nhất khi mắc bọt. Bom khác có thể làm nổ dây chuyền. Ai trụ cuối cùng sẽ thắng.</p>
        <p class="tg-sr" id="tgStatus" role="status" aria-live="polite" aria-atomic="true">${statusText}</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('tgCanvas'), ctx = canvas?.getContext('2d');
    if (!ctx) {
      el('tgOverlay').hidden = false; el('tgOverlayTitle').textContent = 'Board unavailable';
      el('tgContinue').hidden = true;
      onCleanup(() => { container.classList.remove('tg-host'); style?.remove?.(); });
      return null;
    }
    const dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
    canvas.width = Math.round(BOARD_W * dpr); canvas.height = Math.round(BOARD_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const setStatus = text => {
      if (text && text !== statusText) {
        statusText = text; el('tgStatus').textContent = text;
        const callout = el('tgCallout'); callout.hidden = false; callout.textContent = text;
      }
    };
    const actorName = id => M.NAMES[id] || id;
    function focusBoard() { try { canvas.focus({ preventScroll: true }); } catch (_) { canvas.focus(); } }
    function clearInput() {
      for (const [id, entry] of pointers) {
        suppressedClicks.add(entry.button.id);
        try { entry.button.releasePointerCapture?.(id); } catch (_) {}
      }
      pointers.clear(); held.clear(); model.steer(null);
    }
    function setHeld(owner, dir) {
      if (!active || paused || confirm || model.view().status !== 'playing') return;
      held.delete(owner); held.set(owner, dir);
      model.steer(dir); focusBoard(); draw(); update(); ensureFrame();
    }
    function releaseHeld(owner) {
      if (!held.has(owner)) return;
      const wasLast = [...held.keys()].at(-1) === owner;
      held.delete(owner);
      if (wasLast) {
        const next = [...held.values()].at(-1) || null;
        model.steer(next); draw(); update();
      }
    }
    function announceEvents(events) {
      for (const event of events || []) {
        if (event.kind === 'pilot-trapped') setStatus('Bạn mắc trong bọt · nhấn E để cứu mình.');
        else if (event.kind === 'pilot-out' || event.kind === 'lost') setStatus('Bọt đã vỡ · thử ván mới nhé.');
        else if (event.kind === 'rival-trapped') setStatus(`${actorName(event.id)} mắc trong bọt.`);
        else if (event.kind === 'rival-rescued') setStatus(`${actorName(event.id)} tự cứu mình.`);
        else if (event.kind === 'rival-out') setStatus(`${actorName(event.id)} bị loại · còn ${model.view().remaining} đối thủ.`);
        else if (event.kind === 'won') setStatus('Bạn là người trụ cuối!');
        else if (event.kind === 'draw') setStatus('Không còn ai trụ lại.');
      }
    }
    function actPlace() {
      if (paused || confirm || model.view().status !== 'playing') return;
      if (model.place()) setStatus('Đã đặt bom · chạy khỏi tia bọt!');
      draw(); update(); ensureFrame();
    }
    function actRescue() {
      if (paused || confirm || model.view().status !== 'playing') return;
      if (model.rescue()) setStatus('Đã dùng kim cứu.');
      draw(); update(); ensureFrame();
    }
    function showOverlay(kicker, title, message, mode) {
      const overlay = el('tgOverlay'); overlay.hidden = false;
      el('tgOverlayKicker').textContent = kicker;
      el('tgOverlayTitle').textContent = title;
      el('tgOverlayText').textContent = message;
      el('tgContinue').hidden = mode === 'confirm' || mode === 'terminal';
      el('tgConfirmYes').hidden = mode !== 'confirm';
      el('tgConfirmNo').hidden = mode !== 'confirm';
      if (mode === 'terminal') { el('tgContinue').hidden = false; el('tgContinue').textContent = 'Chơi lại'; }
      if (mode === 'pause') { el('tgContinue').hidden = false; el('tgContinue').textContent = 'Tiếp tục'; }
    }
    function pause() {
      if (paused || confirm || model.view().status !== 'playing') return;
      paused = true; accumulator = 0; lastFrame = null; cancelAnimationFrame(frame); frame = null; clearInput();
      showOverlay('TẠM DỪNG', 'Nghỉ một nhịp', 'Ván chơi đang chờ.', 'pause');
      el('tgContinue').focus();
    }
    function resume() {
      if (!active || confirm || document.hidden || model.view().status !== 'playing') return;
      paused = false; accumulator = 0; lastFrame = null; el('tgOverlay').hidden = true;
      focusBoard(); ensureFrame(); setStatus('Tiếp tục đi!');
    }
    function startNew() {
      cancelAnimationFrame(frame); frame = null; clearInput();
      model = M.create(); paused = false; confirm = false; accumulator = 0; lastFrame = null;
      el('tgOverlay').hidden = true; setStatus('Ván mới · né bọt, đặt bom!');
      draw(); update(); focusBoard(); ensureFrame();
    }
    function update() {
      const v = model.view();
      el('tgRivals').textContent = String(v.remaining);
      el('tgPins').textContent = v.pilot.pins ? (v.rescueAvailable ? 'Dùng E' : 'Sẵn sàng') : 'Đã dùng';
      el('tgRescue').disabled = !v.rescueAvailable || paused || confirm;
      el('tgBomb').disabled = !v.bombAvailable || paused || confirm;
      if (v.status !== 'playing') {
        cancelAnimationFrame(frame); frame = null; accumulator = 0;
        if (v.status === 'won') showOverlay('CHIẾN THẮNG', 'Bạn trụ cuối.', 'Chơi lại nhé?', 'terminal');
        else if (v.status === 'draw') showOverlay('HÒA', 'Không còn ai trụ.', 'Chơi ván mới?', 'terminal');
        else showOverlay('BẠN THUA', 'Bọt đã vỡ.', 'Thử lại nhé?', 'terminal');
      }
    }
    function drawCell(x, y, value, r, c) {
      const px = c * TILE, py = r * TILE;
      ctx.fillStyle = (r + c) % 2 ? '#102d3a' : '#133342';
      ctx.fillRect(px, py, TILE, TILE);
      if (value === M.WALL) {
        ctx.fillStyle = '#183846'; ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#2c5562'; ctx.fillRect(px + 3, py + 3, TILE - 6, 5);
        ctx.fillStyle = '#0a222e'; ctx.fillRect(px + 3, py + TILE - 7, TILE - 6, 4);
        ctx.fillStyle = '#81a8aa'; ctx.fillRect(px + 7, py + 9, TILE - 14, 2);
      } else if (value === M.CRATE) {
        ctx.fillStyle = '#a96044'; ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = '#e3a16f'; ctx.fillRect(px + 6, py + 6, TILE - 12, 5);
        ctx.fillStyle = '#814638'; ctx.fillRect(px + 7, py + 15, TILE - 14, 4);
        ctx.fillStyle = '#d38a5e'; ctx.fillRect(px + 8, py + 25, TILE - 16, 5);
        ctx.fillStyle = '#5d3b3b'; ctx.fillRect(px + 9, py + 20, 3, 3); ctx.fillRect(px + TILE - 12, py + 20, 3, 3);
      } else {
        ctx.fillStyle = '#72b9b0'; ctx.globalAlpha = 0.07; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#6ec5be'; ctx.globalAlpha = 0.12; ctx.strokeRect(px + .5, py + .5, TILE - 1, TILE - 1); ctx.globalAlpha = 1;
      }
    }
    function drawCharge(b, tick) {
      const x = b.c * TILE + TILE / 2, y = b.r * TILE + TILE / 2;
      ctx.fillStyle = 'rgba(22, 235, 226, .13)'; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#65d8d6'; ctx.beginPath(); ctx.arc(x, y + 2, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8ffec'; ctx.beginPath(); ctx.arc(x - 4, y - 3, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e4b86f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 3, y - 9); ctx.quadraticCurveTo(x + 6, y - 14, x + 10, y - 12); ctx.stroke();
      if ((tick % 12) < 6) { ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.arc(x + 10, y - 13, 2.4, 0, Math.PI * 2); ctx.fill(); }
    }
    function drawWave(f) {
      const x = f.c * TILE, y = f.r * TILE, alpha = Math.min(1, f.ttl / M.WAVE_TICKS);
      ctx.fillStyle = `rgba(92, 245, 223, ${0.24 + alpha * 0.28})`; ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = `rgba(196, 255, 239, ${0.52 + alpha * 0.4})`; ctx.lineWidth = 2; ctx.strokeRect(x + 7, y + 7, TILE - 14, TILE - 14);
      ctx.fillStyle = `rgba(212, 255, 242, ${0.45 + alpha * 0.5})`; ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, Math.PI * 2); ctx.fill();
    }
    function drawPilot(a, tick) {
      const x = a.c * TILE + TILE / 2, y = a.r * TILE + TILE / 2;
      const color = COLORS[a.id] || '#fff';
      if (a.trappedTicks > 0) {
        const pulse = 1 + Math.sin(tick * .14) * .04;
        ctx.fillStyle = 'rgba(105, 222, 232, .18)'; ctx.beginPath(); ctx.ellipse(x, y, 17 * pulse, 19 * pulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(167, 255, 249, .92)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 17 * pulse, 19 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#f4d88f'; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.arc(x, y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a.trappedTicks / M.TRAP_TICKS); ctx.stroke();
        ctx.fillStyle = '#c6fff7'; ctx.beginPath(); ctx.arc(x - 12, y - 11, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-11, -10, 22, 21, 7); ctx.fill();
      ctx.fillStyle = '#163744'; ctx.beginPath(); ctx.roundRect(-7, -5, 14, 8, 3); ctx.fill();
      ctx.fillStyle = '#c4fff0'; ctx.fillRect(-4, -2, 3, 2); ctx.fillRect(2, -2, 3, 2);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(1, -15); ctx.stroke();
      ctx.fillStyle = '#fbdb85'; ctx.beginPath(); ctx.arc(1, -16, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a1e2b'; ctx.font = '700 9px Calibri, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(a.id === 'pilot' ? 'BẠN' : a.name.toUpperCase(), 0, 19);
      ctx.restore();
    }
    function draw() {
      if (!ctx) return;
      const v = model.view();
      ctx.clearRect(0, 0, BOARD_W, BOARD_H);
      for (let r = 0; r < M.HEIGHT; r++) for (let c = 0; c < M.WIDTH; c++) drawCell(c, r, v.grid[r][c], r, c);
      v.waves.forEach(drawWave);
      v.bombs.forEach(b => drawCharge(b, v.tick));
      v.actors.filter(a => a.alive).forEach(a => drawPilot(a, v.tick));
      if (paused || confirm || v.status !== 'playing') {
        ctx.fillStyle = 'rgba(5, 20, 29, .5)'; ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      }
    }
    function ensureFrame() {
      if (!active || paused || confirm || model.view().status !== 'playing' || frame !== null) return;
      frame = requestAnimationFrame(loop);
    }
    function loop(timestamp) {
      frame = null;
      if (!active || paused || confirm || model.view().status !== 'playing') return;
      if (lastFrame === null) lastFrame = timestamp;
      const elapsed = timestamp - lastFrame; lastFrame = timestamp;
      if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 300) { pause(); setStatus('Tạm dừng do khựng hình.'); return; }
      accumulator += elapsed;
      while (accumulator >= M.STEP_MS) {
        const events = model.advance(M.STEP_MS); accumulator -= M.STEP_MS; announceEvents(events);
        if (model.view().status !== 'playing') break;
      }
      draw(); update();
      if (model.view().status === 'playing') ensureFrame();
    }
    function askNewMatch() {
      if (model.view().status !== 'playing') { startNew(); return; }
      pausedBeforeConfirm = paused;
      confirm = true; paused = true; accumulator = 0; lastFrame = null;
      cancelAnimationFrame(frame); frame = null; clearInput();
      showOverlay('VÁN MỚI?', 'Chơi ván khác?', 'Ván hiện tại sẽ kết thúc.', 'confirm');
      el('tgConfirmNo').focus();
    }
    function activateDirection(dir, event, button) {
      if (event?.detail > 0 && suppressedClicks.delete(button.id)) return;
      const owner = 'button:' + button.id;
      setHeld(owner, dir);
      if (!event || event.detail === 0) releaseHeld(owner);
    }
    function clickAction(button, event) {
      const dir = button.dataset?.dir;
      if (dir) { activateDirection(dir, event, button); return; }
      if (event.detail > 0 && suppressedClicks.delete(button.id)) return;
      switch (button.id) {
        case 'tgBomb': actPlace(); break;
        case 'tgRescue': actRescue(); break;
        case 'tgPause': paused ? resume() : pause(); break;
        case 'tgNew': askNewMatch(); break;
        case 'tgContinue': model.view().status === 'playing' ? resume() : startNew(); break;
        case 'tgConfirmYes': startNew(); break;
        case 'tgConfirmNo':
          confirm = false; paused = pausedBeforeConfirm;
          if (paused) showOverlay('TẠM DỪNG', 'Nghỉ một nhịp', 'Ván chơi đang chờ.', 'pause');
          else { el('tgOverlay').hidden = true; ensureFrame(); }
          focusBoard(); break;
      }
    }

    listen(container, 'keydown', event => {
      const dir = DIR_KEYS[event.key];
      if (dir) { event.preventDefault(); if (!event.repeat) setHeld('key:' + event.key, dir); return; }
      if (event.code === 'Space' || event.key === ' ') { event.preventDefault(); if (!event.repeat) actPlace(); return; }
      if (event.key === 'e' || event.key === 'E') { event.preventDefault(); if (!event.repeat) actRescue(); return; }
      if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') { event.preventDefault(); if (!event.repeat) paused ? resume() : pause(); }
    });
    listen(window, 'keyup', event => releaseHeld('key:' + event.key));
    listen(window, 'blur', () => { if (!paused && !confirm) pause(); });
    listen(document, 'visibilitychange', () => { if (document.hidden && !paused && !confirm) pause(); });
    const directionButtons = ['tgUp', 'tgDown', 'tgLeft', 'tgRight'].map(el);
    for (const button of directionButtons) listen(button, 'pointerdown', event => {
      if (!button || event.button !== 0) return;
      event.preventDefault(); const owner = 'pointer:' + event.pointerId;
      pointers.set(event.pointerId, { owner, button }); suppressedClicks.add(button.id);
      try { button.setPointerCapture?.(event.pointerId); } catch (_) {}
      setHeld(owner, button.dataset.dir);
    });
    const releasePointer = event => {
      const pointer = pointers.get(event.pointerId); if (!pointer) return;
      pointers.delete(event.pointerId); suppressedClicks.add(pointer.button.id);
      try { pointer.button.releasePointerCapture?.(event.pointerId); } catch (_) {}
      releaseHeld(pointer.owner);
    };
    listen(window, 'pointerup', releasePointer); listen(window, 'pointercancel', releasePointer);
    listen(window, 'lostpointercapture', releasePointer);
    for (const button of ['tgUp', 'tgDown', 'tgLeft', 'tgRight', 'tgBomb', 'tgRescue', 'tgPause', 'tgNew', 'tgContinue', 'tgConfirmYes', 'tgConfirmNo'].map(el)) {
      listen(button, 'click', event => clickAction(button, event));
    }
    onCleanup(() => {
      active = false; cancelAnimationFrame(frame); frame = null; clearInput();
      style?.remove?.(); container.classList.remove('tg-host');
    });

    draw(); update(); ensureFrame();
    return { getModel: () => model, pause, resume, startNew, draw };
  }
  window.NP_TidegridArena = Object.freeze({ mount });
})();
