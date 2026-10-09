/* Original draw-and-ride game. All scenery and rider art are drawn in Canvas. */
(function (root) {
  'use strict';

  function mount(container, session) {
    const M = root.NP_LineRiderModel;
    if (!M || !container || !session?.listen || !session?.requestAnimationFrame || !session?.onCleanup) {
      throw new TypeError('Bút Vẽ Trượt Ván needs its model, container, and managed session');
    }
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    container.classList.add('lr-host');
    container.innerHTML = `
      <section class="lr-game" aria-label="Bút Vẽ Trượt Ván">
        <header class="lr-header"><div><p class="lr-kicker">VẼ ĐƯỜNG · THẢ TRƯỢT</p><h2>Bút Vẽ Trượt Ván</h2></div>
          <div class="lr-tools"><button class="lr-tool" id="lrPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
          <button class="lr-tool" id="lrRestart" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button></div>
        </header>
        <div class="lr-scoreline"><span>Điểm <b id="lrScore">0</b></span><span><b id="lrTime">16</b>s</span><span id="lrRings" aria-label="Vòng đã nhặt">○ ○ ○</span></div>
        <div class="lr-board"><canvas id="lrCanvas" width="800" height="440" role="img" aria-label="Vẽ đường trượt từ chấm xanh bên trái đến lá cờ bên phải; vòng sáng cho điểm" aria-describedby="lrStatus">Đường dốc, vòng thưởng và ván trượt.</canvas>
          <div class="lr-overlay" id="lrOverlay" hidden><div class="lr-overlay-card"><span class="lr-overlay-mark" id="lrOverlayMark" aria-hidden="true">✦</span>
            <h3 id="lrOverlayTitle"></h3><p id="lrOverlayText"></p><button class="lr-primary" id="lrOverlayAction" type="button"></button>
          </div></div>
        </div>
        <p class="lr-status" id="lrStatus" role="status" aria-live="polite" aria-atomic="true">Kéo từ chấm xanh tới cờ.</p>
        <div class="lr-controls"><button class="lr-primary lr-ride" id="lrStart" type="button" disabled>Thả trượt <span aria-hidden="true">→</span></button>
          <button class="lr-clear" id="lrClear" type="button">Xóa nét</button></div>
        <p class="lr-shortcut">Vẽ dốc để đổi tốc độ · P nghỉ</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('lrCanvas'), ctx = canvas.getContext('2d');
    let model = M.create(), alive = true, frame = null, previousTime = null, stamp = '', drawing = false, pointerId = null;

    function pointFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * M.WIDTH / rect.width,
        y: (event.clientY - rect.top) * M.HEIGHT / rect.height };
    }

    function announce(v) {
      let text = 'Kéo từ chấm xanh tới cờ.';
      if (v.lastEvent === 'start-here') text = 'Bắt đầu nét ở chấm xanh.';
      else if (v.lastEvent === 'draw') text = 'Kéo nét tới lá cờ.';
      else if (v.lastEvent === 'ink-limit') text = 'Nét dài quá · Xóa để vẽ lại.';
      else if (v.lastEvent === 'track-incomplete') text = 'Nét chưa tới cờ.';
      else if (v.lastEvent === 'track-ready') text = 'Đường sẵn sàng · Thả trượt!';
      else if (v.lastEvent === 'ride') text = 'Ván đang trượt…';
      else if (v.lastEvent === 'ring') text = `Nhặt vòng! ${v.ringsCollected}/3`;
      else if (v.lastEvent === 'stalled') text = 'Ván khựng lại. Thử dốc khác nhé.';
      else if (v.lastEvent === 'fell-back') text = 'Ván trượt ngược. Thử nét khác nhé.';
      else if (v.lastEvent === 'time-up') text = 'Hết giờ. Thử dốc khác nhé.';
      else if (v.lastEvent === 'win') text = 'Tới đích!';
      else if (v.status === 'paused') text = 'Đã nghỉ.';
      el('lrStatus').textContent = text;
    }

    function drawBackground() {
      const w = M.WIDTH, h = M.HEIGHT;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#c9edf0'); sky.addColorStop(.69, '#edf1d8'); sky.addColorStop(1, '#e1ecc4');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,244,.67)';
      for (const [x, y, r] of [[140, 92, 25], [178, 90, 18], [625, 82, 29], [664, 88, 20]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#b1d29d'; ctx.beginPath(); ctx.moveTo(0, 275); ctx.quadraticCurveTo(190, 178, 370, 270); ctx.quadraticCurveTo(580, 340, 800, 210); ctx.lineTo(800, 440); ctx.lineTo(0, 440); ctx.fill();
      ctx.fillStyle = '#d2dfaa'; ctx.beginPath(); ctx.moveTo(0, 354); ctx.quadraticCurveTo(210, 272, 420, 365); ctx.quadraticCurveTo(630, 420, 800, 322); ctx.lineTo(800, 440); ctx.lineTo(0, 440); ctx.fill();
      ctx.fillStyle = '#315e48'; ctx.font = '700 13px Calibri, Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('VẼ TỪ ĐÂY', M.START.x + 22, M.START.y + 48);
      ctx.fillText('ĐÍCH', M.GOAL.x, M.GOAL.y + 48);
    }

    function draw(v) {
      if (!alive || !ctx) return;
      drawBackground();
      // Start and goal remain visible before and after a run.
      ctx.save(); ctx.strokeStyle = '#2e8063'; ctx.lineWidth = 4; ctx.setLineDash([6, 7]);
      ctx.beginPath(); ctx.arc(M.START.x, M.START.y, M.START_RADIUS, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#c8ff4a'; ctx.beginPath(); ctx.arc(M.START.x, M.START.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#315a48'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(M.GOAL.x - 8, M.GOAL.y - 5, 16, 30, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f36e5b'; ctx.beginPath(); ctx.moveTo(M.GOAL.x + 1, M.GOAL.y - 2); ctx.lineTo(M.GOAL.x + 27, M.GOAL.y + 5); ctx.lineTo(M.GOAL.x + 1, M.GOAL.y + 13); ctx.closePath(); ctx.fill();

      for (let i = 0; i < v.ringPositions.length; i++) {
        const p = v.ringPositions[i];
        ctx.beginPath(); ctx.arc(p.x, p.y, v.rings[i] ? 11 : 14, 0, Math.PI * 2);
        ctx.fillStyle = v.rings[i] ? 'rgba(255,210,94,.3)' : '#ffcf5c'; ctx.fill();
        ctx.strokeStyle = v.rings[i] ? '#eea941' : '#fff8d7'; ctx.lineWidth = 4; ctx.stroke();
      }
      if (v.track.length > 1) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(35,70,59,.22)'; ctx.lineWidth = 15; ctx.beginPath();
        v.track.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
        ctx.strokeStyle = '#795943'; ctx.lineWidth = 9; ctx.beginPath();
        v.track.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
        ctx.strokeStyle = '#c38f62'; ctx.lineWidth = 3; ctx.beginPath();
        v.track.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      }
      // Original small rider: board, body, helmet, and wheels.
      const p = v.status === 'playing' || v.status === 'paused' || v.status === 'won' ? v.rider : M.START;
      const angle = Math.atan(v.rider.slope || 0);
      ctx.save(); ctx.translate(p.x, p.y - 18); ctx.rotate(angle);
      ctx.strokeStyle = '#273e3a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-20, 12); ctx.lineTo(21, 12); ctx.stroke();
      ctx.fillStyle = '#f4a568'; ctx.beginPath(); ctx.arc(-13, 17, 4, 0, Math.PI * 2); ctx.arc(15, 17, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#326b77'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(0, -6); ctx.lineTo(11, -13); ctx.stroke();
      ctx.strokeStyle = '#293f42'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-12, 1); ctx.lineTo(-17, 10); ctx.moveTo(0, -5); ctx.lineTo(12, 1); ctx.lineTo(15, 9); ctx.stroke();
      ctx.fillStyle = '#ffcf83'; ctx.beginPath(); ctx.arc(10, -18, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#355c65'; ctx.beginPath(); ctx.arc(10, -20, 8, Math.PI, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function update() {
      if (!alive) return;
      const v = model.view();
      const nextStamp = [v.status, Math.ceil(v.timeLeft), v.ringsCollected, v.score, v.lastEvent, v.validTrack].join('|');
      if (nextStamp !== stamp) {
        stamp = nextStamp;
        el('lrScore').textContent = String(v.score);
        el('lrTime').textContent = String(Math.ceil(v.timeLeft));
        el('lrRings').textContent = `${v.rings.map(hit => hit ? '●' : '○').join(' ')}`;
        el('lrRings').setAttribute('aria-label', `${v.ringsCollected} trên 3 vòng đã nhặt`);
        announce(v);
      }
      const paused = v.status === 'paused', terminal = v.status === 'won' || v.status === 'lost';
      el('lrPause').disabled = !['playing', 'paused'].includes(v.status);
      el('lrPause').textContent = paused ? '▶' : 'Ⅱ';
      el('lrPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('lrStart').disabled = !v.canRide;
      el('lrClear').disabled = v.status !== 'ready' || !v.track.length;
      el('lrOverlay').hidden = !(paused || terminal);
      el('lrOverlayTitle').textContent = paused ? 'Tạm dừng' : v.status === 'won' ? 'Tới đích!' : 'Thử dốc khác';
      el('lrOverlayText').textContent = paused ? 'Nét vẽ được giữ lại.' : `${v.score} điểm · ${v.ringsCollected}/3 vòng`;
      el('lrOverlayMark').textContent = paused ? 'Ⅱ' : v.status === 'won' ? '✓' : '↻';
      el('lrOverlayAction').textContent = paused ? 'Tiếp tục' : 'Vẽ lại';
      draw(v);
    }

    function stopLoop() { if (frame !== null) cancelAnimationFrame(frame); frame = null; previousTime = null; }
    function loop(timestamp) {
      frame = null;
      if (!alive || model.view().status !== 'playing') return;
      if (previousTime !== null) model.advance(Math.min(.05, Math.max(0, (timestamp - previousTime) / 1000)));
      previousTime = timestamp; update();
      if (model.view().status === 'playing') frame = requestAnimationFrame(loop);
    }
    function schedule() { if (alive && model.view().status === 'playing' && frame === null) frame = requestAnimationFrame(loop); }
    function interrupt() { if (model.pause()) { stopLoop(); update(); } }
    function restart() {
      drawing = false; pointerId = null; stopLoop(); model.restart(); stamp = ''; update(); el('lrCanvas').focus({ preventScroll: true });
    }
    function endDrawing(event) {
      if (!drawing || (pointerId !== null && event.pointerId !== pointerId)) return;
      drawing = false; pointerId = null;
      try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
      model.endTrack(); stamp = ''; update();
    }

    listen(canvas, 'pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      if (model.view().status !== 'ready') return;
      event.preventDefault();
      if (model.beginTrack(pointFromEvent(event))) {
        drawing = true; pointerId = event.pointerId;
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
        stamp = ''; update();
      } else { update(); }
    });
    listen(canvas, 'pointermove', event => {
      if (!drawing || event.pointerId !== pointerId) return;
      event.preventDefault(); model.appendTrack(pointFromEvent(event)); stamp = ''; update();
    });
    listen(canvas, 'pointerup', endDrawing);
    listen(canvas, 'pointercancel', endDrawing);
    listen(el('lrStart'), 'click', () => { if (model.start()) { previousTime = null; update(); schedule(); } });
    listen(el('lrClear'), 'click', () => { if (model.clearTrack()) { stamp = ''; update(); canvas.focus({ preventScroll: true }); } });
    listen(el('lrRestart'), 'click', restart);
    listen(el('lrPause'), 'click', () => {
      if (model.view().status === 'paused') { model.resume(); previousTime = null; update(); schedule(); }
      else if (model.pause()) stopLoop();
      update(); if (model.view().status === 'paused') el('lrOverlayAction').focus({ preventScroll: true });
    });
    listen(el('lrOverlayAction'), 'click', () => {
      if (model.view().status === 'paused') { model.resume(); previousTime = null; update(); schedule(); }
      else restart();
    });
    listen(root, 'keydown', event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        if (model.view().status === 'playing') { if (model.pause()) stopLoop(); }
        else if (model.resume()) { previousTime = null; schedule(); }
        update();
      }
    });
    listen(root, 'blur', interrupt);
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) interrupt(); });
    listen(root, 'pagehide', interrupt);
    onCleanup(() => { alive = false; drawing = false; pointerId = null; stopLoop(); container.classList.remove('lr-host'); });
    update();
    return Object.freeze({ getModel: () => model });
  }

  root.NP_LineRider = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);
