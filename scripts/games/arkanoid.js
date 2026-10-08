/* Original canvas view and controls for Vệ Tinh Giữ Quỹ Đạo. */
(function () {
  'use strict';

  function mount(container, session, audio) {
    const M = window.NP_OrbitBrickModel;
    if (!M || !session) throw new Error('Luật Vệ Tinh Giữ Quỹ Đạo chưa sẵn sàng');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let model = M.create(), alive = true, frame = null, lastFrame = null;
    let lastHUD = '', gameMessage = '', pointerId = null;
    const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const keys = new Set(), trail = [];
    const axis = () => Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));

    container.classList.add('og-host');
    container.innerHTML = `
      <section class="og-game" aria-label="Vệ Tinh Giữ Quỹ Đạo">
        <header class="og-header"><h3>Vệ Tinh Giữ Quỹ Đạo</h3><div class="og-actions">
          <button class="og-icon" id="ogPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
          <button class="og-icon" id="ogRestart" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button>
        </div></header>
        <div class="og-hud" aria-label="Trạng thái ván">
          <div><span>Điểm</span><strong id="ogScore">0</strong></div>
          <div><span>Vòng</span><strong id="ogRound">1 / 3</strong></div>
          <div><span>Lượt</span><strong id="ogLives">3</strong></div>
        </div>
        <div class="og-stage">
          <canvas class="og-canvas" id="ogCanvas" width="720" height="480" tabindex="0" role="img" aria-label="Bàn chơi. Di chuyển phi thuyền đỡ bóng; chạm hoặc nhấn Space để phóng." aria-describedby="ogHelp">Bàn chơi Vệ Tinh Giữ Quỹ Đạo.</canvas>
          <div class="og-overlay" id="ogOverlay" hidden>
            <div class="og-card"><strong id="ogTitle">Sẵn sàng?</strong><p id="ogText">Đỡ bóng và phá tường. Chạm hoặc nhấn Space để phóng.</p><button class="og-primary" id="ogStart" type="button">Bắt đầu</button></div>
          </div>
        </div>
        <p class="og-status" id="ogStatus" role="status" aria-live="polite" aria-atomic="true">Chạm hoặc nhấn Space để phóng bóng.</p>
        <p class="og-help" id="ogHelp">← → / A D · kéo để ngắm · Space phóng · P tạm dừng</p>
        <p class="og-rules">Khối bạc cần 2 chạm · khối vàng chắn bóng · bắt ↔ để nới thanh 8 giây</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('ogCanvas'), ctx = canvas?.getContext?.('2d');
    if (!ctx) {
      el('ogOverlay').hidden = false;
      el('ogTitle').textContent = 'Không mở được bàn chơi';
      el('ogText').textContent = 'Trình duyệt này chưa bật canvas.';
      el('ogStart').hidden = true;
      onCleanup(() => container.classList.remove('og-host'));
      return null;
    }
    canvas.dataset.motion = reducedMotion ? 'reduced' : 'full';

    function size() {
      const dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
      canvas.width = M.WIDTH * dpr; canvas.height = M.HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function rounded(x, y, width, height, radius) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
      else ctx.rect(x, y, width, height);
    }
    function draw() {
      const v = model.view();
      ctx.clearRect(0, 0, M.WIDTH, M.HEIGHT);
      const bg = ctx.createLinearGradient(0, 0, M.WIDTH, M.HEIGHT);
      bg.addColorStop(0, '#07172a'); bg.addColorStop(.52, '#102c46'); bg.addColorStop(1, '#17233f');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, M.WIDTH, M.HEIGHT);
      // A fixed star map keeps scenery original and quiet, including in reduced-motion mode.
      for (let i = 0; i < 34; i++) {
        const x = (i * 137 + 31) % M.WIDTH, y = (i * 71 + 18) % M.HEIGHT;
        ctx.fillStyle = i % 4 === 0 ? 'rgba(170,220,255,.4)' : 'rgba(170,220,255,.17)';
        ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
      }

      for (const brick of v.bricks) {
        ctx.save();
        if (brick.type === 'gold') {
          ctx.fillStyle = '#b48939'; rounded(brick.x, brick.y, brick.width, brick.height, 4); ctx.fill();
          ctx.strokeStyle = '#f3d497'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.strokeStyle = '#73531f';
          ctx.beginPath(); ctx.moveTo(brick.x + 7, brick.y + 4); ctx.lineTo(brick.x + brick.width - 7, brick.y + brick.height - 4);
          ctx.moveTo(brick.x + brick.width - 7, brick.y + 4); ctx.lineTo(brick.x + 7, brick.y + brick.height - 4); ctx.stroke();
        } else {
          const color = brick.type === 'silver' ? '#c2d0df' : M.PALETTE[brick.color];
          const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
          grad.addColorStop(0, '#ffffff'); grad.addColorStop(.24, color); grad.addColorStop(1, brick.type === 'silver' ? '#647b91' : '#263d62');
          ctx.fillStyle = grad; rounded(brick.x, brick.y, brick.width, brick.height, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(brick.x + 5, brick.y + 3, brick.width - 10, 2);
          if (brick.type === 'silver' && brick.hits === 1) {
            ctx.strokeStyle = '#35495e'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(brick.x + 18, brick.y + 4); ctx.lineTo(brick.x + 25, brick.y + 9); ctx.lineTo(brick.x + 31, brick.y + 5); ctx.stroke();
          }
          if (brick.carriesExpand) {
            ctx.fillStyle = 'rgba(7,35,51,.75)'; ctx.font = '700 9px Calibri, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('↔', brick.x + brick.width / 2, brick.y + brick.height / 2 + 1);
          }
        }
        ctx.restore();
      }

      if (v.capsule) {
        const c = v.capsule;
        ctx.save(); ctx.shadowColor = '#70f2e0'; ctx.shadowBlur = reducedMotion ? 0 : 12;
        ctx.fillStyle = '#87f0d7'; rounded(c.x, c.y, c.width, c.height, 9); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#e9fff9'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#145b6e'; ctx.lineWidth = 2.2; ctx.beginPath();
        ctx.moveTo(c.x + 4, c.y + 12); ctx.lineTo(c.x + c.width / 2 - 2, c.y + 12);
        ctx.moveTo(c.x + c.width - 4, c.y + 12); ctx.lineTo(c.x + c.width / 2 + 2, c.y + 12);
        ctx.moveTo(c.x + c.width / 2 - 5, c.y + 9); ctx.lineTo(c.x + c.width / 2 - 2, c.y + 12); ctx.lineTo(c.x + c.width / 2 - 5, c.y + 15);
        ctx.moveTo(c.x + c.width / 2 + 5, c.y + 9); ctx.lineTo(c.x + c.width / 2 + 2, c.y + 12); ctx.lineTo(c.x + c.width / 2 + 5, c.y + 15); ctx.stroke();
        ctx.restore();
      }

      if (!reducedMotion) {
        for (let i = 0; i < trail.length; i++) {
          const t = trail[i]; ctx.globalAlpha = (i + 1) / (trail.length + 2) * .22; ctx.fillStyle = '#c5f8ff';
          ctx.beginPath(); ctx.arc(t.x, t.y, v.ball.radius * (i + 1) / trail.length * .7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const p = v.paddle, px = p.x - p.width / 2;
      ctx.save(); ctx.shadowColor = v.power.type ? '#8cf7dd' : '#64d6ff'; ctx.shadowBlur = reducedMotion ? 0 : 18;
      const paddle = ctx.createLinearGradient(px, p.y, px, p.y + p.height);
      paddle.addColorStop(0, '#edffff'); paddle.addColorStop(.38, v.power.type ? '#83f0d4' : '#69d9f4'); paddle.addColorStop(1, '#338bb0');
      ctx.fillStyle = paddle; rounded(px, p.y, p.width, p.height, 7); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#174c65';
      ctx.beginPath(); ctx.moveTo(p.x - 13, p.y); ctx.lineTo(p.x, p.y - 7); ctx.lineTo(p.x + 13, p.y); ctx.closePath(); ctx.fill();
      ctx.restore();

      const b = v.ball;
      ctx.fillStyle = 'rgba(255,239,177,.16)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff5c9'; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(180,230,255,.28)'; ctx.beginPath(); ctx.moveTo(24, M.HEIGHT - 14); ctx.lineTo(M.WIDTH - 24, M.HEIGHT - 14); ctx.stroke();
    }

    function messageFor(v) {
      if (gameMessage) return gameMessage;
      if (v.status === 'paused') return 'Đã tạm dừng.';
      if (v.status === 'ready' && v.round > 1) return `Vòng ${v.round} · chạm hoặc nhấn Space để phóng.`;
      if (v.status === 'ready') return 'Chạm hoặc nhấn Space để phóng bóng.';
      if (v.status === 'over') return `Hết lượt · ${v.score} điểm.`;
      if (v.status === 'won') return `Đã qua ${v.maxRounds} vòng · ${v.score} điểm.`;
      return `Vòng ${v.round} · còn ${v.remaining} khối.`;
    }
    function update() {
      if (!alive) return;
      const v = model.view(), signature = [v.status, v.score, v.round, v.lives, v.remaining, v.power.ticksRemaining, gameMessage].join('|');
      if (signature === lastHUD) return;
      lastHUD = signature;
      el('ogScore').textContent = String(v.score); el('ogRound').textContent = `${v.round} / ${v.maxRounds}`; el('ogLives').textContent = `${v.lives} / ${M.MAX_LIVES}`;
      const ended = v.status === 'over' || v.status === 'won';
      el('ogOverlay').hidden = v.status === 'playing'; el('ogPause').disabled = ended;
      el('ogPause').textContent = v.status === 'paused' ? '▶' : 'Ⅱ';
      el('ogPause').setAttribute('aria-label', v.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng');
      el('ogStart').textContent = ended ? 'Chơi lại' : v.status === 'paused' ? 'Tiếp tục' : v.status === 'ready' && v.round > 1 ? 'Vòng tiếp' : 'Bắt đầu';
      el('ogTitle').textContent = v.status === 'over' ? 'Hết lượt' : v.status === 'won' ? 'Qua ba vòng!' : v.status === 'paused' ? 'Đang tạm dừng' : v.round > 1 ? `Vòng ${v.round}` : 'Vệ Tinh Giữ Quỹ Đạo';
      el('ogText').textContent = ended ? `Bạn đạt ${v.score} điểm.` : v.status === 'paused' ? 'Bóng đang nghỉ. Tiếp tục khi sẵn sàng.' : 'Đỡ bóng và phá tường. Chạm hoặc nhấn Space để phóng.';
      el('ogStatus').textContent = messageFor(v);
    }

    function sound(kind) {
      if (!alive || !audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      const tone = kind === 'brick' ? 660 : kind === 'paddle' ? 430 : kind === 'life' ? 175 : kind === 'round' ? 820 : kind === 'capsule-collected' ? 740 : 520;
      try { audio.playTone(tone, kind === 'life' ? 'triangle' : 'sine', kind === 'round' ? .1 : .05, .03); } catch (_) { /* Sound is optional. */ }
    }
    function unlockAudio() {
      if (!audio || window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted) return;
      try { audio.init?.(); if (audio.ctx?.state === 'suspended') audio.ctx.resume()?.catch?.(() => {}); } catch (_) {}
    }
    function consume(list) {
      for (const event of list || []) {
        if (['brick', 'paddle', 'life', 'round', 'launch', 'capsule-collected', 'gold-wall'].includes(event.kind)) sound(event.kind);
        if (event.kind === 'life') gameMessage = event.lives ? `Mất một lượt · còn ${event.lives}. Chạm hoặc nhấn Space để tiếp tục.` : `Hết lượt · ${event.score} điểm.`;
        if (event.kind === 'round') gameMessage = `Đã phá xong tường · vòng ${event.round} bắt đầu.`;
        if (event.kind === 'won') gameMessage = `Đã qua ${event.round} vòng · ${event.score} điểm.`;
        if (event.kind === 'capsule-collected') gameMessage = 'Tấm đỡ được mở rộng trong 8 giây.';
        if (event.kind === 'brick' || event.kind === 'paddle' || event.kind === 'launch') gameMessage = '';
      }
    }
    function wantsFrame() {
      const v = model.view();
      return alive && !['paused', 'over', 'won'].includes(v.status) && (v.status === 'playing' || axis() !== 0 || v.paddle.targetX !== null);
    }
    function schedule() { if (wantsFrame() && frame === null) frame = requestAnimationFrame(loop); }
    function loop(now) {
      frame = null;
      if (!alive || !wantsFrame()) return;
      if (lastFrame === null) lastFrame = now;
      const delta = Math.min(60, Math.max(0, now - lastFrame)); lastFrame = now;
      consume(model.advance(delta));
      const b = model.view().ball;
      if (!reducedMotion) { trail.push({ x: b.x, y: b.y }); if (trail.length > 5) trail.shift(); }
      draw(); update(); schedule();
    }
    function cancelFrame() { if (frame !== null) cancelAnimationFrame(frame); frame = null; lastFrame = null; trail.length = 0; }
    function aimFromPointer(event) {
      const rect = canvas.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      model.setTarget((event.clientX - rect.left) * M.WIDTH / rect.width); schedule(); draw();
    }
    function releasePointer() {
      if (pointerId !== null && pointerId !== 'primary') {
        try { if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture?.(pointerId); } catch (_) {}
      }
      pointerId = null; model.releaseTarget();
    }
    function startOrContinue() {
      unlockAudio();
      const status = model.view().status;
      if (status === 'over' || status === 'won') { model = model.reset(); gameMessage = ''; lastFrame = null; trail.length = 0; }
      else if (status === 'paused') { model.resume(); gameMessage = ''; lastFrame = null; }
      if (model.launch()) { consume(model.drain()); gameMessage = ''; canvas.focus({ preventScroll: true }); }
      else consume(model.drain());
      draw(); lastHUD = ''; update(); schedule();
    }
    function togglePause() {
      if (model.view().status === 'paused') { model.resume(); gameMessage = ''; lastFrame = null; }
      else if (model.pause()) { gameMessage = ''; keys.clear(); model.setAxis(0); releasePointer(); cancelFrame(); }
      consume(model.drain()); draw(); lastHUD = ''; update(); schedule();
    }
    function restart() {
      model = model.reset(); keys.clear(); model.setAxis(0); releasePointer();
      gameMessage = ''; cancelFrame(); draw(); lastHUD = ''; update(); canvas.focus({ preventScroll: true });
    }

    listen(canvas, 'pointerdown', event => {
      if (event.isPrimary === false || event.button !== undefined && event.button !== 0) return;
      event.preventDefault?.(); unlockAudio(); pointerId = event.pointerId ?? 'primary';
      if (event.pointerId !== undefined) { try { canvas.setPointerCapture?.(event.pointerId); } catch (_) {} }
      aimFromPointer(event);
      const status = model.view().status;
      if (status === 'paused') model.resume();
      if (status === 'over' || status === 'won') model = model.reset();
      if (model.view().status === 'ready') model.launch();
      consume(model.drain()); gameMessage = ''; lastFrame = null; draw(); lastHUD = ''; update(); schedule();
      canvas.focus({ preventScroll: true });
    });
    listen(canvas, 'pointermove', event => {
      if (pointerId !== null && event.pointerId === pointerId || event.pointerType === 'mouse' && !event.buttons) aimFromPointer(event);
    });
    listen(canvas, 'pointerup', event => {
      if (pointerId !== null && (event.pointerId === pointerId || pointerId === 'primary')) {
        releasePointer();
      }
    });
    listen(canvas, 'pointercancel', releasePointer);
    listen(canvas, 'pointerleave', () => { if (pointerId === null) model.releaseTarget(); });
    listen(el('ogStart'), 'click', startOrContinue); listen(el('ogPause'), 'click', togglePause); listen(el('ogRestart'), 'click', restart);
    listen(container, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target?.closest?.('button,summary,input,textarea,select,[contenteditable]')) return;
      const key = String(event.key || '').toLowerCase();
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) { event.preventDefault?.(); keys.add(key); model.setAxis(axis()); schedule(); return; }
      if (key === ' ' || key === 'spacebar') { event.preventDefault?.(); startOrContinue(); }
      else if (key === 'p' || key === 'escape') { event.preventDefault?.(); togglePause(); }
    });
    listen(container, 'keyup', event => {
      const key = String(event.key || '').toLowerCase();
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) { keys.delete(key); model.setAxis(axis()); schedule(); }
    });
    listen(window, 'blur', () => { if (model.view().status === 'playing') togglePause(); keys.clear(); model.setAxis(0); releasePointer(); });
    listen(document, 'visibilitychange', () => { if (document.hidden && model.view().status === 'playing') togglePause(); });
    listen(window, 'resize', () => { size(); draw(); });
    onCleanup(() => { alive = false; cancelFrame(); keys.clear(); releasePointer(); container.classList.remove('og-host'); });

    size(); draw(); update();
    return { getModel: () => model, isReducedMotion: () => reducedMotion, restart, launch: startOrContinue };
  }

  window.NP_OrbitBrick = Object.freeze({ mount });
})();
