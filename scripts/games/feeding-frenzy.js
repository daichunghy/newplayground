/* Original small-fish growth arcade. No copied characters, levels or audio. */
(function () {
  'use strict';

  function mount(container, session, audio) {
    const M = window.NP_FeedingFrenzyModel;
    if (!M || !session) throw new Error('Cá Lớn Nuốt Cá Bé is not ready');
    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let game = M.create(), alive = true, paused = false, frameId = null, previous = 0;
    let pointerActive = false, pointer = { x: M.WIDTH / 2, y: M.HEIGHT / 2 };
    const keys = new Set();
    let previousEvent = '';
    container.classList.add('feeding-host');
    container.innerHTML = `
      <section class="feeding-game" aria-label="Cá Lớn Nuốt Cá Bé">
        <header class="feeding-head"><h3>Cá Lớn Nuốt Cá Bé</h3><div class="feeding-actions"><button class="feeding-btn" id="feedingPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button><button class="feeding-btn" id="feedingRestart" type="button" aria-label="Chơi lại" title="Chơi lại">↻</button></div></header>
        <div class="feeding-hud"><div><span>Điểm</span><strong id="feedingScore">0 / ${M.TARGET}</strong></div><div><span>Cỡ cá</span><strong id="feedingSize">Nhỏ</strong></div><div><span>Lượt</span><strong id="feedingLives">3</strong></div><div><span>Thời gian</span><strong id="feedingClock">90s</strong></div></div>
        <div class="feeding-board"><canvas id="feedingCanvas" width="${M.WIDTH}" height="${M.HEIGHT}" tabindex="0" role="application" aria-label="Đại dương. Dùng phím mũi tên hoặc WASD, hoặc giữ và rê chuột hay ngón tay để bơi. Ăn cá nhỏ hơn, tránh cá lớn hơn."></canvas><div class="feeding-overlay" id="feedingOverlay" hidden><strong id="feedingResult"></strong><button class="feeding-btn" id="feedingAgain" type="button">Chơi lại</button></div></div>
        <p class="feeding-goal">Ăn cá nhỏ để lớn lên. Tránh cá lớn hơn.</p>
        <p class="np-game-sr" id="feedingStatus" role="status" aria-live="polite" aria-atomic="true">Bơi và ăn 12 cá nhỏ.</p>
        <details class="feeding-help"><summary aria-label="Cách chơi">?</summary><p>Dùng mũi tên/WASD hoặc giữ rê để bơi. Chỉ ăn cá nhỏ hơn bạn.</p></details>
      </section>`;
    const el = id => container.querySelector('#' + id), canvas = el('feedingCanvas'), ctx = canvas.getContext('2d');
    const sizes = ['Nhỏ', 'Vừa', 'Lớn'];
    function sound(type) { if (window.NEWPLAYGROUND_MUTED === true || window.NP_Audio?.isMuted) return; try { audio?.playTone?.(type === 'hit' ? 160 : 520, type === 'hit' ? 'sawtooth' : 'sine', .055, .012); } catch (_) {} }
    function announce(text) { el('feedingStatus').textContent = text; }
    function input() {
      let x = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
      let y = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
      if (x || y) return { x, y };
      if (!pointerActive) return { x: 0, y: 0 };
      const player = game.view().player, dx = pointer.x - player.x, dy = pointer.y - player.y;
      return Math.hypot(dx, dy) < 14 ? { x: 0, y: 0 } : { x: dx, y: dy };
    }
    function draw() {
      const v = game.view(), w = M.WIDTH, h = M.HEIGHT;
      const water = ctx.createLinearGradient(0, 0, 0, h); water.addColorStop(0, '#90dbea'); water.addColorStop(.55, '#258eaa'); water.addColorStop(1, '#12566c');
      ctx.fillStyle = water; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i += 1) { const x = (i * 91 + v.time * (7 + i % 3)) % w; const y = (i * 57 + v.time * 11) % (h - 35); ctx.strokeStyle = '#e2ffff55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5 + (i % 3) * 2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#d4bd84'; ctx.fillRect(0, h - 16, w, 16);
      for (let i = 0; i < 22; i += 1) { ctx.fillStyle = i % 2 ? '#f5dfa2' : '#b39a68'; ctx.fillRect((i * 47) % w, h - 7 - (i % 3) * 4, 3, 2); }
      function fish(x, y, radius, color, direction, eye = true) {
        ctx.save(); ctx.translate(x, y); ctx.scale(direction < 0 ? -1 : 1, 1); ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.35, radius * .78, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-radius, 0); ctx.lineTo(-radius * 1.9, -radius * .75); ctx.lineTo(-radius * 1.9, radius * .75); ctx.closePath(); ctx.fill();
        if (eye) { ctx.fillStyle = '#fff8df'; ctx.beginPath(); ctx.arc(radius * .72, -radius * .2, Math.max(2, radius * .22), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#214654'; ctx.beginPath(); ctx.arc(radius * .78, -radius * .2, Math.max(1, radius * .1), 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-radius * .2, 0); ctx.quadraticCurveTo(0, radius * .3, radius * .4, 0); ctx.stroke(); ctx.restore();
      }
      for (const item of v.fish) fish(item.x, item.y, item.radius, item.kind === 'predator' ? '#b45d69' : ['#f4d35e', '#68c69c', '#f49c62'][Math.min(2, item.tier)], item.vx >= 0 ? 1 : -1);
      const blink = v.player.invulnerable > 0 && Math.floor(v.time * 12) % 2 === 0;
      if (!blink) fish(v.player.x, v.player.y, v.player.radius, ['#f5a742', '#ffd36d', '#ffe58f'][v.tier - 1], v.player.facing);
      if (v.event === 'hit') { ctx.strokeStyle = '#fff5b4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(v.player.x, v.player.y, v.player.radius + 7, 0, Math.PI * 2); ctx.stroke(); }
    }
    function stopFrame() { if (frameId !== null) cancelAnimationFrame(frameId); frameId = null; }
    function update() {
      const v = game.view(), terminal = v.status !== 'playing';
      el('feedingScore').textContent = `${v.score} / ${M.TARGET}`; el('feedingSize').textContent = sizes[v.tier - 1]; el('feedingLives').textContent = String(v.lives); el('feedingClock').textContent = `${Math.ceil(Math.max(0, M.DURATION - v.time))}s`;
      el('feedingPause').disabled = terminal; el('feedingPause').textContent = paused ? '▶' : 'Ⅱ'; el('feedingPause').setAttribute('aria-label', paused ? 'Tiếp tục' : 'Tạm dừng');
      el('feedingOverlay').hidden = !(paused || terminal); el('feedingResult').textContent = terminal ? (v.status === 'won' ? 'Bạn đã lớn nhất!' : v.status === 'lost' ? 'Hết lượt rồi.' : 'Hết giờ rồi.') : 'Đã tạm dừng';
      el('feedingAgain').textContent = terminal ? 'Chơi lại' : 'Tiếp tục'; draw();
    }
    function frame(time) {
      frameId = null; if (!alive || paused) return;
      if (previous) { const dt = time - previous; if (dt > 160) { pause('Đã tạm dừng khi quay lại.'); return; } game.step(Math.max(0, dt / 1000), input()); const v = game.view(); if (v.event && v.event !== previousEvent) { sound(v.event === 'hit' ? 'hit' : 'eat'); if (v.event === 'hit') announce('Trúng cá lớn. Còn ' + v.lives + ' lượt.'); else if (v.event === 'win') announce('Bạn đã lớn nhất!'); else announce('Ăn được cá nhỏ.'); } previousEvent = v.event; if (v.status === 'timeout') announce('Hết giờ rồi.'); if (v.status === 'lost') announce('Hết lượt rồi.'); }
      previous = time; update(); if (game.view().status === 'playing') frameId = requestAnimationFrame(frame); else { stopFrame(); el('feedingAgain').focus?.(); }
    }
    function start() { if (!alive || game.view().status !== 'playing' || document.hidden) return; paused = false; previous = 0; update(); canvas.focus?.({ preventScroll: true }); frameId = requestAnimationFrame(frame); }
    function pause(text = 'Đã tạm dừng.') { if (paused || game.view().status !== 'playing') return; paused = true; keys.clear(); pointerActive = false; stopFrame(); update(); announce(text); el('feedingAgain').focus?.(); }
    function restart() { game = M.create(); paused = false; previous = 0; keys.clear(); pointerActive = false; previousEvent = ''; stopFrame(); announce('Bơi và ăn 12 cá nhỏ.'); start(); }
    function canvasPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; }
    listen(canvas, 'pointerdown', event => { if (event.button !== undefined && event.button !== 0) return; event.preventDefault(); canvas.focus?.({ preventScroll: true }); pointer = canvasPoint(event); pointerActive = true; });
    listen(window, 'pointermove', event => { if (!pointerActive) return; pointer = canvasPoint(event); });
    listen(window, 'pointerup', () => { pointerActive = false; }); listen(canvas, 'pointercancel', () => { pointerActive = false; });
    listen(canvas, 'keydown', event => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(key)) { event.preventDefault(); keys.add(key); } });
    listen(window, 'keyup', event => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; keys.delete(key); });
    listen(canvas, 'blur', () => keys.clear());
    listen(el('feedingPause'), 'click', () => paused ? start() : pause()); listen(el('feedingRestart'), 'click', restart);
    listen(el('feedingAgain'), 'click', () => game.view().status === 'playing' ? start() : restart());
    listen(window, 'blur', () => pause('Đã tạm dừng khi mất tiêu điểm.'));
    listen(document, 'visibilitychange', () => { if (document.hidden) pause('Đã tạm dừng khi chuyển tab.'); });
    onCleanup(() => { alive = false; keys.clear(); stopFrame(); container.classList.remove('feeding-host'); });
    update(); frameId = requestAnimationFrame(frame);
    return { getModel: () => game, isPaused: () => paused };
  }
  window.NP_FeedingFrenzy = Object.freeze({ mount });
})();
