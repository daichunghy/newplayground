/* Standalone original shooter view. Load ban-ga-vu-tru-model.js first. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BanGaVuTru = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const CONTROL_KEYS = new Set(['arrowleft', 'arrowright', 'a', 'd', ' ']);
  const STAR_DOTS = Array.from({ length: 54 }, (_, i) => ({
    x: (i * 83 + 23) % 640, y: (i * 137 + 37) % 520,
    size: i % 7 === 0 ? 2.2 : 1.2, alpha: .24 + (i % 5) * .1
  }));

  function mount(container, session) {
    const M = window.NP_BanGaVuTruModel;
    if (!container || !M || !session?.listen || !session?.onCleanup) {
      throw new TypeError('Tuyến Sáng needs its model, container, and game session');
    }

    const { listen, requestAnimationFrame, cancelAnimationFrame, onCleanup } = session;
    let nextSeed = M.DEFAULT_SEED, model = M.create(nextSeed), alive = true, frame = null, lastFrame = null, hudStamp = '';
    const keys = new Set(), heldPointers = new Map();
    container.classList.add('bgt-host');
    container.innerHTML = `
      <link rel="stylesheet" href="scripts/games/ban-ga-vu-tru.css" data-bgt-styles>
      <section class="bgt-game" aria-label="Tuyến Sáng">
        <header class="bgt-header">
          <div class="bgt-title"><h2>Tuyến Sáng</h2></div>
          <div class="bgt-hud" aria-label="Trạng thái ván">
            <div><span>Điểm</span><strong id="bgtScore">0</strong></div>
            <div><span>Giây</span><strong id="bgtTime">60</strong></div>
            <div><span>Khiên</span><strong id="bgtHull">● ● ●</strong></div>
          </div>
        </header>
        <div class="bgt-wave-line"><strong id="bgtWave" aria-live="polite" aria-atomic="true">Chặng 1/3 · Mạch Sương</strong><span id="bgtWaveProgress">0/3</span></div>
        <div class="bgt-stage">
          <canvas class="bgt-canvas" id="bgtCanvas" width="640" height="520" tabindex="0" role="img"
            aria-label="Lái trái phải, giữ bắn, né tia cam. Hạ mục tiêu."
            aria-describedby="bgtHelp">Tàu điều khiển; khối sáng, tia cam.</canvas>
          <div class="bgt-overlay" id="bgtOverlay" hidden>
            <div class="bgt-card">
              <span class="bgt-card-mark" aria-hidden="true">✦</span>
              <h3 id="bgtOverlayTitle">Tạm dừng</h3>
              <p id="bgtOverlayText">Đường bay đang nghỉ.</p>
              <button class="bgt-button bgt-primary" id="bgtContinue" type="button">Chơi tiếp</button>
            </div>
          </div>
        </div>
        <p class="bgt-status" id="bgtStatus" role="status" aria-live="polite" aria-atomic="true">Hạ mục tiêu, né tia cam.</p>
        <div class="bgt-controls" aria-label="Điều khiển">
          <button class="bgt-button bgt-move" id="bgtLeft" type="button" aria-label="Di chuyển sang trái">←</button>
          <button class="bgt-button bgt-move" id="bgtRight" type="button" aria-label="Di chuyển sang phải">→</button>
          <button class="bgt-button bgt-fire" id="bgtFire" type="button" aria-label="Giữ để bắn">Bắn</button>
          <button class="bgt-button bgt-utility" id="bgtPause" type="button" aria-label="Tạm dừng">Ⅱ</button>
          <button class="bgt-button bgt-utility" id="bgtRestart" type="button" aria-label="Chơi lại">↻</button>
        </div>
        <p class="bgt-help" id="bgtHelp">← → / A D · Space/Bắn · P</p>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('bgtCanvas'), ctx = canvas?.getContext?.('2d');
    if (!ctx) {
      el('bgtOverlay').hidden = false;
      el('bgtOverlayTitle').textContent = 'Không mở được bàn chơi';
      el('bgtOverlayText').textContent = 'Trình duyệt này không bật canvas.';
      el('bgtContinue').hidden = true;
      onCleanup(() => container.classList.remove('bgt-host'));
      return null;
    }

    function resize() {
      const dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
      canvas.width = M.WIDTH * dpr; canvas.height = M.HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function path(points) {
      ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
    }

    function drawShip(player, view) {
      ctx.save(); ctx.translate(player.x, player.y);
      if (view.invulnerableTicks > 0 && Math.floor(view.ticks / 5) % 2 === 0) ctx.globalAlpha = .28;
      ctx.shadowColor = '#83f5df'; ctx.shadowBlur = 18;
      path([[0, -19], [10, -5], [17, 10], [6, 7], [0, 15], [-6, 7], [-17, 10], [-10, -5]]);
      const hull = ctx.createLinearGradient(-12, -14, 12, 12);
      hull.addColorStop(0, '#d6fff2'); hull.addColorStop(.52, '#69d9cf'); hull.addColorStop(1, '#38a6af');
      ctx.fillStyle = hull; ctx.fill(); ctx.shadowBlur = 0;
      path([[-5, -8], [0, -15], [5, -8], [3, 3], [-3, 3]]); ctx.fillStyle = '#182d43'; ctx.fill();
      ctx.fillStyle = '#ffd095'; ctx.globalAlpha *= .9;
      path([[-4, 12], [0, 20 + (view.ticks % 6 < 3 ? 2 : 0)], [4, 12]]); ctx.fill();
      ctx.restore();
    }

    function drawDrifter(drifter) {
      const colors = [
        { glow: '#ff9f84', fill: '#ec806f', core: '#fff0d2' },
        { glow: '#d7a1ff', fill: '#a987de', core: '#f5e5ff' },
        { glow: '#f6d17d', fill: '#d6a753', core: '#fff6d9' }
      ];
      const color = colors[drifter.tint % colors.length], r = drifter.radius;
      ctx.save(); ctx.translate(drifter.x, drifter.y); ctx.rotate((drifter.id % 2 ? 1 : -1) * (drifter.y * .006));
      ctx.shadowColor = color.glow; ctx.shadowBlur = 17;
      path([[0, -r], [r * .78, -r * .52], [r, r * .1], [r * .48, r * .88], [-r * .48, r * .88], [-r, r * .1], [-r * .78, -r * .52]]);
      ctx.fillStyle = color.fill; ctx.fill(); ctx.shadowBlur = 0;
      path([[0, -r * .53], [r * .42, 0], [0, r * .5], [-r * .42, 0]]); ctx.fillStyle = color.core; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.58)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-r * .48, r * .34); ctx.lineTo(0, r * .56); ctx.lineTo(r * .48, r * .34); ctx.stroke();
      ctx.restore();
    }

    function draw() {
      if (!alive) return;
      const v = model.view();
      ctx.clearRect(0, 0, M.WIDTH, M.HEIGHT);
      const sky = ctx.createLinearGradient(0, 0, 0, M.HEIGHT);
      const skies = [
        ['#101d36', '#182941', '#263b50'],
        ['#162038', '#23324b', '#3b4658'],
        ['#171b31', '#292f48', '#493b4c']
      ][v.waveIndex];
      sky.addColorStop(0, skies[0]); sky.addColorStop(.55, skies[1]); sky.addColorStop(1, skies[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, M.WIDTH, M.HEIGHT);
      const haze = ctx.createRadialGradient(M.WIDTH * .5, M.HEIGHT * .24, 5, M.WIDTH * .5, M.HEIGHT * .24, 290);
      haze.addColorStop(0, 'rgba(73, 155, 161, .14)'); haze.addColorStop(1, 'rgba(14, 29, 49, 0)');
      ctx.fillStyle = haze; ctx.fillRect(0, 0, M.WIDTH, M.HEIGHT);
      for (const star of STAR_DOTS) {
        ctx.fillStyle = `rgba(226, 241, 231, ${star.alpha})`;
        ctx.fillRect(star.x, (star.y + v.ticks * (star.size * .12)) % M.HEIGHT, star.size, star.size);
      }
      ctx.strokeStyle = 'rgba(205,228,221,.09)'; ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const y = 35 + i * 62 + (v.ticks * .34 % 62);
        ctx.beginPath(); ctx.moveTo(22, y); ctx.lineTo(64, y); ctx.moveTo(M.WIDTH - 64, y); ctx.lineTo(M.WIDTH - 22, y); ctx.stroke();
      }

      for (const shot of v.shots) {
        ctx.save(); ctx.strokeStyle = '#a7ffe8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.shadowColor = '#72f5dd'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(shot.x, shot.y + 7); ctx.lineTo(shot.x, shot.y - 6); ctx.stroke(); ctx.restore();
      }
      for (const bolt of v.hostileBolts) {
        ctx.save(); ctx.fillStyle = '#ff9b76'; ctx.shadowColor = '#ff7e6d'; ctx.shadowBlur = 13;
        ctx.beginPath(); ctx.ellipse(bolt.x, bolt.y, 4.3, 7.2, Math.atan2(bolt.vy, bolt.vx), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (const drifter of v.drifters) drawDrifter(drifter);
      drawShip(v.player, v);
      ctx.strokeStyle = 'rgba(164, 237, 222, .28)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(16, M.HEIGHT - 29); ctx.lineTo(M.WIDTH - 16, M.HEIGHT - 29); ctx.stroke();
    }

    function updateHud(force = false) {
      if (!alive) return;
      const v = model.view();
      const stamp = [v.status, v.score, v.hull, v.remainingSeconds, v.waveIndex, v.waveKills, v.waveBreakTicks].join('|');
      if (!force && stamp === hudStamp) return;
      hudStamp = stamp;
      el('bgtScore').textContent = String(v.score);
      el('bgtTime').textContent = String(v.remainingSeconds);
      el('bgtHull').textContent = Array.from({ length: M.MAX_HULL }, (_, i) => i < v.hull ? '●' : '○').join(' ');
      el('bgtWave').textContent = `Chặng ${v.waveNumber}/3 · ${v.wave.name}`;
      el('bgtWave').setAttribute('aria-label', `Chặng ${v.waveNumber} trong 3: ${v.wave.name}`);
      el('bgtWaveProgress').textContent = `${v.waveKills}/${v.waveGoal}`;
      el('bgtWaveProgress').setAttribute('aria-label', `${v.waveKills} trên ${v.waveGoal} mục tiêu`);
      container.dataset.wave = String(v.waveIndex);
      const terminal = ['over', 'complete', 'won'].includes(v.status);
      el('bgtPause').disabled = terminal;
      const paused = v.status === 'paused';
      el('bgtOverlay').hidden = !(terminal || paused);
      el('bgtOverlayTitle').textContent = terminal ? (v.status === 'won' ? 'Đã dọn tuyến!' : v.status === 'complete' ? 'Hết giờ' : 'Tàu đã dừng') : 'Tạm dừng';
      el('bgtOverlayText').textContent = terminal
        ? v.status === 'won' ? `Hạ đủ ${v.kills} mục tiêu · ${v.score} điểm.` : `Hạ ${v.kills}/${v.campaignGoal} mục tiêu · ${v.score} điểm.`
        : 'Đường bay đang nghỉ.';
      el('bgtContinue').textContent = terminal ? 'Chơi lại' : 'Chơi tiếp';
      if (terminal) el('bgtStatus').textContent = v.status === 'won'
        ? `Đã dọn đủ ba chặng · ${v.kills} mục tiêu · ${v.score} điểm.`
        : `${v.status === 'complete' ? 'Hết giờ' : 'Tàu đã dừng'} · ${v.kills}/${v.campaignGoal} mục tiêu · ${v.score} điểm.`;
      else if (paused) el('bgtStatus').textContent = 'Đang tạm dừng.';
    }

    function schedule() {
      if (alive && model.view().status === 'playing' && frame === null) frame = requestAnimationFrame(tickFrame);
    }
    function tickFrame(now) {
      frame = null;
      if (!alive || model.view().status !== 'playing') return;
      if (lastFrame === null) lastFrame = now;
      const elapsed = Math.min(100, Math.max(0, now - lastFrame));
      lastFrame = now;
      const events = model.advance(elapsed);
      for (const event of events) {
        if (event.kind === 'wave-cleared') {
          const next = model.view();
          el('bgtStatus').textContent = `Đã qua ${M.WAVES[event.wave - 1].name} · ${next.wave.name} sau 1,5 giây.`;
        } else if (event.kind === 'hull-hit') {
          el('bgtStatus').textContent = `Tàu trúng tia · còn ${event.hull} khiên.`;
        }
      }
      draw(); updateHud(); schedule();
    }

    function refreshInput() {
      const left = keys.has('arrowleft') || keys.has('a') || [...heldPointers.values()].includes('left');
      const right = keys.has('arrowright') || keys.has('d') || [...heldPointers.values()].includes('right');
      const firing = keys.has(' ') || [...heldPointers.values()].includes('fire');
      model.setAxis(Number(right) - Number(left)); model.setFiring(firing);
    }
    function releaseInputs() { keys.clear(); heldPointers.clear(); refreshInput(); }
    function togglePause() {
      const v = model.view();
      if (v.status === 'playing') {
        model.pause(); releaseInputs();
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; lastFrame = null;
      } else if (v.status === 'paused') {
        model.resume(); lastFrame = null; canvas.focus?.({ preventScroll: true }); schedule();
      } else return;
      draw(); updateHud(true);
    }
    function restart() {
      if (!alive) return;
      nextSeed = (nextSeed + 0x9e3779b9) >>> 0;
      model = M.create(nextSeed);
      releaseInputs(); lastFrame = null; hudStamp = '';
      draw(); updateHud(true); canvas.focus?.({ preventScroll: true }); schedule();
    }

    function bindHold(button, action) {
      const down = event => {
        event.preventDefault?.();
        if (model.view().status !== 'playing') return;
        const id = event.pointerId ?? 'primary';
        heldPointers.set(id, action); refreshInput(); canvas.focus?.({ preventScroll: true });
      };
      const release = event => {
        const id = event?.pointerId ?? 'primary';
        if (heldPointers.delete(id)) refreshInput();
      };
      listen(button, 'pointerdown', down);
      listen(window, 'pointerup', release);
      listen(window, 'pointercancel', release);
      listen(button, 'lostpointercapture', release);
      listen(button, 'contextmenu', event => event.preventDefault?.());
    }

    bindHold(el('bgtLeft'), 'left'); bindHold(el('bgtRight'), 'right'); bindHold(el('bgtFire'), 'fire');
    listen(container, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const key = String(event.key || '').toLowerCase();
      if (key === 'p' || key === 'escape') { event.preventDefault?.(); togglePause(); return; }
      if (key === 'r') { event.preventDefault?.(); restart(); return; }
      if (!CONTROL_KEYS.has(key)) return;
      event.preventDefault?.(); keys.add(key); refreshInput();
    });
    listen(container, 'keyup', event => {
      const key = String(event.key || '').toLowerCase();
      if (!CONTROL_KEYS.has(key)) return;
      event.preventDefault?.(); keys.delete(key); refreshInput();
    });
    listen(el('bgtPause'), 'click', togglePause);
    listen(el('bgtRestart'), 'click', restart);
    listen(el('bgtContinue'), 'click', () => {
      if (['over', 'complete', 'won'].includes(model.view().status)) restart();
      else togglePause();
    });
    listen(window, 'blur', () => { if (model.view().status === 'playing') togglePause(); else releaseInputs(); });
    listen(document, 'visibilitychange', () => {
      if (document.hidden && model.view().status === 'playing') togglePause();
    });
    listen(window, 'resize', resize);
    listen(window, 'pagehide', () => { if (model.view().status === 'playing') togglePause(); else releaseInputs(); });
    onCleanup(() => {
      alive = false; releaseInputs();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; container.classList.remove('bgt-host');
    });

    resize(); updateHud(true); canvas.focus?.({ preventScroll: true }); schedule();
    return { getModel: () => model, restart, pause: togglePause };
  }

  return Object.freeze({ mount });
});
