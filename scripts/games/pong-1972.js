/* Original two-paddle table-tennis view. Load pong-1972-model.js first. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_Pong1972 = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const KEYS = {
    leftUp: new Set(['w']), leftDown: new Set(['s']),
    rightUp: new Set(['arrowup']), rightDown: new Set(['arrowdown'])
  };

  function mount(container, session, audio) {
    const M = window.NP_Pong1972Model;
    if (!container || !M || !session?.listen || !session?.onCleanup) {
      throw new TypeError('Bóng Bàn Cổ Điển needs its model, container, and game session');
    }
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let model = M.create(), alive = true, frameId = null, lastFrame = null;
    let muted = false, hudStamp = '', pointerSides = new Map(), heldPads = new Map(), fallbackAudio = null;
    const keys = new Set();

    container.classList.add('p72-host');
    container.innerHTML = `
      <link rel="stylesheet" href="scripts/games/pong-1972.css" data-p72-styles>
      <section class="p72-game is-solo" id="p72Game" aria-label="Bóng Bàn Cổ Điển">
        <header class="p72-header">
          <div class="p72-brand"><span class="p72-eyebrow" id="p72ModeHint">MỘT NGƯỜI · ĐẤU MÁY</span><h2>Bóng Bàn Cổ Điển</h2></div>
          <div class="p72-scoreboard" aria-label="Tỉ số">
            <div class="p72-score p72-left-score"><span id="p72LeftLabel">BẠN</span><strong id="p72LeftScore">0</strong></div>
            <span class="p72-score-divider" aria-hidden="true">:</span>
            <div class="p72-score p72-right-score"><strong id="p72RightScore">0</strong><span id="p72RightLabel">MÁY</span></div>
          </div>
        </header>
        <div class="p72-arena">
          <canvas class="p72-canvas" id="p72Canvas" width="800" height="460" tabindex="0" role="img" aria-label="Bàn bóng bàn. Dùng mũi tên lên/xuống hoặc W/S để điều khiển vợt." aria-describedby="p72Help">Bàn chơi bóng bàn.</canvas>
          <div class="p72-overlay" id="p72Overlay" hidden>
            <div class="p72-overlay-card"><span class="p72-overlay-mark" aria-hidden="true">●</span><h3 id="p72OverlayTitle">Tạm nghỉ</h3><p id="p72OverlayText">Bàn chơi đang tạm dừng.</p><button class="p72-button p72-primary" id="p72Continue" type="button">Chơi tiếp</button></div>
          </div>
        </div>
        <p class="p72-status" id="p72Status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="p72-control-row" aria-label="Điều khiển vợt">
          <div class="p72-pad p72-left-pad" role="group" aria-label="Điều khiển người chơi bên trái">
            <span class="p72-pad-label">TRÁI <small>W / S</small></span>
            <button class="p72-arrow" data-side="left" data-axis="-1" type="button" aria-label="Vợt trái đi lên">↑</button>
            <button class="p72-arrow" data-side="left" data-axis="1" type="button" aria-label="Vợt trái đi xuống">↓</button>
          </div>
          <div class="p72-actions">
            <button class="p72-button p72-mode" id="p72Mode" type="button" aria-label="Chuyển sang hai người chơi">2 người</button>
            <button class="p72-button" id="p72Pause" type="button" aria-label="Tạm dừng">Ⅱ <span>Tạm dừng</span></button>
            <button class="p72-button" id="p72Restart" type="button">↻ <span>Ván mới</span></button>
            <button class="p72-button p72-sound" id="p72Sound" type="button" aria-pressed="false">♫ <span>Âm thanh: bật</span></button>
          </div>
          <div class="p72-pad p72-right-pad" id="p72RightPad" role="group" aria-label="Điều khiển người chơi bên phải">
            <span class="p72-pad-label">PHẢI <small>↑ / ↓</small></span>
            <button class="p72-arrow" data-side="right" data-axis="-1" type="button" aria-label="Vợt phải đi lên">↑</button>
            <button class="p72-arrow" data-side="right" data-axis="1" type="button" aria-label="Vợt phải đi xuống">↓</button>
          </div>
        </div>
        <p class="p72-help" id="p72Help">Mũi tên hoặc W/S · Kéo bàn để đỡ bóng · P tạm dừng · R chơi lại</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('p72Canvas'), ctx = canvas?.getContext?.('2d');
    if (!ctx) {
      container.classList.remove('p72-host');
      throw new Error('Bóng Bàn Cổ Điển needs canvas support');
    }

    function resize() {
      const dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
      canvas.width = M.WIDTH * dpr; canvas.height = M.HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function roundedRect(x, y, width, height, radius) {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, radius);
      else ctx.rect(x, y, width, height);
    }

    function draw() {
      if (!alive) return;
      const v = model.view();
      const bg = ctx.createLinearGradient(0, 0, M.WIDTH, M.HEIGHT);
      bg.addColorStop(0, '#153c43'); bg.addColorStop(0.48, '#0d2d38'); bg.addColorStop(1, '#102a36');
      ctx.fillStyle = '#081c25'; ctx.fillRect(0, 0, M.WIDTH, M.HEIGHT);
      ctx.save();
      roundedRect(13, 13, M.WIDTH - 26, M.HEIGHT - 26, 19);
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = 'rgba(180, 225, 208, .28)'; ctx.lineWidth = 1.5; ctx.stroke();

      // Fine table grain and a quiet center net give the court its own warm, crafted look.
      ctx.strokeStyle = 'rgba(169, 224, 210, .045)'; ctx.lineWidth = 1;
      for (let y = 27; y < M.HEIGHT - 20; y += 16) {
        ctx.beginPath(); ctx.moveTo(25, y); ctx.lineTo(M.WIDTH - 25, y); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(220, 244, 224, .24)'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 10]);
      ctx.beginPath(); ctx.moveTo(M.WIDTH / 2, 24); ctx.lineTo(M.WIDTH / 2, M.HEIGHT - 24); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(220, 244, 224, .12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(M.WIDTH / 2, M.HEIGHT / 2, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      for (const [side, color] of [['left', '#ff9271'], ['right', '#8ee4d0']]) {
        const paddle = v.paddles[side];
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 17;
        const grad = ctx.createLinearGradient(paddle.x, paddle.y - M.PADDLE_HEIGHT / 2, paddle.x + M.PADDLE_WIDTH, paddle.y + M.PADDLE_HEIGHT / 2);
        grad.addColorStop(0, '#fff4dc'); grad.addColorStop(.19, color); grad.addColorStop(1, color);
        roundedRect(paddle.x, paddle.y - M.PADDLE_HEIGHT / 2, M.PADDLE_WIDTH, M.PADDLE_HEIGHT, 6);
        ctx.fillStyle = grad; ctx.fill(); ctx.restore();
      }

      const ball = v.ball;
      if (v.status !== 'serve' || v.serveTimer > 0) {
        ctx.save(); ctx.shadowColor = '#ffe5ae'; ctx.shadowBlur = 18;
        ctx.fillStyle = '#fff0ca'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.beginPath(); ctx.arc(ball.x - 2.3, ball.y - 2.3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      if (v.status === 'serve') {
        ctx.save(); ctx.fillStyle = 'rgba(241, 237, 214, .58)'; ctx.textAlign = 'center';
        ctx.font = "700 11px 'Calibri', 'Inter', sans-serif"; ctx.letterSpacing = '3px';
        ctx.fillText('SẴN SÀNG', M.WIDTH / 2, 36); ctx.restore();
      }
    }

    function updateHud() {
      if (!alive) return;
      updateSoundButton();
      const v = model.view();
      const stamp = [v.mode, v.status, v.score.left, v.score.right, v.winner].join('|');
      if (stamp === hudStamp) return;
      hudStamp = stamp;
      el('p72LeftScore').textContent = String(v.score.left);
      el('p72RightScore').textContent = String(v.score.right);
      const solo = v.mode === 'solo';
      el('p72Game').classList.toggle('is-solo', solo);
      el('p72ModeHint').textContent = solo ? 'MỘT NGƯỜI · ĐẤU MÁY' : 'HAI NGƯỜI · MỘT BÀN';
      el('p72LeftLabel').textContent = solo ? 'BẠN' : 'TRÁI';
      el('p72RightLabel').textContent = solo ? 'MÁY' : 'PHẢI';
      el('p72Mode').textContent = solo ? '2 người' : 'Đấu máy';
      el('p72Mode').setAttribute('aria-label', solo ? 'Ván mới: chuyển sang hai người chơi' : 'Ván mới: chuyển sang đấu với máy');
      el('p72RightPad').hidden = solo;
      canvas.setAttribute('aria-label', solo
        ? 'Bàn Bóng Bàn Cổ Điển. Dùng mũi tên lên/xuống hoặc W/S để điều khiển vợt; máy điều khiển vợt bên phải.'
        : 'Bàn Bóng Bàn Cổ Điển. Trái dùng W/S; phải dùng mũi tên lên/xuống. Kéo mỗi nửa bàn hoặc giữ nút hướng.');
      el('p72Help').textContent = solo
        ? 'Mũi tên hoặc W/S · Kéo bàn để đỡ bóng · P tạm dừng · R chơi lại'
        : 'Trái W/S · Phải ↑/↓ · Kéo mỗi nửa bàn · P tạm dừng · R chơi lại';
      el('p72Pause').disabled = v.status === 'won';
      const paused = v.status === 'paused', won = v.status === 'won';
      el('p72Overlay').hidden = !(paused || won);
      el('p72OverlayTitle').textContent = won ? solo ? (v.winner === 'left' ? 'Bạn thắng!' : 'Máy thắng!') : `${v.winner === 'left' ? 'Người chơi trái' : 'Người chơi phải'} thắng!` : 'Tạm nghỉ';
      el('p72OverlayText').textContent = won ? `Tỉ số ${v.score.left} : ${v.score.right}. Chơi thêm một ván nhé?` : 'Bàn chơi đang tạm dừng.';
      el('p72Continue').textContent = won ? 'Ván mới' : 'Chơi tiếp';
      if (won) el('p72Status').textContent = `${solo ? (v.winner === 'left' ? 'Bạn thắng' : 'Máy thắng') : v.winner === 'left' ? 'Người chơi trái thắng' : 'Người chơi phải thắng'} ${v.score.left} : ${v.score.right}.`;
      else if (paused) el('p72Status').textContent = 'Đã tạm dừng.';
      else if (v.status === 'serve') el('p72Status').textContent = 'Giao bóng.';
      else el('p72Status').textContent = 'Bóng đang trong cuộc.';
    }

    function tone(kind) {
      if (!alive || muted || appMuted()) return;
      const tones = {
        'wall-hit': [560, 'sine', .035, .026],
        'paddle-hit': [kind === 'paddle-hit' ? 365 : 560, 'triangle', .052, .035],
        'point': [185, 'sine', .095, .04],
        'serve': [505, 'sine', .075, .035],
        'match-won': [740, 'triangle', .16, .035]
      };
      const sound = tones[kind];
      if (!sound) return;
      if (audio?.playTone) {
        try { audio.playTone(sound[0], sound[1], sound[2], sound[3]); } catch (_) { /* Audio is optional. */ }
        return;
      }
      if (!fallbackAudio) return;
      try {
        const oscillator = fallbackAudio.createOscillator(), gain = fallbackAudio.createGain();
        oscillator.type = sound[1]; oscillator.frequency.value = sound[0];
        gain.gain.setValueAtTime(sound[3], fallbackAudio.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, fallbackAudio.currentTime + sound[2]);
        oscillator.connect(gain); gain.connect(fallbackAudio.destination);
        oscillator.start(); oscillator.stop(fallbackAudio.currentTime + sound[2]);
      } catch (_) { /* Browser audio support varies. */ }
    }

    function unlockAudio() {
      if (muted || appMuted()) return;
      try {
        if (audio) {
          audio.init?.();
          if (audio.ctx?.state === 'suspended') audio.ctx.resume()?.catch?.(() => {});
          return;
        }
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!fallbackAudio && AudioCtor) fallbackAudio = new AudioCtor();
        if (fallbackAudio?.state === 'suspended') fallbackAudio.resume()?.catch?.(() => {});
      } catch (_) { /* Sound remains optional. */ }
    }

    function consume(events) {
      for (const event of events || []) tone(event.kind);
    }

    function axisFor(side) {
      const solo = model.view().mode === 'solo';
      let up = side === 'left' && solo ? keys.has('w') || keys.has('arrowup') : keys.has(side === 'left' ? 'w' : 'arrowup');
      let down = side === 'left' && solo ? keys.has('s') || keys.has('arrowdown') : keys.has(side === 'left' ? 's' : 'arrowdown');
      for (const held of heldPads.values()) {
        if (held.side === side && held.axis < 0) up = true;
        if (held.side === side && held.axis > 0) down = true;
      }
      return Number(down) - Number(up);
    }
    function syncAxes() {
      model.setAxis('left', axisFor('left')); model.setAxis('right', axisFor('right'));
    }
    function clearHeld() {
      keys.clear(); pointerSides.clear(); heldPads.clear(); syncAxes();
      model.releaseTarget('left'); model.releaseTarget('right');
    }
    function schedule() {
      const status = model.view().status;
      if (alive && status !== 'paused' && status !== 'won' && frameId === null) frameId = requestAnimationFrame(tickFrame);
    }
    function tickFrame(timestamp) {
      frameId = null;
      if (!alive) return;
      if (lastFrame === null) lastFrame = timestamp;
      const elapsed = Math.min(100, Math.max(0, timestamp - lastFrame));
      lastFrame = timestamp;
      consume(model.advance(elapsed));
      draw(); updateHud(); schedule();
    }
    function stopFrame() {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null; lastFrame = null;
    }
    function setPointerTarget(event, side) {
      const rect = canvas.getBoundingClientRect();
      if (!rect || rect.height <= 0) return;
      model.setTarget(side, (event.clientY - rect.top) * M.HEIGHT / rect.height);
      schedule();
    }

    function pointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault?.(); unlockAudio(); canvas.focus?.({ preventScroll: true });
      const rect = canvas.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const side = model.view().mode === 'solo' || (event.clientX - rect.left) < rect.width / 2 ? 'left' : 'right';
      const id = event.pointerId ?? 'primary';
      pointerSides.set(id, side); setPointerTarget(event, side);
      if (event.pointerId !== undefined) { try { canvas.setPointerCapture?.(event.pointerId); } catch (_) {} }
    }
    function pointerMove(event) {
      let side = pointerSides.get(event.pointerId ?? 'primary');
      if (!side && event.pointerType === 'mouse' && !event.buttons) {
        const rect = canvas.getBoundingClientRect();
        if (rect?.width > 0) side = model.view().mode === 'solo' || (event.clientX - rect.left) < rect.width / 2 ? 'left' : 'right';
      }
      if (side) setPointerTarget(event, side);
    }
    function pointerEnd(event) {
      const id = event.pointerId ?? 'primary', side = pointerSides.get(id);
      if (!side) return;
      pointerSides.delete(id); model.releaseTarget(side); syncAxes();
      try { if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture?.(event.pointerId); } catch (_) {}
    }
    function onKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const key = String(event.key || '').toLowerCase();
      if (Object.values(KEYS).some(set => set.has(key))) {
        event.preventDefault?.(); unlockAudio(); keys.add(key); syncAxes(); return;
      }
      if (key === 'p' || key === 'escape') { event.preventDefault?.(); togglePause(); }
      else if (key === 'r') { event.preventDefault?.(); restart(); }
    }
    function onKeyUp(event) {
      const key = String(event.key || '').toLowerCase();
      if (Object.values(KEYS).some(set => set.has(key))) { keys.delete(key); syncAxes(); }
    }
    function togglePause() {
      const view = model.view();
      if (view.status === 'paused') model.resume();
      else if (!model.pause()) return;
      clearHeld(); consume(model.drain()); stopFrame(); draw(); hudStamp = ''; updateHud(); schedule();
    }
    function restart() {
      model.reset(); clearHeld(); stopFrame(); draw(); hudStamp = ''; updateHud(); schedule();
      canvas.focus?.({ preventScroll: true });
    }
    function toggleMode() {
      clearHeld(); stopFrame();
      model = M.create(model.view().mode === 'solo' ? 'versus' : 'solo');
      hudStamp = ''; draw(); updateHud(); schedule();
      canvas.focus?.({ preventScroll: true });
    }
    function startHeld(event, button) {
      const side = button?.dataset?.side || event.currentTarget?.dataset?.side || event.target?.dataset?.side;
      const axis = Number(button?.dataset?.axis || event.currentTarget?.dataset?.axis || event.target?.dataset?.axis);
      if (!side || !Number.isFinite(axis)) return;
      event.preventDefault?.(); unlockAudio();
      heldPads.set(event.pointerId ?? button ?? event.target, { side, axis });
      model.setAxis(side, axisFor(side)); schedule();
    }
    function stopHeld(event) {
      const id = event.pointerId ?? event.currentTarget ?? event.target;
      const held = heldPads.get(id);
      if (!held) return;
      heldPads.delete(id);
      model.setAxis(held.side, axisFor(held.side));
    }
    function toggleSound() {
      muted = !muted;
      updateSoundButton();
      if (!muted) unlockAudio();
    }
    function appMuted() { return Boolean(window.NEWPLAYGROUND_MUTED || window.NP_Audio?.isMuted); }
    function updateSoundButton() {
      const button = el('p72Sound'), appIsMuted = appMuted();
      button.disabled = appIsMuted;
      button.setAttribute('aria-pressed', String(muted || appIsMuted));
      button.textContent = appIsMuted ? '♫ Ứng dụng đang tắt tiếng' : muted ? '♫ Âm thanh: tắt' : '♫ Âm thanh: bật';
    }

    listen(canvas, 'pointerdown', pointerDown);
    listen(canvas, 'pointermove', pointerMove);
    listen(window, 'pointerup', event => { pointerEnd(event); stopHeld(event); });
    listen(window, 'pointercancel', event => { pointerEnd(event); stopHeld(event); });
    listen(container, 'keydown', onKeyDown);
    listen(container, 'keyup', onKeyUp);
    listen(window, 'blur', () => { const status = model.view().status; if (status !== 'paused' && status !== 'won') model.pause(); clearHeld(); stopFrame(); draw(); hudStamp = ''; updateHud(); });
    listen(document, 'visibilitychange', () => { if (document.hidden && model.view().status !== 'paused' && model.view().status !== 'won') togglePause(); });
    listen(window, 'resize', resize);
    listen(el('p72Pause'), 'click', togglePause);
    listen(el('p72Restart'), 'click', restart);
    listen(el('p72Mode'), 'click', toggleMode);
    listen(el('p72Continue'), 'click', () => model.view().status === 'won' ? restart() : togglePause());
    listen(el('p72Sound'), 'click', toggleSound);
    for (const button of container.querySelectorAll('.p72-arrow')) {
      listen(button, 'pointerdown', event => startHeld(event, button));
      listen(button, 'lostpointercapture', event => stopHeld(event));
    }

    function destroy() {
      if (!alive) return;
      alive = false; clearHeld(); stopFrame(); container.classList.remove('p72-host');
      try { fallbackAudio?.close?.()?.catch?.(() => {}); } catch (_) {}
      fallbackAudio = null;
      container.replaceChildren();
    }
    function close() {
      if (typeof session.stop === 'function') session.stop();
      else destroy();
    }
    onCleanup(destroy);
    resize(); updateHud(); schedule();
    return { getModel: () => model, restart, togglePause, destroy: close };
  }

  return Object.freeze({ mount });
});
