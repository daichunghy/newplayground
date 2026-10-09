/* Original, canvas-based can-toppling game view for Sân Bụi. */
(function (root) {
  'use strict';

  function mount(container, session, audio = null, options = {}) {
    const M = root.NP_SanBuiModel;
    if (!M || !container || !session || typeof session.listen !== 'function' ||
        typeof session.onCleanup !== 'function' || typeof session.requestAnimationFrame !== 'function') {
      throw new Error('Sân Bụi needs its model and an active game session');
    }
    const { listen, onCleanup, requestAnimationFrame, cancelAnimationFrame } = session;
    const seedFactory = typeof options.seedFactory === 'function' ? options.seedFactory : () => {
      try {
        const values = new Uint32Array(1); root.crypto?.getRandomValues?.(values);
        if (values[0]) return values[0];
      } catch (_) { /* Fall back to local randomness when crypto is unavailable. */ }
      return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
    };
    let seed = (Number(seedFactory()) >>> 0) || 1;
    const newModel = () => M.create({ seed });
    let model = newModel(), alive = true, paused = false, frame = null, lastFrame = null;
    let message = 'Chỉnh góc và lực, rồi ném. ← → ngắm · ↑ ↓ chỉnh lực · Space ném.';
    container.classList.add('sb-host');
    container.innerHTML = `
      <section class="sb-game" aria-label="Sân Bụi">
        <header class="sb-header">
          <div><p class="sb-eyebrow">Thử một cú ném</p><h2>Sân Bụi</h2></div>
          <div class="sb-header-actions">
            <button class="sb-button sb-icon" id="sbPause" type="button" aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
            <button class="sb-button sb-icon" id="sbRestart" type="button" aria-label="Chơi lại từ đầu" title="Chơi lại">↻</button>
          </div>
        </header>
        <div class="sb-hud" aria-label="Tiến độ">
          <div><span>Chặng</span><strong id="sbStage">Vạt nắng · 1/3</strong></div>
          <div><span>Lon ngã</span><strong id="sbKnocked">0 / 3</strong></div>
          <div><span>Cú ném</span><strong id="sbThrows">3</strong></div>
        </div>
        <div class="sb-stage-strip" id="sbStageStrip" role="group" aria-label="Ba chặng sân">
          ${M.STAGES.map((stage, i) => `<span class="sb-stage-dot" id="sbStageDot${i}" aria-label="Chặng ${i + 1}: ${stage.name}">${i + 1}</span>`).join('')}
        </div>
        <div class="sb-court">
          <canvas id="sbCanvas" width="760" height="430" tabindex="0" role="img" aria-label="Sân đất nắng, một chồng lon và vạch ném. Nhấp sân để chỉnh hướng ngắm."></canvas>
        </div>
        <div class="sb-sliders" role="group" aria-label="Ngắm và lực ném">
          <label class="sb-range"><span>Góc <strong id="sbAngleValue">25°</strong></span><input id="sbAngle" type="range" min="10" max="70" step="1" value="25" aria-label="Góc ném"></label>
          <label class="sb-range"><span>Lực <strong id="sbPowerValue">72%</strong></span><input id="sbPower" type="range" min="35" max="100" step="1" value="72" aria-label="Lực ném"></label>
        </div>
        <div class="sb-controls" role="group" aria-label="Điều khiển">
          <div class="sb-pad" aria-label="Chỉnh góc và lực">
            <button class="sb-button sb-up" id="sbPowerUp" type="button" aria-label="Tăng lực">＋</button>
            <button class="sb-button" id="sbAimDown" type="button" aria-label="Hạ góc">◀</button>
            <button class="sb-button" id="sbPowerDown" type="button" aria-label="Giảm lực">－</button>
            <button class="sb-button" id="sbAimUp" type="button" aria-label="Tăng góc">▶</button>
          </div>
          <button class="sb-button sb-fire" id="sbFire" type="button"><span aria-hidden="true">↗</span> Ném</button>
        </div>
        <p class="sb-status" id="sbStatus" role="status" aria-live="polite" aria-atomic="true"></p>
        <details class="sb-help"><summary>Luật chơi</summary><p>Hạ đủ số lon trong tối đa ba cú ném mỗi chặng. Chỉnh góc và lực; bóng cùng lon chuyển động theo quỹ đạo và va chạm. Chạm sân để ngắm nhanh, hoặc dùng thanh trượt, nút và bàn phím.</p></details>
        <div class="sb-overlay" id="sbOverlay" hidden role="group" aria-label="Tạm dừng hoặc kết quả">
          <div class="sb-overlay-card"><strong id="sbOverlayTitle"></strong><p id="sbOverlayText"></p><button class="sb-button sb-primary" id="sbOverlayAction" type="button">Tiếp tục</button></div>
        </div>
      </section>`;

    const el = id => container.querySelector('#' + id);
    const canvas = el('sbCanvas'), ctx = canvas.getContext('2d');
    const palette = ['#d96b43', '#e1a544', '#71936c', '#668c98'];
    const sky = ctx.createLinearGradient(0, 0, 0, M.HEIGHT);
    sky.addColorStop(0, '#b8d8d1'); sky.addColorStop(.58, '#f4d7a4'); sky.addColorStop(1, '#f3ca86');
    function announce(text) { message = text; el('sbStatus').textContent = text; }
    function roundRect(x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius); ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h); ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius); ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
    }
    function canShape(can, size) {
      ctx.save(); ctx.translate(can.x, can.y); ctx.rotate(can.spin || 0);
      const color = palette[can.tint % palette.length];
      ctx.fillStyle = '#283f3970'; ctx.beginPath(); ctx.ellipse(2, size.height * .58, size.width * .6, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.strokeStyle = '#624f3d'; ctx.lineWidth = 1.6;
      roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff5d6a8'; roundRect(-size.width / 2 + 4, -size.height / 2 + 4, 3, size.height - 8, 2); ctx.fill();
      ctx.strokeStyle = '#f0d29a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -size.height / 2 + 1, size.width * .45, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    function drawThrower(launch) {
      ctx.save(); ctx.translate(launch.x - 27, launch.y - 4);
      ctx.fillStyle = '#315462'; roundRect(-10, -37, 21, 35, 8); ctx.fill();
      ctx.strokeStyle = '#314b48'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(-10, 11); ctx.moveTo(7, -3); ctx.lineTo(15, 10); ctx.stroke();
      ctx.fillStyle = '#c98760'; ctx.beginPath(); ctx.arc(0, -45, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0a949'; ctx.beginPath(); ctx.arc(0, -49, 13, Math.PI, Math.PI * 2); ctx.lineTo(13, -46); ctx.lineTo(-12, -46); ctx.fill();
      ctx.restore();
    }
    function drawScene(view) {
      ctx.save(); ctx.clearRect(0, 0, M.WIDTH, M.HEIGHT); ctx.fillStyle = sky; ctx.fillRect(0, 0, M.WIDTH, M.HEIGHT);
      ctx.fillStyle = '#fff5d6'; ctx.beginPath(); ctx.arc(635, 72, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8ebbb0'; ctx.beginPath(); ctx.moveTo(0, 257); ctx.quadraticCurveTo(114, 187, 238, 246); ctx.quadraticCurveTo(339, 184, 473, 246); ctx.lineTo(570, 224); ctx.lineTo(760, 268); ctx.lineTo(760, M.HEIGHT); ctx.lineTo(0, M.HEIGHT); ctx.fill();
      ctx.fillStyle = '#d9ae70'; ctx.fillRect(0, view.floor, M.WIDTH, M.HEIGHT - view.floor);
      ctx.fillStyle = '#bc8d57'; ctx.fillRect(0, view.floor + 11, M.WIDTH, M.HEIGHT - view.floor - 11);
      ctx.strokeStyle = '#fff0ce'; ctx.lineWidth = 3; ctx.setLineDash([11, 9]);
      ctx.beginPath(); ctx.moveTo(252, view.floor - 2); ctx.lineTo(252, view.floor - 38); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#865b37'; ctx.font = '600 15px Calibri, Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VẠCH NÉM', 252, view.floor + 31);
      ctx.fillStyle = '#f2d18e'; roundRect(view.targetCenter - 99, view.floor - view.stage.rows * view.canSize.height - 10, 198, 12, 6); ctx.fill();
      if (view.phase === 'aiming') {
        const points = view.trajectory;
        ctx.save(); ctx.strokeStyle = '#fbf5e5c9'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
        ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke(); ctx.restore();
      }
      drawThrower(view.launch);
      view.cans.forEach(can => canShape(can, view.canSize));
      if (view.ball) {
        ctx.fillStyle = '#faf2d9'; ctx.strokeStyle = '#8b6847'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(view.ball.x, view.ball.y, view.ballRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#cf8557'; ctx.beginPath(); ctx.arc(view.ball.x - 2, view.ball.y - 2, 3, 0, Math.PI * 2); ctx.fill();
      } else if (view.phase === 'aiming') {
        ctx.fillStyle = '#faf2d9'; ctx.strokeStyle = '#8b6847'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(view.launch.x, view.launch.y, view.ballRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.textAlign = 'left'; ctx.fillStyle = '#34504a'; ctx.font = '700 14px Calibri, Inter, sans-serif';
      ctx.fillText(view.stage.name.toLocaleUpperCase('vi-VN'), 22, 28);
      ctx.restore();
    }
    function render() {
      if (!alive) return;
      const view = model.view(), playable = view.status === 'playing';
      drawScene(view);
      el('sbStage').textContent = `${view.stage.name} · ${view.stageIndex + 1}/${view.stages.length}`;
      el('sbKnocked').textContent = `${view.knocked} / ${view.goal}`;
      el('sbThrows').textContent = String(view.throwsLeft);
      el('sbAngle').value = String(view.angle); el('sbAngleValue').textContent = `${view.angle}°`;
      el('sbPower').value = String(view.power); el('sbPowerValue').textContent = `${view.power}%`;
      view.stages.forEach((_, index) => {
        el(`sbStageDot${index}`).classList.toggle('sb-dot-current', index === view.stageIndex && view.status !== 'won');
        el(`sbStageDot${index}`).classList.toggle('sb-dot-done', index < view.stageIndex || view.status === 'won');
      });
      ['sbAngle', 'sbPower', 'sbAimDown', 'sbAimUp', 'sbPowerDown', 'sbPowerUp', 'sbFire', 'sbPause'].forEach(id => { el(id).disabled = !playable; });
      el('sbOverlay').hidden = view.status === 'playing' && !paused;
      if (paused || view.status === 'paused') {
        el('sbOverlayTitle').textContent = 'Đã tạm dừng';
        el('sbOverlayText').textContent = 'Sân chơi đang chờ bạn.';
        el('sbOverlayAction').textContent = 'Tiếp tục';
      } else if (view.status === 'won') {
        el('sbOverlayTitle').textContent = 'Hạ đủ lon cả ba chặng!';
        el('sbOverlayText').textContent = `${view.score / 100} lon ngã · ${view.totalThrows} cú ném.`;
        el('sbOverlayAction').textContent = 'Chơi lại';
      } else if (view.status === 'lost') {
        el('sbOverlayTitle').textContent = 'Chưa đủ lon ở chặng này.';
        el('sbOverlayText').textContent = `${view.knocked} / ${view.goal} lon ngã.`;
        el('sbOverlayAction').textContent = 'Chơi lại';
      }
      el('sbStatus').textContent = message;
    }
    function schedule() {
      if (!alive || paused || frame !== null || model.view().status !== 'playing') return;
      const phase = model.view().phase;
      if (phase !== 'flight' && phase !== 'settling') return;
      frame = requestAnimationFrame(loop);
    }
    function processEvents(events) {
      for (const event of events) {
        if (event.kind === 'knock') announce(`Lon ngã · ${event.count}.`);
        else if (event.kind === 'land') announce('Bóng chạm đất. Lon đang đổ…');
        else if (event.kind === 'ready') announce(`Còn ${event.remaining} cú ném. ${event.knocked} lon đã ngã; chỉnh lại góc và lực.`);
        else if (event.kind === 'stage-clear') announce('Đạt mục tiêu. Chặng tiếp theo!');
        else if (event.kind === 'won') announce('Sân đã thông thoáng! Bạn hạ đủ lon cả ba chặng.');
        else if (event.kind === 'lost') announce('Hết cú ném. Chơi lại để thử hướng khác.');
      }
    }
    function loop(timestamp) {
      frame = null;
      if (!alive || paused || model.view().status !== 'playing') return;
      const delta = lastFrame === null ? M.STEP_MS : Math.max(0, Math.min(120, timestamp - lastFrame));
      lastFrame = timestamp;
      processEvents(model.advance(delta)); render(); schedule();
    }
    function cancelLoop() { if (frame !== null) cancelAnimationFrame(frame); frame = null; lastFrame = null; }
    function fire() {
      if (!alive || paused || !model.throwBall()) return false;
      announce('Cú ném đang bay…'); render(); schedule(); return true;
    }
    function pause(messageText = 'Đã tạm dừng.') {
      if (!alive || paused || model.view().status !== 'playing') return false;
      paused = true; model.pause(); cancelLoop(); announce(messageText); render(); el('sbOverlayAction').focus({ preventScroll: true }); return true;
    }
    function resume() {
      if (!alive || !paused || root.document.hidden) return false;
      paused = false; model.resume(); announce('Tiếp tục.'); render(); lastFrame = null; schedule(); canvas.focus({ preventScroll: true }); return true;
    }
    function restart() {
      if (!alive) return;
      cancelLoop(); paused = false;
      seed = (Number(seedFactory()) >>> 0) || ((seed + 1) >>> 0) || 1;
      model = newModel(); announce('Chỉnh góc và lực, rồi ném. ← → ngắm · ↑ ↓ chỉnh lực · Space ném.'); render(); canvas.focus({ preventScroll: true });
    }
    function aimFromPoint(event) {
      if (!alive || paused || model.view().phase !== 'aiming') return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width * M.WIDTH;
      const y = (event.clientY - rect.top) / rect.height * M.HEIGHT;
      if (x <= M.LAUNCH_X + 12) return;
      const angle = Math.atan2(M.LAUNCH_Y - y, x - M.LAUNCH_X) * 180 / Math.PI;
      model.setAim(angle); render();
    }
    function keydown(event) {
      if (event.target?.tagName === 'INPUT') return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); model.adjustAim(event.key === 'ArrowLeft' ? -1 : 1); render();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault(); model.adjustPower(event.key === 'ArrowUp' ? 3 : -3); render();
      } else if (!event.repeat && (event.code === 'Space' || event.key === ' ')) {
        event.preventDefault(); fire();
      } else if (!event.repeat && event.key.toLowerCase() === 'p') {
        event.preventDefault(); paused ? resume() : pause();
      }
    }
    listen(container, 'keydown', keydown);
    listen(canvas, 'pointerdown', event => { event.preventDefault(); aimFromPoint(event); });
    listen(el('sbAngle'), 'input', event => { model.setAim(Number(event.target.value)); render(); });
    listen(el('sbPower'), 'input', event => { model.setPower(Number(event.target.value)); render(); });
    listen(el('sbAimDown'), 'click', () => { model.adjustAim(-2); render(); });
    listen(el('sbAimUp'), 'click', () => { model.adjustAim(2); render(); });
    listen(el('sbPowerDown'), 'click', () => { model.adjustPower(-5); render(); });
    listen(el('sbPowerUp'), 'click', () => { model.adjustPower(5); render(); });
    listen(el('sbFire'), 'click', fire);
    listen(el('sbPause'), 'click', () => paused ? resume() : pause());
    listen(el('sbRestart'), 'click', restart);
    listen(el('sbOverlayAction'), 'click', () => {
      if (paused) resume(); else if (['won', 'lost'].includes(model.view().status)) restart();
    });
    listen(root, 'blur', () => pause('Tạm dừng khi đổi cửa sổ.'));
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) pause('Đã tạm dừng khi ẩn thẻ.'); });
    listen(root, 'pagehide', () => pause('Đã tạm dừng khi rời trang.'));
    onCleanup(() => { alive = false; cancelLoop(); container.innerHTML = ''; container.classList.remove('sb-host'); });
    render();
    return { getModel: () => model, fire, pause, resume, restart, isPaused: () => paused };
  }

  root.NP_SanBui = { mount };
})(typeof window === 'object' ? window : null);
