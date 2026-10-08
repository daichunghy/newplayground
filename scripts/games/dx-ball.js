/* Original geometric paddle-and-ball view for Phá Gạch. */
(function () {
  'use strict';

  function mount(container, session, audio) {
    const M = window.NP_DxBallModel;
    if (!M || !session) throw new Error('Phá Gạch rules are not ready');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let model = M.create(), alive = true, frame = null, lastFrame = null;
    let paused = false, lastHUD = '', gameMessage = '', pointerId = null;
    const keys = new Set();
    const keyAxis = () => Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));

    container.classList.add('db-host');
    container.innerHTML = `
      <section class="db-game" aria-label="Phá Gạch">
        <header class="db-header"><h3>Phá Gạch</h3><div class="db-actions">
          <button class="db-icon" id="dbPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
          <button class="db-icon" id="dbRestart" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button>
        </div></header>
        <div class="db-hud" aria-label="Trạng thái ván">
          <div><span>Điểm</span><strong id="dbScore">0</strong></div>
          <div><span>Chặng</span><strong id="dbLevel">1 / ${M.CAMPAIGN.length}</strong><small id="dbStageName">${M.CAMPAIGN[0].name}</small></div>
          <div><span>Lượt</span><strong id="dbLives">3</strong></div>
        </div>
        <div class="db-stage">
          <canvas class="db-canvas" id="dbCanvas" width="720" height="480" tabindex="0" role="img" aria-label="Bàn chơi Phá Gạch. Dùng mũi tên hoặc A và D để đỡ bóng; kéo hoặc chạm để di chuyển. Nhấn Space để phóng bóng." aria-describedby="dbHelp">Bàn chơi Phá Gạch.</canvas>
          <div class="db-overlay" id="dbOverlay" hidden>
            <div class="db-card"><strong id="dbTitle">Sẵn sàng?</strong><p id="dbText">Đỡ bóng bằng thanh trượt và phá hết gạch. Chạm, kéo hoặc nhấn Space để chơi.</p><button class="db-primary" id="dbStart" type="button">Chơi</button></div>
          </div>
        </div>
        <p class="db-status" id="dbStatus" role="status" aria-live="polite" aria-atomic="true">Chạm, kéo hoặc nhấn Space để phóng bóng.</p>
        <p class="db-help" id="dbHelp">Di chuyển: ← → hoặc A D · Chạm/kéo bàn chơi · Space phóng · P tạm dừng · dọn 4 chặng</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('dbCanvas'), ctx = canvas?.getContext?.('2d');
    if (!ctx) {
      el('dbOverlay').hidden = false;
      el('dbTitle').textContent = 'Không mở được bàn chơi';
      el('dbText').textContent = 'Trình duyệt này chưa bật canvas.';
      el('dbStart').hidden = true;
      onCleanup(() => container.classList.remove('db-host'));
      return null;
    }

    function size() {
      const dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
      canvas.width = M.WIDTH * dpr; canvas.height = M.HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function roundRect(x, y, width, height, radius) {
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); }
      else { ctx.beginPath(); ctx.rect(x, y, width, height); }
    }
    function draw() {
      const v = model.view();
      ctx.clearRect(0, 0, M.WIDTH, M.HEIGHT);
      const bg = ctx.createLinearGradient(0, 0, M.WIDTH, M.HEIGHT);
      bg.addColorStop(0, '#111b35'); bg.addColorStop(0.55, '#152748'); bg.addColorStop(1, '#20264a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, M.WIDTH, M.HEIGHT);
      ctx.strokeStyle = 'rgba(170,205,255,.07)'; ctx.lineWidth = 1;
      for (let x = 24; x < M.WIDTH; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, M.HEIGHT); ctx.stroke(); }
      for (let y = 24; y < M.HEIGHT; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(M.WIDTH, y); ctx.stroke(); }

      for (const brick of v.bricks) {
        ctx.save();
        ctx.shadowColor = M.PALETTE[brick.color]; ctx.shadowBlur = 10;
        const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
        grad.addColorStop(0, '#fff'); grad.addColorStop(0.18, M.PALETTE[brick.color]); grad.addColorStop(1, '#292c64');
        ctx.fillStyle = grad; roundRect(brick.x, brick.y, brick.width, brick.height, 5); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.fillRect(brick.x + 6, brick.y + 3, Math.max(8, brick.width - 18), 2);
        if (brick.maxHits > 1) {
          ctx.fillStyle = '#101a31'; ctx.font = '700 11px Calibri, Inter, sans-serif';
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText(String(brick.hits), brick.x + brick.width - 6, brick.y + brick.height / 2 + .5);
        }
        ctx.restore();
      }

      const paddle = v.paddle, paddleX = paddle.x - M.PADDLE_WIDTH / 2;
      ctx.save(); ctx.shadowColor = '#60d9ff'; ctx.shadowBlur = 20;
      const paddleGrad = ctx.createLinearGradient(paddleX, M.PADDLE_Y, paddleX, M.PADDLE_Y + M.PADDLE_HEIGHT);
      paddleGrad.addColorStop(0, '#e0fbff'); paddleGrad.addColorStop(0.38, '#61d7f4'); paddleGrad.addColorStop(1, '#4285d8');
      ctx.fillStyle = paddleGrad; roundRect(paddleX, M.PADDLE_Y, M.PADDLE_WIDTH, M.PADDLE_HEIGHT, 7); ctx.fill();
      ctx.restore();

      const ball = v.ball;
      const glow = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.radius * 2.5);
      glow.addColorStop(0, '#fff'); glow.addColorStop(0.32, '#fff2b0'); glow.addColorStop(1, 'rgba(255,185,73,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff4c4'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(ball.x - 2.2, ball.y - 2.2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(224,242,255,.58)'; ctx.fillRect(28, M.HEIGHT - 15, M.WIDTH - 56, 1);
    }

    function messageFor(v) {
      if (gameMessage) return gameMessage;
      if (v.status === 'paused') return 'Đang tạm dừng.';
      if (v.status === 'won') return `Đã dọn xong ${v.stages} chặng · ${v.score} điểm.`;
      if (v.status === 'ready' && v.level > 1) return `Chặng ${v.level} · ${v.stage} · chạm hoặc nhấn Space.`;
      if (v.status === 'ready') return 'Chạm, kéo hoặc nhấn Space để phóng bóng.';
      if (v.status === 'over') return `Hết lượt · ${v.score} điểm.`;
      return `Chặng ${v.level}/${v.stages} · ${v.stage} · còn ${v.remaining} viên gạch.`;
    }
    function update() {
      if (!alive) return;
      const v = model.view(), signature = [v.status, v.score, v.level, v.lives, paused, v.remaining, gameMessage].join('|');
      if (signature === lastHUD) return;
      lastHUD = signature;
      el('dbScore').textContent = String(v.score); el('dbLevel').textContent = `${v.level} / ${v.stages}`;
      el('dbStageName').textContent = v.stage;
      el('dbLives').textContent = `${v.lives} / ${M.MAX_LIVES}`;
      const ready = v.status === 'ready', won = v.status === 'won', ended = v.status === 'over' || won;
      el('dbOverlay').hidden = v.status === 'playing';
      el('dbPause').disabled = ended;
      el('dbPause').textContent = v.status === 'paused' ? '▶' : 'Ⅱ';
      el('dbPause').setAttribute('aria-label', v.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng');
      el('dbStart').textContent = ended ? 'Chơi lại' : v.status === 'paused' ? 'Tiếp tục' : ready && v.level > 1 ? 'Chặng tiếp' : 'Bắt đầu';
      el('dbTitle').textContent = won ? 'Thắng rồi!' : v.status === 'over' ? 'Hết lượt' : v.status === 'paused' ? 'Đang tạm dừng' : ready && v.level > 1 ? `Chặng ${v.level}: ${v.stage}` : 'Phá Gạch';
      el('dbText').textContent = won ? `Bạn đã dọn cả 4 chặng · ${v.score} điểm.` : v.status === 'over' ? `Bạn đạt ${v.score} điểm qua chặng ${v.level}.` : v.status === 'paused' ? 'Bóng đang nghỉ. Tiếp tục khi bạn sẵn sàng.' : 'Đỡ bóng và phá hết gạch của mỗi sân. Chạm, kéo hoặc nhấn Space để chơi.';
      el('dbStatus').textContent = messageFor(v);
    }

    function sound(kind) {
      if (!alive || !audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      const tone = kind === 'brick' ? 660 : kind === 'paddle' ? 420 : kind === 'life' ? 180 : kind === 'level' ? 880 : 520;
      try { audio.playTone(tone, kind === 'life' ? 'triangle' : 'sine', kind === 'level' ? 0.11 : 0.055, 0.035); } catch (_) { /* Sound is optional. */ }
    }
    function unlockAudio() {
      if (!audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      try { audio.init?.(); if (audio.ctx?.state === 'suspended') audio.ctx.resume()?.catch?.(() => {}); } catch (_) {}
    }
    function consume(events) {
      for (const event of events || []) {
        if (['brick', 'paddle', 'life', 'level', 'launch', 'win'].includes(event.kind)) sound(event.kind);
        if (event.kind === 'life') gameMessage = event.lives ? `Mất một lượt · còn ${event.lives}. Chạm hoặc nhấn Space để tiếp tục.` : `Hết lượt · ${event.score} điểm.`;
        if (event.kind === 'level') gameMessage = `Đã phá hết gạch · ${event.name} bắt đầu.`;
        if (event.kind === 'brick' && !event.destroyed) gameMessage = 'Viên gạch bền nứt thêm.';
        if (event.kind === 'win') gameMessage = `Đã dọn xong ${event.level} chặng.`;
        if (event.kind === 'brick' && event.destroyed || event.kind === 'paddle' || event.kind === 'launch') gameMessage = '';
      }
    }
    function wantsFrame() {
      const v = model.view();
      return alive && (v.status === 'playing' || v.status === 'ready' && (keyAxis() !== 0 || v.paddle.targetX !== null));
    }
    function schedule() { if (wantsFrame() && frame === null) frame = requestAnimationFrame(loop); }
    function loop(now) {
      frame = null;
      if (!alive || !wantsFrame()) return;
      if (lastFrame === null) lastFrame = now;
      const delta = Math.min(60, Math.max(0, now - lastFrame)); lastFrame = now;
      consume(model.advance(delta));
      draw(); update(); schedule();
    }
    function cancelFrame() { if (frame !== null) cancelAnimationFrame(frame); frame = null; lastFrame = null; }
    function aimFromPointer(event) {
      const rect = canvas.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      model.setTarget((event.clientX - rect.left) * M.WIDTH / rect.width);
      schedule(); draw();
    }
    function startOrContinue() {
      unlockAudio();
      const status = model.view().status;
      if (status === 'over' || status === 'won') { model = model.reset(); gameMessage = ''; paused = false; lastFrame = null; }
      else if (status === 'paused') { model.resume(); paused = false; lastFrame = null; }
      if (model.launch()) { consume(model.drain()); gameMessage = ''; canvas.focus({ preventScroll: true }); }
      else consume(model.drain());
      draw(); lastHUD = ''; update(); schedule();
    }
    function togglePause() {
      if (model.view().status === 'paused') { model.resume(); paused = false; gameMessage = ''; lastFrame = null; }
      else if (model.pause()) { paused = true; gameMessage = ''; keys.clear(); model.setAxis(0); model.releaseTarget(); cancelFrame(); }
      consume(model.drain()); draw(); lastHUD = ''; update(); schedule();
    }
    function restart() {
      model = model.reset(); paused = false; keys.clear(); pointerId = null; model.setAxis(0); model.releaseTarget();
      gameMessage = ''; cancelFrame(); draw(); lastHUD = ''; update(); canvas.focus({ preventScroll: true });
    }

    listen(canvas, 'pointerdown', event => {
      if (event.isPrimary === false || event.button !== undefined && event.button !== 0) return;
      event.preventDefault?.(); unlockAudio(); pointerId = event.pointerId ?? 'primary';
      if (event.pointerId !== undefined) { try { canvas.setPointerCapture?.(event.pointerId); } catch (_) {} }
      aimFromPointer(event);
      const status = model.view().status;
      if (status === 'paused') model.resume();
      if (model.view().status === 'over' || model.view().status === 'won') model = model.reset();
      if (model.view().status === 'ready') model.launch();
      consume(model.drain()); gameMessage = ''; paused = false; lastFrame = null; draw(); lastHUD = ''; update(); schedule();
      canvas.focus({ preventScroll: true });
    });
    listen(canvas, 'pointermove', event => {
      if (pointerId !== null && event.pointerId === pointerId || event.pointerType === 'mouse' && !event.buttons) aimFromPointer(event);
    });
    listen(canvas, 'pointerup', event => {
      if (pointerId !== null && (event.pointerId === pointerId || pointerId === 'primary')) {
        pointerId = null; model.releaseTarget();
        try { if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture?.(event.pointerId); } catch (_) {}
      }
    });
    listen(canvas, 'pointercancel', () => { pointerId = null; model.releaseTarget(); });
    listen(canvas, 'pointerleave', () => { if (pointerId === null) model.releaseTarget(); });
    listen(el('dbStart'), 'click', startOrContinue);
    listen(el('dbPause'), 'click', togglePause);
    listen(el('dbRestart'), 'click', restart);
    listen(container, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target?.closest?.('button,summary,input,textarea,select,[contenteditable]')) return;
      const key = String(event.key || '').toLowerCase();
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
        event.preventDefault?.(); keys.add(key); model.setAxis(keyAxis()); schedule(); return;
      }
      if (key === ' ' || key === 'spacebar') { event.preventDefault?.(); startOrContinue(); }
      else if (key === 'p') { event.preventDefault?.(); togglePause(); }
    });
    listen(container, 'keyup', event => {
      const key = String(event.key || '').toLowerCase();
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
        keys.delete(key); model.setAxis(keyAxis()); schedule();
      }
    });
    listen(window, 'blur', () => { if (model.view().status === 'playing') togglePause(); keys.clear(); model.setAxis(0); model.releaseTarget(); pointerId = null; });
    listen(document, 'visibilitychange', () => { if (document.hidden && model.view().status === 'playing') togglePause(); });
    listen(window, 'resize', () => { size(); draw(); });
    onCleanup(() => { alive = false; cancelFrame(); keys.clear(); pointerId = null; container.classList.remove('db-host'); });

    size(); draw(); update();
    return { getModel: () => model, isPaused: () => model.view().status === 'paused', restart, launch: startOrContinue };
  }

  window.NP_DxBall = Object.freeze({ mount });
})();
