/* Original compact foam-ball duel for the historical catalog route. */
(function () {
  'use strict';
  function mount(container, session) {
    const M = window.NP_RaftDuelModel;
    if (!M) throw new Error('Đấu Phao chưa sẵn sàng');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let model = M.create(), alive = true, paused = false, raf = null, last = 0;
    let pointerCharging = false, keyboardCharging = false, suppressClick = false;
    container.classList.add('rp-host');
    container.innerHTML = `
      <section class="rp-game" aria-label="Đấu Phao">
        <header class="rp-head"><h3>Đấu Phao</h3><button class="rp-icon" id="rpPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button></header>
        <div class="rp-hud"><div><span>Bạn</span><strong id="rpPlayerHp">● ● ●</strong></div><b>3 lượt chạm</b><div><span>Đối thủ</span><strong id="rpCpuHp">● ● ●</strong></div></div>
        <div class="rp-board-wrap"><canvas id="rpCanvas" class="rp-canvas" width="640" height="360" role="img" tabindex="0" aria-label="Hai bè phao đối đầu trên biển. Mũi tên lên xuống chỉnh góc. Giữ Space để nạp lực rồi thả để bắn."></canvas></div>
        <div class="rp-controls" role="group" aria-label="Điều khiển">
          <div class="rp-aim"><button class="rp-button" id="rpDown" type="button" aria-label="Hạ góc ngắm">−</button><span>Góc <strong id="rpAngle">35°</strong></span><button class="rp-button" id="rpUp" type="button" aria-label="Nâng góc ngắm">+</button></div>
          <div class="rp-charge"><progress id="rpPower" max="100" value="64" aria-label="Lực bắn"></progress><button class="rp-fire" id="rpFire" type="button" aria-label="Giữ để nạp lực, thả để bắn">Giữ Bắn</button></div>
          <button class="rp-button rp-restart" id="rpRestart" type="button" aria-label="Ván mới" title="Ván mới">↻</button>
        </div>
        <p class="rp-hint">↑ / ↓ ngắm · Giữ Bắn để nạp lực, thả để bắn</p>
        <p class="np-game-sr rp-live" id="rpLive" role="status" aria-live="polite" aria-atomic="true">Lượt của bạn.</p>
        <div class="rp-overlay" id="rpOverlay" hidden><strong id="rpOverlayText"></strong><button class="rp-button" id="rpOverlayAction" type="button">Tiếp tục</button></div>
        <details class="rp-help"><summary aria-label="Cách chơi">?</summary><p>↑ / ↓ đổi góc. Giữ Bắn hoặc Space để nạp lực, rồi thả ra. Đẩy đối thủ khỏi bè hoặc chạm ba lần để thắng.</p></details>
      </section>`;
    const el = id => container.querySelector('#' + id), canvas = el('rpCanvas'), ctx = canvas.getContext('2d'), fire = el('rpFire');
    function announce(text) { el('rpLive').textContent = text; }
    function stopFrame() { if (raf !== null) cancelAnimationFrame(raf); raf = null; }
    function sound(kind) {
      if (window.NEWPLAYGROUND_MUTED === true || window.NP_Audio?.isMuted) return;
      try { if (kind === 'hit') window.NP_AudioEngine?.playTone?.(390, 'triangle', .08, .015); else window.NP_AudioEngine?.playTone?.(kind === 'fire' ? 180 : 290, 'sine', .05, .012); } catch (_) {}
    }
    function events(list) {
      for (const event of list) {
        if (event.kind === 'fire') { sound('fire'); announce(event.side === 'player' ? 'Phao bay.' : 'Đối thủ đang bắn.'); }
        else if (event.kind === 'hit') { sound('hit'); announce(event.side === 'player' ? `Chạm trúng. Đối thủ còn ${event.hp} tim.` : `Bạn bị chạm. Còn ${event.hp} tim.`); }
        else if (event.kind === 'splash') { announce('Nước bắn tung tóe, bè bị đẩy.'); }
        else if (event.kind === 'miss') announce('Phao rơi xuống biển.');
        else if (event.kind === 'won') announce(event.knockoff ? 'Đối thủ rơi khỏi bè. Bạn thắng!' : 'Bạn thắng!');
        else if (event.kind === 'lost') announce(event.knockoff ? 'Bạn rơi khỏi bè.' : 'Đối thủ thắng.');
        else if (event.kind === 'turn' && event.side === 'player') announce('Lượt của bạn.');
      }
    }
    function drawActor(actor, side) {
      const direction = side === 'player' ? 1 : -1, y = 233;
      ctx.save(); ctx.translate(actor.x, y);
      ctx.fillStyle = actor.out ? '#7a9a9a' : side === 'player' ? '#ef8e4a' : '#6c83bd';
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c99a'; ctx.beginPath(); ctx.arc(0, -18, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = side === 'player' ? '#345d70' : '#38435c'; ctx.beginPath(); ctx.arc(0, -21, 10, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#263945'; ctx.beginPath(); ctx.arc(direction * 4, -18, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6d4937'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(direction * 5, -7); ctx.lineTo(direction * 13, -3); ctx.stroke();
      ctx.restore();
    }
    function drawDeck(deck, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(deck.left, 257); ctx.lineTo(deck.right, 257); ctx.lineTo(deck.right - 12, 277); ctx.lineTo(deck.left + 12, 277); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff7d6'; ctx.lineWidth = 2;
      for (let x = deck.left + 18; x < deck.right - 8; x += 24) { ctx.beginPath(); ctx.moveTo(x, 260); ctx.lineTo(x + 4, 274); ctx.stroke(); }
      ctx.fillStyle = '#fff7d6'; ctx.fillRect(deck.left + 8, 253, deck.right - deck.left - 16, 4);
    }
    function draw() {
      const v = model.view(), w = M.WIDTH, h = M.HEIGHT;
      ctx.clearRect(0, 0, w, h);
      const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#b6e5ef'); sky.addColorStop(.69, '#f8e9c2'); sky.addColorStop(.7, '#55b7c6'); sky.addColorStop(1, '#177d99');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f6c76d'; ctx.beginPath(); ctx.arc(535, 65, 25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff9c';
      for (const [x, y] of [[110, 70], [200, 102], [402, 88]]) { ctx.beginPath(); ctx.ellipse(x, y, 32, 9, 0, 0, Math.PI * 2); ctx.ellipse(x + 16, y - 6, 20, 11, 0, 0, Math.PI * 2); ctx.fill(); }
      for (let y = M.WATER_Y + 12; y < h; y += 19) {
        ctx.strokeStyle = y % 2 ? '#a8e7dc88' : '#0b607a66'; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = 0; x <= w; x += 48) { const offset = Math.sin((x + y * 2) * .035) * 5; if (!x) ctx.moveTo(x, y + offset); else ctx.lineTo(x, y + offset); } ctx.stroke();
      }
      drawDeck(v.playerDeck, '#e38a55'); drawDeck(v.cpuDeck, '#6c8db0');
      drawActor(v.player, 'player'); drawActor(v.cpu, 'cpu');
      if (v.status === 'playing' && v.turn === 'player' && !v.projectile) {
        const angle = v.player.angle * Math.PI / 180, power = v.charging ? v.player.power : Math.max(58, v.player.power), speed = 4.8 + power * .061;
        let x = v.player.x + 16, y = 246, vx = Math.cos(angle) * speed, vy = -Math.sin(angle) * speed;
        ctx.strokeStyle = '#ffffffbd'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x, y);
        for (let n = 0; n < 28; n++) { x += vx * .7; y += vy * .7; vy += .23 * .7; if (n % 2 === 0) ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      }
      if (v.projectile) {
        ctx.fillStyle = v.projectile.side === 'player' ? '#ffefb0' : '#d5e2ff'; ctx.strokeStyle = '#53747a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(v.projectile.x, v.projectile.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#355461'; ctx.font = '700 12px Calibri, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(v.turn === 'player' ? 'BÈ CỦA BẠN' : 'LƯỢT ĐỐI THỦ', 320, 23);
    }
    function update() {
      const v = model.view(), busy = paused || v.status !== 'playing' || v.turn !== 'player' || Boolean(v.projectile);
      el('rpPlayerHp').textContent = '● '.repeat(v.player.hp).trim() || '—';
      el('rpCpuHp').textContent = '● '.repeat(v.cpu.hp).trim() || '—';
      el('rpAngle').textContent = `${v.player.angle}°`;
      el('rpPower').value = v.player.power;
      el('rpPower').setAttribute('aria-valuenow', String(v.player.power));
      el('rpPower').setAttribute('aria-valuetext', `${v.player.power}%`);
      el('rpDown').disabled = busy || v.charging || v.player.angle <= M.MIN_ANGLE;
      el('rpUp').disabled = busy || v.charging || v.player.angle >= M.MAX_ANGLE;
      fire.disabled = busy;
      el('rpPause').disabled = v.status !== 'playing';
      el('rpPause').textContent = paused ? '▶' : 'Ⅱ';
      el('rpPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('rpOverlay').hidden = !(paused || v.status !== 'playing');
      el('rpOverlayText').textContent = paused ? 'Đã tạm dừng' : v.status === 'won' ? 'Bạn thắng!' : 'Đối thủ thắng';
      el('rpOverlayAction').textContent = paused ? 'Tiếp tục' : 'Chơi lại';
      el('rpRestart').disabled = false;
      draw();
    }
    function cancelCharge() { pointerCharging = false; keyboardCharging = false; if (model.cancelCharge()) update(); }
    function pause(message = 'Đã tạm dừng.') {
      if (paused || model.view().status !== 'playing') return;
      cancelCharge(); paused = true; stopFrame(); update(); announce(message); el('rpOverlayAction').focus();
    }
    function frame(now) {
      raf = null; if (!alive || paused) return;
      if (last) { const dt = now - last; if (dt > 150) { pause('Đã tạm dừng khi quay lại.'); return; } events(model.advance(Math.max(0, dt))); }
      last = now; update();
      if (model.view().status === 'playing') raf = requestAnimationFrame(frame);
      else { stopFrame(); el('rpOverlayAction').focus(); }
    }
    function start() { if (!alive || document.hidden || model.view().status !== 'playing') return; paused = false; last = 0; update(); raf = requestAnimationFrame(frame); }
    function act(action) { if (paused || model.view().status !== 'playing') return false; const ok = action(); update(); return ok; }
    function reset() { model = M.create(); paused = false; pointerCharging = false; keyboardCharging = false; suppressClick = false; last = 0; stopFrame(); announce('Lượt của bạn.'); start(); }
    function releasePointer(e) {
      if (!pointerCharging) return;
      pointerCharging = false;
      suppressClick = e?.target === fire || fire.contains(e?.target);
      if (!paused) { events(act(() => model.releaseCharge()) ? model.advance(0) : []); announce('Phao bay.'); }
    }
    listen(el('rpUp'), 'click', () => act(() => model.setAngle(model.view().player.angle + 2)));
    listen(el('rpDown'), 'click', () => act(() => model.setAngle(model.view().player.angle - 2)));
    listen(el('rpRestart'), 'click', reset);
    listen(el('rpPause'), 'click', () => paused ? start() : pause());
    listen(el('rpOverlayAction'), 'click', () => model.view().status === 'playing' ? start() : reset());
    listen(fire, 'pointerdown', e => { if (e.button !== undefined && e.button !== 0) return; e.preventDefault(); pointerCharging = act(() => model.beginCharge()); });
    listen(window, 'pointerup', releasePointer);
    listen(window, 'pointercancel', () => { if (pointerCharging) { cancelCharge(); announce('Bắn đã hủy.'); } });
    listen(fire, 'click', e => { if (suppressClick) { suppressClick = false; if (e.detail > 0) return; } if (!pointerCharging) act(() => model.tapFire()); });
    listen(container, 'keydown', e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target === el('rpUp') || e.target === el('rpDown')) return;
      const space = e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space';
      const focusedFire = e.target === fire;
      if (space) { if (e.target.tagName === 'BUTTON' && !focusedFire) return; e.preventDefault(); if (!keyboardCharging) keyboardCharging = act(() => model.beginCharge()); return; }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { if (e.target.tagName === 'BUTTON') return; e.preventDefault(); act(() => model.setAngle(model.view().player.angle + (e.key === 'ArrowUp' ? 1 : -1))); }
    });
    listen(container, 'keyup', e => {
      if (!(e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') || !keyboardCharging) return;
      keyboardCharging = false; events(act(() => model.releaseCharge()) ? model.advance(0) : []); announce('Phao bay.');
    });
    listen(window, 'blur', () => pause('Đã tạm dừng khi rời game.'));
    listen(window, 'pagehide', () => pause('Đã tạm dừng khi rời game.'));
    listen(document, 'visibilitychange', () => { if (document.hidden) pause('Đã tạm dừng khi ẩn thẻ.'); });
    onCleanup(() => { alive = false; pointerCharging = false; keyboardCharging = false; stopFrame(); container.classList.remove('rp-host'); });
    start();
    return { getModel: () => model, isPaused: () => paused };
  }
  window.NP_RaftDuel = { mount };
})();
